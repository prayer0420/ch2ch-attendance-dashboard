const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const filename = path.resolve(__dirname, "../lib/run-summary.ts");
const loaded = new Module(filename, module);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, filename);
const { summarizeRunResults } = loaded.exports;
const row = (changes = {}) => ({
  original_family: "가족A", name: "이름", status: "primary_success", save_result: "success",
  service_1_3_present: true, service_4_present: true, ...changes
});
assert.deepEqual(summarizeRunResults([], false).totals, { success: 0, failed: 0, unconfirmed: 0, skipped: 0 });
const result = summarizeRunResults([
  row(), row({ status: "second_pass_success" }),
  row({ status: "save_failed", save_result: "failed" }),
  row({ save_result: "failed" }),
  row({ save_result: "attempted_unverified" }),
  row({ status: "skipped", save_result: "not_saved" }),
  row({ original_family: "가족B", status: "final_fail", save_result: "not_saved" })
], false);
assert.deepEqual(result.totals, { success: 2, failed: 3, unconfirmed: 1, skipped: 1 });
assert.equal(result.families.length, 2);
assert.equal(result.families[0].success, 2); // Both checkboxes count as one person.
const failures = summarizeRunResults(Array.from({ length: 12 }, (_, i) => row({
  name: "실패자" + i, status: "final_fail", save_result: "not_saved"
})), false);
assert.equal(failures.families[0].failedNames.length, 12);
assert.equal(failures.families[0].failedNames[11], "실패자11");
const dry = row({ status: "dry_run", save_result: "not_saved" });
assert.equal(summarizeRunResults([dry], true).totals.success, 1);
assert.equal(summarizeRunResults([dry], false).totals.success, 0);
const page = fs.readFileSync(path.resolve(__dirname, "../app/runs/[id]/page.tsx"), "utf8");
assert.doesNotMatch(page, /events\.map|event\.message|failure_reason|current_step|최근 처리 내역|실시간 로그/);
assert.match(page, /family\.failedNames\.join/);
assert.match(page, /상세 결과 보기/);
console.log("PASS: family totals, verified saves, complete failure names, dry run, and concise display");
