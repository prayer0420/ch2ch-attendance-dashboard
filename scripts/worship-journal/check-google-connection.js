const path = require("node:path");
const { config } = require("dotenv");
const { GoogleAuth } = require("google-auth-library");

const projectRoot = path.resolve(__dirname, "..", "..");
config({ path: path.join(projectRoot, ".env.local"), override: false });

async function main() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const spreadsheetId = process.env.WORSHIP_JOURNAL_SPREADSHEET_ID?.trim();
  if (!email || !privateKey || !spreadsheetId) throw new Error(".env.local의 Google 예배일지 설정이 완전하지 않습니다.");

  const auth = new GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;
  if (!token) throw new Error("Google 인증 토큰을 받지 못했습니다.");

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Google Sheet 연결 실패: ${message}`);
  }
  console.log(`Google Sheet 연결 성공: ${body.properties?.title ?? spreadsheetId}`);
  console.log(`읽을 수 있는 탭: ${Array.isArray(body.sheets) ? body.sheets.length : 0}개`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
