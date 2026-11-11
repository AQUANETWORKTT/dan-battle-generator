import {STAR_COOKIE,starSessionValid} from '@/lib/star-tracker-auth';
import {NextRequest,NextResponse} from 'next/server';
import {readTracker,saveStarAward,bulkStarAwards,starTrackerBackup,StarConflict} from '@/lib/star-tracker-store';
import {validStarInput,validStarBulkInput} from '@/lib/star-tracker';
export const dynamic='force-dynamic';
function denied(){return ['atlas','events'].includes(process.env.SITE_MODE||'');}
export async function GET(req:NextRequest){
 if(!starSessionValid(req.cookies.get(STAR_COOKIE)?.value))return NextResponse.json({error:'Streamer login required.'},{status:401});
 if(denied())return NextResponse.json({error:'Star Tracker is not available on this site.'},{status:404});
 try{
  if(req.nextUrl.searchParams.get('backup')==='1')return NextResponse.json(await starTrackerBackup(),{headers:{'Cache-Control':'private, no-store','Content-Disposition':'attachment; filename="first-class-star-tracker-backup.json"'}});
  return NextResponse.json(await readTracker(),{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not load the Star Tracker.'},{status:500});}
}
export async function POST(req:NextRequest){
 if(!starSessionValid(req.cookies.get(STAR_COOKIE)?.value))return NextResponse.json({error:'Streamer login required.'},{status:401});
 if(denied())return NextResponse.json({error:'Star Tracker is not available on this site.'},{status:404});
 const origin=req.headers.get('origin'),host=req.headers.get('host')||req.nextUrl.host;
 if(origin&&origin!==req.nextUrl.protocol+'//'+host)return NextResponse.json({error:'Origin not allowed.'},{status:403});
 try{const input=await req.json();if(!validStarBulkInput(input))return NextResponse.json({error:'Choose a campaign, a nonzero whole-number adjustment and up to 2,000 valid usernames.'},{status:400});return NextResponse.json(await bulkStarAwards(input),{headers:{'Cache-Control':'private, no-store'}});}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Bulk save failed. Retry the same request to safely continue.'},{status:500});}
}
export async function PATCH(req:NextRequest){
 if(!starSessionValid(req.cookies.get(STAR_COOKIE)?.value))return NextResponse.json({error:'Streamer login required.'},{status:401});
 if(denied())return NextResponse.json({error:'Star Tracker is not available on this site.'},{status:404});
 const origin=req.headers.get('origin'),host=req.headers.get('host')||req.nextUrl.host;
 if(origin&&origin!==req.nextUrl.protocol+'//'+host)return NextResponse.json({error:'Origin not allowed.'},{status:403});
 try{
  const input=await req.json();if(!validStarInput(input))return NextResponse.json({error:'Enter a whole number from 0 to 1,000,000. Manual Star Adjustments also allow negative numbers down to −1,000,000.'},{status:400});
  return NextResponse.json({award:await saveStarAward(input)},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){if(error instanceof StarConflict)return NextResponse.json({error:error.message,award:error.award},{status:409});return NextResponse.json({error:error instanceof Error?error.message:'Could not save stars. Your change has been kept on screen.'},{status:500});}
}
