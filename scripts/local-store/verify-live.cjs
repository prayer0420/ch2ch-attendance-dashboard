// Authenticated read-only checks. Credentials/response bodies are never printed.
const assert=require('node:assert/strict');
const {configuration,openLocal,readJournals}=require('../../lib/local-store/provider.cjs');
let stage='configuration';
(async()=>{
  const config=configuration();assert.equal(config.provider,'local');
  const db=openLocal(config.directory);
  const base='http://127.0.0.1:3000';
  const req=(url,init={})=>fetch(base+url,{...init,redirect:'manual',signal:AbortSignal.timeout(15000)});
  stage='anonymous denial';assert.equal((await req('/api/runs')).status,401);
  stage='login';
  const login=await req('/api/auth/login',{method:'POST',headers:{origin:base,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({password:process.env.APP_ACCESS_PASSWORD})});
  assert.equal(login.status,200);const cookie=(login.headers.get('set-cookie')||'').split(';')[0];assert.ok(cookie.startsWith('ch2ch_admin_session='));
  stage='historical runs';
  const runs=await req('/api/runs?pageSize=100',{headers:{cookie}});assert.equal(runs.status,200);
  const data=await runs.json();assert.equal(data.demo,false);assert.equal(data.data.length,db.prepare('SELECT count(*) n FROM attendance_runs').get().n);
  stage='results and events';
  const id=data.data[0].id;
  for(const part of ['results','events']){
    const res=await req(`/api/runs/${id}/${part}`,{headers:{cookie}});assert.equal(res.status,200);assert.ok(Array.isArray((await res.json()).data));
  }
  stage='attendance history';assert.equal((await req('/api/attendance?pageSize=10',{headers:{cookie}})).status,200);
  stage='journals';const journals=await req('/api/worship-journals',{headers:{cookie}});assert.equal(journals.status,200);assert.equal((await journals.json()).journals.length,readJournals().length);
  stage='screens';for(const screen of ['/','/runs/new','/qr-attendance','/worship-journal']){const r=await req(screen,{headers:{cookie}});assert.equal(r.status,200);await r.body?.cancel();}
  stage='Runner heartbeat';const heartbeat=await req('/api/runner/status',{headers:{cookie}});assert.equal(heartbeat.status,200);const h=(await heartbeat.json()).data;assert.equal(h.status,'online');assert.ok(Date.now()-new Date(h.last_seen_at).getTime()<30000);
  console.log('PASS: live PC DB, authenticated history/results/events/journals, all main screens, anonymous denial and fresh Runner heartbeat. No attendance/Google/BAND writes.');
})().catch(()=>{console.error('Live PC verification failed at: '+stage+' (private response omitted).');process.exitCode=1;});
