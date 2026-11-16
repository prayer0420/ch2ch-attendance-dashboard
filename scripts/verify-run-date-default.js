const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const filename = path.resolve(__dirname, "../lib/sunday-week.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
});
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled.outputText, filename);
const { mostRecentSunday, sundayOnOrBefore, weekOfSunday, dateForSundayWeek, weeksInSundayYear } = loaded.exports;

assert.equal(mostRecentSunday(new Date(2026, 9, 8, 12)), "2026-10-04");
assert.equal(mostRecentSunday(new Date(2026, 9, 4, 0)), "2026-10-04");
assert.equal(mostRecentSunday(new Date(2026, 9, 10, 23, 59)), "2026-10-04");
assert.equal(mostRecentSunday(new Date(2026, 9, 11, 0)), "2026-10-11");
assert.equal(sundayOnOrBefore("2026-10-08"), "2026-10-04");
assert.deepEqual(weekOfSunday("2026-10-08"), { year: 2026, week: 40 });
assert.equal(dateForSundayWeek(2026, 39), "2026-09-27");
assert.equal(dateForSundayWeek(2026, 40), "2026-10-04");
assert.equal(dateForSundayWeek(2026, 53), null);
assert.equal(weeksInSundayYear(2023), 53);
assert.equal(dateForSundayWeek(2023, 53), "2023-12-31");
assert.deepEqual(weekOfSunday("2027-01-01"), { year: 2026, week: 52 });

const runForm = fs.readFileSync(path.resolve(__dirname, "../components/run-create-form.tsx"), "utf8");
assert.match(runForm, /targetDate: currentSunday/);
assert.match(runForm, /dateForSundayWeek\(calculatedWeek\.year/);
assert.doesNotMatch(runForm, /targetDate: restoredTargetDate/);
const qrForm = fs.readFileSync(path.resolve(__dirname, "../components/qr-attendance-sync.tsx"), "utf8");
assert.match(qrForm, /weekOfSunday\(mostRecentSunday\(\)\)/);
assert.doesNotMatch(qrForm, /isoWeekSunday/);

const journalForm = fs.readFileSync(path.resolve(__dirname, "../components/worship-journal-builder.tsx"), "utf8");
assert.match(journalForm, /useState\(\(\) => mostRecentSunday\(\)\)/);
assert.doesNotMatch(journalForm, /upcomingSunday/);
assert.match(journalForm, /onChange=\{\(event\) => setDate\(event.target.value\)\}/);

console.log("Sunday-start attendance, QR, and worship journal defaults, Sunday boundaries, and manual date selection passed");
