// Isolated Runner lifecycle tests. No DB, browsers or attendance writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('runner/src/runner.js', 'utf8');
const ast = ts.createSourceFile('runner.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'Runner').getText(ast);
function fixture() {
  const waits = [], timers = new Set();
  const context = vm.createContext({ createDataClient: () => ({}), console: { log() {}, error() {} },
    sleep: async ms => waits.push(ms), setInterval: fn => { timers.add(fn); return fn; }, clearInterval: fn => timers.delete(fn) });
  const Runner = vm.runInContext(cls + '; Runner', context);
  const runner = new Runner({ runnerId: 'test', pollIntervalMs: 25, heartbeatIntervalMs: 1000, once: false });
  runner.heartbeat = async () => {};
  runner.pickQueuedRun = async () => null;
  runner.pickQueuedQrJob = async () => null;
  return { runner, waits, timers };
}
(async () => {
  const a = fixture(); let lookups = 0, processed = 0;
  a.runner.heartbeat = async () => { throw new Error('ENOTFOUND'); };
  a.runner.pickQueuedRun = async () => {
    if (++lookups <= 2) throw new Error('fetch failed');
    return { id: 'existing-queued-request' };
  };
  a.runner.processRun = async run => { assert.equal(run.id, 'existing-queued-request'); processed++; a.runner.config.once = true; };
  await a.runner.start();
  assert.equal(lookups, 3); assert.equal(processed, 1); assert.deepEqual(a.waits, [1000, 1000]); assert.equal(a.timers.size, 0);

  const b = fixture(); let qrReads = 0, qrProcessed = 0;
  b.runner.pickQueuedQrJob = async () => { if (++qrReads === 1) throw new Error('timeout'); return { id: 'qr' }; };
  b.runner.processQrJob = async () => { qrProcessed++; b.runner.config.once = true; };
  await b.runner.start();
  assert.equal(qrProcessed, 1); assert.equal(qrReads, 2); assert.equal(b.timers.size, 0);

  const c = fixture(); let claims = 0;
  c.runner.pickQueuedRun = async () => { claims++; return { id: 'already-claimed' }; };
  c.runner.processRun = async () => { throw new Error('result persistence failed'); };
  await assert.rejects(c.runner.start(), /result persistence failed/);
  assert.equal(claims, 1, 'Do not replay work on processing failure'); assert.equal(c.timers.size, 0, 'No orphan online timer');

  const d = fixture(); d.runner.config.once = true;
  d.runner.pickQueuedRun = async () => { throw new Error('offline'); };
  await assert.rejects(d.runner.start(), /offline/); assert.equal(d.timers.size, 0);
  assert.equal((source.match(/abortSignal\(AbortSignal.timeout\(15000\)\)/g) || []).length, 5);
  console.log('PASS: startup DNS failure recovery, attendance/QR polling retry, no work replay, heartbeat cleanup, bounded requests.');
})().catch(error => { console.error(error); process.exitCode = 1; });
