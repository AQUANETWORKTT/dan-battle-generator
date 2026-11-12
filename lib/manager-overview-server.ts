import 'server-only';
import {agencyDiamondLedger} from './agency-diamond-ledger';
import {localPortalSnapshot} from './local-portal-snapshot';
import {gzipSync,gunzipSync} from 'node:zlib';
import {PORTAL_DATA_TAG} from './manager-portal-cache';
import {GET as recruitmentLeaderboard} from '@/app/api/data-analysis/recruitment-leaderboard/route';
import {recruitmentManagerIdentity} from './recruitment-manager-aliases';
import {database} from './creator-api-search/db';
import {overview,Stat,managerKey,portalCreatorActive} from './manager-overview';
import {firstClassStarCreator} from './star-tracker';
import {unstable_cache} from 'next/cache';
const recruitmentTotals=unstable_cache(async()=>{const r=await recruitmentLeaderboard(new Request('https://firstclassagency.management/api/data-analysis/recruitment-leaderboard?period=month'));if(!r.ok)throw Error('Could not load new creator totals.');return (await r.json()).managers as {key:string;group:string;recruits:number;diamonds:number}[];},['portal-recruitment-totals-v2'],{revalidate:false,tags:[PORTAL_DATA_TAG]});
const fields='id,creator_id,creator_username,manager_email,email,agency,team,group_name,stat_date,data_period,diamonds,live_hours,matches,live_streams,graduation_status,valid_live_days,days_since_joining';
async function readOverview(scope:string|null,allAgencies=false,_day?:string){
 const db=database();const latest=await db.from('creator_daily_stats').select('stat_date').or('data_period.is.null,data_period.neq.mature_month_total').order('stat_date',{ascending:false}).limit(1).maybeSingle();
 if(latest.error)throw Error(latest.error.message);if(!latest.data)throw Error('No creator uploads yet.');
 const settings=await db.from('poster_templates').select('template_json').eq('name','manager-assignment-settings').maybeSingle();if(settings.error)throw Error(settings.error.message);
 const a=settings.data?.template_json?.assignments||{},groups=Object.fromEntries(Object.entries(a.managerGroups||{}).map(([k,v])=>[k.toLowerCase().replace(/[^a-z0-9]/g,''),String(v)]));
 const end=String(latest.data.stat_date),d=new Date(end+'T12:00:00Z');d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-1);const start=d.toISOString().slice(0,10),roster:Stat[]=[],rows:Stat[]=[];
 for(let from=0;;from+=1000){const r=await db.from('creator_daily_stats').select(fields).eq('stat_date',end).order('id').range(from,from+999);if(r.error)throw Error(r.error.message);roster.push(...r.data);if(r.data.length<1000)break;}
 const ids=[...new Set(roster.filter(r=>portalCreatorActive(r)&&(scope?managerKey(r)===scope:allAgencies||firstClassStarCreator(r,groups))).map(r=>String(r.creator_id||'')).filter(Boolean))];
 // Fetch history only for the current assigned roster, following permanent IDs through transfers and renames.
 if(allAgencies){for(let from=0;;from+=1000){const r=await db.from('creator_daily_stats').select(fields).gte('stat_date',start).lte('stat_date',end).order('stat_date').order('id').range(from,from+999);if(r.error)throw Error(r.error.message);rows.push(...r.data);if(r.data.length<1000)break;}}else for(let offset=0;offset<ids.length;offset+=100){for(let from=0;;from+=1000){const r=await db.from('creator_daily_stats').select(fields).in('creator_id',ids.slice(offset,offset+100)).gte('stat_date',start).lte('stat_date',end).order('stat_date').order('id').range(from,from+999);if(r.error)throw Error(r.error.message);rows.push(...r.data);if(r.data.length<1000)break;}}
 const result=overview(rows,end,scope,groups,a.managerNames||{},allAgencies);
 const ledger=allAgencies?agencyDiamondLedger(rows,end):null;if(ledger){result.dailyTotals=ledger.dailyTotals;result.total=ledger.total;}
 const priorDate=await db.from('creator_daily_stats').select('stat_date').gte('stat_date',start).lt('stat_date',end.slice(0,7)+'-01').or('data_period.is.null,data_period.neq.mature_month_total').order('stat_date',{ascending:false}).limit(1).maybeSingle();if(priorDate.error)throw Error(priorDate.error.message);
 if(priorDate.data){result.previousRosterDate=String(priorDate.data.stat_date);const seen=new Set<string>(),counts=new Map<string,{managerKey:string;group:string;count:number}>();for(let from=0;;from+=1000){const r=await db.from('creator_daily_stats').select(fields).eq('stat_date',result.previousRosterDate).order('id').range(from,from+999);if(r.error)throw Error(r.error.message);for(const row of r.data){const id=String(row.creator_id||''),key=managerKey(row);if(!id||!portalCreatorActive(row)||seen.has(id)||!(scope?key===scope:allAgencies||firstClassStarCreator(row,groups)))continue;seen.add(id);const group=Object.entries(groups).find(([k])=>recruitmentManagerIdentity(k)===key)?.[1]||'Unassigned';const entry=counts.get(key)||{managerKey:key,group,count:0};entry.count++;counts.set(key,entry);}if(r.data.length<1000)break;}result.previousRoster=[...counts.values()];}
 if(!allAgencies){const totals=await recruitmentTotals();result.newCreatorTotals=totals.filter(m=>scope?recruitmentManagerIdentity(m.key)===scope:['Team Dan / James','Team Mike / Indi'].includes(m.group)).map(m=>({managerKey:recruitmentManagerIdentity(m.key),group:m.group,count:m.recruits,diamonds:m.diamonds}));}
 return {...result,reconciliation:ledger?.reconciliation||null};
}
// Auth is checked before entering this cache. Each manager scope has a separate key.
// Compress the shared snapshot to keep large agencies below hosting cache-entry limits.
const cachedOverview=unstable_cache(async(allAgencies:boolean,day:string)=>gzipSync(JSON.stringify(await readOverview(null,allAgencies,day))).toString('base64'),['manager-overview-snapshot-v10'],{revalidate:false,tags:[PORTAL_DATA_TAG]});
export async function loadOverview(scope:string|null,allAgencies=false){
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const base=JSON.parse(gunzipSync(Buffer.from(await localPortalSnapshot(['overview-snapshot-v10',allAgencies,day],()=>cachedOverview(allAgencies,day)),'base64')).toString('utf8')) as Awaited<ReturnType<typeof readOverview>>;
 if(!scope)return base;
 const creators=base.creators.filter(c=>c.managerKey===scope),ids=new Set(creators.map(c=>c.username)),total=creators.reduce((s,c)=>s+c.diamonds,0);
 return {...base,scope:'Your team',creators,total,previousTotal:creators.reduce((s,c)=>s+c.previousComparable,0),priorities:base.priorities.filter(p=>ids.has(p.username)),previousRoster:base.previousRoster.filter(r=>r.managerKey===scope),newCreatorTotals:base.newCreatorTotals.filter(r=>r.managerKey===scope),topThreeShare:total?Math.round(creators.slice(0,3).reduce((s,c)=>s+c.diamonds,0)/total*100):0,dailyTotals:base.dailyTotals.map(d=>({day:d.day,diamonds:creators.reduce((s,c)=>s+c.potentialTimeline.filter(x=>Number(x.date.slice(-2))<=d.day).reduce((sum,x)=>sum+x.diamonds,0),0)}))};
}
