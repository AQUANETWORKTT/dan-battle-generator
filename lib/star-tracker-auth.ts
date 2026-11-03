import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {SEARCH_COOKIE,searchSessionValid} from './creator-api-search/auth';
export const STAR_COOKIE='first-class-star-tracker-auth';
const ttl=30*86400;
function secret(){return process.env.CREATOR_SEARCH_SESSION_SECRET||process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY||'';}
export function starSessionToken(now=Date.now()){
 const key=secret();if(key.length<32)return null;const payload='star-tracker.'+(Math.floor(now/1000)+ttl);return payload+'.'+createHmac('sha256',key).update(payload).digest('hex');
}
export function starSessionValid(token:string|undefined,now=Date.now()){
 const key=secret();if(!token||key.length<32)return false;const p=token.split('.');if(p.length!==3||p[0]!=='star-tracker'||!/^\d+$/.test(p[1])||!/^[a-f0-9]{64}$/.test(p[2]))return false;
 if(Number(p[1])<=Math.floor(now/1000)||Number(p[1])>Math.floor(now/1000)+ttl+60)return false;
 return timingSafeEqual(Buffer.from(createHmac('sha256',key).update(p.slice(0,2).join('.')).digest('hex')),Buffer.from(p[2]));
}
export function starAccess(cookies:{get(name:string):{value:string}|undefined}){return searchSessionValid(cookies.get(SEARCH_COOKIE)?.value)||starSessionValid(cookies.get(STAR_COOKIE)?.value);}
