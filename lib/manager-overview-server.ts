import 'server-only';
import {database} from './creator-api-search/db';
import {overview,Stat,managerKey} from './manager-overview';
import {firstClassStarCreator} from './star-tracker';
import {unstable_cache} from 'next/cache';
const fields='id,creator_id,creator_username,manager_email,email,agency,team,group_name,stat_date,data_period,diamonds,live_hours';
async function readOverview(scope:string|null){
 const db=database();const latest=await db.from('creator_daily_stats').select('stat_date').or('data_period.is.null,data_period.neq.mature_month_total').order('stat_date',{ascending:false}).limit(1).maybeSingle();
 if(latest.error)throw Error(latest.error.message);if(!latest.data)throw Error('No creator uploads yet.');
 const settings=await db.from('poster_templates').select('template_json').eq('name','manager-assignment-settings').maybeSingle();if(settings.error)throw Error(settings.error.message);
 const a=settings.data?.template_json?.assignments||{},groups=Object.fromEntries(Object.entries(a.managerGroups||{}).map(([k,v])=>[k.toLowerCase().replace(/[^a-z0-9]/g,''),String(v)]));
 const end=String(latest.data.stat_date),d=new Date(end+'T12:00:00Z');d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-1);const start=d.toISOString().slice(0,10),roster:Stat[]=[],rows:Stat[]=[];
 for(let from=0;;from+=1000){const r=await db.from('creator_daily_stats').select(fields).eq('stat_date',end).order('id').range(from,from+999);if(r.error)throw Error(r.error.message);roster.push(...r.data);if(r.data.length<1000)break;}
 const ids=[...new Set(roster.filter(r=>scope?managerKey(r)===scope:firstClassStarCreator(r,groups)).map(r=>String(r.creator_id||'')).filter(Boolean))];
 // Fetch history only for the current assigned roster, following permanent IDs through transfers and renames.
 for(let offset=0;offset<ids.length;offset+=100){for(let from=0;;from+=1000){const r=await db.from('creator_daily_stats').select(fields).in('creator_id',ids.slice(offset,offset+100)).gte('stat_date',start).lte('stat_date',end).order('stat_date').order('id').range(from,from+999);if(r.error)throw Error(r.error.message);rows.push(...r.data);if(r.data.length<1000)break;}}
 return overview(rows,end,scope,groups,a.managerNames||{});
}
// Auth is checked before entering this cache. Each manager scope has a separate key.
export const loadOverview=unstable_cache(readOverview,['manager-overview-v1'],{revalidate:60});
