import 'server-only';
import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import type {Browser} from 'playwright-core';
import {fallbackAvatarFor,type TeamPosterTemplate} from './team-poster-model';


const escape=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const localAvatars:Record<string,string>={cerilaw83:'/avatars/cerilaw83.jpg',serenitetiktok:'/avatars/cerilaw83.jpg',tictock739:'/avatars/tictock739.jpg',kaylanortheast:'/avatars/kayla_northeast.jpg',lozza2706:'/avatars/lozza2706.jpg',kieransmithmilner:'/avatars/kieransmithmilner.jpg'};
function privateAddress(ip:string){return /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.|::|f[cd]|fe80)/i.test(ip)||ip.includes(':')&&ip.toLowerCase().includes('ffff:');}
// Fetch only public HTTPS assets. Redirect destinations receive the same check.
async function publicFetch(url:string,accept:string,redirects=0):Promise<Response>{
 const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443')throw Error('Unsupported poster asset URL.');
 const addresses=isIP(u.hostname)?[{address:u.hostname}]:await lookup(u.hostname,{all:true});
 if(!addresses.length||addresses.some(a=>privateAddress(a.address)))throw Error('Private poster asset address.');
 const response=await fetch(u,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{Accept:accept,'User-Agent':'Mozilla/5.0',Referer:'https://www.tiktok.com/'}});
 if([301,302,303,307,308].includes(response.status)){if(redirects>=3)throw Error('Too many asset redirects.');return publicFetch(new URL(response.headers.get('location')||'',u).href,accept,redirects+1);}
 if(!response.ok)throw Error('Could not fetch poster asset.');return response;
}
export async function embeddedImage(url:string){
 if(/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(url))return url;
 if(url.startsWith('/')&&!url.startsWith('//')){
  const root=path.resolve(process.cwd(),'public'),file=path.resolve(root,decodeURIComponent(url.split('?')[0]).slice(1));
  if(!file.startsWith(root+path.sep))throw Error('Invalid local asset.');
  const mime=path.extname(file).toLowerCase()==='.png'?'image/png':path.extname(file).toLowerCase()==='.webp'?'image/webp':'image/jpeg';
  return `data:${mime};base64,${(await readFile(file)).toString('base64')}`;
 }
 const response=await publicFetch(url,'image/*');const mime=response.headers.get('content-type')?.split(';')[0]||'';
 if(!/^image\/(png|jpe?g|webp|gif|avif)$/.test(mime))throw Error('Unsupported image.');
 const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>20*1024*1024)throw Error('Image is too large.');return `data:${mime};base64,${bytes.toString('base64')}`;
}
let fontsPromise:Promise<string>|undefined;
async function posterFonts(){
 return fontsPromise??=(async()=>{
  const local=await readFile(path.join(process.cwd(),'public/fonts/Norwester.otf'));
  let css=`@font-face{font-family:Norwester;src:url(data:font/otf;base64,${local.toString('base64')})}`;
  for(const family of ['Luckiest Guy','Orbitron']){
   const response=await publicFetch(`https://fonts.googleapis.com/css2?family=${family.replaceAll(' ','+')}&display=swap`,'text/css');
   let face=await response.text();const urls=[...new Set([...face.matchAll(/url\((https:\/\/[^)]+)\)/g)].map(m=>m[1]))];
   for(const url of urls){if(new URL(url).hostname!=='fonts.gstatic.com')throw Error('Unexpected font source.');const bytes=Buffer.from(await(await publicFetch(url,'font/*')).arrayBuffer());face=face.replaceAll(url,`data:font/woff2;base64,${bytes.toString('base64')}`);}css+=face;
  }return css;
 })().catch(e=>{fontsPromise=undefined;throw e;});
}
export async function launchPosterBrowser():Promise<Browser>{
 const {chromium}=await import('playwright-core');
 if(process.env.POSTER_CHROME_EXECUTABLE)return chromium.launch({executablePath:process.env.POSTER_CHROME_EXECUTABLE,headless:true});
 if(process.platform==='win32'){
  for(const executablePath of ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'])try{await access(executablePath);return await chromium.launch({executablePath,headless:true});}catch{}
  throw Error('Chrome or Edge is needed to prepare posters on this computer.');
 }
 const packed=(await import('@sparticuz/chromium')).default;
 return chromium.launch({args:packed.args,executablePath:await packed.executablePath(),headless:true});
}
export function createPosterRenderer(browser:Browser,fallbacks:Record<string,string>){
 const images=new Map<string,Promise<string>>();
 const embed=(url:string)=>{if(!images.has(url))images.set(url,embeddedImage(url));return images.get(url)!;};
 const avatars=new Map<string,Promise<string>>();
 const avatar=(name:string)=>{
  if(!avatars.has(name))avatars.set(name,(async()=>{
   const fallback=fallbackAvatarFor(name,fallbacks)||localAvatars[name.replace(/[^a-z0-9]/g,'')];
   let url=fallback;if(!url){const {POST}=await import('@/app/api/tiktok-avatar-v2/route');const response=await POST(new Request('http://localhost/api/tiktok-avatar-v2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:name})}));const result=await response.json();url=result.avatar||'';}return url?await embed(url):'';
  })().catch(()=>''));return avatars.get(name)!;
 };
 return async(template:TeamPosterTemplate)=>{
  const missing=new Set<string>();const background=template.backgroundUrl?await embed(template.backgroundUrl):'';
  const users=[...new Set(template.elements.filter(e=>e.kind==='avatar'&&e.value).map(e=>e.value.toLowerCase()))];
  for(let i=0;i<users.length;i+=3)await Promise.all(users.slice(i,i+3).map(avatar));
  const elements=[];for(const e of template.elements){let image='';if(e.kind==='avatar'&&e.value){image=await avatar(e.value.toLowerCase());if(!image)missing.add(e.value.toLowerCase());}
   const style=`position:absolute;display:flex;align-items:center;justify-content:center;left:${Number(e.x)}px;top:${Number(e.y)}px;width:${Number(e.width)}px;height:${Number(e.kind==='avatar'?e.width:e.height)}px;overflow:${e.kind==='avatar'?'hidden':'visible'};border-radius:${e.kind==='avatar'?'999px':'0'};color:${escape(e.color||'#FACC15')};font-family:${escape(e.fontFamily||'Luckiest Guy')};font-size:${Number(e.fontSize||37)}px;font-weight:${Number(e.fontWeight||900)};${e.kind==='avatar'?'':'text-shadow:3px 3px 0 #000;'}white-space:nowrap;`;
   elements.push(`<div style="${style}">${e.kind==='avatar'?(image?`<img src="${image}" style="width:100%;height:100%;object-fit:cover"/>`:''):escape(e.value)}</div>`);
  }
  const page=await browser.newPage({viewport:{width:1024,height:1536},deviceScaleFactor:1,javaScriptEnabled:false});
  // Every image/font is embedded. A saved layout cannot initiate web requests.
  await page.route('**/*',route=>route.abort());
  try{
   await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${await posterFonts()}*{box-sizing:border-box}body{margin:0}#poster{position:relative;width:1024px;height:1536px;overflow:hidden;background:${background?'#000':'linear-gradient(180deg,#090909 0%,#241d05 55%,#050505 100%)'}}</style></head><body><div id="poster">${background?`<img src="${background}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"/>`:''}${elements.join('')}</div></body></html>`,{waitUntil:'load',timeout:30000});
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
   return {png:await page.locator('#poster').screenshot({type:'png',timeout:30000}),missingPictures:[...missing]};
  }finally{await page.close();}
 };
}
