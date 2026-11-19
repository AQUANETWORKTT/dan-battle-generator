// Names and diamond goals transcribed from the 19 November screenshots.
const targets={
 jj_200422:100000,jamesintune:100000,alisha06:200000,
 blondiebeingblondie:100000,paigeoliviaax1:500000,stephen14444:300000,
 tkaysx:1000000,riocoulton:500000,'alfie.434':300000,
 hannahbrissenden12:100000,ella_quinnxx:100000,courtsxox33:200000,
 missmillieee:200000,kleelou_ygam_kiki:200000,itssophie_xo19:200000,
 deaks89:200000,'soph.x19x':200000,harryjonesey:1000000,
};
const month='2026-11',setting='team-dan-target-tracker-settings';
function merge(current){
 const next={...current,targets:{...current.targets},deleted:(current.deleted||[]).filter(name=>!Object.hasOwn(targets,name)),includedCreators:[...new Set([...(current.includedCreators||[]),...Object.keys(targets).map(name=>month+':'+name)])]};
 for(const [name,diamonds] of Object.entries(targets)){
  const key=month+':'+name;next.targets[key]={...next.targets[key],diamonds};
 }
 return next;
}
module.exports={targets,merge};
if(require.main===module){
 require('@next/env').loadEnvConfig(process.cwd());
 const db=require('@supabase/supabase-js').createClient(process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL,process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 (async()=>{
  const read=await db.from('poster_templates').select('id,updated_at,template_json').eq('name',setting).single();if(read.error)throw Error(read.error.message);
  const current=read.data.template_json||{},next=merge(current);
  if(!process.argv.includes('--apply')){console.log(JSON.stringify({month,creators:targets,totalDiamonds:Object.values(targets).reduce((a,b)=>a+b,0),mode:'preview'}));return;}
  const fs=require('node:fs');fs.mkdirSync('.next/target-import-backups',{recursive:true});fs.writeFileSync('.next/target-import-backups/november-19-'+Date.now()+'.json',JSON.stringify(read.data));
  const saved=await db.from('poster_templates').update({template_json:next,updated_at:new Date().toISOString()}).eq('id',read.data.id).eq('updated_at',read.data.updated_at).select('template_json').single();
  if(saved.error)throw Error('Targets were not saved. The settings may have changed; retry. '+saved.error.message);
  const verify=await db.from('poster_templates').select('template_json').eq('id',read.data.id).single();if(verify.error)throw Error(verify.error.message);
  for(const [name,diamonds] of Object.entries(targets))if(verify.data.template_json.targets[month+':'+name]?.diamonds!==diamonds)throw Error('Verification failed for '+name);
  console.log(JSON.stringify({savedAndVerified:Object.keys(targets).length,month,totalDiamonds:Object.values(targets).reduce((a,b)=>a+b,0),daysAndHours:'preserved'}));
 })().catch(error=>{console.error(error.message);process.exit(1)});
}
