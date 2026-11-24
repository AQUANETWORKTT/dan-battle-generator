import {NextRequest,NextResponse} from 'next/server';
import {SEARCH_COOKIE,searchSessionValid} from '@/lib/creator-api-search/auth';
import {preparedPosterStatus,downloadPreparedPoster,queueTeamPosterPreparation,resumeTeamPosterPreparation} from '@/lib/team-poster-preparation';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=300;
export async function GET(req:NextRequest){
 if(!searchSessionValid(req.cookies.get(SEARCH_COOKIE)?.value))return NextResponse.json({error:'Owner access required.'},{status:403});
 try{
  const name=req.nextUrl.searchParams.get('file');if(name){const file=await downloadPreparedPoster(req.nextUrl.searchParams.get('generation')||'',name);return new Response(file.blob,{headers:{'Content-Type':'image/png','Content-Disposition':`attachment; filename="${file.filename}"`,'Cache-Control':'private, no-store'}});}
  const status=await preparedPosterStatus();if(status.phase==='queued'||status.stalled)await resumeTeamPosterPreparation();return NextResponse.json(status,{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not load prepared posters.'},{status:409});}
}
export async function POST(req:NextRequest){
 if(!searchSessionValid(req.cookies.get(SEARCH_COOKIE)?.value))return NextResponse.json({error:'Owner access required.'},{status:403});
 if(req.headers.get('origin')&&req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Origin not allowed.'},{status:403});
 try{await queueTeamPosterPreparation(req.nextUrl.origin);return NextResponse.json({queued:true});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not queue posters.'},{status:500});}
}
