import {recruitmentManagerIdentity} from './recruitment-manager-aliases';

// James's own account is an owner account, not a separate recruiting team.
// Attribute its recruits to Dan even when the owner account is marked Excluded.
export function recruitmentTeamOwner(raw:string){
 const key=recruitmentManagerIdentity(raw);
 return key==='firstclassagencyjames'?'firstclassagencydan':key;
}
