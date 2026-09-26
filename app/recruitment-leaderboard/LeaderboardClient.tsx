"use client";

import { useEffect, useMemo, useState } from "react";

type Manager = { key: string; manager: string; group: string; recruits: number; diamonds: number };
type Data = { endDate: string; managers: Manager[]; error?: string };
const eligibleGroups = new Set(["Team Dan / James", "Team Mike / Indi"]);
const format = new Intl.NumberFormat("en-GB");
const displayName = (name: string) => name.replace(/^team\s+/i, "");

export default function LeaderboardClient() {
  const [data, setData] = useState<Data>({ endDate: "", managers: [] });
  const [error, setError] = useState("");
  const managers = useMemo(() => data.managers.filter((manager) => eligibleGroups.has(manager.group) && !["teamdanjames", "firstclassagencydan", "firstclassagencyjames"].includes(manager.key) && manager.manager !== "Team Dan / James").sort((a, b) => b.recruits - a.recruits || b.diamonds - a.diamonds || a.manager.localeCompare(b.manager)), [data.managers]);

  useEffect(() => {
    fetch("/api/data-analysis/recruitment-leaderboard?period=month", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as Data;
        if (!response.ok) throw new Error(result.error || "Could not load the leaderboard.");
        setData(result);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load the leaderboard."));
  }, []);

  return <main className="min-h-screen bg-[#070608] bg-cover bg-fixed bg-center px-4 py-8 text-white sm:px-8 sm:py-12" style={{ backgroundImage: "linear-gradient(rgba(5,4,7,.88), rgba(5,4,7,.94)), url('/branding/first-class-data-bg.jpg')" }}>
    <div className="mx-auto max-w-5xl">
      <header className="text-center">
        <img src="/branding/first-class-recruitment-logo.png" alt="First Class Recruitment" className="mx-auto w-full max-w-[620px]" />
        <div className="mx-auto mt-7 h-px max-w-3xl bg-gradient-to-r from-transparent via-[#f5ca62] to-transparent" />
        <h1 className="mt-7 font-[family-name:var(--font-norwester)] text-4xl uppercase tracking-wide text-white sm:text-6xl">Recruitment <span className="text-[#f5ca62]">Leaderboard</span></h1>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-white/55">Current calendar month · Live daily data</p>
      </header>

      <section className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-[30px] border border-[#f5ca62]/40 bg-black/65 px-4 py-6 shadow-[0_0_60px_rgba(207,157,50,.12)] backdrop-blur-sm sm:px-8"><p className="text-center font-[family-name:var(--font-norwester)] text-3xl uppercase tracking-[0.08em] text-[#ffe79a] sm:text-4xl">Monthly rewards</p><div className="mt-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10"><Reward place="First place" amount="£50" tone="gold" /><Reward place="Second place" amount="£30" tone="silver" /><Reward place="Third place" amount="£20" tone="bronze" /></div></section>

      <section className="mt-9 overflow-hidden rounded-[28px] border border-[#f5ca62]/45 bg-black/75 shadow-[0_0_60px_rgba(207,157,50,.12)] backdrop-blur-sm">
        <div className="hidden grid-cols-[76px_minmax(0,1fr)_140px_150px] items-center gap-4 border-b border-[#f5ca62]/25 bg-[#f5ca62]/10 px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#f5ca62] sm:grid"><span>Rank</span><span>Manager</span><span className="text-right">Recruits</span><span className="text-right">Recruit diamonds</span></div>
        {managers.map((manager, index) => <ManagerRow key={manager.key} manager={manager} rank={index + 1} />)}
        {!error && !managers.length ? <p className="px-6 py-16 text-center text-sm text-white/55">Loading leaderboard…</p> : null}
        {error ? <p className="px-6 py-16 text-center text-sm text-red-200">{error}</p> : null}
      </section>
      <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-white/35">Recruit credit and diamonds are matched by permanent TikTok creator ID.</p>
    </div>
  </main>;
}

function ManagerRow({ manager, rank }: { manager: Manager; rank: number }) {
  const color = rank === 1 ? "border-[#ffe79a] bg-gradient-to-r from-[#b78318]/40 via-[#f5ca62]/20 to-transparent" : rank === 2 ? "border-slate-200/70 bg-gradient-to-r from-slate-200/20 to-transparent" : rank === 3 ? "border-[#d89157]/70 bg-gradient-to-r from-[#b56b36]/25 to-transparent" : "border-[#d9a83f]/25 bg-black/20";
  const medal = rank === 1 ? "text-[#ffe79a]" : rank === 2 ? "text-slate-100" : rank === 3 ? "text-[#e3a46b]" : "text-[#f5ca62]";
  const theme = ({ fearnegurry1: "/manager-themes/fearne-sunset.png", louisesquelch: "/manager-themes/louise-cosmic.png", firstclassagencykyran: "/manager-themes/kyran-pink-bows.png", firstclassagencyash: "/manager-themes/ash-halloween.png", cjtokens1237: "/manager-themes/cj-sunset.png", firstclassagencymillie: "/manager-themes/millie-red-rose.png", firstclassagencymavis: "/manager-themes/mavis-moths.png", firstclassagencyolivia: "/manager-themes/liv-butterflies.png", demileawebster7: "/manager-themes/demi-highland-cow.png", firstclassagencyabbie: "/manager-themes/abbie-purple-music.png", rachellouise18rlyahoocom: "/manager-themes/rach-crowns.png", firstclassagencylauren: "/manager-themes/lauren-strawberry-field.png", firstclassagencykayden: "/manager-themes/kayden-mads-orange-sunset.png", megan25121990hot: "/manager-themes/megan-wildlife.png", kishaunnolan1: "/manager-themes/kash-first-class.png", xaramills17: "/manager-themes/zara-wolf.png", chantelleswaine97: "/manager-themes/chan-cherry-cupcake.png", trident125: "/manager-themes/marcy-trident.png", steven06gmxcom: "/manager-themes/primal-wolf-sunset.png" } as Record<string, string>)[manager.key] || "";
  return <article className={`relative grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden border-b px-4 py-6 last:border-0 sm:grid-cols-[96px_minmax(0,1fr)_180px_200px] sm:gap-4 sm:px-6 ${color}`}>
    {theme ? <><div className="absolute inset-0 bg-cover bg-center opacity-[.82]" style={{ backgroundImage: `url('${theme}')` }} /><div className="absolute inset-0 bg-gradient-to-r from-black/34 via-black/10 to-black/30" /><div className="absolute inset-y-0 right-0 w-[44%] bg-gradient-to-l from-black/60 via-black/25 to-transparent" /></> : null}
    <strong className={`relative z-10 font-[family-name:var(--font-norwester)] text-3xl ${medal}`}>{rank}</strong>
    <p className="relative z-10 truncate font-[family-name:var(--font-norwester)] text-3xl uppercase tracking-wide text-white sm:text-4xl">{displayName(manager.manager)}</p>
    <div className="relative z-10 text-right sm:contents"><p style={{ WebkitTextStroke: "0.45px rgba(0,0,0,.9)", textShadow: "0 1px 2px #000, 0 0 5px rgba(255,255,255,.45)" }} className="relative z-10 font-[family-name:var(--font-norwester)] text-2xl text-white sm:text-right">{format.format(manager.recruits)}<span className="ml-1 text-[9px] tracking-wider text-white/45 sm:hidden">RECRUITS</span></p><p style={{ WebkitTextStroke: "0.45px rgba(0,0,0,.9)", textShadow: "0 1px 2px #000, 0 0 6px rgba(255,214,101,.55)" }} className="relative z-10 col-start-2 mt-1 text-left text-xl font-bold text-[#fff0a6] sm:col-auto sm:mt-0 sm:text-right sm:text-2xl">{format.format(manager.diamonds)}<span className="ml-1 text-[9px] tracking-wider text-white/45 sm:hidden">💎</span></p></div>
  </article>;
}

function Reward({ place, amount, tone }: { place: string; amount: string; tone: "gold" | "silver" | "bronze" }) {
  const styles = {
    gold: "bg-[linear-gradient(180deg,rgba(245,202,98,.20),rgba(245,202,98,.025))] text-[#ffe79a]",
    silver: "border-x border-white/10 bg-[linear-gradient(180deg,rgba(226,232,240,.16),rgba(226,232,240,.02))] text-slate-100",
    bronze: "bg-[linear-gradient(180deg,rgba(224,143,81,.16),rgba(224,143,81,.02))] text-[#eab27c]",
  }[tone];
  return <div className={`flex min-h-[132px] flex-col items-center justify-center px-2 py-4 text-center sm:min-h-[148px] ${styles}`}><p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-65 sm:text-[10px]">{place}</p><p className="mt-3 font-[family-name:var(--font-norwester)] text-4xl leading-none sm:text-5xl">{amount}</p><p className="mt-2 text-[8px] font-black uppercase tracking-[0.12em] opacity-50">End of month prize</p></div>;
}
