export function getWebTargetFamilyName(rawFamily) {
  const family = String(rawFamily || '').replace(/\s+/g, '').trim();
  if (!family) return '';
  return family.startsWith('새가족') ? '새가족반' : family;
}

export function getWebClearTargetFamilies(sourceRowsOrFamilyNames) {
  const targets = [];
  const seen = new Set();

  for (const item of sourceRowsOrFamilyNames || []) {
    const rawFamily = typeof item === 'string' ? item : item?.family;
    const targetFamily = getWebTargetFamilyName(rawFamily);
    const target = targetFamily === '새가족반' || targetFamily.endsWith('네')
      ? targetFamily
      : null;
    if (!target || seen.has(target)) continue;

    seen.add(target);
    targets.push(target);
  }

  return targets;
}
