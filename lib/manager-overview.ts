import {starterFocus} from './starter-focus';
import {creatorPotential} from './creator-potential';
import {recruitmentManagerIdentity} from './recruitment-manager-aliases';
import {firstClassStarCreator} from './star-tracker';
export type Stat = Record<string,unknown>;
export const portalCreatorActive=(row:Stat)=>! /creator\s+has\s+quit\s+(?:the\s+)?network|quit\s+(?:the\s+)?creator\s+network/i.test(JSON.stringify(row));
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
  const previous=[...prior.values()];daily.push({...row,diamonds:Math.max(0,n(row.diamonds)-previous.reduce((s,r)=>s+n(r.diamonds),0)),live_hours:Math.max(0,n(row.live_hours)-previous.reduce((s,r)=>s+n(r.live_hours),0)),valid_live_days:Math.max(0,n(row.valid_live_days)-previous.reduce((s,r)=>s+n(r.valid_live_days),0)),matches:Math.max(0,n(row.matches)-previous.reduce((s,r)=>s+n(r.matches),0)),live_streams:Math.max(0,n(row.live_streams)-previous.reduce((s,r)=>s+n(r.live_streams),0)),data_period:m[2]+' ~ '+m[2]});knownDates.add(m[2]);
 }
 const unique=new Map<string,Stat>();for(const r of daily)if(r.creator_id)unique.set(String(r.creator_id)+':'+r.stat_date,r);
 const values=[...unique.values()],date=new Date(latest+'T12:00:00Z'),month=latest.slice(0,7),previous=day(new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()-1,1))).slice(0,7);
 const cutoff=Math.min(date.getUTCDate(),new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),0)).getUTCDate());
 const latestRoster=new Map<string,Stat>();for(const r of rows)if(String(r.stat_date)===latest&&r.creator_id){if(portalCreatorActive(r))latestRoster.set(String(r.creator_id),r);else latestRoster.delete(String(r.creator_id));}
 const normalizedGroups=Object.fromEntries(Object.entries(groups).map(([k,v])=>[k.toLowerCase().replace(/[^a-z0-9]/g,''),v]));
 const observedDates=new Set(values.map(r=>String(r.stat_date)));
 const matchedDays=Array.from({length:cutoff},(_,i)=>String(i+1).padStart(2,'0')).filter(d=>observedDates.has(month+'-'+d)&&observedDates.has(previous+'-'+d));
 const creators=[...latestRoster.values()].filter(r=>scope?managerKey(r)===scope:allAgencies||firstClassStarCreator(r,normalizedGroups)).map(r=>{
  const id=String(r.creator_id),history=values.filter(x=>String(x.creator_id)===id),current=history.filter(x=>String(x.stat_date).startsWith(month)),prev=history.filter(x=>String(x.stat_date).startsWith(previous));
  const sum=(rs:Stat[],key:string)=>rs.reduce((s,x)=>s+n(x[key]),0),today=history.find(x=>x.stat_date===latest);
  const raw=String(r.manager_email||r.creator_network_manager||r.email||'');
  const potential=creatorPotential(history.map(x=>({date:String(x.stat_date),known:true,hours:n(x.live_hours),diamonds:n(x.diamonds),battles:n(x.matches),streams:n(x.live_streams)})),month,sum(current,'diamonds'),latest,Array.from({length:date.getUTCDate()},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0'),x=current.find(r=>r.stat_date===date);return {date,known:observedDates.has(date),hours:x?n(x.live_hours):0,diamonds:x?n(x.diamonds):0,battles:x?n(x.matches):0,streams:x?n(x.live_streams):0};}));
  return {id,potential,agencyDays:r.days_since_joining!==null&&r.days_since_joining!==undefined&&Number.isFinite(Number(r.days_since_joining))?Math.max(0,Number(r.days_since_joining)+Math.floor((new Date(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'T12:00:00Z').getTime()-date.getTime())/86400000)):null,hasPreviousRecords:prev.length>0,graduationStatus:String(r.graduation_status||''),validDays:sum(current,'valid_live_days'),managerKey:managerKey(r),group:Object.entries(groups).find(([k])=>recruitmentManagerIdentity(k)===managerKey(r))?.[1]||'Unassigned',username:String(r.creator_username||'').replace(/^@/,''),manager:Object.entries(names).find(([k])=>recruitmentManagerIdentity(k)===managerKey(r))?.[1]||raw,
   diamonds:sum(current,'diamonds'),previousDiamonds:sum(prev,'diamonds'),previousComparable:sum(prev.filter(x=>Number(String(x.stat_date).slice(-2))<=cutoff),'diamonds'),hours:sum(current,'live_hours'),liveDays:current.filter(x=>n(x.live_hours)>0||n(x.diamonds)>0).length,
   comparedCurrent:sum(current.filter(x=>matchedDays.includes(String(x.stat_date).slice(-2))),'diamonds'),comparedPrevious:sum(prev.filter(x=>matchedDays.includes(String(x.stat_date).slice(-2))),'diamonds'),comparedHours:sum(current.filter(x=>matchedDays.includes(String(x.stat_date).slice(-2))),'live_hours'),previousHours:sum(prev.filter(x=>matchedDays.includes(String(x.stat_date).slice(-2))),'live_hours'),comparedLiveDays:current.filter(x=>matchedDays.includes(String(x.stat_date).slice(-2))&&n(x.live_hours)>0).length,previousLiveDays:prev.filter(x=>matchedDays.includes(String(x.stat_date).slice(-2))&&n(x.live_hours)>0).length,
   comparedBattles:sum(current.filter(x=>matchedDays.includes(String(x.stat_date).slice(-2))),'matches'),previousBattles:sum(prev.filter(x=>matchedDays.includes(String(x.stat_date).slice(-2))),'matches'),
   potentialTimeline:Array.from({length:date.getUTCDate()},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0'),r=current.find(x=>x.stat_date===date);return {date,known:observedDates.has(date),hours:r?n(r.live_hours):0,diamonds:r?n(r.diamonds):0,battles:r?n(r.matches):0,streams:r?n(r.live_streams):0};}),
   timeline:Array.from({length:14},(_,i)=>{const date=day(new Date(new Date(latest+'T12:00:00Z').getTime()-(13-i)*86400000)),r=history.find(x=>x.stat_date===date);return {date,known:observedDates.has(date),hours:r?n(r.live_hours):0,diamonds:r?n(r.diamonds):0,battles:r?n(r.matches):0,streams:r?n(r.live_streams):0};}),
   latestHours:today?n(today.live_hours):null,lastLive:history.filter(x=>n(x.live_hours)>0).map(x=>String(x.stat_date)).sort().at(-1)||null};
 }).sort((a,b)=>b.diamonds-a.diamonds);
 const total=creators.reduce((s,c)=>s+c.diamonds,0),previousTotal=creators.reduce((s,c)=>s+c.previousComparable,0);
 const dates=new Set(values.map(r=>String(r.stat_date)));
 const complete=(start:string,end:string)=>{for(let d=new Date(start+'T12:00:00Z');day(d)<=end;d.setUTCDate(d.getUTCDate()+1))if(!dates.has(day(d)))return false;return true;};
 const comparable=complete(month+'-01',latest)&&complete(previous+'-01',previous+'-'+String(cutoff).padStart(2,'0'));
 const establishedPriorities=creators.flatMap(c=>{
  const away=c.lastLive?Math.round((new Date(latest+'T12:00:00Z').getTime()-new Date(c.lastLive+'T12:00:00Z').getTime())/86400000):null;
  if(away!==null&&away>=14)return [];
  if(Math.max(c.previousDiamonds,c.diamonds)<10000)return [];
  const loss=c.comparedPrevious-c.comparedCurrent,drop=c.comparedPrevious?loss/c.comparedPrevious:0,hoursLoss=c.previousHours-c.comparedHours,daysLoss=c.previousLiveDays-c.comparedLiveDays;
  const diamondDrop=loss>=5000&&drop>=.2,hoursDrop=c.previousHours>=5&&hoursLoss>=3&&hoursLoss/c.previousHours>=.3,daysDrop=daysLoss>=2;
  const inactive=c.latestHours===0,battlesDrop=comparable&&c.previousBattles>=5&&c.comparedBattles<c.previousBattles*.7;
  if(!diamondDrop&&!hoursDrop&&!daysDrop&&!inactive&&!battlesDrop)return [];
  const f=(n:number)=>n.toLocaleString('en-GB'),reasons:string[]=[];
  if(inactive)reasons.push(away&&away>1?`They haven’t been live for ${away} days.`:`They missed the latest LIVE day.`);
  if(diamondDrop)reasons.push(`Diamonds are down ${Math.round(drop*100)}% (${f(c.comparedPrevious)} → ${f(c.comparedCurrent)}).`);
  if(hoursDrop)reasons.push(`LIVE time: ${c.previousHours.toFixed(1)} → ${c.comparedHours.toFixed(1)} hours.`);
  if(daysDrop)reasons.push(`LIVE days: ${c.previousLiveDays} → ${c.comparedLiveDays}.`);
  if(battlesDrop)reasons.push(`Battles: ${c.previousBattles} → ${c.comparedBattles} this month versus last month.`);
  let insight='',action='';
  if(inactive&&away&&away>=3){insight=diamondDrop?'The diamond drop comes alongside a sharp slowdown in activity. Getting them back is the first thing to tackle.':'They’ve been away for a few days. Start by finding out what’s keeping them off LIVE.';action='Check in with them, ask what’s changed and when they next plan to go live. Work out a manageable return with them before pushing for more hours or matches.';}
  else if(diamondDrop&&(hoursDrop||daysDrop)){insight='They’re spending less time live, which may be a big part of the lost diamonds.';action='Ask what’s made it harder to get on this month. Look at the days that worked for them before and agree a routine they can realistically keep.';}
  else if(diamondDrop){insight='They’re still showing up, but the diamonds aren’t following. More hours alone may not be the answer.';action='Compare a strong session with a recent quieter one. Look at audience engagement and their matches, then pick one change to try on their next LIVE.';}
  else if(battlesDrop){insight='Their matching activity has slowed. It’s worth checking whether they’re struggling to find the right people.';action='Ask how their recent matches have felt and help them find suitable people to network with for their next LIVE.';}
  else if(hoursDrop||daysDrop){insight='Their usual LIVE pattern has slipped. A quick conversation now could help stop it becoming a longer break.';action='Find out which days and session lengths work for them now, then agree what their next week could look like.';}
  else{insight='One missed day isn’t necessarily a problem, but it’s worth a quick check-in.';action='Ask how they’re getting on and when they next plan to go live. If it was just a one-off, keep the conversation light.';}
  const badges=[...(inactive?['Not LIVE']:[]),...(diamondDrop?['Diamonds ↓ '+Math.round(drop*100)+'%']:[]),...(hoursDrop?['Hours ↓ '+hoursLoss.toFixed(1)]:[]),...(daysDrop?['LIVE days ↓ '+daysLoss]:[]),...(battlesDrop?['Battles ↓']:[])];
  return [{category:'established' as const,observations:reasons,insight,action,badges,username:c.username,manager:c.manager,title:inactive?(away&&away>1?'Get them back LIVE':'Check their next LIVE'):diamondDrop?'Diamonds are down':hoursDrop?'LIVE hours are down':'Fewer LIVE days',detail:reasons.join(' ')+' '+insight+' '+action,comparison:`${month} vs ${previous}, through day ${cutoff}${matchedDays.length<cutoff?' · '+matchedDays.length+' dates available in both months':''}`,weight:Math.max(loss,0)+(inactive?Math.max(c.diamonds,c.previousDiamonds)/Math.max(cutoff,1):0)}];
 }).sort((a,b)=>b.weight-a.weight);

 const priorities=[...establishedPriorities,...starterFocus(creators,latest)];

 const rosterIds=new Set(creators.map(c=>c.id));let running=0;
 const dailyTotals=[...new Set(values.filter(r=>String(r.stat_date).startsWith(month)).map(r=>String(r.stat_date)))].sort().map(date=>{running+=values.filter(r=>r.stat_date===date&&rosterIds.has(String(r.creator_id))).reduce((s,r)=>s+n(r.diamonds),0);return {day:Number(date.slice(-2)),diamonds:running};});
 return {quoteSeed:0,filterGroup:'',filterManager:'',newCreatorTotals:[] as {managerKey:string;group:string;count:number;diamonds:number}[],dailyTotals,previousRoster:[] as {managerKey:string;group:string;count:number}[],previousRosterDate:null as string|null,latest,creators,total,previousTotal,comparable,priorities,coverage:dates.size,excludedPeriodRows:rows.length-daily.length,month,previous,matchedComparisonDays:matchedDays.length,scope:scope?'Your team':'First Class',topThreeShare:total?Math.round(creators.slice(0,3).reduce((s,c)=>s+c.diamonds,0)/total*100):0};
}
export type Overview=ReturnType<typeof overview>;
