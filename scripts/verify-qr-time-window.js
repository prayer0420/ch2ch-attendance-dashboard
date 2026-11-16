// Synthetic HTML export only. No church records, network, or Sheet writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
require.extensions[".ts"] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText, file);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  if (request.startsWith("./") && parent?.filename?.startsWith(path.join(root, "lib")) && !path.extname(request)) {
    const candidate = path.join(path.dirname(parent.filename), request + ".ts");
    if (fs.existsSync(candidate)) return candidate;
  }
  return resolve.call(this, request, parent, ...args);
};
const { parseQrAttendanceMinute: minute, parseCh2chQrRosterHtml: parse, filterRoster: filter } = require("../lib/qr-attendance-sync.ts");
for (const [input, expected] of [["00:00", 0], ["13:29:59", 809], ["13:30", 810], ["16:30:59", 990],
  ["2026-11-01 13:30:00", 810], ["오전 12:00", 0], ["오후 1:30", 810], ["4:30 PM", 990]]) {
  assert.equal(minute(input), expected, input);
}
for (const input of ["", null, "24:00", "13:60", "13:30:60", "오후 13:30", "unknown", "2026-11-01", "13:30Z"]) {
  assert.equal(minute(input), null, String(input));
}
const headers = ["이름", "기관", "세부항목", ...Array.from({ length: 9 }, (_, i) => "기타" + i), "출석시간", "다른시간"];
const row = (name, service, time, department = "2청년회") => [name, department, service, ...Array(9).fill(""), time, "10:00"];
const rows = [
  row("자정", "1부", "00:00"), row("오전끝", "3부", "12:59:59"),
  row("오후시작", "4부", "13:00:00"), row("오후끝", "4부", "16:30:59"),
  row("시간초과", "4부", "16:31"), row("비고불일치", "1부", "14:00"),
  row("비고불일치2", "4부", "10:00"), row("시간없음", "2부", ""),
  row("잘못된시간", "3부", "오류"), row("다른기관", "4부", "14:00", "1청년회"),
  row("오후시작", "4부", "14:00"), row("예배없음", "", "10:00"),
  row("하루끝", "1부", "23:59:59"), row("오후항목없음", "", "13:00"),
  row("변경구간", "1부", "13:29:59")
];
const html = "<table>" + [headers, ...rows].map(r => "<tr>" + r.map(v => `<td>${v}</td>`).join("") + "</tr>").join("") + "</table>";
const parsed = parse(html);
assert.equal(parsed.length, rows.length);
assert.equal(parsed[2].attendanceMinute, 780, "Must read M, not other time columns");
const result = filter(parsed, "2청년회");
assert.deepEqual(result.service13Names, ["자정", "오전끝", "비고불일치2", "예배없음"]);
assert.deepEqual(result.service4Names, ["오후시작", "오후끝", "시간초과", "비고불일치", "하루끝", "오후항목없음", "변경구간"]);
assert.equal(result.duplicate4Count, 1);
const noServiceHeader = parse(html.replace("<td>세부항목</td>", "<td>사용안함</td>"));
assert.deepEqual(filter(noServiceHeader, "2청년회"), result);
console.log("PASS: M-column time-only classification, 13:00 boundary, 13:00-13:29 reclassification, no afternoon cutoff, ignored/missing service labels, invalid times, department filter, deduplication.");
