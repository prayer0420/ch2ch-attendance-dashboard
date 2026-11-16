// Temporary browser-test state in the private data directory, never in Git.
const fs=require('node:fs'),path=require('node:path');
const {configuration}=require('../../lib/local-store/provider.cjs');
const dir=configuration().directory;if(!dir)throw new Error('Local data directory is required.');
const file=path.join(dir,'verification-browser-state.json');
(async()=>{
  if(process.argv[2]==='clear'){if(fs.existsSync(file))fs.unlinkSync(file);console.log('Temporary verification session file removed.');return;}
  const base=process.env.APP_PUBLIC_ORIGIN;
  if(!base?.startsWith('https://')||!process.env.APP_ACCESS_PASSWORD)throw new Error('Private authentication must be loaded.');
  const res=await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:base,'content-type':'application/json','ngrok-skip-browser-warning':'1',accept:'application/json'},body:JSON.stringify({password:process.env.APP_ACCESS_PASSWORD}),redirect:'manual',signal:AbortSignal.timeout(15000)});
  if(res.status!==200)throw new Error('Test login failed.');
  const cookie=(res.headers.get('set-cookie')||'').split(';')[0];const i=cookie.indexOf('=');
  if(cookie.slice(0,i)!=='ch2ch_admin_session')throw new Error('No verified test session.');
  fs.writeFileSync(file,JSON.stringify({cookies:[{name:cookie.slice(0,i),value:cookie.slice(i+1),domain:new URL(base).hostname,path:'/',expires:Math.floor(Date.now()/1000)+1800,httpOnly:true,secure:true,sameSite:'Lax'}],origins:[]}),{flag:'wx',mode:0o600});
  console.log('Private browser verification session prepared.');
})().catch(()=>{console.error('Could not prepare browser verification session. Credentials omitted.');process.exitCode=1;});
