const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const setupUrl = pathToFileURL(path.join(__dirname, 'setup.html')).href;
const allowedExternalHosts = new Set(['docs.google.com', 'drive.google.com', 'accounts.google.com', 'band.us', 'www.band.us', 'auth.band.us']);

function normalizeServer(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('웹 서비스 주소를 입력해 주세요.');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('https:// 또는 http://localhost:포트 형식의 주소를 입력해 주세요.'); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) throw new Error('외부 서버에는 HTTPS 주소만 사용할 수 있습니다.');
  if (url.username || url.password || url.search || url.hash) throw new Error('주소에는 비밀번호·토큰·검색값을 포함할 수 없습니다.');
  return url.origin;
}
function isSetup(value) { return value === setupUrl; }
function isSameServer(value, server) {
  try { const url = new URL(value); return Boolean(server && !url.username && !url.password && url.origin === normalizeServer(server)); } catch { return false; }
}
function isExternal(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.port && !url.username && !url.password && allowedExternalHosts.has(url.hostname); } catch { return false; }
}
function isTrustedSetup(event, contents) {
  return Boolean(contents && event.sender === contents && event.senderFrame && event.senderFrame === contents.mainFrame && isSetup(event.senderFrame.url));
}
function readConfig(directory) {
  try { return { server: normalizeServer(JSON.parse(fs.readFileSync(path.join(directory, 'connection.json'), 'utf8')).server) }; }
  catch { return { server: '' }; }
}
function writeConfig(directory, server) {
  const value = { server: normalizeServer(server) };
  fs.mkdirSync(directory, { recursive: true });
  const temporary = path.join(directory, 'connection.json.tmp');
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, path.join(directory, 'connection.json'));
  return value;
}
module.exports = { setupUrl, normalizeServer, isSetup, isSameServer, isExternal, isTrustedSetup, readConfig, writeConfig };
