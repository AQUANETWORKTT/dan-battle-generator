"use client";

import Link from "next/link";

const SITE_URL = "https://dansbattles.space";

const events = [
  {
    name: "World Cup 2026",
    status: "Live Event",
    logo: "/world-cup-2026/logo.png",
    leaderboardHref: "/live/world-cup-2026",
    adminHref: "/events/world-cup-2026/admin",
    creatorHref: "/live/world-cup-2026",
    colour: "green",
  },
  {
    name: "Sunset Showdown",
    status: "Live Event",
    logo: "/sunset-showdown/logo.png",
    leaderboardHref: "/live/8f3k2j9m-sunset",
    adminHref: "/events/sunset-showdown/admin",
    creatorHref: "/live/8f3k2j9m-sunset",
    colour: "orange",
  },
  {
    name: "First Class: Ascend",
    status: "Tournament Setup",
    logo: "/world-cup-2026/agencies/first-class.png",
    leaderboardHref: "/live/7xq9v2-first-class",
    creatorHref: "/live/7xq9v2-first-class",
    colour: "orange",
  },
];

export default function EventsPage() {
  function copyCreatorLink(path: string) {
    navigator.clipboard.writeText(`${SITE_URL}${path}`);
    alert("Creator link copied");
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 text-zinc-950">
      <section className="mx-auto max-w-6xl">
        <nav className="mb-8 flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm">
          <Link href="/" className="text-sm font-black uppercase text-zinc-700">
            Home
          </Link>

          <Link
            href="/events"
            className="rounded-full bg-orange-600 px-5 py-2 text-sm font-black uppercase text-white"
          >
            Events
          </Link>
        </nav>

        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">
            Daniel&apos;s Event Space
          </p>

          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight">
            Events
          </h1>

          <p className="mt-2 max-w-xl text-sm text-zinc-600">
            Select an event to view the live leaderboard or copy its creator link.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const isGreen = event.colour === "green";

            return (
              <div
                key={event.name}
                className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div
                  className={`flex h-52 items-center justify-center rounded-3xl p-6 ${
                    isGreen
                      ? "bg-gradient-to-br from-green-100 via-white to-emerald-100"
                      : "bg-gradient-to-br from-orange-100 via-white to-zinc-100"
                  }`}
                >
                  <img
                    src={event.logo}
                    alt={event.name}
                    className="max-h-full max-w-full object-contain drop-shadow-lg"
                  />
                </div>

                <div className="mt-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black uppercase italic">
                      {event.name}
                    </h2>

                    <p
                      className={`mt-1 text-xs font-black uppercase tracking-[0.18em] ${
                        isGreen ? "text-green-600" : "text-orange-600"
                      }`}
                    >
                      {event.status}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <Link
                    href={event.leaderboardHref}
                    className="rounded-2xl bg-zinc-950 px-5 py-3 text-center text-sm font-black uppercase text-white"
                  >
                    View Leaderboard
                  </Link>

                  {event.adminHref && (
                    <Link
                      href={event.adminHref}
                      className={`rounded-2xl px-5 py-3 text-center text-sm font-black uppercase ${
                        isGreen
                          ? "border border-green-500 bg-green-50 text-green-700"
                          : "border border-orange-500 bg-orange-50 text-orange-700"
                      }`}
                    >
                      Admin Scores
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => copyCreatorLink(event.creatorHref)}
                    className="rounded-2xl border border-blue-500 bg-blue-50 px-5 py-3 text-center text-sm font-black uppercase text-blue-700"
                  >
                    Copy Creator Link
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
