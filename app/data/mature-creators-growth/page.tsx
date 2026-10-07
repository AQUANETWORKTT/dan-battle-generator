"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type Day = { diamonds: number; hours: number; streams: number };
type MonthSeries = { month: string; diamonds: number[] };
type Focus = {
  id: string;
  username: string;
  manager: string;
  group: string;
  august: number;
  september: number;
  october: number;
  priorPace: number;
  drop: number;
  dropPercent: number;
  octoberHours: number;
};
type Creator = {
  id: string;
  username: string;
  manager: string;
  group: string;
  totals: Record<string, number>;
  hours: Record<string, number>;
  monthly: Record<string, Day[]>;
};
type Data = {
  latestDate: string;
  months: string[];
  currentDays: number;
  agency: MonthSeries[];
  focus: Focus[];
  creators: Creator[];
  totalCreators: number;
  error?: string;
};
const format = new Intl.NumberFormat("en-GB");
const money = (value: number) => format.format(Math.round(value));
const labelMonth = (value: string) =>
  new Date(`${value}-01T12:00:00`)
    .toLocaleDateString("en-GB", { month: "short" })
    .toUpperCase();
const palette = ["#f9cf5b", "#7dd3fc", "#e9a8db"];
const diamondScale = (highestDailyValue: number) => {
  const step = highestDailyValue <= 200_000 ? 50_000 : 100_000;
  const fourStepBlock = step * 4;
  return Math.max(
    fourStepBlock,
    Math.ceil(highestDailyValue / fourStepBlock) * fourStepBlock,
  );
};

export default function Page() {
  const [data, setData] = useState<Data | null>(null);
  const [search, setSearch] = useState("");
  const [manager, setManager] = useState("all");
  const [selected, setSelected] = useState<Creator | null>(null);
  const [dropOrder, setDropOrder] = useState<"largest" | "smallest">("largest");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/data/mature-creators-growth", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw Error(body.error || "Could not load the growth tracker.");
        setData(body);
        setSelectedMonths(body.months);
      })
      .catch((error) =>
        setData({
          latestDate: "",
          months: [],
          currentDays: 0,
          agency: [],
          focus: [],
          creators: [],
          totalCreators: 0,
          error: error.message,
        }),
      );
  }, []);
  const managers = useMemo(
    () =>
      [
        ...new Set((data?.creators || []).map((creator) => creator.manager)),
      ].sort(),
    [data],
  );
  const creators = useMemo(
    () =>
      (data?.creators || []).filter(
        (creator) =>
          (manager === "all" || creator.manager === manager) &&
          `${creator.username} ${creator.manager} ${creator.group}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [data, manager, search],
  );
  const focusRows = useMemo(
    () =>
      [...(data?.focus || [])].sort((a, b) =>
        dropOrder === "largest" ? a.drop - b.drop : b.drop - a.drop,
      ),
    [data, dropOrder],
  );
  const displayMonths = useMemo(
    () =>
      (data?.months || []).filter((month) => selectedMonths.includes(month)),
    [data, selectedMonths],
  );
  const toggleMonth = (month: string) =>
    setSelectedMonths((current) =>
      current.includes(month)
        ? current.length === 1
          ? current
          : current.filter((item) => item !== month)
        : [...current, month],
    );
  return (
    <DataAccessGuard>
      <main className="min-h-screen bg-[#090806] px-4 py-7 text-white sm:px-8">
        <div className="mx-auto max-w-[1700px]">
          <Link
            href="/data/menu"
            className="text-xs font-black uppercase tracking-[.18em] text-yellow-200"
          >
            ← Data Space
          </Link>
          <header className="mt-8 overflow-hidden rounded-[2rem] border border-yellow-300/25 bg-[radial-gradient(circle_at_85%_0%,rgba(250,204,21,.18),transparent_28%),linear-gradient(135deg,#1b150b,#090806)] p-6 sm:p-10">
            <p className="text-xs font-black uppercase tracking-[.3em] text-yellow-200/80">
              Agency performance
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-norwester)] text-4xl uppercase sm:text-6xl">
              Mature creators{" "}
              <span className="text-yellow-300">growth tracker</span>
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/60">
              Daily diamond pace across August, September and October. Mature
              creators are anyone who reached 200,000 diamonds in at least one
              of those months.
            </p>
          </header>
          {data?.error ? (
            <p className="mt-6 rounded-xl border border-red-300/25 bg-red-500/10 p-4 text-red-100">
              {data.error}
            </p>
          ) : null}
          {data ? (
            <>
              <section className="mt-6 grid gap-3 md:grid-cols-4">
                <Metric
                  label="Agency creators read"
                  value={String(data.totalCreators)}
                  detail="across the last three months"
                />
                <Metric
                  label="Mature creators"
                  value={String(data.creators.length)}
                  detail="200K+ in Aug, Sep or Oct"
                />
                <Metric
                  label="October data through"
                  value={data.latestDate || "—"}
                  detail={`Day ${data.currentDays} of October`}
                />
                <Metric
                  label="Biggest drop list"
                  value={String(data.focus.length)}
                  detail="ranked by diamond shortfall against September pace"
                />
              </section>
              <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[.035] p-5 sm:p-7">
                <h2 className="font-[family-name:var(--font-norwester)] text-3xl uppercase">
                  Agency daily diamonds
                </h2>
                <p className="mt-2 text-sm text-white/55">
                  Each line uses the same day-of-month axis so you can see where
                  October is ahead or behind August and September.
                </p>
                <div className="mt-5 h-[360px]">
                  <AgencyChart series={data.agency.filter((entry) => displayMonths.includes(entry.month))} />
                </div>
              </section>
              <section className="mt-6 rounded-[2rem] border border-red-300/20 bg-red-500/[.055] p-5 sm:p-7">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.22em] text-red-200">
                      Priority chase-up list
                    </p>
                    <h2 className="mt-2 font-[family-name:var(--font-norwester)] text-3xl uppercase">
                      Where the diamonds have dropped
                    </h2>
                  </div>
                  <p className="max-w-md text-sm text-white/55">
                    Expected pace is September total ÷ 30 days × the October
                    days uploaded. The list is ranked by diamond shortfall, not
                    percentage.
                  </p>
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-[950px] w-full text-left text-sm">
                    <thead className="border-b border-white/15 text-[10px] font-black uppercase tracking-[.14em] text-white/45">
                      <tr>
                        <th className="pb-3">Creator</th>
                        <th className="pb-3">Manager</th>
                        <th className="pb-3 text-right">Aug</th>
                        <th className="pb-3 text-right">Sep</th>
                        <th className="pb-3 text-right">Oct</th>
                        <th className="pb-3 text-right">Expected pace</th>
                        <th className="pb-3 text-right">Lost diamonds</th>
                        <th className="pb-3 text-right">
                          <button
                            onClick={() =>
                              setDropOrder((order) =>
                                order === "largest" ? "smallest" : "largest",
                              )
                            }
                            className="inline-flex items-center gap-1 font-black uppercase tracking-[.14em] text-red-100 hover:text-yellow-200"
                          >
                            Drop{" "}
                            <span aria-hidden="true">
                              {dropOrder === "largest" ? "↓" : "↑"}
                            </span>
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {focusRows.map((creator) => (
                        <tr
                          key={creator.id}
                          className="border-b border-white/[.07]"
                        >
                          <td className="py-3 font-bold">
                            @{creator.username}
                            <span className="ml-2 text-xs font-normal text-white/40">
                              {creator.group}
                            </span>
                          </td>
                          <td className="py-3 text-white/55">
                            {creator.manager}
                          </td>
                          <td className="py-3 text-right">
                            {money(creator.august)}
                          </td>
                          <td className="py-3 text-right">
                            {money(creator.september)}
                          </td>
                          <td className="py-3 text-right text-yellow-100">
                            {money(creator.october)}
                          </td>
                          <td className="py-3 text-right">
                            {money(creator.priorPace)}
                          </td>
                          <td className="py-3 text-right font-black text-red-200">
                            {money(Math.abs(creator.drop))}
                          </td>
                          <td className="py-3 text-right font-black text-red-200">
                            -{money(Math.abs(creator.drop))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="mt-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.22em] text-yellow-200">
                      Individual daily view
                    </p>
                    <h2 className="mt-2 font-[family-name:var(--font-norwester)] text-3xl uppercase">
                      Mature creator charts
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex overflow-hidden rounded-xl border border-white/15 bg-black/30">
                      {data.months.map((month) => (
                        <button
                          key={month}
                          onClick={() => toggleMonth(month)}
                          className={`px-3 py-3 text-[10px] font-black uppercase tracking-wide ${selectedMonths.includes(month) ? "bg-yellow-300 text-black" : "text-white/45 hover:text-white"}`}
                        >
                          {labelMonth(month)}
                        </button>
                      ))}
                    </div>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search username, manager or group"
                      className="w-72 rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-white/35 focus:border-yellow-300/60"
                    />
                    <select
                      value={manager}
                      onChange={(event) => setManager(event.target.value)}
                      className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm outline-none"
                    >
                      <option value="all">All managers</option>
                      {managers.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/50">
                  Click any chart for a full peak-day and live-hour
                  effectiveness breakdown. Gold, blue and pink curves are
                  diamonds for August, September and October. The coloured
                  columns behind them are live hours, read from the right-hand
                  scale.
                </p>
                <div className="mt-5 space-y-6">
                  {creators.map((creator) => (
                    <CreatorChart
                      key={creator.id}
                      creator={creator}
                      months={displayMonths}
                      currentDays={data.currentDays}
                      onSelect={() => setSelected(creator)}
                    />
                  ))}
                </div>
              </section>
            </>
          ) : (
            <p className="mt-10 text-white/55">Loading growth data…</p>
          )}
        </div>
        {selected && (
          <CreatorDetail
            creator={selected}
            months={displayMonths}
            onClose={() => setSelected(null)}
          />
        )}
      </main>
    </DataAccessGuard>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <p className="text-[10px] font-black uppercase tracking-[.17em] text-white/45">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-yellow-100">{value}</p>
      <p className="mt-1 text-xs text-white/45">{detail}</p>
    </article>
  );
}

function AgencyChart({ series }: { series: MonthSeries[] }) {
  // This is deliberately based on every creator record in the selected months,
  // rather than only the mature-creator cards shown below.
  const max = diamondScale(
    Math.max(1, ...series.flatMap((entry) => entry.diamonds)),
  );
  const width = 1100,
    height = 330,
    padLeft = 82,
    padRight = 34,
    padY = 34;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padY * 2;
  const path = (values: number[]) =>
    values
      .map(
        (amount, index) =>
          `${index ? "L" : "M"}${padLeft + (index * chartWidth) / 30},${height - padY - (amount / max) * chartHeight}`,
      )
      .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full overflow-visible"
      role="img"
      aria-label="Agency daily diamond comparison"
    >
      <g stroke="rgba(255,255,255,.13)" strokeWidth="1">
        {[0, 0.25, 0.5, 0.75, 1].map((level) => (
          <g key={level}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={height - padY - level * chartHeight}
              y2={height - padY - level * chartHeight}
            />
            <text
              x={padLeft - 10}
              y={height - padY - level * chartHeight + 4}
              textAnchor="end"
              fill="#a8a29e"
              fontSize="11"
              stroke="none"
            >
              {money(max * level)}
            </text>
          </g>
        ))}
      </g>
      {series.map((entry, index) => (
        <path
          key={entry.month}
          d={path(entry.diamonds)}
          fill="none"
          stroke={palette[index]}
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      <g fill="#a8a29e" fontSize="11">
        {[1, 6, 12, 18, 24, 31].map((day) => (
          <text
            key={day}
            x={padLeft + ((day - 1) * chartWidth) / 30}
            y={height - 8}
            textAnchor="middle"
          >
            {day}
          </text>
        ))}
      </g>
      <g>
        {series.map((entry, index) => (
          <g key={entry.month} transform={`translate(${padLeft + index * 135},16)`}>
            <circle r="5" fill={palette[index]} />
            <text x="10" y="4" fill="#f5f5f4" fontSize="12" fontWeight="700">
              {labelMonth(entry.month)}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function CreatorChart({
  creator,
  months,
  currentDays,
  onSelect,
}: {
  creator: Creator;
  months: string[];
  currentDays: number;
  onSelect: () => void;
}) {
  const values = months.map((month) => creator.monthly[month] || []);
  const maximum = diamondScale(
    Math.max(1, ...values.flatMap((month) => month.map((day) => day.diamonds))),
  );
  const maxHours = Math.max(
    1,
    ...values.flatMap((month) => month.map((day) => day.hours)),
  );
  const width = 1450,
    height = 360,
    left = 76,
    right = 76,
    top = 28,
    bottom = 46;
  const graphWidth = width - left - right,
    graphHeight = height - top - bottom;
  const x = (index: number) => left + (index * graphWidth) / 30;
  const diamondY = (amount: number) =>
    height - bottom - (amount / maximum) * graphHeight;
  const hourY = (amount: number) =>
    height - bottom - (amount / maxHours) * graphHeight;
  const smoothPath = (entries: Day[]) => {
    const points = entries.map(
      (day, index) => [x(index), diamondY(day.diamonds)] as const,
    );
    if (!points.length) return "";
    if (points.length === 1) return `M${points[0][0]},${points[0][1]}`;
    let result = `M${points[0][0]},${points[0][1]}`;
    for (let index = 0; index < points.length - 1; index += 1) {
      const p0 = points[index - 1] || points[index];
      const p1 = points[index];
      const p2 = points[index + 1];
      const p3 = points[index + 2] || p2;
      result += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    return result;
  };
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <article
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect();
      }}
      role="button"
      tabIndex={0}
      className="cursor-pointer overflow-x-auto rounded-[1.8rem] border border-white/10 bg-white/[.035] p-5 transition hover:border-yellow-300/40 hover:bg-white/[.05] focus:outline-none focus:ring-2 focus:ring-yellow-300/70 sm:p-7"
    >
      <div className="flex min-w-[1180px] flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black">@{creator.username}</h3>
          <p className="mt-1 text-xs text-white/45">
            {creator.manager} · {creator.group} ·{" "}
            <span className="text-yellow-200">
              Click for performance detail
            </span>
          </p>
        </div>
        <div className="flex gap-5 text-right text-xs font-black uppercase tracking-wide">
          {months.map((month, index) => (
            <span key={month} style={{ color: palette[index] }}>
              {labelMonth(month)} {money(creator.totals[month] || 0)} diamonds
            </span>
          ))}
        </div>
      </div>
      <div className="mt-5 min-w-[1180px] h-[340px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={`${creator.username} diamond and live-hour trend`}
        >
          <g stroke="rgba(255,255,255,.12)" strokeWidth="1">
            {ticks.map((level) => (
              <line
                key={level}
                x1={left}
                x2={width - right}
                y1={height - bottom - level * graphHeight}
                y2={height - bottom - level * graphHeight}
              />
            ))}
          </g>
          <g fill="#d6d3d1" fontSize="12" fontWeight="700">
            {ticks.map((level) => (
              <text
                key={level}
                x={left - 12}
                y={height - bottom - level * graphHeight + 4}
                textAnchor="end"
              >
                {money(maximum * level)}
              </text>
            ))}
          </g>
          <g fill="#a8a29e" fontSize="12" fontWeight="700">
            {ticks.map((level) => (
              <text
                key={level}
                x={width - right + 12}
                y={height - bottom - level * graphHeight + 4}
              >
                {(maxHours * level).toFixed(level === 0 ? 0 : 1)}h
              </text>
            ))}
          </g>
          <text x={left} y={16} fill="#f9cf5b" fontSize="11" fontWeight="800">
            DIAMONDS
          </text>
          <text
            x={width - right}
            y={16}
            fill="#a8a29e"
            fontSize="11"
            fontWeight="800"
            textAnchor="end"
          >
            LIVE HOURS
          </text>
          <g>
            {values.map((entries, seriesIndex) =>
              entries.map((day, dayIndex) => {
                const barWidth = 7;
                const barX = x(dayIndex) - 11 + seriesIndex * 8;
                const barHeight = (day.hours / maxHours) * graphHeight;
                return (
                  <g key={`${seriesIndex}-${dayIndex}`}>
                    <rect
                      x={barX}
                      y={hourY(day.hours)}
                      width={barWidth}
                      height={barHeight}
                      rx="2"
                      fill={palette[seriesIndex]}
                      opacity="0.28"
                    />
                    <text
                      x={barX + barWidth / 2}
                      y={height - bottom + 14 + seriesIndex * 11}
                      fill={palette[seriesIndex]}
                      fontSize="7"
                      textAnchor="middle"
                    >
                      {day.hours ? day.hours.toFixed(1) : ""}
                    </text>
                  </g>
                );
              }),
            )}
          </g>
          {values.map((entries, index) => (
            <path
              key={months[index]}
              d={smoothPath(entries)}
              fill="none"
              stroke={palette[index]}
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          <g fill="#a8a29e" fontSize="11">
            {[1, 6, 12, 18, 24, 31].map((day) => (
              <text key={day} x={x(day - 1)} y={height - 5} textAnchor="middle">
                {day}
              </text>
            ))}
          </g>
        </svg>
      </div>
      <div className="mt-3 flex min-w-[1180px] flex-wrap gap-x-5 gap-y-1 text-[10px] text-white/45">
        <span>Left scale: diamonds (clean 50K / 100K scale)</span>
        <span>Right scale: live hours</span>
        <span>Hours are labelled beneath each coloured bar</span>
        <span>October currently through day {currentDays}</span>
      </div>
      <CreatorInsight creator={creator} months={months} />
    </article>
  );
}

function CreatorInsight({
  creator,
  months,
}: {
  creator: Creator;
  months: string[];
}) {
  const rows = months
    .flatMap((month) =>
      (creator.monthly[month] || []).map((day, index) => ({
        ...day,
        month,
        day: index + 1,
      })),
    )
    .filter((day) => day.hours > 0);
  const totalStreams = rows.reduce((total, day) => total + day.streams, 0);
  const averageStreamLength =
    rows.reduce((total, day) => total + day.hours, 0) /
    Math.max(totalStreams, 1);
  const streamLength = (day: (typeof rows)[number]) =>
    day.hours / Math.max(day.streams, 1);
  const longer = rows.filter((day) => streamLength(day) >= averageStreamLength);
  const shorter = rows.filter((day) => streamLength(day) < averageStreamLength);
  const averageRate = (items: typeof rows) =>
    items.reduce(
      (total, day) => total + (day.hours ? day.diamonds / day.hours : 0),
      0,
    ) / Math.max(items.length, 1);
  const longerRate = averageRate(longer);
  const shorterRate = averageRate(shorter);
  const peak = [...rows].sort((a, b) => b.diamonds - a.diamonds)[0];
  const effect =
    longer.length && shorter.length
      ? longerRate > shorterRate * 1.1
        ? `Longer average streams are currently more efficient: ${money(longerRate)} diamonds per hour on ${longer.reduce((total, day) => total + day.streams, 0)} streams, versus ${money(shorterRate)} on ${shorter.reduce((total, day) => total + day.streams, 0)} shorter streams.`
        : shorterRate > longerRate * 1.1
          ? `Shorter average streams are currently more efficient: ${money(shorterRate)} diamonds per hour on ${shorter.reduce((total, day) => total + day.streams, 0)} streams, versus ${money(longerRate)} on ${longer.reduce((total, day) => total + day.streams, 0)} longer streams.`
          : `Live length is not showing a strong difference yet: longer and shorter lives are returning a similar diamonds-per-hour rate.`
      : "There is not enough live-time variation yet to judge whether longer lives are helping.";
  return (
    <section className="mt-5 min-w-[1180px] rounded-2xl border border-yellow-300/20 bg-yellow-300/[.045] p-4">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-yellow-200">
        Performance insight
      </p>
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <p className="text-sm leading-relaxed text-white/70">
          <strong className="text-white">Consistency:</strong> {rows.length}{" "}
          recorded live days across {totalStreams} streams, averaging{" "}
          {averageStreamLength.toFixed(1)} hours per stream.
        </p>
        <p className="text-sm leading-relaxed text-white/70">
          <strong className="text-white">Hours effect:</strong> {effect}
        </p>
        <p className="text-sm leading-relaxed text-white/70">
          <strong className="text-white">Strongest day:</strong>{" "}
          {peak
            ? `${labelMonth(peak.month)} ${peak.day}: ${money(peak.diamonds)} diamonds in ${peak.hours.toFixed(1)} hours.`
            : "No live-day data yet."}
        </p>
      </div>
    </section>
  );
}

function CreatorDetail({
  creator,
  months,
  onClose,
}: {
  creator: Creator;
  months: string[];
  onClose: () => void;
}) {
  const days = months
    .flatMap((month) =>
      (creator.monthly[month] || []).map((day, index) => ({
        ...day,
        month,
        day: index + 1,
        rate: day.hours ? day.diamonds / day.hours : 0,
        streamLength: day.hours / Math.max(day.streams, 1),
      })),
    )
    .filter((day) => day.diamonds > 0 || day.hours > 0);
  const peakDiamonds = [...days]
    .sort((a, b) => b.diamonds - a.diamonds)
    .slice(0, 5);
  const peakRate = [...days]
    .filter((day) => day.hours > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);
  const buckets = [
    [0, 1, "UNDER 1 HOUR"],
    [1, 2, "1–2 HOURS"],
    [2, 3, "2–3 HOURS"],
    [3, 4, "3–4 HOURS"],
    [4, 5, "4–5 HOURS"],
    [5, Infinity, "5+ HOURS"],
  ].map(([minimum, maximum, label]) => {
    const matched = days.filter(
      (day) =>
        day.streamLength >= Number(minimum) &&
        day.streamLength < Number(maximum),
    );
    return {
      label: String(label),
      days: matched.length,
      streams: matched.reduce((total, day) => total + day.streams, 0),
      avgDiamonds: matched.length
        ? matched.reduce((total, day) => total + day.diamonds, 0) /
          matched.length
        : 0,
      avgRate: matched.length
        ? matched.reduce((total, day) => total + day.rate, 0) / matched.length
        : 0,
    };
  });
  const highestSample = Math.max(1, ...buckets.map((bucket) => bucket.days));
  const highestRate = Math.max(1, ...buckets.map((bucket) => bucket.avgRate));
  const bestBucket = [...buckets]
    .filter((bucket) => bucket.days > 0)
    .sort(
      (a, b) =>
        (b.days / highestSample) * 0.7 +
        (b.avgRate / highestRate) * 0.3 -
        ((a.days / highestSample) * 0.7 + (a.avgRate / highestRate) * 0.3),
    )[0];
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${creator.username} performance detail`}
    >
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-yellow-300/30 bg-[#12100b] p-6 shadow-2xl sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-yellow-200">
              Creator performance detail
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-norwester)] text-4xl uppercase">
              @{creator.username}
            </h2>
            <p className="mt-2 text-sm text-white/50">
              {creator.manager} · {creator.group}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-wide text-white/70 hover:border-yellow-300/60 hover:text-yellow-100"
          >
            Close
          </button>
        </div>
        <section className="mt-7 grid gap-4 md:grid-cols-3">
          <DetailMetric
            label="Most reliable average stream-length band"
            value={bestBucket?.label || "No live hours"}
            detail={
              bestBucket
                ? `${bestBucket.streams} streams · ${money(bestBucket.avgRate)} diamonds per hour`
                : ""
            }
          />
          <DetailMetric
            label="Average daily diamonds"
            value={money(
              days.reduce((total, day) => total + day.diamonds, 0) /
                Math.max(days.length, 1),
            )}
            detail="across active days"
          />
          <DetailMetric
            label="Average diamonds per hour"
            value={money(
              days.reduce((total, day) => total + day.diamonds, 0) /
                Math.max(
                  days.reduce((total, day) => total + day.hours, 0),
                  1,
                ),
            )}
            detail="across all recorded live time"
          />
        </section>
        <section className="mt-7 grid gap-6 xl:grid-cols-2">
          <DetailList
            title="Peak diamond days"
            days={peakDiamonds}
            mode="diamonds"
          />
          <DetailList
            title="Best diamonds per hour"
            days={peakRate}
            mode="rate"
          />
        </section>
        <section className="mt-7 rounded-[1.5rem] border border-yellow-300/35 bg-[radial-gradient(circle_at_90%_10%,rgba(250,204,21,.14),transparent_28%),#151108] p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[.24em] text-yellow-200">
            Live length guide
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-norwester)] text-3xl uppercase">
            @{creator.username}
          </h3>
          <p className="mt-2 max-w-3xl text-sm text-white/60">
            This groups each day by its average hours per stream. The guide is
            weighted towards the stream lengths you have used most often, so
            one unusually high battle day cannot outweigh a pattern backed by
            many streams.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {buckets.map((bucket) => (
              <article
                key={bucket.label}
                className={`rounded-xl border p-4 ${bucket.label === bestBucket?.label ? "border-yellow-300/70 bg-yellow-300/15" : "border-white/10 bg-black/25"}`}
              >
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">
                  {bucket.label}
                </p>
                <p className="mt-3 text-2xl font-black text-yellow-100">
                  {money(bucket.avgRate)}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  average diamonds per hour
                </p>
                <div className="mt-4 flex items-end justify-between">
                  <span className="text-sm font-bold text-white">
                    {bucket.streams} stream{bucket.streams === 1 ? "" : "s"}
                  </span>
                  <span className="text-xs text-white/45">
                    {money(bucket.avgDiamonds)} avg diamonds
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
function DetailMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-yellow-100">{value}</p>
      <p className="mt-1 text-xs text-white/45">{detail}</p>
    </article>
  );
}
function DetailList({
  title,
  days,
  mode,
}: {
  title: string;
  days: Array<Day & { month: string; day: number; rate: number }>;
  mode: "diamonds" | "rate";
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <h3 className="font-[family-name:var(--font-norwester)] text-2xl uppercase">
        {title}
      </h3>
      <div className="mt-4 space-y-2">
        {days.map((day) => (
          <div
            key={`${day.month}-${day.day}`}
            className="flex items-center justify-between gap-4 rounded-xl bg-black/20 px-4 py-3 text-sm"
          >
            <span className="font-bold">
              {labelMonth(day.month)} {day.day}
            </span>
            <span className="text-white/60">{day.hours.toFixed(1)}h</span>
            <span className="font-black text-yellow-100">
              {mode === "diamonds"
                ? `${money(day.diamonds)} diamonds`
                : `${money(day.rate)} D/H`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
