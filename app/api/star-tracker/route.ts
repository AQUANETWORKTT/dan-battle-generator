import {NextRequest,NextResponse} from 'next/server';
import {starAccess} from '@/lib/star-tracker-auth';
import {readTracker,saveStarAward,StarConflict} from '@/lib/star-tracker-store';
import {validStarInput} from '@/lib/star-tracker';
export const dynamic='force-dynamic';
function denied(req:NextRequest){return !starAccess(req.cookies)||['atlas','events'].includes(process.env.SITE_MODE||'');}
export async function GET(req:NextRequest){
 if(denied(req))return NextResponse.json({error:'Sign in with Leadership or Ash Onboarding access.'},{status:401});
 try{return NextResponse.json(await readTracker(),{headers:{'Cache-Control':'private, no-store'}});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not load the Star Tracker.'},{status:500});}
}
export async function PATCH(req:NextRequest){
 if(denied(req))return NextResponse.json({error:'Sign in with Leadership or Ash Onboarding access.'},{status:401});
 const origin=req.headers.get('origin'),host=req.headers.get('host')||req.nextUrl.host;
 if(origin&&origin!==req.nextUrl.protocol+'//'+host)return NextResponse.json({error:'Origin not allowed.'},{status:403});
 try{
  const input=await req.json();if(!validStarInput(input))return NextResponse.json({error:'Enter a whole number of stars from 0 to 1,000,000.'},{status:400});
  return NextResponse.json({award:await saveStarAward(input)},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){if(error instanceof StarConflict)return NextResponse.json({error:error.message,award:error.award},{status:409});return NextResponse.json({error:error instanceof Error?error.message:'Could not save stars. Your change has been kept on screen.'},{status:500});}
}
