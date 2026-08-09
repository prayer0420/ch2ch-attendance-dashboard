import * as XLSX from "xlsx";

export const MAX_ACCOUNTING_SIZE = 15 * 1024 * 1024;

export type ThanksgivingOffering = {
  name: string;
  amount: number;
  note: string;
};

export type AccountingSourceMeta = {
  sourceType: "excel" | "google-sheet";
  sourceName: string;
};

export type JournalAccounting = AccountingSourceMeta & {
  sheetTab: string;
  total: number;
  thanksgiving: ThanksgivingOffering[];
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

function includesTargetDate(value: string, date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error("회계 자료를 찾을 예배 날짜가 올바르지 않습니다.");
  const [, year, monthText, dayText] = match;
  const month = Number(monthText);
  const day = Number(dayText);
  const fullDatePatterns = [
    new RegExp(`${year}\\s*[.\\/-]\\s*0?${month}\\s*[.\\/-]\\s*0?${day}(?!\\d)`),
    new RegExp(`${year}\\s*년\\s*0?${month}\\s*월\\s*0?${day}\\s*일`)
  ];
  if (fullDatePatterns.some((pattern) => pattern.test(value))) return true;
  if (/\d{4}\s*(?:[.\/-]|년)/.test(value)) return false;
  const shortDatePatterns = [
    new RegExp(`(?:^|[^\\d])0?${month}\\s*[.\\/-]\\s*0?${day}(?!\\d)`),
    new RegExp(`(?:^|[^\\d])0?${month}\\s*월\\s*0?${day}\\s*일`)
  ];
  return shortDatePatterns.some((pattern) => pattern.test(value));
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
  return /^(온라인|현장|온라인계|현장계|감사헌금총계|헌금총계|합계|소계)$/.test(normalized);
}

function sheetRows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
}

function findDatedSheet(workbook: XLSX.WorkBook, date: string) {
  const selected = workbook.SheetNames.map((sheetName, sheetIndex) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return null;
    const rows = sheetRows(sheet);
    const dateScope = [sheetName, ...rows.slice(0, 8).flat().map(cleanCell)].join(" ");
    return includesTargetDate(dateScope, date) ? { sheetName, sheetIndex, rows } : null;
  }).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate)).at(-1);

  if (!selected) {
    throw new Error(`${date} 회계 탭을 찾지 못했습니다. 발견된 탭: ${workbook.SheetNames.join(", ") || "없음"}`);
  }
  return selected;
}

function parseThanksgiving(rows: unknown[][]) {
  const cells = rows.flatMap((row, rowIndex) => row.map((value, columnIndex) => ({ rowIndex, columnIndex, value })));
  const header = cells.find(({ value }) => cleanCell(value).replace(/\s+/g, "").includes("감사헌금"));
  if (!header) throw new Error("선택한 회계 탭에서 감사헌금 표제를 찾지 못했습니다.");

  const thanksgiving = rows.slice(header.rowIndex + 1).flatMap<ThanksgivingOffering>((row) => {
    const name = cleanCell(row[header.columnIndex]);
    const amount = normalizeAmount(row[header.columnIndex + 1]);
    const note = cleanCell(row[header.columnIndex + 2]);
    if (!name || amount <= 0 || isSummaryLabel(name)) return [];
    return [{ name, amount, note }];
  });

  thanksgiving.sort((left, right) => {
    const noteOrder = Number(Boolean(right.note)) - Number(Boolean(left.note));
    return noteOrder || left.name.localeCompare(right.name, "ko-KR");
  });
  return thanksgiving;
}

export function parseAccountingWorkbook(
  buffer: Buffer,
  date: string,
  source: AccountingSourceMeta
): JournalAccounting {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new Error("회계 엑셀 파일을 읽지 못했습니다. XLSX 또는 XLS 형식인지 확인해 주세요.");
  }

  const selected = findDatedSheet(workbook, date);
  const thanksgiving = parseThanksgiving(selected.rows);
  return {
    ...source,
    sheetTab: selected.sheetName,
    total: thanksgiving.reduce((sum, offering) => sum + offering.amount, 0),
    thanksgiving
  };
}
