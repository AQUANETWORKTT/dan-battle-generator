import Link from "next/link";
import DataAccessGuard from "../../components/DataAccessGuard";
import BackstageStatus from "./BackstageStatus";

type Accent = "yellow" | "sky" | "emerald" | "orange" | "cyan" | "red" | "purple" | "pink" | "gray";
type Workspace = { href: string; number: string; label: string; title: string; description: string; accent: Accent; maintenance?: boolean; unavailable?: boolean };

const accentStyles: Record<Accent, string> = {
  yellow: "from-yellow-300/20 via-yellow-300/5 to-transparent border-yellow-300/20 group-hover:border-yellow-300/50 text-yellow-200",
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
  { title: "Our Data Space", description: "A shared place for the team to keep live working notes.", accent: "sky", workspaces: [
    { href: "/data/notepad", number: "27", label: "Shared live notes", title: "Notepad", description: "One large shared page. Type freely and it saves automatically five seconds after you stop.", accent: "sky" },
  ] },
  { title: "Data Settings", description: "Controls, creator visibility and reusable daily-poster assets.", accent: "red", workspaces: [
    { href: "/data/excluded-creators", number: "08", label: "Visibility", title: "Excluded Creators", description: "Keep selected creators out of leaderboards, public PNGs and downloads while retaining their intelligence data.", accent: "orange" },
    { href: "/data/fallback-pictures", number: "10", label: "Assets", title: "Fallback Pictures", description: "Upload a reliable profile picture for any creator whose TikTok avatar cannot be retrieved.", accent: "sky" },
    { href: "/data/team-posters", number: "07", label: "Daily assets", title: "Team Poster Builder", description: "Create and maintain reusable yesterday-diamonds poster templates for Team Dan and future teams.", accent: "yellow" },
    { href: "/data/events-leaderboards-admin", number: "09", label: "Event operations", title: "Events Leaderboards Admin", description: "Event score controls, Crew Showdown downloads and private leaderboard tools.", accent: "emerald" },
    { href: "/data/manager-assignments", number: "12", label: "Team setup", title: "Manager Assignments", description: "Drag managers into their correct group. New managers begin unassigned.", accent: "cyan" },
    { href: "/data/telegram-bot-settings", number: "13", label: "Notifications", title: "Telegram Bot Settings", description: "Set Battle Calendar reminder timings and send a safe test message to the battle group.", accent: "sky" },
    { href: "/data/battle-calendar", number: "14", label: "DF / JD Operations", title: "Battle Calendar", description: "Paste battle sheets, keep the DF/JD schedule organised and manage battle reminders.", accent: "sky" },
    { href: "/data/battle-network-settings", number: "18", label: "Battle network", title: "Battle Network Settings", description: "Add external agencies, their Battle Network passwords and logos for manual pairing.", accent: "sky" },
  ] },
  { title: "Creator/Agency Targets", description: "Track creator progress, graduation and mature-creator retention.", accent: "emerald", workspaces: [
    { href: "/graduation-tracker", number: "03", label: "Progress", title: "Graduation Tracker", description: "Track creator progress towards 200,000 diamonds and graduation milestones.", accent: "emerald" },
    { href: "/data/mature-creators-tracker", number: "04", label: "Retention", title: "Mature Creators", description: "Keep 200,000+ diamond creators visible, supported and moving forward.", accent: "orange" },
    { href: "/data/incremental-data-tracking", number: "17", label: "Monthly pace", title: "Incremental Data Tracking", description: "Enter month-to-date diamonds and see the nearest daily incremental target prediction.", accent: "yellow" },
    { href: "/data/team-dan-target-tracker", number: "22", label: "Team targets", title: "Target Tracker", description: "Set editable day, hour and diamond targets for First Class Agency_Dan creators and track monthly progress.", accent: "emerald" },
    { href: "/data/focus-target-tracker", number: "23", label: "Focus targets", title: "Manager Target Tracker", description: "Specific creators from Team Dan / James managers to track monthly progress.", accent: "emerald" },
  ] },
  { title: "Creator Analysis", description: "Performance analysis, creator health and agency intelligence.", accent: "purple", workspaces: [
    { href: "/creator-intelligence", number: "02", label: "Creator health", title: "New Health Score System", description: "Creator health scoring, manager groups, reports and performance trends in one place.", accent: "sky" },
    { href: "/data/recruitment-quality", number: "19", label: "Recruitment", title: "Recruitment Quality", description: "Review 14-day recruitment quality by agency, manager and creator DPH.", accent: "purple" },
    { href: "/data/sub-agency-metrics", number: "20", label: "Agency reporting", title: "Agency Diamond Metrics", description: "See month-to-date diamonds, recruitment contribution and growth across First Class and each sub-agency.", accent: "yellow" },
  ] },
  { title: "Leaderboards", description: "Daily posters and manager performance leaderboards.", accent: "yellow", workspaces: [
    { href: "/daily-rankings", number: "06", label: "Tikleap", title: "Daily Rankings", description: "Pull yesterday's UK Tikleap rankings, then copy or download the usernames.", accent: "sky" },
    { href: "/data/team-diamonds-yesterday", number: "05", label: "Daily snapshot", title: "Team Posters", description: "Build and download yesterday's top diamonds and live-hours posters.", accent: "yellow" },
    { href: "/data/manager-leaderboard", number: "11", label: "Monthly totals", title: "Manager Leaderboard", description: "Load manager diamond totals, use the saved poster background and download the leaderboard PNG.", accent: "emerald" },
    { href: "/data/recruitment-leaderboard", number: "16", label: "Monthly growth", title: "Recruitment Leaderboard", description: "Rank every active manager by calendar-month recruits and download a dynamic leaderboard PNG.", accent: "yellow" },
  ] },
  { title: "Events", description: "Plan agency events and keep every campaign task in one place.", accent: "pink", workspaces: [
    { href: "/data/event-planner", number: "24", label: "Campaign planning", title: "Event Planner", description: "Create Head-to-Head, Showcase and Other events with an editable preparation checklist.", accent: "pink" },
    { href: "/data/todo-calendar", number: "25", label: "Shared operations", title: "To-Do List Calendar", description: "Add shared jobs to any day and keep the agency's daily work visible.", accent: "pink" },
  ] },
  { title: "Management", description: "First Class manager onboarding and team completion progress.", accent: "yellow", workspaces: [
    { href: "/data/creator-id-lookup", number: "26", label: "Creator history", title: "Creator ID Lookup", description: "Find the username and the latest 30 saved daily records using a permanent Creator ID.", accent: "sky" },
    { href: "/data/quitting-records", number: "28", label: "Creator history", title: "Quitting Records", description: "Quickly save and review shared quitting records, with optional reasons.", accent: "sky" },
    { href: "/data/leave-requests", number: "29", label: "Creator care", title: "Leave Requests", description: "Review creators detected as leaving after 15 or more days with the agency.", accent: "yellow" },
    { href: "/data/manager-onboarding-progress", number: "15", label: "Creator care", title: "Manager Onboarding Progress", description: "Review onboarding work submitted by First Class managers.", accent: "yellow" },
    { href: "/data/manager-strikes", number: "21", label: "Owner only", title: "Manager Strikes", description: "Record up to three strikes for each Dan/James or Mike/Indi manager.", accent: "yellow" },
  ] },
];

const order = ["Our Data Space", "Leaderboards", "Creator/Agency Targets", "Creator Analysis", "Events", "Management", "Data Settings"];

export default function DataMenuPage() {
  return <DataAccessGuard><main className="min-h-screen overflow-hidden bg-[#080806] px-5 py-6 text-white sm:px-8 sm:py-8"><div className="pointer-events-none fixed inset-0 opacity-50 [background:radial-gradient(circle_at_100%_0%,rgba(56,189,248,0.16),transparent_27%),radial-gradient(circle_at_0%_100%,rgba(250,204,21,0.12),transparent_30%)]" /><div className="relative mx-auto max-w-7xl">
    <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"><Link href="/" className="font-[family-name:var(--font-norwester)] text-lg uppercase tracking-wide text-yellow-300">First Class <span className="text-white">Leadership Space</span></Link><div className="flex flex-wrap gap-2"><Link href="/data-analysis/upload" className="rounded-full bg-yellow-300 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-black transition hover:bg-yellow-200">Upload Data</Link><Link href="/login" className="rounded-full border border-white/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/60 transition hover:border-white/35 hover:text-white">Go Back</Link></div></nav>
    <section className="mt-14 flex flex-wrap items-end justify-between gap-6 sm:mt-20"><div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.32em] text-sky-200/75">First Class Agency</p><h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase leading-none sm:text-7xl">Data <span className="text-yellow-300">Space</span></h1><p className="mt-5 text-base leading-relaxed text-white/60">Your secure workspace for performance, creator development and daily agency reporting.</p><BackstageStatus /></div><p className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{groups.reduce((count, group) => count + group.workspaces.length, 0)} workspaces</p></section>
    <section className="mt-12 space-y-12">{[...groups].sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title)).map((group) => <div key={group.title}><div className="mb-5"><h2 className={`font-[family-name:var(--font-norwester)] text-3xl uppercase ${group.accent === "gray" ? "text-slate-400" : group.accent === "pink" ? "text-pink-300" : "text-yellow-200"}`}>{group.title}</h2><p className="mt-2 text-sm text-white/50">{group.description}</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{group.workspaces.map((item) => { const style = accentStyles[group.accent]; const className = `group relative min-h-72 overflow-hidden rounded-[28px] border bg-white/[0.035] p-6 transition duration-300 ${item.unavailable ? "cursor-not-allowed opacity-40 grayscale" : "hover:-translate-y-1 hover:bg-white/[0.06]"} ${style}`; const content = <><div className={`absolute inset-0 bg-gradient-to-br ${style.split(" ")[0]} ${style.split(" ")[1]} ${style.split(" ")[2]}`} /><div className="relative flex h-full flex-col justify-between"><div><p className={`text-[10px] font-black uppercase tracking-[0.22em] ${style.split(" ").at(-1)}`}>{item.label}</p></div><div>{item.maintenance && <span className="mb-3 inline-flex rounded-full border border-slate-300/25 bg-slate-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-100">Awaiting API</span>}<h3 className="font-[family-name:var(--font-norwester)] text-3xl uppercase leading-[0.95] tracking-tight">{item.title}</h3><p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">{item.description}</p>{!item.unavailable && <span className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/75">Open workspace <span className={`text-lg transition-transform group-hover:translate-x-1 ${group.accent === "pink" ? "text-pink-300" : "text-yellow-200"}`} aria-hidden="true">&rarr;</span></span>}</div></div></>; return item.unavailable ? <div key={item.href} aria-disabled="true" className={className}>{content}</div> : <Link key={item.href} href={item.href} className={className}>{content}</Link>; })}</div></div>)}</section>
  </div></main></DataAccessGuard>;
}
