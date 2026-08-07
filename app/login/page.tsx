"use client";

import Link from "next/link";

const cards = [
  { href: "/login/leadership", eyebrow: "FIRST CLASS", title: "LEADERSHIP", description: <>FOR OWNERS, HEAD OF OPERATIONS<br />AND SENIOR LEADERSHIP.</>, tone: "border-yellow-300/55 bg-yellow-300/15 hover:bg-yellow-300/25", label: "text-yellow-100" },
  { href: "/management", eyebrow: "FIRST CLASS", title: "CREATOR MANAGERS", description: <>TEAM POSTERS, ONBOARDING<br />AND TEAM HEALTH.</>, tone: "border-white/30 bg-black/65 hover:border-yellow-300/60 hover:bg-black/75", label: "text-yellow-100" },
  { href: "/battle-network", eyebrow: "AGENCY NETWORK", title: "BATTLE NETWORK", description: <>BATTLE SHEETS, MATCHING<br />AND POSTER DOWNLOADS.</>, tone: "border-sky-300/45 bg-sky-950/25 hover:border-sky-200 hover:bg-sky-900/30", label: "text-sky-100" },
];

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      <div className="fixed inset-0 scale-105 bg-cover bg-center blur-sm" style={{ backgroundImage: "url('/branding/first-class-data-bg.jpg')" }} />
      <div className="fixed inset-0 bg-black/45" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/20 via-slate-950/10 to-black/70" />
      <div className="relative z-10 w-full max-w-5xl rounded-3xl border border-yellow-300/20 bg-black/45 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <p className="font-[family-name:var(--font-norwester)] text-3xl uppercase tracking-wide text-white">FIRST CLASS <span className="text-yellow-300">SPACE</span></p>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-100/60">AGENCY ACCESS</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className={`flex min-h-[260px] flex-col rounded-2xl border p-7 text-white shadow-lg shadow-black/30 transition hover:-translate-y-1 ${card.tone}`}>
              <p className="text-xs font-black uppercase tracking-[.22em] text-yellow-200">{card.eyebrow}</p>
              <h1 className="mt-3 min-h-[3rem] font-[family-name:var(--font-norwester)] text-3xl uppercase leading-none text-white">{card.title}</h1>
              <p className="mt-4 text-base leading-7 text-white/90">{card.description}</p>
              <span className={`mt-auto pt-7 text-xs font-black uppercase tracking-widest ${card.label}`}>ENTER HERE →</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
