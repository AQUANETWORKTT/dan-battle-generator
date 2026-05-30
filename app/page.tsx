import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black uppercase tracking-wider text-yellow-300">
            Dan's Space
          </h1>

          <p className="mt-4 text-white/60">
            Poster generation, events and leaderboards.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/generator"
            className="group rounded-3xl border border-yellow-300/30 bg-black/40 p-8 hover:border-yellow-300 transition"
          >
            <h2 className="text-2xl font-black uppercase text-yellow-300">
              Poster Generator
            </h2>

            <p className="mt-3 text-white/60">
              Create single and bulk battle posters.
            </p>
          </Link>

          <Link
            href="/events"
            className="group rounded-3xl border border-orange-500/30 bg-black/40 p-8 hover:border-orange-400 transition"
          >
            <h2 className="text-2xl font-black uppercase text-orange-400">
              Events
            </h2>

            <p className="mt-3 text-white/60">
              View tournaments, leaderboards and scores.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}