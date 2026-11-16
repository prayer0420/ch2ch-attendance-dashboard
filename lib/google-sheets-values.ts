import { GoogleAuth } from "google-auth-library";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

type ServiceAccount = { email: string; privateKey: string };
type CachedToken = { key: string; token: string; expiresAt: number };

const globalState = globalThis as typeof globalThis & { __ch2chSheetsToken?: CachedToken };

export type SheetValueRange = { range: string; values: unknown[][] };

export function readSheetsServiceAccount(env: Record<string, string | undefined> = process.env): ServiceAccount | null {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? "";
  const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() ?? "";
  return email && privateKey ? { email, privateKey } : null;
}

async function accessToken(account: ServiceAccount) {
  const cached = globalState.__ch2chSheetsToken;
  if (cached && cached.key === account.email && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const auth = new GoogleAuth({ credentials: { client_email: account.email, private_key: account.privateKey }, scopes: [SHEETS_SCOPE] });
  const response = await (await auth.getClient()).getAccessToken();
  const token = typeof response === "string" ? response : response?.token;
  if (!token) throw new Error("Google 서비스 계정 인증 토큰을 받지 못했습니다.");
  globalState.__ch2chSheetsToken = { key: account.email, token, expiresAt: Date.now() + 45 * 60_000 };
  return token;
}

async function sheetsRequest<T>(account: ServiceAccount, path: string, init: RequestInit = {}) {
  const token = await accessToken(account);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers }
  });
  const body = await response.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message || `Google Sheets API 요청 실패 (${response.status})`);
  return body;
}

export function quoteSheetTitle(title: string) {
  return `'${title.replace(/'/g, "''")}'`;
}

export async function readSheetRowCount(account: ServiceAccount, spreadsheetId: string, sheetTitle: string) {
  const metadata = await sheetsRequest<{ sheets?: Array<{ properties?: { title?: string; gridProperties?: { rowCount?: number } } }> }>(
    account,
    `${encodeURIComponent(spreadsheetId)}?fields=sheets(properties(title,gridProperties(rowCount)))`
  );
  const sheet = metadata.sheets?.find((item) => item.properties?.title === sheetTitle);
  const rowCount = sheet?.properties?.gridProperties?.rowCount;
  if (!sheet || !rowCount) throw new Error(`Google Sheet에서 '${sheetTitle}' 탭을 찾지 못했습니다.`);
  return rowCount;
}

/**
 * Writes values exactly as given. RAW input keeps names as text, so a value
 * that starts with "=" can never become a formula.
 */
export async function writeSheetValues(account: ServiceAccount, spreadsheetId: string, data: SheetValueRange[]) {
  if (!data.length) return 0;
  const result = await sheetsRequest<{ totalUpdatedCells?: number }>(account, `${encodeURIComponent(spreadsheetId)}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ valueInputOption: "RAW", data })
  });
  return result.totalUpdatedCells ?? 0;
}
