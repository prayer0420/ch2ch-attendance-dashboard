const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { chromium } = require('playwright');

(async () => {
  const { locateMemberRow, readMemberAffiliation } = await import('../runner/legacy-ch2ch/src/member-row.js');
  // Exercise the real checkbox accessor, including its Playwright argument bridge.
  const source = fs.readFileSync('runner/legacy-ch2ch/src/main.js', 'utf8');
  const start = source.indexOf('async function accessCheckboxInRow(');
  const end = source.indexOf('\nasync function setCheckboxInRow(', start);
  const context = vm.createContext({ CONFIG: { rowCheckboxOffset: 1 } });
  vm.runInContext(source.slice(start, end), context);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const row = (id, name, family, note = '') => `<tr id="${id}"><td><input type="checkbox" name="select"></td><td><a>${name}</a></td><td>${family}</td><td><input type="checkbox" aria-label="주일"></td><td><input type="checkbox" aria-label="부서"></td><td>${note}</td></tr>`;
    await page.setContent(`<table><tr id="wrapper"><td><table>
      <tr><th>선택</th><th>성명</th><th>소속</th><th>주일</th><th>부서</th><th>비고</th></tr>
      ${row('jiwon', '정 지 원', '재용이네')}
      ${row('other-jiwon', '정지원', '다른가족')}
      ${row('shinhye', '한\u200b신혜', '재용이네')}
      ${row('sunhee', '박선희E', '새가족반')}
      ${row('sunhee-a', '박선희A', '새가족반', '정지원')}
      ${row('sunhee-base', '박선희', '새가족반')}
      </table></td></tr></table>`);
    async function find(name, family = '') {
      const handle = await page.evaluateHandle(locateMemberRow, { name, family });
      const props = await handle.getProperties();
      return { rowHandle: props.get('row').asElement(), mode: await props.get('mode').jsonValue() };
    }
    assert.equal((await find('정지원')).mode, 'ambiguous');
    for (const [name, family, id] of [['정지원', '재용이네', 'jiwon'], ['한신혜', '재용이네', 'shinhye'], ['박선희E', '새가족반', 'sunhee']]) {
      const found = await find(name, family);
      assert.equal(await found.rowHandle.getAttribute('id'), id);
      assert.equal(await found.rowHandle.evaluate(readMemberAffiliation), family);
      for (const [field, index] of [['주일', 0], ['부서', 1]]) {
        const result = await context.accessCheckboxInRow(found, field, true, index, true);
        assert.equal(result.ok, true);
        assert.equal(result.actual, true);
      }
      assert.equal(await found.rowHandle.$eval('input[name="select"]', box => box.checked), false);
    }
    assert.equal((await find('박선희B')).rowHandle, null, 'Suffix mismatch must not select another person');
    assert.equal(await page.locator('#sunhee-a input[aria-label="부서"]').isChecked(), false);
    await page.setContent(`<table>${row('links', '한신혜', '<a>새가족</a><a>새가족반</a>')}</table>`);
    assert.equal(await (await find('한신혜')).rowHandle.evaluate(readMemberAffiliation), '새가족반');
    await page.setContent('<table><tr id="plain"><td>박선희E</td><td><input type="checkbox"></td><td><input type="checkbox"></td><td><input type="checkbox"></td></tr></table>');
    const plain = await find('박선희E');
    const sunday = await context.accessCheckboxInRow(plain, '주일', true, 0, true);
    const department = await context.accessCheckboxInRow(plain, '부서', false, 1, true);
    assert.equal(sunday.chosenIndex, 1);
    assert.equal(department.chosenIndex, 2);
    assert.deepEqual(await page.locator('input').evaluateAll(boxes => boxes.map(box => box.checked)), [false, true, false]);
    console.log('Member DOM regression passed: exact names, suffixes, nested rows, affiliations and real checkbox access');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
