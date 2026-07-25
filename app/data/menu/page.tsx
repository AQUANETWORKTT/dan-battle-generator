import Link from "next/link";
import DataAccessGuard from "../../components/DataAccessGuard";

const workspaces = [
  { href: "/data-analysis", number: "01", label: "Reporting", title: "AI Analysis", description: "Analyse creator performance, agency trends, live hours and diamonds.", accent: "yellow" },
  { href: "/creator-intelligence", number: "02", label: "Creator health", title: "First Class Creator Intelligence", description: "Creator health, manager groups, reports and performance trends in one place.", accent: "sky" },
  { href: "/graduation-tracker", number: "03", label: "Progress", title: "Graduation Tracker", description: "Track creator progress towards 200,000 diamonds and graduation milestones.", accent: "emerald" },
  { href: "/data/mature-creators-tracker", number: "04", label: "Retention", title: "Mature Creators", description: "Keep 200,000+ diamond creators visible, supported and moving forward.", accent: "orange" },
  { href: "/data/team-diamonds-yesterday", number: "05", label: "Daily snapshot", title: "Team Diamonds Yesterday", description: "Build and download yesterday’s top diamonds and live-hours poster.", accent: "yellow" },
  { href: "/daily-rankings", number: "06", label: "Backstage", title: "Daily Rankings", description: "Pull yesterday’s Tikleap rankings for Backstage.", accent: "cyan", maintenance: true },
  { href: "/posters", number: "07", label: "Daily assets", title: "Posters", description: "Create and maintain reusable yesterday-diamonds poster templates for Team Dan and future teams.", accent: "yellow" },
  { href: "/data/events-leaderboards-admin", number: "09", label: "Event operations", title: "Events Leaderboards Admin", description: "Event score controls, Crew Showdown downloads and private leaderboard tools.", accent: "emerald" },
];

const accentStyles = {
  yellow: "from-yellow-300/20 via-yellow-300/5 to-transparent border-yellow-300/20 group-hover:border-yellow-300/50 text-yellow-200",
  sky: "from-sky-300/20 via-sky-300/5 to-transparent border-sky-300/20 group-hover:border-sky-300/50 text-sky-200",
  emerald: "from-emerald-300/20 via-emerald-300/5 to-transparent border-emerald-300/20 group-hover:border-emerald-300/50 text-emerald-200",
  orange: "from-orange-300/20 via-orange-300/5 to-transparent border-orange-300/20 group-hover:border-orange-300/50 text-orange-200",
  cyan: "from-cyan-300/20 via-cyan-300/5 to-transparent border-cyan-300/20 group-hover:border-cyan-300/50 text-cyan-200",
};

export default function DataMenuPage() {
  return (
    <DataAccessGuard>
      <main className="min-h-screen overflow-hidden bg-[#080806] px-5 py-6 text-white sm:px-8 sm:py-8">
        <div className="pointer-events-none fixed inset-0 opacity-50 [background:radial-gradient(circle_at_100%_0%,rgba(56,189,248,0.16),transparent_27%),radial-gradient(circle_at_0%_100%,rgba(250,204,21,0.12),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl">
          <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <Link href="/" className="font-[family-name:var(--font-norwester)] text-lg uppercase tracking-wide text-yellow-300">First Class <span className="text-white">Space</span></Link>
            <div className="flex flex-wrap gap-2">
              <Link href="/data-analysis/upload" className="rounded-full bg-yellow-300 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-black transition hover:bg-yellow-200">Upload Data</Link>
              <Link href="/" className="rounded-full border border-white/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/60 transition hover:border-white/35 hover:text-white">Exit</Link>
            </div>
          </nav>

          <section className="mt-14 flex flex-wrap items-end justify-between gap-6 sm:mt-20">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-sky-200/75">First Class Agency</p>
              <h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase leading-none sm:text-7xl">Data <span className="text-yellow-300">Space</span></h1>
              <p className="mt-5 text-base leading-relaxed text-white/60">Your secure workspace for performance, creator development and daily agency reporting.</p>
            </div>
            <p className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">8 workspaces</p>
          </section>

          <section className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((item) => {
              const style = accentStyles[item.accent as keyof typeof accentStyles];
              return (
                <Link key={item.href} href={item.href} className={`group relative min-h-72 overflow-hidden rounded-[28px] border bg-white/[0.035] p-6 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.06] ${style}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${style.split(" ")[0]} ${style.split(" ")[1]} ${style.split(" ")[2]}`} />
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${style.split(" ").at(-1)}`}>{item.label}</p>
                      <span className="font-[family-name:var(--font-norwester)] text-3xl text-white/15">{item.number}</span>
                    </div>
                    <div>
                      {item.maintenance && <span className="mb-3 inline-flex rounded-full border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-yellow-100">Under maintenance</span>}
                      <h2 className="font-[family-name:var(--font-norwester)] text-3xl uppercase leading-[0.95] tracking-tight">{item.title}</h2>
                      <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">{item.description}</p>
                      <span className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/75">Open workspace <span className="text-lg text-yellow-200 transition-transform group-hover:translate-x-1">→</span></span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        </div>
      </main>
    </DataAccessGuard>
  );
}
