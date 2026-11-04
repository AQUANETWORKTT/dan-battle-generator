const tabId=Number(new URL(location.href).searchParams.get('tab'));
const status=document.getElementById('status');
let endpoint='',running=false,busy=false,last='',generation=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function exact(url,name,live=false){try{const value=new URL(url);return value.origin==='https://www.tiktok.com'&&value.pathname.replace(/\/$/,'').toLowerCase()==='/@'+name+(live?'/live':'');}catch{return false;}}
async function request(path,body){const response=await fetch(endpoint+path,{cache:'no-store',signal:AbortSignal.timeout(15000),...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});if(!response.ok)throw Error('Builder connection rejected. Copy its current connection again.');return response.json();}
async function active(id,version){
  while(running&&version===generation){const state=await request('state');if(state.stopped)throw Error('Report stopped.');if(state.paused){status.textContent='Paused in report builder.';await sleep(500);continue;}if(state.command?.id!==id)throw Error('Capture is no longer requested.');return;}
  throw Error('Disconnected.');
}
// Executed only inside the selected TikTok tab, never in other websites.
function inspect(name,live){
  const visible=e=>!!e&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;
  const blocked=[...document.querySelectorAll('iframe[src*="captcha"], [id*="captcha-verify"], [data-e2e="captcha"]')].some(visible);
  const text=document.body.innerText;
  const titles=['user-title','user-subtitle'].map(key=>document.querySelector(`[data-e2e="${key}"]`)?.textContent.trim()||'');
  const handle=titles.find(value=>value.replace(/^@/,'').toLowerCase()===name);
  let owner='';try{owner=JSON.parse(document.getElementById('SIGI_STATE')?.textContent||'{}').LiveRoom?.liveRoomUserInfo?.user?.uniqueId||'';}catch{}
  const hostLinks=[...document.querySelectorAll('[data-e2e="live-room-user-info"] a[href], a[data-e2e="live-room-user-name"], [data-e2e="live-room-user-name"] a[href]')];
  const hostMatch=hostLinks.some(a=>{try{return new URL(a.href).pathname.replace(/\/$/,'').toLowerCase()==='/@'+name;}catch{return false;}});
  const ready=[...document.querySelectorAll('video')].some(video=>visible(video)&&video.readyState>=2&&video.videoWidth>0);
  const offline=/not currently live|isn.t LIVE|LIVE (?:has ended|is over|isn.t available)|host is currently offline/i.test(text);
  const posts=[...document.querySelectorAll('a[href*="/video/"]')].some(visible);
  const empty=/No videos yet|No content|This account is private/i.test(text);
  const error=/Something went wrong|Please try again later/i.test(text);
  return {blocked,verified:live?(owner.toLowerCase()===name||hostMatch)&&ready:!!handle,posts,empty,error,offline,nickname:titles.find(value=>value!==handle)||'',url:location.href};
}
async function inspection(name,live){const results=await chrome.scripting.executeScript({target:{tabId},func:inspect,args:[name,live]});return results[0]?.result;}
async function capture(name,live,id,version){
  const url='https://www.tiktok.com/@'+name+(live?'/live':'');
  await active(id,version);await chrome.tabs.update(tabId,{url,active:true,muted:true});
  for(let pass=0;pass<2;pass++){
    const deadline=Date.now()+25000;
    while(Date.now()<deadline){
      await active(id,version);const tab=await chrome.tabs.get(tabId);
      if(tab.status!=='complete'||!exact(tab.url,name,live)){await sleep(700);continue;}
      const info=await inspection(name,live);
      if(info.blocked)return {status:'Unavailable',url,note:'TikTok verification appeared. Capture skipped.'};
      if(live&&info.offline)return {status:'Offline',url};
      if(info.verified&&(live||info.posts||info.empty)&&!info.error){
        await chrome.scripting.executeScript({target:{tabId},func:()=>window.scrollTo(0,0)});await sleep(1000);await active(id,version);
        const before=await chrome.tabs.get(tabId),current=await inspection(name,live);
        if(!before.active||!exact(before.url,name,live)||!current.verified||current.blocked)throw Error('TikTok tab changed before capture. Keep it active in its window.');
        const image=await chrome.tabs.captureVisibleTab(before.windowId,{format:'jpeg',quality:80});
        const after=await chrome.tabs.get(tabId),verify=await inspection(name,live);
        if(!after.active||!exact(after.url,name,live)||!verify.verified||verify.blocked)throw Error('TikTok tab changed during capture; image discarded.');
        return {status:'Captured',verified:true,url,image,nickname:info.nickname};
      }
      await sleep(700);
    }
    if(pass===0){await active(id,version);await chrome.tabs.reload(tabId);}
  }
  return {status:'Unavailable',url,note:live?'Live could not be verified.':'Profile posts did not load after one refresh.'};
}
document.getElementById('connect').onclick=()=>{
  if(busy)return;
  try{const url=new URL(document.getElementById('connection').value.trim());if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||!/^\/[A-Za-z0-9_-]{40,}\/$/.test(url.pathname)||url.search||url.hash||url.username||url.password)throw Error();if(!tabId)throw Error();endpoint=url.href;running=true;generation++;last='';status.textContent='Connected. Waiting for the report builder…';}catch{status.textContent='Open TikTok and click the extension there. Paste the full connection from the builder.';}
};
document.getElementById('stop').onclick=()=>{running=false;generation++;status.textContent='Disconnected. Use Stop in the builder to save a partial PDF.';};
async function poll(){
  if(!running||busy)return;busy=true;const version=generation;
  try{
    const state=await request('state');if(state.stopped){running=false;status.textContent='Report stopped.';return;}
    const command=state.command;
    if(!command||command.id===last){status.textContent=state.paused?'Paused in report builder.':'Connected. Waiting for the next creator…';return;}
    if(!/^[a-z0-9._]{1,24}$/.test(command.username))throw Error('Invalid creator requested.');
    const name=command.username;status.textContent='Capturing @'+name+' · profile';
    const profile=await capture(name,false,command.id,version);
    status.textContent='Capturing @'+name+' · live';
    const live=profile.status==='Captured'?await capture(name,true,command.id,version):{status:'Unavailable',note:'Profile could not be verified.'};
    await active(command.id,version);
    await request('result',{id:command.id,username:name,nickname:profile.nickname||'',profile,live});last=command.id;
    status.textContent='Saved @'+name+'. Waiting for the next creator…';
  }catch(error){status.textContent=error.message+'\nCheck the TikTok tab, then click Connect & capture to resume.';running=false;}
  finally{busy=false;}
}
setInterval(poll,800);
