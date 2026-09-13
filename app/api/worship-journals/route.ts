import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  GraduateEntry,
  isWorshipBulletinFileName,
  NewFamilyEntry,
  WorshipJournal,
  auditJournalAttendanceCsv,
  parseHwpWorshipInfo,
  parsePdfWorshipInfo,
  parseJournalAttendanceCsv
} from "@/lib/worship-journal";
import { publishWorshipJournalToGoogleSheet } from "@/lib/worship-journal-google-api";
import { applyReviewedJournal, worshipJournalReviewDigest } from "@/lib/worship-journal-review";
import { validateWorshipJournalForPublish, validationFailureMessage } from "@/lib/worship-journal-validation";
import {
  MAX_ACCOUNTING_SIZE,
  parseAccountingWorkbook
} from "@/lib/worship-journal-accounting";
import { loadAccountingFromGoogleDrive } from "@/lib/worship-journal-accounting-google";

export const runtime = "nodejs";

const STORE_PATH = path.join(process.cwd(), ".local-runtime", "worship-journals.json");
const MAX_BULLETIN_SIZE = 30 * 1024 * 1024;
const processState = globalThis as typeof globalThis & { __worshipJournalPublishLocks?: Set<string> };
const publishLocks = processState.__worshipJournalPublishLocks ??= new Set<string>();

function sheetExportUrl(source: string, tab: string) {
  const match = source.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match) throw new Error("올바른 구글 시트 링크를 입력해 주세요.");
  return `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
}

async function fetchAttendanceCsv(source: string, tab: string) {
  const url = `${sheetExportUrl(source, tab)}&cacheBust=${Date.now()}-${Math.random()}`;
  const response = await fetch(url, { cache: "no-store" });
  const csv = await response.text();
  if (!response.ok || csv.includes("<!DOCTYPE html")) {
    throw new Error("출석 시트를 읽지 못했습니다. 링크 공유 권한과 탭 이름을 확인해 주세요.");
  }
  return csv;
}

function sourceDigest(csv: string) {
  return createHash("sha256").update(csv).digest("hex");
}

function verifyAttendanceAudit(csv: string) {
  const attendance = parseJournalAttendanceCsv(csv);
  const audit = auditJournalAttendanceCsv(csv);
  const keys = ["service13", "service13Online", "service4", "service4Online", "familyMeeting"] as const;
  const mismatch = keys.find((key) => attendance[key] !== audit[key]);
  if (mismatch) {
    throw new Error(`출석 원본 교차검증 실패: ${mismatch} 집계값이 서로 다릅니다.`);
  }
  if (attendance.families.some((family) => family.family.replace(/\s+/g, "").includes("방문자"))) {
    throw new Error("출석 원본 교차검증 실패: 새가족 방문자가 가족별 집계에 포함되었습니다.");
  }
  return { attendance, audit };
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
    const action = String(form.get("action") ?? "preview").trim();
    const expectedReviewDigest = String(form.get("reviewDigest") ?? "").trim();
    const accountingSourceType = String(form.get("accountingSourceType") ?? "").trim();
    const bulletin = form.get("bulletin") ?? form.get("hwp");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("예배 날짜를 선택해 주세요.");
    if (!author) throw new Error("작성자를 입력해 주세요.");
    if (action !== "preview" && action !== "publish") throw new Error("예배일지 실행 방식이 올바르지 않습니다.");
    if (!(bulletin instanceof File) || !isWorshipBulletinFileName(bulletin.name)) {
      throw new Error("2청년회 주보 HWP 또는 PDF 파일을 선택해 주세요.");
    }
    if (bulletin.size > MAX_BULLETIN_SIZE) throw new Error("주보 파일은 30MB 이하만 사용할 수 있습니다.");

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
      accounting = await loadAccountingFromGoogleDrive(String(form.get("accountingSheetUrl") ?? "").trim(), date);
    } else {
      throw new Error("회계 자료는 엑셀 파일 또는 Google Sheet 중 하나를 선택해 주세요.");
    }

    const csv = await fetchAttendanceCsv(attendanceSheetUrl, attendanceSheetTab);
    const attendanceVerification = verifyAttendanceAudit(csv);

    const newFamilies = parseEntries<NewFamilyEntry>(form.get("newFamilies"))
      .filter((entry) => entry.name.trim());
    const graduates = parseEntries<GraduateEntry>(form.get("graduates"))
      .filter((entry) => entry.name.trim());
    const bulletinBuffer = Buffer.from(await bulletin.arrayBuffer());
    const bulletinFormat: "pdf" | "hwp" = bulletin.name.toLowerCase().endsWith(".pdf") ? "pdf" : "hwp";
    const worship = bulletinFormat === "pdf"
      ? await parsePdfWorshipInfo(bulletinBuffer, date)
      : parseHwpWorshipInfo(bulletinBuffer, date);
    const journalBase = {
      id: `${date}-${Date.now()}`,
      date,
      author,
      createdAt: new Date().toISOString(),
      source: {
        attendanceSheetUrl,
        attendanceSheetTab,
        bulletinFileName: bulletin.name,
        bulletinFormat,
        hwpFileName: bulletinFormat === "hwp" ? bulletin.name : ""
      },
      attendance: attendanceVerification.attendance,
      newFamilies,
      graduates,
      accounting,
      ...worship
    };
    if (action === "preview") {
      const validation = validateWorshipJournalForPublish(journalBase, date);
      return NextResponse.json({
        journal: journalBase,
        reviewDigest: worshipJournalReviewDigest(journalBase),
        validation,
        sourceVerification: {
          passed: true,
          service4: attendanceVerification.audit.service4,
          excludedVisitorService4: attendanceVerification.audit.excludedVisitorService4
        },
        saved: false,
        published: false
      });
    }
    if (!expectedReviewDigest) throw new Error("먼저 추출 결과를 검토해 주세요.");
    if (worshipJournalReviewDigest(journalBase) !== expectedReviewDigest) {
      throw new Error("검토 이후 원본 자료가 변경되었습니다. 다시 추출해서 확인해 주세요.");
    }
    const reviewedJournalText = String(form.get("reviewedJournal") ?? "").trim();
    if (!reviewedJournalText) throw new Error("편집한 미리보기 내용을 확인할 수 없습니다. 다시 추출해 주세요.");
    let reviewedJournal: unknown;
    try {
      reviewedJournal = JSON.parse(reviewedJournalText);
    } catch {
      throw new Error("편집한 미리보기 형식이 올바르지 않습니다. 다시 추출해 주세요.");
    }
    const approvedJournal = applyReviewedJournal(journalBase, reviewedJournal);
    const validation = validateWorshipJournalForPublish(approvedJournal, date);
    if (!validation.ok) throw new Error(`최종 검증을 통과하지 못했습니다. ${validationFailureMessage(validation)}`);

    const freshCsv = await fetchAttendanceCsv(attendanceSheetUrl, attendanceSheetTab);
    if (sourceDigest(freshCsv) !== sourceDigest(csv)) {
      throw new Error("제출 검증 중 출석 원본이 변경되었습니다. 최신 자료로 다시 추출해 주세요.");
    }
    const freshAttendanceVerification = verifyAttendanceAudit(freshCsv);
    if (worshipJournalReviewDigest({ ...journalBase, attendance: freshAttendanceVerification.attendance }) !== expectedReviewDigest) {
      throw new Error("제출 직전 출석 재검증 결과가 미리보기와 다릅니다. 다시 추출해 주세요.");
    }

    const publishKey = `${date}`;
    if (publishLocks.has(publishKey)) {
      throw new Error(`${date} 예배일지 제출이 이미 진행 중입니다. 현재 요청이 끝난 뒤 결과를 확인해 주세요.`);
    }
    publishLocks.add(publishKey);
    try {
      const outputSheet = await publishWorshipJournalToGoogleSheet(approvedJournal);
      outputSheet.verification.stages = [
        { label: "1차 입력값 검증", detail: `${validation.passed}/${validation.total}개 항목 통과` },
        { label: "2차 출석 원본 교차검증", detail: `4부 ${attendanceVerification.audit.service4}명 · 방문자 ${attendanceVerification.audit.excludedVisitorService4}명 제외` },
        { label: "3차 제출 직전 원본 재조회", detail: "미리보기 원본과 동일함" },
        { label: "4차 Google Sheet 저장값 재검증", detail: `${outputSheet.verification.checkedCells}개 셀 일치` }
      ];
      const journal: WorshipJournal = { ...approvedJournal, outputSheet };
      const journals = await readStore();
      const next = [journal, ...journals.filter((item) => item.date !== date)].slice(0, 60);
      await writeStore(next);
      return NextResponse.json({ journal, validation, saved: true, published: true });
    } finally {
      publishLocks.delete(publishKey);
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "예배일지를 만들지 못했습니다." }, { status: 400 });
  }
}
