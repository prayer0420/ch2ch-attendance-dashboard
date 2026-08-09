import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import {
  GraduateEntry,
  NewFamilyEntry,
  WorshipJournal,
  parseHwpWorshipInfo,
  parseJournalAttendanceCsv
} from "@/lib/worship-journal";
import {
  loadAccountingFromGoogleSheet,
  parseAccountingWorkbook
} from "@/lib/worship-journal-accounting";

export const runtime = "nodejs";

const STORE_PATH = path.join(process.cwd(), ".local-runtime", "worship-journals.json");
const MAX_HWP_SIZE = 30 * 1024 * 1024;
const MAX_ACCOUNTING_SIZE = 15 * 1024 * 1024;

function sheetExportUrl(source: string, tab: string) {
  const match = source.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match) throw new Error("올바른 구글 시트 링크를 입력해 주세요.");
  return `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
}

async function readStore(): Promise<WorshipJournal[]> {
  try {
    return JSON.parse(await fs.readFile(STORE_PATH, "utf8")) as WorshipJournal[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeStore(journals: WorshipJournal[]) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  const temporary = `${STORE_PATH}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(journals, null, 2), "utf8");
  await fs.rename(temporary, STORE_PATH);
}

function parseEntries<T>(value: FormDataEntryValue | null): T[] {
  if (!value || typeof value !== "string") return [];
  const parsed = JSON.parse(value) as T[];
  return Array.isArray(parsed) ? parsed : [];
}

export async function GET() {
  try {
    return NextResponse.json({ journals: await readStore() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "저장 목록을 읽지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const date = String(form.get("date") ?? "").trim();
    const author = String(form.get("author") ?? "").trim();
    const attendanceSheetUrl = String(form.get("attendanceSheetUrl") ?? "").trim();
    const attendanceSheetTab = String(form.get("attendanceSheetTab") ?? "가장체크").trim();
    const accountingSourceType = String(form.get("accountingSourceType") ?? "").trim();
    const hwp = form.get("hwp");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("예배 날짜를 선택해 주세요.");
    if (!(hwp instanceof File) || !hwp.name.toLowerCase().endsWith(".hwp")) throw new Error("2청년회 주보 HWP 파일을 선택해 주세요.");
    if (hwp.size > MAX_HWP_SIZE) throw new Error("HWP 파일은 30MB 이하만 사용할 수 있습니다.");

    let accounting;
    if (accountingSourceType === "excel") {
      const accountingFile = form.get("accountingFile");
      if (!(accountingFile instanceof File) || !/\.(xlsx|xls)$/i.test(accountingFile.name)) {
        throw new Error("회계 XLSX 또는 XLS 파일을 선택해 주세요.");
      }
      if (accountingFile.size > MAX_ACCOUNTING_SIZE) throw new Error("회계 엑셀 파일은 15MB 이하만 사용할 수 있습니다.");
      accounting = parseAccountingWorkbook(
        Buffer.from(await accountingFile.arrayBuffer()),
        date,
        { sourceType: "excel", sourceName: accountingFile.name }
      );
    } else if (accountingSourceType === "google-sheet") {
      const accountingSheetUrl = String(form.get("accountingSheetUrl") ?? "").trim();
      accounting = await loadAccountingFromGoogleSheet(accountingSheetUrl, date);
    } else {
      throw new Error("회계 자료 입력 방식을 선택해 주세요.");
    }

    const response = await fetch(sheetExportUrl(attendanceSheetUrl, attendanceSheetTab), { cache: "no-store" });
    const csv = await response.text();
    if (!response.ok || csv.includes("<!DOCTYPE html")) throw new Error("출석 시트를 읽지 못했습니다. 링크 공유 권한과 탭 이름을 확인해 주세요.");

    const newFamilies = parseEntries<NewFamilyEntry>(form.get("newFamilies"))
      .filter((entry) => entry.name.trim());
    const graduates = parseEntries<GraduateEntry>(form.get("graduates"))
      .filter((entry) => entry.name.trim());
    const worship = parseHwpWorshipInfo(Buffer.from(await hwp.arrayBuffer()), date);
    const journal: WorshipJournal = {
      id: `${date}-${Date.now()}`,
      date,
      author,
      createdAt: new Date().toISOString(),
      source: { attendanceSheetUrl, attendanceSheetTab, hwpFileName: hwp.name },
      attendance: parseJournalAttendanceCsv(csv),
      newFamilies,
      graduates,
      accounting,
      ...worship
    };

    const journals = await readStore();
    const next = [journal, ...journals.filter((item) => item.date !== date)].slice(0, 60);
    await writeStore(next);
    return NextResponse.json({ journal, saved: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "예배일지를 만들지 못했습니다." }, { status: 400 });
  }
}
