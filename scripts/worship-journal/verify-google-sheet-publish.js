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
  announcements: [],
  accounting: { sourceType: "excel", sourceName: "test", sheetTab: "0913", sundayTotal: 340000, thanksgivingTotal: 396000, purposeTotal: 123000, total: 736000, thanksgiving: [], purpose: [{name:"흘려보내는 기쁨",amount:123000,note:""}] }
};

// Model the real template merge H26:K26: only H26 retains a value.
// The old H26:I35 mapping therefore loses its first amount on read-back.
function mergedReadback(item) {
  const start = /!([A-Z]+)(\d+)/.exec(item.range);
  const column = [...start[1]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
  const row = Number(start[2]);
  return { range: item.range, values: item.values.map((values, ri) => values.map((value, ci) =>
    row + ri === 26 && column + ci >= 9 && column + ci <= 11 ? "" : value)) };
}
assert.deepEqual(mergedReadback({range:"'0913'!H26:I35",values:[["흘려보내는 기쁨",123000]]}).values, [["흘려보내는 기쁨", ""]]);

async function run() {
  const calls = [];
  let writtenData = [];
  const copiedRows = [["", "♥기타사항"], ...Array.from({ length: 11 }, (_, i) => ["", `${i + 1}. 이전 광고`]), ["", "[예배마침: 15:38]"]];
  const guardValues = [["", "♥기타사항"], ...Array.from({ length: 9 }, () => []), ["", "[예배마침: 15:38]"]];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("/values:batchGet")) return Response.json({ valueRanges: [...writtenData.map(mergedReadback), { values: guardValues }] });
    if (String(url).includes("/values/")) return Response.json({ values: copiedRows });
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
  assert.equal(calls.length, 7);
  assert.match(calls[0].url, /fields=sheets\.properties/);
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-token");
  const duplicateBody = JSON.parse(calls[1].init.body);
  assert.deepEqual(duplicateBody.requests, [{ duplicateSheet: { sourceSheetId: 906, insertSheetIndex: 0, newSheetName: "0913" } }]);
  assert.match(decodeURIComponent(calls[2].url), /A43:Z200/);
  assert.deepEqual(JSON.parse(calls[3].init.body).requests, [{ deleteDimension: { range: { sheetId: 913, dimension: "ROWS", startIndex: 52, endIndex: 54 } } }]);
  assert.match(calls[4].url, /values:batchUpdate/);
  const valuesBody = JSON.parse(calls[4].init.body);
  assert.equal(valuesBody.valueInputOption, "RAW");
  assert.ok(valuesBody.data.some((item) => item.range === "'0913'!C27" && item.values[0][0] === ""));
  assert.deepEqual(valuesBody.data.find((item) => item.range === "'0913'!H27:K36").values[0], ["흘려보내는 기쁨", "", 123000, ""]);
  assert.deepEqual(valuesBody.data.find((item) => item.range === "'0913'!C37").values, [[736000]]);
  const postWriteBody = JSON.parse(calls[5].init.body);
  assert.equal(postWriteBody.requests[0].repeatCell.cell.userEnteredFormat.wrapStrategy, "WRAP");
  assert.ok(postWriteBody.requests.some((request) => request.autoResizeDimensions));
  assert.match(calls[6].url, /values:batchGet/);

  const mismatchCalls = [];
  const mismatchFetch = async (url, init = {}) => {
    mismatchCalls.push({ url: String(url), init });
    if (String(url).includes("/values:batchGet")) return Response.json({ valueRanges: [] });
    if (String(url).includes("/values/")) return Response.json({ values: copiedRows });
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

  // All submitted values match, but a stale ad in a blank slot or below the
  // footer must still fail verification and roll back only the new tab.
  for (const staleRow of [4, 11]) {
    const staleFetch = async (url, init = {}) => {
      if (String(url).includes("/values:batchGet")) {
        const stale = structuredClone(guardValues);
        stale[staleRow] = ["", "10. 코람데오 기도회"];
        return Response.json({ valueRanges: [...writtenData.map(mergedReadback), { values: stale }] });
      }
      return fetchImpl(url, init);
    };
    // Use request contents for duplicate detection independently of call count.
    const wrapped = async (url, init = {}) => {
      if (init.body && JSON.parse(init.body).requests?.[0]?.duplicateSheet) return Response.json({ replies: [{ duplicateSheet: { properties: { sheetId: 913 } } }] });
      return staleFetch(url, init);
    };
    await assert.rejects(() => publishWorshipJournalToGoogleSheet(journal, { config, fetchImpl: wrapped, getAccessToken: async () => "test-token" }), /저장 후 재검증에 실패/);
    assert.deepEqual(JSON.parse(calls.at(-1).init.body).requests, [{ deleteSheet: { sheetId: 913 } }]);
  }

  console.log("worship journal Google Sheet publishing: merged purpose cells, amount read-back verification, separate totals and failure cleanup passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
