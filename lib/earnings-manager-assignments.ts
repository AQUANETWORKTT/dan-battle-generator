import {recruitmentManagerIdentity} from './recruitment-manager-aliases';
type Assignments={managerGroups?:Record<string,string>;managerNames?:Record<string,string>;managerParents?:Record<string,string>;deletedManagers?:string[]};
const rawKey=(key:string)=>key.trim().toLowerCase().replace(/[^a-z0-9]/g,'');
export function earningsManagerAssignments(assignments:Assignments){
 const removed=new Set((assignments.deletedManagers||[]).map(rawKey));
 const deleted=new Set((assignments.deletedManagers||[]).map(recruitmentManagerIdentity));
 const groups:Record<string,string>={},names:Record<string,string>={};
 // Delete retired raw accounts before merging aliases. A live combined account
 // must not inherit the deletion or old display name of a retired alias.
 const entries=Object.entries(assignments.managerGroups||{}).filter(([raw])=>!removed.has(rawKey(raw))).sort(([a],[b])=>{
  const canonical=(raw:string)=>rawKey(raw).replace(/(outlook|gmail|mail)com$/,'')===recruitmentManagerIdentity(raw)?1:0;
  return canonical(a)-canonical(b);
 });
 for(const [raw,group] of entries){const key=recruitmentManagerIdentity(raw);deleted.delete(key);groups[key]=group;const name=assignments.managerNames?.[raw];if(name)names[key]=name;}
 const parents=Object.fromEntries(Object.entries(assignments.managerParents||{}).filter(([child])=>!removed.has(rawKey(child))).map(([child,parent])=>[recruitmentManagerIdentity(child),recruitmentManagerIdentity(parent)]));
 return {groups,names,parents,deleted};
}
