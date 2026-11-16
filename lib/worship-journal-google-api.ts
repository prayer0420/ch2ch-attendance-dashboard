import { GoogleAuth } from "google-auth-library";
import type { WorshipJournal } from "./worship-journal";
import {
  buildSheetStructureRequests,
  buildSheetPostWriteRequests,
  buildSheetValueUpdates,
  inspectAnnouncementSlots,
  journalTabName,
  selectTemplateSheet,
  type SpreadsheetSheet
} from "./worship-journal-google-sheet";

const DEFAULT_SPREADSHEET_ID = "1TpukKm7tN-CnM4wSqgROQ6dLNI8fLs9mVvUD_PB0mIw";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export type GoogleSheetConfig = {
  email: string;
  privateKey: string;
  spreadsheetId: string;
};

export type WorshipJournalSheetOutput = {
  spreadsheetId: string;
  sheetId: number;
  sheetTitle: string;
  url: string;
  verification: {
    passed: true;
    checkedCells: number;
    verifiedAt: string;
    stages?: Array<{ label: string; detail: string }>;
  };
};

type PublishDependencies = {
  config?: GoogleSheetConfig;
  fetchImpl?: typeof fetch;
  getAccessToken?: (config: GoogleSheetConfig) => Promise<string>;
};

type GoogleApiError = {
  error?: { message?: string };
};

export function readGoogleSheetConfig(env: Record<string, string | undefined> = process.env) {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? "";
  const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() ?? "";
  if (!email || !privateKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL과 GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY를 .env.local에 설정해 주세요.");
  }
  return {
    email,
    privateKey,
    spreadsheetId: env.WORSHIP_JOURNAL_SPREADSHEET_ID?.trim() || DEFAULT_SPREADSHEET_ID
  };
}

async function googleAccessToken(config: GoogleSheetConfig) {
  const auth = new GoogleAuth({
    credentials: { client_email: config.email, private_key: config.privateKey },
    scopes: [SHEETS_SCOPE]
  });
  const client = await auth.getClient();
  const response = await client.getAccessToken();
  const token = typeof response === "string" ? response : response?.token;
  if (!token) throw new Error("Google 서비스 계정 인증 토큰을 받지 못했습니다.");
  return token;
}

async function requestJson<T>(fetchImpl: typeof fetch, url: string, token: string, init: RequestInit = {}) {
  const response = await fetchImpl(url, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(30_000),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers
    }
  });
  const body = await response.json().catch(() => ({})) as T & GoogleApiError;
  if (!response.ok) {
    throw new Error(body.error?.message || `Google Sheets API 요청이 실패했습니다. (${response.status})`);
  }
  return body;
}

/** Read the saved tab itself: never reconstruct the journal from the app preview. */
export async function exportWorshipJournalSheetPdf(
  output: Pick<WorshipJournalSheetOutput, "spreadsheetId" | "sheetId">,
  dependencies: PublishDependencies = {}
): Promise<Uint8Array> {
  const config = dependencies.config ?? readGoogleSheetConfig();
  if (output.spreadsheetId !== config.spreadsheetId || !Number.isSafeInteger(output.sheetId) || output.sheetId < 0) {
    throw new Error("설정된 예배일지 시트의 저장된 탭만 내보낼 수 있습니다.");
  }
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const token = await (dependencies.getAccessToken ?? googleAccessToken)(config);
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}`;
  const metadata = await requestJson<{ sheets?: Array<{
    properties: { sheetId: number; title: string };
    merges?: Array<{ startColumnIndex?: number; endRowIndex?: number }>;
  }> }>(fetchImpl, `${base}?fields=sheets(properties(sheetId,title),merges)`, token);
  const sheet = metadata.sheets?.find((item) => item.properties.sheetId === output.sheetId);
  if (!sheet) throw new Error("저장된 예배일지 탭이 삭제되어 내보낼 수 없습니다. Google Sheet를 확인해 주세요.");
  const range = `'${sheet.properties.title.replaceAll("'", "''")}'!A1:K1000`;
  const values = await requestJson<{ values?: unknown[][] }>(fetchImpl,
    `${base}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`, token);
  const rows = values.values ?? [];
  let lastRow = rows.findLastIndex((row) => row.some((value) => String(value ?? "").trim() !== "")) + 1;
  if (!lastRow) throw new Error("예배일지 탭에 내보낼 내용이 없습니다.");
  if (lastRow >= 1000) throw new Error("예배일지 내용이 1,000행을 넘습니다. 내보낼 범위를 확인해 주세요.");
  // Preserve the original form and its merged cells, including blank entry rows.
  lastRow = Math.max(52, lastRow, ...(sheet.merges ?? [])
    .filter((merge) => (merge.startColumnIndex ?? 0) < 11)
    .map((merge) => merge.endRowIndex ?? 0));
  if (lastRow > 1000) throw new Error("예배일지 병합 범위가 너무 큽니다. 시트 양식을 확인해 주세요.");
  const params = new URLSearchParams({
    format: "pdf", gid: String(output.sheetId), size: "A3", portrait: "true",
    scale: "4", gridlines: "false", sheetnames: "false", printtitle: "false",
    pagenum: "UNDEFINED", fzr: "false", attachment: "true",
    top_margin: "0", bottom_margin: "0", left_margin: "0", right_margin: "0",
    r1: "0", c1: "0", r2: String(lastRow), c2: "11"
  });
  const response = await fetchImpl(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(config.spreadsheetId)}/export?${params}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(45_000)
  });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) {
    throw new Error(`Google Sheet PDF를 가져오지 못했습니다 (${response.status}). 공유 권한을 확인한 뒤 다시 시도해 주세요.`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Google Sheet PDF 응답이 비어 있습니다.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 20 * 1024 * 1024) { await reader.cancel(); throw new Error("내보낼 PDF가 20MB를 넘습니다."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const pdf = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { pdf.set(chunk, offset); offset += chunk.length; }
  if (new TextDecoder().decode(pdf.subarray(0, 5)) !== "%PDF-") throw new Error("Google Sheet PDF 형식이 올바르지 않습니다.");
  return pdf;
}

function comparableCell(value: unknown) {
  return typeof value === "number" ? String(value) : String(value ?? "").trim();
}

async function verifyWrittenValues(
  fetchImpl: typeof fetch,
  spreadsheetUrl: string,
  token: string,
  updates: ReturnType<typeof buildSheetValueUpdates>,
  announcementGuard: { range: string; values: unknown[][] }
) {
  const checks = [...updates, announcementGuard];
  const query = new URLSearchParams({ valueRenderOption: "UNFORMATTED_VALUE" });
  checks.forEach((update) => query.append("ranges", update.range));
  const result = await requestJson<{ valueRanges?: Array<{ range?: string; values?: unknown[][] }> }>(
    fetchImpl,
    `${spreadsheetUrl}/values:batchGet?${query.toString()}`,
    token
  );
  const valueRanges = result.valueRanges ?? [];
  let checkedCells = 0;
  const mismatches: string[] = [];
  checks.forEach((update, rangeIndex) => {
    const actualRows = valueRanges[rangeIndex]?.values ?? [];
    update.values.forEach((row, rowIndex) => row.forEach((expected, columnIndex) => {
      if (expected === "" && rangeIndex < updates.length) return;
      checkedCells += 1;
      const actual = actualRows[rowIndex]?.[columnIndex];
      if (comparableCell(actual) !== comparableCell(expected)) {
        mismatches.push(`${update.range} (${rowIndex + 1}행 ${columnIndex + 1}열)`);
      }
    }));
  });
  if (!checkedCells) throw new Error("Google Sheet 저장 후 확인할 값이 없습니다.");
  if (mismatches.length) {
    throw new Error(`Google Sheet 저장 후 재검증에 실패했습니다: ${mismatches.slice(0, 5).join(", ")}`);
  }
  return checkedCells;
}

export async function publishWorshipJournalToGoogleSheet(
  journal: Pick<WorshipJournal, "date" | "author" | "attendance" | "newFamilies" | "graduates" | "sermon" | "service" | "announcements" | "accounting">,
  dependencies: PublishDependencies = {}
): Promise<WorshipJournalSheetOutput> {
  const sheetTitle = journalTabName(journal.date);
  const valueUpdates = buildSheetValueUpdates(sheetTitle, journal);
  const config = dependencies.config ?? readGoogleSheetConfig();
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const token = await (dependencies.getAccessToken ?? googleAccessToken)(config);
  const spreadsheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}`;
  const metadata = await requestJson<{ sheets?: SpreadsheetSheet[] }>(
    fetchImpl,
    `${spreadsheetUrl}?fields=sheets.properties`,
    token
  );
  const template = selectTemplateSheet(metadata.sheets ?? [], sheetTitle);
  const duplicate = await requestJson<{
    replies?: Array<{ duplicateSheet?: { properties?: { sheetId?: number } } }>;
  }>(fetchImpl, `${spreadsheetUrl}:batchUpdate`, token, {
    method: "POST",
    body: JSON.stringify({
      requests: [{
        duplicateSheet: {
          sourceSheetId: template.sheetId,
          insertSheetIndex: 0,
          newSheetName: sheetTitle
        }
      }]
    })
  });
  const sheetId = duplicate.replies?.[0]?.duplicateSheet?.properties?.sheetId;
  if (typeof sheetId !== "number") throw new Error("복제된 예배일지 탭의 ID를 확인하지 못했습니다.");

  try {
    // Inspect the duplicate, not the source: a prior journal may already have
    // expanded slots. Adding count - 9 again leaves old ads below the new ones.
    const copiedRange = `'${sheetTitle}'!A43:Z200`;
    const copied = await requestJson<{ values?: unknown[][] }>(fetchImpl,
      `${spreadsheetUrl}/values/${encodeURIComponent(copiedRange)}?valueRenderOption=UNFORMATTED_VALUE`, token);
    const copiedRows = copied.values ?? [];
    const existingSlots = inspectAnnouncementSlots(copiedRows);
    const targetSlots = Math.max(9, journal.announcements.length);
    if (targetSlots > 150) throw new Error("광고가 150개를 넘습니다. 내용을 확인해 주세요.");
    const structureRequests = buildSheetStructureRequests(sheetId, journal.announcements.length, existingSlots);
    if (structureRequests.length) {
      await requestJson(fetchImpl, `${spreadsheetUrl}:batchUpdate`, token, {
        method: "POST",
        body: JSON.stringify({ requests: structureRequests })
      });
    }
    const announcementValues = valueUpdates.at(-1)!.values;
    // Check the whole announcement block AND its inherited tail, including
    // empty cells. This catches stale ads even when every new value was saved.
    const tail = copiedRows.slice(1 + existingSlots);
    const guardRows = [copiedRows[0], ...announcementValues.map(([value]) => ["", value]), ...tail];
    const announcementGuard = {
      range: `'${sheetTitle}'!A43:Z${42 + Math.max(guardRows.length + 1, 1 + targetSlots)}`,
      values: Array.from({ length: Math.max(guardRows.length + 1, 1 + targetSlots) }, (_, row) =>
        Array.from({ length: 26 }, (_, column) => guardRows[row]?.[column] ?? ""))
    };
    await requestJson(fetchImpl, `${spreadsheetUrl}/values:batchUpdate`, token, {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: valueUpdates
      })
    });
    await requestJson(fetchImpl, `${spreadsheetUrl}:batchUpdate`, token, {
      method: "POST",
      body: JSON.stringify({ requests: buildSheetPostWriteRequests(sheetId, journal.announcements.length) })
    });
    const checkedCells = await verifyWrittenValues(fetchImpl, spreadsheetUrl, token, valueUpdates, announcementGuard);
    return {
      spreadsheetId: config.spreadsheetId,
      sheetId,
      sheetTitle,
      url: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit#gid=${sheetId}`,
      verification: { passed: true, checkedCells, verifiedAt: new Date().toISOString() }
    };
  } catch (error) {
    await requestJson(fetchImpl, `${spreadsheetUrl}:batchUpdate`, token, {
      method: "POST",
      body: JSON.stringify({ requests: [{ deleteSheet: { sheetId } }] })
    }).catch(() => undefined);
    throw error;
  }
}
