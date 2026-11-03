"use client";
import Link from 'next/link';
import Image from 'next/image';
import {useEffect,useMemo,useRef,useState} from 'react';
import {STAR_CAMPAIGNS,STARTING_STARS,starTotal,minimumStarValue,type CampaignId,type StarCreator,type StarAward} from '@/lib/star-tracker';
import styles from './tracker.module.css';
import BulkStars from './BulkStars';

type Draft={value:string;revision:number};
type Payload={creators:StarCreator[];latestDate:string};
const DRAFT_KEY='first-class-star-tracker-drafts-v1';
const cellKey=(id:string,campaign:CampaignId)=>id+':'+campaign;
const isNumber=(value:string,campaign:CampaignId)=>(value.trim()===''||(campaign==='manual-star-adjustments'?/^-?\d+$/:/^\d+$/).test(value))&&Number(value)>=minimumStarValue(campaign)&&Number(value)<=1000000;
function Star({size=26}:{size?:number}){return <Image src="/star-tracker/gold-star.png" alt="" width={size} height={size} className={styles.star}/>;}

export default function Tracker(){
 const [data,setData]=useState<Payload>({creators:[],latestDate:''}),[loaded,setLoaded]=useState(false),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
 const [query,setQuery]=useState(''),[sort,setSort]=useState('total'),[view,setView]=useState<'tracker'|'leaderboard'>('tracker'),[page,setPage]=useState(0);
 const [drafts,setDrafts]=useState<Record<string,Draft>>({}),[errors,setErrors]=useState<Record<string,string>>({}),[saving,setSaving]=useState<string[]>([]),[saved,setSaved]=useState<string[]>([]),[notice,setNotice]=useState('');
 const [bulkBusy,setBulkBusy]=useState(false);
 const [manualOrder,setManualOrder]=useState<string[]|null>(null);
 const active=useRef(new Set<string>()),restored=useRef(false);
 async function load(){
  setLoading(true);setLoadError('');
  try{
   const response=await fetch('/api/star-tracker',{cache:'no-store'});const body=await response.json();if(!response.ok)throw Error(body.error||'Could not load creators.');
   setData(body);setLoaded(true);
   if(!restored.current){
    try{const recovery=JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}'),validIds=new Set(body.creators.map((c:StarCreator)=>c.id)),safe:Record<string,Draft>={};for(const [key,value] of Object.entries(recovery)){const [id,campaign]=key.split(':'),draft=value as Draft;if(validIds.has(id)&&STAR_CAMPAIGNS.some(c=>c.id===campaign)&&typeof draft.value==='string'&&Number.isSafeInteger(draft.revision)&&draft.revision>=0)safe[key]=draft;}setDrafts(safe);if(Object.keys(safe).length)setNotice('Your unfinished edits have been restored. Review them and press Save edits.');}catch{/* Saved awards still load if browser draft storage is unavailable. */}
    restored.current=true;
   }
  }catch(error){setLoadError(error instanceof Error?error.message:'Could not load creators.');}finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 useEffect(()=>{
  const refresh=()=>{if(!loading&&!bulkBusy&&!Object.keys(drafts).length&&!active.current.size&&document.visibilityState==='visible')void load();};
  const timer=window.setInterval(refresh,60000);window.addEventListener('focus',refresh);
  return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[drafts,loading,bulkBusy]);
 useEffect(()=>{if(!restored.current)return;try{localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts));}catch{if(Object.keys(drafts).length)setNotice('Browser draft backup is unavailable. Save your edits before leaving this page.');}},[drafts]);
 useEffect(()=>{function warn(e:BeforeUnloadEvent){if(Object.keys(drafts).length||active.current.size||bulkBusy){e.preventDefault();e.returnValue='';}}window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[drafts,bulkBusy]);
 function total(creator:StarCreator){return starTotal(creator)+STAR_CAMPAIGNS.reduce((sum,c)=>{const draft=drafts[cellKey(creator.id,c.id)];return sum+(draft&&isNumber(draft.value,c.id)?Number(draft.value)-(creator.awards[c.id]?.stars||0):0);},0);}
 const ranked=useMemo(()=>[...data.creators].sort((a,b)=>starTotal(b)-starTotal(a)||a.username.localeCompare(b.username)),[data.creators]);
 const ranks=new Map(ranked.map((c,i)=>[c.id,i+1]));
 const tableRanked=useMemo(()=>{if(!manualOrder)return ranked;const byId=new Map(ranked.map(c=>[c.id,c]));return manualOrder.flatMap(id=>byId.has(id)?[byId.get(id)!]:[]);},[ranked,manualOrder]);
 const filtered=useMemo(()=>{
  const list=(view==='leaderboard'?ranked:sort==='total'?tableRanked:[...data.creators].sort((a,b)=>a.username.localeCompare(b.username))).filter(c=>c.username.toLowerCase().includes(query.trim().replace(/^@/,'').toLowerCase()));
  return list;
 },[ranked,tableRanked,data.creators,view,sort,query]);
 const visible=filtered.slice(page*40,(page+1)*40),dirtyCount=Object.keys(drafts).length;
 function edit(creator:StarCreator,campaign:CampaignId,value:string){
  const key=cellKey(creator.id,campaign);setDrafts(old=>({...old,[key]:{value,revision:old[key]?.revision??creator.awards[campaign]?.revision??0}}));setSaved(old=>old.filter(v=>v!==key));
  if(isNumber(value,campaign))setErrors(old=>{const next={...old};delete next[key];return next;});
 }
 function acceptAward(award:StarAward){setData(old=>({...old,creators:old.creators.map(c=>c.id===award.creatorId?{...c,awards:{...c.awards,[award.campaign]:award}}:c)}));}
 async function save(creator:StarCreator,campaign:CampaignId,override?:Draft){
  const key=cellKey(creator.id,campaign),draft=override||drafts[key];if(!draft||active.current.has(key))return;
  if(!isNumber(draft.value,campaign)){setErrors(old=>({...old,[key]:`Enter a whole number from ${minimumStarValue(campaign).toLocaleString()} to 1,000,000. Use 0 for no stars.`}));return;}
  active.current.add(key);setSaving([...active.current]);setErrors(old=>{const next={...old};delete next[key];return next;});
  try{
   const response=await fetch('/api/star-tracker',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({creatorId:creator.id,campaign,stars:Number(draft.value),revision:draft.revision})});const body=await response.json();
   if(!response.ok){if(response.status===409&&body.award){acceptAward(body.award);setDrafts(old=>({...old,[key]:{...draft,revision:body.award.revision}}));}throw Error(body.error||'Could not save. Your edit is still here.');}
   acceptAward(body.award);setNotice('');setDrafts(old=>{const next={...old};if(next[key]?.value===draft.value)delete next[key];return next;});setSaved(old=>[...old.filter(v=>v!==key),key]);
  }catch(error){setErrors(old=>({...old,[key]:error instanceof Error?error.message:'Save failed. Your edit is still here.'}));}
  finally{active.current.delete(key);setSaving([...active.current]);}
 }
 function adjustManual(creator:StarCreator,delta:number){
  const campaign='manual-star-adjustments',key=cellKey(creator.id,campaign);if(active.current.has(key)||bulkBusy)return;
  const existing=drafts[key],current=existing&&isNumber(existing.value,campaign)?Number(existing.value):creator.awards[campaign]?.stars??0;
  const value=String(Math.max(-1000000,Math.min(1000000,current+delta))),revision=existing?.revision??creator.awards[campaign]?.revision??0;
  edit(creator,campaign,value);void save(creator,campaign,{value,revision});
 }
 function discard(key:string){setDrafts(old=>{const next={...old};delete next[key];return next;});setErrors(old=>{const next={...old};delete next[key];return next;});}
 async function saveAll(){for(const creator of data.creators)for(const campaign of STAR_CAMPAIGNS)if(drafts[cellKey(creator.id,campaign.id)])await save(creator,campaign.id);}
 function safeLeave(event:React.MouseEvent){if((dirtyCount||bulkBusy)&&!window.confirm('Some edits are not saved yet. Leave this page? Your draft will stay on this device.'))event.preventDefault();}

 return <main className={styles.page}>
  <div className={styles.scenery} aria-hidden="true"/>
  <div className={styles.wrap}>
   <nav className={styles.nav}><Link href="/login" onClick={safeLeave}>← First Class Space</Link><span>First Class Agency · Competition HQ</span></nav>
   <header className={styles.hero}>
    <div className={styles.eyebrow}><span/> THE JUNGLE IS CALLING</div>
    <h1>I’m a Streamer,<br/><span>Get Me OUTTA Here!</span></h1>
    <div className={styles.subtitle}><Star size={32}/><p>Star Tracker</p><Star size={32}/></div>
    <p className={styles.intro}>Every challenge counts. Every star brings you closer.</p>
    <div className={styles.summary}><div><span>IN THE JUNGLE</span><strong>{loaded?data.creators.length.toLocaleString():'—'} <small>creators</small></strong></div><div><span>EVERY CREATOR STARTS WITH</span><strong><Star size={25}/>10 <small>stars</small></strong></div></div>
   </header>
   <section className={styles.panel} aria-label="Star Tracker">
    <div className={styles.toolbar}>
     <div className={styles.tabs}><button aria-pressed={view==='tracker'} onClick={()=>{setView('tracker');setPage(0);}}>Campaign tracker</button><button aria-pressed={view==='leaderboard'} onClick={()=>{setView('leaderboard');setPage(0);}}>Leaderboard</button></div>
     <div className={styles.tools}><a href="/api/star-tracker?backup=1" download>Download backup</a><button disabled={loading||dirtyCount>0||saving.length>0||bulkBusy} onClick={()=>void load()}>↻ Refresh creators</button><button className={styles.primary} disabled={!dirtyCount||saving.length>0||bulkBusy} onMouseDown={e=>e.preventDefault()} onClick={()=>void saveAll()}>{saving.length?'Saving…':dirtyCount?`Save edits (${dirtyCount})`:'All changes saved'}</button></div>
    </div>
    {loaded&&<BulkStars creators={data.creators} disabled={dirtyCount>0||saving.length>0} onAwards={awards=>awards.forEach(acceptAward)} onBusyChange={setBulkBusy} onComplete={()=>void load()}/>}
    <div className={styles.filters}><label><span>Find a creator</span><input type="search" value={query} placeholder="Search username…" onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label><label><span>Sort creators</span><select value={view==='leaderboard'?'total':sort} disabled={view==='leaderboard'} onChange={e=>{setSort(e.target.value);setPage(0);}}><option value="total">Total Stars · Highest first</option><option value="name">Username · A–Z</option></select></label></div>
    <div className={styles.status} aria-live="polite"><span>{saving.length?'Saving your stars…':dirtyCount?`${dirtyCount} unfinished ${dirtyCount===1?'edit':'edits'} · totals include your edits`:loaded?'Changes save when you leave a field or press Enter.':'Loading your First Class creators…'}</span>{data.latestDate&&<span>Creator data: {new Date(data.latestDate+'T12:00:00').toLocaleDateString('en-GB')}</span>}</div>
    {notice&&<p className={styles.notice}>{notice}</p>}
    {loadError&&<div role="alert" className={styles.error}>{loadError} <button onClick={()=>void load()}>Try again</button></div>}
    {loading&&!loaded&&<div className={styles.empty} role="status">Gathering the camp…</div>}
    {loaded&&view==='tracker'&&<>
     <p className={styles.scrollHint}>Swipe the table sideways to see every campaign → <span>Usernames and star counts stay in view.</span></p>
     <div className={styles.tableScroll} role="region" aria-label="Scrollable campaign awards" tabIndex={0}>
      <table className={styles.table}><thead><tr><th scope="col">Creator’s username</th><th scope="col">Starting Stars</th>{STAR_CAMPAIGNS.map(c=><th scope="col" key={c.id}>{c.label}</th>)}</tr></thead><tbody>
       {visible.map(creator=><tr key={creator.id}>
        <th scope="row"><span className={styles.username}>@{creator.username}</span><span className={styles.rowTotal}><Star size={19}/><b data-total={creator.id}>{total(creator).toLocaleString()}</b></span></th>
        <td><span className={styles.starting}><Star size={32}/><b>{STARTING_STARS}</b></span></td>
        {STAR_CAMPAIGNS.map(c=>{
         const key=cellKey(creator.id,c.id),draft=drafts[key],error=errors[key],isSaving=saving.includes(key),manual=c.id==='manual-star-adjustments';
         return <td key={c.id} className={error?styles.cellError:''}>
          <div className={manual?styles.adjustment:undefined} tabIndex={manual?0:undefined} onFocusCapture={()=>{if(manual)setManualOrder(current=>current||ranked.map(row=>row.id));}} onBlurCapture={e=>{if(manual&&!e.currentTarget.contains(e.relatedTarget as Node|null))setManualOrder(null);}}>
           {manual&&<button type="button" aria-label={`Decrease manual stars for ${creator.username}`} disabled={isSaving||bulkBusy} onMouseDown={e=>e.preventDefault()} onClick={e=>{e.currentTarget.parentElement?.focus();adjustManual(creator,-1);}}>↓</button>}
           <input type="text" inputMode={manual?'text':'numeric'} pattern={manual?'-?[0-9]*':'[0-9]*'} aria-label={`${c.label} stars for ${creator.username}`} aria-invalid={Boolean(error)} value={draft?.value??String(creator.awards[c.id]?.stars??0)} disabled={isSaving||bulkBusy} onChange={e=>edit(creator,c.id,e.target.value)} onBlur={()=>{if(!errors[key])void save(creator,c.id);}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void save(creator,c.id);}if(e.key==='Escape')discard(key);}}/>
           {manual&&<button type="button" aria-label={`Increase manual stars for ${creator.username}`} disabled={isSaving||bulkBusy} onMouseDown={e=>e.preventDefault()} onClick={e=>{e.currentTarget.parentElement?.focus();adjustManual(creator,1);}}>↑</button>}
          </div>
          <span className={styles.cellStatus}>{isSaving?'Saving…':error?'Not saved':draft?'Unsaved':saved.includes(key)?'✓ Saved':''}</span>
          {error&&<div role="alert" className={styles.cellMessage}><p>{error}</p><button onClick={()=>void save(creator,c.id)}>Retry my value</button><button onClick={()=>discard(key)}>Use saved value ({creator.awards[c.id]?.stars??0})</button></div>}
         </td>;
        })}
       </tr>)}
      </tbody></table>
     </div>
    </>}
    {loaded&&view==='leaderboard'&&<ol className={styles.leaderboard}>{visible.map(creator=><li key={creator.id}><span className={styles.rank}>{ranks.get(creator.id)}</span><span className={styles.leaderName}>@{creator.username}</span><strong><Star size={28}/>{total(creator).toLocaleString()}<small>stars</small></strong></li>)}</ol>}
    {loaded&&!filtered.length&&<p className={styles.empty}>{data.creators.length?'No creators match your search.':'No First Class creators found in the latest upload. Existing awards are safely stored.'}</p>}
    <footer className={styles.pagination}><span>{filtered.length?`${page*40+1}–${Math.min((page+1)*40,filtered.length)} of ${filtered.length.toLocaleString()} creators`:'0 creators'}</span><div><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>← Previous</button><button disabled={(page+1)*40>=filtered.length} onClick={()=>setPage(p=>p+1)}>Next →</button></div></footer>
   </section>
   <p className={styles.footnote}>FIRST CLASS AGENCY · I’M A STREAMER, GET ME OUTTA HERE!<br/><span>Starting stars + campaign awards = Total Stars</span></p>
  </div>
 </main>;
}
