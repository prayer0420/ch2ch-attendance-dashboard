const fs = require("node:fs");

const source = fs.readFileSync("components/run-create-form.tsx", "utf8");

if (!source.includes("targetDate: mostRecentSunday()")) {
  throw new Error("실행 폼의 기본 날짜 계산을 찾지 못했습니다.");
}

if (!source.includes("targetDate: mostRecentSunday()")) {
  throw new Error("현재 일요일 기본값이 없습니다.");
}

const restoreBlock = source.match(/const saved = localStorage\.getItem\(SETTINGS_KEY\);[\s\S]*?setReady\(true\);/);
if (!restoreBlock) throw new Error("설정 복원 블록을 찾지 못했습니다.");
if (/\.\.\.JSON\.parse\(saved\)/.test(restoreBlock[0])) {
  throw new Error("오래된 저장 날짜가 현재 기본 날짜를 덮어쓸 수 있습니다.");
}

console.log("실행 날짜 기본값 검증 통과");
