import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export function createDiagnostics({ runId, directory = './logs/diagnostics', target = {}, output = console.log }) {
  const key = /^[a-zA-Z0-9-]{1,80}$/.test(runId || '') ? runId : randomUUID();
  const folder = path.resolve(directory, key);
  let sequence = 0;
  const emit = (stage, message, details = {}, level = 'info') => {
    const event = { version: 1, eventId: randomUUID(), runId: key, observedAt: new Date().toISOString(),
      stage, message, level, ...target, ...details };
    // Always keep a per-run copy even when the DB is unavailable. Never put
    // cookies, environment variables, full HTML or input values in details.
    try {
      fs.mkdirSync(folder, { recursive: true });
      fs.appendFileSync(path.join(folder, 'events.jsonl'), JSON.stringify(event) + '\n');
    } catch (error) {
      event.localPersistence = { status: 'failed', errorType: error?.name || 'Error' };
    }
    output('CH2CH_DIAGNOSTIC ' + JSON.stringify(event));
    return event;
  };
  const capture = async page => {
    const file = `failure-${String(++sequence).padStart(3, '0')}.png`;
    try {
      fs.mkdirSync(folder, { recursive: true });
      const mask = page.frames().map(frame => frame.locator('input:not([type="checkbox"]):not([type="radio"]),textarea'));
      const bytes = await page.screenshot({ path: path.join(folder, file), fullPage: false, timeout: 5000, mask });
      return { status: 'saved-local', relativePath: `logs/diagnostics/${key}/${file}`,
        sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
    } catch (error) {
      return { status: 'capture-failed', errorType: error?.name || 'Error' };
    }
  };
  return { emit, capture };
}
