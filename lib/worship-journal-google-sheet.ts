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

/** Input is A43:Z200 of the copied tab, including the 기타사항 heading. */
export function inspectAnnouncementSlots(rows: unknown[][]) {
  if (!String(rows[0]?.[1] ?? "").includes("기타사항")) {
    throw new Error("예배일지 기타사항 위치(B43)를 확인하지 못했습니다. 양식을 확인해 주세요.");
  }
  let slots = 0;
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const text = String(row[1] ?? "").trim();
    if (row.some((value, column) => column !== 1 && String(value ?? "").trim())) {
      throw new Error(`예배일지 ${43 + index}행에 광고 외의 값이 있어 자동 행 변경을 중단했습니다.`);
    }
    if (text && !/^\d{1,3}\s*[.)]/.test(text)) {
      // Preserve the footer and everything below it, never treat it as an ad.
      if (/^\[?\s*예배\s*마침/.test(text) && slots >= 9) return slots;
      throw new Error(`예배일지 ${43 + index}행의 광고 경계를 확인하지 못했습니다.`);
    }
    slots += 1;
  }
  if (rows.length >= 158) throw new Error("예배일지 광고가 확인 범위를 넘어갑니다. 양식을 확인해 주세요.");
  return Math.max(9, slots);
}

export function buildSheetStructureRequests(sheetId: number, announcementCount = 0, existingSlots = 9) {
  if (!Number.isSafeInteger(existingSlots) || existingSlots < 9) throw new Error("기존 광고 칸 수가 올바르지 않습니다.");
  const requests: Array<Record<string, unknown>> = [];
  const targetSlots = Math.max(9, announcementCount);
  const extraAnnouncements = targetSlots - existingSlots;
  const insertAt = 43 + existingSlots;
  if (extraAnnouncements < 0) {
    requests.push({ deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: 43 + targetSlots, endIndex: insertAt } } });
  }
  if (extraAnnouncements > 0) {
    requests.push(
      { insertDimension: { range: { sheetId, dimension: "ROWS", startIndex: insertAt, endIndex: insertAt + extraAnnouncements }, inheritFromBefore: true } },
      {
        copyPaste: {
          source: { sheetId, startRowIndex: 50, endRowIndex: 51, startColumnIndex: 0, endColumnIndex: 11 },
          destination: { sheetId, startRowIndex: insertAt, endRowIndex: insertAt + extraAnnouncements, startColumnIndex: 0, endColumnIndex: 11 },
          pasteType: "PASTE_FORMAT"
        }
      }
    );
    for (let row = insertAt; row < insertAt + extraAnnouncements; row += 1) {
      requests.push({ mergeCells: { range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 1, endColumnIndex: 11 }, mergeType: "MERGE_ALL" } });
    }
  }
  return requests;
}

export function buildSheetPostWriteRequests(sheetId: number, announcementCount = 0) {
  const endRowIndex = 43 + Math.max(9, announcementCount);
  const continuation = { sheetId, startRowIndex: 51, endRowIndex, startColumnIndex: 1, endColumnIndex: 11 };
  return [
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 43, endRowIndex, startColumnIndex: 1, endColumnIndex: 11 },
        cell: { userEnteredFormat: { wrapStrategy: "WRAP", verticalAlignment: "TOP" } },
        fields: "userEnteredFormat.wrapStrategy,userEnteredFormat.verticalAlignment"
      }
    },
    // The template's ninth slot has a different bold font and top border.
    // Reuse the eighth slot (row 51), including for newly inserted rows.
    { unmergeCells: { range: continuation } },
    { mergeCells: { range: continuation, mergeType: "MERGE_ROWS" } },
    { copyPaste: {
      source: { sheetId, startRowIndex: 50, endRowIndex: 51, startColumnIndex: 1, endColumnIndex: 11 },
      destination: continuation,
      pasteType: "PASTE_FORMAT"
    } },
    { repeatCell: { range: continuation, cell: { textFormatRuns: [] }, fields: "textFormatRuns" } },
    // Only the outside bottom edge remains; no divider before item 9 or later.
    { updateBorders: {
      range: { ...continuation, startRowIndex: endRowIndex - 1 },
      bottom: { style: "SOLID_MEDIUM", color: { red: 0, green: 0, blue: 0 } }
    } },
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
  const seenAnnouncements = new Map<string, number>();
  journal.announcements.forEach((text, index) => {
    // Compare the whole body, not just the title: separate meetings with the
    // same title but different times must remain separate.
    const key = text.replace(/^\s*\d{1,3}\s*[.)]\s*/, "").replace(/\s/g, "");
    if (!key) return;
    const earlier = seenAnnouncements.get(key);
    if (earlier !== undefined) throw new Error(`동일한 광고가 ${earlier + 1}번과 ${index + 1}번에 중복되어 있습니다. 미리보기에서 중복 항목을 제거해 주세요.`);
    seenAnnouncements.set(key, index);
  });
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
  if ((accounting?.purpose.length ?? 0) > 10) throw new Error("목적헌금은 기존 양식에 최대 10건까지 입력할 수 있습니다. 내역을 누락하지 않도록 제출을 중단했습니다.");
  const thanksgivingText = sortThanksgivingOfferings(accounting?.thanksgiving ?? [])
    .map((offering) => {
      const base = `${offering.name} (${offering.amount.toLocaleString("ko-KR")}원)`;
      return offering.note ? `${base} ${offering.note}` : base;
    })
    .join("\n");
  const purposeRows = padRows(
    // H26:K26 is one merged header. The existing detail area is below it:
    // H/I = name, J/K = amount. Never place a value inside the header merge.
    (accounting?.purpose ?? []).slice(0, 10).map((offering) => [offering.name, "", offering.amount, ""]),
    10,
    4
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
    cell("H26", ""),
    { range: `${sheet}!H27:K36`, values: purposeRows },
    cell("C37", (accounting?.sundayTotal ?? 0) + (accounting?.thanksgivingTotal ?? 0)),
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
