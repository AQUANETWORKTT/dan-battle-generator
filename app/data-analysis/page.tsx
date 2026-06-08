const agencies = ["All", "First Class", "Aqua", "Respawn", "Paradise", "Strive"];

const teams = [
  "All Teams",
  "Team Dan",
  "Team Rach",
  "Team Liam",
  "Team Dave",
  "Team Ash",
  "Team Cameron",
  "Team Connor",
  "Team Kyran",
  "Unassigned",
];

const attentionCreators = [
  { name: "creator_one", issue: "No weekend streams", status: "High Risk" },
  { name: "creator_two", issue: "High hours, low diamonds", status: "Review" },
  { name: "creator_three", issue: "Weekday only activity", status: "Watch" },
];

export default function DataAnalysisPage() {
  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-yellow-300/30 bg-gradient-to-br from-black via-[#111] to-[#1b1300] p-6 shadow-2xl shadow-yellow-900/20">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300/70">
            First Class Intelligence
          </p>

          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-yellow-300 md:text-6xl">
            AI Data Analysis
          </h1>

          <p className="mt-4 max-w-3xl text-white/60">
            Analyse creator performance, weekend drops, agency activity, live
            hours, diamonds, matches and creator trends.
          </p>
        </section>

        <section className="mb-6 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-4">
          <div>
            <label className="text-xs font-black uppercase text-white/40">
              Start Date
            </label>
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-yellow-300/20 bg-black px-3 py-3 text-white"
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase text-white/40">
              End Date
            </label>
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-yellow-300/20 bg-black px-3 py-3 text-white"
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase text-white/40">
              Agency
            </label>
            <select className="mt-2 w-full rounded-xl border border-yellow-300/20 bg-black px-3 py-3 text-white">
              {agencies.map((agency) => (
                <option key={agency}>{agency}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-white/40">
              Team
            </label>
            <select className="mt-2 w-full rounded-xl border border-yellow-300/20 bg-black px-3 py-3 text-white">
              {teams.map((team) => (
                <option key={team}>{team}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            "Total Diamonds",
            "Total Hours",
            "Total Matches",
            "Active Creators",
            "Weekend Diamonds",
            "Weekend Drop %",
          ].map((title) => (
            <div
              key={title}
              className="rounded-3xl border border-yellow-300/20 bg-black/60 p-5"
            >
              <p className="text-xs font-black uppercase text-white/40">
                {title}
              </p>
              <p className="mt-3 text-3xl font-black text-yellow-300">0</p>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-3xl border border-yellow-300/30 bg-yellow-300/10 p-6">
          <h2 className="text-2xl font-black uppercase text-yellow-300">
            🤖 AI Insights
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-black/40 p-4">
              Weekend performance analysis will appear here.
            </div>
            <div className="rounded-2xl bg-black/40 p-4">
              Creator attendance patterns will appear here.
            </div>
            <div className="rounded-2xl bg-black/40 p-4">
              Agency and team drop-off warnings will appear here.
            </div>
            <div className="rounded-2xl bg-black/40 p-4">
              Diamond-per-hour problems will appear here.
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-5">
          {["First Class", "Aqua", "Respawn", "Paradise", "Strive"].map(
            (agency) => (
              <div
                key={agency}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
              >
                <h3 className="text-xl font-black uppercase text-white">
                  {agency}
                </h3>

                <div className="mt-4 space-y-2 text-sm text-white/60">
                  <p>Diamonds: 0</p>
                  <p>Hours: 0</p>
                  <p>Matches: 0</p>
                  <p>Active: 0</p>
                  <p>Weekend Drop: 0%</p>
                </div>
              </div>
            )
          )}
        </section>

        <section className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-red-400/30 bg-red-500/10 p-6">
            <h2 className="text-2xl font-black uppercase text-red-300">
              Weekend Problem Finder
            </h2>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/50 text-white/40">
                  <tr>
                    <th className="p-3">Creator</th>
                    <th className="p-3">Weekday Hrs</th>
                    <th className="p-3">Weekend Hrs</th>
                    <th className="p-3">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {attentionCreators.map((creator) => (
                    <tr key={creator.name} className="border-t border-white/10">
                      <td className="p-3 font-bold">{creator.name}</td>
                      <td className="p-3">0</td>
                      <td className="p-3">0</td>
                      <td className="p-3 text-red-300">{creator.issue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-green-400/30 bg-green-500/10 p-6">
            <h2 className="text-2xl font-black uppercase text-green-300">
              Biggest Movers
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-black/40 p-4">
                <h3 className="font-black uppercase text-green-300">Up</h3>
                <p className="mt-3 text-white/50">No data yet</p>
              </div>

              <div className="rounded-2xl bg-black/40 p-4">
                <h3 className="font-black uppercase text-red-300">Down</h3>
                <p className="mt-3 text-white/50">No data yet</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-black uppercase text-yellow-300">
              Creator Deep Dive
            </h2>

            <input
              placeholder="Search creator, email, agency or team..."
              className="w-full rounded-xl border border-yellow-300/20 bg-black px-4 py-3 text-white md:w-96"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-black/60 text-white/40">
                <tr>
                  <th className="p-3">Creator</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Agency</th>
                  <th className="p-3">Team</th>
                  <th className="p-3">Days Joined</th>
                  <th className="p-3">Followers</th>
                  <th className="p-3">Diamonds</th>
                  <th className="p-3">Hours</th>
                  <th className="p-3">Matches</th>
                  <th className="p-3">Trend</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-t border-white/10">
                  <td className="p-3 font-bold">No creator data yet</td>
                  <td className="p-3">—</td>
                  <td className="p-3">—</td>
                  <td className="p-3">—</td>
                  <td className="p-3">—</td>
                  <td className="p-3">—</td>
                  <td className="p-3">—</td>
                  <td className="p-3">—</td>
                  <td className="p-3">—</td>
                  <td className="p-3">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}