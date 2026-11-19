#!/usr/bin/env node
// Verification harness for the CH2CH dashboard. Starts an ISOLATED copy of the
// active production build on 127.0.0.1:3100 with a throwaway password, a
// throwaway SQLite DB in %TEMP%, no Runner, and CH2CH/BAND/Google credentials
// blanked, so a drive can never touch the live server (port 3000), its data, or
// any external system. Usage: node .claude/skills/verify-ch2ch/verify.cjs <cmd>
const { spawn, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const PORT = 3100;
const BASE = `http://127.0.0.1:${PORT}`;
const RUNS = path.join(root, '.local-runtime', 'verify'); // git-ignored
const SLOTS = ['.local-runtime/server-build', '.local-runtime/server-build-b'];
const BLANK = ['CH2CH_USER', 'CH2CH_PASSWORD', 'CH2CH_ID', 'CH2CH_PW', 'QR_WORKER_TOKEN', 'BAND_ACCESS_TOKEN', 'BAND_TARGET_KEY',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'APP_PUBLIC_ORIGIN', 'NGROK_AUTHTOKEN'];

const die = (msg) => { console.error(`[verify] FAIL ${msg}`); process.exit(1); };
const log = (msg) => console.log(`[verify] ${msg}`);
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));

function activeSlot() {
  try { const d = readJson(path.join(root, '.local-runtime/active-build.json')).dir; if (SLOTS.includes(d)) return d; } catch {}
  return SLOTS[0];
}
function latestRunId() {
  if (!fs.existsSync(RUNS)) return null;
  const ids = fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'state.json'))).sort();
  return ids.at(-1) || null;
}
function loadState(id) {
  id = id || latestRunId();
  if (!id) die('no verification run found. Run `launch` first.');
  const file = path.join(RUNS, id, 'state.json');
  if (!fs.existsSync(file)) die(`unknown run ${id}`);
  return { id, file, ...readJson(file) };
}
const saveState = (s) => { const { file, ...rest } = s; fs.writeFileSync(file, JSON.stringify(rest, null, 2)); };
function portFree() {
  return new Promise((resolve) => {
    const p = net.createServer().once('error', () => resolve(false)).once('listening', () => p.close(() => resolve(true)));
    p.listen(PORT, '127.0.0.1');
  });
}
function pidAlive(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }
function pidCommandLine(pid) {
  if (process.platform !== 'win32') { try { return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8'); } catch { return ''; } }
  const r = spawnSync('powershell.exe', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=${Number(pid)}").CommandLine`], { encoding: 'utf8', windowsHide: true });
  return (r.stdout || '').trim();
}
const ownsPid = (s) => pidAlive(s.pid) && pidCommandLine(s.pid).includes('next') && pidCommandLine(s.pid).includes(String(PORT));
async function http(p, init = {}) {
  return fetch(BASE + p, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...init });
}
async function login(s) {
  const r = await http('/api/auth/login', { method: 'POST', headers: { origin: BASE, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ password: s.password }) });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  if (r.status !== 200 || !cookie.startsWith('ch2ch_admin_session=')) die(`login returned ${r.status}`);
  s.cookie = cookie; saveState(s); return cookie;
}
function openDb(s) {
  const { openLocal } = require(path.join(root, 'lib/local-store/provider.cjs'));
  return openLocal(s.dataDir);
}
function evidencePath(s, name) { const dir = path.join(RUNS, s.id, 'evidence'); fs.mkdirSync(dir, { recursive: true }); return path.join(dir, name); }

// ---------------------------------------------------------------- commands
async function launch() {
  const slot = activeSlot();
  if (!fs.existsSync(path.join(root, slot, 'BUILD_ID'))) die(`no production build at ${slot}. Run the deploy-local skill (or node scripts/server/build.js) first.`);
  if (!(await portFree())) die(`port ${PORT} is busy. Run \`doctor\` / \`cleanup\` for an earlier run; never drive an instance you did not start.`);
  const id = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '') + '-' + crypto.randomBytes(2).toString('hex');
  const runDir = path.join(RUNS, id);
  fs.mkdirSync(path.join(runDir, 'evidence'), { recursive: true });
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ch2ch-verify-'));
  require(path.join(root, 'lib/local-store/provider.cjs')).openLocal(dataDir, true); // empty schema
  const password = crypto.randomBytes(24).toString('base64url');
  const env = { ...process.env, NODE_ENV: 'production', NEXT_BUILD_DIR: slot, CH2CH_STANDALONE: '0', NEXT_TELEMETRY_DISABLED: '1',
    APP_ACCESS_PASSWORD: password, APP_SESSION_TOKEN: crypto.randomBytes(48).toString('base64url'),
    CH2CH_STORAGE_PROVIDER: 'local', CH2CH_DATA_DIR: dataDir, RUNNER_DASHBOARD_URL: BASE };
  // Empty (not deleted): Next keeps an existing env var and does not refill it from .env.local.
  for (const k of BLANK) env[k] = '';
  const out = fs.openSync(path.join(runDir, 'server.log'), 'a');
  const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(PORT)],
    { cwd: root, env, detached: true, stdio: ['ignore', out, out], windowsHide: true });
  child.unref();
  const state = { file: path.join(runDir, 'state.json'), id, pid: child.pid, port: PORT, base: BASE, buildDir: slot, dataDir, password, startedAt: new Date().toISOString() };
  saveState(state);
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    if (!pidAlive(child.pid)) die(`server exited during startup; see ${path.relative(root, path.join(runDir, 'server.log'))}`);
    const ok = await http('/login').then((r) => r.status === 200).catch(() => false);
    if (ok) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (Date.now() - t0 >= 90000) die('login page not ready within 90s');
  await login(state);
  log(`ready run=${id} url=${BASE} build=${slot} pid=${child.pid}`);
  log(`data=${dataDir} (throwaway)  evidence=${path.relative(root, path.join(runDir, 'evidence'))}`);
}

async function doctor(id) {
  const s = loadState(id);
  const problems = [];
  if (!ownsPid(s)) problems.push(`pid ${s.pid} is not our next server on ${PORT}`);
  const loginStatus = await http('/login').then((r) => r.status).catch(() => 0);
  const anon = await http('/api/app').then((r) => r.status).catch(() => 0);
  if (loginStatus !== 200) problems.push(`/login=${loginStatus}`);
  if (anon !== 401) problems.push(`/api/app anonymous=${anon} (want 401)`);
  if (!s.cookie) await login(s);
  let authed = await http('/api/app', { headers: { cookie: s.cookie } }).then((r) => r.status).catch(() => 0);
  if (authed === 401) { await login(s); authed = await http('/api/app', { headers: { cookie: s.cookie } }).then((r) => r.status).catch(() => 0); }
  if (authed !== 200) problems.push(`/api/app authed=${authed}`);
  if (!s.dataDir.startsWith(os.tmpdir())) problems.push(`data dir ${s.dataDir} is not a throwaway temp dir`);
  if (!fs.existsSync(path.join(s.dataDir, 'attendance.sqlite'))) problems.push('throwaway DB missing');
  if (problems.length) die(`doctor run=${s.id}: ${problems.join('; ')}`);
  log(`doctor ok run=${s.id} pid=${s.pid} build=${s.buildDir} /login=200 /api/app=401 anon,200 authed data=${s.dataDir}`);
}

async function api(method, p, body, id) {
  const s = loadState(id);
  if (!s.cookie) await login(s);
  const init = { method, headers: { cookie: s.cookie, origin: BASE, accept: 'application/json' } };
  if (body) { init.headers['content-type'] = 'application/json'; init.body = body; }
  const r = await http(p, init);
  const text = await r.text();
  const file = evidencePath(s, `api-${Date.now()}-${method}-${p.replace(/[^\w]+/g, '_').slice(0, 40)}.txt`);
  fs.writeFileSync(file, `${method} ${p}\n${body || ''}\n--- HTTP ${r.status}\n${text}`);
  console.log(`HTTP ${r.status}\n${text.slice(0, 2000)}`);
  log(`saved ${path.relative(root, file)}`);
}

function db(id) {
  const s = loadState(id);
  const d = openDb(s);
  const out = {};
  for (const t of ['attendance_runs', 'attendance_results', 'run_events', 'qr_sync_jobs', 'worship_journals', 'runner_heartbeats']) {
    out[t] = d.prepare(`SELECT count(*) n FROM ${t}`).get().n;
  }
  out.runs = d.prepare("SELECT id, json_extract(data,'$.status') status, json_extract(data,'$.target_week') week, json_extract(data,'$.source_file_path') file FROM attendance_runs ORDER BY rowid DESC LIMIT 5").all();
  const file = evidencePath(s, `db-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  log(`saved ${path.relative(root, file)}`);
}

// Phone path: any Host other than localhost/127.0.0.1 makes /api/qr-attendance queue the job
// for the Runner instead of running it here. The browser resolves this name to 127.0.0.1.
const MOBILE_HOST = 'qr-mobile.verify.test';
const MOBILE_BASE = `http://${MOBILE_HOST}:${PORT}`;

async function withBrowser(s, fn, { args = [], prepare } = {}) {
  const { chromium } = require(path.join(root, 'node_modules/playwright'));
  const browser = await chromium.launch({ headless: true, args });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' });
    if (prepare) await prepare(context);
    const page = await context.newPage();
    page.on('dialog', (d) => d.accept()); // the "실제 저장할까요?" confirm; isolated instance, no Runner
    await fn(page);
  } finally { await browser.close(); }
}
async function uiLogin(page, s) {
  await page.goto(BASE + '/login');
  await page.getByLabel('접속 코드').fill(s.password);
  await page.getByRole('button', { name: '들어가기' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
}

async function shot(p, id) {
  const s = loadState(id);
  await withBrowser(s, async (page) => {
    await uiLogin(page, s);
    const r = await page.goto(BASE + p, { waitUntil: 'networkidle' });
    const file = evidencePath(s, `shot-${p.replace(/[^\w]+/g, '_') || 'root'}-${Date.now()}.png`);
    await page.screenshot({ path: file, fullPage: true });
    log(`${p} HTTP ${r.status()} title="${await page.title()}" url=${page.url()} -> ${path.relative(root, file)}`);
  });
}

const JOURNEYS = {
  // Feature: login (features/login.md)
  async login(page, s) {
    await page.goto(BASE + '/runs/new');
    if (!new URL(page.url()).pathname.startsWith('/login')) throw new Error(`anonymous /runs/new was not redirected to /login (${page.url()})`);
    await page.getByLabel('접속 코드').fill('wrong-' + crypto.randomBytes(4).toString('hex'));
    await page.getByRole('button', { name: '들어가기' }).click();
    await page.getByText('접속 코드가 맞지 않습니다.').waitFor({ timeout: 10000 });
    await page.screenshot({ path: evidencePath(s, 'login-1-wrong-code.png') });
    await uiLogin(page, s);
    await page.screenshot({ path: evidencePath(s, 'login-2-home.png'), fullPage: true });
    return `wrong code rejected; correct code landed on ${new URL(page.url()).pathname}`;
  },
  // Feature: attendance run from a file (features/attendance-run.md)
  async 'attendance-file-run'(page, s) {
    const csv = evidencePath(s, 'fixture-attendance.csv');
    fs.writeFileSync(csv, '﻿가족,이름,주일,부서\n검증가족,가상검증,O,X\n');
    await uiLogin(page, s);
    await page.goto(BASE + '/runs/new', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '파일 업로드' }).click();
    await page.locator('input[type="file"]').setInputFiles(csv);
    await page.getByRole('button', { name: '시트/파일에서 가족 불러오기' }).click();
    await page.getByText('검증가족').first().waitFor({ timeout: 20000 });
    await page.screenshot({ path: evidencePath(s, 'attendance-1-families-loaded.png'), fullPage: true });
    await page.getByRole('button', { name: '실제 출석체크 시작' }).click();
    await page.waitForURL((u) => /^\/runs\/[^/]+$/.test(u.pathname) && u.pathname !== '/runs/new', { timeout: 20000 });
    const runId = new URL(page.url()).pathname.split('/').pop();
    await page.getByText('대기 중').first().waitFor({ timeout: 15000 });
    await page.screenshot({ path: evidencePath(s, 'attendance-2-run-detail.png'), fullPage: true });
    const row = openDb(s).prepare('SELECT data FROM attendance_runs WHERE id=?').get(runId);
    if (!row) throw new Error(`run ${runId} not in throwaway DB`);
    const run = JSON.parse(row.data);
    const snap = path.join(s.dataDir, 'files', 'attendance-inputs', run.source_file_path || '');
    if (run.status !== 'queued') throw new Error(`run status ${run.status}, want queued`);
    if (!run.source_file_path || !fs.existsSync(snap)) throw new Error('uploaded snapshot missing in throwaway data dir');
    fs.writeFileSync(evidencePath(s, 'attendance-3-db-row.json'), JSON.stringify(run, null, 2));
    return `run ${runId} queued (week ${run.target_week}), snapshot ${run.source_file_path} stored; no Runner attached, nothing sent to CH2CH`;
  },
  // Feature: QR attendance from a phone (features/qr-attendance.md). Runs via MOBILE_BASE, see journey().
  async 'qr-mobile-queue'(page, s) {
    const d = openDb(s);
    const sheetUrl = `https://docs.google.com/spreadsheets/d/verify-fixture-${crypto.randomBytes(4).toString('hex')}/edit`;
    const job = (where) => {
      const row = d.prepare(`SELECT id, data FROM qr_sync_jobs WHERE json_extract(data,'$.sheet_url')=? AND ${where} ORDER BY rowid DESC LIMIT 1`).get(sheetUrl);
      return row ? { id: row.id, ...JSON.parse(row.data) } : null;
    };
    const waitJob = async (where, what) => {
      for (let i = 0; i < 40; i++) { const j = job(where); if (j) return j; await new Promise((r) => setTimeout(r, 250)); }
      throw new Error(`no ${what} job in throwaway DB`);
    };

    await page.goto(MOBILE_BASE + '/qr-attendance', { waitUntil: 'networkidle' });
    if (new URL(page.url()).pathname.startsWith('/login')) throw new Error('phone-host session cookie was not accepted');
    await page.getByLabel('Google Sheet URL').fill(sheetUrl);
    await page.getByLabel('시트 탭').fill('가장체크');
    const week = Number(await page.locator('input[type="number"]').inputValue());
    await page.getByRole('button', { name: 'QR 명단 불러오기' }).click();
    await page.getByRole('button', { name: '명단 읽는 중' }).waitFor({ timeout: 10000 });
    const queued = await waitJob(`json_extract(data,'$.action')='preview' AND json_extract(data,'$.status')='queued'`, 'queued preview');
    if (queued.week !== week || queued.sheet_tab !== '가장체크') throw new Error(`queued job selection mismatch: ${JSON.stringify(queued)}`);
    await page.screenshot({ path: evidencePath(s, 'qr-1-preview-queued.png'), fullPage: true });

    // Stand in for the Runner at its real boundary (the job row): complete it with a fixture preview.
    const preview = { id: 'verify-preview-' + crypto.randomBytes(3).toString('hex'), createdAt: new Date().toISOString(), week, weekLabel: `${week}주`,
      sheetUrl, sheetTab: '가장체크', department: '2청년회', downloadedCount: 3, departmentCount: 2,
      service13Names: ['가상검증A'], service4Names: ['가상검증B'], duplicate13Count: 0, duplicate4Count: 0,
      unmatched13Names: [], unmatched4Names: ['가상검증B'], duplicateSheetNames: [] };
    d.prepare(`UPDATE qr_sync_jobs SET data=json_set(data,'$.status','completed','$.result',json(?)) WHERE id=?`).run(JSON.stringify(preview), queued.id);
    await page.getByRole('heading', { name: '2청년회 QR 출석 대상' }).waitFor({ timeout: 15000 }); // UI polls every 2s
    await page.getByText('가상검증A').first().waitFor();
    await page.getByText('시트 미일치 1명').waitFor();
    await page.screenshot({ path: evidencePath(s, 'qr-2-preview-shown.png'), fullPage: true });

    await page.getByRole('button', { name: 'Google Sheet에 반영' }).click();
    await page.getByRole('button', { name: '시트 반영·재검사 중' }).waitFor({ timeout: 10000 });
    const apply = await waitJob(`json_extract(data,'$.action')='apply' AND json_extract(data,'$.status')='queued'`, 'queued apply');
    if (apply.preview?.id !== preview.id) throw new Error('apply job does not carry the shown preview');
    await page.screenshot({ path: evidencePath(s, 'qr-3-apply-queued.png'), fullPage: true });
    fs.writeFileSync(evidencePath(s, 'qr-4-db-jobs.json'), JSON.stringify({ preview: job(`id='${queued.id}'`), apply }, null, 2));
    return `phone path queued preview job ${queued.id} (week ${week}); fixture Runner result rendered; apply job ${apply.id} queued with that preview. No Runner, nothing sent to CH2CH or Google`;
  },
  // Feature: main screens render (features/screens.md)
  async screens(page, s) {
    await uiLogin(page, s);
    const pages = ['/', '/runs/new', '/qr-attendance', '/worship-journal', '/search', '/attendance', '/minutes', '/settings'];
    const bad = [];
    for (const p of pages) {
      const r = await page.goto(BASE + p, { waitUntil: 'networkidle' });
      if (!r || r.status() !== 200 || new URL(page.url()).pathname.startsWith('/login')) bad.push(`${p}=${r && r.status()}`);
      await page.screenshot({ path: evidencePath(s, `screens${p.replace(/\//g, '_') || '_root'}.png`), fullPage: true });
    }
    if (bad.length) throw new Error(`screens failed: ${bad.join(', ')}`);
    return `${pages.length} screens 200 while logged in`;
  },
};

async function journey(name, id) {
  const s = loadState(id);
  const fn = JOURNEYS[name];
  if (!fn) die(`unknown journey "${name}". Known: ${Object.keys(JOURNEYS).join(', ')}`);
  let result;
  let opts = {};
  if (name === 'qr-mobile-queue') {
    // Production sets the session cookie Secure, which a browser drops on plain http for a
    // non-localhost name. Log in over the real API and hand the same session to the phone host.
    const cookie = await login(s);
    const [cname, ...rest] = cookie.split('=');
    opts = {
      args: [`--host-resolver-rules=MAP ${MOBILE_HOST} 127.0.0.1`],
      prepare: (ctx) => ctx.addCookies([{ name: cname, value: rest.join('='), domain: MOBILE_HOST, path: '/', httpOnly: true, secure: false, sameSite: 'Lax' }]),
    };
  }
  await withBrowser(s, async (page) => {
    try { result = await fn(page, s); }
    catch (e) { await page.screenshot({ path: evidencePath(s, `${name}-FAILED.png`), fullPage: true }).catch(() => {}); throw e; }
  }, opts);
  fs.appendFileSync(evidencePath(s, 'journeys.log'), `${new Date().toISOString()} PASS ${name}: ${result}\n`);
  log(`PASS ${name}: ${result}`);
}

function cleanup(id) {
  const s = loadState(id);
  if (pidAlive(s.pid)) {
    if (!ownsPid(s)) die(`pid ${s.pid} is alive but is not our server; not killing it. Remove ${path.relative(root, s.file)} by hand if stale.`);
    if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(s.pid), '/T', '/F'], { windowsHide: true });
    else process.kill(-s.pid);
  }
  if (s.dataDir && s.dataDir.startsWith(os.tmpdir()) && path.basename(s.dataDir).startsWith('ch2ch-verify-')) fs.rmSync(s.dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  const { password, cookie, ...kept } = s; void password; void cookie;
  saveState({ ...kept, file: s.file, cleanedAt: new Date().toISOString() }); // secrets dropped
  fs.renameSync(s.file, path.join(path.dirname(s.file), 'state.closed.json'));
  const ev = path.join(RUNS, s.id, 'evidence');
  log(`cleaned run=${s.id}: server stopped, throwaway data removed. evidence kept: ${path.relative(root, ev)} (${fs.existsSync(ev) ? fs.readdirSync(ev).length : 0} files)`);
}

const [cmd, ...args] = process.argv.slice(2);
const runs = {
  launch: () => launch(),
  doctor: () => doctor(args[0]),
  api: () => api((args[0] || 'GET').toUpperCase(), args[1] || '/api/app', args[2], args[3]),
  db: () => db(args[0]),
  shot: () => shot(args[0] || '/', args[1]),
  journey: () => journey(args[0], args[1]),
  cleanup: () => cleanup(args[0]),
};
if (!runs[cmd]) { console.log('usage: verify.cjs launch | doctor [run] | journey <login|attendance-file-run|qr-mobile-queue|screens> [run] | shot <path> [run] | api <METHOD> <path> [json] [run] | db [run] | cleanup [run]'); process.exit(cmd ? 1 : 0); }
Promise.resolve(runs[cmd]()).catch((e) => die(e.message));
