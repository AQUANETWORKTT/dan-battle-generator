import {database} from '@/lib/creator-api-search/db';
import {localStarAvatar} from '@/lib/star-leaderboard';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'public, max-age=3600, s-maxage=21600','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request){
 if(process.env.SITE_MODE==='atlas')return new Response(null,{status:404});
 const username=new URL(request.url).searchParams.get('username')||'';
 if(!/^[a-zA-Z0-9._]{1,24}$/.test(username))return new Response(null,{status:400});
 try{
  if(process.env.SITE_MODE==='events'){
   const response=await fetch('https://firstclassagency.management/api/star-leaderboard/avatar?username='+encodeURIComponent(username),{next:{revalidate:21600},signal:AbortSignal.timeout(18000)});
   return new Response(await response.arrayBuffer(),{status:response.status,headers:{...headers,'Content-Type':response.headers.get('content-type')||'image/jpeg',...(!response.ok?{'Cache-Control':'public, max-age=60, s-maxage=60'}:{})}});
  }
  const local=localStarAvatar(username);
  if(local){const picture=await fetch('https://firstclassagency.management'+local,{next:{revalidate:21600},signal:AbortSignal.timeout(8000)});if(picture.ok)return new Response(await picture.arrayBuffer(),{headers:{...headers,'Content-Type':'image/jpeg'}});}
  // Reuse pictures already supplied to the poster system when available.
  const saved=await database().from('poster_templates').select('template_json').eq('name','fallback-avatar-entry-'+username.toLowerCase()).maybeSingle();
  const image=String(saved.data?.template_json?.avatar?.imageUrl||'');
  const inline=image.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([a-zA-Z0-9+/=\r\n]+)$/);
  if(inline)return new Response(Buffer.from(inline[2],'base64'),{headers:{...headers,'Content-Type':inline[1]}});
  const profile=await fetch('https://www.tiktok.com/@'+encodeURIComponent(username),{headers:{'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1','Accept-Language':'en-GB,en;q=0.9'},next:{revalidate:21600},signal:AbortSignal.timeout(8000)});
  const html=await profile.text();
  const match=html.match(/"avatarLarger":"(.*?)"/)||html.match(/"avatarMedium":"(.*?)"/)||html.match(/"avatarThumb":"(.*?)"/);
  if(!match)throw Error('Picture unavailable');
  const url=new URL(match[1].replace(/\\u002F/g,'/').replace(/\\u0026/g,'&').replace(/&amp;/g,'&'));
  if(url.protocol!=='https:'||!/(^|\.)(tiktokcdn(?:-[a-z]+)?\.com|tiktok\.com|muscdn\.com|ibytedtos\.com|byteoversea\.com)$/.test(url.hostname))throw Error('Unexpected image host');
  const picture=await fetch(url,{headers:{Referer:'https://www.tiktok.com/'},next:{revalidate:21600},signal:AbortSignal.timeout(8000),redirect:'error'});
  if(!picture.ok||!picture.headers.get('content-type')?.startsWith('image/'))throw Error('Picture unavailable');
  return new Response(await picture.arrayBuffer(),{headers:{...headers,'Content-Type':picture.headers.get('content-type')!}});
 }catch{return new Response(null,{status:404,headers:{'Cache-Control':'public, max-age=60, s-maxage=60'}});}
}
