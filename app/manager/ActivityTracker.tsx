'use client';
import {useEffect} from 'react';

// Count foreground use, not an abandoned tab or a seven-day login cookie.
export default function ActivityTracker({enabled}:{enabled:boolean}){
 useEffect(()=>{
  if(!enabled)return;
  let lastInput=Date.now(),lastTick=Date.now(),wasActive=false,pending=false;
  const visible=()=>document.visibilityState==='visible'&&document.hasFocus();
  const send=(seconds:number)=>{
   if(pending)return;
   pending=true;
   void fetch('/api/manager-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({seconds}),keepalive:true}).then(response=>{if(!response.ok||response.redirected)throw Error('Activity request was not accepted.');}).catch(()=>{console.warn('Manager activity could not be saved. It will retry.');}).finally(()=>{pending=false;});
  };
  const tick=()=>{
   const now=Date.now(),active=visible()&&now-lastInput<5*60000;
   const seconds=wasActive?Math.floor(Math.max(0,Math.min(now,lastInput+5*60000)-lastTick)/1000):0;
   if(wasActive||active)send(Math.min(30,seconds));
   wasActive=active;lastTick=now;
  };
  const input=()=>{lastInput=Date.now();if(!wasActive)tick();};
  const focus=()=>{if(visible())lastInput=Date.now();tick();};
  const events=['pointerdown','pointermove','keydown','scroll','touchstart'] as const;
  for(const event of events)window.addEventListener(event,input,{passive:true});
  document.addEventListener('visibilitychange',focus);window.addEventListener('focus',focus);window.addEventListener('blur',tick);window.addEventListener('pagehide',tick);
  tick();const timer=window.setInterval(tick,30000);
  return()=>{tick();clearInterval(timer);for(const event of events)window.removeEventListener(event,input);document.removeEventListener('visibilitychange',focus);window.removeEventListener('focus',focus);window.removeEventListener('blur',tick);window.removeEventListener('pagehide',tick);};
 },[enabled]);
 return null;
}
