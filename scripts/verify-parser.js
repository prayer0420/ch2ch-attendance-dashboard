const assert = require("node:assert/strict");
const { __test } = require("../runner/src/automation-adapter");

const horizontalFixture = [
  ["고은이네", "1-3부", "", "", "4부", "", "", "", "다정이네", "1-3부", "", "4부", ""],
  ["주고은", "FALSE", "FALSE", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "김다정", "TRUE", "FALSE", "FALSE", "FALSE"],
  ["박지혜", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "이다정", "FALSE", "FALSE", "TRUE", "FALSE"],
  ["미참석", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "미체크", "FALSE", "FALSE", "FALSE", "FALSE"]
];

const csv = horizontalFixture
  .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  .join("\n");

const people = __test.rowsFromCsv(csv);

assert.equal(people.length, 4);
assert.deepEqual(
  people.map((person) => ({
    family: person.family,
    name: person.name,
    service13: person.service13,
    service4: person.service4
  })),
  [
    { family: "고은이네", name: "주고은", service13: false, service4: true },
    { family: "다정이네", name: "김다정", service13: true, service4: false },
    { family: "고은이네", name: "박지혜", service13: true, service4: false },
    { family: "다정이네", name: "이다정", service13: false, service4: true }
  ]
);

console.log("[OK] 가장체크 가로표 파서 검증 통과");

const repeatedFamilySectionCsv = [
  ["고은이네", "1-3부", "", "", "4부", "", "", "", "민석이네", "1-3부", "", "", "4부", "", "", "", "요약", "출석", "요약", "출석"],
  ["주고은", "FALSE", "FALSE", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "송민석", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "주고은", "TRUE", "송민석", "TRUE"],
  ["여민이네", "", "", "", "", "", "", "", "우석이네", "", "", "", "", "", "", "", "요약", "", "", ""],
  ["유민형", "TRUE", "FALSE", "FALSE", "FALSE", "TRUE", "FALSE", "TRUE", "양우석", "FALSE", "FALSE", "FALSE", "TRUE", "TRUE", "FALSE", "TRUE", "유민형", "TRUE", "양우석", "TRUE"],
  ["", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "박예림", "TRUE", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "", "", "양우석", "TRUE"]
].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
const repeatedSectionPeople = __test.rowsFromCsv(repeatedFamilySectionCsv);
assert.equal(repeatedSectionPeople.find((person) => person.name === "유민형")?.family, "여민이네");
assert.equal(repeatedSectionPeople.find((person) => person.name === "양우석")?.family, "우석이네");
assert.equal(repeatedSectionPeople.find((person) => person.name === "박예림")?.family, "우석이네");
assert.equal(repeatedSectionPeople.filter((person) => person.name === "요약").length, 0);
console.log("[OK] 중간 가족 제목행 갱신 및 우측 요약열 제외 검증 통과");

const singleFamilySectionCsv = [
  ["고은이네", "1-3부", "", "", "4부", "", "", ""],
  ["주고은", "FALSE", "FALSE", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE"],
  ["여민이네", "", "", "", "", "", "", ""],
  ["유민형", "FALSE", "FALSE", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE"],
  ["우석이네", "", "", "", "", "", "", ""],
  ["박예림", "FALSE", "FALSE", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE"],
  ["양우석", "FALSE", "FALSE", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE"]
].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
const singleFamilySectionPeople = __test.rowsFromCsv(singleFamilySectionCsv);
assert.equal(singleFamilySectionPeople.find((person) => person.name === "유민형")?.family, "여민이네");
assert.equal(singleFamilySectionPeople.find((person) => person.name === "박예림")?.family, "우석이네");
assert.equal(singleFamilySectionPeople.find((person) => person.name === "양우석")?.family, "우석이네");
console.log("[OK] 단일 가족 제목행에서도 가족명 갱신 검증 통과");

const helperOnlyCsv = [
  ["고은이네", "1-3부", "", "", "4부", "", "", ""],
  ["", "QR", "참석", "방송", "QR", "참석", "방송", "가족"],
  ["방송가족만체크", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "TRUE", "TRUE"],
  ["참석칸체크", "FALSE", "FALSE", "FALSE", "FALSE", "TRUE", "FALSE", "FALSE"],
  ["QR칸체크", "FALSE", "FALSE", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE"]
].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
const helperOnlyPeople = __test.rowsFromCsv(helperOnlyCsv);
assert.equal(helperOnlyPeople.length, 2);
assert.equal(helperOnlyPeople.find((person) => person.name === "참석칸체크")?.service4, true);
assert.equal(helperOnlyPeople.find((person) => person.name === "QR칸체크")?.service4, true);
assert.equal(helperOnlyPeople.some((person) => person.name === "방송가족만체크"), false);
console.log("[OK] 4부 QR/참석은 포함하고 방송/가족 보조 칸은 제외 검증 통과");

const blankSubHeaderCsv = [
  ["고은이네", "1-3부", "", "", "4부", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["QR체크", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE"],
  ["참석체크", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE"],
  ["방송만체크", "FALSE", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE"],
  ["가족만체크", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "TRUE"],
  ["네번째참석체크", "FALSE", "FALSE", "FALSE", "FALSE", "TRUE", "FALSE", "FALSE"]
].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
const blankSubHeaderPeople = __test.rowsFromCsv(blankSubHeaderCsv);
assert.equal(blankSubHeaderPeople.length, 3);
assert.equal(blankSubHeaderPeople.some((person) => person.name === "QR체크"), true);
assert.equal(blankSubHeaderPeople.some((person) => person.name === "참석체크"), true);
assert.equal(blankSubHeaderPeople.some((person) => person.name === "네번째참석체크"), true);
assert.equal(blankSubHeaderPeople.some((person) => person.name === "방송만체크"), false);
assert.equal(blankSubHeaderPeople.some((person) => person.name === "가족만체크"), false);
console.log("[OK] 빈 보조 제목줄에서도 앞 2칸 QR/참석만 인정 검증 통과");

const attendanceListCsv = [
  ["고은이네", "1-3부", "", "", "4부", "", "", "", "1-3부", "출석", "4부", "출석"],
  ["", "QR", "참석", "방송", "QR", "참석", "방송", "가족", "", "", "", ""],
  ["목록무시", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "", "", "목록무시", "TRUE"],
  ["참석칸기준", "FALSE", "FALSE", "FALSE", "FALSE", "TRUE", "FALSE", "FALSE", "", "", "", ""]
].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
const attendanceListPeople = __test.rowsFromCsv(attendanceListCsv);
assert.equal(attendanceListPeople.length, 1);
assert.equal(attendanceListPeople[0].name, "참석칸기준");
assert.equal(attendanceListPeople[0].service4, true);
assert.equal(attendanceListPeople.some((person) => person.name === "목록무시"), false);
console.log("[OK] 오른쪽 출석 이름 목록은 무시하고 QR/참석 칸만 인정 검증 통과");

const strictAttendanceSourceCsv = [
  ["고은이네", "1-3부", "", "", "4부", "", "", "", "1-3부", "출석", "4부", "출석"],
  ["", "QR", "참석", "방송", "QR", "참석", "방송", "가족", "", "", "", ""],
  ["김블록", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "", "", "", ""],
  ["오른쪽목록제외", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "", "", "오른쪽목록제외", "TRUE"]
].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
const strictAttendanceSourcePeople = __test.rowsFromCsv(strictAttendanceSourceCsv);
assert.equal(strictAttendanceSourcePeople.length, 1);
assert.equal(strictAttendanceSourcePeople.find((person) => person.name === "김블록")?.service13, true);
assert.equal(strictAttendanceSourcePeople.some((person) => person.name === "오른쪽목록제외"), false);
console.log("[OK] 가족블록 QR/참석 칸 기준만 실행 대상 확정 검증 통과");

const blankAttendanceListCsv = [
  ["고은이네", "1-3부", "", "", "4부", "", "", "", "1-3부", "출석", "4부", "출석"],
  ["미체크", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "", "TRUE", "", "TRUE"]
].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
assert.throws(
  () => __test.rowsFromCsv(blankAttendanceListCsv),
  /이름 없이 체크/
);
console.log("[OK] 이름 없는 출석 목록 체크 진단 검증 통과");

const summaryRowsCsv = [
  "고은이네,1-3부,4부",
  "김정상,TRUE,FALSE",
  "11,FALSE,TRUE",
  "6/14(주일),FALSE,TRUE",
  "재적,FALSE,TRUE",
  "참석합계,FALSE,TRUE",
  "방송합계,FALSE,TRUE",
  "\"새가족반\n방문자\",FALSE,TRUE"
].join("\n");
const summaryFilteredPeople = __test.rowsFromCsv(summaryRowsCsv);
assert.equal(summaryFilteredPeople.length, 1);
assert.equal(summaryFilteredPeople[0].name, "김정상");
console.log("[OK] 숫자/날짜/집계/방문자 행 제외 검증 통과");

const verticalCsv = [
  "가족,이름,1-3부,4부",
  "고은이네,주고은,FALSE,TRUE",
  "다정이네,김다정,TRUE,FALSE",
  "다정이네,미체크,FALSE,FALSE",
  "다정이네,숫자영,0,0"
].join("\n");
const verticalPeople = __test.rowsFromCsv(verticalCsv);
assert.equal(verticalPeople.length, 2);
assert.equal(verticalPeople[0].name, "주고은");
assert.equal(verticalPeople[0].service4, true);
console.log("[OK] 세로표 파서 및 미체크 제외 검증 통과");

const tsvWithTitle = [
  "2026 등촌교회 출석표",
  "가족\t이름\t1-3부\t4부",
  "고은이네\t주고은\tFALSE\tTRUE",
  "\t박지혜\tTRUE\tFALSE"
].join("\n");
const tsvPeople = __test.rowsFromCsv(tsvWithTitle);
assert.equal(tsvPeople.length, 2);
assert.equal(tsvPeople[1].family, "고은이네");
assert.equal(tsvPeople[1].service13, true);
console.log("[OK] TSV, 제목행, 병합 가족명 보정 검증 통과");

const semicolonCsv = [
  "가족;이름;1-3부;4부",
  "다정이네;김다정;TRUE;FALSE"
].join("\n");
assert.equal(__test.rowsFromCsv(semicolonCsv).length, 1);
console.log("[OK] 세미콜론 구분자 검증 통과");

const cp949Bytes = Buffer.from([0xB0, 0xA1, 0xC1, 0xB7, 0x2C, 0xC0, 0xCC, 0xB8, 0xA7]);
assert.equal(__test.decodeInputBuffer(cp949Bytes), "가족,이름");
console.log("[OK] CP949 CSV 디코딩 검증 통과");

const duplicateCsv = [
  "가족,이름,1-3부,4부",
  "고은이네,주고은,TRUE,FALSE",
  "고은이네,주고은,FALSE,TRUE"
].join("\n");
const duplicatePeople = __test.rowsFromCsv(duplicateCsv);
assert.equal(duplicatePeople.length, 1);
assert.equal(duplicatePeople[0].service13, true);
assert.equal(duplicatePeople[0].service4, true);
console.log("[OK] 같은 가족 내 중복 이름은 한 명으로 병합 검증 통과");

const resultFixture = [
  { family: "고은이네", name: "저장확인", service13: true, service4: false },
  { family: "다정이네", name: "확인필요", service13: false, service4: true },
  { family: "다정이네", name: "처리실패", service13: true, service4: false }
];
const initialResults = __test.createInitialResults({
  dry_run: false,
  target_week: 25,
  target_week_text: "25주"
}, resultFixture);
const appliedResults = __test.applyLegacyResult(initialResults, {
  completed: true,
  finalSaved: true,
  finalSaveVerified: false,
  families: [
    {
      familyName: "고은이네",
      saved: true,
      saveVerified: true,
      people: [{ family: "고은이네", name: "저장확인", ok: true }]
    },
    {
      familyName: "다정이네",
      saved: true,
      saveVerified: false,
      people: [
        { family: "다정이네", name: "확인필요", ok: true },
        { family: "다정이네", name: "처리실패", ok: false, reason: "체크박스 부족" }
      ]
    }
  ]
}, false);
assert.equal(appliedResults[0].save_result, "success");
assert.equal(appliedResults[1].save_result, "attempted_unverified");
assert.equal(appliedResults[2].status, "final_fail");
assert.equal(appliedResults[2].failure_reason, "체크박스 부족");
console.log("[OK] 저장 확인/미확인/처리 실패 결과 판정 검증 통과");
