"use client";
import {appLinkDue,appLinkCompleted as isAppLinkCompleted,appLinkTaskId} from "@/lib/app-link-reminder";
import MasterCreatorNotes from '@/app/data/our-team/MasterCreatorNotes';
import DecliningCreators from '@/app/data/our-team/DecliningCreators';
import ActivityTracker from "./ActivityTracker";
import {managerPageFetch,clearManagerPageData} from "@/lib/manager-page-data";
import ManagerReminders from "./ManagerReminders";
import ManagerNotes from "./ManagerNotes";
import MorningMessages from "./MorningMessages";
import AppLinkReminder from "./AppLinkReminder";
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
type TaskRecord = { id: string; managerKey: string; completed: boolean };
type CustomTask = {
  id: string;
  text: string;
  completed: boolean;
  scope?: "manager" | "master";
  managerKey?: string;
};
type PortalOverview = Overview & {
  executiveKey?: string;
  juniorManagerKeys?: string[];
};
const overviewVersions = new Map<string,string>();
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
        "overview",
        "agency-overview",
        "leaderboard",
        "development",
        "agency-development",
        "inactive",
        "agency-inactive",
      ].includes(path),
    cached = warmRequests.get(path);
  if (cacheable && cached)
    return cached.promise;
  if (path === "logout") {warmRequests.clear();overviewVersions.clear();clearManagerPageData();}
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
    if ((path === "overview" || path === "agency-overview") && data.snapshotVersion) {
      if (overviewVersions.get(path) !== data.snapshotVersion) {
        // A replaced upload can keep the same date. Compare snapshot versions,
        // not dates, before reusing previously opened progress/inactive tabs.
        const prefix = path === "agency-overview" ? "agency-" : "";
        warmRequests.delete(prefix + "development");
        warmRequests.delete(prefix + "inactive");
        warmRequests.delete("leaderboard");
        clearManagerPageData();
        overviewVersions.set(path, data.snapshotVersion);
      }
    }
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
  role,
  fullAccess = false,
}: {
  children: React.ReactNode;
  name?: string;
  role?: "owner" | "executive" | "junior" | "senior";
  fullAccess?: boolean;
}) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [path]);
  useEffect(() => {
    if (!fullAccess) return;
    let active=true;
    // Start with the same overview used by Daily Overview and My Creators.
    // Only warm after its revision has cleared any previous page results.
    void portalRequest("overview").then(()=>{
      if(!active)return;
      for(const section of ["development","inactive","leaderboard"])
        void portalRequest(section).catch(()=>{});
      void managerPageFetch("/api/poster-generator/templates").catch(()=>{});
    }).catch(()=>{});
    return()=>{active=false;};
  },[fullAccess,name]);
  return (
    <div className="manager-shell gold-stage">
      <ActivityTracker enabled={Boolean(name)} />
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
          <p className="manager-team-name">
            {name.replace(/^Team\s+/i, "")}{" "}
            <span
              className={
                role === "junior" ? "manager-role junior" : "manager-role"
              }
            >
              —{" "}
              {role === "owner"
                ? "Owner / Head of Operations"
                : role === "executive"
                  ? "Executive manager"
                  : role === "junior"
                    ? "Junior manager"
                    : "Senior manager"}
            </span>
          </p>
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
    | "today"
    | "daily"
    | "inactive"
    | "graduation"
    | "mature"
    | "maintain"
    | "unmanaged"
    | "master-tasks"
  >("today");
  const [morningTasks, setMorningTasks] = useState<{
    total: number;
    completed: number;
  } | null>(null);
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>([]);
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [londonDate, setLondonDate] = useState("");
  const executiveKey = (data as PortalOverview).executiveKey;
  const managerOptions = Array.from(
    new Map(
      data.creators.map((creator) => [creator.managerKey, creator.manager]),
    ),
  )
    .map(([key, name]) => ({ key, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const change = data.previousTotal
      ? (data.total / data.previousTotal - 1) * 100
      : null,
    priorRoster = data.previousRoster.reduce((n, r) => n + r.count, 0),
    delta = data.creators.length - priorRoster,
    profileCreators = data.creators.filter(
      (creator) => creator.agencyDays === 15,
    ),
    appLinkCreators = data.creators.filter(appLinkDue),
    profileCompleted = profileCreators.filter((creator) =>
      taskRecords.some(
        (task) =>
          task.id === `profile:${data.month}:${creator.id}` &&
          task.managerKey === creator.managerKey &&
          task.completed,
      ),
    ).length,
    appLinkCompleted = appLinkCreators.filter((creator) =>
      isAppLinkCompleted(creator,taskRecords),
    ).length,
    taskTotal =
      (morningTasks?.total || 0) +
      profileCreators.length +
      appLinkCreators.length +
      customTasks.length,
    taskCompleted =
      (morningTasks?.completed || 0) +
      profileCompleted +
      appLinkCompleted +
      customTasks.filter((task) => task.completed).length;
  useEffect(() => {
    void fetch("/api/manager-tasks", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        setTaskRecords(result.records || []);
        setCustomTasks(result.customTasks || []);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    setLondonDate(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/London",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    );
  }, []);
  const londonWeekday = londonDate
    ? new Date(`${londonDate}T12:00:00Z`).getUTCDay()
    : null;
  async function toggleTask(
    creator: Overview["creators"][number],
    kind: "profile" | "app-link",
  ) {
    const id = kind === "app-link" ? appLinkTaskId(creator) : `${kind}:${data.month}:${creator.id}`;
    const current = kind === "app-link" ? isAppLinkCompleted(creator,taskRecords) : taskRecords.some(
      (task) =>
        task.id === id &&
        task.managerKey === creator.managerKey &&
        task.completed,
    );
    const completed = !current;
    setTaskRecords((records) => [
      ...records.filter(
        (task) => !(task.id === id && task.managerKey === creator.managerKey),
      ),
      { id, managerKey: creator.managerKey, completed },
    ]);
    try {
      const response = await fetch("/api/manager-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, managerKey: creator.managerKey, completed }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Could not save task.");
      setTaskRecords(result.records || []);
    } catch {
      setTaskRecords((records) => [
        ...records.filter(
          (task) => !(task.id === id && task.managerKey === creator.managerKey),
        ),
        { id, managerKey: creator.managerKey, completed: current },
      ]);
    }
  }
  async function addCustomTask() {
    const text = window.prompt(
      owner ? "Add a Master Portal task" : "Add a task",
    );
    if (!text?.trim()) return;
    let managerKey: string | undefined;
    if (owner) {
      const selected = window.prompt(
        `Assign this task to:\n${managerOptions.map((manager) => manager.name.replace(/^Team\s+/i, "")).join("\n")}`,
      );
      const match = managerOptions.find(
        (manager) =>
          manager.name.replace(/^Team\s+/i, "").toLowerCase() ===
          selected
            ?.trim()
            .replace(/^Team\s+/i, "")
            .toLowerCase(),
      );
      if (!match) return window.alert("Choose a manager from the list.");
      managerKey = match.key;
    }
    const response = await fetch("/api/manager-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create-custom",
        text,
        ...(managerKey ? { managerKey } : {}),
      }),
    });
    const result = await response.json();
    if (!response.ok)
      return window.alert(result.error || "Could not add task.");
    setTaskRecords(result.records || []);
    setCustomTasks(result.customTasks || []);
  }
  async function toggleCustomTask(task: CustomTask) {
    const completed = !task.completed;
    setCustomTasks((tasks) =>
      tasks.map((item) =>
        item.id === task.id ? { ...item, completed } : item,
      ),
    );
    try {
      const response = await fetch("/api/manager-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-custom",
          id: task.id,
          completed,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Could not save task.");
      setTaskRecords(result.records || []);
      setCustomTasks(result.customTasks || []);
    } catch {
      setCustomTasks((tasks) =>
        tasks.map((item) =>
          item.id === task.id ? { ...item, completed: task.completed } : item,
        ),
      );
    }
  }
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
      {tab === "today" && (
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
            <p className="manager-eyebrow">Managed creators</p>
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
      )}
      {tab === "today" && (
        <div className="today-tasks-heading">
          <h2 className="today-reminders-title">Today’s tasks</h2>
          {morningTasks !== null && (
            <div className="today-task-actions">
              <p
                className="today-task-count"
                style={
                  taskTotal > 0 && taskCompleted === taskTotal
                    ? {
                        color: "#9de7bd",
                        borderColor: "#72c9a266",
                        background: "#173a2926",
                      }
                    : undefined
                }
              >
                {taskCompleted} / {taskTotal} completed
              </p>
              <button type="button" onClick={() => void addCustomTask()}>
                + Add task
              </button>
              {owner && (
                <button type="button" onClick={() => setTab("master-tasks")}>
                  View tasks
                </button>
              )}
            </div>
          )}
        </div>
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
          onCount={setMorningTasks}
        />
      )}
      {tab === "master-tasks" && owner && (
        <MasterTaskSummary data={data} onBack={() => setTab("today")} />
      )}
      {tab === "today" && (
        <ManagerReminders
          owner={owner}
          showToday
          hasProfileUpdates={
            data.creators.some((c) => c.agencyDays === 15) ||
            morningTasks === null ||
            morningTasks.total > 0
          }
          managerKeys={
            owner
              ? Array.from(new Set(data.creators.map((c) => c.managerKey)))
              : undefined
          }
        />
      )}
      {tab === "today" && customTasks.length > 0 && (
        <section className="manager-card" style={{ marginTop: 20 }}>
          <p className="manager-eyebrow">
            {owner ? "Master Portal tasks" : "My tasks"}
          </p>
          {customTasks.map((task) => (
            <label
              key={task.id}
              className="morning-complete"
              style={{
                justifyContent: "space-between",
                width: "100%",
                padding: "12px 0",
                borderTop: "1px solid #ffffff14",
              }}
            >
              <span
                style={{
                  textDecoration: task.completed ? "line-through" : undefined,
                  opacity: task.completed ? 0.6 : 1,
                }}
              >
                {task.text}
                {owner && task.managerKey && (
                  <small
                    className="manager-muted"
                    style={{ display: "block", marginTop: 4 }}
                  >
                    {managerOptions
                      .find((manager) => manager.key === task.managerKey)
                      ?.name.replace(/^Team\s+/i, "") || "Manager"}
                  </small>
                )}
              </span>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => void toggleCustomTask(task)}
              />
            </label>
          ))}
        </section>
      )}
      {tab === "today" && londonWeekday === 1 && (
        <section className="manager-card recurring-reminder">
          <p className="manager-eyebrow">Weekly reminder</p>
          <h2>Monday morning motivational message</h2>
          <p className="manager-muted">
            Send your Monday morning motivational message to your creators.
          </p>
        </section>
      )}
      {tab === "today" && londonWeekday === 2 && (
        <section className="manager-card recurring-reminder">
          <p className="manager-eyebrow">Tuesday progress review</p>
          <h2>Review creator progress</h2>
          <p className="manager-muted">
            Review your graduation and mature creators, check their progress,
            and plan the next steps to help them reach their targets.
          </p>
        </section>
      )}
      {tab === "today" && data.creators.some((c) => c.agencyDays === 15) && (
        <section className="profile-update-reminder profile-update-compact">
          <div>
            <h2>Profile picture changes</h2>
            <p className="manager-muted">Profile picture changes</p>
          </div>
          <div className="profile-update-people">
            {data.creators
              .filter((c) => c.agencyDays === 15)
              .map((c) => (
                <div
                  key={c.id}
                  className={
                    "profile-update-person" +
                    (taskRecords.some(
                      (task) =>
                        task.id === `profile:${data.month}:${c.id}` &&
                        task.managerKey === c.managerKey &&
                        task.completed,
                    )
                      ? " completed"
                      : "") +
                    (executiveKey && executiveKey !== c.managerKey
                      ? " junior-task"
                      : "")
                  }
                >
                  <Picture username={c.username} />
                  <div>
                    <div className="profile-update-name-row">
                      <strong>@{c.username}</strong>
                    </div>
                    <span className="manager-muted">
                      {executiveKey && executiveKey !== c.managerKey
                        ? `Junior manager · ${c.manager.replace(/^Team\s+/i, "")}`
                        : c.manager}
                    </span>
                  </div>
                  <span
                    className="profile-picture-change"
                    aria-label="Change blue profile picture to bronze"
                  >
                    <img
                      src="/branding/chat-profiles/blue.png"
                      alt="Blue profile picture"
                    />
                    <span>→</span>
                    <img
                      src="/branding/chat-profiles/bronze.png"
                      alt="Bronze profile picture"
                    />
                  </span>
                  <label className="morning-complete">
                    <span>Done</span>
                    <input
                      type="checkbox"
                      checked={taskRecords.some(
                        (task) =>
                          task.id === `profile:${data.month}:${c.id}` &&
                          task.managerKey === c.managerKey &&
                          task.completed,
                      )}
                      onChange={() => void toggleTask(c, "profile")}
                    />
                  </label>
                </div>
              ))}
          </div>
        </section>
      )}
      {tab === "today" && londonDate.endsWith("-01") && (
        <section className="profile-update-reminder profile-update-compact">
          <div>
            <h2>Monthly profile picture review</h2>
            <p className="manager-muted">
              Use last month’s diamonds to check each established creator’s new
              chat profile category.
            </p>
          </div>
          <div className="profile-update-people">
            {data.creators
              .filter((creator) => (creator.agencyDays || 0) >= 15)
              .map((creator) => (
                <div key={creator.id} className="profile-update-person">
                  <div>
                    <strong>@{creator.username}</strong>
                    <span className="manager-muted">
                      {
                        chatProfileColour(
                          creator.agencyDays,
                          creator.previousDiamonds,
                        ).label
                      }
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
      {tab === "today" && (
        <AppLinkReminder
          creators={data.creators}
          month={data.month}
          records={taskRecords}
          executiveKey={executiveKey}
          showManager={owner}
          onToggle={(creator) => {
            const fullCreator = data.creators.find(
              (item) => item.id === creator.id,
            );
            if (fullCreator) void toggleTask(fullCreator, "app-link");
          }}
        />
      )}
      {tab === "today" && !owner && <ManagerNotes />}
      {tab === "today" || tab === "master-tasks" ? null : tab ===
        "unmanaged" ? (
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
      ) : tab === "graduation" || tab === "mature" || tab === "maintain" ? (
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
function MasterTaskSummary({
  data,
  onBack,
}: {
  data: Overview;
  onBack: () => void;
}) {
  const [morning, setMorning] = useState<
    Array<{
      id: string;
      username: string;
      manager: string;
      managerKey: string;
      completed: boolean;
    }>
  >([]);
  const [saved, setSaved] = useState<TaskRecord[]>([]);
  const [customSummary,setCustomSummary]=useState<Array<CustomTask & {completedAt?:string}>>([]);
  const [managers, setManagers] = useState<
    Array<{ key: string; name: string; group: string }>
  >([]);
  const [loaded, setLoaded] = useState(false);
  const [summaryData,setSummaryData]=useState<Overview|null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/morning-messages?scope=owner&summary=1", { cache: "no-store" }).then(
        (response) => response.json(),
      ),
      fetch("/api/manager-tasks?summary=1", { cache: "no-store" }).then((response) =>
        response.json(),
      ),
      fetch("/api/data-analysis/manager-assignments", {
        cache: "no-store",
      }).then((response) => response.json()),
      portalRequest("agency-overview?allManagers=1"),
    ])
      .then(([messages, tasks, assignments, allManagers]) => {
        if (!active) return;
        setSummaryData(allManagers);
        setMorning(messages.items || []);
        setSaved(tasks.records || []);
        setCustomSummary(tasks.customTasks || []);
        setManagers(
          (assignments.managers || []).filter(
            (manager: { group: string }) =>
              manager.group === "Team Dan / James" || manager.group === "Team Mike / Indi",
          ),
        );
        setLoaded(true);
      })
      .catch(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, []);
  if (!loaded) return <p className="manager-muted">Loading task summary…</p>;
  const team = new Map<
    string,
    { name: string; completed: number; groups: Record<string, string[]> }
  >();
  managers.forEach((manager) =>
    team.set(manager.key, { name: manager.name, completed: 0, groups: {} }),
  );
  const register = (
    managerKey: string,
    manager: string,
    group: string,
    label: string,
    completed: boolean,
  ) => {
    const entry = team.get(managerKey) || {
      name: manager,
      completed: 0,
      groups: {},
    };
    if (completed) entry.completed += 1;
    else (entry.groups[group] ||= []).push(label);
    team.set(managerKey, entry);
  };
  morning.forEach((item) =>
    register(
      item.managerKey,
      item.manager,
      "Morning messages",
      `@${item.username}`,
      item.completed,
    ),
  );
  (summaryData||data).creators
    .filter((creator) => creator.agencyDays === 15)
    .forEach((creator) =>
      register(
        creator.managerKey,
        creator.manager,
        "Change profile picture",
        `@${creator.username}`,
        saved.some(
          (task) =>
            task.id === `profile:${(summaryData||data).month}:${creator.id}` &&
            task.managerKey === creator.managerKey &&
            task.completed,
        ),
      ),
    );
  (summaryData||data).creators
    .filter(appLinkDue)
    .forEach((creator) =>
      register(
        creator.managerKey,
        creator.manager,
        "Send First Class app link",
        `@${creator.username}`,
        isAppLinkCompleted(creator,saved),
      ),
    );
  const todayKey=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  customSummary.forEach(task=>{
    if(!task.managerKey||!team.has(task.managerKey))return;
    if(task.completed&&task.completedAt&&new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(task.completedAt))!==todayKey)return;
    register(task.managerKey,team.get(task.managerKey)!.name,'Other tasks',task.text,task.completed);
  });
  const entries = [...team.entries()]
    .filter(([, entry]) => entry.completed + Object.values(entry.groups).flat().length > 0)
    .sort(([, a], [, b]) => a.name.localeCompare(b.name));
  return (
    <section className="master-task-summary">
      <header>
        <div>
          <p className="manager-eyebrow">Master Portal</p>
          <h2>Manager task summary</h2>
        </div>
        <button type="button" onClick={onBack}>
          ← Today’s tasks
        </button>
      </header>
      {entries.length ? (
        entries.map(([key, entry]) => {
          const remaining = Object.values(entry.groups).flat().length,
            total = entry.completed + remaining;
          return (
            <details key={key} className={remaining === 0 ? "master-tasks-complete" : ""}>
              <summary>
                <span>{entry.name}</span>
                <b>
                  {entry.completed} / {total} complete
                </b>
                <em>{remaining === 0 ? "✓ All tasks complete" : `${remaining} remaining`}</em>
              </summary>
              <div className="master-task-groups">
                {remaining === 0 && <p className="master-tasks-complete-label">All {total} tasks completed today.</p>}
                {Object.entries(entry.groups).map(([group, tasks]) => (
                  <details key={group}>
                    <summary>
                      {group}: {tasks.length}
                    </summary>
                    <ul>
                      {tasks.map((task) => (
                        <li key={task}>{task}</li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </details>
          );
        })
      ) : (
        <p className="manager-muted">No tasks are currently remaining.</p>
      )}
    </section>
  );
}
export default function Dashboard({
  declining = false,
  creators = false,
  owner = false,
  hideQuote = false,
}: {
  creators?: boolean;
  declining?: boolean;
  owner?: boolean;
  hideQuote?: boolean;
}) {
  const [source, setData] = useState<PortalOverview | null>(null),
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
      return (
        item.reason === "away" && creator && creator.hours > item.hoursAtMove
      );
    });
    if (!returned) return;
    void portalRequest("unmanaged", { action: "return", id: returned.id })
      .then((data) => setUnmanaged(data.records || []))
      .catch(() => {});
  }, [source, unmanaged]);
  // Unmanaged creators leave the active roster, but their activity still belongs
  // in this team's month-to-date performance.
  const filteredCreators =
    source?.creators.filter(
      (c) =>
        (!group || c.group === group) && (!manager || c.managerKey === manager),
    ) || [];
  const selected = filteredCreators.filter(
    (creator) => !unmanaged.some((item) => item.id === creator.id),
  );
  const chosen = new Set(selected.map((c) => c.username));
  const total = filteredCreators.reduce((s, c) => s + c.diamonds, 0);
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
        previousTotal: filteredCreators.reduce(
          (s, c) => s + c.previousComparable,
          0,
        ),
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
              Preparing latest data…
            </div>
          )}
        </div>
      )}
      {hideQuote && !source && !error && (
        <div className="manager-loading-creators" role="status">
          Preparing latest data…
        </div>
      )}
      {error && <p className="manager-error">{error}</p>}
      {source && (
        <div className="manager-filters">
          {owner && (
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
                <option value="">All managed groups</option>
                {[...new Set(source.creators.map((c) => c.group))]
                  .sort()
                  .map((g) => (
                    <option key={g}>{g}</option>
                  ))}
              </select>
            </label>
          )}
          {(owner || (source.juniorManagerKeys?.length || 0) > 0) && (
            <label className="manager-muted">
              Select manager
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
                <option value="">All managed creators</option>
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
                      {!owner && source.executiveKey !== key
                        ? `${name} · Junior manager`
                        : name}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>
      )}
      {data &&
        (owner && declining ? <DecliningCreators data={data}/> : creators ? (
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
                Silver · 100k–499,999
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
                      chatProfileColour(c.agencyDays, c.previousDiamonds).key +
                      (data.executiveKey && data.executiveKey !== c.managerKey
                        ? " junior-creator"
                        : "")
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
                      <span>
                        {data.executiveKey && data.executiveKey !== c.managerKey
                          ? `${c.manager} · Junior manager`
                          : "This month"}
                      </span>
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
                    {owner&&<MasterCreatorNotes creatorId={c.id} username={c.username}/>}
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
  creator: Pick<
    Overview["creators"][number],
    "id" | "username" | "managerKey" | "hours"
  >;
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
    element.style.setProperty(
      "transform",
      "translate(-50%, -50%)",
      "important",
    );
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
              {showTeams && (
                <span>Team: {teams[item.managerKey] || item.managerKey}</span>
              )}
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
