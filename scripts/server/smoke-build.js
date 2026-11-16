// Starts a finished build on 127.0.0.1:3100 with throwaway credentials and checks
// the login guard, login and the main screens before it replaces the live server.
// It never touches port 3000, the stored access code or business data.
const { spawn, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { openLocal } = require('../../lib/local-store/provider.cjs');
const { SLOTS } = require('./build-slots.js');

const root = path.resolve(__dirname, '../..');
const port = 3100;
const base = `http://127.0.0.1:${port}`;
const pages = ['/', '/search', '/qr-attendance', '/runs/new', '/worship-journal', '/settings', '/attendance', '/minutes'];

function portFree() {
  return new Promise((resolve) => {
    const probe = net.createServer().once('error', () => resolve(false)).once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, '127.0.0.1');
  });
}

async function request(pathname, init = {}) {
  return fetch(base + pathname, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...init });
}

// Node fetch may normalize Host. Use HTTP for this local reverse-proxy fixture.
function proxyRequest(pathname, headers, body) {
  return new Promise((resolve,reject)=>{
    const req=require('node:http').request(base+pathname,{method:body?'POST':'GET',headers,timeout:15000},res=>{
      const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,json:async()=>JSON.parse(Buffer.concat(chunks).toString('utf8'))}));
    });
    req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('Proxy fixture timeout')));if(body)req.write(body);req.end();
  });
}

async function main() {
  const dir = process.argv[2];
  if (!SLOTS.includes(dir) || !fs.existsSync(path.join(root, dir, 'BUILD_ID'))) throw new Error('Unknown or incomplete build folder.');
  if (!(await portFree())) throw new Error(`Port ${port} is busy; the smoke test did not start.`);
  const password = crypto.randomBytes(24).toString('base64url');
  const fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ch2ch-build-smoke-'));
  const fixtureDb = openLocal(fixtureDirectory, true);
  const env = { ...process.env, NODE_ENV: 'production', NEXT_BUILD_DIR: dir, CH2CH_STANDALONE: '0', NEXT_TELEMETRY_DISABLED: '1',
    APP_ACCESS_PASSWORD: password, APP_SESSION_TOKEN: crypto.randomBytes(48).toString('base64url'),
    CH2CH_STORAGE_PROVIDER: 'local', CH2CH_DATA_DIR: fixtureDirectory,
    APP_PUBLIC_ORIGIN: 'https://mobile.fixture.test' };
  delete env.QR_WORKER_TOKEN;
  const child = spawn(process.execPath, [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)],
    { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '';
  child.stdout.on('data', (chunk) => { output = (output + chunk).slice(-4000); });
  child.stderr.on('data', (chunk) => { output = (output + chunk).slice(-4000); });
  const started = Date.now();
  try {
    let ready = false;
    while (!ready && Date.now() - started < 60000 && child.exitCode === null) {
      ready = await request('/login').then((response) => response.status === 200).catch(() => false);
      if (!ready) await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error('The new build did not serve the login page.');
    const anonymous = await request('/api/app');
    if (anonymous.status !== 401) throw new Error(`Anonymous API returned ${anonymous.status}, expected 401.`);
    const login = await request('/api/auth/login', { method: 'POST', headers: { origin: base, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ password }) });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    if (login.status !== 200 || !cookie.startsWith('ch2ch_admin_session=')) throw new Error(`Login returned ${login.status}.`);
    const failures = [];
    for (const page of [...pages, '/api/app']) {
      const response = await request(page, { headers: { cookie } });
      if (response.status !== 200) failures.push(`${page}=${response.status}`);
      if (page === '/worship-journal' && response.status === 200) {
        const html = await response.text();
        const accounting = html.indexOf('>회계 자료</h2>');
        const purpose = html.indexOf('>목적헌금 수기 입력</h2>');
        const newcomer = html.indexOf('>새가족 수기 입력</h2>');
        if (!(accounting >= 0 && purpose > accounting && newcomer > purpose)) failures.push('purpose input must appear between accounting and newcomers before analysis');
      } else await response.body?.cancel();
    }
    if (failures.length) throw new Error(`Screens failed: ${failures.join(', ')}`);
    // Real HTTP persistence flow, but isolated DB and no Runner: cannot reach CH2CH.
    const form = new FormData();
    form.set('dataSource','file'); form.set('targetWeek','46'); form.set('targetYear','2026'); form.set('targetDate','2026-11-15');
    form.set('file',new Blob(['가족,이름,주일,부서\n테스트네,가상테스트,O,X'],{type:'text/csv'}),'fixture.csv');
    const created = await request('/api/runs',{method:'POST',headers:{cookie,origin:base},body:form});
    const run = await created.json();
    if(created.status!==200||!run.runId)throw new Error('Isolated attendance upload/queue failed.');
    const detail = await request('/api/runs/'+run.runId,{headers:{cookie}});
    if(detail.status!==200)throw new Error('Attendance request could not be read back.');
    const uploaded=JSON.parse(fixtureDb.prepare('SELECT data FROM attendance_runs WHERE id=?').get(run.runId).data);
    if(!fs.existsSync(path.join(fixtureDirectory,'files','attendance-inputs',uploaded.source_file_path)))throw new Error('Uploaded snapshot missing.');
    const remoteHeaders={cookie,host:'mobile.fixture.test',origin:'https://mobile.fixture.test','x-forwarded-proto':'https','content-type':'application/json'};
    const qr = await proxyRequest('/api/qr-attendance',remoteHeaders,JSON.stringify({action:'preview',week:46,sheetUrl:'https://docs.google.com/spreadsheets/d/fixture/edit',sheetTab:'가장체크'}));
    const qrBody=await qr.json();
    if(qr.status!==202||!qrBody.data?.jobId)throw new Error(`Isolated mobile QR queue failed: HTTP ${qr.status}; ${String(qrBody.error||'missing queued ID').slice(0,180)}`);
    const qrStatus=await proxyRequest('/api/qr-attendance?jobId='+qrBody.data.jobId,remoteHeaders);
    if(qrStatus.status!==200||(await qrStatus.json()).data?.status!=='queued')throw new Error('Mobile QR readback failed.');
    const journals=await request('/api/worship-journals',{headers:{cookie}});
    if(journals.status!==200||!Array.isArray((await journals.json()).journals))throw new Error('PC journal API failed.');
    fs.writeFileSync(path.join(root,dir,'local-store-smoke.json'),JSON.stringify({passedAt:new Date().toISOString(),isolated:true,attendanceUpload:true,mobileQrQueue:true,journalRead:true}));
    console.log(`[smoke] Passed in ${Math.round((Date.now() - started) / 1000)}s: login guard, login, ${pages.length} screens and app API on ${dir}.`);
  } catch (error) {
    console.error(output.split(/\r?\n/).filter(Boolean).slice(-18).join('\n'));
    throw error;
  } finally {
    if (child.exitCode === null) {
      if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
      else child.kill();
    }
  }
}

main().catch((error) => { console.error(`[smoke] ${error.message}`); process.exitCode = 1; });
