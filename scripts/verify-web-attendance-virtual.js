const assert = require("node:assert/strict");

(async () => {
  const { attendanceTargetSatisfied, buildAttendanceActions } = await import(
    "../runner/legacy-ch2ch/src/attendance-actions.js"
  );
  const { verifyPreparedRowsWithFreshRows } = await import(
    "../runner/legacy-ch2ch/src/attendance-verification.js"
  );

  const sourceRows = [
    { family: "Family A", name: "SundayOnly", sunday: true, department: false },
    { family: "Family A", name: "DepartmentOnly", sunday: false, department: true },
    { family: "Family A", name: "BothServices", sunday: true, department: true },
    { family: "Family A", name: "BroadcastOnly", sunday: false, department: false, broadcast: true }
  ];
  const webRows = sourceRows.map((row) => ({
    family: row.family,
    name: row.name,
    sunday: row.name === "SundayOnly" || row.name === "DepartmentOnly" || row.name === "BroadcastOnly",
    department: row.name === "SundayOnly" || row.name === "BroadcastOnly",
    broadcast: row.broadcast === true
  }));
  let saveCount = 0;

  function applyAttendanceActions(row, rowInfo) {
    for (const action of buildAttendanceActions(rowInfo, { onlyPresent: true })) {
      const webFieldByIndex = ["sunday", "department", "broadcast"];
      const webField = webFieldByIndex[action.checkboxIndex];
      assert.ok(
        action.fieldName === "주일" || action.fieldName === "부서",
        `허용되지 않은 웹교적 체크 대상: ${action.fieldName}`
      );
      assert.equal(
        action.fieldName,
        webField === "sunday" ? "주일" : webField === "department" ? "부서" : "방송",
        `웹교적 체크박스 인덱스 불일치: ${action.fieldName} -> ${action.checkboxIndex}`
      );
      assert.notEqual(webField, "broadcast", "방송 체크박스가 출석 작업 대상으로 선택됨");
      row[webField] = action.desired;
    }
  }

  for (const rowInfo of sourceRows) {
    if (!rowInfo.sunday && !rowInfo.department) {
      assert.deepEqual(buildAttendanceActions(rowInfo, { onlyPresent: true }), []);
      continue;
    }
    const row = webRows.find((candidate) => candidate.name === rowInfo.name);
    applyAttendanceActions(row, rowInfo);
  }
  saveCount += 1;

  const preparedRows = sourceRows.map((rowInfo) => ({
    rowInfo,
    found: webRows.find((row) => row.name === rowInfo.name)
  }));
  const fresh = await verifyPreparedRowsWithFreshRows(preparedRows, {
    findRow: async (name) => {
      const row = webRows.find((candidate) => candidate.name === name);
      return row ? { ...row } : null;
    },
    readState: async (row) => ({
      ok: true,
      sunday: row.sunday,
      department: row.department
    }),
    matches: attendanceTargetSatisfied,
    mismatchReason: (rowInfo, state) =>
      `${rowInfo.name}: 기대 주일=${rowInfo.sunday}, 부서=${rowInfo.department}; ` +
      `실제 주일=${state.sunday}, 부서=${state.department}`
  });

  assert.equal(saveCount, 1);
  assert.equal(fresh.ok, true);
  assert.equal(fresh.checked, sourceRows.length);
  assert.deepEqual(
    webRows.map(({ name, sunday, department, broadcast }) => ({ name, sunday, department, broadcast })),
    [
      { name: "SundayOnly", sunday: true, department: true, broadcast: false },
      { name: "DepartmentOnly", sunday: true, department: true, broadcast: false },
      { name: "BothServices", sunday: true, department: true, broadcast: false },
      { name: "BroadcastOnly", sunday: true, department: true, broadcast: true }
    ]
  );

  const persistedRows = webRows.map((row) => ({ ...row }));
  persistedRows.find((row) => row.name === "DepartmentOnly").department = false;
  const failedVerification = await verifyPreparedRowsWithFreshRows(preparedRows, {
    findRow: async (name) => persistedRows.find((row) => row.name === name) || null,
    readState: async (row) => ({ ok: true, sunday: row.sunday, department: row.department }),
    matches: attendanceTargetSatisfied,
    mismatchReason: (rowInfo, state) =>
      `${rowInfo.name}: 기대 주일=${rowInfo.sunday}, 부서=${rowInfo.department}; ` +
      `실제 주일=${state.sunday}, 부서=${state.department}`
  });

  assert.equal(failedVerification.ok, false);
  assert.deepEqual(failedVerification.mismatches, [
    {
      name: "DepartmentOnly",
      reason: "DepartmentOnly: 기대 주일=false, 부서=true; 실제 주일=true, 부서=false"
    }
  ]);

  console.log("virtual web attendance mapping and save verification checks passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
