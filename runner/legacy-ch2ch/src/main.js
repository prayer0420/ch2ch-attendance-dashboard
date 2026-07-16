import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { chromium } from 'playwright';
import XLSX from 'xlsx';
import { getAffiliationOriginalFamily, getRouteFamilyName, groupRowsByRoute, isSpecialNewcomerGroup, shouldRecheckAttendancePerson } from './family-routing.js';

const CONFIG = {
  url: process.env.CH2CH_URL || 'https://ch2ch.or.kr/login.asp',
  id: process.env.CH2CH_ID || '',
  pw: process.env.CH2CH_PW || '',
  manualLogin: String(process.env.MANUAL_LOGIN || 'false').toLowerCase() === 'true',
  headless: String(process.env.HEADLESS || 'false').toLowerCase() === 'true',
  slowMo: Number(process.env.SLOW_MO || 0),
  actionDelayMs: Number(process.env.ACTION_DELAY_MS || 150),
  familyLoadWaitMs: Number(process.env.FAMILY_LOAD_WAIT_MS || 250),
  familyTextWaitMs: Number(process.env.FAMILY_TEXT_WAIT_MS || 8000),
  dryRun: String(process.env.DRY_RUN || 'true').toLowerCase() === 'true',
  savePerFamily: String(process.env.SAVE_PER_FAMILY || 'true').toLowerCase() === 'true',
  saveMode: String(process.env.SAVE_MODE || 'smart').toLowerCase(), // smart | auto | click | alt-s
  finalRecheckMode: String(process.env.FINAL_RECHECK_MODE || 'fast').toLowerCase(), // fast | all | off
  keepBrowserOpen: String(process.env.KEEP_BROWSER_OPEN || 'true').toLowerCase() === 'true',
  attendanceFile: process.env.ATTENDANCE_FILE || './data/attendance.csv',
  familyOrderFile: process.env.FAMILY_ORDER_FILE || './data/families.json',
  targetGroupText: process.env.TARGET_GROUP_TEXT || '26상',
  targetClassText: process.env.TARGET_CLASS_TEXT || '2026전입반',
  targetDeptText: process.env.TARGET_DEPT_TEXT || '2청년회',
  weeklyAttendanceText: process.env.WEEKLY_ATTENDANCE_TEXT || '출석부(주별)',
  targetWeek: String(process.env.TARGET_WEEK || '').trim(),
  targetWeekText: String(process.env.TARGET_WEEK_TEXT || '').trim(),
  rowCheckboxOffset: Number(process.env.ROW_CHECKBOX_OFFSET || 1),
  loginIdSelector: process.env.LOGIN_ID_SELECTOR || '',
  loginPwSelector: process.env.LOGIN_PW_SELECTOR || '',
  loginButtonSelector: process.env.LOGIN_BUTTON_SELECTOR || '',
  loginIdCandidates: splitCandidates(process.env.LOGIN_ID_CANDIDATES),
  loginPwCandidates: splitCandidates(process.env.LOGIN_PW_CANDIDATES),
  loginButtonCandidates: splitCandidates(process.env.LOGIN_BUTTON_CANDIDATES)
};

const RESULT_FILE = path.resolve('./logs/result.json');
let activeBrowser = null;
let activePage = null;
let saveConfirmationCount = 0;

function recordDialog(message) {
  const text = String(message || '');
  if (/저장|완료|성공/.test(text)) saveConfirmationCount += 1;
  log('브라우저 알림 자동 확인', text);
}

const YES_VALUES = new Set(['o', '○', 'ㅇ', 'y', 'yes', 'true', '1', 'v', '체크', '참석']);
const NO_VALUES = new Set(['x', 'n', 'no', 'false', '0', '해제', '결석', '미출석', '불참']);
const SKIP_VALUES = new Set(['', '-', 'skip', '건너뜀', '유지']);

const keyCandidates = {
  family: ['가족', '가정', '구역', '분류', '가족명', '가족구분'],
  name: ['이름', '성명', '교인명', '이름/성명'],
  sunday: ['주일', '주일체크', '주일출석', '주일 참석', '주일참석'],
  department: ['부서', '부서체크', '부서출석', '부서 참석', '부서참석'],
  note: ['심방기도제목', '결석사유', '메모', '비고', '사유']
};

function splitCandidates(value = '') {
  return value.split(',').map(v => v.trim()).filter(Boolean);
}

function formatLogTime(date = new Date()) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date).replace(/\s+/g, ' ').trim();
}

function log(message, extra = '') {
  const time = formatLogTime();
  const line = `[${time}] ${message}${extra ? ' ' + extra : ''}`;
  console.log(line);
  fs.mkdirSync('./logs', { recursive: true });
  fs.appendFileSync('./logs/run.log', line + '\n');
}

async function safeStep(name, fn, fallback = null) {
  try {
    return await fn();
  } catch (err) {
    log(`실패: ${name}`, err?.message || String(err));
    return fallback;
  }
}

async function requiredStep(name, fn) {
  const result = await fn();
  if (result === false || result === null || result === undefined) {
    throw new Error(`${name} 실패`);
  }
  return result;
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, '').trim();
}

function normalizeMemberName(value) {
  return normalizeText(value).toLowerCase();
}

function memberNameVariants(value) {
  const normalized = normalizeMemberName(value);
  const variants = [normalized];
  const withoutTrailingLetter = normalized.replace(/[a-z]$/, '');
  if (withoutTrailingLetter && withoutTrailingLetter.length >= 2 && withoutTrailingLetter !== normalized) {
    variants.push(withoutTrailingLetter);
  }
  return Array.from(new Set(variants));
}

function normalizeHeader(value) {
  return normalizeText(value).toLowerCase();
}

function pickValue(obj, keys) {
  const normalizedMap = new Map(Object.keys(obj).map(k => [normalizeHeader(k), k]));
  for (const key of keys) {
    const found = normalizedMap.get(normalizeHeader(key));
    if (found !== undefined) return obj[found];
  }
  return '';
}

function parseCheckValue(value) {
  const raw = normalizeText(value).toLowerCase();
  if (SKIP_VALUES.has(raw)) return null;
  if (YES_VALUES.has(raw)) return true;
  if (NO_VALUES.has(raw)) return false;
  return null;
}

function readAttendanceRows(filePath) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`출석 파일이 없습니다: ${fullPath}`);
  }

  const ext = path.extname(fullPath).toLowerCase();
  let workbook;

  if (ext === '.csv' || ext === '.tsv') {
    const text = fs.readFileSync(fullPath, 'utf8').replace(/^\uFEFF/, '');
    workbook = XLSX.read(text, { type: 'string', cellDates: false, raw: false });
  } else {
    workbook = XLSX.readFile(fullPath, { cellDates: false });
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  log(`출석 파일 읽음: ${path.basename(fullPath)}`, `행=${rawRows.length}`);
  if (rawRows[0]) log('출석 파일 헤더 감지:', Object.keys(rawRows[0]).join(', '));

  const rows = rawRows.map((r, idx) => {
    const family = String(pickValue(r, keyCandidates.family) ?? '').trim();
    const name = String(pickValue(r, keyCandidates.name) ?? '').trim();
    return {
      sourceRow: idx + 2,
      family,
      name,
      sunday: parseCheckValue(pickValue(r, keyCandidates.sunday)),
      department: parseCheckValue(pickValue(r, keyCandidates.department)),
      note: String(pickValue(r, keyCandidates.note) ?? '').trim()
    };
  }).filter(r => r.family && r.name && !isIgnoredFamilyLabel(r.family));

  if (rows.length === 0) {
    throw new Error('출석 파일에서 가족/이름이 있는 행을 찾지 못했습니다. 헤더를 가족, 이름, 주일, 부서 형태로 맞춰주세요.');
  }

  return rows;
}

function groupByFamily(rows) {
  return groupRowsByRoute(rows, readFamilyOrder());
}

function isIgnoredFamilyLabel(value) {
  return normalizeText(value).includes('방문자');
}

function conciseFailureReason(reason) {
  const text = String(reason || '처리 실패').replace(/\s+/g, ' ').trim();
  if (!text) return '처리 실패';
  if (text.includes('검색 보정 성공')) return '검색 보정 성공';
  if (text.includes('필요 작업')) return text.slice(0, 120);
  if (text.includes('가족 탭 클릭 실패')) return '가족 탭 없음';
  if (text.includes('가족 화면 로딩 실패')) return '가족 화면 로딩 실패';
  if (text.includes('이름 행 찾기 실패')) return '이름 없음';
  if (text.includes('체크박스')) return '체크박스 처리 실패';
  if (text.includes('저장')) return '저장 실패';
  return text.split('화면 후보=')[0].split('후보=')[0].slice(0, 80);
}

function logFamilyResult(result) {
  const people = result.people || [];
  const failedPeople = people.filter(person => !person.ok);
  const failureText = ` / 실패 ${failedPeople.length}명`;
  const saveText = result.saved === false ? ' / 저장 실패' : '';
  log('가족 1차 처리', `${result.familyName}: 화면 확인 ${result.success || 0}명 / 주일 ${result.expectedSunday || 0}명 / 부서 ${result.expectedDepartment || 0}명${failureText}${saveText}`);
}

function readFamilyOrder() {
  const fullPath = path.resolve(CONFIG.familyOrderFile);
  if (!fs.existsSync(fullPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function allContexts(page) {
  return [page, ...page.frames()];
}

async function shortDelay(ms = CONFIG.actionDelayMs) {
  if (ms > 0) await new Promise(resolve => setTimeout(resolve, ms));
}

async function scrollAllContainers(page, position = 'start') {
  const ratio = position === 'end' ? 1 : 0;
  for (const ctx of allContexts(page)) {
    try {
      await ctx.evaluate((ratio) => {
        const nodes = [document.scrollingElement, document.documentElement, document.body, ...document.querySelectorAll('*')].filter(Boolean);
        for (const node of nodes) {
          if (node.scrollWidth > node.clientWidth) node.scrollLeft = Math.round((node.scrollWidth - node.clientWidth) * ratio);
          if (node.scrollHeight > node.clientHeight && ratio === 0) node.scrollTop = 0;
        }
      }, ratio);
    } catch (_) {}
  }
}

async function firstVisibleLocatorInAnyFrame(page, selectors, timeoutMs = 600) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const selector of list.filter(Boolean)) {
    for (const ctx of allContexts(page)) {
      try {
        const locator = ctx.locator(selector).first();
        await locator.waitFor({ state: 'visible', timeout: timeoutMs });
        return { locator, selector, frameUrl: ctx.url?.() || 'main-page', ctx };
      } catch (_) {}
    }
  }
  return null;
}

async function clickTextInAnyFrame(page, text, exact = false, timeoutMs = 1200, allowScrollRetry = true) {
  const target = normalizeText(text);

  for (const ctx of allContexts(page)) {
    try {
      const locator = ctx.getByText(text, { exact }).first();
      await locator.waitFor({ state: 'visible', timeout: Math.min(timeoutMs, 800) });
      await locator.click({ timeout: timeoutMs });
      await shortDelay();
      return true;
    } catch (_) {}
  }

  // getByText가 실패하면 DOM 텍스트를 직접 비교해서 클릭합니다. 구형 ASP 화면에서 더 안정적입니다.
  for (const ctx of allContexts(page)) {
    try {
      const clicked = await ctx.evaluate((args) => {
        const target = args.target;
        const exact = args.exact;
        const normalize = (v) => String(v || '').replace(/\s+/g, '').trim();
        const isVisible = (el) => {
          if (!el || !el.getClientRects || el.getClientRects().length === 0) return false;
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) !== 0 && rect.width > 0 && rect.height > 0;
        };
        const candidates = Array.from(document.querySelectorAll('button,a,input[type="button"],input[type="submit"],[role="button"],[onclick],span,div,td,th'))
          .filter(isVisible)
          .map((node) => {
            const text = normalize(node.innerText || node.textContent || node.value || '');
            const clickable = node.closest('button,a,input[type="button"],input[type="submit"],[role="button"],[onclick]') || node;
            const rect = clickable.getBoundingClientRect();
            const tag = clickable.tagName.toLowerCase();
            const buttonLike = /button|a|input/.test(tag) || clickable.hasAttribute('onclick') || clickable.getAttribute('role') === 'button' || /btn|button/i.test(clickable.className || '');
            return { node, clickable, text, area: rect.width * rect.height, buttonLike };
          })
          .filter((item) => {
            if (!item.text) return false;
            return exact ? item.text === target : item.text.includes(target);
          })
          .sort((a, b) => {
            if (a.buttonLike !== b.buttonLike) return a.buttonLike ? -1 : 1;
            return a.area - b.area;
          });
        const el = candidates[0]?.clickable;
        if (!el) return false;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        el.click();
        return true;
      }, { target, exact });
      if (clicked) {
        await shortDelay();
        return true;
      }
    } catch (_) {}
  }

  if (allowScrollRetry) {
    for (const position of ['start', 'end']) {
      await scrollAllContainers(page, position);
      await shortDelay(200);
      if (await clickTextInAnyFrame(page, text, exact, timeoutMs, false)) return true;
    }
  }

  return false;
}

async function clickNavigationTextInAnyFrame(page, text, exact = true, timeoutMs = 2200) {
  const target = normalizeText(text);
  for (const ctx of allContexts(page)) {
    try {
      const clicked = await ctx.evaluate(({ target, exact }) => {
        const normalize = (value) => String(value || '').replace(/\s+/g, '').trim();
        const isVisible = (element) => {
          if (!element?.getClientRects || element.getClientRects().length === 0) return false;
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) !== 0 && rect.width > 0 && rect.height > 0;
        };
        const candidates = Array.from(document.querySelectorAll('button,a,input[type="button"],input[type="submit"],[role="button"],[onclick]'))
          .filter(isVisible)
          .map((element) => {
            const value = normalize(element.innerText || element.textContent || element.value || element.title || element.getAttribute('aria-label') || '');
            const rect = element.getBoundingClientRect();
            return { element, value, area: rect.width * rect.height };
          })
          .filter((item) => exact ? item.value === target : item.value.includes(target))
          .sort((a, b) => a.area - b.area);
        if (!candidates.length) return false;
        const element = candidates[0].element;
        element.scrollIntoView({ block: 'center', inline: 'center' });
        element.click();
        return true;
      }, { target, exact });
      if (clicked) {
        await shortDelay(450);
        return true;
      }
    } catch (_) {}
  }

  return await clickTextInAnyFrame(page, text, exact, timeoutMs);
}

async function clickExactSaveButton(page, label = '') {
  // "저장후 이동"이 아니라 오른쪽 아래의 "저장 (Alt+S)" / "저장" 버튼만 아주 좁게 찾아서 클릭합니다.
  // 구형 ASP 화면은 button이 아니라 a/span/div + onclick 조합일 수 있어서 후보를 넓게 잡습니다.
  for (const ctx of allContexts(page)) {
    try {
      const result = await ctx.evaluate(() => {
        const normalize = (v) => String(v || '').replace(/\s+/g, '').trim();
        const textOf = (el) => normalize(
          el.innerText ||
          el.textContent ||
          el.value ||
          el.title ||
          el.getAttribute('aria-label') ||
          el.getAttribute('alt') ||
          ''
        );
        const isVisible = (el) => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0;
        };
        const isRealSaveText = (text) => {
          const t = normalize(text).toLowerCase();
          if (!t) return false;
          // 반드시 "저장"으로 시작해야 함. "저장후 이동", "저장후이동"은 제외.
          if (!t.startsWith('저장')) return false;
          if (t.includes('저장후') || t.includes('이동') || t.includes('일괄')) return false;
          // 허용: 저장 / 저장(Alt+S) / 저장(ALT+S) / 저장[Alt+S]
          return t === '저장' || t.startsWith('저장(') || t.startsWith('저장[') || t.includes('alt+s');
        };
        const raw = Array.from(document.querySelectorAll([
          'button',
          'a',
          'input[type="button"]',
          'input[type="submit"]',
          '[onclick]',
          '[role="button"]',
          '.btn',
          '.button',
          'span',
          'div'
        ].join(',')));

        const candidates = raw
          .filter(isVisible)
          .map(el => {
            const clickable = el.closest('button,a,input[type="button"],input[type="submit"],[onclick],[role="button"]') || el;
            const rect = clickable.getBoundingClientRect();
            return { el: clickable, text: textOf(el) || textOf(clickable), x: rect.left, y: rect.top, w: rect.width, h: rect.height };
          })
          .filter((item, idx, arr) => item.el && isVisible(item.el) && isRealSaveText(item.text))
          .filter((item, idx, arr) => arr.findIndex(v => v.el === item.el) === idx)
          .sort((a, b) => {
            // Alt+S 표시가 있는 버튼 우선, 그 다음 화면에서 더 아래/오른쪽에 있는 버튼 우선
            const aa = String(a.text).toLowerCase().includes('alt+s') ? 1 : 0;
            const bb = String(b.text).toLowerCase().includes('alt+s') ? 1 : 0;
            if (aa !== bb) return bb - aa;
            if (a.y !== b.y) return b.y - a.y;
            return b.x - a.x;
          });

        if (candidates.length === 0) {
          const visibleSaveLike = raw
            .filter(isVisible)
            .map(el => textOf(el))
            .filter(t => t.includes('저장'))
            .slice(0, 10);
          return { ok: false, reason: 'candidate-not-found', visibleSaveLike };
        }

        const target = candidates[0].el;
        const text = candidates[0].text;
        target.scrollIntoView({ block: 'center', inline: 'center' });
        if (typeof target.focus === 'function') target.focus();

        // 일부 구형 페이지는 단순 el.click()보다 마우스 이벤트 순서가 필요합니다.
        const eventInit = { bubbles: true, cancelable: true, view: window };
        for (const type of ['mouseover', 'mousemove', 'mousedown', 'mouseup', 'click']) {
          target.dispatchEvent(new MouseEvent(type, eventInit));
        }
        if (typeof target.click === 'function') target.click();
        return { ok: true, text };
      });

      if (result?.ok) {
        return true;
      }
    } catch (_) {}
  }
  return false;
}

async function pressAltSInEveryFrame(page, label = '') {
  let attempted = false;

  // 1) 실제 키 입력: 각 프레임의 body를 focus한 뒤 Alt+S.
  for (const ctx of allContexts(page)) {
    try {
      await ctx.locator('body').first().click({ position: { x: 5, y: 5 }, timeout: 500, force: true }).catch(() => {});
      await page.keyboard.down('Alt');
      await page.keyboard.press('KeyS');
      await page.keyboard.up('Alt');
      attempted = true;
      await shortDelay(250);
    } catch (err) {
      try { await page.keyboard.up('Alt'); } catch (_) {}
    }
  }

  // 2) 구형 ASP/IE식 keyCode 핸들러 대응: keydown/keypress/keyup 이벤트를 DOM에 직접 발생.
  for (const ctx of allContexts(page)) {
    try {
      const dispatched = await ctx.evaluate(() => {
        const fire = (target, type) => {
          const ev = new KeyboardEvent(type, {
            key: 's',
            code: 'KeyS',
            altKey: true,
            bubbles: true,
            cancelable: true
          });
          // legacy handler가 keyCode / which를 보는 경우 대응
          try { Object.defineProperty(ev, 'keyCode', { get: () => 83 }); } catch (_) {}
          try { Object.defineProperty(ev, 'which', { get: () => 83 }); } catch (_) {}
          return target.dispatchEvent(ev);
        };
        const targets = [window, document, document.body].filter(Boolean);
        for (const t of targets) {
          for (const type of ['keydown', 'keypress', 'keyup']) fire(t, type);
        }
        return true;
      });
      if (dispatched) {
        attempted = true;
        await shortDelay(250);
      }
    } catch (_) {}
  }

  return attempted;
}

async function saveCurrentPage(page, label = '') {
  if (CONFIG.dryRun) {
    return { attempted: true, verified: false };
  }

  let saved = false;
  const mode = CONFIG.saveMode;
  const confirmationBefore = saveConfirmationCount;

  // 동일 페이지에서 저장 버튼과 Alt+S를 연달아 실행하면 중복 저장될 수 있습니다.
  // 한 가지 방법이 실패했을 때만 다른 방법을 사용합니다.
  if (mode === 'click') {
    saved = await clickExactSaveButton(page, label);
  } else if (mode === 'alt-s') {
    saved = await pressAltSInEveryFrame(page, label);
  } else { // auto, smart, 기타 값 모두 가장 안전한 전체 전략
    saved = await clickExactSaveButton(page, label);
    if (!saved) saved = await pressAltSInEveryFrame(page, label);
  }

  await shortDelay(900);
  const verified = saveConfirmationCount > confirmationBefore;

  return { attempted: saved, verified };
}

async function login(page) {
  if (CONFIG.manualLogin) {
    const rl = readline.createInterface({ input, output });
    console.log('\n브라우저에서 직접 로그인까지 완료한 뒤, 이 터미널에서 Enter를 누르세요.');
    await rl.question('로그인 완료 후 Enter > ');
    rl.close();
    await shortDelay(500);
    return true;
  }

  if (!CONFIG.id || !CONFIG.pw) {
    log('CH2CH_ID 또는 CH2CH_PW가 비어 있습니다. .env에 아이디/비밀번호를 넣거나 MANUAL_LOGIN=true로 바꾸세요.');
    return false;
  }

  const idSelectors = CONFIG.loginIdSelector ? [CONFIG.loginIdSelector] : CONFIG.loginIdCandidates;
  const pwSelectors = CONFIG.loginPwSelector ? [CONFIG.loginPwSelector] : CONFIG.loginPwCandidates;
  const btnSelectors = CONFIG.loginButtonSelector ? [CONFIG.loginButtonSelector] : CONFIG.loginButtonCandidates;

  let idFound = await firstVisibleLocatorInAnyFrame(page, idSelectors, 900);
  let pwFound = await firstVisibleLocatorInAnyFrame(page, pwSelectors, 900);

  // 로그인 페이지 셀렉터가 애매할 때: 보이는 password input과 그 직전 text input을 자동으로 잡습니다.
  if (!pwFound || !idFound) {
    for (const ctx of allContexts(page)) {
      try {
        const found = await ctx.evaluateHandle(() => {
          const isVisible = (el) => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          };
          const inputs = Array.from(document.querySelectorAll('input')).filter(isVisible);
          const pw = inputs.find(el => String(el.type || '').toLowerCase() === 'password');
          const idCandidates = inputs.filter(el => String(el.type || 'text').toLowerCase() !== 'password' && !['button', 'submit', 'hidden', 'checkbox', 'radio'].includes(String(el.type || '').toLowerCase()));
          const id = idCandidates[idCandidates.length - 1] || null;
          return { id, pw };
        });
        const props = await found.getProperties();
        const idHandle = props.get('id');
        const pwHandle = props.get('pw');
        const idEl = idHandle ? idHandle.asElement() : null;
        const pwEl = pwHandle ? pwHandle.asElement() : null;
        if (idEl && pwEl) {
          idFound = { locator: ctx.locator('input').filter({ has: idEl }).first(), ctx, selector: 'auto-input-id' };
          pwFound = { locator: ctx.locator('input[type="password"]').first(), ctx, selector: 'auto-input-password' };
          // locator.filter({has: ElementHandle})는 Playwright에서 맞지 않을 수 있어 아래 fallback을 사용합니다.
          await idEl.fill(CONFIG.id);
          await pwEl.fill(CONFIG.pw);
          log('아이디/비밀번호 입력 완료', 'auto-input-fallback');
          const btnFound = await firstVisibleLocatorInAnyFrame(page, btnSelectors, 900);
          if (btnFound) await btnFound.locator.click();
          else await pwEl.press('Enter');
          log('로그인 버튼 클릭 완료');
          await shortDelay(1000);
          return true;
        }
      } catch (_) {}
    }
  }

  if (!idFound || !pwFound) {
    log('로그인 입력칸을 못 찾았습니다. .env의 LOGIN_ID_SELECTOR / LOGIN_PW_SELECTOR를 직접 지정하세요.');
    return false;
  }

  await idFound.locator.fill(CONFIG.id);
  await pwFound.locator.fill(CONFIG.pw);
  log('아이디/비밀번호 입력 완료');

  const btnFound = await firstVisibleLocatorInAnyFrame(page, btnSelectors, 900);
  if (btnFound) {
    await btnFound.locator.click();
    log('로그인 버튼 클릭 완료', `selector=${btnFound.selector}`);
  } else {
    log('로그인 버튼을 못 찾아서 Enter로 로그인 시도');
    await pwFound.locator.press('Enter');
  }

  await shortDelay(1000);
  return true;
}

async function navigateToWeeklyAttendance(page) {
  if (!(await clickTextInAnyFrame(page, '교인관리', false, 1500))) return false;
  if (CONFIG.targetDeptText && !(await clickTextInAnyFrame(page, CONFIG.targetDeptText, false, 1500))) return false;
  if (CONFIG.targetClassText && !(await clickTextInAnyFrame(page, CONFIG.targetClassText, true, 2000))) return false;
  await shortDelay(500);
  if (CONFIG.targetGroupText && !(await clickTextInAnyFrame(page, CONFIG.targetGroupText, true, 1500))) return false;
  await shortDelay(500);
  if (!(await clickTextInAnyFrame(page, CONFIG.weeklyAttendanceText, false, 1500))) return false;
  await shortDelay(500);
  return true;
}

async function navigateToNewcomerAttendance(page, groupName, expectedRows = []) {
  const routeGroupName = getRouteFamilyName(groupName);
  const steps = [
    ['교인관리', false, 2200],
    [CONFIG.targetDeptText, false, 2400],
    [CONFIG.targetClassText, true, 2800],
    ['새가족', true, 2800],
    [routeGroupName, true, 2800],
    [CONFIG.weeklyAttendanceText, false, 3200]
  ].filter(([label]) => Boolean(label));

  for (const [label, exact, timeoutMs] of steps) {
    if (!(await clickNavigationTextInAnyFrame(page, label, exact, timeoutMs))) {
      log('새가족 출석부 이동 실패', `${routeGroupName}: '${label}' 버튼을 찾지 못했습니다.`);
      return false;
    }
    await shortDelay(label === '새가족' || label === routeGroupName || label === CONFIG.weeklyAttendanceText ? 900 : 450);
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (await selectAttendanceWeek(page, { logFailure: false })) {
        const minimumMatches = Math.min(3, expectedRows.length);
        if (!minimumMatches || await waitForFamilyMemberText(page, routeGroupName, expectedRows, minimumMatches)) {
          return true;
        }
        log('새가족 화면 확인 실패', `${routeGroupName}: 주차는 선택됐지만 대상 이름이 ${minimumMatches}명 이상 보이지 않습니다.`);
        break;
      }
      await shortDelay(500);
    }
    if (attempt < 3) {
      log('새가족 출석부 현재 화면 재시도', `${routeGroupName}: 출석부(주별) ${attempt}/2`);
      await clickNavigationTextInAnyFrame(page, CONFIG.weeklyAttendanceText, false, 3200).catch(() => false);
      await shortDelay(900);
    }
  }
  log('새가족 출석부 이동 실패', `${routeGroupName}: ${getTargetWeekLabel()} 주차가 있는 출석부 화면을 열지 못했습니다.`);
  return false;
}

function getTargetWeekLabel() {
  if (CONFIG.targetWeekText) return CONFIG.targetWeekText;
  if (CONFIG.targetWeek) return `${CONFIG.targetWeek}주`;
  return '';
}

async function selectAttendanceWeek(page, options = {}) {
  const logFailure = options.logFailure !== false;
  const targetLabel = getTargetWeekLabel();
  if (!targetLabel) {
    log('주차 선택 건너뜀', 'TARGET_WEEK/TARGET_WEEK_TEXT가 비어 있음');
    return true;
  }
  const normalizedTarget = normalizeText(targetLabel);

  for (const ctx of allContexts(page)) {
    try {
      const selects = ctx.locator('select');
      const selectCount = await selects.count();
      for (let i = 0; i < selectCount; i++) {
        const select = selects.nth(i);
        if (!(await select.isVisible().catch(() => false))) continue;
        const options = await select.locator('option').evaluateAll(opts => opts.map(opt => ({
          text: opt.textContent || '',
          value: opt.getAttribute('value') || ''
        })));
        const targetWeekNumber = Number(CONFIG.targetWeek);
        const found = options.find(opt => {
          const normalizedText = normalizeText(opt.text || '');
          if (normalizedText === normalizedTarget) return true;
          if (!Number.isInteger(targetWeekNumber)) return false;
          const optionWeekMatch = normalizedText.match(/(?:^|\D)(\d{1,2})\s*주(?:차)?(?:\D|$)/);
          return Number(optionWeekMatch?.[1]) === targetWeekNumber;
        });
        if (!found) continue;
        if (found.value) await select.selectOption(found.value);
        else await select.selectOption({ label: found.text });
        const verificationDeadline = Date.now() + 4000;
        let selectedText = '';
        while (Date.now() < verificationDeadline) {
          selectedText = await select.locator('option:checked').textContent().catch(() => '');
          if (normalizeText(selectedText || '') === normalizeText(found.text)) {
            log('주차 선택 완료', `${targetLabel} -> ${found.text}`);
            return true;
          }
          await shortDelay(250);
        }
        if (logFailure) log('주차 선택 검증 실패', `요청=${found.text}, 실제=${selectedText || '확인 불가'}`);
        return false;
      }
    } catch (_) {}
  }
  if (logFailure) log('주차 선택 실패', `${targetLabel} 옵션을 찾지 못했습니다.`);
  return false;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findMemberRow(page, name) {
  const variants = memberNameVariants(name);

  // 셀에서 추출한 이름 텍스트를 정확히 비교합니다. 접두어 유사 매칭은 사용하지 않습니다.
  for (const ctx of allContexts(page)) {
    try {
      const handle = await ctx.evaluateHandle((variants) => {
        const normalize = (v) => String(v || '').replace(/\s+/g, '').trim().toLowerCase();
        const base = (v) => normalize(v).replace(/[a-z]$/, '');
        const tokens = (v) => String(v || '').match(/[가-힣]{2,5}[A-Za-z]?/g)?.map(normalize) || [];
        const isVisible = (el) => {
          if (!el || !el.getClientRects || el.getClientRects().length === 0) return false;
          const style = window.getComputedStyle(el);
          return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) !== 0;
        };
        const rows = Array.from(document.querySelectorAll('tr')).filter((tr) =>
          isVisible(tr) && Array.from(tr.querySelectorAll('input[type="checkbox"]')).some(isVisible)
        );
        const candidates = rows.map((tr) => {
          const cellTokens = Array.from(tr.querySelectorAll('td,th')).flatMap((cell) => tokens(cell.innerText || cell.textContent));
          const formValues = Array.from(tr.querySelectorAll('input,select,textarea')).map((element) => `${element.name || ''}:${element.value || ''}`).join('|');
          return {
            tr,
            cellTokens,
            signature: `${normalize(tr.innerText || tr.textContent || '')}|${normalize(formValues)}`
          };
        }).filter((item) => item.cellTokens.length > 0);
        const chooseUnique = (matches, mode) => {
          if (matches.length === 1) return { row: matches[0].tr, mode, text: matches[0].cellTokens.join('/') };
          if (matches.length > 1 && new Set(matches.map((item) => item.signature)).size === 1) {
            return { row: matches[0].tr, mode: `${mode}-duplicate-view`, text: matches[0].cellTokens.join('/') };
          }
          return null;
        };

        const primaryExact = candidates.filter((item) => item.cellTokens.includes(variants[0]));
        const exactChoice = chooseUnique(primaryExact, 'exact');
        if (exactChoice) return exactChoice;

        const targetBases = new Set(variants.map(base).filter(Boolean));
        const baseMatches = candidates.filter((item) => item.cellTokens.some((token) => targetBases.has(base(token))));
        const baseChoice = chooseUnique(baseMatches, 'unique-base');
        if (baseChoice) return baseChoice;
        return { row: null, mode: baseMatches.length > 1 ? 'ambiguous' : 'not-found', text: '' };
      }, variants);
      const properties = await handle.getProperties();
      const rowHandle = properties.get('row')?.asElement() || null;
      const mode = await properties.get('mode')?.jsonValue().catch(() => 'unknown');
      const matchedText = await properties.get('text')?.jsonValue().catch(() => '');
      if (rowHandle) {
        return { rowHandle, ctx, matchMode: mode, matchedText };
      }
      if (mode === 'ambiguous') log('이름 텍스트 후보가 여러 명이라 처리하지 않음', name);
    } catch (_) {}
  }
  return null;
}

async function readVisibleMemberTexts(page, expected = []) {
  const visible = new Set();
  let matched = 0;
  for (const ctx of allContexts(page)) {
    try {
      const result = await ctx.evaluate(({ expected }) => {
        const normalize = (v) => String(v || '').replace(/\s+/g, '').trim().toLowerCase();
        const base = (v) => normalize(v).replace(/[a-z]$/, '');
        const expectedExact = new Set(expected.map(normalize));
        const expectedBase = new Set(expected.map(base));
        const names = [];
        let count = 0;
        const isVisible = (el) => {
          if (!el || !el.getClientRects || el.getClientRects().length === 0) return false;
          const style = window.getComputedStyle(el);
          return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) !== 0;
        };
        for (const tr of document.querySelectorAll('tr')) {
          if (!isVisible(tr) || !Array.from(tr.querySelectorAll('input[type="checkbox"]')).some(isVisible)) continue;
          const tokens = Array.from(tr.querySelectorAll('td,th'))
            .flatMap((cell) => String(cell.innerText || cell.textContent || '').match(/[가-힣]{2,5}[A-Za-z]?/g) || [])
            .map(normalize);
          names.push(...tokens);
          if (tokens.some((token) => expectedExact.has(token) || expectedBase.has(base(token)))) count += 1;
        }
        return { names: Array.from(new Set(names)).slice(0, 60), matched: count };
      }, { expected });
      result.names.forEach((value) => visible.add(value));
      matched += result.matched;
    } catch (_) {}
  }
  return { names: Array.from(visible).slice(0, 60), matched };
}

async function waitForFamilyMemberText(page, familyName, rows, minimumMatches = 1) {
  const expected = Array.from(new Set(rows.flatMap((row) => memberNameVariants(row.name))));
  const deadline = Date.now() + CONFIG.familyTextWaitMs;
  let lastVisible = [];
  while (Date.now() < deadline) {
    const current = await readVisibleMemberTexts(page, expected);
    lastVisible = current.names;
    if (current.matched >= minimumMatches) {
      return true;
    }
    await shortDelay(250);
  }
  return false;
}

async function accessCheckboxInRow(found, fieldName, desired = null, checkboxIndex = 0, shouldSet = false) {
  if (found.rowHandle) {
    const result = await found.rowHandle.evaluate((tr, args) => {
      const normalize = (v) => String(v || '').replace(/\s+/g, '').trim().toLowerCase();
      const aliases = args.fieldName === '주일'
        ? ['주일', '주일출석', '1-3부', '1~3부', '1부', '2부', '3부']
        : ['부서', '부서출석', '4부'];
      const isVisible = (el) => {
        if (!el || !el.getClientRects || el.getClientRects().length === 0) return false;
        const style = window.getComputedStyle(el);
        return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) !== 0;
      };
      const boxes = Array.from(tr.querySelectorAll('input[type="checkbox"]')).filter(isVisible);
      const table = tr.closest('table');
      const rowCells = Array.from(tr.cells || []);
      const headerRows = table ? Array.from(table.querySelectorAll('tr')).filter((row) => row !== tr) : [];
      const candidates = boxes.map((box, index) => {
        const cell = box.closest('td,th');
        const cellIndex = rowCells.indexOf(cell);
        const label = box.id ? document.querySelector(`label[for="${CSS.escape(box.id)}"]`) : null;
        const rawIdentity = [
          box.name,
          box.id,
          box.title,
          box.getAttribute('aria-label'),
          label?.innerText,
          cell?.innerText
        ].filter(Boolean).join(' ');
        const headerTexts = cellIndex >= 0
          ? headerRows.map((row) => row.cells?.[cellIndex]?.innerText || row.cells?.[cellIndex]?.textContent || '')
          : [];
        const text = normalize([
          rawIdentity,
          ...headerTexts
        ].filter(Boolean).join(' '));
        return { box, index, text, rawIdentity: normalize(rawIdentity), cellIndex };
      });
      const matched = candidates.filter((candidate) => aliases.some((alias) => candidate.text.includes(normalize(alias))));
      const rolePattern = args.fieldName === '주일' ? /presence[_-]?a|presencea/ : /presence[_-]?b|presenceb/;
      const roleMatches = candidates.filter((candidate) => rolePattern.test(candidate.rawIdentity) || rolePattern.test(candidate.text));
      const matchedRole = matched.filter((candidate) => rolePattern.test(candidate.rawIdentity) || rolePattern.test(candidate.text));
      const fallbackIndex = boxes.length >= 3
        ? (args.fieldName === '주일' ? 1 : 2)
        : (args.fieldName === '주일' ? 0 : 1);
      const fallback = candidates[fallbackIndex] || null;
      const chosen = matchedRole.length === 1
        ? matchedRole[0]
        : roleMatches.length === 1
          ? roleMatches[0]
          : matched.length === 1
            ? matched[0]
            : fallback;
      if (!chosen) {
        return {
          ok: false,
          count: boxes.length,
          matched: matched.length,
          candidates: candidates.map((candidate) => `${candidate.index}:${candidate.text || '(텍스트없음)'}`).slice(0, 12)
        };
      }
      const box = chosen.box;
      const before = Boolean(box.checked);
      if (args.shouldSet && box.checked !== args.desired) {
        box.scrollIntoView({ block: 'center', inline: 'center' });
        box.click();
        box.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const after = Boolean(box.checked);
      return {
        ok: args.shouldSet ? after === args.desired : true,
        actual: after,
        before,
        count: boxes.length,
        matchedText: chosen.text || `순서 fallback ${chosen.index}`
      };
    }, { fieldName, desired, shouldSet });
    if (!result.ok) {
      const reason = `${fieldName} 체크박스 처리 실패`;
      return { ok: false, reason };
    }
    return result;
  }

  const targetIndex = CONFIG.rowCheckboxOffset + checkboxIndex;
  const boxes = found.row.locator('input[type="checkbox"]');
  const count = await boxes.count();
  if (count <= targetIndex) {
    const reason = `${fieldName} 체크박스 처리 실패`;
    return { ok: false, reason };
  }
  const box = boxes.nth(targetIndex);
  const before = await box.isChecked({ timeout: 700 }).catch(() => false);
  if (shouldSet) {
    if (desired) await box.check({ force: true, timeout: 700 });
    else await box.uncheck({ force: true, timeout: 700 });
  }
  const actual = await box.isChecked({ timeout: 700 }).catch(() => before);
  return { ok: shouldSet ? actual === desired : true, actual, before };
}

async function setCheckboxInRow(found, rowInfo, fieldName, desired, checkboxIndex) {
  if (desired === null) {
    return { ok: true, skipped: true };
  }

  if (CONFIG.dryRun) {
    const read = await accessCheckboxInRow(found, fieldName, desired, checkboxIndex, false);
    return read.ok ? { ...read, dryRun: true } : read;
  }

  return await accessCheckboxInRow(found, fieldName, desired, checkboxIndex, true);
}

async function readWebAttendanceState(found) {
  const sunday = await accessCheckboxInRow(found, '주일', null, 0, false);
  const department = await accessCheckboxInRow(found, '부서', null, 1, false);
  if (!sunday.ok || !department.ok) {
    return {
      ok: false,
      reason: [sunday.reason, department.reason].filter(Boolean).join(' / ') || '웹교적 체크박스 상태 읽기 실패'
    };
  }
  return {
    ok: true,
    sunday: Boolean(sunday.actual),
    department: Boolean(department.actual)
  };
}

function boolText(value) {
  return value ? '체크' : '해제';
}

function targetActionText(rowInfo) {
  const parts = [];
  if (rowInfo.sunday === true) parts.push('주일 체크');
  if (rowInfo.sunday === false) parts.push('주일 해제');
  if (rowInfo.department === true) parts.push('부서 체크');
  if (rowInfo.department === false) parts.push('부서 해제');
  return parts.length ? `필요 작업: ${parts.join(', ')}` : '필요 작업: 없음';
}

function attendanceMismatchReason(rowInfo, state, prefix = '대조 실패') {
  const parts = [];
  if (state.sunday !== rowInfo.sunday) {
    parts.push(`주일 웹교적=${boolText(state.sunday)} 시트=${boolText(rowInfo.sunday)}`);
  }
  if (state.department !== rowInfo.department) {
    parts.push(`부서 웹교적=${boolText(state.department)} 시트=${boolText(rowInfo.department)}`);
  }
  return `${prefix}: ${parts.join(', ')}`;
}

function attendanceStateMatches(rowInfo, state) {
  return state.ok && state.sunday === rowInfo.sunday && state.department === rowInfo.department;
}

function sourceRowKey(family, name) {
  return `${normalizeMemberName(family)}::${normalizeMemberName(name)}`;
}

function buildSourceRowLookup(rows) {
  const byFamilyAndName = new Map();
  const byName = new Map();
  for (const row of rows) {
    byFamilyAndName.set(sourceRowKey(row.family, row.name), row);
    const nameKey = normalizeMemberName(row.name);
    if (!byName.has(nameKey)) byName.set(nameKey, []);
    byName.get(nameKey).push(row);
  }
  return { byFamilyAndName, byName };
}

function findSourceRow(lookup, person, fallbackFamilyName = '') {
  const exact = lookup.byFamilyAndName.get(sourceRowKey(person.family, person.name));
  if (exact) return exact;
  const fallback = lookup.byFamilyAndName.get(sourceRowKey(fallbackFamilyName, person.name));
  if (fallback) return fallback;
  const sameNameRows = lookup.byName.get(normalizeMemberName(person.name)) || [];
  return sameNameRows.length === 1 ? sameNameRows[0] : null;
}

function recalculateFamilyResult(result) {
  const people = result.people || [];
  result.success = people.filter((person) => person.ok).length;
  result.failed = people.length - result.success;
  return result;
}

async function verifyOrFixAttendanceState(found, rowInfo, prefix = '최종 재검사') {
  const before = await readWebAttendanceState(found);
  if (!before.ok) {
    return { ok: false, changed: false, reason: `${prefix} 실패: ${before.reason}. ${targetActionText(rowInfo)}` };
  }
  if (attendanceStateMatches(rowInfo, before)) {
    return { ok: true, changed: false, state: before };
  }
  if (CONFIG.dryRun) {
    return {
      ok: false,
      changed: false,
      reason: attendanceMismatchReason(rowInfo, before, `${prefix} 불일치`)
    };
  }

  const sundayResult = await setCheckboxInRow(found, rowInfo, '주일', rowInfo.sunday, 0);
  const departmentResult = await setCheckboxInRow(found, rowInfo, '부서', rowInfo.department, 1);
  if (!sundayResult.ok || !departmentResult.ok) {
    const reason = [sundayResult.reason, departmentResult.reason].filter(Boolean).join(' / ') || '체크박스 재처리 실패';
    return { ok: false, changed: true, reason: `${prefix} 보정 실패: ${reason}. ${targetActionText(rowInfo)}` };
  }

  const after = await readWebAttendanceState(found);
  if (!attendanceStateMatches(rowInfo, after)) {
    return {
      ok: false,
      changed: true,
      reason: after.ok
        ? attendanceMismatchReason(rowInfo, after, `${prefix} 보정 후 불일치`)
        : `${prefix} 보정 후 읽기 실패: ${after.reason}. ${targetActionText(rowInfo)}`
    };
  }
  return { ok: true, changed: true, state: after };
}

async function extractFamilyFromFoundRow(found, fallback = '') {
  const familyPattern = /[가-힣]{2,8}(?:이네|네|반|팀)/g;
  const knownFamilies = [...readFamilyOrder(), '새가족반', '새가족팀']
    .filter(Boolean)
    .sort((a, b) => String(b).length - String(a).length);
  try {
    const text = found.rowHandle
      ? await found.rowHandle.evaluate((tr) => {
          const values = Array.from(tr.querySelectorAll('input,select,textarea,[data-family],[data-group],[title]')).flatMap((element) => [
            element.value,
            element.getAttribute('data-family'),
            element.getAttribute('data-group'),
            element.getAttribute('title'),
            element.tagName === 'SELECT' ? element.options?.[element.selectedIndex]?.textContent : ''
          ]).filter(Boolean);
          return [tr.innerText, tr.textContent, ...values].filter(Boolean).join(' ');
        })
      : await found.row.evaluate((tr) => {
          const values = Array.from(tr.querySelectorAll('input,select,textarea,[data-family],[data-group],[title]')).flatMap((element) => [
            element.value,
            element.getAttribute('data-family'),
            element.getAttribute('data-group'),
            element.getAttribute('title'),
            element.tagName === 'SELECT' ? element.options?.[element.selectedIndex]?.textContent : ''
          ]).filter(Boolean);
          return [tr.innerText, tr.textContent, ...values].filter(Boolean).join(' ');
        });
    const knownFromRow = knownFamilies.find((family) => family && String(text || '').includes(family));
    if (knownFromRow) return knownFromRow;
    const matches = String(text || '').match(familyPattern) || [];
    const familyLike = matches.find((value) => /이네|네$/.test(value)) || matches[0];
    if (familyLike) return familyLike;
    return fallback || '';
  } catch (_) {
    return fallback || '';
  }
}

async function fillMemberSearchInput(page, name) {
  for (const ctx of allContexts(page)) {
    try {
      const handle = await ctx.evaluateHandle((name) => {
        const isVisible = (el) => {
          if (!el || !el.getClientRects || el.getClientRects().length === 0) return false;
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) !== 0 && rect.width > 40 && rect.height > 12;
        };
        const inputs = Array.from(document.querySelectorAll('input,textarea')).filter((el) => {
          const type = String(el.getAttribute('type') || 'text').toLowerCase();
          if (['hidden', 'checkbox', 'radio', 'button', 'submit', 'image', 'file'].includes(type)) return false;
          if (!isVisible(el)) return false;
          const rect = el.getBoundingClientRect();
          const text = `${el.getAttribute('placeholder') || ''} ${el.getAttribute('name') || ''} ${el.id || ''} ${el.getAttribute('aria-label') || ''}`;
          const nearText = el.closest('td,th,div,li,label')?.innerText || '';
          const score =
            (/이름|성명|초성|name/i.test(text) ? 4 : 0) +
            (/이름|성명|초성/.test(nearText) ? 3 : 0) +
            (rect.top < Math.max(360, window.innerHeight * 0.45) ? 2 : 0) +
            (rect.width > 80 ? 1 : 0);
          return score > 0;
        }).map((el) => {
          const rect = el.getBoundingClientRect();
          const text = `${el.getAttribute('placeholder') || ''} ${el.getAttribute('name') || ''} ${el.id || ''} ${el.getAttribute('aria-label') || ''}`;
          const nearText = el.closest('td,th,div,li,label')?.innerText || '';
          const score =
            (/이름|성명|초성|name/i.test(text) ? 4 : 0) +
            (/이름|성명|초성/.test(nearText) ? 3 : 0) +
            (rect.top < Math.max(360, window.innerHeight * 0.45) ? 2 : 0) +
            (rect.width > 80 ? 1 : 0);
          return { el, score, top: rect.top };
        }).sort((a, b) => b.score - a.score || a.top - b.top);
        const selected = inputs[0]?.el || null;
        if (!selected) return null;
        selected.focus();
        selected.value = name;
        selected.dispatchEvent(new Event('input', { bubbles: true }));
        selected.dispatchEvent(new Event('change', { bubbles: true }));
        return selected;
      }, name);
      const input = handle.asElement();
      if (input) {
        await input.press('Enter').catch(() => {});
        return true;
      }
    } catch (_) {}
  }
  return false;
}

async function searchMemberRowGlobally(page, rowInfo, originalFamily) {
  const searched = await fillMemberSearchInput(page, rowInfo.name);
  if (!searched) {
    return { found: null, reason: `검색 보정 실패: '${rowInfo.name}' 이름 검색칸을 찾지 못했습니다. ${targetActionText(rowInfo)}` };
  }

  await clickTextInAnyFrame(page, '간편검색', false, 1200).catch(() => false);
  await shortDelay(1200);

  let found = await findMemberRow(page, rowInfo.name);
  if (!found) {
    await clickTextInAnyFrame(page, '검색', false, 1200).catch(() => false);
    await shortDelay(1200);
    found = await findMemberRow(page, rowInfo.name);
  }

  if (!found) {
    return { found: null, reason: `검색 보정 실패: 시트 ${rowInfo.sourceRow || '?'}행 '${rowInfo.name}'을 '${originalFamily}'에서도, CH2CH 이름 검색에서도 찾지 못했습니다. ${targetActionText(rowInfo)}` };
  }

  const webFamily = await extractFamilyFromFoundRow(found, '');
  const foundFamily = webFamily || getRouteFamilyName(originalFamily);
  return {
    found,
    foundFamily,
    foundLocation: webFamily && foundFamily !== originalFamily
      ? `${foundFamily} (시트 가족: ${originalFamily})`
      : webFamily
        ? foundFamily
        : `${foundFamily} (검색 결과에 소속 미표시, 시트 기준 재시도)`
  };
}

function affiliationRouteName(foundFamily, originalFamily) {
  const family = String(foundFamily || '').trim();
  if (family) return getRouteFamilyName(family);
  return getRouteFamilyName(originalFamily);
}

function buildAffiliationBatchKey(foundFamily, originalFamily) {
  return affiliationRouteName(foundFamily, originalFamily) || getRouteFamilyName(originalFamily) || '미확인';
}

function collectFailedAffiliationItems(results, rows) {
  const lookup = buildSourceRowLookup(rows);
  const items = [];
  for (const result of results) {
    for (const person of result.people || []) {
      if (person.ok) continue;
      const rowInfo = findSourceRow(lookup, person, result.familyName);
      if (!rowInfo) {
        person.reason = `소속 확인 실패: '${person.name}'의 원본 시트 행을 찾지 못했습니다.`;
        continue;
      }
      items.push({ result, person, rowInfo, originalFamily: result.familyName });
    }
  }
  return items;
}

async function resolveAffiliationItems(page, items, label = '실패자 소속 확인') {
  const resolved = [];
  let notFound = 0;

  for (const item of items) {
    if (isSpecialNewcomerGroup(item.originalFamily)) {
      const routeFamily = getRouteFamilyName(item.originalFamily);
      Object.assign(item.person, {
        foundFamily: routeFamily,
        foundLocation: routeFamily,
        affiliationResolved: true,
        affiliationRouteFamily: routeFamily,
        reason: `새가족 소속 고정: ${routeFamily}. ${targetActionText(item.rowInfo)}`
      });
      resolved.push({ ...item, routeFamily, foundFamily: routeFamily, foundLocation: routeFamily });
      continue;
    }

    const search = await searchMemberRowGlobally(page, item.rowInfo, item.originalFamily);
    if (!search.found) {
      item.person.ok = false;
      item.person.reason = search.reason;
      item.person.affiliationResolved = false;
      notFound += 1;
      continue;
    }

    if (!search.foundFamily) {
      item.person.ok = false;
      item.person.reason = `소속 확인 실패: '${item.rowInfo.name}' 검색 결과에서 가족/반/팀 소속을 읽지 못했습니다. 자동 체크하지 않았습니다. ${targetActionText(item.rowInfo)}`;
      item.person.foundLocation = search.foundLocation;
      item.person.affiliationResolved = false;
      notFound += 1;
      continue;
    }

    const routeFamily = buildAffiliationBatchKey(search.foundFamily, item.originalFamily);
    Object.assign(item.person, {
      foundFamily: search.foundFamily || routeFamily,
      foundLocation: search.foundLocation || routeFamily,
      affiliationResolved: true,
      affiliationRouteFamily: routeFamily,
      reason: `소속 확인 완료: ${search.foundLocation || routeFamily}. ${targetActionText(item.rowInfo)}`
    });
    resolved.push({ ...item, routeFamily, foundFamily: search.foundFamily || routeFamily, foundLocation: search.foundLocation || routeFamily });
  }

  log(label, `확인 ${resolved.length}명 / 미발견 ${notFound}명`);
  return resolved;
}

async function processAffiliationBatches(page, items, label = '실패자 재시도') {
  if (!items.length) return { resolved: 0, verified: 0, corrected: 0, failed: 0, families: 0 };

  for (const item of items) {
    item.originalFamily = getAffiliationOriginalFamily(item);
  }

  const resolved = await resolveAffiliationItems(page, items, `${label} - 소속 확인`);
  const batches = new Map();
  for (const item of resolved) {
    const key = item.routeFamily;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(item);
  }

  let corrected = 0;
  let verified = 0;
  let failed = items.length - resolved.length;

  for (const [routeFamily, batch] of batches.entries()) {
    const expectedRows = batch.map((item) => item.rowInfo);
    const opened = await safeStep(`${label}: ${routeFamily} 이동`, () => openFamilyAttendanceForRecheck(page, routeFamily, expectedRows), false);
    if (!opened) {
      for (const item of batch) {
        item.person.ok = false;
        item.person.reason = `실패자 재시도 실패: '${routeFamily}' 출석부로 이동하지 못했습니다. ${targetActionText(item.rowInfo)}`;
      }
      failed += batch.length;
      continue;
    }

    const minimumMatches = Math.min(2, expectedRows.length);
    const routeReady = await waitForFamilyMemberText(page, routeFamily, expectedRows, minimumMatches).catch(() => false);
    if (!routeReady) {
      for (const item of batch) {
        item.person.ok = false;
        item.person.reason = `실패자 재시도 실패: '${routeFamily}' 화면은 열렸지만 대상 이름을 확인하지 못했습니다. ${targetActionText(item.rowInfo)}`;
      }
      failed += batch.length;
      log(`${label} 결과`, `${routeFamily}: 대상 ${batch.length}명 / 확인 0명 / 수정 0명 / 실패 ${batch.length}명`);
      continue;
    }
    const changedItems = [];

    for (const item of batch) {
      const found = await findMemberRow(page, item.rowInfo.name);
      if (!found) {
        item.person.ok = false;
        item.person.reason = `실패자 재시도 실패: '${item.rowInfo.name}'을 '${routeFamily}' 출석부에서 찾지 못했습니다. ${targetActionText(item.rowInfo)}`;
        failed += 1;
        continue;
      }

      const audit = await verifyOrFixAttendanceState(found, item.rowInfo, '실패자 재시도');
      if (!audit.ok) {
        item.person.ok = false;
        item.person.reason = audit.reason;
        failed += 1;
        continue;
      }

      await setNoteInRow(found, item.rowInfo);
      Object.assign(item.person, {
        ok: true,
        reason: null,
        fallbackSearch: true,
        affiliationBatch: true,
        foundFamily: item.foundFamily,
        foundLocation: item.foundLocation,
        saveAttempted: audit.changed && CONFIG.savePerFamily ? null : true,
        saveVerified: audit.changed && CONFIG.savePerFamily ? null : true
      });
      if (audit.changed) {
        changedItems.push(item);
      } else {
        verified += 1;
      }
    }

    if (changedItems.length && CONFIG.savePerFamily && !CONFIG.dryRun) {
      const saved = await saveCurrentPage(page, `${label} ${routeFamily}`);
      for (const item of changedItems) {
        item.person.saveAttempted = saved.attempted;
        item.person.saveVerified = false;
        if (!saved.attempted) {
          item.person.ok = false;
          item.person.reason = `실패자 재시도 저장 실패: ${routeFamily}`;
        }
      }

      if (saved.attempted) {
        const confirmationRows = changedItems.map((item) => item.rowInfo);
        const reopened = await safeStep(`${label}: ${routeFamily} 저장 후 확인`, () => openFamilyAttendanceForRecheck(page, routeFamily, confirmationRows), false);
        for (const item of changedItems) {
          if (!reopened) {
            item.person.ok = false;
            item.person.reason = `실패자 재시도 저장 확인 실패: '${routeFamily}' 출석부를 다시 열지 못했습니다.`;
            continue;
          }
          const found = await findMemberRow(page, item.rowInfo.name);
          const state = found ? await readWebAttendanceState(found) : { ok: false, reason: '이름 행 없음' };
          if (!found || !attendanceStateMatches(item.rowInfo, state)) {
            item.person.ok = false;
            item.person.reason = found && state.ok
              ? attendanceMismatchReason(item.rowInfo, state, '실패자 재시도 저장 후 불일치')
              : `실패자 재시도 저장 확인 실패: '${item.rowInfo.name}' 상태를 다시 읽지 못했습니다.`;
            continue;
          }
          item.person.ok = true;
          item.person.reason = null;
          item.person.saveVerified = true;
          verified += 1;
          corrected += 1;
        }
      }
    }

    const relocated = batch.filter((item) => item.person.ok && getRouteFamilyName(item.originalFamily) !== routeFamily);
    if (relocated.length) {
      log('소속 변경 확인', `${routeFamily}: ${relocated.map((item) => `${item.rowInfo.name}(${item.originalFamily} -> ${routeFamily})`).join(', ')}`);
    }
    log(`${label} 결과`, `${routeFamily}: 대상 ${batch.length}명 / 최종 확인 ${batch.filter((item) => item.person.ok).length}명 / 저장 후 수정 확인 ${changedItems.filter((item) => item.person.ok).length}명 / 실패 ${batch.filter((item) => !item.person.ok).length}명`);
  }

  for (const item of items) {
    recalculateFamilyResult(item.result);
  }

  verified = items.filter((item) => item.person.ok).length;
  failed = items.length - verified;
  return { resolved: resolved.length, verified, corrected, failed, families: batches.size };
}

async function processSearchCorrection(page, rowInfo, originalFamily) {
  try {
    const search = await searchMemberRowGlobally(page, rowInfo, originalFamily);
    if (!search.found) {
      return {
        family: rowInfo.family,
        name: rowInfo.name,
        ok: false,
        reason: search.reason,
        fallbackSearch: true
      };
    }

    const before = await readWebAttendanceState(search.found);
    if (!before.ok) {
      return {
        family: rowInfo.family,
        name: rowInfo.name,
        ok: false,
        reason: `검색 보정 대조 실패: ${before.reason}. ${targetActionText(rowInfo)}`,
        fallbackSearch: true,
        foundFamily: search.foundFamily,
        foundLocation: search.foundLocation
      };
    }

    if (CONFIG.dryRun) {
      return {
        family: rowInfo.family,
        name: rowInfo.name,
        ok: true,
        reason: null,
        fallbackSearch: true,
        foundFamily: search.foundFamily,
        foundLocation: search.foundLocation,
        saveAttempted: false,
        saveVerified: false
      };
    }

    const sundayResult = await setCheckboxInRow(search.found, rowInfo, '주일', rowInfo.sunday, 0);
    const departmentResult = await setCheckboxInRow(search.found, rowInfo, '부서', rowInfo.department, 1);
    if (!sundayResult.ok || !departmentResult.ok) {
      const reason = [sundayResult.reason, departmentResult.reason].filter(Boolean).join(' / ') || '출석 체크박스 처리 실패';
      return {
        family: rowInfo.family,
        name: rowInfo.name,
        ok: false,
        reason: `검색 보정 실패: ${reason}. ${targetActionText(rowInfo)}`,
        fallbackSearch: true,
        foundFamily: search.foundFamily,
        foundLocation: search.foundLocation
      };
    }

    const finalState = await readWebAttendanceState(search.found);
    if (!attendanceStateMatches(rowInfo, finalState)) {
      return {
        family: rowInfo.family,
        name: rowInfo.name,
        ok: false,
        reason: attendanceMismatchReason(rowInfo, finalState, `검색 보정 최종 대조 실패 (${targetActionText(rowInfo)})`),
        fallbackSearch: true,
        foundFamily: search.foundFamily,
        foundLocation: search.foundLocation
      };
    }

    await setNoteInRow(search.found, rowInfo);
    const saved = CONFIG.savePerFamily
      ? await saveCurrentPage(page, `검색 보정 ${rowInfo.name}`)
      : { attempted: true, verified: false };

    if (CONFIG.savePerFamily && !saved.attempted) {
      return {
        family: rowInfo.family,
        name: rowInfo.name,
        ok: false,
        reason: `검색 보정 저장 실패: ${targetActionText(rowInfo)}`,
        fallbackSearch: true,
        foundFamily: search.foundFamily,
        foundLocation: search.foundLocation,
        saveAttempted: false,
        saveVerified: false
      };
    }

    log('검색 보정 성공', `${rowInfo.name}: 시트 가족 ${originalFamily}, 처리 위치 ${search.foundLocation || '검색 결과'}, ${targetActionText(rowInfo)}`);
    return {
      family: rowInfo.family,
      name: rowInfo.name,
      ok: true,
      reason: null,
      fallbackSearch: true,
      foundFamily: search.foundFamily,
      foundLocation: search.foundLocation,
      saveAttempted: saved.attempted,
      saveVerified: saved.verified
    };
  } catch (err) {
    return {
      family: rowInfo.family,
      name: rowInfo.name,
      ok: false,
      reason: `검색 보정 오류: ${err?.message || String(err)}. ${targetActionText(rowInfo)}`,
      fallbackSearch: true
    };
  }
}

async function setNoteInRow(found, rowInfo) {
  if (!rowInfo.note) return;
  if (CONFIG.dryRun) {
    return;
  }

  if (found.rowHandle) {
    const ok = await found.rowHandle.evaluate((tr, note) => {
      const input = tr.querySelector('input[type="text"], textarea');
      if (!input) return false;
      input.value = note;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, rowInfo.note);
    return;
  }

  const inputBox = found.row.locator('input[type="text"], textarea').first();
  const count = await found.row.locator('input[type="text"], textarea').count().catch(() => 0);
  if (count < 1) return;
  await inputBox.fill(rowInfo.note, { timeout: 700 });
}

async function processFamily(page, familyName, rows, options = {}) {
  const expectedSunday = rows.filter(row => row.sunday === true).length;
  const expectedDepartment = rows.filter(row => row.department === true).length;
  const clickFamilyTab = options.clickFamilyTab !== false;
  if (clickFamilyTab && !(await clickTextInAnyFrame(page, familyName, true, 1500))) {
    const reason = `가족 탭 클릭 실패: CH2CH 화면에서 '${familyName}' 버튼/탭을 찾지 못했습니다. 시트 가족명과 CH2CH 탭 이름이 다르거나 해당 가족 탭이 현재 분류에 없을 수 있습니다.`;
    return {
      familyName,
      expectedSunday,
      expectedDepartment,
      success: 0,
      failed: rows.length,
      saved: false,
      saveVerified: false,
      people: rows.map(row => ({ family: row.family, name: row.name, ok: false, reason }))
    };
  }

  await shortDelay(CONFIG.familyLoadWaitMs);
  const familyReady = await waitForFamilyMemberText(page, familyName, rows);
  if (!familyReady) {
    log('가족 화면 대조 경고', `'${familyName}'에서 시트 대상 이름이 바로 보이지 않아 이름 검색 보정을 함께 시도합니다.`);
  }

  let success = 0;
  let failed = 0;
  const people = [];
  const preparedRows = [];
  const searchRetryRows = [];
  let finalMismatchCount = 0;

  for (const rowInfo of rows) {
    try {
      const found = await findMemberRow(page, rowInfo.name);
      if (!found) {
        searchRetryRows.push(rowInfo);
        continue;
      }
      const currentState = await readWebAttendanceState(found);
      if (!currentState.ok) {
        failed += 1;
        const reason = `실행 전 대조 실패: ${currentState.reason}. ${targetActionText(rowInfo)}`;
        people.push({ family: rowInfo.family, name: rowInfo.name, ok: false, reason });
        continue;
      }
      preparedRows.push({ rowInfo, found, before: currentState });
    } catch (err) {
      failed += 1;
      const reason = err?.message || String(err);
      people.push({ family: rowInfo.family, name: rowInfo.name, ok: false, reason });
    }
  }

  for (const item of preparedRows) {
    const { rowInfo, found } = item;
    try {
      if (CONFIG.dryRun) {
        success += 1;
        people.push({ family: rowInfo.family, name: rowInfo.name, ok: true, reason: null });
        continue;
      }
      const sundayResult = await setCheckboxInRow(found, rowInfo, '주일', rowInfo.sunday, 0);
      const departmentResult = await setCheckboxInRow(found, rowInfo, '부서', rowInfo.department, 1);
      if (!sundayResult.ok || !departmentResult.ok) {
        failed += 1;
        const reason = [sundayResult.reason, departmentResult.reason].filter(Boolean).join(' / ') || '출석 체크박스 처리 실패';
        people.push({ family: rowInfo.family, name: rowInfo.name, ok: false, reason: `${reason}. ${targetActionText(rowInfo)}` });
        continue;
      }
      const finalState = await readWebAttendanceState(found);
      if (!attendanceStateMatches(rowInfo, finalState)) {
        failed += 1;
        finalMismatchCount += 1;
        const reason = finalState.ok
          ? attendanceMismatchReason(rowInfo, finalState, '저장 전 최종 대조 실패')
          : `저장 전 최종 대조 실패: ${finalState.reason}`;
        people.push({ family: rowInfo.family, name: rowInfo.name, ok: false, reason });
        continue;
      }
      await setNoteInRow(found, rowInfo);
      success += 1;
      people.push({ family: rowInfo.family, name: rowInfo.name, ok: true, reason: null });
    } catch (err) {
      failed += 1;
      const reason = err?.message || String(err);
      people.push({ family: rowInfo.family, name: rowInfo.name, ok: false, reason });
    }
  }

  let saved = { attempted: true, verified: CONFIG.dryRun };
  if (CONFIG.savePerFamily && preparedRows.length > 0) {
    saved = finalMismatchCount > 0
      ? { attempted: false, verified: false }
      : await saveCurrentPage(page, familyName);
  } else if (CONFIG.savePerFamily) {
    saved = { attempted: true, verified: CONFIG.dryRun };
  }

  for (const rowInfo of searchRetryRows) {
    failed += 1;
    people.push({
      family: rowInfo.family,
      name: rowInfo.name,
      ok: false,
      reason: `소속 확인 대기: 시트 ${rowInfo.sourceRow || '?'}행 '${rowInfo.name}'을 '${familyName}' 화면에서 찾지 못했습니다. ${targetActionText(rowInfo)}`,
      pendingAffiliationLookup: true
    });
  }

  return {
    familyName,
    expectedSunday,
    expectedDepartment,
    success,
    failed,
    saved: saved.attempted,
    saveVerified: saved.verified,
    people
  };
}

async function openFamilyAttendanceForRecheck(page, familyName, expectedRows = []) {
  if (isSpecialNewcomerGroup(familyName)) {
    return await navigateToNewcomerAttendance(page, getRouteFamilyName(familyName), expectedRows);
  }
  if (!(await navigateToWeeklyAttendance(page))) return false;
  if (!(await selectAttendanceWeek(page))) return false;
  await shortDelay(CONFIG.familyLoadWaitMs);
  return await clickTextInAnyFrame(page, familyName, true, 1500);
}

function markPersonFromAudit(person, auditResult, result, wasOk) {
  person.ok = true;
  person.reason = null;
  person.finalRecheck = true;
  person.foundLocation = person.foundLocation || result.familyName;
  person.saveAttempted = result.saved;
  person.saveVerified = result.saveVerified;
  if (!wasOk || auditResult.changed) {
    person.finalRecheckCorrected = true;
  }
}

async function finalRecheckResults(page, results, rows) {
  if (CONFIG.finalRecheckMode === 'off') {
    const stillFailed = results.reduce((sum, result) => sum + (result.people || []).filter((person) => !person.ok).length, 0);
    log('최종 재검사 건너뜀', `FINAL_RECHECK_MODE=off / 현재 실패 ${stillFailed}명`);
    return { checked: 0, corrected: 0, recovered: 0, stillFailed, missingSource: 0, skipped: true };
  }

  const lookup = buildSourceRowLookup(rows);
  const summary = {
    checked: 0,
    corrected: 0,
    recovered: 0,
    stillFailed: 0,
    missingSource: 0
  };
  const searchQueue = [];
  const shouldRecheckPerson = (person) => shouldRecheckAttendancePerson(person, CONFIG.finalRecheckMode);

  const initialSuccess = results.reduce((sum, result) => sum + (result.people || []).filter((person) => person.ok).length, 0);
  const initialFailed = results.reduce((sum, result) => sum + (result.people || []).filter((person) => !person.ok).length, 0);
  const targetCount = results.reduce((sum, result) => sum + (result.people || []).filter(shouldRecheckPerson).length, 0);
  const modeLabel = CONFIG.finalRecheckMode === 'all' ? '전체' : '실패만';
  log('최종 재검사 시작', `모드 ${modeLabel} / 대상 ${targetCount}명 / 성공 ${initialSuccess}명 / 실패 ${initialFailed}명`);

  for (const result of results) {
    const allPeople = result.people || [];
    const people = allPeople.filter(shouldRecheckPerson);
    if (!people.length) continue;
    const resultRows = people
      .map((person) => findSourceRow(lookup, person, result.familyName))
      .filter(Boolean);
    const opened = await safeStep(`최종 재검사 가족 이동: ${result.familyName}`, () => openFamilyAttendanceForRecheck(page, result.familyName, resultRows), false);

    if (!opened) {
      for (const person of people) {
        const rowInfo = findSourceRow(lookup, person, result.familyName);
        if (rowInfo) searchQueue.push({ result, person, rowInfo, originalFamily: result.familyName });
        else {
          person.ok = false;
          person.reason = `최종 재검사 실패: '${person.name}'의 원본 시트 행을 찾지 못했습니다.`;
          summary.missingSource += 1;
        }
      }
      recalculateFamilyResult(result);
      continue;
    }

    if (resultRows.length) {
      await waitForFamilyMemberText(page, result.familyName, resultRows).catch(() => false);
    }

    let familyChanged = false;
    const changedPeople = [];
    for (const person of people) {
      const wasOk = Boolean(person.ok);
      const rowInfo = findSourceRow(lookup, person, result.familyName);
      if (!rowInfo) {
        person.ok = false;
        person.reason = `최종 재검사 실패: '${person.name}'의 원본 시트 행을 찾지 못했습니다.`;
        summary.missingSource += 1;
        continue;
      }

      const found = await findMemberRow(page, rowInfo.name);
      if (!found) {
        searchQueue.push({ result, person, rowInfo, originalFamily: result.familyName });
        continue;
      }

      summary.checked += 1;
      const audit = await verifyOrFixAttendanceState(found, rowInfo, '최종 재검사');
      if (audit.ok) {
        markPersonFromAudit(person, audit, result, wasOk);
        if (!wasOk) summary.recovered += 1;
        if (audit.changed) {
          summary.corrected += 1;
          familyChanged = true;
          changedPeople.push(person);
        }
      } else {
        person.ok = false;
        person.reason = audit.reason;
      }
    }

    if (familyChanged && !CONFIG.dryRun) {
      const saved = await saveCurrentPage(page, `최종 재검사 ${result.familyName}`);
      result.saved = saved.attempted;
      result.saveVerified = saved.verified;
      for (const person of changedPeople) {
        person.saveAttempted = saved.attempted;
        person.saveVerified = saved.verified;
      }
      if (!saved.attempted) {
        for (const person of changedPeople) {
          person.ok = false;
          person.reason = `최종 재검사 저장 실패: ${targetActionText(findSourceRow(lookup, person, result.familyName) || {})}`;
        }
      }
    }
    recalculateFamilyResult(result);
  }

  if (searchQueue.length) {
    const beforeFailed = searchQueue.filter((item) => !item.person.ok).length;
    const batchSummary = await processAffiliationBatches(page, searchQueue, '최종 실패자 재시도');
    const afterFailed = searchQueue.filter((item) => !item.person.ok).length;
    summary.checked += batchSummary.resolved;
    summary.corrected += batchSummary.corrected;
    summary.recovered += Math.max(0, beforeFailed - afterFailed);
    for (const item of searchQueue) {
      item.person.finalRecheck = true;
      if (item.person.ok) item.person.finalRecheckCorrected = true;
      recalculateFamilyResult(item.result);
    }
  }

  summary.stillFailed = results.reduce((sum, result) => sum + (result.people || []).filter((person) => !person.ok).length, 0);
  log('최종 재검사 완료', `검사 ${summary.checked}명 / 보정 ${summary.corrected}명 / 실패 회복 ${summary.recovered}명 / 최종 실패 ${summary.stillFailed}명`);
  return summary;
}

async function finalSave(page) {
  if (CONFIG.savePerFamily) return;
  await saveCurrentPage(page, '최종 저장');
}

async function waitForeverWithMessage() {
  console.log('\n작업 끝. 브라우저는 닫지 않습니다. 닫으려면 터미널에서 Ctrl + C 누르세요.');
  await new Promise(() => {});
}

async function main() {
  fs.mkdirSync('./logs', { recursive: true });
  fs.writeFileSync('./logs/run.log', '');
  fs.writeFileSync(RESULT_FILE, JSON.stringify({ completed: false, families: [] }, null, 2));

  const rows = readAttendanceRows(CONFIG.attendanceFile);
  const grouped = groupByFamily(rows);

  log('출석 파일 로드 완료', `총 ${rows.length}명 / 가족 ${grouped.length}개`);
  log('실행 모드', CONFIG.dryRun ? 'DRY_RUN=true 미리보기, 실제 저장 안 함' : 'DRY_RUN=false 실제 체크/저장');
  log('저장 방식', `SAVE_PER_FAMILY=${CONFIG.savePerFamily}, SAVE_MODE=${CONFIG.saveMode}`);

  const browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo
  });
  activeBrowser = browser;

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1700, height: 950 },
    acceptDownloads: false
  });

  pageDialogAutoAccept(context);

  const page = await context.newPage();
  activePage = page;

  await requiredStep('사이트 접속', async () => {
    await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await shortDelay(400);
    return true;
  });

  await requiredStep('로그인', () => login(page));
  await requiredStep('출석부 화면 이동', () => navigateToWeeklyAttendance(page));

  const weekSelected = await requiredStep('주차 선택', () => selectAttendanceWeek(page));

  const results = [];
  const normalGroups = grouped.filter((item) => !isSpecialNewcomerGroup(item.family));
  const specialOrder = ['새가족반', '새가족팀'];
  const newcomerGroups = grouped
    .filter((item) => isSpecialNewcomerGroup(item.family))
    .sort((a, b) => specialOrder.indexOf(a.family) - specialOrder.indexOf(b.family));

  for (const item of normalGroups) {
    const result = await safeStep(`가족 처리: ${item.family}`, () => processFamily(page, item.family, item.rows), {
      familyName: item.family,
      expectedSunday: item.rows.filter(row => row.sunday === true).length,
      expectedDepartment: item.rows.filter(row => row.department === true).length,
      success: 0,
      failed: item.rows.length,
      saved: false,
      saveVerified: false,
      people: item.rows.map(row => ({ family: row.family, name: row.name, ok: false, reason: '가족 처리 중 오류' }))
    });
    logFamilyResult(result);
    results.push(result);
  }

  for (const item of newcomerGroups) {
    const navigated = await safeStep(`새가족 분류 이동: ${item.family}`, () => navigateToNewcomerAttendance(page, item.family, item.rows), false);
    if (!navigated) {
      const result = {
        familyName: item.family,
        expectedSunday: item.rows.filter(row => row.sunday === true).length,
        expectedDepartment: item.rows.filter(row => row.department === true).length,
        success: 0,
        failed: item.rows.length,
        saved: false,
        saveVerified: false,
        people: item.rows.map(row => ({ family: row.family, name: row.name, ok: false, reason: `새가족 > ${item.family} > 출석부(주별) 이동 실패` }))
      };
      logFamilyResult(result);
      results.push(result);
      continue;
    }

    const result = await safeStep(`새가족 처리: ${item.family}`, () => processFamily(page, item.family, item.rows, { clickFamilyTab: false }), {
      familyName: item.family,
      expectedSunday: item.rows.filter(row => row.sunday === true).length,
      expectedDepartment: item.rows.filter(row => row.department === true).length,
      success: 0,
      failed: item.rows.length,
      saved: false,
      saveVerified: false,
      people: item.rows.map(row => ({ family: row.family, name: row.name, ok: false, reason: '새가족 처리 중 오류' }))
    });
    logFamilyResult(result);
    results.push(result);
  }

  const affiliationCorrection = await processAffiliationBatches(
    page,
    collectFailedAffiliationItems(results, rows),
    '실패자 재시도'
  );
  const finalRecheck = await finalRecheckResults(page, results, rows);

  let finalSave = { attempted: true, verified: CONFIG.dryRun };
  if (!CONFIG.savePerFamily) {
    finalSave = await saveCurrentPage(page, '최종 저장');
  }

  const summary = results.map(r => `${r.familyName}: 주일 ${r.expectedSunday ?? 0}명, 부서 ${r.expectedDepartment ?? 0}명, 실패 ${r.failed}명`).join(' / ');
  log('최종 가족별 요약', summary);
  fs.writeFileSync(RESULT_FILE, JSON.stringify({
    completed: true,
    dryRun: CONFIG.dryRun,
    weekSelected,
    affiliationCorrection,
    finalRecheck,
    finalSaved: finalSave.attempted,
    finalSaveVerified: finalSave.verified,
    families: results
  }, null, 2));

  if (CONFIG.keepBrowserOpen) {
    await waitForeverWithMessage();
  } else {
    log('자동화 종료. 브라우저를 닫습니다.');
    await browser.close();
    activeBrowser = null;
    activePage = null;
  }
}

function pageDialogAutoAccept(context) {
  context.on('page', page => {
    page.on('dialog', async dialog => {
      recordDialog(dialog.message());
      await dialog.accept().catch(() => {});
    });
    page.on('download', async download => {
      log('다운로드 발생 - 자동 취소', await download.suggestedFilename().catch(() => 'unknown'));
      await download.cancel().catch(() => {});
    });
  });
}

main().catch(async err => {
  log('전체 실행 중 처리되지 않은 오류', err?.message || String(err));
  if (activePage) {
    await activePage.screenshot({ path: './logs/failure.png', fullPage: true }).catch(() => {});
  }
  if (activeBrowser) {
    await activeBrowser.close().catch(() => {});
  }
  fs.mkdirSync('./logs', { recursive: true });
  fs.writeFileSync(RESULT_FILE, JSON.stringify({
    completed: false,
    error: err?.message || String(err),
    families: []
  }, null, 2));
  process.exitCode = 1;
});
