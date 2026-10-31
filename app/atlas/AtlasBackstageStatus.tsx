"use client";
import { useEffect, useState } from "react";
export default function AtlasBackstageStatus(){
 const [latest,setLatest]=useState(""),[state,setState]=useState("Checking"),[detail,setDetail]=useState("Latest data: —");
 useEffect(()=>{let active=true;void(async()=>{try{const c=await fetch("/api/atlas/config",{cache:"no-store"});if(c.status===401){window.location.assign("/atlas/login");return;}const config=await c.json();if(!c.ok)throw Error(config.error);if(!config.configured){if(active){setState("Database setup required");setDetail("Connect Atlas database");}return;}const r=await fetch("/api/atlas/data-analysis/upload-status?latest=true",{cache:"no-store"});const j=await r.json();if(!r.ok)throw Error(j.error);if(active){const day=j.latestDate||"";setLatest(day);setState(day?"Loaded":"No uploads yet");setDetail(day?`Latest data: ${day}`:"Latest data: —");}}catch{if(active){setState("Unavailable");setDetail("Refresh to retry");}}})();return()=>{active=false;};},[]);
 const yesterday=new Date(Date.now()-86400000).toLocaleDateString("en-CA",{timeZone:"Europe/London"});
 const updated=Boolean(latest&&latest>=yesterday),label=state==="Loaded"?(updated?"Updated":"Update due"):state;
 return <div role="status" className={`mt-7 flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-[10px] font-black uppercase tracking-[.16em] ${updated?"border-emerald-300/35 bg-emerald-300/[.07] text-emerald-200":"border-sky-300/25 bg-sky-300/[.06] text-sky-200"}`}><span>Backstage status: {label}</span><span className="text-[9px] text-white/45">{detail}</span></div>;
}
