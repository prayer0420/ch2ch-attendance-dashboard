import { createHash } from "node:crypto";
import { chromium, type Browser, type BrowserContext, type Frame, type Page } from "playwright";

export type MemberSearchResult = {
  id: string;
  name: string;
  phone: string;
  birthDate: string;
  affiliation: string;
  ch2chId: string;
};

type RawMemberSearchResult = Omit<MemberSearchResult, "id">;
type SearchTarget = Page | Frame;
type SearchSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  ready: boolean;
  idleTimer?: NodeJS.Timeout;
};

const IDLE_CLOSE_MS = 10 * 60 * 1000;

let searchQueue: Promise<void> = Promise.resolve();
let session: SearchSession | null = null;

function normalize(value: string) {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, "").trim().toLowerCase();
}

function normalizeColumn(value: string) {
  return normalize(value).replace(/[()[\]{}:：/\\|ㆍ·.,_-]/g, "");
}

function normalizeAffiliationKey(value: string) {
  return normalize(value).replace(/교인|조회됨|[()[\]{}:：/\\|ㆍ·.,_\-\s]/g, "");
}

function cleanCell(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function formatBirthDate(value: string) {
  const digits = value.replace(/\D/g, "");
  const date = digits.match(/(?:19|20)\d{6}/)?.[0];
  if (date) return `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`;
  return value.trim() || "-";
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("010")) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return "-";
}

function cleanAffiliationPart(value: string) {
  return cleanCell(value)
    .replace(/^\d{2,3}(?=\d청년회)/, "")
    .replace(/^\/+|\/+$/g, "")
    .trim();
}

function looksLikeAffiliation(value: string) {
  return /교인|새가족|전입|이사|청년회|이네|가족|가정|반|부|팀|구역|기관|중등|고등|유년|초등/.test(value);
}

function combineAffiliation(parts: string[]) {
  const seen = new Set<string>();
  return parts
    .flatMap((part) => part.split(/\s*\/\s*/))
    .map(cleanAffiliationPart)
    .filter((part) => part && part !== "-" && !/^\d+$/.test(part) && !/^\d+\/\d+$/.test(part))
    .filter((part) => looksLikeAffiliation(part))
    .filter((part) => {
      const key = normalizeAffiliationKey(part);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5)
    .join(" / ") || "-";
}

function withId(result: RawMemberSearchResult): MemberSearchResult {
  const key = `${result.ch2chId}|${normalize(result.name)}|${result.phone}|${result.birthDate}|${normalizeAffiliationKey(result.affiliation)}`;
  return {
    ...result,
    id: createHash("sha1").update(key).digest("hex").slice(0, 16)
  };
}

function targets(page: Page): SearchTarget[] {
  return [page, ...page.frames().filter((frame) => frame !== page.mainFrame())];
}

function scheduleIdleClose(current: SearchSession) {
  if (current.idleTimer) clearTimeout(current.idleTimer);
  current.idleTimer = setTimeout(() => {
    if (session === current) session = null;
    current.browser.close().catch(() => undefined);
  }, IDLE_CLOSE_MS);
  current.idleTimer.unref?.();
}

async function closeSession() {
  const current = session;
  session = null;
  if (current?.idleTimer) clearTimeout(current.idleTimer);
  await current?.browser.close().catch(() => undefined);
}

async function getSession() {
  if (session && !session.page.isClosed() && session.browser.isConnected()) {
    scheduleIdleClose(session);
    return session;
  }

  await closeSession();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.setDefaultNavigationTimeout(30000);

  session = { browser, context, page, ready: false };
  scheduleIdleClose(session);
  return session;
}

async function clickTextAction(page: Page, text: string, exact = true) {
  const target = normalize(text);
  for (const context of targets(page)) {
    try {
      const clicked = await context.evaluate(({ target, exact }) => {
        const normalizeText = (value: string) => String(value || "").replace(/\s+/g, "").trim().toLowerCase();
        const visible = (element: Element) => {
          const htmlElement = element as HTMLElement;
          const style = window.getComputedStyle(htmlElement);
          const rect = htmlElement.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        };
        const candidates = Array.from(document.querySelectorAll<HTMLElement>(
          'button,a,input[type="button"],input[type="submit"],[role="button"],[onclick]'
        ))
          .filter(visible)
          .map((element) => {
            const value = normalizeText(element.innerText || element.textContent || (element as HTMLInputElement).value || element.title || "");
            const rect = element.getBoundingClientRect();
            return { element, value, area: rect.width * rect.height };
          })
          .filter((item) => exact ? item.value === target : item.value.includes(target))
          .sort((a, b) => a.area - b.area);
        if (!candidates.length) return false;
        candidates[0].element.click();
        return true;
      }, { target, exact });
      if (clicked) return true;
    } catch {}
  }
  return false;
}

async function hasPasswordInput(page: Page) {
  for (const context of targets(page)) {
    try {
      if ((await context.locator('input[type="password"]').count()) > 0) return true;
    } catch {}
  }
  return false;
}

async function login(page: Page, id: string, password: string) {
  if (!(await hasPasswordInput(page))) return;

  for (const context of targets(page)) {
    try {
      const filled = await context.evaluate(({ id, password }) => {
        const visible = (element: HTMLInputElement) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        };
        const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input")).filter(visible);
        const passwordInput = inputs.find((input) => input.type.toLowerCase() === "password");
        if (!passwordInput) return false;
        const idInputs = inputs.filter((input) => !["password", "hidden", "checkbox", "radio", "button", "submit", "image"].includes(input.type.toLowerCase()));
        const idInput = idInputs[idInputs.length - 1];
        if (!idInput) return false;
        const setValue = (input: HTMLInputElement, value: string) => {
          input.focus();
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        };
        setValue(idInput, id);
        setValue(passwordInput, password);
        return true;
      }, { id, password });
      if (!filled) continue;
      if (!(await clickTextAction(page, "로그인", false))) {
        const passwordInput = context.locator('input[type="password"]');
        if (await passwordInput.count()) await passwordInput.first().press("Enter");
      }
      await page.waitForTimeout(800);
      return;
    } catch {}
  }
  throw new Error("CH2CH 로그인 입력칸을 찾지 못했습니다.");
}

async function fillName(page: Page, name: string) {
  for (const context of targets(page)) {
    try {
      const handle = await context.evaluateHandle((name) => {
        const visible = (element: HTMLElement) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 50 && rect.height > 14;
        };
        const candidates = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input,textarea"))
          .filter((element) => {
            const type = String(element.getAttribute("type") || "text").toLowerCase();
            return visible(element) && !["hidden", "password", "checkbox", "radio", "button", "submit", "image", "file"].includes(type);
          })
          .map((element) => {
            const identity = `${element.getAttribute("placeholder") || ""} ${element.getAttribute("name") || ""} ${element.id || ""} ${element.getAttribute("aria-label") || ""}`;
            const nearby = element.closest("td,th,div,label")?.textContent || "";
            const score = (/이름|성명|초성|name/i.test(identity) ? 6 : 0) + (/이름|성명|초성/.test(nearby) ? 4 : 0);
            return { element, score };
          })
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score);
        const selected = candidates[0]?.element;
        if (!selected) return null;
        selected.focus();
        selected.value = "";
        selected.dispatchEvent(new Event("input", { bubbles: true }));
        selected.value = name;
        selected.dispatchEvent(new Event("input", { bubbles: true }));
        selected.dispatchEvent(new Event("change", { bubbles: true }));
        return selected;
      }, name);
      const element = handle.asElement();
      if (!element) continue;
      await element.press("Enter").catch(() => undefined);
      return true;
    } catch {}
  }
  return false;
}

async function waitForNameSearchInput(page: Page, name: string) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    if (await fillName(page, name)) return true;
    await page.waitForTimeout(250);
  }
  return false;
}

async function openMemberManagement(page: Page) {
  let opened = false;
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline && !opened) {
    opened = await clickTextAction(page, "교인관리", false);
    if (!opened) await page.waitForTimeout(300);
  }
  if (opened) await page.waitForTimeout(600);
  return opened;
}

async function ensureSearchPage(current: SearchSession, name: string) {
  const id = process.env.CH2CH_ID || process.env.CH2CH_USER || "";
  const password = process.env.CH2CH_PW || process.env.CH2CH_PASSWORD || "";
  const url = process.env.CH2CH_URL || "https://ch2ch.or.kr/login.asp";
  if (!id || !password) throw new Error(".env.local에 CH2CH_USER와 CH2CH_PASSWORD를 설정해 주세요.");

  const { page } = current;
  if (!current.ready) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await login(page, id, password);
    if (!(await openMemberManagement(page))) throw new Error("CH2CH 교인관리 화면으로 이동하지 못했습니다.");
  }

  if (await waitForNameSearchInput(page, name)) {
    current.ready = true;
    return;
  }

  let opened = await openMemberManagement(page);
  if (!opened && current.ready) {
    current.ready = false;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await login(page, id, password);
    opened = await openMemberManagement(page);
  }
  if (!opened) throw new Error("CH2CH 교인관리 화면으로 이동하지 못했습니다.");
  if (!(await waitForNameSearchInput(page, name))) throw new Error("CH2CH 이름 검색칸을 찾지 못했습니다.");
  current.ready = true;
}

async function readResults(page: Page, query: string): Promise<MemberSearchResult[]> {
  const normalizedQuery = normalize(query);
  const collected: RawMemberSearchResult[] = [];

  for (const context of targets(page)) {
    try {
      const rows = await context.evaluate((normalizedQuery) => {
        const normalizeText = (value: string) => String(value || "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, "").trim().toLowerCase();
        const normalizeColumn = (value: string) => normalizeText(value).replace(/[()[\]{}:：/\\|ㆍ·.,_-]/g, "");
        const clean = (value: string) => String(value || "").replace(/\s+/g, " ").trim();
        const hasAny = (value: string, words: string[]) => words.some((word) => value.includes(word));
        const decodeLoose = (value: string) => {
          try {
            return decodeURIComponent(value);
          } catch {
            return value;
          }
        };
        const nameCandidatesFrom = (value: string) => {
          const source = decodeLoose(value);
          const candidates = new Set<string>();
          for (const match of source.matchAll(/[가-힣]{2,6}[A-Za-z]?/g)) candidates.add(match[0]);
          return Array.from(candidates);
        };
        const pickDisplayedName = (cell: HTMLElement) => {
          const rawValues = [
            clean(cell.innerText || ""),
            clean(cell.textContent || ""),
            ...Array.from(cell.querySelectorAll<HTMLElement>("a,button,span,[title],[aria-label],[data-original-title]")).flatMap((element) => [
              clean(element.innerText || ""),
              clean(element.textContent || ""),
              clean(element.getAttribute("title") || ""),
              clean(element.getAttribute("aria-label") || ""),
              clean(element.getAttribute("data-original-title") || ""),
              clean(element.getAttribute("onclick") || ""),
              clean(element.getAttribute("href") || "")
            ])
          ].filter(Boolean);
          const candidates = rawValues
            .flatMap((value) => [value, ...nameCandidatesFrom(value)])
            .map(clean)
            .filter((value) => normalizeText(value).includes(normalizedQuery));
          const withSuffix = candidates.find((value) => new RegExp(`${normalizedQuery}[a-z]$`, "i").test(normalizeText(value)));
          if (withSuffix) return withSuffix;
          return candidates.sort((a, b) => a.length - b.length)[0] || clean(cell.innerText || cell.textContent || "");
        };
        const output: Array<{ name: string; phone: string; birthDate: string; affiliation: string; ch2chId: string }> = [];

        for (const table of document.querySelectorAll("table")) {
          const tableRows = Array.from(table.querySelectorAll("tr"));
          const headerIndex = tableRows.findIndex((row) => {
            const text = normalizeColumn(row.textContent || "");
            return text.includes("이름") && hasAny(text, ["생년월일", "생일"]) && hasAny(text, ["휴대폰", "전화"]);
          });
          if (headerIndex < 0) continue;

          const headers = Array.from(tableRows[headerIndex].querySelectorAll("th,td")).map((cell) => normalizeColumn(cell.textContent || ""));
          const nameIndex = headers.findIndex((header) => header.includes("이름") || header.includes("성명"));
          const birthIndex = headers.findIndex((header) => header.includes("생년월일") || header.includes("생일"));
          const phoneIndex = headers.findIndex((header) => header.includes("휴대폰") || header.includes("전화"));
          if (nameIndex < 0 || birthIndex < 0 || phoneIndex < 0) continue;

          const affiliationIndexes = headers
            .map((header, index) => ({ header, index }))
            .filter(({ header, index }) => {
              if ([nameIndex, birthIndex, phoneIndex].includes(index)) return false;
              return hasAny(header, ["소속", "가족", "가정", "부서", "반", "기관", "구역", "행정분류", "학년"]);
            })
            .map(({ index }) => index);

          for (const row of tableRows.slice(headerIndex + 1)) {
            const cells = Array.from(row.querySelectorAll<HTMLElement>("td"));
            const nameCell = cells[nameIndex];
            const name = nameCell ? pickDisplayedName(nameCell) : "";
            if (!name || !normalizeText(name).includes(normalizedQuery)) continue;
            const personLink = nameCell?.querySelector<HTMLElement>("[data-param],a[href*='person_click']");
            const ch2chId = clean(personLink?.getAttribute("data-param") || personLink?.getAttribute("href")?.match(/person_click\((\d+)\)/)?.[1] || "");

            const affiliationParts = affiliationIndexes.map((index) => clean(cells[index]?.innerText || cells[index]?.textContent || ""));
            const titledParts = cells.flatMap((cell) => Array.from(cell.querySelectorAll<HTMLElement>("[title],[aria-label],[data-original-title]")).map((element) => {
              return clean(element.getAttribute("title") || element.getAttribute("aria-label") || element.getAttribute("data-original-title") || "");
            })).filter((value) => hasAny(value, ["교인", "새가족", "전입", "이사", "청년회", "이네", "가족", "반", "부", "팀"]));

            output.push({
              name,
              birthDate: clean(cells[birthIndex]?.innerText || cells[birthIndex]?.textContent || ""),
              phone: clean(cells[phoneIndex]?.innerText || cells[phoneIndex]?.textContent || ""),
              affiliation: [...affiliationParts, ...titledParts].join(" / "),
              ch2chId
            });
          }
        }
        return output;
      }, normalizedQuery);
      collected.push(...rows);
    } catch {}
  }

  const bySoftKey = new Map<string, RawMemberSearchResult>();
  const unique = new Map<string, RawMemberSearchResult>();
  const sourceResults = collected.some((result) => result.ch2chId) ? collected.filter((result) => result.ch2chId) : collected;
  for (const result of sourceResults) {
    const formatted: RawMemberSearchResult = {
      name: result.name.trim(),
      phone: formatPhone(result.phone),
      birthDate: formatBirthDate(result.birthDate),
      affiliation: combineAffiliation(result.affiliation.split("/")),
      ch2chId: result.ch2chId
    };
    const softKey = formatted.ch2chId || `${normalize(formatted.name)}|${formatted.birthDate}|${normalizeAffiliationKey(formatted.affiliation)}`;
    const existing = bySoftKey.get(softKey);
    if (existing && (existing.phone === "-" || formatted.phone === "-" || existing.phone === formatted.phone)) {
      bySoftKey.set(softKey, existing.phone === "-" && formatted.phone !== "-" ? formatted : existing);
      continue;
    }
    bySoftKey.set(softKey, formatted);
  }

  for (const result of bySoftKey.values()) {
    const withKey = withId(result);
    unique.set(withKey.id, result);
  }
  return Array.from(unique.values()).map(withId).slice(0, 30);
}

async function waitForResults(page: Page, name: string) {
  const deadline = Date.now() + 4500;
  let results: MemberSearchResult[] = [];
  while (Date.now() < deadline) {
    results = await readResults(page, name);
    if (results.length) return results;
    await page.waitForTimeout(250);
  }
  return results;
}

async function performSearch(current: SearchSession, name: string) {
  await ensureSearchPage(current, name);
  let results: MemberSearchResult[] = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (attempt > 1) {
      await current.page.waitForTimeout(500);
      await waitForNameSearchInput(current.page, name);
    }
    await clickTextAction(current.page, "간편검색", false).catch(() => false);
    results = await waitForResults(current.page, name);
    if (results.length) break;
    await clickTextAction(current.page, "검색", true).catch(() => false);
    results = await waitForResults(current.page, name);
    if (results.length) break;
  }
  scheduleIdleClose(current);
  return results;
}

async function screenshotResultRow(page: Page, query: string, target: MemberSearchResult) {
  const normalizedQuery = normalize(query);
  for (const context of targets(page)) {
    try {
      const marked = await context.evaluate(({ normalizedQuery, target }) => {
        const normalizeText = (value: string) => String(value || "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, "").trim().toLowerCase();
        const normalizeColumn = (value: string) => normalizeText(value).replace(/[()[\]{}:：/\\|ㆍ·.,_-]/g, "");
        const clean = (value: string) => String(value || "").replace(/\s+/g, " ").trim();
        const hasAny = (value: string, words: string[]) => words.some((word) => value.includes(word));
        const targetBirthDigits = target.birthDate.replace(/\D/g, "");
        const targetPhoneDigits = target.phone.replace(/\D/g, "");
        const targetId = target.ch2chId || "";
        document.querySelectorAll("[data-codex-member-proof]").forEach((element) => element.removeAttribute("data-codex-member-proof"));

        let best: { row: HTMLElement; score: number } | null = null;
        for (const table of document.querySelectorAll("table")) {
          const tableRows = Array.from(table.querySelectorAll("tr"));
          const headerIndex = tableRows.findIndex((row) => {
            const text = normalizeColumn(row.textContent || "");
            return text.includes("이름") && hasAny(text, ["생년월일", "생일"]) && hasAny(text, ["휴대폰", "전화"]);
          });
          if (headerIndex < 0) continue;
          for (const row of tableRows.slice(headerIndex + 1)) {
            const text = clean((row as HTMLElement).innerText || row.textContent || "");
            const compact = normalizeText(text);
            if (!compact.includes(normalizedQuery)) continue;
            let score = 1;
            if (targetId && (row as HTMLElement).innerHTML.includes(targetId)) score += 10;
            if (compact.includes(normalizeText(target.name))) score += 5;
            if (targetBirthDigits && text.replace(/\D/g, "").includes(targetBirthDigits)) score += 4;
            if (targetPhoneDigits && text.replace(/\D/g, "").includes(targetPhoneDigits)) score += 4;
            for (const part of target.affiliation.split("/").map((value) => normalizeText(value))) {
              if (part && compact.includes(part)) score += 1;
            }
            if (!best || score > best.score) best = { row: row as HTMLElement, score };
          }
        }
        if (!best) return false;
        best.row.setAttribute("data-codex-member-proof", "1");
        best.row.scrollIntoView({ block: "center", inline: "nearest" });
        return true;
      }, { normalizedQuery, target });
      if (!marked) continue;
      const locator = context.locator('tr[data-codex-member-proof="1"]');
      if ((await locator.count()) !== 1) continue;
      const image = await locator.screenshot({ type: "png" });
      return `data:image/png;base64,${image.toString("base64")}`;
    } catch {}
  }
  const image = await page.screenshot({ type: "png", fullPage: false });
  return `data:image/png;base64,${image.toString("base64")}`;
}

async function searchDirect(name: string) {
  const current = await getSession();
  try {
    return await performSearch(current, name);
  } catch (error) {
    await closeSession();
    throw error;
  }
}

export function getCh2chConnectionStatus() {
  return {
    connected: Boolean(session?.ready && !session.page.isClosed() && session.browser.isConnected())
  };
}

export async function searchCh2chMembers(name: string) {
  const previous = searchQueue;
  let release: () => void = () => undefined;
  searchQueue = new Promise<void>((resolve) => { release = () => resolve(); });
  await previous;
  try {
    const data = await searchDirect(name);
    return { data, connected: getCh2chConnectionStatus().connected };
  } finally {
    release();
  }
}

export async function captureCh2chMemberEvidence(query: string, memberId: string, selectedMember?: MemberSearchResult) {
  const previous = searchQueue;
  let release: () => void = () => undefined;
  searchQueue = new Promise<void>((resolve) => { release = () => resolve(); });
  await previous;
  try {
    const current = await getSession();
    const data = await performSearch(current, query);
    const member = data.find((result) => result.id === memberId) || (selectedMember?.id === memberId ? selectedMember : undefined);
    if (!member) throw new Error("선택한 교인을 CH2CH 검색 결과에서 다시 찾지 못했습니다.");
    const image = await screenshotResultRow(current.page, query, member);
    return {
      image,
      member,
      capturedAt: new Date().toISOString(),
      connected: getCh2chConnectionStatus().connected
    };
  } catch (error) {
    await closeSession();
    throw error;
  } finally {
    release();
  }
}
