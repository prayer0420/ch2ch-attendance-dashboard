const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const base = process.env.TEST_BASE_URL;
  assert.ok(base && process.env.TEST_ACCESS_PASSWORD, 'Run through verify-security-http.js --app with isolated test credentials');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const output = path.resolve('.local-runtime/app-review');
  fs.mkdirSync(output, { recursive: true });
  try {
    await page.goto(`${base}/login?next=/settings`);
    await page.getByLabel('접속 코드').fill(process.env.TEST_ACCESS_PASSWORD);
    await page.getByRole('button', { name: '들어가기' }).click();
    await page.waitForURL('**/settings');
    // Avoid exposing existing personal journal contents in test screenshots.
    await page.route('**/api/worship-journals', route => route.request().method() === 'GET' ? route.fulfill({ json: { journals: [] } }) : route.abort());
    const pages = ['/', '/search', '/qr-attendance', '/runs/new', '/worship-journal', '/settings', '/attendance', '/runs/demo-run-24'];
    for (const width of [360, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const pathname of pages) {
        await page.goto(base + pathname, { waitUntil: 'networkidle' });
        assert.ok(!page.url().includes('/login'), `${width} ${pathname}: unexpected login`);
        assert.equal(await page.locator('h1').count(), 1, `${pathname}: page heading`);
        const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
        if (dimensions.content > dimensions.viewport + 1) {
          await page.screenshot({ path: path.join(output, 'overflow.png') });
          const oversized = await page.locator('body *').evaluateAll(elements => elements.filter(el => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 && r.width > 0; }).slice(0, 10).map(el => ({ tag: el.tagName, classes: el.className })));
          assert.fail(`${width} ${pathname}: horizontal overflow ${JSON.stringify(dimensions)} ${JSON.stringify(oversized)}`);
        }
        const nav = page.getByRole('navigation', { name: width < 1024 ? '모바일 주요 메뉴' : '주요 메뉴', exact: true });
        assert.equal(await nav.isVisible(), true);
        assert.equal(await nav.getByRole('link', { name: '설정', exact: true }).isVisible(), true);
        if (pathname !== '/' || width >= 1024) assert.equal(await nav.locator('[aria-current="page"]').count(), 1, `${pathname}: active navigation`);
        if (pathname === '/settings') await page.screenshot({ path: path.join(output, `settings-${width}.png`) });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('navigation', { name: '모바일 주요 메뉴' }).getByRole('link', { name: '설정', exact: true }).click();
    const custom = 'https://docs.google.com/spreadsheets/d/app-layout-test/edit';
    await page.getByLabel('구글시트 URL').fill(custom);
    await page.getByRole('button', { name: '설정 저장', exact: true }).click();
    await page.getByText('저장했습니다.', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'API 연결 확인' }).click();
    await page.getByText('인증된 API 연결 정상', { exact: false }).waitFor();
    // Exercise the install interaction without actually installing software on the PC.
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      event.prompt = async () => {};
      event.userChoice = Promise.resolve({ outcome: 'dismissed' });
      window.dispatchEvent(event);
    });
    await page.getByRole('button', { name: 'CH2CH 앱 설치', exact: true }).click();
    await page.getByText('설치를 취소했습니다.', { exact: false }).waitFor();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const mainBottom = await page.locator('main > div').evaluate(el => el.getBoundingClientRect().bottom);
    const navTop = await page.getByRole('navigation', { name: '모바일 주요 메뉴' }).evaluate(el => el.getBoundingClientRect().top);
    assert.ok(mainBottom <= navTop, 'Bottom navigation overlaps final content');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.getByLabel('구글시트 URL').inputValue(), custom);
    for (const [pathname, label] of [['/qr-attendance', 'Google Sheet URL'], ['/runs/new', '구글시트 URL'], ['/worship-journal', '시트 링크']]) {
      await page.goto(base + pathname, { waitUntil: 'networkidle' });
      assert.equal(await page.getByLabel(label).inputValue(), custom);
    }
    await page.getByRole('button', { name: '로그아웃', exact: true }).filter({ visible: true }).click();
    await page.waitForURL('**/login?logout=1');
    assert.equal((await page.request.get(base + '/api/app')).status(), 401);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    await page.goto(base + '/settings', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: '인터넷 연결이 필요합니다' }).waitFor();
    assert.equal(await page.getByText('자동으로 재전송하지 않습니다.', { exact: false }).isVisible(), true);
    await context.setOffline(false);
    await page.getByRole('link', { name: '다시 연결' }).click();
    await page.getByRole('heading', { name: '관리자 접속' }).waitFor();
    assert.deepEqual(await page.evaluate(() => caches.keys()), [], 'Private data must not be cached by PWA');
    assert.deepEqual(errors, [], 'Browser runtime errors');
    console.log('App layout passed: 8 pages × 4 widths, HTML login/logout, settings across 3 workflows, API status, bottom clearance, install UI, offline fallback without private caches');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
