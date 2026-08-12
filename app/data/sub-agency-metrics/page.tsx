"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type Metric = {
  key: string;
  name: string;
  diamonds: number;
  previousDiamonds: number;
  previousMonthDiamonds: number;
  diamondsChange: number | null;
  totalCreators: number;
  recruits: number;
  recruitDiamonds: number;
  recruitmentContribution: number | null;
  recruitmentGrowth: number | null;
  creatorGrowth: number | null;
  quitCreators: number;
  quitDiamonds: number;
};

type Response = { latestDate: string; month: string; previousMonth: string; metrics: Metric[]; error?: string };

const formatNumber = (value: number | null | undefined) => Math.round(Number.isFinite(Number(value)) ? Number(value) : 0).toLocaleString("en-GB");
const formatPercent = (value: number | null) => value === null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const monthName = (month: string) => month ? new Date(`${month}-01T12:00:00`).toLocaleString("en-GB", { month: "long" }) : "previous month";

const cardBranding: Record<string, { src: string; alt: string; label: string }> = {
  whole: { src: "/branding/first-class-logo-tight.png", alt: "FIRST CLASS AGENCY", label: "WHOLE AGENCY" },
  main: { src: "/branding/first-class-logo-tight.png", alt: "FIRST CLASS AGENCY", label: "MAIN" },
  danJames: { src: "/branding/first-class-logo-tight.png", alt: "FIRST CLASS AGENCY", label: "DAN & JAMES" },
  mikeIndi: { src: "/branding/first-class-logo-tight.png", alt: "FIRST CLASS AGENCY", label: "MIKE & INDI" },
  paradise: { src: "/agency-logos/paradise.png", alt: "PARADISE", label: "PARADISE" },
  respawn: { src: "/agency-logos/respawn.png", alt: "RESPAWN", label: "RESPAWN" },
  trident: { src: "/agency-logos/trident.png", alt: "TRIDENT", label: "TRIDENT" },
  horizon: { src: "/agency-logos/horizon.png", alt: "HORIZON", label: "HORIZON" },
  unassigned: { src: "/branding/first-class-logo-tight.png", alt: "FIRST CLASS AGENCY", label: "UNASSIGNED / LEGACY" },
};

function targetColour(value: number | null) {
  if (value === null || value < 0) return "border-red-400/40 bg-red-400/10 text-red-200";
  if (value < 5) return "border-yellow-300/35 bg-yellow-300/10 text-yellow-100";
  if (value < 10) return "border-orange-300/40 bg-orange-300/10 text-orange-100";
  return "border-emerald-300/40 bg-emerald-300/10 text-emerald-100";
}

export default function SubAgencyMetricsPage() {
  const [data, setData] = useState<Response | null>(null);

  useEffect(() => {
    fetch("/api/data-analysis/sub-agency-metrics", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: Response) => setData(result))
      .catch(() => setData({ latestDate: "", month: "", previousMonth: "", metrics: [], error: "Could not load metrics." }));
  }, []);

  return <DataAccessGuard><main className="min-h-screen bg-[#070604] px-5 py-7 text-white sm:px-8"><div className="mx-auto max-w-7xl">
    <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5"><Link href="/data/menu" className="text-xs font-black uppercase tracking-[.18em] text-yellow-200 transition hover:text-white">← Data Space</Link><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/45">Live Manager Assignments</p></nav>
    <header className="mt-10"><p className="text-xs font-black uppercase tracking-[.28em] text-yellow-200">First Class Agency</p><h1 className="mt-3 font-[family-name:var(--font-norwester)] text-4xl uppercase sm:text-6xl">Agency Diamond <span className="text-yellow-300">Metrics</span></h1><p className="mt-4 max-w-3xl text-sm uppercase leading-relaxed text-white/60">Month-to-date diamonds and recruitment contribution, grouped by the current Manager Assignments. The Unassigned / Legacy card keeps the displayed breakdown reconciled to Whole Agency.</p></header>
    {!data ? <p className="mt-12 text-sm font-black uppercase tracking-widest text-yellow-100">Loading metrics…</p> : data.error ? <p className="mt-12 rounded-2xl border border-red-300/25 bg-red-500/10 p-5 text-sm font-bold text-red-100">{data.error}</p> : <>
      <div className="mt-8 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[.15em]"><span className="rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-2 text-yellow-100">{data.month} MTD through {data.latestDate}</span><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-white/55">Comparison: {data.previousMonth}, same elapsed days</span></div>
      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{data.metrics.filter((metric) => metric.key !== "unassigned").map((metric) => { const brand = cardBranding[metric.key]; const diamondsPerCreator = metric.totalCreators ? metric.diamonds / metric.totalCreators : 0; return <article key={metric.key} className="rounded-3xl border border-yellow-300/20 bg-gradient-to-br from-yellow-300/[.09] via-white/[.035] to-transparent p-5 shadow-xl shadow-black/20"><header className="border-b border-white/10 pb-5 text-center"><div className="flex h-20 items-center justify-center"><Image src={brand.src} alt={brand.alt} width={320} height={120} className="h-full w-auto max-w-full object-contain" /></div><h2 className="mt-3 font-[family-name:var(--font-norwester)] text-2xl uppercase leading-tight text-yellow-100">{brand.label}</h2></header><div className="mt-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/45">Diamonds this month</p><p className="mt-1 text-3xl font-black tracking-tight text-white">{formatNumber(metric.diamonds)}</p><p className={`mt-1 text-xs font-black uppercase ${metric.diamondsChange !== null && metric.diamondsChange < 0 ? "text-red-300" : "text-emerald-300"}`}>{formatPercent(metric.diamondsChange)} <span className="text-white/40">vs same time last month</span></p></div><dl className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm"><MetricLine label="Total creators" value={formatNumber(metric.totalCreators)} /><MetricLine label="Diamonds per creator" value={formatNumber(diamondsPerCreator)} /><MetricLine label="Recruits this month" value={formatNumber(metric.recruits)} /><MetricLine label="Diamonds from recruits" value={formatNumber(metric.recruitDiamonds)} /><MetricLine label="Growth from recruitment" value={formatPercent(metric.recruitmentGrowth)} detail="of last month's total" /><MetricLine label="Diamonds lost through quits" value={formatNumber(metric.quitDiamonds)} detail={`${formatNumber(metric.quitCreators)} creators · last snapshot`} /></dl><div className="mt-5 grid gap-2 border-t border-white/10 pt-4"><TargetLine label="Recruitment growth" value={metric.recruitmentGrowth} detail={`Based on ${monthName(data.previousMonth)}'s total diamonds`} /><TargetLine label="Creator growth" value={metric.creatorGrowth} detail="Diamond movement from last month's creators" /></div></article>; })}</section>
    </>}
  </div></main></DataAccessGuard>;
}

function TargetLine({ label, value, detail }: { label: string; value: number | null; detail: string }) {
  return <div className={`rounded-xl border px-3 py-2 ${targetColour(value)}`}><div className="flex items-baseline justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-[.12em]">{label}</p><p className="text-sm font-black">{formatPercent(value)}</p></div><p className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-75">{detail}</p></div>;
}

function MetricLine({ label, value, detail }: { label: string; value: string; detail?: string }) {
  if (label === "Growth from recruitment") return null;
  return <div className="flex items-baseline justify-between gap-3"><dt className="text-xs font-bold uppercase text-white/55">{label}{detail ? <span className="block text-[9px] uppercase tracking-wide text-white/35">{detail}</span> : null}</dt><dd className="text-right font-black text-yellow-100">{value}</dd></div>;
}
