const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..", "..");

function loadTypeScriptModule(relativePath) {
  const filename = path.join(projectRoot, relativePath);
  if (!fs.existsSync(filename)) assert.fail(`${relativePath} is not implemented`);
  const compile = (target) => ts.transpileModule(fs.readFileSync(target, "utf8"), {
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        target: ts.ScriptTarget.ES2020
      },
      fileName: target
    }).outputText;
  require.extensions[".ts"] = (targetModule, targetFilename) => targetModule._compile(compile(targetFilename), targetFilename);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(compile(filename), filename);
  return loaded.exports;
}

const { publishWorshipJournalToGoogleSheet, readGoogleSheetConfig } = loadTypeScriptModule("lib/worship-journal-google-api.ts");
const configureScript = path.join(projectRoot, "scripts", "worship-journal", "configure-google-service-account.js");
if (!fs.existsSync(configureScript)) assert.fail("Google service-account setup helper is not implemented");
const { buildUpdatedEnv } = require(configureScript);

const updatedEnv = buildUpdatedEnv("NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co\n", {
  client_email: "journal@example.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----\n"
});
assert.match(updatedEnv, /^NEXT_PUBLIC_SUPABASE_URL=https:\/\/example\.supabase\.co$/m);
assert.match(updatedEnv, /^GOOGLE_SERVICE_ACCOUNT_EMAIL=journal@example\.iam\.gserviceaccount\.com$/m);
assert.match(updatedEnv, /^GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nsecret\\n-----END PRIVATE KEY-----\\n"$/m);
assert.match(updatedEnv, /^WORSHIP_JOURNAL_SPREADSHEET_ID=1TpukKm7tN-CnM4wSqgROQ6dLNI8fLs9mVvUD_PB0mIw$/m);

assert.throws(
  () => readGoogleSheetConfig({}),
  /GOOGLE_SERVICE_ACCOUNT_EMAIL.*GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY/
);
const config = readGoogleSheetConfig({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: "journal@example.iam.gserviceaccount.com",
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "line1\\nline2",
  WORSHIP_JOURNAL_SPREADSHEET_ID: "sheet-id"
});
assert.equal(config.privateKey, "line1\nline2");
assert.equal(config.spreadsheetId, "sheet-id");

const journal = {
  date: "2026-09-13",
  author: "박기도",
  attendance: { service13: 1, service13Online: 0, service4: 2, service4Online: 0, familyMeeting: 1, families: [] },
  newFamilies: [],
  graduates: [],
  sermon: { title: "제목", passage: "본문", preacher: "설교자" },
  service: { representativePrayer: "", offeringMembers: "", offeringPrayer: "", guide: "", cleanup: "", mealService: "", prayerMeeting: "" },
  announcements: []
};

async function run() {
  const calls = [];
  let writtenData = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("/values:batchGet")) return Response.json({ valueRanges: writtenData.map((item) => ({ range: item.range, values: item.values })) });
    if (!init.method) return Response.json({ sheets: [{ properties: { sheetId: 906, title: "0906", index: 0 } }] });
    if (calls.length === 2) return Response.json({ replies: [{ duplicateSheet: { properties: { sheetId: 913, title: "0913", index: 0 } } }] });
    if (String(url).includes("/values:batchUpdate")) writtenData = JSON.parse(init.body).data;
    return Response.json({});
  };

  const output = await publishWorshipJournalToGoogleSheet(journal, {
    config,
    fetchImpl,
    getAccessToken: async () => "test-token"
  });

  assert.equal(output.spreadsheetId, "sheet-id");
  assert.equal(output.sheetId, 913);
  assert.equal(output.sheetTitle, "0913");
  assert.equal(output.url, "https://docs.google.com/spreadsheets/d/sheet-id/edit#gid=913");
  assert.equal(output.verification.passed, true);
  assert.ok(output.verification.checkedCells > 0);
  assert.equal(calls.length, 5);
  assert.match(calls[0].url, /fields=sheets\.properties/);
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-token");
  const duplicateBody = JSON.parse(calls[1].init.body);
  assert.deepEqual(duplicateBody.requests, [{ duplicateSheet: { sourceSheetId: 906, insertSheetIndex: 0, newSheetName: "0913" } }]);
  assert.match(calls[2].url, /values:batchUpdate/);
  const valuesBody = JSON.parse(calls[2].init.body);
  assert.equal(valuesBody.valueInputOption, "RAW");
  assert.ok(valuesBody.data.some((item) => item.range === "'0913'!C27" && item.values[0][0] === ""));
  const postWriteBody = JSON.parse(calls[3].init.body);
  assert.equal(postWriteBody.requests[0].repeatCell.cell.userEnteredFormat.wrapStrategy, "WRAP");
  assert.ok(postWriteBody.requests.some((request) => request.autoResizeDimensions));
  assert.match(calls[4].url, /values:batchGet/);

  const mismatchCalls = [];
  const mismatchFetch = async (url, init = {}) => {
    mismatchCalls.push({ url: String(url), init });
    if (String(url).includes("/values:batchGet")) return Response.json({ valueRanges: [] });
    if (!init.method) return Response.json({ sheets: [{ properties: { sheetId: 906, title: "0906", index: 0 } }] });
    if (mismatchCalls.length === 2) return Response.json({ replies: [{ duplicateSheet: { properties: { sheetId: 913 } } }] });
    return Response.json({});
  };
  await assert.rejects(() => publishWorshipJournalToGoogleSheet(journal, {
    config,
    fetchImpl: mismatchFetch,
    getAccessToken: async () => "test-token"
  }), /저장 후 재검증에 실패/);
  const cleanup = JSON.parse(mismatchCalls.at(-1).init.body);
  assert.deepEqual(cleanup.requests, [{ deleteSheet: { sheetId: 913 } }]);

  console.log("worship journal Google Sheet publishing: write, read-back verification, and cleanup passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
