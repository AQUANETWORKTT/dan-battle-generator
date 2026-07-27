import Link from "next/link";
import DataAccessGuard from "../../components/DataAccessGuard";

type Workspace = { href: string; number: string; label: string; title: string; description: string; accent: keyof typeof accentStyles; maintenance?: boolean; unavailable?: boolean };

const accentStyles = {
  yellow: "from-yellow-300/20 via-yellow-300/5 to-transparent border-yellow-300/20 group-hover:border-yellow-300/50 text-yellow-200",
  sky: "from-sky-300/20 via-sky-300/5 to-transparent border-sky-300/20 group-hover:border-sky-300/50 text-sky-200",
  emerald: "from-emerald-300/20 via-emerald-300/5 to-transparent border-emerald-300/20 group-hover:border-emerald-300/50 text-emerald-200",
  orange: "from-orange-300/20 via-orange-300/5 to-transparent border-orange-300/20 group-hover:border-orange-300/50 text-orange-200",
  cyan: "from-cyan-300/20 via-cyan-300/5 to-transparent border-cyan-300/20 group-hover:border-cyan-300/50 text-cyan-200",
  red: "from-red-300/20 via-red-300/5 to-transparent border-red-300/20 group-hover:border-red-300/50 text-red-200",
  purple: "from-purple-300/20 via-purple-300/5 to-transparent border-purple-300/20 group-hover:border-purple-300/50 text-purple-200",
  gray: "from-slate-300/10 via-slate-300/[0.02] to-transparent border-slate-300/15 group-hover:border-slate-300/20 text-slate-300",
};

const workspaceGroups: { title: string; description: string; accent: keyof typeof accentStyles; workspaces: Workspace[] }[] = [
  { title: "Data Settings", description: "Controls, creator visibility and reusable daily-poster assets.", accent: "red", workspaces: [
    { href: "/data/excluded-creators", number: "08", label: "Visibility", title: "Excluded Creators", description: "Keep selected creators out of leaderboards, public PNGs and downloads while retaining their intelligence data.", accent: "orange" },
    { href: "/data/fallback-pictures", number: "10", label: "Assets", title: "Fallback Pictures", description: "Upload a reliable profile picture for any creator whose TikTok avatar cannot be retrieved.", accent: "sky" },
    { href: "/data/team-posters", number: "07", label: "Daily assets", title: "Team Poster Builder", description: "Create and maintain reusable yesterday-diamonds poster templates for Team Dan and future teams.", accent: "yellow" },
    { href: "/data/events-leaderboards-admin", number: "09", label: "Event operations", title: "Events Leaderboards Admin", description: "Event score controls, Crew Showdown downloads and private leaderboard tools.", accent: "emerald" },
  ] },
  { title: "Creator Targets", description: "Track creator progress, graduation and mature-creator retention.", accent: "emerald", workspaces: [
    { href: "/graduation-tracker", number: "03", label: "Progress", title: "Graduation Tracker", description: "Track creator progress towards 200,000 diamonds and graduation milestones.", accent: "emerald" },
    { href: "/data/mature-creators-tracker", number: "04", label: "Retention", title: "Mature Creators", description: "Keep 200,000+ diamond creators visible, supported and moving forward.", accent: "orange" },
  ] },
  { title: "Creator Analysis", description: "Performance analysis, creator health and agency intelligence.", accent: "purple", workspaces: [
    { href: "/data-analysis", number: "01", label: "Reporting", title: "AI Analysis", description: "Analyse creator performance, agency trends, live hours and diamonds.", accent: "yellow" },
    { href: "/creator-intelligence", number: "02", label: "Creator health", title: "First Class Creator Intelligence", description: "Creator health, manager groups, reports and performance trends in one place.", accent: "sky" },
  ] },
  { title: "Diamond Information", description: "Daily diamond rankings and yesterday's team posters.", accent: "yellow", workspaces: [
    { href: "/data/team-diamonds-yesterday", number: "05", label: "Daily snapshot", title: "Team Posters", description: "Build and download yesterday's top diamonds and live-hours posters.", accent: "yellow" },
    { href: "/data/manager-leaderboard", number: "11", label: "Monthly totals", title: "Manager Leaderboard", description: "Load manager diamond totals, use the saved poster background and download the leaderboard PNG.", accent: "emerald" },
  ] },
  { title: "In Development", description: "Features that are being prepared for a future release.", accent: "gray", workspaces: [
    { href: "/daily-rankings", number: "06", label: "Backstage", title: "Daily Rankings", description: "Awaiting Tikleap API access for automated daily rankings.", accent: "gray", maintenance: true, unavailable: true },
  ] },
];

const workspaceGroupOrder = ["Diamond Information", "Creator Targets", "Creator Analysis", "Data Settings", "In Development"];

export default function DataMenuPage() {
  return <DataAccessGuard><main className="min-h-screen overflow-hidden bg-[#080806] px-5 py-6 text-white sm:px-8 sm:py-8"><div className="pointer-events-none fixed inset-0 opacity-50 [background:radial-gradient(circle_at_100%_0%,rgba(56,189,248,0.16),transparent_27%),radial-gradient(circle_at_0%_100%,rgba(250,204,21,0.12),transparent_30%)]" /><div className="relative mx-auto max-w-7xl">
    <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"><Link href="/" className="font-[family-name:var(--font-norwester)] text-lg uppercase tracking-wide text-yellow-300">First Class <span className="text-white">Space</span></Link><div className="flex flex-wrap gap-2"><Link href="/data-analysis/upload" className="rounded-full bg-yellow-300 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-black transition hover:bg-yellow-200">Upload Data</Link><Link href="/" className="rounded-full border border-white/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/60 transition hover:border-white/35 hover:text-white">Exit</Link></div></nav>
    <section className="mt-14 flex flex-wrap items-end justify-between gap-6 sm:mt-20"><div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.32em] text-sky-200/75">First Class Agency</p><h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase leading-none sm:text-7xl">Data <span className="text-yellow-300">Space</span></h1><p className="mt-5 text-base leading-relaxed text-white/60">Your secure workspace for performance, creator development and daily agency reporting.</p></div><p className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">10 workspaces</p></section>
    <section className="mt-12 space-y-12">{[...workspaceGroups].sort((a, b) => workspaceGroupOrder.indexOf(a.title) - workspaceGroupOrder.indexOf(b.title)).map((group) => <div key={group.title}><div className="mb-5"><h2 className={`font-[family-name:var(--font-norwester)] text-3xl uppercase ${group.accent === "gray" ? "text-slate-400" : "text-yellow-200"}`}>{group.title}</h2><p className="mt-2 text-sm text-white/50">{group.description}</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{group.workspaces.map((item) => { const style = accentStyles[group.accent]; return <Link key={item.href} href={item.href} aria-disabled={item.unavailable} tabIndex={item.unavailable ? -1 : undefined} onClick={item.unavailable ? (event) => event.preventDefault() : undefined} className={`group relative min-h-72 overflow-hidden rounded-[28px] border bg-white/[0.035] p-6 transition duration-300 ${item.unavailable ? "cursor-not-allowed opacity-40 grayscale" : "hover:-translate-y-1 hover:bg-white/[0.06]"} ${style}`}><div className={`absolute inset-0 bg-gradient-to-br ${style.split(" ")[0]} ${style.split(" ")[1]} ${style.split(" ")[2]}`} /><div className="relative flex h-full flex-col justify-between"><div><p className={`text-[10px] font-black uppercase tracking-[0.22em] ${style.split(" ").at(-1)}`}>{item.label}</p></div><div>{item.maintenance && <span className="mb-3 inline-flex rounded-full border border-slate-300/25 bg-slate-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-100">Awaiting API</span>}<h3 className="font-[family-name:var(--font-norwester)] text-3xl uppercase leading-[0.95] tracking-tight">{item.title}</h3><p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">{item.description}</p>{!item.unavailable && <span className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/75">Open workspace <span className="text-lg text-yellow-200 transition-transform group-hover:translate-x-1">→</span></span>}</div></div></Link>; })}</div></div>)}</section>
  </div></main></DataAccessGuard>;
}
