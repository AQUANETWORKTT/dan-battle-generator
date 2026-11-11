import 'server-only';
import {randomUUID} from 'node:crypto';
import {database} from './creator-api-search/db';
export type ManagerReminder={id:string;text:string;date:string;weekly:boolean;managerKeys:string[];all:boolean;createdAt:string;deleted?:boolean};
const prefix='manager-reminder-v1:';
export function reminderDue(r:ManagerReminder,now=new Date()){
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 return !r.deleted&&day>=r.date&&(day===r.date||(r.weekly&&new Date(day+'T12:00:00Z').getUTCDay()===new Date(r.date+'T12:00:00Z').getUTCDay()));
}
export async function listReminders(){const items:ManagerReminder[]=[];for(let start=0;;start+=500){const r=await database().from('poster_templates').select('template_json').like('name',prefix+'%').order('name').range(start,start+499);if(r.error)throw Error(r.error.message);items.push(...(r.data||[]).map(x=>x.template_json as ManagerReminder).filter(x=>!x.deleted));if((r.data||[]).length<500)break;}return items.sort((a,b)=>a.date.localeCompare(b.date));}
export async function saveReminder(input:unknown,allowed:string[]){
 const b=input as Partial<ManagerReminder>;if(!b||typeof b.text!=='string'||!b.text.trim()||b.text.length>1500||typeof b.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!Number.isFinite(Date.parse(b.date))||new Date(b.date+'T12:00:00Z').toISOString().slice(0,10)!==b.date||typeof b.weekly!=='boolean'||typeof b.all!=='boolean')throw Error('Enter a reminder and valid date.');
 const keys=Array.isArray(b.managerKeys)?[...new Set(b.managerKeys)].filter(k=>typeof k==='string'&&allowed.includes(k)):[];if(!b.all&&!keys.length)throw Error('Select at least one First Class manager.');
 const reminder:ManagerReminder={id:randomUUID(),text:b.text.trim(),date:b.date,weekly:b.weekly,all:b.all,managerKeys:keys,createdAt:new Date().toISOString()};await write(reminder);return reminder;
}
async function write(r:ManagerReminder){const result=await database().from('poster_templates').upsert({name:prefix+r.id,template_json:r,background_url:null,updated_at:new Date().toISOString()},{onConflict:'name'});if(result.error)throw Error(result.error.message);}
export async function removeReminder(id:string){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid reminder.');const r=(await listReminders()).find(x=>x.id===id);if(r)await write({...r,deleted:true});}
