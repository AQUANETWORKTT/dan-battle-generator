"use client";
import MasterCreatorNotes from '@/app/data/our-team/MasterCreatorNotes';
import { useEffect, useState } from "react";
import Link from "next/link";
import { ManageCreator, Picture, portalRequest } from "./Portal";
type Progress = {
  target: number;
  progress: number;
  remaining: number;
  dailyNeeded: number;
  status: string;
  done: boolean;
  behind: boolean;
};
type Creator = {
  rankUp?: Progress | null;
  rankUpOnly?: boolean;
  id: string;
  username: string;
  manager: string;
  managerKey: string;
  group: string;
  diamonds: number;
  previousDiamonds: number;
  target: number;
  progress: number;
  remaining: number;
  dailyNeeded: number;
  status: string;
  behind: boolean;
  done: boolean;
  tier?: number;
  daysNeeded?: number;
  hoursNeeded?: number;
  hours: number;
  nextTarget?: number | null;
};
export default function DevelopmentCreators({
  owner,
  group,
  manager,
  kind,
}: {
  owner: boolean;
  group: string;
  manager: string;
  kind: "graduation" | "mature" | "maintain";
}) {
  const [data, setData] = useState<{
      graduation: Creator[];
      mature: Creator[];
      maintain: Creator[];
    } | null>(null),
    [error, setError] = useState(""),
    [page, setPage] = useState(0),
    [rankedOpen, setRankedOpen] = useState(false),
    [sort, setSort] = useState<"progress" | "diamonds">("progress");
  useEffect(() => {
    let alive = true;
    portalRequest(owner ? "agency-development" : "development")
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [owner]);
  useEffect(() => setPage(0), [group, manager, kind, sort]);
  const filtered = (data?.[kind] || []).filter(
    (c) =>
      (!group || c.group === group) && (!manager || c.managerKey === manager),
  );
  const fullyRanked = (creator: Creator) =>
    kind === "maintain" &&
    creator.progress >= 100 &&
    (!creator.rankUp || creator.rankUp.progress >= 100);
  const rankedUp = filtered
    .filter(fullyRanked)
    .sort((a, b) => b.diamonds - a.diamonds);
  const progressForSort = (creator: Creator) =>
    kind === "maintain" && creator.progress >= 100 && creator.rankUp
      ? creator.rankUp.progress
      : creator.progress;
  const diamondsToNextTarget = (creator: Creator) =>
    kind === "maintain" && creator.progress >= 100 && creator.rankUp
      ? creator.rankUp.remaining
      : creator.remaining;
  const rows = filtered
      .filter((c) => !fullyRanked(c))
      .sort(
        (a, b) =>
          (sort === "diamonds"
            ? diamondsToNextTarget(a) - diamondsToNextTarget(b)
            : progressForSort(b) - progressForSort(a)) ||
          b.progress - a.progress ||
          b.diamonds - a.diamonds,
      ),
    pages = Math.max(1, Math.ceil(rows.length / 10));
  return (
    <section className="development-floating" style={{ marginTop: 24 }}>
      <h2 className="manager-focus-toggle">
        {kind === "maintain"
          ? "Maintain / Rank Up"
          : kind === "mature"
            ? "Mature creators"
            : "Graduation creators"}
        {data ? " · " + rows.length : ""}
      </h2>
      {kind === "maintain" && rankedUp.length > 0 && (
        <section className="ranked-up-section">
          <button
            type="button"
            onClick={() => setRankedOpen((value) => !value)}
            aria-expanded={rankedOpen}
          >
            Ranked Up Creators <span>{rankedUp.length}</span>
            <b>{rankedOpen ? "⌃" : "⌄"}</b>
          </button>
          {rankedOpen && (
            <div>
              {rankedUp.map((c) => (
                <article className="ranked-up-person" key={c.id}>
                  <Picture username={c.username} />
                  <div>
                    <strong>@{c.username}</strong>
                    <small>{c.manager}</small>
                  </div>
                  <span className="ranked-up-diamonds">{c.diamonds.toLocaleString("en-GB")} diamonds</span>
                  {owner&&<MasterCreatorNotes creatorId={c.id} username={c.username}/>}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      <div className="development-sort-row">
        <p className="manager-muted">
          {sort === "progress"
            ? "Highest percentage progress toward the next target first."
            : "Fewest diamonds left to the next target first."}
        </p>
        <label>
          Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value as "progress" | "diamonds")}>
            <option value="progress">Progress</option>
            <option value="diamonds">Diamonds to next target</option>
          </select>
        </label>
      </div>
      {!data && !error && (
        <div role="status" className="manager-loading-creators">
          Preparing latest creator progress…
        </div>
      )}
      {error && <p className="manager-error">{error}</p>}
      {rows.slice(page * 10, page * 10 + 10).map((c) => (
        <article className="development-person" key={c.id}>
          <div className="focus-person-heading">
            <Picture username={c.username} />
            <div>
              <h3>@{c.username}</h3>
              <p className="manager-muted">
                {c.manager}
                {c.tier ? <span className={`creator-tier-pill tier-${c.tier}`}>Tier {c.tier}</span> : null}
              </p>
            </div>
            <span
              className={
                "development-status " + (c.behind ? "behind" : "ontrack")
              }
            >
              {c.status}
            </span>
          </div>
          <div className="development-numbers">
            <div>
              <small>Diamonds this month</small>
              <strong>{c.diamonds.toLocaleString("en-GB")}</strong>
            </div>
            <div>
              <small>
                {kind === "graduation"
                  ? "Graduation target"
                  : c.rankUpOnly && kind === "maintain"
                    ? "Rank-up target"
                    : "Maintain target"}
              </small>
              <strong>{c.target.toLocaleString("en-GB")}</strong>
            </div>
            <div>
              <small>Still needed</small>
              <strong>{c.remaining.toLocaleString("en-GB")}</strong>
            </div>
          </div>
          <ProgressBar
            label={
              kind === "graduation"
                ? "Graduate"
                : kind === "maintain" && c.rankUpOnly
                  ? "Rank up · 100,000"
                  : "Maintain"
            }
            p={c}
          />
          {kind === "maintain" && !c.rankUpOnly && (
            <>
              {c.rankUp ? (
                <ProgressBar
                  label={"Rank up · " + c.rankUp.target.toLocaleString("en-GB")}
                  p={c.rankUp}
                  rankUp
                />
              ) : (
                <p className="manager-muted">Highest tier</p>
              )}
            </>
          )}
          {kind !== "graduation" && (
            <div className="development-requirements">
              <span>
                <strong>{c.daysNeeded || 0}</strong> LIVE days left
              </span>
              <span>
                <strong>{(c.hoursNeeded || 0).toFixed(1)}</strong> LIVE hours
                left
              </span>
            </div>
          )}
          {
            <div className="development-actions">
              <Link
                className="development-overview"
                href={
                  (owner ? "/data/creator-review/" : "/manager/creators/") +
                  encodeURIComponent(c.id)
                }
                aria-label={"Overview for @" + c.username}
              >
                Overview ↗
              </Link>
              <ManageCreator creator={c} />
            </div>
          }
          {owner&&<MasterCreatorNotes creatorId={c.id} username={c.username}/>}
        </article>
      ))}
      {data && !rows.length && (
        <p className="manager-muted" style={{ marginTop: 20 }}>
          No creators currently need progress in this tracker.
        </p>
      )}
      {pages > 1 && (
        <div className="focus-pagination">
          <button disabled={!page} onClick={() => setPage(page - 1)}>
            ← Previous
          </button>
          <span>
            {page + 1} / {pages}
          </span>
          <button
            disabled={page >= pages - 1}
            onClick={() => setPage(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}

function ProgressBar({
  label,
  p,
  rankUp = false,
}: {
  label: string;
  p: Progress;
  rankUp?: boolean;
}) {
  return (
    <div
      className={
        "development-track " +
        (rankUp ? "rank-up" : p.behind ? "needs-focus" : "maintain")
      }
    >
      <div className="development-track-heading">
        <span>{label}</span>
        <strong>{Math.round(p.progress)}%</strong>
      </div>
      <div
        className="development-bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(p.progress)}
      >
        <span style={{ width: p.progress + "%" }} />
      </div>
      <div className="development-track-footer">
        <span>{p.remaining.toLocaleString("en-GB")} left</span>
        <strong>
          {p.done
            ? "Complete"
            : p.dailyNeeded.toLocaleString("en-GB") + " diamonds/day"}
        </strong>
      </div>
    </div>
  );
}
