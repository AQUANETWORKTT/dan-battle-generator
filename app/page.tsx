import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
      <div className="w-full max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black uppercase tracking-wider text-yellow-300">
            Dan's Space
          </h1>

          <p className="mt-4 text-white/60">
            Poster generation, events, leaderboards and analytics.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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

          <Link
            href="/data-analysis"
            className="group relative overflow-hidden rounded-3xl border border-yellow-400/40 bg-gradient-to-br from-black via-[#111111] to-[#1a1a1a] p-8 hover:border-yellow-300 transition"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.12),transparent_40%)]" />

            <div className="relative">
              <div className="mb-3 text-4xl">📊</div>

              <h2 className="text-2xl font-black uppercase text-yellow-300">
                AI Data Analysis
              </h2>

              <p className="mt-3 text-white/60">
                Analyse creator performance, weekend activity, diamonds,
                hours, matches and agency trends.
              </p>

              <div className="mt-5 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-200/80">
                  AI Insights
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/graduation-tracker"
            className="group relative overflow-hidden rounded-3xl border border-green-400/40 bg-gradient-to-br from-black via-[#0f1a12] to-[#132218] p-8 hover:border-green-300 transition"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(74,222,128,0.12),transparent_40%)]" />

            <div className="relative">
              <div className="mb-3 text-4xl">🎓</div>

              <h2 className="text-2xl font-black uppercase text-green-300">
                Graduation Tracker
              </h2>

              <p className="mt-3 text-white/60">
                Track creator graduation progress, monitor pace to 200k
                diamonds, identify graduates and generate WhatsApp reports.
              </p>

              <div className="mt-5 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-green-200/80">
                  Graduation Insights
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}