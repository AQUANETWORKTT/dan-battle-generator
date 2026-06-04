"use client";

import { useEffect, useId, useRef, useState } from "react";
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

const BRAND = {
  name: "Honeybloom Battle Generator",
  manager: "HONEYBLOOM",
  posterBackground: "/posters/honeybloom/background.png",
  zipName: "Honeybloom-Battle-Posters.zip",
};

const DEFAULT_YEAR = 2026;

const POSTER_FONT_CSS = `
@font-face {
  font-family: "Poster Cooper Black";
  src: url("/fonts/CooperBlack.woff2") format("woff2"),
       url("/fonts/CooperBlack.ttf") format("truetype");
  font-weight: 900;
  font-style: normal;
  font-display: block;
}

@font-face {
  font-family: "Poster Luckiest Guy";
  src: url("/fonts/LuckiestGuy-Regular.woff2") format("woff2"),
       url("/fonts/LuckiestGuy-Regular.ttf") format("truetype");
  font-weight: 900;
  font-style: normal;
  font-display: block;
}

.poster-export,
.poster-export * {
  font-synthesis: none !important;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`;

const POSTER_NAME_FONT =
  '"Poster Cooper Black", "Poster Luckiest Guy", serif';

const POSTER_DATE_FONT =
  '"Poster Luckiest Guy", "Poster Cooper Black", serif';


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
      <p className="text-[#783e12]/65 text-xs font-black uppercase tracking-widest mb-2">
        {label}
      </p>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full bg-white/70 border border-[#e6a52b]/40 text-[#783e12] p-3 rounded-lg outline-none focus:border-[#d98705] placeholder:text-[#783e12]/35"
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
      <p className="text-[#783e12]/65 text-xs font-black uppercase tracking-widest mb-2">
        Date
      </p>

      <div className="grid grid-cols-2 gap-3">
        <select
          value={day}
          onChange={(e) => onDayChange(e.target.value)}
          className="w-full bg-white/70 border border-[#e6a52b]/40 text-[#783e12] p-3 rounded-lg outline-none focus:border-[#d98705]"
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
          className="w-full bg-white/70 border border-[#e6a52b]/40 text-[#783e12] p-3 rounded-lg outline-none focus:border-[#d98705]"
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
      <p className="text-[#783e12]/65 text-xs font-black uppercase tracking-widest mb-2">
        {label}
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/70 border border-[#e6a52b]/40 text-[#783e12] p-3 rounded-lg outline-none focus:border-[#d98705]"
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
  const [singleMonth, setSingleMonth] = useState("4");

  const [massDay, setMassDay] = useState("");
  const [massMonth, setMassMonth] = useState("4");
  const [massDate, setMassDate] = useState("");

  const [battles, setBattles] = useState<Battle[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setSingleMonth("4");
    setSelectedId("");
  }

  function clearMassPosters() {
    setPaste("");
    setBattles([]);
    setSelectedId("");
    setMassDay("");
    setMassMonth("4");
    setMassDate("");
  }

  async function fetchTikTokAvatar(username: string) {
    const cleanUsername = username.replace("@", "").trim().toLowerCase();
    if (!cleanUsername) return "";

    const refreshKey = Date.now();

    try {
      const res = await fetch(
        `/api/tiktok-avatar?username=${encodeURIComponent(
          cleanUsername
        )}&refresh=${refreshKey}`,
        {
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
        }
      );

      const json = await res.json();
      return addCacheBustToImageUrl(json.avatar || "", refreshKey);
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
    const parts = row.split(/	+/);

    const selectedDate =
      singleBattle.date || massDate || formatDateFromParts(singleDay, singleMonth);

    // Honeybloom sheet format:
    // A = manager, B = predicted diamonds ignored, C = creator username,
    // D ignored, E = battle time, F ignored, G = opponent name, H/agency ignored.
    const manager = formatDate(parts[0] || BRAND.manager);

    const name1Raw = String(parts[2] || parts[0] || "")
      .replace("@", "")
      .trim()
      .toLowerCase();

    const name2Raw = String(parts[6] || "")
      .replace("@", "")
      .trim()
      .toLowerCase();

    const time = formatTime(parts[4] || "");

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
    const parts = row.split(/	+/);

    // Honeybloom sheet format:
    // A = manager, B = predicted diamonds ignored, C = creator username,
    // D ignored, E = battle time, F ignored, G = opponent name, H/agency ignored.
    const manager = formatDate(parts[0] || BRAND.manager);

    const name1Raw = String(parts[2] || "")
      .replace("@", "")
      .trim()
      .toLowerCase();

    const name2Raw = String(parts[6] || "")
      .replace("@", "")
      .trim()
      .toLowerCase();

    const time = formatTime(parts[4] || "");

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

  async function refreshScrapedFeed() {
    if (!paste.trim()) {
      alert("Paste your Honeybloom battle sheet rows first.");
      return;
    }

    if (!massDate) {
      alert("Please select a date for the mass posters first.");
      return;
    }

    setBattles([]);
    setSelectedId("");
    await readRows();
  }

  async function waitForPosterAssets(node: HTMLElement) {
    await document.fonts.ready;

    const images = Array.from(node.querySelectorAll("img"));

    await Promise.all(
      images.map((image) => {
        if (image.complete && image.naturalWidth > 0) return Promise.resolve();

        return new Promise<void>((resolve) => {
          image.onload = () => resolve();
          image.onerror = () => resolve();
        });
      })
    );

    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  async function makePosterBlob(battle: Battle) {
    const node = posterRefs.current[battle.id];
    if (!node) return null;

    try {
      await waitForPosterAssets(node);

      const fontEmbedCSS = await htmlToImage.getFontEmbedCSS(node);

      const blob = await htmlToImage.toBlob(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#fff8ea",
        fontEmbedCSS,
      });

      return blob;
    } catch (err) {
      console.error("POSTER EXPORT ERROR:", err);
      return null;
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
        className="rounded-lg border-2 border-dashed border-[#d98705]/45 bg-white/55 p-4 text-center hover:border-[#d98705] transition"
      >
        <p className="text-[#783e12] font-black uppercase text-sm tracking-widest">
          {label}
        </p>

        {image ? (
          <img
            src={image}
            alt=""
            className="w-24 h-24 rounded-full object-cover mx-auto mt-3 border-2 border-[#d98705]"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-[#fff8ea] mx-auto mt-3 border border-[#e6a52b]/40 flex items-center justify-center text-[#783e12]/35 text-xs">
            No image
          </div>
        )}

        <p className="text-[#783e12]/55 text-xs mt-3">
          Drag photo here or click to choose
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <label
            htmlFor={inputId}
            className="inline-block cursor-pointer bg-[#f4aa24] text-[#783e12] font-black px-4 py-2 rounded uppercase text-xs"
          >
            Choose Image
          </label>

          <button
            type="button"
            onClick={() => refreshTikTokAvatar(battle, field, single)}
            disabled={!(field === "image1" ? battle.name1 : battle.name2)}
            className="bg-white/75 disabled:opacity-40 disabled:cursor-not-allowed text-[#783e12] font-black px-4 py-2 rounded uppercase text-xs border border-[#e6a52b]/45 hover:bg-white"
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
    scale = 0.5,
  }: {
    battle: Battle;
    scale?: number;
  }) {
    const combinedDateTime =
      battle.date && battle.time
        ? `${battle.date} | ${battle.time}`
        : battle.date || battle.time;

    return (
      <div className="w-[540px] h-[540px] max-w-full overflow-hidden mx-auto bg-[#fff8ea] rounded-lg">
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
            className="poster-export relative w-[1080px] h-[1090px] overflow-hidden bg-[#fff8ea]"
          >
            <img
              src={BRAND.posterBackground}
              className="absolute inset-0 w-full h-full object-cover"
              alt=""
            />

            {battle.image1 && (
              <img
                crossOrigin="anonymous"
                src={battle.image1}
                className="absolute left-[176px] top-[397px] w-[195px] h-[195px] rounded-full object-cover"
                alt=""
              />
            )}

            {battle.image2 && (
              <img
                crossOrigin="anonymous"
                src={battle.image2}
                className="absolute left-[672px] top-[397px] w-[195px] h-[195px] rounded-full object-cover"
                alt=""
              />
            )}

            {battle.name1 && (
              <div
                className="absolute left-[52px] top-[595px] w-[450px] h-[80px] flex items-center justify-center text-[#934918]"
                style={{
                  fontFamily: POSTER_NAME_FONT,
                  fontWeight: 900,
                  WebkitTextStroke: "0px transparent",
                  textShadow: "none",
                  letterSpacing: "-1px",
                  fontSize: `clamp(
                    26px,
                    ${70 - battle.name1.length * 1.1}px,
                    26px
                  )`,
                }}
              >
                <span className="leading-none">
                  {battle.name1.toUpperCase()}
                </span>
              </div>
            )}

            {battle.name2 && (
              <div
                className="absolute left-[547px] top-[595px] w-[450px] h-[80px] flex items-center justify-center text-[#934918]"
                style={{
                  fontFamily: POSTER_NAME_FONT,
                  fontWeight: 900,
                  WebkitTextStroke: "0px transparent",
                  textShadow: "none",
                  letterSpacing: "-1px",
                  fontSize: `clamp(
                    26px,
                    ${70 - battle.name2.length * 1.1}px,
                    26px
                  )`,
                }}
              >
                <span className="leading-none">
                  {battle.name2.toUpperCase()}
                </span>
              </div>
            )}

            {combinedDateTime && (
              <div
                className="absolute top-[695px] left-[90px] w-[900px] h-[90px] flex items-center justify-center text-[#ffc83d]"
                style={{
                  fontFamily: POSTER_DATE_FONT,
                  fontWeight: 900,
                  WebkitTextStroke: "6px #934918",
                  paintOrder: "stroke fill",
                  textShadow: "2px 2px 0px #934918",
                  letterSpacing: "1px",
                  fontSize: `clamp(
                    32px,
                    ${62 - combinedDateTime.length * 1.05}px,
                    58px
                  )`,
                }}
              >
                <span className="leading-none text-center whitespace-nowrap">
                  {combinedDateTime.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function SelectedPosterEditor() {
    if (!selectedBattle) return null;

    return (
      <div className="bg-white/60 border border-[#e6a52b]/35 rounded-lg p-5 space-y-4 shadow-[0_14px_35px_rgba(120,62,18,0.10)]">
        <h2 className="text-[#783e12] font-black uppercase tracking-widest">
          Selected Poster Editor
        </h2>

        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full bg-white/80 border border-[#e6a52b]/45 text-[#783e12] p-3 rounded"
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
          <DropPhotoBox
            battle={selectedBattle}
            field="image1"
            label="Creator 1 Profile Picture"
          />

          <DropPhotoBox
            battle={selectedBattle}
            field="image2"
            label="Creator 2 Profile Picture"
          />
        </div>

        <button
          type="button"
          onClick={downloadSelectedPoster}
          className="w-full bg-[#f4aa24] hover:bg-[#ffd477] transition text-[#783e12] font-black px-4 py-4 rounded-lg cursor-pointer uppercase tracking-widest"
        >
          Download Selected Poster
        </button>
      </div>
    );
  }

  function PosterGrid({ previewBattle }: { previewBattle?: Battle }) {
    if (previewBattle) {
      return (
        <section className="grid grid-cols-1 gap-x-28 gap-y-16">
          <div className="bg-white/55 p-4 rounded-xl text-left border border-[#e6a52b]/35 shadow-[0_14px_35px_rgba(120,62,18,0.10)] w-fit max-w-full">
            <div className="text-xs text-[#783e12] font-black mb-3">
              LIVE TEMPLATE PREVIEW
            </div>

            <PosterPreview battle={previewBattle} />
          </div>
        </section>
      );
    }

    if (battles.length === 0) {
      return (
        <section className="grid grid-cols-1 gap-x-28 gap-y-16">
          <div className="bg-white/55 p-4 rounded-xl text-left border border-[#e6a52b]/35 shadow-[0_14px_35px_rgba(120,62,18,0.10)] w-fit max-w-full">
            <div className="text-xs text-[#783e12] font-black mb-3">
              BLANK TEMPLATE PREVIEW
            </div>

            <PosterPreview battle={blankPreviewBattle} />
          </div>
        </section>
      );
    }

    return (
      <section className="grid grid-cols-1 2xl:grid-cols-2 gap-x-10 gap-y-10">
        {battles.map((battle) => (
          <button
            key={battle.id}
            type="button"
            onClick={() => setSelectedId(battle.id)}
            className={`bg-white/55 p-4 rounded-xl text-left border transition shadow-[0_14px_35px_rgba(120,62,18,0.10)] w-fit max-w-full ${
              selectedId === battle.id
                ? "border-[#d98705]"
                : "border-[#e6a52b]/25 hover:border-[#d98705]/70"
            }`}
          >
            <div className="text-xs text-[#783e12] font-black mb-3">
              {battle.manager} • {battle.name1 || "CREATOR 1"} VS{" "}
              {battle.name2 || "CREATOR 2"}
            </div>

            <PosterPreview battle={battle} />
          </button>
        ))}
      </section>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fff8ea] text-[#783e12] p-8">
      <style>{POSTER_FONT_CSS}</style>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#fff1c8_0%,#fff8ea_45%,#f8eedb_100%)]" />

      <img
        src="/honeycomb-corner.png"
        alt=""
        className="pointer-events-none absolute -left-8 -top-8 w-64 opacity-70"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          WebkitMaskComposite: "source-in",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          maskComposite: "intersect",
        }}
      />

      <img
        src="/honeycomb-corner.png"
        alt=""
        className="pointer-events-none absolute -bottom-8 -right-8 w-72 rotate-180 opacity-70"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          WebkitMaskComposite: "source-in",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          maskComposite: "intersect",
        }}
      />

      <div className="relative z-10 max-w-[1700px] mx-auto space-y-6">
        <div className="flex flex-wrap gap-3 mb-4">
          <a
            href="/"
            className="bg-[#f4aa24] text-[#783e12] font-black px-4 py-3 rounded-lg uppercase tracking-widest hover:bg-[#ffd477] transition"
          >
            Home
          </a>

          <a
            href="/schedule"
            className="bg-white/65 text-[#783e12] font-black px-4 py-3 rounded-lg uppercase tracking-widest border border-[#e6a52b]/45 hover:bg-white/90 hover:border-[#d98705] transition"
          >
            Schedule Generator
          </a>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-[#783e12] text-3xl font-black tracking-[0.18em] uppercase">
              {BRAND.name}
            </h1>

            <p className="text-[#783e12]/60 text-sm mt-2">
              Single posters by default. Mass generator is kept in its own section.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setActiveMode("single")}
              className={`px-5 py-4 rounded-lg font-black uppercase tracking-widest transition ${
                activeMode === "single"
                  ? "bg-[#f4aa24] text-[#783e12]"
                  : "bg-white/55 text-[#783e12] border border-[#e6a52b]/40 hover:border-[#d98705]"
              }`}
            >
              Single Poster
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("mass")}
              className={`px-5 py-4 rounded-lg font-black uppercase tracking-widest transition ${
                activeMode === "mass"
                  ? "bg-[#f4aa24] text-[#783e12]"
                  : "bg-white/55 text-[#783e12] border border-[#e6a52b]/40 hover:border-[#d98705]"
              }`}
            >
              Mass Poster Generator
            </button>
          </div>
        </div>

        {activeMode === "single" && (
          <div className="grid grid-cols-1 xl:grid-cols-[460px_1fr] gap-8 items-start">
            <section className="space-y-6">
              <div className="bg-white/60 border border-[#e6a52b]/35 rounded-xl p-5 space-y-4 shadow-[0_14px_35px_rgba(120,62,18,0.10)]">
                <h2 className="text-[#783e12] font-black uppercase tracking-widest">
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

                <div className="bg-white/60 border border-[#e6a52b]/30 rounded-lg p-3">
                  <p className="text-[#783e12]/55 text-xs uppercase tracking-widest font-black">
                    Selected Date
                  </p>
                  <p className="text-[#783e12] font-black mt-1">
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
                  className="w-full bg-[#f4aa24] hover:bg-[#ffd477] transition text-[#783e12] font-black px-4 py-5 rounded-lg cursor-pointer uppercase tracking-widest"
                >
                  Download Poster
                </button>

                <button
                  type="button"
                  onClick={clearSinglePoster}
                  className="w-full bg-white/65 hover:bg-white/85 transition text-[#783e12] font-black px-4 py-4 rounded-lg cursor-pointer uppercase tracking-widest border border-[#e6a52b]/35"
                >
                  Clear Single Poster
                </button>
              </div>

              <div className="bg-white/60 border border-[#e6a52b]/35 rounded-xl p-5 space-y-4 shadow-[0_14px_35px_rgba(120,62,18,0.10)]">
                <h2 className="text-[#783e12] font-black uppercase tracking-widest">
                  Or Paste One Battle Line
                </h2>

                <textarea
                  value={singlePaste}
                  onChange={(e) => setSinglePaste(e.target.value)}
                  placeholder="Paste one battle row here"
                  className="w-full h-36 bg-white/70 border border-[#e6a52b]/40 text-[#783e12] p-5 rounded-lg text-sm outline-none focus:border-[#d98705] placeholder:text-[#783e12]/35"
                />

                <button
                  type="button"
                  onClick={readSinglePaste}
                  className="w-full bg-[#f4aa24] hover:bg-[#ffd477] transition text-[#783e12] font-black px-4 py-4 rounded-lg cursor-pointer uppercase tracking-widest"
                >
                  {loading ? "Reading..." : "Read Single Row"}
                </button>
              </div>
            </section>

            <PosterGrid previewBattle={singleBattle} />
          </div>
        )}

        {activeMode === "mass" && (
          <div className="grid grid-cols-1 xl:grid-cols-[460px_1fr] gap-8 items-start">
            <section className="space-y-6">
              <div className="bg-white/60 border border-[#e6a52b]/35 rounded-xl p-5 space-y-4 shadow-[0_14px_35px_rgba(120,62,18,0.10)]">
                <h2 className="text-[#783e12] font-black uppercase tracking-widest">
                  Mass Poster Generator
                </h2>

                <DayMonthDateSelect
                  day={massDay}
                  month={massMonth}
                  onDayChange={handleMassDayChange}
                  onMonthChange={handleMassMonthChange}
                />

                <div className="bg-white/60 border border-[#e6a52b]/30 rounded-lg p-3">
                  <p className="text-[#783e12]/55 text-xs uppercase tracking-widest font-black">
                    Mass Poster Date
                  </p>
                  <p className="text-[#783e12] font-black mt-1">
                    {massDate || "NO DATE SELECTED"}
                  </p>
                </div>

                <textarea
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder="Paste Honeybloom battle sheet rows here"
                  className="w-full h-72 bg-white/70 border border-[#e6a52b]/40 text-[#783e12] p-5 rounded-lg text-sm outline-none focus:border-[#d98705] placeholder:text-[#783e12]/35"
                />

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={readRows}
                    disabled={loading}
                    className="bg-[#f4aa24] hover:bg-[#ffd477] disabled:opacity-40 disabled:cursor-not-allowed transition text-[#783e12] font-black px-2 py-4 text-sm rounded-lg cursor-pointer uppercase tracking-widest"
                  >
                    {loading ? "Loading..." : "Read Rows"}
                  </button>

                  <button
                    type="button"
                    onClick={refreshScrapedFeed}
                    disabled={!paste.trim() || loading}
                    className="bg-white/65 hover:bg-white/85 disabled:opacity-40 disabled:cursor-not-allowed transition text-[#783e12] font-black px-2 py-4 text-sm rounded-lg cursor-pointer uppercase tracking-widest border border-[#e6a52b]/35"
                  >
                    Refresh Scrape
                  </button>

                  <button
                    type="button"
                    onClick={downloadAllPosters}
                    disabled={battles.length === 0}
                    className="bg-[#f4aa24] hover:bg-[#ffd477] disabled:opacity-40 transition text-[#783e12] font-black px-2 py-4 text-sm rounded-lg cursor-pointer uppercase tracking-widest"
                  >
                    Download ZIP
                  </button>

                  <button
                    type="button"
                    onClick={saveAllToFolder}
                    disabled={battles.length === 0 || saving}
                    className="bg-[#8fcf68] hover:bg-[#a8e57d] disabled:opacity-40 transition text-[#2f4f16] font-black px-2 py-4 text-sm rounded-lg cursor-pointer uppercase tracking-widest"
                  >
                    {saving ? "Saving..." : "Save Folder"}
                  </button>

                  <button
                    type="button"
                    onClick={clearMassPosters}
                    className="bg-white/65 hover:bg-white/85 transition text-[#783e12] font-black px-2 py-4 text-sm rounded-lg cursor-pointer uppercase tracking-widest border border-[#e6a52b]/35"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="bg-white/60 border border-[#e6a52b]/35 rounded-lg p-5 shadow-[0_14px_35px_rgba(120,62,18,0.10)]">
                <p className="text-[#783e12]/75 text-sm">
                  Posters generated:{" "}
                  <span className="text-[#783e12] font-black">
                    {battles.length}
                  </span>
                </p>

                <p className="text-[#783e12]/55 text-xs mt-2">
                  Format: manager, predicted diamonds, creator username, ignored
                  column, time, ignored column, opponent name, agency. Select the date above first.
                </p>
              </div>

              <SelectedPosterEditor />
            </section>

            <section>
              <PosterGrid />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}