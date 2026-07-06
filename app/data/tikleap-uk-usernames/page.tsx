"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

const TIKLEAP_UK_USERNAMES = [
  "__tfooo__",
  "gudagol011",
  "bawa_295",
  "king_kaly",
  "j_ames06",
  "legit.official1",
  "fearless___punjaban",
  "uk_aman01",
  "sammybevan",
  "shakeel.mehar_804",
  "toldytejko",
  "justmdfaiz",
  "driving_withtwins",
  "coldbloxsab",
  "zille_amna888",
  "feqar.aykonkun",
  "ceejay_francis",
  "dan..jones",
  "woodymaher",
  "joleneburnsmusic",
  "azxq2kguc9",
  "loveandpeace9998",
  "s_sheemza_",
  "ya_na_sunshine",
  "emanshehzadi.live",
  "_hayden.s08",
  "sjpb77",
  "shakab155",
  "adryanacotisel",
  "dextermaherr",
  "sikandarchoudhry007",
  "irishqueennew",
  "halooaziz",
  "emily.jane.xoxo",
  "_sohe1",
  "sab_games22",
  "mohammaad.sultan",
  "askofeddie0",
  "boosty.blanco",
  "itsnotginty1",
  "mbaands8",
  "shanggozi_",
  "apgoeslive",
  "eviechappelll",
  "betterliam",
  "cellargone",
  "alvesj82",
  "ruxiiugaas",
  "brettboyy3",
  "versace1112__",
  "panda_dxs",
  "andrewbiggiemorris",
  "rafyalirana",
  "lorelyndslq3",
  "thezachloizou",
  "nomercy_daddy",
  "yasmin.majerska",
  "musicalchrissy88",
  "4twentytalentshow26",
  "mularrrrrr",
  "dai_ling_ping",
  "jasminlangley",
  "thisis__ak",
  "444sahibax",
  "guriebrothers",
  "aron270724",
  "chilliconcarnage",
  "_brooketaylorxx",
  "noriience",
  ".dylann7",
  "nrz1no",
  "jb0_40",
  "adamlough",
  "maize.jx",
  "gadjiev95fuad",
  "nana.themoon",
  "thejamescope",
  "leilag_",
  "louise.wynne",
  "prince_silva1",
  "dyk0swf9i1",
  "envyy80",
  "lcm0395",
  "aayad38",
  "goldynar786",
  "mahambutt720",
  "yhmaka",
  "graymonroe_",
  "elaine.louca",
  "sharni.ds",
  "izzylq",
  "bk2bunny",
  "stealth_mc",
  "ben.toye.lives",
  "laurenleig.h",
  "00._pavkataa_.00",
  "blackqueen4life1",
  "2026_carcrazy",
  "nurseruvah",
];

export default function TikleapUkUsernamesPage() {
  const [generated, setGenerated] = useState(false);
  const [message, setMessage] = useState("");

  const usernameList = useMemo(() => TIKLEAP_UK_USERNAMES.join("\n"), []);

  async function copyUsernames() {
    await navigator.clipboard.writeText(usernameList);
    setMessage(`Copied ${TIKLEAP_UK_USERNAMES.length} usernames.`);
  }

  function downloadUsernames() {
    const blob = new Blob([usernameList], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tikleap-uk-last-day-usernames.txt";
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Downloaded ${TIKLEAP_UK_USERNAMES.length} usernames.`);
  }

  return (
    <DataAccessGuard>
      <main className="min-h-screen bg-[#070707] px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex flex-wrap gap-3">
            <Link href="/data/menu" className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase hover:bg-white/10">
              Back to Data
            </Link>
          </div>

          <section className="rounded-3xl border border-sky-300/25 bg-sky-300/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-200/70">Tikleap UK</p>
            <h1 className="mt-3 text-4xl font-black uppercase text-sky-300 md:text-6xl">Last-Day Usernames</h1>
            <p className="mt-3 max-w-3xl text-white/60">
              Generates the UK Tikleap last-day ranking as plain usernames only. Source pull: 05.07.2026, 99 entries.
            </p>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="space-y-4 rounded-3xl border border-sky-300/20 bg-black/50 p-5">
              <div>
                <p className="text-xs font-black uppercase text-white/45">Output</p>
                <p className="mt-2 text-lg font-black text-sky-200">{TIKLEAP_UK_USERNAMES.length} usernames</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setGenerated(true);
                  setMessage(`Generated ${TIKLEAP_UK_USERNAMES.length} usernames.`);
                }}
                className="w-full rounded-xl bg-sky-300 px-5 py-4 text-sm font-black uppercase text-black hover:bg-sky-200"
              >
                Generate Usernames
              </button>

              <button
                type="button"
                onClick={copyUsernames}
                disabled={!generated}
                className="w-full rounded-xl bg-yellow-300 px-5 py-4 text-sm font-black uppercase text-black hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Copy List
              </button>

              <button
                type="button"
                onClick={downloadUsernames}
                disabled={!generated}
                className="w-full rounded-xl bg-green-400 px-5 py-4 text-sm font-black uppercase text-black hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Download TXT
              </button>

              {message ? <p className="rounded-xl border border-sky-300/20 bg-sky-300/10 p-3 text-sm text-sky-100">{message}</p> : null}
            </div>

            <div className="rounded-3xl border border-sky-300/20 bg-black/50 p-5">
              {generated ? (
                <textarea
                  readOnly
                  value={usernameList}
                  className="min-h-[620px] w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-sm leading-6 text-white outline-none"
                />
              ) : (
                <div className="flex min-h-[620px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/55">
                  Select Generate Usernames to build the plain UK ranking list.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </DataAccessGuard>
  );
}
