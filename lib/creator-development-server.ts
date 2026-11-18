import 'server-only';
import {loadOverviewSnapshot} from './manager-overview-server';
import {portalResultCache} from './portal-result-cache';
import {database} from './creator-api-search/db';
import {developmentProgress,graduationEligible,creatorDevelopmentTargets} from './creator-development';

async function read(includeAllFirstClass:boolean){const overview=await loadOverviewSnapshot(includeAllFirstClass),month=overview.month,day=Number(overview.latest.slice(-2)),days=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 const mature=await database().from('mature_creator_month_totals').select('*').eq('month',overview.previous);if(mature.error)throw Error(mature.error.message);
 const previous=new Map<string,number>(),legacyNames=new Map<string,string>();
 for(const c of overview.creators)legacyNames.set(c.username.toLowerCase(),c.id);
 // Match historical usernames to permanent IDs for older mature total imports.
 if((mature.data||[]).some(row=>!row.creator_id&&!legacyNames.has(String(row.creator_username||'').toLowerCase()))){
  const ids=overview.creators.map(c=>c.id);
  for(let i=0;i<ids.length;i+=100){for(let from=0;;from+=1000){const r=await database().from('creator_daily_stats').select('creator_id,creator_username').in('creator_id',ids.slice(i,i+100)).gte('stat_date',overview.previous+'-01').lt('stat_date',month+'-01').order('id').range(from,from+999);if(r.error)throw Error(r.error.message);for(const x of r.data)if(x.creator_id&&x.creator_username)legacyNames.set(String(x.creator_username).toLowerCase(),String(x.creator_id));if(r.data.length<1000)break;}}
 }

 for(const row of mature.data||[]){const id=String(row.creator_id||legacyNames.get(String(row.creator_username||'').toLowerCase())||'');if(id)previous.set(id,Number(row.diamonds)||0);}
 const base=overview.creators.map(c=>({...c,previousDiamonds:previous.get(c.id)??c.previousDiamonds}));
 const graduation=base.filter(c=>c.diamonds>=1000&&graduationEligible(c.graduationStatus)).map(c=>({...c,...developmentProgress(c.diamonds,200000,day,days)}));
 const maintain=base.map(c=>{const targets=creatorDevelopmentTargets(c.previousDiamonds),next=targets.nextTarget;return {...c,...developmentProgress(c.diamonds,targets.target,day,days,c.hours,c.validDays,true),...targets,rankUp:next?developmentProgress(c.diamonds,next,day,days,c.hours,c.validDays,true):null,daysNeeded:Math.max(0,7-c.validDays),hoursNeeded:Math.max(0,15-c.hours)};});
 const matureCreators=maintain.filter(c=>c.previousDiamonds>=200000);
 const order:Record<string,number>={'Needs attention':0,'Behind pace':1,'On track':2,'Complete':3};
 const sort=(a:{status:string;remaining:number},b:{status:string;remaining:number})=>(order[a.status]-order[b.status])||b.remaining-a.remaining;
 return {month,latest:overview.latest,graduation:graduation.sort(sort),mature:matureCreators.sort(sort),maintain:maintain.sort(sort)};
}
const snapshot=portalResultCache(read,'manager-creator-development-v7');
export async function loadCreatorDevelopment(scope:string|string[]|null){
 const base=await snapshot(Boolean(scope));if(!scope)return base;
 const keys=new Set(Array.isArray(scope)?scope:[scope]),filter=(rows:typeof base.maintain)=>rows.filter(c=>keys.has(c.managerKey));
 return {...base,graduation:base.graduation.filter(c=>keys.has(c.managerKey)),mature:filter(base.mature),maintain:filter(base.maintain)};
}
