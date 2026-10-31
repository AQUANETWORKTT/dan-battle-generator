import "server-only";
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {database,checked,RUNS,JOBS,CONTROL,databaseConfigured} from './db';
import {tikleap,ProviderError,apiConfigured} from './provider';
import {parseLeagues,parseRankings,uniqueRankings,nextPage,username,type Run,type RunData,type Eligibility} from './types';
import {detectEligibilityChanges,type Observation} from './history';
export class SearchError extends Error{constructor(message:string,public status=400){super(message);}}
export const validId=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function workerAllowed(header:string|null){const expected=process.env.CREATOR_SEARCH_WORKER_TOKEN;if(!expected||expected.length<32)return false;const provided=header?.startsWith('Bearer ')?header.slice(7):'';return Buffer.byteLength(provided)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(provided),Buffer.from(expected));}
export async function reserve(){const {data}=await checked(database().rpc('creator_api_reserve_slot',{spacing_ms:Math.max(2100,Number(process.env.TIKLEAP_MIN_INTERVAL_MS)||2100)}));return String(data);}
export async function configuration(){let worker:any=null,storageError='';if(databaseConfigured())try{const {data}=await checked(database().from(CONTROL).select('last_worker_seen_at,worker_ready').eq('id','tikleap').maybeSingle());worker=data;}catch(e){storageError=e instanceof Error?e.message:'Storage unavailable';}return {apiConfigured:apiConfigured(),databaseConfigured:databaseConfigured(),storageError,workerConfigured:Boolean(process.env.CREATOR_SEARCH_WORKER_TOKEN?.length&&process.env.CREATOR_SEARCH_WORKER_TOKEN.length>=32),workerOnline:Boolean(worker?.worker_ready&&Date.now()-Date.parse(worker.last_worker_seen_at)<90000),workerSeenAt:worker?.last_worker_seen_at||null};}
export async function getRun(id:string):Promise<Run>{if(!validId(id))throw new SearchError('Invalid fetch ID.');const {data}=await checked(database().from(RUNS).select('*').eq('id',id).maybeSingle());if(!data)throw new SearchError('Saved fetch not found.',404);return data as Run;}
export async function history(before:string|null){let q=database().from(RUNS).select('id,created_at,updated_at,status,summary').order('created_at',{ascending:false}).order('id').limit(25);if(before){if(!Number.isFinite(Date.parse(before)))throw new SearchError('Invalid history cursor.');q=q.lt('created_at',before);}const {data}=await checked(q);return data||[];}
export async function createRun(){const payload:RunData={leagues:[],results:{},discovered:false,discoveryAttempts:0,status:'running'};const {data}=await checked(database().from(RUNS).insert({payload,status:'running'}).select().single());return data as Run;}
async function claim(id:string){if(!validId(id))throw new SearchError('Invalid fetch ID.');const token=randomUUID();const {data}=await checked(database().rpc('creator_api_claim_run',{run_id:id,claim_token:token}));if(!data?.[0])throw new SearchError('This fetch is currently being updated. Retry shortly.',409);return {run:data[0] as Run,token};}
function summary(payload:RunData){return {usernames:uniqueRankings(payload).length,leagues:payload.leagues.length,completed:payload.leagues.filter(l=>l.status==='complete').length,failed:payload.leagues.filter(l=>l.status==='failed'||l.status==='missing').length,error:payload.error||null};}
async function save(run:Run,token:string){const {data}=await checked(database().from(RUNS).update({payload:run.payload,status:run.payload.status,summary:summary(run.payload),updated_at:new Date().toISOString(),lease_token:null,leased_until:null}).eq('id',run.id).eq('lease_token',token).select().maybeSingle());if(!data)throw new SearchError('Fetch lease expired; reload the saved fetch.',409);return data as Run;}
export async function advance(id:string,retry=false){
 const {run,token}=await claim(id);const d=run.payload;
 try{
  if(d.status==='stopped')return await save(run,token);
  if(retry){d.nextAt=null;d.error=undefined;d.status='running';if(!d.discovered)d.discoveryAttempts=0;d.leagues.forEach(l=>{if(l.status==='failed'||l.status==='missing'){l.status='pending';l.attempts=0;l.error=undefined;}});return await save(run,token);}
  if(['complete','partial','failed','paused','stopped'].includes(d.status))return await save(run,token);
  if(d.nextAt&&Date.parse(d.nextAt)>Date.now())return await save(run,token);
  let league=d.leagues.find(l=>l.status==='pending'||l.status==='fetching');
  try{
   if(!d.discovered){d.discoveryAttempts++;const reply=await tikleap('/leagues?region=GB',reserve);d.leagues=parseLeagues(reply.body);d.discovered=true;d.error=undefined;}
   else if(league){const path=league.next||`/leagues/${encodeURIComponent(league.code)}?region=GB`;league.attempts++;const reply=await tikleap(path,reserve);const rejected:unknown[]=[];const parsed=parseRankings(reply.body,league.code,rejected),existing=d.results[league.code]||[];const found=new Map([...existing,...parsed].map(row=>[row.username,row]));d.results[league.code]=[...found.values()];if(rejected.length)throw Error(`${rejected.length} unsupported username record(s) require review. ${found.size} valid usernames have been saved; hidden characters were not removed or matched to a different account.`);league.pages=(league.pages||0)+1;const next=nextPage(reply.body,path);if(next&&(next===path||league.seen?.includes(next)))throw Error('TikLeap repeated a pagination link. Partial results are retained.');league.seen=[...(league.seen||[]),path];league.next=next;league.attempts=0;league.error=undefined;if(next){league.status='fetching';if(league.pages>=1000)throw Error('Pagination safety limit reached. Partial results are retained.');}else{league.status='complete';if(league.expected!==null&&found.size<league.expected){league.status='failed';league.error=`TikLeap returned ${found.size} of ${league.expected} listed creators, without a next-page link. Partial results are retained; league pagination is not otherwise documented.`;}}d.error=undefined;}
   d.nextAt=null;
  }catch(e){const provider=e instanceof ProviderError?e:null;const message=e instanceof Error?e.message:'TikLeap request failed.';const attempts=league?.attempts??d.discoveryAttempts;
   if(provider?.quota||provider?.status===401||provider?.status===403||provider?.status===503&&!apiConfigured()){d.status='paused';d.nextAt=provider.retryAt;d.error=message;}
   else if(provider?.retryable&&attempts<3){d.status='waiting';d.nextAt=provider.retryAt||new Date(Date.now()+5000).toISOString();d.error=message;}
   else if(league){league.status=provider?.status===404?'missing':'failed';league.error=message;d.nextAt=null;d.error=undefined;}
   else{d.status='failed';d.error=message;}
  }
  if(!['failed','paused','waiting'].includes(d.status)){d.status=d.discovered&&!d.leagues.some(l=>l.status==='pending'||l.status==='fetching')?(d.leagues.some(l=>l.status==='failed'||l.status==='missing')?'partial':'complete'):'running';}
  // A waiting request that succeeds returns to normal progress.
  if(d.status==='waiting'&&!d.nextAt)d.status=d.leagues.some(l=>l.status==='pending'||l.status==='fetching')?'running':d.leagues.some(l=>l.status==='failed'||l.status==='missing')?'partial':'complete';
  return await save(run,token);
 }catch(e){await checked(database().from(RUNS).update({lease_token:null,leased_until:null}).eq('id',id).eq('lease_token',token));throw e;}
}
export async function withEligibility(run:Run){const {data:jobs}=await checked(database().from(JOBS).select('*').eq('run_id',run.id).order('created_at'));const eligibility:Record<string,Eligibility>={};for(const job of jobs||[])for(const name of job.usernames){const result=job.results?.[name];eligibility[name]=result?{...result,jobId:job.id}:{username:name,status:'Pending',reason:job.results?.['$scanStopped']?'Scan stopped before this username was checked':job.status==='queued'?'Queued for the Backstage worker':'Being checked by the Backstage worker',jobId:job.id};}return {...run,eligibility};}
export async function queueChecks(id:string,names:unknown){
 if((await getRun(id)).payload.status==='stopped')throw new SearchError('This scan was stopped. Start a New Scan to continue.');
 const {run,token}=await claim(id);try{const known=new Set(uniqueRankings(run.payload).map(r=>r.username));const wanted=names===undefined?[...known]:Array.isArray(names)?[...new Set(names.map(username))]:[];if(!wanted.length||wanted.some(n=>!n||!known.has(n)))throw new SearchError('Select valid usernames from this saved UK fetch.');const {data:old}=await checked(database().from(JOBS).select('usernames,status').eq('run_id',id).neq('status','completed'));const busy=new Set((old||[]).flatMap(j=>j.usernames));const pending=wanted.filter(n=>!busy.has(n));const jobs=[];for(let i=0;i<pending.length;i+=30)jobs.push({run_id:id,usernames:pending.slice(i,i+30)});if(jobs.length)await checked(database().from(JOBS).insert(jobs));return {queued:pending.length,batches:jobs.length};}finally{await checked(database().from(RUNS).update({lease_token:null,leased_until:null}).eq('id',id).eq('lease_token',token));}
}
export async function claimJob(ready:boolean){await checked(database().from(CONTROL).update({last_worker_seen_at:new Date().toISOString(),worker_ready:ready}).eq('id','tikleap'));if(!ready)return null;const {data}=await checked(database().rpc('creator_api_claim_job',{claim_token:randomUUID()}));return data?.[0]||null;}
export async function completeJob(id:string,body:any){if(!validId(id)||!validId(String(body.leaseToken||'')))throw new SearchError('Invalid job lease.');const {data:job}=await checked(database().from(JOBS).select('*').eq('id',id).eq('lease_token',body.leaseToken).eq('status','running').maybeSingle());if(!job||Date.parse(job.leased_until)<Date.now())throw new SearchError('The worker lease expired, stopped or was reassigned.',409);if(!Array.isArray(body.results)||body.results.length>30)throw new SearchError('Results must contain at most 30 creators.');const ranks=new Map(uniqueRankings((await getRun(job.run_id)).payload).map(row=>[row.username,row]));const results={...job.results};const seen=new Set<string>();for(const row of body.results){const name=username(row.username);if(!job.usernames.includes(name)||seen.has(name)||!['Available','Ineligible','Pending','Failed'].includes(row.status))throw new SearchError('Worker results must match unique usernames in this job.');seen.add(name);const ranking=ranks.get(name);results[name]={username:name,status:row.status,reason:String(row.reason||'').slice(0,1000),checkedAt:new Date().toISOString(),retryable:row.status==='Failed',invitationType:['Premium','Regular'].includes(row.invitationType)?row.invitationType:'Unknown',diamonds:ranking?.diamonds??null,creatorId:ranking?.creatorId};}
 const done=job.usernames.every((name:string)=>Boolean(results[name]?.checkedAt));const {data}=await checked(database().from(JOBS).update({results,status:done?'completed':'running',updated_at:new Date().toISOString(),leased_until:new Date(Date.now()+600000).toISOString()}).eq('id',id).eq('lease_token',body.leaseToken).select('id').maybeSingle());if(!data)throw new SearchError('Worker lease changed.',409);return {completed:done};}
export async function creatorEndpoint(name:string,kind:string,params:URLSearchParams){const user=username(name);if(!user)throw new SearchError('Enter a valid TikTok username.');const base=`/creators/${encodeURIComponent(user)}`;let path=base;const q=new URLSearchParams();if(kind==='history'||kind==='streams'){path+=`/${kind}`;q.set('limit','20');const cursor=params.get('cursor');if(cursor){if(cursor.length>2000)throw new SearchError('Invalid page cursor.');q.set('cursor',cursor);}}else if(kind==='gallery'){path+='/gift-gallery';const period=params.get('period');if(period){if(!/^\d{8}$|^\d{4}-\d{2}-\d{2}$/.test(period))throw new SearchError('Invalid gift gallery period.');path+='/'+period;}}else if(kind==='stream'||kind==='events'){const stream=params.get('streamId')||'';if(!/^[a-zA-Z0-9_-]{1,100}$/.test(stream))throw new SearchError('Choose a valid stream ID.');path+=`/streams/${stream}`;if(kind==='events')path+='/events';}else if(kind!=='profile')throw new SearchError('Unsupported creator section.');return tikleap(path+(q.size?'?'+q:''),reserve);}

export async function newScan(previousRunId?:string){
 if(previousRunId)await stopScan(previousRunId);
 const {data}=await checked(database().rpc('creator_api_new_scan'));
 if(!data?.[0])throw new SearchError('Could not start a new scan.',503);
 return data[0] as Run;
}
export async function stopScan(id:string){
 if(!validId(id))throw new SearchError('Invalid scan ID.');
 await checked(database().rpc('creator_api_stop_scan',{target_run:id}));
 return withEligibility(await getRun(id));
}
export async function workerJobActive(id:string,lease:string){
 if(!validId(id)||!validId(lease))throw new SearchError('Invalid job lease.');
 const {data}=await checked(database().from(JOBS).select('id,leased_until').eq('id',id).eq('lease_token',lease).eq('status','running').maybeSingle());
 return Boolean(data&&Date.parse(data.leased_until)>Date.now());
}
export async function contacts(cursor:string|null){
 let query=database().from('creator_api_search_contacts').select('username,status,messaged_at,source').order('username').limit(1001);
 if(cursor){if(!username(cursor))throw new SearchError('Invalid contacts cursor.');query=query.gt('username',cursor);}
 const {data}=await checked(query);
 const rows=data||[],more=rows.length>1000;if(more)rows.pop();
 const {data:control}=await checked(database().from(CONTROL).select('contacts_synced_at').eq('id','tikleap').maybeSingle());
 return {rows,nextCursor:more?rows.at(-1)?.username:null,syncedAt:control?.contacts_synced_at||null};
}
export async function syncContacts(body:any){
 if(!Array.isArray(body.records)||body.records.length>500)throw new SearchError('Sync at most 500 contact records per request.');
 const seen=new Set<string>();const records=body.records.map((row:any)=>{
  const name=username(row.username);
  if(!name||seen.has(name)||!['SENT','UNCERTAIN'].includes(row.status))throw new SearchError('Invalid or duplicate contact record.');
  seen.add(name);const date=row.messaged_at?new Date(row.messaged_at):null;
  if(date&&!Number.isFinite(date.getTime()))throw new SearchError('Invalid contact timestamp.');
  return {username:name,status:row.status,messaged_at:date?.toISOString()||null};
 });
 await checked(database().rpc('creator_api_sync_contacts',{records,finished:body.complete===true}));
 return {saved:records.length};
}

export async function eligibilityChanges(){
 const observations:Observation[]=[];const runs=new Set<string>();const cutoff=new Date().toISOString();
 for(let offset=0;;offset+=1000){
  const {data}=await checked(database().from(JOBS).select('id,run_id,created_at,results').lte('created_at',cutoff).order('created_at').order('id').range(offset,offset+999));
  const jobs=data||[];
  for(const job of jobs)for(const [name,value] of Object.entries(job.results||{})){
   const row=value as any;
   if(!username(name)||row?.username!==name||!['Available','Ineligible'].includes(row.status)||!row.checkedAt||!Number.isFinite(Date.parse(row.checkedAt))||Date.parse(row.checkedAt)>Date.parse(cutoff))continue;
   observations.push({...row,runId:job.run_id,jobId:job.id});runs.add(job.run_id);
  }
  if(jobs.length<1000)break;
 }
 const known=new Map<string,{value:number;time:number}>();
 for(const row of observations)if(typeof row.diamonds==='number'&&Number.isFinite(row.diamonds)&&row.diamonds>=0){const time=Date.parse(row.checkedAt!);if(!known.has(row.username)||known.get(row.username)!.time<=time)known.set(row.username,{value:row.diamonds,time});}
 return {changes:detectEligibilityChanges(observations),diamondTotals:Object.fromEntries([...known].map(([name,row])=>[name,row.value])),confirmedChecks:observations.length,scans:runs.size,asOf:cutoff};
}
