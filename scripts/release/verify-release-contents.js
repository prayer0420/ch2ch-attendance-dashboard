// Compare local secret values in memory only; never print values or write them to a report.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '../..');
const target = path.resolve(process.argv[2] || '');
assert.ok(process.argv[2] && fs.existsSync(target), 'Supply a release directory');
const local = fs.existsSync(path.join(root, '.env.local')) ? dotenv.parse(fs.readFileSync(path.join(root, '.env.local'))) : {};
const values = Object.entries(local).filter(([key, value]) => /PASSWORD|PRIVATE_KEY|SERVICE_ROLE|SECRET|TOKEN/.test(key) && value.length >= 12).flatMap(([, value]) => [value, JSON.stringify(value).slice(1, -1)]).map(value => Buffer.from(value));
let scanned = 0;
function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Non-portable link in release');
    if (entry.isDirectory()) { inspect(file); continue; }
    assert.ok(!/^\.env(?:\.|$)|service-account.*\.json$|\.(pem|key)$/i.test(entry.name), 'Credential-like file name in release');
    if (!/\.(?:js|cjs|mjs|json|html|css|map|txt|asar)$/.test(entry.name)) continue;
    const contents = fs.readFileSync(file);
    assert.ok(values.every(value => !contents.includes(value)), 'Local secret value detected in release (value withheld)');
    scanned++;
  }
}
inspect(target);
console.log(`PASS: release contents; ${scanned} text/archive files scanned, no matching local secret values or credential-like files. Not a full history/credential audit.`);
