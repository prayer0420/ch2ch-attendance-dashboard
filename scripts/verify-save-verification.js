const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

(async () => {
  const { verifyPreparedRowsWithFreshRows } = await import(
    pathToFileURL(path.resolve(__dirname, "..", "runner", "legacy-ch2ch", "src", "attendance-verification.js"))
  );

  const preparedRows = [{
    rowInfo: { name: "김재원", sunday: false, department: true },
    found: { id: "stale-row" }
  }];
  const lookedUpNames = [];
  const result = await verifyPreparedRowsWithFreshRows(preparedRows, {
    findRow: async (name) => {
      lookedUpNames.push(name);
      return { id: "fresh-row" };
    },
    readState: async (row) => {
      assert.equal(row.id, "fresh-row");
      return { ok: true, sunday: false, department: true };
    },
    matches: (rowInfo, state) => state.ok && state.sunday === rowInfo.sunday && state.department === rowInfo.department,
    mismatchReason: () => "상태 대조 불일치"
  });

  assert.deepEqual(lookedUpNames, ["김재원"]);
  assert.deepEqual(result, { ok: true, checked: 1, mismatches: [] });
  console.log("save verification freshness checks passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
