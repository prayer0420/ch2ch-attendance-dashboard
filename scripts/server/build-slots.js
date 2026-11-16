// Two production build folders. The server runs from the active one while the
// next build is written to the other; deploy switches them with a short restart.
const fs = require('node:fs');
const path = require('node:path');

const SLOTS = ['.local-runtime/server-build', '.local-runtime/server-build-b'];
const POINTER = '.local-runtime/active-build.json';

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); } catch { return null; }
}

function activeSlot(root) {
  const dir = readJson(path.join(root, POINTER))?.dir;
  return SLOTS.includes(dir) ? dir : SLOTS[0];
}

function otherSlot(slot) {
  return slot === SLOTS[0] ? SLOTS[1] : SLOTS[0];
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

/** Build folder used by a running dashboard, if any. */
function slotInUse(root) {
  const dashboard = readJson(path.join(root, '.local-runtime', 'processes.json'))?.dashboard;
  if (!dashboard || !processAlive(Number(dashboard.pid))) return null;
  return SLOTS.includes(dashboard.buildDir) ? dashboard.buildDir : activeSlot(root);
}

function writeActiveSlot(root, slot) {
  if (!SLOTS.includes(slot)) throw new Error('Unknown build folder.');
  const file = path.join(root, POINTER);
  const temporary = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify({ dir: slot, switchedAt: new Date().toISOString() }, null, 2));
  fs.renameSync(temporary, file);
}

module.exports = { SLOTS, POINTER, activeSlot, otherSlot, slotInUse, writeActiveSlot };

if (require.main === module) {
  const root = path.resolve(__dirname, '..', '..');
  const [command, value] = process.argv.slice(2);
  if (command === 'active') console.log(activeSlot(root));
  else if (command === 'set') { writeActiveSlot(root, value); console.log(value); }
  else { console.error('Usage: build-slots.js active | set <slot>'); process.exitCode = 2; }
}
