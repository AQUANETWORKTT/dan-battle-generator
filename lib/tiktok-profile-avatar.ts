import 'server-only';

// Shared by the poster generator and Available Creators.
export async function scrapeTikTokAvatar(username:string){
  const response=await fetch(`https://www.tiktok.com/@${encodeURIComponent(username)}`,{
    headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'},
    cache:'no-store',signal:AbortSignal.timeout(15000),
  });
  if(!response.ok)throw new Error('TikTok could not load this profile picture.');
  const html=await response.text();
  const match=html.match(/"avatarLarger":"(.*?)"/)||html.match(/"avatarMedium":"(.*?)"/)||html.match(/"avatarThumb":"(.*?)"/);
  if(!match)return null;
  return match[1].replace(/\\u002F/g,'/').replace(/\\u0026/g,'&');
}
