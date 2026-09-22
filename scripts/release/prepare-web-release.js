const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const destination = path.join(root, '.local-runtime/releases', `web-${stamp}`);
fs.mkdirSync(destination, { recursive: true });
const included = ['app', 'components', 'lib', 'public', 'runner', 'package.json', 'package-lock.json', 'next.config.mjs', 'middleware.ts', 'next-env.d.ts', 'tsconfig.json', 'tailwind.config.ts', 'postcss.config.mjs'];
const excluded = /(^|[/\\])(?:node_modules|\.env[^/\\]*|\.git|\.local-runtime|logs|screenshots|output|outputs)(?:[/\\]|$)|\.(?:pem|key|log)$/i;
for (const name of included) {
  const source = path.join(root, name);
  if (!fs.existsSync(source)) continue;
  fs.cpSync(source, path.join(destination, name), { recursive: true, filter: file => !excluded.test(path.relative(root, file)) });
}
// Real directories avoid Windows symlink privileges during standalone tracing.
// Hard links share read-only dependency bytes; the build never installs or edits packages.
function copyDependencies(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === '.cache' || entry.name === '.bin') continue;
    const from = path.join(source, entry.name), to = path.join(target, entry.name);
    if (entry.isSymbolicLink()) fs.cpSync(from, to, { recursive: true, dereference: true });
    else if (entry.isDirectory()) copyDependencies(from, to);
    else { try { fs.linkSync(from, to); } catch { fs.copyFileSync(from, to); } }
  }
}
copyDependencies(path.join(root, 'node_modules'), path.join(destination, 'node_modules'));
const env = { ...process.env, CH2CH_STANDALONE: '1', NEXT_BUILD_DIR: '.next', NEXT_TELEMETRY_DISABLED: '1' };
for (const key of Object.keys(env)) if (/^(SUPABASE_|NEXT_PUBLIC_SUPABASE_|GOOGLE_|BAND_|CH2CH_USER|CH2CH_PASSWORD|APP_ACCESS_|APP_SESSION_|QR_WORKER_)/.test(key)) delete env[key];
const result = spawnSync(process.execPath, [path.join(destination, 'node_modules/next/dist/bin/next'), 'build'], { cwd: destination, env, stdio: 'inherit', windowsHide: true });
if (result.status !== 0) { console.error(`Isolated release build failed. Existing service untouched. Workspace: ${destination}`); process.exit(result.status || 1); }
const standalone = path.join(destination, '.next/standalone');
if (!fs.existsSync(path.join(standalone, 'server.js'))) throw new Error('Standalone server missing');
fs.cpSync(path.join(destination, '.next/static'), path.join(standalone, '.next/static'), { recursive: true });
fs.cpSync(path.join(destination, 'public'), path.join(standalone, 'public'), { recursive: true });
const files = [];
function inspect(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) inspect(file);
    else if (item.isSymbolicLink()) throw new Error('Standalone release contains a non-portable symbolic link');
    else {
      const relative = path.relative(standalone, file);
      if (/(^|[/\\])\.env(?:[./\\]|$)|service-account[^/\\]*\.json$|\.(pem|key)$/i.test(relative)) throw new Error('Credential-like file in release');
      files.push({ path: relative, bytes: fs.statSync(file).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') });
    }
  }
}
inspect(standalone);
fs.writeFileSync(path.join(destination, 'release-manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), platform: process.platform, architecture: process.arch, runtime: process.version, sourceCommit: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim(), includesUncommittedChanges: true, standalone, files, note: 'No runtime secrets or live data. Build on Linux separately for Linux deployment.' }, null, 2));
console.log(`Verified web release: ${standalone}`);
console.log('No production deployment or service restart performed. Supply private runtime configuration before use.');
