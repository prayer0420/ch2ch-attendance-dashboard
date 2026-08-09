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
  return {
    name: target.rowInfo.name,
    originalFamily: target.originalFamily,
    foundFamily: outcome.foundFamily || null,
    foundLocation: outcome.foundLocation || null,
    status: outcome.ok ? "corrected" : "failed",
    saveAttempted: Boolean(outcome.saveAttempted),
    saveVerified: Boolean(outcome.saveVerified),
    reason: outcome.reason || null
  };
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, "").trim().toLowerCase();
}
