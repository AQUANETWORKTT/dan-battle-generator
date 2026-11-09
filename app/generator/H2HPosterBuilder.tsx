"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { H2H_EXAMPLE, h2hDate, h2hFilename, h2hInputTime, h2hMinutes, h2hPosters, h2hTime, parseH2H, validateH2H, type H2HPoster } from '@/lib/h2h-posters';

import {parseH2H2v2,validateH2H2v2,h2h2v2Posters,H2H_2V2_EXAMPLE} from '@/lib/h2h-2v2';

type Props = {
  twoVTwo?: boolean;
  templateControls: ReactNode;
  renderPoster: (battle: H2HPoster, scale: number) => ReactNode;
  getAvatar: (username: string, signal?: AbortSignal) => Promise<string>;
  exportPoster: (battle: H2HPoster) => Promise<Blob | null>;
  onBusyChange: (busy: boolean) => void;
};

const input = 'w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white outline-none focus:border-yellow-300';
const button = 'rounded-lg bg-yellow-300 px-4 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40';
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

async function photoData(source: string, signal: AbortSignal) {
  if (!source) throw Error('No picture returned.');
  const url = /^https?:\/\//i.test(source) ? '/api/tiktok-avatar-image?url=' + encodeURIComponent(source) : source;
  const response = await fetch(url, {signal, cache:'no-store'});
  if (!response.ok) throw Error('Picture could not be downloaded.');
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw Error('The response was not an image.');
  const data = await new Promise<string>((resolve,reject) => {const reader = new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Could not read picture.'));reader.readAsDataURL(blob);});
  await verifyImage(data, signal);
  return data;
}

async function verifyImage(source: string, signal?: AbortSignal) {
  await new Promise<void>((resolve,reject) => {
    const image = new Image();
    const cleanup = () => {clearTimeout(timer);signal?.removeEventListener('abort',cancel);image.onload=null;image.onerror=null;};
    const fail = (message: string) => {cleanup();reject(Error(message));};
    const cancel = () => fail('Cancelled.');
    const timer = setTimeout(()=>fail('Picture timed out.'),15000);
    image.onload=()=>{cleanup();image.naturalWidth ? resolve() : reject(Error('Empty image.'));};
    image.onerror=()=>fail('Picture could not load.');
    signal?.addEventListener('abort',cancel,{once:true});
    if (signal?.aborted) {cancel();return;}
    image.src=source;
  });
}

export default function H2HPosterBuilder({templateControls,renderPoster,getAvatar,exportPoster,onBusyChange,twoVTwo=false}: Props) {
  const count=twoVTwo?4:2;
  const [paste,setPaste] = useState('');
  const [day,setDay] = useState('');
  const [month,setMonth] = useState(()=>String(new Date().getMonth()+1));
  const [year,setYear] = useState(()=>String(new Date().getFullYear()));
  const date = day ? `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}` : '';
  const daysInMonth = new Date(Number(year),Number(month),0).getDate();
  const [previewRequested,setPreviewRequested] = useState(false);
  const [fillMissing,setFillMissing] = useState(true);
  const [start,setStart] = useState('20:00');
  const [interval,setInterval] = useState(5);
  const [images,setImages] = useState<Record<string,string>>({});
  const [selected,setSelected] = useState('');
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState('Paste matchups or load your November 2nd list.');
  const [exportBattle,setExportBattle] = useState<H2HPoster | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  const parsed = useMemo(()=>(twoVTwo?parseH2H2v2:parseH2H)(paste,{fillMissing,start,interval}),[paste,fillMissing,start,interval,twoVTwo]);
  const checks = useMemo(()=>(twoVTwo?validateH2H2v2:validateH2H)(parsed.rows),[parsed.rows,twoVTwo]);
  const errors = [...parsed.errors,...checks.errors];
  const names = [...new Map(parsed.rows.flatMap(row=>[row.name1,row.name2,...(twoVTwo?[row.name3!,row.name4!]:[])]).map(name=>[name.toLowerCase(),name])).values()];
  const missing = names.filter(name=>!images[name.toLowerCase()]);
  const posters = h2hDate(date) && !errors.length ? (twoVTwo?h2h2v2Posters:h2hPosters)(parsed.rows,date,images) : [];
  const selectedRow = parsed.rows.find(row=>row.id===selected) || parsed.rows[0];
  const previews = selectedRow ? posters.filter(p=>p.id.startsWith(selectedRow.id+'-')) : [];
  const selectedMissing = previews.some(p=>!p.image1 || !p.image2 || (twoVTwo&&(!p.image3||!p.image4)));

  function markBusy(value: boolean) {setBusy(value);onBusyChange(value);}
  function changeMonth(value: string) {
    const limit=new Date(Number(year),Number(value),0).getDate();
    if(Number(day)>limit)setDay(String(limit));
    setMonth(value);
  }
  function changeYear(value: string) {
    const limit=new Date(Number(value),Number(month),0).getDate();
    if(Number(day)>limit)setDay(String(limit));
    setYear(value);
  }
  function previewAll() {
    if(!posters.length)return;
    setPreviewRequested(true);
    void loadPictures(true);
  }
  async function loadPictures(onlyMissing = false, subset = names) {
    const pending = onlyMissing ? subset.filter(name=>!images[name.toLowerCase()]) : subset;
    const abort = new AbortController();controller.current=abort;markBusy(true);
    let failed = 0;
    try {
      // Sequential lookups avoid the existing provider returning stale avatars
      // when several creator pages are scraped simultaneously.
      for (let i=0;i<pending.length;i++) {
        if (abort.signal.aborted) break;
        const name = pending[i];setStatus(`Loading picture ${i+1}/${pending.length}: ${name}`);
        try {
          const signal = AbortSignal.any([abort.signal,AbortSignal.timeout(30000)]);
          const data = await photoData(await getAvatar(name,signal),signal);
          if (!abort.signal.aborted) setImages(current=>({...current,[name.toLowerCase()]:data}));
        } catch {if(abort.signal.aborted) break;failed++;setImages(current=>{const next={...current};delete next[name.toLowerCase()];return next;});}
      }
      setStatus(abort.signal.aborted ? 'Picture loading stopped. Pictures already loaded are kept.' : failed ? `${failed} pictures could not load. Retry or upload them below before downloading.` : 'Pictures loaded. Review all orientations and the schedule, then download.');
    } finally {markBusy(false);}
  }

  async function upload(name: string, file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {setStatus('Choose an image file.');return;}
    const abort = new AbortController();controller.current=abort;markBusy(true);
    const url=URL.createObjectURL(file);
    try {const data=await photoData(url,abort.signal);setImages(current=>({...current,[name.toLowerCase()]:data}));setStatus(`Picture updated for ${name}; all orientations use this picture.`);}
    catch(error){setStatus(error instanceof Error?error.message:'Upload failed.');}
    finally {URL.revokeObjectURL(url);markBusy(false);}
  }

  function updateTime(rowId: string, value: string) {
    const minutes=h2hMinutes(value);if(minutes===null)return;
    setPaste(parsed.rows.map(row=>`${h2hInputTime(row.id===rowId?minutes:row.minutes)}\t${row.name1}\t${row.name2}${twoVTwo?`\n\t${row.name3}\t${row.name4}`:''}`).join('\n'));
  }

  async function download(all: boolean) {
    if (!posters.length || (all ? missing.length : selectedMissing) || errors.length) return;
    const targets = all ? posters : previews;
    const abort = new AbortController();controller.current=abort;markBusy(true);
    try {
      await document.fonts.ready;
      const zip=new JSZip();
      const manifest=[twoVTwo?'File,Top left,Top right,Bottom left,Bottom right,Date,Time':'File,Creator 1,Creator 2,Date,Time'];
      for(let i=0;i<targets.length;i++) {
        if(abort.signal.aborted)throw Error('Download cancelled. No incomplete ZIP was saved.');
        const poster={...targets[i],id:'h2h-export-'+targets[i].id};
        setStatus(`Rendering poster ${i+1}/${targets.length}: ${poster.name1} vs ${poster.name2}`);
        flushSync(()=>setExportBattle(poster));
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
        const elements=Array.from(frame.current?.querySelectorAll('img') || []);
        if(elements.length<count+1)throw Error('The poster is missing its background or pictures.');
        for(const element of elements) await verifyImage(element.src,abort.signal);
        const blob=await exportPoster(poster);
        if(!blob)throw Error(`Could not export ${poster.name1} vs ${poster.name2}. No incomplete ZIP was saved.`);
        const filename=twoVTwo?`${poster.name1}-${date}-${poster.time}-${String(posters.findIndex(p=>p.id===targets[i].id)+1).padStart(3,'0')}.png`.replace(/[^a-zA-Z0-9._-]/g,'-'):h2hFilename(poster,posters.findIndex(p=>p.id===targets[i].id));
        zip.file(filename,blob);
        manifest.push([filename,poster.name1,poster.name2,...(twoVTwo?[poster.name3,poster.name4]:[]),date,poster.time].join(','));
      }
      zip.file('matchups.csv',manifest.join('\n'));
      setStatus('Preparing ZIP…');
      const blob=await zip.generateAsync({type:'blob'});
      if(abort.signal.aborted)throw Error('Download cancelled.');
      saveAs(blob,`H2H-${twoVTwo?'2V2-':''}${date}-${targets.length}-posters.zip`);
      setStatus(`Downloaded ${targets.length} posters with names and pictures in their matching positions.`);
    } catch(error) {setStatus(error instanceof Error?error.message:'Download failed.');}
    finally {setExportBattle(null);markBusy(false);}
  }

  return <div className="grid min-w-0 grid-cols-1 items-start gap-6 uppercase xl:grid-cols-[430px_minmax(0,1fr)]">
    <section className="min-w-0 space-y-5">
      <fieldset disabled={busy} className="min-w-0 space-y-4 rounded-xl border border-yellow-300/20 bg-black/35 p-5">
        <h2 className="font-black uppercase tracking-widest text-yellow-300">Head-to-head {twoVTwo?'2v2 ':''}posters</h2>
        <p className="text-sm text-white/65">{twoVTwo?'Four posters per matchup: A B / C D, C D / A B, B A / D C, D C / B A. Left-column creators form one team; right-column creators form the other.':'Two posters per matchup. Names, pictures and sides swap; the date and exact time stay the same.'}</p>
        {templateControls}
        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm">Day<select aria-label="H2H event day" value={day} onChange={e=>setDay(e.target.value)} className={input+' mt-2'}><option value="">Day</option>{Array.from({length:daysInMonth},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
          <label className="text-sm">Month<select aria-label="H2H event month" value={month} onChange={e=>changeMonth(e.target.value)} className={input+' mt-2'}>{months.map((name,i)=><option key={name} value={i+1}>{name.toUpperCase()}</option>)}</select></label>
          <label className="text-sm">Year<select aria-label="H2H event year" value={year} onChange={e=>changeYear(e.target.value)} className={input+' mt-2'}>{Array.from({length:7},(_,i)=>new Date().getFullYear()-1+i).map(value=><option key={value} value={value}>{value}</option>)}</select></label>
        </div>
        <p className="text-sm font-bold text-yellow-200">{h2hDate(date) || 'Choose the date before downloading'}</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={fillMissing} onChange={e=>setFillMissing(e.target.checked)}/>Use an interval for rows without times</label>
        {fillMissing && <div className="grid grid-cols-2 gap-3"><label className="text-sm">Start time<input aria-label="H2H start time" type="time" step={60} value={start} onChange={e=>setStart(e.target.value)} className={input+' mt-2'}/></label><label className="text-sm">Interval (minutes)<input aria-label="H2H interval minutes" type="number" min={1} max={1440} value={interval} onChange={e=>setInterval(Number(e.target.value))} className={input+' mt-2'}/></label></div>}
        <p className="text-xs text-white/55">Pasted times always win. 8:05PM, 8:07PM and any other minute are kept exactly.</p>
        <label className="block text-sm">Matchups<textarea aria-label="H2H matchups" rows={12} value={paste} onChange={e=>{setPaste(e.target.value);setPreviewRequested(false);}} placeholder={'8:00 PM\tdens2511\tItsriverlea\n8:05 PM\tpenii1722\tdad.of.286'} className={input+' mt-2 font-mono text-xs uppercase'}/></label>
        <p className="text-xs text-white/55">{twoVTwo?'Paste two rows per matchup: Time / A / B, then blank time / C / D. Blank spacer rows are ignored.':'Paste spreadsheet cells, a Markdown table, or one Time / Creator 1 / Creator 2 row per line. Two username columns also work with interval timing.'}</p>
        <button className="text-sm font-bold text-cyan-200 underline" onClick={()=>{setPaste(twoVTwo?H2H_2V2_EXAMPLE:H2H_EXAMPLE);if(!twoVTwo){setDay('2');setMonth('11');setYear('2026');}setSelected('');setPreviewRequested(false);}}>{twoVTwo?'Load your eight 2v2 matchups':'Load your 16 matchups - 2 November 2026'}</button>
        <button className={button+' w-full uppercase'} disabled={!posters.length||!!errors.length} onClick={previewAll}>Preview all {parsed.rows.length*count} posters</button>
        <p className="text-xs text-white/55">Preview loads the pictures automatically and shows every poster in all orientations.</p>
      </fieldset>
      <div role="status" aria-live="polite" className="rounded-xl border border-white/15 bg-black/35 p-4 text-sm"><p className="mb-2 font-bold text-yellow-200">{parsed.rows.length} matchups · {parsed.rows.length*count} posters · {missing.length} pictures missing</p>{status}{busy && <button className="ml-3 font-bold text-red-200 underline" onClick={()=>controller.current?.abort()}>Cancel</button>}</div>
      {!!errors.length && <div role="alert" className="rounded-xl border border-red-300/30 bg-red-950/30 p-4 text-sm text-red-200">{errors.map((error,i)=><p key={i}>{error}</p>)}</div>}
      {!!checks.warnings.length && <div className="rounded-xl border border-amber-300/30 p-4 text-sm text-amber-200">{checks.warnings.map(w=><p key={w}>{w}</p>)}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><button className={button} disabled={busy||!posters.length||!!missing.length} onClick={()=>void download(true)}>Download all {posters.length || parsed.rows.length*count} posters</button><button className={button} disabled={busy||!previews.length||selectedMissing} onClick={()=>void download(false)}>Download selected matchup</button></div>
      {!!names.length && <details className="rounded-xl border border-white/15 p-4" open={previewRequested && missing.length>0}><summary className="cursor-pointer font-bold text-yellow-200">Creator pictures · {names.length}</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">{names.map(name=><label key={name.toLowerCase()} data-h2h-photo={name.toLowerCase()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)void upload(name,e.dataTransfer.files?.[0]);}} className={`flex min-h-44 min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-3 text-center ${images[name.toLowerCase()]?'border-white/20 bg-white/5':'border-yellow-300/60 bg-yellow-300/5'} ${busy?'opacity-60':''}`}>
          {images[name.toLowerCase()]?<img src={images[name.toLowerCase()]} alt={name} className="h-20 w-20 rounded-full object-cover"/>:<span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/50 text-xs text-yellow-200">Missing photo</span>}
          <span className="w-full break-all text-xs font-bold">{name.toUpperCase()}</span><span className="text-xs text-cyan-200">Drag photo here<br/>or click to choose</span>
          <input aria-label={`Upload picture for ${name}`} disabled={busy} type="file" accept="image/*" className="hidden" onChange={e=>{void upload(name,e.target.files?.[0]);e.target.value='';}}/>
        </label>)}</div>
        {!!missing.length && <button disabled={busy} className="mt-3 text-xs font-bold text-cyan-200 underline disabled:opacity-40" onClick={()=>void loadPictures(true)}>Retry missing pictures</button>}
      </details>}
    </section>
    <section className="min-w-0 space-y-5">
      {!!parsed.rows.length && <div className="overflow-x-auto rounded-xl border border-white/15"><table className="w-full text-left text-sm"><thead className="bg-yellow-300/10 text-yellow-200"><tr><th className="p-3">Time</th><th className="p-3">Creator 1</th><th className="p-3">Creator 2</th><th className="p-3">Preview</th></tr></thead><tbody>{parsed.rows.map(row=><tr key={row.id} className={selectedRow?.id===row.id?'bg-white/10':'border-t border-white/10'}><td className="p-3"><input aria-label={`Time for ${row.name1} vs ${row.name2}`} type="time" step={60} value={h2hInputTime(row.minutes)} disabled={busy||!!errors.length} onChange={e=>updateTime(row.id,e.target.value)} className="rounded border border-white/20 bg-black p-2"/></td><td className="break-all p-3">{row.name1}{twoVTwo&&<><br/>{row.name3}</>}</td><td className="break-all p-3">{row.name2}{twoVTwo&&<><br/>{row.name4}</>}</td><td className="p-3"><button disabled={busy} className="font-bold text-cyan-200 underline" onClick={()=>setSelected(row.id)}>View matchup</button></td></tr>)}</tbody></table></div>}
      {(!previewRequested || !posters.length) && <div className="rounded-xl border border-dashed border-yellow-300/30 p-12 text-center text-white/55">Choose the day and month, add your matchups, then press Preview all posters. Pictures load automatically.</div>}
      {previewRequested && !!posters.length && <div aria-label="All H2H poster previews" className="space-y-6"><p className="font-bold text-yellow-200">All {posters.length} poster previews</p>{parsed.rows.map(row=><article key={row.id} className={`rounded-xl border p-4 ${selectedRow?.id===row.id?'border-yellow-300/40':'border-white/15'}`}><h3 className="mb-4 break-all text-sm font-bold text-yellow-200">{row.name1.toUpperCase()} vs {row.name2.toUpperCase()} · {h2hDate(date)}┃{h2hTime(row.minutes)}</h3><div className="flex min-w-0 flex-wrap justify-center gap-4">{posters.filter(p=>p.id.startsWith(row.id+'-')).map((poster,i)=><div key={poster.id} data-h2h-preview={poster.id} className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-white/15 bg-black/30 p-3"><p className="mb-3 max-w-[290px] break-all text-center text-xs font-bold">{i+1}. {poster.name1} vs {poster.name2}{twoVTwo&&<><br/>{poster.name3} vs {poster.name4}</>}</p>{renderPoster({...poster,id:'h2h-preview-'+poster.id},0.27)}</div>)}</div></article>)}</div>}
    </section>
    <div ref={frame} aria-hidden="true" style={{position:'fixed',left:-12000,top:0,pointerEvents:'none'}}>{exportBattle && renderPoster(exportBattle,1)}</div>
  </div>;
}
