"use client";
import ManagerReminders from "./ManagerReminders";
import MorningMessages from "./MorningMessages";
import { chatProfileColour } from "@/lib/chat-profile-colour";
import {
  MANAGER_POSTER_ONLY,
  MANAGER_RESOURCES_ENABLED,
} from "@/lib/manager-portal-mode";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Overview } from "@/lib/manager-overview";
import "./portal.css";
import DailyQuote from "./DailyQuote";
import DevelopmentCreators from "./DevelopmentCreators";
import InactiveCreators from "./InactiveCreators";
import FocusReview from "./FocusReview";
import { GoldBackdrop } from "@/app/components/GoldSpace";
type UnmanagedRecord = {
  id: string;
  username: string;
  managerKey: string;
  reason: "leave-request" | "no-contact" | "away" | "other";
  note?: string;
  hoursAtMove: number;
  createdAt: string;
};
const warmRequests = new Map<
  string,
  { at: number; promise: Promise<any>; value?: any }
>();
export function portalCached(path: string) {
  return warmRequests.get(path)?.value;
}
export async function portalRequest(path: string, body?: unknown) {
  const cacheable =
      body === undefined &&
      [
        "development",
        "agency-development",
        "inactive",
        "agency-inactive",
      ].includes(path),
    cached = warmRequests.get(path);
  if (
    cacheable &&
    cached &&
    (["inactive", "agency-inactive"].includes(path) ||
      Date.now() - cached.at < 90000)
  )
    return cached.promise;
  if (path === "logout") warmRequests.clear();
  const promise = (async () => {
    const r = await fetch("/api/manager-portal/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || "Please try again.");
    return data;
  })();
  if (cacheable) {
    warmRequests.set(path, { at: Date.now(), promise });
    void promise
      .then((value) => {
        const entry = warmRequests.get(path);
        if (entry?.promise === promise) entry.value = value;
      })
      .catch(() => warmRequests.delete(path));
  }
  return promise;
}

export function Picture({ username }: { username: string }) {
  return (
    <span className="manager-picture" aria-label={username}>
      {username.slice(0, 1).toUpperCase()}
      <img
        className="manager-avatar"
        loading="lazy"
        src={
          "/api/star-leaderboard/avatar?username=" +
          encodeURIComponent(username)
        }
        alt=""
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </span>
  );
}
export function PortalShell({
  children,
  name,
  fullAccess = false,
}: {
  children: React.ReactNode;
  name?: string;
  fullAccess?: boolean;
}) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [path]);
  return (
    <div className="manager-shell gold-stage">
      <GoldBackdrop />
      <header className="manager-bar">
        <Link className="manager-brand" href="/manager">
          <b>FIRST CLASS</b> / MANAGERS
        </Link>
        <button
          className="manager-menu-toggle"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="manager-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d={menuOpen ? "M6 6l12 12M6 18L18 6" : "M4 6h16M4 12h16M4 18h16"}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <nav
          id="manager-navigation"
          aria-label="Manager navigation"
          className={"manager-nav" + (menuOpen ? " is-open" : "")}
          onKeyDown={(e) => {
            if (e.key === "Escape") setMenuOpen(false);
          }}
        >
          {[
            ["/manager", "Daily overview"],
            ["/manager/creators", "My creators"],
            ["/manager/posters", "Poster generator"],
            ["/manager/resources", "Resources"],
            ["/manager/leaderboard", "Manager leaderboard"],
          ].map(([href, title]) =>
            (!MANAGER_RESOURCES_ENABLED && href === "/manager/resources") ||
            (MANAGER_POSTER_ONLY &&
              !fullAccess &&
              href !== "/manager/posters") ? (
              <span
                className="manager-nav-disabled"
                key={href}
                aria-disabled="true"
              >
                {title}
              </span>
            ) : (
              <Link
                key={href}
                href={href}
                className={path === href ? "active" : ""}
              >
                {title}
              </Link>
            ),
          )}
          <button
            onClick={async () => {
              try {
                await portalRequest("logout", {});
                location.href = "/login/manager";
              } catch {
                alert("Could not sign out. Please try again.");
              }
            }}
          >
            Sign out
          </button>
        </nav>
      </header>
      <main className="manager-wrap">
        {name && path !== "/manager/posters" && (
          <p className="manager-team-name">{name}</p>
        )}
        {children}
      </main>
    </div>
  );
}
export function Summary({
  data,
  owner = false,
  unmanaged = [],
  onUnmanagedChange,
}: {
  data: Overview;
  owner?: boolean;
  unmanaged?: UnmanagedRecord[];
  onUnmanagedChange?: (records: UnmanagedRecord[]) => void;
}) {
  const [tab, setTab] = useState<
    "today" | "daily" | "inactive" | "graduation" | "mature" | "maintain" | "unmanaged"
  >("today");
  const [morningCount, setMorningCount] = useState<number | null>(null);
  const change = data.previousTotal
      ? (data.total / data.previousTotal - 1) * 100
      : null,
    priorRoster = data.previousRoster.reduce((n, r) => n + r.count, 0),
    delta = data.creators.length - priorRoster;
  return (
    <>
      <div className="review-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "today"}
          onClick={() => setTab("today")}
        >
          Today
        </button>
        <button
          role="tab"
          aria-selected={tab === "daily"}
          onClick={() => setTab("daily")}
        >
          Focus
        </button>
        <button
          role="tab"
          aria-selected={tab === "inactive"}
          onClick={() => setTab("inactive")}
        >
          Inactive creators
        </button>
        <button
          role="tab"
          aria-selected={tab === "graduation"}
          onClick={() => setTab("graduation")}
        >
          Graduation creators
        </button>
        <button
          role="tab"
          aria-selected={tab === "mature"}
          onClick={() => setTab("mature")}
        >
          Mature creators
        </button>
        <button
          role="tab"
          aria-selected={tab === "maintain"}
          onClick={() => setTab("maintain")}
        >
          Maintain / Rank Up
        </button>
        <button
          role="tab"
          aria-selected={tab === "unmanaged"}
          type="button"
          className="unmanaged-tab"
          onClick={() => setTab("unmanaged")}
        >
          Unmanaged <span>View</span>
        </button>
      </div>
      <div className="manager-grid manager-summary-grid">
          {[
            ["Month to date", data.total.toLocaleString("en-GB")],
            [
              "New creators",
              data.newCreatorTotals
                .reduce((s, c) => s + c.count, 0)
                .toLocaleString("en-GB"),
            ],
          ].map(([label, value]) => (
            <div className="manager-card" key={label}>
              <p className="manager-eyebrow">{label}</p>
              <p
                className="manager-metric"
                style={
                  label === "Diamonds vs last month" &&
                  data.comparable &&
                  change !== null
                    ? {
                        color:
                          change > 0
                            ? "#80dca1"
                            : change < 0
                              ? "#fa8c8c"
                              : "#eee",
                      }
                    : undefined
                }
              >
                {label === "Diamonds vs last month" &&
                data.comparable &&
                change !== null
                  ? change > 0
                    ? "▲ "
                    : change < 0
                      ? "▼ "
                      : "— "
                  : ""}
                {value}
              </p>
              {label === "Month to date" &&
                data.comparable &&
                change !== null && (
                  <p
                    style={{
                      color:
                        change > 0
                          ? "#80dca1"
                          : change < 0
                            ? "#fa8c8c"
                            : "#b6b8af",
                      fontWeight: 700,
                    }}
                  >
                    {change > 0 ? "▲ +" : change < 0 ? "▼ " : "— "}
                    {change.toFixed(1)}%
                  </p>
                )}
            </div>
          ))}
          <div className="manager-card">
            <p className="manager-eyebrow">Current roster</p>
            <p className="manager-metric">{data.creators.length}</p>
            {data.previousRosterDate && (
              <p
                style={{
                  color:
                    delta > 0 ? "#80dca1" : delta < 0 ? "#fa8c8c" : "#b6b8af",
                  fontWeight: 700,
                }}
              >
                {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta)}{" "}
                {delta > 0 ? "up" : delta < 0 ? "down" : "change"}
              </p>
            )}
          </div>
          <div className="manager-card">
            <p className="manager-eyebrow">Diamonds from new creators</p>
            <p className="manager-metric">
              {data.newCreatorTotals
                .reduce((s, c) => s + c.diamonds, 0)
                .toLocaleString("en-GB")}
            </p>
          </div>
      </div>
      {tab === "today" && (
        <h2 className="today-reminders-title">Today’s reminders</h2>
      )}
      {tab === "today" && (
        <MorningMessages
          showHeading={false}
          owner={owner}
          managerKeys={
            owner
              ? Array.from(new Set(data.creators.map((c) => c.managerKey)))
              : undefined
          }
          onCount={setMorningCount}
        />
      )}
      {tab === "today" && (
        <ManagerReminders
          owner={owner}
          showToday
          hasProfileUpdates={
            data.creators.some((c) => c.agencyDays === 15) ||
            morningCount === null ||
            morningCount > 0
          }
          managerKeys={
            owner
              ? Array.from(new Set(data.creators.map((c) => c.managerKey)))
              : undefined
          }
        />
      )}
      {(tab === "today" || tab === "daily") &&
        data.creators.some((c) => c.agencyDays === 15) && (
          <section className="profile-update-reminder">
            <div>
              <h2>Profile picture changes</h2>
              <div className="profile-reminder-downloads">
                <span className="profile-picture-reference">
                  <img
                    src="/branding/chat-profiles/blue.png"
                    alt="Blue profile picture"
                  />
                  Blue
                </span>
                <span>→</span>
                <span className="profile-picture-reference">
                  <img
                    src="/branding/chat-profiles/bronze.png"
                    alt="Bronze profile picture"
                  />
                  Bronze
                </span>
              </div>
              <p className="manager-muted">
                These creators have reached day 15. Change their chat profile
                picture from blue to bronze.
              </p>
            </div>
            <div className="profile-update-people">
              {data.creators
                .filter((c) => c.agencyDays === 15)
                .map((c) => (
                  <div key={c.id} className="profile-update-person">
                    <Picture username={c.username} />
                    <div>
                      <strong>@{c.username}</strong>
                      <span className="manager-muted">{c.manager}</span>
                    </div>
                    <span className="profile-update-colours">
                      <i />→<i />
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}
      {tab === "today" ? null : tab === "unmanaged" ? (
        <UnmanagedPanel
          records={unmanaged}
          onChanged={onUnmanagedChange}
          teams={Object.fromEntries(
            data.creators.map((creator) => [
              creator.managerKey,
              creator.manager,
            ]),
          )}
          showTeams={owner}
        />
      ) : tab === "graduation" ||
        tab === "mature" ||
        tab === "maintain" ? (
        <DevelopmentCreators
          owner={owner}
          group={data.filterGroup || ""}
          manager={data.filterManager || ""}
          kind={tab}
        />
      ) : tab === "inactive" ? (
        <InactiveCreators
          owner={owner}
          group={data.filterGroup || ""}
          manager={data.filterManager || ""}
        />
      ) : (
        <section className="daily-focus-floating" style={{ marginTop: 24 }}>
          <p className="manager-eyebrow">
            {data.priorities.length} creators to focus on
          </p>
          <p className="manager-muted" style={{ marginTop: 14 }}>
            Recovery plans · {data.month}
          </p>
          {data.priorities.length ? (
            <FocusReview data={data} />
          ) : (
            <p className="manager-muted" style={{ paddingTop: 24 }}>
              No significant concerns flagged for this team.
            </p>
          )}
        </section>
      )}
    </>
  );
}
export default function Dashboard({
  creators = false,
  owner = false,
  hideQuote = false,
}: {
  creators?: boolean;
  owner?: boolean;
  hideQuote?: boolean;
}) {
  const [source, setData] = useState<Overview | null>(null),
    [group, setGroup] = useState(""),
    [manager, setManager] = useState(""),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [unmanaged, setUnmanaged] = useState<UnmanagedRecord[]>([]);
  useEffect(() => {
    if (owner) {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem("owner-focus-filters") || "{}",
        );
        setGroup(saved.group || "");
        setManager(saved.manager || "");
      } catch {}
    }
  }, [owner]);
  useEffect(() => {
    let active = true;
    portalRequest(owner ? "agency-overview" : "overview")
      .then((d) => {
        if (active) {
          setData(d);
          void portalRequest(
            owner ? "agency-development" : "development",
          ).catch(() => {});
          void portalRequest(owner ? "agency-inactive" : "inactive").catch(
            () => {},
          );
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [owner]);
  useEffect(() => {
    void portalRequest("unmanaged")
      .then((data) => setUnmanaged(data.records || []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!source || !unmanaged.length) return;
    const returned = unmanaged.find((item) => {
      const creator = source.creators.find((creator) => creator.id === item.id);
      return item.reason === "away" && creator && creator.hours > item.hoursAtMove;
    });
    if (!returned) return;
    void portalRequest("unmanaged", { action: "return", id: returned.id })
      .then((data) => setUnmanaged(data.records || []))
      .catch(() => {});
  }, [source, unmanaged]);
  const selected =
    source?.creators.filter(
      (c) =>
        (!group || c.group === group) &&
        (!manager || c.managerKey === manager) &&
        !unmanaged.some((item) => item.id === c.id),
    ) || [];
  const chosen = new Set(selected.map((c) => c.username));
  const total = selected.reduce((s, c) => s + c.diamonds, 0);
  const data = source
    ? {
        ...source,
        filterGroup: group,
        filterManager: manager,
        newCreatorTotals: source.newCreatorTotals.filter(
          (r) =>
            (!group || r.group === group) &&
            (!manager || r.managerKey === manager),
        ),
        previousRoster: source.previousRoster.filter(
          (r) =>
            (!group || r.group === group) &&
            (!manager || r.managerKey === manager),
        ),
        creators: selected,
        total,
        previousTotal: selected.reduce((s, c) => s + c.previousComparable, 0),
        priorities: source.priorities.filter((p) => chosen.has(p.username)),
        topThreeShare: total
          ? Math.round(
              (selected.slice(0, 3).reduce((s, c) => s + c.diamonds, 0) /
                total) *
                100,
            )
          : 0,
      }
    : null;
  return (
    <section>
      {!creators && !hideQuote && (
        <DailyQuote loading={!source && !error} seed={source?.quoteSeed || 0} />
      )}{" "}
      {creators && (
        <div className="manager-hero">
          <h1 className="manager-title">
            {owner ? "All creators" : "My creators"}
          </h1>
          {!source && !error && (
            <div
              className="manager-loading-creators"
              role="status"
              aria-live="polite"
            >
              <span aria-hidden="true" />
              Loading creators…
            </div>
          )}
        </div>
      )}
      {hideQuote && !source && !error && (
        <div className="manager-loading-creators" role="status">
          Loading data…
        </div>
      )}
      {error && <p className="manager-error">{error}</p>}
      {owner && source && (
        <div className="manager-filters">
          <label className="manager-muted">
            Group
            <select
              className="manager-input"
              value={group}
              onChange={(e) => {
                setGroup(e.target.value);
                setManager("");
                sessionStorage.setItem(
                  "owner-focus-filters",
                  JSON.stringify({ group: e.target.value, manager: "" }),
                );
              }}
            >
              <option value="">All First Class groups</option>
              {[...new Set(source.creators.map((c) => c.group))]
                .sort()
                .map((g) => (
                  <option key={g}>{g}</option>
                ))}
            </select>
          </label>
          <label className="manager-muted">
            Manager
            <select
              className="manager-input"
              value={manager}
              onChange={(e) => {
                setManager(e.target.value);
                sessionStorage.setItem(
                  "owner-focus-filters",
                  JSON.stringify({ group, manager: e.target.value }),
                );
              }}
            >
              <option value="">All managers</option>
              {[
                ...new Map(
                  source.creators
                    .filter((c) => !group || c.group === group)
                    .map((c) => [c.managerKey, c.manager]),
                ).entries(),
              ]
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}
      {data &&
        (creators ? (
          <>
            <input
              className="manager-input"
              placeholder="Find a creator…"
              aria-label="Find a creator"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="chat-colour-key">
              <strong>Chat Profile Colour</strong>
              <span className="key-new">
                <img src="/branding/chat-profiles/blue.png" alt="" />
                Under 15 days
              </span>
              <span className="key-bronze">
                <img src="/branding/chat-profiles/bronze.png" alt="" />
                Bronze · ≤100K
              </span>
              <span className="key-silver">
                <img src="/branding/chat-profiles/silver.png" alt="" />
                Silver · 100,001–499,999
              </span>
              <span className="key-gold">
                <img src="/branding/chat-profiles/gold.png" alt="" />
                Gold · 500K+
              </span>
              <small>
                Based on last month · bronze and above require 15+ days
              </small>
            </div>
            <div className="creator-roster" style={{ marginTop: 16 }}>
              {data.creators
                .filter((c) =>
                  c.username.toLowerCase().includes(search.toLowerCase()),
                )
                .map((c, index) => (
                  <article
                    className={
                      "creator-roster-row chat-colour-" +
                      chatProfileColour(c.agencyDays, c.previousDiamonds).key
                    }
                    key={c.id}
                  >
                    <span
                      className="chat-colour-marker"
                      role="img"
                      aria-label={
                        chatProfileColour(c.agencyDays, c.previousDiamonds)
                          .label
                      }
                      title={
                        chatProfileColour(c.agencyDays, c.previousDiamonds)
                          .label
                      }
                    />
                    <span className="creator-roster-rank">{index + 1}</span>
                    <Picture username={c.username} />
                    <div className="creator-roster-name">
                      <h2>@{c.username}</h2>
                      <span>This month</span>
                    </div>
                    <div className="creator-roster-stat main">
                      <span>Diamonds</span>
                      <strong>{c.diamonds.toLocaleString("en-GB")}</strong>
                      <StatTrend
                        current={c.comparedCurrent}
                        previous={c.comparedPrevious}
                        available={
                          c.hasPreviousRecords && data.matchedComparisonDays > 0
                        }
                        partial={!data.comparable}
                      />
                    </div>
                    <div className="creator-roster-stat">
                      <span>LIVE hours</span>
                      <strong>{c.hours.toFixed(1)}</strong>
                      <StatTrend
                        current={c.comparedHours}
                        previous={c.previousHours}
                        available={
                          c.hasPreviousRecords && data.matchedComparisonDays > 0
                        }
                        partial={!data.comparable}
                      />
                    </div>
                    <div className="creator-roster-stat">
                      <span>LIVE days</span>
                      <strong>{c.liveDays}</strong>
                      <StatTrend
                        current={c.comparedLiveDays}
                        previous={c.previousLiveDays}
                        available={
                          c.hasPreviousRecords && data.matchedComparisonDays > 0
                        }
                        partial={!data.comparable}
                      />
                    </div>
                    <div className="creator-roster-actions">
                      <Link
                        className="creator-roster-open"
                        href={
                          (owner
                            ? "/data/creator-review/"
                            : "/manager/creators/") + encodeURIComponent(c.id)
                        }
                      >
                        Overview ↗
                      </Link>
                      <ManageCreator creator={c} onChanged={setUnmanaged} />
                    </div>
                  </article>
                ))}
            </div>
          </>
        ) : (
          <>
            <Summary
              data={data}
              owner={owner}
              unmanaged={unmanaged}
              onUnmanagedChange={setUnmanaged}
            />
          </>
        ))}
    </section>
  );
}

export function ManageCreator({
  creator,
  onChanged,
}: {
  creator: Pick<Overview["creators"][number], "id" | "username" | "managerKey" | "hours">;
  onChanged?: (records: UnmanagedRecord[]) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [showOtherReason, setShowOtherReason] = useState(false);
  const [otherReason, setOtherReason] = useState("");
  function openDialog() {
    const element = dialog.current;
    if (!element) return;
    element.style.setProperty("position", "fixed", "important");
    element.style.setProperty("inset", "50% auto auto 50%", "important");
    element.style.setProperty("margin", "0", "important");
    element.style.setProperty("transform", "translate(-50%, -50%)", "important");
    element.showModal();
  }
  async function move(
    reason: "leave-request" | "no-contact" | "away" | "other",
  ) {
    setBusy(true);
    try {
      const data = await portalRequest("unmanaged", {
        action: "move",
        creator,
        reason,
        note: reason === "other" ? otherReason.trim() : undefined,
      });
      if (onChanged) onChanged(data.records || []);
      else window.location.reload();
      dialog.current?.close();
      setShowOtherReason(false);
      setOtherReason("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="creator-manage-button"
        onClick={openDialog}
      >
        Manage
      </button>
      <dialog
        ref={dialog}
        className="creator-manage-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="creator-manage-dialog-heading">
          <div>
            <p className="manager-eyebrow">Manage creator</p>
            <strong>@{creator.username}</strong>
          </div>
          <button
            type="button"
            className="creator-manage-close"
            aria-label="Close manage options"
            onClick={() => {
              dialog.current?.close();
              setShowOtherReason(false);
              setOtherReason("");
            }}
          >
            ×
          </button>
        </div>
        <div className="creator-manage-options">
        {(
          [
            ["leave-request", "Leave request"],
            ["no-contact", "No contact"],
            ["away", "Away"],
          ] as const
        ).map(([reason, label]) => (
          <button
            key={reason}
            disabled={busy}
            onClick={() => void move(reason)}
          >
            {label}
          </button>
        ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowOtherReason(true)}
          >
            Other reason
          </button>
        </div>
        {showOtherReason && (
          <form
            className="creator-manage-other-reason"
            onSubmit={(event) => {
              event.preventDefault();
              if (otherReason.trim()) void move("other");
            }}
          >
            <label htmlFor={`other-reason-${creator.id}`}>Reason</label>
            <textarea
              id={`other-reason-${creator.id}`}
              value={otherReason}
              autoFocus
              placeholder="Add a short reason…"
              onChange={(event) => setOtherReason(event.target.value)}
              maxLength={500}
            />
            <div>
              <button type="button" onClick={() => setShowOtherReason(false)}>
                Cancel
              </button>
              <button type="submit" disabled={busy || !otherReason.trim()}>
                Move to unmanaged
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
function UnmanagedPanel({
  records,
  onChanged,
  teams,
  showTeams,
}: {
  records: UnmanagedRecord[];
  onChanged?: (records: UnmanagedRecord[]) => void;
  teams: Record<string, string>;
  showTeams: boolean;
}) {
  async function restore(id: string) {
    const data = await portalRequest("unmanaged", { action: "return", id });
    onChanged?.(data.records || []);
  }
  const label = (reason: string) =>
    (
      ({
        "leave-request": "Leave request",
        "no-contact": "No contact",
        away: "Away",
        other: "Other reason",
      }) as Record<string, string>
    )[reason] || reason;
  return (
    <section className="unmanaged-panel" style={{ marginTop: 24 }}>
      <header>
        <div>
          <p className="manager-eyebrow">Unmanaged creators</p>
          <h2>Creators outside the managed pool</h2>
        </div>
      </header>
      {records.length ? (
        records.map((item) => (
          <article key={item.id}>
            <div>
              <strong>@{item.username}</strong>
              <span>{label(item.reason)}</span>
              {item.note && <span>{item.note}</span>}
              {showTeams && <span>Team: {teams[item.managerKey] || item.managerKey}</span>}
            </div>
            <button onClick={() => void restore(item.id)}>
              Return to managed
            </button>
          </article>
        ))
      ) : (
        <p>No creators are currently unmanaged.</p>
      )}
    </section>
  );
}
function StatTrend({
  current,
  previous,
  available,
  partial,
}: {
  current: number;
  previous: number;
  available: boolean;
  partial: boolean;
}) {
  if (!available)
    return (
      <span
        className="creator-stat-trend neutral"
        title="No comparable history available"
      >
        —
      </span>
    );
  const delta = current - previous,
    direction =
      Math.abs(delta) < 0.00001 ? "neutral" : delta > 0 ? "up" : "down",
    label =
      direction === "neutral"
        ? "No change"
        : direction === "up"
          ? "Up"
          : "Down";
  return (
    <span
      className={"creator-stat-trend " + direction}
      title={
        (partial ? "Available matching dates" : "Same point") +
        " last month: " +
        previous.toLocaleString("en-GB", { maximumFractionDigits: 1 })
      }
      aria-label={label + " compared with last month"}
    >
      {direction === "up" ? "▲" : direction === "down" ? "▼" : "—"}{" "}
      {previous > 0
        ? Math.abs((delta / previous) * 100).toFixed(0) + "%"
        : direction === "up"
          ? "Up"
          : "0%"}
    </span>
  );
}
