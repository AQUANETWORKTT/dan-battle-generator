export const ACTIVITY_SIDES=['Team Dan / James','Team Mike / Indi'] as const;
export type ActivityTier='A'|'B';
export function activityTableManagers<T extends {group:string;tier:ActivityTier;activeSeconds:number;sessions:unknown[];count:number;name:string;lastActive:string|null}>(managers:T[],group:string,tier:ActivityTier){
 return managers.filter(manager=>manager.group===group&&manager.tier===tier).sort((a,b)=>
  b.activeSeconds-a.activeSeconds||b.sessions.length-a.sessions.length||b.count-a.count||
  (b.lastActive||'').localeCompare(a.lastActive||'')||a.name.localeCompare(b.name,'en-GB',{sensitivity:'base',numeric:true}));
}
