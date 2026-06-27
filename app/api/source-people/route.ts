import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { decodeInputBuffer, parseAttendanceCsv, rowsToCsv } from "@/lib/attendance-input-parser";

const ALLOWED_EXTENSIONS = new Set([".csv", ".xlsx", ".xls", ".pdf"]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

type PdfTextItem = {
  str: string;
  transform: number[];
  width?: number;
};

function extractSheetInfo(url: string) {
  const idMatch = url.match(/\/spreadsheets\/d\/([^/]+)/);
  const publishedMatch = url.match(/\/spreadsheets\/d\/e\/([^/]+)/);
  const gidMatch = url.match(/[?&#]gid=(\d+)/);

  return {
    spreadsheetId: idMatch?.[1] ?? null,
    publishedId: publishedMatch?.[1] ?? null,
    gid: gidMatch?.[1] ?? "0"
  };
}

function buildExportUrl(url: string, tabName: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if ((parsed.searchParams.get("output") === "csv" || parsed.searchParams.get("format") === "csv") && parsed.hostname.includes("docs.google.com")) {
    return url;
  }

  const { spreadsheetId, publishedId, gid } = extractSheetInfo(url);
  if (spreadsheetId) {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName || "가장체크")}`;
  }
  if (publishedId) {
    const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/e/${publishedId}/pub`);
    exportUrl.searchParams.set("output", "csv");
    if (gid) exportUrl.searchParams.set("gid", gid);
    return exportUrl.toString();
  }
  return null;
}

function rowsFromPdfText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\t| {2,}/).map((cell) => cell.trim()).filter(Boolean));
}

async function csvFromPdfBuffer(buffer: Buffer) {
  const pdfParse = eval("require")("pdf-parse") as (input: Buffer, options?: unknown) => Promise<{ text: string }>;

  const positionalRows: string[][] = [];
  const parsed = await pdfParse(buffer, {
    pagerender: async (pageData: { getTextContent: () => Promise<{ items: PdfTextItem[] }> }) => {
      const content = await pageData.getTextContent();
      const lineMap = new Map<number, PdfTextItem[]>();

      for (const item of content.items) {
        const text = item.str.trim();
        if (!text) continue;
        const y = Math.round(item.transform[5] / 3) * 3;
        const line = lineMap.get(y) ?? [];
        line.push(item);
        lineMap.set(y, line);
      }

      const pageRows = Array.from(lineMap.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([, items]) => {
          const sorted = items.sort((a, b) => a.transform[4] - b.transform[4]);
          const cells: string[] = [];
          let current = "";
          let lastEnd = Number.NEGATIVE_INFINITY;

          for (const item of sorted) {
            const x = item.transform[4];
            const gap = x - lastEnd;
            if (current && gap > 14) {
              cells.push(current.trim());
              current = "";
            }
            current += item.str;
            lastEnd = x + (item.width ?? item.str.length * 7);
          }
          if (current.trim()) cells.push(current.trim());
          return cells;
        })
        .filter((row) => row.some(Boolean));

      positionalRows.push(...pageRows);
      return rowsToCsv(pageRows);
    }
  });

  if (positionalRows.some((row) => row.length >= 4)) return rowsToCsv(positionalRows);
  return rowsToCsv(rowsFromPdfText(parsed.text));
}

async function csvFromFile(file: File, tabName: string) {
  const extension = path.extname(file.name).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("지원 형식은 CSV, XLSX, XLS, PDF입니다.");
  }

  if (extension === ".csv") return decodeInputBuffer(await file.arrayBuffer());

  const buffer = Buffer.from(await file.arrayBuffer());
  if (extension === ".xlsx" || extension === ".xls") {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames.find((name) => name.trim() === tabName.trim());
    if (!sheetName) {
      throw new Error(`엑셀 파일에 '${tabName}' 탭이 없습니다. 발견된 탭: ${workbook.SheetNames.join(", ")}`);
    }
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error("엑셀 파일에서 읽을 수 있는 시트를 찾지 못했습니다.");
    return XLSX.utils.sheet_to_csv(sheet);
  }

  return await csvFromPdfBuffer(buffer);
}

function summarizeFamilies(people: Array<{ family: string; service13: boolean; service4: boolean }>) {
  const map = new Map<string, { family: string; total: number; sunday: number; department: number }>();
  for (const person of people) {
    const item = map.get(person.family) ?? { family: person.family, total: 0, sunday: 0, department: 0 };
    item.total += 1;
    if (person.service13) item.sunday += 1;
    if (person.service4) item.department += 1;
    map.set(person.family, item);
  }
  return Array.from(map.values());
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");
    let csv = "";
    let label = "입력 데이터";

    if (isMultipart) {
      const form = await request.formData();
      const file = form.get("file");
      const tabName = String(form.get("googleSheetTab") ?? "가장체크");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "읽을 파일을 선택해 주세요." }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "파일은 20MB 이하만 읽을 수 있습니다." }, { status: 400 });
      }
      csv = await csvFromFile(file, tabName);
      label = file.name;
    } else {
      const body = await request.json();
      const googleSheetUrl = String(body.googleSheetUrl ?? "");
      const googleSheetTab = String(body.googleSheetTab ?? "가장체크");
      const exportUrl = buildExportUrl(googleSheetUrl, googleSheetTab);
      if (!exportUrl) {
        return NextResponse.json({ error: "구글시트 URL 형식이 올바르지 않습니다." }, { status: 400 });
      }
      const response = await fetch(exportUrl, { cache: "no-store" });
      const text = await response.text();
      if (!response.ok || text.includes("<!DOCTYPE html")) {
        return NextResponse.json({ error: "구글시트를 CSV로 읽지 못했습니다. 링크 공유 권한과 탭 이름을 확인해 주세요." }, { status: 400 });
      }
      csv = text.replace(/^\uFEFF/, "");
      label = googleSheetTab;
    }

    const parsed = parseAttendanceCsv(csv, { includeUnchecked: true });
    const people = parsed.people.map((person) => ({
      family: person.family,
      name: person.name,
      service13: person.service13,
      service4: person.service4,
      note: person.note
    }));
    const families = summarizeFamilies(people);

    return NextResponse.json({
      ok: true,
      label,
      people,
      families,
      totalPeople: people.length,
      layout: parsed.layout,
      warnings: parsed.warnings,
      message: `${label}에서 가족 ${families.length}개, 이름 ${people.length}명을 읽었습니다.`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "입력 데이터를 읽지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
