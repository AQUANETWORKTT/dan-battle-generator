export type ActivitySample={at:string;seconds:number};
export type ActivitySession={start:string;end:string;activeSeconds:number};

export function summarizeManagerActivity(samples:ActivitySample[],start:string,end:string){
 const from=Date.parse(start),until=Date.parse(end);
 const ranges=samples.flatMap(sample=>{
  const at=Date.parse(sample.at),seconds=Number(sample.seconds);
  if(!Number.isFinite(at)||!Number.isFinite(seconds)||seconds<0||seconds>30)return [];
  const a=Math.max(from,at-seconds*1000),b=Math.min(until,at);
  return b>=a&&at>=from&&a<until?[{a,b}]:[];
 }).sort((a,b)=>a.a-b.a||a.b-b.b);
 // Union across tabs/devices: two visible tabs must not double the hours.
 const union:{a:number;b:number}[]=[];
 for(const range of ranges){const last=union.at(-1);if(last&&range.a<=last.b){last.b=Math.max(last.b,range.b);}else union.push({...range});}
 const sessions:ActivitySession[]=[];
 for(const range of union){
  const seconds=(range.b-range.a)/1000,last=sessions.at(-1);
  if(last&&range.a-Date.parse(last.end)<=5*60000){last.end=new Date(Math.max(Date.parse(last.end),range.b)).toISOString();last.activeSeconds+=seconds;}
  else sessions.push({start:new Date(range.a).toISOString(),end:new Date(range.b).toISOString(),activeSeconds:seconds});
 }
 return {activeSeconds:Math.round(union.reduce((sum,r)=>sum+(r.b-r.a)/1000,0)),sessions,lastActive:ranges.length?new Date(Math.max(...ranges.map(r=>r.b))).toISOString():null};
}
