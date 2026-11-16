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

  // A sheet label such as "새가족반 결석중" is processed and verified on the
  // web page "새가족반". Its verified save must not be reported as unverified.
  const { __test } = require(path.resolve(__dirname, "..", "runner", "src", "automation-adapter.js"));
  const run = { target_week: 39, target_week_text: "2026년 39주차", dry_run: false };
  const initial = __test.createInitialResults(run, [
    { family: "새가족반\n결석중", name: "가나다", service13: true, service4: false },
    { family: "재용이네", name: "라마바", service13: false, service4: true }
  ]);
  const applied = __test.applyLegacyResult(initial, {
    completed: true,
    finalSaved: true,
    finalSaveVerified: false,
    families: [
      { familyName: "새가족반", saved: true, saveVerified: true, people: [{ family: "새가족반\n결석중", name: "가나다", ok: true }] },
      { familyName: "재용이네", saved: true, saveVerified: false, people: [{ family: "재용이네", name: "라마바", ok: true }] }
    ]
  }, false);
  assert.deepEqual(applied.map((item) => item.save_result), ["success", "attempted_unverified"]);
  console.log("save verification freshness checks passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
