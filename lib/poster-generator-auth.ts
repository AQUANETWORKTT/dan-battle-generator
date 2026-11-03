import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
export const POSTER_COOKIE='first-class-poster-generator-auth';
const ttl=30*24*60*60;
function secret(){return process.env.POSTER_GENERATOR_SESSION_SECRET||process.env.CREATOR_SEARCH_SESSION_SECRET||process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY||process.env.ATLAS_SESSION_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||'';}
export function posterSessionToken(now=Date.now()){
  const key=secret();if(key.length<32)return null;
  const payload=`poster.${Math.floor(now/1000)+ttl}`;
  return payload+'.'+createHmac('sha256',key).update(payload).digest('hex');
}
export function posterSessionValid(token:string|undefined,now=Date.now()){
  const key=secret();if(!token||key.length<32)return false;
  const parts=token.split('.');if(parts.length!==3||parts[0]!=='poster'||!/^\d+$/.test(parts[1])||!/^[a-f0-9]{64}$/.test(parts[2]))return false;
  const expiry=Number(parts[1]);if(expiry<=Math.floor(now/1000)||expiry>Math.floor(now/1000)+ttl+60)return false;
  const expected=createHmac('sha256',key).update(parts.slice(0,2).join('.')).digest('hex');
  return timingSafeEqual(Buffer.from(expected),Buffer.from(parts[2]));
}
