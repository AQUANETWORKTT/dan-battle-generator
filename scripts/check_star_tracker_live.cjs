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
})().catch(error=>{console.error(error.message);process.exitCode=1;});
