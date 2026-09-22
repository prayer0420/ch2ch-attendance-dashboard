const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText, file);
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...args) { return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, parent, ...args); };

(async () => {
  const { readPagination } = require('../lib/api-pagination.ts');
  for (const value of ['0', '-1', 'NaN', 'Infinity', '1.2', '100001']) assert.equal(readPagination(new URLSearchParams({ page: value })), null);
  for (const value of ['0', '-1', '101', 'Infinity']) assert.equal(readPagination(new URLSearchParams({ pageSize: value })), null);
  assert.deepEqual(readPagination(new URLSearchParams('page=2&pageSize=30')), { page: 2, pageSize: 30, from: 30, to: 59 });
  const { appContract, openApiDocument } = require('../lib/api-contract.ts');
  for (const apiPath of Object.keys(openApiDocument.paths)) {
    const source = fs.readFileSync(path.join(root, 'app', apiPath, 'route.ts'), 'utf8');
    for (const method of Object.keys(openApiDocument.paths[apiPath])) assert.match(source, new RegExp(`export (async )?function ${method.toUpperCase()}\\(`));
  }
  assert.equal(appContract.auth.crossOrigin, false);
  const s = require('../lib/security.ts');
  process.env.APP_ACCESS_PASSWORD = 'isolated-contract-test-password';
  process.env.APP_SESSION_TOKEN = 'isolated-contract-test-signing-key-not-production';
  const { NextRequest } = require('next/server');
  const cookie = `${s.SESSION_COOKIE}=${await s.createSession()}`;
  const req = pathname => new NextRequest(`https://app.test${pathname}`, { headers: { cookie } });
  const appApi = require('../app/api/app/route.ts');
  assert.equal((await appApi.GET(new Request('https://app.test/api/app'))).status, 401);
  const appData = await (await appApi.GET(req('/api/app'))).json();
  assert.equal(appData.data.session.authenticated, true);
  assert.ok(Date.parse(appData.data.session.expiresAt) > Date.now());
  assert.equal(JSON.stringify(appData).includes(process.env.APP_SESSION_TOKEN), false);

  // Simulate live storage without making remote writes or relying on private data.
  const db = require('../lib/supabase/server.ts');
  let live = false;
  let reply = { data: [{ id: 'live-fixture', member_name: 'fixture' }], error: null };
  const calls = [];
  const query = new Proxy({}, { get: (_, name) => name === 'then' ? (ok, bad) => Promise.resolve(reply).then(ok, bad) : (...args) => { calls.push([name, ...args]); return query; } });
  db.hasSupabaseEnv = () => live;
  db.getServiceSupabase = () => query;
  const attendance = require('../app/api/attendance/route.ts');
  assert.equal((await (await attendance.GET(req('/api/attendance'))).json()).demo, true);
  for (const suffix of ['?week=54', '?service=other', '?pageSize=101']) assert.equal((await attendance.GET(req('/api/attendance' + suffix))).status, 400);
  live = true;
  const actual = await (await attendance.GET(req('/api/attendance?week=37&name=fixture&family=test&service=4&failuresOnly=true&page=2&pageSize=10'))).json();
  assert.equal(actual.demo, false);
  assert.equal(actual.data[0].id, 'live-fixture');
  assert.deepEqual(calls.at(-1), ['range', 10, 19]);
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'target_week' && call[2] === 37));
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'service_4_present' && call[2] === true));
  reply = { data: null, error: { message: 'fixture database error' } };
  const failure = await attendance.GET(req('/api/attendance'));
  assert.equal(failure.status, 503);
  assert.equal((await failure.json()).demo, undefined);

  const policy = require('../desktop/navigation-policy');
  const launcher = pathToFileURL(path.join(root, 'desktop/renderer/index.html')).href;
  assert.equal(policy.isLauncherUrl(launcher), true);
  assert.equal(policy.isLauncherUrl('file:///C:/evil/index.html'), false);
  assert.equal(policy.isAppUrl('http://127.0.0.1:3000/settings'), true);
  for (const bad of ['http://127.0.0.1:3001/', 'https://127.0.0.1:3000/', 'http://user@127.0.0.1:3000/', 'https://evil.test', 'javascript:alert(1)']) assert.equal(policy.isAppUrl(bad), false);
  assert.equal(policy.isAllowedExternalUrl('https://docs.google.com/spreadsheets/d/example'), true);
  for (const bad of ['https://docs.google.com.evil.test', 'https://docs.google.com:444/', 'file:///c:/windows/', 'https://user@docs.google.com/']) assert.equal(policy.isAllowedExternalUrl(bad), false);
  const frame = { url: launcher };
  const contents = { mainFrame: frame };
  assert.equal(policy.isTrustedIpc({ sender: contents, senderFrame: frame }, contents), true);
  assert.equal(policy.isTrustedIpc({ sender: contents, senderFrame: { url: launcher } }, contents), false);
  frame.url = 'http://127.0.0.1:3000/';
  assert.equal(policy.isTrustedIpc({ sender: contents, senderFrame: frame }, contents), false);
  const net = require('node:net');
  const server = net.createServer();
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const { assertPortAvailable } = require('../desktop/process-manager');
  const port = server.address().port;
  try { await assert.rejects(assertPortAvailable(port), /포트를 다른 프로그램/); }
  finally { await new Promise(ok => server.close(ok)); }
  await assertPortAvailable(port);
  const filters = require('../package.json').build.extraResources[0].filter;
  assert.ok(!filters.includes('**/*'), 'Project resources must use a source allowlist');
  assert.ok(filters.includes('!**/.env*'));
  assert.ok(filters.includes('!**/*.pem'));
  console.log('App contract passed: pagination, real/demo data separation, DB errors, protected discovery, API routes, Electron IPC/navigation, occupied port preservation, packaging exclusions');
})().catch(error => { console.error(error); process.exitCode = 1; });
