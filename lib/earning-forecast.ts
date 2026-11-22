import type {earningsOpportunities,EarningsManager} from './team-earnings';
type Opportunity=ReturnType<typeof earningsOpportunities>[number];
export type ForecastCategory='all'|'maintain-rankup'|Exclude<Opportunity['category'],'diamonds'>;
export function forecastMonthProgress(latest:string){const [year,month,day]=latest.split('-').map(Number);return Math.max(0,Math.min(1,day/new Date(year,month,0).getDate()));}
// Reward proximity, capped so a tiny gain cannot outrank every worthwhile target.
const priority=(item:Opportunity)=>item.ownerPoolUpliftCents*Math.max(0,item.progress)/Math.max(.1,1-item.progress);
export function forecastCreators(opportunities:Opportunity[],team:string,category:ForecastCategory,monthProgress=1){
 const minimumProgress=.8*Math.max(0,Math.min(1,monthProgress));
 const grouped=new Map<string,Opportunity[]>();
 for(const item of opportunities){
  if(item.category==='diamonds')continue;
  if(team&&item.managerKey!==team)continue;
  if(category==='maintain-rankup'?!['maintenance','rankup'].includes(item.category):category!=='all'&&item.category!==category)continue;
  if(item.progress+1e-9<minimumProgress)continue;
  grouped.set(item.creatorId,[...(grouped.get(item.creatorId)||[]),item]);
 }
 return [...grouped].map(([id,items])=>{
  const targets=items.slice().sort((a,b)=>priority(b)-priority(a)||b.progress-a.progress||a.daysNeeded-b.daysNeeded||a.hoursNeeded-b.hoursNeeded||a.diamondsNeeded-b.diamondsNeeded);
  // Each target passes the pace gate separately; overlapping gains are never added.
  return {id,username:targets[0].username,managerKey:targets[0].managerKey,targets,score:Math.max(...targets.map(priority)),impact:Math.max(...targets.map(item=>item.ownerPoolUpliftCents)),progress:Math.max(...targets.map(item=>item.progress))};
 }).sort((a,b)=>b.score-a.score||b.progress-a.progress||b.impact-a.impact||a.username.localeCompare(b.username));
}
const number=(value:number)=>value.toLocaleString('en-GB',{maximumFractionDigits:1});
function instruction(target:Opportunity){
 const needs=[target.diamondsNeeded>0?`${number(target.diamondsNeeded)} more diamonds`:'',target.daysNeeded>0?`${number(target.daysNeeded)} more LIVE ${target.daysNeeded===1?'day':'days'}`:'',target.hoursNeeded>0?`${number(target.hoursNeeded)} more LIVE ${target.hoursNeeded===1?'hour':'hours'}`:''].filter(Boolean).join(', ');
 const label=target.category==='activeness'?target.kind:target.category==='maintenance'?'Maintenance':target.category==='rankup'?'Rank-up':'Diamond growth';
 return `${label}: ${needs}.`;
}
export function earningForecastMessage(rows:ReturnType<typeof forecastCreators>,managers:EarningsManager[],team:string,count:number,_latest:string){
 const selected=rows.slice(0,Math.max(1,Math.floor(Number.isFinite(count)?count:10)));
 if(!selected.length)return '';
 const name=managers.find(manager=>manager.key===team)?.name||'Team Dan / James';
 const heading=!team?'First Class teams':name.match(/^Team\s/i)?name:'Team '+name;
 const lines=[`*${heading}*`,'*Earning forecast*',`To boost your earnings the most this month, focus on ${selected.length===1?'this creator':'these creators'}:`];
 let previousManager='',position=0;
 for(const creator of selected){
  if(creator.managerKey!==team&&creator.managerKey!==previousManager){const manager=managers.find(item=>item.key===creator.managerKey);if(manager)lines.push('',`*${manager.name}*`);}
  previousManager=creator.managerKey;
  lines.push('',`${++position}. @${creator.username}`);
  for(const target of creator.targets)lines.push('• '+instruction(target));
 }
 return lines.join('\n');
}
