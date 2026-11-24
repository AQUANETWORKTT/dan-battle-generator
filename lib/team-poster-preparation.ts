import 'server-only';
import {randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
import {after} from 'next/server';
import {database} from './creator-api-search/db';
import {firstClassPosterSide,posterInScope,makePosterSnapshot,ukYesterday,type PosterSnapshot,type PreparedPoster} from './team-poster-preparation-model';

const STATE='prepared-team-posters-state-v1',BUCKET='prepared-team-posters';
type State={generation:string;revision?:string;phase:'queued'|'preparing'|'ready'|'partial'|'failed';date?:string;snapshot?:string;posters:PreparedPoster[];lease?:string;leaseUntil?:number;origin:string;error?:string;updatedAt:string};
type RecordRow={template_json:State;updated_at:string};
function checked<T extends {error:unknown}>(result:T):T{if(result.error)throw Error((result.error as {message?:string}).message||'Poster preparation storage failed.');return result;}
async function readState(){const r=checked(await database().from('poster_templates').select('template_json,updated_at').eq('name',STATE).maybeSingle());return r.data as RecordRow|null;}
async function updateState(row:RecordRow,state:State){
 const now=new Date().toISOString();let query=database().from('poster_templates').update({template_json:{...state,revision:randomUUID(),updatedAt:now},updated_at:now}).eq('name',STATE).eq('template_json->>generation',row.template_json.generation);
 query=row.template_json.revision?query.eq('template_json->>revision',row.template_json.revision):query.eq('updated_at',row.updated_at);
 const r=checked(await query.select('template_json,updated_at').maybeSingle());return r.data as RecordRow|null;
}
async function ensureBucket(){
 const db=database();const r=await db.storage.getBucket(BUCKET);if(r.data)return;
 const created=await db.storage.createBucket(BUCKET,{public:false,fileSizeLimit:50*1024*1024,allowedMimeTypes:['image/png','application/json']});
 if(created.error&&!/already exists/i.test(created.error.message))throw Error(created.error.message);
}
export async function latestPosterDate(){const r=checked(await database().from('creator_daily_stats').select('stat_date').or('data_period.is.null,data_period.neq.mature_month_total').order('stat_date',{ascending:false}).limit(1).maybeSingle());return r.data?.stat_date||'';}
async function snapshot():Promise<PosterSnapshot>{
 const date=await latestPosterDate();if(!date)throw Error('Upload creator data before preparing posters.');
 if(date!==ukYesterday())throw Error(`Yesterday’s data (${ukYesterday()}) is not uploaded yet. Latest upload: ${date}.`);
 const [daily,templates,assignments,excluded,fallbacks]=await Promise.all([
  import('@/app/api/data-analysis/daily-stats/route').then(m=>m.GET(new Request(`http://localhost/api/data-analysis/daily-stats?month=${date.slice(0,7)}&posterDate=${date}`))),
  import('@/app/api/team-poster-templates/route').then(m=>m.GET()),
  import('@/app/api/data-analysis/manager-assignments/route').then(m=>m.GET()),
  import('@/app/api/data-analysis/excluded-creators/route').then(m=>m.GET()),
  import('@/app/api/data-analysis/fallback-avatars/route').then(m=>m.GET()),
 ]);
 const results=await Promise.all([daily,templates,assignments,excluded,fallbacks].map(async r=>{const json=await r.json();if(!r.ok)throw Error(json.error||'Could not load poster inputs.');return json;}));
 const [d,t,a,e,f]=results;const managerGroups=a.managerGroups||a.assignments?.managerGroups||{};
 // Renew expiring background URLs once, before taking the immutable snapshot.
 const designs=await Promise.all(t.templates.filter((saved:any)=>saved.template_json&&firstClassPosterSide(saved.template_json,managerGroups)).map(async(saved:any)=>{
  const template={...saved.template_json,teamSide:firstClassPosterSide(saved.template_json,managerGroups)};let asset=String(template.backgroundPath||'');
  if(!asset){const marker='/storage/v1/object/public/poster-backgrounds/';const start=String(template.backgroundUrl||saved.background_url||'').indexOf(marker);if(start>=0)asset=decodeURIComponent(String(template.backgroundUrl||saved.background_url).slice(start+marker.length).split('?')[0]);}
  if(asset){const signed=checked(await database().storage.from('poster-backgrounds').createSignedUrl(asset,7*86400));if(!signed.data)throw Error("Poster background is unavailable.");template.backgroundUrl=signed.data.signedUrl;}
  return {...saved,template_json:template};
 }));
 if(!designs.length)throw Error('Save a team poster preset before preparing posters.');
 return makePosterSnapshot(date,d.rows,designs,managerGroups,(e.creators||[]).filter((r:any)=>r.hiddenFromDownloads).map((r:any)=>r.username),Object.fromEntries((f.avatars||[]).map((r:any)=>[r.username,r.imageUrl])));
}
function secret(){return process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY||'';}
function workerToken(generation:string){const value=`${generation}.${Math.floor(Date.now()/1000)+600}`;return value+'.'+createHmac('sha256',secret()).update('poster-worker:'+value).digest('hex');}
export function posterWorkerAllowed(header:string|null){
 const value=header?.replace(/^Bearer /,'')||'';const parts=value.split('.');if(parts.length!==3||!/^[-a-f0-9]{36}$/.test(parts[0])||!/^\d+$/.test(parts[1])||Number(parts[1])<Date.now()/1000||Number(parts[1])>Date.now()/1000+660||!secret())return false;
 const expected=createHmac('sha256',secret()).update('poster-worker:'+parts.slice(0,2).join('.')).digest('hex');return /^[a-f0-9]{64}$/.test(parts[2])&&timingSafeEqual(Buffer.from(parts[2]),Buffer.from(expected));
}
async function continueJob(state:State){
 // The next request owns its own after() lifetime. No browser tab is involved.
 const response=await fetch(new URL('/api/team-poster-preparation/run',state.origin),{method:'POST',headers:{authorization:'Bearer '+workerToken(state.generation)},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Background poster continuation could not start.');
}
export async function queueTeamPosterPreparation(origin:string){
 if(process.env.SITE_MODE==='atlas'||process.env.SITE_MODE==='events')return;
 const previous=await readState();
 // Keep the real team list while a new snapshot is being assembled. Old PNGs
 // are deliberately not marked ready for this new generation.
 const posters=(previous?.template_json.posters||[]).filter(p=>posterInScope(p,'first-class')).map(p=>({...p,path:undefined,error:undefined,noData:undefined,missingPictures:undefined}));
 const now=new Date().toISOString();const state:State={generation:randomUUID(),revision:randomUUID(),phase:'queued',date:previous?.template_json.date,posters,origin:new URL(origin).origin,updatedAt:now};
 checked(await database().from('poster_templates').upsert({name:STATE,template_json:state,background_url:null,updated_at:now},{onConflict:'name'}));
 after(async()=>{await runTeamPosterPreparation();});
}
export async function resumeTeamPosterPreparation(){after(async()=>{await runTeamPosterPreparation();});}
export async function runTeamPosterPreparation(){
 let row=await readState();if(!row||!['queued','preparing'].includes(row.template_json.phase))return;
 if(row.template_json.leaseUntil&&row.template_json.leaseUntil>Date.now())return;
 const lease=randomUUID();row=await updateState(row,{...row.template_json,phase:'preparing',lease,leaseUntil:Date.now()+330000,error:undefined});if(!row)return;
 let browser:import('playwright-core').Browser|undefined;const deadline=Date.now()+170000;
 try{
  await ensureBucket();let source:PosterSnapshot;
  if(row.template_json.snapshot){const download=checked(await database().storage.from(BUCKET).download(row.template_json.snapshot));if(!download.data)throw Error("Saved poster inputs are unavailable.");source=JSON.parse(await download.data.text());}
  else{
   source=await snapshot();const snapshotPath=`${row.template_json.generation}/snapshot.json`;
   checked(await database().storage.from(BUCKET).upload(snapshotPath,JSON.stringify(source),{contentType:'application/json',upsert:true}));
   row=await updateState(row,{...row.template_json,date:source.date,snapshot:snapshotPath,posters:source.posters});if(!row)return;
  }
  if(source.date!==ukYesterday())throw Error('The reporting day changed. Prepare posters again after today’s upload.');
  const {launchPosterBrowser,createPosterRenderer}=await import('./team-poster-renderer');browser=await launchPosterBrowser();const render=createPosterRenderer(browser,source.fallbacks);
  for(let index=0;index<row.template_json.posters.length;index++){
   const poster=row.template_json.posters[index];if(poster.path||poster.error||poster.noData)continue;if(Date.now()>deadline)break;
   let result:PreparedPoster;
   try{
    const {png,missingPictures}=await render(poster.template);const imagePath=`${row.template_json.generation}/${index}.png`;
    checked(await database().storage.from(BUCKET).upload(imagePath,png,{contentType:'image/png',cacheControl:'31536000',upsert:true}));result={...poster,path:imagePath,missingPictures};
   }catch(e){result={...poster,error:e instanceof Error?e.message:'Could not prepare poster.'};}
   const posters=[...row.template_json.posters];posters[index]=result;
   row=await updateState(row,{...row.template_json,posters,leaseUntil:Date.now()+330000});if(!row)return; // A newer upload superseded this job.
  }
  const pending=row.template_json.posters.some(p=>!p.path&&!p.error&&!p.noData);const state={...row.template_json,phase:pending?'queued':row.template_json.posters.some(p=>p.error)?'partial':'ready',lease:undefined,leaseUntil:undefined} as State;
  row=await updateState(row,state);if(row&&pending)await continueJob(row.template_json);
 }catch(e){
  if(row)await updateState(row,{...row.template_json,phase:'failed',lease:undefined,leaseUntil:undefined,error:e instanceof Error?e.message:'Poster preparation failed.'});
  console.error('Team poster preparation failed',e instanceof Error?e.message:'Unknown error');
 }finally{await browser?.close();}
}
export async function preparedPosterStatus(){
 const row=await readState();if(!row)return {phase:'not-prepared',posters:[],expectedDate:ukYesterday()};const state=row.template_json;
 return {generation:state.generation,phase:state.phase,date:state.date,expectedDate:ukYesterday(),updatedAt:state.updatedAt,error:state.error,posters:state.posters.filter(p=>posterInScope(p,'first-class')).map(({name,label,side,path,missingPictures,error,noData})=>({name,label,side,ready:Boolean(path),missingPictures,error,noData})),stalled:state.phase==='preparing'&&Number(state.leaseUntil)<Date.now()};
}
export async function downloadPreparedPoster(generation:string,name:string){
 const row=await readState();const state=row?.template_json;
 if(!state||generation!==state.generation||state.date!==ukYesterday()||state.date!==await latestPosterDate())throw Error('These posters are no longer current. Refresh for the latest preparation.');
 const poster=state.posters.find(p=>p.name===name&&posterInScope(p,'first-class'));if(!poster?.path)throw Error('This poster is not ready yet.');
 const result=checked(await database().storage.from(BUCKET).download(poster.path));return {blob:result.data,filename:`${poster.label.replace(/[^a-z0-9 _+-]/gi,'')}-${state.date}.png`};
}
