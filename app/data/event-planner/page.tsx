"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type Kind = "" | "head-to-head" | "showcase" | "other";
type SetupStatus = "yes" | "no" | "not-applicable";

type EventSetup = {
  arrangedBattlePosterUrl: string;
  arrangedBattlePosterStatus: SetupStatus;

  creatorsSelectedStatus: SetupStatus;

  creatorMessage: string;
  creatorMessageStatus: SetupStatus;

  managerSpreadsheetUrl: string;
  managerSpreadsheetStatus: SetupStatus;

  managerSpreadsheetMessage: string;
  managerSpreadsheetSentStatus: SetupStatus;

  creatorMessagesSent: string;
  creatorMessagesSentStatus: SetupStatus;

  socialsPosterUrl: string;
  socialsPosterStatus: SetupStatus;

  advertUrl: string;
  advertStatus: SetupStatus;

  pairingSheetStatus: SetupStatus;
};

type Event = {
  id: string;
  kind: Kind;
  name: string;
  color: string;
  showcaseRounds: { enabled: boolean; startDate: string; endDate: string }[];
  description: string;
  prize: string;
  startDate: string;
  endDate: string;
  dates: string;
  size: string;
  setup: EventSetup;
  finished?: boolean;
};

const blankSetup = (): EventSetup => ({
  arrangedBattlePosterUrl: "",
  arrangedBattlePosterStatus: "no",

  creatorsSelectedStatus: "no",

  creatorMessage: "",
  creatorMessageStatus: "no",

  managerSpreadsheetUrl: "",
  managerSpreadsheetStatus: "no",

  managerSpreadsheetMessage: "",
  managerSpreadsheetSentStatus: "no",

  creatorMessagesSent: "",
  creatorMessagesSentStatus: "no",

  socialsPosterUrl: "",
  socialsPosterStatus: "no",

  advertUrl: "",
  advertStatus: "no",

  pairingSheetStatus: "no",
});

const blankEvent = (): Event => ({
  id: crypto.randomUUID(),
  kind: "",
  name: "",
  color: "#f472b6",
  showcaseRounds: [{ enabled: true, startDate: "", endDate: "" }, { enabled: false, startDate: "", endDate: "" }, { enabled: false, startDate: "", endDate: "" }],
  description: "",
  prize: "",
  startDate: "",
  endDate: "",
  dates: "",
  size: "2v2",
  setup: blankSetup(),
  finished: false,
});

function migrateStatus(value: unknown): SetupStatus {
  if (value === "yes") return "yes";
  if (value === "not-applicable") return "not-applicable";
  return "no";
}

function parseSavedDates(value?: string) {
  if (!value) {
    return {
      startDate: "",
      endDate: "",
    };
  }

  const parts = value.split("~").map((part) => part.trim());

  if (parts.length === 2) {
    return {
      startDate: parts[0],
      endDate: parts[1],
    };
  }

  return {
    startDate: parts[0] || "",
    endDate: parts[0] || "",
  };
}

function normalise(saved: unknown): Event[] {
  if (!Array.isArray(saved)) return [];

  return saved.map((raw: any) => {
    const oldChecks = raw?.checks || raw?.tasks || {};
    const existingSetup = raw?.setup || {};
    const parsedDates = parseSavedDates(raw?.dates);

    const startDate =
      raw?.startDate ||
      parsedDates.startDate ||
      "";

    const endDate =
      raw?.endDate ||
      parsedDates.endDate ||
      "";

    return {
      ...blankEvent(),
      id: raw?.id || crypto.randomUUID(),

      kind:
        raw?.kind === "head-to-head" ||
        raw?.kind === "showcase" ||
        raw?.kind === "other"
          ? raw.kind
          : raw?.type === "head-to-head" ||
              raw?.type === "showcase" ||
              raw?.type === "other"
            ? raw.type
            : "",

      name: raw?.name || "",
      color: raw?.color || "#f472b6",
      showcaseRounds: Array.isArray(raw?.showcaseRounds) ? raw.showcaseRounds : blankEvent().showcaseRounds,
      description: raw?.description || "",
      prize: raw?.prize || "",
      startDate,
      endDate,
      dates:
        raw?.dates ||
        (startDate && endDate
          ? `${startDate} ~ ${endDate}`
          : ""),
      size: raw?.size || "2v2",
      finished: Boolean(raw?.finished),

      setup: {
        ...blankSetup(),
        ...existingSetup,

        arrangedBattlePosterUrl:
          existingSetup.arrangedBattlePosterUrl || "",

        arrangedBattlePosterStatus: migrateStatus(
          existingSetup.arrangedBattlePosterStatus ??
            oldChecks.poster,
        ),

        creatorsSelectedStatus: migrateStatus(
          existingSetup.creatorsSelectedStatus ??
            oldChecks.creators,
        ),

        creatorMessage:
          existingSetup.creatorMessage || "",

        creatorMessageStatus: migrateStatus(
          existingSetup.creatorMessageStatus ??
            oldChecks.message,
        ),

        managerSpreadsheetUrl:
          existingSetup.managerSpreadsheetUrl || "",

        managerSpreadsheetStatus: migrateStatus(
          existingSetup.managerSpreadsheetStatus ??
            oldChecks.sheet,
        ),

        managerSpreadsheetMessage:
          existingSetup.managerSpreadsheetMessage || "",

        managerSpreadsheetSentStatus: migrateStatus(
          existingSetup.managerSpreadsheetSentStatus ??
            oldChecks.sentSheet,
        ),

        creatorMessagesSent:
          existingSetup.creatorMessagesSent || "",

        creatorMessagesSentStatus: migrateStatus(
          existingSetup.creatorMessagesSentStatus ??
            oldChecks.sentMessages,
        ),

        socialsPosterUrl:
          existingSetup.socialsPosterUrl || "",

        socialsPosterStatus: migrateStatus(
          existingSetup.socialsPosterStatus ??
            oldChecks.socials,
        ),

        advertUrl: existingSetup.advertUrl || "",

        advertStatus: migrateStatus(
          existingSetup.advertStatus ??
            oldChecks.advert,
        ),

        pairingSheetStatus: migrateStatus(
          existingSetup.pairingSheetStatus ??
            oldChecks.pairing,
        ),
      },
    };
  });
}

function statusColours(status: SetupStatus) {
  if (status === "yes") {
    return {
      row: "border-emerald-400/45 bg-emerald-400/10",
      label: "text-emerald-200",
    };
  }

  if (status === "not-applicable") {
    return {
      row: "border-white/10 bg-white/[0.03] opacity-55",
      label: "text-white/50",
    };
  }

  return {
    row: "border-rose-400/45 bg-rose-400/10",
    label: "text-rose-200",
  };
}

function StatusControl({
  value,
  onChange,
}: {
  value: SetupStatus;
  onChange: (value: SetupStatus) => void;
}) {
  const options: {
    id: SetupStatus;
    label: string;
    active: string;
  }[] = [
    {
      id: "yes",
      label: "Yes",
      active:
        "border-emerald-300/60 bg-emerald-400/25 text-emerald-100",
    },
    {
      id: "no",
      label: "No",
      active:
        "border-rose-300/60 bg-rose-400/25 text-rose-100",
    },
    {
      id: "not-applicable",
      label: "N/A",
      active:
        "border-slate-300/40 bg-slate-300/15 text-white",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => (
        <button
          type="button"
          key={option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-lg border px-3 py-2 text-xs font-black transition ${
            value === option.id
              ? option.active
              : "border-white/10 bg-black/25 text-white/45 hover:bg-white/5"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      <span>{label}</span>

      <div
        className="
          [&_input]:w-full
          [&_input]:rounded-xl
          [&_input]:border
          [&_input]:border-white/15
          [&_input]:bg-black/45
          [&_input]:p-3

          [&_select]:w-full
          [&_select]:rounded-xl
          [&_select]:border
          [&_select]:border-white/15
          [&_select]:bg-black/45
          [&_select]:p-3

          [&_textarea]:w-full
          [&_textarea]:rounded-xl
          [&_textarea]:border
          [&_textarea]:border-white/15
          [&_textarea]:bg-black/45
          [&_textarea]:p-3
        "
      >
        {children}
      </div>
    </label>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value: string) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
    0,
  );
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeekMonday(date: Date) {
  const next = new Date(date);
  const jsDay = next.getDay();
  const difference =
    jsDay === 0 ? -6 : 1 - jsDay;

  next.setDate(next.getDate() + difference);
  next.setHours(12, 0, 0, 0);

  return next;
}

function endOfWeekSunday(date: Date) {
  return addDays(startOfWeekMonday(date), 6);
}

function startOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
    12,
  );
}

function endOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    12,
  );
}

function differenceInDays(
  first: Date,
  second: Date,
) {
  return Math.round(
    (first.getTime() - second.getTime()) /
      DAY_MS,
  );
}

function maxDate(a: Date, b: Date) {
  return a > b ? a : b;
}

function minDate(a: Date, b: Date) {
  return a < b ? a : b;
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
) {
  return (
    aStart <= bEnd &&
    bStart <= aEnd
  );
}

type CalendarSegment = {
  event: Event;
  startColumn: number;
  endColumn: number;
  lane: number;
};

function buildWeekSegments(
  events: Event[],
  weekStart: Date,
) {
  const weekEnd =
    endOfWeekSunday(weekStart);

  const candidates = events
    .flatMap((event) => event.kind === "showcase" ? event.showcaseRounds.map((round, index) => ({ round, index })).filter(({ round }) => round.enabled).map(({ round, index }, _, selected) => ({ ...event, startDate: round.startDate, endDate: round.endDate, name: selected.length === 1 ? event.name : `${event.name} · Round ${index + 1}` })) : [event])
    .map((event) => {
      const eventStart = toDate(
        event.startDate,
      );

      const eventEnd = toDate(
        event.endDate,
      );

      if (!eventStart || !eventEnd) {
        return null;
      }

      if (
        eventEnd < weekStart ||
        eventStart > weekEnd
      ) {
        return null;
      }

      const clampedStart = maxDate(
        eventStart,
        weekStart,
      );

      const clampedEnd = minDate(
        eventEnd,
        weekEnd,
      );

      return {
        event,
        startColumn:
          differenceInDays(
            clampedStart,
            weekStart,
          ) + 1,
        endColumn:
          differenceInDays(
            clampedEnd,
            weekStart,
          ) + 1,
      };
    })
    .filter(Boolean) as Array<
    Omit<CalendarSegment, "lane">
  >;

  candidates.sort((a, b) => {
    if (
      a.startColumn !== b.startColumn
    ) {
      return (
        a.startColumn -
        b.startColumn
      );
    }

    return b.endColumn - a.endColumn;
  });

  const laneContents: CalendarSegment[][] = [
    [],
    [],
    [],
    [],
  ];

  const visible: CalendarSegment[] = [];
  let overflow = 0;

  for (const item of candidates) {
    let chosenLane = -1;

    for (let lane = 0; lane < 4; lane++) {
      const collision =
        laneContents[lane].some(
          (existing) =>
            rangesOverlap(
              existing.startColumn,
              existing.endColumn,
              item.startColumn,
              item.endColumn,
            ),
        );

      if (!collision) {
        chosenLane = lane;
        break;
      }
    }

    if (chosenLane === -1) {
      overflow++;
      continue;
    }

    const segment: CalendarSegment = {
      ...item,
      lane: chosenLane + 1,
    };

    laneContents[chosenLane].push(segment);
    visible.push(segment);
  }

  return {
    segments: visible,
    overflow,
  };
}

function EventCalendar({
  events,
  onOpenEvent,
}: {
  events: Event[];
  onOpenEvent: (event: Event) => void;
}) {
  const [month, setMonth] = useState(
    new Date(2026, 8, 1, 12),
  );

  const calendarStart =
    startOfWeekMonday(startOfMonth(month));

  const calendarEnd =
    endOfWeekSunday(endOfMonth(month));

  const weeks: Date[] = [];

  for (
    let current =
      new Date(calendarStart);
    current <= calendarEnd;
    current = addDays(current, 7)
  ) {
    weeks.push(new Date(current));
  }

  const monthValue =
    `${month.getFullYear()}-${String(
      month.getMonth() + 1,
    ).padStart(2, "0")}`;

  function previousMonth() {
    setMonth(
      new Date(
        month.getFullYear(),
        month.getMonth() - 1,
        1,
        12,
      ),
    );
  }

  function nextMonth() {
    setMonth(
      new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        1,
        12,
      ),
    );
  }

  function onMonthChange(value: string) {
    if (!value) return;

    const [year, monthNumber] =
      value.split("-").map(Number);

    setMonth(
      new Date(
        year,
        monthNumber - 1,
        1,
        12,
      ),
    );
  }

  return (
    <section className="mt-8 overflow-hidden rounded-[28px] border border-pink-300/30 bg-[#100d11]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.25em] text-pink-200">
            Timeline
          </p>

          <h2 className="mt-1 text-2xl font-black">
            Event Calendar
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={previousMonth}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black"
          >
            ←
          </button>

          <input
            type="month"
            value={monthValue}
            onChange={(event) =>
              onMonthChange(event.target.value)
            }
            className="rounded-xl border border-white/15 bg-black/40 px-4 py-2 font-bold"
          />

          <button
            type="button"
            onClick={nextMonth}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black"
          >
            →
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-7 border-b border-white/10 bg-black/20">
            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((day) => (
              <div
                key={day}
                className="border-r border-white/10 px-3 py-3 text-center text-xs font-black uppercase tracking-widest text-white/45 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {weeks.map((weekStart) => {
            const {
              segments,
              overflow,
            } = buildWeekSegments(
              events,
              weekStart,
            );

            const days = Array.from(
              { length: 7 },
              (_, index) =>
                addDays(weekStart, index),
            );

            return (
              <div
                key={weekStart.toISOString()}
                className="border-b border-white/10 last:border-b-0"
              >
                <div className="grid grid-cols-7 bg-black/10">
                  {days.map((day) => {
                    const currentMonth =
                      day.getMonth() ===
                      month.getMonth();

                    return (
                      <div
                        key={day.toISOString()}
                        className={`border-r border-white/10 px-3 py-2 text-sm font-black last:border-r-0 ${
                          currentMonth
                            ? "text-white"
                            : "text-white/25"
                        }`}
                      >
                        {day.getDate()}
                      </div>
                    );
                  })}
                </div>

                <div className="relative min-h-[132px]">
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
                    {Array.from({
                      length: 7,
                    }).map((_, index) => (
                      <div
                        key={index}
                        className="border-r border-white/10 last:border-r-0"
                      />
                    ))}
                  </div>

                  <div className="relative grid grid-cols-7 grid-rows-4 gap-y-1 px-1 py-2">
                    {segments.map((segment) => (
                      <button
                        type="button"
                        key={`${segment.event.id}-${segment.lane}-${segment.startColumn}`}
                        onClick={() =>
                          onOpenEvent(
                            segment.event,
                          )
                        }
                        style={{
                          gridColumn: `${segment.startColumn} / ${segment.endColumn + 1}`,
                          gridRow:
                            segment.lane,
                          backgroundColor: segment.event.finished ? undefined : segment.event.color,
                        }}
                        className={`mx-1 h-7 min-w-0 overflow-hidden rounded-full px-3 text-left text-xs font-black transition hover:brightness-110 ${
                          segment.event.finished
                            ? "bg-white/15 text-white/45 grayscale"
                            : "text-black"
                        }`}
                        title={
                          segment.event.name
                        }
                      >
                        <span className="block truncate">
                          {
                            segment.event
                              .name
                          }
                        </span>
                      </button>
                    ))}

                    {overflow > 0 && (
                      <div
                        style={{
                          gridColumn:
                            "6 / 8",
                          gridRow: 4,
                        }}
                        className="mx-1 flex h-7 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-black text-white/60"
                      >
                        +{overflow} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type SetupRowDefinition = {
  id: string;
  title: string;
  status: SetupStatus;
  content?: React.ReactNode;
};

export default function Page() {
  const [events, setEvents] = useState<Event[]>([]);
  const [draft, setDraft] = useState<Event | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<
    "socials" | "advert" | null
  >(null);

  useEffect(() => {
    let active = true;

    fetch("/api/data/event-planner", {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setEvents(normalise(data.events));
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const update = (patch: Partial<Event>) => {
    setDraft((old) =>
      old
        ? {
            ...old,
            ...patch,
          }
        : null,
    );
  };

  const updateSetup = (
    patch: Partial<EventSetup>,
  ) => {
    setDraft((old) =>
      old
        ? {
            ...old,
            setup: {
              ...old.setup,
              ...patch,
            },
          }
        : null,
    );
  };

  async function saveShared(updated: Event[]) {
    const previous = events;
    setEvents(updated);

    const response = await fetch(
      "/api/data/event-planner",
      {
        method: "PUT",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          events: updated,
        }),
      },
    );

    if (!response.ok) {
      setEvents(previous);
      throw new Error(
        "Failed to save Event Planner",
      );
    }
  }

  async function save() {
    if (!draft) return;
    if (!draft.kind) return;
    if (!draft.name.trim()) return;
    if (draft.kind !== "showcase" && (!draft.startDate || !draft.endDate))
      return;

    if (
      draft.endDate <
      draft.startDate
    ) {
      alert(
        "End date cannot be before the start date.",
      );
      return;
    }

    setSaving(true);

    try {
      const next: Event = {
        ...draft,
        name: draft.name.trim(),
        dates: `${draft.startDate} ~ ${draft.endDate}`,
      };

      const updated = editing
        ? events.map((event) =>
            event.id === editing
              ? next
              : event,
          )
        : [...events, next];

      await saveShared(updated);

      setDraft(null);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(
    file: File,
    type: "socials" | "advert",
  ) {
    setUploading(type);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch(
        "/api/data/event-planner/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(
          "Image upload failed",
        );
      }

      const data =
        await response.json();

      if (!data.url) {
        throw new Error(
          "Upload returned no URL",
        );
      }

      if (type === "socials") {
        updateSetup({
          socialsPosterUrl: data.url,
        });
      } else {
        updateSetup({
          advertUrl: data.url,
        });
      }
    } catch (error) {
      console.error(error);
      alert(
        "The image could not be uploaded.",
      );
    } finally {
      setUploading(null);
    }
  }

  async function markFinished(
    event: Event,
  ) {
    await saveShared(
      events.map((item) =>
        item.id === event.id
          ? {
              ...item,
              finished: true,
            }
          : item,
      ),
    );
  }

  async function deleteFinished(
    event: Event,
  ) {
    if (!event.finished) return;

    const confirmed =
      window.confirm(
        `DELETE ${event.name}?`,
      );

    if (!confirmed) return;

    await saveShared(
      events.filter(
        (item) =>
          item.id !== event.id,
      ),
    );
  }

  const setupRows =
    useMemo<SetupRowDefinition[]>(
      () => {
        if (!draft) return [];

        const rows: SetupRowDefinition[] =
          [
            {
              id: "arranged-poster",
              title:
                "Arranged battle poster",
              status:
                draft.setup
                  .arrangedBattlePosterStatus,
              content: (
                <Field label="Battle poster link">
                  <input
                    type="url"
                    placeholder="Paste battle poster link"
                    value={
                      draft.setup
                        .arrangedBattlePosterUrl
                    }
                    onChange={(event) =>
                      updateSetup({
                        arrangedBattlePosterUrl:
                          event.target
                            .value,
                      })
                    }
                  />
                </Field>
              ),
            },

            {
              id: "creators-selected",
              title:
                "Creators selected",
              status:
                draft.setup
                  .creatorsSelectedStatus,
            },

            {
              id: "creator-message",
              title: "Creator message",
              status:
                draft.setup
                  .creatorMessageStatus,
              content: (
                <Field label="Creator message">
                  <textarea
                    rows={8}
                    value={
                      draft.setup
                        .creatorMessage
                    }
                    placeholder="Paste creator message here"
                    onChange={(event) =>
                      updateSetup({
                        creatorMessage:
                          event.target
                            .value,
                      })
                    }
                  />
                </Field>
              ),
            },

            {
              id: "manager-spreadsheet",
              title:
                "Manager spreadsheet",
              status:
                draft.setup
                  .managerSpreadsheetStatus,
              content: (
                <Field label="Spreadsheet link">
                  <input
                    type="url"
                    placeholder="Optional spreadsheet link"
                    value={
                      draft.setup
                        .managerSpreadsheetUrl
                    }
                    onChange={(event) =>
                      updateSetup({
                        managerSpreadsheetUrl:
                          event.target
                            .value,
                      })
                    }
                  />
                </Field>
              ),
            },

            {
              id: "manager-spreadsheet-sent",
              title:
                "Manager spreadsheet sent out",
              status:
                draft.setup
                  .managerSpreadsheetSentStatus,
              content: (
                <Field label="Manager message sent with spreadsheet">
                  <textarea
                    rows={8}
                    value={
                      draft.setup
                        .managerSpreadsheetMessage
                    }
                    placeholder="Paste manager message here"
                    onChange={(event) =>
                      updateSetup({
                        managerSpreadsheetMessage:
                          event.target
                            .value,
                      })
                    }
                  />
                </Field>
              ),
            },

            {
              id: "creator-messages-sent",
              title:
                "Creator messages sent out",
              status:
                draft.setup
                  .creatorMessagesSentStatus,
              content: (
                <Field label="Messages sent to creators">
                  <textarea
                    rows={8}
                    value={
                      draft.setup
                        .creatorMessagesSent
                    }
                    placeholder="Paste creator messages here"
                    onChange={(event) =>
                      updateSetup({
                        creatorMessagesSent:
                          event.target
                            .value,
                      })
                    }
                  />
                </Field>
              ),
            },

            {
              id: "socials-poster",
              title:
                "Socials poster",
              status:
                draft.setup
                  .socialsPosterStatus,
              content: (
                <div className="grid gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={
                      uploading ===
                      "socials"
                    }
                    onChange={(event) => {
                      const file =
                        event.target
                          .files?.[0];

                      if (file) {
                        void uploadImage(
                          file,
                          "socials",
                        );
                      }
                    }}
                  />

                  {uploading ===
                    "socials" && (
                    <p className="text-xs text-white/50">
                      Uploading…
                    </p>
                  )}

                  {draft.setup
                    .socialsPosterUrl && (
                    <img
                      src={
                        draft.setup
                          .socialsPosterUrl
                      }
                      alt="Socials poster"
                      className="max-h-72 rounded-xl border border-white/10 object-contain"
                    />
                  )}
                </div>
              ),
            },

            {
              id: "advert",
              title: "Advert",
              status:
                draft.setup
                  .advertStatus,
              content: (
                <div className="grid gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={
                      uploading ===
                      "advert"
                    }
                    onChange={(event) => {
                      const file =
                        event.target
                          .files?.[0];

                      if (file) {
                        void uploadImage(
                          file,
                          "advert",
                        );
                      }
                    }}
                  />

                  {uploading ===
                    "advert" && (
                    <p className="text-xs text-white/50">
                      Uploading…
                    </p>
                  )}

                  {draft.setup
                    .advertUrl && (
                    <img
                      src={
                        draft.setup
                          .advertUrl
                      }
                      alt="Event advert"
                      className="max-h-72 rounded-xl border border-white/10 object-contain"
                    />
                  )}
                </div>
              ),
            },
          ];

        if (
          draft.kind ===
          "head-to-head"
        ) {
          rows.push({
            id: "pairing-sheet",
            title:
              "Head-to-head pairing sheet",
            status:
              draft.setup
                .pairingSheetStatus,
          });
        }

        return rows
          .map((row, order) => ({
            ...row,
            order,
          }))
          .sort((a, b) => {
            const aNA =
              a.status ===
              "not-applicable";

            const bNA =
              b.status ===
              "not-applicable";

            if (aNA !== bNA) {
              return aNA ? 1 : -1;
            }

            return a.order - b.order;
          });
      },
      [draft, uploading],
    );

  function getCardStatuses(
    event: Event,
  ) {
    const statuses = [
      event.setup
        .arrangedBattlePosterStatus,
      event.setup
        .creatorsSelectedStatus,
      event.setup
        .creatorMessageStatus,
      event.setup
        .managerSpreadsheetStatus,
      event.setup
        .managerSpreadsheetSentStatus,
      event.setup
        .creatorMessagesSentStatus,
      event.setup
        .socialsPosterStatus,
      event.setup.advertStatus,
    ];

    if (
      event.kind ===
      "head-to-head"
    ) {
      statuses.push(
        event.setup
          .pairingSheetStatus,
      );
    }

    return statuses;
  }

  return (
    <DataAccessGuard>
      <main className="min-h-screen bg-[#080806] px-5 py-6 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <nav className="flex justify-between border-b border-white/10 pb-5">
            <Link
              href="/data/menu"
              className="font-[family-name:var(--font-norwester)] uppercase text-yellow-300"
            >
              First Class{" "}
              <span className="text-white">
                Leadership Space
              </span>
            </Link>

            <Link
              href="/data/menu"
              className="text-xs font-bold text-white/60"
            >
              Back to Data
            </Link>
          </nav>

          <header className="mt-12 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[.3em] text-pink-200">
                Events
              </p>

              <h1 className="mt-3 font-[family-name:var(--font-norwester)] text-5xl uppercase">
                Event{" "}
                <span className="text-pink-300">
                  Planner
                </span>
              </h1>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setDraft(blankEvent());
              }}
              className="rounded-full bg-pink-400 px-5 py-3 text-xs font-black uppercase text-black"
            >
              + Add Event
            </button>
          </header>

          <EventCalendar
            events={events}
            onOpenEvent={(event) => {
              setEditing(event.id);
              setDraft(event);
            }}
          />

          <section className="mt-8 rounded-[28px] border border-pink-300/35 bg-gradient-to-br from-fuchsia-500/30 via-pink-500/12 to-[#080806] p-6">
            {!ready ? (
              "Loading…"
            ) : events.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-pink-200/25 p-10 text-center text-white/60">
                No events planned yet.
              </p>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {events.map((event) => {
                  const statuses =
                    getCardStatuses(event);

                  const yes =
                    statuses.filter(
                      (status) =>
                        status === "yes",
                    ).length;

                  const no =
                    statuses.filter(
                      (status) =>
                        status === "no",
                    ).length;

                  const na =
                    statuses.filter(
                      (status) =>
                        status ===
                        "not-applicable",
                    ).length;

                  const active = yes + no;

                  return (
                    <article
                      key={event.id}
                      className={`rounded-2xl border p-5 transition ${
                        event.finished
                          ? "border-white/10 bg-white/5 opacity-45 grayscale"
                          : no === 0
                            ? "border-emerald-400/45 bg-emerald-400/10"
                            : yes > 0
                              ? "border-orange-400/45 bg-orange-400/10"
                              : "border-rose-400/45 bg-rose-400/10"
                      }`}
                    >
                      <div className="flex flex-wrap justify-between gap-4">
                        <div>
                          <b className="rounded-full bg-pink-300/15 px-2 py-1 text-[10px] uppercase text-pink-100">
                            {event.kind
                              ? event.kind.replaceAll(
                                  "-",
                                  " ",
                                )
                              : "No type"}
                          </b>

                          <h2 className="mt-3 text-2xl font-black">
                            {event.name}
                          </h2>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(
                                event.id,
                              );
                              setDraft(event);
                            }}
                            className="h-fit rounded-lg border border-white/15 px-3 py-2 text-xs font-bold"
                          >
                            Edit
                          </button>

                          {!event.finished ? (
                            <button
                              type="button"
                              onClick={() =>
                                void markFinished(
                                  event,
                                )
                              }
                              className="h-fit rounded-lg border border-white/15 px-3 py-2 text-xs font-bold"
                            >
                              Mark Event as
                              Finished
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                void deleteFinished(
                                  event,
                                )
                              }
                              className="h-fit rounded-lg border border-rose-400/40 px-3 py-2 text-xs font-bold text-rose-200"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {event.description && (
                        <p className="mt-4 whitespace-pre-wrap text-sm text-white/70">
                          {
                            event.description
                          }
                        </p>
                      )}

                      <div className="mt-4 grid gap-1">
                        <p className="text-sm">
                          <span className="text-white/45">
                            Prize:{" "}
                          </span>
                          {event.prize ||
                            "TBC"}
                        </p>

                        <p className="text-sm">
                          <span className="text-white/45">
                            Dates:{" "}
                          </span>
                          {event.startDate &&
                          event.endDate
                            ? `${event.startDate} → ${event.endDate}`
                            : "TBC"}
                        </p>

                        {event.kind ===
                          "head-to-head" && (
                          <p className="text-sm">
                            <span className="text-white/45">
                              Size:{" "}
                            </span>
                            {event.size}
                          </p>
                        )}
                      </div>

                      <div className={`mt-5 rounded-xl border p-4 text-center text-sm font-black uppercase tracking-wide ${no === 0 ? "border-emerald-400/45 bg-emerald-400/10 text-emerald-200" : "border-rose-400/45 bg-rose-400/10 text-rose-200"}`}>
                        {no === 0 ? "Ready to go" : "Still needs completing"}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {draft && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
              <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-pink-200/25 bg-[#100d11] p-6">
                <div className="mb-6 flex justify-between gap-4">
                  <h2 className="font-[family-name:var(--font-norwester)] text-3xl uppercase">
                    {editing
                      ? "Edit Event"
                      : "Add Event"}
                  </h2>

                  <button
                    type="button"
                    onClick={() => {
                      setDraft(null);
                      setEditing(null);
                    }}
                  >
                    Close
                  </button>
                </div>

                <div className="grid gap-4">
                  <label className="grid gap-2 text-sm font-bold">
                    <span>
                      Event type
                    </span>

                    <select
                      value={draft.kind}
                      onChange={(event) =>
                        update({
                          kind: event
                            .target
                            .value as Kind,
                        })
                      }
                      className={`w-full rounded-xl border p-3 ${
                        draft.kind
                          ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                          : "border-rose-400/60 bg-rose-400/10 text-rose-100"
                      }`}
                    >
                      <option value="" className="bg-white text-black">
                        Select event type
                      </option>

                      <option value="head-to-head" className="bg-white text-black">
                        Head-to-head
                      </option>

                      <option value="showcase" className="bg-white text-black">
                        Showcase
                      </option>

                      <option value="other" className="bg-white text-black">
                        Other
                      </option>
                    </select>
                  </label>

                  <Field label="Event name">
                    <input
                      autoFocus
                      value={draft.name}
                      onChange={(event) =>
                        update({
                          name: event
                            .target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Event description">
                    <textarea
                      rows={9}
                      value={
                        draft.description
                      }
                      placeholder="Paste event description here"
                      onChange={(event) =>
                        update({
                          description:
                            event.target
                              .value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Calendar colour">
                    <input type="color" value={draft.color} onChange={(event) => update({ color: event.target.value })} className="h-12 cursor-pointer" />
                  </Field>

                  <Field label="Prize">
                    <input
                      value={draft.prize}
                      onChange={(event) =>
                        update({
                          prize:
                            event.target
                              .value,
                        })
                      }
                    />
                  </Field>

                  {draft.kind !== "showcase" && <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Start Date">
                      <input
                        type="date"
                        value={
                          draft.startDate
                        }
                        onClick={(
                          event,
                        ) => {
                          event.currentTarget.showPicker?.();
                        }}
                        onChange={(event) =>
                          update({
                            startDate:
                              event.target
                                .value,
                          })
                        }
                      />
                    </Field>

                    <Field label="End Date">
                      <input
                        type="date"
                        value={
                          draft.endDate
                        }
                        min={
                          draft.startDate ||
                          undefined
                        }
                        onClick={(
                          event,
                        ) => {
                          event.currentTarget.showPicker?.();
                        }}
                        onChange={(event) =>
                          update({
                            endDate:
                              event.target
                                .value,
                          })
                        }
                      />
                    </Field>
                  </div>}

                  {draft.kind === "showcase" && <div className="grid gap-3">{draft.showcaseRounds.map((round, index) => <div key={index} className="rounded-xl border border-white/15 p-3"><label className="flex items-center gap-2 font-black"><input type="checkbox" checked={round.enabled} onChange={(event) => update({ showcaseRounds: draft.showcaseRounds.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item) })} />Round {index + 1}</label>{round.enabled && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label onClick={(event) => (event.currentTarget.querySelector("input") as HTMLInputElement).showPicker?.()} className="cursor-pointer rounded-xl border border-white/15 bg-black/45 p-3"><span className="mb-2 block text-xs text-white/55">Start date</span><input type="date" value={round.startDate} onChange={(event) => update({ showcaseRounds: draft.showcaseRounds.map((item, itemIndex) => itemIndex === index ? { ...item, startDate: event.target.value } : item) })} /></label><label onClick={(event) => (event.currentTarget.querySelector("input") as HTMLInputElement).showPicker?.()} className="cursor-pointer rounded-xl border border-white/15 bg-black/45 p-3"><span className="mb-2 block text-xs text-white/55">End date</span><input type="date" value={round.endDate} onChange={(event) => update({ showcaseRounds: draft.showcaseRounds.map((item, itemIndex) => itemIndex === index ? { ...item, endDate: event.target.value } : item) })} /></label></div>}</div>)}</div>}

                  {draft.kind ===
                    "head-to-head" && (
                    <Field label="Head-to-head size">
                      <select
                        value={draft.size}
                        onChange={(event) =>
                          update({
                            size: event
                              .target
                              .value,
                          })
                        }
                      >
                        {[
                          "2v2",
                          "4v4",
                          "8v8",
                          "16v16",
                          "32v32",
                          "64v64",
                        ].map((size) => (
                          <option
                            key={size}
                          >
                            {size}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  <div className="mt-3">
                    <div className="mb-4">
                      <p className="text-xs font-black uppercase tracking-[.25em] text-pink-200">
                        Preparation
                      </p>

                      <h3 className="mt-1 text-2xl font-black">
                        Event Setup
                      </h3>
                    </div>

                    <div className="grid gap-4">
                      {setupRows.map(
                        (row) => {
                          const tone =
                            statusColours(
                              row.status,
                            );

                          return (
                            <section
                              key={
                                row.id
                              }
                              className={`rounded-2xl border p-4 transition ${tone.row}`}
                            >
                              <div className="grid gap-4 lg:grid-cols-[1fr_260px] lg:items-start">
                                <div className="grid gap-4">
                                  <h4
                                    className={`font-black ${tone.label}`}
                                  >
                                    {
                                      row.title
                                    }
                                  </h4>

                                  {
                                    row.content
                                  }
                                </div>

                                <StatusControl
                                  value={
                                    row.status
                                  }
                                  onChange={(
                                    status,
                                  ) => {
                                    switch (
                                      row.id
                                    ) {
                                      case "arranged-poster":
                                        updateSetup(
                                          {
                                            arrangedBattlePosterStatus:
                                              status,
                                          },
                                        );
                                        break;

                                      case "creators-selected":
                                        updateSetup(
                                          {
                                            creatorsSelectedStatus:
                                              status,
                                          },
                                        );
                                        break;

                                      case "creator-message":
                                        updateSetup(
                                          {
                                            creatorMessageStatus:
                                              status,
                                          },
                                        );
                                        break;

                                      case "manager-spreadsheet":
                                        updateSetup(
                                          {
                                            managerSpreadsheetStatus:
                                              status,
                                          },
                                        );
                                        break;

                                      case "manager-spreadsheet-sent":
                                        updateSetup(
                                          {
                                            managerSpreadsheetSentStatus:
                                              status,
                                          },
                                        );
                                        break;

                                      case "creator-messages-sent":
                                        updateSetup(
                                          {
                                            creatorMessagesSentStatus:
                                              status,
                                          },
                                        );
                                        break;

                                      case "socials-poster":
                                        updateSetup(
                                          {
                                            socialsPosterStatus:
                                              status,
                                          },
                                        );
                                        break;

                                      case "advert":
                                        updateSetup(
                                          {
                                            advertStatus:
                                              status,
                                          },
                                        );
                                        break;

                                      case "pairing-sheet":
                                        updateSetup(
                                          {
                                            pairingSheetStatus:
                                              status,
                                          },
                                        );
                                        break;
                                    }
                                  }}
                                />
                              </div>
                            </section>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-7 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(null);
                      setEditing(null);
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void save()
                    }
                    disabled={
                      !draft.kind ||
                      !draft.name.trim() ||
                      (draft.kind !== "showcase" && (!draft.startDate || !draft.endDate)) ||
                      saving
                    }
                    className="rounded-xl bg-pink-400 px-5 py-3 font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving
                      ? "Saving…"
                      : "Save Event"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </DataAccessGuard>
  );
}
