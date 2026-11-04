import {allowedRecruitmentName,username,type Eligibility,type Ranking,type Run} from './creator-api-search/types';

export type AvailableCreator = Ranking & {
  invitationType:string; checkedAt:string; snapshotAt:string; nameVerified:boolean;
  hiddenFromManager?:boolean; actionToken?:string; messagedAt?:string; avatar?:string; live:boolean|null; profileAt?:string; history?:{days:{date:string;diamonds:number|null}[];threeDayTotal:number|null;knownDays:number;fetchedAt:string};
};
export type AvailabilityJob={id:string;run_id:string;created_at:string;results:Record<string,Eligibility>};

// Compare actual observations, never queue/run timestamps. Pending placeholders
// have no checkedAt and cannot replace a completed observation.
export function latestObservations(jobs:AvailabilityJob[]){
  const latest=new Map<string,{result:Eligibility;runId:string;tie:string}>();
  for(const job of jobs)for(const [key,result] of Object.entries(job.results||{})){
    if(!result||username(key)!==key||result.username!==key||!Number.isFinite(Date.parse(result.checkedAt||'')))continue;
    const identity=result.creatorId?`id:${result.creatorId}`:`name:${key}`,old=latest.get(identity),tie=job.created_at+job.id;
    if(!old||Date.parse(result.checkedAt!)>Date.parse(old.result.checkedAt!)||result.checkedAt===old.result.checkedAt&&tie>old.tie)latest.set(identity,{result,runId:job.run_id,tie});
  }
  // Legacy observations may lack creator IDs; the latest username result wins too.
  const names=new Map<string,{result:Eligibility;runId:string;tie:string}>();
  for(const entry of latest.values()){const old=names.get(entry.result.username);if(!old||Date.parse(entry.result.checkedAt!)>Date.parse(old.result.checkedAt!))names.set(entry.result.username,entry);}
  return [...names.values()];
}

export function availableDirectory(observations:ReturnType<typeof latestObservations>,runs:Run[],now=Date.now()){
  const byRun=new Map(runs.map(run=>[run.id,run])),rows:AvailableCreator[]=[];
  let lastCheck:string|null=null,excluded=0;
  for(const entry of observations){
    const result=entry.result;
    if(!lastCheck||Date.parse(result.checkedAt!)>Date.parse(lastCheck))lastCheck=result.checkedAt!;
    if(result.status!=='Available')continue;
    const run=byRun.get(entry.runId);if(!run)continue;
    const matches=Object.values(run.payload.results).flat().filter(row=>row.username===result.username);
    const ranking=matches.slice().sort((a,b)=>a.league.localeCompare(b.league,'en',{numeric:true})||(a.rank??Infinity)-(b.rank??Infinity))[0];
    if(!ranking)continue;
    const row={...ranking,name:result.name||ranking.name,excludedForName:result.excludedForName||matches.some(item=>!allowedRecruitmentName(item))};
    if(!allowedRecruitmentName(row)){excluded++;continue;}
    rows.push({...row,region:run.payload.region||'GB',invitationType:result.invitationType||'Unknown',checkedAt:result.checkedAt!,snapshotAt:run.updated_at,nameVerified:result.name!==undefined,live:null});
  }
  rows.sort((a,b)=>(b.diamonds??-1)-(a.diamonds??-1)||a.username.localeCompare(b.username));
  return {rows,lastCheck,excluded,stale:rows.filter(row=>now-Date.parse(row.checkedAt)>12*3600000).length};
}

export function safeAvatar(value:unknown){if(typeof value!=='string')return undefined;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:undefined;}catch{return undefined;}}

// Calendar days in London, rather than rolling 24-hour periods (including DST).
export function availabilityLabel(checkedAt:string,now=Date.now()){
  const date=new Date(checkedAt);if(!Number.isFinite(date.getTime()))return 'AVAILABILITY NOT CHECKED';
  const format=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'});
  const day=(value:Date)=>{const parts=format.formatToParts(value);const n=(kind:string)=>Number(parts.find(part=>part.type===kind)?.value);return Date.UTC(n('year'),n('month')-1,n('day'));};
  const elapsed=Math.max(0,Math.round((day(new Date(now))-day(date))/86400000));
  return elapsed===0?'AVAILABLE TODAY':elapsed===1?'AVAILABLE YESTERDAY':`AVAILABLE ${elapsed} DAYS AGO`;
}

export function hiddenUntilRescan(checkedAt:string,hiddenAt?:string){
  return Boolean(hiddenAt&&Date.parse(checkedAt)<=Date.parse(hiddenAt));
}
