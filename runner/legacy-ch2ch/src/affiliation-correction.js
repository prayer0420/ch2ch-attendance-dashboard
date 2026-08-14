export function collectDeferredCorrectionTargets(results, groups) {
  const rowsByKey = new Map();
  for (const group of groups || []) {
    for (const rowInfo of group.rows || []) {
      rowsByKey.set(`${normalize(group.family)}::${normalize(rowInfo.name)}`, rowInfo);
    }
  }

  return (results || []).flatMap((result) => (result.people || [])
    .filter((person) => person.deferredSearch)
    .map((person) => ({
      originalFamily: result.familyName,
      rowInfo: rowsByKey.get(`${normalize(result.familyName)}::${normalize(person.name)}`) || {
        family: person.family || result.familyName,
        name: person.name,
        sunday: person.sunday ?? null,
        department: person.department ?? null,
        note: person.note || ""
      }
    })));
}

export function buildCorrectionReport(target, outcome) {
  const corrected = isCorrectionSuccessful(outcome);
  const report = {
    name: target.rowInfo.name,
    originalFamily: target.originalFamily,
    foundFamily: outcome.foundFamily || null,
    foundLocation: outcome.foundLocation || null,
    status: corrected ? "corrected" : "failed",
    saveAttempted: Boolean(outcome.saveAttempted),
    saveVerified: Boolean(outcome.saveVerified),
    reason: corrected ? null : outcome.reason || null
  };

  if (outcome.alreadyMatched) report.alreadyMatched = true;
  if (Number.isInteger(outcome.attempts) && outcome.attempts > 1) report.attempts = outcome.attempts;
  return report;
}

export function chooseCorrectionOutcome(outcomes) {
  const candidates = Array.isArray(outcomes) ? outcomes.filter(Boolean) : [];
  const recovered = candidates.find((outcome) => outcome.ok || outcome.alreadyMatched);
  return recovered || candidates.at(-1) || {
    ok: false,
    reason: "검색 보정 결과가 없습니다."
  };
}

/*
 * A correction can be successful without changing a checkbox.  The row may
 * already contain the requested state (for example, a previous save worked
 * while the browser-side navigation timed out).  Keep this semantic in one
 * place so the runner and the persisted report agree on the result.
 */
export function isCorrectionSuccessful(outcome) {
  return Boolean(outcome?.ok || outcome?.alreadyMatched);
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, "").trim().toLowerCase();
}
