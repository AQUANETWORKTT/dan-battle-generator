import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
const ttl=30*86400;
function secret(){return process.env.CREATOR_SEARCH_SESSION_SECRET||process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY||'';}
export function managerViewToken(){const key=secret();if(key.length<32)throw Error('Configure the existing Creator API Search server credentials.');const message=`available-creators.${Math.floor(Date.now()/1000)+ttl}`;return message+'.'+createHmac('sha256',key).update(message).digest('hex');}
export function managerViewAllowed(token:string|null){
  const key=secret(),parts=(token||'').split('.');
  if(key.length<32||parts.length!==3||parts[0]!=='available-creators'||!/^\d+$/.test(parts[1])||!/^[a-f0-9]{64}$/.test(parts[2]))return false;
  const now=Math.floor(Date.now()/1000),expiry=Number(parts[1]);if(expiry<=now||expiry>now+ttl+60)return false;
  const signature=createHmac('sha256',key).update(parts.slice(0,2).join('.')).digest('hex');return timingSafeEqual(Buffer.from(signature),Buffer.from(parts[2]));
}

export function creatorActionToken(row:{username:string;creatorId?:string}){
  const payload=Buffer.from(JSON.stringify({username:row.username,creatorId:row.creatorId,expires:Date.now()+86400000})).toString('base64url');
  return payload+'.'+createHmac('sha256',secret()).update('creator-action:'+payload).digest('hex');
}
export function creatorActionIdentity(token:unknown,name:unknown):{username:string;creatorId?:string}|null{
  if(typeof token!=='string'||token.length>2000)return null;
  const [payload,signature]=token.split('.');if(!payload||!/^[a-f0-9]{64}$/.test(signature||''))return null;
  const expected=createHmac('sha256',secret()).update('creator-action:'+payload).digest('hex');
  if(!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;
  try{const row=JSON.parse(Buffer.from(payload,'base64url').toString());return row.username===name&&row.expires>Date.now()?row:null;}catch{return null;}
}
