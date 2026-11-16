"use client";

import { useEffect, useMemo, useState } from "react";
import { incrementalTargets } from "@/lib/incremental-targets";

type Entry = { day: number; diamonds: number; prediction: number };
type Data = { entries?: Entry[]; agencyTarget?: number };

export default function IncrementalPreview() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
  useEffect(() => {
    let active = true;
    fetch(`/api/data/incremental-tracking?month=${month}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw Error();
        return response.json();
      })
      .then((result) => active && setData(result))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [month]);
  const detail = useMemo(() => {
    const entry = data?.entries?.at(-1);
    if (!entry || !data?.agencyTarget) return null;
    const [year, monthNumber] = month.split("-").map(Number);
    const targets = incrementalTargets(
      data.agencyTarget,
      new Date(year, monthNumber, 0).getDate(),
      entry.day,
    );
    const index = Math.max(
      0,
      targets.reduce(
        (reached, target, targetIndex) =>
          entry.diamonds >= target.dayTarget ? targetIndex : reached,
        -1,
      ),
    );
    const current = targets[index],
      next = targets[index + 1] || null,
      start = current?.dayTarget || 0;
    return {
      previous: index ? targets[index - 1] : null,
      current,
      next,
      progress: next
        ? Math.max(
            0,
            Math.min(
              100,
              ((entry.diamonds - start) / Math.max(1, next.dayTarget - start)) *
                100,
            ),
          )
        : 100,
    };
  }, [data, month]);
  return (
    <section className="manager-card agency-prediction-summary">
      <p className="manager-eyebrow">Agency incremental prediction</p>
      {!detail ? (
        <p className="manager-metric" role="status">
          {error ? "Unavailable" : "Loading prediction…"}
        </p>
      ) : (
        <>
          <p className="manager-metric mt-3 text-yellow-200">
            {detail.current.label}
          </p>
          <div className="mt-4">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-white/55">
              <span>Progress to {detail.next?.label || "top level"}</span>
              <span>
                {detail.next ? `${detail.progress.toFixed(0)}%` : "Complete"}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/45">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-200 transition-[width] duration-500"
                style={{ width: `${detail.progress}%` }}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
