import {NextRequest,NextResponse} from 'next/server';
import {MANAGER_COOKIE,accountForSession} from '@/lib/manager-portal';
import {GET as templates} from '@/app/api/poster-templates/route';
import {GET as fallbackAvatars} from '@/app/api/data-analysis/fallback-avatars/route';
import {POST as avatar} from '@/app/api/tiktok-avatar/route';
import {GET as avatarImage} from '@/app/api/tiktok-avatar-image/route';

function safeImage(raw:string|null){
  try{const url=new URL(raw||'');return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&/(^|\.)(tiktokcdn(?:-[a-z]+)?\.com|tiktokcdn\.us|tiktokv\.com|tiktok\.com|byteoversea\.com|ibytedtos\.com|ibyteimg\.com|byteimg\.com|muscdn\.com)$/i.test(url.hostname);}catch{return false;}
}
async function handle(request:NextRequest,context:{params:Promise<{path:string[]}>}){
  const path=(await context.params).path.join('/'),origin=request.headers.get('origin');
  // Next normalises localhost URLs; compare the actual request Host as well
  // so a local 127.0.0.1 login remains a same-origin request.
  const requestOrigin=request.nextUrl.protocol+'//'+(request.headers.get('host')||request.nextUrl.host);
  if(request.method!=='GET'&&origin&&origin!==requestOrigin)return NextResponse.json({error:'Origin not allowed.'},{status:403});
  let account=null;try{account=await accountForSession(request.cookies.get(MANAGER_COOKIE)?.value);}catch{}
  if(!account)return NextResponse.json({error:'Manager login required.'},{status:401});
  if(request.method==='GET'&&path==='templates'){
    const response=await templates();if(!response.ok)return response;
    const data=await response.json();
    const allowed=new Set(Array.isArray(data.managerTemplateIds)?data.managerTemplateIds:[]);
    const visible=(data.templates||[]).filter((row:{id:string})=>allowed.has(row.id));
    const visibleIds=new Set(visible.map((row:{id:string})=>row.id));
    const defaults=Object.fromEntries(Object.entries(data.defaults||{}).filter(([,id])=>visibleIds.has(id)));
    return NextResponse.json({templates:visible,defaults});
  }
  if(request.method==='GET'&&path==='fallback-avatars'){
    const response=await fallbackAvatars();if(!response.ok)return response;
    const data=await response.json();return NextResponse.json({avatars:(data.avatars||[]).filter((row:{imageUrl?:string})=>Boolean(row.imageUrl))});
  }
  if(request.method==='POST'&&path==='avatar'){
    const body=await request.clone().json().catch(()=>({}));
    if(!/^[a-zA-Z0-9._]{1,24}$/.test(String(body.username||'').replace(/^@/,'')))return NextResponse.json({error:'Invalid username.'},{status:400});
    return avatar(request);
  }
  if(request.method==='GET'&&path==='avatar-image'){
    if(!safeImage(request.nextUrl.searchParams.get('url')))return NextResponse.json({error:'Unsupported picture source.'},{status:400});
    return avatarImage(request);
  }
  return NextResponse.json({error:'This Poster Generator only creates posters from saved designs.'},{status:403});
}
export const GET=handle;
export const POST=handle;
export const PUT=handle;
export const DELETE=handle;
