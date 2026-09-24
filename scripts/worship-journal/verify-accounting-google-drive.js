const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");
const XLSX = require("xlsx");

const projectRoot = path.resolve(__dirname, "..", "..");
function compile(filename) {
  return ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.NodeJs, target: ts.ScriptTarget.ES2020 },
    fileName: filename
  }).outputText;
}
require.extensions[".ts"] = (targetModule, filename) => targetModule._compile(compile(filename), filename);

const filename = path.join(projectRoot, "lib", "worship-journal-accounting-google.ts");
assert.ok(fs.existsSync(filename), "authenticated Google Drive accounting loader must exist");
const { accountingGoogleFileId, loadAccountingFromGoogleDrive } = require(filename);

const fileId = "1SCmg4YEDBLre3fgWCRfUS1gGL4WW1MnZ";
assert.equal(accountingGoogleFileId(`https://docs.google.com/spreadsheets/d/${fileId}/edit`), fileId);
assert.equal(accountingGoogleFileId(`https://drive.google.com/file/d/${fileId}/view`), fileId);
assert.throws(() => accountingGoogleFileId("https://example.com/file"), /올바른 Google/);

const rows = [
  ["", "2026.09.13헌금"],
  ["", "NO.", "주일헌금", "", "NO.", "감사헌금", "", "", "NO.", "목적헌금", ""],
  ["", "온라인", "", "", "온라인", "", "", "감사 내용", "온라인", "", ""],
  ["", 1, "김건우", 10000, 1, "양건우", 20000, "감사", 1, "선교헌금", 30000],
  ["", "주일헌금 총계", "", 10000, "감사헌금 총계", "", 20000, "", "목적헌금 총계", "", 30000]
];
const workbook = XLSX.utils.book_new();
const olderRows = rows.map((row) => [...row]);
olderRows[3][6] = 30000;
olderRows[4][6] = 30000;
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(olderRows), "9월 6일");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "9월 13일");
const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

async function main() {
  const requested = [];
  const dependencies = {
      getAccessToken: async () => "token",
      fetchImpl: async (url) => {
        requested.push(String(url));
        if (String(url).includes("?fields=")) return Response.json({ name: "회계.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: String(buffer.length) });
        return new Response(buffer, { status: 200, headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } });
      }
    };
  const result = await loadAccountingFromGoogleDrive(
    `https://docs.google.com/spreadsheets/d/${fileId}/edit`,
    "2026-09-13", "", dependencies
  );
  assert.match(requested[0], /drive\/v3\/files/);
  assert.match(requested[1], /alt=media/);
  assert.equal(result.sourceType, "google-sheet");
  assert.equal(result.sheetTab, "9월 13일");
  assert.equal(result.total, 60000);
  assert.equal(result.thanksgiving[0].name, "양건우");
  const older = await loadAccountingFromGoogleDrive(
    `https://docs.google.com/spreadsheets/d/${fileId}/edit`,
    "2026-09-13", "9월 6일", dependencies
  );
  assert.equal(older.sheetTab, "9월 6일");
  assert.equal(older.total, 70000);
  await assert.rejects(
    () => loadAccountingFromGoogleDrive(`https://docs.google.com/spreadsheets/d/${fileId}/edit`, "2026-09-13", "없는 탭", dependencies),
    /'없는 탭' 탭이 없습니다/
  );
}

main().then(() => console.log("accounting Google Drive loader: authenticated Office file download passed")).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
