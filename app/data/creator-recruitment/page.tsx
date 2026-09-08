"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type Source = { id: "daily-rankings" | "league"; label: string; needsLeague?: boolean };
type TikleapCreator = { rank?: number; username: string; displayName?: string; league?: string; diamonds?: number; diamondText?: string; liveNow?: boolean; avatarUrl?: string; creatorId?: string; profileUrl?: string; lastUpdated?: string; [key: string]: unknown };
type InternalCreator = { creatorId?: string; manager?: string; agency?: string; alreadyManaged?: boolean; quittingRecord?: boolean; quittingReason?: string; lastInternalUpdate?: string };
type RecruitmentCreator = TikleapCreator & { rank: number; league: string; internal?: InternalCreator; available?: boolean; invitationType?: string; reason?: string; ignored?: boolean };
type EligibilityFilter = "all" | "Regular" | "Premium" | "multi-account-risk" | "other-reason";
type LiveFilter = "all" | "live" | "offline";

const SOURCES: Source[] = [
  { id: "daily-rankings", label: "Daily Rankings" },
  { id: "league", label: "League", needsLeague: true },
];
const COUNTRIES = [{ code: "gb", label: "UK" }, { code: "au", label: "Australia" }] as const;
const LEAGUES = ["A1", "A2", "A3", "B1", "B2", "B3", "B4", "B5", "C1", "C2", "C3", "C4", "C5", "D1", "D2", "D3", "D4", "D5"];
const placeholderAvatar = "/world-cup-2026/avatar-placeholder.jpg";

const normalizeUsername = (value: unknown) => String(value || "").trim().replace(/^@/, "");
const key = (value: unknown) => normalizeUsername(value).toLowerCase();
const timestamp = () => new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

function creatorFromUnknown(value: unknown, fallback: Partial<TikleapCreator> = {}): TikleapCreator | null {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const username = normalizeUsername(row.username || row.handle || row.creatorUsername || fallback.username);
  if (!username) return null;
  return {
    ...fallback,
    username,
    rank: Number(row.rank || row.position || fallback.rank || 0),
    displayName: String(row.displayName || row.nickname || row.name || fallback.displayName || ""),
    league: String(row.league || fallback.league || ""),
    diamonds: Number(row.diamonds || row.score || fallback.diamonds || 0),
    diamondText: String(row.diamondText || row.scoreText || fallback.diamondText || ""),
    liveNow: Boolean(row.liveNow ?? row.isLive ?? fallback.liveNow),
    avatarUrl: String(row.avatarUrl || row.avatar || row.profilePicture || fallback.avatarUrl || ""),
    creatorId: String(row.creatorId || row.creator_id || fallback.creatorId || ""),
    profileUrl: String(row.profileUrl || fallback.profileUrl || ""),
    lastUpdated: String(row.lastUpdated || fallback.lastUpdated || timestamp()),
  };
}

export default function CreatorRecruitmentPage() {
  const [source, setSource] = useState<Source["id"]>("league");
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]["code"]>("gb");
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>(["A2"]);
  const [rows, setRows] = useState<RecruitmentCreator[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [eligibilityFilter, setEligibilityFilter] = useState<EligibilityFilter>("all");
  const [liveFilter, setLiveFilter] = useState<LiveFilter>("all");
  const [selectedCreator, setSelectedCreator] = useState<RecruitmentCreator | null>(null);
  const [copiedUsername, setCopiedUsername] = useState("");
  const rowsRef = useRef<RecruitmentCreator[]>([]);
  const pendingSourcesRef = useRef(new Set<string>());
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { rowsRef.current = rows; }, [rows]);
  useEffect(() => () => { if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current); }, []);

  async function copyUsername(username: string) {
    try {
      await navigator.clipboard.writeText(username);
      setCopiedUsername(username);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedUsername(""), 1500);
    } catch { setMessage("Clipboard access was blocked by the browser."); }
  }

  function checkAvailabilityFor(creators: RecruitmentCreator[] | TikleapCreator[]) {
    if (!creators.length) return;
    window.postMessage({ source: "first-class-daily-rankings", type: "check-backstage-availability", creators }, window.location.origin);
  }

  function finishSource(sourceName: string) {
    pendingSourcesRef.current.delete(sourceName);
    if (!pendingSourcesRef.current.size) {
      setLoading(false);
      checkAvailabilityFor(rowsRef.current);
      setMessage(`Loaded ${rowsRef.current.length} Tikleap creators. Checking availability now…`);
    }
  }

  const enrichInternal = useCallback(async (creators: TikleapCreator[]) => {
    const usernames = creators.map((creator) => creator.username);
    if (!usernames.length) return;
    try {
      const response = await fetch("/api/data-analysis/creator-recruitment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usernames }) });
      const data = await response.json() as { creators?: Record<string, InternalCreator> };
      setRows((current) => current.map((row) => ({ ...row, internal: data.creators?.[key(row.username)] || row.internal })));
    } catch { /* The Tikleap results remain usable without internal context. */ }
  }, []);

  useEffect(() => {
    function receiveTikleap(event: MessageEvent) {
      if (event.source !== window || event.data?.source !== "first-class-tikleap-extension") return;
      const data = event.data as Record<string, unknown>;
      if (data.type === "league-rankings-row") {
        const league = String(data.league || "").toUpperCase();
        const creators = (Array.isArray(data.rows) ? data.rows : []).map((row) => creatorFromUnknown(row, { league })).filter(Boolean) as TikleapCreator[];
        setRows((current) => {
          const next = [...current.filter((row) => row.league !== league), ...creators.map((row, index) => ({ ...row, rank: row.rank || index + 1, league }))];
          rowsRef.current = next;
          return next;
        });
      }
      if (data.type === "uk-rankings") {
        const supplied = Array.isArray(data.creators) ? data.creators : Array.isArray(data.rows) ? data.rows : [];
        const creators = supplied.length
          ? supplied.map((row, index) => creatorFromUnknown(row, { rank: index + 1 })).filter(Boolean) as TikleapCreator[]
          : (Array.isArray(data.usernames) ? data.usernames : []).map((username, index) => creatorFromUnknown({ username, rank: index + 1 })).filter(Boolean) as TikleapCreator[];
        setRows((current) => {
          const next = [...current.filter((row) => row.league !== "Daily Rankings"), ...creators.map((row, index) => ({ ...row, rank: row.rank || index + 1, league: row.league || "Daily Rankings" }))];
          rowsRef.current = next;
          return next;
        });
        finishSource("daily-rankings");
        void enrichInternal(creators);
      }
      if (data.type === "league-rankings-complete") {
        finishSource("leagues");
        void enrichInternal(rowsRef.current);
      }
      if (data.type === "availability-progress" || data.type === "availability-complete") {
        const availability = Array.isArray(data.results) ? data.results as Array<Record<string, unknown>> : [];
        setRows((current) => current.map((row) => {
          const match = availability.find((item) => key(item.username) === key(row.username) && (!item.league || item.league === row.league));
          return match ? { ...row, available: Boolean(match.available), invitationType: String(match.invitationType || ""), reason: String(match.reason || ""), ignored: Boolean(match.ignored) } : row;
        }));
      }
      if (data.type === "uk-rankings-error" || data.type === "league-rankings-error" || data.type === "availability-error") { setLoading(false); setMessage(String(data.error || "Tikleap could not load creators.")); }
    }
    window.addEventListener("message", receiveTikleap);
    return () => window.removeEventListener("message", receiveTikleap);
  }, [enrichInternal]);

  function loadCreators() {
    setRows([]); setSelectedCreator(null); setLoading(true); setMessage("Reading Tikleap in Chrome…");
    setSelectedLeagues([]);
    rowsRef.current = [];
    pendingSourcesRef.current = new Set(["daily-rankings", "leagues"]);
    window.postMessage({ source: "first-class-daily-rankings", type: "pull-uk-rankings", country: "gb" }, window.location.origin);
    window.postMessage({ source: "first-class-daily-rankings", type: "pull-uk-live-leagues", leagues: LEAGUES, country: "gb" }, window.location.origin);
    window.setTimeout(() => setLoading((active) => { if (active) setMessage("Tikleap did not respond. Make sure the First Class Tikleap Helper is installed and Chrome is open."); return false; }), 120000);
  }

  function checkAvailability() {
    if (!rows.length) return;
    checkAvailabilityFor(rows);
    setMessage("Checking Backstage availability — no invitations will be sent.");
  }

  const visibleRows = useMemo(() => rows.filter((row) => {
    if (row.ignored) return false;
    if (selectedLeagues.length && !selectedLeagues.includes(row.league)) return false;
    if (liveFilter === "live" && !row.liveNow) return false;
    if (liveFilter === "offline" && row.liveNow) return false;
    if (eligibilityFilter === "all") return true;
    if (eligibilityFilter === "Regular" || eligibilityFilter === "Premium") return row.available === true && row.invitationType === eligibilityFilter;
    if (eligibilityFilter === "multi-account-risk") return /multi(?:ple)?[\s-]?account/i.test(row.reason || "");
    return row.available === false && !/multi(?:ple)?[\s-]?account/i.test(row.reason || "");
  }), [rows, selectedLeagues, eligibilityFilter, liveFilter]);
  const selectedSource = SOURCES.find((item) => item.id === source)!;
  const availableCountries = source === "daily-rankings" ? COUNTRIES.filter((item) => item.code === "gb") : COUNTRIES;

  return <DataAccessGuard><main data-rankings-checker className="min-h-screen bg-[#07090f] px-4 py-8 text-white sm:px-8"><style>{"main[data-rankings-checker] img { display: none; }"}</style><div className="mx-auto max-w-7xl">
    <Link href="/data/menu" className="text-xs font-black uppercase tracking-[.18em] text-sky-200">← Back to Data Space</Link>
    <header className="mt-9 rounded-3xl border border-sky-300/25 bg-sky-300/10 p-6"><p className="text-xs font-black uppercase tracking-[.28em] text-sky-200/70">Tikleap · Data Space</p><h1 className="mt-3 text-4xl font-black uppercase text-cyan-200 sm:text-6xl">Creator Recruitment</h1><p className="mt-3 max-w-3xl text-sm text-white/65">Load Tikleap rankings or leagues, check recruitment availability, and review the context already held internally — without navigating away.</p></header>
    <section className="mt-6 rounded-3xl border border-violet-300/25 bg-white/[.035] p-6"><div className="grid gap-5 lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-end"><label className="text-xs font-black uppercase tracking-wider text-white/55">Source<select value={source} onChange={(event) => { const next = event.target.value as Source["id"]; setSource(next); if (next === "daily-rankings") setCountry("gb"); }} className="mt-2 block w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm font-bold normal-case text-white">{SOURCES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="text-xs font-black uppercase tracking-wider text-white/55">Country / region<select value={country} onChange={(event) => setCountry(event.target.value as typeof country)} className="mt-2 block w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm font-bold normal-case text-white">{availableCountries.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label><div className="text-xs font-black uppercase tracking-wider text-white/55">{selectedSource.needsLeague ? "League" : "Leaderboard"}<div className="mt-2 flex min-h-11 flex-wrap items-center gap-2">{selectedSource.needsLeague ? <>{LEAGUES.map((league) => <button key={league} type="button" onClick={() => setSelectedLeagues((current) => current.includes(league) ? current.filter((item) => item !== league) : [...current, league])} className={`rounded-lg px-3 py-2 text-xs font-black ${selectedLeagues.includes(league) ? "bg-violet-300 text-black" : "border border-white/15 text-white/65 hover:bg-white/10"}`}>{league}</button>)}</> : <span className="rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-sky-100">Daily Rankings</span>}</div></div><button type="button" onClick={loadCreators} disabled={loading || (selectedSource.needsLeague && !selectedLeagues.length)} className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black uppercase text-black hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-45">{loading ? "Loading…" : "Load creators"}</button></div></section>
    <section className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-black/25 p-4"><div><p className="mb-2 text-[10px] font-black uppercase tracking-wide text-white/45">Eligibility</p><div className="flex flex-wrap gap-2">{([{ value: "all", label: "All" }, { value: "Regular", label: "Available · Regular" }, { value: "Premium", label: "Available · Premium" }, { value: "multi-account-risk", label: "Multi-account risk" }, { value: "other-reason", label: "Other reason" }] as Array<{ value: EligibilityFilter; label: string }>).map((item) => <button key={item.value} type="button" onClick={() => setEligibilityFilter(item.value)} className={`rounded-lg px-3 py-2 text-xs font-black uppercase ${eligibilityFilter === item.value ? item.value === "Premium" ? "bg-cyan-200 text-cyan-950" : item.value === "Regular" ? "bg-emerald-300 text-emerald-950" : "bg-white text-black" : "border border-white/15 text-white/70 hover:bg-white/10"}`}>{item.label}</button>)}</div></div><div><p className="mb-2 text-[10px] font-black uppercase tracking-wide text-white/45">Live status</p><div className="flex gap-2">{([{ value: "all", label: "All" }, { value: "live", label: "Live now" }, { value: "offline", label: "Offline" }] as Array<{ value: LiveFilter; label: string }>).map((item) => <button key={item.value} type="button" onClick={() => setLiveFilter(item.value)} className={`rounded-lg px-3 py-2 text-xs font-black uppercase ${liveFilter === item.value ? item.value === "live" ? "bg-red-400 text-black" : "bg-white text-black" : "border border-white/15 text-white/70 hover:bg-white/10"}`}>{item.label}</button>)}</div></div><button type="button" onClick={checkAvailability} disabled={!rows.length} className="self-end rounded-lg border border-emerald-300/50 px-4 py-2 text-xs font-black uppercase text-emerald-200 disabled:opacity-40">Check availability</button><span className="self-end text-sm text-white/50">{rows.length ? `${visibleRows.length} of ${rows.filter((row) => !row.ignored).length} creators shown` : "Choose a source and load creators."}</span></section>
    {message ? <p className="mt-4 rounded-xl border border-sky-300/20 bg-sky-300/10 p-3 text-sm text-sky-100">{message}</p> : null}
    <section className="mt-5 overflow-x-auto rounded-3xl border border-white/10 bg-white/[.03]">
      <div className="min-w-[1050px]">
        <div className="grid grid-cols-[72px_minmax(220px,1.5fr)_80px_130px_90px_150px_minmax(170px,1fr)_150px_80px] gap-3 border-b border-white/10 bg-black/40 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-white/50">
          <span>Rank</span><span>Creator</span><span>League</span><span>Diamonds / score</span><span>Live</span><span>Eligibility</span><span>Reason</span><span>Last updated</span><span />
        </div>
        {visibleRows.map((creator) => {
          const status = creator.available === true ? "Available" : creator.available === false ? "Ineligible" : "Not checked";
          const reason = creator.reason || (creator.internal?.alreadyManaged ? `Already managed${creator.internal.manager ? ` · ${creator.internal.manager}` : ""}` : creator.internal?.quittingRecord ? creator.internal.quittingReason || "Quitting record" : "No restrictions recorded");
          const eligibilityClass = creator.available === true ? creator.invitationType === "Premium" ? "bg-cyan-200 text-cyan-950" : "bg-emerald-300 text-emerald-950" : creator.available === false ? "bg-rose-300/15 text-rose-300" : "bg-yellow-200/15 text-yellow-100";
          return <div key={`${creator.league}-${creator.username}`} role="button" tabIndex={0} onClick={() => setSelectedCreator(creator)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedCreator(creator); }} className="grid grid-cols-[72px_minmax(220px,1.5fr)_80px_130px_90px_150px_minmax(170px,1fr)_150px_80px] items-center gap-3 border-b border-white/5 px-4 py-3 text-left text-sm transition hover:bg-white/[.055]">
            <span className="font-black text-sky-200">#{creator.rank}</span>
            <span className="min-w-0"><button type="button" title="Click to copy" onClick={(event) => { event.stopPropagation(); void copyUsername(creator.username); }} className="max-w-full truncate rounded px-1 -mx-1 font-black text-white transition hover:bg-sky-300/15 hover:text-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-300">{creator.username}</button>{copiedUsername === creator.username ? <small aria-live="polite" className="ml-2 text-xs font-bold text-emerald-300">✓ Copied!</small> : null}{creator.displayName ? <small className="block truncate text-white/50">{creator.displayName}</small> : null}</span>
            <span className="font-bold text-white/80">{creator.league || "—"}</span>
            <span className="font-black text-violet-100">{creator.diamondText || (creator.diamonds ? creator.diamonds.toLocaleString() : "—")}</span>
            <span className={creator.liveNow ? "font-black text-red-300" : "text-white/45"}>{creator.liveNow ? "● LIVE" : "Offline"}</span>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${eligibilityClass}`}>{status}{creator.invitationType ? ` · ${creator.invitationType}` : ""}</span>
            <span className="truncate text-white/60">{reason}</span>
            <span className="text-xs text-white/50">{creator.lastUpdated || "—"}</span>
            <span className="rounded-lg border border-sky-300/35 px-3 py-2 text-center text-[10px] font-black uppercase text-sky-100">View</span>
          </div>;
        })}
        {!rows.length && !loading ? <p className="p-12 text-center text-sm text-white/45">No creators loaded yet.</p> : null}
      </div>
    </section>
    {selectedCreator ? <aside className="fixed inset-y-0 right-0 z-30 w-full max-w-xl overflow-y-auto border-l border-sky-300/25 bg-[#0a0e18] p-6 shadow-2xl"><button type="button" onClick={() => setSelectedCreator(null)} className="ml-auto block text-xs font-black uppercase text-white/60 hover:text-white">Close ×</button><div className="mt-6 flex gap-4"><img src={selectedCreator.avatarUrl || placeholderAvatar} alt="" onError={(event) => { event.currentTarget.src = placeholderAvatar; }} className="h-20 w-20 rounded-full border border-white/15 object-cover"/><div><h2 className="text-2xl font-black">{selectedCreator.username}</h2><p className="text-white/55">{selectedCreator.displayName || "Display name not returned by Tikleap"}</p><a href={selectedCreator.profileUrl || `https://www.tiktok.com/@${selectedCreator.username.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-black uppercase text-sky-200 hover:text-sky-100">View TikTok profile ↗</a></div></div><Detail title="Current Tikleap data" items={[["Leaderboard", selectedSource.label], ["Rank", `#${selectedCreator.rank}`], ["League", selectedCreator.league || "Not returned"], ["Diamonds / score", selectedCreator.diamondText || String(selectedCreator.diamonds || "Not returned")], ["Live", selectedCreator.liveNow ? "Live now" : "Offline"], ["Last checked", selectedCreator.lastUpdated || "Not returned"], ["Creator ID", selectedCreator.creatorId || selectedCreator.internal?.creatorId || "Not returned"]]}/><Detail title="Recruitment status" items={[["Eligibility", selectedCreator.available === true ? "Available" : selectedCreator.available === false ? "Ineligible" : "Not checked"], ["Reason", selectedCreator.reason || selectedCreator.internal?.quittingReason || "No restriction returned"], ["Already managed", selectedCreator.internal?.alreadyManaged ? "Yes" : "No internal match"], ["Manager", selectedCreator.internal?.manager || "Not recorded"], ["Agency", selectedCreator.internal?.agency || "Not recorded"], ["Quitting record", selectedCreator.internal?.quittingRecord ? "Yes" : "No record"]]}/></aside> : null}
  </div></main></DataAccessGuard>;
}

function Detail({ title, items }: { title: string; items: Array<[string, string]> }) { return <section className="mt-8 rounded-2xl border border-white/10 bg-white/[.035] p-5"><h3 className="text-xs font-black uppercase tracking-[.18em] text-sky-200">{title}</h3><dl className="mt-4 space-y-3">{items.map(([label, value]) => <div key={label}><dt className="text-[10px] font-black uppercase tracking-wide text-white/45">{label}</dt><dd className="mt-1 text-sm text-white/85">{value}</dd></div>)}</dl></section>; }
