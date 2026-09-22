// Isolated production HTTP checks. No attendance or external writes are made.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
(async () => {
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const standaloneIndex = process.argv.indexOf('--standalone');
  const standalone = standaloneIndex >= 0 ? path.resolve(process.argv[standaloneIndex + 1]) : null;
  const env = { ...process.env, NEXT_BUILD_DIR: '.local-runtime/security-build', NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(port), APP_ACCESS_PASSWORD: 'isolated-http-test-only', APP_SESSION_TOKEN: 'isolated-http-test-signing-key-not-a-real-secret', QR_WORKER_TOKEN: 'isolated-worker-test-only-not-a-real-secret', ...(process.argv.includes('--app') ? { SUPABASE_SERVICE_ROLE_KEY: '' } : {}) };
  if (standalone) for (const key of Object.keys(env)) if (/^(SUPABASE_|NEXT_PUBLIC_SUPABASE_|GOOGLE_|BAND_|CH2CH_USER|CH2CH_PASSWORD)/.test(key)) delete env[key];
  const child = spawn(process.execPath, standalone ? [path.join(standalone, 'server.js')] : [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: standalone || path.resolve(__dirname, '..'), windowsHide: true,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';
  child.stdout.on('data', chunk => { logs += chunk; });
  child.stderr.on('data', chunk => { logs += chunk; });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { ready = (await fetch(`${base}/login`)).ok; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(ready, 'Production test server did not start');
    const manifestResponse = await fetch(`${base}/manifest.webmanifest`);
    assert.equal(manifestResponse.status, 200);
    const manifest = await manifestResponse.json();
    assert.equal(manifest.display, 'standalone');
    for (const icon of manifest.icons) {
      const iconResponse = await fetch(base + icon.src, { redirect: 'manual' });
      assert.equal(iconResponse.status, 200, icon.src);
      assert.match(iconResponse.headers.get('content-type'), /image\/png/);
    }
    const sw = await fetch(`${base}/sw.js`, { redirect: 'manual' });
    assert.equal(sw.status, 200);
    assert.equal(sw.headers.get('cache-control'), 'no-store');
    for (const url of ['/', '/attendance', '/runs/new', '/settings', '/worship-journal', '/minutes']) {
      const response = await fetch(base + url, { redirect: 'manual', headers: { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' } });
      assert.ok([303,307].includes(response.status), `${url}: ${response.status}`);
      assert.match(response.headers.get('location'), /\/login/);
    }
    for (const url of ['/api/attendance', '/api/runs', '/api/worship-journals', '/api/band/status', '/api/member-search', '/api/app', '/api/openapi']) {
      const response = await fetch(base + url, { headers: { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' } });
      assert.equal(response.status, 401, url);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    }
    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ password: 'isolated-http-test-only' }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
    assert.match(login.headers.get('set-cookie'), /Secure/i);
    const contract = await fetch(`${base}/api/app`, { headers: { cookie } });
    assert.equal(contract.status, 200);
    assert.equal((await contract.json()).data.auth.crossOrigin, false);
    const spec = await fetch(`${base}/api/openapi`, { headers: { cookie } });
    assert.equal((await spec.json()).openapi, '3.0.3');
    const invalidPage = await fetch(`${base}/api/runs?pageSize=99999`, { headers: { cookie } });
    assert.equal(invalidPage.status, 400);
    const logoutProbe = await fetch(`${base}/api/auth/logout`, { method: 'POST', redirect: 'manual', headers: { cookie, origin: base } });
    assert.equal(logoutProbe.status, 303);
    assert.equal(logoutProbe.headers.get('location'), '/login?logout=1');
    const denied = await fetch(`${base}/api/runs`, { method: 'POST', headers: { cookie, origin: 'https://attacker.invalid', 'content-type': 'application/json' }, body: '{}' });
    assert.equal(denied.status, 403);
    const worker = await fetch(`${base}/api/qr-attendance/worker`, { method: 'POST', headers: { host: 'localhost', 'content-type': 'application/json' }, body: '{}' });
    assert.equal(worker.status, 401);
    if (process.argv.includes('--ui')) {
      const ui = spawn(process.execPath, ['scripts/verify-attendance-sheet-pages.js'], {
        cwd: path.resolve(__dirname, '..'), windowsHide: true, stdio: 'inherit',
        env: { ...process.env, TEST_BASE_URL: base, TEST_ACCESS_PASSWORD: 'isolated-http-test-only' }
      });
      const exitCode = await new Promise(resolve => ui.on('exit', resolve));
      assert.equal(exitCode, 0, 'Authenticated UI regression failed');
    }
    if (process.argv.includes('--app')) {
      const ui = spawn(process.execPath, ['scripts/verify-app-layout.js'], {
        cwd: path.resolve(__dirname, '..'), windowsHide: true, stdio: 'inherit',
        env: { ...process.env, TEST_BASE_URL: base, TEST_ACCESS_PASSWORD: 'isolated-http-test-only' }
      });
      const exitCode = await new Promise(resolve => ui.on('exit', resolve));
      assert.equal(exitCode, 0, 'Responsive app verification failed');
    }
    console.log('Production HTTP security passed: protected pages/APIs, middleware-bypass header, login, secure cookie, cross-origin denial, localhost worker denial');
  } finally {
    child.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
