// HTTP-only smoke test: no attendance, Google Sheet, or other business writes.
// Run after Import-ServerAuthentication; never print secrets, cookies, or bodies.
const assert = require('node:assert/strict');
let stage = 'configuration';

async function main() {
  const base = process.env.APP_PUBLIC_ORIGIN;
  assert.match(base || '', /^https:\/\/[a-z0-9-]+\.ngrok-free\.(app|dev)$/);
  assert.ok((process.env.APP_ACCESS_PASSWORD || '').length >= 12);
  async function request(path, options = {}) {
    return fetch(base + path, {
      ...options, redirect: 'manual', signal: AbortSignal.timeout(20000),
      headers: { 'ngrok-skip-browser-warning': '1', ...options.headers }
    });
  }
  async function checkStatus(response, expected) {
    try { assert.equal(response.status, expected); }
    finally { await response.body?.cancel(); }
  }
  stage = 'public HTTPS login page';
  await checkStatus(await request('/login'), 200);
  stage = 'same-site login redirect';
  const redirect = await request('/search');
  assert.equal(new URL(redirect.headers.get('location'), base).origin, base);
  assert.equal(new URL(redirect.headers.get('location'), base).pathname, '/login');
  await checkStatus(redirect, 307);
  stage = 'anonymous API denial';
  for (const path of ['/api/app', '/api/attendance', '/api/worship-journals']) await checkStatus(await request(path), 401);
  stage = 'cross-origin login denial';
  await checkStatus(await request('/api/auth/login', { method: 'POST', headers: { origin: 'https://untrusted.example', 'content-type': 'application/json' }, body: '{}' }), 403);
  stage = 'authenticated HTTPS login';
  const login = await request('/api/auth/login', { method: 'POST', headers: { origin: base, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ password: process.env.APP_ACCESS_PASSWORD }) });
  let cookieHeader = login.headers.get('set-cookie') || '';
  await checkStatus(login, 200);
  stage = 'secure session cookie';
  assert.match(cookieHeader, /;\s*Secure/i);
  assert.match(cookieHeader, /;\s*HttpOnly/i);
  assert.match(cookieHeader, /;\s*SameSite=Lax/i);
  let cookie = cookieHeader.split(';')[0];
  assert.ok(cookie.startsWith('ch2ch_admin_session='));
  cookieHeader = '';
  stage = 'authenticated API and page access';
  await checkStatus(await request('/api/app', { headers: { cookie } }), 200);
  await checkStatus(await request('/search', { headers: { cookie } }), 200);
  stage = 'online Runner heartbeat';
  const runnerStatus = await request('/api/runner/status', { headers: { cookie } });
  assert.equal(runnerStatus.status, 200);
  const runnerPayload = await runnerStatus.json();
  assert.equal(runnerPayload?.data?.status, 'online');
  assert.ok(Date.now() - new Date(runnerPayload?.data?.last_seen_at).getTime() < 30000);
  assert.equal(runnerPayload?.data?.current_run_id, null);
  stage = 'browser HTML form login';
  const formLogin = await request('/api/auth/login', { method: 'POST', headers: { origin: base, 'content-type': 'application/x-www-form-urlencoded', accept: 'text/html' }, body: new URLSearchParams({ password: process.env.APP_ACCESS_PASSWORD, next: '/search' }).toString() });
  assert.equal(formLogin.headers.get('location'), '/search');
  assert.ok((formLogin.headers.get('set-cookie') || '').startsWith('ch2ch_admin_session='));
  await checkStatus(formLogin, 303);
  stage = 'cross-origin logout denial';
  await checkStatus(await request('/api/auth/logout', { method: 'POST', headers: { cookie, origin: 'https://untrusted.example' } }), 403);
  stage = 'HTTPS logout';
  const logout = await request('/api/auth/logout', { method: 'POST', headers: { cookie, origin: base } });
  assert.equal(new URL(logout.headers.get('location'), base).origin, base);
  assert.match(logout.headers.get('set-cookie') || '', /Max-Age=0/i);
  await checkStatus(logout, 303);
  cookie = '';
  stage = 'anonymous access after clearing cookie';
  await checkStatus(await request('/api/app'), 401);
  console.log('Public HTTPS verification passed: login page, safe redirect, anonymous API denial, login, secure cookie, authenticated access, online idle Runner, CSRF denial, logout. No business data changed.');
}

main().catch(() => { console.error(`Public access verification failed at: ${stage}. Response bodies and credentials omitted.`); process.exitCode = 1; });
