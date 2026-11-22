import {NextRequest,NextResponse} from 'next/server';
import {SEARCH_COOKIE,searchSessionValid} from '@/lib/creator-api-search/auth';
import {database} from '@/lib/creator-api-search/db';
import {portalResultCache} from '@/lib/portal-result-cache';
import {h2hDirectoryMembers} from '@/lib/h2h-export-directory';
import {h2hUsername} from '@/lib/h2h-export-groups';

// Export membership is a roster/assignment lookup, not an earnings or activity filter.
const directory=portalResultCache(async()=>{
 const db=database();
 const [latest,settings]=await Promise.all([
  db.from('creator_daily_stats').select('stat_date').or('data_period.is.null,data_period.neq.mature_month_total').order('stat_date',{ascending:false}).limit(1).maybeSingle(),
  db.from('poster_templates').select('template_json').eq('name','manager-assignment-settings').maybeSingle(),
 ]);
 if(latest.error||settings.error||!latest.data)throw Error('Agency roster unavailable.');
 const rows:Record<string,unknown>[]=[];
 for(let from=0;;from+=1000){
  const page=await db.from('creator_daily_stats').select('id,creator_username,manager_email,email,group_name,agency,team').eq('stat_date',latest.data.stat_date).or('data_period.is.null,data_period.neq.mature_month_total').order('id').range(from,from+999);
  if(page.error)throw Error(page.error.message);rows.push(...page.data);if(page.data.length<1000)break;
 }
 return {latest:latest.data.stat_date,members:h2hDirectoryMembers(rows,settings.data?.template_json?.assignments||{})};
},'h2h-export-assignment-directory-v1');

export async function POST(request:NextRequest){
 if(!searchSessionValid(request.cookies.get(SEARCH_COOKIE)?.value))return NextResponse.json({error:'Sign in through Leadership to use agency-only exports.'},{status:401});
 try{
  const {usernames}=await request.json();
  if(!Array.isArray(usernames)||usernames.length>1000||usernames.some(name=>typeof name!=='string'||name.length>100))return NextResponse.json({error:'Invalid creator list.'},{status:400});
  const wanted=new Set(usernames.map(h2hUsername)),saved=await directory(true);
  return NextResponse.json({members:saved.members.filter(member=>wanted.has(h2hUsername(member.username))),latest:saved.latest},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Could not check agency creators. No export was started.'},{status:500});}
}
