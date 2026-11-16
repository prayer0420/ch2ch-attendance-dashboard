const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..", "..");

function loadTypeScriptModule(relativePath) {
  const filename = path.join(projectRoot, relativePath);
  if (!fs.existsSync(filename)) assert.fail(`${relativePath} is not implemented`);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
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
  return loaded.exports;
}

const {
  buildSheetPostWriteRequests,
  buildSheetStructureRequests,
  buildSheetValueUpdates,
  inspectAnnouncementSlots,
  journalTabName,
  selectTemplateSheet
} = loadTypeScriptModule("lib/worship-journal-google-sheet.ts");

assert.equal(journalTabName("2026-09-13"), "0913");
assert.throws(() => journalTabName("invalid"), /날짜/);

const sheets = [
  { properties: { sheetId: 90, title: "0906", index: 0 } },
  { properties: { sheetId: 83, title: "0830", index: 1 } },
  { properties: { sheetId: 1, title: "안내", index: 2 } }
];
assert.deepEqual(selectTemplateSheet(sheets, "0913"), { sheetId: 90, title: "0906", index: 0 });
assert.throws(() => selectTemplateSheet([...sheets, { properties: { sheetId: 91, title: "0913", index: 0 } }], "0913"), /이미 존재/);

assert.deepEqual(buildSheetStructureRequests(913, 2), []);

// Regression: the previous publisher inserted count - 9 into a template that
// already had 11 slots, leaving old announcements behind on every generation.
let templateRows = [["", "♥기타사항"], ...Array.from({ length: 12 }, (_, i) => ["", `${i + 1}. 이전 광고`]), ["", "[예배마침: 15:38]"]];
for (const count of [10, 10, 3, 0, 14, 9]) {
  const previousSlots = inspectAnnouncementSlots(templateRows);
  const grid = [...Array.from({ length: 42 }, () => []), ...templateRows];
  const requests = buildSheetStructureRequests(913, count, previousSlots);
  for (const request of requests) {
    const inserted = request.insertDimension?.range;
    const deleted = request.deleteDimension?.range;
    if (inserted) grid.splice(inserted.startIndex, 0, ...Array.from({ length: inserted.endIndex - inserted.startIndex }, () => []));
    if (deleted) grid.splice(deleted.startIndex, deleted.endIndex - deleted.startIndex);
  }
  const slots = Math.max(9, count);
  for (let i = 0; i < slots; i++) grid[43 + i] = ["", i < count ? `${i + 1}. 이번 광고 ${i + 1}` : ""];
  templateRows = grid.slice(42);
  assert.equal(templateRows.length, slots + 2, "반복 복제에도 행이 누적되지 않음");
  assert.equal(templateRows.at(-1)[1], "[예배마침: 15:38]", "광고 아래 기존 내용 보존");
  assert.doesNotMatch(JSON.stringify(templateRows), /이전 광고/);
  assert.equal(inspectAnnouncementSlots(templateRows), slots);
}
assert.throws(() => inspectAnnouncementSlots([]), /B43/);
assert.throws(() => inspectAnnouncementSlots([["", "♥기타사항"], ["", "1. 광고", "다른 자료"]]), /광고 외/);
assert.throws(() => inspectAnnouncementSlots([["", "♥기타사항"], ["", "알 수 없는 영역"]]), /경계/);

const longAnnouncementRequests = buildSheetStructureRequests(913, 11);
assert.ok(longAnnouncementRequests.some((request) => request.insertDimension?.range.startIndex === 52 && request.insertDimension?.range.endIndex === 54));
assert.equal(longAnnouncementRequests.filter((request) => request.mergeCells?.range.startRowIndex >= 52).length, 2);
const postWriteRequests = buildSheetPostWriteRequests(913, 11);
assert.equal(postWriteRequests[0].repeatCell.cell.userEnteredFormat.wrapStrategy, "WRAP");
assert.deepEqual(postWriteRequests.find((request) => request.autoResizeDimensions).autoResizeDimensions.dimensions, { sheetId: 913, dimension: "ROWS", startIndex: 43, endIndex: 54 });
assert.equal(longAnnouncementRequests.find((request) => request.copyPaste).copyPaste.source.startRowIndex, 50);
for (const count of [0, 8, 9, 11, 50]) {
  const requests = buildSheetPostWriteRequests(913, count);
  const copy = requests.find((request) => request.copyPaste).copyPaste;
  assert.deepEqual(copy.source, { sheetId: 913, startRowIndex: 50, endRowIndex: 51, startColumnIndex: 1, endColumnIndex: 11 });
  assert.equal(copy.destination.startRowIndex, 51);
  assert.equal(copy.destination.endRowIndex, 43 + Math.max(9, count));
  assert.equal(copy.pasteType, "PASTE_FORMAT", "글 내용은 그대로 두고 8번 서식만 복사");
  assert.equal(requests.find((request) => request.mergeCells).mergeCells.mergeType, "MERGE_ROWS");
  assert.deepEqual(requests.find((request) => request.repeatCell?.fields === "textFormatRuns").repeatCell.cell.textFormatRuns, []);
  assert.equal(requests.find((request) => request.updateBorders).updateBorders.range.startRowIndex, copy.destination.endRowIndex - 1);
}

const journal = {
  date: "2026-09-13",
  author: "박기도",
  attendance: {
    service13: 94,
    service13Online: 2,
    service4: 197,
    service4Online: 5,
    familyMeeting: 152,
    families: [
      { family: "건우네", service13: 4, service4: 8, familyMeeting: 7 },
      { family: "민석이네", service13: 3, service4: 7, familyMeeting: 5 }
    ]
  },
  newFamilies: [{ name: "새사람", generation: "34대", inviter: "인도자", relationship: "친구", note: "첫 방문" }],
  graduates: [{ name: "수료자", generation: "34대", family: "건우네" }],
  sermon: { title: "설교 제목", passage: "요한복음 3:16", preacher: "정재용 목사" },
  service: {
    representativePrayer: "대표 기도자",
    offeringMembers: "헌금 위원",
    offeringPrayer: "헌금 기도자",
    guide: "안내 가족",
    cleanup: "정리 가족",
    mealService: "식당 가족",
    prayerMeeting: "기도회 가족"
  },
  announcements: ["첫 번째 광고", "두 번째 광고"],
  accounting: {
    sourceType: "excel",
    sourceName: "회계.xlsx",
    sheetTab: "9월 13일",
    sundayTotal: 150000,
    thanksgivingTotal: 610000,
    purposeTotal: 50000,
    total: 760000,
    thanksgiving: [
      { name: "하늘", amount: 30000, note: "" },
      { name: "양건우", amount: 10000, note: "감사합니다" },
      { name: "가람", amount: 20000, note: "감사합니다" },
      { name: "나다", amount: 40000, note: "" }
    ],
    purpose: [{ name: "선교헌금", amount: 50000, note: "" }]
  }
};

const updates = buildSheetValueUpdates("0913", journal);
assert.throws(() => buildSheetValueUpdates("0913", { ...journal, announcements: ["코람데오 기도회\n- 일시: 수요일 8시", "11. 코람데오 기도회\n- 일시 : 수요일 8시"] }), /1번과 2번.*중복/);
assert.doesNotThrow(() => buildSheetValueUpdates("0913", { ...journal, announcements: ["코람데오 기도회\n- 일시: 수요일 8시", "코람데오 기도회\n- 일시: 목요일 8시"] }));
const byRange = Object.fromEntries(updates.map((update) => [update.range, update.values]));
assert.deepEqual(byRange["'0913'!E3"], [["2026년"]]);
assert.deepEqual(byRange["'0913'!G3"], [["9월"]]);
assert.deepEqual(byRange["'0913'!H3"], [["13일"]]);
assert.deepEqual(byRange["'0913'!I3"], [["작성자 : 박기도"]]);
assert.deepEqual(byRange["'0913'!B6"], [["94(2)"]]);
assert.deepEqual(byRange["'0913'!D6"], [["197(5)"]]);
assert.deepEqual(byRange["'0913'!F6"], [["152"]]);
assert.deepEqual(byRange["'0913'!H6"], [["1"]]);
assert.deepEqual(byRange["'0913'!J6"], [["1"]]);
assert.deepEqual(byRange["'0913'!B9:F16"][0], ["새사람", "34대", "인도자", "친구", "첫 방문"]);
assert.deepEqual(byRange["'0913'!G9:I16"][0], ["수료자", "34대", "건우네"]);
assert.deepEqual(byRange["'0913'!B17"], [["♥가족별 출석률(1-3부/4부-청년예배/가족모임)"]]);
assert.deepEqual(byRange["'0913'!B18:K23"][0].slice(0, 2), ["건우네", "민석이네"]);
assert.deepEqual(byRange["'0913'!B18:K23"][1].slice(0, 2), ["4/8/7", "3/7/5"]);

assert.deepEqual(byRange["'0913'!C25"], [[150000]]);
assert.deepEqual(byRange["'0913'!C26"], [[610000]]);
assert.deepEqual(byRange["'0913'!H25"], [[50000]]);
assert.equal(byRange["'0913'!C27"][0][0], "가람 (20,000원) 감사합니다\n양건우 (10,000원) 감사합니다\n나다 (40,000원)\n하늘 (30,000원)");
assert.deepEqual(byRange["'0913'!G26"], [["목적헌금 내역"]]);
assert.deepEqual(byRange["'0913'!H26"], [[""]]);
assert.equal(byRange["'0913'!H26:I35"], undefined);
assert.deepEqual(byRange["'0913'!H27:K36"][0], ["선교헌금", "", 50000, ""]);
assert.deepEqual(byRange["'0913'!G37"], [[""]]);
assert.deepEqual(byRange["'0913'!C37"], [[760000]]);

const flattenedService = [39, 40, 41, 42]
  .flatMap((row) => ["B", "C", "G", "H"].map((column) => byRange[`'0913'!${column}${row}`]?.[0]?.[0] ?? ""))
  .join("|");
for (const expected of ["헌금 위원", "헌금 기도자", "안내 가족", "식당 가족", "설교 제목", "요한복음 3:16", "정재용 목사"]) {
  assert.match(flattenedService, new RegExp(expected));
}
assert.equal(byRange["'0913'!C40"], undefined, "C39:F40 병합칸 내부인 C40에는 별도 값을 쓰면 안 됩니다.");
assert.deepEqual(byRange["'0913'!B44:B52"].slice(0, 3), [["1. 첫 번째 광고"], ["2. 두 번째 광고"], [""]]);

const longJournal = { ...journal, announcements: Array.from({ length: 11 }, (_, index) => `광고 ${index + 1}`) };
const longUpdates = Object.fromEntries(buildSheetValueUpdates("0913", longJournal).map((update) => [update.range, update.values]));
assert.equal(longUpdates["'0913'!B44:B54"].length, 11);

const allValues = JSON.stringify(updates);
assert.doesNotMatch(allValues, /예배마침|출석부 변동사항/);

// Even an old cached combined total must not leak into the sheet total.
const purposeJournal = { ...journal, accounting: { ...journal.accounting, purpose: [{ name: "흘려보내는 기쁨", amount: 123000, note: "" }], purposeTotal: 123000, total: 883000 } };
const purposeUpdates = Object.fromEntries(buildSheetValueUpdates("0913", purposeJournal).map((update) => [update.range, update.values]));
assert.deepEqual(purposeUpdates["'0913'!H27:K36"][0], ["흘려보내는 기쁨", "", 123000, ""]);
const tenPurpose = { ...purposeJournal, accounting: { ...purposeJournal.accounting, purpose: Array.from({length:10}, (_, i) => ({name:`목적${i + 1}`,amount:i + 1,note:""})) } };
const tenUpdates = Object.fromEntries(buildSheetValueUpdates("0913", tenPurpose).map((update) => [update.range, update.values]));
assert.deepEqual(tenUpdates["'0913'!H27:K36"][9], ["목적10", "", 10, ""], "Last item stays inside the purpose area, above total row 37");
assert.deepEqual(purposeUpdates["'0913'!H25"], [[123000]]);
assert.deepEqual(purposeUpdates["'0913'!C37"], [[760000]]);
assert.throws(() => buildSheetValueUpdates("0913", { ...purposeJournal, accounting: { ...purposeJournal.accounting, purpose: Array(11).fill(purposeJournal.accounting.purpose[0]) } }), /최대 10건/);
console.log("worship journal Google Sheet output: tab safety, field mapping and manual purpose offering passed");
