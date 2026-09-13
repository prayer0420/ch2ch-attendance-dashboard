const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..", "..");
const filename = path.join(projectRoot, "lib", "worship-journal-review.ts");

assert.ok(fs.existsSync(filename), "review digest module must exist");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    target: ts.ScriptTarget.ES2020
  },
  fileName: filename
});
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled.outputText, filename);

const { applyReviewedJournal, worshipJournalReviewDigest } = loaded.exports;

const journal = {
  id: "preview-1",
  createdAt: "2026-09-11T00:00:00.000Z",
  date: "2026-09-13",
  author: "박기도",
  source: { attendanceSheetUrl: "sheet", attendanceSheetTab: "가장체크", bulletinFileName: "주보.pdf", bulletinFormat: "pdf" },
  attendance: { service13: 10, service13Online: 0, service4: 20, service4Online: 0, familyMeeting: 9, families: [] },
  newFamilies: [],
  graduates: [],
  accounting: { sourceType: "excel", sourceName: "회계.xlsx", sheetName: "0913", sundayTotal: 1, thanksgivingTotal: 2, purposeTotal: 3, total: 6, thanksgiving: [], purpose: [] },
  sermon: { title: "제목", passage: "본문", preacher: "설교자" },
  service: { representativePrayer: "양건우", offeringMembers: "", offeringPrayer: "", guide: "", mealService: "", prayerMeeting: "" },
  announcements: [],
  extraction: { format: "pdf", requiresReview: true, evidenceLines: ["양건우"] }
};

const original = worshipJournalReviewDigest(journal);
assert.equal(original, worshipJournalReviewDigest({ ...journal, id: "preview-2", createdAt: "2026-09-11T01:00:00.000Z" }));
assert.notEqual(original, worshipJournalReviewDigest({ ...journal, service: { ...journal.service, representativePrayer: "박건우" } }));
assert.notEqual(original, worshipJournalReviewDigest({ ...journal, accounting: { ...journal.accounting, total: 7 } }));

const reviewed = applyReviewedJournal(journal, {
  ...journal,
  date: "2099-01-01",
  source: { attendanceSheetUrl: "hijacked" },
  attendance: {
    ...journal.attendance,
    families: [{ family: "건우네", service13: 4, service4: 8, familyMeeting: 7 }]
  },
  accounting: {
    ...journal.accounting,
    sundayTotal: 100,
    thanksgivingTotal: 200,
    purposeTotal: 300,
    total: 999999,
    thanksgiving: [
      { name: "하늘", amount: 20, note: "" },
      { name: "양건우", amount: 10, note: "감사" },
      { name: "가람", amount: 30, note: "감사" }
    ]
  },
  sermon: { title: "하나님의 선물", passage: "고린도전서 7:1~7", preacher: "전병인 목사" },
  announcements: ["첫 광고", "", "둘째 광고"]
});
assert.equal(reviewed.date, "2026-09-13");
assert.equal(reviewed.source.attendanceSheetUrl, "sheet");
assert.deepEqual(reviewed.attendance.families[0], { family: "건우네", service13: 4, service4: 8, familyMeeting: 7 });
assert.equal(reviewed.accounting.total, 600);
assert.deepEqual(reviewed.accounting.thanksgiving.map((item) => item.name), ["가람", "양건우", "하늘"]);
assert.deepEqual(reviewed.sermon, { title: "하나님의 선물", passage: "고린도전서 7:1~7", preacher: "전병인 목사" });
assert.deepEqual(reviewed.announcements, ["첫 광고", "둘째 광고"]);

console.log("worship journal review: digest safety and editable-field sanitization passed");
