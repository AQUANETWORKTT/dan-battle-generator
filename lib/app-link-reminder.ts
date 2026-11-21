type Creator={id:string;managerKey:string;appLinkDays?:number|null;joinedDate?:string|null};
type Task={id:string;managerKey:string;completed:boolean};
// Launch on 21 November: the first eligible joining date is 18 November.
// This fixed boundary prevents a historic backlog from appearing on later days.
export const APP_LINK_FIRST_JOINING_DATE='2026-11-18';
export const appLinkDue=(creator:Creator)=>Boolean(creator.joinedDate&&creator.joinedDate>=APP_LINK_FIRST_JOINING_DATE&&creator.appLinkDays!==null&&creator.appLinkDays!==undefined&&creator.appLinkDays>=3);
export const appLinkTaskId=(creator:Creator)=>`app-link:${creator.id}`;
export function appLinkTaskRecord(creator:Creator,records:Task[]){
 return records.find(t=>t.managerKey===creator.managerKey&&t.id===appLinkTaskId(creator))||records.find(t=>t.managerKey===creator.managerKey&&t.completed&&/^app-link:\d{4}-\d{2}:/.test(t.id)&&t.id.endsWith(':'+creator.id));
}
export const appLinkCompleted=(creator:Creator,records:Task[])=>appLinkTaskRecord(creator,records)?.completed===true;
