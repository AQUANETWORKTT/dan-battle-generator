"use client";
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

type Creator = { id: string; username: string; managerKey: string; agencyDays: number | null };
type Task = { id: string; managerKey: string; completed: boolean };

export default function AppLinkReminder({ creators, month, records, onToggle }: { creators: Creator[]; month: string; records: Task[]; onToggle: (creator: Creator) => void }) {
  const [copied, setCopied] = useState(false);
  const due = creators.filter((creator) => creator.agencyDays === 3);
  if (!due.length) return null;
  async function copyMessage() {
    await navigator.clipboard.writeText(APP_LINK_MESSAGE);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  return <section className="profile-update-reminder app-link-reminder">
    <div className="app-link-heading">
      <div><p className="manager-eyebrow">Day 3 onboarding</p><h2>Send First Class app link</h2><p className="manager-muted">Send this to each creator listed below once they have been with First Class for three days.</p></div>
      <button type="button" className="manager-button" onClick={() => void copyMessage()}>{copied ? "Copied" : "Copy First Class message"}</button>
    </div>
    <div className="profile-update-people">
      {due.map((creator) => { const id = `app-link:${month}:${creator.id}`, completed = records.some((task) => task.id === id && task.managerKey === creator.managerKey && task.completed); return <div key={creator.id} className={'profile-update-person' + (completed ? ' completed' : '')}><div><strong>@{creator.username}</strong><span className="manager-muted">Send First Class app link</span></div><label className="morning-complete"><span>Done</span><input type="checkbox" checked={completed} onChange={() => onToggle(creator)} /></label></div>; })}
    </div>
  </section>;
}
