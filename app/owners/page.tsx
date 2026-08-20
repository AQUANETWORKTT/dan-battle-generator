import Link from "next/link";

export default function OwnersPage() {
  return (
    <main className="min-h-screen bg-[#080806] px-5 py-10 text-white">
      <section className="mx-auto max-w-5xl rounded-3xl border border-yellow-300/35 bg-gradient-to-br from-yellow-300/[.08] via-black to-black p-8 md:p-12">
        <p className="text-xs font-black uppercase tracking-[.25em] text-yellow-200">First Class</p>
        <h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase md:text-7xl">Owners <span className="text-yellow-300">Space</span></h1>
        <p className="mt-4 max-w-2xl text-sm font-bold uppercase tracking-wide text-white/55">Poster creation and arranged battles.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Link href="/generator?mode=team&workspace=posters" className="group rounded-2xl border border-yellow-300/45 bg-yellow-300/[.08] p-7 transition hover:border-yellow-200 hover:bg-yellow-300 hover:text-black">
            <p className="text-xs font-black uppercase tracking-[.2em] text-yellow-200 group-hover:text-black">Create posters</p>
            <h2 className="mt-3 font-[family-name:var(--font-norwester)] text-4xl uppercase">Battle Generator</h2>
            <p className="mt-4 text-xs font-bold uppercase opacity-70">Open the clean generator →</p>
          </Link>
          <a href="https://firstclassbattles.space" className="group rounded-2xl border border-white/20 bg-white/[.035] p-7 transition hover:border-yellow-300 hover:bg-yellow-300 hover:text-black">
            <p className="text-xs font-black uppercase tracking-[.2em] text-white/65 group-hover:text-black">Arrange battles</p>
            <h2 className="mt-3 font-[family-name:var(--font-norwester)] text-4xl uppercase">Battle Network</h2>
            <p className="mt-4 text-xs font-bold uppercase opacity-70">Open First Class Battles →</p>
          </a>
        </div>
      </section>
    </main>
  );
}
