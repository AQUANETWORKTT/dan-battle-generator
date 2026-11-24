import {NextRequest,NextResponse} from 'next/server';
import {posterWorkerAllowed,resumeTeamPosterPreparation} from '@/lib/team-poster-preparation';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=300;
async function run(req:NextRequest){
 const auth=req.headers.get('authorization');const cron=process.env.CRON_SECRET;
 if(!posterWorkerAllowed(auth)&&!(cron&&auth===`Bearer ${cron}`))return NextResponse.json({error:'Not authorised.'},{status:401});
 await resumeTeamPosterPreparation();return NextResponse.json({accepted:true});
}
export const GET=run;
export const POST=run;
