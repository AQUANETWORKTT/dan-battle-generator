"use client";
import { useEffect, useState } from "react";
import { Picture } from "./Portal";
import {
  CONGRATULATIONS_MESSAGES,
  congratulationsMessage,
  shuffleCongratulations,
} from "@/lib/congratulations-messages";
const ukDay = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
function nextMidnight() {
  const next = new Date(ukDay() + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + 1);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(next),
  );
  return next.getTime() - hour * 3600000;
}
type Message = {
  id: string;
  date: string;
  username: string;
  manager: string;
  managerKey: string;
  diamonds: number;
  colour: string;
  completed: boolean;
};
export default function MorningMessages({
  owner = false,
  managerKeys,
  onCount,
  mainTeamOnly = false,
  showHeading = true,
}: {
  owner?: boolean;
  managerKeys?: string[];
  onCount?: (summary: { total: number; completed: number }) => void;
  mainTeamOnly?: boolean;
  showHeading?: boolean;
}) {
  const endpoint =
    "/api/morning-messages" +
    (owner ? "?scope=owner" + (mainTeamOnly ? "&group=dan-james" : "") : "");
  async function readMessagesResponse(response: Response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw Error(
        response.status === 401
          ? "Your sign-in has expired. Refresh the portal and sign in again."
          : "The portal is updating. Refresh the page and try again.",
      );
    }
    return response.json();
  }
  const [items, setItems] = useState<Message[]>([]),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(""),
    [reloadKey, setReloadKey] = useState(0),
    [sourceDate, setSourceDate] = useState(""),
    [choices, setChoices] = useState<Record<string, number>>({});
  async function toggle(item: Message) {
    const completed = !item.completed;
    setItems((all) =>
      all.map((x) =>
        x.id === item.id && x.date === item.date ? { ...x, completed } : x,
      ),
    );
    try {
      // Keep the same scope for the update as was used to load the list.
      // In particular, a master user must post as owner rather than being
      // checked against an individual manager's team.
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, date: item.date, completed }),
      });
      const d = await readMessagesResponse(r);
      if (!r.ok) throw Error(d.error || "Could not update message.");
    } catch (e) {
      setItems((all) =>
        all.map((x) =>
          x.id === item.id && x.date === item.date
            ? { ...x, completed: item.completed }
            : x,
        ),
      );
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const separator = endpoint.includes("?") ? "&" : "?";
        const r = await fetch(endpoint + separator + "fresh=" + Date.now(), { cache: "no-store", credentials: "same-origin" }),
          d = await readMessagesResponse(r);
        if (!r.ok) throw Error(d.error || "Unable to load morning messages.");
        if (active) {
          // The server is the authority for London time. Device clocks can be
          // wrong, so never hide a valid server response based on local time.
          setItems(d.items || []);
          setSourceDate(d.date || "");
          if (owner)
            setChoices((current) =>
              Object.fromEntries(
                d.items.map((item: Message) => {
                  const key = item.date + ":" + item.id;
                  return [
                    key,
                    current[key] ??
                      Math.floor(
                        Math.random() * CONGRATULATIONS_MESSAGES.length,
                      ),
                  ];
                }),
              ),
            );
          setLoaded(true);
          setError("");
        }
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setLoaded(true);
        }
      }
    }
    let day = ukDay(),
      timer: ReturnType<typeof setTimeout>;
    function rollover() {
      day = ukDay();
      setItems([]);
      void load();
      schedule();
    }
    function schedule() {
      timer = setTimeout(
        rollover,
        Math.max(1, nextMidnight() - Date.now() + 25),
      );
    }
    function visible() {
      if (document.visibilityState === "visible" && ukDay() !== day) {
        clearTimeout(timer);
        rollover();
      }
    }
    void load();
    schedule();
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [endpoint, reloadKey]);
  const selected = items.filter(
    (i) => !managerKeys || managerKeys.includes(i.managerKey),
  );
  const selectedCompleted = selected.filter((item) => item.completed).length;
  useEffect(() => {
    if (loaded && !error)
      onCount?.({
        total: selected.length,
        completed: selectedCompleted,
      });
  }, [loaded, error, selected.length, selectedCompleted, onCount]);
  if (error && !loaded) return <p className="manager-error">{error}</p>;
  if (!loaded)
    return (
      <p className="manager-muted" role="status">
        Loading morning messages…
      </p>
    );
  if (!selected.length)
    return (
      <section className="morning-message-empty">
        <div>
          <h3>Morning messages</h3>
          <p>No eligible morning messages are currently loaded{sourceDate ? ` from ${sourceDate}` : ""}.</p>
        </div>
        <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
          Refresh morning messages
        </button>
      </section>
    );
  return (
    <section className="morning-messages">
      {error && (
        <p role="alert" className="manager-error">
          {error}
        </p>
      )}
      {showHeading && (
        <h2 className="today-reminders-title">Today’s reminders</h2>
      )}
      <header>
        <h3>Morning messages</h3>
        <span>{selected.length} creators</span>
      </header>
      {selected.map((item) => {
        const choiceKey = item.date + ":" + item.id,
          sample = congratulationsMessage(
            choices[choiceKey] ?? 0,
            item.username,
            item.diamonds,
          );
        return (
          <article
            key={item.id}
            className={
              "morning-message colour-" +
              item.colour +
              (item.completed ? " completed" : "")
            }
          >
            <Picture username={item.username} />
            <div className="morning-message-content">
              <div className="morning-message-inline">
                <h3>@{item.username}</h3>
                <strong>
                  {item.diamonds.toLocaleString("en-GB")} <span>diamonds</span>
                </strong>
              </div>
              {owner && (
                <>
                  <div className="morning-message-sample">
                    <p>{sample}</p>
                    <div className="morning-message-actions">
                      <button
                        aria-label={
                          "Shuffle congratulations message for @" +
                          item.username
                        }
                        onClick={() => {
                          setChoices((current) => ({
                            ...current,
                            [choiceKey]: shuffleCongratulations(
                              current[choiceKey] ?? 0,
                            ),
                          }));
                          setCopied("");
                        }}
                      >
                        Shuffle ↻
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(sample);
                            setCopied(item.id);
                            setTimeout(() => setCopied(""), 2000);
                          } catch {
                            setError(
                              "Could not copy. Please select the message text.",
                            );
                          }
                        }}
                      >
                        {copied === item.id ? "Copied" : "Copy message"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <label className="morning-complete">
              <span>Done</span>
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => void toggle(item)}
              />
            </label>
          </article>
        );
      })}
    </section>
  );
}
