import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { chromium } from 'playwright';
import XLSX from 'xlsx';

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

function log(message, extra = '') {
  const time = new Date().toISOString();
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
  }).filter(r => r.family && r.name);

  if (rows.length === 0) {
    throw new Error('출석 파일에서 가족/이름이 있는 행을 찾지 못했습니다. 헤더를 가족, 이름, 주일, 부서 형태로 맞춰주세요.');
  }

  return rows;
}

function groupByFamily(rows) {
  const order = readFamilyOrder();
  const map = new Map();
  for (const row of rows) {
    const routeFamily = getRouteFamilyName(row.family);
    if (!map.has(routeFamily)) map.set(routeFamily, []);
    map.get(routeFamily).push(row);
  }

  const familyNames = Array.from(map.keys()).sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return familyNames.map(name => ({ family: name, rows: map.get(name) }));
}

function conciseFailureReason(reason) {
  const text = String(reason || '처리 실패').replace(/\s+/g, ' ').trim();
  if (!text) return '처리 실패';
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
  const failureText = failedPeople.length
    ? ` / 실패 ${failedPeople.length}명: ${failedPeople.map(person => `${person.name}(${conciseFailureReason(person.reason)})`).join(', ')}`
    : ' / 실패 0명';
  const saveText = result.saved === false ? ' / 저장 실패' : '';
  log('가족 결과', `${result.familyName}: 성공 ${result.success || 0}명, 주일 ${result.expectedSunday || 0}명, 부서 ${result.expectedDepartment || 0}명${failureText}${saveText}`);
}

function getRouteFamilyName(familyName) {
  const normalized = normalizeText(familyName);
  if (normalized.startsWith('새가족반')) return '새가족반';
  if (normalized.startsWith('새가족팀')) return '새가족팀';
  return String(familyName || '').trim();
}

function isSpecialNewcomerGroup(familyName) {
  return familyName === '새가족반' || familyName === '새가족팀';
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

async function navigateToNewcomerAttendance(page, groupName) {
  if (CONFIG.targetDeptText) await clickTextInAnyFrame(page, CONFIG.targetDeptText, false, 1500);
  if (CONFIG.targetClassText) await clickTextInAnyFrame(page, CONFIG.targetClassText, true, 2000);
  await shortDelay(500);
  if (!(await clickTextInAnyFrame(page, '새가족', true, 2000))) return false;
  await shortDelay(800);
  if (!(await clickTextInAnyFrame(page, groupName, true, 2000))) return false;
  await shortDelay(500);
  if (!(await clickTextInAnyFrame(page, CONFIG.weeklyAttendanceText, false, 2000))) return false;
  await shortDelay(500);
  return await selectAttendanceWeek(page);
}

function getTargetWeekLabel() {
  if (CONFIG.targetWeekText) return CONFIG.targetWeekText;
  if (CONFIG.targetWeek) return `${CONFIG.targetWeek}주`;
  return '';
}

async function selectAttendanceWeek(page) {
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
        await shortDelay(500);
        const selectedText = await select.locator('option:checked').textContent().catch(() => '');
        const normalizedSelected = normalizeText(selectedText || '');
        if (normalizedSelected !== normalizeText(found.text)) {
          log('주차 선택 검증 실패', `요청=${found.text}, 실제=${selectedText || '확인 불가'}`);
          return false;
        }
        log('주차 선택 완료', `${targetLabel} -> ${found.text}`);
        return true;
      }
    } catch (_) {}
  }
  log('주차 선택 실패', `${targetLabel} 옵션을 찾지 못했습니다.`);
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
        const candidates = rows.map((tr) => ({
          tr,
          cellTokens: Array.from(tr.querySelectorAll('td,th')).flatMap((cell) => tokens(cell.innerText || cell.textContent))
        })).filter((item) => item.cellTokens.length > 0);

        const exact = candidates.filter((item) => item.cellTokens.some((token) => variants.includes(token)));
        if (exact.length === 1) return { row: exact[0].tr, mode: 'exact', text: exact[0].cellTokens.join('/') };

        const targetBases = new Set(variants.map(base).filter(Boolean));
        const baseMatches = candidates.filter((item) => item.cellTokens.some((token) => targetBases.has(base(token))));
        if (baseMatches.length === 1) {
          return { row: baseMatches[0].tr, mode: 'unique-base', text: baseMatches[0].cellTokens.join('/') };
        }
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

async function waitForFamilyMemberText(page, familyName, rows) {
  const expected = Array.from(new Set(rows.flatMap((row) => memberNameVariants(row.name))));
  const deadline = Date.now() + CONFIG.familyTextWaitMs;
  let lastVisible = [];
  while (Date.now() < deadline) {
    const current = await readVisibleMemberTexts(page, expected);
    lastVisible = current.names;
    if (current.matched > 0) {
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
    const reason = `가족 화면 로딩 실패: '${familyName}' 탭을 연 뒤 시트에 있는 대상 이름이 화면에 나타나지 않았습니다. 잘못된 가족 탭이 열렸거나 CH2CH 검색 결과가 아직 로딩되지 않았을 수 있습니다.`;
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

  let success = 0;
  let failed = 0;
  const people = [];
  const preparedRows = [];
  let finalMismatchCount = 0;

  for (const rowInfo of rows) {
    try {
      const found = await findMemberRow(page, rowInfo.name);
      if (!found) {
        failed += 1;
        const reason = `이름 행 찾기 실패: 시트 ${rowInfo.sourceRow || '?'}행 '${rowInfo.name}'을 '${familyName}' 화면에서 찾지 못했습니다.`;
        people.push({ family: rowInfo.family, name: rowInfo.name, ok: false, reason });
        continue;
      }
      const currentState = await readWebAttendanceState(found);
      if (!currentState.ok) {
        failed += 1;
        const reason = `실행 전 대조 실패: ${currentState.reason}`;
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
        people.push({ family: rowInfo.family, name: rowInfo.name, ok: false, reason });
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
  if (CONFIG.savePerFamily) {
    saved = finalMismatchCount > 0
      ? { attempted: false, verified: false }
      : await saveCurrentPage(page, familyName);
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
    const navigated = await safeStep(`새가족 분류 이동: ${item.family}`, () => navigateToNewcomerAttendance(page, item.family), false);
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
