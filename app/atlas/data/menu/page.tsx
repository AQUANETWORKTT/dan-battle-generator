import Link from "next/link";
import DataAccessGuard from "@/app/atlas/AtlasGuard";
import BackstageStatus from "../../AtlasBackstageStatus";

type Accent = "yellow" | "sky" | "emerald" | "orange" | "cyan" | "red" | "purple" | "pink" | "gray";
type Workspace = { href: string; number: string; label: string; title: string; description: string; accent: Accent; maintenance?: boolean; unavailable?: boolean };

const accentStyles: Record<Accent, string> = {
  yellow: "from-sky-300/20 via-sky-300/5 to-transparent border-sky-300/20 group-hover:border-sky-300/50 text-sky-200",
  sky: "from-sky-300/20 via-sky-300/5 to-transparent border-sky-300/20 group-hover:border-sky-300/50 text-sky-200",
  emerald: "from-emerald-300/20 via-emerald-300/5 to-transparent border-emerald-300/20 group-hover:border-emerald-300/50 text-emerald-200",
  orange: "from-orange-300/20 via-orange-300/5 to-transparent border-orange-300/20 group-hover:border-orange-300/50 text-orange-200",
  cyan: "from-cyan-300/20 via-cyan-300/5 to-transparent border-cyan-300/20 group-hover:border-cyan-300/50 text-cyan-200",
  red: "from-red-300/20 via-red-300/5 to-transparent border-red-300/20 group-hover:border-red-300/50 text-red-200",
  purple: "from-purple-300/20 via-purple-300/5 to-transparent border-purple-300/20 group-hover:border-purple-300/50 text-purple-200",
  pink: "from-fuchsia-500/35 via-pink-500/14 to-transparent border-pink-300/35 group-hover:border-pink-200/80 text-pink-100",
  gray: "from-slate-300/10 via-slate-300/[0.02] to-transparent border-slate-300/15 group-hover:border-slate-300/20 text-slate-300",
};

const groups: Array<{ title: string; description: string; accent: Accent; workspaces: Workspace[] }> = [
  {
    "title": "Our Data Space",
    "description": "A shared place for the team to keep live working notes.",
    "accent": "sky",
    "workspaces": [
      {
        "href": "/atlas/data/notepad",
        "label": "Shared live notes",
        "title": "Notepad",
        "description": "One large shared page. Type freely and it saves automatically five seconds after you stop.",
        "accent": "sky",
        "number": "01"
      }
    ]
  },
  {
    "title": "Team Posters",
    "description": "Daily creator posters, built from your Atlas uploads.",
    "accent": "sky",
    "workspaces": [
      {
        "href": "/atlas/data/team-posters",
        "label": "Daily snapshot",
        "title": "Team Posters",
        "description": "Build and download yesterday's top diamonds and live-hours posters.",
        "accent": "sky",
        "number": "02"
      }
    ]
  },
  {
    "title": "Creator/Agency Targets",
    "description": "Track creator progress, graduation and mature-creator retention.",
    "accent": "cyan",
    "workspaces": [
      {
        "href": "/atlas/data/mature-creators-tracker",
        "label": "Copy & paste reports",
        "title": "Mature Creators Tracker",
        "description": "The original maintain and rank-up tracker, with WhatsApp text to copy, diamond targets, LIVE days and hours needed.",
        "accent": "cyan",
        "number": "03"
      },
      {
        "href": "/atlas/data/graduation-tracker",
        "label": "Progress",
        "title": "Graduation Tracker",
        "description": "Track creator progress towards 200,000 diamonds and graduation milestones.",
        "accent": "cyan",
        "number": "04"
      },
      {
        "href": "/atlas/data/incremental-data-tracking",
        "label": "Monthly pace",
        "title": "Incremental Data Tracking",
        "description": "Enter month-to-date diamonds and see the nearest daily incremental target prediction.",
        "accent": "cyan",
        "number": "05"
      }
    ]
  },
  {
    "title": "Management",
    "description": "Atlas creator history and private management records.",
    "accent": "sky",
    "workspaces": [
      {
        "href": "/atlas/data/creator-id-lookup",
        "label": "Creator history",
        "title": "Creator ID Lookup",
        "description": "Search creator IDs and usernames, with account history and manager changes.",
        "accent": "sky",
        "number": "06"
      },
      {
        "href": "/atlas/data/manager-strikes",
        "label": "Owner only",
        "title": "Manager Strikes",
        "description": "Record up to three strikes for each Atlas manager, with dates and notes.",
        "accent": "sky",
        "number": "07"
      }
    ]
  },
  {
    "title": "Data Settings",
    "description": "Manager groups and reusable daily-poster layouts.",
    "accent": "cyan",
    "workspaces": [
      {
        "href": "/atlas/generator?workspace=posters",
        "label": "Daily assets",
        "title": "Team Poster Builder",
        "description": "Create and maintain reusable daily poster templates for Atlas and its managers.",
        "accent": "cyan",
        "number": "08"
      },
      {
        "href": "/atlas/data/manager-assignments",
        "label": "Team setup",
        "title": "Manager Assignments",
        "description": "Move managers into their correct group. New managers appear automatically after an upload.",
        "accent": "cyan",
        "number": "09"
      }
    ]
  }
];
const order = ["Our Data Space","Team Posters","Creator/Agency Targets","Management","Data Settings"];

export default function DataMenuPage() {
  return <DataAccessGuard><main className="min-h-screen overflow-hidden bg-[#080806] px-5 py-6 text-white sm:px-8 sm:py-8"><div className="pointer-events-none fixed inset-0 opacity-50 [background:radial-gradient(circle_at_100%_0%,rgba(56,189,248,0.16),transparent_27%),radial-gradient(circle_at_0%_100%,rgba(125,211,252,0.10),transparent_30%)]" /><div className="relative mx-auto max-w-7xl">
    <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"><Link href="/atlas/leadership" className="font-[family-name:var(--font-norwester)] text-lg uppercase tracking-wide text-sky-300">Atlas <span className="text-white">Leadership Space</span></Link><div className="flex flex-wrap gap-2"><Link href="/atlas/data/upload" className="rounded-full bg-sky-300 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-black transition hover:bg-sky-200">Upload Data</Link><Link href="/atlas/leadership" className="rounded-full border border-white/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/60 transition hover:border-white/35 hover:text-white">Go Back</Link></div></nav>
    <section className="mt-14 flex flex-wrap items-end justify-between gap-6 sm:mt-20"><div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.32em] text-sky-200/75">Atlas Creator Network</p><h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase leading-none sm:text-7xl">Data <span className="text-sky-300">Space</span></h1><p className="mt-5 text-base leading-relaxed text-white/60">Your secure workspace for performance, creator development and daily agency reporting.</p><BackstageStatus /></div><p className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{groups.reduce((count, group) => count + group.workspaces.length, 0)} workspaces</p></section>
    <section className="mt-12 space-y-12">{[...groups].sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title)).map((group) => <div key={group.title}><div className="mb-5"><h2 className={`font-[family-name:var(--font-norwester)] text-3xl uppercase ${group.accent === "gray" ? "text-slate-400" : group.accent === "pink" ? "text-pink-300" : "text-sky-200"}`}>{group.title}</h2><p className="mt-2 text-sm text-white/50">{group.description}</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{group.workspaces.map((item) => { const style = accentStyles[group.accent]; const className = `group relative min-h-72 overflow-hidden rounded-[28px] border bg-white/[0.035] p-6 transition duration-300 ${item.unavailable ? "cursor-not-allowed opacity-40 grayscale" : "hover:-translate-y-1 hover:bg-white/[0.06]"} ${style}`; const content = <><div className={`absolute inset-0 bg-gradient-to-br ${style.split(" ")[0]} ${style.split(" ")[1]} ${style.split(" ")[2]}`} /><div className="relative flex h-full flex-col justify-between"><div><p className={`text-[10px] font-black uppercase tracking-[0.22em] ${style.split(" ").at(-1)}`}>{item.label}</p></div><div>{item.maintenance && <span className="mb-3 inline-flex rounded-full border border-slate-300/25 bg-slate-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-100">Awaiting API</span>}<h3 className="font-[family-name:var(--font-norwester)] text-3xl uppercase leading-[0.95] tracking-tight">{item.title}</h3><p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">{item.description}</p>{!item.unavailable && <span className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/75">Open workspace <span className={`text-lg transition-transform group-hover:translate-x-1 ${group.accent === "pink" ? "text-pink-300" : "text-sky-200"}`} aria-hidden="true">&rarr;</span></span>}</div></div></>; return item.unavailable ? <div key={item.href} aria-disabled="true" className={className}>{content}</div> : <Link key={item.href} href={item.href} className={className}>{content}</Link>; })}</div></div>)}</section>
  </div></main></DataAccessGuard>;
}
