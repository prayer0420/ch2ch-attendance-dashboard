const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const expectedDefault = "https://docs.google.com/spreadsheets/d/11TQJbhev8m0MfPqW70b2HPbuXleOOfMSL2MXpr3Ab2o/edit?pli=1&gid=437108819#gid=437108819";
const custom = "https://docs.google.com/spreadsheets/d/test-last-url/edit?gid=123";
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    if (process.env.TEST_ACCESS_PASSWORD) {
      const login = await page.request.post(`${baseUrl}/api/auth/login`, {
        headers: { origin: baseUrl },
        data: { password: process.env.TEST_ACCESS_PASSWORD }
      });
      assert.equal(login.status(), 200, "UI test login failed");
    }
    await page.goto(`${baseUrl}/qr-attendance`, { waitUntil: "networkidle" });
    const qrInput = page.getByLabel("Google Sheet URL");
    assert.equal(await qrInput.inputValue(), expectedDefault);
    await qrInput.fill(custom);
    await qrInput.blur();
    await page.waitForTimeout(100);

    await page.goto(`${baseUrl}/runs/new`, { waitUntil: "networkidle" });
    assert.equal(await page.getByLabel("구글시트 URL").inputValue(), custom);

    await page.goto(`${baseUrl}/worship-journal`, { waitUntil: "networkidle" });
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
