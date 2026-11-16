// Read-only live probe. Never invokes processFamily, checkbox setters or save.
require('dotenv').config({ path: '.env.local', quiet: true });
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { chromium } = require('playwright');
const XLSX = require('xlsx');

(async () => {
  const source = fs.readFileSync('runner/legacy-ch2ch/src/main.js', 'utf8');
  const ast = ts.createSourceFile('main.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const wanted = new Set(['normalizeText', 'allContexts', 'shortDelay', 'scrollAllContainers', 'firstVisibleLocatorInAnyFrame',
    'clickTextInAnyFrame', 'login', 'navigateToWeeklyAttendance', 'getTargetWeekLabel', 'selectAttendanceWeek', 'clickFamilyNavigation', 'readVisibleMemberTexts']);
  const code = ast.statements.filter(node => ts.isFunctionDeclaration(node) && wanted.has(node.name?.text)).map(node => node.getText(ast)).join('\n');
  const { locateMemberRow } = await import('../runner/legacy-ch2ch/src/member-row.js');
  const { ensureFamilyReady } = await import('../runner/legacy-ch2ch/src/family-readiness.js');
  const context = vm.createContext({ setTimeout, locateMemberRow,
    CONFIG: {
    id: process.env.CH2CH_ID || process.env.CH2CH_USER, pw: process.env.CH2CH_PW || process.env.CH2CH_PASSWORD,
    loginIdCandidates: [], loginPwCandidates: [], loginButtonCandidates: [], actionDelayMs: 150,
    targetDeptText: '2청년회', targetClassText: '2026전입반', targetGroupText: '26하', weeklyAttendanceText: '출석부(주별)',
    targetWeek: '40', targetDate: '2026-10-04', targetWeekText: '2026년 40주차'
  }, log: message => console.log(message) });
  vm.runInContext(code, context);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1700, height: 950 } });
    page.on('dialog', dialog => dialog.dismiss());
    await page.goto(process.env.CH2CH_URL || 'https://ch2ch.or.kr/login.asp', { waitUntil: 'domcontentloaded' });
    if (!await context.login(page)) throw new Error('Login failed');
    if (!await context.navigateToWeeklyAttendance(page)) throw new Error('Attendance navigation failed');
    if (!await context.selectAttendanceWeek(page)) throw new Error('Week selection failed');
    const workbook = XLSX.read(fs.readFileSync('runner/legacy-ch2ch/data/attendance.csv'), { type: 'buffer' });
    const input = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const families = ['민석이네', '백동현네', '상준이네', '애선이네', '이동현네', '필홍이네', '희원이네', '건우네', '보윤이네', '성혜네', '정인이네', '주앙이네'];
    for (const family of families) {
      const expected = input.filter(row => row['가족'] === family && (row['주일'] === 'O' || row['부서'] === 'O')).map(row => row['이름']);
      if (!expected.length) throw new Error(`No fixture targets: ${family}`);
      const result = await ensureFamilyReady({ enter: async attempt => {
        if (attempt === 2 && (!await context.navigateToWeeklyAttendance(page) || !await context.selectAttendanceWeek(page))) return false;
        return context.clickFamilyNavigation(page, family, detail => console.log(JSON.stringify({ family, navigation: detail })));
      }, inspect: () => context.readVisibleMemberTexts(page, expected, family),
        pause: context.shortDelay, timeoutMs: 8000, record: async detail => console.log(JSON.stringify({ family, attempt: detail.attempt,
          ready: detail.ready, reason: detail.reason, expected: expected.length, matched: detail.snapshot?.matched,
          weeks: detail.snapshot?.selectedWeeks })) });
      if (!result.ok || result.attempts.at(-1).snapshot.matched !== expected.length) throw new Error(`Live family verification failed: ${family}`);
    }
    console.log('PASS: 12 live families; exact expected names and week verified without checkbox or save operations.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.name, error.message); process.exitCode = 1; });
