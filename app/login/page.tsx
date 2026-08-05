"use client";

import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      <div
        className="fixed inset-0 scale-105 bg-cover bg-center blur-sm"
        style={{ backgroundImage: "url('/branding/first-class-data-bg.jpg')" }}
      />
      <div className="fixed inset-0 bg-black/45" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/20 via-slate-950/10 to-black/70" />

      <div className="relative z-10 w-full max-w-3xl rounded-3xl border border-yellow-300/20 bg-black/45 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <p className="font-[family-name:var(--font-norwester)] text-3xl uppercase tracking-wide text-white">First Class <span className="text-yellow-300">Space</span></p>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-100/60">Agency access</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/login/leadership" className="flex min-h-[260px] flex-col rounded-2xl border border-yellow-300/55 bg-yellow-300/15 p-7 text-white shadow-lg shadow-yellow-950/20 transition hover:-translate-y-1 hover:bg-yellow-300/25"><p className="text-xs font-black uppercase tracking-[.22em] text-yellow-200">First Class</p><h1 className="mt-3 min-h-[3rem] font-[family-name:var(--font-norwester)] text-4xl uppercase leading-none text-white">Leadership</h1><p className="mt-4 text-base leading-7 text-white/90">For Owners, Head of Operations<br/>and Senior Leadership.</p><span className="mt-auto pt-7 text-xs font-black uppercase tracking-widest text-yellow-100">Enter Here →</span></Link>
          <Link href="/management" className="flex min-h-[260px] flex-col rounded-2xl border border-white/30 bg-black/65 p-7 text-white shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-yellow-300/60 hover:bg-black/75"><p className="text-xs font-black uppercase tracking-[.22em] text-yellow-200">First Class</p><h1 className="mt-3 min-h-[3rem] whitespace-nowrap font-[family-name:var(--font-norwester)] text-3xl uppercase leading-none text-white">Creator Managers</h1><p className="mt-4 text-base leading-7 text-white/90">Team posters, onboarding<br/>and team health.</p><span className="mt-auto pt-7 text-xs font-black uppercase tracking-widest text-yellow-100">Enter Here →</span></Link>
        </div>
      </div>
    </main>
  );
}
