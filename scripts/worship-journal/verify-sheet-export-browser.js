// Read-only real Google export + browser download test. Never submits a journal or BAND post.
// Run after common.ps1 -> Import-ServerAuthentication; never print credentials/cookies.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const base = "http://localhost:3000";
let browser, step = "configuration";
async function main() {
  assert.ok(process.env.APP_ACCESS_PASSWORD);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  await context.route("**/*", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    return ["GET", "HEAD"].includes(request.method()) || (url.origin === base && url.pathname === "/api/auth/login")
      ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.name));
  step = "anonymous export rejection";
  assert.equal((await context.request.get(`${base}/api/worship-journals/export?id=not-a-journal`)).status(), 401);
  step = "login";
  const login = await context.request.post(`${base}/api/auth/login`, {
    headers: { origin: base }, data: { password: process.env.APP_ACCESS_PASSWORD }
  });
  assert.equal(login.status(), 200);
  step = "saved journal";
  const saved = await context.request.get(`${base}/api/worship-journals`);
  const journal = (await saved.json()).journals.find((item) => item.outputSheet);
  assert.ok(journal, "A saved Google Sheet journal is required");
  assert.equal((await context.request.get(`${base}/api/worship-journals/export?id=not-a-journal`)).status(), 404);
  step = "journal screen";
  await page.goto(`${base}/worship-journal`);
  const [year, month, day] = journal.date.split("-");
  await page.getByRole("button", { name: new RegExp(`${year}년 ${Number(month)}월 ${Number(day)}일`) }).click();
  const pngButton = page.getByRole("button", { name: "시트 PNG 저장", exact: true });
  await pngButton.waitFor();
  const output = path.resolve(__dirname, "../../.local-runtime/worship-export-review");
  fs.mkdirSync(output, { recursive: true });
  step = "Google PDF request and PNG download";
  const downloaded = page.waitForEvent("download", { timeout: 110_000 });
  const exportResponse = page.waitForResponse((response) => response.url().includes("/api/worship-journals/export?"), { timeout: 90_000 });
  await pngButton.click();
  const response = await exportResponse;
  if (!response.ok()) {
    // Only this export API's sanitized message is safe to print (not login failures).
    console.error("Export API:", (await response.json()).error);
    throw new Error("Export failed");
  }
  const pdf = await response.body();
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  fs.writeFileSync(path.join(output, "actual-sheet.pdf"), pdf);
  const download = await downloaded;
  assert.equal(download.suggestedFilename(), `예배일지-${journal.date.replaceAll("-", "")}.png`);
  const pngFile = path.join(output, "actual-sheet.png");
  await download.saveAs(pngFile);
  const png = fs.readFileSync(pngFile);
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.ok(png.readUInt32BE(16) >= 600 && png.readUInt32BE(20) >= 600);
  await page.getByText(/탭의 실제 내용·양식을 PNG 한 장으로 저장했습니다/).waitFor();
  step = "caption and mobile screen";
  const caption = await page.getByLabel("게시할 본문").inputValue();
  assert.ok(caption.startsWith(`#예배일지 #${journal.outputSheet.sheetTitle}`));
  if (!journal.newFamilies.some((entry) => entry.name.trim())) assert.doesNotMatch(caption, /새가족|없음/);
  await page.setViewportSize({ width: 390, height: 844 });
  await pngButton.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, "mobile-export.png") });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  assert.deepEqual(errors, []);
  console.log(`PASS: anonymous 401, missing journal 404, real Google PDF, actual browser PNG download ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}, completion notice, caption, mobile layout. No business writes.`);
}
main().catch(() => { console.error(`FAIL at ${step}. Credentials and personal data withheld.`); process.exitCode = 1; })
  .finally(async () => { await browser?.close(); });
