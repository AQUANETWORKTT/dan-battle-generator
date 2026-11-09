"use client";
import {useState} from 'react';
import {STAR_CAMPAIGNS,type CampaignId,type StarCreator} from '@/lib/star-tracker';
import styles from './tracker.module.css';

export default function CompletedLists({creators,unsaved}:{creators:StarCreator[];unsaved:boolean}){
 const [open,setOpen]=useState(false),[campaign,setCampaign]=useState<CampaignId>('gift-gallery'),[message,setMessage]=useState('');
 const campaigns=STAR_CAMPAIGNS.filter(c=>c.id!=='manual-star-adjustments');
 const completed=creators.filter(c=>(c.awards[campaign]?.stars||0)>0).sort((a,b)=>a.username.localeCompare(b.username,'en',{sensitivity:'base'}));
 const text=completed.map(c=>c.username).join('\n');
 async function copy(){try{await navigator.clipboard.writeText(text);setMessage(`Copied ${completed.length} usernames.`);}catch{setMessage('Could not copy automatically. Select and copy the list below.');}}
 return <section className={styles.bulk} aria-label="Completed lists">
  <button className={styles.bulkToggle} aria-expanded={open} onClick={()=>setOpen(!open)}>Completed lists<span>{open?'−':'+'}</span></button>
  {open&&<div className={styles.bulkBody}>
   <p>View everyone with saved stars for an event. These lists use recorded points, not an automatic check of diamond targets.</p>
   {unsaved&&<p role="status">Save your pending edits to include them in this list.</p>}
   <div className={styles.bulkGrid}>
    <div className={styles.bulkOptions}>
     <label><span>Select event</span><select value={campaign} onChange={e=>{setCampaign(e.target.value as CampaignId);setMessage('');}}>{campaigns.map(c=><option key={c.id} value={c.id}>{c.label} ({creators.filter(creator=>(creator.awards[c.id]?.stars||0)>0).length})</option>)}</select></label>
     <div className={styles.bulkPreview}><strong>{completed.length} creators with points</strong></div>
     <button className={styles.primary} disabled={!completed.length} onClick={()=>void copy()}>Copy usernames</button>
     <p role="status">{message}</p>
    </div>
    <label><span>Completed usernames · A–Z</span><textarea readOnly value={text} placeholder="No saved points for this event yet." aria-label="Completed usernames"/></label>
   </div>
  </div>}
 </section>;
}
