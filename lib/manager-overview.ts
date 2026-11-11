import {recruitmentManagerIdentity} from './recruitment-manager-aliases';
import {firstClassStarCreator} from './star-tracker';
export type Stat = Record<string,unknown>;
export const managerKey=(r:Stat)=>recruitmentManagerIdentity(String(r.manager_email||r.creator_network_manager||r.email||''));
const n=(v:unknown)=>Number(String(v??0).replace(/,/g,''))||0;
const day=(d:Date)=>d.toISOString().slice(0,10);
export function overview(rows:Stat[],latest:string,scope:string|null,groups:Record<string,string>={},names:Record<string,string>={},allAgencies=false){
 // Recover daily values from multi-day uploads only when all earlier dates in that range are known.
 const daily=rows.filter(r=>{const m=String(r.data_period||'').match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);return r.data_period!=='mature_month_total'&&(!m||m[1]===m[2]);});
 const knownDates=new Set(daily.map(r=>String(r.stat_date)));
 for(const row of [...rows].sort((a,b)=>String(a.stat_date).localeCompare(String(b.stat_date)))){
  const m=String(row.data_period||'').match(/^(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})$/);if(!m||m[1]===m[2]||m[2]!==row.stat_date||daily.some(r=>r.creator_id===row.creator_id&&r.stat_date===row.stat_date))continue;
  const needed:string[]=[];for(let d=new Date(m[1]+'T12:00:00Z');day(d)<m[2];d.setUTCDate(d.getUTCDate()+1))needed.push(day(d));
  if(!needed.length||!needed.every(d=>knownDates.has(d)))continue;
  const prior=new Map<string,Stat>();for(const r of daily)if(r.creator_id===row.creator_id&&needed.includes(String(r.stat_date)))prior.set(String(r.stat_date),r);
  const previous=[...prior.values()];daily.push({...row,diamonds:Math.max(0,n(row.diamonds)-previous.reduce((s,r)=>s+n(r.diamonds),0)),live_hours:Math.max(0,n(row.live_hours)-previous.reduce((s,r)=>s+n(r.live_hours),0)),matches:Math.max(0,n(row.matches)-previous.reduce((s,r)=>s+n(r.matches),0)),live_streams:Math.max(0,n(row.live_streams)-previous.reduce((s,r)=>s+n(r.live_streams),0)),data_period:m[2]+' ~ '+m[2]});knownDates.add(m[2]);
 }
 const unique=new Map<string,Stat>();for(const r of daily)if(r.creator_id)unique.set(String(r.creator_id)+':'+r.stat_date,r);
 const values=[...unique.values()],date=new Date(latest+'T12:00:00Z'),month=latest.slice(0,7),previous=day(new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()-1,1))).slice(0,7);
 const cutoff=Math.min(date.getUTCDate(),new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),0)).getUTCDate());
 const weekStart=day(new Date(date.getTime()-6*86400000)),priorStart=day(new Date(date.getTime()-13*86400000));
 const latestRoster=new Map<string,Stat>();for(const r of rows)if(String(r.stat_date)===latest&&r.creator_id)latestRoster.set(String(r.creator_id),r);
 const normalizedGroups=Object.fromEntries(Object.entries(groups).map(([k,v])=>[k.toLowerCase().replace(/[^a-z0-9]/g,''),v]));
 const observedDates=new Set(values.map(r=>String(r.stat_date)));
 const matchedDays=Array.from({length:cutoff},(_,i)=>String(i+1).padStart(2,'0')).filter(d=>observedDates.has(month+'-'+d)&&observedDates.has(previous+'-'+d));
 const creators=[...latestRoster.values()].filter(r=>scope?managerKey(r)===scope:allAgencies||firstClassStarCreator(r,normalizedGroups)).map(r=>{
  const id=String(r.creator_id),history=values.filter(x=>String(x.creator_id)===id),current=history.filter(x=>String(x.stat_date).startsWith(month)),prev=history.filter(x=>String(x.stat_date).startsWith(previous));
  const sum=(rs:Stat[],key:string)=>rs.reduce((s,x)=>s+n(x[key]),0),week=history.filter(x=>String(x.stat_date)>=weekStart),prior=history.filter(x=>String(x.stat_date)>=priorStart&&String(x.stat_date)<weekStart),today=history.find(x=>x.stat_date===latest);
  const raw=String(r.manager_email||r.creator_network_manager||r.email||'');
  return {id,managerKey:managerKey(r),group:Object.entries(groups).find(([k])=>recruitmentManagerIdentity(k)===managerKey(r))?.[1]||'Unassigned',username:String(r.creator_username||'').replace(/^@/,''),manager:Object.entries(names).find(([k])=>recruitmentManagerIdentity(k)===managerKey(r))?.[1]||raw,
   diamonds:sum(current,'diamonds'),previousDiamonds:sum(prev,'diamonds'),previousComparable:sum(prev.filter(x=>Number(String(x.stat_date).slice(-2))<=cutoff),'diamonds'),hours:sum(current,'live_hours'),liveDays:current.filter(x=>n(x.live_hours)>0||n(x.diamonds)>0).length,
   comparedCurrent:sum(current.filter(x=>matchedDays.includes(String(x.stat_date).slice(-2))),'diamonds'),comparedPrevious:sum(prev.filter(x=>matchedDays.includes(String(x.stat_date).slice(-2))),'diamonds'),comparedHours:sum(current.filter(x=>matchedDays.includes(String(x.stat_date).slice(-2))),'live_hours'),previousHours:sum(prev.filter(x=>matchedDays.includes(String(x.stat_date).slice(-2))),'live_hours'),comparedLiveDays:current.filter(x=>matchedDays.includes(String(x.stat_date).slice(-2))&&n(x.live_hours)>0).length,previousLiveDays:prev.filter(x=>matchedDays.includes(String(x.stat_date).slice(-2))&&n(x.live_hours)>0).length,
   weekBattles:sum(week,'matches'),priorWeekBattles:sum(prior,'matches'),
   timeline:Array.from({length:14},(_,i)=>{const date=day(new Date(new Date(latest+'T12:00:00Z').getTime()-(13-i)*86400000)),r=history.find(x=>x.stat_date===date);return {date,known:observedDates.has(date),hours:r?n(r.live_hours):0,diamonds:r?n(r.diamonds):0,battles:r?n(r.matches):0,streams:r?n(r.live_streams):0};}),
   latestHours:today?n(today.live_hours):null,weekHours:sum(week,'live_hours'),priorWeekHours:sum(prior,'live_hours'),lastLive:history.filter(x=>n(x.live_hours)>0).map(x=>String(x.stat_date)).sort().at(-1)||null};
 }).sort((a,b)=>b.diamonds-a.diamonds);
 const total=creators.reduce((s,c)=>s+c.diamonds,0),previousTotal=creators.reduce((s,c)=>s+c.previousComparable,0);
 const dates=new Set(values.map(r=>String(r.stat_date)));
 const complete=(start:string,end:string)=>{for(let d=new Date(start+'T12:00:00Z');day(d)<=end;d.setUTCDate(d.getUTCDate()+1))if(!dates.has(day(d)))return false;return true;};
 const comparable=complete(month+'-01',latest)&&complete(previous+'-01',previous+'-'+String(cutoff).padStart(2,'0'));
 const weeklyComplete=complete(priorStart,latest);
 const priorities=creators.flatMap(c=>{
  if(Math.max(c.previousDiamonds,c.diamonds)<20000)return [];
  const loss=c.comparedPrevious-c.comparedCurrent,drop=c.comparedPrevious?loss/c.comparedPrevious:0,hoursLoss=c.previousHours-c.comparedHours,daysLoss=c.previousLiveDays-c.comparedLiveDays;
  const diamondDrop=loss>=5000&&drop>=.2,hoursDrop=c.previousHours>=5&&hoursLoss>=3&&hoursLoss/c.previousHours>=.3,daysDrop=daysLoss>=2;
  const inactive=c.latestHours===0,battlesDrop=weeklyComplete&&c.priorWeekBattles>=5&&c.weekBattles<c.priorWeekBattles*.7;
  if(!diamondDrop&&!hoursDrop&&!daysDrop&&!inactive&&!battlesDrop)return [];
  const f=(n:number)=>n.toLocaleString('en-GB'),reasons:string[]=[];
  const away=c.lastLive?Math.round((new Date(latest+'T12:00:00Z').getTime()-new Date(c.lastLive+'T12:00:00Z').getTime())/86400000):null;
  if(inactive)reasons.push(away&&away>1?`No LIVE recorded for ${away} days. Ask when they next plan to go live and agree on a routine.`:`They missed the latest LIVE day. Find out why, ask when they next plan to go live and agree on a routine.`);
  if(diamondDrop)reasons.push(`Diamonds are down ${Math.round(drop*100)}% (${f(c.comparedPrevious)} → ${f(c.comparedCurrent)}).`);
  if(hoursDrop)reasons.push(`LIVE hours fell from ${c.previousHours.toFixed(1)} to ${c.comparedHours.toFixed(1)}. Help them rebuild their routine.`);
  if(daysDrop)reasons.push(`LIVE days dropped from ${c.previousLiveDays} to ${c.comparedLiveDays}. Ask when they next plan to go live and agree on a routine.`);
  if(battlesDrop)reasons.push(`Battles fell from ${c.priorWeekBattles} to ${c.weekBattles} in the last two weeks. Discuss suitable matches for when they next plan to go live.`);
  if(diamondDrop&&!hoursDrop&&!daysDrop)reasons.push('Review their best sessions and matches to find what brought in more gifts.');
  const badges=[...(inactive?['Not LIVE']:[]),...(diamondDrop?['Diamonds ↓ '+Math.round(drop*100)+'%']:[]),...(hoursDrop?['Hours ↓ '+hoursLoss.toFixed(1)]:[]),...(daysDrop?['LIVE days ↓ '+daysLoss]:[]),...(battlesDrop?['Battles ↓']:[])];
  return [{badges,username:c.username,manager:c.manager,title:inactive?(away&&away>1?'Get them back LIVE':'Check their next LIVE'):diamondDrop?'Diamonds are down':hoursDrop?'LIVE hours are down':'Fewer LIVE days',detail:reasons.join(' '),comparison:`${month} vs ${previous}, through day ${cutoff}${matchedDays.length<cutoff?' · '+matchedDays.length+' dates available in both months':''}`,weight:Math.max(loss,0)+(inactive?Math.max(c.diamonds,c.previousDiamonds)/Math.max(cutoff,1):0)}];
 }).sort((a,b)=>b.weight-a.weight);

 const rosterIds=new Set(creators.map(c=>c.id));let running=0;
 const dailyTotals=[...new Set(values.filter(r=>String(r.stat_date).startsWith(month)).map(r=>String(r.stat_date)))].sort().map(date=>{running+=values.filter(r=>r.stat_date===date&&rosterIds.has(String(r.creator_id))).reduce((s,r)=>s+n(r.diamonds),0);return {day:Number(date.slice(-2)),diamonds:running};});
 return {newCreatorTotals:[] as {managerKey:string;group:string;count:number;diamonds:number}[],dailyTotals,previousRoster:[] as {managerKey:string;group:string;count:number}[],previousRosterDate:null as string|null,latest,creators,total,previousTotal,comparable,priorities,coverage:dates.size,excludedPeriodRows:rows.length-daily.length,weekStart,month,previous,matchedComparisonDays:matchedDays.length,scope:scope?'Your team':'First Class',topThreeShare:total?Math.round(creators.slice(0,3).reduce((s,c)=>s+c.diamonds,0)/total*100):0};
}
export type Overview=ReturnType<typeof overview>;
