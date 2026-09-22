// One-time loopback form: move an existing ngrok token from its official dashboard
// into DPAPI without sending it through chat, command arguments or plaintext files.
const http = require('node:http');
const { randomBytes } = require('node:crypto');
const { spawn } = require('node:child_process');
const path = require('node:path');
const nonce = randomBytes(24).toString('hex');
let origin, busy = false, used = false;
function reply(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
  });
  res.end(body);
}
const server = http.createServer(async (req, res) => {
  if (req.headers.host !== new URL(origin).host || req.url !== '/' + nonce) return reply(res, 404, 'Not found');
  if (req.method === 'GET' && !used) return reply(res, 200,
    '<!doctype html><meta charset="utf-8"><title>CH2CH ngrok private setup</title>' +
    '<h1>CH2CH ngrok private setup</h1><p>Local-only, one-time encrypted credential storage. No tunnel is started.</p>' +
    '<form method="post" autocomplete="off"><label for="token">ngrok Authtoken</label>' +
    '<input id="token" name="token" type="password" autocomplete="off" minlength="20" maxlength="256" required>' +
    '<button type="submit">Save encrypted on this PC</button></form>');
  if (req.method !== 'POST') return reply(res, 405, 'Method not allowed');
  if (req.headers.origin !== origin || req.headers['sec-fetch-site'] === 'cross-site') return reply(res, 403, 'Forbidden');
  if (!req.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) return reply(res, 415, 'Unsupported content');
  if (busy || used) return reply(res, 409, 'Already submitted');
  busy = true;
  const chunks = [];
  try {
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2048) return reply(res, 413, 'Request too large');
      chunks.push(chunk);
    }
    let token = new URLSearchParams(Buffer.concat(chunks).toString('utf8')).get('token') || '';
    if (!/^[A-Za-z0-9_-]{20,256}$/.test(token)) return reply(res, 400, 'Invalid credential format');
    const child = spawn('powershell.exe', ['-NoProfile', '-File', path.join(__dirname, 'store-ngrok-auth.ps1')], {
      windowsHide: true, stdio: ['pipe', 'ignore', 'ignore']
    });
    child.stdin.on('error', () => {});
    child.stdin.end(token); token = '';
    const timeout = setTimeout(() => child.kill(), 15000);
    const code = await new Promise(resolve => { child.once('error', () => resolve(-1)); child.once('exit', resolve); });
    clearTimeout(timeout);
    if (code !== 0) return reply(res, 500, 'Not saved. Existing settings were not overwritten.');
    used = true;
    reply(res, 200, '<h1>Encrypted credential saved</h1><p>No tunnel was started. This temporary setup page is now closed.</p>');
    res.once('finish', () => { server.close(); clearTimeout(expiry); });
    console.log('Encrypted credential saved; temporary setup listener closed.');
  } catch { reply(res, 500, 'Setup failed. Sensitive details withheld.'); }
  finally { for (const chunk of chunks) chunk.fill(0); busy = false; }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(0, '127.0.0.1', () => {
  origin = `http://127.0.0.1:${server.address().port}`;
  console.log(`Private setup page (expires in 10 minutes): ${origin}/${nonce}`);
});
const expiry = setTimeout(() => { server.close(); server.closeAllConnections(); }, 10 * 60 * 1000);
server.on('error', () => { console.error('Could not open temporary setup listener.'); clearTimeout(expiry); process.exitCode = 1; });
