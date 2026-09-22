const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '../..');
for (const name of ['.env.local', '.env']) dotenv.config({ path: path.join(root, name), quiet: true });

async function check() {
  const webOnly = process.argv.includes('--web-only');
  const setupOnly = webOnly && process.argv.includes('--setup-only');
  if (!setupOnly) {
    for (const [key, minimum] of [['APP_ACCESS_PASSWORD', 12], ['APP_SESSION_TOKEN', 32], ...(!webOnly ? [['QR_WORKER_TOKEN', 32]] : [])]) {
      if ((process.env[key] || '').length < minimum) throw new Error(`Missing ${key}. Run configure-server.cmd first. Values are never printed.`);
    }
  }
  if (process.argv.includes('--production') && !fs.existsSync(path.join(root, '.local-runtime/server-build/BUILD_ID'))) throw new Error('Production build missing. Run npm run build:server first.');
  if (!webOnly) {
    for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) if (!process.env[key]) throw new Error(`${key} is missing in the existing private settings.`);
    const { createClient } = require('@supabase/supabase-js');
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    // Read only: never claim or execute old queued jobs merely to test deployment.
    for (const table of ['attendance_runs', 'qr_sync_jobs']) {
      const { data, count, error } = await db.from(table).select('id', { count: 'exact' }).in('status', ['queued', 'picked_up', 'running']).limit(1).abortSignal(AbortSignal.timeout(10000));
      if (error && table === 'qr_sync_jobs' && ['PGRST205', '42P01'].includes(error.code)) continue;
      if (error) throw new Error(`Cannot verify ${table} queue (${error.code || 'connection error'}). No Runner was started.`);
      if (!Array.isArray(data)) throw new Error(`Cannot verify ${table} queue response. No Runner was started.`);
      if (count || data.length) throw new Error(`${table}: ${count ?? data.length} queued/active jobs need review before starting a new Runner. Use web-only mode to inspect first.`);
    }
  }
  console.log(setupOnly ? 'SETUP ONLY: protected login page; Runner will not start.' : 'Preflight passed. No business records changed.');
}
check().catch(error => { console.error(error.message); process.exitCode = 1; });
