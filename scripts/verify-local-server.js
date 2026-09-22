const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'ch2ch-server-test-'));
function write(relative, content) { const file = path.join(fixture, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); }
for (const name of ['start-local.ps1', 'stop-local.ps1', 'server/common.ps1', 'server/configure.ps1']) {
  write('scripts/' + name, fs.readFileSync(path.join(root, 'scripts', name)));
}
write('scripts/server/preflight.js', "console.log('fixture preflight: no database');");
write('node_modules/next/dist/bin/next', "require('node:http').createServer((q,r)=>r.end('fixture')).listen(3000,'127.0.0.1');");
write('sentinel.js', "require('node:http').createServer((q,r)=>r.end('unrelated sentinel')).listen(3000,'127.0.0.1');");
const stateFile = path.join(fixture, '.local-runtime/processes.json');
const env = { ...process.env, LOCALAPPDATA: path.join(fixture, 'private') };
function ps(script, args = []) { return new Promise(resolve => {
  const child = spawn('powershell.exe', ['-NoProfile', '-File', path.join(fixture, 'scripts', script), ...args], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', c => output += c); child.stderr.on('data', c => output += c);
  child.once('exit', status => resolve({ status, output }));
}); }
const readState = () => JSON.parse(fs.readFileSync(stateFile, 'utf8').replace(/^\uFEFF/, ''));
async function main() {
  write('scripts/auth-test.ps1', `
function Read-Host { param($Prompt, [switch]$AsSecureString) $secret = New-Object Security.SecureString; foreach ($character in 'fixture-only-not-a-real-code'.ToCharArray()) { $secret.AppendChar($character) }; return $secret }
function Get-TestHash($file) { $hash = [Security.Cryptography.SHA256]::Create(); try { return [Convert]::ToBase64String($hash.ComputeHash([IO.File]::ReadAllBytes($file))) } finally { $hash.Dispose() } }
. (Join-Path $PSScriptRoot 'server\\configure.ps1')
. (Join-Path $PSScriptRoot 'server\\common.ps1')
Import-ServerAuthentication
if ($env:APP_ACCESS_PASSWORD -cne 'fixture-only-not-a-real-code' -or $env:APP_SESSION_TOKEN.Length -lt 32 -or $env:QR_WORKER_TOKEN.Length -lt 32) { throw 'Authentication round trip failed.' }
$before = Get-TestHash $serverAuthFile
$refused = $false
try { . (Join-Path $PSScriptRoot 'server\\configure.ps1') } catch { if ($_.Exception.Message -like 'Authentication already exists*') { $refused = $true } else { throw } }
if (-not $refused -or (Get-TestHash $serverAuthFile) -ne $before) { throw 'Existing encrypted authentication was overwritten.' }
if ([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($serverAuthFile)).Contains('fixture-only-not-a-real-code')) { throw 'Plaintext password stored.' }
Write-Host 'PASS: isolated DPAPI save/load and existing-setting preservation; no real settings changed.'
`);
  const auth = await ps('auth-test.ps1');
  assert.equal(auth.status, 0, auth.output);
  assert.ok(!auth.output.includes('fixture-only-not-a-real-code'), 'No credential value in output');
  console.log('PASS: isolated encrypted authentication round trip, hidden-input path, no overwrite, no plaintext credential output.');
  if (process.argv.includes('--auth-only')) return;
  // Never use port 3000 if a real service is already running.
  const net = require('node:net'); const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(3000, '127.0.0.1', () => probe.close(resolve)); });
  let sentinel;
  let owned;
  try {
    const start = await ps('start-local.ps1', ['-NoPause', '-Production', '-WebOnly', '-SetupOnly']);
    assert.equal(start.status, 0, start.output);
    owned = readState();
    assert.ok(owned.dashboard.pid); assert.equal(owned.runner, undefined);
    assert.equal(await (await fetch('http://127.0.0.1:3000/login')).text(), 'fixture');
    const again = await ps('start-local.ps1', ['-NoPause', '-Production', '-WebOnly', '-SetupOnly']);
    assert.equal(again.status, 0, again.output);
    assert.equal(readState().dashboard.pid, owned.dashboard.pid, 'No duplicate web process');
    const stale = structuredClone(owned); stale.dashboard.startedAt = new Date(0).toISOString();
    fs.writeFileSync(stateFile, JSON.stringify(stale));
    const refused = await ps('stop-local.ps1', ['-NoPause']);
    assert.notEqual(refused.status, 0, 'Mismatched process identity must not stop a process');
    assert.equal((await fetch('http://127.0.0.1:3000/login')).status, 200);
    fs.writeFileSync(stateFile, JSON.stringify(owned));
    const stop = await ps('stop-local.ps1', ['-NoPause']);
    assert.equal(stop.status, 0, stop.output); owned = null;
    sentinel = spawn(process.execPath, [path.join(fixture, 'sentinel.js')], { windowsHide: true, stdio: 'ignore' });
    for (let i = 0; i < 30; i++) { try { if ((await fetch('http://127.0.0.1:3000')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
    const occupied = await ps('start-local.ps1', ['-NoPause', '-Production', '-WebOnly', '-SetupOnly']);
    assert.notEqual(occupied.status, 0);
    assert.equal(await (await fetch('http://127.0.0.1:3000')).text(), 'unrelated sentinel', 'An unrelated server survives');
    const source = fs.readFileSync(path.join(root, 'scripts/server/configure.ps1'), 'utf8');
    assert.match(source, /Read-Host.*-AsSecureString/);
    assert.match(source, /DataProtectionScope\]::CurrentUser/);
    assert.match(source, /FileMode\]::CreateNew/);
    assert.match(source, /GetBytes\(\$sessionBytes\)/);
    console.log('PASS: Windows launcher starts hidden fixture, preserves other processes, refuses stale PID, prevents duplicate startup, checks login readiness, stops only owned processes. No real Runner/database writes.');
  } finally {
    if (owned) { fs.writeFileSync(stateFile, JSON.stringify(owned)); await ps('stop-local.ps1', ['-NoPause']); }
    if (sentinel && sentinel.exitCode === null) sentinel.kill();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
