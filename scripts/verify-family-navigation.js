const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { chromium } = require('playwright');

(async () => {
  const source = fs.readFileSync('runner/legacy-ch2ch/src/main.js', 'utf8');
  const ast = ts.createSourceFile('main.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const wanted = new Set(['allContexts', 'shortDelay', 'clickFamilyNavigation']);
  const code = ast.statements.filter(n => ts.isFunctionDeclaration(n) && wanted.has(n.name?.text)).map(n => n.getText(ast)).join('\n');
  const context = vm.createContext({ setTimeout, CONFIG: { actionDelayMs: 0, targetDeptText: '2청년회', targetGroupText: '26하' } });
  vm.runInContext(code, context);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const changingDOM = `<style>#old { display:inline-block; animation:move 1s linear infinite } @keyframes move {from {transform:translateX(0)} to {transform:translateX(20px)}}</style>
      <a id="old" href="#">민석이네</a>`;
    // Demonstrate the old mechanism really fails when an ASP view replaces its button.
    await page.setContent(changingDOM);
    const stale = await page.$('#old');
    await page.evaluate(() => setTimeout(() => document.querySelector('#old').outerHTML = '<a id="fresh" href="#" onclick="window.chosen=1;return false">민석이네</a>', 120));
    await assert.rejects(stale.click({ timeout: 1500 }), /not attached|detach/i);
    await page.setContent(changingDOM);
    await page.evaluate(() => setTimeout(() => document.querySelector('#old').outerHTML = '<a id="fresh" href="#" onclick="window.chosen=2;return false">민석이네</a>', 120));
    assert.equal(await context.clickFamilyNavigation(page, '민석이네'), true);
    assert.equal(await page.evaluate(() => window.chosen), 2);
    await page.setContent('<section id="menu"></section>');
    await page.evaluate(() => setTimeout(() => document.querySelector('#menu').innerHTML = '<a href="#" onclick="window.chosen=3;return false">백동현네</a>', 180));
    assert.equal(await context.clickFamilyNavigation(page, '백동현네'), true, 'Poll for a menu that has not rendered yet');
    assert.equal(await page.evaluate(() => window.chosen), 3);
    await page.setContent('<table><tr><td><a href="#" onclick="window.wrong=true">민석이네</a></td><td><input type="checkbox"></td></tr></table>');
    assert.equal(await context.clickFamilyNavigation(page, '민석이네'), false);
    assert.equal(await page.evaluate(() => window.wrong), undefined, 'Do not click a member-row family label');
    // Production-shaped link: a pointer-blocking layer reproduces the original
    // timeout. The exact read-only navigation link still works without changing
    // a checkbox or invoking arbitrary inline code.
    await page.setContent(`<script>window.chosen=null;function organ1_click(dept,group,family){window.chosen=[dept,group,family]}</script>
      <a id="family" href="javascript:organ1_click('2청년회','26하','연진이네')">연진이네</a>
      <div style="position:fixed;inset:0;z-index:99"></div><input type="checkbox" id="attendance">`);
    await assert.rejects(page.locator('#family').click({ timeout: 200 }), /Timeout/);
    const navigation = [];
    assert.equal(await context.clickFamilyNavigation(page, '연진이네', detail => navigation.push(detail)), true);
    assert.deepEqual(await page.evaluate(() => window.chosen), ['2청년회', '26하', '연진이네']);
    assert.equal(navigation[0].method, 'exact-family-query-link');
    assert.equal(await page.locator('#attendance').isChecked(), false);
    for (const href of ["javascript:organ1_click('1청년회','26하','연진이네')", "javascript:organ1_click('2청년회','26상','연진이네')",
      "javascript:organ1_click('2청년회','26하','건우네')"]) {
      await page.setContent(`<a href="${href}">연진이네</a>`);
      assert.equal(await context.clickFamilyNavigation(page, '연진이네'), false, 'Reject wrong department, term or family');
    }
    await page.setContent(`<a href="javascript:organ1_click('2청년회','26하','연진이네')">연진이네</a><a href="javascript:organ1_click('2청년회','26하','연진이네')">연진이네</a>`);
    assert.equal(await context.clickFamilyNavigation(page, '연진이네'), false, 'Ambiguous links must not be activated');
    const { ensureFamilyReady } = await import('../runner/legacy-ch2ch/src/family-readiness.js');
    for (const matches of [true, false]) {
      let now = 0; const observations = [];
      const result = await ensureFamilyReady({ enter: async () => false,
        inspect: async () => ({ matched: matches ? 1 : 0, matchedNames: matches ? ['송민석'] : [], rows: 6,
          selectedWeeks: ['40주 (2026-10-04)'], observedFamilies: [], errors: [] }),
        record: async event => observations.push(event), pause: async ms => { now += ms; }, now: () => now, timeoutMs: 200 });
      assert.equal(result.ok, matches);
      assert.ok(observations.every(event => event.snapshot), 'Keep DOM evidence even if click fails');
      if (matches) assert.equal(result.attempts[0].reason, 'view-confirmed-after-navigation-error');
    }
    console.log('PASS: detached handles and pointer timeout reproduced; exact family query link, wrong-target and duplicate guards, unchanged checkboxes, post-navigation view verification');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
