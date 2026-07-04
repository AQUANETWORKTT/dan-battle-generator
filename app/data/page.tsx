"use client";

import Link from "next/link";
import { Suspense } from "react";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DATA_ACCESS_PASSWORD, DATA_ACCESS_STORAGE_KEY } from "../components/DataAccessGuard";
import FirstClassLogo from "../components/FirstClassLogo";

function DataPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const nextPath = useMemo(() => {
    const raw = searchParams.get("next") || "/data/menu";
    return raw.startsWith("/") ? raw : "/data/menu";
  }, [searchParams]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== DATA_ACCESS_PASSWORD) {
      setError("Password is wrong.");
      return;
    }

    window.sessionStorage.setItem(DATA_ACCESS_STORAGE_KEY, DATA_ACCESS_PASSWORD);
    router.push(nextPath);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white">
      <div
        className="fixed inset-0 scale-105 bg-cover bg-center blur-sm"
        style={{ backgroundImage: "url('/branding/first-class-data-bg.jpg')" }}
      />
      <div className="fixed inset-0 bg-black/45" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/20 via-slate-950/10 to-black/70" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <Link
          href="/"
          className="mb-4 inline-flex w-fit rounded-xl border border-white/20 bg-black/35 px-4 py-2.5 text-xs font-black uppercase text-white/85 shadow-xl backdrop-blur-md transition hover:bg-white/10"
        >
          Go Back
        </Link>

        <section className="rounded-2xl border border-white/20 bg-black/35 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <p className="text-center text-xs font-black uppercase tracking-[0.3em] text-yellow-100/70">
            Protected Area
          </p>
          <FirstClassLogo compact className="mt-3" />
          <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
            <label className="text-xs font-black uppercase text-white/45">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                autoFocus
                className="mt-2 w-full rounded-xl border border-yellow-200/25 bg-black/70 px-4 py-3 text-lg font-black text-white outline-none focus:border-yellow-100"
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="rounded-xl bg-yellow-300 px-5 py-3 font-black uppercase text-black shadow-lg shadow-yellow-950/20 transition hover:bg-yellow-200"
            >
              Access
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function DataPasswordPage() {
  return (
    <Suspense>
      <DataPasswordContent />
    </Suspense>
  );
}
