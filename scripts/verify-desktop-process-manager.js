const assert = require("node:assert/strict");
const { canStopProcess, serviceStatusFromProcess } = require("../desktop/process-manager");

const startedAt = "2026-08-09T12:00:00.000Z";

assert.equal(
  canStopProcess({ pid: 100, startedAt }, { pid: 100, startedAt }),
  true
);
assert.equal(
  canStopProcess({ pid: 100, startedAt }, { pid: 100, startedAt: "2026-08-09T12:00:03.000Z" }),
  false
);
assert.deepEqual(serviceStatusFromProcess({ pid: 100, startedAt, running: true }), {
  state: "running",
  pid: 100
});
assert.deepEqual(serviceStatusFromProcess({ pid: 100, startedAt, running: false }), {
  state: "stopped",
  pid: 100
});

console.log("desktop process manager checks passed");
