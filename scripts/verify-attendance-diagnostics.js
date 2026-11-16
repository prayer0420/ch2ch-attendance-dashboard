const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { PassThrough } = require('node:stream');
const { once } = require('node:events');
const { decodeDiagnostic, readLines } = require('../runner/src/legacy-diagnostics');

(async () => {
  const { ensureFamilyReady } = await import('../runner/legacy-ch2ch/src/family-readiness.js');
  const { createDiagnostics } = await import('../runner/legacy-ch2ch/src/diagnostics.js');
  const valid = { matched: 1, matchedNames: ['송민석'], observedFamilies: ['민석이네'], selectedWeeks: ['40주 (2026-10-04)'], rows: 6, errors: [] };
  for (const recovers of [true, false]) {
    let clock = 0; let entry = 0; const records = [];
    const result = await ensureFamilyReady({
      enter: async attempt => { entry = attempt; return true; },
      inspect: async () => recovers && entry === 2 ? valid : { ...valid, matched: 0, matchedNames: [] },
      record: async detail => records.push(detail), pause: async ms => { clock += ms; }, now: () => clock, timeoutMs: 400
    });
    assert.equal(result.ok, recovers);
    assert.equal(entry, 2, 'Only one re-entry is permitted');
    assert.equal(records.length, 2);
    assert.equal(records[0].reason, 'expected-members-not-found');
    assert.equal(records[1].ready, recovers);
  }
  for (const bad of [{ weekMismatch: true }, { ambiguous: true }, { errors: [{ type: 'Error' }] }]) {
    let clock = 0;
    const result = await ensureFamilyReady({ enter: async () => true, inspect: async () => ({ ...valid, ...bad }),
      record: async () => {}, pause: async ms => { clock += ms; }, now: () => clock, timeoutMs: 200 });
    assert.equal(result.ok, false, 'Matching name alone cannot override conflicting evidence');
  }

  // Exercise actual processFamily: a found-but-detached row gets one fresh read.
  const source = fs.readFileSync('runner/legacy-ch2ch/src/main.js', 'utf8');
  const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
  for (const recovers of [true, false]) {
    let reads = 0; let lookups = 0; const events = [];
    const context = vm.createContext({
      CONFIG: { dryRun: true, savePerFamily: false },
      prepareFamilyPage: async () => ({ ok: true }),
      findMemberRow: async () => ({ rowHandle: {}, matchMode: 'exact', serial: ++lookups }),
      readWebAttendanceState: async () => ++reads === 1 || !recovers
        ? { ok: false, reason: 'row-detached', fields: { sunday: { count: 0 } } }
        : { ok: true, sunday: false, department: true },
      waitForStableMemberRows: async () => 1,
      memberRowMisses: new Map(),
      diagnostics: { emit: (...args) => events.push(args), capture: async () => ({ status: 'test-only' }) },
      targetActionText: () => '부서 체크', log: () => {}
    });
    vm.runInContext(extract('async function findMemberRowWithRetry(', 'async function readVisibleMemberTexts('), context);
    vm.runInContext(extract('async function processFamily(', 'async function finalSave('), context);
    const result = await context.processFamily({}, '새가족반', [{ name: '박선희E', family: '새가족반', sunday: false, department: true }]);
    assert.equal(reads, 2, 'Checkbox read is retried exactly once');
    assert.equal(result.success, recovers ? 1 : 0);
    assert.equal(result.failed, recovers ? 0 : 1);
    assert.ok(events.some(event => event[0] === 'member-read-retry'));
    if (!recovers) assert.ok(events.some(event => event[0] === 'member-read-failed' && event[2].screenshot));
  }

  const runId = 'diagnostic-fixture';
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ch2ch-diagnostics-'));
  const lines = [];
  const diagnostics = createDiagnostics({ runId, directory, target: { targetWeek: '40', targetDate: '2026-10-04' }, output: line => lines.push(line) });
  diagnostics.emit('member-read-failed', '박선희E 체크박스 읽기 실패', { name: '박선희E', family: '새가족반', count: 0 }, 'warn');
  const persisted = JSON.parse(fs.readFileSync(path.join(directory, runId, 'events.jsonl'), 'utf8'));
  const stream = new PassThrough(); const received = [];
  const reader = readLines(stream, line => received.push(decodeDiagnostic(line, runId)));
  const bytes = Buffer.from(lines[0]);
  for (let index = 0; index < bytes.length; index += 3) stream.write(bytes.subarray(index, index + 3));
  stream.end();
  await once(reader, 'close');
  assert.equal(received.length, 1);
  assert.deepEqual(received[0], persisted, 'DB envelope must retain Korean text and details across chunk boundaries');
  assert.throws(() => decodeDiagnostic(lines[0], 'wrong-run'));
  assert.equal(decodeDiagnostic('normal output', runId), null);
  const screenshot = await diagnostics.capture({ frames: () => [], screenshot: async options => {
    const buffer = Buffer.from('test-png'); fs.writeFileSync(options.path, buffer); return buffer;
  } });
  assert.equal(screenshot.status, 'saved-local');
  assert.equal(screenshot.sha256.length, 64);
  assert.ok(screenshot.relativePath.includes(runId));
  const failedCapture = await diagnostics.capture({ frames: () => [], screenshot: async () => { throw new Error('secret-not-to-log'); } });
  assert.deepEqual(failedCapture, { status: 'capture-failed', errorType: 'Error' });
  console.log('PASS: one family re-entry, conflicting evidence rejection, stale-row re-read, durable structured logs, UTF-8 chunk framing and screenshot references');
})().catch(error => { console.error(error); process.exitCode = 1; });
