import {earningsManagerAssignments} from './earnings-manager-assignments';
import {recruitmentManagerIdentity} from './recruitment-manager-aliases';

export type LookupRow = {creator_id?:string;creator_username?:string;stat_date?:string;manager_email?:string;email?:string;team?:string;group_name?:string;agency?:string;status?:string;id?:string};
export type LookupResult = {username:string;creatorId:string|null;manager:string;status:'found'|'unassigned'|'not-found'};
export type LookupAssignments = Parameters<typeof earningsManagerAssignments>[0];
export function normalizeLookupUsername(value:string){return value.trim().replace(/^@+\s*/, '').trim().toLowerCase();}
export function parseLookupNames(text:string){return text.split(/\r\n|\n|\r/).map(normalizeLookupUsername).filter(Boolean);}
export function lookupManager(row:LookupRow,assignments:LookupAssignments){
 const raw=String(row.manager_email||row.email||'').trim();
 if(!raw||/^(unassigned|none|null|n\/a|-)$/i.test(raw))return 'No manager assigned';
 const key=recruitmentManagerIdentity(raw),resolved=earningsManagerAssignments(assignments);
 if(resolved.deleted.has(key))return 'No manager assigned';
 if(['firstclassagencydan','firstclassagencyjames'].includes(key))return 'Team Dan & James';
 if(resolved.names[key]){const name=resolved.names[key];return /^team\b/i.test(name)?name:`Team ${name}`;}
 const local=raw.split('@')[0].replace(/^firstclassagency[_.-]?/i,'').replace(/[_.-]?(aquaagency|respawnagency|paradiseagency)$/i,'').replace(/[_.-]+/g,' ').trim();
 return local?(/^team\b/i.test(local)?local:`Team ${local.split(' ').map(p=>p[0]?.toUpperCase()+p.slice(1)).join(' ')}`):'No manager assigned';
}
export function lookupResults(names:string[],rows:Map<string,LookupRow>,assignments:LookupAssignments){
 const results:LookupResult[]=names.map(username=>{
  const row=rows.get(username);
  if(!row)return {username,creatorId:null,manager:'Not found in database',status:'not-found'};
  const manager=lookupManager(row,assignments);
  return {username,creatorId:/^\d{10,}$/.test(row.creator_id||'')?row.creator_id!:null,manager,status:manager==='No manager assigned'?'unassigned':'found'};
 });
 return {results,summary:{total:results.length,found:results.filter(r=>r.status!=='not-found').length,notFound:results.filter(r=>r.status==='not-found').length,unassigned:results.filter(r=>r.status==='unassigned').length}};
}
export function copyLookupResults(results:LookupResult[]){return results.map(r=>`${r.username} - ${r.manager}`).join('\n');}
