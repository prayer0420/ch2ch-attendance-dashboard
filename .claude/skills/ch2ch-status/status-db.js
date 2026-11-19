// Read-only: storage provider, Runner heartbeat, job queue counts. Prints no secrets.
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
process.chdir(root);
require('dotenv').config({ path: path.join(root, '.env.local'), quiet: true });
const { configuration, createDataClient } = require(path.join(root, 'lib/local-store/provider.cjs'));

(async () => {
  const cfg = configuration();
  console.log(`storage          ${cfg.provider}${cfg.directory ? ' ' + cfg.directory : ''}`);
  const db = createDataClient();
  const id = process.env.RUNNER_ID || 'main-office-pc';
  const hb = await db.from('runner_heartbeats').select('status,last_seen_at,current_run_id').eq('runner_id', id).maybeSingle();
  if (hb.error) console.log(`heartbeat        error ${hb.error.code || hb.error.message}`);
  else if (!hb.data) console.log('heartbeat        none yet');
  else {
    const age = Math.round((Date.now() - new Date(hb.data.last_seen_at)) / 1000);
    console.log(`heartbeat        ${hb.data.status} ${age}s ago${age > 60 ? ' (STALE)' : ''}${hb.data.current_run_id ? ' running=' + hb.data.current_run_id : ''}`);
  }
  for (const [table, statuses] of [['attendance_runs', ['queued', 'picked_up', 'running', 'saving']], ['qr_sync_jobs', ['queued', 'picked_up', 'running']]]) {
    const parts = [];
    for (const s of statuses) {
      const r = await db.from(table).select('id', { count: 'exact', head: true }).eq('status', s);
      parts.push(`${s}=${r.error ? '?' : r.count || 0}`);
    }
    console.log(`${table.padEnd(16)} ${parts.join(' ')}`);
  }
  const last = await db.from('attendance_runs').select('status,requested_at').order('requested_at', { ascending: false }).limit(1);
  if (!last.error && last.data?.[0]) console.log(`last run         ${last.data[0].status} requested ${last.data[0].requested_at}`);
})().catch((e) => { console.log(`db check failed  ${e.code || e.message}`); process.exitCode = 1; });
