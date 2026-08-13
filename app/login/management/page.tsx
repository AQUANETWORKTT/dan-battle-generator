"use client";

import { useState } from "react";

export default function ManagementLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, area: "management" }) });
    if (response.ok) location.assign("/management");
    else setError("INCORRECT PASSWORD");
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#080806] px-4 text-white"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-yellow-300/25 bg-black/60 p-8"><p className="text-xs font-black uppercase tracking-[.25em] text-yellow-200">FIRST CLASS</p><h1 className="mt-3 font-[family-name:var(--font-norwester)] text-5xl uppercase">CREATOR MANAGERS</h1><p className="mt-3 text-sm text-white/60">ENTER THE MANAGER ACCESS PASSWORD.</p><input autoFocus required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="ENTER PASSWORD" className="mt-8 w-full rounded-xl border border-white/15 bg-black px-4 py-4 outline-none focus:border-yellow-300"/><button className="mt-4 w-full rounded-xl bg-yellow-300 py-4 text-xs font-black uppercase tracking-widest text-black">ENTER MANAGER SPACE</button>{error ? <p className="mt-4 text-xs font-black text-red-300">{error}</p> : null}</form></main>;
}
