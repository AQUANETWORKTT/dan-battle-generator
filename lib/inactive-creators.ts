import 'server-only';
import {database} from './creator-api-search/db';
import {loadOverviewSnapshot} from './manager-overview-server';
import {portalResultCache} from './portal-result-cache';

type Row={id:string;creator_id:string;stat_date:string;data_period:string|null;diamonds:number;live_hours:number};
async function read(includeAllFirstClass:boolean){
 const overview=await loadOverviewSnapshot(includeAllFirstClass);
 const inactive=overview.creators.filter(c=>c.lastLive&&Math.floor((Date.parse(overview.latest+'T12:00:00Z')-Date.parse(c.lastLive+'T12:00:00Z'))/86400000)>=14);
 const history:Row[]=[];
 for(let i=0;i<inactive.length;i+=50){const ids=inactive.slice(i,i+50).map(c=>c.id);for(let offset=0;;offset+=1000){const r=await database().from('creator_daily_stats').select('id,creator_id,stat_date,data_period,diamonds,live_hours').in('creator_id',ids).lt('stat_date',overview.month+'-01').order('stat_date').order('id').range(offset,offset+999);if(r.error)throw Error(r.error.message);history.push(...r.data);if(r.data.length<1000)break;}}
 const creators=inactive.map(c=>{
  const months=new Map<string,{daily:Map<string,number>;aggregate:{end:string;value:number}|null}>();let lastLive:string|null=null;
  for(const r of history.filter(r=>String(r.creator_id)===c.id)){
   if(Number(r.live_hours)>0&&(!lastLive||r.stat_date>lastLive))lastLive=r.stat_date;
   const month=r.stat_date.slice(0,7),bucket=months.get(month)||{daily:new Map<string,number>(),aggregate:null};
   const p=String(r.data_period||''),range=p.match(/^(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})$/);
   if(range&&range[1]!==range[2]){if(range[1]===month+'-01'&&range[2].slice(0,7)===month&&(!bucket.aggregate||range[2]>bucket.aggregate.end))bucket.aggregate={end:range[2],value:Number(r.diamonds)||0};}
   else if(p!=='mature_month_total')bucket.daily.set(r.stat_date,Number(r.diamonds)||0);
   months.set(month,bucket);
  }
  const ranked=[...months].map(([month,b])=>({month,diamonds:b.aggregate?b.aggregate.value+[...b.daily].filter(([date])=>date>b.aggregate!.end).reduce((s,[,n])=>s+n,0):[...b.daily.values()].reduce((s,n)=>s+n,0)})).sort((a,b)=>b.diamonds-a.diamonds);
  return {id:c.id,username:c.username,manager:c.manager,managerKey:c.managerKey,group:c.group,bestMonth:ranked[0]?.month||null,bestDiamonds:ranked[0]?.diamonds||0,lastLive,priority:(ranked[0]?.diamonds||0)>=20000};
 }).sort((a,b)=>b.bestDiamonds-a.bestDiamonds||a.username.localeCompare(b.username));
 return {month:overview.month,latest:overview.latest,creators};
}
const snapshot=portalResultCache(read,'inactive-creators-v4');
export async function loadInactiveCreators(scope:string|string[]|null){
 const base=await snapshot(Boolean(scope));if(!scope)return base;
 const keys=new Set(Array.isArray(scope)?scope:[scope]);return {...base,creators:base.creators.filter(c=>keys.has(c.managerKey))};
}
