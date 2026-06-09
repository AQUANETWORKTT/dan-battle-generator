"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

type Agency = "Honeybloom" | "Aqua" | "First Class" | "Paradise" | "Atlas";

type Creator = {
  username: string;
  agency: Agency;
  country: string;
};

type ScoreData = {
  fifaFever: string;
  finalWhistle: string;
  penaltyCurrent: string;
  penaltyAdd: string;
  bonusMatchWin: string;
};

const agencies: { name: Agency; logo: string; colour: string }[] = [
  { name: "Aqua", logo: "/world-cup-2026/agencies/aqua.png", colour: "cyan" },
  { name: "Atlas", logo: "/world-cup-2026/agencies/atlas.png", colour: "green" },
  {
    name: "First Class",
    logo: "/world-cup-2026/agencies/first-class.png",
    colour: "red",
  },
  {
    name: "Paradise",
    logo: "/world-cup-2026/agencies/paradise.png",
    colour: "amber",
  },
  {
    name: "Honeybloom",
    logo: "/world-cup-2026/agencies/honeybloom.png",
    colour: "yellow",
  },
];

const creators: Creator[] = [
  { username: "lucylou449", agency: "Aqua", country: "Mexico" },
  { username: "xomarky", agency: "Aqua", country: "Croatia" },
  { username: "dylanjinks", agency: "Aqua", country: "Curaçao" },

  { username: "_stannett", agency: "Honeybloom", country: "Canada" },
  { username: "sammybaby42", agency: "Honeybloom", country: "Panama" },
  { username: "michelle_sen_mom", agency: "Honeybloom", country: "Saudi Arabia" },
  { username: "aidanjh.21", agency: "Honeybloom", country: "Portugal" },
  { username: "gethinmayers", agency: "Honeybloom", country: "South Korea" },
  { username: "emilyselflove", agency: "Honeybloom", country: "Norway" },
  { username: "c0urtnzy", agency: "Honeybloom", country: "Netherlands" },
  { username: "jasonroberts958", agency: "Honeybloom", country: "Ivory Coast" },
  { username: "itsmrgrrrrr", agency: "Honeybloom", country: "United States" },
  { username: "michaelajadexxo", agency: "Honeybloom", country: "Morocco" },
  { username: "joesmokewood98", agency: "Honeybloom", country: "Jordan" },
  { username: "your.fave.purple.hairedx", agency: "Honeybloom", country: "Egypt" },

  { username: "grantsmithgks", agency: "First Class", country: "Switzerland" },
  { username: "coran.purser", agency: "First Class", country: "New Zealand" },
  { username: "stephen14444", agency: "First Class", country: "Brazil" },
  { username: "dam_it_chan", agency: "First Class", country: "Uzbekistan" },
  { username: "cieran01", agency: "First Class", country: "France" },
  { username: "robscottw", agency: "First Class", country: "Japan" },
  { username: "freddie.toll1", agency: "First Class", country: "Austria" },
  { username: "meganstone71", agency: "First Class", country: "Türkiye" },
  { username: "lily.wills25", agency: "First Class", country: "Uruguay" },

  { username: "failuretothrive2008", agency: "Paradise", country: "Scotland" },
  { username: "charlotte_mcainey_12", agency: "Paradise", country: "Tunisia" },
  { username: "mrssparky0", agency: "Paradise", country: "Paraguay" },
  { username: "dens2511", agency: "Paradise", country: "Bosnia & Herzegovina" },
  { username: "hannakingwoodward", agency: "Paradise", country: "Algeria" },
  { username: "white.trxsh101", agency: "Paradise", country: "Colombia" },
  { username: "dobbie.9718", agency: "Paradise", country: "Iraq" },
  { username: "privv.amanda123", agency: "Paradise", country: "Czech Republic" },
  { username: "jay.webbxx", agency: "Paradise", country: "Ecuador" },
  { username: "louuuuu97", agency: "Paradise", country: "Belgium" },
  { username: "nalathehuntress", agency: "Paradise", country: "Spain" },
  { username: "suey9219", agency: "Paradise", country: "England" },

  { username: "chakrawitch_jane", agency: "Atlas", country: "Sweden" },
  { username: "emeliaclairexoxx", agency: "Atlas", country: "Iran" },
  { username: "xdylnnx", agency: "Atlas", country: "Haiti" },
  { username: "realtalkrob_rtr", agency: "Atlas", country: "Ghana" },
  { username: "jaro_addict", agency: "Atlas", country: "Australia" },
  { username: "chelsea9567", agency: "Atlas", country: "Argentina" },
  { username: "official.braay", agency: "Atlas", country: "Qatar" },
  { username: "queenofthunder94", agency: "Atlas", country: "Cape Verde" },
  { username: "xleah.vk", agency: "Atlas", country: "Germany" },
  { username: "marc.ellis123", agency: "Atlas", country: "Senegal" },
  { username: "deescalate_dissociate", agency: "Atlas", country: "DR Congo" },
  { username: "itsjazz69", agency: "Atlas", country: "South Africa" },
];

export default function WorldCupAdminPage() {
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [scores, setScores] = useState<Record<string, ScoreData>>({});
  const [loading, setLoading] = useState(false);
  const [savingUsername, setSavingUsername] = useState("");
  const [message, setMessage] = useState("");

  const selectedCreators = useMemo(() => {
    if (!selectedAgency) return [];

    return creators
      .filter((creator) => creator.agency === selectedAgency)
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [selectedAgency]);

  useEffect(() => {
    loadScores();
  }, []);

  async function loadScores() {
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

    const nextScores: Record<string, ScoreData> = {};

    creators.forEach((creator) => {
      const row = data?.find((item) => item.username === creator.username);

      nextScores[creator.username] = {
        fifaFever: row?.fifa_fever ? String(row.fifa_fever) : "",
        finalWhistle: row?.final_whistle ? String(row.final_whistle) : "",
        penaltyCurrent: row?.penalty_shootout ? String(row.penalty_shootout) : "",
        penaltyAdd: "",
        bonusMatchWin: row?.bonus_match_win ? String(row.bonus_match_win) : "",
      };
    });

    setScores(nextScores);
    setLoading(false);
  }

  function updateScore(username: string, key: keyof ScoreData, value: string) {
    const cleanValue = value.replace(/[^\d]/g, "");

    setScores((current) => ({
      ...current,
      [username]: {
        ...current[username],
        [key]: cleanValue,
      },
    }));
  }

  function setBonus(username: string, amount: number) {
    setScores((current) => ({
      ...current,
      [username]: {
        ...current[username],
        bonusMatchWin: String(amount),
      },
    }));
  }

  async function saveCreator(creator: Creator) {
    setSavingUsername(creator.username);
    setMessage("");

    const current = scores[creator.username];

    const fifaFever = toNumber(current?.fifaFever);
    const finalWhistle = toNumber(current?.finalWhistle);
    const penaltyCurrent = toNumber(current?.penaltyCurrent);
    const penaltyAdd = toNumber(current?.penaltyAdd);
    const penaltyShootout = penaltyCurrent + penaltyAdd;
    const bonusMatchWin = toNumber(current?.bonusMatchWin);

    const { error } = await submissionsSupabase
      .from("world_cup_2026_scores")
      .upsert(
        {
          username: creator.username,
          agency: creator.agency,
          country: creator.country,
          fifa_fever: fifaFever,
          final_whistle: finalWhistle,
          penalty_shootout: penaltyShootout,
          bonus_match_win: bonusMatchWin,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "username" }
      );

    if (error) {
      setMessage(error.message);
      setSavingUsername("");
      return;
    }

    setScores((currentScores) => ({
      ...currentScores,
      [creator.username]: {
        ...currentScores[creator.username],
        penaltyCurrent: penaltyShootout ? String(penaltyShootout) : "",
        penaltyAdd: "",
      },
    }));

    setSavingUsername("");
  }



  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-[32px] border border-white/10 bg-white/5 p-6 text-center shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-green-300">
            World Cup 2026
          </p>

          <h1 className="mt-2 text-4xl font-black uppercase italic tracking-tight">
            Admin Scores
          </h1>

          <p className="mt-2 text-sm font-bold uppercase text-white/50">
            Select an agency, then edit creator scores
          </p>

          <div className="mt-5 flex justify-center">
            <Link
              href="/events/world-cup-2026"
              className="rounded-2xl border border-green-400 bg-green-400/10 px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-green-300 transition hover:bg-green-400/20"
            >
              View Leaderboard
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mb-5 rounded-2xl border border-red-400/40 bg-red-950/70 px-4 py-3 text-sm font-bold text-red-100">
            {message}
          </div>
        ) : null}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {agencies.map((agency) => {
            const selected = selectedAgency === agency.name;

            return (
              <button
                key={agency.name}
                onClick={() => setSelectedAgency(agency.name)}
                className={`rounded-[28px] border p-5 shadow-xl transition ${
                  selected
                    ? "scale-[1.02] border-green-300 bg-green-400/15"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex h-28 items-center justify-center rounded-3xl bg-black/30 p-4">
                  <img
                    src={agency.logo}
                    alt={agency.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                <p className="mt-4 text-center text-sm font-black uppercase tracking-[0.18em]">
                  {agency.name}
                </p>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm font-black uppercase tracking-[0.2em] text-white/60">
            Loading scores...
          </div>
        ) : !selectedAgency ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm font-black uppercase tracking-[0.2em] text-white/60">
            Select an agency above
          </div>
        ) : (
          <div className="space-y-4">
            {selectedCreators.map((creator) => {
              const data = scores[creator.username] || {
                fifaFever: "",
                finalWhistle: "",
                penaltyCurrent: "",
                penaltyAdd: "",
                bonusMatchWin: "",
              };

              return (
                <article
                  key={creator.username}
                  className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-xl"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black uppercase italic">
                        {creator.username}
                      </h2>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/50">
                        {creator.country} · {creator.agency}
                      </p>
                    </div>

                    <button
                      onClick={() => saveCreator(creator)}
                      disabled={savingUsername === creator.username}
                      className="rounded-2xl bg-green-400 px-6 py-3 text-sm font-black uppercase text-green-950 disabled:opacity-50"
                    >
                      {savingUsername === creator.username ? "Saving..." : "Save"}
                    </button>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-4">
                    <ScoreInput
                      title="Final Whistle"
                      value={data.finalWhistle}
                      onChange={(value) =>
                        updateScore(creator.username, "finalWhistle", value)
                      }
                    />

                    <ScoreInput
                      title="Fifa Fever"
                      value={data.fifaFever}
                      onChange={(value) =>
                        updateScore(creator.username, "fifaFever", value)
                      }
                    />

                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4 lg:col-span-1">
                      <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/50">
                        Penalty Shootout
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <label>
                          <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                            Current Score
                          </span>
                          <input
                            value={data.penaltyCurrent}
                            onChange={(event) =>
                              updateScore(
                                creator.username,
                                "penaltyCurrent",
                                event.target.value
                              )
                            }
                            inputMode="numeric"
                            placeholder=""
                            className="w-full rounded-xl border border-white/10 bg-white px-3 py-3 text-xl font-black text-zinc-950 outline-none"
                          />
                        </label>

                        <label>
                          <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                            Score To Add
                          </span>
                          <input
                            value={data.penaltyAdd}
                            onChange={(event) =>
                              updateScore(
                                creator.username,
                                "penaltyAdd",
                                event.target.value
                              )
                            }
                            inputMode="numeric"
                            placeholder=""
                            className="w-full rounded-xl border border-white/10 bg-white px-3 py-3 text-xl font-black text-zinc-950 outline-none"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/50">
                        Bonus Match Win
                      </p>

                      <input
                        value={data.bonusMatchWin}
                        onChange={(event) =>
                          updateScore(
                            creator.username,
                            "bonusMatchWin",
                            event.target.value
                          )
                        }
                        inputMode="numeric"
                        placeholder=""
                        className="mb-3 w-full rounded-xl border border-white/10 bg-white px-3 py-3 text-xl font-black text-zinc-950 outline-none"
                      />

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setBonus(creator.username, 1000)}
                          className="rounded-xl bg-green-400 px-3 py-3 text-xs font-black uppercase text-green-950"
                        >
                          Win
                        </button>

                        <button
                          onClick={() => setBonus(creator.username, 500)}
                          className="rounded-xl bg-yellow-300 px-3 py-3 text-xs font-black uppercase text-yellow-950"
                        >
                          Draw
                        </button>

                        <button
                          onClick={() => setBonus(creator.username, 0)}
                          className="rounded-xl bg-red-400 px-3 py-3 text-xs font-black uppercase text-red-950"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function ScoreInput({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <span className="mb-3 block text-xs font-black uppercase tracking-[0.18em] text-white/50">
        {title}
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="numeric"
        placeholder=""
        className="w-full rounded-xl border border-white/10 bg-white px-3 py-3 text-xl font-black text-zinc-950 outline-none"
      />
    </label>
  );
}

function toNumber(value: string | undefined) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}