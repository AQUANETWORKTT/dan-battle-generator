import type {earningsOpportunities,EarningsManager} from './team-earnings';
type Opportunity=ReturnType<typeof earningsOpportunities>[number];
export type ForecastCategory='all'|Opportunity['category'];
export function forecastCreators(opportunities:Opportunity[],team:string,category:ForecastCategory){
 const grouped=new Map<string,Opportunity[]>();
 for(const item of opportunities){
  if(team&&!item.path.includes(team)||category!=='all'&&item.category!==category)continue;
  grouped.set(item.creatorId,[...(grouped.get(item.creatorId)||[]),item]);
 }
 return [...grouped].map(([id,items])=>{
  const milestones=items.filter(item=>item.category!=='diamonds');
  const targets=(category==='all'&&milestones.length?milestones:items).slice().sort((a,b)=>a.diamondsNeeded-b.diamondsNeeded||a.daysNeeded-b.daysNeeded||a.hoursNeeded-b.hoursNeeded);
  // Alternatives overlap: rank by the largest single gain, never their sum.
  return {id,username:targets[0].username,managerKey:targets[0].managerKey,targets,impact:Math.max(...targets.map(item=>item.ownerPoolUpliftCents)),progress:Math.max(...targets.map(item=>item.progress))};
 }).sort((a,b)=>b.impact-a.impact||b.progress-a.progress||a.username.localeCompare(b.username));
}
const number=(value:number)=>value.toLocaleString('en-GB',{maximumFractionDigits:1});
function instruction(target:Opportunity){
 const needs=[target.diamondsNeeded>0?`${number(target.diamondsNeeded)} more diamonds`:'',target.daysNeeded>0?`${number(target.daysNeeded)} more valid LIVE ${target.daysNeeded===1?'day':'days'}`:'',target.hoursNeeded>0?`${number(target.hoursNeeded)} more LIVE ${target.hoursNeeded===1?'hour':'hours'}`:''].filter(Boolean).join(', ');
 if(target.category==='activeness')return `${target.kind}: ${needs}. Reach ${target.targetDays} valid days and ${number(target.targetHours)} LIVE hours to complete this level.`;
 if(target.category==='maintenance')return `Maintenance: ${needs}. Reach ${number(target.target)} diamonds and meet the LIVE requirements to maintain their tier.`;
 if(target.category==='rankup')return `Rank-up: ${needs}. Reach ${number(target.target)} diamonds and meet the LIVE requirements to move up a tier.`;
 return `Diamond growth: aim for ${number(target.diamondsNeeded)} more diamonds (${number(target.target)} total). Build on their current results while the next tier or activity level is further away.`;
}
export function earningForecastMessage(rows:ReturnType<typeof forecastCreators>,managers:EarningsManager[],team:string,count:number,latest:string){
 const selected=rows.slice(0,Math.max(1,Math.floor(Number.isFinite(count)?count:10)));
 if(!selected.length)return '';
 const name=managers.find(manager=>manager.key===team)?.name||'Team Dan / James';
 const heading=name.match(/^Team\s/i)?name:'Team '+name;
 const date=new Date(latest+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long'});
 const lines=[`*${heading}*`,'*Earning forecast*',`Based on results through ${date}.`,`Focus on these ${selected.length===1?'creator':'creators'} to complete the biggest realistic opportunities this month.`];
 const grouped=new Map<string,typeof selected>();
 for(const row of selected)grouped.set(row.managerKey,[...(grouped.get(row.managerKey)||[]),row]);
 let position=0;
 for(const [managerKey,creators] of grouped){
  if(managerKey!==team){const manager=managers.find(item=>item.key===managerKey);if(manager)lines.push('',`*${manager.name}*`);}
  for(const creator of creators){lines.push('',`${++position}. @${creator.username}`);for(const target of creator.targets)lines.push('• '+instruction(target));}
 }
 return lines.join('\n');
}
