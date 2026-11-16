// Manual consistent snapshot. SQLite backup includes WAL transactions; no raw DB copy.
const fs=require('node:fs'),path=require('node:path');
const {backup}=require('node:sqlite');
const {configuration,openLocal}=require('../../lib/local-store/provider.cjs');
(async()=>{
  const config=configuration();if(config.provider!=='local')throw new Error('PC storage is not selected.');
  const dest=path.join(config.directory,'backups',new Date().toISOString().replace(/[:.]/g,'-'));
  fs.mkdirSync(dest,{recursive:true,mode:0o700});
  await backup(openLocal(config.directory),path.join(dest,'attendance.sqlite'));
  for(const name of ['files','migration-ready.json','archived-supabase-files.json']){
    const source=path.join(config.directory,name);if(fs.existsSync(source))fs.cpSync(source,path.join(dest,name),{recursive:true,errorOnExist:true,force:false});
  }
  console.log(`Consistent PC backup: ${dest}`);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
