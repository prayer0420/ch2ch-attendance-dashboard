import { GoogleAuth } from "google-auth-library";
import type { WorshipJournal } from "./worship-journal";
import {
  buildSheetStructureRequests,
  buildSheetPostWriteRequests,
  buildSheetValueUpdates,
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

function comparableCell(value: unknown) {
  return typeof value === "number" ? String(value) : String(value ?? "").trim();
}

async function verifyWrittenValues(
  fetchImpl: typeof fetch,
  spreadsheetUrl: string,
  token: string,
  updates: ReturnType<typeof buildSheetValueUpdates>
) {
  const query = new URLSearchParams({ valueRenderOption: "UNFORMATTED_VALUE" });
  updates.forEach((update) => query.append("ranges", update.range));
  const result = await requestJson<{ valueRanges?: Array<{ range?: string; values?: unknown[][] }> }>(
    fetchImpl,
    `${spreadsheetUrl}/values:batchGet?${query.toString()}`,
    token
  );
  const valueRanges = result.valueRanges ?? [];
  let checkedCells = 0;
  const mismatches: string[] = [];
  updates.forEach((update, rangeIndex) => {
    const actualRows = valueRanges[rangeIndex]?.values ?? [];
    update.values.forEach((row, rowIndex) => row.forEach((expected, columnIndex) => {
      if (expected === "") return;
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
  const config = dependencies.config ?? readGoogleSheetConfig();
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const token = await (dependencies.getAccessToken ?? googleAccessToken)(config);
  const spreadsheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}`;
  const metadata = await requestJson<{ sheets?: SpreadsheetSheet[] }>(
    fetchImpl,
    `${spreadsheetUrl}?fields=sheets.properties`,
    token
  );
  const sheetTitle = journalTabName(journal.date);
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
    const structureRequests = buildSheetStructureRequests(sheetId, journal.announcements.length);
    if (structureRequests.length) {
      await requestJson(fetchImpl, `${spreadsheetUrl}:batchUpdate`, token, {
        method: "POST",
        body: JSON.stringify({ requests: structureRequests })
      });
    }
    const valueUpdates = buildSheetValueUpdates(sheetTitle, journal);
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
    const checkedCells = await verifyWrittenValues(fetchImpl, spreadsheetUrl, token, valueUpdates);
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
