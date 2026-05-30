"use client";

import { useEffect, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const creatorNames = [
  "jdmpixxie",
  "emeliaclairexoxx",
  "paigeoliviaax1",
  "jaro_addict",
  "corie.watkins",
  "official.braay",
  "soph.x19x",
  "xleah.vk",
  "s.isbackbaby69",
  "skyekyleigh20",
  "goldengun_2",
  "joshstream_",
  "mrsmrsmcdermott1",
  "chakrawitch_jane",
  "ateamxo",
  "itsjazz69",
  "sh4yne17",
  "lewisjxrrad",
  "aron270724",
  "antsworld505",
  "kat_k180",
  "shadybaby_79",
  "momomeehan",
  "aaronsingssongs",
  "_iamr4f_",
  "livsm_888x",
  "justmacgaming",
  "demza2.0xx",
  "aidanjh.21",
  "mikemcgee1235",
  "michelle_sen_mom",
  "daveoakley900",
];

const rounds = [
  { id: 1, label: "1 June" },
  { id: 2, label: "3 June" },
  { id: 3, label: "8 June" },
  { id: 4, label: "10 June" },
  { id: 5, label: "15 June" },
  { id: 6, label: "17 June" },
  { id: 7, label: "22 June" },
  { id: 8, label: "24 June" },
];

type ScoreRow = {
  username: string;
  round_number: number;
  score: number;
};

export default function SunsetShowdownAdminPage() {
  const [roundNumber, setRoundNumber] = useState(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const selectedRound = rounds.find((round) => round.id === roundNumber);

  useEffect(() => {
    loadScores(roundNumber);
  }, [roundNumber]);

  async function loadScores(selectedRoundNumber: number) {
    setLoading(true);
    setMessage("");

    const { data, error } = await submissionsSupabase
      .from("sunset_showdown_scores")
      .select("username, round_number, score")
      .eq("round_number", selectedRoundNumber);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const nextScores: Record<string, number> = {};

    creatorNames.forEach((username) => {
      nextScores[username] = 0;
    });

    ((data || []) as ScoreRow[]).forEach((row) => {
      nextScores[row.username] = Number(row.score || 0);
    });

    setScores(nextScores);
    setSaved({});
    setLoading(false);
  }

  function updateScore(username: string, value: string) {
    const numberValue = Math.max(0, Number(value) || 0);

    setScores((current) => ({
      ...current,
      [username]: numberValue,
    }));

    setSaved((current) => ({
      ...current,
      [username]: false,
    }));
  }

  async function saveSingleScore(username: string) {
    setSaving((current) => ({ ...current, [username]: true }));
    setMessage("");

    const { error } = await submissionsSupabase
      .from("sunset_showdown_scores")
      .upsert(
        {
          username,
          round_number: roundNumber,
          score: scores[username] || 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "username,round_number" }
      );

    setSaving((current) => ({ ...current, [username]: false }));

    if (error) {
      setMessage(error.message);
      return;
    }

    setSaved((current) => ({
      ...current,
      [username]: true,
    }));
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-2xl border border-orange-500/50 bg-zinc-950 p-5 shadow-[0_0_24px_rgba(249,115,22,0.25)]">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
            Sunset Showdown
          </p>

          <h1 className="mt-2 text-4xl font-black italic text-white">
            Scores
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Select the date, enter each creator&apos;s score, then save that
            creator individually.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
              Date
            </label>

            <select
              value={roundNumber}
              onChange={(e) => setRoundNumber(Number(e.target.value))}
              className="rounded-xl border border-orange-500/60 bg-gradient-to-r from-orange-950 to-black px-5 py-3 text-sm font-black uppercase text-orange-100 shadow-[0_0_18px_rgba(249,115,22,0.25)] outline-none"
            >
              {rounds.map((round) => (
                <option
                  key={round.id}
                  value={round.id}
                  className="bg-zinc-950 text-orange-100"
                >
                  {round.label}
                </option>
              ))}
            </select>

            <a
              href="/events/sunset-showdown"
              className="rounded-xl border border-orange-400/40 bg-black/40 px-5 py-3 text-sm font-black uppercase text-orange-200"
            >
              View Leaderboard
            </a>
          </div>

          {message ? (
            <p className="mt-4 rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
              {message}
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-orange-500/35 bg-zinc-950/90 p-5 text-orange-100">
            Loading {selectedRound?.label || "date"} scores...
          </div>
        ) : (
          <div className="grid gap-3">
            {creatorNames.map((username, index) => (
              <div
                key={username}
                className="grid grid-cols-[52px_1fr_150px_130px] items-center gap-3 rounded-2xl border border-orange-500/35 bg-zinc-950/90 p-3 shadow-[0_0_14px_rgba(249,115,22,0.12)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-600 text-lg font-black italic text-white">
                  {index + 1}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-lg font-black uppercase italic">
                    {username}
                  </p>
                </div>

                <input
                  type="number"
                  min="0"
                  value={scores[username] ?? 0}
                  onChange={(e) => updateScore(username, e.target.value)}
                  className="w-full rounded-xl border border-orange-500/50 bg-black px-4 py-3 text-right text-lg font-black text-orange-400 outline-none focus:border-orange-300"
                />

                <button
                  onClick={() => saveSingleScore(username)}
                  disabled={saving[username]}
                  className={`rounded-xl px-4 py-3 text-sm font-black uppercase text-white shadow-[0_0_16px_rgba(249,115,22,0.25)] disabled:opacity-50 ${
                    saved[username]
                      ? "bg-emerald-600"
                      : "bg-orange-600 hover:bg-orange-500"
                  }`}
                >
                  {saving[username]
                    ? "Saving..."
                    : saved[username]
                    ? "Saved"
                    : "Save Score"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}