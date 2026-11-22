import type {Overview} from './manager-overview';
export function decliningCreators(data:Overview){
 if(data.matchedComparisonDays<=0)return [];
 return data.creators.flatMap(creator=>{
  if(!creator.hasPreviousRecords)return [];
  const stats=[
   {label:'Diamonds',previous:creator.comparedPrevious,current:creator.comparedCurrent,decimals:0},
   {label:'LIVE hours',previous:creator.previousHours,current:creator.comparedHours,decimals:1},
   {label:'LIVE days',previous:creator.previousLiveDays,current:creator.comparedLiveDays,decimals:0},
   {label:'Battles',previous:creator.previousBattles,current:creator.comparedBattles,decimals:0},
  ].map(stat=>({...stat,down:stat.current<stat.previous,drop:stat.previous>0?Math.max(0,(stat.previous-stat.current)/stat.previous*100):0}));
  return stats.some(stat=>stat.down)?[{creator,stats}]:[];
 }).sort((a,b)=>(b.stats[0].previous-b.stats[0].current)-(a.stats[0].previous-a.stats[0].current)||a.creator.username.localeCompare(b.creator.username));
}
