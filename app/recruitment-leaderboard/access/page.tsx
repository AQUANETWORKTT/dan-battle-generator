"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

export default function RecruitmentLeaderboardAccessPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, area: "recruitment-leaderboard" }),
      });
      if (!response.ok) {
        setError("INCORRECT PASSWORD");
        return;
      }
      // Keep approval only in this browser tab. Opening the shared link in a
      // new tab (or after closing the browser) always asks again.
      window.sessionStorage.setItem("first-class-recruitment-leaderboard-access", "true");
      window.location.assign("/recruitment-leaderboard");
    } catch {
      setError("COULD NOT OPEN THE LEADERBOARD");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060604] px-5 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,91,17,.45),_transparent_48%),radial-gradient(ellipse_at_bottom_right,_rgba(255,215,122,.14),_transparent_42%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(245,202,98,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(245,202,98,.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <form onSubmit={submit} className="relative w-full max-w-xl rounded-[32px] border border-[#f5ca62]/40 bg-black/70 p-7 shadow-[0_0_80px_rgba(207,157,50,.2)] backdrop-blur sm:p-10">
        <Image src="/branding/first-class-recruitment-logo.png" alt="First Class Recruitment" width={1200} height={400} priority className="mx-auto h-auto w-full max-w-md object-contain" />
        <div className="mt-7 border-t border-[#f5ca62]/35 pt-7 text-center">
          <p className="text-xs font-black uppercase tracking-[.28em] text-[#f5ca62]">First Class Recruitment</p>
          <h1 className="mt-3 font-[family-name:var(--font-norwester)] text-4xl uppercase sm:text-5xl">Recruitment Leaderboard</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/60">View your manager&apos;s monthly recruits and recruitment diamonds.</p>
        </div>
        <label className="mt-8 block text-[11px] font-black uppercase tracking-[.18em] text-white/55">
          Enter access password
          <div className="relative mt-3">
            <input autoFocus required type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="ENTER PASSWORD" className="w-full rounded-xl border border-white/15 bg-black py-4 pl-4 pr-14 text-base text-white outline-none transition focus:border-[#f5ca62]" />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-[#f5ca62]/75 transition hover:text-[#ffe39b]">
              {showPassword ? <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2"><path d="m3 3 18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.3 4.6 10 8-0.3 1.4-1.2 3-2.6 4.3M6.3 6.3C4.2 7.8 2.6 10 2 12c0.8 3.4 4.5 8 10 8 1.3 0 2.5-.2 3.5-.7" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2"><path d="M2 12s3.7-8 10-8 10 8 10 8-3.7 8-10 8S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>}
            </button>
          </div>
        </label>
        <button disabled={loading} className="mt-4 w-full rounded-xl bg-[#f5ca62] py-4 text-xs font-black uppercase tracking-[.18em] text-black transition hover:bg-[#ffe39b] disabled:opacity-50">{loading ? "Opening…" : "View leaderboard"}</button>
        {error ? <p className="mt-4 text-center text-xs font-black uppercase text-red-300">{error}</p> : null}
      </form>
    </main>
  );
}
