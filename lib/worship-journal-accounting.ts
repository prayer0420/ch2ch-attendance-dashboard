import * as XLSX from "xlsx";

export const MAX_ACCOUNTING_SIZE = 15 * 1024 * 1024;

export type ThanksgivingOffering = {
  name: string;
  amount: number;
  note: string;
};

export type PurposeOffering = ThanksgivingOffering;

export type AccountingSourceMeta = {
  sourceType: "excel" | "google-sheet";
  sourceName: string;
};

export type JournalAccounting = AccountingSourceMeta & {
  sheetTab: string;
  sundayTotal: number;
  thanksgivingTotal: number;
  purposeTotal: number;
  total: number;
  sunday?: ThanksgivingOffering[];
  thanksgiving: ThanksgivingOffering[];
  purpose: PurposeOffering[];
};

export function isAccountingSourceReady(
  sourceType: AccountingSourceMeta["sourceType"],
  fileName: string,
  sheetUrl: string
) {
  return sourceType === "excel" ? Boolean(fileName.trim()) : Boolean(sheetUrl.trim());
}

export function formatThanksgivingOffering(offering: ThanksgivingOffering) {
  const summary = `${offering.name} (${offering.amount.toLocaleString("ko-KR")}원)`;
  return offering.note ? `${summary} ${offering.note}` : summary;
}

export function accountingDownloadUrls(url: string): string[] {
  const match = url.match(/^https:\/\/(?:docs|drive)\.google\.com\/(?:spreadsheets\/d\/|file\/d\/)([\w-]+)/i);
  if (!match) throw new Error("올바른 Google Sheet 링크를 입력해 주세요.");
  const id = match[1];
  return [
    `https://drive.google.com/uc?export=download&id=${id}`,
    `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`
  ];
}

export async function loadAccountingFromGoogleSheet(
  url: string,
  date: string,
  fetcher: typeof fetch = fetch
): Promise<JournalAccounting> {
  const failures: string[] = [];
  for (const downloadUrl of accountingDownloadUrls(url)) {
    try {
      const response = await fetcher(downloadUrl, { cache: "no-store" });
      if (!response.ok) {
        failures.push(`HTTP ${response.status}`);
        continue;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) {
        failures.push("다운로드 대신 HTML 응답을 받았습니다.");
        continue;
      }
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (contentLength > MAX_ACCOUNTING_SIZE) {
        failures.push("회계 엑셀 파일은 15MB 이하만 사용할 수 있습니다.");
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length) {
        failures.push("다운로드한 파일이 비어 있습니다.");
        continue;
      }
      if (buffer.length > MAX_ACCOUNTING_SIZE) {
        failures.push("회계 엑셀 파일은 15MB 이하만 사용할 수 있습니다.");
        continue;
      }
      return parseAccountingWorkbook(buffer, date, {
        sourceType: "google-sheet",
        sourceName: url
      });
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "알 수 없는 다운로드 오류");
    }
  }

  const detail = failures.at(-1);
  throw new Error(`Google Sheet 회계 자료를 읽지 못했습니다. 링크 공유 및 다운로드 권한을 확인해 주세요.${detail ? ` 마지막 오류: ${detail}` : ""}`);
}

function cleanCell(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeAmount(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : 0;
  const normalized = cleanCell(value).replace(/[^\d.-]/g, "");
  if (!normalized) return 0;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function isSummaryLabel(value: string) {
  const normalized = value.replace(/\s+/g, "");
  return /^(온라인|현장|온라인계|현장계|주일헌금총계|감사헌금총계|목적헌금총계|헌금총계|총계|합계|소계)$/.test(normalized);
}

export function sortThanksgivingOfferings(offerings: ThanksgivingOffering[]) {
  return [...offerings].sort((left, right) => {
    const noteOrder = Number(Boolean(right.note.trim())) - Number(Boolean(left.note.trim()));
    return noteOrder || left.name.localeCompare(right.name, "ko-KR");
  });
}

function sheetRows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
}

function findAccountingSheet(workbook: XLSX.WorkBook, requestedTab = "") {
  const requested = requestedTab.trim();
  const sheetName = requested || workbook.SheetNames.at(-1);
  if (requested && !workbook.SheetNames.includes(requested)) {
    throw new Error(`회계 파일에 '${requested}' 탭이 없습니다. 탭 이름을 정확히 확인해 주세요.`);
  }
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheetName || !sheet) throw new Error("회계 파일에서 선택한 탭을 찾지 못했습니다.");
  return { sheetName, rows: sheetRows(sheet) };
}

function parseOfferingSection(rows: unknown[][], label: string, required = false) {
  const cells = rows.flatMap((row, rowIndex) => row.map((value, columnIndex) => ({ rowIndex, columnIndex, value })));
  const headers = cells.filter(({ value }) => cleanCell(value).replace(/\s+/g, "") === label);
  if (!headers.length) {
    if (required) throw new Error(`선택한 회계 탭에서 ${label} 표제를 찾지 못했습니다.`);
    return [];
  }

  const offerings = headers.flatMap((header) => rows.slice(header.rowIndex + 1,
    headers.find((next) => next.rowIndex > header.rowIndex && next.columnIndex === header.columnIndex)?.rowIndex
  ).flatMap<ThanksgivingOffering>((row) => {
    const name = cleanCell(row[header.columnIndex]);
    const amount = normalizeAmount(row[header.columnIndex + 1]);
    const note = label === "감사헌금" ? cleanCell(row[header.columnIndex + 2]) : "";
    if (!name || isSummaryLabel(name) || /^(주일헌금|감사헌금|목적헌금)$/.test(name)) return [];
    if (amount < 0) throw new Error(`${label} ${name}: 음수 금액을 확인해 주세요.`);
    return [{ name, amount, note }];
  }));

  return label === "감사헌금" ? sortThanksgivingOfferings(offerings) : offerings.sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
}

function findSectionTotal(rows: unknown[][], label: string, offerings: ThanksgivingOffering[]) {
  const target = `${label}총계`;
  for (const row of rows) {
    const labelIndex = row.findIndex((value) => cleanCell(value).replace(/\s+/g, "") === target);
    if (labelIndex < 0) continue;
    for (let offset = 1; offset <= 3; offset += 1) {
      const amount = normalizeAmount(row[labelIndex + offset]);
      if (amount > 0) return amount;
    }
  }
  return offerings.reduce((sum, offering) => sum + offering.amount, 0);
}

export function parseAccountingWorkbook(
  buffer: Buffer,
  date: string,
  source: AccountingSourceMeta,
  requestedTab = ""
): JournalAccounting {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new Error("회계 엑셀 파일을 읽지 못했습니다. XLSX 또는 XLS 형식인지 확인해 주세요.");
  }

  const selected = findAccountingSheet(workbook, requestedTab);
  const sunday = parseOfferingSection(selected.rows, "주일헌금");
  const thanksgiving = parseOfferingSection(selected.rows, "감사헌금", true);
  const purpose = parseOfferingSection(selected.rows, "목적헌금");
  const sundayTotal = findSectionTotal(selected.rows, "주일헌금", sunday);
  const thanksgivingTotal = findSectionTotal(selected.rows, "감사헌금", thanksgiving);
  const purposeTotal = findSectionTotal(selected.rows, "목적헌금", purpose);
  for (const [label, entries, total] of [["주일헌금", sunday, sundayTotal], ["감사헌금", thanksgiving, thanksgivingTotal], ["목적헌금", purpose, purposeTotal]] as const) {
    const sum = entries.reduce((value, entry) => value + entry.amount, 0);
    if (sum !== total) throw new Error(`${selected.sheetName} ${label}: 명단 합계 ${sum.toLocaleString("ko-KR")}원과 원본 총계 ${total.toLocaleString("ko-KR")}원이 다릅니다. 원본의 누락·금액·합계 수식을 확인해 주세요.`);
  }
  return {
    ...source,
    sheetTab: selected.sheetName,
    sundayTotal,
    thanksgivingTotal,
    purposeTotal,
    total: sundayTotal + thanksgivingTotal + purposeTotal,
    sunday,
    thanksgiving,
    purpose
  };
}
