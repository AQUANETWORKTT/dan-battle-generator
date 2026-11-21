export type H2HExportMember={username:string;group:string;manager:string};
export const h2hUsername=(value:string)=>value.trim().replace(/^@/,'').toLowerCase();
const folder=(value:string)=>value.replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/\.+$/,'').trim()||'Unassigned';
export function h2hExportFolder(member:H2HExportMember){
 if(member.group==='Exempt')return 'Unsorted';
 const firstClass=['Team Dan / James','Team Dan','Team Mike / Indi','First Class'].includes(member.group);
 return firstClass?'First Class/'+folder(member.manager):folder(member.group);
}
export function h2hExportPlan<T extends {name1:string}>(posters:T[],members:H2HExportMember[]){
 const directory=new Map(members.map(member=>[h2hUsername(member.username),member]));
 return posters.flatMap(poster=>{const member=directory.get(h2hUsername(poster.name1));return member?[{poster,folder:h2hExportFolder(member)}]:[];});
}
