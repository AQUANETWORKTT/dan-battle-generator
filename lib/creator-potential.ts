type Day={date:string;known:boolean;hours:number;diamonds:number;battles:number;streams:number};
const quantile=(values:number[],fraction:number)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor((sorted.length-1)*fraction)];};
export function creatorPotential(history:Day[],month:string,actual:number,latest=history.at(-1)?.date||month+'-01',monthHistory=history){
 const active=history.filter(d=>d.known&&d.hours>0&&d.diamonds>=0);if(active.length<3)return null;
 // Prefer repeatable good days. No invented financial multiplier for battle counts.
 const strong=active.filter(d=>d.hours>=1&&d.battles>=10),pool=strong.length>=3?strong:active;
 const rate=quantile(pool.map(d=>d.diamonds/Math.max(d.hours,1)),.75),routine=2;
 const daysInMonth=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate(),elapsed=latest.startsWith(month)?Number(latest.slice(-2)):daysInMonth,remainingDays=Math.max(0,daysInMonth-elapsed),dailyPotential=rate*routine;
 const observed=monthHistory.filter(d=>d.known&&d.date.startsWith(month)),recoveredDiamonds=observed.reduce((sum,d)=>sum+Math.max(0,dailyPotential-d.diamonds),0),futureDiamonds=remainingDays*dailyPotential;
 const prior=new Date(month+'-01T12:00:00Z');prior.setUTCMonth(prior.getUTCMonth()-1);const previous=prior.toISOString().slice(0,7),previousDiamonds=history.filter(d=>d.known&&d.date.startsWith(previous)).reduce((sum,d)=>sum+d.diamonds,0),potential=Math.round(actual+recoveredDiamonds+futureDiamonds);
 return {potential,extra:Math.max(0,potential-actual),rate,routine,sampleDays:pool.length,strongDays:strong.length,remainingDays,futureDiamonds:Math.round(futureDiamonds),previousDiamonds,confidence:pool.length>=7?'Established history':'Limited history',dailyPotential:Math.round(dailyPotential)};
}
