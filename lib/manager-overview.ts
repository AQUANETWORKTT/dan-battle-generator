import {recruitmentManagerIdentity} from './recruitment-manager-aliases';
import {firstClassStarCreator} from './star-tracker';
export type Stat = Record<string,unknown>;
export const managerKey=(r:Stat)=>recruitmentManagerIdentity(String(r.manager_email||r.creator_network_manager||r.email||''));
const n=(v:unknown)=>Number(String(v??0).replace(/,/g,''))||0;
const day=(d:Date)=>d.toISOString().slice(0,10);
export function overview(rows:Stat[],latest:string,scope:string|null,groups:Record<string,string>={},names:Record<string,string>={}){
 const daily=rows.filter(r=>{const p=String(r.data_period||'');const m=p.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);return p!=='mature_month_total'&&(!m||m[1]===m[2]);});
 const unique=new Map<string,Stat>();for(const r of daily)if(r.creator_id)unique.set(String(r.creator_id)+':'+r.stat_date,r);
 const values=[...unique.values()],date=new Date(latest+'T12:00:00Z'),month=latest.slice(0,7),previous=day(new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()-1,1))).slice(0,7);
 const cutoff=Math.min(date.getUTCDate(),new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),0)).getUTCDate());
 const weekStart=day(new Date(date.getTime()-6*86400000)),priorStart=day(new Date(date.getTime()-13*86400000));
 const latestRoster=new Map<string,Stat>();for(const r of rows)if(String(r.stat_date)===latest&&r.creator_id)latestRoster.set(String(r.creator_id),r);
 const normalizedGroups=Object.fromEntries(Object.entries(groups).map(([k,v])=>[k.toLowerCase().replace(/[^a-z0-9]/g,''),v]));
 const creators=[...latestRoster.values()].filter(r=>scope?managerKey(r)===scope:firstClassStarCreator(r,normalizedGroups)).map(r=>{
  const id=String(r.creator_id),history=values.filter(x=>String(x.creator_id)===id),current=history.filter(x=>String(x.stat_date).startsWith(month)),prev=history.filter(x=>String(x.stat_date).startsWith(previous));
  const sum=(rs:Stat[],key:string)=>rs.reduce((s,x)=>s+n(x[key]),0),week=history.filter(x=>String(x.stat_date)>=weekStart),prior=history.filter(x=>String(x.stat_date)>=priorStart&&String(x.stat_date)<weekStart),today=history.find(x=>x.stat_date===latest);
  const raw=String(r.manager_email||r.creator_network_manager||r.email||'');
  return {id,username:String(r.creator_username||'').replace(/^@/,''),manager:Object.entries(names).find(([k])=>recruitmentManagerIdentity(k)===managerKey(r))?.[1]||raw,
   diamonds:sum(current,'diamonds'),previousDiamonds:sum(prev,'diamonds'),previousComparable:sum(prev.filter(x=>Number(String(x.stat_date).slice(-2))<=cutoff),'diamonds'),hours:sum(current,'live_hours'),liveDays:current.filter(x=>n(x.live_hours)>0||n(x.diamonds)>0).length,
   latestHours:today?n(today.live_hours):null,weekHours:sum(week,'live_hours'),priorWeekHours:sum(prior,'live_hours'),lastLive:history.filter(x=>n(x.live_hours)>0).map(x=>String(x.stat_date)).sort().at(-1)||null};
 }).sort((a,b)=>b.diamonds-a.diamonds);
 const total=creators.reduce((s,c)=>s+c.diamonds,0),previousTotal=creators.reduce((s,c)=>s+c.previousComparable,0);
 const dates=new Set(values.map(r=>String(r.stat_date)));
 const complete=(start:string,end:string)=>{for(let d=new Date(start+'T12:00:00Z');day(d)<=end;d.setUTCDate(d.getUTCDate()+1))if(!dates.has(day(d)))return false;return true;};
 const comparable=complete(month+'-01',latest)&&complete(previous+'-01',previous+'-'+String(cutoff).padStart(2,'0'));
 const weeklyComplete=complete(priorStart,latest);
 const priorities=creators.flatMap(c=>{
  const important=c.previousDiamonds>=20000||c.diamonds>=20000;
  if(important&&c.latestHours===0)return [{username:c.username,manager:c.manager,title:'Check in about their next LIVE',detail:`${c.diamonds.toLocaleString('en-GB')} diamonds this month${total?` (${Math.round(c.diamonds/total*100)}% of this roster’s total)`:''}; no LIVE hours recorded on ${latest}. Ask when they plan to go live next.`,weight:Math.max(c.diamonds,c.previousDiamonds)}];
  if(important&&weeklyComplete&&c.priorWeekHours>0&&c.weekHours<c.priorWeekHours*.7)return [{username:c.username,manager:c.manager,title:'Help rebuild their LIVE routine',detail:`LIVE hours fell from ${c.priorWeekHours.toFixed(1)} to ${c.weekHours.toFixed(1)} across the last two seven-day periods. Agree a realistic schedule.`,weight:c.previousDiamonds}];
  return [];
 }).sort((a,b)=>b.weight-a.weight).slice(0,12);
 return {latest,creators,total,previousTotal,comparable,priorities,coverage:dates.size,excludedPeriodRows:rows.length-daily.length,weekStart,month,previous,scope:scope?'Your team':'First Class',topThreeShare:total?Math.round(creators.slice(0,3).reduce((s,c)=>s+c.diamonds,0)/total*100):0};
}
export type Overview=ReturnType<typeof overview>;
