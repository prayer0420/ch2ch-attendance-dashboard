// Read and validate the export without connecting to or changing the live service.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Supply the migration backup directory.');
const source = JSON.parse(fs.readFileSync(path.join(root, 'source-manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'database/export-manifest.json'), 'utf8'));
const tables = {};
const hashes = [];
for (const page of manifest.pages) {
  if (path.basename(page.file) !== page.file) throw new Error('Invalid export path.');
  const bytes = fs.readFileSync(path.join(root, 'database', page.file));
  const rows = JSON.parse(bytes.toString('utf8'));
  if (rows.length !== page.count) throw new Error(`Row count mismatch: ${page.file}`);
  (tables[page.table] ||= []).push(...rows);
  hashes.push({file: page.file, rows: rows.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex')});
}
for (const [table, expected] of Object.entries(manifest.expected)) {
  const rows = tables[table] || [];
  if (rows.length !== expected || new Set(rows.map(row => String(row.id))).size !== expected) throw new Error(`Missing or duplicate records: ${table}`);
}
const runIds = new Set(tables.attendance_runs.map(row => row.id));
const resultIds = new Set(tables.attendance_results.map(row => row.id));
for (const row of [...tables.attendance_results, ...tables.run_events]) {
  if (row.run_id && !runIds.has(row.run_id)) throw new Error('Missing referenced run.');
}
for (const row of tables.attendance_weekly_records) {
  if (row.source_run_id && !runIds.has(row.source_run_id)) throw new Error('Missing weekly source run.');
  if (row.source_result_id && !resultIds.has(row.source_result_id)) throw new Error('Missing weekly source result.');
}
const storage = JSON.parse(fs.readFileSync(path.join(root, 'database/storage-objects.json'), 'utf8'));
if (storage.length !== manifest.storageObjectCount) throw new Error('Storage inventory mismatch.');
const report = { verifiedAt: new Date().toISOString(), sourceFiles: source.files.length, databaseRows: Object.values(tables).reduce((n, rows) => n + rows.length, 0), tables: manifest.expected, pages: hashes, storageObjectCount: storage.length, storageContentsBackedUp: false, readyForCutover: false };
fs.writeFileSync(path.join(root, 'verified-database-manifest.json'), JSON.stringify(report, null, 2), {flag:'wx',mode:0o600});
console.log(JSON.stringify({sourceFiles: report.sourceFiles, databaseRows: report.databaseRows, databaseVerified: true, foreignKeysVerified: true, storageObjects: storage.length, readyForCutover: false}));
