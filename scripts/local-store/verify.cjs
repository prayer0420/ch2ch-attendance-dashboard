// Isolated tests: no Supabase, Google, CH2CH, BAND, or production data writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const store=require('../../lib/local-store/provider.cjs');
if(process.argv[2]==='--claim'){
  const client=store.createLocalClient(process.argv[3]);
  client.from('attendance_runs').update({status:'picked_up'}).eq('id',process.argv[4]).eq('status','queued').select('*').maybeSingle().then(r=>{if(r.error)throw Error(r.error.message);console.log(r.data?'won':'lost');});
}else (async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ch2ch-local-test-'));
  process.env.CH2CH_STORAGE_PROVIDER='local';process.env.CH2CH_DATA_DIR=directory;
  // Fail closed when an initialized/activated DB disappears.
  assert.throws(()=>store.createLocalClient(directory),/빈 DB/);
  store.openLocal(directory,true);
  const client=store.createDataClient();
  let r=await client.from('attendance_runs').insert({id:'run-test',status:'queued',dry_run:true,target_week:46}).select('id,status').single();
  assert.equal(r.error,null);assert.equal(r.data.status,'queued');
  assert.equal((await client.from('attendance_runs').select('id',{count:'exact',head:true})).count,1);
  function claim(){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[__filename,'--claim',directory,'run-test'],{windowsHide:true});let out='';child.stdout.on('data',x=>out+=x);child.on('error',reject);child.on('exit',code=>code===0?resolve(out.trim()):reject(Error('Claim child failed')));});}
  assert.deepEqual((await Promise.all([claim(),claim()])).sort(),['lost','won']);
  assert.equal((await client.from('attendance_runs').select('*').eq('id','run-test').single()).data.dry_run,true);
  assert.ok((await client.from('attendance_runs').select('*').eq('id','missing').single()).error);
  assert.equal((await client.from('attendance_runs').select('*').eq('id','missing').maybeSingle()).data,null);
  assert.ok((await client.from('attendance_runs').update({status:'failed'})).error);
  assert.ok((await client.from('attendance_results').insert({run_id:'missing',name:'테스트',normalized_name:'테스트',status:'success'})).error);
  const rows=[{id:'res1',run_id:'run-test',name:'테스트',normalized_name:'테스트',status:'success',service_1_3_present:true,service_4_present:false}, {id:'res2',run_id:'run-test',name:'확인',normalized_name:'확인',status:'final_fail'}];
  r=await client.from('attendance_results').insert(rows).select('*');assert.equal(r.error,null);assert.equal(r.data.length,2);
  assert.equal((await client.from('attendance_results').select('*').eq('service_1_3_present',true)).data.length,1);
  // Entire insert batch rolls back if a later item collides.
  assert.ok((await client.from('attendance_results').insert([{...rows[0],id:'res3'},rows[0]])).error);
  assert.equal((await client.from('attendance_results').select('*').eq('id','res3')).data.length,0);
  r=await client.from('attendance_weekly_records').upsert({normalized_name:'테스트',member_name:'테스트',family:'가족%_네',target_term:'26하',target_week:46,service_4_present:true,source_run_id:'run-test',source_result_id:'res1'},{onConflict:'normalized_name,target_term,target_week'});assert.equal(r.error,null);
  await client.from('attendance_weekly_records').upsert({normalized_name:'테스트',target_term:'26하',target_week:46,service_4_present:false},{onConflict:'normalized_name,target_term,target_week'});
  r=await client.from('attendance_weekly_records').select('*').like('family','%가족\\%\\_네%').range(0,9);assert.equal(r.data.length,1);assert.equal(r.data[0].service_4_present,false);
  assert.equal((await client.from('attendance_results').select('*').order('id',{ascending:false}).range(1,1)).data[0].id,'res1');
  const signal=AbortSignal.abort();assert.ok((await client.from('attendance_runs').select('*').abortSignal(signal)).error);
  await client.from('runner_heartbeats').upsert({runner_id:'fixture',current_run_id:null},{onConflict:'runner_id'});
  await client.from('runner_heartbeats').upsert({runner_id:'fixture',status:'online'},{onConflict:'runner_id'});
  assert.equal((await client.from('runner_heartbeats').select('*')).data.length,1);
  r=await client.from('qr_sync_jobs').insert({action:'preview',week:46,sheet_url:'fixture',preview:{id:'preview',week:46,names:['테스트']}}).select('*').single();assert.equal(r.error,null);
  const qrId=r.data.id;assert.equal(r.data.status,'queued');
  await client.from('qr_sync_jobs').update({status:'completed',result:{previewId:'p',success:2}}).eq('id',qrId);
  assert.equal((await client.from('qr_sync_jobs').select('status,result').eq('id',qrId).single()).data.result.success,2);
  const bucket=client.storage.from('attendance-inputs');
  assert.equal((await bucket.upload('2026-11-16/test.csv',Buffer.from('이름,출석\n테스트,TRUE'))).error,null);
  assert.equal(await (await bucket.download('2026-11-16/test.csv')).data.text(),'이름,출석\n테스트,TRUE');
  assert.ok((await bucket.upload('2026-11-16/test.csv',Buffer.from('overwrite'))).error);
  for(const key of ['../escape','a/../../secret','C:/secret','a\\secret','a/..','a/file:stream'])assert.ok((await bucket.download(key)).error);
  assert.match((await bucket.download('old/missing.csv')).error.message,/Supabase 보관/);
  assert.equal((await bucket.remove(['2026-11-16/test.csv'])).error,null);
  await store.saveJournal({id:'j1',date:'2026-11-15',sermonTitle:'테스트',announcements:['원문 그대로']});
  await store.saveJournal({id:'j2',date:'2026-11-15',sermonTitle:'수정',announcements:['원문 그대로']});
  assert.equal(store.readJournals().length,1);assert.equal(store.readJournals()[0].id,'j2');
  await Promise.all([store.saveJournal({id:'j3',date:'2026-11-08'}),store.saveJournal({id:'j4',date:'2026-11-01'})]);assert.equal(store.readJournals().length,3);
  // Exercise the real Runner's claim, result persistence and QR handoff with stubbed external work.
  const ts=require('typescript'),vm=require('node:vm');
  const source=fs.readFileSync(path.join(__dirname,'../../runner/src/runner.js'),'utf8');
  const ast=ts.createSourceFile('runner.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='Runner').getText(ast);
  const context=vm.createContext({createDataClient:()=>client,os,process,AbortSignal,console:{log(){},error(){}},isVerifiedAttendanceResult:r=>r.save_result==='success',buildQrWorkerPayload:j=>({action:j.action}),fetch:async(url,init)=>{assert.ok(url.startsWith('http://fixture/'));assert.equal(JSON.parse(init.body).action,'preview');return {ok:true,json:async()=>({data:{id:'server-preview'}})};}});
  const Runner=vm.runInContext(cls+';Runner',context),runner=new Runner({runnerId:'fixture-runner',dashboardUrl:'http://fixture'});
  const queued=(await client.from('qr_sync_jobs').insert({action:'preview',week:46,sheet_url:'fixture'}).select('*').single()).data;
  await runner.processQrJob(await runner.pickQueuedQrJob());
  assert.equal((await client.from('qr_sync_jobs').select('*').eq('id',queued.id).single()).data.result.id,'server-preview');
  await runner.saveResults({id:'run-test',dry_run:true,target_term:'26하'},[{name:'검증',normalized_name:'검증',status:'success',save_result:'success',target_week:46}]);
  assert.equal((await client.from('attendance_results').select('*').eq('run_id','run-test')).data.length,3);
  assert.equal((await client.from('attendance_weekly_records').select('*')).data.length,1,'Dry run must not write weekly results');
  await runner.createReporter('run-test').event('fixture','테스트');
  assert.equal((await client.from('run_events').select('*').eq('run_id','run-test')).data.length,1);
  assert.equal(store.openLocal(directory).prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  console.log('PASS: isolated SQLite persistence, cross-process atomic claim, transactional rollback, filters, booleans, upserts, QR handoff/results, Runner persistence, private files, traversal rejection, journals and integrity. No external writes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
