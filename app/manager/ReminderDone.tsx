"use client";
import { useState } from "react";
export default function ReminderDone({ id, onDone }: { id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function complete() { setBusy(true); const response = await fetch("/api/manager-portal/reminder-completion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reminderId: id }) }); if (response.ok) onDone(); else setBusy(false); }
  return <button className="manager-button" disabled={busy} onClick={() => void complete()}>{busy ? "Saving…" : "Done"}</button>;
}
