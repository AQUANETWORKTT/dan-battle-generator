import 'server-only';
import {randomBytes,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {database} from './creator-api-search/db';
import {GET as managerAssignments} from '@/app/api/data-analysis/manager-assignments/route';
import {recruitmentManagerIdentity} from './recruitment-manager-aliases';

const assignmentKey=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
export const firstClassManagerGroup=(group:unknown)=>group==='Team Dan / James'||group==='Team Mike / Indi';
async function allowedManagerKeys(){const r=await database().from('poster_templates').select('template_json').eq('name','manager-assignment-settings').maybeSingle();check(r.error);const a=r.data?.template_json?.assignments||{},deleted=new Set((a.deletedManagers||[]).map(assignmentKey));return new Set<string>(Object.entries(a.managerGroups||{}).filter(([k,g])=>firstClassManagerGroup(g)&&!deleted.has(assignmentKey(k))).map(([k])=>recruitmentManagerIdentity(k)));}

export const MANAGER_COOKIE='first-class-manager-session';
const accounts='manager_portal_accounts',sessions='manager_portal_sessions';
export type ManagerAccount={id:string;number:number;manager_key:string;display_name:string;username:string;password_hash:string|null;enabled:boolean;version:number;password_changed_at:string|null;updated_at:string};
function check(error:{message:string;code?:string}|null){if(error)throw Error(/42P01|PGRST205/.test(error.code||'')?'Manager accounts need database setup. Apply supabase/manager_portal.sql to the First Class submissions project.':error.message);}
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,(error,key)=>error?reject(error):resolve(key)));
export async function hashPassword(password:string){if(password.length<4||password.length>128)throw Error('Use a password between 4 and 128 characters.');const salt=randomBytes(16).toString('hex');return salt+':'+(await derive(password.toLowerCase(),salt)).toString('hex');}
export async function verifyPassword(password:string,hash:string|null){const [salt,key]=(hash||'0'.repeat(32)+':'+'0'.repeat(128)).split(':');let valid=false;for(const candidate of new Set([password.slice(0,129).toLowerCase(),password.slice(0,129),password.slice(0,129).toUpperCase()])){const actual=await derive(candidate,salt);if(hash&&key.length===128&&timingSafeEqual(actual,Buffer.from(key,'hex')))valid=true;}return valid;}

export function publicAccount(a:ManagerAccount){return {id:a.id,managerKey:a.manager_key,name:a.display_name,username:a.username,enabled:a.enabled,passwordSet:Boolean(a.password_hash),passwordChangedAt:a.password_changed_at,version:a.version};}
export async function syncAccounts(){
 const db=database();const settings=await db.from('poster_templates').select('template_json').eq('name','manager-assignment-settings').maybeSingle();check(settings.error);
 const saved=await db.from(accounts).select('*').order('number');check(saved.error);
 const assignment=settings.data?.template_json?.assignments||{},names:Record<string,string>=assignment.managerNames||{},groups:Record<string,string>=assignment.managerGroups||{};
 const norm=recruitmentManagerIdentity;
 const loginName=(name:string)=>name.replace(/^team\s+/i,'').trim().toUpperCase().slice(0,60);
 const deleted=new Set((assignment.deletedManagers||[]).map(assignmentKey));
 const candidates=new Map<string,string>();
 const discovered=await managerAssignments();
 if(!discovered.ok)throw Error('Could not load manager assignments. Please retry.');
 if(discovered.ok){const data=await discovered.json();for(const m of data.managers||[])if(firstClassManagerGroup(m.group)&&!deleted.has(assignmentKey(m.key)))candidates.set(norm(m.key),m.name);}
 for(const raw of [...new Set([...Object.keys(groups),...Object.keys(names)])].sort()){
  const key=norm(raw),group=groups[raw];
  if(deleted.has(assignmentKey(raw))||!firstClassManagerGroup(group))continue;
  const label=names[raw]||raw.split('@')[0].replace(/^firstclassagency[_.-]?/i,'').replace(/[_.-]/g,' ');
  candidates.set(key,label);
 }
 for(const [key,name]of candidates){const existing=(saved.data||[]).find(a=>a.manager_key===key);if(!existing){for(let attempt=0;attempt<20;attempt++){const r=await db.from(accounts).insert({manager_key:key,display_name:name,username:loginName(name)+(attempt?' '+(attempt+1):'')});if(!r.error)break;if(r.error.code!=='23505')check(r.error);const concurrent=await db.from(accounts).select('id').eq('manager_key',key).maybeSingle();check(concurrent.error);if(concurrent.data)break;if(attempt===19)throw Error('Could not allocate a unique manager username. Please try again.');}}else if(existing.display_name!==name){const r=await db.from(accounts).update({display_name:name,username:loginName(name),version:existing.version+1}).eq('id',existing.id);check(r.error);}}
 for(const old of saved.data||[])if(!candidates.has(old.manager_key)&&old.enabled){const r=await db.from(accounts).update({enabled:false,version:old.version+1}).eq('id',old.id);check(r.error);}
 const result=await db.from(accounts).select('*').order('number');check(result.error);return (result.data as ManagerAccount[]).filter(a=>candidates.has(a.manager_key)).map(publicAccount);
}
export async function accountForSession(token?:string){if(!token||!/^[a-f0-9]{64}$/.test(token))return null;const [s,allowed]=await Promise.all([database().from(sessions).select('version,manager_portal_accounts(*)').eq('token_hash',digest(token)).gt('expires_at',new Date().toISOString()).maybeSingle(),allowedManagerKeys()]);check(s.error);if(!s.data)return null;const joined=s.data.manager_portal_accounts as unknown as ManagerAccount|ManagerAccount[]|null,a=Array.isArray(joined)?joined[0]:joined;return a&&a.enabled&&a.version===s.data.version&&allowed.has(a.manager_key)?a:null;}

export async function createSession(a:ManagerAccount){const token=randomBytes(32).toString('hex');const r=await database().from(sessions).insert({token_hash:digest(token),account_id:a.id,version:a.version,expires_at:new Date(Date.now()+7*86400000).toISOString()});check(r.error);
 // Immutable login events share the existing private key/timestamp store.
 // audit: keys never enter the hashed rate-limit buckets and survive session deletion.
 const audit=await database().from('manager_portal_limits').insert({key:'audit:login:'+a.id+':'+randomBytes(16).toString('hex'),started_at:new Date().toISOString(),attempts:1});if(audit.error){await database().from(sessions).delete().eq('token_hash',digest(token));check(audit.error);}
 return token;}
export async function endSession(token?:string){if(token){const r=await database().from(sessions).delete().eq('token_hash',digest(token));check(r.error);}}
export async function limitAttempt(key:string){const r=await database().rpc('manager_portal_attempt',{bucket:digest(key)});check(r.error);if(!r.data)throw Error('Too many attempts. Try again in 15 minutes.');}
export async function loginManager(username:string,password:string,ip:string){await limitAttempt('ip:'+ip);await limitAttempt('name:'+username.toUpperCase());const r=await database().from(accounts).select('*').eq('username',username.trim().toUpperCase()).maybeSingle();check(r.error);const valid=await verifyPassword(password,r.data?.password_hash||null);if(!valid||!r.data?.enabled||!(await allowedManagerKeys()).has(r.data.manager_key))throw Error('Incorrect username or password.');return r.data as ManagerAccount;}
export async function updateAccount(id:string,version:number,values:{username?:string;password?:string;enabled?:boolean}){
 const patch:Record<string,unknown>={version:version+1,updated_at:new Date().toISOString()};
 if(values.username!==undefined){const username=values.username.trim().toUpperCase();if(username.length<1||username.length>64||!/[A-Z0-9]/.test(username)||/[\x00-\x1f\x7f]/.test(username))throw Error('Use a manager name between 1 and 64 characters.');patch.username=username;}
 if(values.password!==undefined){patch.password_hash=await hashPassword(values.password);patch.password_changed_at=new Date().toISOString();}
 if(values.enabled!==undefined)patch.enabled=values.enabled;
 const r=await database().from(accounts).update(patch).eq('id',id).eq('version',version).select('*').maybeSingle();if(r.error?.code==='23505')throw Error('That username is already in use.');check(r.error);if(!r.data)throw Error('This account changed. Refresh and try again.');return r.data as ManagerAccount;
}

function defaultPassword(name:string,index:number){return name.replace(/^team\s+/i,'').replace(/[^a-zA-Z]/g,'').slice(0,2).toUpperCase().padEnd(2,'M')+String(index+1).padStart(2,'0');}
export async function adminAccounts(){const visible=await syncAccounts(),r=await database().from(accounts).select('*').order('number');check(r.error);return Promise.all(visible.map(async(a,index)=>{const saved=(r.data as ManagerAccount[]).find(x=>x.id===a.id)!,code=defaultPassword(a.name,index);if(!saved.password_hash){const initialized=await updateAccount(saved.id,saved.version,{password:code});return {...publicAccount(initialized),visiblePassword:code};}return {...a,visiblePassword:await verifyPassword(code,saved.password_hash)?code:''};}));}
export async function resetDefaultPasswords(){const list=await syncAccounts();for(let i=0;i<list.length;i++)await updateAccount(list[i].id,list[i].version,{password:defaultPassword(list[i].name,i)});return adminAccounts();}

export async function loginPosterManager(username:string){const name=username.trim().replace(/^team\s+/i,'').toUpperCase();const [,r,allowed]=await Promise.all([limitAttempt('poster-name:'+name),database().from(accounts).select('*').eq('username',name).maybeSingle(),allowedManagerKeys()]);check(r.error);if(!r.data?.enabled||!allowed.has(r.data.manager_key))throw Error('Manager username not found. Please check with Leadership.');return r.data as ManagerAccount;}

export async function loginManagerPreview(code:string,ip:string){await limitAttempt('preview-ip:'+ip);if(code.trim().toUpperCase()!=='DA07')throw Error('Manager access is not available for that username yet.');const r=await database().from(accounts).select('*').eq('manager_key','firstclassagencydan').maybeSingle();check(r.error);if(!r.data?.enabled||!(await allowedManagerKeys()).has(r.data.manager_key))throw Error('This manager account is not enabled.');return r.data as ManagerAccount;}
