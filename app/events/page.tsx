import Link from "next/link";

const events = [
  {
    name: "Sunset Showdown",
    status: "Live Event",
    logo: "/sunset-showdown/logo.png",
    leaderboardHref: "/events/sunset-showdown",
    adminHref: "/events/sunset-showdown/admin",
  },
];

export default function EventsPage() {
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
            Daniel Battle Generator
          </p>

          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight">
            Events
          </h1>

          <p className="mt-2 max-w-xl text-sm text-zinc-600">
            Select an event to view the live leaderboard or update scores.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.name}
              className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex h-52 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-100 via-white to-zinc-100 p-6">
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

                  <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-orange-600">
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

                <Link
                  href={event.adminHref}
                  className="rounded-2xl border border-orange-500 bg-orange-50 px-5 py-3 text-center text-sm font-black uppercase text-orange-700"
                >
                  Admin Scores
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}