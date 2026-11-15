type Day={date:string;known:boolean;hours:number;diamonds:number;battles:number;streams:number};
const quantile=(values:number[],fraction:number)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor((sorted.length-1)*fraction)];};
export function creatorPotential(history:Day[],month:string,actual:number,latest=history.at(-1)?.date||month+'-01',monthHistory=history){
 const active=history.filter(d=>d.known&&d.hours>0&&d.diamonds>=0),recent=active.filter(d=>Date.parse(d.date+'T12:00:00Z')>=Date.parse(latest+'T12:00:00Z')-29*86400000);if((recent.length||active.length)<3)return null;
 // Forecast from the creator's actual average LIVE day, ignoring days they
 // did not go live. Use the latest 30 days where available, then gently
 // reflect whether their recent LIVE days are improving or declining.
 const pool=recent.length>=3?recent:active.slice(-17),split=Math.max(1,Math.floor(pool.length/2)),older=pool.slice(0,split),newer=pool.slice(split),average=(days:Day[])=>days.reduce((sum,d)=>sum+d.diamonds,0)/Math.max(days.length,1),baseDaily=average(pool),trend=older.length&&newer.length?Math.max(.75,Math.min(1.25,average(newer)/Math.max(average(older),1))):1,rate=baseDaily/Math.max(pool.reduce((sum,d)=>sum+d.hours,0)/pool.length,1),routine=pool.reduce((sum,d)=>sum+d.hours,0)/pool.length;
 const daysInMonth=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate(),elapsed=latest.startsWith(month)?Number(latest.slice(-2)):daysInMonth,remainingDays=Math.max(0,daysInMonth-elapsed);
 const observed=monthHistory.filter(d=>d.known&&d.date.startsWith(month)),dailyPotential=baseDaily*trend,recoveredDiamonds=0,futureDiamonds=remainingDays*dailyPotential;
 const prior=new Date(month+'-01T12:00:00Z');prior.setUTCMonth(prior.getUTCMonth()-1);const previous=prior.toISOString().slice(0,7),previousDiamonds=history.filter(d=>d.known&&d.date.startsWith(previous)).reduce((sum,d)=>sum+d.diamonds,0),potential=Math.round(actual+recoveredDiamonds+futureDiamonds);
 return {potential,potentialToDate:Math.round(actual+recoveredDiamonds),extra:Math.max(0,potential-actual),rate,routine,sampleDays:pool.length,strongDays:pool.length,remainingDays,futureDiamonds:Math.round(futureDiamonds),previousDiamonds,confidence:pool.length>=7?'Established history':'Limited history',dailyPotential:Math.round(dailyPotential)};
}
