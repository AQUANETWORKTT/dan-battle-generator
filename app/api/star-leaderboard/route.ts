import {NextResponse} from 'next/server';
import {readTracker} from '@/lib/star-tracker-store';
import {database} from '@/lib/creator-api-search/db';
import {managerIdentity} from '@/lib/star-tracker';
import {starStandings,teamLabel} from '@/lib/star-leaderboard';
export const dynamic='force-dynamic';
export async function GET(){
 if(process.env.SITE_MODE==='atlas')return NextResponse.json({error:'Not found'},{status:404});
 try{
  // The creator deployment reads the same live totals without needing access
  // to the private database or exposing editing endpoints on the creator site.
  if(process.env.SITE_MODE==='events'){
   const response=await fetch('https://firstclassagency.management/api/star-leaderboard',{cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error('Standings unavailable');
   return NextResponse.json(await response.json(),{headers:{'Cache-Control':'public, max-age=0, s-maxage=15'}});
  }
  const data=await readTracker(),db=database();
  const settings=await db.from('poster_templates').select('template_json').eq('name','manager-assignment-settings').maybeSingle();
  if(settings.error)throw Error('Team names unavailable');
  const names:Record<string,string>={};for(const [id,name] of Object.entries(settings.data?.template_json?.assignments?.managerNames||{}))names[managerIdentity(id)]=String(name);
  const teams:Record<string,string>={};
  if(data.latestDate)for(let from=0;;from+=1000){
   const result=await db.from('creator_daily_stats').select('creator_id,manager_email,email').eq('stat_date',data.latestDate).or('data_period.is.null,data_period.neq.mature_month_total').order('creator_id').range(from,from+999);
   if(result.error)throw Error('Team names unavailable');
   for(const row of result.data||[]){const manager=String(row.manager_email||row.email||'');teams[String(row.creator_id)]=teamLabel(manager,names[managerIdentity(manager)]);}
   if((result.data||[]).length<1000)break;
  }
  return NextResponse.json({standings:starStandings(data.creators,teams),updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=0, s-maxage=15'}});
 }catch{return NextResponse.json({error:'The jungle standings are temporarily unavailable. Please try again shortly.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
