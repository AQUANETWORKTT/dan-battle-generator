"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

const CHUNK_SIZES = [24, 24, 24];

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

export default function TikleapUkUsernamesPage() {
  const [countries, setCountries] = useState<CountryUsernames[]>([]);
  const [countryErrors, setCountryErrors] = useState<TikleapResponse["errors"]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const totalUsernames = useMemo(
    () => countries.reduce((total, country) => total + country.usernames.length, 0),
    [countries]
  );
  const downloadText = useMemo(() => allCountriesText(countries), [countries]);

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

  async function copyCountry(country: CountryUsernames) {
    await navigator.clipboard.writeText(countryText(country));
    setMessage(`Copied ${country.label} with ${country.usernames.length} usernames.`);
  }

  async function copyBackstageList(country: CountryUsernames, index: number, names: string[]) {
    await navigator.clipboard.writeText(names.join("\n"));
    setMessage(`Copied ${country.label} list ${index + 1} with ${names.length} usernames.`);
  }

  function downloadUsernames() {
    const blob = new Blob([downloadText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tikleap-yesterday-usernames-uk-australia-uae.txt";
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Downloaded ${totalUsernames} usernames across ${countries.length} countries.`);
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
            <h1 className="mt-3 text-4xl font-black uppercase text-cyan-200 md:text-6xl">🏆 Daily Rankings</h1>
            <p className="mt-3 max-w-3xl text-white/60">
              Pulls the previous day Tikleap Last Day archive for UK, Australia and United Arab Emirates, then splits each country into pasteable Backstage lists.
            </p>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="space-y-4 rounded-3xl border border-sky-300/20 bg-black/50 p-5">
              <div>
                <p className="text-xs font-black uppercase text-white/45">Output</p>
                <p className="mt-2 text-lg font-black text-sky-200">{totalUsernames ? `${totalUsernames} usernames` : "Ready to pull"}</p>
                <p className="mt-1 text-xs font-bold uppercase text-white/45">UK, Australia, United Arab Emirates</p>
              </div>

              <button
                type="button"
                onClick={generateUsernames}
                disabled={loading}
                className="w-full rounded-xl bg-sky-300 px-5 py-4 text-sm font-black uppercase text-black hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading ? "Pulling..." : "Generate All Countries"}
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
