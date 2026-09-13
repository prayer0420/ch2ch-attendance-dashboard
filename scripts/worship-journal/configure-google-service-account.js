const fs = require("node:fs");
const path = require("node:path");

const SPREADSHEET_ID = "1TpukKm7tN-CnM4wSqgROQ6dLNI8fLs9mVvUD_PB0mIw";
const CONFIG_KEYS = [
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  "WORSHIP_JOURNAL_SPREADSHEET_ID"
];

function buildUpdatedEnv(current, credentials) {
  if (typeof credentials?.client_email !== "string" || !credentials.client_email.endsWith(".iam.gserviceaccount.com")) {
    throw new Error("서비스 계정 JSON에서 client_email을 찾지 못했습니다.");
  }
  if (typeof credentials?.private_key !== "string" || !credentials.private_key.includes("BEGIN PRIVATE KEY")) {
    throw new Error("서비스 계정 JSON에서 private_key를 찾지 못했습니다.");
  }

  const retained = String(current ?? "")
    .split(/\r?\n/)
    .filter((line) => !CONFIG_KEYS.some((key) => line.startsWith(`${key}=`)))
    .join("\n")
    .trimEnd();
  const google = [
    `GOOGLE_SERVICE_ACCOUNT_EMAIL=${credentials.client_email.trim()}`,
    `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=${JSON.stringify(credentials.private_key)}`,
    `WORSHIP_JOURNAL_SPREADSHEET_ID=${SPREADSHEET_ID}`
  ].join("\n");
  return `${retained}${retained ? "\n\n" : ""}${google}\n`;
}

function configure(jsonPath) {
  if (!jsonPath) throw new Error("다운로드한 서비스 계정 JSON 파일 경로를 입력해 주세요.");
  const resolvedJson = path.resolve(jsonPath);
  const projectRoot = path.resolve(__dirname, "..", "..");
  const envPath = path.join(projectRoot, ".env.local");
  const backupPath = path.join(projectRoot, ".env.local.backup-before-google");
  const credentials = JSON.parse(fs.readFileSync(resolvedJson, "utf8"));
  const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const updated = buildUpdatedEnv(current, credentials);

  if (fs.existsSync(envPath)) fs.copyFileSync(envPath, backupPath);
  fs.writeFileSync(envPath, updated, { encoding: "utf8", mode: 0o600 });
  console.log("Google 예배일지 인증 정보를 .env.local에 저장했습니다.");
  if (fs.existsSync(backupPath)) console.log("기존 설정 백업: .env.local.backup-before-google");
}

if (require.main === module) {
  try {
    configure(process.argv[2]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = { buildUpdatedEnv, configure };
