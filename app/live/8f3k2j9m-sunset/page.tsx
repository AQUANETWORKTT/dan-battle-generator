"use client";

import { useEffect, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

type CreatorRow = {
  id: number;
  username: string;
  active: boolean;
};

type ScoreRow = {
  username: string;
  round_number: number;
  score: number;
};

type RankedCreator = {
  rank: number;
  username: string;
  score: number;
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

export default function SunsetShowdownPage() {
  const [creators, setCreators] = useState<RankedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    setLoading(true);
    setMessage("");

    const { data: creatorData, error: creatorError } = await submissionsSupabase
      .from("sunset_showdown_creators")
      .select("id, username, active")
      .eq("active", true)
      .order("username", { ascending: true });

    if (creatorError) {
      console.error(creatorError.message);
      setMessage(creatorError.message);
      setLoading(false);
      return;
    }

    const activeCreators = (creatorData || []) as CreatorRow[];
    const activeUsernames = activeCreators.map((creator) => creator.username);

    if (activeUsernames.length === 0) {
      setCreators([]);
      setLoading(false);
      return;
    }

    const { data: scoreData, error: scoreError } = await submissionsSupabase
      .from("sunset_showdown_scores")
      .select("username, round_number, score")
      .in("username", activeUsernames);

    if (scoreError) {
      console.error(scoreError.message);
      setMessage(scoreError.message);
      setLoading(false);
      return;
    }

    const totals: Record<string, number> = {};

    activeUsernames.forEach((username) => {
      totals[username] = 0;
    });

    ((scoreData || []) as ScoreRow[]).forEach((row) => {
      totals[row.username] =
        (totals[row.username] || 0) + Number(row.score || 0);
    });

    const rankedCreators = activeUsernames
      .map((username) => ({
        username,
        score: totals[username] || 0,
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.username.localeCompare(b.username);
      })
      .map((creator, index) => ({
        ...creator,
        rank: index + 1,
      }));

    setCreators(rankedCreators);
    setLoading(false);
  }

  return (
    <main className="relative min-h-screen w-screen overflow-x-hidden bg-black">
      <img
        src="/sunset-showdown/background.jpg"
        alt=""
        className="fixed inset-0 h-screen w-screen scale-[1.03] object-cover blur-[1.5px]"
      />

      <div className="fixed inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/65" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_35%,transparent_0%,rgba(0,0,0,0.18)_55%,rgba(0,0,0,0.7)_100%)]" />

      <div className="relative z-10 min-h-screen w-full overflow-y-auto px-3 pb-10 pt-0 sm:px-4">
        <img
          src="/sunset-showdown/logo.png"
          alt="Sunset Showdown"
          className="mx-auto mb-0 w-[90vw] max-w-[880px] object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.85)]"
        />

        {message ? (
          <div className="mx-auto mb-4 max-w-[650px] rounded-xl border border-red-400/40 bg-red-950/70 px-4 py-3 text-sm font-bold text-red-100">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="mx-auto max-w-[650px] rounded-xl border border-orange-500/65 bg-black/58 px-4 py-4 text-center text-sm font-black uppercase tracking-[0.18em] text-orange-200">
            Loading leaderboard...
          </div>
        ) : creators.length === 0 ? (
          <div className="mx-auto max-w-[650px] rounded-xl border border-orange-500/65 bg-black/58 px-4 py-4 text-center text-sm font-black uppercase tracking-[0.18em] text-orange-200">
            No active creators found
          </div>
        ) : (
          <section className="mx-auto w-full max-w-[650px] space-y-2.5 sm:space-y-3">
            {creators.map((creator) => (
              <div
                key={creator.username}
                className="grid grid-cols-[45px_42px_minmax(0,1fr)] items-center gap-2 rounded-xl border border-orange-500/65 bg-black/58 px-2 py-2 shadow-[inset_0_0_16px_rgba(249,115,22,0.13),0_0_18px_rgba(0,0,0,0.5)] backdrop-blur-[2px] sm:grid-cols-[58px_52px_minmax(0,1fr)] sm:gap-3 sm:px-2.5"
              >
                <div className="flex h-10 items-center justify-center rounded-lg bg-orange-600 text-[24px] font-black italic text-white shadow-[0_0_16px_rgba(249,115,22,0.45)] sm:h-12 sm:text-[31px]">
                  {creator.rank}
                </div>

                <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-orange-500 bg-zinc-950 shadow-[0_0_12px_rgba(249,115,22,0.5)] sm:h-12 sm:w-12">
                  <CreatorAvatar username={creator.username} />
                </div>

                <div className="min-w-0">
                  <div className="break-all text-[13px] font-black uppercase italic leading-tight tracking-tight text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.85)] min-[390px]:text-[15px] sm:text-[21px]">
                    {creator.username}
                  </div>

                  <div className="mt-1 text-[23px] font-black italic leading-none tracking-tight text-orange-500 drop-shadow-[0_2px_0_rgba(0,0,0,0.95)] sm:text-[29px]">
                    {creator.score.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
