require("dotenv").config({ path: ".env.local", quiet: true });
require("dotenv").config({ path: ".env", quiet: true });
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const since = new Date(process.argv[2]);
  if (!Number.isFinite(since.getTime())) throw new Error("Invalid runner start time.");
  const runnerId = process.env.RUNNER_ID || "main-office-pc";
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await db.from("runner_heartbeats")
    .select("runner_id,status,last_seen_at,current_run_id")
    .eq("runner_id", runnerId).maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "online" || data.current_run_id || new Date(data.last_seen_at) < since) process.exit(2);
  console.log("Runner heartbeat is online and idle.");
}

main().catch(error => {
  console.error(`Runner heartbeat check failed: ${error.code || error.message || "unknown"}`);
  process.exitCode = 1;
});
