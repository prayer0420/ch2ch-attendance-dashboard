const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const api = read("lib/band-api.ts");
const statusRoute = read("app/api/band/status/route.ts");
const publishRoute = read("app/api/band/publish/route.ts");
const card = read("components/band-publish-card.tsx");
const builder = read("components/worship-journal-builder.tsx");

assert.match(api, /BAND_TARGET_NAME/);
assert.match(api, /BAND_TARGET_KEY/);
assert.match(api, /permissions: "posting"/);
assert.match(api, /checkTargetBandPosting/);
assert.match(statusRoute, /canPost/);
assert.match(statusRoute, /bandUrl/);
assert.match(publishRoute, /confirmed !== true/);
assert.match(publishRoute, /targetName !== TARGET_NAME/);
assert.match(card, /type=\{showToken \? "text" : "password"\}/);
assert.match(card, /localStorage\.setItem/);
assert.match(card, /PNG 저장 \+ 글 복사/);
assert.match(card, /본문만 자동 게시/);
assert.match(builder, /<BandPublishCard/);
const textStart = builder.indexOf("function worshipJournalBandText(");
const textEnd = builder.indexOf("\nfunction downloadBlob(", textStart);
assert.ok(textStart >= 0 && textEnd > textStart);
const context = vm.createContext({ attendanceText: (count, online) => online ? `${count}(온라인${online})` : String(count) });
vm.runInContext(ts.transpileModule(builder.slice(textStart, textEnd), {
  compilerOptions: { target: ts.ScriptTarget.ES2020 }
}).outputText, context);
const journal = {
  date: "2026-09-20",
  outputSheet: { sheetTitle: "0920" },
  attendance: { service13: 84, service13Online: 2, service4: 197, service4Online: 0, familyMeeting: 16 },
  newFamilies: [{ name: "홍길동", generation: "26대", inviter: "김교인", relationship: "친구", note: "첫 방문" }],
  sermon: { title: "본문에서 제외" },
  accounting: { total: 10000 },
  announcements: ["광고에서 제외"],
  author: "작성자 제외"
};
assert.equal(context.worshipJournalBandText(journal), [
  "#예배일지 #0920", "", "출석", "1~3부 84(온라인2)명", "4부 197명", "가족모임 16명", "", "새가족 (1명)",
  "- 홍길동 · 26대 · 인도자 김교인 · 관계 친구 · 첫 방문"
].join("\n"));
assert.match(context.worshipJournalBandText({ ...journal, outputSheet: undefined, newFamilies: [] }), /#예배일지 #0920[\s\S]*새가족 \(0명\)\n없음$/);

console.log("BAND integration checks passed: target, permission, concise attendance/new-family text, and confirmed publishing");
