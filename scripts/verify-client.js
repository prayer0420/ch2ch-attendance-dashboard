const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { _electron } = require('playwright');
const policy = require('../desktop-client/policy');
const root = path.resolve(__dirname, '..');

async function main() {
  assert.equal(policy.normalizeServer(' http://localhost:3000/runs/new '), 'http://localhost:3000');
  assert.equal(policy.normalizeServer('https://example.org/'), 'https://example.org');
  for (const invalid of ['http://example.org', 'javascript:alert(1)', 'file:///tmp/test', 'https://user:pass@example.org', 'https://example.org/?token=a', 'https://example.org/#secret']) assert.throws(() => policy.normalizeServer(invalid));
  assert.equal(policy.isSameServer('https://example.org.evil.test/', 'https://example.org'), false);
  assert.equal(policy.isExternal('https://docs.google.com/spreadsheets/d/test'), true);
  for (const url of ['https://docs.google.com.evil.test/', 'http://docs.google.com/', 'https://docs.google.com:8443/', 'file:///tmp/']) assert.equal(policy.isExternal(url), false);
  const frame = { url: policy.setupUrl }, contents = { mainFrame: frame };
  assert.equal(policy.isTrustedSetup({ sender: contents, senderFrame: frame }, contents), true);
  assert.equal(policy.isTrustedSetup({ sender: contents, senderFrame: { url: policy.setupUrl } }, contents), false);
  assert.equal(policy.isTrustedSetup({ sender: {}, senderFrame: frame }, contents), false);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ch2ch-client-test-'));
  policy.writeConfig(directory, 'https://example.org');
  assert.deepEqual(policy.readConfig(directory), { server: 'https://example.org' });
  policy.writeConfig(directory, 'http://localhost:3000');
  assert.deepEqual(policy.readConfig(directory), { server: 'http://localhost:3000' });
  const packaged = process.argv.includes('--packaged');
  const executablePath = packaged ? path.join(root, '.local-runtime/releases/windows-client/win-unpacked/CH2CH-Client.exe') : require('electron');
  if (packaged) {
    const archive = path.join(path.dirname(executablePath), 'resources/app.asar');
    const entries = require('@electron/asar').listPackage(archive).map(item => item.replace(/^[/\\]/, ''));
    assert.deepEqual(entries.sort(), ['main.js', 'package.json', 'policy.js', 'preload.js', 'setup.css', 'setup.html', 'setup.js'].sort(), 'Only the client allowlist may be packaged');
    // Electron/NSIS runtime files are expected; no project, credentials or node_modules.
    const allowedResources = new Set(['app.asar', 'default_app.asar', 'elevate.exe']);
    assert.ok(fs.readdirSync(path.join(path.dirname(executablePath), 'resources')).every(name => allowedResources.has(name)), 'No legacy source or private resources');
  }
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push(req.method + ' ' + req.url);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html><head><title>CH2CH TEST ONLY</title></head><body><h1>검증용 서버</h1><a href="/next">다음 화면</a></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  let app;
  try {
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    app = await _electron.launch({ executablePath, args: [...(packaged ? [] : [path.join(root, 'desktop-client')]), `--user-data-dir=${path.join(directory, 'profile')}`], env, timeout: 30000 });
    const page = await app.firstWindow();
    await page.locator('#server-url').waitFor();
    const shots = path.join(root, '.local-runtime/app-review'); fs.mkdirSync(shots, { recursive: true });
    await page.screenshot({ path: path.join(shots, 'windows-client-setup.png'), fullPage: true });
    await page.locator('#server-url').fill('http://example.org');
    await page.locator('#connect-button').click();
    await page.getByRole('status').filter({ hasText: 'HTTPS' }).waitFor();
    await page.locator('#server-url').fill(url);
    await page.locator('#connect-button').click();
    await page.getByRole('heading', { name: '검증용 서버' }).waitFor();
    assert.equal(await page.evaluate(() => typeof window.ch2chClient), 'undefined', 'Remote pages cannot call setup IPC');
    assert.equal(await page.evaluate(() => typeof require), 'undefined', 'Remote pages cannot access Node');
    await page.getByRole('link', { name: '다음 화면' }).click();
    await page.waitForURL(url + '/next');
    const preferences = await app.evaluate(({ BrowserWindow }) => {
      const p = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
      return { sandbox: p.sandbox, contextIsolation: p.contextIsolation, nodeIntegration: p.nodeIntegration };
    });
    assert.deepEqual(preferences, { sandbox: true, contextIsolation: true, nodeIntegration: false });
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items[0].submenu.items[0].click());
    await page.locator('#server-url').waitFor();
    assert.equal(await page.locator('#server-url').inputValue(), url);
    await new Promise(resolve => server.close(resolve));
    await page.locator('#connect-button').click();
    await page.getByRole('status').filter({ hasText: '서버에 연결하지 못했습니다' }).waitFor();
    // Relaunch the same independent fixture and verify app shutdown does not stop it.
    await new Promise(resolve => server.listen(Number(new URL(url).port), '127.0.0.1', resolve));
    await app.close(); app = null;
    assert.equal((await fetch(url)).status, 200);
    assert.ok(requests.every(request => request.startsWith('GET ')), 'No mutations during smoke test');
    console.log(`PASS: ${packaged ? 'packaged' : 'source'} Windows client; navigation, URL validation, IPC isolation, failure recovery, saved address, existing server preserved.`);
  } finally {
    if (app) await app.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
