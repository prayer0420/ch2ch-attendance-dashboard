// Read-only connectivity check. Existing running/picked_up records are never
// resumed by Runner; its claim query only selects status === "queued".
require("dotenv").config({ path: ".env.local", quiet: true });
require("dotenv").config({ path: ".env", quiet: true });
const fs = require("node:fs");
const path = require("node:path");
const { createDataClient, hasDataStore } = require("../../lib/local-store/provider.cjs");

async function main() {
  for (const key of ["QR_WORKER_TOKEN"]) {
    if (!(process.env[key] || "").length) throw new Error(`Missing ${key}.`);
  }
  const runnerSource = fs.readFileSync(path.resolve(__dirname, "../../runner/src/runner.js"), "utf8");
  if (!/\.eq\("status",\s*"queued"\)/.test(runnerSource)) throw new Error("Runner claim policy is not restricted to queued work.");
  if (!hasDataStore()) throw new Error('No data store configured.');
  const db = createDataClient();
  const queue = await db.from("attendance_runs").select("id", { count: "exact", head: true }).eq("status", "queued").abortSignal(AbortSignal.timeout(10000));
  if (queue.error) throw queue.error;
  const stale = await db.from("attendance_runs").select("id", { count: "exact", head: true }).in("status", ["picked_up", "running", "saving"]).abortSignal(AbortSignal.timeout(10000));
  if (stale.error) throw stale.error;
  const qr = await db.from("qr_sync_jobs").select("id", { count: "exact", head: true }).eq("status", "queued").abortSignal(AbortSignal.timeout(10000));
  if (qr.error) throw qr.error;
  console.log(`Runner preflight passed: attendance queued=${queue.count || 0}; stale non-queued preserved=${stale.count || 0}; QR queued=${qr.count || 0}.`);
}

main().catch(error => {
  console.error(`Runner preflight failed: ${error.code || error.message || "unknown"}`);
  process.exitCode = 1;
});
