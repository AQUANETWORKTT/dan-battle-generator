"use client";

import Link from "next/link";

const SITE_URL = "https://firstclassagency.space";

const events = [
  { name: "World Cup 2026", status: "Live Event", logo: "/world-cup-2026/logo.png", leaderboardHref: "/live/world-cup-2026", adminHref: "/events/world-cup-2026/admin", creatorHref: "/live/world-cup-2026", tone: "emerald" },
  { name: "Sunset Showdown", status: "Live Event", logo: "/sunset-showdown/logo.png", leaderboardHref: "/live/8f3k2j9m-sunset", adminHref: "/events/sunset-showdown/admin", creatorHref: "/live/8f3k2j9m-sunset", tone: "yellow" },
  { name: "Crew Showdown", status: "Tournament Setup", logo: "/first-class/crew-showdown-logo.png", leaderboardHref: "/live/7xq9v2-first-class", downloadHref: "/generator?mode=glory", creatorHref: "/live/7xq9v2-first-class", tone: "yellow" },
];

export default function EventsPage() {
  function copyCreatorLink(path: string) {
    navigator.clipboard.writeText(`${SITE_URL}${path}`);
    alert("First Class creator link copied");
  }

  return (
    <main className="min-h-screen bg-[#080806] px-5 py-6 text-white sm:px-8 sm:py-8">
      <section className="mx-auto max-w-7xl">
        <nav className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link href="/" className="font-[family-name:var(--font-norwester)] text-lg uppercase tracking-wide text-yellow-300">First Class <span className="text-white">Space</span></Link>
          <span className="rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-200">Events</span>
        </nav>

        <div className="mt-14 flex flex-wrap items-end justify-between gap-6 sm:mt-20">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-yellow-300/75">First Class Agency</p>
            <h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase leading-none sm:text-7xl">Event <span className="text-yellow-300">Space</span></h1>
            <p className="mt-5 text-base leading-relaxed text-white/60">Live tournaments, leaderboards and creator-ready links — all in one place.</p>
          </div>
          <Link href="/generator" className="rounded-full border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-wider text-white/70 transition hover:border-yellow-300/50 hover:text-yellow-200">Poster Generator →</Link>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event, index) => {
            const green = event.tone === "emerald";
            return (
              <article key={event.name} className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:border-yellow-300/45">
                <div className={`relative flex h-52 items-center justify-center overflow-hidden rounded-2xl border border-white/5 p-7 ${green ? "bg-emerald-900/20" : "bg-yellow-300/10"}`}>
                  <span className="absolute right-4 top-3 font-[family-name:var(--font-norwester)] text-3xl text-white/10">0{index + 1}</span>
                  <img src={event.logo} alt={event.name} className="relative max-h-full max-w-full object-contain drop-shadow-2xl" />
                </div>
                <div className="mt-5">
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${green ? "text-emerald-300" : "text-yellow-300"}`}>{event.status}</p>
                  <h2 className="mt-2 font-[family-name:var(--font-norwester)] text-3xl uppercase leading-none">{event.name}</h2>
                </div>
                <div className="mt-6 grid gap-2">
                  <Link href={event.leaderboardHref} className="rounded-xl bg-white px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-black transition hover:bg-yellow-300">View Leaderboard</Link>
                  {event.adminHref && <Link href={event.adminHref} className="rounded-xl border border-white/15 px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-white/75 transition hover:bg-white/10">Admin Scores</Link>}
                  {event.downloadHref && <Link href={event.downloadHref} className="rounded-xl border border-yellow-300/30 bg-yellow-300/10 px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-yellow-100">Download Leaderboard</Link>}
                  <button type="button" onClick={() => copyCreatorLink(event.creatorHref)} className="rounded-xl px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/45 transition hover:text-yellow-200">Copy Creator Link</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
