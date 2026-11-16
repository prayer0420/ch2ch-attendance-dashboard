require("dotenv").config({ path: ".env.local", quiet: true });
require("dotenv").config({ path: ".env", quiet: true });
const { createDataClient } = require("../../lib/local-store/provider.cjs");

async function main() {
  const since = new Date(process.argv[2]);
  if (!Number.isFinite(since.getTime())) throw new Error("Invalid runner start time.");
  const runnerId = process.env.RUNNER_ID || "main-office-pc";
  const db = createDataClient();
  const { data, error } = await db.from("runner_heartbeats")
    .select("runner_id,status,last_seen_at,current_run_id")
    .eq("runner_id", runnerId).maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "online" || new Date(data.last_seen_at) < since) process.exit(2);
  console.log(data.current_run_id ? "Runner heartbeat is online and processing." : "Runner heartbeat is online and idle.");
}

main().catch(error => {
  console.error(`Runner heartbeat check failed: ${error.code || error.message || "unknown"}`);
  process.exitCode = 1;
});
