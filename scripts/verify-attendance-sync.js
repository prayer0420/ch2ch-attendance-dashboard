const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadTypeScriptModule(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS
    },
    fileName: filePath
  }).outputText;
  const module = { exports: {} };
  const context = {
    console,
    module,
    exports: module.exports,
    require,
    __dirname: path.dirname(filePath),
    __filename: filePath
  };
  vm.runInNewContext(`(function(require, module, exports, __dirname, __filename) { ${compiled}\n })(require, module, module.exports, __dirname, __filename);`, context, {
    filename: filePath
  });
  return module.exports;
}

const { buildAttendanceRunRows } = loadTypeScriptModule(
  path.resolve(__dirname, "..", "lib", "attendance-run-selection.ts")
);
const { __test } = require(path.resolve(__dirname, "..", "runner", "src", "automation-adapter.js"));

const family = String.fromCodePoint(0xC7AC, 0xC6D0, 0xC774, 0xB124);
const kim = String.fromCodePoint(0xAE40, 0xC7AC, 0xC6D0);
const bayu = String.fromCodePoint(0xBC30, 0xC720, 0xB9BC);

const rows = buildAttendanceRunRows(
  [
    { family, name: kim, service13: false, service4: false },
    { family, name: bayu, service13: false, service4: true }
  ],
  { [family]: { sunday: "sheet", department: "sheet" } }
);

assert.deepEqual(rows.map(({ name, service13, service4 }) => ({ name, service13, service4 })), [
  { name: kim, service13: false, service4: false },
  { name: bayu, service13: false, service4: true }
]);

const parsed = __test.rowsFromCsv([
  "family,name,sunday,department",
  `${family},${kim},X,X`,
  `${family},${bayu},X,O`
].join("\n"));
assert.deepEqual(parsed.map(({ name, service13, service4 }) => ({ name, service13, service4 })), [
  { name: kim, service13: false, service4: false },
  { name: bayu, service13: false, service4: true }
]);
assert.doesNotThrow(() => __test.validatePreparedPeople(parsed));

console.log("attendance sync regression checks passed");
