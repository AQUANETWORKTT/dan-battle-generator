import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {accountForSession,MANAGER_COOKIE} from '@/lib/manager-portal';
import {MANAGER_POSTER_COOKIE} from '@/lib/manager-portal-mode';
import {database} from '@/lib/creator-api-search/db';

export async function POST(request:NextRequest){
 const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(['atlas','events'].includes(process.env.SITE_MODE||''))return json({error:'Not found'},404);
 const origin=request.headers.get('origin'),expected=request.nextUrl.protocol+'//'+(request.headers.get('host')||request.nextUrl.host);
 if(origin&&origin!==expected)return json({error:'Invalid request origin.'},403);
 try{
  const token=request.cookies.get(MANAGER_COOKIE)?.value||request.cookies.get(MANAGER_POSTER_COOKIE)?.value,account=await accountForSession(token);
  if(!account)return json({error:'Please sign in.'},401);
  const body=await request.json();
  if(!Number.isInteger(body.seconds)||body.seconds<0||body.seconds>30)return json({error:'Invalid activity interval.'},400);
  const now=Date.now(),session=createHash('sha256').update(token!).digest('hex').slice(0,16);
  const result=await database().from('manager_portal_limits').upsert({
   key:`audit:activity:${account.id}:${session}:${Math.floor(now/30000)}`,
   started_at:new Date(now).toISOString(),attempts:body.seconds,
  },{onConflict:'key',ignoreDuplicates:true});
  if(result.error)throw Error(result.error.message);
  return json({ok:true});
 }catch(error){return json({error:error instanceof Error?error.message:'Could not record activity.'},400);}
}
