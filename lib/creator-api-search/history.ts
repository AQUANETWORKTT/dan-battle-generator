import type {Eligibility} from './types';

export type Observation=Eligibility&{runId:string;jobId:string};
export type EligibilityChange={username:string;previousUsername:string;kind:'Became available'|'Became premium';invitationType:string;diamonds:number|null;changedAt:string;lastCheckedAt:string;previousCheckedAt:string;previousReason:string;reason:string;matchedBy:'Creator ID'|'Username';runId:string;networkReason?:string;networkCheckedAt?:string};
type State={row:Observation;key:string;network?:Observation};

export function detectEligibilityChanges(input:Observation[]):EligibilityChange[]{
 const states=new Map<string,State>(),names=new Map<string,State>(),changes=new Map<string,EligibilityChange>();
 const valid=input.filter(row=>['Available','Ineligible'].includes(row.status)&&row.checkedAt&&Number.isFinite(Date.parse(row.checkedAt)));
 valid.sort((a,b)=>Date.parse(a.checkedAt!)-Date.parse(b.checkedAt!)||a.jobId.localeCompare(b.jobId)||a.username.localeCompare(b.username));
 for(const row of valid){
  let key=row.creatorId?'id:'+row.creatorId:'username:'+row.username;
  let previous=states.get(key);const sameName=names.get(row.username);
  if(!previous&&sameName&&(!row.creatorId||!sameName.key.startsWith('id:')||sameName.key==='id:'+row.creatorId)){
   previous=sameName;
   if(!row.creatorId)key=sameName.key;
   else if(previous.key!==key){const priorChange=changes.get(previous.key);if(priorChange)changes.set(key,priorChange);changes.delete(previous.key);states.delete(previous.key);}
  }
  const was=previous?.row;
  const becameAvailable=was?.status==='Ineligible'&&row.status==='Available';
  const becamePremium=was?.status==='Available'&&was.invitationType==='Regular'&&row.status==='Available'&&row.invitationType==='Premium';
  const network=row.status==='Ineligible'&&/in another creator network/i.test(row.reason)?row:previous?.network;
  if(was&&(becameAvailable||becamePremium))changes.set(key,{
   username:row.username,previousUsername:was.username,kind:becameAvailable?'Became available':'Became premium',invitationType:row.invitationType||'Unknown',diamonds:row.diamonds??null,
   changedAt:row.checkedAt!,lastCheckedAt:row.checkedAt!,previousCheckedAt:was.checkedAt!,previousReason:was.reason,reason:row.reason,
   matchedBy:was.creatorId&&row.creatorId&&was.creatorId===row.creatorId?'Creator ID':'Username',runId:row.runId,
   networkReason:network?.reason,networkCheckedAt:network?.checkedAt,
  });
  const current={row,key,network};states.set(key,current);names.set(row.username,current);
 }
 const result:EligibilityChange[]=[];
 for(const [key,event] of changes){
  const latest=states.get(key)?.row;if(!latest||latest.status!=='Available')continue;
  const handleOwner=names.get(latest.username);
  if(handleOwner?.key.startsWith('id:')&&key.startsWith('id:')&&handleOwner.key!==key)continue;
  result.push({...event,username:latest.username,invitationType:latest.invitationType||'Unknown',diamonds:latest.diamonds??event.diamonds,lastCheckedAt:latest.checkedAt!,reason:latest.reason});
 }
 return result.sort((a,b)=>Date.parse(b.changedAt)-Date.parse(a.changedAt)||a.username.localeCompare(b.username));
}
