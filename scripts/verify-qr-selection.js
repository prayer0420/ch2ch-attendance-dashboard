const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
require.extensions[".ts"] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, file);
const { readQrSelection, qrSelectionMatches, assertQrSelectionMatches, exactQrTabPattern, assertQrSourceWeek } = require("../lib/qr-selection.ts");
const selection = { week: 42, sheetUrl: "https://docs.google.com/spreadsheets/d/test/edit", sheetTab: "가장체크" };
assert.deepEqual(readQrSelection({ ...selection, sheetTab: " 가장체크 " }), selection);
assert.ok(qrSelectionMatches(selection, { ...selection }));
for (const stale of [null, { ...selection, week: 41 }, { ...selection, sheetUrl: selection.sheetUrl + "other" }, { ...selection, sheetTab: "지난주" }]) {
  assert.equal(qrSelectionMatches(selection, stale), false);
  assert.throws(() => assertQrSelectionMatches(selection, stale), /현재 설정/);
}
for (const week of [0, 54, NaN, 2.5]) assert.throws(() => readQrSelection({ ...selection, week }));
for (const field of ["sheetUrl", "sheetTab"]) assert.throws(() => readQrSelection({ ...selection, [field]: " " }));
assert.equal(assertQrSourceWeek(42, "42", "42주 (10/18)"), "42주 (10/18)");
assert.equal(assertQrSourceWeek(2, "02", "2주"), "2주");
for (const [value, label] of [["41", "41주"], ["", "42주"], ["42", ""], ["42", null]]) {
  assert.throws(() => assertQrSourceWeek(42, value, label), /다른 주차 명단은 읽지 않습니다/);
}
const tab = exactQrTabPattern("가장체크 (10.18)");
assert.ok(tab.test("가장체크 (10.18)"));
assert.equal(tab.test("가장체크 (10.18) 지난주"), false);
assert.equal(tab.test("가장체크 (10X18)"), false);
// Wiring checks complement the functional no-write regression in verify-qr-sheets-api.
const ui = fs.readFileSync(path.join(root, "components/qr-attendance-sync.tsx"), "utf8");
assert.match(ui, /setPreview\(null\);\s*setResult\(null\);\s*}, \[week, sheetUrl, sheetTab\]/);
assert.match(ui, /assertQrSelectionMatches\(loaded, selection\)/);
assert.match(ui, /assertQrSelectionMatches\(preview, selection\)/);
assert.match(ui, /disabled=\{!previewMatches/);
assert.match(ui, /if \(weekEdited \|\| loading \|\| preview\) return/);
const worker = fs.readFileSync(path.join(root, "app/api/qr-attendance/worker/route.ts"), "utf8");
assert.ok(worker.indexOf("assertQrSelectionMatches(preview, selection)") < worker.indexOf("hydrateQrAttendancePreview(preview)"));
console.log("PASS: QR exact selection, stale preview rejection, missing settings, source week mismatch, exact tab names, UI/worker guards.");
