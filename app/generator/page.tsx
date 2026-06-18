"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { createClient } from "@supabase/supabase-js";
import * as htmlToImage from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";

type Battle = {
  id: string;
  date: string;
  manager: string;
  name1: string;
  name2: string;
  time: string;
  image1: string;
  image2: string;
};

type Mode = "single" | "mass";

type PosterElementKey = "avatar1" | "avatar2" | "username1" | "username2" | "date";

type PosterElement = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  shadow?: string;
  shadowColor?: string;
  shadowX?: number;
  shadowY?: number;
  shadowBlur?: number;
  letterSpacing?: number;
  fontWeight?: number;
  uppercase?: boolean;
};

type PosterTemplateJson = Record<PosterElementKey, PosterElement> & {
  backgroundUrl?: string;
};

type PosterTemplateRow = {
  id: string;
  name: string;
  background_url: string | null;
  template_json: PosterTemplateJson;
};

const POSTER_WIDTH = 1080;
const POSTER_HEIGHT = 1920;

const ELEMENT_LABELS: Record<PosterElementKey, string> = {
  avatar1: "Avatar 1",
  avatar2: "Avatar 2",
  username1: "Username 1",
  username2: "Username 2",
  date: "Date / Time",
};

const EDIT_PREVIEW_VALUES = {
  username1: "USERNAME123456",
  username2: "USERNAME654321",
  date: "Wednesday 27th June | 8:00PM",
};

const FONT_OPTIONS = [
  "Luckiest Guy",
  "Anton",
  "Bangers",
  "Bebas Neue",
  "Montserrat",
  "Oswald",
  "Poppins",
  "Orbitron",
  "Roboto",
  "Permanent Marker",
  "Fredoka",
  "Teko",
  "Rubik",
  "Impact",
  "Arial",
  "Georgia",
  "Times New Roman",
];

const TEXT_ELEMENT_KEYS: PosterElementKey[] = ["username1", "username2", "date"];

const DEFAULT_TEMPLATE_JSON: PosterTemplateJson = {
  backgroundUrl: "",
  avatar1: { x: 82, y: 570, width: 346, height: 346 },
  avatar2: { x: 651, y: 570, width: 346, height: 346 },
  username1: {
    x: 17,
    y: 953,
    width: 480,
    height: 70,
    fontFamily: "Luckiest Guy",
    fontSize: 58,
    color: "#5CEEFF",
    strokeColor: "black",
    strokeWidth: 2,
    shadow: "2px 2px 0px black",
    shadowColor: "#000000",
    shadowX: 2,
    shadowY: 2,
    shadowBlur: 0,
    letterSpacing: 1,
    fontWeight: 900,
    uppercase: true,
  },
  username2: {
    x: 585,
    y: 953,
    width: 480,
    height: 70,
    fontFamily: "Luckiest Guy",
    fontSize: 58,
    color: "#5CEEFF",
    strokeColor: "black",
    strokeWidth: 2,
    shadow: "2px 2px 0px black",
    shadowColor: "#000000",
    shadowX: 2,
    shadowY: 2,
    shadowBlur: 0,
    letterSpacing: 1,
    fontWeight: 900,
    uppercase: true,
  },
  date: {
    x: 155,
    y: 1337,
    width: 770,
    height: 70,
    fontFamily: "Luckiest Guy",
    fontSize: 62,
    color: "#5CEEFF",
    strokeColor: "black",
    strokeWidth: 2,
    shadow: "3px 3px 0px black",
    shadowColor: "#000000",
    shadowX: 3,
    shadowY: 3,
    shadowBlur: 0,
    letterSpacing: 1,
    fontWeight: 900,
    uppercase: true,
  },
};

function createBlankTemplateJson(): PosterTemplateJson {
  return normalizeTemplateJson({
    ...structuredClone(DEFAULT_TEMPLATE_JSON),
    backgroundUrl: "",
  });
}

function createLocalTemplate(): PosterTemplateRow {
  return {
    id: "local-default",
    name: "Battle Template",
    background_url: DEFAULT_TEMPLATE_JSON.backgroundUrl || BRAND.posterBackground,
    template_json: structuredClone(DEFAULT_TEMPLATE_JSON),
  };
}

function normalizeTemplateJson(input: Partial<PosterTemplateJson> | null | undefined): PosterTemplateJson {
  const incoming = input || {};
  return {
    ...structuredClone(DEFAULT_TEMPLATE_JSON),
    ...incoming,
    avatar1: { ...DEFAULT_TEMPLATE_JSON.avatar1, ...(incoming.avatar1 || {}) },
    avatar2: { ...DEFAULT_TEMPLATE_JSON.avatar2, ...(incoming.avatar2 || {}) },
    username1: { ...DEFAULT_TEMPLATE_JSON.username1, ...(incoming.username1 || {}) },
    username2: { ...DEFAULT_TEMPLATE_JSON.username2, ...(incoming.username2 || {}) },
    date: { ...DEFAULT_TEMPLATE_JSON.date, ...(incoming.date || {}) },
    backgroundUrl:
      Object.prototype.hasOwnProperty.call(incoming, "backgroundUrl")
        ? incoming.backgroundUrl
        : DEFAULT_TEMPLATE_JSON.backgroundUrl || BRAND.posterBackground,
  };
}

function getPosterSupabaseClient() {
  const url =
    process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("SUPABASE URL:", url);
  console.log("SUPABASE KEY:", anonKey ? "FOUND" : "MISSING");

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL missing");
  }

  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY missing");
  }

  return createClient(url, anonKey);
}

const BRAND = {
  name: "Battle Generator",
  manager: "DAN",
  posterBackground: "/posters/dan-battle/background.png",
  zipName: "Dan-Battle-Posters.zip",
};

const DEFAULT_YEAR = 2026;

const MONTHS = [
  { label: "January", value: 0 },
  { label: "February", value: 1 },
  { label: "March", value: 2 },
  { label: "April", value: 3 },
  { label: "May", value: 4 },
  { label: "June", value: 5 },
  { label: "July", value: 6 },
  { label: "August", value: 7 },
  { label: "September", value: 8 },
  { label: "October", value: 9 },
  { label: "November", value: 10 },
  { label: "December", value: 11 },
];

function makeId() {
  return crypto.randomUUID();
}

function createBattle(id?: string): Battle {
  return {
    id: id || makeId(),
    date: "",
    manager: BRAND.manager,
    name1: "",
    name2: "",
    time: "",
    image1: "",
    image2: "",
  };
}

function formatName(raw: string) {
  return raw.replace("@", "").trim().toUpperCase();
}

function getOrdinal(day: number) {
  if (day > 3 && day < 21) return `${day}TH`;

  switch (day % 10) {
    case 1:
      return `${day}ST`;
    case 2:
      return `${day}ND`;
    case 3:
      return `${day}RD`;
    default:
      return `${day}TH`;
  }
}

function formatDate(raw: string) {
  return raw.trim().toUpperCase();
}

function formatDateFromParts(dayRaw: string, monthRaw: string) {
  if (!dayRaw || !monthRaw) return "";

  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const date = new Date(DEFAULT_YEAR, month, day, 12, 0, 0);

  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const monthName = date.toLocaleDateString("en-GB", { month: "long" });

  return `${weekday} ${getOrdinal(day)} ${monthName}`.toUpperCase();
}

function getDaysInMonth(monthRaw: string) {
  if (!monthRaw) return 31;
  return new Date(DEFAULT_YEAR, Number(monthRaw) + 1, 0).getDate();
}

function formatTime(raw: string) {
  if (!raw) return "";

  let value = raw.trim().toLowerCase();
  value = value.replace(/\./g, "");
  value = value.replace(/\s+/g, " ");

  const match = value.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm)?$/);

  if (!match) return raw.toUpperCase();

  let hour = Number(match[1]);
  const minute = match[2] || "00";
  let period = match[3];

  if (!period) period = "pm";

  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute}${period.toUpperCase()}`;
}

function getTimeOptions() {
  const options: string[] = [];

  for (let minutes = 18 * 60; minutes <= 24 * 60; minutes += 15) {
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;

    if (hour24 === 24) {
      options.push("12:00AM");
      continue;
    }

    const period = hour24 >= 12 ? "PM" : "AM";
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;

    options.push(`${hour12}:${String(minute).padStart(2, "0")}${period}`);
  }

  return options;
}

function getTikTokUsername(url: string) {
  const match = url.match(/@([^/?\s]+)/);
  return match ? match[1].toLowerCase() : "";
}

function cleanFileName(value: string) {
  return value
    .replaceAll(" ", "-")
    .replaceAll("/", "-")
    .replaceAll(":", "-")
    .replaceAll("—", "-")
    .replaceAll(",", "")
    .replaceAll("@", "");
}


function addCacheBustToImageUrl(url: string, key?: string | number) {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}avatarRefresh=${key || Date.now()}`;
}

function TextInput({
  label,
  value,
  placeholder,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  return (
    <label className="block">
      <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">
        {label}
      </p>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") e.preventDefault();
        }}
        className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-yellow-300"
      />
    </label>
  );
}

function DayMonthDateSelect({
  day,
  month,
  onDayChange,
  onMonthChange,
}: {
  day: string;
  month: string;
  onDayChange: (value: string) => void;
  onMonthChange: (value: string) => void;
}) {
  const daysInMonth = getDaysInMonth(month);

  return (
    <div>
      <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">
        Date
      </p>

      <div className="grid grid-cols-2 gap-3">
        <select
          value={day}
          onChange={(e) => onDayChange(e.target.value)}
          className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-yellow-300"
        >
          <option value="">Day</option>
          {Array.from({ length: daysInMonth }, (_, index) => {
            const value = String(index + 1);
            return (
              <option key={value} value={value}>
                {getOrdinal(index + 1)}
              </option>
            );
          })}
        </select>

        <select
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-yellow-300"
        >
          <option value="">Month</option>
          {MONTHS.map((monthOption) => (
            <option key={monthOption.value} value={monthOption.value}>
              {monthOption.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TimeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const options = getTimeOptions();

  return (
    <label className="block">
      <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">
        {label}
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-yellow-300"
      >
        <option value="">Select time</option>
        {options.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function BattleGeneratorPage() {
  const stableId = useId().replaceAll(":", "");
  const posterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [activeMode, setActiveMode] = useState<Mode>("single");

  const [paste, setPaste] = useState("");
  const [singlePaste, setSinglePaste] = useState("");
  const [singleBattle, setSingleBattle] = useState<Battle>(() =>
    createBattle(`single-${stableId}`)
  );
  const [singleDay, setSingleDay] = useState("");
  const [singleMonth, setSingleMonth] = useState("5");

  const [massDay, setMassDay] = useState("");
  const [massMonth, setMassMonth] = useState("5");
  const [massDate, setMassDate] = useState("");

  const [battles, setBattles] = useState<Battle[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [templates, setTemplates] = useState<PosterTemplateRow[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("local-default");
  const [selectedElement, setSelectedElement] = useState<PosterElementKey>("avatar1");
  const [templateName, setTemplateName] = useState("Battle Template");
  const [editingTemplateName, setEditingTemplateName] = useState(false);
  const [templateJson, setTemplateJson] = useState<PosterTemplateJson>(() =>
    normalizeTemplateJson(DEFAULT_TEMPLATE_JSON)
  );
  const [templateStatus, setTemplateStatus] = useState("Not saved yet");
  const [undoStack, setUndoStack] = useState<PosterTemplateJson[]>([]);
  const [redoStack, setRedoStack] = useState<PosterTemplateJson[]>([]);

  const selectedBattle = battles.find((b) => b.id === selectedId) || null;

  const blankPreviewBattle: Battle = {
    id: "blank-preview",
    date: "",
    manager: BRAND.manager,
    name1: "",
    name2: "",
    time: "",
    image1: "",
    image2: "",
  };


  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ||
    createLocalTemplate();

  function addUndoSnapshot(snapshot: PosterTemplateJson) {
    setUndoStack((prev) => [...prev.slice(-24), structuredClone(snapshot)]);
    setRedoStack([]);
  }

  function updateTemplateElement(
    key: PosterElementKey,
    changes: Partial<PosterElement>,
    recordUndo = true
  ) {
    setTemplateJson((prev) => {
      if (recordUndo) addUndoSnapshot(prev);
      return {
        ...prev,
        [key]: {
          ...prev[key],
          ...changes,
        },
      };
    });
  }

  function updateWholeTemplateJson(nextJson: PosterTemplateJson, recordUndo = false) {
    setTemplateJson((prev) => {
      if (recordUndo) addUndoSnapshot(prev);
      return normalizeTemplateJson(nextJson);
    });
  }

  function undoLastTemplateChange() {
    setUndoStack((prev) => {
      const previous = prev[prev.length - 1];
      if (!previous) {
        setTemplateStatus("Nothing to undo.");
        return prev;
      }

      setRedoStack((redoPrev) => [...redoPrev.slice(-24), structuredClone(templateJson)]);
      setTemplateJson(normalizeTemplateJson(previous));
      setTemplateStatus("Undo applied. Press Save to keep it.");
      return prev.slice(0, -1);
    });
  }

  function redoLastTemplateChange() {
    setRedoStack((prev) => {
      const next = prev[prev.length - 1];
      if (!next) {
        setTemplateStatus("Nothing to redo.");
        return prev;
      }

      setUndoStack((undoPrev) => [...undoPrev.slice(-24), structuredClone(templateJson)]);
      setTemplateJson(normalizeTemplateJson(next));
      setTemplateStatus("Redo applied. Press Save to keep it.");
      return prev.slice(0, -1);
    });
  }

  async function loadPosterTemplates() {
    const supabase = getPosterSupabaseClient();

    if (!supabase) {
      const local = createLocalTemplate();
      setTemplates([local]);
      setSelectedTemplateId(local.id);
      if (!editingTemplateName) setTemplateName(local.name);
      updateWholeTemplateJson(local.template_json);
      setTemplateStatus("Supabase env not found. Using local template only.");
      return;
    }

    const { data, error } = await supabase
      .from("poster_templates")
      .select("id,name,background_url,template_json")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      const local = createLocalTemplate();
      setTemplates([local]);
      setSelectedTemplateId(local.id);
      if (!editingTemplateName) setTemplateName(local.name);
      updateWholeTemplateJson(local.template_json);
      setTemplateStatus(
        error ? `Template load failed: ${error.message}` : "No templates found. Using local default."
      );
      return;
    }

    const rows = data.map((row) => ({
      ...row,
      template_json: normalizeTemplateJson(row.template_json),
    })) as PosterTemplateRow[];

    setTemplates(rows);
    setSelectedTemplateId(rows[0].id);
    if (!editingTemplateName) setTemplateName(rows[0].name);
    updateWholeTemplateJson(rows[0].template_json);
    setTemplateStatus("Templates loaded.");
  }

  function handleTemplateSelect(id: string) {
    const template = templates.find((item) => item.id === id);
    if (!template) return;

    setSelectedTemplateId(template.id);
    if (!editingTemplateName) setTemplateName(template.name);
    setUndoStack([]);
    updateWholeTemplateJson(template.template_json);
    setTemplateStatus(`Loaded ${template.name}.`);
  }

  async function saveCurrentTemplate() {
    const supabase = getPosterSupabaseClient();
    const nextJson = normalizeTemplateJson(templateJson);

    if (!templateName.trim()) {
      alert("Name the template first.");
      return;
    }

    const localFallbackSave = (message: string) => {
      const local: PosterTemplateRow = {
        id: selectedTemplateId || `local-${makeId()}`,
        name: templateName.trim(),
        background_url: nextJson.backgroundUrl || null,
        template_json: nextJson,
      };

      setTemplates((prev) => {
        const exists = prev.some((item) => item.id === local.id);
        return exists
          ? prev.map((item) => (item.id === local.id ? local : item))
          : [...prev, local];
      });
      setSelectedTemplateId(local.id);
      setUndoStack([]);
      setTemplateStatus(message);
    };

    if (!supabase) {
      localFallbackSave("Saved locally only. Supabase env is missing.");
      return;
    }

    setTemplateStatus("Saving template...");

    try {
      if (selectedTemplateId === "local-default" || selectedTemplateId.startsWith("local-")) {
        const { data, error } = await supabase
          .from("poster_templates")
          .insert({
            name: templateName.trim(),
            background_url: nextJson.backgroundUrl || null,
            template_json: nextJson,
          })
          .select("id,name,background_url,template_json")
          .single();

        if (error || !data) {
          setTemplateStatus(`Save failed: ${error?.message || "unknown error"}`);
          return;
        }

        const row = {
          ...data,
          template_json: normalizeTemplateJson(data.template_json),
        } as PosterTemplateRow;

        setTemplates((prev) => [
          ...prev.filter((item) => item.id !== "local-default" && item.id !== selectedTemplateId),
          row,
        ]);
        setSelectedTemplateId(row.id);
        setTemplateName(row.name);
        setUndoStack([]);
        updateWholeTemplateJson(row.template_json);
        setTemplateStatus("Template saved to Supabase.");
        return;
      }

      const { error } = await supabase
        .from("poster_templates")
        .update({
          name: templateName.trim(),
          background_url: nextJson.backgroundUrl || null,
          template_json: nextJson,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTemplateId);

      if (error) {
        setTemplateStatus(`Save failed: ${error.message}`);
        return;
      }

      setTemplates((prev) =>
        prev.map((item) =>
          item.id === selectedTemplateId
            ? {
                ...item,
                name: templateName.trim(),
                background_url: nextJson.backgroundUrl || null,
                template_json: nextJson,
              }
            : item
        )
      );
      setUndoStack([]);
      setTemplateStatus("Template saved to Supabase.");
    } catch (error) {
      console.error("TEMPLATE SAVE ERROR:", error);
      const message = error instanceof Error ? error.message : "unknown error";
      localFallbackSave(`Save failed online: ${message}. Changes are kept locally until reload.`);
    }
  }

  function resetTemplateToDefault() {
    updateWholeTemplateJson(DEFAULT_TEMPLATE_JSON, true);
    setTemplateStatus("Template reset to default positions. Press Save to keep it.");
  }


  function createNewTemplate() {
    const nextJson = createBlankTemplateJson();
    const localId = `local-${makeId()}`;
    const nextTemplate: PosterTemplateRow = {
      id: localId,
      name: "New Template",
      background_url: null,
      template_json: nextJson,
    };

    setTemplates((prev) => [...prev, nextTemplate]);
    setSelectedTemplateId(localId);
    setTemplateName("New Template");
    setUndoStack([]);
    updateWholeTemplateJson(nextJson);
    setSelectedElement("avatar1");
    setEditMode(true);
    setTemplateStatus("New blank template created. Import a background, then press Save.");
  }

  async function duplicateCurrentTemplate() {
    const supabase = getPosterSupabaseClient();
    const nextJson = normalizeTemplateJson(templateJson);
    const copyName = `${templateName || selectedTemplate.name || "Template"} Copy`;

    if (!supabase) {
      const localId = `local-${makeId()}`;
      const nextTemplate: PosterTemplateRow = {
        id: localId,
        name: copyName,
        background_url: nextJson.backgroundUrl || null,
        template_json: nextJson,
      };

      setTemplates((prev) => [...prev, nextTemplate]);
      setSelectedTemplateId(localId);
      setTemplateName(copyName);
      updateWholeTemplateJson(nextJson);
      setTemplateStatus("Template duplicated locally. Supabase env is missing.");
      return;
    }

    setTemplateStatus("Duplicating template...");

    const { data, error } = await supabase
      .from("poster_templates")
      .insert({
        name: copyName,
        background_url: nextJson.backgroundUrl || null,
        template_json: nextJson,
      })
      .select("id,name,background_url,template_json")
      .single();

    if (error || !data) {
      setTemplateStatus(`Duplicate failed: ${error?.message || "unknown error"}`);
      return;
    }

    const row = {
      ...data,
      template_json: normalizeTemplateJson(data.template_json),
    } as PosterTemplateRow;

    setTemplates((prev) => [...prev, row]);
    setSelectedTemplateId(row.id);
    setTemplateName(row.name);
    updateWholeTemplateJson(row.template_json);
    setTemplateStatus("Template duplicated.");
  }

  async function deleteCurrentTemplate() {
    if (templates.length <= 1) {
      alert("You need at least one template.");
      return;
    }

    const confirmed = window.confirm(`Delete template "${templateName}"?`);
    if (!confirmed) return;

    const supabase = getPosterSupabaseClient();

    if (supabase && !selectedTemplateId.startsWith("local-") && selectedTemplateId !== "local-default") {
      setTemplateStatus("Deleting template...");

      const { error } = await supabase
        .from("poster_templates")
        .delete()
        .eq("id", selectedTemplateId);

      if (error) {
        setTemplateStatus(`Delete failed: ${error.message}`);
        return;
      }
    }

    const remaining = templates.filter((item) => item.id !== selectedTemplateId);
    const fallback = remaining[0] || createLocalTemplate();

    setTemplates(remaining.length ? remaining : [fallback]);
    setSelectedTemplateId(fallback.id);
    setTemplateName(fallback.name);
    updateWholeTemplateJson(fallback.template_json);
    setSelectedElement("avatar1");
    setTemplateStatus("Template deleted.");
  }

  async function handleBackgroundUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload a PNG or JPG image.");
      return;
    }

    const supabase = getPosterSupabaseClient();

    if (!supabase) {
      const reader = new FileReader();

      reader.onload = () => {
        const image = String(reader.result || "");
        updateWholeTemplateJson({
          ...templateJson,
          backgroundUrl: image,
        }, true);
        setTemplateStatus("Background set locally. Supabase env is missing, so it will not persist online.");
      };

      reader.readAsDataURL(file);
      return;
    }

    setTemplateStatus("Uploading background...");

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    const filePath = `${selectedTemplateId || "template"}/${Date.now()}-${safeName}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("poster-backgrounds")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      setTemplateStatus(`Background upload failed: ${uploadError.message}`);
      return;
    }

    const { data } = supabase.storage
      .from("poster-backgrounds")
      .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    updateWholeTemplateJson({
      ...templateJson,
      backgroundUrl: publicUrl,
    }, true);

    setTemplateStatus("Background uploaded. Press Save to attach it to this template.");
  }

  useEffect(() => {
    loadPosterTemplates();
  }, []);

  useEffect(() => {
    if (!editMode) return;

    function onKeyDown(event: KeyboardEvent) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName)) {
        return;
      }

      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }

      event.preventDefault();

      const step = event.shiftKey ? 10 : 1;
      const current = templateJson[selectedElement];
      if (!current) return;

      const changes: Partial<PosterElement> = {};

      if (event.key === "ArrowUp") changes.y = current.y - step;
      if (event.key === "ArrowDown") changes.y = current.y + step;
      if (event.key === "ArrowLeft") changes.x = current.x - step;
      if (event.key === "ArrowRight") changes.x = current.x + step;

      updateTemplateElement(selectedElement, changes);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editMode, selectedElement, templateJson]);

  useEffect(() => {
    const username = singleBattle.name1.replace("@", "").trim();
    if (!username || singleBattle.image1) return;

    const timer = setTimeout(async () => {
      const avatar = await fetchTikTokAvatar(username);
      if (avatar) updateSingleBattle({ image1: avatar });
    }, 700);

    return () => clearTimeout(timer);
  }, [singleBattle.name1, singleBattle.image1]);

  useEffect(() => {
    const username = singleBattle.name2.replace("@", "").trim();
    if (!username || singleBattle.image2) return;

    const timer = setTimeout(async () => {
      const avatar = await fetchTikTokAvatar(username);
      if (avatar) updateSingleBattle({ image2: avatar });
    }, 700);

    return () => clearTimeout(timer);
  }, [singleBattle.name2, singleBattle.image2]);

  function updateSingleDate(day: string, month: string) {
    updateSingleBattle({ date: formatDateFromParts(day, month) });
  }

  function handleSingleDayChange(value: string) {
    setSingleDay(value);
    updateSingleDate(value, singleMonth);
  }

  function handleSingleMonthChange(value: string) {
    const daysInNewMonth = getDaysInMonth(value);
    const fixedDay =
      singleDay && Number(singleDay) > daysInNewMonth
        ? String(daysInNewMonth)
        : singleDay;

    setSingleMonth(value);
    setSingleDay(fixedDay);
    updateSingleDate(fixedDay, value);
  }

  function handleMassDayChange(value: string) {
    setMassDay(value);
    setMassDate(formatDateFromParts(value, massMonth));
  }

  function handleMassMonthChange(value: string) {
    const daysInNewMonth = getDaysInMonth(value);
    const fixedDay =
      massDay && Number(massDay) > daysInNewMonth
        ? String(daysInNewMonth)
        : massDay;

    setMassMonth(value);
    setMassDay(fixedDay);
    setMassDate(formatDateFromParts(fixedDay, value));
  }

  function updateBattle(id: string, changes: Partial<Battle>) {
    setBattles((prev) =>
      prev.map((battle) =>
        battle.id === id ? { ...battle, ...changes } : battle
      )
    );

    setSingleBattle((prev) =>
      prev.id === id ? { ...prev, ...changes } : prev
    );
  }

  function updateSingleBattle(changes: Partial<Battle>) {
    setSingleBattle((prev) => ({ ...prev, ...changes }));
  }

  function clearSinglePoster() {
    setSingleBattle(createBattle(`single-${stableId}`));
    setSinglePaste("");
    setSingleDay("");
    setSingleMonth("5");
    setSelectedId("");
  }

  function clearMassPosters() {
    setPaste("");
    setBattles([]);
    setSelectedId("");
    setMassDay("");
    setMassMonth("5");
    setMassDate("");
  }

  async function fetchTikTokAvatar(username: string) {
    const cleanUsername = username.replace("@", "").trim().toLowerCase();
    if (!cleanUsername) return "";

    const refreshKey = Date.now();

    try {
      const res = await fetch("/api/tiktok-avatar-v2", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        body: JSON.stringify({
          username: cleanUsername,
          forceRefresh: true,
          refresh: refreshKey,
        }),
      });

      const json = await res.json();
      if (!json.avatar) return "";

      return `/api/tiktok-avatar-image?url=${encodeURIComponent(
        json.avatar
      )}&refresh=${refreshKey}`;
    } catch {
      return "";
    }
  }

  async function autoFillSingleAvatar(
    field: "image1" | "image2",
    username: string
  ) {
    const cleanUsername = username.replace("@", "").trim();
    if (!cleanUsername) return;

    const avatar = await fetchTikTokAvatar(cleanUsername);
    if (!avatar) return;

    updateSingleBattle({ [field]: avatar });
  }

  async function autoFillBattleAvatar(
    id: string,
    field: "image1" | "image2",
    username: string
  ) {
    const cleanUsername = username.replace("@", "").trim();
    if (!cleanUsername) return;

    const avatar = await fetchTikTokAvatar(cleanUsername);
    if (!avatar) return;

    updateBattle(id, { [field]: avatar });
  }

  async function refreshTikTokAvatar(
    battle: Battle,
    field: "image1" | "image2",
    single = false
  ) {
    const username = field === "image1" ? battle.name1 : battle.name2;
    const cleanUsername = username.replace("@", "").trim();
    if (!cleanUsername) return;

    const avatar = await fetchTikTokAvatar(cleanUsername);
    if (!avatar) return;

    if (single) {
      updateSingleBattle({ [field]: avatar });
    } else {
      updateBattle(battle.id, { [field]: avatar });
    }
  }

  function uploadImageFile(
    file: File,
    id: string,
    field: "image1" | "image2",
    single = false
  ) {
    const reader = new FileReader();

    reader.onload = () => {
      const image = reader.result as string;

      if (single) {
        updateSingleBattle({ [field]: image });
      } else {
        updateBattle(id, { [field]: image });
      }
    };

    reader.readAsDataURL(file);
  }

  function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    id: string,
    field: "image1" | "image2",
    single = false
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadImageFile(file, id, field, single);
  }

  function handleDrop(
    e: React.DragEvent<HTMLDivElement>,
    id: string,
    field: "image1" | "image2",
    single = false
  ) {
    e.preventDefault();

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    uploadImageFile(file, id, field, single);
  }

  async function parseSingleBattleRow(row: string) {
  const parts = row.split(/\t+/);

  const selectedDate =
    singleBattle.date || massDate || formatDateFromParts(singleDay, singleMonth);

  const name1Raw =
    getTikTokUsername(parts[3] || "") ||
    String(parts[0] || "").replace("@", "").trim().toLowerCase();

  const name2Raw = getTikTokUsername(parts[5] || "");

  const time = formatTime(parts[6] || parts[4] || "");
  const manager = formatDate(parts[1] || BRAND.manager);

  const image1 = await fetchTikTokAvatar(name1Raw);
  const image2 = await fetchTikTokAvatar(name2Raw);

  return {
    id: makeId(),
    date: selectedDate,
    manager,
    name1: formatName(name1Raw),
    name2: formatName(name2Raw),
    time,
    image1,
    image2,
  };
}

  async function parseMassBattleRow(row: string, selectedDate: string) {
    const parts = row.split(/\t+/);

    const name1Raw =
      getTikTokUsername(parts[3] || "") ||
      String(parts[0] || "").replace("@", "").trim().toLowerCase();

    const name2Raw = getTikTokUsername(parts[5] || "");

    const time = formatTime(parts[6] || parts[4] || "");
    const manager = formatDate(parts[1] || BRAND.manager);

    const image1 = await fetchTikTokAvatar(name1Raw);
    const image2 = await fetchTikTokAvatar(name2Raw);

    return {
      id: makeId(),
      date: selectedDate,
      manager,
      name1: formatName(name1Raw),
      name2: formatName(name2Raw),
      time,
      image1,
      image2,
    };
  }

  async function readSinglePaste() {
    const row = singlePaste
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    if (!row) return;

    setLoading(true);

    const parsed = await parseSingleBattleRow(row);

    setSingleBattle(parsed);
    setSelectedId(parsed.id);

    setLoading(false);
  }

  async function readRows() {
    if (!massDate) {
      alert("Please select a date for the mass posters first.");
      return;
    }

    setLoading(true);

    const rows = paste
      .split("\n")
      .map((row) => row.trim())
      .filter((row) => row.length > 0);

    const parsed: Battle[] = [];

    for (const row of rows) {
      parsed.push(await parseMassBattleRow(row, massDate));
    }

    setBattles(parsed);
    setSelectedId(parsed[0]?.id || "");
    setLoading(false);
  }

  async function imageToDataUrl(src: string) {
    if (!src || src.startsWith("data:")) return src;

    try {
      const res = await fetch(src, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!res.ok) return src;

      const blob = await res.blob();

      return await new Promise<string>((resolve) => {
        const reader = new FileReader();

        reader.onloadend = () => {
          resolve(String(reader.result || src));
        };

        reader.onerror = () => {
          resolve(src);
        };

        reader.readAsDataURL(blob);
      });
    } catch {
      return src;
    }
  }

  async function waitForPosterImages(node: HTMLElement) {
    const images = Array.from(node.querySelectorAll("img"));

    await Promise.all(
      images.map((image) => {
        if (image.complete && image.naturalWidth > 0) return Promise.resolve();

        return new Promise<void>((resolve) => {
          image.onload = () => resolve();
          image.onerror = () => resolve();
        });
      }),
    );

    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  async function makePosterBlob(battle: Battle) {
    await document.fonts.ready;

    const node = posterRefs.current[battle.id];
    if (!node) return null;

    const originalImageSrcs: Array<{ image: HTMLImageElement; src: string }> = [];

    try {
      const images = Array.from(node.querySelectorAll("img"));

      for (const image of images) {
        originalImageSrcs.push({ image, src: image.src });

        if (
          image.src.includes("/api/tiktok-avatar-image") ||
          image.src.includes("tikcdn") ||
          image.src.includes("tiktok")
        ) {
          image.src = await imageToDataUrl(image.src);
        }
      }

      await waitForPosterImages(node);

      const blob = await htmlToImage.toBlob(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#000000",
      });

      return blob;
    } catch (err) {
      console.error("POSTER EXPORT ERROR:", err);
      return null;
    } finally {
      for (const item of originalImageSrcs) {
        item.image.src = item.src;
      }
    }
  }

  function getPosterFileName(battle: Battle) {
    const creator1 = battle.name1 || "CREATOR1";
    const creator2 = battle.name2 || "CREATOR2";
    const date = battle.date || "DATE";
    const time = battle.time || "TIME";

    return cleanFileName(`${creator1} VS ${creator2} - ${date} - ${time}.png`);
  }

  async function downloadSinglePoster() {
    const battle: Battle = {
      ...singleBattle,
      manager: BRAND.manager,
      name1: formatName(singleBattle.name1),
      name2: formatName(singleBattle.name2),
      date: formatDate(singleBattle.date),
      time: formatTime(singleBattle.time),
    };

    if (!battle.image1 && battle.name1) {
      battle.image1 = await fetchTikTokAvatar(battle.name1);
    }

    if (!battle.image2 && battle.name2) {
      battle.image2 = await fetchTikTokAvatar(battle.name2);
    }

    setSingleBattle(battle);

    setTimeout(async () => {
      const blob = await makePosterBlob(battle);
      if (!blob) return;
      saveAs(blob, getPosterFileName(battle));
    }, 100);
  }

  async function downloadAllPosters() {
    const zip = new JSZip();

    for (const battle of battles) {
      const blob = await makePosterBlob(battle);
      if (!blob) continue;

      const managerFolder = zip.folder(battle.manager || "UNKNOWN");
      managerFolder?.file(getPosterFileName(battle), blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, BRAND.zipName);
  }

  async function downloadSelectedPoster() {
    if (!selectedBattle) return;

    const blob = await makePosterBlob(selectedBattle);
    if (!blob) return;

    saveAs(blob, getPosterFileName(selectedBattle));
  }

  async function saveAllToFolder() {
    try {
      setSaving(true);

      const picker = window as typeof window & {
        showDirectoryPicker?: () => Promise<any>;
      };

      if (!picker.showDirectoryPicker) {
        alert(
          "Save to Folder only works in Chrome or Edge. Use Download ZIP instead."
        );
        return;
      }

      const rootHandle = await picker.showDirectoryPicker();

      for (const battle of battles) {
        const blob = await makePosterBlob(battle);
        if (!blob) continue;

        const managerHandle = await rootHandle.getDirectoryHandle(
          battle.manager || "UNKNOWN",
          { create: true }
        );

        const fileHandle = await managerHandle.getFileHandle(
          getPosterFileName(battle),
          { create: true }
        );

        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      }

      alert("Posters saved into manager folders.");
    } catch (err) {
      console.error("SAVE TO FOLDER ERROR:", err);
      alert("Save cancelled or failed.");
    } finally {
      setSaving(false);
    }
  }

  function DropPhotoBox({
    battle,
    field,
    label,
    single = false,
  }: {
    battle: Battle;
    field: "image1" | "image2";
    label: string;
    single?: boolean;
  }) {
    const inputId = `${battle.id}-${field}-${single ? "single" : "bulk"}`;
    const image = battle[field];

    return (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, battle.id, field, single)}
        className="rounded-lg border-2 border-dashed border-yellow-300/40 bg-black/45 p-4 text-center hover:border-yellow-300 transition"
      >
        <p className="text-yellow-300 font-black uppercase text-sm tracking-widest">
          {label}
        </p>

        {image ? (
          <img
            src={addCacheBustToImageUrl(image, `${battle.id}-${field}-${field === "image1" ? battle.name1 : battle.name2}`)}
            alt=""
            className="w-24 h-24 rounded-full object-cover mx-auto mt-3 border-2 border-yellow-300"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-black/60 mx-auto mt-3 border border-white/10 flex items-center justify-center text-white/25 text-xs">
            No image
          </div>
        )}

        <p className="text-white/45 text-xs mt-3">
          Drag photo here or click to choose
        </p>

        <div className="mt-3 flex flex-col gap-2 items-center">
          <label
            htmlFor={inputId}
            className="inline-block cursor-pointer bg-yellow-300 text-black font-black px-4 py-2 rounded uppercase text-xs"
          >
            Choose Image
          </label>

          <button
            type="button"
            onClick={() => refreshTikTokAvatar(battle, field, single)}
            disabled={!(field === "image1" ? battle.name1 : battle.name2)}
            className="bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black px-4 py-2 rounded uppercase text-xs"
          >
            Refresh TikTok Photo
          </button>
        </div>

        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleImageUpload(e, battle.id, field, single)}
        />
      </div>
    );
  }

  function PosterPreview({
    battle,
    scale = 0.3,
  }: {
    battle: Battle;
    scale?: number;
  }) {
    const combinedDateTime =
      battle.date && battle.time
        ? `${battle.date} | ${battle.time}`
        : battle.date || battle.time;

    const activeTemplate = normalizeTemplateJson(templateJson);
    const backgroundUrl = activeTemplate.backgroundUrl ?? BRAND.posterBackground;

    const displayName1 = editMode
      ? EDIT_PREVIEW_VALUES.username1
      : battle.name1.toUpperCase();
    const displayName2 = editMode
      ? EDIT_PREVIEW_VALUES.username2
      : battle.name2.toUpperCase();
    const displayDate = editMode
      ? EDIT_PREVIEW_VALUES.date
      : combinedDateTime.toUpperCase();

    function autoFontSize(value: string, element: PosterElement, fallback: number) {
      if (editMode) return element.fontSize || fallback;
      return Math.max(26, Math.min(element.fontSize || fallback, fallback - value.length * 0.9));
    }

    function renderAvatar(
      key: "avatar1" | "avatar2",
      image: string,
      label: string,
      nameKey: string
    ) {
      const element = activeTemplate[key];
      const isSelected = editMode && selectedElement === key;
      const content = editMode ? (
        <div className="w-full h-full rounded-full border-[8px] border-dashed border-cyan-300/90 bg-black/45 flex items-center justify-center text-cyan-200 text-4xl font-black uppercase tracking-widest">
          {label}
        </div>
      ) : image ? (
        <img
          crossOrigin="anonymous"
          src={addCacheBustToImageUrl(image, `${battle.id}-${key}-${nameKey}`)}
          className="w-full h-full rounded-full object-cover"
          alt=""
        />
      ) : null;

      if (!content) return null;

      if (!editMode) {
        return (
          <div
            className="absolute rounded-full overflow-hidden"
            style={{
              left: element.x,
              top: element.y,
              width: element.width,
              height: element.height,
            }}
          >
            {content}
          </div>
        );
      }

      return (
        <Rnd
          key={key}
          scale={scale}
          bounds="parent"
          position={{ x: element.x, y: element.y }}
          size={{ width: element.width, height: element.height }}
          onMouseDown={() => setSelectedElement(key)}
          onDragStop={(_, data) => {
            setSelectedElement(key);
            updateTemplateElement(key, { x: Math.round(data.x), y: Math.round(data.y) });
          }}
          onResizeStop={(_, __, ref, ___, position) => {
            setSelectedElement(key);
            updateTemplateElement(key, {
              x: Math.round(position.x),
              y: Math.round(position.y),
              width: Math.round(ref.offsetWidth),
              height: Math.round(ref.offsetHeight),
            });
          }}
          className={`rounded-full ${isSelected ? "ring-[10px] ring-yellow-300" : "ring-[6px] ring-cyan-300/45"}`}
        >
          {content}
        </Rnd>
      );
    }

    function renderText(
      key: "username1" | "username2" | "date",
      value: string,
      fallbackSize: number
    ) {
      if (!value) return null;

      const element = activeTemplate[key];
      const isSelected = editMode && selectedElement === key;
      const fontSize = key === "date" ? element.fontSize || fallbackSize : autoFontSize(value, element, fallbackSize);

      const content = (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            color: element.color || "#5CEEFF",
            fontFamily: `'${element.fontFamily || "Luckiest Guy"}', sans-serif`,
            WebkitTextStroke: `${element.strokeWidth ?? 2}px ${element.strokeColor || "black"}`,
            textShadow: `${element.shadowX ?? 2}px ${element.shadowY ?? 2}px ${element.shadowBlur ?? 0}px ${element.shadowColor || "#000000"}`,
            letterSpacing: `${element.letterSpacing ?? 1}px`,
            fontSize,
            fontWeight: element.fontWeight || 900,
            textTransform: element.uppercase === false ? "none" : "uppercase",
          }}
        >
          <span className="leading-none text-center whitespace-nowrap">
            {value}
          </span>
        </div>
      );

      if (!editMode) {
        return (
          <div
            className="absolute"
            style={{
              left: element.x,
              top: element.y,
              width: element.width,
              height: element.height,
            }}
          >
            {content}
          </div>
        );
      }

      return (
        <Rnd
          key={key}
          scale={scale}
          bounds="parent"
          position={{ x: element.x, y: element.y }}
          size={{ width: element.width, height: element.height }}
          onMouseDown={() => setSelectedElement(key)}
          onDragStop={(_, data) => {
            setSelectedElement(key);
            updateTemplateElement(key, { x: Math.round(data.x), y: Math.round(data.y) });
          }}
          onResizeStop={(_, __, ref, ___, position) => {
            setSelectedElement(key);

            const newWidth = Math.round(ref.offsetWidth);
            const newHeight = Math.round(ref.offsetHeight);
            const oldHeight = element.height || newHeight;
            const currentFontSize = element.fontSize || fallbackSize;
            const scaleFactor = oldHeight > 0 ? newHeight / oldHeight : 1;
            const newFontSize = Math.max(10, Math.round(currentFontSize * scaleFactor));

            updateTemplateElement(key, {
              x: Math.round(position.x),
              y: Math.round(position.y),
              width: newWidth,
              height: newHeight,
              fontSize: newFontSize,
            });
          }}
          className={`${isSelected ? "ring-[8px] ring-yellow-300" : "ring-[5px] ring-cyan-300/45"} bg-black/10`}
        >
          {content}
        </Rnd>
      );
    }

    return (
      <div className="w-[324px] h-[576px] overflow-hidden mx-auto bg-black rounded-lg">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            ref={(el) => {
              posterRefs.current[battle.id] = el;
            }}
            className="relative w-[1080px] h-[1920px] overflow-hidden bg-black"
            onMouseDown={() => editMode && setSelectedElement(selectedElement)}
          >
            {backgroundUrl ? (
              <img
                src={backgroundUrl}
                className="absolute inset-0 w-full h-full object-cover"
                alt=""
              />
            ) : (
              <div className="absolute inset-0 bg-black border-[8px] border-dashed border-white/25 flex items-center justify-center text-white/25 text-6xl font-black uppercase tracking-widest">
                No Background
              </div>
            )}

            {renderAvatar("avatar1", battle.image1, "Avatar 1", battle.name1)}
            {renderAvatar("avatar2", battle.image2, "Avatar 2", battle.name2)}
            {renderText("username1", displayName1, 58)}
            {renderText("username2", displayName2, 58)}
            {renderText("date", displayDate, 62)}
          </div>
        </div>
      </div>
    );
  }

  function TemplateControls() {
    const element = templateJson[selectedElement];
    const isTextElement = TEXT_ELEMENT_KEYS.includes(selectedElement);
    const backgroundUrl = templateJson.backgroundUrl ?? "";
    const backgroundInputId = `background-upload-${stableId}`;

    return (
      <div
        className="bg-black/35 border border-cyan-300/25 rounded-xl p-5 space-y-5"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col xl:flex-row gap-4 xl:items-end xl:justify-between">
          <div className="space-y-2 flex-1">
            <h2 className="text-cyan-300 font-black uppercase tracking-widest">
              Poster Template
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3">
              <label className="block">
                <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">
                  Select Template
                </p>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>

              <TextInput
                label="Template Name"
                value={templateName}
                placeholder="Battle Template"
                onChange={(value) => {
                  setEditingTemplateName(true);
                  setTemplateName(value);
                }}
                onBlur={() => setEditingTemplateName(false)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-9 gap-2">
            <button
              type="button"
              onClick={() => setEditMode((prev) => !prev)}
              className={`px-4 py-3 rounded-lg font-black uppercase tracking-widest transition ${
                editMode
                  ? "bg-cyan-300 text-black"
                  : "bg-black/40 text-white border border-white/20 hover:border-cyan-300"
              }`}
            >
              {editMode ? "Exit Edit" : "Edit"}
            </button>

            <button
              type="button"
              onClick={createNewTemplate}
              className="bg-black/40 hover:border-cyan-300 text-white border border-white/20 font-black px-4 py-3 rounded-lg uppercase tracking-widest transition"
            >
              New
            </button>

            <button
              type="button"
              onClick={undoLastTemplateChange}
              disabled={undoStack.length === 0}
              className="bg-purple-400 hover:bg-purple-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black px-4 py-3 rounded-lg uppercase tracking-widest transition"
            >
              ↶ Undo
            </button>

            <button
              type="button"
              onClick={redoLastTemplateChange}
              disabled={redoStack.length === 0}
              className="bg-purple-300 hover:bg-purple-200 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black px-4 py-3 rounded-lg uppercase tracking-widest transition"
            >
              ↷ Redo
            </button>

            <button
              type="button"
              onClick={duplicateCurrentTemplate}
              className="bg-black/40 hover:border-cyan-300 text-white border border-white/20 font-black px-4 py-3 rounded-lg uppercase tracking-widest transition"
            >
              Duplicate
            </button>

            <button
              type="button"
              onClick={saveCurrentTemplate}
              className="bg-yellow-300 hover:bg-yellow-200 text-black font-black px-4 py-3 rounded-lg uppercase tracking-widest transition"
            >
              Save
            </button>

            <button
              type="button"
              onClick={deleteCurrentTemplate}
              className="bg-red-500/90 hover:bg-red-400 text-white font-black px-4 py-3 rounded-lg uppercase tracking-widest transition"
            >
              Delete
            </button>

            <button
              type="button"
              onClick={resetTemplateToDefault}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black px-4 py-3 rounded-lg uppercase tracking-widest transition"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={loadPosterTemplates}
              className="bg-black/40 hover:border-cyan-300 text-white border border-white/20 font-black px-4 py-3 rounded-lg uppercase tracking-widest transition"
            >
              Reload
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4">
          <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-3">
            <p className="text-white/55 text-xs font-black uppercase tracking-widest">
              Background
            </p>

            <div className="aspect-[9/16] max-h-[320px] rounded-lg overflow-hidden border border-white/15 bg-black mx-auto">
              {backgroundUrl ? (
                <img
                  src={backgroundUrl}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                  No background
                </div>
              )}
            </div>

            <label
              htmlFor={backgroundInputId}
              className="block text-center cursor-pointer bg-cyan-300 hover:bg-cyan-200 transition text-black font-black px-4 py-3 rounded-lg uppercase tracking-widest text-xs"
            >
              Import Background
            </label>

            <input
              id={backgroundInputId}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBackgroundUpload}
            />

            <p className="text-white/35 text-xs">
              Upload PNG/JPG. Press Save after upload to attach it to this template.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-4">
            <div className="space-y-2">
              <p className="text-white/55 text-xs font-black uppercase tracking-widest">
                Select Element
              </p>
              <div className="grid grid-cols-2 xl:grid-cols-1 gap-2">
                {(Object.keys(ELEMENT_LABELS) as PosterElementKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedElement(key)}
                    className={`text-left px-3 py-2 rounded-lg font-black uppercase tracking-widest text-xs transition ${
                      selectedElement === key
                        ? "bg-cyan-300 text-black"
                        : "bg-black/40 text-white border border-white/15 hover:border-cyan-300"
                    }`}
                  >
                    {ELEMENT_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                <label>
                  <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">X</p>
                  <input
                    type="number"
                    value={element.x}
                    onChange={(e) => updateTemplateElement(selectedElement, { x: Number(e.target.value) })}
                    className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"
                  />
                </label>

                <label>
                  <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Y</p>
                  <input
                    type="number"
                    value={element.y}
                    onChange={(e) => updateTemplateElement(selectedElement, { y: Number(e.target.value) })}
                    className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"
                  />
                </label>

                <label>
                  <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Width</p>
                  <input
                    type="number"
                    value={element.width}
                    onChange={(e) => updateTemplateElement(selectedElement, { width: Number(e.target.value) })}
                    className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"
                  />
                </label>

                <label>
                  <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Height</p>
                  <input
                    type="number"
                    value={element.height}
                    onChange={(e) => updateTemplateElement(selectedElement, { height: Number(e.target.value) })}
                    className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"
                  />
                </label>
              </div>

              {isTextElement && (
                <div className="bg-black/25 border border-white/10 rounded-lg p-4 space-y-4">
                  <p className="text-cyan-300 text-xs font-black uppercase tracking-widest">
                    Text Styling
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                    <label>
                      <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Font</p>
                      <select
                        value={element.fontFamily || "Luckiest Guy"}
                        onChange={(e) => updateTemplateElement(selectedElement, { fontFamily: e.target.value })}
                        className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"
                      >
                        {FONT_OPTIONS.map((font) => (
                          <option key={font} value={font}>
                            {font}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Font Size</p>
                      <input
                        type="number"
                        value={element.fontSize || 58}
                        onChange={(e) => updateTemplateElement(selectedElement, { fontSize: Number(e.target.value) })}
                        className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"
                      />
                    </label>

                    <label>
                      <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Font Colour</p>
                      <input
                        type="color"
                        value={element.color || "#5CEEFF"}
                        onChange={(e) => updateTemplateElement(selectedElement, { color: e.target.value })}
                        className="w-full h-[46px] bg-black/45 border border-white/15 text-white p-1 rounded-lg outline-none focus:border-cyan-300"
                      />
                    </label>

                    <label>
                      <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Outline Colour</p>
                      <input
                        type="color"
                        value={element.strokeColor || "#000000"}
                        onChange={(e) => updateTemplateElement(selectedElement, { strokeColor: e.target.value })}
                        className="w-full h-[46px] bg-black/45 border border-white/15 text-white p-1 rounded-lg outline-none focus:border-cyan-300"
                      />
                    </label>

                    <label>
                      <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Outline PX</p>
                      <input
                        type="number"
                        min={0}
                        value={element.strokeWidth ?? 2}
                        onChange={(e) => updateTemplateElement(selectedElement, { strokeWidth: Number(e.target.value) })}
                        className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"
                      />
                    </label>

                    <label>
                      <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Weight</p>
                      <select
                        value={element.fontWeight || 900}
                        onChange={(e) => updateTemplateElement(selectedElement, { fontWeight: Number(e.target.value) })}
                        className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"
                      >
                        <option value={400}>Regular</option>
                        <option value={600}>Semi Bold</option>
                        <option value={700}>Bold</option>
                        <option value={800}>Extra Bold</option>
                        <option value={900}>Black</option>
                      </select>
                    </label>

                    <label>
                      <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Letter Space</p>
                      <input
                        type="number"
                        value={element.letterSpacing ?? 1}
                        onChange={(e) => updateTemplateElement(selectedElement, { letterSpacing: Number(e.target.value) })}
                        className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"
                      />
                    </label>

                    <label>
                      <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Shadow Colour</p>
                      <input
                        type="color"
                        value={element.shadowColor || "#000000"}
                        onChange={(e) => updateTemplateElement(selectedElement, { shadowColor: e.target.value })}
                        className="w-full h-[46px] bg-black/45 border border-white/15 text-white p-1 rounded-lg outline-none focus:border-cyan-300"
                      />
                    </label>

                    <label>
                      <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Shadow X</p>
                      <input
                        type="number"
                        value={element.shadowX ?? 2}
                        onChange={(e) => updateTemplateElement(selectedElement, { shadowX: Number(e.target.value) })}
                        className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"
                      />
                    </label>

                    <label>
                      <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Shadow Y</p>
                      <input
                        type="number"
                        value={element.shadowY ?? 2}
                        onChange={(e) => updateTemplateElement(selectedElement, { shadowY: Number(e.target.value) })}
                        className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"
                      />
                    </label>

                    <label>
                      <p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Shadow Blur</p>
                      <input
                        type="number"
                        min={0}
                        value={element.shadowBlur ?? 0}
                        onChange={(e) => updateTemplateElement(selectedElement, { shadowBlur: Number(e.target.value) })}
                        className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"
                      />
                    </label>

                    <label className="flex items-end gap-2 pb-3">
                      <input
                        type="checkbox"
                        checked={element.uppercase !== false}
                        onChange={(e) => updateTemplateElement(selectedElement, { uppercase: e.target.checked })}
                        className="w-5 h-5 accent-cyan-300"
                      />
                      <span className="text-white/70 text-xs font-black uppercase tracking-widest">
                        Uppercase
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-yellow-300 text-xs font-black">
            {templateStatus}
          </p>
          <p className="text-white/45 text-xs">
            In edit mode: click an item, drag it, resize from the corners, or use arrow keys. Hold Shift for 10px movement. Text boxes resize the font when you drag the corners.
          </p>
        </div>
      </div>
    );
  }

  function SelectedPosterEditor() {
    if (!selectedBattle) return null;

    return (
      <div className="bg-black/35 border border-yellow-300/25 rounded-lg p-5 space-y-4">
        <h2 className="text-yellow-300 font-black uppercase tracking-widest">
          Selected Poster Editor
        </h2>

        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full bg-black/50 border border-white/20 text-white p-3 rounded"
        >
          {battles.map((battle) => (
            <option key={battle.id} value={battle.id}>
              {battle.manager} — {battle.name1} VS {battle.name2}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextInput
            label="Username 1"
            value={selectedBattle.name1}
            onChange={(value) =>
              updateBattle(selectedBattle.id, {
                name1: formatName(value),
                image1: "",
              })
            }
            onBlur={() =>
              autoFillBattleAvatar(
                selectedBattle.id,
                "image1",
                selectedBattle.name1
              )
            }
          />

          <TextInput
            label="Username 2"
            value={selectedBattle.name2}
            onChange={(value) =>
              updateBattle(selectedBattle.id, {
                name2: formatName(value),
                image2: "",
              })
            }
            onBlur={() =>
              autoFillBattleAvatar(
                selectedBattle.id,
                "image2",
                selectedBattle.name2
              )
            }
          />

          <TextInput
            label="Date"
            value={selectedBattle.date}
            placeholder="SUNDAY 6TH MAY"
            onChange={(value) =>
              updateBattle(selectedBattle.id, {
                date: formatDate(value),
              })
            }
          />

          <TextInput
            label="Time"
            value={selectedBattle.time}
            placeholder="8:00PM"
            onChange={(value) =>
              updateBattle(selectedBattle.id, {
                time: formatTime(value),
              })
            }
          />

          <TextInput
            label="Manager"
            value={selectedBattle.manager}
            onChange={(value) =>
              updateBattle(selectedBattle.id, {
                manager: formatDate(value),
              })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {DropPhotoBox({
            battle: selectedBattle,
            field: "image1",
            label: "Creator 1 Profile Picture",
          })}

          {DropPhotoBox({
            battle: selectedBattle,
            field: "image2",
            label: "Creator 2 Profile Picture",
          })}
        </div>

        <button
          type="button"
          onClick={downloadSelectedPoster}
          className="w-full bg-yellow-400 hover:bg-yellow-300 transition text-black font-black px-4 py-4 rounded-lg cursor-pointer uppercase tracking-widest"
        >
          Download Selected Poster
        </button>
      </div>
    );
  }

  function PosterGrid({ previewBattle }: { previewBattle?: Battle }) {
    if (previewBattle) {
      return (
        <section className="grid grid-cols-1 2xl:grid-cols-2 gap-x-28 gap-y-16">
          <div className="bg-black/30 p-4 rounded-xl text-left border border-yellow-300/20">
            <div className="text-xs text-yellow-200 font-black mb-3">
              LIVE TEMPLATE PREVIEW
            </div>

            {PosterPreview({ battle: previewBattle })}
          </div>
        </section>
      );
    }

    if (battles.length === 0) {
      return (
        <section className="grid grid-cols-1 2xl:grid-cols-2 gap-x-28 gap-y-16">
          <div className="bg-black/30 p-4 rounded-xl text-left border border-yellow-300/20">
            <div className="text-xs text-yellow-200 font-black mb-3">
              BLANK TEMPLATE PREVIEW
            </div>

            {PosterPreview({ battle: blankPreviewBattle })}
          </div>
        </section>
      );
    }

    return (
      <section className="grid grid-cols-1 2xl:grid-cols-2 gap-x-28 gap-y-16">
        {battles.map((battle) => (
          <button
            key={battle.id}
            type="button"
            onClick={() => setSelectedId(battle.id)}
            className={`bg-black/30 p-4 rounded-xl text-left border transition ${
              selectedId === battle.id
                ? "border-yellow-300"
                : "border-transparent hover:border-white/25"
            }`}
          >
            <div className="text-xs text-yellow-200 font-black mb-3">
              {battle.manager} • {battle.name1 || "CREATOR 1"} VS{" "}
              {battle.name2 || "CREATOR 2"}
            </div>

            {PosterPreview({ battle })}
          </button>
        ))}
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-[#080806] text-white p-8">
      <div className="max-w-[1700px] mx-auto space-y-6">
	<div className="flex gap-3 mb-4">
  <a
    href="/"
    className="bg-yellow-300 text-black font-black px-4 py-3 rounded-lg uppercase tracking-widest hover:bg-yellow-200 transition"
  >
    Home
  </a>

  <a
    href="/events"
    className="bg-black/40 border border-white/20 text-white font-black px-4 py-3 rounded-lg uppercase tracking-widest hover:border-yellow-300 transition"
  >
    Events
  </a>
</div>

        {TemplateControls()}

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-yellow-300 text-3xl font-black tracking-[0.18em] uppercase">
              {BRAND.name}
            </h1>

            <p className="text-white/45 text-sm mt-2">
              Single posters by default. Mass generator is kept in its own section.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setActiveMode("single")}
              className={`px-5 py-4 rounded-lg font-black uppercase tracking-widest transition ${
                activeMode === "single"
                  ? "bg-yellow-300 text-black"
                  : "bg-black/40 text-white border border-white/20 hover:border-yellow-300"
              }`}
            >
              Single Poster
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("mass")}
              className={`px-5 py-4 rounded-lg font-black uppercase tracking-widest transition ${
                activeMode === "mass"
                  ? "bg-yellow-300 text-black"
                  : "bg-black/40 text-white border border-white/20 hover:border-yellow-300"
              }`}
            >
              Mass Poster Generator
            </button>
          </div>
        </div>

        {activeMode === "single" && (
          <div className="grid grid-cols-1 xl:grid-cols-[460px_1fr] gap-8 items-start">
            <section className="space-y-6">
              <div className="bg-black/35 border border-yellow-300/20 rounded-xl p-5 space-y-4">
                <h2 className="text-yellow-300 font-black uppercase tracking-widest">
                  Single Poster
                </h2>

                <TextInput
                  label="Username 1"
                  value={singleBattle.name1}
                  placeholder="CREATOR1"
                  onChange={(value) =>
                    updateSingleBattle({
                      name1: formatName(value),
                      image1: "",
                    })
                  }
                  onBlur={() =>
                    autoFillSingleAvatar("image1", singleBattle.name1)
                  }
                />

                <TextInput
                  label="Username 2"
                  value={singleBattle.name2}
                  placeholder="CREATOR2"
                  onChange={(value) =>
                    updateSingleBattle({
                      name2: formatName(value),
                      image2: "",
                    })
                  }
                  onBlur={() =>
                    autoFillSingleAvatar("image2", singleBattle.name2)
                  }
                />

                <DayMonthDateSelect
                  day={singleDay}
                  month={singleMonth}
                  onDayChange={handleSingleDayChange}
                  onMonthChange={handleSingleMonthChange}
                />

                <TimeSelect
                  label="Time"
                  value={singleBattle.time}
                  onChange={(value) => updateSingleBattle({ time: value })}
                />

                <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                  <p className="text-white/45 text-xs uppercase tracking-widest font-black">
                    Selected Date
                  </p>
                  <p className="text-yellow-300 font-black mt-1">
                    {singleBattle.date || "NO DATE SELECTED"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DropPhotoBox
                    battle={singleBattle}
                    field="image1"
                    label="Creator 1 Profile Picture"
                    single
                  />

                  <DropPhotoBox
                    battle={singleBattle}
                    field="image2"
                    label="Creator 2 Profile Picture"
                    single
                  />
                </div>

                <button
                  type="button"
                  onClick={downloadSinglePoster}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 transition text-black font-black px-4 py-5 rounded-lg cursor-pointer uppercase tracking-widest"
                >
                  Download Poster
                </button>

                <button
                  type="button"
                  onClick={clearSinglePoster}
                  className="w-full bg-white/10 hover:bg-white/20 transition text-white font-black px-4 py-4 rounded-lg cursor-pointer uppercase tracking-widest border border-white/20"
                >
                  Clear Single Poster
                </button>
              </div>

              <div className="bg-black/35 border border-white/15 rounded-xl p-5 space-y-4">
                <h2 className="text-yellow-300 font-black uppercase tracking-widest">
                  Or Paste One Battle Line
                </h2>

                <textarea
                  value={singlePaste}
                  onChange={(e) => setSinglePaste(e.target.value)}
                  placeholder="Paste one battle row here"
                  className="w-full h-36 bg-black/40 border border-white/20 text-white p-5 rounded-lg text-sm outline-none focus:border-yellow-300"
                />

                <button
                  type="button"
                  onClick={readSinglePaste}
                  className="w-full bg-yellow-300 hover:bg-yellow-200 transition text-black font-black px-4 py-4 rounded-lg cursor-pointer uppercase tracking-widest"
                >
                  {loading ? "Reading..." : "Read Single Row"}
                </button>
              </div>
            </section>

            {PosterGrid({ previewBattle: singleBattle })}
          </div>
        )}

        {activeMode === "mass" && (
          <div className="grid grid-cols-1 xl:grid-cols-[460px_1fr] gap-8 items-start">
            <section className="space-y-6">
              <div className="bg-black/35 border border-yellow-300/20 rounded-xl p-5 space-y-4">
                <h2 className="text-yellow-300 font-black uppercase tracking-widest">
                  Mass Poster Generator
                </h2>

                <DayMonthDateSelect
                  day={massDay}
                  month={massMonth}
                  onDayChange={handleMassDayChange}
                  onMonthChange={handleMassMonthChange}
                />

                <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                  <p className="text-white/45 text-xs uppercase tracking-widest font-black">
                    Mass Poster Date
                  </p>
                  <p className="text-yellow-300 font-black mt-1">
                    {massDate || "NO DATE SELECTED"}
                  </p>
                </div>

                <textarea
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder="Paste Daniel battle sheet rows here"
                  className="w-full h-72 bg-black/40 border border-white/20 text-white p-5 rounded-lg text-sm outline-none focus:border-yellow-300"
                />

                <div className="grid grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={readRows}
                    className="bg-yellow-300 hover:bg-yellow-200 transition text-black font-black px-2 py-4 text-sm rounded-lg cursor-pointer uppercase tracking-widest"
                  >
                    {loading ? "Loading..." : "Read Rows"}
                  </button>

                  <button
                    type="button"
                    onClick={downloadAllPosters}
                    disabled={battles.length === 0}
                    className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 transition text-black font-black px-2 py-4 text-sm rounded-lg cursor-pointer uppercase tracking-widest"
                  >
                    Download ZIP
                  </button>

                  <button
                    type="button"
                    onClick={saveAllToFolder}
                    disabled={battles.length === 0 || saving}
                    className="bg-green-400 hover:bg-green-300 disabled:opacity-40 transition text-black font-black px-2 py-4 text-sm rounded-lg cursor-pointer uppercase tracking-widest"
                  >
                    {saving ? "Saving..." : "Save Folder"}
                  </button>

                  <button
                    type="button"
                    onClick={clearMassPosters}
                    className="bg-white/10 hover:bg-white/20 transition text-white font-black px-2 py-4 text-sm rounded-lg cursor-pointer uppercase tracking-widest border border-white/20"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="bg-black/35 border border-white/15 rounded-lg p-5">
                <p className="text-white/70 text-sm">
                  Posters generated:{" "}
                  <span className="text-yellow-300 font-black">
                    {battles.length}
                  </span>
                </p>

                <p className="text-white/50 text-xs mt-2">
                  Format: creator username, manager, creator link, opponent
                  link, second time. Select the date above first.
                </p>
              </div>

              {SelectedPosterEditor()}
            </section>

            <section>
              {PosterGrid({})}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}