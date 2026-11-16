const { createInterface } = require('node:readline');
const PREFIX = 'CH2CH_DIAGNOSTIC ';
const STAGES = new Set(['family-start', 'family-navigation-error', 'family-navigation-result', 'family-readiness', 'family-save-verification',
  'family-complete', 'member-read-retry', 'member-read', 'member-read-failed', 'member-not-found',
  'member-checkbox-failed', 'member-after-check', 'member-verify-failed', 'member-action-error']);

function decodeDiagnostic(line, runId) {
  if (!line.startsWith(PREFIX)) return null;
  const event = JSON.parse(line.slice(PREFIX.length));
  if (event.version !== 1 || event.runId !== runId || !STAGES.has(event.stage) ||
      !['info', 'warn', 'error'].includes(event.level) || typeof event.message !== 'string') {
    throw new Error('Invalid diagnostic envelope');
  }
  return event;
}

function readLines(stream, onLine) {
  // stdout chunks may split a JSON event (or a Korean UTF-8 character).
  // readline buffers until a full line and also flushes the final partial line.
  const reader = createInterface({ input: stream, crlfDelay: Infinity });
  reader.on('line', onLine);
  return reader;
}

module.exports = { decodeDiagnostic, readLines };
