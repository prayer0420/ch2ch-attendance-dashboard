// Read-only operational check. Never prints attendance payloads or credentials.
require("dotenv").config({ path: ".env.local", quiet: true });
require("dotenv").config({ path: ".env", quiet: true });
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await db
    .from("attendance_runs")
    .select("id,status,requested_at,started_at,finished_at,current_step,runner_id,runner_hostname")
    .in("status", ["queued", "picked_up", "running", "saving"])
    .order("requested_at", { ascending: true });
  if (error) throw error;
  const counts = {};
  for (const row of data) counts[row.status] = (counts[row.status] || 0) + 1;
  console.log(JSON.stringify({
    count: data.length,
    counts,
    oldest: data[0]?.requested_at || null,
    newest: data.at(-1)?.requested_at || null,
    rows: data.map(row => ({
      idPrefix: String(row.id).slice(0, 8),
      status: row.status,
      requestedAt: row.requested_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      currentStep: row.current_step,
      runnerId: row.runner_id,
      runnerHostname: row.runner_hostname
    }))
  }, null, 2));
  const heartbeat = await db
    .from("runner_heartbeats")
    .select("runner_id,hostname,status,last_seen_at,current_step,current_run_id")
    .order("last_seen_at", { ascending: false })
    .limit(3);
  if (heartbeat.error) throw heartbeat.error;
  console.log(JSON.stringify({ heartbeats: heartbeat.data }, null, 2));
}

main().catch(error => {
  console.error(`Read-only Supabase inspection failed: ${error.code || error.name || "unknown"}`);
  process.exitCode = 1;
});
