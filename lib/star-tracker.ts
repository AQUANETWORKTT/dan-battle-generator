export const STAR_CAMPAIGNS=[
 {id:'valid-days-1st',label:'Valid Days 1st'},
 {id:'gift-gallery',label:'Gift Gallery'},
 {id:'crocodile-countdown',label:'Crocodile Countdown'},
 {id:'jungle-marathon',label:'The Jungle Marathon'},
 {id:'jungle-giants',label:'Jungle Giants'},
 {id:'jungle-ambush',label:'Jungle Ambush'},
 {id:'venemous-victory',label:'Venemous Victory'},
] as const;
export type CampaignId=typeof STAR_CAMPAIGNS[number]['id'];
export type StarAward={creatorId:string;campaign:CampaignId;stars:number;revision:number;updatedAt:string};
export type StarCreator={id:string;username:string;awards:Partial<Record<CampaignId,StarAward>>};
export const STARTING_STARS=10;
export function starTotal(creator:StarCreator){return STARTING_STARS+STAR_CAMPAIGNS.reduce((sum,c)=>sum+(creator.awards[c.id]?.stars||0),0);}
export const managerIdentity=(value:unknown)=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^kaydenmads$/,'firstclassagencykaydenoutlookcom');
const external=/\b(horizon|respawn|paradise|atlas|dragonheart|vanguard|honey\s*bloom|trident|aqua|apollo|empire|atlantis)\b/i;
export function firstClassStarCreator(row:Record<string,unknown>,groups:Record<string,string>){
 const manager=managerIdentity(row.manager_email||row.creator_network_manager||row['Creator Network manager']||row.email);
 const group=groups[manager]||'';
 const agency=String(row.agency||'').trim();
 const affiliation=[agency,row.team,row.group_name,group].map(v=>String(v||'').replace(/[_-]/g,' ')).join(' ');
 if(external.test(affiliation))return false;
 // These stored manager identities are explicitly classified as Respawn by
 // Manager Assignments, including legacy uploads labelled First Class.
 if(/(glenifarr|glenitar|jbollins997|lagsturbo|resili3recruits|resilientrecruits|mattyhorner60)/.test(manager))return false;
 return /^first\s*class(?:\s+agency)?$/i.test(agency)||/^(Team Dan(?: \/ James)?|Team Mike \/ Indi|First Class)$/i.test(group);
}
export function starRoster(rows:Record<string,unknown>[],groups:Record<string,string>){
 const normalized=Object.fromEntries(Object.entries(groups).map(([key,value])=>[managerIdentity(key),value]));
 const byId=new Map<string,{id:string;username:string}>();
 for(const row of rows){if(!firstClassStarCreator(row,normalized))continue;const id=String(row.creator_id||'').trim(),username=String(row.creator_username||'').trim().replace(/^@/,'');if(/^\d{5,30}$/.test(id)&&username)byId.set(id,{id,username});}
 return [...byId.values()].sort((a,b)=>a.username.localeCompare(b.username,'en',{sensitivity:'base'}));
}
export function validStarInput(body:unknown):body is {creatorId:string;campaign:CampaignId;stars:number;revision:number}{
 const b=body as Record<string,unknown>|null;
 return Boolean(b&&/^\d{5,30}$/.test(String(b.creatorId||''))&&STAR_CAMPAIGNS.some(c=>c.id===b.campaign)&&typeof b.stars==='number'&&Number.isSafeInteger(b.stars)&&b.stars>=0&&b.stars<=1000000&&typeof b.revision==='number'&&Number.isSafeInteger(b.revision)&&b.revision>=0);
}
