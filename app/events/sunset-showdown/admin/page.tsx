"use client";

import { useEffect, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

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

function cleanUsername(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
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

function AvatarPreview({
  username,
  avatarUrl,
  loading,
  label,
}: {
  username: string;
  avatarUrl: string;
  loading: boolean;
  label: string;
}) {
  if (!username && !avatarUrl && !loading) return null;

  return (
    <div className="mt-3 rounded-xl border border-orange-500/25 bg-black/50 p-3">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-orange-300">
        {label}
      </p>

      <div className="flex items-center gap-3">
        <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-orange-500 bg-zinc-950 shadow-[0_0_12px_rgba(249,115,22,0.45)]">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-black uppercase text-orange-300">
              Loading
            </div>
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username}
              className="h-full w-full object-cover"
            />
          ) : username ? (
            <CreatorAvatar username={username} />
          ) : (
            <img
              src="/creators/default.jpg"
              alt="Default"
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="min-w-0">
          <p className="break-all text-lg font-black uppercase italic text-white">
            {username || "No creator selected"}
          </p>

          <p className="mt-1 text-xs font-bold text-white/45">
            Check this is the right profile before pressing the button.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SunsetShowdownAdminPage() {
  const [roundNumber, setRoundNumber] = useState(1);
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [removeUsername, setRemoveUsername] = useState("");
  const [removeAvatarUrl, setRemoveAvatarUrl] = useState("");
  const [removePreviewLoading, setRemovePreviewLoading] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [newPreviewLoading, setNewPreviewLoading] = useState(false);

  const [submittingCreatorChange, setSubmittingCreatorChange] = useState(false);

  const selectedRound = rounds.find((round) => round.id === roundNumber);

  useEffect(() => {
    loadPage(roundNumber);
  }, [roundNumber]);

  useEffect(() => {
    const username = cleanUsername(newUsername);
    setNewAvatarUrl("");

    if (!username) return;

    const timeout = window.setTimeout(async () => {
      setNewPreviewLoading(true);
      const scrapedAvatar = await fetchTikTokAvatar(username);
      setNewAvatarUrl(scrapedAvatar);
      setNewPreviewLoading(false);
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [newUsername]);

  useEffect(() => {
    setRemoveAvatarUrl("");

    if (!removeUsername) return;

    let cancelled = false;

    async function loadRemovePreview() {
      setRemovePreviewLoading(true);
      const scrapedAvatar = await fetchTikTokAvatar(removeUsername);

      if (!cancelled) {
        setRemoveAvatarUrl(scrapedAvatar);
        setRemovePreviewLoading(false);
      }
    }

    loadRemovePreview();

    return () => {
      cancelled = true;
    };
  }, [removeUsername]);

  async function loadPage(selectedRoundNumber: number) {
    setLoading(true);
    setMessage("");

    const { data: creatorData, error: creatorError } = await submissionsSupabase
      .from("sunset_showdown_creators")
      .select("id, username, active")
      .eq("active", true)
      .order("username", { ascending: true });

    if (creatorError) {
      setMessage(creatorError.message);
      setLoading(false);
      return;
    }

    const activeCreators = (creatorData || []) as CreatorRow[];
    setCreators(activeCreators);

    const { data: scoreData, error: scoreError } = await submissionsSupabase
      .from("sunset_showdown_scores")
      .select("username, round_number, score")
      .eq("round_number", selectedRoundNumber);

    if (scoreError) {
      setMessage(scoreError.message);
      setLoading(false);
      return;
    }

    const nextScores: Record<string, string> = {};

    activeCreators.forEach((creator) => {
      nextScores[creator.username] = "";
    });

    ((scoreData || []) as ScoreRow[]).forEach((row) => {
      const score = Number(row.score || 0);
      nextScores[row.username] = score === 0 ? "" : String(score);
    });

    setScores(nextScores);
    setSaved({});
    setLoading(false);
  }

  function updateScore(username: string, value: string) {
    const cleanedValue = value.replace(/[^\d]/g, "");

    setScores((current) => ({
      ...current,
      [username]: cleanedValue,
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
          score: Number(scores[username] || 0),
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

  async function addCreator() {
    const username = cleanUsername(newUsername);

    if (!username) {
      setMessage("Enter a username first.");
      return;
    }

    const confirmed = window.confirm(`Add ${username} to Sunset Showdown?`);

    if (!confirmed) return;

    setSubmittingCreatorChange(true);
    setMessage("");

    const scrapedAvatar = await fetchTikTokAvatar(username);
    setNewAvatarUrl(scrapedAvatar);

    const { error } = await submissionsSupabase
      .from("sunset_showdown_creators")
      .upsert(
        {
          username,
          active: true,
        },
        { onConflict: "username" }
      );

    setSubmittingCreatorChange(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setNewUsername("");
    setNewAvatarUrl("");
    await loadPage(roundNumber);
    setMessage(`${username} has been added.`);
  }

  async function removeCreator() {
    if (!removeUsername) {
      setMessage("Select a creator to remove.");
      return;
    }

    const confirmed = window.confirm(
      `Remove ${removeUsername} from Sunset Showdown?`
    );

    if (!confirmed) return;

    setSubmittingCreatorChange(true);
    setMessage("");

    const { error } = await submissionsSupabase
      .from("sunset_showdown_creators")
      .update({ active: false })
      .eq("username", removeUsername);

    setSubmittingCreatorChange(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const removedName = removeUsername;
    setRemoveUsername("");
    setRemoveAvatarUrl("");
    await loadPage(roundNumber);
    setMessage(`${removedName} has been removed.`);
  }

  return (
    <main className="min-h-screen bg-black px-3 py-5 text-white sm:px-4 sm:py-6">
      <section className="mx-auto max-w-4xl">
        <div className="mb-5 rounded-2xl border border-orange-500/50 bg-zinc-950 p-4 shadow-[0_0_24px_rgba(249,115,22,0.25)] sm:mb-6 sm:p-5">
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
            <p className="mt-4 rounded-xl border border-orange-400/30 bg-orange-950/40 px-4 py-3 text-sm text-orange-100">
              {message}
            </p>
          ) : null}
        </div>

        <div className="mb-5 rounded-2xl border border-orange-500/40 bg-zinc-950 p-4 shadow-[0_0_20px_rgba(249,115,22,0.18)] sm:mb-6 sm:p-5">
          <h2 className="text-2xl font-black italic text-white">
            Manage Creators
          </h2>

          <p className="mt-2 text-sm text-white/50">
            Add a new creator or remove an existing one. The avatar preview lets
            you check the profile before confirming.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-orange-500/25 bg-black/40 p-4">
              <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-orange-300">
                Add Creator
              </p>

              <div className="grid gap-3">
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Type username"
                  className="h-12 rounded-xl border border-orange-500/50 bg-black px-4 text-sm font-bold text-orange-100 outline-none placeholder:text-orange-400/40"
                />

                <AvatarPreview
                  username={cleanUsername(newUsername)}
                  avatarUrl={newAvatarUrl}
                  loading={newPreviewLoading}
                  label="New Creator Preview"
                />

                <button
                  onClick={addCreator}
                  disabled={submittingCreatorChange}
                  className="h-12 rounded-xl bg-orange-600 px-5 text-sm font-black uppercase text-white disabled:opacity-50"
                >
                  {submittingCreatorChange ? "Saving..." : "Add Creator"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-orange-500/25 bg-black/40 p-4">
              <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-orange-300">
                Remove Creator
              </p>

              <div className="grid gap-3">
                <select
                  value={removeUsername}
                  onChange={(e) => setRemoveUsername(e.target.value)}
                  className="h-12 rounded-xl border border-orange-500/50 bg-black px-4 text-sm font-bold text-orange-100 outline-none"
                >
                  <option value="">Select creator</option>
                  {creators.map((creator) => (
                    <option key={creator.username} value={creator.username}>
                      {creator.username}
                    </option>
                  ))}
                </select>

                <AvatarPreview
                  username={removeUsername}
                  avatarUrl={removeAvatarUrl}
                  loading={removePreviewLoading}
                  label="Creator To Remove Preview"
                />

                <button
                  onClick={removeCreator}
                  disabled={submittingCreatorChange}
                  className="h-12 rounded-xl bg-red-700 px-5 text-sm font-black uppercase text-white disabled:opacity-50"
                >
                  {submittingCreatorChange ? "Saving..." : "Remove Creator"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-orange-500/35 bg-zinc-950/90 p-5 text-orange-100">
            Loading {selectedRound?.label || "date"} scores...
          </div>
        ) : (
          <div className="grid gap-3">
            {creators.map((creator, index) => {
              const username = creator.username;

              return (
                <div
                  key={username}
                  className="rounded-2xl border border-orange-500/35 bg-zinc-950/90 p-3 shadow-[0_0_14px_rgba(249,115,22,0.12)]"
                >
                  <div className="grid grid-cols-[44px_44px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[52px_52px_1fr_170px_150px]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-600 text-lg font-black italic text-white">
                      {index + 1}
                    </div>

                    <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-orange-500 bg-zinc-950 shadow-[0_0_12px_rgba(249,115,22,0.5)] sm:h-12 sm:w-12">
                      <CreatorAvatar username={username} />
                    </div>

                    <div className="min-w-0">
                      <p className="break-all text-sm font-black uppercase italic leading-tight text-white sm:truncate sm:text-lg">
                        {username}
                      </p>
                    </div>

                    <div className="col-span-3 mt-3 grid grid-cols-1 gap-3 sm:col-span-1 sm:mt-0">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter score"
                        value={scores[username] ?? ""}
                        onChange={(e) => updateScore(username, e.target.value)}
                        className="h-14 w-full rounded-xl border border-orange-500/50 bg-black px-4 text-right text-xl font-black text-orange-400 outline-none placeholder:text-orange-400/35 focus:border-orange-300"
                      />
                    </div>

                    <div className="col-span-3 grid grid-cols-1 sm:col-span-1">
                      <button
                        onClick={() => saveSingleScore(username)}
                        disabled={saving[username]}
                        className={`h-14 w-full whitespace-nowrap rounded-xl px-4 text-sm font-black uppercase text-white shadow-[0_0_16px_rgba(249,115,22,0.25)] disabled:opacity-50 ${
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
