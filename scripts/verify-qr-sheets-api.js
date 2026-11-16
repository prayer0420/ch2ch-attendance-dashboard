// Simulates the Google Sheet for the QR Sheets API path: roster write, QR formula
// recalculation, attendance checkbox writes and re-verification. No network.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const XLSX = require("xlsx");

const root = path.resolve(__dirname, "..");
require.extensions[".ts"] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText, file);
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  if (request.startsWith("./") && parent?.filename?.startsWith(path.join(root, "lib")) && !path.extname(request)) {
    const candidate = path.join(path.dirname(parent.filename), request + ".ts");
    if (fs.existsSync(candidate)) return candidate;
  }
  return originalResolve.call(this, request, parent, ...args);
};

const SHEET_ID = "test-sheet";
const TAB = "가장체크";
const ROWS = 40;
const people = ["가나다", "라마바", "사아자B", "차카타"];
const cells = new Map();
const key = (r, c) => r + ":" + c;
people.forEach((name, index) => cells.set(key(3 + index, 0), name));
const writes = [];

function rosterNames(column) {
  const names = new Set();
  for (let row = 1; row < ROWS; row += 1) {
    String(cells.get(key(row, column)) ?? "").split(/\s*·\s*/).filter(Boolean).forEach((name) => names.add(name));
  }
  return names;
}

function exportWorkbook() {
  const in13 = rosterNames(120);
  const in4 = rosterNames(122);
  const aoa = Array.from({ length: ROWS }, (_, row) => Array.from({ length: 124 }, (_, column) => cells.get(key(row, column)) ?? null));
  people.forEach((name, index) => {
    const row = 3 + index;
    aoa[row][1] = in13.has(name);
    aoa[row][2] = cells.get(key(row, 2)) === true;
    aoa[row][4] = in4.has(name);
    aoa[row][5] = cells.get(key(row, 5)) === true;
    aoa[row][6] = "방송";
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(aoa), TAB);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

globalThis.fetch = async (url, init = {}) => {
  const target = String(url);
  if (target.startsWith("https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/export")) return new Response(exportWorkbook());
  if (target.startsWith("https://sheets.googleapis.com/v4/spreadsheets/" + SHEET_ID + "?")) {
    return Response.json({ sheets: [{ properties: { title: TAB, gridProperties: { rowCount: ROWS } } }] });
  }
  if (target === "https://sheets.googleapis.com/v4/spreadsheets/" + SHEET_ID + "/values:batchUpdate") {
    const body = JSON.parse(init.body);
    assert.equal(body.valueInputOption, "RAW", "Names must be written as plain text");
    for (const item of body.data) {
      const [, sheet, ref] = item.range.match(/^'(.+)'!(.+)$/);
      assert.equal(sheet, TAB);
      const range = XLSX.utils.decode_range(ref);
      item.values.forEach((rowValues, rowOffset) => rowValues.forEach((value, columnOffset) => {
        cells.set(key(range.s.r + rowOffset, range.s.c + columnOffset), value === "" ? null : value);
      }));
      writes.push(item.range);
    }
    return Response.json({ totalUpdatedCells: 1 });
  }
  throw new Error("Unexpected request: " + target);
};

(async () => {
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "qr-test@example.iam.gserviceaccount.com";
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = "test-only";
  globalThis.__ch2chSheetsToken = { key: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, token: "test-token", expiresAt: Date.now() + 3_600_000 };
  const qr = require(path.join(root, "lib", "qr-attendance-sync.ts"));
  const preview = {
    id: "preview-api", createdAt: new Date().toISOString(), week: 40, weekLabel: "40주",
    sheetUrl: "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/edit", sheetTab: TAB, department: "2청년회",
    downloadedCount: 5, departmentCount: 5,
    service13Names: ["가나다", "사아자B", "없는사람"], service4Names: ["라마바"],
    duplicate13Count: 0, duplicate4Count: 0, unmatched13Names: ["없는사람"], unmatched4Names: [], duplicateSheetNames: []
  };
  qr.hydrateQrAttendancePreview(preview);
  // Reject stale/changed selections before any live sheet write is attempted.
  for (const changed of [undefined, { ...preview, week: 41 }, { ...preview, sheetTab: TAB + " 지난주" }, { ...preview, sheetUrl: preview.sheetUrl + "other" }]) {
    await assert.rejects(qr.applyQrAttendancePreview(preview.id, changed), /현재 설정/);
  }
  assert.equal(writes.length, 0, "Mismatched selections must never write to Sheets");
  const started = Date.now();
  const result = await qr.applyQrAttendancePreview(preview.id, preview);
  assert.equal(result.writeMethod, "api");
  assert.equal(result.verified13, 2);
  assert.equal(result.verified4, 1);
  assert.deepEqual(result.verificationFailures.map((failure) => failure.name), ["없는사람"]);
  assert.equal(cells.get(key(3, 2)), true, "1-3부 attendance for a QR person");
  assert.equal(cells.get(key(5, 2)), true, "suffix names stay exact");
  assert.equal(cells.get(key(4, 5)), true, "4부 attendance for a QR person");
  assert.notEqual(cells.get(key(6, 2)), true, "people without QR stay unchecked");
  assert.notEqual(cells.get(key(4, 2)), true, "4부 QR must not check 1-3부");
  assert.equal(writes[0], "'" + TAB + "'!DQ2:DT" + ROWS, "Roster is written before attendance cells");
  assert.ok(Date.now() - started < 15000, "API path should not wait like the browser editor");
  console.log("QR Sheets API path passed: roster first, exact names, per-service attendance, unmatched names reported");
})().catch((error) => { console.error(error); process.exitCode = 1; });
