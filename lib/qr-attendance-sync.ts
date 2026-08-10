import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import * as XLSX from "xlsx";

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1DXEeV2h5lk3c8clfNBZPDw3biuqkIP1-5ENvapcVvk8/edit?usp=sharing";
const DEFAULT_SHEET_TAB = "가장체크";
const SOURCE_COLUMN_LIMIT = 120; // A through DP
const PREVIEW_TTL_MS = 15 * 60 * 1000;

type QrRosterRow = {
  name: string;
  institution: string;
  service: string;
};

type SheetCell = XLSX.CellObject | undefined;

type SheetPatch = {
  range: string;
  tsv: string;
};

export type QrAttendancePreview = {
  id: string;
  createdAt: string;
  week: number;
  weekLabel: string;
  sheetUrl: string;
  sheetTab: string;
  department: string;
  downloadedCount: number;
  departmentCount: number;
  service13Names: string[];
  service4Names: string[];
  duplicate13Count: number;
  duplicate4Count: number;
  unmatched13Names: string[];
  unmatched4Names: string[];
  duplicateSheetNames: string[];
};

export type QrAttendanceApplyResult = {
  appliedAt: string;
  service13Written: number;
  service4Written: number;
  attendanceUpdated: number;
  verified13: number;
  verified4: number;
  unmatched13Names: string[];
  unmatched4Names: string[];
  verificationFailures: Array<{ name: string; service: "1-3부" | "4부"; reason: string }>;
};

type PreviewCacheEntry = {
  preview: QrAttendancePreview;
  expiresAt: number;
};

const globalState = globalThis as typeof globalThis & {
  __qrAttendancePreviewCache?: Map<string, PreviewCacheEntry>;
  __qrAttendanceQueue?: Promise<void>;
};

const previewCache = globalState.__qrAttendancePreviewCache ?? new Map<string, PreviewCacheEntry>();
globalState.__qrAttendancePreviewCache = previewCache;
globalState.__qrAttendanceQueue ??= Promise.resolve();

export function hydrateQrAttendancePreview(preview: QrAttendancePreview) {
  previewCache.set(preview.id, { preview, expiresAt: Date.now() + PREVIEW_TTL_MS });
}

function normalize(value: unknown) {
  return String(value ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

function clean(value: unknown) {
  return String(value ?? "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
}

function uniqueNames(values: string[]) {
  const seen = new Set<string>();
  return values.filter((name) => {
    const key = normalize(name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function weekValue(week: number) {
  return String(week).padStart(2, "0");
}

function isQrSyncHeadless() {
  return String(process.env.QR_SYNC_HEADLESS ?? "true").toLowerCase() !== "false";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
        timer.unref?.();
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function spreadsheetIdFromUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Google Sheet URL 형식이 올바르지 않습니다.");
  }
  if (parsed.hostname !== "docs.google.com") throw new Error("docs.google.com의 Google Sheet 링크만 사용할 수 있습니다.");
  const id = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/)?.[1];
  if (!id) throw new Error("Google Sheet 문서 ID를 찾지 못했습니다.");
  return id;
}

function googleSheetExportUrl(url: string) {
  const id = spreadsheetIdFromUrl(url);
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx&ts=${Date.now()}`;
}

async function loginCh2ch(page: Page) {
  const user = process.env.CH2CH_USER || process.env.CH2CH_ID || "";
  const password = process.env.CH2CH_PASSWORD || process.env.CH2CH_PW || "";
  if (!user || !password) throw new Error(".env.local에 CH2CH_USER와 CH2CH_PASSWORD를 입력해 주세요.");

  const passwordInput = page.locator('input[type="password"]');
  if (!(await passwordInput.count())) return;

  const userInputs = page.locator(
    'input:not([type="hidden"]):not([type="password"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="image"])'
  );
  const userInputCount = await userInputs.count();
  if (!userInputCount) throw new Error("CH2CH 로그인 아이디 입력칸을 찾지 못했습니다.");

  await userInputs.nth(userInputCount - 1).fill(user);
  await passwordInput.first().fill(password);
  const loginButton = page.getByText("로그인", { exact: false });
  if (await loginButton.count()) await loginButton.first().click();
  else await passwordInput.first().press("Enter");
  await page.waitForTimeout(900);
}

async function downloadQrRosterHtml(week: number) {
  const browser = await chromium.launch({ headless: isQrSyncHeadless() });
  const context = await browser.newContext({
    acceptDownloads: true,
    ignoreHTTPSErrors: true,
    viewport: { width: 1600, height: 900 }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(45000);
  const tempFile = path.join(os.tmpdir(), `ch2ch-qr-${randomUUID()}.xls`);

  try {
    await page.goto(process.env.CH2CH_URL || "https://ch2ch.or.kr/login.asp", { waitUntil: "domcontentloaded" });
    await loginCh2ch(page);
    await page.goto("https://ch2ch.or.kr/QRCode/p_check_UTF8.asp", { waitUntil: "domcontentloaded" });

    const weekSelect = page.locator("#week_count");
    if (!(await weekSelect.count())) throw new Error("CH2CH QR출석체크의 주차 선택칸을 찾지 못했습니다.");
    await weekSelect.selectOption(weekValue(week));
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForTimeout(350);

    const selectedWeek = await weekSelect.locator("option:checked").textContent().catch(() => null);
    const ledgerLink = page.locator('a[href*="open_comming_list"]');
    const ledgerCount = await ledgerLink.count();
    if (!ledgerCount) throw new Error("CH2CH QR출석체크 화면에서 출입명부 버튼을 찾지 못했습니다.");

    const popupPromise = context.waitForEvent("page", { timeout: 10000 });
    await ledgerLink.first().click();
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");

    const excelButton = popup.locator('a[href*="excel_click"]');
    if (!(await excelButton.count())) throw new Error("CH2CH 출입명부에서 엑셀저장 버튼을 찾지 못했습니다.");
    const downloadPromise = popup.waitForEvent("download", { timeout: 20000 });
    await excelButton.first().click();
    const download = await downloadPromise;
    await download.saveAs(tempFile);
    const html = await fs.readFile(tempFile, "utf8");
    return { html, weekLabel: clean(selectedWeek) || `${week}주` };
  } finally {
    await fs.rm(tempFile, { force: true }).catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

export function parseCh2chQrRosterHtml(html: string) {
  const tables = Array.from(html.matchAll(/<table[\s\S]*?<\/table>/gi), (match) => match[0]).sort(
    (left, right) => right.length - left.length
  );
  if (!tables.length) throw new Error("CH2CH 출입명부 엑셀에서 표를 찾지 못했습니다.");

  const workbook = XLSX.read(tables[0], { type: "string" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "", raw: false });
  const parsed: QrRosterRow[] = rows.map((row) => ({
    name: clean(row["이름"]),
    institution: clean(row["기관"]),
    service: clean(row["세부항목"])
  })).filter((row) => row.name);
  if (!parsed.length) throw new Error("CH2CH 출입명부에서 이름 열을 읽지 못했습니다.");
  return parsed;
}

function filterRoster(rows: QrRosterRow[], department: string) {
  const departmentRows = rows.filter((row) => normalize(row.institution).includes(normalize(department)));
  const raw13 = departmentRows.filter((row) => ["1부", "2부", "3부"].includes(normalize(row.service))).map((row) => row.name);
  const raw4 = departmentRows.filter((row) => normalize(row.service) === "4부").map((row) => row.name);
  return {
    departmentRows,
    service13Names: uniqueNames(raw13),
    service4Names: uniqueNames(raw4),
    duplicate13Count: raw13.length - uniqueNames(raw13).length,
    duplicate4Count: raw4.length - uniqueNames(raw4).length
  };
}

async function downloadGoogleSheetWorkbook(sheetUrl: string) {
  const response = await fetch(googleSheetExportUrl(sheetUrl), {
    cache: "no-store",
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Google Sheet 읽기 실패: HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength < 1000) throw new Error("Google Sheet 내보내기 파일이 비어 있습니다.");
  return XLSX.read(Buffer.from(bytes), { type: "buffer", cellFormula: true });
}

function getWorksheet(workbook: XLSX.WorkBook, tabName: string) {
  const worksheet = workbook.Sheets[tabName];
  if (!worksheet) throw new Error(`Google Sheet에서 '${tabName}' 탭을 찾지 못했습니다.`);
  return worksheet;
}

function worksheetRowLimit(worksheet: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:DT1250");
  return Math.max(1250, range.e.r + 1);
}

function worksheetActualRowCount(worksheet: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:DT1");
  return Math.max(1, range.e.r + 1);
}

function hasCellContent(cell: SheetCell) {
  return cell !== undefined && (cell.v !== undefined || cell.f !== undefined || cell.t !== undefined);
}

function looksLikeSheetPersonName(value: string) {
  const name = clean(value);
  if (!name || !/[A-Za-z가-힣]/.test(name)) return false;
  const key = normalize(name);
  const blocked = ["qr", "1-3", "1·2·3", "13부", "4부", "출석", "참석", "방송", "가족", "저녁", "합계", "총계", "이름"];
  return !blocked.some((word) => key.includes(normalize(word)));
}

function isSheetPersonRow(worksheet: XLSX.WorkSheet, row: number, blockStart: number) {
  const name = clean(worksheet[XLSX.utils.encode_cell({ r: row, c: blockStart })]?.v);
  if (!looksLikeSheetPersonName(name)) return false;
  for (let column = blockStart + 1; column <= blockStart + 7; column += 1) {
    if (hasCellContent(worksheet[XLSX.utils.encode_cell({ r: row, c: column })])) return true;
  }
  return false;
}

function sheetNameLocations(worksheet: XLSX.WorkSheet) {
  const locations = new Map<string, Array<{ row: number; blockStart: number }>>();
  const rowLimit = worksheetRowLimit(worksheet);
  for (let blockStart = 0; blockStart < SOURCE_COLUMN_LIMIT; blockStart += 8) {
    for (let row = 2; row < rowLimit; row += 1) {
      const nameCell = worksheet[XLSX.utils.encode_cell({ r: row, c: blockStart })];
      const name = clean(nameCell?.v);
      if (!isSheetPersonRow(worksheet, row, blockStart)) continue;
      const key = normalize(name);
      const existing = locations.get(key) ?? [];
      existing.push({ row, blockStart });
      locations.set(key, existing);
    }
  }
  return locations;
}

function compareNamesWithSheet(worksheet: XLSX.WorkSheet, service13Names: string[], service4Names: string[]) {
  const locations = sheetNameLocations(worksheet);
  const unmatched13Names = service13Names.filter((name) => !locations.has(normalize(name)));
  const unmatched4Names = service4Names.filter((name) => !locations.has(normalize(name)));
  const duplicateSheetNames = uniqueNames(
    [...service13Names, ...service4Names].filter((name) => (locations.get(normalize(name))?.length ?? 0) > 1)
  );
  return { locations, unmatched13Names, unmatched4Names, duplicateSheetNames };
}

function prunePreviewCache() {
  const now = Date.now();
  for (const [id, entry] of previewCache.entries()) {
    if (entry.expiresAt <= now) previewCache.delete(id);
  }
}

function runQueued<T>(work: () => Promise<T>) {
  const current = globalState.__qrAttendanceQueue ?? Promise.resolve();
  let release: () => void = () => undefined;
  globalState.__qrAttendanceQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  return current.then(work).finally(release);
}

export async function createQrAttendancePreview(input: {
  week: number;
  sheetUrl?: string;
  sheetTab?: string;
  department?: string;
}) {
  return runQueued(async () => {
    prunePreviewCache();
    const sheetUrl = input.sheetUrl || DEFAULT_SHEET_URL;
    const sheetTab = input.sheetTab || DEFAULT_SHEET_TAB;
    const department = input.department || "2청년회";
    spreadsheetIdFromUrl(sheetUrl);

    const [{ html, weekLabel }, sheetWorkbook] = await withTimeout(
      Promise.all([
        downloadQrRosterHtml(input.week),
        downloadGoogleSheetWorkbook(sheetUrl)
      ]),
      70000,
      "CH2CH 또는 Google Sheet 응답이 너무 늦습니다. 잠시 후 다시 시도해 주세요."
    );
    const rosterRows = parseCh2chQrRosterHtml(html);
    const filtered = filterRoster(rosterRows, department);
    const worksheet = getWorksheet(sheetWorkbook, sheetTab);
    const compared = compareNamesWithSheet(worksheet, filtered.service13Names, filtered.service4Names);

    const preview: QrAttendancePreview = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      week: input.week,
      weekLabel,
      sheetUrl,
      sheetTab,
      department,
      downloadedCount: rosterRows.length,
      departmentCount: filtered.departmentRows.length,
      service13Names: filtered.service13Names,
      service4Names: filtered.service4Names,
      duplicate13Count: filtered.duplicate13Count,
      duplicate4Count: filtered.duplicate4Count,
      unmatched13Names: compared.unmatched13Names,
      unmatched4Names: compared.unmatched4Names,
      duplicateSheetNames: compared.duplicateSheetNames
    };
    hydrateQrAttendancePreview(preview);
    return preview;
  });
}

function buildAttendancePatches(
  worksheet: XLSX.WorkSheet,
  service13Names: string[],
  service4Names: string[]
) {
  const target13 = new Set(service13Names.map(normalize));
  const target4 = new Set(service4Names.map(normalize));
  const patches: SheetPatch[] = [];
  let updateCount = 0;

  for (let blockStart = 0; blockStart < SOURCE_COLUMN_LIMIT; blockStart += 8) {
    const rowLimit = worksheetRowLimit(worksheet);
    for (let row = 2; row < rowLimit; row += 1) {
      if (!isSheetPersonRow(worksheet, row, blockStart)) continue;
      const name = clean(worksheet[XLSX.utils.encode_cell({ r: row, c: blockStart })]?.v);
      const is13 = target13.has(normalize(name));
      const is4 = target4.has(normalize(name));

      const qr13Cell = worksheet[XLSX.utils.encode_cell({ r: row, c: blockStart + 1 })];
      const attendance13Cell = worksheet[XLSX.utils.encode_cell({ r: row, c: blockStart + 2 })];
      if (is13 && qr13Cell?.v === true && attendance13Cell?.v !== true) {
        patches.push({ range: XLSX.utils.encode_cell({ r: row, c: blockStart + 2 }), tsv: "TRUE" });
        updateCount += 1;
      }

      const qr4Cell = worksheet[XLSX.utils.encode_cell({ r: row, c: blockStart + 4 })];
      const attendance4Cell = worksheet[XLSX.utils.encode_cell({ r: row, c: blockStart + 5 })];
      if (is4 && qr4Cell?.v === true && attendance4Cell?.v !== true) {
        patches.push({ range: XLSX.utils.encode_cell({ r: row, c: blockStart + 5 }), tsv: "TRUE" });
        updateCount += 1;
      }
    }
  }
  return { patches, updateCount };
}

function packRosterNames(names: string[], rowCount: number) {
  const rows = Array.from({ length: rowCount }, () => [] as string[]);
  names.forEach((name, index) => rows[index % rowCount].push(name));
  return rows.map((row) => row.join(" · "));
}

function buildRosterTsv(service13Names: string[], service4Names: string[], rowCount: number) {
  if (rowCount < 1) throw new Error("Google Sheet 명단 영역에 사용할 행이 없습니다.");
  const packed13 = packRosterNames(service13Names, rowCount);
  const packed4 = packRosterNames(service4Names, rowCount);
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const service13 = packed13[index] || "";
    const service4 = packed4[index] || "";
    return [service13, service13 ? "TRUE" : "", service4, service4 ? "TRUE" : ""].join("\t");
  });
  return { rowCount, tsv: rows.join("\n") };
}

async function writeWindowsClipboard(value: string) {
  if (process.platform !== "win32") return;
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "[Console]::InputEncoding=[System.Text.Encoding]::UTF8; Set-Clipboard -Value ([Console]::In.ReadToEnd())"
      ],
      { windowsHide: true }
    );
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `Windows clipboard failed with code ${code}`));
    });
    child.stdin.end(value, "utf8");
  });
}

async function selectSheetRange(page: Page, range: string, validate = true) {
  await dismissGoogleSheetDialogs(page);
  await page.keyboard.press("Control+J");
  await page.waitForTimeout(500);
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(100);
  await page.keyboard.type(range);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(180);
  if (validate) {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    if (bodyText.includes("잘못된 범위") || bodyText.includes("current sheet size")) {
      await dismissGoogleSheetDialogs(page);
      throw new Error(`Google Sheet에 '${range}' 범위를 만들 수 없습니다.`);
    }
  }
}

async function dismissGoogleSheetDialogs(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.keyboard.press("Escape").catch(() => undefined);
    await page.waitForTimeout(250);
  }
  const closeButtons = page.locator(
    '[aria-label="Close"], [aria-label="닫기"], .modal-dialog-title-close, .docs-material-button[aria-label="Close"]'
  );
  const count = await closeButtons.count().catch(() => 0);
  for (let index = 0; index < Math.min(count, 3); index += 1) {
    await closeButtons.nth(index).click({ timeout: 1000 }).catch(() => undefined);
  }
  await page.waitForTimeout(300);
}

async function pasteTsv(context: BrowserContext, page: Page, range: string, tsv: string) {
  await selectSheetRange(page, range);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "https://docs.google.com" });
  try {
    await page.evaluate(async (value) => navigator.clipboard.writeText(value), tsv);
  } catch {
    await writeWindowsClipboard(tsv);
  }
  await page.keyboard.press("Control+V");
  await page.waitForTimeout(160);
}

async function checkSheetCheckbox(page: Page, range: string) {
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+J");
  await page.keyboard.press("Control+A");
  await page.keyboard.type(range);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  await page.keyboard.press("Escape");
  await page.keyboard.type("TRUE");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
}

async function writeSheetWithBrowser(input: {
  sheetUrl: string;
  sheetTab: string;
  clearToRow: number;
  rosterRange: string;
  rosterTsv: string;
  attendancePatches: SheetPatch[];
}) {
  const browser = await chromium.launch({ headless: isQrSyncHeadless() });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(60000);
  try {
    await page.goto(input.sheetUrl, { waitUntil: "domcontentloaded" });
    await page.locator("#t-name-box").waitFor({ state: "visible", timeout: 30000 });
    const title = await page.title();
    if (!title.includes("Google Sheets")) throw new Error("Google Sheet 편집 화면을 열지 못했습니다.");

    const tab = page.locator(".docs-sheet-tab-name").filter({ hasText: input.sheetTab });
    const tabCount = await tab.count();
    if (!tabCount) throw new Error(`Google Sheet에서 '${input.sheetTab}' 탭을 찾지 못했습니다.`);
    await tab.first().click();
    await page.waitForTimeout(300);

    await pasteTsv(context, page, input.rosterRange, input.rosterTsv);
    await page.waitForTimeout(3000);

    for (const patch of input.attendancePatches) {
      if (patch.tsv === "TRUE" && !patch.range.includes(":")) {
        await checkSheetCheckbox(page, patch.range);
      } else {
        await pasteTsv(context, page, patch.range, patch.tsv);
      }
      await page.waitForTimeout(350);
    }
    await page.waitForTimeout(5000);
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

async function openGoogleSheetTabForQr(page: Page, sheetUrl: string, sheetTab: string) {
  await page.goto(sheetUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#t-name-box").waitFor({ state: "visible", timeout: 30000 });
  await dismissGoogleSheetDialogs(page);
  const tab = page.locator(".docs-sheet-tab-name").filter({ hasText: sheetTab });
  if (!(await tab.count())) throw new Error(`Google Sheet tab not found: ${sheetTab}`);
  await tab.first().click().catch(async () => {
    await dismissGoogleSheetDialogs(page);
    await tab.first().click({ force: true });
  });
  await page.waitForTimeout(500);
}

async function writeRosterOnlyWithBrowser(input: {
  sheetUrl: string;
  sheetTab: string;
  rosterRange: string;
  rosterTsv: string;
}) {
  const browser = await chromium.launch({ headless: isQrSyncHeadless() });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(60000);
  try {
    await openGoogleSheetTabForQr(page, input.sheetUrl, input.sheetTab);
    // A multi-row paste from one starting cell makes Google Sheets grow the
    // sheet automatically when the roster is longer than the current grid.
    await pasteTsv(context, page, input.rosterRange, input.rosterTsv);
    await page.waitForTimeout(8000);
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

async function writeAttendanceOnlyWithBrowser(input: {
  sheetUrl: string;
  sheetTab: string;
  attendancePatches: SheetPatch[];
}) {
  if (!input.attendancePatches.length) return;
  const browser = await chromium.launch({ headless: isQrSyncHeadless() });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(60000);
  try {
    await openGoogleSheetTabForQr(page, input.sheetUrl, input.sheetTab);
    for (const patch of input.attendancePatches) {
      if (patch.tsv.includes("\t")) await pasteTsv(context, page, patch.range, patch.tsv);
      else await checkSheetCheckbox(page, patch.range);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(3500);
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

function verifyAppliedWorkbook(
  workbook: XLSX.WorkBook,
  preview: QrAttendancePreview
) {
  const worksheet = getWorksheet(workbook, preview.sheetTab);
  const list13 = new Set<string>();
  const list4 = new Set<string>();
  const rowLimit = worksheetRowLimit(worksheet);
  for (let row = 1; row < rowLimit; row += 1) {
    const name13 = clean(worksheet[XLSX.utils.encode_cell({ r: row, c: 120 })]?.v);
    const name4 = clean(worksheet[XLSX.utils.encode_cell({ r: row, c: 122 })]?.v);
    for (const name of name13.split(/\s*·\s*/).filter(Boolean)) list13.add(normalize(name));
    for (const name of name4.split(/\s*·\s*/).filter(Boolean)) list4.add(normalize(name));
  }

  const locations = sheetNameLocations(worksheet);
  const failures: QrAttendanceApplyResult["verificationFailures"] = [];
  let verified13 = 0;
  let verified4 = 0;

  for (const name of preview.service13Names) {
    if (!list13.has(normalize(name))) {
      failures.push({ name, service: "1-3부", reason: "DQ 명단에 저장되지 않음" });
      continue;
    }
    const rows = locations.get(normalize(name)) ?? [];
    if (!rows.length) {
      failures.push({ name, service: "1-3부", reason: "A~DP 이름 칸에서 찾지 못함" });
      continue;
    }
    const ok = rows.some(({ row, blockStart }) => {
      const qr = worksheet[XLSX.utils.encode_cell({ r: row, c: blockStart + 1 })]?.v === true;
      const attendance = worksheet[XLSX.utils.encode_cell({ r: row, c: blockStart + 2 })]?.v === true;
      return qr && attendance;
    });
    if (ok) verified13 += 1;
    else {
      const qrOnly = rows.some(({ row, blockStart }) =>
        worksheet[XLSX.utils.encode_cell({ r: row, c: blockStart + 1 })]?.v === true
      );
      failures.push({
        name,
        service: "1-3부",
        reason: qrOnly ? "QR은 TRUE지만 참석 셀 변경이 거부됨" : "QR 체크가 TRUE가 아님"
      });
    }
  }

  for (const name of preview.service4Names) {
    if (!list4.has(normalize(name))) {
      failures.push({ name, service: "4부", reason: "DS 명단에 저장되지 않음" });
      continue;
    }
    const rows = locations.get(normalize(name)) ?? [];
    if (!rows.length) {
      failures.push({ name, service: "4부", reason: "A~DP 이름 칸에서 찾지 못함" });
      continue;
    }
    const ok = rows.some(({ row, blockStart }) => {
      const qr = worksheet[XLSX.utils.encode_cell({ r: row, c: blockStart + 4 })]?.v === true;
      const attendance = worksheet[XLSX.utils.encode_cell({ r: row, c: blockStart + 5 })]?.v === true;
      return qr && attendance;
    });
    if (ok) verified4 += 1;
    else {
      const qrOnly = rows.some(({ row, blockStart }) =>
        worksheet[XLSX.utils.encode_cell({ r: row, c: blockStart + 4 })]?.v === true
      );
      failures.push({
        name,
        service: "4부",
        reason: qrOnly ? "QR은 TRUE지만 참석 셀 변경이 거부됨" : "QR 체크가 TRUE가 아님"
      });
    }
  }
  return { verified13, verified4, failures, list13Size: list13.size, list4Size: list4.size };
}

export async function verifyQrAttendancePreview(previewId: string) {
  return runQueued(async () => {
    prunePreviewCache();
    const entry = previewCache.get(previewId);
    if (!entry) throw new Error("미리보기 유효시간이 지났습니다. CH2CH 명단을 다시 불러와 주세요.");
    const workbook = await downloadGoogleSheetWorkbook(entry.preview.sheetUrl);
    const verification = verifyAppliedWorkbook(workbook, entry.preview);
    return {
      service13Written: entry.preview.service13Names.length,
      service4Written: entry.preview.service4Names.length,
      verified13: verification.verified13,
      verified4: verification.verified4,
      verificationFailures: verification.failures
    };
  });
}

export async function applyQrAttendancePreview(previewId: string): Promise<QrAttendanceApplyResult> {
  return runQueued(async () => {
    prunePreviewCache();
    const entry = previewCache.get(previewId);
    if (!entry) throw new Error("미리보기 유효시간이 지났습니다. CH2CH 명단을 다시 불러와 주세요.");
    const { preview } = entry;
    let attendanceUpdated = 0;
    let verification = {
      verified13: 0,
      verified4: 0,
      list13Size: 0,
      list4Size: 0,
      failures: [] as QrAttendanceApplyResult["verificationFailures"]
    };
    let rosterSaved = false;

    for (let rosterAttempt = 0; rosterAttempt < 3; rosterAttempt += 1) {
      if (rosterAttempt) await new Promise((resolve) => setTimeout(resolve, 1800));
      const workbook = await downloadGoogleSheetWorkbook(preview.sheetUrl);
      const worksheet = getWorksheet(workbook, preview.sheetTab);
      const currentRows = worksheetActualRowCount(worksheet);
      const roster = buildRosterTsv(preview.service13Names, preview.service4Names, currentRows - 1);

      await writeRosterOnlyWithBrowser({
        sheetUrl: preview.sheetUrl,
        sheetTab: preview.sheetTab,
        rosterRange: `DQ2:DT${currentRows}`,
        rosterTsv: roster.tsv
      });

      for (let verifyAttempt = 0; verifyAttempt < 4; verifyAttempt += 1) {
        if (verifyAttempt) await new Promise((resolve) => setTimeout(resolve, 2200));
        const verifiedWorkbook = await downloadGoogleSheetWorkbook(preview.sheetUrl);
        verification = verifyAppliedWorkbook(verifiedWorkbook, preview);
        rosterSaved =
          verification.list13Size >= preview.service13Names.length &&
          verification.list4Size >= preview.service4Names.length;
        if (rosterSaved) break;
      }

      rosterSaved =
        verification.list13Size >= preview.service13Names.length &&
        verification.list4Size >= preview.service4Names.length;
      if (rosterSaved) break;
    }

    if (!rosterSaved) {
      throw new Error("Google Sheet 명단 저장 확인에 실패했습니다. DQ:DT 편집 권한과 시트 보호 설정을 확인해 주세요.");
    }

    try {
        for (let attendanceAttempt = 0; attendanceAttempt < 2; attendanceAttempt += 1) {
          if (attendanceAttempt) await new Promise((resolve) => setTimeout(resolve, 1800));
          const workbook = await downloadGoogleSheetWorkbook(preview.sheetUrl);
          const worksheet = getWorksheet(workbook, preview.sheetTab);
          const attendance = buildAttendancePatches(worksheet, preview.service13Names, preview.service4Names);
          attendanceUpdated = attendance.updateCount;
          const verifiedBefore = verification.verified13 + verification.verified4;

          await writeAttendanceOnlyWithBrowser({
            sheetUrl: preview.sheetUrl,
            sheetTab: preview.sheetTab,
            attendancePatches: attendance.patches
          });

          for (let verifyAttempt = 0; verifyAttempt < 4; verifyAttempt += 1) {
            if (verifyAttempt) await new Promise((resolve) => setTimeout(resolve, 2200));
            const verifiedWorkbook = await downloadGoogleSheetWorkbook(preview.sheetUrl);
            verification = verifyAppliedWorkbook(verifiedWorkbook, preview);
            if (!verification.failures.length) break;
          }

          const verifiedAfter = verification.verified13 + verification.verified4;
          if (verification.failures.length && verifiedAfter <= verifiedBefore) {
            throw new Error(
              `QR 명단은 저장됐지만 참석 셀 ${verification.failures.length}개 변경이 거부됐습니다. Google 계정 로그인 또는 '가장체크' 참석 셀 보호 범위를 확인해 주세요.`
            );
          }

          if (!verification.failures.length) break;
        }
    } catch (error) {
      throw error instanceof Error ? error : new Error("참석 체크 단계에서 오류가 발생했습니다.");
    }

    previewCache.delete(previewId);
    return {
      appliedAt: new Date().toISOString(),
      service13Written: preview.service13Names.length,
      service4Written: preview.service4Names.length,
      attendanceUpdated,
      verified13: verification.verified13,
      verified4: verification.verified4,
      unmatched13Names: preview.unmatched13Names,
      unmatched4Names: preview.unmatched4Names,
      verificationFailures: verification.failures
    };
  });
}

export const qrAttendanceDefaults = {
  sheetUrl: DEFAULT_SHEET_URL,
  sheetTab: DEFAULT_SHEET_TAB,
  department: "2청년회"
};
