// Production build into the inactive folder. The running server keeps serving
// the active folder; deploy.ps1 switches folders after a smoke test.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const slots = require('./build-slots.js');

const root = path.resolve(__dirname, '../..');
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const tscBin = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
const trashRoot = path.join(root, '.local-runtime', 'build-trash');

// OneDrive turns synced files into reparse points. While cleaning an existing
// build folder, next build mistakes them for symlinks and fails (readlink EINVAL).
// Every build therefore starts in a fresh folder; the old one is moved aside.
function moveOldSlotAside(target) {
  const folder = path.join(root, target);
  if (!fs.existsSync(folder)) return;
  fs.mkdirSync(trashRoot, { recursive: true });
  fs.renameSync(folder, path.join(trashRoot, `${path.basename(target)}-${Date.now()}`));
}

function emptyTrash() {
  if (!fs.existsSync(trashRoot)) return;
  for (const entry of fs.readdirSync(trashRoot)) {
    try { fs.rmSync(path.join(trashRoot, entry), { recursive: true, force: true, maxRetries: 2 }); }
    catch { console.log(`[build] An old build folder is still in use and will be removed next time: ${entry}`); }
  }
}

function run(label, args, env) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
    child.on('error', () => resolve({ code: 1, seconds: 0 }));
    child.on('close', (code) => {
      const seconds = Math.round((Date.now() - started) / 100) / 10;
      console.log(`[build] ${label}: ${code === 0 ? 'ok' : 'failed'} (${seconds}s)`);
      resolve({ code, seconds });
    });
  });
}

async function main() {
  const active = slots.activeSlot(root);
  const target = slots.otherSlot(active);
  if (slots.slotInUse(root) === target) throw new Error('The target build folder is used by the running server. Nothing was built.');
  emptyTrash();
  moveOldSlotAside(target);
  // Next rewrites these for the build folder; restore them so the repository stays unchanged.
  const preserved = ['next-env.d.ts', 'tsconfig.json'].map((file) => [file, fs.readFileSync(path.join(root, file))]);
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    CH2CH_STANDALONE: '0',
    NEXT_BUILD_DIR: target,
    NEXT_TELEMETRY_DISABLED: '1',
    CH2CH_EXTERNAL_TYPECHECK: '1'
  };
  const started = Date.now();
  try {
    // Type checking runs in parallel instead of inside next build.
    const typecheck = run('type check', [tscBin, '--noEmit', '-p', 'tsconfig.json'], process.env);
    let bundler = process.env.CH2CH_BUNDLER === 'webpack' ? 'webpack' : 'turbopack';
    let build = await run(`next build (${bundler})`, [nextBin, 'build', '--no-lint', ...(bundler === 'turbopack' ? ['--turbopack'] : [])], env);
    if (build.code !== 0 && bundler === 'turbopack') {
      console.log('[build] Turbopack failed; retrying once with webpack.');
      bundler = 'webpack';
      build = await run('next build (webpack)', [nextBin, 'build', '--no-lint'], env);
    }
    const checked = await typecheck;
    if (checked.code !== 0) throw new Error('Type check failed. The running server was not changed.');
    if (build.code !== 0 || !fs.existsSync(path.join(root, target, 'BUILD_ID'))) throw new Error('Build failed. The running server was not changed.');
    const seconds = Math.round((Date.now() - started) / 1000);
    fs.writeFileSync(path.join(root, target, 'ch2ch-build.json'), JSON.stringify({ builtAt: new Date().toISOString(), bundler, seconds }, null, 2));
    fs.writeFileSync(path.join(root, '.local-runtime', 'pending-build.json'), JSON.stringify({ dir: target, bundler, seconds, builtAt: new Date().toISOString() }, null, 2));
    console.log(`[build] Ready in ${seconds}s: ${target} (${bundler}). Active server still uses ${active}.`);
    console.log(`BUILD_DIR=${target}`);
  } finally {
    for (const [file, content] of preserved) {
      const current = path.join(root, file);
      if (!fs.existsSync(current) || !fs.readFileSync(current).equals(content)) fs.writeFileSync(current, content);
    }
    emptyTrash();
  }
}

main().catch((error) => { console.error(`[build] ${error.message}`); process.exitCode = 1; });
