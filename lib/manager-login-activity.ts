import 'server-only';
import {database} from './creator-api-search/db';
import {syncAccounts} from './manager-portal';
export function londonDate(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function midnight(day:string){const utc=new Date(day+'T00:00:00Z'),hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',hourCycle:'h23'}).format(utc));return new Date(utc.getTime()-hour*3600000).toISOString();}
export async function loginActivity(day:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(Date.parse(day))||new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day)throw Error('Choose a valid date.');const next=new Date(day+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);const accounts=(await syncAccounts()).filter(a=>a.enabled),byId=new Map(accounts.map(a=>[a.id,a])),events:{accountId:string;name:string;username:string;at:string}[]=[];
 for(let from=0;;from+=1000){const r=await database().from('manager_portal_limits').select('key,started_at').like('key','audit:login:%').gte('started_at',midnight(day)).lt('started_at',midnight(next.toISOString().slice(0,10))).order('started_at',{ascending:false}).order('key').range(from,from+999);if(r.error)throw Error(r.error.message);for(const row of r.data){const id=row.key.split(':')[2],account=byId.get(id);if(account)events.push({accountId:id,name:account.name,username:account.username,at:row.started_at});}if(r.data.length<1000)break;}
 return {day,managers:accounts.map(a=>{const logins=events.filter(e=>e.accountId===a.id);return {id:a.id,name:a.name,username:a.username,enabled:a.enabled,loggedIn:logins.length>0,count:logins.length,lastLogin:logins[0]?.at||null};}),events};
}
