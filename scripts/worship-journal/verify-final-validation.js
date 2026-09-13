const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..", "..");
function loadTypeScriptModule(relativePath) {
  const filename = path.join(projectRoot, relativePath);
  const compile = (target) => ts.transpileModule(fs.readFileSync(target, "utf8"), {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.NodeJs, target: ts.ScriptTarget.ES2020 },
    fileName: target
  }).outputText;
  require.extensions[".ts"] = (targetModule, targetFilename) => targetModule._compile(compile(targetFilename), targetFilename);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(compile(filename), filename);
  return loaded.exports;
}

const { validateWorshipJournalForPublish, validationFailureMessage } = loadTypeScriptModule("lib/worship-journal-validation.ts");
const journal = {
  date: "2026-09-06",
  author: "박기도",
  attendance: { service13: 76, service13Online: 0, service4: 193, service4Online: 0, familyMeeting: 112, families: [{ family: "종인이네", service13: 4, service4: 8, familyMeeting: 7 }] },
  accounting: {
    sourceType: "google-sheet", sourceName: "source", sheetTab: "09006",
    sundayTotal: 496000, thanksgivingTotal: 186000, purposeTotal: 0, total: 682000,
    sunday: [], purpose: [], thanksgiving: [
      { name: "가나다", amount: 100000, note: "감사" },
      { name: "라마바", amount: 86000, note: "" }
    ]
  },
  sermon: { title: "하나님의 선물", passage: "고린도전서 7:1~7", preacher: "전병인 목사" },
  service: { representativePrayer: "기도자", offeringMembers: "헌금위원", offeringPrayer: "헌금기도자", guide: "안내팀", cleanup: "안내팀", mealService: "식당팀", prayerMeeting: "기도회" }
};

const valid = validateWorshipJournalForPublish(journal, "2026-09-06");
assert.equal(valid.ok, true);
assert.equal(valid.passed, valid.total);
assert.match(valid.checks.find((check) => check.id === "date").detail, /0906 탭/);

const wrongDate = validateWorshipJournalForPublish({ ...journal, date: "2026-06-28" }, "2026-09-06");
assert.equal(wrongDate.ok, false);
assert.match(validationFailureMessage(wrongDate), /선택한 날짜 2026-09-06/);

const wrongAccounting = validateWorshipJournalForPublish({
  ...journal,
  accounting: { ...journal.accounting, thanksgivingTotal: 999, total: 496999 }
}, journal.date);
assert.equal(wrongAccounting.ok, false);
assert.equal(wrongAccounting.checks.find((check) => check.id === "thanksgiving-sum").ok, false);

const missingSermon = validateWorshipJournalForPublish({ ...journal, sermon: { ...journal.sermon, preacher: "" } }, journal.date);
assert.equal(missingSermon.ok, false);
assert.equal(missingSermon.checks.find((check) => check.id === "sermon").ok, false);

const visitorIncluded = validateWorshipJournalForPublish({
  ...journal,
  attendance: { ...journal.attendance, families: [...journal.attendance.families, { family: "새가족 방문자", service13: 0, service4: 3, familyMeeting: 0 }] }
}, journal.date);
assert.equal(visitorIncluded.ok, false);
assert.equal(visitorIncluded.checks.find((check) => check.id === "visitor-exclusion").ok, false);

console.log("worship journal final validation: date, totals, visitor exclusion, required fields, and output order passed");
