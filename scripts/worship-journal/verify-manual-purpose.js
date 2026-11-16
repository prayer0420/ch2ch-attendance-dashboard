const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(file) {
  const filename = path.resolve(__dirname, '../../lib', file);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  return loaded.exports;
}
const { addManualPurposeOfferings } = load('worship-journal-manual-purpose.ts');
const { applyReviewedJournal, worshipJournalReviewDigest } = load('worship-journal-review.ts');
const base = { sourceType: 'excel', sourceName: 'test', sheetTab: '1011', sundayTotal: 340000, thanksgivingTotal: 396000, total: 736000, purposeTotal: 20000, purpose: [{name:'기존헌금',amount:20000,note:''}], thanksgiving: [] };
assert.deepEqual(addManualPurposeOfferings(base, [{name:'',amount:''}]), base);
const manual = [{ name: '흘려보내는 기쁨', amount: '10000' }];
const added = addManualPurposeOfferings(base, manual);
assert.equal(added.purpose.length, 2);
assert.equal(base.purpose.length, 1, 'Do not mutate or repeatedly append to the source');
assert.equal(added.purposeTotal, 30000);
assert.equal(added.total, 736000);
assert.deepEqual(addManualPurposeOfferings(base, manual), added, 'Repeated previews are deterministic');
for (const raw of [null, {}, [{name:'',amount:'100'}], [{name:'목적',amount:''}], [{name:'목적',amount:'-1'}], [{name:'목적',amount:'1.5'}], [{name:'목적',amount:true}], Array(10).fill(manual[0])]) {
  assert.throws(() => addManualPurposeOfferings(base, raw), /목적헌금/);
}
const journal = { date:'2026-10-11',author:'test',source:{},attendance:{families:[]},newFamilies:[],graduates:[],accounting:added,sermon:{},service:{},announcements:[] };
assert.notEqual(worshipJournalReviewDigest(journal), worshipJournalReviewDigest({...journal,accounting:base}));
const reviewed = applyReviewedJournal(journal, {accounting:added});
assert.equal(reviewed.accounting.purpose.length, 2, 'Publishing does not append manual entries a second time');
assert.equal(reviewed.accounting.total, 736000);
const component = fs.readFileSync(path.resolve(__dirname,'../../components/worship-journal-builder.tsx'),'utf8');
assert.match(component, /body\.set\("manualPurpose", JSON\.stringify\(manualPurpose\)\)/);
const signature = component.slice(component.indexOf('const currentSignature'), component.indexOf('const validation = useMemo'));
assert.match(signature, /manualPurpose/);
const api = fs.readFileSync(path.resolve(__dirname,'../../app/api/worship-journals/route.ts'),'utf8');
assert.ok(api.indexOf('accounting = addManualPurposeOfferings') < api.indexOf('const journalBase'));
console.log('PASS: optional manual input, validation, source preservation, separate totals, preview/publish digest and no double addition');
