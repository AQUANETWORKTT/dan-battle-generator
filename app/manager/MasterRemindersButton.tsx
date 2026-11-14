"use client";
import { useState } from "react";
import ManagerReminders from "./ManagerReminders";

export default function MasterRemindersButton() {
  const [open, setOpen] = useState(false);
  return <><button className="manager-button" type="button" onClick={() => setOpen(true)}>Reminders</button>{open && <div style={{position:'fixed',inset:0,zIndex:100,background:'#000b',display:'grid',placeItems:'center',padding:16}} role="dialog" aria-modal="true" aria-label="Reminders"><div style={{position:'relative',width:'min(760px,100%)',maxHeight:'calc(100dvh - 32px)',overflow:'auto',padding:24,border:'1px solid #d4b668',borderRadius:16,background:'#17130d'}}><button className="creator-manage-close" type="button" onClick={() => setOpen(false)} aria-label="Close reminders">×</button><ManagerReminders owner /></div></div>}</>;
}
