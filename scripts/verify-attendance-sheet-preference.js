const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const filename = path.join(__dirname, "..", "lib", "attendance-sheet-preference.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: filename
});
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled.outputText, filename);
const { ATTENDANCE_SHEET_STORAGE_KEY, DEFAULT_ATTENDANCE_SHEET_URL, isAttendanceSheetUrl, readAttendanceSheetUrl, saveAttendanceSheetUrl } = loaded.exports;

assert.match(DEFAULT_ATTENDANCE_SHEET_URL, /11TQJbhev8m0MfPqW70b2HPbuXleOOfMSL2MXpr3Ab2o/);
assert.match(DEFAULT_ATTENDANCE_SHEET_URL, /gid=437108819/);
assert.equal(readAttendanceSheetUrl({ getItem: () => null }), DEFAULT_ATTENDANCE_SHEET_URL);
assert.equal(isAttendanceSheetUrl(DEFAULT_ATTENDANCE_SHEET_URL), true);
assert.equal(readAttendanceSheetUrl({ getItem: () => " https://docs.google.com/spreadsheets/d/custom/edit " }), "https://docs.google.com/spreadsheets/d/custom/edit");
assert.equal(readAttendanceSheetUrl({ getItem: () => "https://example.com/not-a-sheet" }), DEFAULT_ATTENDANCE_SHEET_URL);

const saved = [];
const storage = { setItem: (key, value) => saved.push([key, value]) };
saveAttendanceSheetUrl(" https://docs.google.com/spreadsheets/d/last/edit ", storage);
saveAttendanceSheetUrl(" https://example.com/not-a-sheet ", storage);
saveAttendanceSheetUrl("   ", storage);
assert.deepEqual(saved, [[ATTENDANCE_SHEET_STORAGE_KEY, "https://docs.google.com/spreadsheets/d/last/edit"]]);

for (const component of ["components/qr-attendance-sync.tsx", "components/run-create-form.tsx", "components/worship-journal-builder.tsx"]) {
  const source = fs.readFileSync(path.join(__dirname, "..", component), "utf8");
  assert.match(source, /readAttendanceSheetUrl/);
  assert.match(source, /saveAttendanceSheetUrl/);
}

console.log("attendance sheet preference: shared default, restore, and last-value persistence passed");
