"use client";
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { TeamPosterTemplate } from '../../generator/AtlasGenerator';
import {atlasCreatorName,atlasManagerKey,atlasPosterLabel,atlasPosterLeaders,atlasPosterManager,atlasPosterRows,fillAtlasPoster,type AtlasPosterAssignments,type AtlasPosterManager,type AtlasPosterStat,type AtlasSavedPoster} from '@/lib/atlas-team-posters';

const button='rounded-xl border border-sky-300/30 px-4 py-3 text-xs font-black uppercase tracking-wider text-sky-100 transition hover:bg-sky-300/10 disabled:cursor-not-allowed disabled:opacity-40';
async function atlasJson(path:string,signal?:AbortSignal){const r=await fetch('/api/atlas/'+path,{cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)});const j=await r.json();if(!r.ok)throw Error(j.error||'Atlas request failed.');return j;}

export default function AtlasTeamPosters(){
  const [templates,setTemplates]=useState<AtlasSavedPoster[]>([]),[managers,setManagers]=useState<AtlasPosterManager[]>([]),[assignments,setAssignments]=useState<AtlasPosterAssignments>({});
  const [date,setDate]=useState(()=>new Date(Date.now()-86400000).toLocaleDateString('en-CA',{timeZone:'Europe/London'}));
  const [status,setStatus]=useState('Loading Atlas poster layouts…'),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [preview,setPreview]=useState<TeamPosterTemplate|null>(null),[selected,setSelected]=useState(''),[previewDate,setPreviewDate]=useState(''),[creatorCount,setCreatorCount]=useState(0),[scale,setScale]=useState(.4);
  const [missing,setMissing]=useState<string[]>([]),[progress,setProgress]=useState<{current:number;total:number}|null>(null);
  const poster=useRef<HTMLDivElement>(null),viewport=useRef<HTMLDivElement>(null),avatars=useRef(new Map<string,string>()),abort=useRef<AbortController|null>(null),statsCache=useRef<{date:string;rows:AtlasPosterStat[]}|null>(null);
  useEffect(()=>{const c=new AbortController();void(async()=>{try{
    const [library,assigned]=await Promise.all([atlasJson('team-poster-templates',c.signal),atlasJson('data-analysis/manager-assignments',c.signal)]);
    setTemplates((library.templates||[]).filter((item:AtlasSavedPoster)=>Array.isArray(item.template_json?.elements)));setManagers(assigned.managers||[]);setAssignments(assigned.assignments||{});
    setStatus(library.templates?.length?'Choose a date, then preview or download any saved team preset.':'No saved Atlas presets yet. Open Team Poster Builder to create one.');
  }catch(e){if(!c.signal.aborted)setStatus(e instanceof Error?e.message:'Could not load layouts.');}finally{if(!c.signal.aborted)setLoading(false);}})();return()=>{c.abort();abort.current?.abort();};},[]);
  useEffect(()=>{if(!viewport.current)return;const observer=new ResizeObserver(entries=>setScale(Math.min(1,entries[0].contentRect.width/1024)));observer.observe(viewport.current);return()=>observer.disconnect();},[]);
  const label=(item:AtlasSavedPoster)=>atlasPosterLabel(item.name);
  const group=(item:AtlasSavedPoster)=>atlasPosterManager(item,managers)?.group||'Atlas';
  const grouped=[...new Set(templates.map(group))].filter(name=>name!=='Excluded');
  const visible=templates.filter(item=>group(item)!=='Excluded');

  async function stats(signal:AbortSignal){
    if(statsCache.current?.date===date)return statsCache.current.rows;
    const data=await atlasJson(`data-analysis/daily-stats?month=${date.slice(0,7)}&posterDate=${date}`,signal);
    const rows=(data.rows||[]).filter((row:AtlasPosterStat)=>row.stat_date===date);
    if(!rows.length)throw Error(`No Atlas creator data has been uploaded for ${date}. Choose an uploaded date.`);
    statsCache.current={date,rows};return rows;
  }
  async function imageFor(username:string,signal:AbortSignal){
    const key=username.toLowerCase();if(avatars.current.get(key))return avatars.current.get(key)!;
    try{
      const limited=AbortSignal.any([signal,AbortSignal.timeout(15000)]);
      const response=await fetch('/api/atlas/tiktok-avatar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username}),signal:limited});
      const data=await response.json();if(!response.ok||!data.avatar)throw Error('No avatar');
      const image=await fetch('/api/atlas/tiktok-avatar-image?url='+encodeURIComponent(data.avatar),{signal:limited});
      if(!image.ok)throw Error('Image failed');const blob=await image.blob();if(!blob.type.startsWith('image/'))throw Error('Invalid image');
      const result=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});avatars.current.set(key,result);return result;
    }catch{if(signal.aborted)throw Error('Cancelled.');return '';}
  }
  async function prepare(item:AtlasSavedPoster,data:AtlasPosterStat[],signal:AbortSignal){
    const rows=atlasPosterRows(item,data,assignments);if(!rows.length)throw Error(`No creators for ${label(item)} on ${date}.`);
    const leaders=atlasPosterLeaders(rows),images=new Map<string,string>(),failed:string[]=[];
    const names=[...new Set([...leaders.diamonds,...leaders.hours].map(atlasCreatorName))];
    for(const name of names){if(signal.aborted)throw Error('Cancelled.');setStatus(`Preparing ${label(item)} · picture for @${name}`);const image=await imageFor(name,signal);images.set(name.toLowerCase(),image);if(!image)failed.push(name);}
    if(signal.aborted)throw Error('Cancelled.');
    flushSync(()=>{setPreview(fillAtlasPoster(item,rows,images));setSelected(item.name);setPreviewDate(date);setCreatorCount(rows.length);setMissing(failed);});
    await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    const node=poster.current;if(!node)throw Error('Poster preview is not ready.');
    await Promise.all(Array.from(node.querySelectorAll('img')).map(image=>new Promise<void>((resolve,reject)=>{
      if(image.complete){image.naturalWidth?resolve():reject(Error('A poster image could not load.'));return;}
      const timer=setTimeout(()=>{image.onload=null;image.onerror=null;reject(Error('A poster image timed out. Please retry.'));},10000);
      image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(Error('A poster image could not load.'));};
    })));
    if(signal.aborted)throw Error('Cancelled.');return failed;
  }
  async function png(signal:AbortSignal){
    if(signal.aborted)throw Error('Cancelled.');if(!poster.current)throw Error('No preview to download.');
    const blob=await htmlToImage.toBlob(poster.current,{width:1024,height:1536,pixelRatio:1,cacheBust:true,backgroundColor:'#000'});
    if(!blob)throw Error('Could not export this poster.');if(signal.aborted)throw Error('Cancelled.');return blob;
  }
  async function run(items:AtlasSavedPoster[],action:'preview'|'download'|'check'){
    if(busy||!items.length)return;const c=new AbortController();abort.current=c;setBusy(true);setMissing([]);setProgress({current:0,total:items.length});
    try{
      const data=await stats(c.signal),zip=new JSZip(),skipped:string[]=[],missingNames=new Set<string>();let count=0;
      for(let i=0;i<items.length;i++){
        if(c.signal.aborted)throw Error('Cancelled.');const item=items[i];setProgress({current:i+1,total:items.length});setStatus(`Building ${label(item)}…`);
        try{for(const name of await prepare(item,data,c.signal))missingNames.add(name);if(action==='download'){const blob=await png(c.signal);if(items.length===1)saveAs(blob,`${item.name}-${date}.png`);else zip.file(`${item.name.replace(/[^a-z0-9._-]/gi,'-')}-${date}.png`,blob);}count++;}
        catch(e){if(c.signal.aborted)throw e;skipped.push(`${label(item)}: ${e instanceof Error?e.message:'Failed'}`);}
      }
      if(!count)throw Error(skipped.join('\n')||'No posters could be built.');
      if(action==='download'&&items.length>1){if(skipped.length)zip.file('skipped-layouts.txt',skipped.join('\n'));if(missingNames.size)zip.file('missing-pictures.txt',[...missingNames].join('\n'));const blob=await zip.generateAsync({type:'blob'});if(c.signal.aborted)throw Error('Cancelled.');saveAs(blob,`atlas-team-posters-${date}.zip`);}
      setMissing([...missingNames]);setStatus(`${action==='download'?`Downloaded ${count} poster${count===1?'':'s'}`:action==='check'?`Checked ${count} preset${count===1?'':'s'}`:'Preview ready'}.${missingNames.size?` ${missingNames.size} creator pictures need attention below.`:''}${skipped.length?'\n'+skipped.join('\n'):''}`);
    }catch(e){setStatus(e instanceof Error?e.message:'Could not prepare posters.');}finally{setBusy(false);setProgress(null);}
  }

  return <main className="min-h-screen bg-[#080806] px-4 py-6 text-white"><div className="mx-auto max-w-[1500px]">
    <nav className="mb-5 flex flex-wrap gap-3"><Link href="/atlas/data/menu" className={button}>Back to Data</Link><Link href="/atlas/generator?workspace=posters" className={button+' bg-sky-300/10'}>Team Poster Builder ↗</Link><Link href="/atlas/data/manager-assignments" className={button}>Manager Assignments</Link></nav>
    <section className="rounded-3xl border border-sky-300/25 bg-sky-300/10 p-6">
      <button disabled={busy||loading||!visible.length} onClick={()=>void run(visible,'download')} className="mb-6 w-full rounded-2xl bg-sky-300 px-6 py-5 text-lg font-black uppercase tracking-wider text-slate-950 hover:bg-sky-200 disabled:opacity-40">Download All Atlas ↓</button>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.3em] text-sky-200/70">Atlas Creator Network · Team Posters</p><h1 className="mt-3 font-[family-name:var(--font-norwester)] text-4xl uppercase text-sky-300 md:text-6xl">Team Diamonds Yesterday</h1></div><button className={button} disabled={busy||loading||!visible.length} onClick={()=>void run(visible,'check')}>Check Pictures</button></div>
      <div className="mt-5 flex flex-wrap items-end gap-5"><label className="text-xs font-black uppercase tracking-wider text-sky-100">Data date<input aria-label="Atlas poster data date" type="date" value={date} disabled={busy} onChange={e=>{setDate(e.target.value);setPreview(null);setSelected('');setMissing([]);}} className="mt-2 block rounded-xl border border-sky-300/30 bg-black/40 p-3 text-base text-white"/></label><p className="max-w-xl text-sm text-white/60">Your saved team presets, ready to preview or download individually. Layouts and data sources are managed in Team Poster Builder.</p></div>
    </section>
    <div role="status" aria-live="polite" className="my-5 rounded-xl border border-sky-300/20 bg-sky-300/5 p-4 text-sm text-sky-100"><p className="whitespace-pre-wrap">{status}</p>{progress&&<div className="mt-3"><p className="mb-2 text-xs">{progress.current} / {progress.total} presets</p><progress className="h-2 w-full accent-sky-300" max={progress.total} value={progress.current}/><button className="mt-2 font-bold underline" onClick={()=>abort.current?.abort()}>Cancel</button></div>}</div>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="min-w-0 space-y-5">{grouped.map(section=><div key={section} className="rounded-3xl border border-sky-300/20 bg-black/30 p-4"><header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-[family-name:var(--font-norwester)] text-2xl uppercase tracking-wider text-sky-200">{section}</h2><button className={button+' bg-sky-300/10'} disabled={busy||loading} onClick={()=>void run(visible.filter(item=>group(item)===section),'download')}>Download all {section}</button></header><div className="grid gap-4 md:grid-cols-2">{visible.filter(item=>group(item)===section).map(item=>{const m=atlasPosterManager(item,managers),all=atlasManagerKey(item.template_json.managerKey||'atlas-all')==='atlasall';return <article key={item.name} className={`rounded-3xl border bg-black/50 p-5 ${selected===item.name?'border-sky-200':'border-sky-300/20'}`}><p className="text-xs font-black uppercase tracking-widest text-white/45">Saved preset</p><h3 className="mt-2 break-words font-[family-name:var(--font-norwester)] text-3xl uppercase text-sky-200">{label(item)}</h3><p className="mt-3 text-sm text-white/65">{all?'All Atlas creators':m?.name||'Assigned manager'}</p><p title={m?.email} className="mt-2 break-all rounded-lg border border-sky-300/20 bg-sky-300/5 px-2 py-1 font-mono text-xs text-sky-100">{all?'Whole network':m?.email||item.template_json.managerKey}</p><div className="mt-5 grid gap-2"><button className={button} disabled={busy||loading} onClick={()=>void run([item],'preview')}>Preview {label(item)}</button><button className="rounded-xl bg-green-400 px-4 py-4 text-xs font-black uppercase tracking-wider text-black hover:bg-green-300 disabled:opacity-40" disabled={busy||loading} onClick={()=>void run([item],'download')}>Download {label(item)} ↓</button></div></article>;})}</div></div>)}{!loading&&!visible.length&&<div className="rounded-3xl border border-dashed border-sky-300/30 p-8 text-center"><h2 className="text-xl font-bold text-sky-200">No saved team presets yet</h2><p className="mt-3 text-sm text-white/55">Create a layout in Team Poster Builder, choose its manager and save it. It will appear here.</p><Link className={button+' mt-5 inline-block'} href="/atlas/generator?workspace=posters">Open Team Poster Builder</Link></div>}</section>
      <aside className="min-w-0 rounded-3xl border border-sky-300/20 bg-black/30 p-4 xl:sticky xl:top-5"><h2 className="mb-3 text-sm font-black uppercase tracking-widest text-sky-200">{selected?label(templates.find(item=>item.name===selected)!):'Poster preview'}</h2>{preview&&<div className="mb-4 text-xs text-white/60">{creatorCount} creators · {previewDate}<button className="ml-3 font-bold text-sky-200 underline disabled:opacity-40" disabled={busy} onClick={()=>{const item=templates.find(item=>item.name===selected);if(item)void run([item],'download');}}>Download this poster</button></div>}<div ref={viewport} className="relative w-full overflow-hidden rounded-xl bg-black/30" style={{aspectRatio:'2 / 3'}}>{preview?<div style={{width:1024,height:1536,transform:`scale(${scale})`,transformOrigin:'top left'}}><div ref={poster} data-testid="atlas-poster-canvas" style={{position:'relative',width:1024,height:1536,overflow:'hidden',backgroundColor:'#0a1c2c'}}>{preview.backgroundUrl&&<img src={preview.backgroundUrl} alt="" crossOrigin="anonymous" style={{position:'absolute',width:'100%',height:'100%',objectFit:'cover'}}/>}{preview.elements.map(e=><div key={e.id} data-poster-element={e.id} style={{position:'absolute',left:e.x,top:e.y,width:e.width,height:e.height,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',borderRadius:e.kind==='avatar'?'50%':0,fontFamily:e.fontFamily||'Arial',fontSize:e.fontSize||32,fontWeight:e.fontWeight||700,color:e.color||'white',whiteSpace:'nowrap'}}>{e.kind==='avatar'?e.imageUrl?<img src={e.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:null:e.value}</div>)}</div></div>:<div className="flex h-full flex-col items-center justify-center p-6 text-center text-white/45"><p className="font-bold uppercase tracking-wider">Choose a saved preset</p><p className="mt-3 text-sm">Preview it here or download it directly from its card.</p></div>}</div></aside>
    </div>
    {!!missing.length&&<section className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-300/5 p-5 text-sm"><h2 className="font-bold text-amber-200">Creator pictures to check</h2><p className="mt-2 text-white/65">These pictures could not be loaded. Retry the preview, or add the pictures in Team Poster Builder.</p><p className="mt-3 break-words font-mono text-amber-100">{missing.join(', ')}</p></section>}
  </div></main>;
}
