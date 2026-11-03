"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {parseStarUsernames,STAR_CAMPAIGNS,type CampaignId,type StarAward,type StarBulkInput,type StarCreator} from '@/lib/star-tracker';
import styles from './tracker.module.css';
const KEY='first-class-star-tracker-bulk-draft-v1';
export default function BulkStars({creators,disabled,onAwards,onBusyChange,onComplete}:{creators:StarCreator[];disabled:boolean;onAwards:(awards:StarAward[])=>void;onBusyChange:(busy:boolean)=>void;onComplete:()=>void}){
 const [open,setOpen]=useState(false),[text,setText]=useState(''),[campaign,setCampaign]=useState<CampaignId>('gift-gallery'),[mode,setMode]=useState('add'),[amount,setAmount]=useState('5');
 const [pending,setPending]=useState<StarBulkInput|null>(null),[busy,setBusy]=useState(false),[complete,setComplete]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const [serverMissing,setServerMissing]=useState<string[]>([]);
 const [ready,setReady]=useState(false);const working=useRef(false);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){setText(saved.text||'');if(STAR_CAMPAIGNS.some(c=>c.id===saved.campaign))setCampaign(saved.campaign);setMode(saved.mode==='remove'?'remove':'add');setAmount(saved.amount||'5');if(saved.pending){setPending(saved.pending);setOpen(true);setStatus('An unfinished bulk edit was restored. Resume it safely; already saved awards will not be added twice.');}}}catch{}setReady(true);},[]);
 useEffect(()=>{if(ready)try{localStorage.setItem(KEY,JSON.stringify({text,campaign,mode,amount,pending}));}catch{}},[text,campaign,mode,amount,pending,ready]);
 const parsed=useMemo(()=>parseStarUsernames(text),[text]);
 const byName=useMemo(()=>new Map(creators.map(c=>[c.username.toLowerCase(),c])),[creators]);
 const unknown=parsed.usernames.filter(n=>!byName.has(n));
 const matched=parsed.usernames.flatMap(n=>byName.has(n)?[byName.get(n)!]:[]);
 const validAmount=/^\d+$/.test(amount)&&Number(amount)>0&&Number(amount)<=1000000;
 const label=STAR_CAMPAIGNS.find(c=>c.id===campaign)!.label;
 function changed(){setComplete(false);setError('');setStatus('');setServerMissing([]);}
 async function submit(){
  if(working.current)return;
  if(!pending&&(!validAmount||!parsed.usernames.length||parsed.usernames.length>2000))return;
  const operation=pending||{operationId:crypto.randomUUID(),campaign,delta:(mode==='remove'?-1:1)*Number(amount),usernames:parsed.usernames};
  working.current=true;setBusy(true);onBusyChange(true);setError('');
  try{
   // Persist before sending, so refresh/network retries retain the same ID.
   localStorage.setItem(KEY,JSON.stringify({text,campaign,mode,amount,pending:operation}));setPending(operation);
   for(let pass=0;pass<70;pass++){
    const response=await fetch('/api/star-tracker',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(operation)});const body=await response.json();
    if(!response.ok)throw Error(body.error||'Bulk save failed. Resume this same edit to safely continue.');
    onAwards(body.awards||[]);setServerMissing(body.missingUsernames||[]);setStatus(`${body.completed} of ${body.total} creators saved.`);
    if(body.errors?.length)throw Error(body.errors.map((e:{username:string;message:string})=>'@'+e.username+': '+e.message).join(' · '));
    if(body.done){setPending(null);setComplete(true);setStatus(`Saved for ${body.total} creators.${body.missingUsernames?.length?` ${body.missingUsernames.length} missing and skipped.`:''} Changes are shared across devices.`);localStorage.setItem(KEY,JSON.stringify({text,campaign,mode,amount,pending:null}));onComplete();return;}
   }
   throw Error('Some creators are still waiting. Resume this edit to continue safely.');
  }catch(e){setError(e instanceof Error?e.message:'Could not save. Resume this edit to continue safely.');}
  finally{working.current=false;setBusy(false);onBusyChange(false);}
 }
 return <section className={styles.bulk}>
  <button type="button" className={styles.bulkToggle} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>Bulk stars <span>{open?'−':'+'}</span></button>
  {open&&<div className={styles.bulkBody}>
   <p>Paste creator usernames, choose a campaign, then add or remove stars. Each creator is counted once. Missing creators are skipped; everyone matched is updated. {campaign==='manual-star-adjustments'?'Manual adjustments can be positive or negative.':'Removals stop at zero.'}</p>
   <div className={styles.bulkGrid}>
    <label className={styles.bulkNames}><span>Creator usernames</span><textarea aria-label="Bulk creator usernames" value={text} disabled={busy||Boolean(pending)} onChange={e=>{setText(e.target.value);changed();}} placeholder={'@creator_one\n@creator_two\n@creator_three'}/></label>
    <div className={styles.bulkOptions}>
     <label><span>Campaign column</span><select aria-label="Bulk campaign column" value={campaign} disabled={busy||Boolean(pending)} onChange={e=>{setCampaign(e.target.value as CampaignId);changed();}}>{STAR_CAMPAIGNS.map(c=><option value={c.id} key={c.id}>{c.label}</option>)}</select></label>
     <div className={styles.bulkNumbers}><label><span>Action</span><select aria-label="Bulk star action" value={mode} disabled={busy||Boolean(pending)} onChange={e=>{setMode(e.target.value);changed();}}><option value="add">+ Add stars</option><option value="remove">− Remove stars</option></select></label><label><span>Stars per creator</span><input aria-label="Bulk stars per creator" type="text" inputMode="numeric" value={amount} disabled={busy||Boolean(pending)} onChange={e=>{setAmount(e.target.value);changed();}}/></label></div>
     <div className={styles.bulkPreview}>{matched.length} matched {matched.length===1?'creator':'creators'} · {mode==='remove'?'−':'+'}{validAmount?Number(amount):'…'} stars each<br/><strong>{label}</strong></div>
     <button type="button" className={styles.primary} disabled={busy||disabled||complete||(!pending&&(!validAmount||!parsed.usernames.length||parsed.usernames.length>2000))} onClick={()=>void submit()}>{busy?'Saving bulk stars…':pending?'Resume bulk edit':complete?'Bulk edit saved':'Submit bulk stars'}</button>
     {pending&&!busy&&<button type="button" onClick={()=>{setPending(null);setError('');setStatus('Remaining work cancelled. Already saved stars have been kept.');}}>Cancel remaining · keep saved stars</button>}
     {complete&&<button type="button" onClick={()=>{setText('');changed();}}>New bulk edit</button>}
    </div>
   </div>
   {matched.length>0&&<p className={styles.matchedNames}>{matched.slice(0,12).map(c=>'@'+c.username).join(' · ')}{matched.length>12?` · +${matched.length-12} more`:''}</p>}
   {Boolean(unknown.length||parsed.invalid.length||serverMissing.length)&&<p role="status" className={styles.matchedNames}>These creators are missing: {[...new Set([...unknown,...parsed.invalid,...serverMissing])].join(', ')}. They will be skipped.</p>}
   {disabled&&<p>Save your individual edits before using bulk stars.</p>}
   {parsed.usernames.length>2000&&<p role="alert">Use up to 2,000 usernames per bulk edit.</p>}
   {status&&<p role="status">{status}</p>}{error&&<p role="alert" className={styles.bulkError}>{error} Already saved changes are kept.</p>}
  </div>}
 </section>;
}
