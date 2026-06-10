"use client";

import { useEffect, useMemo, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "World Cup 2026",
  description: "World Cup 2026 live leaderboard",
  openGraph: {
    title: "World Cup 2026",
    description: "View the live World Cup 2026 rankings.",
    images: ["/world-cup/logo.png"],
  },
};

type Agency = "Honeybloom" | "Aqua" | "First Class" | "Paradise" | "Atlas";

type Creator = {
  username: string;
  displayName: string;
  agency: Agency;
  country: string;
  fifaFever: number;
  finalWhistle: number;
  penaltyShootout: number;
  bonusMatchWin: number;
};

type ScoreRow = {
  username: string;
  fifa_fever: number | null;
  final_whistle: number | null;
  penalty_shootout: number | null;
  bonus_match_win: number | null;
};

const creators: Creator[] = [
  { username: "lucylou449", displayName: "lucylou449", agency: "Aqua", country: "Mexico", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "xomarky", displayName: "xomarky", agency: "Aqua", country: "Croatia", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "dylanjinks", displayName: "dylanjinks", agency: "Aqua", country: "Curaçao", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },

  { username: "_stannett", displayName: "_stannett", agency: "Honeybloom", country: "Canada", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "sammybaby42", displayName: "sammybaby42", agency: "Honeybloom", country: "Panama", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "michelle_sen_mom", displayName: "michelle_sen_mom", agency: "Honeybloom", country: "Saudi Arabia", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "aidanjh.21", displayName: "aidanjh.21", agency: "Honeybloom", country: "Portugal", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "gethinmayers", displayName: "gethinmayers", agency: "Honeybloom", country: "South Korea", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "emilyselflove", displayName: "emilyselflove", agency: "Honeybloom", country: "Norway", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "c0urtnzy", displayName: "c0urtnzy", agency: "Honeybloom", country: "Netherlands", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "jasonroberts958", displayName: "jasonroberts958", agency: "Honeybloom", country: "Ivory Coast", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "itsmrgrrrrr", displayName: "itsmrgrrrrr", agency: "Honeybloom", country: "United States", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "michaelajadexxo", displayName: "michaelajadexxo", agency: "Honeybloom", country: "Morocco", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "joesmokewood98", displayName: "joesmokewood98", agency: "Honeybloom", country: "Jordan", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "your.fave.purple.hairedx", displayName: "your.fave.purple.hairedx", agency: "Honeybloom", country: "Egypt", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },

  { username: "grantsmithgks", displayName: "grantsmithgks", agency: "First Class", country: "Switzerland", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "coran.purser", displayName: "coran.purser", agency: "First Class", country: "New Zealand", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "stephen14444", displayName: "stephen14444", agency: "First Class", country: "Brazil", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "dam_it_chan", displayName: "dam_it_chan", agency: "First Class", country: "Uzbekistan", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "cieran01", displayName: "cieran01", agency: "First Class", country: "France", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "robscottw", displayName: "robscottw", agency: "First Class", country: "Japan", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "freddie.toll1", displayName: "freddie.toll1", agency: "First Class", country: "Austria", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "meganstone71", displayName: "meganstone71", agency: "First Class", country: "Türkiye", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "lily.wills25", displayName: "lily.wills25", agency: "First Class", country: "Uruguay", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },

  { username: "failuretothrive2008", displayName: "failuretothrive2008", agency: "Paradise", country: "Scotland", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "charlotte_mcainey_12", displayName: "charlotte_mcainey_12", agency: "Paradise", country: "Tunisia", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "mrssparky0", displayName: "mrssparky0", agency: "Paradise", country: "Paraguay", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "dens2511", displayName: "dens2511", agency: "Paradise", country: "Bosnia & Herzegovina", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "hannakingwoodward", displayName: "hannakingwoodward", agency: "Paradise", country: "Algeria", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "white.trxsh101", displayName: "white.trxsh101", agency: "Paradise", country: "Colombia", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "dobbie.9718", displayName: "dobbie.9718", agency: "Paradise", country: "Iraq", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "privv.amanda123", displayName: "privv.amanda123", agency: "Paradise", country: "Czech Republic", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "jay.webbxx", displayName: "jay.webbxx", agency: "Paradise", country: "Ecuador", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "louuuuu97", displayName: "louuuuu97", agency: "Paradise", country: "Belgium", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "nalathehuntress", displayName: "nalathehuntress", agency: "Paradise", country: "Spain", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "suey9219", displayName: "suey9219", agency: "Paradise", country: "England", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },

  { username: "chakrawitch_jane", displayName: "chakrawitch_jane", agency: "Atlas", country: "Sweden", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "emeliaclairexoxx", displayName: "emeliaclairexoxx", agency: "Atlas", country: "Iran", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "xdylnnx", displayName: "xdylnnx", agency: "Atlas", country: "Haiti", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "realtalkrob_rtr", displayName: "realtalkrob_rtr", agency: "Atlas", country: "Ghana", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "jaro_addict", displayName: "jaro_addict", agency: "Atlas", country: "Australia", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "chelsea9567", displayName: "chelsea9567", agency: "Atlas", country: "Argentina", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "official.braay", displayName: "official.braay", agency: "Atlas", country: "Qatar", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "queenofthunder94", displayName: "queenofthunder94", agency: "Atlas", country: "Cape Verde", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "xleah.vk", displayName: "xleah.vk", agency: "Atlas", country: "Germany", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "marc.ellis123", displayName: "marc.ellis123", agency: "Atlas", country: "Senegal", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "deescalate_dissociate", displayName: "deescalate_dissociate", agency: "Atlas", country: "DR Congo", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
  { username: "itsjazz69", displayName: "itsjazz69", agency: "Atlas", country: "South Africa", fifaFever: 0, finalWhistle: 0, penaltyShootout: 0, bonusMatchWin: 0 },
];

const agencyStyles: Record<
  Agency,
  {
    card: string;
    badge: string;
    border: string;
    glow: string;
    accent: string;
    bar: string;
  }
> = {
  Honeybloom: {
    card: "from-black/50 via-black/50 to-black/50",
    badge: "bg-yellow-300 text-yellow-950",
    border: "border-yellow-300/50",
    glow: "shadow-yellow-300/20",
    accent: "text-yellow-300",
    bar: "bg-yellow-300",
  },
  Aqua: {
    card: "from-black/50 via-black/50 to-black/50",
    badge: "bg-cyan-300 text-cyan-950",
    border: "border-cyan-300/50",
    glow: "shadow-cyan-300/20",
    accent: "text-cyan-300",
    bar: "bg-cyan-300",
  },
  "First Class": {
    card: "from-black/50 via-black/50 to-black/50",
    badge: "bg-red-400 text-red-950",
    border: "border-red-400/50",
    glow: "shadow-red-400/20",
    accent: "text-red-300",
    bar: "bg-red-400",
  },
  Paradise: {
    card: "from-black/50 via-black/50 to-black/50",
    badge: "bg-amber-300 text-amber-950",
    border: "border-amber-300/50",
    glow: "shadow-amber-300/20",
    accent: "text-amber-300",
    bar: "bg-amber-300",
  },
  Atlas: {
    card: "from-black/50 via-black/50 to-black/50",
    badge: "bg-green-400 text-green-950",
    border: "border-green-400/50",
    glow: "shadow-green-400/20",
    accent: "text-green-300",
    bar: "bg-green-400",
  },
};

async function fetchTikTokAvatar(username: string) {
  if (!username) return "";

  try {
    const res = await fetch("/api/tiktok-avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const json = await res.json();
    return json.avatar || "";
  } catch {
    return "";
  }
}

function CreatorAvatar({ username }: { username: string }) {
  const fallbackSrc = "/creators/default.jpg";
  const localSrc = `/creators/${encodeURIComponent(username)}.jpg`;
  const [src, setSrc] = useState(fallbackSrc);

  useEffect(() => {
    let cancelled = false;

    async function loadAvatar() {
      const localImg = new window.Image();
      localImg.src = localSrc;

      localImg.onload = () => {
        if (!cancelled) setSrc(localSrc);
      };

      localImg.onerror = async () => {
        const scrapedAvatar = await fetchTikTokAvatar(username);

        if (!cancelled) {
          setSrc(scrapedAvatar || fallbackSrc);
        }
      };
    }

    loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [username, localSrc]);

  return <img src={src} alt={username} className="h-full w-full object-cover" />;
}

export default function WorldCupLeaderboardPage() {
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [leaderboardCreators, setLeaderboardCreators] =
    useState<Creator[]>(creators);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadLeaderboardScores();
  }, []);

  async function loadLeaderboardScores() {
    setLoading(true);
    setMessage("");

    const usernames = creators.map((creator) => creator.username);

    const { data, error } = await submissionsSupabase
      .from("world_cup_2026_scores")
      .select(
        "username, fifa_fever, final_whistle, penalty_shootout, bonus_match_win"
      )
      .in("username", usernames);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const scoreMap = new Map<string, ScoreRow>();

    ((data || []) as ScoreRow[]).forEach((row) => {
      scoreMap.set(row.username, row);
    });

    const mergedCreators = creators.map((creator) => {
      const score = scoreMap.get(creator.username);

      return {
        ...creator,
        fifaFever: Number(score?.fifa_fever || 0),
        finalWhistle: Number(score?.final_whistle || 0),
        penaltyShootout: Number(score?.penalty_shootout || 0),
        bonusMatchWin: Number(score?.bonus_match_win || 0),
      };
    });

    setLeaderboardCreators(mergedCreators);
    setLoading(false);
  }

  const sortedCreators = useMemo(() => {
    return [...leaderboardCreators].sort((a, b) => {
      const totalDifference = getTotal(b) - getTotal(a);
      if (totalDifference !== 0) return totalDifference;
      return a.username.localeCompare(b.username);
    });
  }, [leaderboardCreators]);

  return (
    <main className="relative min-h-screen w-screen overflow-x-hidden bg-black">
      <img
        src="/world-cup-2026/background.jpg"
        alt=""
        className="fixed inset-0 h-screen w-screen scale-[1.03] object-cover blur-[1.5px]"
      />

      <div className="fixed inset-0 bg-gradient-to-b from-black/10 via-emerald-950/30 to-black/80" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_30%,transparent_0%,rgba(0,0,0,0.2)_52%,rgba(0,0,0,0.78)_100%)]" />

      <div className="relative z-10 min-h-screen w-full overflow-y-auto px-3 pb-10 pt-5 sm:px-4">
        <section className="relative mx-auto mb-6 flex min-h-[170px] max-w-[900px] items-center justify-center overflow-hidden rounded-[34px] border border-white/15 bg-black/45 px-5 py-8 text-center shadow-2xl backdrop-blur-[2px]">
          <img
            src="/world-cup-2026/title-card.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-black/80" />

          <div className="relative z-10">
            <h1 className="text-4xl font-black uppercase italic tracking-tight text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.9)] sm:text-6xl">
              World Cup 2026
            </h1>

            <p className="mt-3 text-sm font-black uppercase tracking-[0.28em] text-green-300 sm:text-base">
              Creator Leaderboard
            </p>
          </div>
        </section>

        {message ? (
          <div className="mx-auto mb-4 max-w-[900px] rounded-xl border border-red-400/40 bg-red-950/70 px-4 py-3 text-sm font-bold text-red-100">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="mx-auto max-w-[900px] rounded-xl border border-green-400/40 bg-black/60 px-4 py-4 text-center text-sm font-black uppercase tracking-[0.18em] text-green-200">
            Loading leaderboard...
          </div>
        ) : (
          <section className="mx-auto w-full max-w-[900px] space-y-3">
            {sortedCreators.map((creator, index) => {
              const total = getTotal(creator);
              const isOpen = openCard === creator.username;
              const style = agencyStyles[creator.agency];

              return (
                <article
                  key={creator.username}
                  className={`relative overflow-hidden rounded-[26px] border ${style.border} bg-gradient-to-br ${style.card} shadow-2xl ${style.glow} backdrop-blur-[2px]`}
                >
                  <button
                    onClick={() =>
                      setOpenCard(isOpen ? null : creator.username)
                    }
                    className="relative z-10 grid w-full grid-cols-[34px_58px_minmax(0,1fr)_105px] items-center gap-2 p-3 text-left sm:grid-cols-[44px_72px_minmax(0,1fr)_150px] sm:gap-4 sm:p-4"
                  >
                    <div className="flex items-center justify-center text-[30px] sm:text-[40px]">
                      {index === 0 ? (
                        "🥇"
                      ) : index === 1 ? (
                        "🥈"
                      ) : index === 2 ? (
                        "🥉"
                      ) : (
                        <span className="font-black italic leading-none text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.95)]">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-white bg-zinc-950 shadow-[0_0_14px_rgba(255,255,255,0.35)] sm:h-[70px] sm:w-[70px]">
                      <CreatorAvatar username={creator.username} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-all text-[15px] font-black uppercase italic leading-tight text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.85)] sm:text-[23px]">
                          {creator.displayName}
                        </h2>

                        <span
                          className={`hidden rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] sm:inline-flex ${style.badge}`}
                        >
                          {creator.agency}
                        </span>

                        <span
                          className={`fi fi-${getFlagCode(
                            creator.country
                          )} hidden rounded-[9px] text-[28px] shadow-[0_0_8px_rgba(0,0,0,0.5)] sm:inline-block`}
                        />
                      </div>

                      <p
                        className={`mt-1 text-[11px] font-black uppercase tracking-[0.18em] ${style.accent}`}
                      >
                        {creator.country}
                      </p>
                    </div>

                    <div className="min-w-0 overflow-hidden text-right">
 			 <p className="truncate text-[22px] font-black italic leading-none text-white drop-shadow-[0_3px_0					_rgba(0,0,0,0.95)] sm:text-[34px]">
    				{total.toLocaleString()}
 			 </p>
 			 <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/60">
    			   Points
 	 		 </p>
			</div>
                  </button>

                  <div className="hidden grid-cols-4 gap-2 border-t border-white/10 bg-black/25 p-3 sm:grid">
                    <ScoreBar title="Fifa Fever" score={creator.fifaFever} max={getMaxScore(sortedCreators, "fifaFever")} style={style} />
                    <ScoreBar title="Final Whistle" score={creator.finalWhistle} max={getMaxScore(sortedCreators, "finalWhistle")} style={style} />
                    <ScoreBar title="Penalty Shootout" score={creator.penaltyShootout} max={getMaxScore(sortedCreators, "penaltyShootout")} style={style} />
                    <ScoreBar title="Bonus Match Win" score={creator.bonusMatchWin} max={getMaxScore(sortedCreators, "bonusMatchWin")} style={style} />
                  </div>

                  {isOpen && (
                    <div className="grid gap-2 border-t border-white/10 bg-black/25 p-3 sm:hidden">
                      <ScoreBar title="Fifa Fever" score={creator.fifaFever} max={getMaxScore(sortedCreators, "fifaFever")} style={style} />
                      <ScoreBar title="Final Whistle" score={creator.finalWhistle} max={getMaxScore(sortedCreators, "finalWhistle")} style={style} />
                      <ScoreBar title="Penalty Shootout" score={creator.penaltyShootout} max={getMaxScore(sortedCreators, "penaltyShootout")} style={style} />
                      <ScoreBar title="Bonus Match Win" score={creator.bonusMatchWin} max={getMaxScore(sortedCreators, "bonusMatchWin")} style={style} />
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function getTotal(creator: Creator) {
  return (
    creator.fifaFever +
    creator.finalWhistle +
    creator.penaltyShootout +
    creator.bonusMatchWin
  );
}

function getMaxScore(
  creators: Creator[],
  key: keyof Pick<
    Creator,
    "fifaFever" | "finalWhistle" | "penaltyShootout" | "bonusMatchWin"
  >
) {
  const max = Math.max(...creators.map((creator) => Number(creator[key] || 0)));
  return max > 0 ? max : 1;
}

function ScoreBar({
  title,
  score,
  max,
  style,
}: {
  title: string;
  score: number;
  max: number;
  style: {
    accent: string;
    bar: string;
  };
}) {
  const width = Math.max(0, Math.min(100, (score / max) * 100));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p
          className={`text-[13px] font-black uppercase leading-tight tracking-[0.08em] ${style.accent}`}
        >
          {title}
        </p>

        <p className="text-lg font-black italic text-white">
          {score.toLocaleString()}
        </p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-black/40">
        <div
          className={`h-full rounded-full ${style.bar} transition-all duration-700 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function getFlagCode(country: string) {
  const flags: Record<string, string> = {
    Mexico: "mx",
    Croatia: "hr",
    "Curaçao": "cw",

    Canada: "ca",
    Panama: "pa",
    "Saudi Arabia": "sa",
    Portugal: "pt",
    "South Korea": "kr",
    Norway: "no",
    Netherlands: "nl",
    "Ivory Coast": "ci",
    "United States": "us",
    Morocco: "ma",
    Jordan: "jo",
    Egypt: "eg",

    Switzerland: "ch",
    "New Zealand": "nz",
    Brazil: "br",
    Uzbekistan: "uz",
    France: "fr",
    Japan: "jp",
    Austria: "at",
    Türkiye: "tr",
    Uruguay: "uy",

    Scotland: "gb-sct",
    Tunisia: "tn",
    Paraguay: "py",
    "Bosnia & Herzegovina": "ba",
    Algeria: "dz",
    Colombia: "co",
    Iraq: "iq",
    "Czech Republic": "cz",
    Ecuador: "ec",
    Belgium: "be",
    Spain: "es",
    England: "gb-eng",

    Sweden: "se",
    Iran: "ir",
    Haiti: "ht",
    Ghana: "gh",
    Australia: "au",
    Argentina: "ar",
    Qatar: "qa",
    "Cape Verde": "cv",
    Germany: "de",
    Senegal: "sn",
    "DR Congo": "cd",
    "South Africa": "za",
  };

  return flags[country] || "un";
}