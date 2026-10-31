import {NextRequest,NextResponse} from 'next/server';
import {databaseConfigured} from '@/lib/creator-api-search/db';
import {ProviderError} from '@/lib/creator-api-search/provider';
import {SEARCH_COOKIE,searchSessionValid} from '@/lib/creator-api-search/auth';
import * as service from '@/lib/creator-api-search/service';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
async function handle(req:NextRequest){
 const path=req.nextUrl.pathname.replace(/^\/api\/creator-api-search\//,'').split('/');
 if(path[0]==='worker'){
  if(!service.workerAllowed(req.headers.get('authorization')))return NextResponse.json({error:'Worker authentication required.'},{status:401});
 }else{
  const setupOnly=path[0]==='config'&&req.method==='GET'&&!databaseConfigured();
  if(req.cookies.get('first-class-space-auth')?.value!=='true'||(!setupOnly&&!searchSessionValid(req.cookies.get(SEARCH_COOKIE)?.value)))return NextResponse.json({error:'Leadership access required. Sign in again through the existing Leadership login after configuring the server credentials.'},{status:401});
  if(req.method!=='GET'&&req.headers.get('origin')&&req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
 }
 try{
  if(path[0]==='config'&&req.method==='GET')return NextResponse.json(await service.configuration());
  if(!databaseConfigured())return NextResponse.json({error:'Configure SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY and run supabase/creator_api_search.sql in the First Class project. This migration adds new feature tables only.'},{status:503});
  if(path[0]==='worker'){
   if(path[1]==='contacts'&&req.method==='POST')return NextResponse.json(await service.syncContacts(await req.json()));
   if(path[1]==='active'&&path[2]&&req.method==='POST'){const body=await req.json();return NextResponse.json({active:await service.workerJobActive(path[2],String(body.leaseToken||''))});}
   if(path[1]==='claim'&&req.method==='POST'){const body=await req.json();return NextResponse.json({job:await service.claimJob(body.ready===true)});}
   if(path[1]==='results'&&path[2]&&req.method==='POST')return NextResponse.json(await service.completeJob(path[2],await req.json()));
  }
  if(path[0]==='contacts'&&req.method==='GET')return NextResponse.json(await service.contacts(req.nextUrl.searchParams.get('cursor')));
  if(path[0]==='changes'&&req.method==='GET')return NextResponse.json(await service.eligibilityChanges());
  if(path[0]==='scans'&&req.method==='POST'){const body=await req.json();return NextResponse.json({run:await service.newScan(body.previousRunId)},{status:201});}
  if(path[0]==='runs'){
   if(path[2]==='stop'&&req.method==='POST')return NextResponse.json({run:await service.stopScan(path[1])});
   if(path.length===1&&req.method==='GET')return NextResponse.json({runs:await service.history(req.nextUrl.searchParams.get('before'))});
   if(path.length===1&&req.method==='POST')return NextResponse.json({run:await service.createRun()},{status:201});
   if(path.length===2&&req.method==='GET')return NextResponse.json({run:await service.withEligibility(await service.getRun(path[1]))});
   if(path[2]==='advance'&&req.method==='POST')return NextResponse.json({run:await service.withEligibility(await service.advance(path[1]))});
   if(path[2]==='retry'&&req.method==='POST')return NextResponse.json({run:await service.withEligibility(await service.advance(path[1],true))});
   if(path[2]==='eligibility'&&req.method==='POST'){const body=await req.json();return NextResponse.json(await service.queueChecks(path[1],body.usernames));}
  }
  if(path[0]==='creator'&&path[1]&&req.method==='GET')return NextResponse.json(await service.creatorEndpoint(path[1],path[2]||'profile',req.nextUrl.searchParams));
  return NextResponse.json({error:'Creator API Search endpoint not found.'},{status:404});
 }catch(e){const status=e instanceof service.SearchError?e.status:e instanceof ProviderError?e.status:500;return NextResponse.json({error:e instanceof Error?e.message:'Creator API Search request failed.',...(e instanceof ProviderError?{retryAt:e.retryAt,retryable:e.retryable,quota:e.quota}:{})},{status});}
}
export const GET=handle;
export const POST=handle;
