import 'server-only';
import {randomBytes,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {database} from './creator-api-search/db';
import {GET as managerAssignments} from '@/app/api/data-analysis/manager-assignments/route';
import {recruitmentManagerIdentity} from './recruitment-manager-aliases';
export const MANAGER_COOKIE='first-class-manager-session';
const accounts='manager_portal_accounts',sessions='manager_portal_sessions';
export type ManagerAccount={id:string;number:number;manager_key:string;display_name:string;username:string;password_hash:string|null;enabled:boolean;version:number;password_changed_at:string|null;updated_at:string};
function check(error:{message:string;code?:string}|null){if(error)throw Error(/42P01|PGRST205/.test(error.code||'')?'Manager accounts need database setup. Apply supabase/manager_portal.sql to the First Class submissions project.':error.message);}
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,(error,key)=>error?reject(error):resolve(key)));
export async function hashPassword(password:string){if(password.length<8||password.length>128)throw Error('Use a password between 8 and 128 characters.');const salt=randomBytes(16).toString('hex');return salt+':'+(await derive(password,salt)).toString('hex');}
export async function verifyPassword(password:string,hash:string|null){const [salt,key]=(hash||'0'.repeat(32)+':'+'0'.repeat(128)).split(':');const actual=await derive(password.slice(0,129),salt);return Boolean(hash)&&key.length===128&&timingSafeEqual(actual,Buffer.from(key,'hex'));}
export function publicAccount(a:ManagerAccount){return {id:a.id,managerKey:a.manager_key,name:a.display_name,username:a.username,enabled:a.enabled,passwordSet:Boolean(a.password_hash),passwordChangedAt:a.password_changed_at,version:a.version};}
export async function syncAccounts(){
 const db=database();const settings=await db.from('poster_templates').select('template_json').eq('name','manager-assignment-settings').maybeSingle();check(settings.error);
 const saved=await db.from(accounts).select('*').order('number');check(saved.error);
 const assignment=settings.data?.template_json?.assignments||{},names:Record<string,string>=assignment.managerNames||{},groups:Record<string,string>=assignment.managerGroups||{};
 const norm=recruitmentManagerIdentity;
 const loginName=(name:string)=>name.replace(/^team\s+/i,'').trim().toUpperCase().slice(0,60);
 const deleted=new Set((assignment.deletedManagers||[]).map(norm));
 const candidates=new Map<string,string>();
 const discovered=await managerAssignments();
 if(discovered.ok){const data=await discovered.json();for(const m of data.managers||[])if(m.group!=='Excluded'&&!deleted.has(norm(m.key)))candidates.set(norm(m.key),m.name);}
 for(const raw of [...new Set([...Object.keys(groups),...Object.keys(names)])].sort()){
  const key=norm(raw),group=Object.entries(groups).find(([k])=>norm(k)===key)?.[1];
  if(deleted.has(key)||group==='Excluded')continue;
  const label=Object.entries(names).find(([k])=>norm(k)===key)?.[1]||raw.split('@')[0].replace(/^firstclassagency[_.-]?/i,'').replace(/[_.-]/g,' ');
  candidates.set(key,label);
 }
 for(const [key,name]of candidates){const existing=(saved.data||[]).find(a=>a.manager_key===key);if(!existing){for(let attempt=0;attempt<20;attempt++){const r=await db.from(accounts).insert({manager_key:key,display_name:name,username:loginName(name)+(attempt?' '+(attempt+1):'')});if(!r.error)break;if(r.error.code!=='23505')check(r.error);const concurrent=await db.from(accounts).select('id').eq('manager_key',key).maybeSingle();check(concurrent.error);if(concurrent.data)break;if(attempt===19)throw Error('Could not allocate a unique manager username. Please try again.');}}else if(existing.display_name!==name){const r=await db.from(accounts).update({display_name:name,username:loginName(name),version:existing.version+1}).eq('id',existing.id);check(r.error);}}
 const result=await db.from(accounts).select('*').order('number');check(result.error);return (result.data as ManagerAccount[]).map(publicAccount);
}
export async function accountForSession(token?:string){if(!token||!/^[a-f0-9]{64}$/.test(token))return null;const db=database(),s=await db.from(sessions).select('*').eq('token_hash',digest(token)).gt('expires_at',new Date().toISOString()).maybeSingle();check(s.error);if(!s.data)return null;const a=await db.from(accounts).select('*').eq('id',s.data.account_id).eq('enabled',true).eq('version',s.data.version).maybeSingle();check(a.error);return a.data as ManagerAccount|null;}
export async function createSession(a:ManagerAccount){const token=randomBytes(32).toString('hex');const r=await database().from(sessions).insert({token_hash:digest(token),account_id:a.id,version:a.version,expires_at:new Date(Date.now()+7*86400000).toISOString()});check(r.error);return token;}
export async function endSession(token?:string){if(token){const r=await database().from(sessions).delete().eq('token_hash',digest(token));check(r.error);}}
export async function limitAttempt(key:string){const r=await database().rpc('manager_portal_attempt',{bucket:digest(key)});check(r.error);if(!r.data)throw Error('Too many attempts. Try again in 15 minutes.');}
export async function loginManager(username:string,password:string,ip:string){await limitAttempt('ip:'+ip);await limitAttempt('name:'+username.toUpperCase());const r=await database().from(accounts).select('*').eq('username',username.trim().toUpperCase()).maybeSingle();check(r.error);const valid=await verifyPassword(password,r.data?.password_hash||null);if(!valid||!r.data?.enabled)throw Error('Incorrect username or password.');return r.data as ManagerAccount;}
export async function updateAccount(id:string,version:number,values:{username?:string;password?:string;enabled?:boolean}){
 const patch:Record<string,unknown>={version:version+1,updated_at:new Date().toISOString()};
 if(values.username!==undefined){const username=values.username.trim().toUpperCase();if(username.length<1||username.length>64||!/[A-Z0-9]/.test(username)||/[\x00-\x1f\x7f]/.test(username))throw Error('Use a manager name between 1 and 64 characters.');patch.username=username;}
 if(values.password!==undefined){patch.password_hash=await hashPassword(values.password);patch.password_changed_at=new Date().toISOString();}
 if(values.enabled!==undefined)patch.enabled=values.enabled;
 const r=await database().from(accounts).update(patch).eq('id',id).eq('version',version).select('*').maybeSingle();if(r.error?.code==='23505')throw Error('That username is already in use.');check(r.error);if(!r.data)throw Error('This account changed. Refresh and try again.');return r.data as ManagerAccount;
}
