import {NextRequest,NextResponse} from 'next/server';
import {SEARCH_COOKIE,searchSessionValid} from '@/lib/creator-api-search/auth';
import {parseLookupNames,lookupResults} from '@/lib/bulk-creator-lookup';
import {lookupAssignments,lookupCreatorRows,lookupManagerHistory} from '@/lib/bulk-creator-lookup-server';
export const dynamic='force-dynamic';
export const maxDuration=120;
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
function authorized(req:NextRequest){return !['atlas','events'].includes(process.env.SITE_MODE||'')&&searchSessionValid(req.cookies.get(SEARCH_COOKIE)?.value);}
export async function POST(req:NextRequest){
 if(!authorized(req))return json({error:'Leadership access required.'},401);
 try{
  const body=await req.json();if(typeof body.usernames!=='string')return json({error:'Paste one username per line.'},400);
  const names=parseLookupNames(body.usernames);if(!names.length)return json({error:'Paste at least one username.'},400);
  const [rows,assignments]=await Promise.all([lookupCreatorRows(names),lookupAssignments()]);
  return json(lookupResults(names,rows,assignments));
 }catch(e){return json({error:e instanceof Error?e.message:'Could not check creators.'},500);}
}
export async function GET(req:NextRequest){
 if(!authorized(req))return json({error:'Leadership access required.'},401);
 const id=req.nextUrl.searchParams.get('creatorId')||'';
 if(!/^\d{10,}$/.test(id))return json({error:'Invalid Creator ID.'},400);
 try{return json({history:await lookupManagerHistory(id,await lookupAssignments())});}
 catch(e){return json({error:e instanceof Error?e.message:'Could not load history.'},500);}
}
