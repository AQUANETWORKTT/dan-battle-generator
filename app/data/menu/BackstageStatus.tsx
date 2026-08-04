"use client";

import { useEffect, useState } from "react";

function expectedBackstageDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export default function BackstageStatus() {
  const [latestDate, setLatestDate] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/data-analysis/upload-status?latest=true", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setLatestDate(data?.latestDate || ""))
      .catch(() => setLatestDate(""));
  }, []);

  const updated = latestDate === expectedBackstageDate();
  return <div className={`mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 ${updated ? "border-emerald-300/35 bg-emerald-300/10" : "border-red-300/40 bg-red-300/10"}`}>
    <span className={`text-xs font-black uppercase tracking-[0.18em] ${updated ? "text-emerald-200" : "text-red-200"}`}>BACKSTAGE STATUS: {latestDate === null ? "CHECKING" : updated ? "UPDATED" : "NOT UPDATED"}</span>
    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">{latestDate ? `LATEST DATA: ${latestDate}` : ""}</span>
  </div>;
}
