type Row=Record<string,unknown>;
const valid=(value:unknown)=>{const day=String(value||'').trim().slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day))&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day?day:null;};
export function creatorJoiningDate(rows:Row[]){
 const ordered=rows.slice().sort((a,b)=>String(a.stat_date).localeCompare(String(b.stat_date)));
 // Prefer the actual Backstage join date over its inclusive day counter.
 const joined=ordered.map(r=>valid(r.join_time)).find(Boolean);
 if(joined)return {date:joined,estimated:false};
 const first=ordered[0],observed=valid(first?.stat_date),days=Number(first?.days_since_joining??first?.['Days since joining']);
 if(!observed||!Number.isInteger(days)||days<1)return {date:null,estimated:true};
 // These Backstage exports count the joining date as day 2.
 const date=new Date(observed+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-Math.max(0,days-2));
 return {date:date.toISOString().slice(0,10),estimated:true};
}
export function elapsedJoiningDays(joined:string|null,today:string){return joined?Math.max(0,Math.floor((Date.parse(today+'T12:00:00Z')-Date.parse(joined+'T12:00:00Z'))/86400000)):null;}
