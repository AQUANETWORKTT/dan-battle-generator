import 'server-only';
import {database} from './creator-api-search/db';
import {starRoster,type StarAward,type StarCreator,type CampaignId} from './star-tracker';

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
export async function saveStarAward(input:{creatorId:string;campaign:CampaignId;stars:number;revision:number}){
 if(!(await trackerRoster()).creators.some(c=>c.id===input.creatorId))throw Error('This creator is not in the current First Class roster. Refresh the creator list.');
 const db=database(),name=STAR_PREFIX+input.creatorId+':'+input.campaign;
 const current=await db.from('poster_templates').select('template_json').eq('name',name).maybeSingle();fail(current.error);
 const previous=current.data?.template_json as StarAward|undefined;
 // Setting an absolute value makes a retried save idempotent, never additive.
 if(previous?.stars===input.stars)return previous;
 if(previous&&previous.revision!==input.revision)throw new StarConflict(previous);
 if(!previous&&input.revision!==0)throw Error('The award could not be found. Refresh before saving.');
 const award:StarAward={creatorId:input.creatorId,campaign:input.campaign,stars:input.stars,revision:input.revision+1,updatedAt:new Date().toISOString()};
 const record={name,template_json:award,background_url:null,updated_at:award.updatedAt};
 const saved=previous
  ? await db.from('poster_templates').update(record).eq('name',name).eq('template_json->>revision',String(input.revision)).select('template_json').maybeSingle()
  : await db.from('poster_templates').insert(record).select('template_json').maybeSingle();
 if(saved.error?.code==='23505'||(!saved.error&&!saved.data)){
  const fresh=await db.from('poster_templates').select('template_json').eq('name',name).single();fail(fresh.error);const winner=fresh.data?.template_json as StarAward;
  if(winner?.stars===input.stars)return winner;throw new StarConflict(winner);
 }
 fail(saved.error);if(!saved.data)throw Error('Award was not saved. Please try again.');return saved.data.template_json as StarAward;
}
