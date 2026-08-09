const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");
const XLSX = require("xlsx");

const projectRoot = path.resolve(__dirname, "..", "..");

function loadTypeScriptModule(relativePath) {
  const filename = path.join(projectRoot, relativePath);
  if (!fs.existsSync(filename)) {
    assert.fail(`${relativePath} is not implemented`);
  }

  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2020
    },
    fileName: filename
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(compiled.outputText, filename);
  return loaded.exports;
}

function workbookBuffer(sheets) {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of sheets) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
}

function accountingRows(dateLabel = "2026.06.28헌금") {
  return [
    ["", dateLabel],
    ["", "NO.", "주일헌금", "", "NO.", "감사헌금", "", ""],
    ["", "온라인", "", "", "온라인", "", "", "감사 내용"],
    ["", 1, "김건우", 10000, 1, "구자연", 10000, "모든 것이 감사합니다."],
    ["", 2, "김대완", 120000, 2, "우재황", 500000, ""],
    ["", "온라인 계", "", 130000, "온라인 계", "", 510000, ""],
    ["", "현장", "", "", "현장", "", "", "감사 내용"],
    ["", 1, "김다정", 10000, 1, "박대성", 50000, ""],
    ["", 2, "김이레", 10000, 2, "박찬호", 50000, "상반기 마침 감사"],
    ["", "현장 계", "", 20000, "현장 계", "", 100000, ""],
    ["", "주일헌금 총계", "", 150000, "감사헌금 총계", "", 610000, ""]
  ];
}

const { accountingDownloadUrls, parseAccountingWorkbook } = loadTypeScriptModule("lib/worship-journal-accounting.ts");

const result = parseAccountingWorkbook(
  workbookBuffer([["6월 마지막", accountingRows()]]),
  "2026-06-28",
  { sourceType: "excel", sourceName: "회계.xlsx" }
);

assert.equal(result.sheetTab, "6월 마지막");
assert.equal(result.total, 610000);
assert.deepEqual(result.thanksgiving.map(({ name }) => name), ["구자연", "박찬호", "박대성", "우재황"]);
assert.equal(result.thanksgiving[0].note, "모든 것이 감사합니다.");
assert.equal(result.thanksgiving[2].note, "");

const olderRows = accountingRows();
olderRows[3][6] = 1000;
const latestRows = accountingRows();
latestRows[3][6] = 2000;
const rightmost = parseAccountingWorkbook(
  workbookBuffer([["6월 28일 입력", olderRows], ["6월 28일 최종", latestRows]]),
  "2026-06-28",
  { sourceType: "excel", sourceName: "회계.xlsx" }
);
assert.equal(rightmost.sheetTab, "6월 28일 최종");
assert.equal(rightmost.thanksgiving.find(({ name }) => name === "구자연").amount, 2000);

const formattedRows = accountingRows("2026년 6월 28일 헌금");
formattedRows[3][6] = "₩12,000원";
const formatted = parseAccountingWorkbook(
  workbookBuffer([["마감본", formattedRows]]),
  "2026-06-28",
  { sourceType: "google-sheet", sourceName: "회계 링크" }
);
assert.equal(formatted.thanksgiving.find(({ name }) => name === "구자연").amount, 12000);

assert.equal(typeof accountingDownloadUrls, "function", "Google Sheet download URL builder must be exported");
const spreadsheetId = "1SCmg4YEDBLre3fgWCRfUS1gGL4WW1MnZ";
assert.deepEqual(accountingDownloadUrls(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`), [
  `https://drive.google.com/uc?export=download&id=${spreadsheetId}`,
  `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`
]);
assert.throws(() => accountingDownloadUrls("https://example.com/not-a-sheet"), /올바른 Google Sheet 링크/);
assert.throws(
  () => parseAccountingWorkbook(
    workbookBuffer([["작년 자료", accountingRows("2025.06.28헌금")]]),
    "2026-06-28",
    { sourceType: "excel", sourceName: "회계.xlsx" }
  ),
  /2026-06-28 회계 탭을 찾지 못했습니다/
);

console.log("accounting parser: extraction, sorting, date selection, and URL validation passed");
