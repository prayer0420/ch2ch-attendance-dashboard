import type { WorshipJournal } from "./worship-journal";

export type SpreadsheetSheet = {
  properties?: {
    sheetId?: number;
    title?: string;
    index?: number;
  };
};

export type SheetValueUpdate = {
  range: string;
  values: Array<Array<string | number>>;
};

type JournalOutput = Pick<
  WorshipJournal,
  "date" | "author" | "attendance" | "newFamilies" | "graduates" | "sermon" | "service" | "announcements" | "accounting"
>;

function sortThanksgivingOfferings<T extends { name: string; note: string }>(offerings: T[]) {
  return [...offerings].sort((left, right) => {
    const noteOrder = Number(Boolean(right.note.trim())) - Number(Boolean(left.note.trim()));
    return noteOrder || left.name.localeCompare(right.name, "ko-KR");
  });
}

function parseJournalDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error("예배일지 날짜가 올바르지 않습니다.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error("예배일지 날짜가 올바르지 않습니다.");
  }
  return { year, month, day };
}

export function journalTabName(date: string) {
  const { month, day } = parseJournalDate(date);
  return `${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

export function selectTemplateSheet(sheets: SpreadsheetSheet[], targetTitle: string) {
  const normalized = sheets
    .map((sheet) => sheet.properties)
    .filter((properties): properties is Required<NonNullable<SpreadsheetSheet["properties"]>> =>
      typeof properties?.sheetId === "number" &&
      typeof properties.title === "string" &&
      typeof properties.index === "number"
    );

  if (normalized.some((sheet) => sheet.title === targetTitle)) {
    throw new Error(`${targetTitle} 예배일지 탭이 이미 존재합니다. 기존 탭은 덮어쓰지 않습니다.`);
  }

  const template = normalized
    .filter((sheet) => /^\d{4}$/.test(sheet.title))
    .sort((left, right) => left.index - right.index)[0];
  if (!template) throw new Error("복제할 최신 예배일지 탭을 찾지 못했습니다.");
  return template;
}

export function buildSheetStructureRequests(sheetId: number, announcementCount = 0) {
  const requests: Array<Record<string, unknown>> = [];
  const extraAnnouncements = Math.max(0, announcementCount - 9);
  if (extraAnnouncements) {
    requests.push(
      { insertDimension: { range: { sheetId, dimension: "ROWS", startIndex: 52, endIndex: 52 + extraAnnouncements }, inheritFromBefore: true } },
      {
        copyPaste: {
          source: { sheetId, startRowIndex: 51, endRowIndex: 52, startColumnIndex: 0, endColumnIndex: 11 },
          destination: { sheetId, startRowIndex: 52, endRowIndex: 52 + extraAnnouncements, startColumnIndex: 0, endColumnIndex: 11 },
          pasteType: "PASTE_FORMAT"
        }
      }
    );
    for (let row = 52; row < 52 + extraAnnouncements; row += 1) {
      requests.push({ mergeCells: { range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 1, endColumnIndex: 11 }, mergeType: "MERGE_ALL" } });
    }
  }
  return requests;
}

export function buildSheetPostWriteRequests(sheetId: number, announcementCount = 0) {
  const endRowIndex = 43 + Math.max(9, announcementCount);
  return [
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 43, endRowIndex, startColumnIndex: 1, endColumnIndex: 11 },
        cell: { userEnteredFormat: { wrapStrategy: "WRAP", verticalAlignment: "TOP" } },
        fields: "userEnteredFormat.wrapStrategy,userEnteredFormat.verticalAlignment"
      }
    },
    { autoResizeDimensions: { dimensions: { sheetId, dimension: "ROWS", startIndex: 43, endIndex: endRowIndex } } }
  ];
}

function padRows(rows: Array<Array<string | number>>, rowCount: number, columnCount: number) {
  return Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: columnCount }, (_, columnIndex) => rows[rowIndex]?.[columnIndex] ?? "")
  );
}

function attendanceCount(count: number, online: number) {
  return online > 0 ? `${count}(${online})` : String(count);
}

function familyGrid(journal: JournalOutput) {
  if (journal.attendance.families.length > 30) {
    throw new Error("가족별 출석은 현재 예배일지 양식에 최대 30가족까지 입력할 수 있습니다.");
  }
  const rows = Array.from({ length: 6 }, () => Array<string | number>(10).fill(""));
  journal.attendance.families.forEach((family, index) => {
    const group = Math.floor(index / 10);
    const column = index % 10;
    rows[group * 2][column] = family.family;
    rows[group * 2 + 1][column] = `${family.service13}/${family.service4}/${family.familyMeeting}`;
  });
  return rows;
}

function quotedSheetTitle(title: string) {
  return `'${title.replace(/'/g, "''")}'`;
}

export function buildSheetValueUpdates(sheetTitle: string, journal: JournalOutput): SheetValueUpdate[] {
  const { year, month, day } = parseJournalDate(journal.date);
  const sheet = quotedSheetTitle(sheetTitle);
  const newFamilies = padRows(
    journal.newFamilies.slice(0, 8).map((entry) => [entry.name, entry.generation, entry.inviter, entry.relationship, entry.note]),
    8,
    5
  );
  const graduates = padRows(
    journal.graduates.slice(0, 8).map((entry) => [entry.name, entry.generation, entry.family]),
    8,
    3
  );
  const announcementRowCount = Math.max(9, journal.announcements.length);
  const announcements = padRows(
    journal.announcements.map((announcement, index) => [`${index + 1}. ${announcement}`]),
    announcementRowCount,
    1
  );
  const accounting = journal.accounting;
  const thanksgivingText = sortThanksgivingOfferings(accounting?.thanksgiving ?? [])
    .map((offering) => {
      const base = `${offering.name} (${offering.amount.toLocaleString("ko-KR")}원)`;
      return offering.note ? `${base} ${offering.note}` : base;
    })
    .join("\n");
  const purposeRows = padRows(
    (accounting?.purpose ?? []).slice(0, 10).map((offering) => [offering.name, offering.amount]),
    10,
    2
  );

  const cell = (address: string, value: string | number): SheetValueUpdate => ({
    range: `${sheet}!${address}`,
    values: [[value]]
  });

  return [
    cell("E3", `${year}년`),
    cell("G3", `${month}월`),
    cell("H3", `${day}일`),
    cell("I3", `작성자 : ${journal.author.trim()}`),
    cell("B6", attendanceCount(journal.attendance.service13, journal.attendance.service13Online)),
    cell("D6", attendanceCount(journal.attendance.service4, journal.attendance.service4Online)),
    cell("F6", String(journal.attendance.familyMeeting)),
    cell("H6", String(journal.newFamilies.length)),
    cell("J6", String(journal.graduates.length)),
    { range: `${sheet}!B9:F16`, values: newFamilies },
    { range: `${sheet}!G9:I16`, values: graduates },
    cell("B17", "♥가족별 출석률(1-3부/4부-청년예배/가족모임)"),
    { range: `${sheet}!B18:K23`, values: familyGrid(journal) },
    cell("C25", accounting?.sundayTotal ?? 0),
    cell("C26", accounting?.thanksgivingTotal ?? 0),
    cell("H25", accounting?.purposeTotal ?? 0),
    cell("C27", thanksgivingText),
    cell("G26", "목적헌금 내역"),
    { range: `${sheet}!H26:I35`, values: purposeRows },
    cell("C37", accounting?.total ?? 0),
    cell("G37", ""),
    cell("H37", ""),
    cell("B39", "예배안내"),
    cell("C39", journal.service.guide),
    cell("G39", "식당봉사"),
    cell("H39", journal.service.mealService),
    cell("B40", "뒷정리"),
    // 기존 양식은 예배안내와 뒷정리 값을 C39:F40 한 칸으로 병합해 공유합니다.
    cell("G40", "헌금위원"),
    cell("H40", journal.service.offeringMembers),
    cell("B41", "설교제목"),
    cell("C41", journal.sermon.title),
    cell("G41", "헌금기도"),
    cell("H41", journal.service.offeringPrayer),
    cell("B42", "설교본문"),
    cell("C42", journal.sermon.passage),
    cell("G42", "설교"),
    cell("H42", journal.sermon.preacher),
    { range: `${sheet}!B44:B${43 + announcementRowCount}`, values: announcements }
  ];
}
