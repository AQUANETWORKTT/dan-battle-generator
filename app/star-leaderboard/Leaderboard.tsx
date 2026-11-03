"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {leaderboardTeam,localStarAvatar,searchStandings,type StarStanding} from '@/lib/star-leaderboard';
import styles from './leaderboard.module.css';

function Star({className=''}:{className?:string}){return <img src="/star-tracker/gold-star.png" alt="" width="36" height="36" className={className}/>;}
function Avatar({username}:{username:string}){return <span className={styles.avatar}><span aria-hidden="true">{username.slice(0,2).toUpperCase()}</span><img src={localStarAvatar(username)||'/api/star-leaderboard/avatar?username='+encodeURIComponent(username)} alt={username+"'s profile picture"} loading="lazy" decoding="async" width="56" height="56" onError={event=>{event.currentTarget.style.display='none';}}/></span>;}
export default function Leaderboard(){
 const [rows,setRows]=useState<StarStanding[]>([]),[query,setQuery]=useState(''),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const controller=useRef<AbortController|null>(null);
 const scenery=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let frame=0;const move=()=>{frame=0;scenery.current?.style.setProperty('--scenery-shift',reduced.matches?'0px':Math.min(window.scrollY*.055,90)+'px');};const scroll=()=>{if(!frame)frame=requestAnimationFrame(move);};window.addEventListener('scroll',scroll,{passive:true});reduced.addEventListener('change',scroll);move();return()=>{window.removeEventListener('scroll',scroll);reduced.removeEventListener('change',scroll);cancelAnimationFrame(frame);};},[]);
 async function refresh(){
  controller.current?.abort();const request=new AbortController();controller.current=request;setBusy(true);
  try{const response=await fetch('/api/star-leaderboard',{cache:'no-store',signal:request.signal});const data=await response.json();if(!response.ok)throw Error(data.error||'Please try again shortly.');if(!request.signal.aborted){setRows(data.standings);setLoaded(true);setError('');}}
  catch(e){if(!request.signal.aborted)setError(e instanceof Error?e.message:'Please try again shortly.');}
  finally{if(!request.signal.aborted)setBusy(false);}
 }
 useEffect(()=>{void refresh();const visible=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',visible);const timer=setInterval(visible,30000);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);controller.current?.abort();};},[]);
 const shown=useMemo(()=>searchStandings(rows,query),[rows,query]);
 const searching=Boolean(query.trim().replace(/^@/,''));
 return <main className={styles.page}>
  <div ref={scenery} className={styles.scenery} aria-hidden="true"/>
  <div className={styles.wrap}>
   <div className={styles.brand}><span>FIRST CLASS <b>AGENCY</b></span><span className={styles.season}>THE JUNGLE CHALLENGE</span></div>
   <header className={styles.hero}>
    <span className={styles.eyebrow}><span/> THE STARS. THE STAKES. THE STANDINGS.</span>
    <h1>I’M A STREAMER,<span>GET ME <em>OUTTA</em> HERE!</span></h1>
    <div className={styles.heroSubtitle}><span/><Star/> STAR LEADERBOARD <Star/><span/></div>
    <p>Every star counts. Find your place in the jungle.</p>
   </header>
   <section className={styles.board} aria-label="Creator star leaderboard">
    <div className={styles.searchWrap}>
     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
     <input type="search" aria-label="Search all creators" placeholder="FIND YOUR USERNAME…" value={query} onChange={e=>setQuery(e.target.value)} autoComplete="off" spellCheck={false}/>
     {query&&<button onClick={()=>setQuery('')} aria-label="Clear search">×</button>}
    </div>
    {error&&<div className={styles.error} role="status">{loaded?'The last saved standings are shown. ':''}{error}<button onClick={()=>void refresh()} disabled={busy}>{busy?'Refreshing…':'Try again'}</button></div>}
    {!loaded&&!error?<div className={styles.loading} role="status"><Star/><p>Gathering the jungle standings…</p></div>:<>
     <div className={styles.columnLabels} aria-hidden="true"><span>RANK</span><span>CREATOR / TEAM</span><span>STARS</span></div>
     <ol className={styles.list} aria-label={searching?'Search results with overall ranks':'Top 100 creators'}>
      {shown.map(row=><li key={row.username} className={styles.row+' '+(row.rank<=3?styles['place'+row.rank]:'')}>
       <div className={styles.rank} aria-label={(row.joint?'Joint rank ':'Rank ')+row.rank}><strong>{row.rank}</strong>{row.joint&&<span>JOINT</span>}</div>
       <div className={styles.creator}><Avatar username={row.username}/><div className={styles.identity}><span className={styles.username}>@{row.username}</span><span className={styles.team}>{leaderboardTeam(row.team)}</span></div></div>
       <div className={styles.stars} data-large={Math.abs(row.stars)>=10000||undefined} data-huge={Math.abs(row.stars)>=1000000||undefined} aria-label={row.stars.toLocaleString()+' stars'}><Star/><div><strong>{row.stars.toLocaleString()}</strong><span>STARS</span></div></div>
      </li>)}
     </ol>
     {loaded&&!shown.length&&<div className={styles.empty}><Star/><h3>{searching?'No creator found':'The jungle is getting ready.'}</h3><p>{searching?'Check the username or try a shorter search.':'The standings will appear here when the creator roster is ready.'}</p>{searching&&<button onClick={()=>setQuery('')}>Back to the top 100</button>}</div>}
    </>}
   </section>
   <footer className={styles.footer}><Star/><span>FIRST CLASS AGENCY <b>·</b> THE JUNGLE IS WATCHING.</span><Star/></footer>
  </div>
 </main>;
}
