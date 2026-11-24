"use client";
import {forwardRef,useCallback,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {posterInScope} from '@/lib/team-poster-preparation-model';

type Poster={name:string;label:string;side:string;ready:boolean;missingPictures?:string[];error?:string;noData?:boolean};
type Status={generation?:string;phase:string;date?:string;expectedDate?:string;error?:string;posters:Poster[]};
export type PreparedTeamPostersHandle={download:(scope:string,name?:string)=>Promise<boolean>};
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
   const current=await refresh();if(current.date!==current.expectedDate)throw Error(current.error||'Posters are not ready for yesterday’s upload yet.');
   const posters=current.posters.filter(p=>!p.noData&&(name?p.name===name:posterInScope(p,scope)));
   if(!posters.length)throw Error('Team missed.');
   if(posters.some(p=>!p.ready))throw Error('These posters are still preparing or need a retry. Please check the preparation status.');
   const fetchImage=async(posterName:string)=>{
    const url=`${API}?generation=${encodeURIComponent(current.generation||'')}&file=${encodeURIComponent(posterName)}`;
    const response=await fetch(url,{cache:'no-store'});if(!response.ok){const error=await response.json();throw Error(error.error||'Download failed.');}
    return new Uint8Array(await response.arrayBuffer());
   };
   let blob:Blob,filename:string;
   if(name){blob=new Blob([await fetchImage(name)],{type:'image/png'});filename=`${posters[0].label.replace(/[^a-z0-9 _+-]/gi,'')}-${current.date}.png`;}
   else{
    setMessage(`Collecting prepared posters · 0 / ${posters.length}`);
    const {preparedPosterArchive}=await import('@/lib/prepared-poster-archive');
    const bytes=await preparedPosterArchive(posters,current.date||'',fetchImage,(done,total)=>setMessage(`Collecting prepared posters · ${done} / ${total}`));
    blob=new Blob([new Uint8Array(bytes)],{type:'application/zip'});
    const label=scope==='all'||scope==='first-class'?'all-first-class':scope==='dan'?'dan-james':scope==='mike-indi'?'mike-indi':'whole-agencies';
    filename=`${label}-posters-${current.date}.zip`;
   }
   const objectUrl=URL.createObjectURL(blob);const a=document.createElement('a');a.href=objectUrl;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
   setMessage(name?'Poster download requested.':`ZIP download requested · ${posters.length} posters.`);
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
