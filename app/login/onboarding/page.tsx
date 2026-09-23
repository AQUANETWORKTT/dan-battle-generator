"use client";

import { useState } from "react";

export default function OnboardingLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, area: "onboarding" }),
    });
    if (response.ok) location.assign("/onboarding");
    else setError("INCORRECT PASSWORD");
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#120820] px-4 text-white"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-violet-300/30 bg-black/55 p-8 shadow-2xl shadow-violet-950/60"><p className="text-xs font-black uppercase tracking-[.25em] text-violet-200">First Class</p><h1 className="mt-3 font-[family-name:var(--font-norwester)] text-5xl uppercase">Onboarding</h1><p className="mt-3 text-sm text-white/60">ENTER THE ONBOARDING ACCESS PASSWORD.</p><input autoFocus required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="ENTER PASSWORD" className="mt-8 w-full rounded-xl border border-violet-200/25 bg-black px-4 py-4 outline-none focus:border-violet-300"/><button className="mt-4 w-full rounded-xl bg-violet-300 py-4 text-xs font-black uppercase tracking-widest text-black">ENTER ONBOARDING</button>{error ? <p className="mt-4 text-xs font-black text-red-300">{error}</p> : null}</form></main>;
}
