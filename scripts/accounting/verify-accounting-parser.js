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
    ["", "NO.", "주일헌금", "", "NO.", "감사헌금", "", "", "NO.", "목적헌금", ""],
    ["", "온라인", "", "", "온라인", "", "", "감사 내용", "온라인", "", ""],
    ["", 1, "김건우", 10000, 1, "구자연", 10000, "모든 것이 감사합니다.", 1, "선교헌금", 50000],
    ["", 2, "김대완", 120000, 2, "우재황", 500000, "", "온라인 계", "", 50000],
    ["", "온라인 계", "", 130000, "온라인 계", "", 510000, "", "", "", ""],
    ["", "현장", "", "", "현장", "", "", "감사 내용", "", "", ""],
    ["", 1, "김다정", 10000, 1, "박대성", 50000, "", "", "", ""],
    ["", 2, "김이레", 10000, 2, "박찬호", 50000, "상반기 마침 감사", "", "", ""],
    ["", "현장 계", "", 20000, "현장 계", "", 100000, "", "", "", ""],
    ["", "주일헌금 총계", "", 150000, "감사헌금 총계", "", 610000, "", "목적헌금 총계", "", 50000]
  ];
}

const {
  accountingDownloadUrls,
  formatThanksgivingOffering,
  isAccountingSourceReady,
  loadAccountingFromGoogleSheet,
  parseAccountingWorkbook
} = loadTypeScriptModule("lib/worship-journal-accounting.ts");

const result = parseAccountingWorkbook(
  workbookBuffer([["6월 마지막", accountingRows()]]),
  "2026-06-28",
  { sourceType: "excel", sourceName: "회계.xlsx" }
);

assert.equal(result.sheetTab, "6월 마지막");
assert.equal(result.sundayTotal, 150000);
assert.equal(result.thanksgivingTotal, 610000);
assert.equal(result.purposeTotal, 50000);
assert.equal(result.total, 810000);
assert.equal(result.sunday.length, 4);
assert.deepEqual(result.sunday.map(entry => entry.name), ["김건우", "김다정", "김대완", "김이레"]);
assert.deepEqual(result.purpose, [{ name: "선교헌금", amount: 50000, note: "" }]);
assert.deepEqual(result.thanksgiving.map(({ name }) => name), ["구자연", "박찬호", "박대성", "우재황"]);
assert.equal(result.thanksgiving[0].note, "모든 것이 감사합니다.");
assert.equal(result.thanksgiving[2].note, "");

const olderRows = accountingRows();
const mismatchRows = accountingRows();
mismatchRows[3][5] = "";
assert.throws(() => parseAccountingWorkbook(workbookBuffer([["0628", mismatchRows]]), "2026-06-28", {sourceType:"excel",sourceName:"누락 검사.xlsx"}), /명단 합계.*원본 총계/);
const zeroRows = accountingRows();
zeroRows.splice(4, 0, ["", "", "", "", 3, "금액확인필요", "", "감사내용 있음"]);
assert.ok(parseAccountingWorkbook(workbookBuffer([["0628", zeroRows]]), "2026-06-28", {sourceType:"excel",sourceName:"금액 없음.xlsx"}).thanksgiving.some(entry => entry.name === "금액확인필요" && entry.amount === 0));
olderRows[3][6] = 1000;
olderRows[10][6] = 601000;
const latestRows = accountingRows();
latestRows[3][6] = 2000;
latestRows[10][6] = 602000;
const rightmost = parseAccountingWorkbook(
  workbookBuffer([["6월 28일 입력", olderRows], ["6월 28일 최종", latestRows]]),
  "2026-06-28",
  { sourceType: "excel", sourceName: "회계.xlsx" }
);
assert.equal(rightmost.sheetTab, "6월 28일 최종");
assert.equal(rightmost.thanksgiving.find(({ name }) => name === "구자연").amount, 2000);

const formattedRows = accountingRows("2026년 6월 28일 헌금");
formattedRows[3][6] = "₩12,000원";
formattedRows[10][6] = 612000;
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
assert.equal(typeof loadAccountingFromGoogleSheet, "function", "Google Sheet loader must be exported");
assert.equal(typeof isAccountingSourceReady, "function", "accounting input readiness helper must be exported");
assert.equal(typeof formatThanksgivingOffering, "function", "offering formatter must be exported");
assert.equal(isAccountingSourceReady("excel", "회계.xlsx", ""), true);
assert.equal(isAccountingSourceReady("excel", "", "https://docs.google.com/spreadsheets/d/unused/edit"), false);
assert.equal(isAccountingSourceReady("google-sheet", "", `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`), true);
assert.equal(isAccountingSourceReady("google-sheet", "회계.xlsx", ""), false);
assert.equal(formatThanksgivingOffering({ name: "박찬호", amount: 50000, note: "상반기 마침 감사" }), "박찬호 (50,000원) 상반기 마침 감사");
assert.equal(formatThanksgivingOffering({ name: "박대성", amount: 10000, note: "" }), "박대성 (10,000원)");
const dateMismatch = parseAccountingWorkbook(
  workbookBuffer([["0906", accountingRows("2026.09.06헌금")], ["최종 회계", accountingRows("2026.09.07헌금")]]),
  "2026-09-06", { sourceType: "excel", sourceName: "회계.xlsx" }
);
assert.equal(dateMismatch.sheetTab, "최종 회계", "본문 날짜와 탭 이름의 날짜를 해석하지 않고 마지막 탭을 선택해야 합니다.");
assert.equal(dateMismatch.thanksgiving.length, 4);
assert.throws(() => parseAccountingWorkbook(
  workbookBuffer([["0906", accountingRows()], ["마지막 빈 탭", [["빈 자료"]]]]),
  "2026-09-06", { sourceType: "excel", sourceName: "회계.xlsx" }
), /감사헌금 표제/, "마지막 탭이 잘못되어도 이전 탭으로 조용히 되돌아가면 안 됩니다.");

async function verifyGoogleSheetFallback() {
  const requested = [];
  const validWorkbook = workbookBuffer([["6월 마지막", accountingRows()]]);
  const loaded = await loadAccountingFromGoogleSheet(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    "2026-06-28",
    async (url) => {
      requested.push(String(url));
      if (requested.length === 1) {
        return new Response("<!DOCTYPE html><title>download confirmation</title>", {
          status: 200,
          headers: { "content-type": "text/html" }
        });
      }
      return new Response(validWorkbook, {
        status: 200,
        headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
      });
    }
  );
  assert.equal(requested.length, 2);
  assert.equal(loaded.sourceType, "google-sheet");
  assert.equal(loaded.total, 810000);

  await assert.rejects(
    () => loadAccountingFromGoogleSheet(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      "2026-06-28",
      async () => new Response(validWorkbook, {
        status: 200,
        headers: {
          "content-length": String(15 * 1024 * 1024 + 1),
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      })
    ),
    /15MB/
  );
}

verifyGoogleSheetFallback()
  .then(() => console.log("accounting parser: extraction, sorting, date selection, URL validation, and download fallback passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
