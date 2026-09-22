// Run via common.ps1 -> Import-ServerAuthentication. No credentials or cookies are logged.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const base = 'http://localhost:3000';
let step = 'configuration', browser;
(async () => {
  assert.ok(process.env.APP_ACCESS_PASSWORD?.length >= 12);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', () => errors.push('page error'));
  // Never submit attendance, change settings or publish content during a login check.
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    const safe = ['GET', 'HEAD'].includes(request.method()) ||
      (url.origin === base && ['/api/auth/login', '/api/auth/logout'].includes(url.pathname));
    return safe ? route.continue() : route.abort();
  });
  step = 'login page';
  await page.goto(base + '/login?next=/settings', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: '관리자 접속' }).waitFor();
  assert.equal(await page.getByText('서버 환경변수에 APP_ACCESS_PASSWORD', { exact: false }).count(), 0);
  assert.equal((await page.request.get(base + '/api/app')).status(), 401);
  const output = path.resolve(__dirname, '../../.local-runtime/app-review');
  fs.mkdirSync(output, { recursive: true });
  await page.screenshot({ path: path.join(output, 'local-server-login-ready.png') });
  step = 'HTML form login';
  await page.getByLabel('접속 코드').fill(process.env.APP_ACCESS_PASSWORD);
  await page.getByRole('button', { name: '들어가기', exact: true }).click();
  await page.waitForURL(base + '/settings');
  step = 'authenticated API';
  const response = await page.request.get(base + '/api/app');
  assert.equal(response.status(), 200);
  assert.equal((await response.json()).data.auth.crossOrigin, false);
  assert.equal(await page.locator('h1').count(), 1);
  step = 'logout';
  const logout = await page.request.post(base + '/api/auth/logout', { headers: { origin: base }, maxRedirects: 0 });
  assert.equal(logout.status(), 303);
  assert.equal((await page.request.get(base + '/api/app')).status(), 401);
  assert.equal(errors.length, 0);
  console.log('PASS: configured login page, anonymous 401, HTML login, settings screen, authenticated API 200, logout 401, no browser errors. No business writes; credentials/cookies not printed or saved.');
})().catch(() => {
  // Playwright error messages can include filled values: report only a safe stage name.
  console.error(`FAIL: local server login verification at ${step}. Sensitive details withheld.`);
  process.exitCode = 1;
}).finally(async () => { if (browser) await browser.close(); });
