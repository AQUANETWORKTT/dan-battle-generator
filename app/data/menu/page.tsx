import Link from "next/link";
import DataAccessGuard from "../../components/DataAccessGuard";

const links = [
  {
    href: "/data-analysis",
    title: "🧠 AI Analysis",
    description: "Analyse creator performance, agency trends, live hours and diamonds.",
    className: "border-yellow-300/25 bg-yellow-300/10 hover:border-yellow-300/60 hover:bg-yellow-300/15",
    titleClassName: "text-yellow-300",
  },
  {
    href: "/graduation-tracker",
    title: "🎓 Graduation Tracker",
    description: "Track creator graduation progress towards 200,000 diamonds.",
    className: "border-emerald-300/25 bg-emerald-400/10 hover:border-emerald-300/60 hover:bg-emerald-400/15",
    titleClassName: "text-emerald-300",
  },
  {
    href: "/data/mature-creators-tracker",
    title: "🔥 Mature Creators Tracker",
    description: "Track 200,000+ diamond creators to maintain or rank up.",
    className: "border-red-300/25 bg-red-400/10 hover:border-red-300/60 hover:bg-red-400/15",
    titleClassName: "text-red-300",
  },
  {
    href: "/creator-intelligence",
    title: "Creator Intelligence",
    description: "Full creator health dashboard using Dan creator daily stats, manager groups, reports and trend tracking.",
    className: "border-sky-300/25 bg-sky-400/10 hover:border-sky-300/60 hover:bg-sky-400/15",
    titleClassName: "text-sky-300",
  },
  {
    href: "/data/team-diamonds-yesterday",
    title: "Team Diamonds Yesterday",
    description: "Preview and download the Team Dan diamonds poster from yesterday's daily stats.",
    className: "border-yellow-300/25 bg-yellow-400/10 hover:border-yellow-300/60 hover:bg-yellow-400/15",
    titleClassName: "text-yellow-300",
  },
  {
    href: "/daily-rankings",
    title: "Daily Rankings",
    maintenance: true,
    description: "Pull Tikleap yesterday rankings for Backstage.",
    className: "border-cyan-300/25 bg-cyan-400/10 hover:border-cyan-300/60 hover:bg-cyan-400/15",
    titleClassName: "text-cyan-200",
  },
];

export default function DataMenuPage() {
  return (
    <DataAccessGuard>
      <main className="min-h-screen bg-[#070707] px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex flex-wrap gap-3">
            <Link href="/" className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase hover:bg-white/10">
              Back Home
            </Link>
            <Link href="/data-analysis/upload" className="rounded-xl border border-yellow-300/30 bg-yellow-300/10 px-5 py-3 text-sm font-black uppercase text-yellow-200 hover:bg-yellow-300/20">
              Upload Data
            </Link>
          </div>

          <section className="rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-200/70">First Class</p>
            <h1 className="mt-3 text-5xl font-black uppercase text-yellow-300">Data</h1>
            <p className="mt-3 max-w-2xl text-white/60">Choose which data tool you want to open.</p>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative overflow-hidden rounded-3xl border p-5 transition hover:-translate-y-0.5 ${item.className}`}
              >
                {"maintenance" in item && item.maintenance ? (
                  <div className="absolute inset-x-0 top-0 h-8 border-b border-yellow-200/40 bg-[repeating-linear-gradient(135deg,#facc15_0,#facc15_14px,#050505_14px,#050505_28px)] shadow-lg shadow-black/40" aria-label="Under maintenance" />
                ) : null}
                {"maintenance" in item && item.maintenance ? (
                  <p className="relative mt-7 inline-flex rounded-full border border-yellow-200/50 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-200">Under maintenance</p>
                ) : null}
                <h2 className={`text-2xl font-black uppercase ${item.titleClassName}`}>{item.title}</h2>
                <p className="mt-3 text-sm text-white/55">{item.description}</p>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </DataAccessGuard>
  );
}
