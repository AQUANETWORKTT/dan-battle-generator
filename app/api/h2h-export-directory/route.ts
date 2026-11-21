import {NextRequest,NextResponse} from 'next/server';
import {SEARCH_COOKIE,searchSessionValid} from '@/lib/creator-api-search/auth';
import {loadOverview} from '@/lib/manager-overview-server';
import {h2hUsername} from '@/lib/h2h-export-groups';

export async function POST(request:NextRequest){
 if(!searchSessionValid(request.cookies.get(SEARCH_COOKIE)?.value))return NextResponse.json({error:'Sign in through Leadership to use agency-only exports.'},{status:401});
 try{
  const {usernames}=await request.json();
  if(!Array.isArray(usernames)||usernames.length>1000||usernames.some(name=>typeof name!=='string'||name.length>100))return NextResponse.json({error:'Invalid creator list.'},{status:400});
  const wanted=new Set(usernames.map(h2hUsername)),overview=await loadOverview(null,true);
  const members=overview.creators.flatMap(creator=>{
   if(!wanted.has(h2hUsername(creator.username)))return [];
   const ownerDan=['firstclassagencydan','firstclassagencyjames'].includes(creator.managerKey),ownerMike=['firstclassindi','mikehalesjb'].includes(creator.managerKey);
   const group=ownerDan?'Team Dan / James':ownerMike||creator.group==='Unassigned'?'Team Mike / Indi':creator.group;
   if(!group||['Excluded','New Managers','Recruitment'].includes(group))return [];
   return [{username:creator.username,group,manager:ownerDan?'Team Dan & James':ownerMike?'Team Mike & Indi':creator.manager||'Team Mike & Indi'}];
  });
  return NextResponse.json({members,latest:overview.latest},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Could not check agency creators. No export was started.'},{status:500});}
}
