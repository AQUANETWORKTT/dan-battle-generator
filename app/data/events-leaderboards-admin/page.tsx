import Link from "next/link";
import DataAccessGuard from "../../components/DataAccessGuard";

type Event = { name: string; logo: string; detail: string; leaderboard: string; download?: string; admin?: string };

const currentEvents: Event[] = [
  { name: "Race to the Top", logo: "/race-to-the-top-logo-transparent.png", detail: "Current creator maintenance-tier race and public progress page.", leaderboard: "/live/race-to-the-top" },
];

const previousEvents: Event[] = [
  { name: "Crew Showdown", logo: "/first-class/crew-showdown-logo.png", detail: "Archived Top 20 leaderboard and downloadable board.", leaderboard: "/live/7xq9v2-first-class", download: "/crew-showdown-download" },
  { name: "Sunset Showdown", logo: "/sunset-showdown/logo.png", detail: "Archived leaderboard and score administration.", leaderboard: "/live/8f3k2j9m-sunset", admin: "/events/sunset-showdown/admin" },
  { name: "World Cup 2026", logo: "/world-cup-2026/logo.png", detail: "Archived leaderboard and score administration.", leaderboard: "/live/world-cup-2026", admin: "/events/world-cup-2026/admin" },
];

export default function EventsLeaderboardsAdminPage() {
  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-5xl"><Link href="/data/menu" className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">← Data Space</Link><p className="mt-12 text-xs font-black uppercase tracking-[0.3em] text-sky-200/75">Event operations</p><h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase sm:text-6xl">Events <span className="text-yellow-300">Leaderboards Admin</span></h1><p className="mt-4 max-w-2xl text-white/60">Private controls for current events, plus an archive of previous event leaderboards.</p><EventSection title="Current Events" events={currentEvents} /><EventSection title="Previous Events" events={previousEvents} archived /></div></main></DataAccessGuard>;
}

function EventSection({ title, events, archived = false }: { title: string; events: Event[]; archived?: boolean }) {
  return <section className="mt-10"><div className="mb-4 flex items-center justify-between"><h2 className={`font-[family-name:var(--font-norwester)] text-3xl uppercase ${archived ? "text-white/50" : "text-yellow-200"}`}>{title}</h2><span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${archived ? "border-white/10 text-white/35" : "border-yellow-300/25 text-yellow-100"}`}>{archived ? "Archive" : "Active"}</span></div><div className="grid gap-4 md:grid-cols-3">{events.map((event, index) => <article key={event.name} className={`overflow-hidden rounded-[28px] border p-5 ${archived ? "border-white/10 bg-white/[0.02] opacity-55 grayscale" : "border-white/10 bg-white/[0.04]"}`}><div className="relative h-28 overflow-hidden rounded-2xl border border-white/5 bg-white/[0.035]"><span className="absolute right-3 top-2 z-10 font-[family-name:var(--font-norwester)] text-2xl text-white/20">0{index + 1}</span><img src={event.logo} alt={event.name} className="absolute inset-0 h-full w-full object-contain p-3 drop-shadow-xl" /></div><h3 className="mt-5 min-h-12 font-[family-name:var(--font-norwester)] text-2xl uppercase leading-[0.95] break-words">{event.name}</h3><p className="mt-3 min-h-12 text-sm leading-relaxed text-white/60">{event.detail}</p><div className="mt-6 grid gap-2"><Link href={event.leaderboard} className="rounded-xl bg-white px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-black">View leaderboard</Link>{event.download && <Link href={event.download} className="rounded-xl border border-yellow-300/35 bg-yellow-300/10 px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-yellow-100">Download leaderboard</Link>}{event.admin && <Link href={event.admin} className="rounded-xl border border-white/15 px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-white/80">Admin scores</Link>}</div></article>)}</div></section>;
}
