const assert = require("node:assert/strict");
const { labelForState } = require("../desktop/ui-state");

assert.equal(labelForState("starting"), "준비 중");
assert.equal(labelForState("running"), "실행 중");
assert.equal(labelForState("error"), "오류");
assert.equal(labelForState("stopped"), "종료됨");

console.log("desktop ui state checks passed");
