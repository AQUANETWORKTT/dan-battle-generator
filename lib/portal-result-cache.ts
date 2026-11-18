import 'server-only';
import {gzipSync,gunzipSync} from 'node:zlib';
import {unstable_cache} from 'next/cache';
import {PORTAL_DATA_TAG} from './manager-portal-cache';
import {localPortalSnapshot} from './local-portal-snapshot';

// Prepare each agency-wide result once, then apply the authenticated team scope.
// Compression keeps the full roster below the hosting cache entry size limit.
export function portalResultCache<T>(build:(allFirstClass:boolean)=>Promise<T>,version:string){
 const cached=unstable_cache(async(allFirstClass:boolean,_day:string)=>gzipSync(JSON.stringify(await build(allFirstClass))).toString('base64'),[version],{revalidate:false,tags:[PORTAL_DATA_TAG]});
 return async(allFirstClass:boolean):Promise<T>=>{
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const result=await localPortalSnapshot([version,allFirstClass,day],()=>cached(allFirstClass,day));
  return JSON.parse(gunzipSync(Buffer.from(result,'base64')).toString('utf8')) as T;
 };
}
