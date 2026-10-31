import type {Contact,Eligibility} from './types';

export function availableLists<T extends {username:string}>(rows:T[],eligibility:Record<string,Eligibility>,contacts:Contact[]){
 const blocked=new Set(contacts.map(row=>row.username));
 const all=rows.filter(row=>eligibility[row.username]?.status==='Available'&&Boolean(eligibility[row.username]?.checkedAt));
 return {
  all,
  premium:all.filter(row=>eligibility[row.username].invitationType==='Premium'),
  regular:all.filter(row=>eligibility[row.username].invitationType==='Regular'),
  unclassified:all.filter(row=>!['Premium','Regular'].includes(eligibility[row.username].invitationType||'')),
  fresh:all.filter(row=>!blocked.has(row.username)),
 };
}
