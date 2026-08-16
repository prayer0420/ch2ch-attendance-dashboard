export function getWebClearTargetFamilies(sourceRowsOrFamilyNames) {
  const targets = [];
  const seen = new Set();

  for (const item of sourceRowsOrFamilyNames || []) {
    const rawFamily = typeof item === 'string' ? item : item?.family;
    const family = String(rawFamily || '').replace(/\s+/g, '').trim();
    if (!family) continue;

    const target = family.startsWith('새가족')
      ? '새가족반'
      : family.endsWith('네')
        ? family
        : null;
    if (!target || seen.has(target)) continue;

    seen.add(target);
    targets.push(target);
  }

  return targets;
}
