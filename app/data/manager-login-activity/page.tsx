'use client';
import {useEffect,useMemo,useState} from 'react';
import {portalRequest} from '@/app/manager/Portal';
import {ACTIVITY_SIDES,activityTableManagers,type ActivityTier} from '@/lib/manager-activity-tables';
import type {ActivitySession} from '@/lib/manager-activity-summary';
import '@/app/manager/portal.css';
import './activity.css';
type Manager={group:string;tier:ActivityTier;id:string;name:string;loggedIn:boolean;count:number;lastLogin:string|null;lastActive:string|null;activeSeconds:number;sessions:ActivitySession[]};
type Activity={day:string;dayStart:string;dayEnd:string;managers:Manager[];events:{accountId:string;at:string}[]};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const time=(date:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'}).format(new Date(date));
const managerName=(name:string)=>name.replace(/^team\s+/i,'');
const duration=(seconds:number)=>`${Math.floor(seconds/3600)}h ${Math.floor(seconds%3600/60)}m ${Math.floor(seconds%60)}s`;
function shiftDay(day:string,amount:number){const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10);}
export default function Page(){
 const [side,setSide]=useState<string>(ACTIVITY_SIDES[0]),[tier,setTier]=useState<ActivityTier>('A');
 const [day,setDay]=useState(today),[data,setData]=useState<Activity|null>(null),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[selected,setSelected]=useState<string|null>(null);
 useEffect(()=>setSelected(null),[day,side,tier]);
 useEffect(()=>{const visible=()=>{if(document.visibilityState==='visible')setRefresh(v=>v+1);};const timer=setInterval(visible,30000);document.addEventListener('visibilitychange',visible);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);};},[]);
 useEffect(()=>{let alive=true;setData(current=>current?.day===day?current:null);setError('');portalRequest('login-activity?day='+day).then(d=>{if(alive)setData(d);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[day,refresh]);
 const managers=useMemo(()=>activityTableManagers(data?.managers||[],side,tier),[data,side,tier]);
 const start=data?Date.parse(data.dayStart):0,end=data?Date.parse(data.dayEnd):0,length=end-start;
 const hours=data?Array.from({length:Math.round(length/3600000)},(_,i)=>new Date(start+i*3600000).toISOString()):[];
 const selectedManager=managers.find(m=>m.id===selected);
 return <main className="manager-wrap activity-page">
  <a className="review-back" href="/data/menu">← Data Space</a>
  <div className="manager-hero"><p className="manager-eyebrow">First Class · Leadership</p><h1 className="manager-title">Manager activity</h1><p className="manager-muted">UK time · Foreground use pauses after five minutes idle. Active time is approximate; sign-ins are recorded separately.</p></div>
  <div className="activity-calendar"><button aria-label="Previous day" onClick={()=>setDay(d=>shiftDay(d,-1))}>←</button><label>Calendar day<input type="date" value={day} onChange={e=>{if(e.target.value)setDay(e.target.value);}}/></label><button aria-label="Next day" onClick={()=>setDay(d=>shiftDay(d,1))}>→</button><button onClick={()=>setDay(today())}>Today</button><button onClick={()=>setRefresh(v=>v+1)}>Refresh</button></div>
  <div className="activity-side-tabs" role="tablist" aria-label="Agency side">{ACTIVITY_SIDES.map(group=><button key={group} role="tab" aria-selected={side===group} className={side===group?'active':''} onClick={()=>setSide(group)}>{group==='Team Dan / James'?'Dan / James':'Mike / Indi'}</button>)}</div>
  <div className="activity-tier-tabs" role="tablist" aria-label="Manager table">{(['A','B'] as const).map(value=><button key={value} role="tab" aria-label={'Table '+value} aria-selected={tier===value} className={tier===value?'active':''} onClick={()=>setTier(value)}>Table {value}{data&&<span aria-hidden="true">{data.managers.filter(m=>m.group===side&&m.tier===value).length}</span>}</button>)}<span>Most active first</span></div>
  {error&&<p className="manager-error">{error}</p>}
  {!data&&!error&&<div className="manager-loading-creators" role="status">Loading manager activity…</div>}
  {data&&<>
   <h2 className="activity-table-title">{side.replace(/^Team /,'')} · Table {tier}</h2>
   <div className="activity-summary"><strong>{managers.filter(m=>m.loggedIn).length} / {managers.length} managers used the portal</strong><span>{duration(managers.reduce((sum,m)=>sum+m.activeSeconds,0))} active</span><span>{managers.reduce((sum,m)=>sum+m.sessions.length,0)} sessions</span></div>
   <div className="activity-scroll" role="region" aria-label="Manager daily activity timeline" tabIndex={0}>
    <div className="activity-timeline" style={{minWidth:Math.max(1100,hours.length*46+245)}}>
     <div className="activity-table-heading"><div className="activity-identity">Manager <span>Active time · Sessions</span></div><div className="activity-hours">{hours.map(at=><span key={at}>{time(at)}</span>)}</div></div>
     {managers.map(manager=><div key={manager.id} className={'activity-row'+(selected===manager.id?' selected':'')}>
      <button className={'activity-identity '+(manager.loggedIn?'used':'unused')} onClick={()=>setSelected(selected===manager.id?null:manager.id)} aria-expanded={selected===manager.id}><strong><i/>{managerName(manager.name)}</strong><span>{duration(manager.activeSeconds)} · {manager.sessions.length} sessions</span></button>
      <div className="activity-track" style={{backgroundSize:`${100/hours.length}% 100%`}}>
       {manager.sessions.map((session,i)=>{const left=(Date.parse(session.start)-start)/length*100,width=(Date.parse(session.end)-Date.parse(session.start))/length*100;return <button key={session.start+i} className="activity-session" style={{left:left+'%',width:`max(5px, ${width}%)`}} title={`${managerName(manager.name)} · ${time(session.start)}–${time(session.end)} · ${duration(session.activeSeconds)} active`} aria-label={`${managerName(manager.name)}, ${time(session.start)} to ${time(session.end)}, ${duration(session.activeSeconds)} active`} onClick={()=>setSelected(manager.id)}><span>{time(session.start)}–{time(session.end)}</span></button>;})}
       {!manager.sessions.length&&<span className="activity-no-session">{manager.count?'Sign-in recorded · no active-time data':'No activity recorded'}</span>}
      </div>
     </div>)}
     {!managers.length&&<p className="activity-empty">No enabled managers in this table.</p>}
    </div>
   </div>
   <p className="activity-note">Scroll sideways to view the full day. Session bars group activity less than five minutes apart. Historical active hours cannot be reconstructed from old sign-ins.</p>
   {selectedManager&&<section className="activity-detail"><h2>{managerName(selectedManager.name)}</h2><p>{duration(selectedManager.activeSeconds)} active · {selectedManager.sessions.length} sessions · {selectedManager.count} sign-ins</p>
    <h3>Sessions</h3>{selectedManager.sessions.length?selectedManager.sessions.map((session,i)=><div className="activity-log" key={session.start+i}><span>{time(session.start)}–{time(session.end)}</span><strong>{duration(session.activeSeconds)} active</strong></div>):<p>No session activity recorded for this day.</p>}
    <h3>Sign-ins</h3>{data.events.filter(e=>e.accountId===selected).map((event,i)=><div className="activity-log" key={event.at+i}><span>{time(event.at)}</span><span>Signed in</span></div>)}{!selectedManager.count&&<p>No fresh sign-ins. An existing login may have been used.</p>}
   </section>}
  </>}
 </main>;
}
