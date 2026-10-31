"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
type DayFiles=Record<number,File>;
type SavedDays=Record<number,number>;
const months=Array.from({length:24},(_,index)=>{const date=new Date(new Date().getFullYear()-1+Math.floor(index/12),index%12,1);return {value:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`,label:date.toLocaleDateString("en-GB",{month:"long",year:"numeric"})};});
const button="rounded-xl border border-white/15 bg-white/[.035] px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:border-sky-300/50 disabled:opacity-40";
export default function AtlasUpload(){
 const [month,setMonth]=useState(()=>new Date().toLocaleDateString("en-CA",{timeZone:"Europe/London"}).slice(0,7));
 const [files,setFiles]=useState<DayFiles>({}),[saved,setSaved]=useState<SavedDays>({}),[loading,setLoading]=useState(false),[refreshing,setRefreshing]=useState(false),[message,setMessage]=useState(""),[mature,setMature]=useState<File|null>(null);
 const request=useRef(0),currentMonth=useRef(month);currentMonth.current=month;
 const daysInMonth=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 const monthName=new Date(`${month}-01T12:00:00`).toLocaleDateString("en-GB",{month:"long"});
 const selectedCount=Object.keys(files).length;
 async function refresh(target=month){
  const id=++request.current;setRefreshing(true);
  try{const r=await fetch(`/api/atlas/data-analysis/upload-status?month=${target}`,{cache:"no-store"});const j=await r.json();if(!r.ok)throw Error(j.error||"Could not load upload status.");if(id===request.current&&target===currentMonth.current){setSaved(j.days||{});setMessage("");}}
  catch(e){if(id===request.current&&target===currentMonth.current){setSaved({});setMessage(e instanceof Error?e.message:"Could not load upload status.");}}
  finally{if(id===request.current)setRefreshing(false);}
 }
 useEffect(()=>{void refresh(month);return()=>{request.current++;};},[month]);
 function choose(day:number,file?:File){if(!file)return;if(!/\.(xlsx|xls|csv)$/i.test(file.name)){setMessage("Choose an XLSX, XLS or CSV Backstage export.");return;}setFiles(previous=>({...previous,[day]:file}));}
 async function upload(isMature=false){
  setLoading(true);setMessage("Importing Atlas creator stats…");
  try{const form=new FormData();form.set("month",month);
   if(isMature){if(!mature)throw Error("Choose a full-month export first.");form.set("mode","mature_month_total");form.set("mature_month_file",mature);}
   else for(const [day,file] of Object.entries(files))form.set(`day_${day}`,file);
   const r=await fetch("/api/atlas/data-analysis/import",{method:"POST",body:form}),j=await r.json();if(!r.ok)throw Error(j.error||"Import failed.");
   if(isMature){setMature(null);setMessage(`Imported ${j.totalRows??j.parsedRows??"your"} mature creator records for ${month}.`);}
   else{setFiles({});await refresh(month);setMessage(`Imported ${j.filesImported} files and ${j.totalRows} creator records. Atlas managers are detected automatically.`);}
  }catch(e){setMessage(e instanceof Error?e.message:"Import failed. Please retry.");}finally{setLoading(false);}
 }
 return <main className="min-h-screen bg-[#080806] px-5 py-6 text-white sm:px-8 sm:py-8"><div className="mx-auto max-w-7xl">
  <nav className="mb-4 flex flex-wrap gap-3"><Link href="/atlas/data/menu" className={button+" text-sky-200"}>Back to Data</Link><Link href="/atlas/leadership" className={button}>Leadership</Link><Link href="/atlas" className={button}>Back Home</Link></nav>
  <header className="rounded-[28px] border border-sky-300/35 bg-gradient-to-br from-black via-sky-300/[.035] to-sky-300/[.07] p-6"><h1 className="text-3xl font-black uppercase text-sky-300">Upload Creator Stats</h1><p className="mt-3 text-sm text-white/60">Select the month, add each Excel file into the correct day slot, then import. Re-uploading a day overwrites that day.</p></header>
  <section className="mt-7 grid gap-5 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:grid-cols-3"><label className="text-[10px] font-black uppercase tracking-wide text-white/45">Month<select aria-label="Upload month" value={month} disabled={loading} onChange={e=>{setMonth(e.target.value);setFiles({});setSaved({});setMature(null);}} className="mt-3 block w-full rounded-xl border border-sky-300/25 bg-black px-4 py-3 text-sm font-normal normal-case text-white">{months.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select></label><div><p className="text-[10px] font-black uppercase tracking-wide text-white/45">Files Selected Now</p><p className="mt-2 text-3xl font-black text-sky-300">{selectedCount}/{daysInMonth}</p></div><div><p className="text-[10px] font-black uppercase tracking-wide text-white/45">Days Already Uploaded</p><p className="mt-2 text-3xl font-black text-emerald-200">{refreshing?"…":Object.keys(saved).length}/{daysInMonth}</p></div></section>
  <section className="mt-6 flex flex-wrap justify-end gap-3 rounded-3xl border border-white/10 bg-white/[.035] p-4"><button type="button" className={button+" text-emerald-200"} disabled={loading||refreshing} onClick={()=>void refresh()}>{refreshing?"Refreshing…":"Refresh Status"}</button><button type="button" disabled={loading||!selectedCount} onClick={()=>void upload()} className="rounded-xl bg-sky-300 px-6 py-3 text-xs font-black uppercase text-black transition hover:bg-sky-200 disabled:opacity-40">{loading?"Importing…":"Import Selected Files"}</button></section>
  {message&&<p role="status" className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-300/[.04] p-4 text-sm leading-6 text-sky-100" style={{overflowWrap:"anywhere"}}>{message}</p>}
  <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Daily upload slots">{Array.from({length:daysInMonth},(_,i)=>i+1).map(day=><article key={`${month}-${day}`} className="rounded-3xl border border-sky-300/25 bg-black/30 p-4"><header className="flex items-center justify-between gap-2"><h2 className="text-base font-black uppercase text-sky-300">{day} {monthName}</h2><span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase ${files[day]?"bg-sky-300/20 text-sky-100":saved[day]?"bg-emerald-300/15 text-emerald-200":"bg-white/10 text-white/35"}`}>{files[day]?"Selected":saved[day]?"Saved":"Empty"}</span></header>
   <label onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!loading)choose(day,e.dataTransfer.files[0]);}} className={`mt-4 flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-sky-300/30 bg-white/[.015] p-4 text-center transition hover:border-sky-200 hover:bg-sky-300/[.04] ${loading?"opacity-50":"cursor-pointer"}`}><input aria-label={`Creator export for ${day} ${monthName}`} type="file" accept=".xlsx,.xls,.csv" disabled={loading} className="sr-only" onChange={e=>choose(day,e.target.files?.[0])}/><span className="max-w-full break-all text-xs font-bold text-sky-100">{files[day]?files[day].name:"Drop Excel file here"}</span><span className="mt-2 text-[10px] text-white/40">{files[day]?"or click to replace":"or click to choose"}</span></label>
   <div className="mt-4 flex min-h-5 items-center justify-between gap-2 text-[10px] text-white/40"><span>{saved[day]?`${saved[day].toLocaleString()} creators uploaded`:"No data uploaded yet"}</span>{files[day]&&<button type="button" disabled={loading} className="text-sky-200 underline" onClick={()=>setFiles(previous=>{const next={...previous};delete next[day];return next;})}>Remove file</button>}</div>
  </article>)}</section>
  <details className="mt-8 rounded-3xl border border-sky-300/20 bg-white/[.025] p-6"><summary className="cursor-pointer font-[family-name:var(--font-norwester)] text-2xl uppercase text-sky-200">Mature Creator Month Totals</summary><p className="mt-3 text-sm leading-6 text-white/55">Upload the final full-month export for {monthName}. These mature-creator totals are saved separately from the daily slots above.</p><input aria-label="Mature creator full-month export" type="file" accept=".xlsx,.xls,.csv" disabled={loading} className="mt-5 block max-w-full text-sm text-white/65 file:mr-4 file:rounded-xl file:border file:border-sky-300/30 file:bg-sky-300/10 file:px-4 file:py-3 file:text-sky-100" onChange={e=>setMature(e.target.files?.[0]||null)}/><button type="button" className={button+" mt-5 text-sky-200"} disabled={loading||!mature} onClick={()=>void upload(true)}>Import Mature Month Totals</button></details>
 </div></main>;
}
