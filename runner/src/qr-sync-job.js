function buildQrWorkerPayload(job) {
  const payload = {
    action: job.action,
    jobId: job.id,
    input: {
      week: Number(job.week),
      sheetUrl: job.sheet_url,
      sheetTab: job.sheet_tab,
      department: job.department
    }
  };
  if (job.preview) payload.preview = job.preview;
  return payload;
}

function summarizeQrJob(job) {
  return job.status === "failed"
    ? { status: "failed", error: job.error_message || "QR 작업에 실패했습니다." }
    : { status: job.status, preview: job.result || null };
}

module.exports = { buildQrWorkerPayload, summarizeQrJob };
