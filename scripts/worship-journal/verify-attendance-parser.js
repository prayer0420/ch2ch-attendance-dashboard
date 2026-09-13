const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..", "..");
function compile(target) {
  return ts.transpileModule(fs.readFileSync(target, "utf8"), {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.NodeJs, target: ts.ScriptTarget.ES2020 },
    fileName: target
  }).outputText;
}
require.extensions[".ts"] = (targetModule, targetFilename) => targetModule._compile(compile(targetFilename), targetFilename);
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) request = path.join(projectRoot, request.slice(2));
  return originalResolve.call(this, request, parent, isMain, options);
};

const { auditJournalAttendanceCsv, parseJournalAttendanceCsv } = require(path.join(projectRoot, "lib", "worship-journal.ts"));
const row = (...values) => values.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",");
const csv = [
  row("건우네", "1-3부", "현장", "온라인", "4부", "현장", "온라인", "가족", "새가족반 방문자", "1-3부", "현장", "온라인", "4부", "현장", "온라인", "가족"),
  row("김재원", "", "", "", "", "TRUE", "", "", "방문자1", "", "", "", "", "TRUE", "", ""),
  row("김재원", "", "", "", "", "TRUE", "", "", "방문자2", "", "", "", "", "TRUE", "", ""),
  row("배유림", "TRUE", "", "", "", "TRUE", "", "TRUE", "방문자3", "", "", "", "", "TRUE", "", "")
].join("\n");

const parsed = parseJournalAttendanceCsv(csv);
const audited = auditJournalAttendanceCsv(csv);
assert.equal(parsed.service4, 3, "동명이인의 원본 체크 행을 임의로 합치면 안 됩니다.");
assert.equal(parsed.service13, 1);
assert.equal(parsed.familyMeeting, 1);
assert.equal(parsed.families.some((family) => family.family.includes("방문자")), false);
assert.equal(audited.service4, 3);
assert.equal(audited.excludedVisitorService4, 3);
assert.equal(audited.excludedVisitorRows, 3);
assert.deepEqual(
  [parsed.service13, parsed.service13Online, parsed.service4, parsed.service4Online, parsed.familyMeeting],
  [audited.service13, audited.service13Online, audited.service4, audited.service4Online, audited.familyMeeting]
);

console.log("worship journal attendance: raw rows retained, visitors excluded, independent audit matched");
