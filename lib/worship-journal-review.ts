import { createHash } from "node:crypto";
import type { WorshipJournal } from "@/lib/worship-journal";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown, fallback = "", maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

function number(value: unknown, fallback = 0, max = 1_000_000_000_000) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(0, Math.round(parsed))) : fallback;
}

function reviewedOfferings(value: unknown, fallback: Array<{ name: string; amount: number; note: string }>) {
  if (!Array.isArray(value)) return fallback;
  if (value.length > 1000) throw new Error("헌금 명단이 1,000건을 초과합니다. 명단을 확인해 주세요.");
  return value.flatMap((item) => {
    const source = record(item);
    const name = text(source.name, "", 100);
    if (!name) return [];
    return [{ name, amount: number(source.amount), note: text(source.note, "", 10000) }];
  });
}

function sortThanksgiving<T extends { name: string; note: string }>(offerings: T[]) {
  return [...offerings].sort((left, right) => {
    const noteOrder = Number(Boolean(right.note)) - Number(Boolean(left.note));
    return noteOrder || left.name.localeCompare(right.name, "ko-KR");
  });
}

export function applyReviewedJournal(
  base: Omit<WorshipJournal, "outputSheet">,
  value: unknown
): Omit<WorshipJournal, "outputSheet"> {
  const reviewed = record(value);
  const attendance = record(reviewed.attendance);
  const sermon = record(reviewed.sermon);
  const service = record(reviewed.service);
  const accounting = record(reviewed.accounting);
  const baseAccounting = base.accounting;
  const families = Array.isArray(attendance.families)
    ? attendance.families.slice(0, 30).flatMap((item) => {
      const family = record(item);
      const name = text(family.family, "", 100);
      return name ? [{
        family: name,
        service13: number(family.service13),
        service4: number(family.service4),
        familyMeeting: number(family.familyMeeting)
      }] : [];
    })
    : base.attendance.families;

  const newFamilies = Array.isArray(reviewed.newFamilies) ? reviewed.newFamilies.slice(0, 30).flatMap((item) => {
    const entry = record(item);
    const name = text(entry.name, "", 100);
    return name ? [{ name, generation: text(entry.generation, "", 50), inviter: text(entry.inviter, "", 100), relationship: text(entry.relationship, "", 100), note: text(entry.note) }] : [];
  }) : base.newFamilies;
  const graduates = Array.isArray(reviewed.graduates) ? reviewed.graduates.slice(0, 30).flatMap((item) => {
    const entry = record(item);
    const name = text(entry.name, "", 100);
    return name ? [{ name, generation: text(entry.generation, "", 50), family: text(entry.family, "", 100) }] : [];
  }) : base.graduates;

  const reviewedAccounting = baseAccounting ? (() => {
    const sundayTotal = number(accounting.sundayTotal, baseAccounting.sundayTotal);
    const thanksgivingTotal = number(accounting.thanksgivingTotal, baseAccounting.thanksgivingTotal);
    const purposeTotal = number(accounting.purposeTotal, baseAccounting.purposeTotal);
    return {
      ...baseAccounting,
      sundayTotal,
      thanksgivingTotal,
      purposeTotal,
      total: sundayTotal + thanksgivingTotal + purposeTotal,
      sunday: reviewedOfferings(accounting.sunday, baseAccounting.sunday ?? []).sort((a, b) => a.name.localeCompare(b.name, "ko-KR")),
      thanksgiving: sortThanksgiving(reviewedOfferings(accounting.thanksgiving, baseAccounting.thanksgiving)),
      purpose: reviewedOfferings(accounting.purpose, baseAccounting.purpose)
    };
  })() : undefined;

  return {
    ...base,
    attendance: {
      service13: number(attendance.service13, base.attendance.service13),
      service13Online: number(attendance.service13Online, base.attendance.service13Online),
      service4: number(attendance.service4, base.attendance.service4),
      service4Online: number(attendance.service4Online, base.attendance.service4Online),
      familyMeeting: number(attendance.familyMeeting, base.attendance.familyMeeting),
      families
    },
    newFamilies,
    graduates,
    accounting: reviewedAccounting,
    sermon: {
      title: text(sermon.title, base.sermon.title),
      passage: text(sermon.passage, base.sermon.passage),
      preacher: text(sermon.preacher, base.sermon.preacher)
    },
    service: {
      representativePrayer: text(service.representativePrayer, base.service.representativePrayer),
      offeringMembers: text(service.offeringMembers, base.service.offeringMembers),
      offeringPrayer: text(service.offeringPrayer, base.service.offeringPrayer),
      guide: text(service.guide, base.service.guide),
      cleanup: text(service.cleanup, base.service.cleanup),
      mealService: text(service.mealService, base.service.mealService),
      prayerMeeting: text(service.prayerMeeting, base.service.prayerMeeting)
    },
    announcements: Array.isArray(reviewed.announcements)
      ? reviewed.announcements.slice(0, 50).map((item) => text(item, "", 1000)).filter(Boolean)
      : base.announcements
  };
}

export function worshipJournalReviewDigest(journal: Omit<WorshipJournal, "outputSheet">) {
  const reviewedContent = {
    date: journal.date,
    author: journal.author,
    source: journal.source,
    attendance: journal.attendance,
    newFamilies: journal.newFamilies,
    graduates: journal.graduates,
    accounting: journal.accounting,
    sermon: journal.sermon,
    service: journal.service,
    announcements: journal.announcements,
    extraction: journal.extraction
  };
  return createHash("sha256").update(JSON.stringify(reviewedContent)).digest("hex");
}
