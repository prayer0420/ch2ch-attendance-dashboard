const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const root = path.resolve(__dirname, '../..');
const probe = net.createServer();
probe.once('error', () => { console.error('Port 3000 is occupied. Stop your CH2CH server explicitly before rebuilding; nothing was stopped.'); process.exitCode = 1; });
probe.listen(3000, '127.0.0.1', () => probe.close(() => {
  const statePath = path.join(root, '.local-runtime/processes.json');
  if (fs.existsSync(statePath)) {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8').replace(/^\uFEFF/, ''));
    for (const entry of [state.dashboard, state.runner]) {
      if (!entry?.pid) continue;
      let alive = false; try { process.kill(entry.pid, 0); alive = true; } catch {}
      if (alive) { console.error('A recorded process still exists. Check it before building; nothing was stopped.'); process.exitCode = 1; return; }
    }
  }
  const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], {
    cwd: root, stdio: 'inherit', windowsHide: true,
    env: { ...process.env, NODE_ENV: 'production', CH2CH_STANDALONE: '0', NEXT_BUILD_DIR: '.local-runtime/server-build', NEXT_TELEMETRY_DISABLED: '1' }
  });
  process.exitCode = result.status || (result.error ? 1 : 0);
}));
