function normalizeRouteText(value) {
  return String(value || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, '').trim();
}

export function getRouteFamilyName(familyName) {
  const normalized = normalizeRouteText(familyName);
  if (normalized.startsWith('새가족반')) return '새가족반';
  if (normalized.startsWith('새가족팀')) return '새가족팀';
  return String(familyName || '').trim();
}

export function isSpecialNewcomerGroup(familyName) {
  const normalized = normalizeRouteText(familyName);
  return normalized.startsWith('새가족반') || normalized.startsWith('새가족팀');
}

export function getAffiliationOriginalFamily(item) {
  return item?.originalFamily || item?.result?.familyName || getRouteFamilyName(item?.rowInfo?.family || '');
}

export function shouldRecheckAttendancePerson(person, mode = 'fast') {
  if (mode === 'all') return true;
  if (mode === 'off') return false;
  return !person?.ok || person?.saveAttempted === false;
}

export function groupRowsByRoute(rows, order = []) {
  const grouped = new Map();
  for (const row of rows) {
    const routeFamily = getRouteFamilyName(row.family);
    if (!grouped.has(routeFamily)) grouped.set(routeFamily, []);
    grouped.get(routeFamily).push(row);
  }

  const familyNames = Array.from(grouped.keys()).sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return familyNames.map((family) => ({ family, rows: grouped.get(family) }));
}
