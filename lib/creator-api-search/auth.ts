import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
export const SEARCH_COOKIE='first-class-creator-api-auth';
const ttl=30*24*60*60;
function secret(){return process.env.CREATOR_SEARCH_SESSION_SECRET||process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY||'';}
// Issued only by the existing successful leadership login. The legacy plain
// portal flag alone must not unlock server keys, paid API calls or private jobs.
export function searchSessionToken(){const key=secret();if(key.length<32)return null;const value=`leadership.${Math.floor(Date.now()/1000)+ttl}`;return value+'.'+createHmac('sha256',key).update(value).digest('hex');}
export function searchSessionValid(token:string|undefined){const key=secret();if(!token||key.length<32)return false;const parts=token.split('.');if(parts.length!==3||parts[0]!=='leadership'||!/^\d+$/.test(parts[1])||!/^[a-f0-9]{64}$/.test(parts[2]))return false;const expiry=Number(parts[1]),now=Math.floor(Date.now()/1000);if(expiry<=now||expiry>now+ttl+60)return false;const expected=createHmac('sha256',key).update(parts.slice(0,2).join('.')).digest('hex');return timingSafeEqual(Buffer.from(expected),Buffer.from(parts[2]));}
