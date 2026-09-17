const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('runner/legacy-ch2ch/src/main.js', 'utf8');
function extract(start, end) {
  return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
}
(async () => {
  const calls = [];
  const context = vm.createContext({
    CONFIG: { dryRun: true, savePerFamily: false, familyLoadWaitMs: 0 },
    findMemberRow: async (_, name) => { calls.push(name); return name === '정상대상' ? {} : null; },
    clickTextInAnyFrame: async () => true,
    shortDelay: async () => {},
    waitForFamilyMemberText: async () => true,
    readWebAttendanceState: async () => ({ ok: true, sunday: true, department: false }),
    targetActionText: () => '필요 작업: 주일 체크',
    log: () => {}
  });
  vm.runInContext(extract('async function findMemberRowWithRetry(', 'async function readVisibleMemberTexts('), context);
  vm.runInContext(extract('async function processFamily(', 'async function finalSave('), context);
  const result = await context.processFamily({}, '재용이네', ['정지원', '한신혜', '박선희E', '정상대상'].map(name => ({ family: '재용이네', name, sunday: true, department: false })));
  for (const name of ['정지원', '한신혜', '박선희E']) {
    assert.equal(calls.filter(item => item === name).length, 1);
    const person = result.people.find(item => item.name === name);
    assert.equal(person.ok, false);
    assert.equal(Boolean(person.deferredSearch), false);
    assert.match(person.reason, /1회 확인 후 건너뜀/);
  }
  assert.equal(result.success, 1, 'Continue processing the next person after missing rows');
  assert.equal(result.failed, 3);
  const main = source.slice(source.indexOf('async function main('));
  assert.doesNotMatch(main, /await (?:processSearchCorrectionWithRetry|runAffiliationAuditParallel|resolveMissingAffiliations)\(/, 'No post-run global search or affiliation crawl');
  console.log('Attendance single pass passed: one lookup per missing person, continue next, no deferred/global retry');
})().catch(error => { console.error(error); process.exitCode = 1; });
