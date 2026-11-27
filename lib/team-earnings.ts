export const ADVANCED_SUCCESS_RATE=.3;
// October 2026 was paid at base rates regardless of mature success.
export const advancedBonusAvailable=(month?:string)=>month!=='2026-10';
export const EARNINGS_GROUPS=['Team Dan / James','Team Mike / Indi'] as const;
export const EARNINGS_LEVELS=[{days:8,hours:20,rate:.5},{days:11,hours:30,rate:1},{days:15,hours:40,rate:2},{days:18,hours:60,rate:2.5},{days:22,hours:80,rate:3.5}];
const TIERS=[100000,200000,300000,500000,700000,1000000,1600000,2500000,5000000];
// Ratios are selected by LAST month's tier, from the supplied Backstage table.
const RANK_RATES=[6.5,6.5,6.5,6.5,6.5,5.5,4.5,3.5,3,null];
const MAINTAIN_RATES=[0,0,3,3,3,3,3,3,2.5,2.5];
export function highestRankUpRate(previousDiamonds:number,currentDiamonds:number,boosted:boolean){
 const from=TIERS.filter(t=>previousDiamonds>=t).length,to=TIERS.filter(t=>currentDiamonds>=t).length;
 const crossed=RANK_RATES.slice(from,to).filter((rate):rate is number=>rate!==null);
 return crossed.length?Math.max(...crossed)+(boosted?1:0):0;
}
export type EarningsCreator={id:string;username:string;managerKey:string;diamonds:number;previousDiamonds:number;hours:number;validDays:number};
export type EarningsManager={key:string;name:string;group:string;parent:string|null;owner?:boolean};
export type Incentive={id:string;creator:string;description:string;currency:'USD'|'GBP';amountCents:number;gbpCents:number;rate:number;rateDate:string;createdAt:string};
export type EarningsSettings={incrementalOverride:number|null;usdToGbpOverride:number|null;groups:Record<string,{ownerPercent:number;managerPercent:number;juniorPercent:number}>;overrides:Record<string,number>;parents:Record<string,string|null>;incentives:Incentive[]};
export function defaultEarningsSettings():EarningsSettings{return {incrementalOverride:null,usdToGbpOverride:null,groups:Object.fromEntries(EARNINGS_GROUPS.map(group=>[group,{ownerPercent:70,managerPercent:70,juniorPercent:40}])),overrides:{},parents:{},incentives:[]};}
const cents=(diamonds:number,percent:number)=>Math.round(diamonds*percent/100);
export function creatorEarningRates(c:EarningsCreator,incremental:number,boosted:boolean){
 const level=EARNINGS_LEVELS.reduce((best,l,i)=>c.validDays>=l.days&&c.hours>=l.hours?i+1:best,0);
 const activity=level?EARNINGS_LEVELS[level-1].rate:0;
 const tier=TIERS.filter(t=>c.previousDiamonds>=t).length;
 const maintainTarget=tier===9?Math.ceil(c.previousDiamonds*.8):tier>=2?TIERS[tier-1]:null;
 const rankTarget=TIERS[tier]||null;
 const liveQualified=c.validDays>=7&&c.hours>=15;
 const ranked=Boolean(rankTarget&&c.diamonds>=rankTarget&&liveQualified);
 const maintained=Boolean(maintainTarget&&c.diamonds>=maintainTarget&&liveQualified);
 const rankRate=highestRankUpRate(c.previousDiamonds,c.diamonds,boosted),maintainRate=MAINTAIN_RATES[tier];
 const bonus=ranked?rankRate:maintained?maintainRate+(boosted&&maintainRate>0?1:0):0;
 return {tier:tier+1,level,activity,incremental,bonus,total:incremental+activity+bonus,maintainTarget,rankTarget,liveQualified,ranked,maintained,grossCents:cents(c.diamonds,incremental+activity+bonus)};
}
export type EarningsAgencySummary={eligible:number;successful:number;qualifiedDiamonds:number};
export type EarningsAgency=EarningsCreator[]|EarningsAgencySummary;
export function earningsAgencySummary(creators:EarningsCreator[]):EarningsAgencySummary{
 const success=matureSuccess(creators);
 const qualifiedDiamonds=creators.filter(c=>{const r=creatorEarningRates(c,0,false);return r.maintained||r.ranked;}).reduce((sum,c)=>sum+c.diamonds,0);
 return {eligible:success.eligible,successful:success.successful,qualifiedDiamonds};
}
export function matureSuccess(creators:EarningsAgency,month?:string){
 if(!Array.isArray(creators))return {...creators,percent:creators.eligible?creators.successful/creators.eligible*100:0,boosted:advancedBonusAvailable(month)&&creators.eligible>0&&creators.successful/creators.eligible>=ADVANCED_SUCCESS_RATE};
 const eligible=creators.filter(c=>c.previousDiamonds>=200000),successful=eligible.filter(c=>{const r=creatorEarningRates(c,0,false);return r.maintained||r.ranked;});
 return {eligible:eligible.length,successful:successful.length,percent:eligible.length?successful.length/eligible.length*100:0,boosted:advancedBonusAvailable(month)&&eligible.length>0&&successful.length/eligible.length>=ADVANCED_SUCCESS_RATE};
}
export function resolveEarningsManagers(managers:EarningsManager[],settings:EarningsSettings){
 const map=new Map(managers.map(m=>[m.key,{...m,parent:Object.hasOwn(settings.parents,m.key)?settings.parents[m.key]:m.parent}]));
 for(const manager of map.values()){
  if(manager.owner){manager.parent=null;continue;}
  const parent=manager.parent?map.get(manager.parent):null;
  if(!parent||parent.group!==manager.group)throw Error('Choose a parent in the same team for '+manager.name);
  const seen=new Set([manager.key]);let current:typeof manager|undefined=parent;
  while(current){if(seen.has(current.key))throw Error('The manager tree contains a loop.');seen.add(current.key);current=current.parent?map.get(current.parent):undefined;}
 }
 return map;
}
// Allocate down the tree. Every penny is paid once: owner 70% of TikTok,
// manager 70% of that amount, junior 40% of the amount their parent receives.
export function allocateCreator(grossCents:number,managerKey:string,managers:ReturnType<typeof resolveEarningsManagers>,settings:EarningsSettings){
 const leaf=managers.get(managerKey);if(!leaf)throw Error('Missing earnings team for creator.');
 const path:EarningsManager[]=[];let current:EarningsManager|undefined=leaf;
 while(current){path.unshift(current);current=current.parent?managers.get(current.parent):undefined;}
 const config=settings.groups[leaf.group];if(!config)throw Error('Missing team split settings.');
 let pool=Math.round(grossCents*config.ownerPercent/100);const ownerPoolCents=pool,payouts=new Map<string,number>();
 for(let i=1;i<path.length;i++){
  const node=path[i],percent=settings.overrides[node.key]??(i===1?config.managerPercent:config.juniorPercent),next=Math.round(pool*percent/100);
  payouts.set(path[i-1].key,pool-next);pool=next;
 }
 payouts.set(leaf.key,pool);
 return {ownerPoolCents,payouts,path:path.map(p=>p.key)};
}
export function calculateTeamEarnings(creators:EarningsCreator[],agencyCreators:EarningsAgency,managerList:EarningsManager[],settings:EarningsSettings,automaticIncremental:number,month?:string){
 for(const config of Object.values(settings.groups))for(const rate of Object.values(config))if(!Number.isFinite(rate)||rate<0||rate>100)throw Error('Split percentages must be between 0 and 100.');
 for(const rate of Object.values(settings.overrides))if(!Number.isFinite(rate)||rate<0||rate>100)throw Error('Manager percentages must be between 0 and 100.');
 const inputRate=settings.incrementalOverride??automaticIncremental;if(!Number.isFinite(inputRate)||inputRate<0||inputRate>100)throw Error('Enter a valid incremental rate.');
 const managers=resolveEarningsManagers(managerList,settings),success=matureSuccess(agencyCreators,month),incremental=settings.incrementalOverride??automaticIncremental;
 const nodes=new Map([...managers.values()].map(m=>[m.key,{...m,diamonds:0,coreGrossCents:0,corePayoutCents:0,splitPayoutCents:0,payoutCents:0,subtreeGrossCents:0,ownerPoolCents:0,creatorCount:0}]));
 const details=creators.map(c=>{
  const rates=creatorEarningRates(c,incremental,success.boosted),allocation=allocateCreator(rates.grossCents,c.managerKey,managers,settings),leaf=nodes.get(c.managerKey)!;
  leaf.diamonds+=c.diamonds;leaf.creatorCount++;leaf.coreGrossCents+=rates.grossCents;
  for(const key of allocation.path){const node=nodes.get(key)!;node.subtreeGrossCents+=rates.grossCents;node.ownerPoolCents+=allocation.ownerPoolCents;}
  for(const [key,amount] of allocation.payouts){const node=nodes.get(key)!;node.payoutCents+=amount;if(key===c.managerKey)node.corePayoutCents+=amount;else node.splitPayoutCents+=amount;}
  return {...c,...rates,ownerPoolCents:allocation.ownerPoolCents,path:allocation.path};
 });
 return {success,incremental,nodes:[...nodes.values()],creators:details,grossCents:details.reduce((sum,c)=>sum+c.grossCents,0),ownerPoolCents:details.reduce((sum,c)=>sum+c.ownerPoolCents,0)};
}
export function earningsPounds(nodes:ReturnType<typeof calculateTeamEarnings>['nodes'],rate:number){
 const totals=new Map(nodes.map(n=>[n.key,Math.round(n.payoutCents*rate)]));
 // Convert each group's received pool once. Put any penny rounding residual
 // with its owner so manager/core/split totals reconcile in pounds as well.
 for(const owner of nodes.filter(n=>n.owner)){
  const managerPence=nodes.filter(n=>n.group===owner.group&&!n.owner).reduce((sum,n)=>sum+(totals.get(n.key)||0),0);
  totals.set(owner.key,Math.round(owner.ownerPoolCents*rate)-managerPence);
 }
 return new Map(nodes.map(n=>{const total=totals.get(n.key)||0,core=Math.round(n.corePayoutCents*rate);return [n.key,{total,core,split:total-core}];}));
}
// Split the displayed received total without introducing rounding differences.
export function creatorEarningsBreakdown(rates:{incremental:number;activity:number;bonus:number},receivedCents:number){
 const percentages=[rates.incremental,rates.activity,rates.bonus],total=percentages.reduce((sum,rate)=>sum+rate,0);
 const exact=percentages.map(rate=>total>0?receivedCents*rate/total:0),amounts=exact.map(Math.floor);
 const order=exact.map((value,index)=>({index,remainder:value-amounts[index]})).sort((a,b)=>b.remainder-a.remainder);
 for(let left=receivedCents-amounts.reduce((sum,value)=>sum+value,0),i=0;left>0;left--,i++)amounts[order[i%3].index]++;
 return amounts;
}
export function earningsOpportunities(creators:EarningsCreator[],agencyCreators:EarningsAgency,managerList:EarningsManager[],settings:EarningsSettings,automaticIncremental:number,daysRemaining=Infinity,monthProgress=0,month?:string){
 const managers=resolveEarningsManagers(managerList,settings),success=matureSuccess(agencyCreators,month),incremental=settings.incrementalOverride??automaticIncremental;
 const qualifiedDiamonds=Array.isArray(agencyCreators)?earningsAgencySummary(agencyCreators).qualifiedDiamonds:agencyCreators.qualifiedDiamonds;
 return creators.flatMap(c=>{
  const current=creatorEarningRates(c,incremental,success.boosted),options:{kind:string;category:'activeness'|'rankup'|'maintenance'|'diamonds';target:number;days:number;hours:number}[]=[];
  if(current.maintainTarget&&!current.maintained&&!current.ranked)options.push({kind:'Maintain',category:'maintenance',target:current.maintainTarget,days:7,hours:15});
  if(current.rankTarget&&!current.ranked)options.push({kind:'Rank up',category:'rankup',target:current.rankTarget,days:7,hours:15});
  if(current.level<5){const next=EARNINGS_LEVELS[current.level];options.push({kind:'Activeness level '+(current.level+1),category:'activeness',target:c.diamonds,days:next.days,hours:next.hours});}
  const growthTarget=c.diamonds+Math.max(1000,Math.ceil(c.diamonds*.1/1000)*1000);
  options.push({kind:'Diamond growth',category:'diamonds',target:growthTarget,days:c.validDays,hours:c.hours});
  return options.flatMap(option=>{
   if(Math.max(0,option.days-c.validDays)>daysRemaining)return [];
   const progress=Math.min(1,option.category==='activeness'?1:option.target>0?c.diamonds/option.target:1,option.days>0?c.validDays/option.days:1,option.hours>0?c.hours/option.hours:1);
   if(option.category!=='diamonds'&&progress+1e-9<Math.max(0,Math.min(1,monthProgress))*.8)return [];
   const future={...c,diamonds:Math.max(c.diamonds,option.target),validDays:Math.max(c.validDays,option.days),hours:Math.max(c.hours,option.hours)};
   const futureBase=creatorEarningRates(future,incremental,false),unlocksBoost=advancedBonusAvailable(month)&&!success.boosted&&c.previousDiamonds>=200000&&!current.maintained&&!current.ranked&&(futureBase.maintained||futureBase.ranked)&&success.eligible>0&&(success.successful+1)/success.eligible>=ADVANCED_SUCCESS_RATE;
   const after=creatorEarningRates(future,incremental,success.boosted||unlocksBoost),upliftCents=after.grossCents-current.grossCents;
   if(upliftCents<=0)return [];
   const beforeAllocation=allocateCreator(current.grossCents,c.managerKey,managers,settings),afterAllocation=allocateCreator(after.grossCents,c.managerKey,managers,settings);
   const teamUplifts=Object.fromEntries([...afterAllocation.payouts].map(([key,value])=>[key,value-(beforeAllocation.payouts.get(key)||0)]));
   return [{id:c.id+':'+option.kind,creatorId:c.id,username:c.username,managerKey:c.managerKey,path:beforeAllocation.path,kind:option.kind,category:option.category,progress,targetDays:option.days,targetHours:option.hours,target:option.target,currentDiamonds:c.diamonds,diamondsNeeded:Math.max(0,option.target-c.diamonds),daysNeeded:Math.max(0,option.days-c.validDays),hoursNeeded:Math.max(0,option.hours-c.hours),currentPercent:current.total,targetPercent:after.total,rateUpliftCents:cents(c.diamonds,after.total-current.total),upliftCents,ownerPoolUpliftCents:afterAllocation.ownerPoolCents-beforeAllocation.ownerPoolCents,teamUplifts,unlocksBoost,agencyBoostCents:unlocksBoost?cents(qualifiedDiamonds,1):0}];
  });
 }).sort((a,b)=>b.upliftCents+b.agencyBoostCents-a.upliftCents-a.agencyBoostCents||a.diamondsNeeded-b.diamondsNeeded);
}
