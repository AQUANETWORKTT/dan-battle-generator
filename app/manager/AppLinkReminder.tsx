"use client";
import {appLinkVisible,appLinkCompleted} from "@/lib/app-link-reminder";
import { useState } from "react";

const APP_LINK_MESSAGE = `Hey! Just checking in, now you have been with us 3 days it’s time to get you registered on our FIRST CLASS APP 🤍✈️

This is the next step in how we can help you grow ✈️

SIGN UP TODAY👀🏆

🔗 https://firstclassagency.app

➡️ Click Sign Up
➡️ Use your TikTok username (no @ or capital letters)
➡️ Link your email
➡️ Create a password

Once you’re in, get familiar with it. This is going to play a big role in how you progress. A chance to see your analytics daily, reach your goals and explore our training modules`;

type Creator = { id: string; username: string; managerKey: string; manager: string; agencyDays: number | null; appLinkDays?: number | null; joinedDate?:string|null };
type Task = { id: string; managerKey: string; completed: boolean; completedAt?: string };

export default function AppLinkReminder({ creators, month, records, onToggle, executiveKey, showManager = false }: { creators: Creator[]; month: string; records: Task[]; onToggle: (creator: Creator) => void; executiveKey?: string; showManager?: boolean }) {
  const [copied, setCopied] = useState(false);
  const due = creators.filter(creator => appLinkVisible(creator,records));
  const complete = due.length > 0 && due.every((creator) => appLinkCompleted(creator,records));
  if (!due.length) return null;
  async function copyMessage() {
    await navigator.clipboard.writeText(APP_LINK_MESSAGE);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  const content = <div className="task-section-content">
    <div className="app-link-heading">
      <div><p className="manager-eyebrow">3 days after joining</p><h2>Send First Class app link 🔗</h2></div>
      <button type="button" className="manager-button" onClick={() => void copyMessage()}>{copied ? "Copied" : "Copy First Class message"}</button>
    </div>
    <div className="profile-update-people">
      {due.map((creator) => { const completed = appLinkCompleted(creator,records), junior = executiveKey && creator.managerKey !== executiveKey, managerName = creator.manager.replace(/^Team\s+/i, ''), label = showManager ? managerName : junior ? `Junior manager · ${managerName}` : 'Send First Class app link'; return <div key={creator.id} className={'profile-update-person' + (completed ? ' completed' : '') + (junior ? ' junior-task' : '')}><div><strong>@{creator.username}</strong><span className="manager-muted">{label}</span></div><label className="morning-complete"><span>Done</span><input type="checkbox" checked={completed} onChange={() => onToggle(creator)} /></label></div>; })}
    </div>
    </div>;
  if (complete) return <details className="profile-update-reminder app-link-reminder task-section-complete"><summary style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',fontFamily:'var(--font-norwester), Impact, sans-serif',fontSize:20,color:'#eed397'}}><span>Send First Class app link</span><span>✅</span></summary>{content}</details>;
  return <section className="profile-update-reminder app-link-reminder">{content}</section>;
}
