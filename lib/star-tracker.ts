export const STAR_CAMPAIGNS=[
 {id:'valid-days-1st',label:'Valid Days 1st'},
 {id:'gift-gallery',label:'Gift Gallery'},
 {id:'crocodile-countdown',label:'Crocodile Countdown'},
 {id:'jungle-marathon',label:'The Jungle Marathon'},
 {id:'jungle-giants',label:'Jungle Giants'},
 {id:'jungle-ambush',label:'The Jungle Ambush'},
 // Keep the existing stored ID while correcting the visible spelling.
 {id:'venemous-victory',label:'Venomous Victory'},
 {id:'snake-bite',label:'Snake Bite'},
 {id:'jungle-storm',label:'Jungle Storm'},
 {id:'walk-of-fear',label:'The Walk of Fear'},
 {id:'jungle-riddle-trail',label:'Jungle Riddle Trail'},
 {id:'jungle-bingo',label:'Jungle Bingo'},
 {id:'jungle-treasure-gift',label:'Jungle Treasure Gift'},
 {id:'royal-rumble',label:'The Royal Rumble'},
 {id:'star-hunt',label:'Star Hunt'},
 {id:'star-steal-shield',label:'Star Steal / Shield'},
 {id:'escape-the-jungle',label:'Escape the Jungle'},
 {id:'great-escape',label:'The Great Escape'},
 {id:'star-showdown',label:'The Star Showdown'},
 {id:'double-survival-trial',label:'Double Survival Trial'},
 {id:'survive-the-night',label:'Survive the Night'},
 {id:'jungle-costume-challenge',label:'Jungle Costume Challenge'},
 {id:'manual-star-adjustments',label:'Manual Star Adjustments'},
] as const;
export type CampaignId=typeof STAR_CAMPAIGNS[number]['id'];
export type StarAward={creatorId:string;campaign:CampaignId;stars:number;revision:number;updatedAt:string;history?:{before:number;after:number;at:string;kind:'edit'|'bulk';operationId?:string;requestedDelta?:number}[]};
export type StarCreator={id:string;username:string;awards:Partial<Record<CampaignId,StarAward>>};
export const STARTING_STARS=10;
export function minimumStarValue(campaign:unknown){return campaign==='manual-star-adjustments'?-1000000:0;}
export function parseStarUsernames(text:string){
 const names=new Set<string>(),invalid:string[]=[];
 for(const token of text.split(/[\s,;]+/).filter(Boolean)){
  let name=token.trim();
  if(/^https?:\/\//i.test(name)){try{const url=new URL(name);if(!/(^|\.)tiktok\.com$/i.test(url.hostname))throw Error();name=url.pathname.replace(/^\/@/,'').replace(/\/$/,'');}catch{invalid.push(token);continue;}}
  name=name.replace(/^@/,'').toLowerCase();if(/^[a-z0-9._]{1,24}$/.test(name))names.add(name);else invalid.push(token);
 }
 return {usernames:[...names],invalid};
}
export type StarBulkInput={operationId:string;campaign:CampaignId;delta:number;usernames:string[]};
export function validStarBulkInput(value:unknown):value is StarBulkInput{
 const b=value as StarBulkInput|null;
 return Boolean(b&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(b.operationId||'')&&STAR_CAMPAIGNS.some(c=>c.id===b.campaign)&&Number.isSafeInteger(b.delta)&&b.delta!==0&&Math.abs(b.delta)<=1000000&&Array.isArray(b.usernames)&&b.usernames.length>0&&b.usernames.length<=2000&&b.usernames.every(n=>typeof n==='string'&&/^@?[a-z0-9._]{1,24}$/i.test(n)));
}
export function starTotal(creator:StarCreator){return STARTING_STARS+STAR_CAMPAIGNS.reduce((sum,c)=>sum+(creator.awards[c.id]?.stars||0),0);}
export const managerIdentity=(value:unknown)=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^kaydenmads$/,'firstclassagencykaydenoutlookcom');
const external=/\b(horizon|respawn|paradise|atlas|dragonheart|vanguard|honey\s*bloom|trident|aqua|apollo|empire|atlantis)\b/i;
export function firstClassStarCreator(row:Record<string,unknown>,groups:Record<string,string>){
 const manager=managerIdentity(row.manager_email||row.creator_network_manager||row['Creator Network manager']||row.email);
 const group=groups[manager]||'';
 // Saved Manager Assignments are the current affiliation authority. Uploads
 // can retain an old sub-agency label after the manager moves into First Class.
 if(/^(Team Dan(?: \/ James)?|Team Mike \/ Indi|First Class)$/i.test(group))return true;
 if(external.test(group.replace(/[_-]/g,' ')))return false;
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
 return Boolean(b&&/^\d{5,30}$/.test(String(b.creatorId||''))&&STAR_CAMPAIGNS.some(c=>c.id===b.campaign)&&typeof b.stars==='number'&&Number.isSafeInteger(b.stars)&&b.stars>=minimumStarValue(b.campaign)&&b.stars<=1000000&&typeof b.revision==='number'&&Number.isSafeInteger(b.revision)&&b.revision>=0);
}
