"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type CountryUsernames = {
  code: string;
  label: string;
  usernames: string[];
  period?: string;
  sourceUrl?: string;
};

type TikleapResponse = {
  countries?: CountryUsernames[];
  errors?: Array<{ code: string; label: string; error: string }>;
  error?: string;
};

type LeagueRow = { rank: number; username: string; diamonds: number; diamondText: string; liveNow?: boolean };
type LeagueRankings = Record<string, LeagueRow[]>;
type AvailabilityResult = LeagueRow & { league: string; available: boolean; invitationType: string; reason: string; ignored?: boolean };
type AvailabilityFilter = "all" | "Regular" | "Premium" | "multi-account-risk" | "ineligible-other";
type CopyFormat = "details" | "username" | "username-diamonds" | "username-league";

const CHUNK_SIZES = [24, 24, 24];
const TIKLEAP_EXTENSION_UNDER_REVIEW = false;
const LIVE_LEAGUES = ["A1", "A2", "A3", "B1", "B2", "B3", "B4", "B5", "C1", "C2", "C3", "C4", "C5", "D1", "D2", "D3", "D4", "D5"];

function splitForBackstage(names: string[]) {
  const chunks: string[][] = [];
  let start = 0;

  for (const size of CHUNK_SIZES) {
    chunks.push(names.slice(start, start + size));
    start += size;
  }

  chunks.push(names.slice(start));
  return chunks;
}

function countryText(country: CountryUsernames) {
  return country.usernames.join("\n");
}

function allCountriesText(countries: CountryUsernames[]) {
  return countries
    .map((country) => `${country.label}${country.period ? ` - ${country.period}` : ""}\n${countryText(country)}`)
    .join("\n\n");
}

function todayInLondon() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export default function TikleapUkUsernamesPage() {
  const [countries, setCountries] = useState<CountryUsernames[]>([]);
  const [countryErrors, setCountryErrors] = useState<TikleapResponse["errors"]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedDate, setSavedDate] = useState("");
  const [leagueRankings, setLeagueRankings] = useState<LeagueRankings>({});
  const [leagueLoading, setLeagueLoading] = useState(false);
  const [leagueMessage, setLeagueMessage] = useState("");
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>(LIVE_LEAGUES);
  const [liveFilter, setLiveFilter] = useState<"all" | "live">("all");
  const [rankingCountry, setRankingCountry] = useState<"gb" | "au">("gb");
  const [availabilityResults, setAvailabilityResults] = useState<AvailabilityResult[]>([]);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");
  const [copyFormat, setCopyFormat] = useState<CopyFormat>("details");
  const saveAfterChromePullRef = useRef(false);

  useEffect(() => {
    function receiveChromeRankings(event: MessageEvent) {
      if (event.source !== window || !event.data || event.data.source !== "first-class-tikleap-extension") return;
      if (event.data.type === "uk-rankings-error") {
        setLoading(false);
        setMessage(String(event.data.error || "Could not read the UK Tikleap rankings."));
        return;
      }
      if (event.data.type !== "uk-rankings") return;
      const usernames = Array.isArray(event.data.usernames)
        ? event.data.usernames.map((username: unknown) => String(username).trim()).filter(Boolean).slice(0, 99)
        : [];
      setLoading(false);
      if (!usernames.length) {
        setMessage("Chrome could not find the UK rankings on TickLeap.");
        return;
      }
      setCountries([{ code: "gb", label: "UK", usernames, period: "Current public daily rankings", sourceUrl: "https://www.tikleap.com/country/gb" }]);
      setCountryErrors([]);
      if (saveAfterChromePullRef.current) {
        saveAfterChromePullRef.current = false;
        void saveRankings(usernames);
        return;
      }
      setMessage(`Loaded ${usernames.length} UK daily-ranking usernames from Chrome.`);
    }
    window.addEventListener("message", receiveChromeRankings);
    return () => window.removeEventListener("message", receiveChromeRankings);
  }, []);

  useEffect(() => {
    function receiveAvailability(event: MessageEvent) {
      if (event.source !== window || event.data?.source !== "first-class-tikleap-extension") return;
      if (event.data.type === "availability-progress" || event.data.type === "availability-complete") {
        const results = Array.isArray(event.data.results) ? event.data.results as AvailabilityResult[] : [];
        setAvailabilityResults(results);
        if (event.data.type === "availability-complete") { setAvailabilityLoading(false); setAvailabilityMessage(`Finished. ${results.filter((row) => row.available).length} creators are available.`); }
        else setAvailabilityMessage(`Checking ${event.data.checked} of ${event.data.total} creators… ${results.filter((row) => row.available).length} available so far.`);
      }
      if (event.data.type === "availability-error") { setAvailabilityLoading(false); setAvailabilityMessage(String(event.data.error || "Could not check availability.")); }
    }
    window.addEventListener("message", receiveAvailability);
    return () => window.removeEventListener("message", receiveAvailability);
  }, []);

  useEffect(() => {
    function receiveLeagueRankings(event: MessageEvent) {
      if (event.source !== window || event.data?.source !== "first-class-tikleap-extension") return;
      if (event.data.type === "league-rankings-row") {
        const league = String(event.data.league || "").toUpperCase();
        const rows = Array.isArray(event.data.rows) ? event.data.rows as LeagueRow[] : [];
        if (league && rows.length) setLeagueRankings((current) => ({ ...current, [league]: rows.sort((a, b) => b.diamonds - a.diamonds) }));
      }
      if (event.data.type === "league-rankings-complete") {
        setLeagueLoading(false);
        setLeagueMessage("All live leagues are ready. Availability checking is the next step and will only preview creators — it will not send invitations.");
      }
      if (event.data.type === "league-rankings-error") {
        setLeagueLoading(false);
        setLeagueMessage(String(event.data.error || "Could not read the live leagues."));
      }
    }
    window.addEventListener("message", receiveLeagueRankings);
    return () => window.removeEventListener("message", receiveLeagueRankings);
  }, []);

  useEffect(() => {
    fetch("/api/tikleap/uk-daily-rankings", { cache: "no-store" })
      .then((response) => response.json())
      .then((saved: { date?: string; usernames?: string[] }) => {
        if (!saved.date || !saved.usernames?.length) return;
        setCountries([{ code: "gb", label: "UK", usernames: saved.usernames, period: `Saved rankings · ${saved.date}`, sourceUrl: "https://www.tikleap.com/country/gb" }]);
        setSavedDate(saved.date);
      })
      .catch(() => {});
  }, []);

  const totalUsernames = useMemo(
    () => countries.reduce((total, country) => total + country.usernames.length, 0),
    [countries]
  );
  const liveCreatorCount = useMemo(() => Object.values(leagueRankings).flat().filter((row) => row.liveNow).length, [leagueRankings]);
  const downloadText = useMemo(() => allCountriesText(countries), [countries]);
  const sortedAvailabilityResults = useMemo(() => availabilityResults
    .filter((row) => !row.ignored)
    .sort((a, b) => b.diamonds - a.diamonds || a.username.localeCompare(b.username))
  , [availabilityResults]);
  const multiAccountRisk = (row: AvailabilityResult) => !row.available && /multi(?:ple)?[\s-]?account/i.test(row.reason);
  const filteredAvailabilityResults = useMemo(() => sortedAvailabilityResults.filter((row) => {
    if (availabilityFilter === "all") return row.available;
    if (availabilityFilter === "Regular" || availabilityFilter === "Premium") return row.available && row.invitationType === availabilityFilter;
    if (availabilityFilter === "multi-account-risk") return multiAccountRisk(row);
    return !row.available && !multiAccountRisk(row);
  }), [availabilityFilter, sortedAvailabilityResults]);
  const availabilityCopyText = useMemo(() => filteredAvailabilityResults.map((row) => {
    if (copyFormat === "username") return row.username;
    if (copyFormat === "username-diamonds") return `${row.username} | ${row.diamondText} diamonds`;
    if (copyFormat === "username-league") return `${row.username} | ${row.league}`;
    return `${row.username} | ${row.diamondText} diamonds | ${row.available ? `Available${row.invitationType ? ` — ${row.invitationType}` : ""}` : row.reason || "Ineligible"} | ${row.league}`;
  }).join("\n"), [copyFormat, filteredAvailabilityResults]);

  async function generateUsernames() {
    setLoading(true);
    setMessage("");
    setCountries([]);
    setCountryErrors([]);

    try {
      const res = await fetch(`/api/tikleap/uk-last-day-usernames?t=${Date.now()}`, { cache: "no-store" });
      const json = (await res.json()) as TikleapResponse;

      if (!res.ok) throw new Error(json.error || "Could not pull Tikleap usernames.");
      const nextCountries = json.countries || [];
      const nextErrors = json.errors || [];
      setCountries(nextCountries);
      setCountryErrors(nextErrors);
      setMessage(
        `Generated ${nextCountries.length} countries with ${nextCountries.reduce(
          (total, country) => total + country.usernames.length,
          0
        )} usernames${nextErrors.length ? `; ${nextErrors.length} country could not be pulled.` : "."}`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not pull Tikleap usernames.");
    } finally {
      setLoading(false);
    }
  }

  function pullViaChrome(saveAfterPull = false) {
    saveAfterChromePullRef.current = saveAfterPull;
    setLoading(true);
    setMessage(saveAfterPull ? "Re-pulling the UK rankings before updating the shared saved list..." : "Asking Chrome to read the public UK TickLeap rankings...");
    setCountries([]);
    setCountryErrors([]);
    window.postMessage({ source: "first-class-daily-rankings", type: "pull-uk-rankings" }, window.location.origin);
    window.setTimeout(() => {
      setLoading((isLoading) => {
        if (isLoading) { setMessage("Chrome did not respond. Make sure the First Class TickLeap helper is installed and Chrome is open."); saveAfterChromePullRef.current = false; }
        return false;
      });
    }, 15000);
  }

  function pullLiveLeagues() {
    if (!selectedLeagues.length) { setLeagueMessage("Choose at least one league first."); return; }
    setLeagueRankings({});
    setLeagueLoading(true);
    const countryLabel = rankingCountry === "au" ? "Australia" : "UK";
    setLeagueMessage(`Reading the top 99 creators from each ${countryLabel} live league in Chrome...`);
    window.postMessage({ source: "first-class-daily-rankings", type: "pull-uk-live-leagues", leagues: selectedLeagues, country: rankingCountry }, window.location.origin);
    window.setTimeout(() => {
      setLeagueLoading((isLoading) => {
        if (isLoading) setLeagueMessage("Chrome did not respond. Reload the First Class TickLeap Helper extension, then try again.");
        return false;
      });
    }, 120000);
  }

  function checkAvailability() {
    const allCreators = Object.entries(leagueRankings).flatMap(([league, rows]) => rows.map((row) => ({ ...row, league })));
    const creators = liveFilter === "live" ? allCreators.filter((creator) => creator.liveNow) : allCreators;
    if (!creators.length) { setAvailabilityMessage(liveFilter === "live" ? "No creators are marked Live Now in these leagues." : "Pull at least one league first."); return; }
    setAvailabilityResults([]);
    setAvailabilityLoading(true);
    setAvailabilityMessage(`Checking ${creators.length} ${liveFilter === "live" ? "live " : ""}creators in Backstage. No invitations will be sent.`);
    window.postMessage({ source: "first-class-daily-rankings", type: "check-backstage-availability", creators }, window.location.origin);
  }

  async function saveRankings(freshUsernames?: string[]) {
    const usernames = freshUsernames || countries[0]?.usernames || [];
    if (!usernames.length) return;
    const date = todayInLondon();
    setLoading(true);
    try {
      const response = await fetch("/api/tikleap/uk-daily-rankings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, usernames }) });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error || "Could not save the rankings.");
      setSavedDate(saved.date);
      setCountries([{ code: "gb", label: "UK", usernames: saved.usernames, period: `Saved rankings · ${saved.date}`, sourceUrl: "https://www.tikleap.com/country/gb" }]);
      setMessage(`${saved.usernames.length} UK rankings saved for everyone to view.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the rankings.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCountry(country: CountryUsernames) {
    await navigator.clipboard.writeText(countryText(country));
    setMessage(`Copied ${country.label} with ${country.usernames.length} usernames.`);
  }

  async function copyBackstageList(country: CountryUsernames, index: number, names: string[]) {
    await navigator.clipboard.writeText(names.join("\n"));
    setMessage(`Copied ${country.label} list ${index + 1} with ${names.length} usernames.`);
  }

  async function copyWhatsAppAvailabilityMessage() {
    if (!availabilityCopyText) return;
    await navigator.clipboard.writeText(availabilityCopyText);
    setAvailabilityMessage(`Copied ${filteredAvailabilityResults.length} creators in leaderboard order.`);
  }

  function downloadUsernames() {
    const blob = new Blob([downloadText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tikleap-yesterday-uk-daily-rankings.txt";
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Downloaded ${totalUsernames} UK usernames.`);
  }

  return (
    <DataAccessGuard>
      <main className="min-h-screen bg-[#070707] px-4 py-8 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex flex-wrap gap-3">
            <Link href="/" className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase hover:bg-white/10">
              Back Home
            </Link>
          </div>

          <section className="rounded-3xl border border-sky-300/25 bg-sky-300/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-200/70">Tikleap</p>
            <h1 className="mt-3 text-4xl font-black uppercase text-cyan-200 md:text-6xl">🔎 Creator Search</h1>
            <p className="mt-3 max-w-3xl text-white/60">
              Pull daily rankings or selected live leagues, then check creator availability in Backstage without sending invitations.
            </p>
          </section>

          <section className="mt-6 rounded-3xl border border-violet-300/25 bg-violet-300/10 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-200/70">{rankingCountry === "au" ? "AUSTRALIA" : "UK"} LIVE LEAGUES</p>
                <h2 className="mt-2 text-3xl font-black uppercase text-violet-100">League availability list</h2>
                <p className="mt-2 max-w-3xl text-sm text-white/60">Reads A1–A3, B1–B5, C1–C5 and D1–D5 in Chrome. Each league is kept separate and ordered by diamonds, ready for the Backstage availability preview.</p>
              </div>
              <button type="button" onClick={pullLiveLeagues} disabled={leagueLoading || TIKLEAP_EXTENSION_UNDER_REVIEW} className="rounded-xl bg-violet-300 px-5 py-4 text-sm font-black uppercase text-black hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-45">
                {leagueLoading ? "Reading selected leagues..." : "Pull selected leagues"}
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {([ ["gb", "UK"], ["au", "Australia"] ] as const).map(([code, label]) => <button key={code} type="button" onClick={() => setRankingCountry(code)} className={`rounded-lg px-4 py-2 text-xs font-black uppercase ${rankingCountry === code ? "bg-violet-300 text-black" : "border border-white/15 text-white/65 hover:bg-white/10"}`}>{label} rankings</button>)}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelectedLeagues(LIVE_LEAGUES)} className="rounded-lg border border-violet-200/30 px-3 py-2 text-xs font-black uppercase text-violet-100 hover:bg-violet-200/10">All A1–D5</button>
              <button type="button" onClick={() => setSelectedLeagues([])} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-black uppercase text-white/65 hover:bg-white/10">Clear</button>
              {LIVE_LEAGUES.map((league) => <button key={league} type="button" onClick={() => setSelectedLeagues((current) => current.includes(league) ? current.filter((value) => value !== league) : [...current, league])} className={`rounded-lg px-3 py-2 text-xs font-black ${selectedLeagues.includes(league) ? "bg-violet-300 text-black" : "border border-white/15 text-white/65 hover:bg-white/10"}`}>{league}</button>)}
            </div>
            {leagueMessage ? <p className="mt-4 rounded-xl border border-violet-200/20 bg-black/20 p-3 text-sm text-violet-100">{leagueMessage}</p> : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex overflow-hidden rounded-xl border border-white/15 text-xs font-black uppercase">
                <button type="button" onClick={() => setLiveFilter("all")} className={`px-4 py-3 ${liveFilter === "all" ? "bg-green-300 text-black" : "bg-black/30 text-white/65"}`}>All creators</button>
                <button type="button" onClick={() => setLiveFilter("live")} className={`px-4 py-3 ${liveFilter === "live" ? "bg-green-300 text-black" : "bg-black/30 text-white/65"}`}>Live only{Object.keys(leagueRankings).length ? ` (${liveCreatorCount})` : ""}</button>
              </div>
              <button type="button" onClick={checkAvailability} disabled={!Object.keys(leagueRankings).length || availabilityLoading} className="rounded-xl bg-green-400 px-5 py-4 text-sm font-black uppercase text-black hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-45">
                {availabilityLoading ? "Checking availability…" : "Check availability"}
              </button>
              <p className="text-xs font-bold uppercase text-white/50">Preview only — it never presses Invite.</p>
            </div>
            {availabilityMessage ? <p className="mt-3 rounded-xl border border-green-300/20 bg-green-400/10 p-3 text-sm text-green-100">{availabilityMessage}</p> : null}
            {availabilityResults.length ? <div className="mt-4 rounded-2xl border border-green-300/20 bg-black/30 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-green-200">Available: {sortedAvailabilityResults.filter((row) => row.available).length} · Regular: {sortedAvailabilityResults.filter((row) => row.available && row.invitationType === "Regular").length} · Premium: {sortedAvailabilityResults.filter((row) => row.available && row.invitationType === "Premium").length}</p><p className="mt-1 text-xs text-green-100/70">MAR: {sortedAvailabilityResults.filter(multiAccountRisk).length} · Ineligible — other reason: {sortedAvailabilityResults.filter((row) => !row.available && !multiAccountRisk(row)).length}</p></div><button type="button" onClick={copyWhatsAppAvailabilityMessage} disabled={!filteredAvailabilityResults.length} className="rounded-xl bg-green-300 px-4 py-3 text-xs font-black uppercase text-black hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-45">Copy selected format</button></div><div className="mt-3 flex flex-wrap gap-2">{([{ value: "all", label: "All available" }, { value: "Regular", label: "Regular" }, { value: "Premium", label: "Premium" }, { value: "multi-account-risk", label: "MAR" }, { value: "ineligible-other", label: "Ineligible — other" }] as Array<{ value: AvailabilityFilter; label: string }>).map(({ value, label }) => <button key={value} type="button" onClick={() => setAvailabilityFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-black uppercase ${availabilityFilter === value ? "bg-green-300 text-black" : "border border-white/15 text-white/65 hover:bg-white/10"}`}>{label}</button>)}</div><label className="mt-3 block text-xs font-black uppercase tracking-widest text-white/55">Copy format<select value={copyFormat} onChange={(event) => setCopyFormat(event.target.value as CopyFormat)} className="mt-2 block rounded-lg border border-white/15 bg-black px-3 py-2 text-sm font-normal normal-case text-white"><option value="details">All details (WhatsApp)</option><option value="username">Username only</option><option value="username-diamonds">Username + diamonds</option><option value="username-league">Username + league</option></select></label>{filteredAvailabilityResults.length ? <div className="mt-3 max-h-64 overflow-y-auto text-sm">{filteredAvailabilityResults.map((row) => <div key={row.username} className="grid grid-cols-[48px_1fr_auto_auto] gap-2 border-b border-white/5 py-2"><span>{row.league}</span><span className="font-bold">{row.username}</span><span>{row.diamondText}</span><span className={row.available ? "text-green-200" : "text-rose-200"}>{row.available ? `Available${row.invitationType ? ` · ${row.invitationType}` : ""}` : row.reason || "Ineligible"}</span></div>)}</div> : <p className="mt-3 text-sm text-white/55">No creators match this filter in the scan.</p>}</div> : null}
            {Object.keys(leagueRankings).length ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(leagueRankings).sort(([a], [b]) => a.localeCompare(b)).map(([league, rows]) => {
                  const visibleRows = liveFilter === "live" ? rows.filter((row) => row.liveNow) : rows;
                  return (
                  <section key={league} className="rounded-2xl border border-white/10 bg-black/35 p-4">
                    <div className="mb-3 flex items-center justify-between"><h3 className="text-xl font-black text-violet-100">{league}</h3><span className="text-xs font-bold uppercase text-white/45">{visibleRows.length} creator{visibleRows.length === 1 ? "" : "s"}</span></div>
                    <div className="max-h-80 overflow-y-auto rounded-xl border border-white/10">
                      {visibleRows.map((row) => <div key={row.username} className="grid grid-cols-[42px_1fr_auto] gap-2 border-b border-white/5 px-3 py-2 text-sm last:border-0"><span className="text-white/45">#{row.rank}</span><span className="truncate font-bold">{row.username}</span><span className="font-black text-violet-200">{row.diamondText}</span></div>)}
                      {!visibleRows.length ? <p className="px-3 py-4 text-sm text-white/45">No creators are currently Live Now in this league.</p> : null}
                    </div>
                  </section>
                  );
                })}
              </div>
            ) : null}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="space-y-4 rounded-3xl border border-sky-300/20 bg-black/50 p-5">
              <div>
                <p className="text-xs font-black uppercase text-white/45">Output</p>
                <p className="mt-2 text-lg font-black text-sky-200">{totalUsernames ? `${totalUsernames} usernames` : "Ready to pull"}</p>
                <p className="mt-1 text-xs font-bold uppercase text-white/45">United Kingdom only</p>
              </div>

              <button
                type="button"
                onClick={() => pullViaChrome()}
                disabled={loading || TIKLEAP_EXTENSION_UNDER_REVIEW}
                className="w-full rounded-xl bg-sky-300 px-5 py-4 text-sm font-black uppercase text-black hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {TIKLEAP_EXTENSION_UNDER_REVIEW ? "Chrome Extension Under Review" : loading ? "Pulling from Chrome..." : "Pull UK Rankings from Chrome"}
              </button>
              {TIKLEAP_EXTENSION_UNDER_REVIEW ? <p className="text-center text-xs font-bold uppercase tracking-wide text-sky-100/65">This button will unlock as soon as Chrome approves the extension.</p> : null}

              <button
                type="button"
                onClick={generateUsernames}
                disabled={loading}
                className="w-full rounded-xl border border-sky-300/35 bg-black/30 px-5 py-3 text-xs font-black uppercase text-sky-100 hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Server fallback
              </button>

              <button
                type="button"
                onClick={() => savedDate ? pullViaChrome(true) : void saveRankings()}
                disabled={loading || (savedDate ? TIKLEAP_EXTENSION_UNDER_REVIEW : !countries.length)}
                className="w-full rounded-xl bg-yellow-300 px-5 py-4 text-sm font-black uppercase text-black hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {savedDate ? TIKLEAP_EXTENSION_UNDER_REVIEW ? "Re-pull Available After Extension Approval" : "Re-pull & Update Saved Rankings" : "Save Today’s Rankings"}
              </button>

              <button
                type="button"
                onClick={downloadUsernames}
                disabled={!countries.length || loading}
                className="w-full rounded-xl bg-green-400 px-5 py-4 text-sm font-black uppercase text-black hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Download All TXT
              </button>

              {message ? <p className="rounded-xl border border-sky-300/20 bg-sky-300/10 p-3 text-sm text-sky-100">{message}</p> : null}
              {countryErrors?.length ? (
                <div className="space-y-2 rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">
                  {countryErrors.map((countryError) => (
                    <p key={countryError.code}>
                      <strong>{countryError.label}:</strong> {countryError.error}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-sky-300/20 bg-black/50 p-5">
              {countries.length || countryErrors?.length ? (
                <div className="grid gap-5">
                  {countries.map((country) => (
                    <section key={country.code} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-2xl font-black uppercase text-sky-200">{country.label}</h2>
                          <p className="text-xs font-bold uppercase text-white/45">
                            {country.usernames.length} usernames{country.period ? ` - ${country.period}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => copyCountry(country)}
                            disabled={!country.usernames.length || loading}
                            className="rounded-xl bg-yellow-300 px-4 py-3 text-xs font-black uppercase text-black hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Copy {country.label}
                          </button>
                          {country.sourceUrl ? (
                            <a href={country.sourceUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase text-sky-100 hover:bg-white/10">
                              Source
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        {splitForBackstage(country.usernames).map((names, index) => (
                          <section key={`${country.code}-${index}`} className="rounded-xl border border-white/10 bg-black/35 p-3">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <h3 className="text-sm font-black uppercase text-white">Backstage List {index + 1}</h3>
                                <p className="text-xs font-bold uppercase text-white/45">{names.length} usernames</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyBackstageList(country, index, names)}
                                disabled={!names.length || loading}
                                className="rounded-lg bg-yellow-300 px-3 py-2 text-xs font-black uppercase text-black hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                Copy
                              </button>
                            </div>
                            <textarea
                              readOnly
                              value={names.join("\n")}
                              className="h-52 w-full resize-none rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-sm leading-6 text-white outline-none"
                            />
                          </section>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[620px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/55">
                  Select Generate All Countries to pull the previous day Tikleap usernames.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </DataAccessGuard>
  );
}
