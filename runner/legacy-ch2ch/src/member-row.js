// Self-contained functions: executed in the browser by Playwright and in DOM tests.
export function locateMemberRow({ name, family = '' }) {
  const normalize = value => String(value || '').normalize('NFC').replace(/[\u200B-\u200D\uFEFF\s]/g, '').toLowerCase();
  const target = normalize(name);
  const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
  const candidates = Array.from(document.querySelectorAll('tr')).filter(tr =>
    visible(tr) && Array.from(tr.querySelectorAll('input[type="checkbox"]')).some(box => box.closest('tr') === tr && visible(box))
  ).map(tr => {
    const cells = Array.from(tr.cells);
    const table = tr.closest('table');
    const headers = Array.from(table?.rows || []).filter(row => row.querySelector('th') && !row.querySelector('input[type="checkbox"]'));
    const nameColumns = new Set();
    const familyColumns = new Set();
    headers.forEach(row => Array.from(row.cells).forEach((cell, index) => {
      const label = normalize(cell.innerText || cell.textContent);
      if (/^(성명|이름|교인명|교인성명)$/.test(label)) nameColumns.add(index);
      if (/^(소속|가족|가족명|구역|소속가족)$/.test(label)) familyColumns.add(index);
    }));
    const nameCells = nameColumns.size ? cells.filter((_, index) => nameColumns.has(index)) : cells;
    const matches = nameCells.some(cell => {
      // Compare whole name-bearing elements, never substrings from notes or nested rows.
      if (cell.querySelector('table')) return false;
      return [cell, ...cell.querySelectorAll('a,span,font,strong')].some(el => {
        const text = normalize(el.innerText || el.textContent);
        return text === target || text.replace(/(?:안수집사|집사|목사|전도사|장로|권사|성도|청년)$/, '') === target;
      });
    });
    const affiliation = cells.filter((_, index) => familyColumns.has(index)).map(cell => normalize(cell.innerText || cell.textContent));
    return { tr, matches, affiliation };
  }).filter(candidate => candidate.matches);
  const scoped = family ? candidates.filter(candidate => candidate.affiliation.includes(normalize(family))) : [];
  const matches = scoped.length ? scoped : candidates;
  return { row: matches.length === 1 ? matches[0].tr : null, mode: matches.length === 1 ? 'exact' : matches.length > 1 ? 'ambiguous' : 'not-found', text: name, candidates: matches.length };
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
