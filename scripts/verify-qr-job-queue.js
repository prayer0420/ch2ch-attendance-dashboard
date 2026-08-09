const assert = require("node:assert/strict");

const { buildQrWorkerPayload, summarizeQrJob } = require("../runner/src/qr-sync-job");

const previewInput = {
  action: "preview",
  week: 32,
  sheet_url: "https://docs.google.com/spreadsheets/d/example/edit",
  sheet_tab: "가장체크",
  department: "2청년회"
};

assert.deepEqual(buildQrWorkerPayload({ ...previewInput, id: "job-preview" }), {
  action: "preview",
  jobId: "job-preview",
  input: {
    week: 32,
    sheetUrl: previewInput.sheet_url,
    sheetTab: "가장체크",
    department: "2청년회"
  }
});

const preview = { id: "preview-1", week: 32, service13Names: ["박예림"], service4Names: [] };
assert.deepEqual(summarizeQrJob({ id: "job-preview", status: "completed", result: preview }), {
  status: "completed",
  preview
});

assert.deepEqual(summarizeQrJob({ id: "job-failed", status: "failed", error_message: "CH2CH 로그인 실패" }), {
  status: "failed",
  error: "CH2CH 로그인 실패"
});

console.log("qr job queue checks passed");
