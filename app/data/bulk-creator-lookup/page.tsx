'use client';
import Link from 'next/link';
import {useRef,useState,type FormEvent} from 'react';
import DataAccessGuard from '@/app/components/DataAccessGuard';
import {parseLookupNames,copyLookupResults,type LookupResult} from '@/lib/bulk-creator-lookup';

type HistoryState={loading?:boolean;error?:string;items?:{date:string;manager:string}[]};
export default function BulkCreatorLookup(){
 const [input,setInput]=useState(''),[results,setResults]=useState<LookupResult[]>([]),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[copied,setCopied]=useState(false),[history,setHistory]=useState<Record<string,HistoryState>>({});
 const active=useRef<AbortController|null>(null),generation=useRef(0);
 const summary={total:results.length,found:results.filter(r=>r.status!=='not-found').length,notFound:results.filter(r=>r.status==='not-found').length,unassigned:results.filter(r=>r.status==='unassigned').length};
 function clear(){generation.current++;active.current?.abort();setInput('');setResults([]);setHistory({});setError('');setBusy(false);setProgress('');setCopied(false);}
 async function check(event:FormEvent){
  event.preventDefault();active.current?.abort();const controller=new AbortController();active.current=controller;const version=++generation.current;
  const names=parseLookupNames(input);if(!names.length){setError('Paste at least one username.');return;}
  setBusy(true);setError('');setCopied(false);setResults([]);setHistory({});
  try{
   // No list-size cap; requests are bounded to avoid hosting body/time limits.
   const unique=[...new Set(names)],byName=new Map<string,LookupResult>();
   for(let from=0;from<unique.length;from+=200){
    setProgress(`Checking ${Math.min(from+200,unique.length).toLocaleString()} of ${unique.length.toLocaleString()}…`);
    const response=await fetch('/api/data-analysis/bulk-creator-lookup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usernames:unique.slice(from,from+200).join('\n')}),signal:controller.signal});
    const data=await response.json();if(!response.ok)throw Error(data.error||'Could not check creators.');
    for(const row of data.results)byName.set(row.username,row);
   }
   if(version===generation.current)setResults(names.map(n=>byName.get(n)!));
  }catch(e){if(version===generation.current&&!controller.signal.aborted)setError(e instanceof Error?e.message:'Could not check creators.');}
  finally{if(version===generation.current){setBusy(false);setProgress('');}}
 }
 async function loadHistory(id:string){
  if(history[id]?.items||history[id]?.loading)return;
  const version=generation.current;setHistory(h=>({...h,[id]:{loading:true}}));
  try{const response=await fetch(`/api/data-analysis/bulk-creator-lookup?creatorId=${encodeURIComponent(id)}`);const data=await response.json();if(!response.ok)throw Error(data.error||'Could not load history.');if(version===generation.current)setHistory(h=>({...h,[id]:{items:data.history}}));}
  catch(e){if(version===generation.current)setHistory(h=>({...h,[id]:{error:e instanceof Error?e.message:'Could not load history.'}}));}
 }
 async function copy(){try{await navigator.clipboard.writeText(copyLookupResults(results));setCopied(true);}catch{setError('Could not copy automatically. Select and copy the results below.');}}
 return <DataAccessGuard><main className="min-h-screen px-5 py-6 text-white sm:px-8 sm:py-8"><div className="mx-auto max-w-5xl">
  <nav className="flex flex-wrap justify-between gap-4 border-b border-white/10 pb-5 text-sm"><Link href="/data/menu" className="text-yellow-200">← Data Space</Link><Link href="/data/creator-id-lookup" className="text-sky-200">Creator ID Lookup →</Link></nav>
  <section className="mt-8 rounded-3xl border border-sky-300/25 bg-[#111512]/95 p-5 sm:p-8"><h1 className="font-[family-name:var(--font-norwester)] text-3xl uppercase sm:text-5xl">Bulk Creator Lookup</h1>
   <form onSubmit={check} className="mt-6"><label htmlFor="creator-usernames" className="mb-2 block text-sm text-white/75">Creator usernames — one per line</label><textarea id="creator-usernames" value={input} onChange={e=>setInput(e.target.value)} rows={12} spellCheck={false} autoCapitalize="none" autoCorrect="off" className="w-full resize-y rounded-xl border border-white/20 bg-black/50 p-4 font-mono text-sm outline-none focus:border-sky-300" placeholder={'creator1\n@creator2\ncreator3'} />
    <div className="mt-4 flex flex-wrap gap-3"><button disabled={busy||!input.trim()} className="rounded-xl bg-sky-300 px-5 py-3 text-sm font-bold text-black disabled:opacity-50">{busy?'Checking…':'Check creators'}</button><button type="button" onClick={clear} className="rounded-xl border border-white/25 px-5 py-3 text-sm">Clear</button>{results.length>0&&<button type="button" onClick={copy} className="rounded-xl bg-yellow-300 px-5 py-3 text-sm font-bold text-black">{copied?'Copied!':'Copy Results'}</button>}</div>
   </form>
   <p role="status" aria-live="polite" className="mt-3 text-sm text-sky-200">{progress}</p>{error&&<p role="alert" className="mt-3 text-rose-200">{error}</p>}
  </section>
  {results.length>0&&<section className="mt-6 pb-10"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Total searched',summary.total],['Found',summary.found],['Not found',summary.notFound],['Unassigned',summary.unassigned]].map(([label,value])=><div key={label} className="rounded-xl border border-white/15 bg-[#111512] p-4"><p className="text-xs text-white/65">{label}</p><p className="mt-1 text-2xl font-bold">{Number(value).toLocaleString()}</p></div>)}</div>
   <div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/15 bg-[#0b100d]">{results.map((r,index)=><div key={index} className="p-4"><p className={`break-words text-sm ${r.status==='not-found'?'text-rose-200':r.status==='unassigned'?'text-yellow-200':'text-white'}`}>{r.username} - {r.manager}</p>{r.creatorId&&<details className="mt-2 text-xs text-white/65" onToggle={e=>{if(e.currentTarget.open)void loadHistory(r.creatorId!);}}><summary className="w-fit cursor-pointer py-1 text-sky-200">Manager history</summary>{history[r.creatorId]?.loading?<p className="py-2">Loading history…</p>:history[r.creatorId]?.error?<div className="py-2 text-rose-200">{history[r.creatorId].error} <button onClick={()=>loadHistory(r.creatorId!)} className="underline">Retry</button></div>:<><p className="py-2 text-white/45">Dates reflect saved uploads. Team names use current assignment labels.</p>{history[r.creatorId]?.items?.length?history[r.creatorId].items!.map((h,i)=><p key={i} className="py-1">{h.date} — {h.manager}</p>):<p>No manager history available.</p>}</>}</details>}</div>)}</div>
  </section>}
 </div></main></DataAccessGuard>;
}
