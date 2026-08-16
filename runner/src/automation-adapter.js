const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createClient } = require("@supabase/supabase-js");
const XLSX = require("xlsx");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const LEGACY_DIR = path.join(ROOT_DIR, "runner", "legacy-ch2ch");
const LEGACY_DATA_DIR = path.join(LEGACY_DIR, "data");
const LEGACY_ATTENDANCE_FILE = path.join(LEGACY_DATA_DIR, "attendance.csv");
const LEGACY_RESULT_FILE = path.join(LEGACY_DIR, "logs", "result.json");
function normalizeName(value) {
  return String(value || "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, "").trim().toLowerCase();
}

function extractSheetInfo(url) {
  const idMatch = String(url || "").match(/\/spreadsheets\/d\/([^/]+)/);
  const publishedMatch = String(url || "").match(/\/spreadsheets\/d\/e\/([^/]+)/);
  const gidMatch = String(url || "").match(/[?&#]gid=(\d+)/);
  return {
    spreadsheetId: idMatch && idMatch[1] ? idMatch[1] : null,
    publishedId: publishedMatch && publishedMatch[1] ? publishedMatch[1] : null,
    gid: gidMatch && gidMatch[1] ? gidMatch[1] : "0"
  };
}

function buildGoogleCsvUrl(url, tabName) {
  let parsed;
  try {
    parsed = new URL(String(url || ""));
  } catch {
    return null;
  }

  if ((parsed.searchParams.get("output") === "csv" || parsed.searchParams.get("format") === "csv") && parsed.hostname.includes("docs.google.com")) {
    return String(url);
  }

  const { spreadsheetId, publishedId } = extractSheetInfo(url);
  if (spreadsheetId) {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName || "가장체크")}`;
  }

  if (publishedId) {
    const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/e/${publishedId}/pub`);
    exportUrl.searchParams.set("output", "csv");
    const gid = parsed.searchParams.get("gid");
    if (gid) exportUrl.searchParams.set("gid", gid);
    return exportUrl.toString();
  }

  return null;
}

function decodeInputBuffer(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("euc-kr").decode(buffer).replace(/^\uFEFF/, "");
  }
}

function detectDelimiter(text) {
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

function cleanCell(value) {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\u00A0/g, " ").trim();
}

function parseCsv(text, delimiter = detectDelimiter(text)) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

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

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

function toCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase 환경변수 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function findHeaderIndex(headers, candidates, fallback) {
  const normalizedHeaders = headers.map((header) => normalizeName(header));
  const found = normalizedHeaders.findIndex((header) =>
    candidates.some((candidate) => header.includes(normalizeName(candidate)))
  );
  return found >= 0 ? found : fallback;
}

function isChecked(value) {
  const normalized = normalizeName(value);
  return ["o", "v", "true", "yes", "y", "1", "체크", "참석", "✓", "✔", "☑", "✅", "○", "〇", "ㅇ"].includes(normalized);
}

function isLikelyPersonName(value) {
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

function hasAnyHeader(text, candidates) {
  const normalized = normalizeName(text);
  return candidates.some((candidate) => normalized.includes(normalizeName(candidate)));
}

function rangeColumns(start, end) {
  const columns = [];
  for (let column = Math.max(0, start); column < end; column += 1) columns.push(column);
  return columns;
}

function attendanceColumns(rows, start, end) {
  if (start < 0) return [];

  const subHeader = rows[1] || [];
  const columns = rangeColumns(start, end).filter((column) => {
    const label = normalizeName(subHeader[column]);
    if (!label) return false;
    if (label.includes("방송") || label.includes("가족")) return false;
    return label.includes("참석");
  });

  if (columns.length) return columns;

  const span = rangeColumns(start, end);
  // Google CSV can omit the visual sub-header row. In that layout the first
  // cell under each service is QR and the second cell is attendance; later
  // cells are broadcast/family helpers. Only the attendance cell maps to web교적.
  return span.length >= 2 ? span.slice(1, 2) : span.slice(0, 1);
}

function isLikelyFamilyLabel(value) {
  const normalized = normalizeName(value);
  return normalized.endsWith("이네")
    || normalized.endsWith("네")
    || normalized.endsWith("가정")
    || normalized.endsWith("가족")
    || normalized.includes("새가족반")
    || normalized.includes("새가족팀");
}

function isIgnoredFamilyLabel(value) {
  const normalized = normalizeName(value);
  return normalized.includes("새가족방문자") || normalized.includes("새가족반방문자");
}

function isBlockFamilyLabel(row, block) {
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

function isFamilyLabelRow(row, blocks) {
  return blocks.filter((block) => isLikelyFamilyLabel(row[block.start])).length >= 2;
}

async function downloadGoogleSheetCsv(run) {
  const exportUrl = buildGoogleCsvUrl(run.google_sheet_url, run.google_sheet_tab || "가장체크");
  if (!exportUrl) {
    throw new Error("구글시트 URL 형식이 올바르지 않습니다.");
  }

  const response = await fetch(exportUrl);
  const text = await response.text();

  if (!response.ok || text.includes("<!DOCTYPE html")) {
    throw new Error("구글시트를 CSV로 읽지 못했습니다. 시트 공유 권한을 '링크가 있는 사용자 보기 가능'으로 바꾸거나 기존 구글 인증 로직이 필요합니다.");
  }

  return text.replace(/^\uFEFF/, "");
}

async function downloadUploadedFile(run) {
  const source = getStoredSource(run);
  if (!source.path) {
    throw new Error("업로드 파일 경로가 없습니다. 파일 업로드 방식으로 다시 실행해 주세요.");
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.from("attendance-inputs").download(source.path);
  if (error) throw new Error(`업로드 파일을 읽지 못했습니다: ${error.message}`);

  return Buffer.from(await data.arrayBuffer());
}

function getStoredSource(run) {
  if (run.source_file_path) {
    return {
      path: run.source_file_path,
      name: run.source_file_name || run.csv_file_name || "",
      type: run.source_file_type || ""
    };
  }

  try {
    const parsed = JSON.parse(run.csv_file_name || "{}");
    if (parsed && typeof parsed === "object") {
      return {
        path: parsed.path || "",
        name: parsed.name || "",
        type: parsed.type || ""
      };
    }
  } catch {}

  return {
    path: "",
    name: run.csv_file_name || "",
    type: ""
  };
}

function spreadsheetBufferToCsv(buffer, requestedTab) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const tab = String(requestedTab || "가장체크").trim();
  const sheetName = workbook.SheetNames.find((name) => name.trim() === tab);
  if (!sheetName) {
    throw new Error(`엑셀 파일에 '${tab}' 탭이 없습니다. 발견된 탭: ${workbook.SheetNames.join(", ")}`);
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("엑셀 파일에서 읽을 수 있는 시트를 찾지 못했습니다.");
  return XLSX.utils.sheet_to_csv(sheet);
}

function rowsFromPdfText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\t| {2,}/).map((cell) => cell.trim()).filter(Boolean));
}

async function pdfBufferToCsv(buffer) {
  let pdfParse;
  try {
    pdfParse = require("pdf-parse");
  } catch {
    throw new Error("PDF 파일을 읽으려면 pdf-parse 패키지가 필요합니다. npm install을 먼저 실행해 주세요.");
  }

  const positionalRows = [];
  const parsed = await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const content = await pageData.getTextContent();
      const lineMap = new Map();

      for (const item of content.items) {
        const text = String(item.str || "").trim();
        if (!text) continue;
        const y = Math.round(item.transform[5] / 3) * 3;
        const line = lineMap.get(y) || [];
        line.push(item);
        lineMap.set(y, line);
      }

      const pageRows = Array.from(lineMap.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([, items]) => {
          const sorted = items.sort((a, b) => a.transform[4] - b.transform[4]);
          const cells = [];
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
            lastEnd = x + (item.width || String(item.str || "").length * 7);
          }
          if (current.trim()) cells.push(current.trim());
          return cells;
        })
        .filter((row) => row.some(Boolean));

      positionalRows.push(...pageRows);
      return toCsv(pageRows);
    }
  });

  if (positionalRows.some((row) => row.length >= 4)) {
    return toCsv(positionalRows);
  }
  return toCsv(rowsFromPdfText(parsed.text));
}

async function loadInputCsv(run, reporter) {
  const source = getStoredSource(run);
  if (run.data_source === "file" || source.path) {
    await reporter.event("file_read_started", `입력 파일 읽기 시작: ${source.name || run.csv_file_name || ""}`);
    const buffer = await downloadUploadedFile(run);
    const fileType = String(source.type || source.name || run.csv_file_name || "").toLowerCase();

    if (fileType.endsWith("xlsx") || fileType.endsWith("xls")) {
      return spreadsheetBufferToCsv(buffer, run.google_sheet_tab);
    }
    if (fileType.endsWith("pdf")) {
      return await pdfBufferToCsv(buffer);
    }
    return decodeInputBuffer(buffer);
  }

  await reporter.event("sheet_read_started", "구글시트 읽기 시작");
  return await downloadGoogleSheetCsv(run);
}

function parseHorizontalFamilyLayout(rows) {
  const header = rows[0] || [];
  const familyStarts = [];

  for (let index = 0; index < header.length; index += 1) {
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
    const nextStart = Math.min(familyStarts[index + 1]?.start ?? Math.min(header.length, block.start + blockWidth), header.length);
    const blockHeader = header.slice(block.start, nextStart).map((value) => String(value || ""));
    const service13Start = block.start + blockHeader.findIndex((value) => hasAnyHeader(value, ["1-3부", "1~3부", "1부", "2부", "3부"]));
    const service4Start = block.start + blockHeader.findIndex((value) => hasAnyHeader(value, ["4부"]));
    return {
      ...block,
      nextStart,
      service13Start,
      service4Start,
      controlColumns: rangeColumns(service13Start, nextStart),
      service13Columns: attendanceColumns(rows, service13Start, service4Start),
      service4Columns: attendanceColumns(rows, service4Start, nextStart)
    };
  }).filter((block) => block.service13Start >= block.start && block.service4Start >= block.start);

  const activeFamilies = blocks.map((block) => block.family);
  const people = [];
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

  return people;
}

function buildNoAttendanceMessage(rows) {
  return "가장체크에서 참석 대상이 0명으로 계산되었습니다. A~DP 범위의 가족/이름/1-3부/4부 참석 칸만 확인합니다. QR/방송/가족 칸과 DQ~DT 출석 요약 칸은 웹교적 출석으로 보지 않습니다.";
}

function rowsFromCsv(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    throw new Error("구글시트에서 읽을 수 있는 데이터 행이 없습니다.");
  }

  for (let start = 0; start < Math.min(rows.length, 10); start += 1) {
    const horizontalRows = parseHorizontalFamilyLayout(rows.slice(start));
    if (horizontalRows && horizontalRows.length) return mergeDuplicatePeople(horizontalRows);
  }

  const verticalStart = findVerticalHeaderRow(rows);
  const verticalRows = rows.slice(verticalStart);
  const headers = verticalRows[0];
  const familyIndex = findHeaderIndex(headers, ["가족", "가정", "가족명"], 0);
  const nameIndex = findHeaderIndex(headers, ["이름", "성명", "대상자"], 1);
  const service13Index = findHeaderIndex(headers, ["주일", "1-3", "1~3", "1부", "2부", "3부"], 2);
  const service4Index = findHeaderIndex(headers, ["부서", "4부"], 3);
  const noteIndex = findHeaderIndex(headers, ["심방기도제목", "메모", "비고", "사유"], 4);

  let currentFamily = "";
  const verticalPeople = mergeDuplicatePeople(verticalRows.slice(1)
    .map((row) => {
      const family = row[familyIndex] || currentFamily;
      if (row[familyIndex]) currentFamily = row[familyIndex];
      return ({
      family,
      name: row[nameIndex] || "",
      service13Raw: row[service13Index] || "",
      service4Raw: row[service4Index] || "",
      service13: isChecked(row[service13Index]),
      service4: isChecked(row[service4Index]),
      note: row[noteIndex] || ""
    });
    })
    .filter((person) => person.family && !isIgnoredFamilyLabel(person.family) && isLikelyPersonName(person.name)));
  if (!verticalPeople.length) {
    throw new Error(buildNoAttendanceMessage(rows));
  }
  return verticalPeople;
}

function splitAttendanceTargets(people) {
  const allPeople = Array.isArray(people) ? people : [];
  return {
    allPeople,
    attendancePeople: allPeople.filter((person) => person.service13 === true || person.service4 === true)
  };
}

function findVerticalHeaderRow(rows) {
  for (let index = 0; index < Math.min(rows.length, 20); index += 1) {
    const normalized = rows[index].map((cell) => normalizeName(cell));
    const hasFamily = normalized.some((cell) => ["가족", "가정", "가족명", "어디가족"].some((key) => cell.includes(normalizeName(key))));
    const hasName = normalized.some((cell) => ["이름", "성명", "대상자"].some((key) => cell.includes(normalizeName(key))));
    const hasService = normalized.some((cell) => cell.includes("1-3") || cell.includes("4부"));
    if (hasFamily && hasName && hasService) return index;
  }
  return 0;
}

function mergeDuplicatePeople(people) {
  const merged = new Map();

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

function validatePreparedPeople(people) {
  const invalid = people.filter((person) =>
    !person.family ||
    !person.name ||
    isIgnoredFamilyLabel(person.family)
  );
  if (invalid.length) {
    const samples = invalid.slice(0, 8).map((person) => `${person.family || "(가족 없음)"} / ${person.name || "(이름 없음)"}`).join(", ");
    throw new Error(`실행 전 입력 자체검사 실패: 출석 대상이 아닌 행이 포함되었습니다. ${samples}`);
  }
  return people;
}

function prepareLegacyCsv(people) {
  validatePreparedPeople(people);
  fs.mkdirSync(LEGACY_DATA_DIR, { recursive: true });
  const csv = toCsv([
    ["가족", "이름", "주일", "부서", "심방기도제목"],
    ...people.map((person) => [
      person.family,
      person.name,
      person.service13Raw || (person.service13 ? "O" : "X"),
      person.service4Raw || (person.service4 ? "O" : "X"),
      person.note || ""
    ])
  ]);
  fs.writeFileSync(LEGACY_ATTENDANCE_FILE, "\uFEFF" + csv, "utf8");
}

function createInitialResults(run, people) {
  return people.map((person) => ({
    name: person.name,
    normalized_name: normalizeName(person.name),
    original_family: person.family,
    found_location: person.family,
    target_week: run.target_week,
    target_week_text: run.target_week_text,
    service_1_3_present: person.service13,
    service_4_present: person.service4,
    status: run.dry_run ? "dry_run" : "primary_success",
    attempt_stage: run.dry_run ? "dry_run" : "primary",
    save_result: run.dry_run ? "not_saved" : "attempted_unverified",
    failure_reason: null,
    checked_at: new Date().toISOString()
  }));
}

function isVerifiedAttendanceResult(result) {
  return Boolean(
    result &&
    ["primary_success", "second_pass_success"].includes(result.status) &&
    result.save_result === "success"
  );
}

function readLegacyResult() {
  if (!fs.existsSync(LEGACY_RESULT_FILE)) {
    throw new Error("기존 자동화 결과 파일이 생성되지 않았습니다.");
  }
  const parsed = JSON.parse(fs.readFileSync(LEGACY_RESULT_FILE, "utf8"));
  if (!parsed.completed) {
    throw new Error(parsed.error || "기존 자동화가 완료되지 않았습니다.");
  }
  return parsed;
}

function applyLegacyResult(results, legacyResult, dryRun) {
  const people = new Map();
  const familySave = new Map();
  const affiliationCorrections = new Map();

  for (const family of legacyResult.families || []) {
    familySave.set(normalizeName(family.familyName), {
      attempted: Boolean(family.saved),
      verified: Boolean(family.saveVerified)
    });
    for (const person of family.people || []) {
      people.set(`${normalizeName(person.family)}::${normalizeName(person.name)}`, person);
    }
  }

  for (const correction of legacyResult.affiliationCorrections || []) {
    affiliationCorrections.set(
      `${normalizeName(correction.originalFamily)}::${normalizeName(correction.name)}`,
      correction
    );
  }

  return results.map((result) => {
    const key = `${normalizeName(result.original_family)}::${result.normalized_name}`;
    const correction = affiliationCorrections.get(key);
    const person = people.get(key);

    if (correction) {
      const corrected = correction.status === "corrected";
      return {
        ...result,
        found_location: correction.foundLocation || correction.foundFamily || result.found_location,
        status: corrected ? "second_pass_success" : "final_fail",
        attempt_stage: corrected ? "second_pass_search" : "final_fail",
        save_result: corrected
          ? correction.saveVerified ? "success" : "attempted_unverified"
          : "not_saved",
        failure_reason: corrected ? null : correction.reason || "소속 보정 실패"
      };
    }

    if (!person || !person.ok) {
      return {
        ...result,
        found_location: person?.foundLocation || person?.foundFamily || result.found_location,
        status: "final_fail",
        attempt_stage: "final_fail",
        save_result: "not_saved",
        failure_reason: person?.reason || "기존 자동화 결과에서 처리 내역을 찾지 못함"
      };
    }

    if (dryRun) return result;

    if (person.fallbackSearch) {
      const saveResult = person.saveAttempted === false
        ? "failed"
        : person.saveVerified
          ? "success"
          : "attempted_unverified";
      return {
        ...result,
        found_location: person.foundLocation || person.foundFamily || result.found_location,
        status: person.saveAttempted === false ? "save_failed" : "second_pass_success",
        attempt_stage: "second_pass_search",
        save_result: saveResult,
        failure_reason: person.saveAttempted === false ? "검색 보정 저장 실패" : null
      };
    }

    const familyResult = familySave.get(normalizeName(result.original_family)) || {
      attempted: legacyResult.finalSaved !== false,
      verified: Boolean(legacyResult.finalSaveVerified)
    };
    const attempted = legacyResult.finalSaved !== false && familyResult.attempted;
    const verified = Boolean(legacyResult.finalSaveVerified) || familyResult.verified;

    if (!attempted) {
      return {
        ...result,
        status: "save_failed",
        save_result: "failed",
        failure_reason: "저장 버튼 또는 Alt+S 실행 실패"
      };
    }

    return {
      ...result,
      save_result: verified ? "success" : "attempted_unverified"
    };
  });
}

async function runLegacyProcess(run, reporter, people) {
  const logLines = [];
  fs.rmSync(LEGACY_RESULT_FILE, { force: true });

  const env = {
    ...process.env,
    CH2CH_ID: process.env.CH2CH_ID || process.env.CH2CH_USER || "",
    CH2CH_PW: process.env.CH2CH_PW || process.env.CH2CH_PASSWORD || "",
    DRY_RUN: run.dry_run ? "true" : "false",
    WEB_CLEAR_ONLY: run.data_source === "web_clear" ? "true" : "false",
    TARGET_WEEK: String(run.target_week || ""),
    TARGET_WEEK_TEXT: run.target_week_text || "",
    ATTENDANCE_FILE: "./data/attendance.csv",
    FAMILY_ORDER_FILE: "./data/families.json",
    HEADLESS: String(process.env.CH2CH_HEADLESS || "false"),
    KEEP_BROWSER_OPEN: String(process.env.CH2CH_KEEP_BROWSER_OPEN || "false"),
    SAVE_PER_FAMILY: process.env.SAVE_PER_FAMILY || "true",
    SAVE_MODE: process.env.SAVE_MODE || "smart",
    TARGET_DEPT_TEXT: run.target_dept || process.env.TARGET_DEPT_TEXT || "2청년회",
    TARGET_CLASS_TEXT: run.target_term || process.env.TARGET_CLASS_TEXT || "2026전입반",
    TARGET_GROUP_TEXT: run.target_group || process.env.TARGET_GROUP_TEXT || "26상",
    WEEKLY_ATTENDANCE_TEXT: process.env.WEEKLY_ATTENDANCE_TEXT || "출석부(주별)"
  };

  if (!env.CH2CH_ID || !env.CH2CH_PW) {
    throw new Error(".env.local에 CH2CH_USER/CH2CH_PASSWORD 또는 CH2CH_ID/CH2CH_PW가 필요합니다.");
  }

  await reporter.updateRun({
    total_count: people.length,
    current_step: run.dry_run ? "기존 자동화 테스트 실행 중" : "기존 자동화 실제 실행 중"
  });

  await reporter.event("legacy_started", run.dry_run ? "기존 CH2CH 자동화를 테스트 모드로 실행합니다." : "기존 CH2CH 자동화를 실제 저장 모드로 실행합니다.");

  if (await reporter.isCancelled()) {
    const error = new Error("RUN_CANCELLED");
    error.code = "RUN_CANCELLED";
    throw error;
  }

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["src/main.js"], {
      cwd: LEGACY_DIR,
      env,
      windowsHide: false,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const timeoutMs = Number(process.env.AUTOMATION_TIMEOUT_MS || 30 * 60 * 1000);
    let timedOut = false;
    let cancellationRequested = false;
    let cancellationTimer = null;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    cancellationTimer = setInterval(() => {
      reporter.isCancelled()
        .then((cancelled) => {
          if (!cancelled || cancellationRequested) return;
          cancellationRequested = true;
          child.kill();
        })
        .catch(() => {});
    }, 1500);

    let pending = Promise.resolve();

    const isVisibleLegacyLog = (text, level) => {
      if (level === "error") return true;
      const message = text.replace(/^\[[^\]]+\]\s*/, "");
      return message.startsWith("가족 결과") ||
        message.startsWith("시트 불일치") ||
        message.startsWith("검색 보정 보류") ||
        message.startsWith("검색 보정 재시도") ||
        message.startsWith("검색 보정 이미 반영됨") ||
        message.startsWith("전체 소속 대조") ||
        message.startsWith("저장 후 상태 대조 성공") ||
        message.startsWith("저장 시작") ||
        message.startsWith("저장 결과") ||
        message.startsWith("저장 전 대조 경고") ||
        message.startsWith("전체 실행 중") ||
        message.startsWith("실패:");
    };

    const handleLine = (line, level = "info") => {
      const text = line.trim();
      if (!text) return;
      logLines.push(text);
      pending = pending.then(async () => {
        const message = text.replace(/^\[[^\]]+\]\s*/, "");
        if (isVisibleLegacyLog(text, level)) {
          await reporter.event("legacy_log", message, null, level);
        }
        const familyResultMatch = message.match(/^가족 결과:\s*([^:]+):/);
        if (familyResultMatch) {
          await reporter.updateRun({
            current_family: familyResultMatch[1],
            current_name: null,
            current_step: "가족별 출석 처리 중"
          });
        }
        if (message.startsWith("저장 시작")) {
          await reporter.updateRun({ current_step: "CH2CH 저장 중" });
        } else if (message.startsWith("저장 결과")) {
          await reporter.updateRun({ current_step: "다음 가족 처리 준비" });
        }
      }).catch(() => {});
    };

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => String(chunk).split(/\r?\n/).forEach((line) => handleLine(line, "info")));
    child.stderr.on("data", (chunk) => String(chunk).split(/\r?\n/).forEach((line) => handleLine(line, "error")));
    child.on("error", (error) => {
      clearTimeout(timeout);
      if (cancellationTimer) clearInterval(cancellationTimer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (cancellationTimer) clearInterval(cancellationTimer);
      pending.finally(() => {
        if (timedOut) reject(new Error(`자동화가 ${Math.round(timeoutMs / 60000)}분 제한 시간을 초과해 중단되었습니다.`));
        else if (cancellationRequested) {
          const error = new Error("RUN_CANCELLED");
          error.code = "RUN_CANCELLED";
          reject(error);
        }
        else if (code === 0) resolve();
        else reject(new Error(`기존 CH2CH 자동화가 종료 코드 ${code}로 끝났습니다.`));
      });
    });
  });

  return { logLines, legacyResult: readLegacyResult() };
}

async function runAttendanceAutomation(run, reporter) {
  if (run.data_source === "web_clear") {
    const csvText = await loadInputCsv(run, reporter);
    const sourcePeople = rowsFromCsv(csvText);
    validatePreparedPeople(sourcePeople);
    prepareLegacyCsv(sourcePeople);
    await reporter.event(
      "web_attendance_clear_started",
      `선택한 ${run.target_week_text || `${run.target_week}주차`}의 웹교적 주일·부서 체크 해제를 시작합니다. 시트/파일에서 가족 ${new Set(sourcePeople.map((person) => person.family)).size}개를 읽었습니다.`
    );
    const { legacyResult } = await runLegacyProcess(run, reporter, sourcePeople);
    const families = legacyResult.families || [];
    const failedFamilies = families.filter((family) => family.failed > 0 || family.saved === false);
    await reporter.event(
      "web_attendance_clear_completed",
      `웹교적 주차 전체 해제 완료: ${families.length}개 가족 / 실패 ${failedFamilies.length}개 가족`,
      { families }
    );
    return [];
  }

  const csvText = await loadInputCsv(run, reporter);
  const { allPeople, attendancePeople: people } = splitAttendanceTargets(rowsFromCsv(csvText));
  if (!allPeople.length || !people.length) {
    throw new Error(buildNoAttendanceMessage(parseCsv(csvText)));
  }
  validatePreparedPeople(allPeople);
  prepareLegacyCsv(allPeople);
  await reporter.event(
    "input_read_completed",
    `입력 자체검사 완료: 전체 ${allPeople.length}명 중 참석 체크 대상 ${people.length}명만 출석 처리하고, 전체 소속은 별도 대조합니다.`
  );

  const { legacyResult } = await runLegacyProcess(run, reporter, people);
  const corrections = legacyResult.affiliationCorrections || [];
  if (corrections.length) {
    const corrected = corrections.filter((item) => item.status === "corrected");
    const failedCorrections = corrections.filter((item) => item.status === "failed");
    await reporter.event(
      "affiliation_correction_summary",
      `소속 보정 결과: 성공 ${corrected.length}명 / 실패 ${failedCorrections.length}명` +
        (failedCorrections.length ? ` / 실패자 ${failedCorrections.map((item) => item.name).join(", ")}` : ""),
      { corrected, failed: failedCorrections }
    );
  }
  const affiliationMismatches = legacyResult.affiliationMismatches || [];
  await reporter.event(
    "affiliation_compare_completed",
    `전체 명단 소속 대조 완료: ${allPeople.length}명 / 불일치 ${affiliationMismatches.length}명` +
      (affiliationMismatches.length ? ` / ${affiliationMismatches.map((item) => item.name).join(", ")}` : ""),
    { mismatches: affiliationMismatches }
  );
  const results = applyLegacyResult(createInitialResults(run, people), legacyResult, run.dry_run);

  await reporter.updateRun({
    processed_count: results.length,
    current_step: "기존 자동화 실행 완료"
  });

  return results;
}

module.exports = {
  runAttendanceAutomation,
  __test: {
    parseCsv,
    rowsFromCsv,
    createInitialResults,
    applyLegacyResult,
    decodeInputBuffer,
    isVerifiedAttendanceResult,
    splitAttendanceTargets,
    validatePreparedPeople
  },
  isVerifiedAttendanceResult
};
