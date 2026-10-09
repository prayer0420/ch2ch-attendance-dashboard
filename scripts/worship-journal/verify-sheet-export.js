const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "../..");
require.extensions[".ts"] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText, file);
const { exportWorshipJournalSheetPdf } = require("../../lib/worship-journal-google-api.ts");
const config = { email: "test@example.com", privateKey: "fixture", spreadsheetId: "journal-sheet" };
const output = { spreadsheetId: config.spreadsheetId, sheetId: 42 };

async function main() {
  const calls = [];
  const fake = async (url, init) => {
    calls.push({ url: new URL(url), init });
    assert.equal(init.headers.Authorization, "Bearer test-token");
    assert.equal(init.method ?? "GET", "GET", "Exports must never write to Google");
    if (url.includes("/export?")) return new Response("%PDF-fixture", { headers: { "content-type": "application/pdf" } });
    if (url.includes("/values/")) return Response.json({ values: [["현재 시트 제목"], ...Array.from({ length: 56 }, () => []), ["마지막 광고"]] });
    return Response.json({ sheets: [
      { properties: { sheetId: 99, title: "다른 날짜" } },
      { properties: { sheetId: 42, title: "수정된 '1004'" }, merges: [{ startColumnIndex: 1, endRowIndex: 60 }] }
    ] });
  };
  const deps = { config, getAccessToken: async () => "test-token", fetchImpl: fake };
  const result = await exportWorshipJournalSheetPdf(output, deps);
  assert.equal(new TextDecoder().decode(result), "%PDF-fixture");
  assert.equal(calls.length, 3);
  assert.match(decodeURIComponent(calls[1].url.pathname), /'수정된 ''1004'''!A1:K1000/);
  const query = calls[2].url.searchParams;
  for (const [key, value] of Object.entries({ gid: "42", r1: "0", r2: "60", c1: "0", c2: "11", format: "pdf", gridlines: "false", fzr: "false" })) {
    assert.equal(query.get(key), value);
  }
  assert.equal(calls[2].init.cache, "no-store");
  await assert.rejects(() => exportWorshipJournalSheetPdf({ ...output, spreadsheetId: "other" }, deps), /저장된 탭만/);
  await assert.rejects(() => exportWorshipJournalSheetPdf({ ...output, sheetId: -1 }, deps), /저장된 탭만/);
  await assert.rejects(() => exportWorshipJournalSheetPdf({ ...output, sheetId: 999 }, deps), /삭제/);
  await assert.rejects(() => exportWorshipJournalSheetPdf(output, { ...deps, fetchImpl: async (url, init) => url.includes("/values/") ? Response.json({ values: [] }) : fake(url, init) }), /내용이 없/);
  await assert.rejects(() => exportWorshipJournalSheetPdf(output, { ...deps, fetchImpl: async (url, init) => url.includes("/export?") ? new Response("login", { status: 403 }) : fake(url, init) }), /PDF를 가져오지 못/);
  await assert.rejects(() => exportWorshipJournalSheetPdf(output, { ...deps, fetchImpl: async (url, init) => url.includes("/export?") ? new Response("not PDF", { headers: { "content-type": "application/pdf" } }) : fake(url, init) }), /형식/);
  const route = fs.readFileSync(path.join(root, "app/api/worship-journals/export/route.ts"), "utf8");
  assert.ok(route.indexOf("checkRequestSecurity(request)") < route.indexOf("fs.readFile("));
  assert.match(route, /journals.find\(\(item\) => item.id === id\)/);
  assert.doesNotMatch(route, /searchParams.get\("(?:url|spreadsheetId|sheetId)"\)/);
  console.log("PASS: exact saved tab, current values and renamed tabs, original form bounds/merges, no writes, missing/empty/wrong sheet, upstream failures and PDF signature, authenticated export contract.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
