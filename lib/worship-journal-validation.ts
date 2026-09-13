import type { WorshipJournal } from "./worship-journal";
import { journalTabName } from "./worship-journal-google-sheet";

export type WorshipJournalValidationCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type WorshipJournalValidationReport = {
  ok: boolean;
  passed: number;
  total: number;
  checks: WorshipJournalValidationCheck[];
};

function isKoreanSorted(values: string[]) {
  return values.every((value, index) => index === 0 || values[index - 1].localeCompare(value, "ko-KR") <= 0);
}

export function validateWorshipJournalForPublish(
  journal: Pick<WorshipJournal, "date" | "author" | "attendance" | "sermon" | "service" | "accounting">,
  expectedDate = journal.date
): WorshipJournalValidationReport {
  const checks: WorshipJournalValidationCheck[] = [];
  const add = (id: string, label: string, ok: boolean, detail: string) => checks.push({ id, label, ok, detail });

  let tabName = "-";
  let validDate = false;
  try {
    tabName = journalTabName(journal.date);
    validDate = journal.date === expectedDate;
  } catch {
    validDate = false;
  }
  add("date", "예배 날짜", validDate, validDate ? `${journal.date} → ${tabName} 탭` : `선택한 날짜 ${expectedDate}와 제출 날짜 ${journal.date || "없음"}이 다릅니다.`);
  add("author", "작성자", Boolean(journal.author.trim()), journal.author.trim() || "작성자가 비어 있습니다.");

  const attendanceValues = [journal.attendance.service13, journal.attendance.service4, journal.attendance.familyMeeting];
  const attendanceOk = attendanceValues.every((value) => Number.isInteger(value) && value >= 0)
    && journal.attendance.families.length <= 30
    && journal.attendance.families.every((family) => Boolean(family.family.trim()) && [family.service13, family.service4, family.familyMeeting].every((value) => Number.isInteger(value) && value >= 0));
  add("attendance", "출석 집계", attendanceOk, attendanceOk
    ? `1~3부 ${journal.attendance.service13}명 · 4부 ${journal.attendance.service4}명 · 가족모임 ${journal.attendance.familyMeeting}명 · ${journal.attendance.families.length}가족`
    : "출석 인원은 0 이상의 정수여야 하며 가족은 최대 30개까지 입력할 수 있습니다.");
  const visitorFamilies = journal.attendance.families.filter((family) => {
    const normalized = family.family.replace(/\s+/g, "");
    return normalized.includes("새가족") && normalized.includes("방문자");
  });
  add("visitor-exclusion", "새가족 방문자 제외", visitorFamilies.length === 0,
    visitorFamilies.length === 0 ? "전체 출석과 가족별 출석에서 방문자 제외 확인" : `${visitorFamilies.map((family) => family.family).join(", ")} 항목을 제거해 주세요.`);

  const accounting = journal.accounting;
  add("accounting", "회계 자료", Boolean(accounting), accounting ? `${accounting.sheetTab} 탭 · 총 ${accounting.total.toLocaleString("ko-KR")}원` : "회계 자료가 없습니다.");
  if (accounting) {
    const entriesOk = accounting.thanksgiving.every((entry) => Boolean(entry.name.trim()) && Number.isInteger(entry.amount) && entry.amount > 0);
    add("thanksgiving-entries", "감사헌금 명단", entriesOk, entriesOk ? `${accounting.thanksgiving.length}건의 이름과 금액 확인` : "이름이 없거나 금액이 0원 이하인 감사헌금이 있습니다.");

    const thanksgivingSum = accounting.thanksgiving.reduce((sum, entry) => sum + entry.amount, 0);
    add("thanksgiving-sum", "감사헌금 합계", thanksgivingSum === accounting.thanksgivingTotal,
      `명단 합계 ${thanksgivingSum.toLocaleString("ko-KR")}원 · 표시 합계 ${accounting.thanksgivingTotal.toLocaleString("ko-KR")}원`);

    const totalSum = accounting.sundayTotal + accounting.thanksgivingTotal + accounting.purposeTotal;
    add("accounting-total", "회계 총액", totalSum === accounting.total,
      `항목 합계 ${totalSum.toLocaleString("ko-KR")}원 · 총액 ${accounting.total.toLocaleString("ko-KR")}원`);

    const outputOrder = [...accounting.thanksgiving].sort((left, right) =>
      Number(Boolean(right.note.trim())) - Number(Boolean(left.note.trim())) || left.name.localeCompare(right.name, "ko-KR"));
    const noted = outputOrder.filter((entry) => entry.note.trim()).map((entry) => entry.name);
    const plain = outputOrder.filter((entry) => !entry.note.trim()).map((entry) => entry.name);
    const notesFirst = outputOrder.every((entry, index, entries) => index === 0 || Boolean(entries[index - 1].note.trim()) || !entry.note.trim());
    const sorted = notesFirst && isKoreanSorted(noted) && isKoreanSorted(plain);
    add("thanksgiving-order", "감사헌금 출력 순서", sorted, sorted ? "감사내용 있음/없음 순서와 각 그룹의 가나다순 확인" : "감사헌금 출력 정렬을 확인하지 못했습니다.");
  }

  const sermonOk = [journal.sermon.title, journal.sermon.passage, journal.sermon.preacher].every((value) => value.trim());
  add("sermon", "설교 정보", sermonOk, sermonOk
    ? `${journal.sermon.title} · ${journal.sermon.passage} · ${journal.sermon.preacher}`
    : "설교 제목, 본문, 설교자를 모두 확인해 주세요.");

  const serviceFields = [journal.service.guide, journal.service.cleanup, journal.service.mealService, journal.service.offeringMembers, journal.service.offeringPrayer];
  const serviceOk = serviceFields.every((value) => value.trim());
  add("service", "예배 섬김", serviceOk, serviceOk
    ? `안내 ${journal.service.guide} · 식당 ${journal.service.mealService} · 헌금기도 ${journal.service.offeringPrayer}`
    : "예배안내, 뒷정리, 식당봉사, 헌금위원, 헌금기도를 모두 확인해 주세요.");
  add("guide-cleanup", "예배안내·뒷정리 병합칸", journal.service.guide.trim() === journal.service.cleanup.trim(),
    journal.service.guide.trim() === journal.service.cleanup.trim()
      ? `기존 양식의 병합칸에 ${journal.service.guide} 입력`
      : "기존 양식에서 예배안내와 뒷정리는 한 병합칸을 공유하므로 두 값이 같아야 합니다.");

  const passed = checks.filter((check) => check.ok).length;
  return { ok: passed === checks.length, passed, total: checks.length, checks };
}

export function validationFailureMessage(report: WorshipJournalValidationReport) {
  return report.checks.filter((check) => !check.ok).map((check) => `${check.label}: ${check.detail}`).join(" / ");
}
