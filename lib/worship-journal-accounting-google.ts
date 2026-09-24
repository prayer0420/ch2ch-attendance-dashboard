import { GoogleAuth } from "google-auth-library";
import { MAX_ACCOUNTING_SIZE, parseAccountingWorkbook } from "./worship-journal-accounting";

const DRIVE_READ_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";

type GoogleDriveAccountingDependencies = {
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string>;
};

export function accountingGoogleFileId(url: string) {
  const match = url.match(/^https:\/\/(?:docs|drive)\.google\.com\/(?:spreadsheets\/d\/|file\/d\/)([\w-]+)/i);
  if (!match) throw new Error("올바른 Google Sheet 또는 Google Drive 파일 링크를 입력해 주세요.");
  return match[1];
}

async function googleDriveAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!email || !privateKey) {
    throw new Error("Google 회계 파일을 읽으려면 서비스 계정 인증 정보가 필요합니다.");
  }
  const auth = new GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: [DRIVE_READ_SCOPE]
  });
  const client = await auth.getClient();
  const response = await client.getAccessToken();
  const token = typeof response === "string" ? response : response?.token;
  if (!token) throw new Error("Google Drive 인증 토큰을 받지 못했습니다.");
  return token;
}

async function googleResponse(response: Response, context: string) {
  if (response.ok) return response;
  const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
  const detail = body.error?.message || `HTTP ${response.status}`;
  throw new Error(`${context}: ${detail}`);
}

export async function downloadGoogleAccountingWorkbook(
  url: string,
  dependencies: GoogleDriveAccountingDependencies = {}
) {
  const fileId = accountingGoogleFileId(url);
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const token = await (dependencies.getAccessToken ?? googleDriveAccessToken)();
  const headers = { Authorization: `Bearer ${token}` };
  const metadataResponse = await googleResponse(
    await fetchImpl(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=name,mimeType,size`, { headers }),
    "Google Drive 회계 파일 정보를 읽지 못했습니다. 파일을 서비스 계정에 공유하고 Drive API 사용 여부를 확인해 주세요"
  );
  const metadata = await metadataResponse.json() as { name?: string; mimeType?: string; size?: string };
  if (Number(metadata.size ?? 0) > MAX_ACCOUNTING_SIZE) {
    throw new Error("회계 파일은 15MB 이하만 사용할 수 있습니다.");
  }
  const endpoint = metadata.mimeType === GOOGLE_SHEET_MIME
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  const downloadResponse = await googleResponse(
    await fetchImpl(endpoint, { headers }),
    "Google Drive 회계 파일을 내려받지 못했습니다"
  );
  const buffer = Buffer.from(await downloadResponse.arrayBuffer());
  if (!buffer.length) throw new Error("Google Drive에서 내려받은 회계 파일이 비어 있습니다.");
  if (buffer.length > MAX_ACCOUNTING_SIZE) throw new Error("회계 파일은 15MB 이하만 사용할 수 있습니다.");
  return { buffer, name: metadata.name?.trim() || url };
}

export async function loadAccountingFromGoogleDrive(url: string, date: string, sheetTab = "", dependencies: GoogleDriveAccountingDependencies = {}) {
  const {buffer, name} = await downloadGoogleAccountingWorkbook(url, dependencies);
  return parseAccountingWorkbook(buffer, date, {
    sourceType: "google-sheet",
    sourceName: name
  }, sheetTab);
}
