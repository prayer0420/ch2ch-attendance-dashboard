const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..", "..");

function compile(target) {
  return ts.transpileModule(fs.readFileSync(target, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2020
    },
    fileName: target
  }).outputText;
}

require.extensions[".ts"] = (targetModule, targetFilename) => targetModule._compile(compile(targetFilename), targetFilename);
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) request = path.join(projectRoot, request.slice(2));
  return originalResolve.call(this, request, parent, isMain, options);
};

const { isWorshipBulletinFileName, parsePdfWorshipText, parseHwpWorshipInfo, decodeHwpParagraph } = require(path.join(projectRoot, "lib", "worship-journal.ts"));
assert.equal(typeof isWorshipBulletinFileName, "function", "bulletin file validation helper must be exported");
assert.equal(isWorshipBulletinFileName("주보.hwp"), true);
assert.equal(isWorshipBulletinFileName("주보.PDF"), true);
assert.equal(isWorshipBulletinFileName("주보.docx"), false);
assert.equal(typeof parsePdfWorshipText, "function", "PDF bulletin text parser must be exported");

const parsed = parsePdfWorshipText([
  "4부 청년예배 말씀",
  "믿음으로 걷는 길",
  "(요한복음 3:16)",
  "정재용 목사",
  "예배 섬김",
  "9/13",
  "양건우",
  "헌금위원 이름",
  "헌금기도 이름",
  "안내 가족",
  "식당 가족",
  "기도회 가족",
  "광고",
  "1. 새가족 교육",
  "9/13 오후 5시",
  "미리미리광고"
].join("\n"), "2026-09-13");

assert.equal(parsed.service.representativePrayer, "양건우");
assert.notEqual(parsed.service.representativePrayer, "박건우");
assert.equal(parsed.sermon.title, "믿음으로 걷는 길");
assert.equal(parsed.extraction.format, "pdf");
assert.equal(parsed.extraction.requiresReview, true);
assert.ok(parsed.extraction.evidenceLines.includes("양건우"));
assert.throws(() => parsePdfWorshipText("  \n\t", "2026-09-13"), /스캔|텍스트/);

const actualStyleSermon = parsePdfWorshipText([
  "4부 청년예배 말씀",
  "하나님의 선물",
  "(고린도전서 7:1~7, 신약 269쪽)",
  "전병인 목사",
  "광고",
  "1. 첫 번째 광고",
  "2. 두 번째 광고",
  "미리미리광고"
].join("\n"), "2026-09-13");
assert.deepEqual(actualStyleSermon.sermon, {
  title: "하나님의 선물",
  passage: "고린도전서 7:1~7",
  preacher: "전병인 목사"
});
assert.deepEqual(actualStyleSermon.announcements, ["첫 번째 광고", "두 번째 광고"]);

const fragmentedPdf = parsePdfWorshipText([
  "광고", "월 여는기도회 시상", "1. 9", "최다 참석 가족 슬기네", "월 생일자 축하", "2. 9", "9월 생일을 맞으신 모든 분들 축하합니다!",
  "3. QT", "OT", "일시 9/6(주일) 오후 5시 40분", "4. SEED", "찬양단 4부 팀원 모집", "5.", "새벽찬양대 피아노 반주자를 구합니다",
  "6.", "부모학교 아이돌봄 봉사자 모집", "7. 수요일 코람데오 기도회가 있습니다.", "2026 8-9월 일정",
  "부 청년예배 말씀", "4", "하나님의 선물", "고린도전서", "신약 쪽", "(", "7:1~7,", "269 )", "전병인 목사",
  "예배 섬김", "대표기도", "헌금위원", "헌금기도", "안내", "뒷정리", "식당봉사", "예배를 위한 기도회",
  "9/6", "이한별A", "청(1 )", "김윤영,", "김애선", "한성민", "시인이네", "재원이네", "백동현네", "9/13"
].join("\n"), "2026-09-06");
assert.deepEqual(fragmentedPdf.sermon, { title: "하나님의 선물", passage: "고린도전서 7:1~7", preacher: "전병인 목사" });
assert.deepEqual(fragmentedPdf.service, {
  representativePrayer: "이한별A (1청)",
  offeringMembers: "김윤영, 김애선",
  offeringPrayer: "한성민",
  guide: "시인이네",
  cleanup: "시인이네",
  mealService: "재원이네",
  prayerMeeting: "백동현네"
});
assert.equal(fragmentedPdf.announcements.length, 7);
assert.equal(fragmentedPdf.announcements[0], "9월 여는기도회 시상\n최다 참석 가족 슬기네");
assert.match(fragmentedPdf.announcements[1], /^9월 생일자 축하\n9월 생일을 맞으신 모든 분들 축하합니다!$/);
assert.match(fragmentedPdf.announcements[6], /코람데오/);

const spacedHeading = parsePdfWorshipText([
  "광 고 사 항",
  "1) 긴 광고 제목",
  "일시: 9/13 오후 5시",
  "장소: 비전홀",
  "대상자 이름은 원문 그대로 유지합니다.",
  "미리 미리 광고"
].join("\n"), "2026-09-13");
assert.deepEqual(spacedHeading.announcements, ["긴 광고 제목\n일시: 9/13 오후 5시\n장소: 비전홀\n대상자 이름은 원문 그대로 유지합니다."]);

const september13Lines = [
  "4부 청년예배 말씀", "하나님의 인도를 받는 법", "(야고보서 1:5~8, 신약 370쪽)",
  "정재용 목사", "(마태복음 7:21)", "예배 순서",
  "예배 섬김", "대표", "기도", "헌금 위원", "헌금", "기도", "안내", "뒷정리", "식당", "봉사", "예배를", "위한", "기도회",
  "9/13", "박기도", "1청년회", "1청년회", "윤영이네", "1청년회", "성혜네",
  "9/20", "박광우A 안수집사", "김종인, 이필홍", "백동현", "애선이네", "희원이네", "윤영이네"
];
const expectedSermon = { title: "하나님의 인도를 받는 법", passage: "야고보서 1:5~8", preacher: "정재용 목사" };
const expectedService = {
  representativePrayer: "박기도", offeringMembers: "1청년회", offeringPrayer: "1청년회",
  guide: "윤영이네", cleanup: "윤영이네", mealService: "1청년회", prayerMeeting: "성혜네"
};
const september13 = parsePdfWorshipText(september13Lines.join("\n"), "2026-09-13");
assert.deepEqual(september13.sermon, expectedSermon);
assert.deepEqual(september13.service, expectedService);
assert.equal(parsePdfWorshipText(september13Lines.join("\n"), "2026-09-01").service.guide, "", "9/1 must not match 9/13");
assert.equal(parsePdfWorshipText(september13Lines.join("\n"), "2026-09-20").service.offeringMembers, "김종인, 이필홍");

const currentDuties = ["현재대표", "현재헌금위원", "현재헌금기도", "현재안내네", "현재식당네", "현재기도네"];
const nextDuties = ["다음대표", "다음헌금위원", "다음헌금기도", "다음안내네", "다음식당네", "다음기도네"];
const expectedCurrent = {
  representativePrayer: currentDuties[0], offeringMembers: currentDuties[1], offeringPrayer: currentDuties[2],
  guide: currentDuties[3], cleanup: currentDuties[3], mealService: currentDuties[4], prayerMeeting: currentDuties[5]
};
const emptyService = Object.fromEntries(Object.keys(expectedCurrent).map((key) => [key, ""]));
for (const [currentLabel, nextLabel] of [
  ["10/18", "10월 25일"], ["10 / 18 (주일)", "10.25(일)"],
  ["2026.10.18.", "2026-10-25"], ["금주: 10월 18일", "다음 주: 10월 25일"],
  ["10/18", "다음 주"], ["10/18", "차주"]
]) {
  const lines = ["예배 섬김", currentLabel, ...currentDuties, nextLabel, ...nextDuties];
  const result = parsePdfWorshipText(lines.join("\n"), "2026-10-18");
  assert.deepEqual(result.service, expectedCurrent, `date isolation: ${currentLabel} -> ${nextLabel}`);
}
const strictCases = [
  ["예배 섬김", "10/25", ...nextDuties],
  ["예배 섬김", "10/18", "10/25", ...nextDuties], // Two column headers before any data: ambiguous.
  ["예배 섬김", "10/18", ...currentDuties.slice(0, 4), "10월 25일", ...nextDuties],
  ["예배 섬김", "10/18", ...currentDuties, "10/18", ...nextDuties],
  ["예배 섬김", "2027-10-18", ...nextDuties],
  ["예배 섬김", "광고", "10/18", ...nextDuties]
];
for (const lines of strictCases) assert.deepEqual(parsePdfWorshipText(lines.join("\n"), "2026-10-18").service, emptyService);
assert.deepEqual(parsePdfWorshipText(["예배 섬김", "10/18", "10/25", ...currentDuties, ...nextDuties].join("\n"), "2026-10-25").service, emptyService, "The last column header must not inherit the first week's duties either");
assert.deepEqual(parsePdfWorshipText(["예배 섬김", "12/27", ...nextDuties, "2027년 1월 3일", ...currentDuties].join("\n"), "2027-01-03").service, expectedCurrent);

// Synthetic HWP control payload: these bytes must never become visible text.
const control = Buffer.alloc(16);
control.writeUInt16LE(2, 0);
Buffer.from("dces", "ascii").copy(control, 2);
control.writeUInt16LE(2, 14);
assert.equal(decodeHwpParagraph(Buffer.concat([control, Buffer.from("하나님의 인도를 받는 법\r", "utf16le")])), expectedSermon.title);
assert.equal(decodeHwpParagraph(Buffer.from("양건우 박건우 방건우\r", "utf16le")), "양건우 박건우 방건우");

// Exercise the binary HWP path without committing the private bulletin.
const CFB = require("cfb");
const header = Buffer.alloc(40);
const section = Buffer.concat(september13Lines.map((line) => {
  const content = Buffer.concat([control, Buffer.from(`${line}\r`, "utf16le")]);
  const record = Buffer.alloc(4);
  record.writeUInt32LE((content.length << 20) | 67);
  return Buffer.concat([record, content]);
}));
for (const compressed of [false, true]) {
  header.writeUInt32LE(compressed ? 1 : 0, 36);
  const file = CFB.utils.cfb_new();
  CFB.utils.cfb_add(file, "FileHeader", header);
  CFB.utils.cfb_add(file, "BodyText/Section0", compressed ? require("node:zlib").deflateRawSync(section) : section);
  const result = parseHwpWorshipInfo(CFB.write(file, { type: "buffer" }), "2026-09-13");
  assert.deepEqual(result.sermon, expectedSermon);
  assert.deepEqual(result.service, expectedService);
  const dateBoundarySection = Buffer.concat(["예배 섬김", "10/18", ...currentDuties, "10월 25일", ...nextDuties].map((line) => {
    const content = Buffer.from(`${line}\r`, "utf16le");
    const record = Buffer.alloc(4);
    record.writeUInt32LE((content.length << 20) | 67);
    return Buffer.concat([record, content]);
  }));
  const boundaryFile = CFB.utils.cfb_new();
  CFB.utils.cfb_add(boundaryFile, "FileHeader", header);
  CFB.utils.cfb_add(boundaryFile, "BodyText/Section0", compressed ? require("node:zlib").deflateRawSync(dateBoundarySection) : dateBoundarySection);
  assert.deepEqual(parseHwpWorshipInfo(CFB.write(boundaryFile, {type:"buffer"}), "2026-10-18").service, expectedCurrent);
}
if (process.argv[2]) {
  const actual = parseHwpWorshipInfo(fs.readFileSync(process.argv[2]), "2026-09-13");
  assert.deepEqual(actual.sermon, expectedSermon);
  assert.deepEqual(actual.service, expectedService);
  console.log("Attached 2026-09-13 HWP: all sermon and service fields match", JSON.stringify({ sermon: actual.sermon, service: actual.service }));
}
console.log("worship bulletin parser: PDF, HWP controls, date boundaries and September 13 regression passed");
