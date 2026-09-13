const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const expectedDefault = "https://docs.google.com/spreadsheets/d/11TQJbhev8m0MfPqW70b2HPbuXleOOfMSL2MXpr3Ab2o/edit?pli=1&gid=437108819#gid=437108819";
const custom = "https://docs.google.com/spreadsheets/d/test-last-url/edit?gid=123";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto("http://localhost:3000/qr-attendance", { waitUntil: "networkidle" });
    const qrInput = page.getByLabel("Google Sheet URL");
    assert.equal(await qrInput.inputValue(), expectedDefault);
    await qrInput.fill(custom);
    await qrInput.blur();
    await page.waitForTimeout(100);

    await page.goto("http://localhost:3000/runs/new", { waitUntil: "networkidle" });
    assert.equal(await page.getByLabel("구글시트 URL").inputValue(), custom);

    await page.goto("http://localhost:3000/worship-journal", { waitUntil: "networkidle" });
    assert.equal(await page.getByLabel("시트 링크").inputValue(), custom);
  } finally {
    await browser.close();
  }
  console.log("attendance sheet pages: QR → attendance run → worship journal shared last URL passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
