// Offline-only import. Never connects to Supabase or replays queued work.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {TABLES,openLocal,privateRoot}=require('../../lib/local-store/provider.cjs');
const backup=path.resolve(process.argv[2]||'');
if(!process.argv[2])throw new Error('Backup directory is required.');
const dir=path.join(privateRoot(),'data-v1');
if(!fs.existsSync(dir)||fs.existsSync(path.join(dir,'attendance.sqlite')))throw new Error('Prepare a new private directory first; existing DB is never overwritten.');
const manifest=JSON.parse(fs.readFileSync(path.join(backup,'verified-database-manifest.json'),'utf8'));
const db=openLocal(dir,true);
const counts={},ids={};
db.exec('BEGIN IMMEDIATE');
try {
  for(const page of manifest.pages){
    if(!/^[a-z_]+-\d+\.json$/.test(page.file))throw new Error('Invalid page name.');
    const table=page.file.replace(/-\d+\.json$/,'');
    if(!TABLES.includes(table))throw new Error('Unknown backup table.');
    const bytes=fs.readFileSync(path.join(backup,'database',page.file));
    if(crypto.createHash('sha256').update(bytes).digest('hex')!==page.sha256)throw new Error('Backup hash mismatch.');
    const rows=JSON.parse(bytes);if(rows.length!==page.rows)throw new Error('Backup row mismatch.');
    const insert=db.prepare(`INSERT INTO ${table}(id,data) VALUES(?,?)`);
    for(const row of rows){
      if(['attendance_runs','qr_sync_jobs'].includes(table)&&['queued','picked_up','running','saving'].includes(row.status))throw new Error('Active historical job requires review; not imported.');
      insert.run(String(row.id),JSON.stringify(row));
    }
    counts[table]=(counts[table]||0)+rows.length;
  }
  for(const [table,expected] of Object.entries(manifest.tables)){
    if(counts[table]!==expected||db.prepare(`SELECT count(*) n FROM ${table}`).get().n!==expected)throw new Error('Import count mismatch.');
  }
  // Use current local journal file, not an older snapshot. Preserve exact fields.
  const journals=JSON.parse(fs.readFileSync(path.join(process.cwd(),'.local-runtime/worship-journals.json'),'utf8'));
  const ins=db.prepare('INSERT INTO worship_journals(id,data) VALUES(?,?)');
  for(const row of journals)ins.run(String(row.id),JSON.stringify(row));
  counts.worship_journals=journals.length;
  db.exec('COMMIT');
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('SQLite integrity check failed.');
  for(const page of manifest.pages){
    const table=page.file.replace(/-\d+\.json$/,'');
    const get=db.prepare(`SELECT data FROM ${table} WHERE id=?`);
    for(const row of JSON.parse(fs.readFileSync(path.join(backup,'database',page.file),'utf8'))){
      if(get.get(String(row.id)).data!==JSON.stringify(row))throw new Error('Imported content differs from backup.');
    }
  }
  fs.copyFileSync(path.join(backup,'database/storage-objects.json'),path.join(dir,'archived-supabase-files.json'),fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(path.join(process.cwd(),'.local-runtime/worship-journals.json'),path.join(dir,'worship-journals-before-migration.json'),fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(dir,'migration-ready.json'),JSON.stringify({backup,counts,verifiedAt:new Date().toISOString(),archivedRemoteFiles:66},null,2),{flag:'wx'});
  console.log(JSON.stringify({imported:counts,verified:true,activated:false}));
}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}
