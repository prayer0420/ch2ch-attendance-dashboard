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
const { parseAttendanceRows } = loadTypeScriptModule(
  path.resolve(__dirname, "..", "lib", "attendance-input-parser.ts")
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

const horizontal = [
  [family, "1-3부", "", "", "4부", "", "", "", family, "1-3부", "", "", "4부", "", "", ""],
  ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
  ["QrOnly", "true", "false", "false", "false", "false", "false", "", "", "false", "false", "false", "false", "false", "false", ""],
  ["AttendOnly", "false", "true", "false", "false", "false", "false", "", "", "false", "true", "false", "false", "false", "false", ""],
  ["Qr4Only", "false", "false", "false", "true", "false", "false", "", "", "false", "false", "false", "true", "false", "false", ""],
  ["Attend4Only", "false", "false", "false", "false", "true", "false", "", "", "false", "false", "false", "false", "true", "false", ""]
].map((row) => row.map(String));
const parsedHorizontal = parseAttendanceRows(horizontal, { includeUnchecked: true });
assert.deepEqual(
  JSON.parse(JSON.stringify(parsedHorizontal.people
    .filter(({ name }) => ["QrOnly", "AttendOnly", "Qr4Only", "Attend4Only"].includes(name))
    .map(({ name, service13, service4 }) => ({ name, service13, service4 })))),
  [
    { name: "QrOnly", service13: false, service4: false },
    { name: "AttendOnly", service13: true, service4: false },
    { name: "Qr4Only", service13: false, service4: false },
    { name: "Attend4Only", service13: false, service4: true }
  ]
);

const explicitHeaders = [
  [family, "1-3부", "", "", "4부", "", "", ""],
  ["", "출석", "참석", "방송", "출석", "참석", "방송", "가족"],
  ["SummaryOnly", "true", "false", "false", "true", "false", "false", "false"],
  ["AttendOnly", "false", "true", "false", "false", "true", "false", "false"],
  ["BroadcastOnly", "false", "false", "true", "false", "false", "true", "false"]
].map((row) => row.map(String));
const parsedExplicitHeaders = parseAttendanceRows(explicitHeaders, { includeUnchecked: true });
assert.deepEqual(
  JSON.parse(JSON.stringify(parsedExplicitHeaders.people
    .filter(({ name }) => ["SummaryOnly", "AttendOnly", "BroadcastOnly"].includes(name))
    .map(({ name, service13, service4 }) => ({ name, service13, service4 })))),
  [
    { name: "SummaryOnly", service13: false, service4: false },
    { name: "AttendOnly", service13: true, service4: true },
    { name: "BroadcastOnly", service13: false, service4: false }
  ]
);
const splitExplicit = __test.splitAttendanceTargets(parsedExplicitHeaders.people);
assert.equal(splitExplicit.allPeople.length, 3);
assert.deepEqual(
  JSON.parse(JSON.stringify(splitExplicit.attendancePeople.map(({ name }) => name))),
  ["AttendOnly"]
);
const adapterExplicitHeaders = __test.rowsFromCsv(
  explicitHeaders.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")
);
assert.deepEqual(
  adapterExplicitHeaders
    .filter(({ service13, service4 }) => service13 || service4)
    .map(({ name, service13, service4 }) => ({ name, service13, service4 })),
  [{ name: "AttendOnly", service13: true, service4: true }]
);
const qrAdapterHeaders = [
  [family, "1-3부", "", "", "4부", "", "", ""],
  ["", "QR", "참석", "방송", "QR", "참석", "방송", "가족"],
  ["QrOnly", "true", "false", "false", "true", "false", "false", "false"],
  ["AttendOnly", "false", "true", "false", "false", "true", "false", "false"]
].map((row) => row.map(String));
const qrAdapterPeople = __test.rowsFromCsv(
  qrAdapterHeaders.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")
);
assert.deepEqual(
  qrAdapterPeople
    .filter(({ service13, service4 }) => service13 || service4)
    .map(({ name, service13, service4 }) => ({ name, service13, service4 })),
  [{ name: "AttendOnly", service13: true, service4: true }]
);

console.log("attendance sync regression checks passed");
