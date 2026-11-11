export type ResourceFolder={id:string;parent:string|null;name:string;kind:'folder';deleted?:boolean};
export type PortalResource={id:string;parent:string;name:string;kind:'text'|'file';text?:string;path?:string;mime?:string;asset?:string;deleted?:boolean};
export type ResourceItem=ResourceFolder|PortalResource;
const roots=['WhatsApp','Creator onboarding','Battles','LIVE support','Technical support','Recruiting'];
export const RESOURCE_FOLDERS:ResourceFolder[]=roots.map((name,i)=>({id:'folder-'+i,parent:null,name,kind:'folder'}));
const children=[['Profile pictures','Example messages','Group chat guidance'],['Welcome messages','Getting started','Check-in messages','Sign-off messages'],['Battle graphics','Box battle information','Battle preparation','Power-ups and networking'],['Going LIVE','Rules and avoiding bans','Consistency and routines'],['Studio support','Camera and audio','Connection and troubleshooting'],['Recruitment messages','Recruitment graphics','Recruitment guidance']];
children.forEach((names,i)=>names.forEach((name,j)=>RESOURCE_FOLDERS.push({id:'folder-'+i+'-'+j,parent:'folder-'+i,name,kind:'folder'})));
export const RESOURCE_DEFAULTS:ResourceItem[]=[...RESOURCE_FOLDERS,...['blue','bronze','silver','gold','green','pink'].map(colour=>({id:'profile-'+colour,parent:'folder-0-0',name:colour==='green'?'Gaming':colour==='pink'?'Music / Singers':colour[0].toUpperCase()+colour.slice(1),kind:'file' as const,asset:'/branding/chat-profiles/'+colour+'.png',mime:'image/png'}))];
