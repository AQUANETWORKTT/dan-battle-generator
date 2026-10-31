import Link from "next/link";


const spaces = [
  {
    "eyebrow": "Performance & reporting",
    "title": "Data",
    "copy": "Creator trackers, manager assignments and daily Atlas reporting in one protected workspace.",
    "href": "/atlas/data/menu",
    "action": "Open Data Space",
    "accent": "from-sky-300/20 via-sky-300/5 to-transparent",
    "marker": "01"
  },
  {
    "eyebrow": "Management tools",
    "title": "Agency Tools",
    "copy": "Create posters and team assets with your Atlas entry library, generator and template editor.",
    "href": "/atlas/generator",
    "action": "Open Agency Tools",
    "accent": "from-cyan-300/20 via-cyan-300/5 to-transparent",
    "marker": "02"
  }
];

export default function AtlasLeadership() {

  return (
    <main className="min-h-screen overflow-hidden bg-[#080806] px-5 py-6 text-white sm:px-8 sm:py-8">
      <div className="pointer-events-none fixed inset-0 opacity-50 [background:radial-gradient(circle_at_75%_0%,rgba(125,211,252,0.16),transparent_28%),radial-gradient(circle_at_0%_100%,rgba(255,255,255,0.05),transparent_25%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="font-[family-name:var(--font-norwester)] text-xl uppercase tracking-wide sm:text-2xl">
            Atlas <span className="text-sky-300">Leadership Space</span>
          </div>
          <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-sky-200 sm:px-4">
            Leadership Portal
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center py-14 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.34em] text-sky-300/80">Atlas Creator Network</p>
            <h1 className="mt-5 font-[family-name:var(--font-norwester)] text-5xl uppercase leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
              Your agency,<br />
              <span className="text-sky-300">in one space.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
              The private operational workspace for Atlas performance, reporting and creator management.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-2 lg:gap-6">
            {spaces.map((space) => (
              <Link
                key={space.href}
                href={space.href}
                className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.035] p-6 transition duration-300 hover:-translate-y-1 hover:border-sky-300/50 hover:bg-white/[0.06] sm:p-8"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${space.accent}`} />
                <div className="relative flex min-h-56 flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">{space.eyebrow}</p>
                    <span className="font-[family-name:var(--font-norwester)] text-2xl text-white/20">{space.marker}</span>
                  </div>
                  <div>
                    <h2 className="font-[family-name:var(--font-norwester)] text-4xl uppercase tracking-tight sm:text-5xl">{space.title}</h2>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">{space.copy}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-sky-200">
                      {space.action} <span className="text-lg transition-transform group-hover:translate-x-1">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
          <span>Atlas Creator Network</span>
          <Link href="/atlas" className="text-sky-200 transition hover:text-white">Go Back · Atlas Space</Link>
          <span>Data · Creator Trackers · Agency Tools</span>
        </footer>
      </div>
    </main>
  );
}
