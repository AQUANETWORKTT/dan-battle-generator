import Link from "next/link";
import FirstClassLogo from "./components/FirstClassLogo";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] px-6 py-10">
      <div
        className="fixed inset-0 scale-105 bg-cover bg-center blur-sm"
        style={{ backgroundImage: "url('/branding/first-class-data-bg.jpg')" }}
      />
      <div className="fixed inset-0 bg-black/45" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/20 via-slate-950/10 to-black/75" />

      <div className="relative z-10 w-full max-w-6xl">
        <div className="mb-12 text-center">
          <FirstClassLogo />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/data"
            className="group relative overflow-hidden rounded-3xl border border-yellow-400/40 bg-black/40 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:border-yellow-300 hover:bg-black/55"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.12),transparent_40%)]" />
            <div className="relative">
              <h2 className="text-2xl font-black uppercase text-yellow-300">
                Data
              </h2>
              <p className="mt-3 text-white/60">
                AI analysis, graduation tracking and mature creator tracking.
              </p>
            </div>
          </Link>

          <Link
            href="/events"
            className="group rounded-3xl border border-orange-500/30 bg-black/40 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:border-orange-400 hover:bg-black/55"
          >
            <h2 className="text-2xl font-black uppercase text-orange-400">
              Events
            </h2>
            <p className="mt-3 text-white/60">
              View tournaments, leaderboards and scores.
            </p>
          </Link>

          <Link
            href="/generator"
            className="group rounded-3xl border border-yellow-300/30 bg-black/40 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:border-yellow-300 hover:bg-black/55"
          >
            <h2 className="text-2xl font-black uppercase text-yellow-300">
              Poster Generator
            </h2>
            <p className="mt-3 text-white/60">
              Create single and bulk battle posters.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
