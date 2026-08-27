export function getWebTargetFamilyName(rawFamily) {
  const family = String(rawFamily || '').replace(/\s+/g, '').trim();
  if (!family) return '';
  // 새가족팀과 새가족반은 웹교적에서 서로 다른 분류 화면이다.
  // 상태 문자열(예: 공부중/결석중)은 제거하되, 두 분류를 합치면 안 된다.
  if (family.includes('새가족방문자') || family.includes('새가족반방문자') || family.includes('새가족팀방문자')) {
    return '';
  }
  if (family.startsWith('새가족반')) return '새가족반';
  if (family.startsWith('새가족팀')) return '새가족팀';
  return family;
}

export function getWebClearTargetFamilies(sourceRowsOrFamilyNames) {
  const targets = [];
  const seen = new Set();

  for (const item of sourceRowsOrFamilyNames || []) {
    const rawFamily = typeof item === 'string' ? item : item?.family;
    const targetFamily = getWebTargetFamilyName(rawFamily);
    const target = targetFamily === '새가족반'
      || targetFamily === '새가족팀'
      || targetFamily.endsWith('네')
      ? targetFamily
      : null;
    if (!target || seen.has(target)) continue;

    seen.add(target);
    targets.push(target);
  }

  return targets;
}
