// Exercise the real route with fake storage/writes: no network or attendance changes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const selection = { week: 44, sheetUrl: 'https://docs.google.com/spreadsheets/d/test/edit', sheetTab: '가장체크' };
const preview = { id: 'server-preview', ...selection, service13Names: ['서버명단'], service4Names: [] };
const applied = [], queued = [];
let denied = null;
const selectionExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/qr-selection.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, { exports: selectionExports });
const route = {};
const deps = {
  '@/lib/security': { checkRequestSecurity: async () => denied },
  'next/server': { NextResponse: { json: (body, opts) => ({ status: opts?.status ?? 200, body }) } },
  '@/lib/qr-selection': selectionExports,
  '@/lib/qr-attendance-sync': {
    qrAttendanceDefaults: { department: '2청년회' },
    hydrateQrAttendancePreview: () => { throw Error('Client preview must not replace server cache'); },
    applyQrAttendancePreview: async (id, input) => {
      if (id !== preview.id) throw Error('미리보기 유효시간이 지났습니다');
      selectionExports.assertQrSelectionMatches(preview, input);
      applied.push(id); return { appliedAt: 'test', source: preview.service13Names };
    }
  },
  '@/lib/supabase/server': {
    hasSupabaseEnv: () => true,
    getServiceSupabase: () => ({ from: () => ({ insert: row => {
      queued.push(row);
      return { select: () => ({ single: async () => ({ data: { id: 'job', status: 'queued' } }) }) };
    } }) })
  }
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/qr-attendance/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, { exports: route, require: name => { if (!(name in deps)) throw Error(name); return deps[name]; } });
const request = (hostname, body, host = hostname) => ({ nextUrl: { hostname, host: hostname }, headers: { get: key => key === 'host' ? host : null }, json: async () => body });
(async () => {
  // Old mobile payload + tunnel-local hostname was the reported failing case.
  for (const body of [
    { action: 'apply', preview, ...selection },
    { action: 'apply', previewId: preview.id, ...selection },
    { action: 'apply', previewId: preview.id, preview, ...selection }
  ]) assert.equal((await route.POST(request('localhost', body))).status, 200);
  const tampered = await route.POST(request('localhost', { action: 'apply', preview: { ...preview, service13Names: ['改変'] }, ...selection }));
  assert.equal(tampered.body.data.source[0], '서버명단');
  assert.equal((await route.POST(request('localhost', { action: 'apply', ...selection }))).status, 400);
  assert.equal((await route.POST(request('localhost', { action: 'apply', preview, ...selection, week: 43 }))).status, 500);
  assert.equal((await route.POST(request('localhost', { action: 'apply', previewId: 'expired', ...selection }))).status, 500);
  assert.equal((await route.POST(request('public.example', { action: 'apply', previewId: preview.id, preview, ...selection }))).status, 202);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].preview.id, preview.id);
  assert.equal((await route.POST(request('localhost', { action: 'apply', preview, ...selection }, 'public.example'))).status, 202, 'Tunnel Host must route through queue even when Next URL is localhost');
  assert.equal(queued.length, 2);
  denied = { status: 401 };
  assert.equal((await route.POST(request('localhost', { action: 'apply', preview, ...selection }))).status, 401);
  assert.equal(applied.length, 4);
  const ui = fs.readFileSync('components/qr-attendance-sync.tsx', 'utf8');
  assert.match(ui, /JSON\.stringify\(\{ action: "apply", previewId: preview\.id, preview, \.\.\.selection \}\)/);
  console.log('PASS: mobile tunnel/direct/queued payloads, server-cache authority, stale selection, expired preview, authentication. No real writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
