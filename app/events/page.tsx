"use client";

import Link from "next/link";

const SITE_URL = "https://firstclassagency.space";

const currentEvents = [
  { name: "Crew Showdown", status: "Current Event", logo: "/first-class/crew-showdown-logo.png", leaderboardHref: "/live/7xq9v2-first-class", creatorHref: "/live/7xq9v2-first-class", tone: "yellow" },
  { name: "Race to the Top", status: "Current Event", logo: "/race-to-the-top-logo-transparent.png", leaderboardHref: "/live/race-to-the-top", creatorHref: "/live/race-to-the-top", tone: "pink" },
];

const previousEvents = [
  { name: "Sunset Showdown", status: "Previous Event", logo: "/sunset-showdown/logo.png", leaderboardHref: "/live/8f3k2j9m-sunset", creatorHref: "/live/8f3k2j9m-sunset", tone: "yellow" },
  { name: "World Cup 2026", status: "Previous Event", logo: "/world-cup-2026/logo.png", leaderboardHref: "/live/world-cup-2026", creatorHref: "/live/world-cup-2026", tone: "emerald" },
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
          <p className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Creator leaderboards</p>
        </div>

        <EventGallery title="Current Events" description="Live events and current creator challenges." events={currentEvents} copyCreatorLink={copyCreatorLink} />
        <EventGallery title="Previous Events" description="Past event leaderboards, kept here as the First Class events gallery." events={previousEvents} copyCreatorLink={copyCreatorLink} previous />
      </section>
    </main>
  );
}

function EventGallery({ title, description, events, copyCreatorLink, previous = false }: { title: string; description: string; events: typeof currentEvents; copyCreatorLink: (path: string) => void; previous?: boolean }) {
  return <section className="mt-12"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className={`text-xs font-black uppercase tracking-[0.3em] ${previous ? "text-white/35" : "text-yellow-300/75"}`}>{previous ? "Events Archive" : "Now Live"}</p><h2 className={`mt-2 font-[family-name:var(--font-norwester)] text-3xl uppercase sm:text-4xl ${previous ? "text-white/55" : "text-white"}`}>{title}</h2><p className="mt-2 text-sm text-white/50">{description}</p></div><span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${previous ? "border-white/10 bg-white/[0.03] text-white/35" : "border-yellow-300/25 bg-yellow-300/10 text-yellow-200"}`}>{events.length} events</span></div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event, index) => {
            const green = event.tone === "emerald";
            const pink = event.tone === "pink";
            return (
              <article key={event.name} className={`group overflow-hidden rounded-[28px] border p-5 transition ${previous ? "border-white/10 bg-white/[0.02] opacity-55 grayscale hover:opacity-80" : "border-white/10 bg-white/[0.04] hover:-translate-y-1 hover:border-yellow-300/45"}`}>
                <div className={`relative flex h-52 items-center justify-center overflow-hidden rounded-2xl border border-white/5 p-7 ${green ? "bg-emerald-900/20" : pink ? "bg-pink-500/20" : "bg-yellow-300/10"}`}>
                  <span className="absolute right-4 top-3 font-[family-name:var(--font-norwester)] text-3xl text-white/10">0{index + 1}</span>
                  {event.logo ? <img src={event.logo} alt={event.name} className="relative max-h-full max-w-full object-contain drop-shadow-2xl" /> : <span className="flex h-24 w-24 items-center justify-center rounded-xl border-4 border-red-300 bg-red-600 text-center text-[10px] font-black uppercase tracking-[.14em] text-red-50">Logo<br/>placeholder</span>}
                </div>
                <div className="mt-5">
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${previous ? "text-white/55" : green ? "text-emerald-300" : pink ? "text-pink-300" : "text-yellow-300"}`}>{event.status}</p>
                  <h2 className="mt-2 font-[family-name:var(--font-norwester)] text-3xl uppercase leading-none">{event.name}</h2>
                </div>
                <div className="mt-6 grid gap-2">
                  <Link href={event.leaderboardHref} className="rounded-xl bg-white px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-black transition hover:bg-yellow-300">View Leaderboard</Link>
                  <button type="button" onClick={() => copyCreatorLink(event.creatorHref)} className="rounded-xl px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/45 transition hover:text-yellow-200">Copy Creator Link</button>
                </div>
              </article>
            );
          })}
        </div></section>;
}
