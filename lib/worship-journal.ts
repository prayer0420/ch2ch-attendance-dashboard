import { inflateRawSync } from "node:zlib";
import { isChecked, parseCsv } from "@/lib/attendance-input-parser";
import type { JournalAccounting } from "@/lib/worship-journal-accounting";
import type { WorshipJournalSheetOutput } from "@/lib/worship-journal-google-api";

export type FamilyAttendance = {
  family: string;
  service13: number;
  service4: number;
  familyMeeting: number;
};

export type AttendanceSummary = {
  service13: number;
  service13Online: number;
  service4: number;
  service4Online: number;
  familyMeeting: number;
  families: FamilyAttendance[];
};

export type NewFamilyEntry = {
  name: string;
  generation: string;
  inviter: string;
  relationship: string;
  note: string;
};

export type GraduateEntry = {
  name: string;
  generation: string;
  family: string;
};

export type WorshipService = {
  representativePrayer: string;
  offeringMembers: string;
  offeringPrayer: string;
  guide: string;
  cleanup: string;
  mealService: string;
  prayerMeeting: string;
};

export type AttendanceSourceAudit = Omit<AttendanceSummary, "families"> & {
  excludedVisitorRows: number;
  excludedVisitorService4: number;
};

export type WorshipExtraction = {
  format: "hwp" | "pdf";
  requiresReview: true;
  evidenceLines: string[];
};

export type WorshipJournal = {
  id: string;
  date: string;
  author: string;
  createdAt: string;
  source: {
    attendanceSheetUrl: string;
    attendanceSheetTab: string;
    hwpFileName?: string;
    bulletinFileName?: string;
    bulletinFormat?: "hwp" | "pdf";
  };
  attendance: AttendanceSummary;
  newFamilies: NewFamilyEntry[];
  graduates: GraduateEntry[];
  sermon: { title: string; passage: string; preacher: string };
  service: WorshipService;
  announcements: string[];
  extraction?: WorshipExtraction;
  accounting?: JournalAccounting;
  outputSheet?: WorshipJournalSheetOutput;
};

const FAMILY_COLUMN_LIMIT = 120;
const FAMILY_BLOCK_WIDTH = 8;

export function isWorshipBulletinFileName(fileName: string) {
  return /\.(hwp|pdf)$/i.test(fileName.trim());
}

function isFamilyLabel(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, "").trim();
  return Boolean(text) && (text.endsWith("네") || text.includes("가족") || text.includes("임원"));
}

function cleanFamilyLabel(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, "").trim();
  if (text === "새가족반공부중") return "새가족반";
  if (text === "새가족반결석중") return "새가족반 결석중";
  if (text === "새가족반방문자") return "새가족 방문자";
  return text;
}

export function isExcludedAttendanceFamily(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, "").trim();
  return text.includes("새가족") && text.includes("방문자");
}

function isName(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text || /^(TRUE|FALSE|O|X|V)$/i.test(text)) return false;
  if (isFamilyLabel(text)) return false;
  return /[가-힣A-Za-z]/.test(text);
}

export function parseJournalAttendanceCsv(csv: string): AttendanceSummary {
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error("출석 시트에서 읽을 수 있는 행을 찾지 못했습니다.");

  const header = rows[0] ?? [];
  const starts: number[] = [];
  for (let column = 0; column < Math.min(header.length, FAMILY_COLUMN_LIMIT); column += FAMILY_BLOCK_WIDTH) {
    if (isFamilyLabel(header[column])) starts.push(column);
  }
  if (!starts.length) throw new Error("가족별 출석 블록을 찾지 못했습니다. '가장체크' 탭인지 확인해 주세요.");

  const headerFamilyCounts = new Map<string, number>();
  starts.forEach((column) => {
    const family = cleanFamilyLabel(header[column]);
    headerFamilyCounts.set(family, (headerFamilyCounts.get(family) ?? 0) + 1);
  });
  const activeFamilies = starts.map((column) => cleanFamilyLabel(header[column]));
  const people: Array<{
    family: string;
    name: string;
    service13: boolean;
    service13Online: boolean;
    service4: boolean;
    service4Online: boolean;
    familyMeeting: boolean;
  }> = [];

  for (const row of rows.slice(1)) {
    const familyLabels = starts.filter((column) => isFamilyLabel(row[column]));
    if (familyLabels.length >= 2) {
      starts.forEach((column, index) => {
        if (isFamilyLabel(row[column])) activeFamilies[index] = cleanFamilyLabel(row[column]);
      });
      continue;
    }

    starts.forEach((column, index) => {
      if (isFamilyLabel(row[column]) && !row.slice(column + 1, column + FAMILY_BLOCK_WIDTH).some(isChecked)) {
        activeFamilies[index] = cleanFamilyLabel(row[column]);
        return;
      }

      const name = String(row[column] ?? "").trim();
      if (!isName(name)) return;
      const family = activeFamilies[index];
      if (!family || isExcludedAttendanceFamily(family)) return;

      const item = {
        family,
        name,
        service13: isChecked(row[column + 1]) || isChecked(row[column + 2]),
        service13Online: isChecked(row[column + 3]),
        service4: isChecked(row[column + 4]) || isChecked(row[column + 5]),
        service4Online: isChecked(row[column + 6]),
        familyMeeting: isChecked(row[column + 7])
      };
      people.push(item);
    });
  }

  const familyOrder: string[] = [];
  const familyMap = new Map<string, FamilyAttendance>();
  for (const person of people) {
    if (!familyMap.has(person.family)) {
      familyOrder.push(person.family);
      familyMap.set(person.family, { family: person.family, service13: 0, service4: 0, familyMeeting: 0 });
    }
    const family = familyMap.get(person.family)!;
    if (person.service13) family.service13 += 1;
    if (person.service4) family.service4 += 1;
    if (person.familyMeeting) family.familyMeeting += 1;
  }

  const all = people;
  const orderedFamilies = familyOrder.filter((family) => (headerFamilyCounts.get(family) ?? 0) <= 1);
  orderedFamilies.push(...familyOrder.filter((family) => (headerFamilyCounts.get(family) ?? 0) > 1));

  return {
    service13: all.filter((person) => person.service13).length,
    service13Online: all.filter((person) => person.service13Online).length,
    service4: all.filter((person) => person.service4).length,
    service4Online: all.filter((person) => person.service4Online).length,
    familyMeeting: all.filter((person) => person.familyMeeting).length,
    families: orderedFamilies.map((family) => familyMap.get(family)!)
  };
}

export function auditJournalAttendanceCsv(csv: string): AttendanceSourceAudit {
  const rows = parseCsv(csv);
  const header = rows[0] ?? [];
  const starts: number[] = [];
  for (let column = 0; column < Math.min(header.length, FAMILY_COLUMN_LIMIT); column += FAMILY_BLOCK_WIDTH) {
    if (isFamilyLabel(header[column])) starts.push(column);
  }
  if (!starts.length) throw new Error("출석 시트 검증용 가족 블록을 찾지 못했습니다.");

  const activeFamilies = starts.map((column) => cleanFamilyLabel(header[column]));
  const result: AttendanceSourceAudit = {
    service13: 0,
    service13Online: 0,
    service4: 0,
    service4Online: 0,
    familyMeeting: 0,
    excludedVisitorRows: 0,
    excludedVisitorService4: 0
  };

  for (const row of rows.slice(1)) {
    const familyLabels = starts.filter((column) => isFamilyLabel(row[column]));
    if (familyLabels.length >= 2) {
      starts.forEach((column, index) => {
        if (isFamilyLabel(row[column])) activeFamilies[index] = cleanFamilyLabel(row[column]);
      });
      continue;
    }
    starts.forEach((column, index) => {
      if (isFamilyLabel(row[column]) && !row.slice(column + 1, column + FAMILY_BLOCK_WIDTH).some(isChecked)) {
        activeFamilies[index] = cleanFamilyLabel(row[column]);
        return;
      }
      const attendance = {
        service13: isChecked(row[column + 1]) || isChecked(row[column + 2]),
        service13Online: isChecked(row[column + 3]),
        service4: isChecked(row[column + 4]) || isChecked(row[column + 5]),
        service4Online: isChecked(row[column + 6]),
        familyMeeting: isChecked(row[column + 7])
      };
      if (!Object.values(attendance).some(Boolean)) return;
      if (isExcludedAttendanceFamily(activeFamilies[index])) {
        result.excludedVisitorRows += 1;
        if (attendance.service4) result.excludedVisitorService4 += 1;
        return;
      }
      (Object.keys(attendance) as Array<keyof typeof attendance>).forEach((key) => {
        if (attendance[key]) result[key] += 1;
      });
    });
  }
  return result;
}

function cleanParagraph(value: string) {
  return value
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[汤氠漠杳捤獥捯瑢\s]+(?=\d+\.)/, "")
    .trim();
}

export function extractHwpParagraphs(buffer: Buffer) {
  const CFB = eval("require")("cfb") as {
    read: (input: Buffer, options: { type: string }) => unknown;
    find: (file: unknown, name: string) => { content: Buffer } | null;
  };
  const file = CFB.read(buffer, { type: "buffer" });
  const header = CFB.find(file, "FileHeader")?.content;
  const section = CFB.find(file, "Section0")?.content;
  if (!header || !section) throw new Error("HWP 본문을 찾지 못했습니다. HWP 5.x 형식인지 확인해 주세요.");

  let body = section;
  if ((header.readUInt32LE(36) & 1) === 1) body = inflateRawSync(section);

  const paragraphs: string[] = [];
  let offset = 0;
  while (offset + 4 <= body.length) {
    const record = body.readUInt32LE(offset);
    const tag = record & 0x3ff;
    let size = record >>> 20;
    offset += 4;
    if (size === 0xfff) {
      if (offset + 4 > body.length) break;
      size = body.readUInt32LE(offset);
      offset += 4;
    }
    if (offset + size > body.length) break;
    if (tag === 67) {
      const text = cleanParagraph(body.subarray(offset, offset + size).toString("utf16le"));
      if (text && !/^[汤氠漠杳捤獥汤捯瑢\s]+$/.test(text)) paragraphs.push(text);
    }
    offset += size;
  }
  return paragraphs;
}

function findTargetDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

function extractSermon(paragraphs: string[]) {
  const marker = paragraphs.findIndex((line) => line.includes("청년예배 말씀"));
  const nearby = marker >= 0 ? paragraphs.slice(marker + 1, marker + 16) : paragraphs;
  const passageIndex = nearby.findIndex((line) => /\([^)]*(?:전서|후서|복음|기|편|장)\s*\d+[:：]/.test(line));
  if (passageIndex >= 0) {
    const passageLine = nearby[passageIndex];
    return {
      title: passageIndex > 0 ? nearby[passageIndex - 1] : "",
      passage: passageLine.replace(/^\(|\)$/g, "").replace(/,\s*(구약|신약).*$/, ""),
      preacher: nearby.slice(passageIndex + 1).find((line) => /(목사|전도사|장로)/.test(line)) ?? ""
    };
  }

  const bookIndex = nearby.findIndex((line) => /(?:전서|후서|복음|기|편|장)$/.test(line));
  if (bookIndex >= 0) {
    const title = nearby.slice(0, bookIndex).find((line) => !/^\d+$/.test(line)) ?? "";
    const preacherIndex = nearby.findIndex((line, index) => index > bookIndex && /(목사|전도사|장로)/.test(line));
    const passageSource = nearby.slice(bookIndex, preacherIndex >= 0 ? preacherIndex : bookIndex + 7).join(" ");
    const verse = passageSource.match(/\d+[:：]\d+(?:\s*[~～-]\s*\d+)?/)?.[0]?.replace("：", ":") ?? "";
    return {
      title,
      passage: verse ? `${nearby[bookIndex]} ${verse}` : nearby[bookIndex],
      preacher: preacherIndex >= 0 ? nearby[preacherIndex] : ""
    };
  }

  return { title: "", passage: "", preacher: paragraphs.find((line) => /(목사|전도사)\s*$/.test(line)) ?? "" };
}

function extractService(paragraphs: string[], date: string): WorshipService {
  const empty: WorshipService = {
    representativePrayer: "",
    offeringMembers: "",
    offeringPrayer: "",
    guide: "",
    cleanup: "",
    mealService: "",
    prayerMeeting: ""
  };
  const marker = paragraphs.findIndex((line) => line === "예배 섬김" || line.includes("예배 섬김"));
  if (marker < 0) return empty;
  const label = findTargetDateLabel(date);
  const dateIndex = paragraphs.findIndex((line, index) => index > marker && index < marker + 30 && line.startsWith(label));
  if (dateIndex < 0) return empty;

  const cells: string[] = [];
  for (const line of paragraphs.slice(dateIndex + 1, dateIndex + 12)) {
    if (/^\d{1,2}\/\d{1,2}/.test(line)) break;
    cells.push(line);
  }
  const firstFamily = cells.findIndex((cell) => cell.replace(/\s+/g, "").endsWith("네"));
  if (firstFamily >= 0 && cells.length - firstFamily >= 3) {
    const dutyPeople = cells.slice(0, firstFamily);
    const families = cells.slice(firstFamily);
    const hasPrayerGroup = dutyPeople[1] && /청/.test(dutyPeople[1]);
    const representativePrayer = hasPrayerGroup
      ? `${dutyPeople[0]} (${dutyPeople[1].match(/\d+/)?.[0] ?? ""}청)`.replace("()", "").trim()
      : (dutyPeople[0] ?? "");
    const offeringStart = hasPrayerGroup ? 2 : 1;
    return {
      representativePrayer,
      offeringMembers: dutyPeople.slice(offeringStart, -1).join(" ").replace(/,\s*/g, ", ").trim(),
      offeringPrayer: dutyPeople.at(-1) ?? "",
      guide: families[0] ?? "",
      cleanup: families[0] ?? "",
      mealService: families[1] ?? "",
      prayerMeeting: families.slice(2).join(", ")
    };
  }
  const prayer = cells[1]?.startsWith("(") ? `${cells[0]} ${cells[1]}` : (cells[0] ?? "");
  const shift = cells[1]?.startsWith("(") ? 2 : 1;
  return {
    representativePrayer: prayer,
    offeringMembers: cells[shift] ?? "",
    offeringPrayer: cells[shift + 1] ?? "",
    guide: cells[shift + 2] ?? "",
    cleanup: cells[shift + 2] ?? "",
    mealService: cells[shift + 3] ?? "",
    prayerMeeting: cells[shift + 4] ?? ""
  };
}

function compactTiming(lines: string[]) {
  const source = lines.join(" ");
  const dates = source.match(/\d{1,2}\/\d{1,2}(?:\([^)]*\))?(?:\s*[~～-]\s*\d{1,2}(?:\/\d{1,2})?(?:\([^)]*\))?)?/g) ?? [];
  const times = source.match(/(?:오전|오후|새벽|저녁)\s*\d{1,2}시(?:\s*\d{1,2}분)?/g) ?? [];
  return Array.from(new Set([...dates, ...times])).slice(0, 3).join(" · ");
}

function extractAnnouncements(paragraphs: string[]) {
  const compact = (value: string) => value.replace(/\s+/g, "").trim();
  const start = paragraphs.findIndex((line) => /^(?:주보)?광고(?:사항)?$/.test(compact(line)) && !compact(line).includes("미리미리"));
  if (start < 0) return [];
  const endOffset = paragraphs.slice(start + 1).findIndex((line) => compact(line).includes("미리미리광고") || /(?:20\d{2}\s*년?\s*)?\d{1,2}\s*[~-]\s*\d{1,2}\s*월?\s*일정/.test(line) || /^20\d{2}\s+\d{1,2}\s*[~-]\s*\d{1,2}$/.test(line));
  const section = paragraphs.slice(start + 1, endOffset >= 0 ? start + 1 + endOffset : start + 200);
  const groups: Array<{ title: string; lines: string[] }> = [];
  const pending: string[] = [];
  for (const line of section) {
    const cleanLine = line.trim();
    if (!cleanLine || /^[-:,!·•]+$/.test(cleanLine) || /^\d+\s*$/.test(cleanLine)) continue;
    const match = cleanLine.match(/^\s*(\d{1,2})\s*[.)]\s*(?:\d+\.\s*)?(.*)/);
    if (match) {
      let prefix = pending.splice(0).join(" ").trim();
      const previous = groups.at(-1);
      if (previous?.lines.length) {
        const candidate = previous.lines.at(-1) ?? "";
        if (/(?:월.*(?:시상|축하)|학교|모집|구합니다|기도회)$/.test(candidate)) {
          previous.lines.pop();
          prefix = candidate;
        }
      }
      const suffix = match[2].trim();
      const title = /^\d{1,2}$/.test(suffix) && prefix ? `${suffix}${prefix}` : [suffix, prefix].filter(Boolean).join(" ");
      groups.push({ title, lines: [] });
    } else if (groups.length) {
      groups[groups.length - 1].lines.push(cleanLine);
    } else {
      pending.push(cleanLine);
    }
  }
  return groups.map((group) => {
    const parts = [group.title, ...group.lines].map((part) => part.replace(/[ \t]+/g, " ").trim()).filter(Boolean);
    return parts.join("\n").trim();
  }).filter(Boolean);
}

export function parseHwpWorshipInfo(buffer: Buffer, date: string) {
  const paragraphs = extractHwpParagraphs(buffer);
  return {
    sermon: extractSermon(paragraphs),
    service: extractService(paragraphs, date),
    announcements: extractAnnouncements(paragraphs),
    extraction: { format: "hwp", requiresReview: true, evidenceLines: paragraphs } satisfies WorshipExtraction
  };
}

export function parsePdfWorshipText(text: string, date: string) {
  const paragraphs = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (paragraphs.join("").replace(/\s/g, "").length < 10) {
    throw new Error("PDF에서 읽을 수 있는 텍스트를 찾지 못했습니다. 스캔 PDF는 이름을 추정하지 않으므로 한컴에서 텍스트형 PDF로 다시 저장해 주세요.");
  }
  return {
    sermon: extractSermon(paragraphs),
    service: extractService(paragraphs, date),
    announcements: extractAnnouncements(paragraphs),
    extraction: { format: "pdf", requiresReview: true, evidenceLines: paragraphs } satisfies WorshipExtraction
  };
}

export async function parsePdfWorshipInfo(buffer: Buffer, date: string) {
  const pdfParse = eval("require")("pdf-parse") as (input: Buffer) => Promise<{ text?: string }>;
  const parsed = await pdfParse(buffer);
  return parsePdfWorshipText(parsed.text ?? "", date);
}
