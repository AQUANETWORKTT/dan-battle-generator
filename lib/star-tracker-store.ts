import 'server-only';
import {database} from './creator-api-search/db';
import {starRoster,type StarAward,type StarCreator,type CampaignId,type StarBulkInput} from './star-tracker';

export const STAR_PREFIX='streamer-star-tracker-v1:';
type Roster={latestDate:string;creators:{id:string;username:string}[]};
let cached:{at:number;value:Roster}|undefined;
function fail(error:{message:string}|null){if(error)throw Error(error.message);}
export async function trackerRoster(refresh=false):Promise<Roster>{
 if(!refresh&&cached&&Date.now()-cached.at<15000)return cached.value;
 const db=database();
 const [latest,settings]=await Promise.all([
  db.from('creator_daily_stats').select('stat_date').or('data_period.is.null,data_period.neq.mature_month_total').order('stat_date',{ascending:false}).limit(1).maybeSingle(),
  db.from('poster_templates').select('template_json').eq('name','manager-assignment-settings').maybeSingle(),
 ]);fail(latest.error);fail(settings.error);
 const latestDate=String(latest.data?.stat_date||'');const rows:Record<string,unknown>[]=[];
 if(latestDate)for(let from=0;;from+=1000){const r=await db.from('creator_daily_stats').select('creator_id,creator_username,manager_email,email,agency,team,group_name').eq('stat_date',latestDate).or('data_period.is.null,data_period.neq.mature_month_total').order('creator_id').range(from,from+999);fail(r.error);rows.push(...(r.data||[]));if((r.data||[]).length<1000)break;}
 const groups=settings.data?.template_json?.assignments?.managerGroups||{};
 const value={latestDate,creators:starRoster(rows,groups)};cached={at:Date.now(),value};return value;
}
export async function readTracker(){
 const roster=await trackerRoster(true);const creators:StarCreator[]=roster.creators.map(row=>({...row,awards:{}}));const byId=new Map(creators.map(row=>[row.id,row]));
 for(let from=0;;from+=1000){const r=await database().from('poster_templates').select('template_json').like('name',STAR_PREFIX+'%').order('name').range(from,from+999);fail(r.error);for(const record of r.data||[]){const award=record.template_json as StarAward;const creator=byId.get(award.creatorId);if(creator)creator.awards[award.campaign]=award;}if((r.data||[]).length<1000)break;}
 return {latestDate:roster.latestDate,creators};
}
export class StarConflict extends Error{constructor(public award:StarAward){super('This award changed on another device. Review the saved value before trying again.');}}
export class StarCreatorMissing extends Error{constructor(){super('This creator is missing from the current roster.');}}
export async function saveStarAward(input:{creatorId:string;campaign:CampaignId;stars:number;revision:number},operation?:{id:string;delta:number}){
 if(!(await trackerRoster()).creators.some(c=>c.id===input.creatorId))throw new StarCreatorMissing();
 const db=database(),name=STAR_PREFIX+input.creatorId+':'+input.campaign;
 const current=await db.from('poster_templates').select('template_json').eq('name',name).maybeSingle();fail(current.error);
 const previous=current.data?.template_json as StarAward|undefined;
 // Setting an absolute value makes a retried save idempotent, never additive.
 if(operation&&previous?.history?.some(entry=>entry.operationId===operation.id))return previous;
 if(previous?.stars===input.stars&&!operation)return previous;
 if(previous&&previous.revision!==input.revision)throw new StarConflict(previous);
 if(!previous&&input.revision!==0)throw Error('The award could not be found. Refresh before saving.');
 const at=new Date().toISOString();
 const award:StarAward={creatorId:input.creatorId,campaign:input.campaign,stars:input.stars,revision:input.revision+1,updatedAt:at,history:[...(previous?.history||[]),{before:previous?.stars??0,after:input.stars,at,kind:operation?'bulk':'edit',...(operation?{operationId:operation.id,requestedDelta:operation.delta}:{})}]};
 const record={name,template_json:award,background_url:null,updated_at:award.updatedAt};
 const saved=previous
  ? await db.from('poster_templates').update(record).eq('name',name).eq('template_json->>revision',String(input.revision)).select('template_json').maybeSingle()
  : await db.from('poster_templates').insert(record).select('template_json').maybeSingle();
 if(saved.error?.code==='23505'||(!saved.error&&!saved.data)){
  const fresh=await db.from('poster_templates').select('template_json').eq('name',name).single();fail(fresh.error);const winner=fresh.data?.template_json as StarAward;
  if(operation?winner?.history?.some(entry=>entry.operationId===operation.id):winner?.stars===input.stars)return winner;throw new StarConflict(winner);
 }
 fail(saved.error);if(!saved.data)throw Error('Award was not saved. Please try again.');return saved.data.template_json as StarAward;
}

export const STAR_BULK_PREFIX='streamer-star-tracker-bulk-v1:';
type BulkOperation=StarBulkInput&{targets:{id:string;username:string}[];completedIds:string[];skippedIds?:string[];missingUsernames?:string[];revision:number;createdAt:string;updatedAt:string};
async function bulkRecord(name:string){const result=await database().from('poster_templates').select('template_json').eq('name',name).maybeSingle();fail(result.error);return result.data?.template_json as BulkOperation|undefined;}
export async function bulkStarAwards(input:StarBulkInput){
 const db=database(),name=STAR_BULK_PREFIX+input.operationId,usernames=[...new Set(input.usernames.map(n=>n.replace(/^@/,'').toLowerCase()))].sort();
 let operation=await bulkRecord(name);
 if(!operation){
  const roster=await trackerRoster(true),byName=new Map(roster.creators.map(c=>[c.username.toLowerCase(),c]));
  const unknown=usernames.filter(n=>!byName.has(n));
  const at=new Date().toISOString();operation={...input,usernames,targets:usernames.flatMap(n=>byName.has(n)?[byName.get(n)!]:[]),missingUsernames:unknown,completedIds:[],skippedIds:[],revision:0,createdAt:at,updatedAt:at};
  const insert=await db.from('poster_templates').insert({name,template_json:operation,background_url:null,updated_at:at});
  if(insert.error?.code==='23505')operation=await bulkRecord(name);else fail(insert.error);
 }
 if(!operation||operation.campaign!==input.campaign||operation.delta!==input.delta||JSON.stringify(operation.usernames)!==JSON.stringify(usernames))throw Error('This bulk operation ID belongs to a different request. Start a new bulk edit.');
 const batch=operation.targets.filter(c=>!operation!.completedIds.includes(c.id)).slice(0,30);
 const currentIds=new Set((await trackerRoster(true)).creators.map(c=>c.id));
 const skipped=batch.filter(c=>!currentIds.has(c.id));
 const awards:StarAward[]=[],errors:{username:string;message:string}[]=[];
 for(let i=0;i<batch.length;i+=5)await Promise.all(batch.slice(i,i+5).map(async target=>{
  if(!currentIds.has(target.id))return;
  try{
   for(let attempt=0;attempt<5;attempt++){
    const current=await db.from('poster_templates').select('template_json').eq('name',STAR_PREFIX+target.id+':'+input.campaign).maybeSingle();fail(current.error);
    const prior=current.data?.template_json as StarAward|undefined;
    if(prior?.history?.some(h=>h.operationId===input.operationId)){awards.push(prior);return;}
    const stars=Math.max(0,(prior?.stars||0)+input.delta);if(stars>1000000)throw Error('This award would exceed 1,000,000 stars.');
    try{awards.push(await saveStarAward({creatorId:target.id,campaign:input.campaign,stars,revision:prior?.revision||0},{id:input.operationId,delta:input.delta}));return;}catch(error){if(error instanceof StarConflict&&attempt<4)continue;throw error;}
   }
  }catch(error){if(error instanceof StarCreatorMissing)skipped.push(target);else errors.push({username:target.username,message:error instanceof Error?error.message:'Save failed.'});}
 }));
 // Cell-level operation IDs survive a timeout even if this progress write fails.
 // Merging progress with a revision check also supports simultaneous retries.
 for(let attempt=0;attempt<5;attempt++){
  const fresh=await bulkRecord(name);if(!fresh)throw Error('Bulk operation record is missing. Retry using the same operation ID.');
  const next={...fresh,completedIds:[...new Set([...fresh.completedIds,...awards.map(a=>a.creatorId),...skipped.map(c=>c.id)])],skippedIds:[...new Set([...(fresh.skippedIds||[]),...skipped.map(c=>c.id)])],missingUsernames:[...new Set([...(fresh.missingUsernames||[]),...skipped.map(c=>c.username)])],revision:fresh.revision+1,updatedAt:new Date().toISOString()};
  const saved=await db.from('poster_templates').update({template_json:next,updated_at:next.updatedAt}).eq('name',name).eq('template_json->>revision',String(fresh.revision)).select('template_json').maybeSingle();fail(saved.error);
  if(saved.data){operation=next;break;}if(attempt===4)throw Error('Another request is updating this bulk edit. Retry the same operation.');
 }
 const skippedCount=operation.skippedIds?.length||0;
 return {operationId:input.operationId,done:operation.completedIds.length===operation.targets.length,completed:operation.completedIds.length-skippedCount,total:operation.targets.length-skippedCount,missingUsernames:operation.missingUsernames||[],awards,errors};
}
export async function starTrackerBackup(){
 const records:{name:string;template_json:unknown}[]=[];
 for(const prefix of [STAR_PREFIX,STAR_BULK_PREFIX])for(let from=0;;from+=1000){const result=await database().from('poster_templates').select('name,template_json').like('name',prefix+'%').order('name').range(from,from+999);fail(result.error);records.push(...(result.data||[]));if((result.data||[]).length<1000)break;}
 return {format:'first-class-star-tracker-backup-v1',exportedAt:new Date().toISOString(),startingStars:10,records};
}
