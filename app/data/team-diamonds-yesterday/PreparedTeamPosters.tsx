"use client";
import {forwardRef,useCallback,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {posterInScope} from '@/lib/team-poster-preparation-model';

type Poster={name:string;label:string;side:string;ready:boolean;missingPictures?:string[];error?:string;noData?:boolean};
type Status={generation?:string;phase:string;date?:string;expectedDate?:string;error?:string;posters:Poster[]};
export type PreparedTeamPostersHandle={download:(scope:string,name?:string)=>Promise<boolean>};
type Folder={getFileHandle:(name:string,options:{create:boolean})=>Promise<{createWritable:()=>Promise<{write:(blob:Blob)=>Promise<void>;close:()=>Promise<void>}>}>};
const API='/api/team-poster-preparation';
export default forwardRef<PreparedTeamPostersHandle,{onMissingTeamsChange?:(names:string[])=>void;onReadyTeamsChange?:(names:string[])=>void}>(function PreparedTeamPosters({onMissingTeamsChange,onReadyTeamsChange},ref){
 const [status,setStatus]=useState<Status|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);const downloading=useRef(false);
 const refresh=useCallback(async()=>{const response=await fetch(API,{cache:'no-store'});const result=await response.json();if(!response.ok)throw Error(result.error||'Could not check poster preparation.');setStatus(result);onMissingTeamsChange?.((result.posters||[]).filter((p:Poster)=>p.noData).map((p:Poster)=>p.name));onReadyTeamsChange?.(result.date===result.expectedDate?(result.posters||[]).filter((p:Poster)=>p.ready).map((p:Poster)=>p.name):[]);return result as Status;},[onMissingTeamsChange,onReadyTeamsChange]);
 function checkFailed(e:unknown){setMessage(e instanceof Error?e.message:'Could not check prepared posters.');onReadyTeamsChange?.([]);setStatus(current=>current&&['queued','preparing'].includes(current.phase)?{...current,phase:'status-error'}:current);}
 useEffect(()=>{void refresh().catch(checkFailed);},[refresh]);
 async function prepare(){if(downloading.current)return;setBusy(true);setMessage('');try{const response=await fetch(API,{method:'POST'}),result=await response.json();if(!response.ok)throw Error(result.error||'Could not prepare posters.');onReadyTeamsChange?.([]);setStatus(current=>({...current,phase:'queued',posters:(current?.posters||[]).map(p=>({...p,ready:false,error:undefined,noData:undefined,missingPictures:undefined}))}));await refresh();}catch(e){checkFailed(e);}finally{setBusy(false);}}
 // Poll only the small preparation manifest; never reload or rebuild creator data.
 useEffect(()=>{if(!status)return;const interval=['queued','preparing'].includes(status.phase)?5000:30000;const timer=setInterval(()=>void refresh().catch(checkFailed),interval);return()=>clearInterval(timer);},[status?.phase,refresh,onReadyTeamsChange]);
 async function download(scope:string,name?:string){
  if(downloading.current)return true;downloading.current=true;setBusy(true);setMessage('');
  try{
   // Request a directory while the click still counts as a user gesture.
   const picker=(window as Window & {showDirectoryPicker?:()=>Promise<Folder>}).showDirectoryPicker;
   const folder=picker&&!name?await picker.call(window):null;
   const current=await refresh();if(current.date!==current.expectedDate)throw Error(current.error||'Posters are not ready for yesterday’s upload yet.');
   const posters=current.posters.filter(p=>!p.noData&&(name?p.name===name:posterInScope(p,scope)));
   if(!posters.length)throw Error('Team missed.');
   if(posters.some(p=>!p.ready))throw Error('These posters are still preparing or need a retry. Please check the preparation status.');
   let count=0;for(const poster of posters){
    setMessage(`Downloading ${count+1} of ${posters.length} · ${poster.label}`);
    const url=`${API}?generation=${encodeURIComponent(current.generation||'')}&file=${encodeURIComponent(poster.name)}`;
    const filename=`${poster.label.replace(/[^a-z0-9 _+-]/gi,'')}-${current.date}.png`;
    if(folder){const response=await fetch(url,{cache:'no-store'});if(!response.ok){const error=await response.json();throw Error(error.error||'Download failed.');}const handle=await folder.getFileHandle(filename,{create:true});const writer=await handle.createWritable();try{await writer.write(await response.blob());}finally{await writer.close();}}
    else{const response=await fetch(url,{cache:'no-store'});if(!response.ok){const error=await response.json();throw Error(error.error||'Download failed.');}const blob=await response.blob();const objectUrl=URL.createObjectURL(blob);const a=document.createElement('a');a.href=objectUrl;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);await new Promise(resolve=>setTimeout(resolve,200));}
    count++;
   }
   setMessage(folder?`${count} poster${count===1?'':'s'} saved to your folder.`:`Downloads requested for ${count} poster${count===1?'':'s'}.${count>1?' If your browser asks, allow multiple downloads.':''}`);
  }catch(e){if((e as Error).name!=='AbortError')setMessage(e instanceof Error?e.message:'Download failed.');}
  finally{downloading.current=false;setBusy(false);}return true;
 }
 useImperativeHandle(ref,()=>({download}));
 const ready=status?.posters.filter(p=>p.ready).length||0,total=status?.posters.filter(p=>!p.noData).length||0;const missing=[...new Set(status?.posters.flatMap(p=>p.missingPictures||[])||[])];const errors=status?.posters.filter(p=>p.error)||[],empty=status?.posters.filter(p=>p.noData)||[];const stale=Boolean(status?.date&&status.date!==status.expectedDate);
 return <section className="mt-5 rounded-2xl border border-yellow-300/30 bg-black/40 p-4" aria-live="polite">
  <div className="flex flex-wrap items-center justify-between gap-3"><strong className="text-sm font-black uppercase tracking-wide text-yellow-200">{!status?'Checking prepared posters…':stale?'Waiting for today’s upload':status.phase==='ready'?`Ready to download · ${ready} posters`:status.phase==='queued'||status.phase==='preparing'?`Preparing posters… ${ready} / ${total||'…'}`:status.phase==='partial'?`${ready} / ${total} posters ready`:'Posters need preparation'}</strong>
  <button type="button" onClick={()=>void prepare()} disabled={busy||status?.phase==='queued'||status?.phase==='preparing'} className="rounded-lg border border-yellow-300/40 px-3 py-2 text-xs font-bold text-yellow-100 disabled:opacity-40">{busy?'Working…':status?.phase==='not-prepared'?'Prepare posters':'Prepare again'}</button></div>
  {status?.phase==='queued'||status?.phase==='preparing'?<p className="mt-2 text-sm text-white/75">You can leave this page. Preparation continues in the background.</p>:null}
  {status?.error?<p className="mt-2 text-sm text-red-200">{status.error}</p>:null}
  {missing.length?<p className="mt-2 text-sm text-amber-200">Pictures still missing: {missing.map(n=>'@'+n).join(', ')}. Add fallback pictures, then prepare again.</p>:null}
  {errors.length?<p className="mt-2 text-sm text-red-200">Needs attention: {errors.map(p=>`${p.label}: ${p.error}`).join(' · ')}</p>:null}
  {empty.length?<p className="mt-2 text-sm text-white/65">Team missed: {empty.map(p=>p.label).join(', ')}</p>:null}
  {message?<p className="mt-2 text-sm text-white">{message}</p>:null}
 </section>;
});
