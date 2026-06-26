import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { mockRuns } from "@/lib/mock-data";
import { getServiceSupabase, hasSupabaseEnv } from "@/lib/supabase/server";
import { parseAttendanceCsv, rowsToCsv } from "@/lib/attendance-input-parser";

const ALLOWED_EXTENSIONS = new Set([".csv", ".xlsx", ".xls", ".pdf"]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const INPUT_BUCKET = "attendance-inputs";

type ManualAttendanceRow = {
  family: string;
  name: string;
  service13: boolean;
  service4: boolean;
  note?: string;
};

function asBoolean(value: unknown, defaultValue = true) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return String(value).toLowerCase() === "true";
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseManualRows(value: unknown): ManualAttendanceRow[] {
  if (!value) return [];
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) throw new Error("가족별 체크 데이터 형식이 올바르지 않습니다.");

  return parsed
    .map((row) => ({
      family: String(row?.family ?? "").trim(),
      name: String(row?.name ?? "").trim(),
      service13: row?.service13 === true,
      service4: row?.service4 === true,
      note: String(row?.note ?? "").trim()
    }))
    .filter((row) => row.family && row.name && (row.service13 || row.service4));
}

function manualRowsToCsv(rows: ManualAttendanceRow[]) {
  return rowsToCsv([
    ["가족", "이름", "주일", "부서", "심방기도제목"],
    ...rows.map((row) => [
      row.family,
      row.name,
      row.service13 ? "O" : "X",
      row.service4 ? "O" : "X",
      row.note ?? ""
    ])
  ]);
}

function extractSpreadsheetId(url: string) {
  return url.match(/\/spreadsheets\/d\/([^/]+)/)?.[1] ?? null;
}

function buildGoogleCsvUrl(url: string, tabName: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if ((parsed.searchParams.get("output") === "csv" || parsed.searchParams.get("format") === "csv") && parsed.hostname.includes("docs.google.com")) {
    return url;
  }

  const spreadsheetId = extractSpreadsheetId(url);
  if (spreadsheetId) {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  }

  const publishedId = url.match(/\/spreadsheets\/d\/e\/([^/]+)/)?.[1] ?? null;
  if (publishedId) {
    const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/e/${publishedId}/pub`);
    exportUrl.searchParams.set("output", "csv");
    const gid = parsed.searchParams.get("gid");
    if (gid) exportUrl.searchParams.set("gid", gid);
    return exportUrl.toString();
  }

  return null;
}

async function downloadGoogleSheetSnapshot(url: string, tabName: string) {
  const exportUrl = buildGoogleCsvUrl(url, tabName);
  if (!exportUrl) throw new Error("구글시트 URL 형식이 올바르지 않습니다.");
  const response = await fetch(exportUrl, { cache: "no-store" });
  const text = await response.text();
  if (!response.ok || text.includes("<!DOCTYPE html")) {
    throw new Error("구글시트의 가장체크 탭을 읽지 못했습니다. 링크 공유 권한과 탭 이름을 확인해 주세요.");
  }
  const csv = text.replace(/^\uFEFF/, "");
  const parsed = parseAttendanceCsv(csv);
  return { csv, count: parsed.people.length };
}

async function ensureInputBucket(supabase: ReturnType<typeof getServiceSupabase>) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(`Storage 버킷 확인 실패: ${listError.message}`);
  if (buckets?.some((bucket) => bucket.name === INPUT_BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(INPUT_BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_SIZE
  });
  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(`Storage 버킷 생성 실패: ${createError.message}`);
  }
}

export async function GET(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ data: mockRuns, demo: true });
  }

  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = Number(request.nextUrl.searchParams.get("pageSize") ?? "20");
  const from = Math.max(page - 1, 0) * pageSize;
  const to = from + pageSize - 1;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("attendance_runs")
    .select("*")
    .order("requested_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");
  const input = isMultipart ? await request.formData() : await request.json();
  const read = (key: string) => isMultipart ? input.get(key) : input[key];

  const dataSource = String(read("dataSource") ?? "google_sheet");
  const targetWeek = Number(read("targetWeek"));
  let manualRows: ManualAttendanceRow[] = [];
  try {
    manualRows = parseManualRows(read("manualRows"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "가족별 체크 데이터 해석에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!Number.isInteger(targetWeek) || targetWeek < 1 || targetWeek > 53) {
    return NextResponse.json({ error: "주차는 1주부터 53주 사이로 입력해 주세요." }, { status: 400 });
  }

  if (dataSource === "google_sheet" && !read("googleSheetUrl")) {
    return NextResponse.json({ error: "구글시트 URL을 입력해 주세요." }, { status: 400 });
  }

  let sourceFilePath: string | null = null;
  let sourceFileName: string | null = null;
  let sourceFileType: string | null = null;
  const supabase = hasSupabaseEnv() ? getServiceSupabase() : null;
  if (supabase) {
    try {
      await ensureInputBucket(supabase);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Storage 버킷 준비 실패";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (manualRows.length) {
    if (!hasSupabaseEnv()) {
      return NextResponse.json({ error: "가족별 체크 실행은 Supabase 저장소 연결 후 사용할 수 있습니다." }, { status: 503 });
    }

    sourceFileName = `family-control-${targetWeek}week.csv`;
    sourceFileType = "csv";
    sourceFilePath = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeFileName(sourceFileName)}`;
    const csv = manualRowsToCsv(manualRows);
    const { error: uploadError } = await supabase!.storage
      .from(INPUT_BUCKET)
      .upload(sourceFilePath, Buffer.from(csv, "utf8"), {
        contentType: "text/csv; charset=utf-8",
        upsert: false
      });
    if (uploadError) {
      return NextResponse.json({ error: `가족별 체크 데이터 저장 실패: ${uploadError.message}` }, { status: 500 });
    }
  } else if (dataSource === "file") {
    const file = read("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV, XLSX, XLS 또는 PDF 파일을 선택해 주세요." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "파일은 20MB 이하만 업로드할 수 있습니다." }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: "지원 형식은 CSV, XLSX, XLS, PDF입니다." }, { status: 400 });
    }
    if (!hasSupabaseEnv()) {
      return NextResponse.json({ error: "파일 업로드는 Supabase 연결 후 사용할 수 있습니다." }, { status: 503 });
    }

    sourceFileName = file.name;
    sourceFileType = extension.slice(1);
    sourceFilePath = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeFileName(file.name)}`;

    const { error: uploadError } = await supabase!.storage
      .from(INPUT_BUCKET)
      .upload(sourceFilePath, await file.arrayBuffer(), { contentType: file.type || "application/octet-stream", upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: `파일 업로드 실패: ${uploadError.message}` }, { status: 500 });
    }
  } else if (hasSupabaseEnv()) {
    try {
      const tabName = String(read("googleSheetTab") ?? "가장체크");
      const snapshot = await downloadGoogleSheetSnapshot(String(read("googleSheetUrl") ?? ""), tabName);

      sourceFileName = `google-sheet-${tabName}.csv`;
      sourceFileType = "csv";
      sourceFilePath = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeFileName(sourceFileName)}`;
      const { error: uploadError } = await supabase!.storage
        .from(INPUT_BUCKET)
        .upload(sourceFilePath, Buffer.from(snapshot.csv, "utf8"), {
          contentType: "text/csv; charset=utf-8",
          upsert: false
        });
      if (uploadError) throw new Error(uploadError.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "구글시트 스냅샷 생성 실패";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const payload = {
    status: "queued",
    data_source: dataSource,
    google_sheet_url: dataSource === "google_sheet" ? String(read("googleSheetUrl") ?? "") : null,
    google_sheet_tab: String(read("googleSheetTab") ?? "가장체크"),
    csv_file_name: sourceFilePath
      ? JSON.stringify({
        path: sourceFilePath,
        name: sourceFileName,
        type: sourceFileType
      })
      : sourceFileName,
    target_dept: String(read("targetDept") ?? "2청년회"),
    target_term: null,
    target_group: null,
    target_week: targetWeek,
    target_week_text: `${targetWeek}주`,
    dry_run: asBoolean(read("dryRun"), true),
    enable_second_pass: asBoolean(read("enableSecondPass"), true),
    enable_new_family_groups: asBoolean(read("enableNewFamilyGroups"), true),
    enable_long_absence_search: asBoolean(read("enableLongAbsenceSearch"), true)
  };

  if (!hasSupabaseEnv()) {
    return NextResponse.json({ runId: "demo-queued-run", status: "queued", demo: true, payload });
  }

  const { data, error } = await supabase!.from("attendance_runs").insert(payload).select("id,status").single();
  if (error) {
    if (sourceFilePath) {
      await supabase!.storage.from(INPUT_BUCKET).remove([sourceFilePath]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ runId: data.id, status: data.status });
}
