const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText, file);
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...args) {
  return originalResolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, parent, ...args);
};

(async () => {
  const s = require('../lib/security.ts');
  delete process.env.APP_PUBLIC_ORIGIN;
  const proxyRequest = (origin, extra = {}) => new Request('http://localhost:3000/api/auth/login', {
    method: 'POST', headers: { host: 'external.example.test', origin, 'x-forwarded-proto': 'https', ...extra }
  });
  assert.equal(s.sameOriginMutation(proxyRequest('https://external.example.test')), false, 'Unconfigured HTTPS proxy must fail closed');
  process.env.APP_PUBLIC_ORIGIN = 'https://external.example.test';
  assert.equal(s.sameOriginMutation(proxyRequest('https://external.example.test')), true);
  for (const origin of ['https://evil.test', 'http://external.example.test', 'https://external.example.test.evil.test', 'https://external.example.test:8443', 'null']) {
    assert.equal(s.sameOriginMutation(proxyRequest(origin)), false, origin);
  }
  for (const extra of [
    { 'x-forwarded-proto': 'http' }, { 'x-forwarded-proto': 'https,http' },
    { 'sec-fetch-site': 'cross-site' }, { host: 'localhost:3000', 'x-forwarded-host': 'external.example.test' }
  ]) assert.equal(s.sameOriginMutation(proxyRequest('https://external.example.test', extra)), false);
  assert.equal(s.sameOriginMutation(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST', headers: { host: 'localhost:3000', origin: 'http://localhost:3000' }
  })), true, 'Existing local login must still work');
  for (const invalid of ['not-a-url', 'http://external.example.test', 'https://user:password@external.example.test', 'https://external.example.test/path', 'https://external.example.test/?x=1']) {
    process.env.APP_PUBLIC_ORIGIN = invalid;
    assert.equal(s.sameOriginMutation(proxyRequest('https://external.example.test')), false);
  }
  delete process.env.APP_PUBLIC_ORIGIN;
  const { googleCsvExportUrl } = require('../lib/google-sheet-url.ts');
  delete process.env.APP_ACCESS_PASSWORD;
  delete process.env.APP_SESSION_TOKEN;
  assert.equal((await s.checkRequestSecurity(new Request('https://app.test/api/runs'))).status, 503);
  process.env.APP_ACCESS_PASSWORD = 'test-only-password-not-for-deployment';
  process.env.APP_SESSION_TOKEN = 'test-only-signing-key-never-for-deployment-12345';
  const token = await s.createSession();
  assert.equal(await s.validSession(token), true);
  assert.equal(await s.validSession(process.env.APP_SESSION_TOKEN), false);
  assert.equal(await s.validSession(token + 'a'), false);
  assert.equal(await s.validSession(token.replace(/^\d+/, expiry => String(Number(expiry) - 1))), false);
  assert.equal(await s.validSession(token, Date.now() + 86400000), false);
  const headers = { cookie: `${s.SESSION_COOKIE}=${token}`, origin: 'https://app.test', 'content-type': 'application/json' };
  assert.equal(await s.checkRequestSecurity(new Request('https://app.test/api/runs', { method: 'POST', headers, body: '{}' })), null);
  assert.equal((await s.checkRequestSecurity(new Request('https://app.test/api/runs', { method: 'POST', headers: { ...headers, origin: 'https://evil.test' }, body: '{}' }))).status, 403);
  assert.equal((await s.checkRequestSecurity(new Request('https://app.test/api/runs', { headers: { 'x-middleware-subrequest': 'middleware:middleware:middleware' } }))).status, 401);
  assert.equal((await s.checkRequestSecurity(new Request('https://app.test/api/runs', { method: 'POST', headers, body: 'x'.repeat(4 * 1024 * 1024 + 1) }))).status, 413);
  assert.equal((await s.checkRequestSecurity(new Request('http://localhost/api/qr-attendance/worker', { method: 'POST' }), true)).status, 401);
  process.env.QR_WORKER_TOKEN = 'test-only-worker-secret-never-for-deployment';
  assert.equal(await s.checkRequestSecurity(new Request('http://localhost/api/qr-attendance/worker', { method: 'POST', headers: { 'x-qr-worker-token': process.env.QR_WORKER_TOKEN }, body: '{}' }), true), null);
  for (const value of ['//evil.test', '/\\evil.test', '/%5cevil.test', '/api/runs', 'https://evil.test']) assert.equal(s.safeNextPath(value), '/');
  assert.equal(s.safeNextPath('/runs/new'), '/runs/new');
  for (const url of ['https://docs.google.com.evil.test/a?format=csv', 'http://docs.google.com/spreadsheets/d/abc/edit', 'https://docs.google.com:8443/spreadsheets/d/abc/edit', 'https://docs.google.com@evil.test/spreadsheets/d/abc/edit', 'http://127.0.0.1/?format=csv']) assert.equal(googleCsvExportUrl(url, '가장체크'), null);
  assert.match(googleCsvExportUrl('https://docs.google.com/spreadsheets/d/abc/edit', '가장체크'), /^https:\/\/docs.google.com\/spreadsheets\/d\/abc\/gviz/);
  assert.match(googleCsvExportUrl('https://docs.google.com/spreadsheets/d/e/published-id/pub?gid=123', ''), /\/e\/published-id\/pub\?output=csv&gid=123$/);
  let handlers = 0;
  function inspect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { inspect(file); continue; }
      if (entry.name !== 'route.ts' || file.includes(`${path.sep}auth${path.sep}`)) continue;
      const source = fs.readFileSync(file, 'utf8');
      const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
      for (const node of ast.statements) {
        if (ts.isFunctionDeclaration(node) && /^(GET|POST|PATCH|PUT|DELETE)$/.test(node.name?.text || '')) {
          assert.match(node.body.statements[0].getText(ast), /await checkRequestSecurity\(/, file);
          assert.match(node.body.statements[1].getText(ast), /if \(denied\) return denied/, file);
          handlers++;
        }
      }
    }
  }
  inspect(path.join(root, 'app/api'));
  assert.ok(handlers >= 20);
  const { NextRequest } = require('next/server');
  const { middleware } = require('../middleware.ts');
  process.env.APP_PUBLIC_ORIGIN = 'https://external.example.test';
  for (const origin of ['http://localhost:3000', 'https://localhost:3000', 'https://external.example.test']) {
    const denied = await middleware(new NextRequest(origin + '/search?q=test', { headers: { host: 'external.example.test', 'x-forwarded-proto': 'https' } }));
    assert.equal(denied.status, 307);
    assert.equal(denied.headers.get('location'), 'https://external.example.test/login?next=%2Fsearch%3Fq%3Dtest', 'Login redirect must preserve the pinned external origin');
    assert.match(denied.headers.get('cache-control'), /no-store/);
  }
  const spoofedHost = await middleware(new NextRequest('http://localhost:3000/search', { headers: { host: 'localhost:3000', 'x-forwarded-host': 'evil.test' } }));
  assert.equal(new URL(spoofedHost.headers.get('location')).host, 'localhost:3000');
  process.env.APP_PUBLIC_ORIGIN = 'https://external.example.test/path';
  assert.equal((await middleware(new NextRequest('http://localhost:3000/search'))).status, 503);
  delete process.env.APP_PUBLIC_ORIGIN;
  assert.equal((await middleware(new NextRequest('https://app.test/login'))).status, 200);
  assert.equal((await middleware(new NextRequest('https://app.test/search', { headers: { cookie: `${s.SESSION_COOKIE}=${token}` } }))).status, 200);
  const { POST: login } = require('../app/api/auth/login/route.ts');
  const loginRequest = password => new NextRequest('https://app.test/api/auth/login', { method: 'POST', headers: { origin: 'https://app.test', 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
  assert.equal((await login(loginRequest('wrong'))).status, 401);
  const success = await login(loginRequest(process.env.APP_ACCESS_PASSWORD));
  assert.equal(success.status, 200);
  assert.equal(await s.validSession(success.cookies.get(s.SESSION_COOKIE).value), true);
  for (let i = 0; i < 29; i++) await login(loginRequest('wrong'));
  assert.equal((await login(loginRequest('wrong'))).status, 429);
  console.log(`Security regression passed: ${handlers} guarded API handlers, signed/expired sessions, CSRF, body limit, worker auth, URL allowlist, login throttling`);
})().catch(error => { console.error(error); process.exitCode = 1; });
