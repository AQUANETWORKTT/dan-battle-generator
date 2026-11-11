type Day={date:string;known:boolean;hours:number;diamonds:number;battles:number;streams:number};
const median=(xs:number[])=>{const s=[...xs].sort((a,b)=>a-b),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2;};
export function creatorPotential(timeline:Day[],month:string,actual:number){
 const active=timeline.filter(d=>d.known&&d.hours>0&&d.diamonds>0);
 if(active.length<3)return null;
 const rate=median(active.map(d=>d.diamonds/d.hours)),routine=Math.max(1,median(active.map(d=>d.hours)));
 const missed=timeline.filter(d=>d.known&&d.date.startsWith(month));
 const recoverableHours=missed.reduce((s,d)=>s+Math.max(0,Math.max(routine,d.streams)-d.hours),0);
 // A scenario, not a causal promise. Do not invent a financial uplift for extra battles.
 return {potential:Math.round(actual+recoverableHours*rate),extra:Math.round(recoverableHours*rate),recoverableHours,rate,sampleDays:active.length};
}
