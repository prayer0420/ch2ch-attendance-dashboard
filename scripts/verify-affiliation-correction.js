const assert = require("node:assert/strict");

(async () => {
  const {
    buildCorrectionReport,
    collectDeferredCorrectionTargets
  } = await import("../runner/legacy-ch2ch/src/affiliation-correction.js");
  const { __test } = require("../runner/src/automation-adapter.js");

  const groups = [
    {
      family: "재용이네",
      rows: [
        { family: "재용이네", name: "이승한", sourceRow: 12, sunday: true, department: false, note: "" },
        { family: "재용이네", name: "정상인", sourceRow: 13, sunday: false, department: true, note: "" }
      ]
    }
  ];
  const results = [{
    familyName: "재용이네",
    people: [
      { family: "재용이네", name: "이승한", deferredSearch: true, ok: false, reason: "가족 화면에서 찾지 못함" },
      { family: "재용이네", name: "정상인", ok: true, reason: null }
    ]
  }];

  const targets = collectDeferredCorrectionTargets(results, groups);
  assert.equal(targets.length, 1);
  assert.deepEqual(targets[0].rowInfo, groups[0].rows[0]);
  assert.equal(targets[0].originalFamily, "재용이네");

  const corrected = buildCorrectionReport(targets[0], {
    ok: true,
    foundFamily: "여민이네",
    foundLocation: "여민이네",
    saveAttempted: true,
    saveVerified: true,
    reason: null
  });
  assert.deepEqual(corrected, {
    name: "이승한",
    originalFamily: "재용이네",
    foundFamily: "여민이네",
    foundLocation: "여민이네",
    status: "corrected",
    saveAttempted: true,
    saveVerified: true,
    reason: null
  });

  const failed = buildCorrectionReport(targets[0], {
    ok: false,
    foundFamily: "우석이네",
    foundLocation: "우석이네",
    saveAttempted: false,
    saveVerified: false,
    reason: "검색 결과에서 출석 행을 찾지 못함"
  });
  assert.equal(failed.status, "failed");
  assert.equal(failed.reason, "검색 결과에서 출석 행을 찾지 못함");
  assert.equal(failed.originalFamily, "재용이네");

  const initial = __test.createInitialResults(
    { target_week: 32, target_week_text: "2026년 32주차", dry_run: false },
    [{ family: "재용이네", name: "이승한", service13: true, service4: false }]
  );
  const mapped = __test.applyLegacyResult(initial, {
    families: [{
      familyName: "재용이네",
      saved: true,
      saveVerified: true,
      people: [{ family: "재용이네", name: "이승한", ok: false, reason: "원래 가족 화면에서 찾지 못함" }]
    }],
    affiliationCorrections: [corrected]
  }, false);
  assert.equal(mapped[0].status, "second_pass_success");
  assert.equal(mapped[0].attempt_stage, "second_pass_search");
  assert.equal(mapped[0].found_location, "여민이네");
  assert.equal(mapped[0].save_result, "success");

  const failedMapped = __test.applyLegacyResult(initial, {
    families: [{
      familyName: "재용이네",
      saved: true,
      saveVerified: true,
      people: [{ family: "재용이네", name: "이승한", ok: false, reason: "원래 화면에서 찾지 못함" }]
    }],
    affiliationCorrections: [failed]
  }, false);
  assert.equal(failedMapped[0].status, "final_fail");
  assert.equal(failedMapped[0].attempt_stage, "second_pass_search");
  assert.equal(failedMapped[0].failure_reason, failed.reason);

  console.log("affiliation correction checks passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
