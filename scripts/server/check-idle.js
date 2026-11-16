// Read-only check before a restart: active attendance or QR jobs must finish first.
require('dotenv').config({ path: '.env.local', quiet: true });
const { createDataClient } = require('../../lib/local-store/provider.cjs');

async function main() {
  const db = createDataClient();
  const checks = [
    ['attendance_runs', ['queued', 'picked_up', 'running', 'saving']],
    ['qr_sync_jobs', ['queued', 'picked_up', 'running']]
  ];
  const busy = [];
  for (const [table, statuses] of checks) {
    const { count, error } = await db.from(table).select('id', { count: 'exact', head: true }).in('status', statuses).abortSignal(AbortSignal.timeout(10000));
    if (error) throw new Error(`${table}: ${error.code || error.message}`);
    if (count) busy.push(`${table} ${count}`);
  }
  if (busy.length) {
    console.error(`[idle] Jobs are waiting or running (${busy.join(', ')}). Restart postponed.`);
    process.exitCode = 3;
    return;
  }
  console.log('[idle] No waiting or running jobs.');
}

main().catch((error) => { console.error(`[idle] Could not verify jobs: ${error.message}`); process.exitCode = 1; });
