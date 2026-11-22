import {recruitmentManagerIdentity} from './recruitment-manager-aliases';
import {type H2HExportMember,h2hUsername} from './h2h-export-groups';

type Assignments={managerGroups?:Record<string,string>;managerNames?:Record<string,string>};
export function h2hDirectoryMembers(rows:Record<string,unknown>[],assignments:Assignments):H2HExportMember[]{
 const groups=new Map(Object.entries(assignments.managerGroups||{}).map(([key,value])=>[recruitmentManagerIdentity(key),value]));
 const names=new Map(Object.entries(assignments.managerNames||{}).map(([key,value])=>[recruitmentManagerIdentity(key),value]));
 const members=new Map<string,H2HExportMember>();
 for(const row of rows){
  const username=String(row.creator_username||'').trim().replace(/^@/,'');if(!username)continue;
  const raw=String(row.manager_email||row.creator_network_manager||row.email||''),key=recruitmentManagerIdentity(raw);
  const ownerDan=['firstclassagencydan','firstclassagencyjames'].includes(key),ownerMike=['firstclassindi','mikehalesjb'].includes(key);
  const assigned=groups.get(key)||String(row.group_name||row.agency||row.team||'Unassigned');
  const group=(ownerDan?'Team Dan / James':ownerMike||assigned==='Unassigned'?'Team Mike / Indi':assigned).replace(/\s+sub[ -]?agency$/i,'');
  const fallback=raw.split('@')[0].replace(/^firstclassagency[_.-]?/i,'').replace(/[_.-]+/g,' ').trim();
  const manager=names.get(key)||(ownerDan?'Team Dan & James':ownerMike?'Team Mike & Indi':fallback?'Team '+fallback:'Team Mike & Indi');
  members.set(h2hUsername(username),{username,group,manager});
 }
 return [...members.values()];
}
