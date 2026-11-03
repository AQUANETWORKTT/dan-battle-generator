// Local API + the already configured real database. Creates only a default
// zero-star cell, then removes that cell conditionally if unchanged.
require('@next/env').loadEnvConfig(process.cwd());
const assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
const base=process.env.STAR_TRACKER_TEST_URL||'http://127.0.0.1:3105';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local API only.');
const db=createClient(process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL,process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
(async()=>{
 const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({area:'onboarding',password:process.env.TEST_ONBOARDING_PASSWORD||'ash1'})});assert(login.ok);
 const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 async function api(method='GET',body){const r=await fetch(base+'/api/star-tracker',{method,headers:{Cookie:cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
 const first=await api();assert.equal(first.status,200);assert(first.data.creators.length>0);
 const creator=first.data.creators.find(c=>!c.awards['gift-gallery']);assert(creator,'No unused cell available for a safe persistence check.');
 const name='streamer-star-tracker-v1:'+creator.id+':gift-gallery';
 const existing=await db.from('poster_templates').select('name').eq('name',name).maybeSingle();assert(!existing.error);assert(!existing.data);
 let created=false;
 try{
  const input={creatorId:creator.id,campaign:'gift-gallery',stars:0,revision:0};
  const save=await api('PATCH',input);assert.equal(save.status,200);created=true;assert.equal(save.data.award.revision,1);
  const persisted=await db.from('poster_templates').select('template_json').eq('name',name).single();assert(!persisted.error);assert.equal(persisted.data.template_json.stars,0);
  const retry=await api('PATCH',input);assert.equal(retry.status,200);assert.equal(retry.data.award.revision,1);
  const reopened=await api();assert.equal(reopened.status,200);assert.equal(reopened.data.creators.find(c=>c.id===creator.id).awards['gift-gallery'].stars,0);
  const conflict=await api('PATCH',{...input,stars:1});assert.equal(conflict.status,409);assert.equal(conflict.data.award.stars,0);
  console.log('Real database passed:',first.data.creators.length,'eligible creators; zero-star save, persisted record, idempotent retry, reload and stale-edit conflict.');
 }finally{
  if(created){const removed=await db.from('poster_templates').delete().eq('name',name).eq('template_json->>revision','1').eq('template_json->>stars','0').select('name');assert(!removed.error);assert.equal(removed.data.length,1,'Temporary cell changed elsewhere; it was preserved rather than deleted.');console.log('Temporary zero-star test cell removed. No creator balances changed.');}
 }
 const targets=first.data.creators.filter(c=>!c.awards['gift-gallery']).slice(0,2);assert.equal(targets.length,2);
 const operationId=require('node:crypto').randomUUID(),operationName='streamer-star-tracker-bulk-v1:'+operationId;
 const cellNames=targets.map(c=>'streamer-star-tracker-v1:'+c.id+':gift-gallery');
 for(const cellName of cellNames){const before=await db.from('poster_templates').select('name').eq('name',cellName).maybeSingle();assert(!before.error);assert(!before.data);}
 try{
  const missingName='missing_test_'+operationId.slice(0,8);assert(!first.data.creators.some(c=>c.username===missingName));
  const input={operationId,campaign:'gift-gallery',delta:-1,usernames:[...targets.map(c=>c.username),missingName]};
  const bulk=await api('POST',input);assert.equal(bulk.status,200);assert(bulk.data.done);assert.equal(bulk.data.total,2);assert(bulk.data.awards.every(a=>a.stars===0&&a.history.some(h=>h.operationId===operationId)));
  assert(bulk.data.missingUsernames.includes(missingName));
  const retry=await api('POST',input);assert.equal(retry.status,200);assert(retry.data.done);assert.equal(retry.data.awards.length,0);
  const reopened=await api();assert.equal(reopened.status,200);for(const target of targets)assert.equal(reopened.data.creators.find(c=>c.id===target.id).awards['gift-gallery'].stars,0);
  const backup=await fetch(base+'/api/star-tracker?backup=1',{headers:{Cookie:cookie}});assert(backup.ok);const archive=await backup.json();assert(archive.records.some(r=>r.name===operationName));
  console.log('Real bulk storage passed: zero-floor removal, retained history, safe duplicate retry, shared reload and downloadable backup.');
 }finally{
  for(const cellName of cellNames){const current=await db.from('poster_templates').select('template_json').eq('name',cellName).maybeSingle();assert(!current.error);if(current.data){const award=current.data.template_json;if(award.stars===0&&award.revision===1&&award.history?.length===1&&award.history[0].operationId===operationId){const removed=await db.from('poster_templates').delete().eq('name',cellName).eq('template_json->>revision','1').eq('template_json->>stars','0');assert(!removed.error);}else throw Error('A temporary cell changed elsewhere; it was preserved.');}}
  const removed=await db.from('poster_templates').delete().eq('name',operationName).eq('template_json->>operationId',operationId);assert(!removed.error);
  console.log('Only the temporary bulk test records were removed. No creator totals changed.');
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
