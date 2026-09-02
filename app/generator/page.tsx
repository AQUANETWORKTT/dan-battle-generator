"use client";

import { Fragment, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Rnd } from "react-rnd";
import { createClient } from "@supabase/supabase-js";
import * as htmlToImage from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { FIRST_CLASS_CAPTAINS, FIRST_CLASS_CREATORS, FIRST_CLASS_VICE_CAPTAINS } from "@/lib/first-class-tournament";

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

type Mode = "single" | "mass" | "2v2" | "team" | "glory" | "manager";
type TwoVTwoBattle = {
  home1: string; home2: string; away1: string; away2: string;
  image1: string; image2: string; image3: string; image4: string;
  time: string; date: string;
};

type RaceToGloryRow = {
  teamName: string;
  diamonds: string;
};

type ManagerLeaderboardRow = {
  manager: string;
  diamonds: number;
};

type ManagerLeaderboardStat = {
  stat_date?: string | null;
  creator_username?: string | null;
  "Creator's username"?: string | null;
  creator_id?: string | null;
  "Creator ID"?: string | null;
  diamonds?: number | string | null;
  group_name?: string | null;
  team?: string | null;
  agency?: string | null;
  manager_email?: string | null;
  creator_network_manager?: string | null;
  "Creator Network manager"?: string | null;
  email?: string | null;
  manager_key?: string | null;
  manager_label?: string | null;
};

type PosterElementKey = "avatar1" | "avatar2" | "avatar3" | "avatar4" | "username1" | "username2" | "username3" | "username4" | "date";
type TwoVTwoPosterElementKey =
  | "avatar1" | "avatar2" | "avatar3" | "avatar4"
  | "username1" | "username2" | "username3" | "username4" | "date";

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
  gradientEnabled?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: string;
};

type PosterTemplateJson = Record<PosterElementKey, PosterElement> & {
  backgroundUrl?: string;
};

type TwoVTwoPosterTemplateJson = Record<TwoVTwoPosterElementKey, PosterElement> & {
  backgroundUrl?: string;
};

type PosterTemplateRow = {
  id: string;
  name: string;
  background_url: string | null;
  template_json: PosterTemplateJson;
};

type TeamPosterElement = {
  id: string;
  kind: "avatar" | "username" | "diamonds" | "hours" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  imageUrl?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
};

type TeamPosterCategory = "dan" | "mike-indi" | "sub-agencies" | "paradise" | "horizon" | "trident" | "respawn";

type TeamPosterTemplate = {
  backgroundUrl: string;
  backgroundPath?: string;
  /** Manager key used by the Team Diamonds Yesterday downloader. */
  managerKey?: string;
  /** Saved download grouping for Team Diamonds Yesterday. */
  teamSide?: TeamPosterCategory;
  elements: TeamPosterElement[];
};

const POSTER_WIDTH = 1080;
const POSTER_HEIGHT = 1920;
const TEAM_POSTER_WIDTH = 1024;
const TEAM_POSTER_HEIGHT = 1536;
const MANAGER_LEADERBOARD_WIDTH = 1080;
const MANAGER_LEADERBOARD_HEIGHT = 1920;
const DEFAULT_MANAGER_LEADERBOARD_ROWS = 20;
const MANAGER_LEADERBOARD_TEMPLATE_NAME = "manager-leaderboard-overlay";

function getManagerLeaderboardTemplateName(group: string) {
  if (group === "All Groups") return MANAGER_LEADERBOARD_TEMPLATE_NAME;
  const slug = group.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${MANAGER_LEADERBOARD_TEMPLATE_NAME}-${slug || "default"}`;
}

const MANAGER_LEADERBOARD_GROUPS = [
  "Aqua",
  "Paradise",
  "Respawn",
  "Team Horizon",
  "Trident",
  "Exempt",
  "Team Mike / Indi",
  "Team Dan",
  "Dan + Aqua",
  "First Class",
] as const;
// The upload currently identifies Georgia as georgialilly.glow@gmail.com
// (with a double "l"), so retain both known spellings for Team Gee.
const TEAM_LISA_G_MANAGER_KEYS = ["georgialilyglow", "georgialillyglow", "lisaruss1988"];
const MANAGER_LEADERBOARD_DISPLAY_NAMES: Record<string, string> = {
  cjtokens1237: "CJ",
  teamalf: "Alf",
  firstclassagencyalf: "Alf",
  firstclassagencyabbie: "Abbie",
  firstclassagencyolivia: "Liv",
  sjm20101: "Steven",
  firstclassagencypaige: "Paige",
  jasminabidzane: "Jasmina",
  connorfirstclass: "Connor",
  brandyfalconer35: "Brandy",
  fearnegurry1: "Fearne",
  demileawebster7: "Demi",
  louisesquelch: "Louise",
  ashwalbridge: "Ash",
  ashwalbridgeaolcom: "Ash",
  firstclassagencyashoutlookcom: "Ash",
  firstclassagencyash: "Ash",
  candiceaquaagency: "Candice",
  firstclassagencykyran: "Kyran",
  kyran: "Kyran",
  kieran: "Kyran",
  kaybon03: "KJB",
  kbon03: "KJB",
  bmwe46320d: "Madz",
  zaliheyoncu: "Zalihe",
  firstclassagencykayden: "Kayden",
  xaramills17: "Xara",
  rachellouise18: "Rach",
  firstclassagencylauren: "Lauren",
  liamproctor04: "Liam",
  abbidl: "Abbi",
  kishaunnolan1: "Kash",
  calliecrawford14: "Callie",
  megan25121990: "Megan",
  georgialilyglow: "G",
  lisaruss1988: "Lisa",
};
const LOCAL_AVATAR_PATHS: Record<string, string> = {
  cerilaw83: "/avatars/cerilaw83.jpg",
  serenitetiktok: "/avatars/cerilaw83.jpg",
  tictock739: "/avatars/tictock739.jpg",
  kaylanortheast: "/avatars/kayla_northeast.jpg",
  lozza2706: "/avatars/lozza2706.jpg",
  kieransmithmilner: "/avatars/kieransmithmilner.jpg",
};

function savedFallbackAvatar(username: string, fallbacks: Record<string, string>) {
  const exact = username.trim().replace(/^@/, "").toLowerCase();
  if (fallbacks[exact]) return fallbacks[exact];
  const normalized = username.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (fallbacks[normalized]) return fallbacks[normalized];
  const matches = Object.entries(fallbacks).filter(([candidate, imageUrl]) => {
    if (!imageUrl || Math.abs(candidate.length - normalized.length) > 1) return false;
    let changes = 0; let left = 0; let right = 0;
    while (left < candidate.length && right < normalized.length) {
      if (candidate[left] === normalized[right]) { left += 1; right += 1; continue; }
      if (++changes > 1) return false;
      if (candidate.length > normalized.length) left += 1;
      else if (candidate.length < normalized.length) right += 1;
      else { left += 1; right += 1; }
    }
    return changes + candidate.length - left + normalized.length - right <= 1;
  });
  return matches.length === 1 ? matches[0][1] : "";
}
const ELEMENT_LABELS: Record<PosterElementKey, string> = {
  avatar1: "Avatar 1",
  avatar2: "Avatar 2",
  avatar3: "Avatar 3",
  avatar4: "Avatar 4",
  username1: "Username 1",
  username2: "Username 2",
  username3: "Username 3",
  username4: "Username 4",
  date: "Date / Time",
};

const EDIT_PREVIEW_VALUES = {
  username1: "USERNAME123456",
  username2: "USERNAME654321",
  date: "Wednesday 27th June | 8:00PM",
};

const FONT_OPTIONS = [
  "Luckiest Guy",
  "Norwester",
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

const TEXT_ELEMENT_KEYS: PosterElementKey[] = ["username1", "username2", "username3", "username4", "date"];
const DEFAULT_TEMPLATE_STORAGE_KEY = "battle-generator-default-template-id";
const DEFAULT_TEMPLATE_SETTING_KEY = "poster-template-default";
const TWO_V_TWO_DEFAULT_TEMPLATE_STORAGE_KEY = "battle-generator-2v2-default-template-id";
const TWO_V_TWO_DEFAULT_TEMPLATE_SETTING_KEY = "poster-template-2v2-default";
const TWO_V_TWO_LAYOUT_STORAGE_KEY_PREFIX = "battle-generator-2v2-layout-";
const TEAM_DAN_POSTER_TEMPLATE_NAME = "team-dan-poster";

const DEFAULT_TEMPLATE_JSON: PosterTemplateJson = {
  backgroundUrl: "",
  avatar1: { x: 82, y: 570, width: 346, height: 346 },
  avatar2: { x: 651, y: 570, width: 346, height: 346 },
  avatar3: { x: 82, y: 1040, width: 220, height: 220 },
  avatar4: { x: 780, y: 1040, width: 220, height: 220 },
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
    gradientEnabled: false,
    gradientFrom: "#5CEEFF",
    gradientTo: "#0044FF",
    gradientDirection: "to bottom",
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
    gradientEnabled: false,
    gradientFrom: "#5CEEFF",
    gradientTo: "#0044FF",
    gradientDirection: "to bottom",
  },
  username3: { x: 20, y: 1280, width: 360, height: 62, fontFamily: "Luckiest Guy", fontSize: 42, color: "#5CEEFF", strokeColor: "black", strokeWidth: 2, shadowX: 2, shadowY: 2, shadowBlur: 0, shadowColor: "#000000", letterSpacing: 1, fontWeight: 900, uppercase: true },
  username4: { x: 700, y: 1280, width: 360, height: 62, fontFamily: "Luckiest Guy", fontSize: 42, color: "#5CEEFF", strokeColor: "black", strokeWidth: 2, shadowX: 2, shadowY: 2, shadowBlur: 0, shadowColor: "#000000", letterSpacing: 1, fontWeight: 900, uppercase: true },
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
    gradientEnabled: false,
    gradientFrom: "#5CEEFF",
    gradientTo: "#0044FF",
    gradientDirection: "to bottom",
  },
};

const DEFAULT_2V2_TEMPLATE_JSON: TwoVTwoPosterTemplateJson = {
  backgroundUrl: "",
  avatar1: { x: 80, y: 470, width: 220, height: 220 },
  avatar2: { x: 780, y: 470, width: 220, height: 220 },
  avatar3: { x: 80, y: 1040, width: 220, height: 220 },
  avatar4: { x: 780, y: 1040, width: 220, height: 220 },
  username1: { ...DEFAULT_TEMPLATE_JSON.username1, x: 20, y: 710, width: 360, height: 62, fontSize: 42 },
  username2: { ...DEFAULT_TEMPLATE_JSON.username2, x: 700, y: 710, width: 360, height: 62, fontSize: 42 },
  username3: { ...DEFAULT_TEMPLATE_JSON.username1, x: 20, y: 1280, width: 360, height: 62, fontSize: 42 },
  username4: { ...DEFAULT_TEMPLATE_JSON.username2, x: 700, y: 1280, width: 360, height: 62, fontSize: 42 },
  date: { ...DEFAULT_TEMPLATE_JSON.date, x: 155, y: 1510, width: 770, height: 70, fontSize: 52 },
};

function normalize2v2TemplateJson(input?: Partial<TwoVTwoPosterTemplateJson> | null): TwoVTwoPosterTemplateJson {
  const incoming = input || {};
  const base = structuredClone(DEFAULT_2V2_TEMPLATE_JSON);
  return {
    ...base,
    ...incoming,
    avatar1: { ...base.avatar1, ...(incoming.avatar1 || {}) }, avatar2: { ...base.avatar2, ...(incoming.avatar2 || {}) },
    avatar3: { ...base.avatar3, ...(incoming.avatar3 || {}) }, avatar4: { ...base.avatar4, ...(incoming.avatar4 || {}) },
    username1: { ...base.username1, ...(incoming.username1 || {}) }, username2: { ...base.username2, ...(incoming.username2 || {}) },
    username3: { ...base.username3, ...(incoming.username3 || {}) }, username4: { ...base.username4, ...(incoming.username4 || {}) },
    date: { ...base.date, ...(incoming.date || {}) },
  };
}

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
    avatar3: { ...DEFAULT_TEMPLATE_JSON.avatar3, ...(incoming.avatar3 || {}) },
    avatar4: { ...DEFAULT_TEMPLATE_JSON.avatar4, ...(incoming.avatar4 || {}) },
    username1: { ...DEFAULT_TEMPLATE_JSON.username1, ...(incoming.username1 || {}) },
    username2: { ...DEFAULT_TEMPLATE_JSON.username2, ...(incoming.username2 || {}) },
    username3: { ...DEFAULT_TEMPLATE_JSON.username3, ...(incoming.username3 || {}) },
    username4: { ...DEFAULT_TEMPLATE_JSON.username4, ...(incoming.username4 || {}) },
    date: { ...DEFAULT_TEMPLATE_JSON.date, ...(incoming.date || {}) },
    backgroundUrl:
      Object.prototype.hasOwnProperty.call(incoming, "backgroundUrl")
        ? incoming.backgroundUrl
        : DEFAULT_TEMPLATE_JSON.backgroundUrl || BRAND.posterBackground,
  };
}

function getPosterSupabaseClient() {
  try {
    const url =
      process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const anonKey =
      process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return null;
    }

    return createClient(url, anonKey);
  } catch {
    return null;
  }
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
  // Keep the caret in place while editing the middle of a username.
  return raw.replace("@", "").toUpperCase();
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

function safeNumber(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getManagerLeaderboardName(row: ManagerLeaderboardStat) {
  const raw = String(
    row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email || "Unassigned"
  ).trim();
  if (!raw) return "Unassigned";

  const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalized.includes("kaybon03") || normalized.includes("kbon03")) return "Team KJB";
  const configuredName = Object.entries(MANAGER_LEADERBOARD_DISPLAY_NAMES).find(([key]) => normalized.includes(key))?.[1];
  if (configuredName) return `Team ${configuredName}`;

  const localPart = raw.split("@")[0]
    .replace(/^firstclassagency[_-]?/i, "")
    .replace(/^team[_-]?/i, "")
    .replace(/[_-]?(aquaagency|aquaagencyout|respawnagency|paradiseagency)$/i, "")
    .replace(/[_.-]+/g, " ")
    .trim();
  const displayName = localPart
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return displayName ? `Team ${displayName}` : raw;
}

function getManagerLeaderboardCreatorKey(row: ManagerLeaderboardStat) {
  return String(row.creator_username || row["Creator's username"] || row.creator_id || row["Creator ID"] || "").trim().toLowerCase();
}

function getYesterdayDateKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calendarDateFromParts(dayRaw: string, monthRaw: string) {
  if (!dayRaw || !monthRaw) return "";
  const day = Number(dayRaw); const month = Number(monthRaw);
  if (!Number.isInteger(day) || !Number.isInteger(month)) return "";
  return `${DEFAULT_YEAR}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getManagerLeaderboardManagerKey(row: ManagerLeaderboardStat) {
  return String(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function belongsToSelectedManagerLeaderboardGroup(
  row: ManagerLeaderboardStat,
  group: string,
  managerGroups: Record<string, string> = {}
) {
  const assignedGroup = managerGroups[getManagerLeaderboardManagerKey(row)];
  // Manager Assignments is the single source of truth for this builder. A
  // manager moved on that board must appear in their newly selected group.
  if (!assignedGroup) return false;
  return assignedGroup === (group === "Team Horizon" ? "Horizon" : group);
}

function createManagerLeaderboardTemplate(rowCount = DEFAULT_MANAGER_LEADERBOARD_ROWS): TeamPosterTemplate {
  const elements: TeamPosterElement[] = [];
  const startY = 145;
  const rowGap = 88;

  for (let index = 0; index < rowCount; index += 1) {
    elements.push({
      id: `manager-name-${index + 1}`,
      kind: "username",
      x: 120,
      y: startY + index * rowGap,
      width: 570,
      height: 72,
      value: `Team Manager ${index + 1}`,
      fontFamily: "Norwester",
      fontSize: 37,
      color: "#ffffff",
      fontWeight: 900,
    });
    elements.push({
      id: `manager-diamonds-${index + 1}`,
      kind: "diamonds",
      x: 720,
      y: startY + index * rowGap,
      width: 260,
      height: 72,
      value: "0 diamonds",
      fontFamily: "Norwester",
      fontSize: 37,
      color: "#facc15",
      fontWeight: 900,
    });
  }

  return { backgroundUrl: "", elements };
}

function createTeamDanPosterTemplate(): TeamPosterTemplate {
  const elements: TeamPosterElement[] = [];
  const rowGap = 98;

  const addLeaderboardRow = (
    group: "diamonds" | "hours",
    index: number,
    rowY: number
  ) => {
    const suffix = group === "diamonds" ? `${index + 1}` : `hours-${index + 1}`;
    const valueId = group === "diamonds" ? `diamonds-${index + 1}` : `hours-${index + 1}`;
    const valueLabel = group === "diamonds" ? "DIAMONDS" : "HOURS";
    const valueColor = group === "diamonds" ? "#FACC15" : "#38BDF8";

    elements.push({
      id: `avatar-${suffix}`,
      kind: "avatar",
      x: 145,
      y: rowY,
      width: 92,
      height: 92,
      value: `${valueLabel} ${index + 1} Avatar`,
    });

    elements.push({
      id: `username-${suffix}`,
      kind: "username",
      x: 275,
      y: rowY + 15,
      width: 430,
      height: 58,
      value: `${valueLabel} CREATOR ${index + 1}`,
      fontFamily: "Luckiest Guy",
      fontSize: 37,
      color: "#FFFFFF",
      fontWeight: 900,
    });

    elements.push({
      id: valueId,
      kind: group,
      x: 725,
      y: rowY + 15,
      width: 210,
      height: 58,
      value: `${valueLabel} ${index + 1}`,
      fontFamily: "Luckiest Guy",
      fontSize: 37,
      color: valueColor,
      fontWeight: 900,
    });
  };

  for (let index = 0; index < 5; index += 1) {
    addLeaderboardRow("diamonds", index, 390 + index * rowGap);
    addLeaderboardRow("hours", index, 925 + index * rowGap);
  }

  return { backgroundUrl: "", elements };
}

function normalizeTeamDanPosterTemplate(input?: Partial<TeamPosterTemplate> | null): TeamPosterTemplate {
  const base = createTeamDanPosterTemplate();
  const incoming = input || {};
  const byId = new Map((incoming.elements || []).map((element) => [element.id, element]));

  return {
    backgroundUrl: incoming.backgroundUrl || "",
    backgroundPath: incoming.backgroundPath || "",
    managerKey: incoming.managerKey || "team-dan",
    teamSide: incoming.teamSide || "dan",
    elements: base.elements.map((element) => ({
      ...element,
      ...(byId.get(element.id) || {}),
      fontSize: element.kind === "avatar" ? undefined : 37,
    })),
  };
}

function normalizeManagerLeaderboardTemplate(input?: Partial<TeamPosterTemplate> | null): TeamPosterTemplate {
  const savedRowCount = Math.max(
    0,
    ...(input?.elements || []).map((element) => Number(element.id.match(/-(\d+)$/)?.[1] || 0))
  );
  const base = createManagerLeaderboardTemplate(Math.max(DEFAULT_MANAGER_LEADERBOARD_ROWS, savedRowCount));
  const incoming = input || {};
  const byId = new Map((incoming.elements || []).map((element) => [element.id, element]));

  return {
    backgroundUrl: incoming.backgroundUrl || "",
    backgroundPath: incoming.backgroundPath || "",
    managerKey: incoming.managerKey || "team-dan",
    elements: base.elements.map((element) => ({ ...element, ...(byId.get(element.id) || {}) })),
  };
}

function ensureManagerLeaderboardRows(template: TeamPosterTemplate, rowCount: number) {
  const existingRowCount = Math.max(
    0,
    ...template.elements.map((element) => Number(element.id.match(/-(\d+)$/)?.[1] || 0))
  );
  if (existingRowCount >= rowCount) return template;
  const existingElements = new Map(template.elements.map((element) => [element.id, element]));
  return {
    ...template,
    elements: createManagerLeaderboardTemplate(rowCount).elements.map((element) => ({
      ...element,
      ...(existingElements.get(element.id) || {}),
    })),
  };
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
  const twoVTwoPosterRef = useRef<HTMLDivElement | null>(null);
  const teamPosterRef = useRef<HTMLDivElement | null>(null);
  const fallbackAvatarUrlsRef = useRef<Record<string, string>>({});
  const [workspace, setWorkspace] = useState<string | null>(null);
  const isPostersWorkspace = workspace === "posters";
  const isCrewShowdownWorkspace = workspace === "crew-showdown";

  const [activeMode, setActiveMode] = useState<Mode>("single");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextWorkspace = params.get("workspace");
    setWorkspace(nextWorkspace);
    if (nextWorkspace === "posters") setActiveMode("team");
    else if (nextWorkspace === "crew-showdown" || params.get("mode") === "glory") setActiveMode("glory");
    else if (params.get("mode") === "manager") setActiveMode("manager");
  }, []);
  const [raceToGloryRows, setRaceToGloryRows] = useState<RaceToGloryRow[]>(() =>
    Array.from({ length: 20 }, () => ({ teamName: "", diamonds: "" }))
  );
  const [raceToGloryStatus, setRaceToGloryStatus] = useState("Load the live top 20 or enter the leaderboard manually.");
  const [raceToGloryLoading, setRaceToGloryLoading] = useState(false);
  const [raceToGloryLayout, setRaceToGloryLayout] = useState<"single" | "split">("single");
  const raceToGloryPosterRef = useRef<HTMLDivElement | null>(null);
  const managerLeaderboardPosterRef = useRef<HTMLDivElement | null>(null);
  const [selectedManagerLeaderboardGroup, setSelectedManagerLeaderboardGroup] = useState("All Groups");
  const [managerLeaderboardRows, setManagerLeaderboardRows] = useState<ManagerLeaderboardRow[]>([]);
  const [managerLeaderboardStatus, setManagerLeaderboardStatus] = useState(
    "Choose a Manager Assignments group, then load its current calendar-month manager leaderboard."
  );
  const [managerLeaderboardLoading, setManagerLeaderboardLoading] = useState(false);
  const [managerLeaderboardTemplate, setManagerLeaderboardTemplate] = useState<TeamPosterTemplate>(createManagerLeaderboardTemplate);
  const [selectedManagerLeaderboardElementId, setSelectedManagerLeaderboardElementId] = useState("manager-name-1");
  const [managerLeaderboardEditMode, setManagerLeaderboardEditMode] = useState(true);

  const [paste, setPaste] = useState("");
  const [singlePaste, setSinglePaste] = useState("");
  const [singleBattle, setSingleBattle] = useState<Battle>(() =>
    createBattle(`single-${stableId}`)
  );
  const [twoVTwoBattle, setTwoVTwoBattle] = useState<TwoVTwoBattle>({ home1: "", home2: "", away1: "", away2: "", image1: "", image2: "", image3: "", image4: "", time: "", date: "" });
  const [twoVTwoDay, setTwoVTwoDay] = useState("");
  const [twoVTwoMonth, setTwoVTwoMonth] = useState(() => String(new Date().getMonth()));
  const [twoVTwoPaste, setTwoVTwoPaste] = useState("");
  const [twoVTwoEditMode, setTwoVTwoEditMode] = useState(false);
  const [twoVTwoSelectedElement, setTwoVTwoSelectedElement] = useState<TwoVTwoPosterElementKey>("avatar1");
  const [twoVTwoTemplateJson, setTwoVTwoTemplateJson] = useState<TwoVTwoPosterTemplateJson>(() => normalize2v2TemplateJson());
  const [singleDay, setSingleDay] = useState("");
  const [singleMonth, setSingleMonth] = useState(() => String(new Date().getMonth()));

  const [massDay, setMassDay] = useState("");
  const [massMonth, setMassMonth] = useState(() => String(new Date().getMonth()));
  const [massDate, setMassDate] = useState("");

  const [battles, setBattles] = useState<Battle[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [templateEditorMode, setTemplateEditorMode] = useState<"single" | "2v2">("single");
  const [templates, setTemplates] = useState<PosterTemplateRow[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("local-default");
  const [defaultTemplateId, setDefaultTemplateId] = useState("");
  const [twoVTwoDefaultTemplateId, setTwoVTwoDefaultTemplateId] = useState("");
  const [selectedElement, setSelectedElement] = useState<PosterElementKey>("avatar1");
  const [templateName, setTemplateName] = useState("Battle Template");
  const [editingTemplateName, setEditingTemplateName] = useState(false);
  const [templateJson, setTemplateJson] = useState<PosterTemplateJson>(() =>
    normalizeTemplateJson(DEFAULT_TEMPLATE_JSON)
  );
  const [templateStatus, setTemplateStatus] = useState("Not saved yet");
  const [undoStack, setUndoStack] = useState<PosterTemplateJson[]>([]);
  const [redoStack, setRedoStack] = useState<PosterTemplateJson[]>([]);
  const [teamPosterTemplate, setTeamPosterTemplate] = useState<TeamPosterTemplate>(() =>
    createTeamDanPosterTemplate()
  );
  const [teamPosterTemplates, setTeamPosterTemplates] = useState<Array<{ name: string; template: TeamPosterTemplate }>>([]);
  const [teamPosterTemplateName, setTeamPosterTemplateName] = useState(TEAM_DAN_POSTER_TEMPLATE_NAME);
  const [newTeamPosterTemplateName, setNewTeamPosterTemplateName] = useState("");
  const [newTeamPosterSourceName, setNewTeamPosterSourceName] = useState("blank");
  const [teamPosterManagerOptions, setTeamPosterManagerOptions] = useState<Array<{ value: string; label: string }>>([
    { value: "team-dan", label: "Team Dan + James - Direct Teams" },
    { value: "combined:lisa-g", label: "Team Lisa / G - Combined" },
    { value: "first-class-all", label: "First Class — All Creators" },
    { value: "group:respawn", label: "Team Respawn — All Managers" },
    { value: "group:paradise", label: "Team Paradise — All Managers" },
    { value: "group:horizon", label: "Team Horizon — All Managers" },
    { value: "group:trident", label: "Team Trident — All Managers" },
  ]);
  const [selectedTeamPosterElementId, setSelectedTeamPosterElementId] = useState("avatar-1");
  const [teamPosterStatus, setTeamPosterStatus] = useState("Team Dan poster builder ready.");

  const selectedBattle = battles.find((b) => b.id === selectedId) || null;

  async function syncDfjdbattlesToCalendar(rows: string[], date: string) {
    if (!date) return;
    const calendarRows = rows.flatMap((row) => {
      // Keep empty spreadsheet cells. Splitting on one-or-more tabs shifts
      // every later column when the battle sheet contains a blank cell.
      const parts = row.split("\t").map((cell) => cell.trim());
      const manager = parts.find((cell) => cell.toUpperCase().replace(/[^A-Z]/g, "") === "DFJD") || "";
      const usernames = parts.map(getTikTokUsername).filter(Boolean);
      const creator = usernames[0] || String(parts[0] || "").replace(/^@/, "").trim();
      const opponent = usernames[1] || getTikTokUsername(parts[5] || "");
      const time = parts.find((cell) => /\b(?:[01]?\d|2[0-3]):[0-5]\d\s*(?:AM|PM)?\b/i.test(cell)) || "";
      const size = parts.find((cell) => /(?:UNDER|LESS THAN|OVER|MORE THAN)?\s*\d+(?:\.\d+)?\s*K\b/i.test(cell)) || String(parts[2] || "");
      const agency = String(parts.at(-1) || "");
      if (!manager || !creator || !opponent || !time) return [];
      return [{ date, time, creator, opponent, manager, size, agency }];
    });
    if (!calendarRows.length) return;
    try {
      const response = await fetch("/api/battle-calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import-dfjd-battles", rows: calendarRows }) });
      if (!response.ok) throw new Error("Battle Calendar could not save the generated battles.");
    } catch (error) {
      // Poster generation stays available even if the calendar is temporarily unreachable.
      console.error("[battle-calendar] generator sync failed", error);
    }
  }

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
      const next = {
        ...prev,
        [key]: {
          ...prev[key],
          ...changes,
        },
      };
      if (templateEditorMode === "2v2") setTwoVTwoTemplateJson(normalize2v2TemplateJson(next));
      return next;
    });
  }

  function updateWholeTemplateJson(nextJson: PosterTemplateJson, recordUndo = false) {
    setTemplateJson((prev) => {
      if (recordUndo) addUndoSnapshot(prev);
      const next = normalizeTemplateJson(nextJson);
      if (templateEditorMode === "2v2") setTwoVTwoTemplateJson(normalize2v2TemplateJson(next));
      return next;
    });
  }

  function getBrowserDefaultTemplateId(storageKey = DEFAULT_TEMPLATE_STORAGE_KEY) {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(storageKey) || "";
  }

  function rememberBrowserDefaultTemplateId(templateId: string, storageKey = DEFAULT_TEMPLATE_STORAGE_KEY) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, templateId);
  }

  async function savePublicDefaultTemplateId(templateId: string, settingKey: string) {
    const response = await fetch("/api/poster-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settingKey, templateId }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || "Could not save the public default.");
    }
  }

  async function setCurrentTemplateAsDefault() {
    const template = templates.find((item) => item.id === selectedTemplateId);
    if (!template) return;

    const isTwoVTwo = activeMode === "2v2" || templateEditorMode === "2v2";
    const storageKey = isTwoVTwo ? TWO_V_TWO_DEFAULT_TEMPLATE_STORAGE_KEY : DEFAULT_TEMPLATE_STORAGE_KEY;
    const settingKey = isTwoVTwo ? TWO_V_TWO_DEFAULT_TEMPLATE_SETTING_KEY : DEFAULT_TEMPLATE_SETTING_KEY;
    rememberBrowserDefaultTemplateId(template.id, storageKey);
    if (isTwoVTwo) setTwoVTwoDefaultTemplateId(template.id);
    else setDefaultTemplateId(template.id);
    if (isTwoVTwo && typeof window !== "undefined") {
      window.localStorage.setItem(`${TWO_V_TWO_LAYOUT_STORAGE_KEY_PREFIX}${template.id}`, JSON.stringify(normalize2v2TemplateJson(templateEditorMode === "2v2" ? templateJson : twoVTwoTemplateJson)));
    }

    if (template.id.startsWith("local-") || template.id === "local-default") {
      setTemplateStatus(`${template.name} is now your default on this browser.`);
      return;
    }
    try {
      await savePublicDefaultTemplateId(template.id, settingKey);
      setTemplateStatus(`${template.name} is now the public default template.`);
    } catch {
      setTemplateStatus(`${template.name} is now your browser default. The shared default could not be saved.`);
    }
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
    const response = await fetch("/api/poster-templates", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !Array.isArray(result.templates) || result.templates.length === 0) {
      const local = createLocalTemplate();
      setTemplates([local]);
      setSelectedTemplateId(local.id);
      setDefaultTemplateId(local.id);
      setTwoVTwoDefaultTemplateId(local.id);
      if (!editingTemplateName) setTemplateName(local.name);
      updateWholeTemplateJson(local.template_json);
      setTemplateStatus(
        result.error ? `Template load failed: ${result.error}` : "No templates found. Using local default."
      );
      return;
    }

    const rows = (result.templates as PosterTemplateRow[])
      .map((row: PosterTemplateRow) => ({
      ...row,
      template_json: normalizeTemplateJson(row.template_json),
      })) as PosterTemplateRow[];

    const publicDefaultId = typeof result.defaults?.[DEFAULT_TEMPLATE_SETTING_KEY] === "string" ? result.defaults[DEFAULT_TEMPLATE_SETTING_KEY] : "";
    const publicTwoVTwoDefaultId = typeof result.defaults?.[TWO_V_TWO_DEFAULT_TEMPLATE_SETTING_KEY] === "string" ? result.defaults[TWO_V_TWO_DEFAULT_TEMPLATE_SETTING_KEY] : "";
    const browserDefaultId = getBrowserDefaultTemplateId();
    const browserTwoVTwoDefaultId = getBrowserDefaultTemplateId(TWO_V_TWO_DEFAULT_TEMPLATE_STORAGE_KEY);
    const defaultId = publicDefaultId || browserDefaultId;
    const twoVTwoDefaultId = publicTwoVTwoDefaultId || browserTwoVTwoDefaultId;
    const defaultTemplate = rows.find((row) => row.id === defaultId) || rows[0];

    setTemplates(rows);
    setDefaultTemplateId(defaultTemplate.id);
    setTwoVTwoDefaultTemplateId(rows.find((row) => row.id === twoVTwoDefaultId)?.id || rows[0].id);
    if (publicDefaultId) rememberBrowserDefaultTemplateId(publicDefaultId);
    if (publicTwoVTwoDefaultId) rememberBrowserDefaultTemplateId(publicTwoVTwoDefaultId, TWO_V_TWO_DEFAULT_TEMPLATE_STORAGE_KEY);
    setSelectedTemplateId(defaultTemplate.id);
    if (!editingTemplateName) setTemplateName(defaultTemplate.name);
    updateWholeTemplateJson(defaultTemplate.template_json);
    setTemplateStatus(defaultId ? `Templates loaded. Default: ${defaultTemplate.name}.` : "Templates loaded.");
  }

  function handleTemplateSelect(id: string) {
    const template = templates.find((item) => item.id === id);
    if (!template) return;

    setSelectedTemplateId(template.id);
    if (!editingTemplateName) setTemplateName(template.name);
    setUndoStack([]);
    updateWholeTemplateJson(template.template_json);
    if (activeMode === "2v2" || templateEditorMode === "2v2") {
      const saved = typeof window === "undefined" ? null : window.localStorage.getItem(`${TWO_V_TWO_LAYOUT_STORAGE_KEY_PREFIX}${template.id}`);
      try {
        setTwoVTwoTemplateJson(normalize2v2TemplateJson(saved ? JSON.parse(saved) : template.template_json));
      } catch {
        setTwoVTwoTemplateJson(normalize2v2TemplateJson(template.template_json));
      }
    }
    setTemplateStatus(`Loaded ${template.name}.`);
  }

  function switchPosterMode(mode: "single" | "mass" | "2v2") {
    setActiveMode(mode);
    const defaultId = mode === "2v2" ? twoVTwoDefaultTemplateId : defaultTemplateId;
    const template = templates.find((item) => item.id === defaultId);
    if (defaultId && defaultId !== selectedTemplateId) handleTemplateSelect(defaultId);
    if (mode === "2v2" && defaultId && typeof window !== "undefined") {
      try {
        const savedLayout = window.localStorage.getItem(`${TWO_V_TWO_LAYOUT_STORAGE_KEY_PREFIX}${defaultId}`);
        setTwoVTwoTemplateJson(normalize2v2TemplateJson(savedLayout ? JSON.parse(savedLayout) : template?.template_json));
      } catch { setTwoVTwoTemplateJson(normalize2v2TemplateJson(template?.template_json)); }
    }
  }

  async function saveCurrentTemplate() {
    const nextJson = normalizeTemplateJson(templateJson);
    if (templateEditorMode === "2v2" && typeof window !== "undefined" && selectedTemplateId) {
      const layout = normalize2v2TemplateJson(nextJson);
      setTwoVTwoTemplateJson(layout);
      window.localStorage.setItem(`${TWO_V_TWO_LAYOUT_STORAGE_KEY_PREFIX}${selectedTemplateId}`, JSON.stringify(layout));
    }

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

    setTemplateStatus("Saving template...");

    try {
      const response = await fetch("/api/poster-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: {
            id: selectedTemplateId === "local-default" || selectedTemplateId.startsWith("local-") ? undefined : selectedTemplateId,
            name: templateName.trim(),
            template_json: nextJson,
          },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.template) throw new Error(result.error || "unknown error");
      const row = { ...result.template, template_json: normalizeTemplateJson(result.template.template_json) } as PosterTemplateRow;

      setTemplates((prev) =>
        prev.some((item) => item.id === row.id)
          ? prev.map((item) => (item.id === row.id ? row : item))
          : [...prev.filter((item) => item.id !== selectedTemplateId), row]
      );
      setSelectedTemplateId(row.id);
      setTemplateName(row.name);
      setUndoStack([]);
      updateWholeTemplateJson(row.template_json);
      setTemplateStatus("Template saved.");
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
    const nextJson = normalizeTemplateJson(templateJson);
    const copyName = `${templateName || selectedTemplate.name || "Template"} Copy`;

    setTemplateStatus("Duplicating template...");
    const response = await fetch("/api/poster-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: { name: copyName, template_json: nextJson } }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.template) {
      setTemplateStatus(`Duplicate failed: ${result.error || "unknown error"}`);
      return;
    }

    const row = { ...result.template, template_json: normalizeTemplateJson(result.template.template_json) } as PosterTemplateRow;

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

    if (!selectedTemplateId.startsWith("local-") && selectedTemplateId !== "local-default") {
      setTemplateStatus("Deleting template...");
      const response = await fetch("/api/poster-templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTemplateId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setTemplateStatus(`Delete failed: ${result.error || "unknown error"}`);
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

  function updateTeamPosterElement(id: string, changes: Partial<TeamPosterElement>) {
    setTeamPosterTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((element) =>
        element.id === id ? { ...element, ...changes } : element
      ),
    }));
  }

  function updateAllTeamPosterTextFonts(fontFamily: string) {
    setTeamPosterTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((element) =>
        element.kind === "avatar" ? element : { ...element, fontFamily }
      ),
    }));
    setTeamPosterStatus(`Text font changed to ${fontFamily}. Press Save Template to keep it.`);
  }

  async function saveTeamPosterTemplate() {
    const nextTemplate = normalizeTeamDanPosterTemplate(teamPosterTemplate);
    setTeamPosterStatus("Saving team poster template...");
    const response = await fetch("/api/team-poster-templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: teamPosterTemplateName, template: nextTemplate }) });
    const result = await response.json();
    if (!response.ok || !result.template) {
      setTeamPosterStatus(`Template save failed: ${result.error || "Please try again."}`);
      return;
    }

    setTeamPosterTemplate(nextTemplate);
    setSelectedTeamPosterElementId(nextTemplate.elements[0]?.id || "");
    setTeamPosterTemplates((current) => [
      ...current.filter((item) => item.name !== teamPosterTemplateName),
      { name: teamPosterTemplateName, template: nextTemplate },
    ]);
    setTeamPosterStatus("Team poster template saved publicly.");
  }

  async function deleteTeamPosterTemplate() {
    if (teamPosterTemplateName === TEAM_DAN_POSTER_TEMPLATE_NAME) {
      setTeamPosterStatus("The original Team Dan + James template is protected. Duplicate it first if you no longer need its layout.");
      return;
    }
    if (!window.confirm(`Delete the ${teamPosterTemplateName.replace(/^team-poster-/, "").replace(/-/g, " ")} template? This cannot be undone.`)) return;

    const supabase = getPosterSupabaseClient();
    if (!supabase) {
      setTeamPosterStatus("Supabase env missing. This template cannot be deleted publicly.");
      return;
    }

    setTeamPosterStatus("Deleting team poster template...");
    const { error } = await supabase.from("poster_templates").delete().eq("name", teamPosterTemplateName);
    if (error) {
      setTeamPosterStatus(`Template delete failed: ${error.message}`);
      return;
    }

    const remaining = teamPosterTemplates.filter((item) => item.name !== teamPosterTemplateName);
    const next = remaining.find((item) => item.name === TEAM_DAN_POSTER_TEMPLATE_NAME) || remaining[0];
    const nextTemplate = next?.template || createTeamDanPosterTemplate();
    const nextName = next?.name || TEAM_DAN_POSTER_TEMPLATE_NAME;
    setTeamPosterTemplates(remaining);
    setTeamPosterTemplateName(nextName);
    setTeamPosterTemplate(nextTemplate);
    setSelectedTeamPosterElementId(nextTemplate.elements[0]?.id || "");
    setTeamPosterStatus("Team poster template deleted.");
  }

  async function renameTeamPosterTemplate() {
    if (teamPosterTemplateName === TEAM_DAN_POSTER_TEMPLATE_NAME) { setTeamPosterStatus("Duplicate the original template before renaming it."); return; }
    const label = window.prompt("New template name", teamPosterTemplateName.replace(/^team-poster-/, "").replace(/-/g, " "));
    if (!label?.trim()) return;
    const nextName = `team-poster-${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
    if (nextName === teamPosterTemplateName) return;
    const supabase = getPosterSupabaseClient();
    if (!supabase) return;
    const template = normalizeTeamDanPosterTemplate(teamPosterTemplate);
    const { error } = await supabase.from("poster_templates").upsert({ name: nextName, background_url: template.backgroundUrl || null, template_json: template, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) { setTeamPosterStatus(`Template rename failed: ${error.message}`); return; }
    await supabase.from("poster_templates").delete().eq("name", teamPosterTemplateName);
    setTeamPosterTemplates((current) => current.map((item) => item.name === teamPosterTemplateName ? { name: nextName, template } : item));
    setTeamPosterTemplateName(nextName); setTeamPosterStatus("Template renamed.");
  }

  function resetTeamPosterTemplate() {
    const nextTemplate = createTeamDanPosterTemplate();
    setTeamPosterTemplate(nextTemplate);
    setSelectedTeamPosterElementId(nextTemplate.elements[0]?.id || "");
    setTeamPosterStatus("Team Dan poster template reset.");
  }

  async function handleTeamPosterBackgroundUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
        setTeamPosterTemplate((prev) => ({
          ...prev,
          backgroundUrl: String(reader.result || ""),
        }));
        setTeamPosterStatus("Background added locally only. Supabase env is missing.");
      };
      reader.readAsDataURL(file);
      return;
    }

    setTeamPosterStatus("Uploading Team Dan background...");

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    const filePath = `${teamPosterTemplateName}/${Date.now()}-${safeName}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("poster-backgrounds")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      setTeamPosterStatus(`Team Dan background upload failed: ${uploadError.message}`);
      return;
    }

    const { data } = supabase.storage
      .from("poster-backgrounds")
      .getPublicUrl(filePath);

    setTeamPosterTemplate((prev) => ({
      ...prev,
      backgroundUrl: data.publicUrl,
      backgroundPath: filePath,
    }));
    setTeamPosterStatus("Background uploaded. Press Save Template to save publicly.");
  }

  function handleTeamPosterAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload a PNG or JPG image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateTeamPosterElement(selectedTeamPosterElementId, {
        imageUrl: String(reader.result || ""),
      });
      setTeamPosterStatus("Avatar image added.");
    };
    reader.readAsDataURL(file);
  }

  async function downloadTeamPosterTemplatePreview() {
    const node = teamPosterRef.current;
    if (!node) return;

    const blob = await htmlToImage.toBlob(node, {
      cacheBust: true,
      pixelRatio: 1,
      width: TEAM_POSTER_WIDTH,
      height: TEAM_POSTER_HEIGHT,
      backgroundColor: "#000000",
      style: {
        transform: "none",
        transformOrigin: "top left",
      },
    });

    if (!blob) return;
    saveAs(blob, `team-dan-poster-template-${Date.now()}.png`);
  }

  function createTeamPosterLayout() {
    const label = newTeamPosterTemplateName.trim();
    if (!label) {
      setTeamPosterStatus("Enter a name for the new layout first.");
      return;
    }
    const name = `team-poster-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "new-team"}`;
    if (teamPosterTemplates.some((item) => item.name === name)) {
      setTeamPosterStatus("A layout with that name already exists. Select it from the list instead.");
      return;
    }
    const source = newTeamPosterSourceName === "current"
      ? teamPosterTemplate
      : teamPosterTemplates.find((item) => item.name === newTeamPosterSourceName)?.template;
    const nextTemplate = normalizeTeamDanPosterTemplate(source || createTeamDanPosterTemplate());
    setTeamPosterTemplateName(name);
    setTeamPosterTemplate(nextTemplate);
    setTeamPosterTemplates((current) => [
      ...current.filter((item) => item.name !== name),
      { name, template: nextTemplate },
    ].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedTeamPosterElementId(nextTemplate.elements[0]?.id || "");
    setNewTeamPosterTemplateName("");
    setTeamPosterStatus(`${label} layout created. Choose its data source and side, then press Save Template.`);
  }

  async function buildTeamPosterFromData() {
    setTeamPosterStatus("Loading creator data for this layout...");
    try {
      const statDate = getYesterdayDateKey();
      const [response, exclusionsResponse, assignmentsResponse] = await Promise.all([
        fetch(`/api/data-analysis/daily-stats?date=${statDate}&t=${Date.now()}`, { cache: "no-store" }),
        fetch("/api/data-analysis/excluded-creators", { cache: "no-store" }),
        fetch("/api/data-analysis/manager-assignments", { cache: "no-store" }),
      ]);
      const [json, exclusions, assignmentsData] = await Promise.all([response.json(), exclusionsResponse.json(), assignmentsResponse.json()]);
      if (!response.ok) throw new Error(json.error || "Could not load Creator Daily Stats.");
      if (!json.count) throw new Error(`Yesterday's data (${statDate}) is not ready yet. No older data was used.`);
      if (!assignmentsResponse.ok) throw new Error(assignmentsData.error || "Could not load manager assignments.");
      const hiddenUsernames = new Set((exclusions.creators || []).filter((creator: { hiddenFromDownloads?: boolean }) => creator.hiddenFromDownloads).map((creator: { username: string }) => creator.username.toLowerCase()));
      const managerGroups = assignmentsData.managerGroups || assignmentsData.assignments?.managerGroups || {};
      const managerKey = String(teamPosterTemplate.managerKey || "team-dan").toLowerCase().replace(/[^a-z0-9:-]/g, "");
      const managerFor = (row: Record<string, unknown>) => String(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || "").trim().toLowerCase();
      const usernameFor = (row: Record<string, unknown>) => String(row.creator_username || row["Creator's username"] || "").replace("@", "").trim().toLowerCase();
      const numeric = (value: unknown) => Number(String(value || "0").replace(/[^\d.-]/g, "")) || 0;
      const hoursFor = (row: Record<string, unknown>) => numeric(row.live_hours || row.live_duration || row["LIVE duration"]);
      const rows = (json.rows || []).filter((row: Record<string, unknown>) => {
        if (row.stat_date !== statDate || !usernameFor(row) || hiddenUsernames.has(usernameFor(row))) return false;
        const manager = managerFor(row);
        const managerKeyNormalizedRaw = manager.replace(/[^a-z0-9]/g, "");
        const managerKeyNormalized = ["firstclassagencykaydenoutlookcom", "bmwe46320dhotmailcouk"].includes(managerKeyNormalizedRaw) ? "kaydenmads" : managerKeyNormalizedRaw;
        if (managerKey === "team-dan") {
          const directTeamKey = managerKeyNormalized.replace(/(outlook|gmail|mail)com$/, "");
          return ["firstclassagencydan", "firstclassagencyjames"].includes(directTeamKey);
        }
        if (managerKey === "combined:lisa-g") {
          return TEAM_LISA_G_MANAGER_KEYS.some((key) => managerKeyNormalized.includes(key));
        }
        const selectedGroup = ({
          "group:respawn": "Respawn",
          "group:paradise": "Paradise",
          "group:horizon": "Horizon",
          "group:trident": "Trident",
        } as Record<string, string>)[managerKey];
        if (selectedGroup) return managerGroups[managerKeyNormalized] === selectedGroup;
        if (managerKey === "first-class-all") {
          // The whole-agency poster follows the current Manager Assignments
          // configuration. Agency values can be stale after a creator moves
          // to another sub-agency, so they must not decide membership here.
          return ["Team Dan / James", "Team Mike / Indi"].includes(managerGroups[managerKeyNormalized]);
        }
        if (["ashwalbridge", "ashwalbridgeaolcom", "firstclassagencyashoutlookcom", "firstclassagencyash"].includes(managerKey)) {
          return ["ashwalbridge", "ashwalbridgeaolcom", "firstclassagencyashoutlookcom", "firstclassagencyash"].includes(managerKeyNormalized);
        }
        // Manager Assignments store a normalised email key, while the export
        // retains punctuation in the actual email. Support either form.
        return managerKeyNormalized === managerKey;
      });
      if (!rows.length) throw new Error("No creators were found for this data source on the latest upload.");
      const topDiamonds = [...rows].sort((a, b) => numeric(b.diamonds) - numeric(a.diamonds)).slice(0, 5);
      const topHours = [...rows].sort((a, b) => hoursFor(b) - hoursFor(a)).slice(0, 5);
      const avatars = new Map<string, string>();
      // TikTok can return a stale avatar when several profile pages are scraped
      // at once. Resolve each creator separately so every slot keeps its own image.
      for (const username of new Set([...topDiamonds, ...topHours].map(usernameFor))) {
        avatars.set(username, await fetchTikTokAvatar(username));
      }
      const compact = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(value % 1000 ? 1 : 0)}K` : String(value);
      const filled = normalizeTeamDanPosterTemplate({
        ...teamPosterTemplate,
        elements: teamPosterTemplate.elements.map((element) => {
          const diamond = element.id.match(/^(avatar|username|diamonds)-(\d+)$/);
          const hourText = element.id.match(/^(avatar|username)-hours-(\d+)$/);
          const hourValue = element.id.match(/^hours-(\d+)$/);
          const hourIndex = Number(hourText?.[2] || hourValue?.[1] || "0") - 1;
          const source = diamond ? topDiamonds[Number(diamond[2]) - 1] : hourText || hourValue ? topHours[hourIndex] : null;
          if (!source) return element;
          const username = usernameFor(source);
          if (element.kind === "avatar") return { ...element, imageUrl: avatars.get(username) || "" };
          if (element.kind === "username") return { ...element, value: username.toUpperCase() };
          if (element.kind === "diamonds") return { ...element, value: compact(numeric(source.diamonds)) };
          if (element.kind === "hours") return { ...element, value: `${hoursFor(source).toFixed(hoursFor(source) % 1 ? 1 : 0)}H` };
          return element;
        }),
      });
      setTeamPosterTemplate(filled);
      setTeamPosterStatus(`Preview built from ${rows.length} creators on ${statDate}.`);
    } catch (error) {
      setTeamPosterStatus(error instanceof Error ? error.message : "Could not build the poster preview.");
    }
  }

  async function loadManagerLeaderboard() {
    const supabase = getPosterSupabaseClient();
    if (!supabase) {
      setManagerLeaderboardStatus("Creator Intelligence data is unavailable because the Supabase connection is not configured.");
      return;
    }

    setManagerLeaderboardLoading(true);
    setManagerLeaderboardStatus("Loading Creator Intelligence data and the current Manager Assignments...");

    const { data: latestRows, error: latestError } = await supabase
      .from("creator_daily_stats")
      .select("stat_date")
      .order("stat_date", { ascending: false })
      .limit(1);
    const latestDate = (latestRows?.[0] as ManagerLeaderboardStat | undefined)?.stat_date;

    if (latestError || !latestDate) {
      setManagerLeaderboardStatus(`Could not find Creator Intelligence data: ${latestError?.message || "no uploaded data"}.`);
      setManagerLeaderboardLoading(false);
      return;
    }

    const startDate = `${latestDate.slice(0, 7)}-01`;
    // Creator Intelligence fetches every page of daily data. Do the same here so
    // later groups are not lost once the month has more than 10,000 records.
    const rows: ManagerLeaderboardStat[] = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("creator_daily_stats")
        .select("*")
        .gte("stat_date", startDate)
        .lte("stat_date", latestDate)
        .order("stat_date", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        setManagerLeaderboardStatus(`Manager leaderboard load failed: ${error.message}`);
        setManagerLeaderboardLoading(false);
        return;
      }

      const page = (data || []) as ManagerLeaderboardStat[];
      rows.push(...page);
      hasMore = page.length === pageSize;
      offset += pageSize;
    }
    const activeGroup = selectedManagerLeaderboardGroup;
    const assignmentsResponse = await fetch("/api/data-analysis/manager-assignments", { cache: "no-store" });
    const assignmentsData = await assignmentsResponse.json();
    if (!assignmentsResponse.ok) {
      setManagerLeaderboardStatus(assignmentsData.error || "Could not load Manager Assignments.");
      setManagerLeaderboardLoading(false);
      return;
    }
    const managerGroups = assignmentsData.managerGroups || assignmentsData.assignments?.managerGroups || {};
    const managerNames = assignmentsData.assignments?.managerNames || {};

    // Match Creator Intelligence: assign every month-to-date row for a creator to
    // that creator's latest manager, rather than splitting totals by old daily assignments.
    const rowsByCreator = new Map<string, ManagerLeaderboardStat[]>();
    for (const row of rows) {
      const creatorKey = getManagerLeaderboardCreatorKey(row);
      if (!creatorKey) continue;
      const creatorRows = rowsByCreator.get(creatorKey) || [];
      creatorRows.push(row);
      rowsByCreator.set(creatorKey, creatorRows);
    }

    const totals = new Map<string, ManagerLeaderboardRow>();
    for (const creatorRows of rowsByCreator.values()) {
      const latestCreatorRow = [...creatorRows].sort((a, b) => String(a.stat_date || "").localeCompare(String(b.stat_date || ""))).at(-1);
      if (!latestCreatorRow) continue;
      const assignedGroup = managerGroups[getManagerLeaderboardManagerKey(latestCreatorRow)];
      // A manager only disappears when they are intentionally placed in the
      // Excluded column on Manager Assignments. This applies to every group.
      if (assignedGroup === "Excluded" || assignedGroup === "Owner") continue;
      if (activeGroup !== "All Groups" && !belongsToSelectedManagerLeaderboardGroup(latestCreatorRow, activeGroup, managerGroups)) continue;
      const manager = managerNames[getManagerLeaderboardManagerKey(latestCreatorRow)] || getManagerLeaderboardName(latestCreatorRow);
      if (manager === "Unassigned") continue;
      const existing = totals.get(manager) || { manager, diamonds: 0 };
      existing.diamonds += creatorRows.reduce((sum, row) => sum + safeNumber(row.diamonds), 0);
      totals.set(manager, existing);
    }

    const ranked = [...totals.values()]
      .sort((a, b) => b.diamonds - a.diamonds || a.manager.localeCompare(b.manager));
    setManagerLeaderboardRows(ranked);
    setManagerLeaderboardTemplate((current) => ensureManagerLeaderboardRows(current, ranked.length));
    setManagerLeaderboardStatus(
      `${activeGroup === "All Groups" ? "All groups" : activeGroup} · current calendar month through ${latestDate} · ${ranked.length} managers ranked.`
    );
    setManagerLeaderboardLoading(false);
  }

  function updateManagerLeaderboardElement(id: string, changes: Partial<TeamPosterElement>) {
    setManagerLeaderboardTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((element) => element.id === id ? { ...element, ...changes } : element),
    }));
  }

  async function saveManagerLeaderboardTemplate() {
    const supabase = getPosterSupabaseClient();
    if (!supabase) {
      setManagerLeaderboardStatus("Supabase is not configured, so this template cannot be saved publicly.");
      return;
    }

    const nextTemplate = normalizeManagerLeaderboardTemplate(managerLeaderboardTemplate);
    const templateName = getManagerLeaderboardTemplateName(selectedManagerLeaderboardGroup);
    setManagerLeaderboardStatus(`Saving ${selectedManagerLeaderboardGroup} manager leaderboard profile publicly...`);
    const { error } = await supabase
      .from("poster_templates")
      .upsert({
        name: templateName,
        background_url: nextTemplate.backgroundUrl || null,
        template_json: nextTemplate,
        updated_at: new Date().toISOString(),
      }, { onConflict: "name" });

    if (error) {
      setManagerLeaderboardStatus(`Public save failed: ${error.message}`);
      return;
    }

    setManagerLeaderboardTemplate(nextTemplate);
    setManagerLeaderboardStatus(`${selectedManagerLeaderboardGroup} manager leaderboard profile saved publicly.`);
  }

  async function handleManagerLeaderboardBackgroundUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      if (file) alert("Please upload a PNG or JPG image.");
      return;
    }

    const supabase = getPosterSupabaseClient();
    if (!supabase) {
      const reader = new FileReader();
      reader.onload = () => setManagerLeaderboardTemplate((prev) => ({ ...prev, backgroundUrl: String(reader.result || "") }));
      reader.readAsDataURL(file);
      setManagerLeaderboardStatus("Background added locally. Public saving needs the Supabase connection.");
      return;
    }

    setManagerLeaderboardStatus("Uploading manager leaderboard background...");
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").toLowerCase();
    const filePath = `${getManagerLeaderboardTemplateName(selectedManagerLeaderboardGroup)}/${Date.now()}-${safeName}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("poster-backgrounds").upload(filePath, file, { cacheControl: "3600", upsert: true });
    if (uploadError) {
      setManagerLeaderboardStatus(`Background upload failed: ${uploadError.message}`);
      return;
    }
    const { data } = supabase.storage.from("poster-backgrounds").getPublicUrl(filePath);
    setManagerLeaderboardTemplate((prev) => ({ ...prev, backgroundUrl: data.publicUrl, backgroundPath: filePath }));
    setManagerLeaderboardStatus("Background uploaded. Press Save Publicly to keep it for everyone.");
  }

  async function downloadManagerLeaderboard() {
    const node = managerLeaderboardPosterRef.current;
    if (!node) return;

    const wasEditing = managerLeaderboardEditMode;
    setManagerLeaderboardEditMode(false);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      const blob = await htmlToImage.toBlob(node, {
        cacheBust: true,
        pixelRatio: 1,
        backgroundColor: managerLeaderboardTemplate.backgroundUrl ? undefined : "transparent",
      });
      if (blob) saveAs(blob, `manager-leaderboard-${cleanFileName(selectedManagerLeaderboardGroup || "all-groups")}.png`);
    } finally {
      setManagerLeaderboardEditMode(wasEditing);
    }
  }

  useEffect(() => {
    loadPosterTemplates();
  }, []);

  useEffect(() => {
    fetch("/api/data-analysis/fallback-avatars", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { fallbackAvatarUrlsRef.current = Object.fromEntries((data.avatars || []).map((avatar: { username: string; imageUrl: string }) => [avatar.username, avatar.imageUrl])); })
      .catch(() => { fallbackAvatarUrlsRef.current = {}; });
  }, []);

  useEffect(() => {
    async function loadTeamPosterTemplate() {
      const response = await fetch("/api/team-poster-templates", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        setTeamPosterStatus(`Team poster template load failed: ${result.error || "Please reload."}`);
        return;
      }
      const templates = Array.isArray(result.templates) ? result.templates as Array<{ name: string; template_json: TeamPosterTemplate | null }> : [];
      const library = templates
        .filter((item) => item.template_json && (item.name === TEAM_DAN_POSTER_TEMPLATE_NAME || String(item.name).startsWith("team-poster-")))
        .map((item) => ({ name: String(item.name), template: normalizeTeamDanPosterTemplate(item.template_json as TeamPosterTemplate) }));

      if (!library.length) {
        setTeamPosterStatus("No public Team Dan template saved yet. Press Save Template to create one.");
        return;
      }

      library.sort((a, b) => (a.name === TEAM_DAN_POSTER_TEMPLATE_NAME ? -1 : b.name === TEAM_DAN_POSTER_TEMPLATE_NAME ? 1 : a.name.localeCompare(b.name)));
      const first = library.find((item) => item.name === TEAM_DAN_POSTER_TEMPLATE_NAME) || library[0];
      setTeamPosterTemplates(library);
      setTeamPosterTemplateName(first.name);
      const parsed = first.template;
      setTeamPosterTemplate(parsed);
      setSelectedTeamPosterElementId(parsed.elements[0]?.id || "");
      setTeamPosterStatus("Team Dan poster template loaded publicly.");
    }

    loadTeamPosterTemplate();
  }, []);

  useEffect(() => {
    async function loadTeamPosterManagers() {
      try {
        const response = await fetch("/api/data-analysis/manager-sources", { cache: "no-store" });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Could not load manager sources.");
        const byManager = new Map<string, ManagerLeaderboardStat>();
        for (const row of (json.managers || []) as ManagerLeaderboardStat[]) {
          const value = String(row.manager_key || row.manager_email || row.creator_network_manager || row["Creator Network manager"] || row.email || "").trim();
          if (value && !byManager.has(value.toLowerCase())) byManager.set(value.toLowerCase(), row);
        }
        const managerNameCollator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
        const managers = Array.from(byManager.entries()).map(([value, row]) => {
          // manager-sources already returns the Creator Intelligence display
          // label, including its assigned group, for the latest upload.
          return { value, label: row.manager_label || getManagerLeaderboardName(row) };
        }).sort((a, b) => managerNameCollator.compare(a.label, b.label));
        if (managers.length) setTeamPosterManagerOptions([
          { value: "team-dan", label: "Team Dan + James - Direct Teams" },
          { value: "first-class-all", label: "First Class — All Creators" },
          { value: "group:respawn", label: "Team Respawn — All Managers" },
          { value: "group:paradise", label: "Team Paradise — All Managers" },
          { value: "group:horizon", label: "Team Horizon — All Managers" },
          { value: "group:trident", label: "Team Trident — All Managers" },
          { value: "combined:lisa-g", label: "Team Lisa / G - Combined" },
          ...managers,
        ]);
      } catch {
        // The editable field remains available if the latest data cannot load.
      }
    }
    loadTeamPosterManagers();
  }, []);

  useEffect(() => {
    async function loadManagerLeaderboardTemplate() {
      const supabase = getPosterSupabaseClient();
      const templateName = getManagerLeaderboardTemplateName(selectedManagerLeaderboardGroup);
      if (!supabase) {
        setManagerLeaderboardTemplate(createManagerLeaderboardTemplate());
        return;
      }

      const { data, error } = await supabase
        .from("poster_templates")
        .select("template_json")
        .eq("name", templateName)
        .maybeSingle();

      if (error || !data?.template_json) {
        setManagerLeaderboardTemplate(createManagerLeaderboardTemplate());
        setSelectedManagerLeaderboardElementId("manager-name-1");
        setManagerLeaderboardStatus(`${selectedManagerLeaderboardGroup} has no saved profile yet.`);
        return;
      }
      const parsed = normalizeManagerLeaderboardTemplate(data.template_json as TeamPosterTemplate);
      setManagerLeaderboardTemplate(parsed);
      setSelectedManagerLeaderboardElementId(parsed.elements[0]?.id || "");
      setManagerLeaderboardStatus(`${selectedManagerLeaderboardGroup} manager leaderboard profile loaded publicly.`);
    }

    loadManagerLeaderboardTemplate();
  }, [selectedManagerLeaderboardGroup]);

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
    if (activeMode !== "team") return;

    function onTeamPosterKeyDown(event: KeyboardEvent) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName)) return;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;

      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      setTeamPosterTemplate((current) => ({
        ...current,
        elements: current.elements.map((element) => {
          if (element.id !== selectedTeamPosterElementId) return element;
          if (event.key === "ArrowUp") return { ...element, y: element.y - step };
          if (event.key === "ArrowDown") return { ...element, y: element.y + step };
          if (event.key === "ArrowLeft") return { ...element, x: element.x - step };
          return { ...element, x: element.x + step };
        }),
      }));
    }

    window.addEventListener("keydown", onTeamPosterKeyDown);
    return () => window.removeEventListener("keydown", onTeamPosterKeyDown);
  }, [activeMode, selectedTeamPosterElementId]);

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

  function swapSingleOpponents() {
    setSingleBattle((prev) => ({ ...prev, name1: prev.name2, name2: prev.name1, image1: prev.image2, image2: prev.image1 }));
  }

  function clearSinglePoster() {
    setSingleBattle(createBattle(`single-${stableId}`));
    setSinglePaste("");
    setSingleDay("");
    setSingleMonth(String(new Date().getMonth()));
    setSelectedId("");
  }

  function clearMassPosters() {
    setPaste("");
    setBattles([]);
    setSelectedId("");
    setMassDay("");
    setMassMonth(String(new Date().getMonth() + 1));
    setMassDate("");
  }

  async function fetchTikTokAvatar(username: string) {
    const cleanUsername = username.replace("@", "").trim().toLowerCase();
    if (!cleanUsername) return "";
    const normalizedUsername = cleanUsername.replace(/[^a-z0-9]/g, "");
    const localAvatar = savedFallbackAvatar(cleanUsername, fallbackAvatarUrlsRef.current) || LOCAL_AVATAR_PATHS[normalizedUsername];
    if (localAvatar) return localAvatar;

    try {
      // Matches the proven Aqua Dashboard lookup: return TikTok's image URL directly.
      const res = await fetch("/api/tiktok-avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: cleanUsername }),
      });

      const json = await res.json();
      return json.avatar || "";
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

    await syncDfjdbattlesToCalendar([row], calendarDateFromParts(singleDay, singleMonth) || calendarDateFromParts(massDay, massMonth));

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
    await syncDfjdbattlesToCalendar(rows, calendarDateFromParts(massDay, massMonth));
    setLoading(false);
  }

  function updateTwoVTwoDate(day: string, month: string) {
    setTwoVTwoBattle((current) => ({ ...current, date: formatDateFromParts(day, month) }));
  }

  function handleTwoVTwoDayChange(value: string) {
    setTwoVTwoDay(value);
    updateTwoVTwoDate(value, twoVTwoMonth);
  }

  function handleTwoVTwoMonthChange(value: string) {
    const fixedDay = twoVTwoDay && Number(twoVTwoDay) > getDaysInMonth(value)
      ? String(getDaysInMonth(value)) : twoVTwoDay;
    setTwoVTwoMonth(value);
    setTwoVTwoDay(fixedDay);
    updateTwoVTwoDate(fixedDay, value);
  }

  function updateTwoVTwoElement(key: TwoVTwoPosterElementKey, changes: Partial<PosterElement>) {
    if (templateEditorMode === "2v2") {
      setTemplateJson((current) => ({ ...current, [key]: { ...current[key as PosterElementKey], ...changes } }));
      return;
    }
    setTwoVTwoTemplateJson((current) => ({ ...current, [key]: { ...current[key], ...changes } }));
  }

  function clearTwoVTwoPoster() {
    setTwoVTwoBattle({ home1: "", home2: "", away1: "", away2: "", image1: "", image2: "", image3: "", image4: "", time: "", date: "" });
    setTwoVTwoDay("");
    setTwoVTwoMonth(String(new Date().getMonth()));
    setTwoVTwoTemplateJson((current) => ({ ...normalize2v2TemplateJson(), backgroundUrl: current.backgroundUrl }));
    setTwoVTwoPaste("");
  }

  function swapTwoVTwoOpponents() {
    setTwoVTwoBattle((current) => ({
      ...current,
      home1: current.home2,
      home2: current.home1,
      away1: current.away2,
      away2: current.away1,
      image1: current.image2,
      image2: current.image1,
      image3: current.image4,
      image4: current.image3,
    }));
  }

  function swapTwoVTwoSides() {
    setTwoVTwoBattle((current) => ({
      ...current,
      home1: current.away1,
      home2: current.away2,
      away1: current.home1,
      away2: current.home2,
      image1: current.image3,
      image2: current.image4,
      image3: current.image1,
      image4: current.image2,
    }));
  }

  async function readTwoVTwoPaste() {
    const parts = twoVTwoPaste.trim().split(/\t+/).map((value) => value.trim());
    if (parts[0]?.toUpperCase() !== "2V2" || parts.length < 12) {
      alert("Paste a 2V2 Copy Poster Row from Battle Network.");
      return;
    }
    const [home1, , home2, , away1, , away2, , , day, time] = parts.slice(1);
    const image1 = await fetchTikTokAvatar(home1);
    const image2 = await fetchTikTokAvatar(home2);
    const image3 = await fetchTikTokAvatar(away1);
    const image4 = await fetchTikTokAvatar(away2);
    setTwoVTwoBattle({ home1: formatName(home1), home2: formatName(home2), away1: formatName(away1), away2: formatName(away2), image1, image2, image3, image4, date: day || "", time: formatTime(time || "") });
  }

  async function autoFillTwoVTwoAvatar(field: "image1" | "image2" | "image3" | "image4", username: string) {
    const avatar = await fetchTikTokAvatar(username);
    if (avatar) setTwoVTwoBattle((current) => ({ ...current, [field]: avatar }));
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

  function TwoVTwoPhotoBox({ field, usernameField, label }: { field: "image1" | "image2" | "image3" | "image4"; usernameField: "home1" | "home2" | "away1" | "away2"; label: string }) {
    const inputId = `two-v-two-${field}`;
    const image = twoVTwoBattle[field];
    const setImage = (file: File) => {
      const reader = new FileReader();
      reader.onload = () => setTwoVTwoBattle((current) => ({ ...current, [field]: String(reader.result || "") }));
      reader.readAsDataURL(file);
    };
    return <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file?.type.startsWith("image/")) setImage(file); }} className="rounded-lg border-2 border-dashed border-yellow-300/40 bg-black/45 p-4 text-center hover:border-yellow-300 transition">
      <p className="text-yellow-300 font-black uppercase text-sm tracking-widest">{label}</p>
      {image ? <img src={addCacheBustToImageUrl(image, `2v2-${field}-${twoVTwoBattle[usernameField]}`)} alt="" className="w-24 h-24 rounded-full object-cover mx-auto mt-3 border-2 border-yellow-300" /> : <div className="w-24 h-24 rounded-full bg-black/60 mx-auto mt-3 border border-white/10 flex items-center justify-center text-white/25 text-xs">No image</div>}
      <p className="text-white/45 text-xs mt-3">Drag photo here or click to choose</p>
      <div className="mt-3 flex flex-col gap-2 items-center"><label htmlFor={inputId} className="inline-block cursor-pointer bg-yellow-300 text-black font-black px-4 py-2 rounded uppercase text-xs">Choose Image</label><button type="button" disabled={!twoVTwoBattle[usernameField]} onClick={() => autoFillTwoVTwoAvatar(field, twoVTwoBattle[usernameField])} className="bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black px-4 py-2 rounded uppercase text-xs">Refresh TikTok Photo</button></div>
      <input id={inputId} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) setImage(file); }} />
    </div>;
  }

  async function downloadTwoVTwoPoster() {
    const node = twoVTwoPosterRef.current;
    if (!node) return;
    await document.fonts.ready;
    await waitForPosterImages(node);
    const blob = await htmlToImage.toBlob(node, { cacheBust: true, pixelRatio: 2, backgroundColor: "#000000" });
    if (blob) saveAs(blob, cleanFileName(`${twoVTwoBattle.home1 || "HOME1"} & ${twoVTwoBattle.home2 || "HOME2"} VS ${twoVTwoBattle.away1 || "AWAY1"} & ${twoVTwoBattle.away2 || "AWAY2"} - ${twoVTwoBattle.date || "DATE"} - ${twoVTwoBattle.time || "TIME"}.png`));
  }

  function TwoVTwoPosterPreview({ scale = 0.3 }: { scale?: number }) {
    const editingTwoVTwoTemplate = templateEditorMode === "2v2";
    const active = normalize2v2TemplateJson(editingTwoVTwoTemplate ? { ...templateJson, backgroundUrl: templateJson.backgroundUrl || BRAND.posterBackground } : { ...twoVTwoTemplateJson, backgroundUrl: twoVTwoTemplateJson.backgroundUrl || templateJson.backgroundUrl || BRAND.posterBackground });
    const slots = [
      ["avatar1", "username1", twoVTwoBattle.image1, twoVTwoBattle.home1, "Home 1"],
      ["avatar2", "username2", twoVTwoBattle.image2, twoVTwoBattle.home2, "Home 2"],
      ["avatar3", "username3", twoVTwoBattle.image3, twoVTwoBattle.away1, "Opponent 1"],
      ["avatar4", "username4", twoVTwoBattle.image4, twoVTwoBattle.away2, "Opponent 2"],
    ] as const;
    const dateText = [twoVTwoBattle.date, twoVTwoBattle.time].filter(Boolean).join(" | ");
    const render = (key: TwoVTwoPosterElementKey, content: React.ReactNode, circle = false) => {
      const element = active[key]; const selected = twoVTwoEditMode && twoVTwoSelectedElement === key;
      const style = { left: element.x, top: element.y, width: element.width, height: element.height };
      if (!twoVTwoEditMode) return <div key={key} className={`absolute ${circle ? "rounded-full overflow-hidden" : ""}`} style={style}>{content}</div>;
      return <Rnd key={key} scale={scale} bounds="parent" lockAspectRatio={circle} position={{ x: element.x, y: element.y }} size={{ width: element.width, height: element.height }} onMouseDown={() => { setTwoVTwoSelectedElement(key); if (templateEditorMode === "2v2") setSelectedElement(key as PosterElementKey); }} onDragStop={(_, data) => updateTwoVTwoElement(key, { x: Math.round(data.x), y: Math.round(data.y) })} onResizeStop={(_, __, ref, ___, position) => updateTwoVTwoElement(key, { x: Math.round(position.x), y: Math.round(position.y), width: Math.round(ref.offsetWidth), height: Math.round(ref.offsetHeight) })} className={`${circle ? "rounded-full overflow-hidden" : ""} ${selected ? "ring-[8px] ring-yellow-300" : "ring-[5px] ring-cyan-300/45"}`}>{content}</Rnd>;
    };
    const textStyle = (key: TwoVTwoPosterElementKey) => { const e = active[key]; return { fontFamily: `'${e.fontFamily || "Luckiest Guy"}', sans-serif`, fontSize: e.fontSize || 44, fontWeight: e.fontWeight || 900, color: e.color || "#5CEEFF", WebkitTextStroke: `${e.strokeWidth ?? 2}px ${e.strokeColor || "black"}`, textShadow: `${e.shadowX ?? 2}px ${e.shadowY ?? 2}px ${e.shadowBlur ?? 0}px ${e.shadowColor || "#000"}`, letterSpacing: `${e.letterSpacing ?? 1}px` } as CSSProperties; };
    return <div className="overflow-hidden mx-auto bg-black rounded-lg" style={{ width: POSTER_WIDTH * scale, height: POSTER_HEIGHT * scale }}><div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}><div ref={twoVTwoPosterRef} className="relative w-[1080px] h-[1920px] overflow-hidden bg-black"><img src={active.backgroundUrl || BRAND.posterBackground} className="absolute inset-0 w-full h-full object-cover" alt="" />{slots.map(([avatar, username, image, name, label]) => <Fragment key={avatar}>{render(avatar, twoVTwoEditMode ? <div className="w-full h-full rounded-full border-[8px] border-dashed border-cyan-300 bg-black/60 flex items-center justify-center text-cyan-200 text-3xl font-black">{label}</div> : image ? <img crossOrigin="anonymous" src={addCacheBustToImageUrl(image, `${avatar}-${name}`)} className="w-full h-full rounded-full object-cover" alt="" /> : null, true)}{render(username, <div className="w-full h-full flex items-center justify-center text-center leading-none whitespace-nowrap uppercase" style={textStyle(username)}>{twoVTwoEditMode ? label : name}</div>)}</Fragment>)}{render("date", <div className="w-full h-full flex items-center justify-center text-center leading-none whitespace-nowrap uppercase" style={textStyle("date")}>{twoVTwoEditMode ? "DATE | TIME" : dateText}</div>)}</div></div></div>;
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
          lockAspectRatio
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
  const fontSize =
    key === "date"
      ? element.fontSize || fallbackSize
      : autoFontSize(value, element, fallbackSize);

 const content = (
  <div
    className="w-full h-full flex items-center justify-center"
    style={{
      fontFamily: `'${element.fontFamily || "Luckiest Guy"}', sans-serif`,
      WebkitTextStroke: `${element.strokeWidth ?? 2}px ${
        element.strokeColor || "black"
      }`,
      textShadow: `${element.shadowX ?? 2}px ${
        element.shadowY ?? 2
      }px ${element.shadowBlur ?? 0}px ${
        element.shadowColor || "#000000"
      }`,
      letterSpacing: `${element.letterSpacing ?? 1}px`,
      fontSize,
      fontWeight: element.fontWeight || 900,
      textTransform:
        element.uppercase === false ? "none" : "uppercase",
    }}
  >
    <span
      className="leading-none text-center whitespace-nowrap"
      style={{
        background: element.gradientEnabled
          ? `linear-gradient(
              ${element.gradientDirection || "to bottom"},
              ${element.gradientFrom || "#5CEEFF"},
              ${element.gradientTo || "#0044FF"}
            )`
          : undefined,

        WebkitBackgroundClip: element.gradientEnabled
          ? "text"
          : undefined,

        backgroundClip: element.gradientEnabled
          ? "text"
          : undefined,

        WebkitTextFillColor: element.gradientEnabled
          ? "transparent"
          : (element.color || "#5CEEFF"),

        color: element.gradientEnabled
          ? "transparent"
          : (element.color || "#5CEEFF"),
      }}
    >
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
        updateTemplateElement(key, {
          x: Math.round(data.x),
          y: Math.round(data.y),
        });
      }}
      onResizeStop={(_, __, ref, ___, position) => {
        setSelectedElement(key);

        const newWidth = Math.round(ref.offsetWidth);
        const newHeight = Math.round(ref.offsetHeight);
        const oldHeight = element.height || newHeight;
        const currentFontSize =
          element.fontSize || fallbackSize;

        const scaleFactor =
          oldHeight > 0 ? newHeight / oldHeight : 1;

        const newFontSize = Math.max(
          10,
          Math.round(currentFontSize * scaleFactor)
        );

        updateTemplateElement(key, {
          x: Math.round(position.x),
          y: Math.round(position.y),
          width: newWidth,
          height: newHeight,
          fontSize: newFontSize,
        });
      }}
      className={`${
        isSelected
          ? "ring-[8px] ring-yellow-300"
          : "ring-[5px] ring-cyan-300/45"
      } bg-black/10`}
    >
      {content}
    </Rnd>
  );
}
    return (
      <div
        className="overflow-hidden mx-auto bg-black rounded-lg"
        style={{
          width: POSTER_WIDTH * scale,
          height: POSTER_HEIGHT * scale,
        }}
      >
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

  function TemplateSelectorPanel({ compact = false }: { compact?: boolean }) {
    const activeDefaultTemplateId = activeMode === "2v2" ? twoVTwoDefaultTemplateId : defaultTemplateId;
    const posterTypeLabel = activeMode === "2v2" ? "2v2" : "Single / Mass";
    return (
      <div className={compact ? "space-y-3" : "bg-black/35 border border-cyan-300/20 rounded-xl p-5 space-y-4"}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-cyan-300 font-black uppercase tracking-widest text-sm">
            Template Selector
          </p>
          <button
            type="button"
            onClick={() => {
              const openingTwoVTwo = activeMode === "2v2";
              setTemplateEditorMode(openingTwoVTwo ? "2v2" : "single");
              if (openingTwoVTwo) {
                updateWholeTemplateJson(twoVTwoTemplateJson as PosterTemplateJson);
                setTwoVTwoEditMode(true);
              }
              setEditMode(true);
            }}
            className="bg-cyan-300 hover:bg-cyan-200 transition text-black font-black px-3 py-2 rounded-lg uppercase tracking-widest text-xs"
          >
            Poster Template
          </button>
        </div>

        <select
          value={selectedTemplateId}
          onChange={(e) => handleTemplateSelect(e.target.value)}
          className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}{template.id === activeDefaultTemplateId ? " (Default)" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={setCurrentTemplateAsDefault}
          disabled={!selectedTemplateId || selectedTemplateId === activeDefaultTemplateId}
          className={`w-full rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-widest transition ${
            selectedTemplateId === activeDefaultTemplateId
              ? "border-yellow-300/30 bg-yellow-300/10 text-yellow-200"
              : "border-cyan-300/30 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300/20"
          }`}
        >
          {selectedTemplateId === activeDefaultTemplateId ? `${posterTypeLabel} Default` : `Set ${posterTypeLabel} Default`}
        </button>
      </div>
    );
  }

  function TwoVTwoTemplateControls() {
    const key = twoVTwoSelectedElement;
    const element = twoVTwoTemplateJson[key];
    const textElement = key.startsWith("username") || key === "date";
    const labels: Record<TwoVTwoPosterElementKey, string> = { avatar1: "Avatar 1", avatar2: "Avatar 2", avatar3: "Avatar 3", avatar4: "Avatar 4", username1: "Username 1", username2: "Username 2", username3: "Username 3", username4: "Username 4", date: "Date / Time" };
    const numberInput = (label: string, field: "x" | "y" | "width" | "height") => <label><p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">{label}</p><input type="number" value={element[field]} onChange={(event) => updateTwoVTwoElement(key, { [field]: Number(event.target.value) })} className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300"/></label>;
    const styleInput = (label: string, field: "strokeWidth" | "letterSpacing" | "shadowX" | "shadowY" | "shadowBlur") => <label><p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">{label}</p><input type="number" value={element[field] ?? 0} onChange={(event) => updateTwoVTwoElement(key, { [field]: Number(event.target.value) })} className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg"/></label>;
    return <div className="bg-black/35 border border-cyan-300/25 rounded-xl p-5 space-y-5" onKeyDown={(event) => event.stopPropagation()}>
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between"><div><h2 className="text-cyan-300 text-2xl font-black uppercase tracking-[0.18em]">2v2 Poster Template</h2><p className="text-white/45 text-sm mt-2">Edit the four avatar and four name sections, then set this 2v2 layout as its own default.</p></div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { setTemplateEditorMode("single"); setTwoVTwoEditMode(false); }} className="bg-yellow-300 hover:bg-yellow-200 text-black font-black px-4 py-3 rounded-lg uppercase tracking-widest transition">Single Layout</button><button type="button" onClick={() => setEditMode(false)} className="bg-black/40 text-white border border-white/20 font-black px-4 py-3 rounded-lg uppercase tracking-widest">Back</button></div></div>
      <div className="grid grid-cols-1 2xl:grid-cols-[300px_minmax(420px,1fr)_360px] gap-5 items-start"><aside className="space-y-4"><div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-4"><p className="text-cyan-300 font-black uppercase tracking-widest text-sm">2v2 Template Selector</p><select value={selectedTemplateId} onChange={(event) => handleTemplateSelect(event.target.value)} className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300">{templates.map((template) => <option key={template.id} value={template.id}>{template.name}{template.id === twoVTwoDefaultTemplateId ? " (2v2 Default)" : ""}</option>)}</select><button type="button" onClick={setCurrentTemplateAsDefault} className="w-full rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-cyan-200 hover:bg-cyan-300/20">Set 2v2 Default</button></div><div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-3"><p className="text-white/55 text-xs font-black uppercase tracking-widest">Select Element</p><div className="grid grid-cols-2 2xl:grid-cols-1 gap-2">{(Object.keys(labels) as TwoVTwoPosterElementKey[]).map((item) => <button key={item} type="button" onClick={() => setTwoVTwoSelectedElement(item)} className={`text-left px-3 py-2 rounded-lg font-black uppercase tracking-widest text-xs transition ${key === item ? "bg-cyan-300 text-black" : "bg-black/40 text-white border border-white/15 hover:border-cyan-300"}`}>{labels[item]}</button>)}</div></div></aside><main className="min-w-0 bg-black/30 border border-white/10 rounded-lg p-4"><div className="text-xs text-yellow-200 font-black mb-3 uppercase tracking-widest">Live 2v2 Template Preview</div><TwoVTwoPosterPreview scale={0.42}/></main><aside className="space-y-4"><div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-4"><p className="text-cyan-300 text-xs font-black uppercase tracking-widest">{labels[key]} Position</p><div className="grid grid-cols-2 gap-3">{numberInput("X", "x")}{numberInput("Y", "y")}{numberInput("Width", "width")}{numberInput("Height", "height")}</div></div>{textElement && <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-4"><p className="text-cyan-300 text-xs font-black uppercase tracking-widest">Text Styling</p><label className="block"><p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Font</p><select value={element.fontFamily || "Luckiest Guy"} onChange={(event) => updateTwoVTwoElement(key, { fontFamily: event.target.value })} className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg outline-none focus:border-cyan-300">{FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label><p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Font Size</p><input type="number" value={element.fontSize || 44} onChange={(event) => updateTwoVTwoElement(key, { fontSize: Number(event.target.value) })} className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg"/></label><label><p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Weight</p><select value={element.fontWeight || 900} onChange={(event) => updateTwoVTwoElement(key, { fontWeight: Number(event.target.value) })} className="w-full bg-black/45 border border-white/15 text-white p-3 rounded-lg"><option value={400}>Regular</option><option value={600}>Semi Bold</option><option value={700}>Bold</option><option value={800}>Extra Bold</option><option value={900}>Black</option></select></label><label><p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Font Colour</p><input type="color" value={element.color || "#5CEEFF"} onChange={(event) => updateTwoVTwoElement(key, { color: event.target.value })} className="w-full h-[46px] bg-black/45 border border-white/15 p-1 rounded-lg"/></label><label><p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Outline Colour</p><input type="color" value={element.strokeColor || "#000000"} onChange={(event) => updateTwoVTwoElement(key, { strokeColor: event.target.value })} className="w-full h-[46px] bg-black/45 border border-white/15 p-1 rounded-lg"/></label>{styleInput("Outline PX", "strokeWidth")}{styleInput("Letter Space", "letterSpacing")}<label><p className="text-white/55 text-xs font-black uppercase tracking-widest mb-2">Shadow Colour</p><input type="color" value={element.shadowColor || "#000000"} onChange={(event) => updateTwoVTwoElement(key, { shadowColor: event.target.value })} className="w-full h-[46px] bg-black/45 border border-white/15 p-1 rounded-lg"/></label>{styleInput("Shadow X", "shadowX")}{styleInput("Shadow Y", "shadowY")}{styleInput("Shadow Blur", "shadowBlur")}</div><label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/75"><input type="checkbox" checked={element.uppercase !== false} onChange={(event) => updateTwoVTwoElement(key, { uppercase: event.target.checked })} className="h-5 w-5 accent-yellow-300"/>Uppercase</label></div>}</aside></div></div>;
  }

  function TemplateControls() {
    const editorElementKeys: PosterElementKey[] = templateEditorMode === "2v2"
      ? ["avatar1", "avatar2", "avatar3", "avatar4", "username1", "username2", "username3", "username4", "date"]
      : ["avatar1", "avatar2", "username1", "username2", "date"];
    const element = templateJson[selectedElement];
    const isTextElement = TEXT_ELEMENT_KEYS.includes(selectedElement);
    const backgroundUrl = templateJson.backgroundUrl ?? "";
    const backgroundInputId = `background-upload-${stableId}`;

    return (
      <div
        className="bg-black/35 border border-cyan-300/25 rounded-xl p-5 space-y-5"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div>
            <h2 className="text-cyan-300 text-2xl font-black uppercase tracking-[0.18em]">
              Poster Template
            </h2>
            <p className="text-white/45 text-sm mt-2">
              Edit the active template, save it, then return to the generator.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 2xl:grid-cols-9 gap-2">
            <button
              type="button"
              onClick={() => {
                if (templateEditorMode === "2v2") {
                  setTwoVTwoTemplateJson(normalize2v2TemplateJson(templateJson));
                  setTwoVTwoEditMode(false);
                  setTemplateEditorMode("single");
                }
                setEditMode(false);
              }}
              className="bg-yellow-300 hover:bg-yellow-200 text-black font-black px-4 py-3 rounded-lg uppercase tracking-widest transition"
            >
              Back
            </button>

            <button
              type="button"
              onClick={() => {
                setTemplateEditorMode("2v2");
                updateWholeTemplateJson(twoVTwoTemplateJson as PosterTemplateJson);
                setTwoVTwoEditMode(true);
              }}
              className="bg-cyan-300 hover:bg-cyan-200 text-black font-black px-4 py-3 rounded-lg uppercase tracking-widest transition"
            >
              2v2 Layout
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
              Undo
            </button>

            <button
              type="button"
              onClick={redoLastTemplateChange}
              disabled={redoStack.length === 0}
              className="bg-purple-300 hover:bg-purple-200 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black px-4 py-3 rounded-lg uppercase tracking-widest transition"
            >
              Redo
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
              className="bg-cyan-300 hover:bg-cyan-200 text-black font-black px-4 py-3 rounded-lg uppercase tracking-widest transition"
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

        <div className="grid grid-cols-1 2xl:grid-cols-[300px_minmax(420px,1fr)_360px] gap-5 items-start">
          <aside className="space-y-4">
            <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-4">
              {TemplateSelectorPanel({ compact: true })}

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

            <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-3">
              <p className="text-white/55 text-xs font-black uppercase tracking-widest">
                Background
              </p>

              <div className="aspect-[9/16] max-h-[260px] rounded-lg overflow-hidden border border-white/15 bg-black mx-auto">
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
                Press Save after upload to attach it to this template.
              </p>
            </div>

            <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-3">
              <p className="text-white/55 text-xs font-black uppercase tracking-widest">
                Select Element
              </p>
              <div className="grid grid-cols-2 2xl:grid-cols-1 gap-2">
                {editorElementKeys.map((key) => (
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
          </aside>

          <main className="min-w-0 bg-black/30 border border-white/10 rounded-lg p-4">
            <div className="text-xs text-yellow-200 font-black mb-3 uppercase tracking-widest">
              Live Template Preview
            </div>
            {templateEditorMode === "2v2" ? <TwoVTwoPosterPreview scale={0.42}/> : PosterPreview({ battle: blankPreviewBattle, scale: 0.42 })}
          </main>

          <aside className="space-y-4">
            <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-4">
              <p className="text-cyan-300 text-xs font-black uppercase tracking-widest">
                {ELEMENT_LABELS[selectedElement]} Position
              </p>

              <div className="grid grid-cols-2 gap-3">
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
            </div>

            {isTextElement && (
              <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-4">
                <p className="text-cyan-300 text-xs font-black uppercase tracking-widest">
                  Text Styling
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <label className="col-span-2">
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

                  <label className="col-span-2 flex items-center gap-2 pt-2">
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

            <div className="bg-black/30 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-yellow-300 text-xs font-black">
                {templateStatus}
              </p>
              <p className="text-white/45 text-xs">
                Click an item, drag it, resize from the corners, or use arrow keys. Hold Shift for 10px movement.
              </p>
            </div>
          </aside>
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

  async function loadRaceToGloryLeaderboard() {
    setRaceToGloryLoading(true);
    setRaceToGloryStatus("Loading the Race to Glory leaderboard...");

    try {
      const response = await fetch("/api/events/first-class/stats", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the leaderboard.");

      const scores = data.scores || {};
      const topTwenty = Array.from({ length: 20 }, (_, index) => {
        const teamNumber = index + 1;
        const captain = FIRST_CLASS_CAPTAINS[teamNumber] || `Team ${teamNumber}`;
        const viceCaptain = FIRST_CLASS_VICE_CAPTAINS[teamNumber] || "";
        const diamonds = FIRST_CLASS_CREATORS
          .filter((creator) => creator.teamNumber === teamNumber)
          .reduce((total, creator) => total + Number(scores[creator.username.toLowerCase()] || 0), 0);

        return {
          teamName: viceCaptain ? `Team ${captain} & ${viceCaptain}` : `Team ${captain}`,
          diamonds,
        };
      }).sort((a, b) => b.diamonds - a.diamonds || a.teamName.localeCompare(b.teamName));

      setRaceToGloryRows(
        Array.from({ length: 20 }, (_, index) => {
          const creator = topTwenty[index];
          return creator
            ? { teamName: creator.teamName, diamonds: creator.diamonds.toLocaleString("en-GB") }
            : { teamName: "", diamonds: "" };
        })
      );
      setRaceToGloryStatus("Loaded the live Race to Glory top 20.");
    } catch (error) {
      setRaceToGloryStatus(error instanceof Error ? error.message : "Could not load the leaderboard.");
    } finally {
      setRaceToGloryLoading(false);
    }
  }

  function updateRaceToGloryRow(index: number, field: keyof RaceToGloryRow, value: string) {
    setRaceToGloryRows((current) =>
      current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row)
    );
  }

  async function downloadRaceToGloryPoster() {
    const node = raceToGloryPosterRef.current;
    if (!node) return;
    const originalTransform = node.style.transform;

    try {
      // The editor preview is scaled down for the page; exports must use the full canvas.
      node.style.transform = "none";
      const blob = await htmlToImage.toBlob(node, {
        cacheBust: true,
        pixelRatio: 1,
        width: TEAM_POSTER_WIDTH,
        height: TEAM_POSTER_HEIGHT,
        backgroundColor: "#07111f",
      });
      if (blob) saveAs(blob, "race-to-glory-top-20.png");
    } finally {
      node.style.transform = originalTransform;
    }
  }

  function RaceToGloryBuilder() {
    const isSplitLayout = raceToGloryLayout === "split";
    const posterColumns = isSplitLayout
      ? [raceToGloryRows.slice(0, 10), raceToGloryRows.slice(10, 20)]
      : [raceToGloryRows];
    const getTeamLeaders = (teamName: string) => {
      const match = teamName.match(/^team\s+(.+?)\s*&\s*(.+)$/i);
      return match ? { captain: match[1], viceCaptain: match[2] } : { captain: teamName, viceCaptain: "" };
    };
    const getRowTone = (rank: number) => {
      if (rank === 1) return { card: "border-amber-300 bg-black shadow-[0_0_18px_rgba(252,211,77,.45)]", rank: "text-amber-200" };
      if (rank === 2) return { card: "border-slate-200 bg-black shadow-[0_0_18px_rgba(226,232,240,.32)]", rank: "text-slate-100" };
      if (rank === 3) return { card: "border-orange-400 bg-black shadow-[0_0_18px_rgba(251,146,60,.34)]", rank: "text-orange-200" };
      return { card: "border-yellow-300/70 bg-black shadow-[0_0_16px_rgba(250,204,21,.12)]", rank: "text-yellow-300" };
    };

    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        <section className="space-y-5 rounded-xl border border-sky-300/25 bg-black/35 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-200">Crew Showdown</p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-widest text-white">Crew Showdown Top 20</h2>
            <p className="mt-2 text-sm text-white/45">Twenty tournament teams and their diamond totals. Choose a full 20-row board or a 10 + 10 split.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => void loadRaceToGloryLeaderboard()} disabled={raceToGloryLoading} className="rounded-lg bg-sky-300 px-3 py-4 text-xs font-black uppercase tracking-widest text-slate-950 hover:bg-sky-200 disabled:opacity-50">
              {raceToGloryLoading ? "Loading..." : "Load Leaderboard"}
            </button>
            <button type="button" onClick={() => void downloadRaceToGloryPoster()} className="rounded-lg bg-green-400 px-3 py-4 text-xs font-black uppercase tracking-widest text-black hover:bg-green-300">
              Download PNG
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-black/30 p-2">
            <button type="button" onClick={() => setRaceToGloryLayout("single")} className={`rounded-md px-3 py-3 text-xs font-black uppercase tracking-wider ${!isSplitLayout ? "bg-yellow-300 text-black" : "text-white/60 hover:bg-white/10"}`}>
              20 Rows
            </button>
            <button type="button" onClick={() => setRaceToGloryLayout("split")} className={`rounded-md px-3 py-3 text-xs font-black uppercase tracking-wider ${isSplitLayout ? "bg-yellow-300 text-black" : "text-white/60 hover:bg-white/10"}`}>
              10 + 10 Split
            </button>
          </div>

          <p className="rounded-lg border border-sky-300/15 bg-sky-300/10 p-3 text-xs font-bold text-sky-100">{raceToGloryStatus}</p>

          <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
            {raceToGloryRows.map((row, index) => (
              <div key={index} className="grid grid-cols-[34px_minmax(0,1fr)_120px] gap-2">
                <span className="grid place-items-center text-sm font-black text-sky-200">{index + 1}</span>
                <input value={row.teamName} onChange={(event) => updateRaceToGloryRow(index, "teamName", event.target.value)} placeholder="Team name" className="min-w-0 rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm font-bold text-white outline-none focus:border-sky-300" />
                <input value={row.diamonds} onChange={(event) => updateRaceToGloryRow(index, "diamonds", event.target.value)} placeholder="Diamonds" className="min-w-0 rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm font-bold text-white outline-none focus:border-sky-300" />
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-auto rounded-xl border border-sky-300/20 bg-black/35 p-5">
          <div className="mx-auto overflow-hidden rounded-2xl border border-sky-200/20 shadow-2xl" style={{ width: TEAM_POSTER_WIDTH * 0.42, height: TEAM_POSTER_HEIGHT * 0.42 }}>
            <div ref={raceToGloryPosterRef} className="relative overflow-hidden bg-[#030609] px-10 pb-20 pt-8" style={{ width: TEAM_POSTER_WIDTH, height: TEAM_POSTER_HEIGHT, transform: "scale(0.42)", transformOrigin: "top left", backgroundImage: "linear-gradient(rgba(2,6,12,.38), rgba(2,6,12,.54)), url(/first-class/crew-showdown-background.png)", backgroundSize: "cover", backgroundPosition: "center" }}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,.20),transparent_36%)]" />
              <div className="relative">
                <img src="/first-class/crew-showdown-logo.png" alt="Crew Showdown" className="mx-auto w-full object-contain" style={{ height: 170 }} />
                <p className="mt-1 text-center text-xl font-black uppercase tracking-[0.35em] text-sky-100">Leaderboard Update</p>
                <div className={`mx-auto mt-8 grid w-[90%] gap-6 ${isSplitLayout ? "grid-cols-2" : "grid-cols-1"}`}>
                  {posterColumns.map((column, columnIndex) => (
                    <div key={columnIndex} className="space-y-3">
                      {column.map((row, rowIndex) => {
                        const rank = isSplitLayout ? columnIndex * 10 + rowIndex + 1 : rowIndex + 1;
                        const leaders = getTeamLeaders(row.teamName);
                        const tone = getRowTone(rank);
                        return (
                          <div key={rank} className={`grid h-[51px] grid-cols-[52px_minmax(0,1fr)_230px] items-center overflow-hidden rounded-lg border ${tone.card}`}>
                            <span className={`border-r border-current/40 text-center text-2xl font-black italic ${tone.rank}`}>{rank}</span>
                            <span className="flex min-w-0 items-center gap-2 overflow-hidden px-4 text-lg font-black uppercase leading-tight"><span className="shrink-0 text-white">Team</span><span className="truncate text-white">{leaders.captain || "Captain"}</span>{leaders.viceCaptain && <><span className="shrink-0 text-white/55">/</span><span className="truncate text-sky-200">{leaders.viceCaptain}</span></>}</span>
                            <span className="border-l border-yellow-300/60 px-5 text-left text-xl font-black text-yellow-300">{row.diamonds || "0"}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <p className="mt-8 text-center text-sm font-black uppercase tracking-[0.42em] text-sky-100/80">One tournament. Every diamond counts.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function ManagerLeaderboardBuilder() {
    const rows = managerLeaderboardRows;
    const managerLeaderboardCanvasHeight = Math.max(
      MANAGER_LEADERBOARD_HEIGHT,
      145 + rows.length * 88 + 80
    );
    const selectedElement = managerLeaderboardTemplate.elements.find((element) => element.id === selectedManagerLeaderboardElementId);
    const valueForElement = (element: TeamPosterElement) => {
      const match = element.id.match(/-(\d+)$/);
      const row = match ? rows[Number(match[1]) - 1] : null;
      if (!row) return element.value;
      return element.id.startsWith("manager-diamonds-") ? row.diamonds.toLocaleString() : row.manager.toUpperCase();
    };

    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="space-y-5 rounded-xl border border-yellow-300/25 bg-black/35 p-5">
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-yellow-300">Management Leaderboard</h2>
            <p className="mt-2 text-sm text-white/45">
              Text-only overlay for your own background. Drag the manager names and diamond fields into place. Group membership always comes from Manager Assignments.
            </p>
          </div>

          <label className="block">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-white/55">Manager Assignments Group</p>
            <select
              value={selectedManagerLeaderboardGroup}
              onChange={(event) => setSelectedManagerLeaderboardGroup(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/45 p-3 text-white outline-none focus:border-yellow-300"
            >
              <option value="All Groups">All Groups</option>
              {MANAGER_LEADERBOARD_GROUPS.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-white/55">Your Background</p>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleManagerLeaderboardBackgroundUpload} className="block w-full text-xs text-white/65 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:font-bold file:text-white" />
          </label>

          <button
            type="button"
            onClick={() => void loadManagerLeaderboard()}
            disabled={managerLeaderboardLoading}
            className="w-full rounded-lg bg-yellow-300 px-4 py-4 text-sm font-black uppercase tracking-widest text-black transition hover:bg-yellow-200 disabled:opacity-50"
          >
            {managerLeaderboardLoading ? "Loading Assignments..." : "Load Manager Assignments Leaderboard"}
          </button>

          <button
            type="button"
            onClick={() => void downloadManagerLeaderboard()}
            className="w-full rounded-lg bg-green-400 px-4 py-4 text-sm font-black uppercase tracking-widest text-black transition hover:bg-green-300 disabled:opacity-50"
          >
            Download Leaderboard PNG
          </button>

          <button
            type="button"
            onClick={() => void saveManagerLeaderboardTemplate()}
            className="w-full rounded-lg bg-sky-300 px-4 py-4 text-sm font-black uppercase tracking-widest text-slate-950 transition hover:bg-sky-200"
          >
            Save Publicly
          </button>

          <button type="button" onClick={() => setManagerLeaderboardEditMode((value) => !value)} className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/10">
            {managerLeaderboardEditMode ? "Hide edit outlines" : "Show edit outlines"}
          </button>

          {selectedElement && (
            <div className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-3">
              <p className="text-xs font-black uppercase tracking-widest text-yellow-200">Editing {selectedElement.id.replaceAll("-", " ")}</p>
              <label className="block text-xs text-white/55">Font size
                <input type="number" min="12" max="100" value={selectedElement.fontSize || 36} onChange={(event) => updateManagerLeaderboardElement(selectedElement.id, { fontSize: Number(event.target.value) || 36 })} className="mt-1 w-full rounded bg-white/10 p-2 text-white" />
              </label>
              <label className="block text-xs text-white/55">Text colour
                <input type="color" value={selectedElement.color || "#ffffff"} onChange={(event) => updateManagerLeaderboardElement(selectedElement.id, { color: event.target.value })} className="mt-1 h-9 w-full rounded bg-white/10 p-1" />
              </label>
            </div>
          )}

          <p className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs leading-relaxed text-white/55">
            {managerLeaderboardStatus}
          </p>
        </section>

        <section className="overflow-x-auto rounded-xl border border-yellow-300/20 bg-black/35 p-4">
          <div
            ref={managerLeaderboardPosterRef}
            className="relative mx-auto overflow-hidden bg-transparent"
            style={{ width: MANAGER_LEADERBOARD_WIDTH, height: managerLeaderboardCanvasHeight, backgroundImage: managerLeaderboardTemplate.backgroundUrl ? `url(${managerLeaderboardTemplate.backgroundUrl})` : undefined, backgroundSize: "100% 100%", backgroundPosition: "center" }}
          >
            <div className="hidden absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 50% 0%, #b45309 0%, transparent 42%), linear-gradient(145deg, #020617 0%, #111827 52%, #09090b 100%)" }} />
            <div className="relative hidden">
              <p className="text-center text-lg font-black uppercase tracking-[0.45em] text-yellow-200">Creator Intelligence</p>
              <h3 className="mt-5 text-center text-6xl font-black uppercase tracking-tight text-white">Manager Leaderboard</h3>
              <p className="mt-4 text-center text-2xl font-black uppercase tracking-[0.2em] text-yellow-300">
                {selectedManagerLeaderboardGroup === "All Groups" ? "All Groups" : selectedManagerLeaderboardGroup}
              </p>
              <p className="mt-2 text-center text-base font-bold uppercase tracking-[0.16em] text-white/50">Current Calendar Month · Top 10 Managers</p>

              <div className="mt-12 space-y-4">
                {rows.map((row, index) => {
                  const rank = index + 1;
                  const podium = rank === 1 ? "border-yellow-300 bg-yellow-300/15" : rank === 2 ? "border-slate-300 bg-slate-300/10" : rank === 3 ? "border-orange-400 bg-orange-400/10" : "border-white/15 bg-black/35";
                  return (
                    <div key={rank} className={`grid h-[116px] grid-cols-[92px_minmax(0,1fr)_250px] items-center overflow-hidden rounded-2xl border-2 ${podium}`}>
                      <div className="flex h-full items-center justify-center border-r border-white/15 text-4xl font-black italic text-yellow-300">{rank}</div>
                      <div className="min-w-0 px-7">
                        <p className="truncate text-3xl font-black uppercase text-white">{row?.manager || "Manager"}</p>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-white/45">Team total</p>
                      </div>
                      <div className="border-l border-white/15 px-6 text-right">
                        <p className="text-3xl font-black text-yellow-300">{row ? row.diamonds.toLocaleString() : "—"}</p>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.15em] text-yellow-100/60">Diamonds</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {managerLeaderboardTemplate.elements
              .filter((element) => {
                const rank = Number(element.id.match(/-(\d+)$/)?.[1] || 0);
                return rank > 0 && rank <= managerLeaderboardRows.length;
              })
              .map((element) => (
              <Rnd
                key={element.id}
                bounds="parent"
                size={{ width: element.width, height: element.height }}
                position={{ x: element.x, y: element.y }}
                onDragStop={(_, data) => updateManagerLeaderboardElement(element.id, { x: data.x, y: data.y })}
                onResizeStop={(_, __, ref, ___, position) => updateManagerLeaderboardElement(element.id, { width: Number(ref.style.width.replace("px", "")), height: Number(ref.style.height.replace("px", "")), x: position.x, y: position.y })}
                onClick={() => setSelectedManagerLeaderboardElementId(element.id)}
                className={managerLeaderboardEditMode ? `cursor-move rounded border-2 ${selectedManagerLeaderboardElementId === element.id ? "border-yellow-300" : "border-white/35"}` : ""}
              >
                <div className="flex h-full w-full items-center whitespace-nowrap px-2" style={{ fontFamily: element.fontFamily || "Anton", fontSize: element.fontSize || 36, color: element.color || "#fff", fontWeight: element.fontWeight || 900, lineHeight: 1, textShadow: "0 2px 4px rgba(0,0,0,.75)" }}>
                  {valueForElement(element)}
                </div>
              </Rnd>
            ))}
          </div>
        </section>
      </div>
    );
  }

  function TeamPosterCanvas({ scale = 0.42 }: { scale?: number }) {
    return (
      <div
        className="mx-auto overflow-hidden rounded-xl border border-yellow-300/20 bg-black shadow-2xl shadow-yellow-950/30"
        style={{ width: TEAM_POSTER_WIDTH * scale, height: TEAM_POSTER_HEIGHT * scale }}
      >
        <div
          ref={teamPosterRef}
          className="relative overflow-hidden bg-black"
          style={{
            width: TEAM_POSTER_WIDTH,
            height: TEAM_POSTER_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            backgroundImage: teamPosterTemplate.backgroundUrl
              ? `url(${teamPosterTemplate.backgroundUrl})`
              : "linear-gradient(180deg, #090909 0%, #241d05 55%, #050505 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {teamPosterTemplate.elements.map((element) => {
            const selected = element.id === selectedTeamPosterElementId;

            return (
              <Rnd
                key={element.id}
                bounds="parent"
                scale={scale}
                size={{ width: element.width, height: element.kind === "avatar" ? element.width : element.height }}
                position={{ x: element.x, y: element.y }}
                lockAspectRatio={element.kind === "avatar" ? 1 : false}
                onDragStop={(_, data) =>
                  updateTeamPosterElement(element.id, {
                    x: Math.round(data.x),
                    y: Math.round(data.y),
                  })
                }
                onResizeStop={(_, __, ref, ___, position) => {
                  const width = Math.round(ref.offsetWidth);
                  updateTeamPosterElement(element.id, {
                    x: Math.round(position.x),
                    y: Math.round(position.y),
                    width,
                    height: element.kind === "avatar" ? width : Math.round(ref.offsetHeight),
                  });
                }}
                onMouseDown={() => setSelectedTeamPosterElementId(element.id)}
              >
                {element.kind === "avatar" ? (
                  <div
                    className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full border-4 bg-black/45 ${
                      selected ? "border-yellow-300" : "border-yellow-200/60"
                    }`}
                  >
                    {element.imageUrl ? (
                      <img src={element.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl font-black text-yellow-100/70">+</span>
                    )}
                  </div>
                ) : (
                  <div
                    className={`flex h-full w-full items-center justify-center rounded-lg border-2 bg-black/35 px-2 text-center ${
                      selected ? "border-yellow-300" : "border-yellow-200/35"
                    }`}
                    style={{
                      color: element.color || "#FACC15",
                      fontFamily: element.fontFamily || "Luckiest Guy",
                      fontSize: element.fontSize || 37,
                      fontWeight: element.fontWeight || 900,
                      textShadow: "3px 3px 0 #000",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {element.value || ""}
                  </div>
                )}
              </Rnd>
            );
          })}
        </div>
      </div>
    );
  }

  function TeamPosterBuilder() {
    const selectedElement = teamPosterTemplate.elements.find(
      (element) => element.id === selectedTeamPosterElementId
    );
    const backgroundInputId = `team-dan-background-${stableId}`;
    const avatarInputId = `team-dan-avatar-${stableId}`;

    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="space-y-5">
          <div className="space-y-4 rounded-xl border border-yellow-300/25 bg-black/35 p-5">
            <div>
              <h2 className="text-xl font-black uppercase tracking-widest text-yellow-300">
                Team Poster Builder
              </h2>
              <p className="mt-2 text-sm text-white/45">
                Select a saved layout, edit it, then save changes to that layout.
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-white/55">Select Layout</p>
              <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                {(teamPosterTemplates.length ? teamPosterTemplates : [{ name: teamPosterTemplateName, template: teamPosterTemplate }]).map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      setTeamPosterTemplateName(item.name);
                      setTeamPosterTemplate(item.template);
                      setSelectedTeamPosterElementId(item.template.elements[0]?.id || "");
                      setTeamPosterStatus(`${item.name.replace(/^team-poster-/, "").replace(/-/g, " ")} selected.`);
                    }}
                    className={`w-full rounded-lg border px-3 py-3 text-left text-xs font-black uppercase tracking-wider transition ${teamPosterTemplateName === item.name ? "border-yellow-300 bg-yellow-300/15 text-yellow-100" : "border-white/15 bg-black/30 text-white hover:border-yellow-300/50"}`}
                  >
                    {item.name === TEAM_DAN_POSTER_TEMPLATE_NAME ? "Team Dan + James (Original)" : item.name.replace(/^team-poster-/, "").replace(/-/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-white/20 bg-white/[0.03] p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-white/55">Create New Layout</p>
              <label className="mb-2 block">
                <span className="sr-only">Start new layout from</span>
                <select value={newTeamPosterSourceName} onChange={(event) => setNewTeamPosterSourceName(event.target.value)} className="w-full rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-white outline-none focus:border-yellow-300">
                  <option value="blank">Start fresh</option>
                  <option value="current">Duplicate the current layout</option>
                  {teamPosterTemplates.map((item) => <option key={item.name} value={item.name}>Duplicate {item.name === TEAM_DAN_POSTER_TEMPLATE_NAME ? "Team Dan + James" : item.name.replace(/^team-poster-/, "").replace(/-/g, " ")}</option>)}
                </select>
              </label>
              <div className="flex gap-2">
                <input
                  value={newTeamPosterTemplateName}
                  onChange={(event) => setNewTeamPosterTemplateName(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); createTeamPosterLayout(); } }}
                  placeholder="e.g. Team Ellie"
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-white outline-none focus:border-yellow-300"
                />
                <button type="button" onClick={createTeamPosterLayout} className="rounded-lg bg-yellow-300 px-3 py-2 text-xs font-black uppercase tracking-widest text-black hover:bg-yellow-200">Create</button>
              </div>
            </div>

            <label className="block">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-white/55">Team Data Source / Manager</p>
              <select
                value={teamPosterTemplate.managerKey || "team-dan"}
                onChange={(event) => setTeamPosterTemplate((current) => ({ ...current, managerKey: event.target.value }))}
                className="w-full rounded-lg border border-white/15 bg-black/45 p-3 text-white outline-none focus:border-yellow-300"
              >
                {teamPosterManagerOptions.map((manager) => <option key={manager.value} value={manager.value}>{manager.label}</option>)}
              </select>
              <p className="mt-2 text-xs text-white/45">Saved with this layout. Select any Creator Intelligence manager, then press Save Template.</p>
            </label>

            <label className="block">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-white/55">Team Side</p>
              <select
                value={teamPosterTemplate.teamSide || "dan"}
                onChange={(event) => setTeamPosterTemplate((current) => ({ ...current, teamSide: event.target.value as TeamPosterCategory }))}
                className="w-full rounded-lg border border-white/15 bg-black/45 p-3 text-white outline-none focus:border-yellow-300"
              >
                <option value="dan">Team Dan + James</option>
                <option value="mike-indi">Team Mike + Indi</option>
                <option value="sub-agencies">Whole Agencies</option>
                <option value="paradise">Paradise</option>
                <option value="horizon">Horizon</option>
                <option value="trident">Trident</option>
                <option value="respawn">Respawn</option>
              </select>
              <p className="mt-2 text-xs text-white/45">Saved with this layout. Team Diamonds Yesterday groups downloads by this category.</p>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={buildTeamPosterFromData} className="rounded-lg bg-sky-300 px-3 py-4 text-xs font-black uppercase tracking-widest text-black hover:bg-sky-200">
                Build Data Preview
              </button>
              <label
                htmlFor={backgroundInputId}
                className="cursor-pointer rounded-lg border border-white/20 bg-black/40 px-3 py-4 text-center text-xs font-black uppercase tracking-widest text-white transition hover:border-yellow-300"
              >
                Background
              </label>
              <button type="button" onClick={saveTeamPosterTemplate} className="rounded-lg bg-yellow-300 px-3 py-4 text-xs font-black uppercase tracking-widest text-black hover:bg-yellow-200">
                Save Template
              </button>
              <button type="button" onClick={() => void renameTeamPosterTemplate()} disabled={teamPosterTemplateName === TEAM_DAN_POSTER_TEMPLATE_NAME} className="rounded-lg border border-yellow-300/35 bg-yellow-300/10 px-3 py-4 text-xs font-black uppercase tracking-widest text-yellow-100 disabled:cursor-not-allowed disabled:opacity-40">Rename Template</button>
              <button type="button" onClick={() => void deleteTeamPosterTemplate()} disabled={teamPosterTemplateName === TEAM_DAN_POSTER_TEMPLATE_NAME} className="rounded-lg bg-red-500 px-3 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40">
                Delete Template
              </button>
              <button type="button" onClick={downloadTeamPosterTemplatePreview} className="rounded-lg bg-green-400 px-3 py-4 text-xs font-black uppercase tracking-widest text-black hover:bg-green-300">
                Download PNG
              </button>
              <button type="button" onClick={resetTeamPosterTemplate} className="rounded-lg border border-white/20 bg-white/10 px-3 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/20">
                Reset
              </button>
            </div>

            <input id={backgroundInputId} type="file" accept="image/*" className="hidden" onChange={handleTeamPosterBackgroundUpload} />

            <label className="block">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-white/55">Text Font</p>
              <select
                value={teamPosterTemplate.elements.find((element) => element.kind !== "avatar")?.fontFamily || "Luckiest Guy"}
                onChange={(event) => updateAllTeamPosterTextFonts(event.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black/45 p-3 text-white outline-none focus:border-yellow-300"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </label>

            <p className="text-xs text-white/45">{teamPosterStatus}</p>
          </div>

          <div className="space-y-4 rounded-xl border border-white/15 bg-black/35 p-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-yellow-300">
              Selected Item
            </h3>

            {selectedElement ? (
              <>
                <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <p className="text-xs font-black uppercase tracking-widest text-white/45">Item</p>
                  <p className="mt-1 font-black uppercase text-white">{selectedElement.kind}</p>
                </div>

                {selectedElement.kind === "avatar" ? (
                  <>
                    <label htmlFor={avatarInputId} className="block cursor-pointer rounded-lg bg-yellow-300 px-4 py-4 text-center text-xs font-black uppercase tracking-widest text-black hover:bg-yellow-200">
                      Upload Avatar
                    </label>
                    <input id={avatarInputId} type="file" accept="image/*" className="hidden" onChange={handleTeamPosterAvatarUpload} />
                  </>
                ) : (
                  <>
                    <TextInput
                      label={selectedElement.kind === "username" ? "Username" : selectedElement.kind === "diamonds" ? "Diamonds" : selectedElement.kind === "hours" ? "Hours" : "Text"}
                      value={selectedElement.value}
                      onChange={(value) => updateTeamPosterElement(selectedElement.id, { value })}
                    />
                    <label className="block">
                      <p className="mb-2 text-xs font-black uppercase tracking-widest text-white/55">Font</p>
                      <select
                        value={selectedElement.fontFamily || "Luckiest Guy"}
                        onChange={(event) => updateTeamPosterElement(selectedElement.id, { fontFamily: event.target.value })}
                        className="w-full rounded-lg border border-white/15 bg-black/45 p-3 text-white outline-none focus:border-yellow-300"
                      >
                        {FONT_OPTIONS.map((font) => (
                          <option key={font} value={font}>{font}</option>
                        ))}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <TextInput
                        label="Font Size"
                        value={String(selectedElement.fontSize || 37)}
                        onChange={(value) => updateTeamPosterElement(selectedElement.id, { fontSize: Number(value) || 37 })}
                      />
                      <label className="block">
                        <p className="mb-2 text-xs font-black uppercase tracking-widest text-white/55">Colour</p>
                        <input
                          type="color"
                          value={selectedElement.color || "#FACC15"}
                          onChange={(event) => updateTeamPosterElement(selectedElement.id, { color: event.target.value })}
                          className="h-[46px] w-full rounded-lg border border-white/15 bg-black/45 p-1"
                        />
                      </label>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-white/45">Select an item on the poster.</p>
            )}
          </div>
        </section>

        <section>{TeamPosterCanvas({})}</section>
      </div>
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
        {editMode ? (
          TemplateControls()
        ) : (
          <>
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-yellow-300 text-3xl font-black tracking-[0.18em] uppercase">
              {isPostersWorkspace ? "Posters" : isCrewShowdownWorkspace ? "Crew Showdown Downloads" : BRAND.name}
            </h1>

            <p className="text-white/45 text-sm mt-2">
              {isPostersWorkspace ? "Create, save and maintain reusable team poster layouts." : isCrewShowdownWorkspace ? "Load the live top 20, choose a layout and download the Crew Showdown leaderboard." : "Create individual posters or build them in bulk."}
            </p>
          </div>

          <div className={`grid w-full max-w-2xl grid-cols-1 gap-3 ${(isPostersWorkspace || isCrewShowdownWorkspace) ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
            {isPostersWorkspace ? (
              <button type="button" className="bg-yellow-300 px-5 py-4 font-black uppercase tracking-widest text-black">
                Team Poster Builder
              </button>
            ) : isCrewShowdownWorkspace ? (
              <button type="button" className="bg-sky-300 px-5 py-4 font-black uppercase tracking-widest text-slate-950">
                Crew Showdown Top 20
              </button>
            ) : <>
            <button
              type="button"
              onClick={() => switchPosterMode("single")}
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
              onClick={() => switchPosterMode("mass")}
              className={`px-5 py-4 rounded-lg font-black uppercase tracking-widest transition ${
                activeMode === "mass"
                  ? "bg-yellow-300 text-black"
                  : "bg-black/40 text-white border border-white/20 hover:border-yellow-300"
              }`}
            >
              Mass Poster Generator
            </button>

            <button
              type="button"
              onClick={() => switchPosterMode("2v2")}
              className={`px-5 py-4 rounded-lg font-black uppercase tracking-widest transition ${
                activeMode === "2v2"
                  ? "bg-yellow-300 text-black"
                  : "bg-black/40 text-white border border-white/20 hover:border-yellow-300"
              }`}
            >
              2v2 Poster
            </button>

            </>}
          </div>
        </div>
        {activeMode === "single" && (
          <div className="grid grid-cols-1 xl:grid-cols-[460px_1fr] gap-8 items-start">
            <section className="space-y-6">
              <div className="bg-black/35 border border-yellow-300/20 rounded-xl p-5 space-y-4">
                <h2 className="text-yellow-300 font-black uppercase tracking-widest">
                  Single Poster
                </h2>


                {TemplateSelectorPanel({ compact: true })}

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

                <button
                  type="button"
                  onClick={swapSingleOpponents}
                  className="w-full rounded-lg border border-yellow-300/60 bg-yellow-300/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-yellow-100 transition hover:bg-yellow-300/20"
                >
                  Swap Opponents ↔
                </button>

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
        {activeMode === "2v2" && (
          <div className="grid grid-cols-1 xl:grid-cols-[460px_1fr] gap-8 items-start">
            <section className="space-y-6">
              <div className="bg-black/35 border border-yellow-300/20 rounded-xl p-5 space-y-4">
                <h2 className="text-yellow-300 font-black uppercase tracking-widest">2v2 Poster</h2>
                {TemplateSelectorPanel({ compact: true })}
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Home Username 1" value={twoVTwoBattle.home1} placeholder="HOME CREATOR 1" onChange={(value) => setTwoVTwoBattle((current) => ({ ...current, home1: formatName(value), image1: "" }))} onBlur={() => autoFillTwoVTwoAvatar("image1", twoVTwoBattle.home1)} />
                  <TextInput label="Home Username 2" value={twoVTwoBattle.home2} placeholder="HOME CREATOR 2" onChange={(value) => setTwoVTwoBattle((current) => ({ ...current, home2: formatName(value), image2: "" }))} onBlur={() => autoFillTwoVTwoAvatar("image2", twoVTwoBattle.home2)} />
                  <TextInput label="Opponent Username 1" value={twoVTwoBattle.away1} placeholder="OPPONENT 1" onChange={(value) => setTwoVTwoBattle((current) => ({ ...current, away1: formatName(value), image3: "" }))} onBlur={() => autoFillTwoVTwoAvatar("image3", twoVTwoBattle.away1)} />
                  <TextInput label="Opponent Username 2" value={twoVTwoBattle.away2} placeholder="OPPONENT 2" onChange={(value) => setTwoVTwoBattle((current) => ({ ...current, away2: formatName(value), image4: "" }))} onBlur={() => autoFillTwoVTwoAvatar("image4", twoVTwoBattle.away2)} />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button type="button" onClick={swapTwoVTwoOpponents} className="rounded-lg border border-cyan-300/70 bg-cyan-300/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-cyan-100 transition hover:bg-cyan-300/20">Swap 1 ↔ 2 on Both Sides</button>
                  <button type="button" onClick={swapTwoVTwoSides} className="rounded-lg border border-cyan-300/70 bg-cyan-300/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-cyan-100 transition hover:bg-cyan-300/20">Swap Home ↔ Opponent</button>
                </div>
                <DayMonthDateSelect day={twoVTwoDay} month={twoVTwoMonth} onDayChange={handleTwoVTwoDayChange} onMonthChange={handleTwoVTwoMonthChange} />
                <TimeSelect label="Time" value={twoVTwoBattle.time} onChange={(time) => setTwoVTwoBattle((current) => ({ ...current, time }))} />
                <div className="bg-black/30 border border-white/10 rounded-lg p-3"><p className="text-white/45 text-xs uppercase tracking-widest font-black">Selected Date</p><p className="text-yellow-300 font-black mt-1">{twoVTwoBattle.date || "NO DATE SELECTED"}</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <TwoVTwoPhotoBox field="image1" usernameField="home1" label="Home 1 Profile Picture" />
                  <TwoVTwoPhotoBox field="image2" usernameField="home2" label="Home 2 Profile Picture" />
                  <TwoVTwoPhotoBox field="image3" usernameField="away1" label="Opponent 1 Profile Picture" />
                  <TwoVTwoPhotoBox field="image4" usernameField="away2" label="Opponent 2 Profile Picture" />
                </div>
                <button type="button" onClick={downloadTwoVTwoPoster} className="w-full bg-yellow-400 hover:bg-yellow-300 transition text-black font-black px-4 py-5 rounded-lg cursor-pointer uppercase tracking-widest">Download 2v2 Poster</button>
                <button type="button" onClick={clearTwoVTwoPoster} className="w-full bg-white/10 hover:bg-white/20 transition text-white font-black px-4 py-4 rounded-lg cursor-pointer uppercase tracking-widest border border-white/20">Clear 2v2 Poster</button>
              </div>
              <div className="bg-black/35 border border-white/15 rounded-xl p-5 space-y-4">
                <h2 className="text-yellow-300 font-black uppercase tracking-widest">Paste 2v2 Poster Row</h2>
                <textarea value={twoVTwoPaste} onChange={(event) => setTwoVTwoPaste(event.target.value)} placeholder="Paste the 2V2 Copy Poster Row from Battle Network" className="w-full h-28 bg-black/40 border border-white/20 text-white p-4 rounded-lg text-sm outline-none focus:border-yellow-300" />
                <button type="button" onClick={readTwoVTwoPaste} className="w-full bg-yellow-300 hover:bg-yellow-200 transition text-black font-black px-4 py-4 rounded-lg uppercase tracking-widest">Read 2v2 Poster Row</button>
              </div>
              <div className="bg-black/35 border border-cyan-300/30 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-3"><h2 className="text-cyan-200 font-black uppercase tracking-widest">2v2 Template Layout</h2><button type="button" onClick={() => setTwoVTwoEditMode((value) => !value)} className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-black uppercase text-black">{twoVTwoEditMode ? "Done Moving" : "Move 2v2 Sections"}</button></div>
                <p className="text-xs text-white/55">Move and resize all four names and all four avatar circles in the live preview. Avatar circles stay perfectly round.</p>
                {twoVTwoEditMode && <div className="grid grid-cols-3 gap-2">{(["avatar1", "avatar2", "avatar3", "avatar4", "username1", "username2", "username3", "username4", "date"] as TwoVTwoPosterElementKey[]).map((key) => <button key={key} type="button" onClick={() => setTwoVTwoSelectedElement(key)} className={`rounded border px-2 py-2 text-[10px] font-black uppercase ${twoVTwoSelectedElement === key ? "border-yellow-300 text-yellow-200" : "border-white/15 text-white/60"}`}>{key.replace("username", "name ").replace("avatar", "avatar ")}</button>)}</div>}
              </div>
            </section>
            <section className="grid grid-cols-1 2xl:grid-cols-2 gap-x-28 gap-y-16"><div className="bg-black/30 p-4 rounded-xl text-left border border-yellow-300/20"><div className="text-xs text-yellow-200 font-black mb-3">LIVE TEMPLATE PREVIEW</div><TwoVTwoPosterPreview /></div></section>
          </div>
        )}
        {activeMode === "mass" && (
          <div className="grid grid-cols-1 xl:grid-cols-[460px_1fr] gap-8 items-start">
            <section className="space-y-6">
              <div className="bg-black/35 border border-yellow-300/20 rounded-xl p-5 space-y-4">
                <h2 className="text-yellow-300 font-black uppercase tracking-widest">
                  Mass Poster Generator
                </h2>


                {TemplateSelectorPanel({ compact: true })}

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
        {activeMode === "team" && TeamPosterBuilder()}
        {activeMode === "manager" && ManagerLeaderboardBuilder()}
        {activeMode === "glory" && RaceToGloryBuilder()}
          </>
        )}
      </div>
    </div>
  );
}

