// Self-contained functions: executed in the browser by Playwright and in DOM tests.
export function locateMemberRow({ name = '', family = '', expectedNames = [] }) {
  const normalize = value => String(value || '').normalize('NFC').replace(/[\u200B-\u200D\uFEFF\s]/g, '').toLowerCase();
  const target = normalize(name);
  const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
  const stripTitle = text => text.replace(/(?:안수집사|집사|목사|전도사|장로|권사|성도|청년)$/, '');
  const described = Array.from(document.querySelectorAll('tr')).filter(tr =>
    visible(tr) && Array.from(tr.querySelectorAll('input[type="checkbox"]')).some(box => box.closest('tr') === tr && visible(box))
  ).map(tr => {
    const cells = Array.from(tr.cells);
    const table = tr.closest('table');
    const headers = Array.from(table?.rows || []).filter(row => row.closest('table') === table && !row.querySelector('input[type="checkbox"]'));
    const nameColumns = new Set();
    const familyColumns = new Set();
    headers.forEach(row => Array.from(row.cells).forEach((cell, index) => {
      const label = normalize(cell.innerText || cell.textContent);
      if (/^(성명|이름|교인명|교인성명)$/.test(label)) nameColumns.add(index);
      if (/^(소속|가족|가족명|구역|소속가족)$/.test(label)) familyColumns.add(index);
    }));
    const nameCells = nameColumns.size ? cells.filter((_, index) => nameColumns.has(index)) : cells;
    // Compare whole name-bearing elements, never substrings from notes or nested rows.
    const nameTexts = nameCells
      .filter(cell => !cell.querySelector('table'))
      .flatMap(cell => [cell, ...cell.querySelectorAll('a,span,font,strong')].map(el => normalize(el.innerText || el.textContent)))
      .filter(Boolean);
    const matches = nameTexts.some(text => text === target || stripTitle(text) === target);
    const affiliation = cells.filter((_, index) => familyColumns.has(index))
      .flatMap(cell => String(cell.innerText || cell.textContent || '').split(/[\n>›/]/).map(normalize)).filter(Boolean);
    return { tr, matches, affiliation, nameTexts };
  });
  // An explicit different affiliation must never fall back to an unscoped match.
  const inFamily = candidate => !family || !candidate.affiliation.length || candidate.affiliation.includes(normalize(family));
  const candidates = described.filter(candidate => candidate.matches);
  const matches = candidates.filter(inFamily);
  const expected = Array.from(new Set(expectedNames.map(normalize)));
  const matchedNames = expected.filter(targetName => described.filter(candidate => inFamily(candidate) &&
    candidate.nameTexts.some(text => text === targetName || stripTitle(text) === targetName)).length === 1);
  // Diagnostics only: show how a missing name is displayed. Never used to select a row.
  const oneCharApart = text => text.length === target.length && Array.from(text).filter((char, index) => char !== target[index]).length === 1;
  const near = matches.length === 1 ? [] : Array.from(new Set(described.flatMap(candidate => candidate.nameTexts)
    .filter(text => text !== target && target.length >= 2 && (text.includes(target) || oneCharApart(text)))))
    .slice(0, 5)
    .map(text => text.slice(0, 40));
  const observedNames = Array.from(new Set(described.flatMap(candidate => candidate.nameTexts)
    .filter(text => /^[가-힣]{2,5}[a-z]?$/.test(text) && !/(?:이네|가족|가족반)$/.test(text)))).slice(0, 80);
  const selectedWeeks = Array.from(document.querySelectorAll('select')).filter(visible)
    .flatMap(select => Array.from(select.selectedOptions).map(option => String(option.textContent || '').trim()))
    .filter(text => /\d{1,2}\s*주/.test(text)).map(text => text.slice(0, 100)).slice(0, 5);
  return { row: matches.length === 1 ? matches[0].tr : null,
    mode: matches.length === 1 ? 'exact' : matches.length > 1 ? 'ambiguous' : candidates.length ? 'affiliation-mismatch' : 'not-found',
    text: name, candidates: matches.length, near, rows: described.length, matchedNames, observedNames,
    observedFamilies: Array.from(new Set(described.flatMap(candidate => candidate.affiliation))).slice(0, 40), selectedWeeks };
}

export function readMemberAffiliation(tr) {
  const normalize = value => String(value || '').replace(/\s+/g, '').trim();
  // Keep separate links/cells separate; concatenating '새가족' and '새가족반'
  // creates a nonexistent affiliation such as '새가족새가족반'.
  const cells = Array.from(tr.cells || []);
  const values = cells.flatMap(cell => {
    if (cell.querySelector('table')) return [];
    const links = Array.from(cell.querySelectorAll('a')).map(a => normalize(a.innerText || a.textContent));
    return links.length ? links : String(cell.innerText || cell.textContent || '').split(/[\n>›/]/).map(normalize);
  });
  const families = Array.from(new Set(values.filter(value => /^[가-힣]{1,8}(?:네|반|팀)$/.test(value))));
  return families.length === 1 ? families[0] : '';
}
