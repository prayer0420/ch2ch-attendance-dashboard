// Server/Runner only. No HTTP listener, public directory, or browser credentials.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const TABLES = ['attendance_runs','attendance_results','attendance_members','attendance_weekly_records','run_events','app_settings','runner_heartbeats','qr_sync_jobs','worship_journals'];
const UNIQUE = { attendance_members:'normalized_name', attendance_weekly_records:'normalized_name,target_term,target_week', app_settings:'key', runner_heartbeats:'runner_id', worship_journals:'date' };
const connections = new Map();
function privateRoot() {
  if (!process.env.LOCALAPPDATA) throw new Error('Local storage requires LOCALAPPDATA on the server.');
  const hash = crypto.createHash('sha256').update(path.resolve(process.cwd()).toLowerCase()).digest('hex').slice(0,16).toUpperCase();
  return path.join(process.env.LOCALAPPDATA, 'CH2CH-Server', hash);
}
function configFile() { return path.join(privateRoot(), 'storage-provider.json'); }
function configuration() {
  if (process.env.CH2CH_STORAGE_PROVIDER === 'supabase') return { provider:'supabase' };
  if (process.env.CH2CH_STORAGE_PROVIDER === 'local') {
    if (!process.env.CH2CH_DATA_DIR) throw new Error('CH2CH_DATA_DIR is required for an explicit local override.');
    return { provider:'local', directory:process.env.CH2CH_DATA_DIR };
  }
  if (!process.env.LOCALAPPDATA || !fs.existsSync(configFile())) return { provider:'supabase' };
  const config = JSON.parse(fs.readFileSync(configFile(), 'utf8'));
  if (config.provider !== 'local' || !path.isAbsolute(config.directory || '')) throw new Error('Invalid storage configuration; refusing fallback.');
  return config;
}
function isLocal() { return configuration().provider === 'local'; }
function hasDataStore() { return isLocal() || Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY); }
function safeDirectory(directory) {
  const resolved = path.resolve(directory);
  for (const forbidden of [process.cwd(), process.env.OneDrive, process.env.OneDriveConsumer, process.env.OneDriveCommercial].filter(Boolean)) {
    const rel = path.relative(path.resolve(forbidden), resolved);
    if (!rel || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel))) throw new Error('Local data must be outside the project and OneDrive.');
  }
  if (resolved === path.parse(resolved).root) throw new Error('Refusing a drive root as data directory.');
  let cursor = resolved;
  while (cursor !== path.dirname(cursor)) {
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) throw new Error('Linked storage paths are not allowed.');
    cursor = path.dirname(cursor);
  }
  return resolved;
}
function field(name) {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error('Invalid field name.');
  return name === 'id' ? 'id' : `json_extract(data, '$.${name}')`;
}
function bind(value) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === null || typeof value === 'string' || typeof value === 'number') return value;
  throw new Error('Unsupported query value.');
}
function openLocal(directory, initialize = false) {
  const dir = safeDirectory(directory);
  if (connections.has(dir)) return connections.get(dir);
  const filename = path.join(dir, 'attendance.sqlite');
  if (!initialize && !fs.existsSync(filename)) throw new Error('PC 저장소가 없습니다. 빈 DB를 자동 생성하지 않습니다. 백업 복구가 필요합니다.');
  if (initialize) fs.mkdirSync(dir, {recursive:true, mode:0o700});
  if (fs.existsSync(filename) && fs.lstatSync(filename).isSymbolicLink()) throw new Error('Linked database is not allowed.');
  // Next 15's bundler predates node:sqlite; load this Node 24 builtin at runtime.
  const { DatabaseSync } = createRequire(process.execPath)('node:sqlite');
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA busy_timeout=10000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;');
  if (initialize) {
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const table of TABLES) db.exec(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)) CHECK(CAST(json_extract(data,'$.id') AS TEXT)=id))`);
      for (const [table, cols] of Object.entries(UNIQUE)) db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ${table}_unique ON ${table} (${cols.split(',').map(field).join(',')})`);
      for (const [table, cols] of Object.entries({attendance_runs:['status','requested_at'],attendance_results:['run_id','status'],run_events:['run_id','created_at'],attendance_weekly_records:['target_week','normalized_name','family'],qr_sync_jobs:['status','requested_at'],runner_heartbeats:['last_seen_at']})) {
        for (const col of cols) db.exec(`CREATE INDEX IF NOT EXISTS ${table}_${col} ON ${table} (${field(col)})`);
      }
      db.exec('PRAGMA user_version=1; COMMIT');
    } catch (error) { db.exec('ROLLBACK'); db.close(); throw error; }
  }
  if (db.prepare('PRAGMA user_version').get().user_version !== 1) { db.close(); throw new Error('Unsupported local database schema.'); }
  connections.set(dir, db);
  return db;
}
function defaults(table, input) {
  const now = new Date().toISOString();
  let base = {id:crypto.randomUUID(), created_at:now, updated_at:now};
  if (table === 'attendance_runs') base = {...base, requested_at:now, status:'queued', dry_run:true, enable_second_pass:true, enable_new_family_groups:true, enable_long_absence_search:true,
    total_count:0,processed_count:0,primary_success_count:0,primary_fail_count:0,second_pass_success_count:0,final_fail_count:0,save_success_count:0,save_fail_count:0};
  if (table === 'qr_sync_jobs') base = {...base,status:'queued',requested_at:now,sheet_tab:'가장체크',department:'2청년회'};
  if (table === 'run_events') base.level = 'info';
  if (table === 'runner_heartbeats') base = {...base,status:'online',last_seen_at:now};
  if (['attendance_results','attendance_weekly_records'].includes(table)) base = {...base,service_1_3_present:false,service_4_present:false};
  return {...base,...input};
}
function assertReferences(db, table, row) {
  for (const [key, target] of (table === 'attendance_weekly_records' ? [['source_run_id','attendance_runs'],['source_result_id','attendance_results']] : ['attendance_results','run_events'].includes(table) ? [['run_id','attendance_runs']] : [])) {
    if (row[key] && !db.prepare(`SELECT id FROM ${target} WHERE id=?`).get(String(row[key]))) throw new Error('Missing referenced attendance record.');
  }
  if (table === 'attendance_results' && (!row.run_id || !row.name || !row.normalized_name || !row.status)) throw new Error('Incomplete attendance result.');
  if (table === 'qr_sync_jobs' && (!['preview','apply'].includes(row.action) || !['queued','picked_up','running','completed','failed'].includes(row.status))) throw new Error('Invalid QR job.');
}
class Query {
  constructor(db, table) {
    if (!TABLES.includes(table)) throw new Error('Unknown local table.');
    Object.assign(this,{db,table,mode:'read',filters:[],args:[],orders:[],columns:'*',offset:0,size:null,returning:true,opts:{}});
  }
  select(columns='*', opts={}) { if (columns!=='*') columns.split(',').forEach(field); this.columns=columns; this.opts=opts; this.returning=true; return this; }
  eq(col,value) { this.filters.push(`${field(col)} = ?`); this.args.push(bind(value)); return this; }
  in(col,values) { this.filters.push(values.length ? `${field(col)} IN (${values.map(()=>'?').join(',')})` : '0'); this.args.push(...values.map(bind)); return this; }
  like(col,value) { this.filters.push(`${field(col)} LIKE ? ESCAPE '\\'`); this.args.push(bind(value)); return this; }
  order(col,opts={}) { this.orders.push(`${field(col)} ${opts.ascending===false?'DESC':'ASC'}`); return this; }
  limit(size) { if (!Number.isSafeInteger(size)||size<0) throw new Error('Invalid limit.'); this.size=size; return this; }
  range(from,to) { if (!Number.isSafeInteger(from)||from<0||!Number.isSafeInteger(to)||to<from) throw new Error('Invalid range.'); this.offset=from;return this.limit(to-from+1); }
  single() { this.one='required';return this; }
  maybeSingle() { this.one='optional';return this; }
  abortSignal(signal) { this.signal=signal;return this; }
  insert(rows) { this.mode='insert';this.rows=Array.isArray(rows)?rows:[rows];this.returning=false;return this; }
  update(row) { this.mode='update';this.patch=row;this.returning=false;return this; }
  upsert(rows,opts={}) { this.insert(rows);this.mode='upsert';this.conflict=opts.onConflict || 'id';if (this.conflict!=='id'&&this.conflict!==UNIQUE[this.table]) throw new Error('Unsupported conflict key.');return this; }
  then(resolve,reject) { if (!this.promise) this.promise=Promise.resolve().then(()=>this.execute());return this.promise.then(resolve,reject); }
  execute() {
    let transaction=false;
    try {
      if (this.signal?.aborted) throw new Error('Request aborted.');
      if (this.mode!=='read') { this.db.exec('BEGIN IMMEDIATE');transaction=true; }
      const where=this.filters.length?' WHERE '+this.filters.join(' AND '):'';
      const order=this.orders.length?' ORDER BY '+this.orders.join(','):'';
      const limit=this.size!==null?` LIMIT ${this.size} OFFSET ${this.offset}`:'';
      let rows=[],count;
      if (this.mode==='read'||this.mode==='update') {
        if (this.opts.count) count=this.db.prepare(`SELECT count(*) AS n FROM ${this.table}${where}`).get(...this.args).n;
        if (!this.opts.head) rows=this.db.prepare(`SELECT data FROM ${this.table}${where}${order}${limit}`).all(...this.args).map(x=>JSON.parse(x.data));
      }
      if (this.mode==='update') {
        if (!this.filters.length || 'id' in this.patch) throw new Error('Unbounded/identity update is not allowed.');
        rows=rows.map(row=>({...row,...this.patch,updated_at:new Date().toISOString()}));
        for (const row of rows) { assertReferences(this.db,this.table,row);this.db.prepare(`UPDATE ${this.table} SET data=? WHERE id=?`).run(JSON.stringify(row),String(row.id)); }
      }
      if (this.mode==='insert'||this.mode==='upsert') {
        for (const input of this.rows) {
          let old;
          if (this.mode==='upsert') {
            const keys=this.conflict.split(',');
            if (keys.every(k=>input[k]!==null&&input[k]!==undefined)) old=this.db.prepare(`SELECT data FROM ${this.table} WHERE ${keys.map(k=>field(k)+'=?').join(' AND ')}`).get(...keys.map(k=>bind(input[k])));
          }
          const row=old?{...JSON.parse(old.data),...input,updated_at:new Date().toISOString()}:defaults(this.table,input);
          // Preserve integer event IDs for stable imported history and future event ordering.
          if (this.table==='run_events'&&!old&&input.id===undefined) row.id=this.db.prepare('SELECT coalesce(max(CAST(id AS INTEGER)),0)+1 AS id FROM run_events').get().id;
          assertReferences(this.db,this.table,row);
          if (old) {
            const oldId=String(JSON.parse(old.data).id);
            if (String(row.id)!==oldId && this.table!=='worship_journals') throw new Error('Identity changes are not allowed.');
            this.db.prepare(`UPDATE ${this.table} SET data=?,id=? WHERE id=?`).run(JSON.stringify(row),String(row.id),oldId);
          } else this.db.prepare(`INSERT INTO ${this.table} (data,id) VALUES (?,?)`).run(JSON.stringify(row),String(row.id));
          rows.push(row);
        }
      }
      if (this.one && (rows.length>1 || (this.one==='required'&&rows.length!==1))) throw Object.assign(new Error('Expected a single matching record.'),{code:'PGRST116'});
      if (transaction) { this.db.exec('COMMIT');transaction=false; }
      const projected=this.columns==='*'?rows:rows.map(row=>Object.fromEntries(this.columns.split(',').map(k=>[k,row[k]??null])));
      return {data:this.opts.head||!this.returning?null:this.one?(projected[0]??null):projected,error:null,count:count??null};
    } catch(error) {
      if(transaction) this.db.exec('ROLLBACK');
      return {data:null,error:{code:error.code||'LOCAL_STORE_ERROR',message:error.message},count:null};
    }
  }
}
function storage(directory) {
  const bucket='attendance-inputs', root=path.join(safeDirectory(directory),'files',bucket);
  function destination(key) {
    if (typeof key!=='string'||key.length>500||key.split('/').some(s=>!s||s==='.'||s==='..'||/[\\:*?"<>|\x00-\x1f]/.test(s)||/[. ]$/.test(s))) throw new Error('Invalid storage path.');
    const full=path.join(root,...key.split('/'));
    let current=full;
    while(current!==path.dirname(root)) { if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw new Error('Linked file is not allowed.');current=path.dirname(current); }
    return full;
  }
  const wrap=fn=>async(...args)=>{try{return {data:await fn(...args),error:null};}catch(e){return {data:null,error:{message:e.message,code:e.code||'LOCAL_FILE_ERROR'}};}};
  return {
    listBuckets:wrap(()=>[{id:bucket,name:bucket,public:false}]),
    createBucket:wrap((name,opts)=>{if(name!==bucket||opts?.public)throw new Error('Only private attendance inputs are supported.');fs.mkdirSync(root,{recursive:true,mode:0o700});return {name};}),
    from(name) {
      if(name!==bucket)throw new Error('Unknown private bucket.');
      return {
        upload:wrap(async(key,body,opts={})=>{
          const full=destination(key),buffer=Buffer.from(body instanceof Blob?await body.arrayBuffer():body);
          if(buffer.length>20*1024*1024)throw new Error('파일은 20MB 이하만 저장할 수 있습니다.');
          fs.mkdirSync(path.dirname(full),{recursive:true,mode:0o700});
          const temp=full+'.'+crypto.randomUUID()+'.tmp';
          try { const fd=fs.openSync(temp,'wx',0o600);try {fs.writeFileSync(fd,buffer);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
            if(opts.upsert)fs.renameSync(temp,full);else fs.linkSync(temp,full);
          } finally {if(fs.existsSync(temp))fs.unlinkSync(temp);}
          return {path:key};
        }),
        download:wrap(key=>{const file=destination(key);if(!fs.existsSync(file))throw new Error('이 입력파일은 PC에 없습니다. 이전 Supabase 보관 파일은 추가 이전 전까지 열 수 없습니다. 새 실행은 출석시트를 다시 불러와 주세요.');return new Blob([fs.readFileSync(file)]);}),
        remove:wrap(keys=>{for(const key of keys){const file=destination(key);if(fs.existsSync(file))fs.unlinkSync(file);}return keys.map(name=>({name}));})
      };
    }
  };
}
function createLocalClient(directory) { const db=openLocal(directory);return {from:table=>new Query(db,table),storage:storage(directory)}; }
function createDataClient() {
  const config=configuration();
  if(config.provider==='local')return createLocalClient(config.directory);
  const {createClient}=require('@supabase/supabase-js');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
}
function readJournals() {
  if(!isLocal()) {const f=path.join(process.cwd(),'.local-runtime/worship-journals.json');return fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):[];}
  return openLocal(configuration().directory).prepare("SELECT data FROM worship_journals ORDER BY json_extract(data,'$.date') DESC").all().map(x=>JSON.parse(x.data));
}
async function saveJournal(journal) {
  if(!isLocal())throw new Error('예배일지 저장에는 PC 저장소 전환이 필요합니다.');
  const {error}=await createDataClient().from('worship_journals').upsert(journal,{onConflict:'date'});
  if(error)throw new Error(error.message);
}
module.exports={TABLES,UNIQUE,Query,configuration,configFile,privateRoot,isLocal,hasDataStore,safeDirectory,openLocal,createLocalClient,createDataClient,readJournals,saveJournal};
