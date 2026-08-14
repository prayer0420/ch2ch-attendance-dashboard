export type AttendancePerson = {
  family: string;
  name: string;
  service13Raw: string;
  service4Raw: string;
  service13: boolean;
  service4: boolean;
  note: string;
};

export type AttendanceParseResult = {
  people: AttendancePerson[];
  previewRows: string[][];
  layout: "horizontal_family" | "vertical_table";
  warnings: string[];
};

export type AttendanceParseOptions = {
  includeUnchecked?: boolean;
};

const SOURCE_COLUMN_LIMIT = 120; // A through DP. DQ, DR, DS, DT are summary/helper columns.

export function normalizeName(value: unknown) {
  return String(value || "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, "").trim().toLowerCase();
}

export function decodeInputBuffer(buffer: Buffer | ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("euc-kr").decode(bytes).replace(/^\uFEFF/, "");
  }
}

function detectDelimiter(text: string) {
  const sampleLines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean).slice(0, 10);
  const candidates = [",", "\t", ";"];
  let best = ",";
  let bestScore = -1;

  for (const delimiter of candidates) {
    const score = sampleLines.reduce((sum, line) => {
      let quoted = false;
      let count = 0;
      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === "\"") quoted = !quoted;
        else if (char === delimiter && !quoted) count += 1;
      }
      return sum + count;
    }, 0);
    if (score > bestScore) {
      best = delimiter;
      bestScore = score;
    }
  }

  return best;
}

export function parseCsv(text: string, delimiter = detectDelimiter(text)) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(cleanCell(cell));
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cleanCell(cell));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cleanCell(cell));
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function cleanCell(value: string) {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\u00A0/g, " ").trim();
}

export function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

export function rowsToCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

export function isChecked(value: unknown) {
  const normalized = normalizeName(value);
  return ["o", "v", "true", "yes", "y", "1", "체크", "참석", "✓", "✔", "☑", "✅", "○", "〇", "ㅇ"].includes(normalized);
}

function isLikelyPersonName(value: unknown) {
  const raw = String(value ?? "").replace(/[\u200B-\u200D\uFEFF]/g, " ").trim();
  const compact = normalizeName(raw);
  if (!compact) return false;
  if (!/[가-힣a-z]/i.test(compact)) return false;
  if (/^\d+$/.test(compact)) return false;
  if (/\d{1,2}[./-]\d{1,2}/.test(compact)) return false;

  const blocked = [
    "이름",
    "성명",
    "출석",
    "재적",
    "참석합계",
    "방송합계",
    "합계",
    "소계",
    "방문자",
    "새가족반",
    "주일",
    "날짜",
    "부서",
    "가족",
    "가정"
  ];
  return !blocked.some((word) => compact.includes(normalizeName(word)));
}

function findHeaderIndex(headers: string[], candidates: string[], fallback: number) {
  const normalizedHeaders = headers.map((header) => normalizeName(header));
  const found = normalizedHeaders.findIndex((header) =>
    candidates.some((candidate) => header.includes(normalizeName(candidate)))
  );
  return found >= 0 ? found : fallback;
}

function hasAnyHeader(text: string, candidates: string[]) {
  const normalized = normalizeName(text);
  return candidates.some((candidate) => normalized.includes(normalizeName(candidate)));
}

function rangeColumns(start: number, end: number) {
  const columns: number[] = [];
  for (let column = Math.max(0, start); column < Math.min(end, SOURCE_COLUMN_LIMIT); column += 1) columns.push(column);
  return columns;
}

function attendanceColumns(rows: string[][], start: number, end: number) {
  if (start < 0) return [];

  const subHeader = rows[1] || [];
  const columns = rangeColumns(start, end).filter((column) => {
    const label = normalizeName(subHeader[column]);
    if (!label) return false;
    if (label.includes("방송") || label.includes("가족")) return false;
    return label.includes("참석") || label.includes("출석");
  });

  if (columns.length) return columns;

  const span = rangeColumns(start, end);
  // Google CSV can omit the visual sub-header row. In that layout the first
  // cell under each service is QR and the second cell is attendance; later
  // cells are broadcast/family helpers. Only the attendance cell maps to web교적.
  return span.length >= 2 ? span.slice(1, 2) : span.slice(0, 1);
}

function isLikelyFamilyLabel(value: unknown) {
  const normalized = normalizeName(value);
  return normalized.endsWith("이네")
    || normalized.endsWith("네")
    || normalized.endsWith("가정")
    || normalized.endsWith("가족")
    || normalized.includes("새가족반")
    || normalized.includes("새가족팀");
}

function isIgnoredFamilyLabel(value: unknown) {
  const normalized = normalizeName(value);
  return normalized.includes("방문자") || normalized.includes("새가족방문자") || normalized.includes("새가족반방문자");
}

function isBlockFamilyLabel(row: string[], block: { start: number; nextStart: number; service13Columns: number[]; service4Columns: number[]; controlColumns?: number[] }) {
  const label = String(row[block.start] || "").trim();
  if (!label) return false;
  if (!isLikelyFamilyLabel(label)) return false;

  const serviceColumns = new Set(block.controlColumns ?? [...block.service13Columns, ...block.service4Columns]);
  const hasCheckedService = Array.from(serviceColumns).some((column) => isChecked(row[column]));
  if (hasCheckedService) return false;

  const otherCells = row
    .slice(block.start + 1, block.nextStart)
    .filter((_, index) => !serviceColumns.has(block.start + 1 + index))
    .map((cell) => String(cell || "").trim())
    .filter(Boolean);

  return otherCells.length === 0;
}

function isFamilyLabelRow(row: string[], blocks: Array<{ start: number }>) {
  return blocks.filter((block) => isLikelyFamilyLabel(row[block.start])).length >= 2;
}

function parseHorizontalFamilyLayout(rows: string[][], options: AttendanceParseOptions = {}) {
  const header = rows[0] || [];
  const familyStarts: Array<{ family: string; start: number }> = [];

  for (let index = 0; index < Math.min(header.length, SOURCE_COLUMN_LIMIT); index += 1) {
    const label = String(header[index] || "").trim();
    if (!label || ["1-3부", "1~3부", "4부", "출석", "이름", "성명", "가족", "가정", "가족명", "어디가족", "참석합계", "방송합계", "합계", "소계", "방문자"].includes(label)) continue;

    const nearby = header.slice(index + 1, index + 10).map((value) => normalizeName(value));
    if (nearby.some((value) => value.includes("1-3부")) && nearby.some((value) => value.includes("4부"))) {
      familyStarts.push({ family: label, start: index });
    }
  }

  if (!familyStarts.length) return null;

  const blockWidths = familyStarts.slice(1).map((block, index) => block.start - familyStarts[index].start);
  const blockWidth = blockWidths.length ? Math.min(...blockWidths.filter((width) => width > 0)) : header.length;
  const blocks = familyStarts.map((block, index) => {
    const nextStart = Math.min(familyStarts[index + 1]?.start ?? Math.min(header.length, block.start + blockWidth), SOURCE_COLUMN_LIMIT);
    const blockHeader = header.slice(block.start, nextStart).map((value) => String(value || ""));
    const service13Start = block.start + blockHeader.findIndex((value) => hasAnyHeader(value, ["1-3부", "1~3부", "1부", "2부", "3부"]));
    const service4Start = block.start + blockHeader.findIndex((value) => hasAnyHeader(value, ["4부"]));
    return {
      ...block,
      nextStart,
      service13Start,
      service4Start,
      controlColumns: rangeColumns(service13Start, nextStart),
      // Only the attendance cell maps to web교적. QR is a separate scan signal.
      service13Columns: attendanceColumns(rows, service13Start, service4Start),
      service4Columns: attendanceColumns(rows, service4Start, nextStart)
    };
  }).filter((block) => block.service13Start >= block.start && block.service4Start >= block.start);

  const activeFamilies = blocks.map((block) => block.family);
  const people: AttendancePerson[] = [];
  for (const row of rows.slice(1)) {
    if (isFamilyLabelRow(row, blocks)) {
      blocks.forEach((block, index) => {
        const family = String(row[block.start] || "").trim();
        if (isLikelyFamilyLabel(family)) activeFamilies[index] = family;
      });
      continue;
    }

    let updatedFamilyLabel = false;
    blocks.forEach((block, index) => {
      if (isBlockFamilyLabel(row, block)) {
        activeFamilies[index] = String(row[block.start] || "").trim();
        updatedFamilyLabel = true;
      }
    });
    if (updatedFamilyLabel) continue;

    blocks.forEach((block, index) => {
      const name = String(row[block.start] || "").trim();
      if (!isLikelyPersonName(name)) return;
      const family = activeFamilies[index];
      if (isIgnoredFamilyLabel(family)) return;

      const service13Cells = block.service13Columns.map((column) => row[column]);
      const service4Cells = block.service4Columns.map((column) => row[column]);
      const service13 = service13Cells.some(isChecked);
      const service4 = service4Cells.some(isChecked);

      if (!options.includeUnchecked && !service13 && !service4) return;

      people.push({
        family,
        name,
        service13Raw: service13 ? "O" : "X",
        service4Raw: service4 ? "O" : "X",
        service13,
        service4,
        note: ""
      });
    });
  }

  return { people, warnings: [] };
}

function parseVerticalTable(rows: string[][], options: AttendanceParseOptions = {}) {
  const headers = rows[0] || [];
  const familyIndex = findHeaderIndex(headers, ["가족", "가정", "가족명", "어디가족"], 0);
  const nameIndex = findHeaderIndex(headers, ["이름", "성명", "대상자"], 1);
  const service13Index = findHeaderIndex(headers, ["1-3", "1~3", "1부", "2부", "3부"], 2);
  const service4Index = findHeaderIndex(headers, ["4부"], 3);
  const noteIndex = findHeaderIndex(headers, ["심방기도제목", "메모", "비고", "사유"], 4);

  let currentFamily = "";
  return rows.slice(1)
    .map((row) => {
      const family = row[familyIndex] || currentFamily;
      if (row[familyIndex]) currentFamily = row[familyIndex];
      const service13 = isChecked(row[service13Index]);
      const service4 = isChecked(row[service4Index]);
      return {
        family,
        name: row[nameIndex] || "",
        service13Raw: row[service13Index] || (service13 ? "O" : "X"),
        service4Raw: row[service4Index] || (service4 ? "O" : "X"),
        service13,
        service4,
        note: row[noteIndex] || ""
      };
    })
    .filter((person) =>
      person.family &&
      !isIgnoredFamilyLabel(person.family) &&
      isLikelyPersonName(person.name) &&
      (options.includeUnchecked || person.service13 || person.service4)
    );
}

export function parseAttendanceRows(rows: string[][], options: AttendanceParseOptions = {}): AttendanceParseResult {
  if (rows.length < 2) {
    throw new Error("읽을 수 있는 출석 데이터 행이 없습니다.");
  }

  const warnings = new Set<string>();
  for (let start = 0; start < Math.min(rows.length, 10); start += 1) {
    const candidateRows = rows.slice(start);
    const horizontalResult = parseHorizontalFamilyLayout(candidateRows, options);
    horizontalResult?.warnings.forEach((warning) => warnings.add(warning));
    const horizontalPeople = horizontalResult?.people ?? [];
    if (horizontalPeople.length) {
      const mergedPeople = mergeDuplicatePeople(horizontalPeople);
      return {
        people: mergedPeople,
        previewRows: candidateRows.slice(0, 8).map((row) => row.slice(0, 14)),
        layout: "horizontal_family",
        warnings: Array.from(warnings)
      };
    }
  }

  const verticalStart = findVerticalHeaderRow(rows);
  const verticalRows = rows.slice(verticalStart);
  const verticalPeople = mergeDuplicatePeople(parseVerticalTable(verticalRows, options));
  if (!verticalPeople.length) {
    const detail = warnings.size ? ` ${Array.from(warnings).join(" ")}` : "";
    throw new Error(`가족/이름/1-3부/4부 참석 체크를 찾지 못했습니다.${detail} A~DP 범위만 확인하며 DQ~DT와 출석 요약 칸은 보지 않습니다. QR/방송/가족 칸은 웹교적 출석으로 보지 않습니다. '가장체크' 탭 형식을 확인해 주세요.`);
  }
  return {
    people: verticalPeople,
    previewRows: verticalRows.slice(0, 8).map((row) => row.slice(0, 10)),
    layout: "vertical_table",
    warnings: Array.from(warnings)
  };
}

function findVerticalHeaderRow(rows: string[][]) {
  for (let index = 0; index < Math.min(rows.length, 20); index += 1) {
    const normalized = rows[index].map((cell) => normalizeName(cell));
    const hasFamily = normalized.some((cell) => ["가족", "가정", "가족명", "어디가족"].some((key) => cell.includes(normalizeName(key))));
    const hasName = normalized.some((cell) => ["이름", "성명", "대상자"].some((key) => cell.includes(normalizeName(key))));
    const hasService = normalized.some((cell) => cell.includes("1-3") || cell.includes("4부"));
    if (hasFamily && hasName && hasService) return index;
  }
  return 0;
}

function mergeDuplicatePeople(people: AttendancePerson[]) {
  const merged = new Map<string, AttendancePerson>();

  for (const person of people) {
    const key = `${normalizeName(person.family)}::${normalizeName(person.name)}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...person });
      continue;
    }

    existing.service13 = existing.service13 || person.service13;
    existing.service4 = existing.service4 || person.service4;
    existing.service13Raw = existing.service13 ? "O" : "X";
    existing.service4Raw = existing.service4 ? "O" : "X";
    if (person.note && !existing.note.includes(person.note)) {
      existing.note = existing.note ? `${existing.note}; ${person.note}` : person.note;
    }
  }

  return Array.from(merged.values());
}

export function parseAttendanceCsv(csvText: string, options: AttendanceParseOptions = {}) {
  return parseAttendanceRows(parseCsv(csvText), options);
}
