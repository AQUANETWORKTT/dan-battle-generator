// Local setup only. Credentials stay in .env.local; contact message text is never read.
const path=require('node:path');
const {spawnSync}=require('node:child_process');
require('@next/env').loadEnvConfig(process.cwd());
const {createClient}=require('@supabase/supabase-js');
const url=process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL;
const key=process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('First Class server-side database settings are required.');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
async function checked(query){const result=await query;if(result.error)throw Error(result.error.message);return result.data;}
(async()=>{
 const command=process.argv[2];
 if(command==='stop-current'){
  const id=process.argv[3];
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id||''))throw Error('Provide the exact current scan ID. No other scans will be changed.');
  await checked(db.rpc('creator_api_stop_scan',{target_run:id}));
  console.log('Stopped the specified scan only; saved results and bot contact history were retained.');
 }else if(command==='current-status'){
  const rows=await checked(db.from('creator_api_search_runs').select('id,created_at,status,summary').order('created_at',{ascending:false}).limit(1));
  console.log(JSON.stringify(rows));
 }else if(command==='sync-contacts'){
  const filename=process.env.CREATOR_SEARCH_BOT_DB||path.join(require('node:os').homedir(),'OneDrive','Desktop','FirstClassBot','creators.db');
  const code="import sys,json;sys.path.insert(0,sys.argv[1]);from contact_history import read_contacts;print(json.dumps(read_contacts(sys.argv[2])))";
  const result=spawnSync('python',['-c',code,path.resolve('integrations/firstclassbot'),filename],{encoding:'utf8',windowsHide:true,maxBuffer:20*1024*1024});
  if(result.status!==0)throw Error('Could not read bot message history; no sync was marked complete.');
  const records=JSON.parse(result.stdout);
  for(let offset=0;offset<records.length;offset+=500)await checked(db.rpc('creator_api_sync_contacts',{records:records.slice(offset,offset+500),finished:false}));
  await checked(db.rpc('creator_api_sync_contacts',{records:[],finished:true}));
  console.log(`History synced: ${records.filter(row=>row.status==='SENT').length} confirmed sends, ${records.filter(row=>row.status==='UNCERTAIN').length} uncertain attempts. No messages sent or message text copied.`);
 }else throw Error('Use current-status, stop-current <scan-id> or sync-contacts.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
