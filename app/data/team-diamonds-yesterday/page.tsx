"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { saveAs } from "file-saver";
import { toBlob } from "html-to-image";
import JSZip from "jszip";
import { flushSync } from "react-dom";
import DataAccessGuard from "../../components/DataAccessGuard";

type CreatorStat = {
  [key: string]: unknown;
  stat_date: string;
  creator_username?: string | null;
  "Creator's username"?: string | null;
  agency?: string | null;
  team?: string | null;
  group_name?: string | null;
  manager_email?: string | null;
  creator_network_manager?: string | null;
  "Creator Network manager"?: string | null;
  diamonds?: number | string | null;
  live_hours?: number | string | null;
  live_duration?: string | number | null;
  "LIVE duration"?: string | number | null;
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
  managerKey?: string;
  /** Saved download category, chosen in the Team Poster Builder. */
  teamSide?: TeamPosterCategory;
  elements: TeamPosterElement[];
};

const TEMPLATE_STORAGE_KEY = "dan-team-diamonds-poster-template-v1";
const TEAM_DAN_POSTER_TEMPLATE_NAME = "team-dan-poster";
const POSTER_WIDTH = 1024;
const POSTER_HEIGHT = 1536;
const EXCLUDED_USERNAME = "allannah.unknown444";
const LOCAL_AVATAR_PATHS: Record<string, string> = {
  cerilaw83: "/avatars/cerilaw83.jpg",
  serenitetiktok: "/avatars/cerilaw83.jpg",
  tictock739: "/avatars/tictock739.jpg",
  kaylanortheast: "/avatars/kayla_northeast.jpg",
  lozza2706: "/avatars/lozza2706.jpg",
  kieransmithmilner: "/avatars/kieransmithmilner.jpg",
};
const sessionAvatarCache = new Map<string, string>();

function safeNumber(value: unknown) {
  return Number(String(value || "0").replace(/[^\d.-]/g, "")) || 0;
}

function formatCompactDiamonds(value: number) {
  if (value >= 1000000) {
    const millions = value / 1000000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (value >= 1000) {
    const thousands = value / 1000;
    return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  }
  return value.toLocaleString("en-GB");
}

function durationToHours(value: unknown) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return 0;

  const hours = Number(text.match(/(\d+(?:\.\d+)?)\s*h/)?.[1] || 0);
  const minutes = Number(text.match(/(\d+(?:\.\d+)?)\s*m/)?.[1] || 0);
  const seconds = Number(text.match(/(\d+(?:\.\d+)?)\s*s/)?.[1] || 0);

  if (hours || minutes || seconds) {
    return Number((hours + minutes / 60 + seconds / 3600).toFixed(2));
  }

  return safeNumber(value);
}

function getLiveHours(row: CreatorStat) {
  return durationToHours(row.live_hours ?? row.live_duration ?? row["LIVE duration"]);
}

function formatPosterHours(value: number) {
  if (value <= 0) return "0H";
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}H`;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getYesterdayDateKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dailyPosterRows(rows: CreatorStat[], statDate: string) {
  const byCreator = new Map<string, CreatorStat[]>();
  for (const row of rows) {
    const creatorKey = String((row as CreatorStat & { creator_id?: string | null }).creator_id || getUsername(row));
    if (!creatorKey) continue;
    byCreator.set(creatorKey, [...(byCreator.get(creatorKey) || []), row]);
  }
  return rows.filter((row) => row.stat_date === statDate).map((row) => {
    const period = String((row as CreatorStat & { data_period?: string | null }).data_period || "");
    const match = period.match(/^(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})$/);
    if (!match || match[1] === match[2]) return row;
    const creatorKey = String((row as CreatorStat & { creator_id?: string | null }).creator_id || getUsername(row));
    const priorDaily = (byCreator.get(creatorKey) || []).filter((candidate) => {
      const candidatePeriod = String((candidate as CreatorStat & { data_period?: string | null }).data_period || "");
      return candidate.stat_date >= match[1] && candidate.stat_date < statDate && candidatePeriod === `${candidate.stat_date} ~ ${candidate.stat_date}`;
    });
    return {
      ...row,
      diamonds: Math.max(0, safeNumber(row.diamonds) - priorDaily.reduce((sum, candidate) => sum + safeNumber(candidate.diamonds), 0)),
      live_hours: Math.max(0, getLiveHours(row) - priorDaily.reduce((sum, candidate) => sum + getLiveHours(candidate), 0)),
    };
  });
}

function getUsername(row: CreatorStat) {
  return String(row.creator_username || row["Creator's username"] || "")
    .replace("@", "")
    .trim()
    .toLowerCase();
}

function isTeamDanRow(row: CreatorStat) {
  const managerEmail = String(
    row.manager_email ||
      row.creator_network_manager ||
      row["Creator Network manager"] ||
      ""
  )
    .trim()
    .toLowerCase();

  const directTeamKey = managerEmail
    .replace(/[^a-z0-9]/g, "")
    .replace(/(outlook|gmail|mail)com$/, "");
  return ["firstclassagencydan", "firstclassagencyjames"].includes(directTeamKey);
}

function getManagerKey(row: CreatorStat) {
  return String(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || "")
    .trim()
    .toLowerCase();
}

// Managers can move between agency mail domains while remaining the same team.
// Compare their stable local-name identity as well as the exact source address.
function getManagerIdentity(value: string) {
  const localPart = value.trim().toLowerCase().split("@")[0] || "";
  return localPart
    .replace(/^firstclassagency[_.-]?/, "")
    .replace(/[_.-]?(aquaagency|respawnagency|paradiseagency)$/i, "")
    .replace(/[^a-z0-9]/g, "");
}

function managerKeysMatch(rowManagerKey: string, templateManagerKey: string) {
  const normalizedRowKey = rowManagerKey.replace(/[^a-z0-9]/g, "");
  const normalizedTemplateKey = templateManagerKey.replace(/[^a-z0-9]/g, "");
  if (normalizedRowKey === normalizedTemplateKey) return true;
  const rowIdentity = getManagerIdentity(rowManagerKey);
  const templateIdentity = getManagerIdentity(templateManagerKey);
  if (rowIdentity && templateIdentity && rowIdentity === templateIdentity) return true;
  return normalizedRowKey.replace(/(outlook|gmail|mail)com$/, "") === normalizedTemplateKey.replace(/(outlook|gmail|mail)com$/, "");
}

const TEAM_POSTER_GROUP_SOURCES: Record<string, string> = {
  "group:respawn": "Respawn",
  "group:paradise": "Paradise",
  "group:horizon": "Horizon",
  "group:trident": "Trident",
};
// The upload currently identifies Georgia as georgialilly.glow@gmail.com
// (with a double "l"), so retain both known spellings for Team Gee.
const TEAM_LISA_G_MANAGER_KEYS = ["georgialilyglow", "georgialillyglow", "lisaruss1988"];

function isDownloadableTemplate(template: TeamPosterTemplate, managerGroups: Record<string, string>) {
  const managerKey = (template.managerKey || "team-dan").trim().toLowerCase();
  // These are agency-wide sources rather than a single manager, so they stay
  // available independently of an individual Manager Assignments entry.
  if (managerKey === "team-dan" || managerKey === "combined:lisa-g" || managerKey === "first-class-all" || TEAM_POSTER_GROUP_SOURCES[managerKey]) return true;
  const normalizedManagerKey = managerKey.replace(/[^a-z0-9]/g, "");
  // Old presets sometimes saved just a manager's shortened name while
  // Manager Assignments stores their full username or email identity.
  const group = managerGroups[normalizedManagerKey] || Object.entries(managerGroups).find(([assignedKey]) => assignedKey.includes(normalizedManagerKey) || normalizedManagerKey.includes(assignedKey))?.[1];
  return Boolean(group && !["Excluded", "Recruitment", "New Managers"].includes(group));
}

function matchesTemplateManager(row: CreatorStat, template: TeamPosterTemplate, managerGroups: Record<string, string> = {}) {
  const managerKey = (template.managerKey || "team-dan").trim().toLowerCase();
  if (managerKey === "team-dan") return isTeamDanRow(row);
  if (managerKey === "combined:lisa-g") {
    const rowManagerKey = getManagerKey(row).replace(/[^a-z0-9]/g, "");
    return TEAM_LISA_G_MANAGER_KEYS.some((key) => rowManagerKey.includes(key));
  }
  const selectedGroup = TEAM_POSTER_GROUP_SOURCES[managerKey];
  if (selectedGroup) {
    return managerGroups[getManagerKey(row).replace(/[^a-z0-9]/g, "")] === selectedGroup;
  }
  if (managerKey === "first-class-all") {
    // The whole-agency poster follows the current Manager Assignments
    // configuration, rather than a possibly stale agency value on the row.
    const group = managerGroups[getManagerKey(row).replace(/[^a-z0-9]/g, "")];
    return group === "Team Dan / James" || group === "Team Mike / Indi";
  }
  return managerKeysMatch(getManagerKey(row), managerKey);
}

function createDefaultTemplate(): TeamPosterTemplate {
  const elements: TeamPosterElement[] = [];
  const rowGap = 98;

  const addLeaderboardRow = (group: "diamonds" | "hours", index: number, rowY: number) => {
    const suffix = group === "diamonds" ? `${index + 1}` : `hours-${index + 1}`;
    const valueId = group === "diamonds" ? `diamonds-${index + 1}` : `hours-${index + 1}`;
    const valueColor = group === "diamonds" ? "#FACC15" : "#38BDF8";
    elements.push({ id: `avatar-${suffix}`, kind: "avatar", x: 145, y: rowY, width: 92, height: 92, value: "" });
    elements.push({ id: `username-${suffix}`, kind: "username", x: 275, y: rowY + 15, width: 430, height: 58, value: "", fontFamily: "Luckiest Guy", fontSize: 37, color: "#FFFFFF", fontWeight: 900 });
    elements.push({ id: valueId, kind: group, x: 725, y: rowY + 15, width: 210, height: 58, value: "", fontFamily: "Luckiest Guy", fontSize: 37, color: valueColor, fontWeight: 900 });
  };

  for (let index = 0; index < 5; index += 1) {
    addLeaderboardRow("diamonds", index, 390 + index * rowGap);
    addLeaderboardRow("hours", index, 925 + index * rowGap);
  }

  return { backgroundUrl: "", elements };
}

function normalizeTemplate(input: Partial<TeamPosterTemplate> | null): TeamPosterTemplate {
  const base = createDefaultTemplate();
  const byId = new Map((input?.elements || []).map((element) => [element.id, element]));
  return {
    backgroundUrl: input?.backgroundUrl || "",
    backgroundPath: input?.backgroundPath || "",
    managerKey: input?.managerKey || "team-dan",
    teamSide: input?.teamSide || "dan",
    elements: base.elements.map((element) => ({ ...element, ...(byId.get(element.id) || {}), fontSize: element.kind === "avatar" ? undefined : 37 })),
  };
}

function getPosterSupabaseClient() {
  const url =
    process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

function getBackgroundPathFromUrl(url: string) {
  const marker = "/storage/v1/object/public/poster-backgrounds/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return "";
  return decodeURIComponent(url.slice(markerIndex + marker.length).split("?")[0] || "");
}

async function resolveTemplateBackground(template: TeamPosterTemplate) {
  const supabase = getPosterSupabaseClient();
  const backgroundPath = template.backgroundPath || getBackgroundPathFromUrl(template.backgroundUrl);

  if (!supabase || !backgroundPath) return template;

  const { data, error } = await supabase.storage
    .from("poster-backgrounds")
    .createSignedUrl(backgroundPath, 60 * 60 * 24 * 7);

  if (error || !data?.signedUrl) return { ...template, backgroundPath };
  return { ...template, backgroundPath, backgroundUrl: data.signedUrl };
}

async function getPublicSavedTemplate() {
  const supabase = getPosterSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("poster_templates")
    .select("template_json,background_url")
    .eq("name", TEAM_DAN_POSTER_TEMPLATE_NAME)
    .maybeSingle();

  if (error || !data?.template_json) return null;

  const rawTemplate = data.template_json as TeamPosterTemplate;
  const template = normalizeTemplate({
    ...rawTemplate,
    backgroundUrl: rawTemplate.backgroundUrl || data.background_url || "",
  });

  return resolveTemplateBackground(template);
}

type SavedTemplateRow = { name: string; template: TeamPosterTemplate; label?: string; canDownload?: boolean };
type AssignedManager = { key: string; name?: string; group?: string };

function isTeamPosterTemplate(name: string) {
  return name === TEAM_DAN_POSTER_TEMPLATE_NAME || name.startsWith("team-poster-");
}

function templateLabel(name: string) {
  if (name === TEAM_DAN_POSTER_TEMPLATE_NAME) return "Team Dan + James";
  return name
    .replace(/^team-poster-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function templateSlug(label: string) {
  return `team-poster-${label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "new-team"}`;
}

function templateDisplayLabel(item: SavedTemplateRow) {
  return item.label || templateLabel(item.name);
}

const TEAM_POSTER_CATEGORY_LABELS: Record<TeamPosterCategory, string> = {
  dan: "Team Dan + James",
  "mike-indi": "Team Mike + Indi",
  "sub-agencies": "Whole Agencies",
  paradise: "Paradise",
  horizon: "Horizon",
  trident: "Trident",
  respawn: "Respawn",
};

function teamPosterCategoryLabel(category: TeamPosterCategory) {
  return TEAM_POSTER_CATEGORY_LABELS[category];
}

function isDownloadableManagerGroup(group: string | undefined) {
  return Boolean(group && !["Excluded", "Recruitment", "New Managers"].includes(group));
}

function categoryForManagerGroup(group: string | undefined): TeamPosterCategory {
  if (group === "Team Mike / Indi") return "mike-indi";
  if (group === "Paradise") return "paradise";
  if (group === "Horizon") return "horizon";
  if (group === "Trident") return "trident";
  if (group === "Respawn") return "respawn";
  if (group === "Team Dan / James") return "dan";
  return "sub-agencies";
}

function assignmentTemplate(manager: AssignedManager): SavedTemplateRow {
  const managerKey = manager.key.trim().toLowerCase();
  const label = manager.name?.trim() || templateLabel(`team-poster-${managerKey}`);
  return {
    name: `team-poster-assignment-${managerKey}`,
    label,
    canDownload: false,
    template: normalizeTemplate({
      ...createDefaultTemplate(),
      managerKey,
      teamSide: categoryForManagerGroup(manager.group),
    }),
  };
}

async function getTeamPosterTemplates(): Promise<SavedTemplateRow[]> {
  const supabase = getPosterSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("poster_templates")
    .select("name,template_json,background_url")
    .order("updated_at", { ascending: false });
  if (error || !data) return [];

  const templates = await Promise.all(
    data
      .filter((row) => isTeamPosterTemplate(String(row.name || "")) && row.template_json)
      .map(async (row) => ({
        name: String(row.name),
        template: await resolveTemplateBackground(
          normalizeTemplate({
            ...(row.template_json as TeamPosterTemplate),
            backgroundUrl: (row.template_json as TeamPosterTemplate).backgroundUrl || row.background_url || "",
          })
        ),
      }))
  );
  return templates.sort((a, b) => (a.name === TEAM_DAN_POSTER_TEMPLATE_NAME ? -1 : b.name === TEAM_DAN_POSTER_TEMPLATE_NAME ? 1 : a.name.localeCompare(b.name)));
}

function getSavedTemplate() {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!saved) return null;
    return normalizeTemplate(JSON.parse(saved) as TeamPosterTemplate);
  } catch {
    return null;
  }
}

function fallbackAvatarFor(username: string, fallbackAvatars: Record<string, string> = {}) {
  const normalized = username.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (fallbackAvatars[normalized]) return fallbackAvatars[normalized];
  const nearMatches = Object.entries(fallbackAvatars).filter(([candidate, imageUrl]) => {
    if (!imageUrl || Math.abs(candidate.length - normalized.length) > 1) return false;
    let changes = 0; let left = 0; let right = 0;
    while (left < candidate.length && right < normalized.length) {
      if (candidate[left] === normalized[right]) { left += 1; right += 1; continue; }
      changes += 1; if (changes > 1) return false;
      if (candidate.length > normalized.length) left += 1;
      else if (candidate.length < normalized.length) right += 1;
      else { left += 1; right += 1; }
    }
    return changes + (candidate.length - left) + (normalized.length - right) <= 1;
  });
  return nearMatches.length === 1 ? nearMatches[0][1] : "";
}

async function fetchTikTokAvatar(username: string, fallbackAvatars: Record<string, string> = {}) {
  const cleanUsername = username.replace("@", "").trim().toLowerCase();
  if (!cleanUsername) return "";
  const normalizedUsername = cleanUsername.replace(/[^a-z0-9]/g, "");
  const localAvatar = fallbackAvatarFor(username, fallbackAvatars) || LOCAL_AVATAR_PATHS[normalizedUsername];
  if (localAvatar) return localAvatar;
  const refreshKey = `${cleanUsername}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    const res = await fetch("/api/tiktok-avatar-v2", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", Pragma: "no-cache" },
      body: JSON.stringify({ username: cleanUsername, forceRefresh: true, refresh: refreshKey }),
    });
    const json = await res.json();
    if (!json.avatar) return "";
    if (String(json.avatar).startsWith("/")) return String(json.avatar);
    return `/api/tiktok-avatar-image?url=${encodeURIComponent(json.avatar)}&username=${encodeURIComponent(cleanUsername)}&refresh=${refreshKey}`;
  } catch {
    return "";
  }
}

async function embedAvatarForPoster(url: string) {
  if (!url || url.startsWith("data:")) return url;
  try {
    const response = await fetch(url, { cache: "no-store" });
    // A failed image request must remain a failure. Returning the original URL
    // made Picture Check treat broken fallback images as usable.
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) return "";
    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || url));
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

async function resolveAvatarForPoster(username: string, fallbackAvatars: Record<string, string> = {}) {
  const normalizedUsername = username.replace(/[^a-z0-9]/gi, "").toLowerCase();
  // A manual fallback should always take priority over a previously scraped image.
  const fallbackAvatar = fallbackAvatarFor(username, fallbackAvatars);
  if (fallbackAvatar) {
    return embedAvatarForPoster(fallbackAvatar);
  }
  const cachedAvatar = sessionAvatarCache.get(normalizedUsername);
  if (cachedAvatar) return cachedAvatar;
  const embeddedAvatar = await embedAvatarForPoster(await fetchTikTokAvatar(username, fallbackAvatars));
  // TikTok can intermittently reject repeat requests. Keep only confirmed images
  // so a successful Picture Check and the following download stay consistent.
  if (embeddedAvatar) sessionAvatarCache.set(normalizedUsername, embeddedAvatar);
  return embeddedAvatar;
}

async function waitForImages(node: HTMLElement) {
  await Promise.all(
    Array.from(node.querySelectorAll("img")).map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    })
  );
}

// CSS backgrounds are not included in querySelectorAll("img"). Preloading
// them prevents a batch download from capturing the previous poster's image.
function waitForBackground(url: string) {
  if (!url) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

function PosterPreview({ template }: { template: TeamPosterTemplate }) {
  return (
    <div
      id="team-dan-poster-preview"
      className="relative overflow-hidden bg-black"
      style={{
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        backgroundImage: template.backgroundUrl
          ? undefined
          : "linear-gradient(180deg, #090909 0%, #241d05 55%, #050505 100%)",
      }}
    >
      {template.backgroundUrl ? (
        // Export the background as its own keyed image rather than a CSS
        // background. html-to-image can otherwise reuse the whole-agency
        // background when switching between individual manager templates.
        <img
          key={template.backgroundUrl}
          src={template.backgroundUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {template.elements.map((element) => (
        <div
          key={element.id}
          className={`absolute flex items-center justify-center ${element.kind === "avatar" ? "overflow-hidden" : "overflow-visible"}`}
          style={{
            left: element.x,
            top: element.y,
            width: element.width,
            // Avatar slots always remain square, so profile photos can never be stretched.
            height: element.kind === "avatar" ? element.width : element.height,
            borderRadius: element.kind === "avatar" ? 999 : 0,
            color: element.color || "#FACC15",
            fontFamily: element.fontFamily || "Luckiest Guy",
            fontSize: element.fontSize || 37,
            fontWeight: element.fontWeight || 900,
            textShadow: element.kind === "avatar" ? undefined : "3px 3px 0 #000",
            whiteSpace: "nowrap",
          }}
        >
          {element.kind === "avatar" ? (
            element.imageUrl ? <img key={element.imageUrl} src={element.imageUrl} alt="" className="h-full w-full object-cover" /> : null
          ) : (
            element.value
          )}
        </div>
      ))}
    </div>
  );
}

export default function TeamDiamondsYesterdayPage() {
  const [template, setTemplate] = useState<TeamPosterTemplate | null>(null);
  const [savedTemplate, setSavedTemplate] = useState<TeamPosterTemplate | null>(null);
  const [templates, setTemplates] = useState<SavedTemplateRow[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState(TEAM_DAN_POSTER_TEMPLATE_NAME);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [pictureCheck, setPictureCheck] = useState<{ checked: number; failed: string[] } | null>(null);
  const [latestStatDate, setLatestStatDate] = useState("");
  const [showSubAgencies, setShowSubAgencies] = useState(false);

  const previewScale = 0.42;
  // A browser-local template should enhance the poster, not be required for it.
  // This lets every signed-in user build a poster even when no public custom template exists yet.
  const selectedSavedTemplate = templates.find((item) => item.name === selectedTemplateName)?.template || savedTemplate;
  const visibleTemplate = useMemo(() => template || selectedSavedTemplate || getSavedTemplate() || createDefaultTemplate(), [template, selectedSavedTemplate]);
  const templateCards = templates.length
    ? templates
    : [{ name: TEAM_DAN_POSTER_TEMPLATE_NAME, template: savedTemplate || createDefaultTemplate() }];
  const templatesBySide = {
    dan: templateCards.filter((item) => (item.template.teamSide || "dan") === "dan"),
    "mike-indi": templateCards.filter((item) => item.template.teamSide === "mike-indi"),
    "sub-agencies": templateCards.filter((item) => item.template.teamSide === "sub-agencies"),
    paradise: templateCards.filter((item) => item.template.teamSide === "paradise"),
    horizon: templateCards.filter((item) => item.template.teamSide === "horizon"),
    trident: templateCards.filter((item) => item.template.teamSide === "trident"),
    respawn: templateCards.filter((item) => item.template.teamSide === "respawn"),
  };
  const visibleSides: TeamPosterCategory[] = showSubAgencies
    ? ["dan", "mike-indi", "sub-agencies", "paradise", "horizon", "trident", "respawn"]
    : ["dan", "mike-indi", "sub-agencies"];

  useEffect(() => {
    let cancelled = false;

    async function loadTemplate() {
      const [publicTemplate, savedTemplates, assignmentsResponse] = await Promise.all([
        getPublicSavedTemplate(),
        getTeamPosterTemplates(),
        fetch("/api/data-analysis/manager-assignments", { cache: "no-store" }),
      ]);
      if (cancelled) return;
      const assignmentsData = assignmentsResponse.ok ? await assignmentsResponse.json() : {};
      const managerGroups = assignmentsData.managerGroups || assignmentsData.assignments?.managerGroups || {};
      const assignmentNames = assignmentsData.assignments?.managerNames || {};
      // Assignment settings are the source of truth for download choices. A
      // manager must not need a separately saved poster preset before their
      // download button appears.
      const assignedManagers: AssignedManager[] = Object.entries(managerGroups)
        .filter(([, group]) => isDownloadableManagerGroup(String(group)))
        .map(([key, group]) => {
          const liveManager = (assignmentsData.managers || []).find((manager: AssignedManager) => manager.key === key);
          return { key, group: String(group), name: liveManager?.name || assignmentNames[key] };
        });
      const eligibleSavedTemplates = savedTemplates.filter((item) => isDownloadableTemplate(item.template, managerGroups));
      const missingAssignmentTemplates = assignedManagers
        .filter((manager) => !eligibleSavedTemplates.some((item) => {
          const templateManagerKey = (item.template.managerKey || "").trim();
          return Boolean(templateManagerKey) && managerKeysMatch(templateManagerKey, manager.key);
        }))
        .map(assignmentTemplate);
      if (publicTemplate) setSavedTemplate(publicTemplate);
      // Saved layouts may outlive their manager, but every active assignment
      // receives a working default download card until a custom layout exists.
      setTemplates([...eligibleSavedTemplates, ...missingAssignmentTemplates]);
    }

    loadTemplate();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveTemplate(name: string, nextTemplate: TeamPosterTemplate) {
    const supabase = getPosterSupabaseClient();
    if (!supabase) throw new Error("Poster storage is not connected.");
    const { error } = await supabase.from("poster_templates").upsert(
      { name, template_json: nextTemplate, background_url: nextTemplate.backgroundUrl || null },
      { onConflict: "name" }
    );
    if (error) throw error;
  }

  async function createOrDuplicateTemplate(duplicate: boolean) {
    const label = newTemplateName.trim();
    if (!label) {
      setMessage("Give the new poster a name first.");
      return;
    }
    const name = templateSlug(label);
    if (templates.some((item) => item.name === name)) {
      setMessage("A team poster with that name already exists.");
      return;
    }
    setLoading(true);
    try {
      const source = duplicate ? visibleTemplate : createDefaultTemplate();
      await saveTemplate(name, source);
      const next = { name, template: source };
      setTemplates((current) => [...current, next]);
      setSelectedTemplateName(name);
      setTemplate(null);
      setNewTemplateName("");
      setShowNewTemplate(false);
      setMessage(`${label} is ready. Use Poster Generator to customise its layout and background.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the new poster.");
    } finally {
      setLoading(false);
    }
  }

  async function getLatestUploadedDate() {
    const response = await fetch("/api/data-analysis/upload-status?latest=true", { cache: "no-store" });
    const status = await response.json();
    const statDate = String(status.latestDate || "");
    if (!response.ok || !/^\d{4}-\d{2}-\d{2}$/.test(statDate)) {
      throw new Error(status.error || "No Creator Daily Stats upload is available.");
    }
    setLatestStatDate(statDate);
    return statDate;
  }

  async function buildPreview(forTemplate?: TeamPosterTemplate, quiet = false): Promise<string[] | null> {
    setLoading(true);
    setMessage("");

    try {
      const activeTemplate = forTemplate || selectedSavedTemplate || savedTemplate || getSavedTemplate() || createDefaultTemplate();

      const statDate = await getLatestUploadedDate();
      const [res, exclusionsResponse, fallbacksResponse, assignmentsResponse] = await Promise.all([
        fetch(`/api/data-analysis/daily-stats?month=${statDate.slice(0, 7)}&posterDate=${statDate}`, { cache: "no-store" }),
        fetch("/api/data-analysis/excluded-creators", { cache: "no-store" }),
        fetch("/api/data-analysis/fallback-avatars", { cache: "no-store" }),
        fetch("/api/data-analysis/manager-assignments", { cache: "no-store" }),
      ]);
      const [json, exclusions, fallbacks, assignmentsData] = await Promise.all([res.json(), exclusionsResponse.json(), fallbacksResponse.json(), assignmentsResponse.json()]);
      if (!res.ok) throw new Error(json.error || "Could not load Daniel daily stats.");
      if (!assignmentsResponse.ok) throw new Error(assignmentsData.error || "Could not load manager assignments.");
      const managerGroups = assignmentsData.managerGroups || assignmentsData.assignments?.managerGroups || {};
      const hiddenUsernames = new Set((exclusions.creators || []).filter((creator: { hiddenFromDownloads?: boolean }) => creator.hiddenFromDownloads).map((creator: { username: string }) => creator.username.toLowerCase()));
      const fallbackAvatars = Object.fromEntries((fallbacks.avatars || []).map((avatar: { username: string; imageUrl: string }) => [avatar.username, avatar.imageUrl]));

      const rows = dailyPosterRows((json.rows || []) as CreatorStat[], statDate)
        .filter((row) => matchesTemplateManager(row, activeTemplate, managerGroups))
        .filter((row) => getUsername(row))
        .filter((row) => !hiddenUsernames.has(getUsername(row)))
        .filter((row) => getUsername(row) !== EXCLUDED_USERNAME);

      if (!rows.length) {
        setMessage(`No rows found for ${(activeTemplate.managerKey || "team-dan")} on ${statDate}.`);
        return null;
      }

      const diamondRows = [...rows]
        .sort((a, b) => safeNumber(b.diamonds) - safeNumber(a.diamonds))
        .slice(0, 5);
      const hourRows = [...rows]
        .sort((a, b) => getLiveHours(b) - getLiveHours(a))
        .slice(0, 5);
      const avatarByUsername = new Map<string, string>();
      const failedAvatars: string[] = [];

      // Load one creator at a time: parallel TikTok scrapes can reuse a stale
      // response and put the same avatar into multiple slots.
      for (const username of new Set([...diamondRows, ...hourRows].map(getUsername))) {
        const embeddedAvatar = await resolveAvatarForPoster(username, fallbackAvatars);
        avatarByUsername.set(username, embeddedAvatar);
        if (!embeddedAvatar) failedAvatars.push(username);
      }

      const diamondCreators = diamondRows.map((row) => ({
        username: getUsername(row),
        value: formatCompactDiamonds(safeNumber(row.diamonds)),
        avatar: avatarByUsername.get(getUsername(row)) || "",
      }));
      const hourCreators = hourRows.map((row) => ({
        username: getUsername(row),
        value: formatPosterHours(getLiveHours(row)),
        avatar: avatarByUsername.get(getUsername(row)) || "",
      }));

      const filledTemplate: TeamPosterTemplate = {
        ...activeTemplate,
        elements: activeTemplate.elements.map((element) => {
          const diamondMatch = element.id.match(/^(avatar|username|diamonds)-(\d+)$/);
          const hourTextMatch = element.id.match(/^(avatar|username)-hours-(\d+)$/);
          const hourValueMatch = element.id.match(/^hours-(\d+)$/);
          const hourIndex = Number((hourTextMatch?.[2] || hourValueMatch?.[1] || "0")) - 1;
          const creator = diamondMatch
            ? diamondCreators[Number(diamondMatch[2]) - 1]
            : hourTextMatch || hourValueMatch
              ? hourCreators[hourIndex]
              : null;
          if (!creator) {
            if (!diamondMatch && !hourTextMatch && !hourValueMatch) return element;
            return element.kind === "avatar" ? { ...element, imageUrl: "" } : { ...element, value: "" };
          }
          if (element.kind === "avatar") return { ...element, imageUrl: creator.avatar, value: creator.username };
          if (element.kind === "username") return { ...element, value: creator.username.toUpperCase() };
          if (element.kind === "diamonds" || element.kind === "hours") return { ...element, value: creator.value };
          return element;
        }),
      };

      // The poster may be captured immediately after this update. Flush it so
      // images from the preceding download cannot be reused by the next one.
      flushSync(() => setTemplate(filledTemplate));
      if (!quiet) setMessage(`Preview built from ${(activeTemplate.managerKey || "team-dan")} top 5 diamonds and top 5 hours for ${statDate}.`);
      return failedAvatars;
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Could not build Team Dan poster.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function downloadPoster() {
    const node = document.getElementById("team-dan-poster-preview") as HTMLElement | null;
    if (!node) {
      await buildPreview();
      return;
    }

    await waitForImages(node);
    const blob = await toBlob(node, {
      cacheBust: true,
      pixelRatio: 1,
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
      backgroundColor: "#000000",
    });
    if (!blob) return;
    saveAs(blob, `${selectedTemplateName}-${latestStatDate || getYesterdayDateKey()}.png`);
  }

  async function downloadAllPosters(side?: TeamPosterCategory) {
    const allItems = templates.length
      ? templates
      : [{ name: TEAM_DAN_POSTER_TEMPLATE_NAME, template: savedTemplate || createDefaultTemplate() }];
    const items = (side ? allItems.filter((item) => (item.template.teamSide || "dan") === side) : allItems)
      .filter((item) => item.canDownload !== false);
    if (!items.length) {
      const categoryLabel = side ? teamPosterCategoryLabel(side) : "All Teams";
      setMessage(`No saved presets in ${categoryLabel} yet.`);
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const zip = new JSZip();
      const failedAvatars = new Set<string>();
      const skippedPosters: string[] = [];
      for (const [index, item] of items.entries()) {
        try {
          setDownloadProgress({ current: index, total: items.length, label: templateDisplayLabel(item) });
          setSelectedTemplateName(item.name);
          const failedForPoster = await buildPreview(item.template, true);
          if (!failedForPoster) throw new Error("No current creator data.");
          failedForPoster.forEach((username) => failedAvatars.add(username));
          // buildPreview switches the live poster to this template.  Wait for
          // that template's background afterwards, otherwise a fast batch can
          // capture the previous agency's background in the new PNG.
          await waitForBackground(item.template.backgroundUrl);
          await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          const node = document.getElementById("team-dan-poster-preview") as HTMLElement | null;
          if (!node) throw new Error("Could not prepare preview.");
          await waitForImages(node);
          const blob = await toBlob(node, { cacheBust: true, pixelRatio: 1, width: POSTER_WIDTH, height: POSTER_HEIGHT, backgroundColor: "#000000" });
          if (!blob) throw new Error("Could not create image.");
          zip.file(`${templateDisplayLabel(item)}.png`, blob);
        } catch {
          skippedPosters.push(templateDisplayLabel(item));
        }
        setDownloadProgress({ current: index + 1, total: items.length, label: templateDisplayLabel(item) });
      }
      const sideLabel = side ? teamPosterCategoryLabel(side) : "All teams";
      setDownloadProgress({ current: items.length, total: items.length, label: "Creating ZIP file" });
      const archive = await zip.generateAsync({ type: "blob" });
      saveAs(archive, `${sideLabel.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase()}-${latestStatDate || getYesterdayDateKey()}.zip`);
      const failedText = failedAvatars.size
        ? ` Picture not found for: ${[...failedAvatars].join(", ")}. Add any of these in Fallback Pictures if needed.`
        : " All creator pictures loaded.";
      const savedCount = items.length - skippedPosters.length;
      setMessage(`${sideLabel}: ${savedCount} poster${savedCount === 1 ? "" : "s"} saved in one ZIP file.${skippedPosters.length ? ` Skipped: ${skippedPosters.join(", ")}.` : ""}${failedText}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not download all posters.");
    } finally {
      setLoading(false);
      setDownloadProgress(null);
    }
  }

  async function checkPictures() {
    const allItems = (templates.length
      ? templates
      : [{ name: TEAM_DAN_POSTER_TEMPLATE_NAME, template: savedTemplate || createDefaultTemplate() }])
      .filter((item) => item.canDownload !== false);
    setLoading(true);
    setMessage("");
    setPictureCheck(null);
    try {
      const statDate = await getLatestUploadedDate();
      const [res, exclusionsResponse, fallbacksResponse, assignmentsResponse] = await Promise.all([
        fetch(`/api/data-analysis/daily-stats?month=${statDate.slice(0, 7)}&posterDate=${statDate}&t=${Date.now()}`, { cache: "no-store" }),
        fetch("/api/data-analysis/excluded-creators", { cache: "no-store" }),
        fetch("/api/data-analysis/fallback-avatars", { cache: "no-store" }),
        fetch("/api/data-analysis/manager-assignments", { cache: "no-store" }),
      ]);
      const [json, exclusions, fallbacks, assignmentsData] = await Promise.all([res.json(), exclusionsResponse.json(), fallbacksResponse.json(), assignmentsResponse.json()]);
      if (!res.ok) throw new Error(json.error || "Could not load daily stats.");
      if (!fallbacksResponse.ok) throw new Error(fallbacks.error || "Could not load fallback pictures.");
      if (!assignmentsResponse.ok) throw new Error(assignmentsData.error || "Could not load manager assignments.");
      const managerGroups = assignmentsData.managerGroups || assignmentsData.assignments?.managerGroups || {};
      const hiddenUsernames = new Set((exclusions.creators || [])
        .filter((creator: { hiddenFromDownloads?: boolean }) => creator.hiddenFromDownloads)
        .map((creator: { username: string }) => creator.username.toLowerCase()));
      const fallbackAvatars = Object.fromEntries((fallbacks.avatars || [])
        .map((avatar: { username: string; imageUrl: string }) => [avatar.username, avatar.imageUrl]));
      const allRows = dailyPosterRows((json.rows || []) as CreatorStat[], statDate)
        .filter((row) => getUsername(row))
        .filter((row) => !hiddenUsernames.has(getUsername(row)))
        .filter((row) => getUsername(row) !== EXCLUDED_USERNAME);
      const usernames = new Set<string>();

      for (const item of allItems) {
        const teamRows = allRows.filter((row) => matchesTemplateManager(row, item.template, managerGroups));
        [...teamRows].sort((a, b) => safeNumber(b.diamonds) - safeNumber(a.diamonds)).slice(0, 5).forEach((row) => usernames.add(getUsername(row)));
        [...teamRows].sort((a, b) => getLiveHours(b) - getLiveHours(a)).slice(0, 5).forEach((row) => usernames.add(getUsername(row)));
      }

      const failed: string[] = [];
      const candidateUsernames = [...usernames];
      for (const [index, username] of candidateUsernames.entries()) {
        setDownloadProgress({ current: index, total: candidateUsernames.length, label: `Checking @${username}` });
        const avatar = await resolveAvatarForPoster(username, fallbackAvatars);
        if (!avatar) failed.push(username);
      }
      if (failed.length) {
        const existing = (fallbacks.avatars || []) as { username: string; imageUrl: string }[];
        const normalizeFallbackUsername = (value: string) => value.replace(/[^a-z0-9]/gi, "").toLowerCase();
        const existingNames = new Set(existing.map((avatar) => normalizeFallbackUsername(avatar.username)));
        const queuedCreators = failed
          .map(normalizeFallbackUsername)
          .filter((username, index, values) => username && !existingNames.has(username) && values.indexOf(username) === index)
          .map((username) => ({ username, imageUrl: "" }));
        if (queuedCreators.length) {
          const saveFallbacksResponse = await fetch("/api/data-analysis/fallback-avatars", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatars: queuedCreators }),
          });
          const savedFallbacks = await saveFallbacksResponse.json();
          if (!saveFallbacksResponse.ok) {
            throw new Error(savedFallbacks.error || "Could not add creators to Fallback Pictures.");
          }
        }
      }
      setPictureCheck({ checked: candidateUsernames.length, failed });
      const queuedCount = failed.length
        ? failed.filter((username) => !(fallbacks.avatars || []).some((avatar: { username: string }) => avatar.username.replace(/[^a-z0-9]/gi, "").toLowerCase() === username.replace(/[^a-z0-9]/gi, "").toLowerCase())).length
        : 0;
      setMessage(failed.length ? `${failed.length} creator picture${failed.length === 1 ? " needs" : "s need"} a fallback before downloading.${queuedCount ? ` ${queuedCount} creator${queuedCount === 1 ? " was" : "s were"} added to Fallback Pictures.` : ""}` : `All ${candidateUsernames.length} creator pictures are ready.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not check creator pictures.");
    } finally {
      setLoading(false);
      setDownloadProgress(null);
    }
  }

  async function copyMissingCreatorList() {
    if (!pictureCheck?.failed.length) return;
    try {
      await navigator.clipboard.writeText(pictureCheck.failed.join("\n"));
      setMessage("Missing creator list copied. Paste it into Fallback Pictures to queue everyone.");
    } catch {
      setMessage("Could not copy the list. Select the usernames below and copy them manually.");
    }
  }

  async function downloadTemplate(item: SavedTemplateRow) {
    setSelectedTemplateName(item.name);
    setLoading(true);
    try {
      const failedForPoster = await buildPreview(item.template, true);
      if (!failedForPoster) throw new Error(`No current creator data was found for ${templateDisplayLabel(item)}.`);
      // Keep the standalone route identical to the grouped download route:
      // render this template first, then wait for its own background to paint.
      await waitForBackground(item.template.backgroundUrl);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const node = document.getElementById("team-dan-poster-preview") as HTMLElement | null;
      if (!node) throw new Error("Could not prepare the poster.");
      await waitForImages(node);
      const blob = await toBlob(node, { cacheBust: true, pixelRatio: 1, width: POSTER_WIDTH, height: POSTER_HEIGHT, backgroundColor: "#000" });
      if (blob) saveAs(blob, `${item.name}-${latestStatDate || getYesterdayDateKey()}.png`);
      setMessage(`${templateDisplayLabel(item)} downloaded.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not download this poster.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DataAccessGuard>
      <main className="min-h-screen bg-[#080603] px-4 py-6 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex flex-wrap gap-3">
            <Link href="/data/menu" className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase hover:bg-white/10">
              Back to Data
            </Link>
            <Link href="/generator" className="rounded-xl border border-yellow-300/30 bg-yellow-300/10 px-5 py-3 text-sm font-black uppercase text-yellow-200 hover:bg-yellow-300/20">
              Poster Generator
            </Link>
          </div>

          <section className="rounded-3xl border border-yellow-300/25 bg-yellow-300/10 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-200/70">Team Posters</p>
                <h1 className="mt-3 text-4xl font-black uppercase text-yellow-300 md:text-6xl">Team Diamonds Yesterday</h1>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => void checkPictures()} disabled={loading} className="rounded-xl border border-sky-300/40 bg-sky-300/10 px-5 py-3 text-sm font-black uppercase text-sky-100 hover:bg-sky-300/20 disabled:opacity-50">Check Pictures</button>
                <button type="button" onClick={() => void downloadAllPosters()} disabled={loading} className="rounded-xl border border-yellow-300/40 bg-black/30 px-5 py-3 text-sm font-black uppercase text-yellow-100 hover:bg-black/50 disabled:opacity-50">Download All Teams</button>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-white/60">
              Your saved team presets, ready to download. Layouts and data sources are managed in Posters.
            </p>
          </section>

          <section className="mt-6 space-y-5">
            <div className="grid gap-6 xl:grid-cols-2">
              {visibleSides.map((side) => (
                <div key={side} className="rounded-3xl border border-yellow-300/20 bg-black/30 p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-black uppercase tracking-widest text-yellow-200">{teamPosterCategoryLabel(side)}</h2>
                    <button type="button" onClick={() => void downloadAllPosters(side)} disabled={loading || !templatesBySide[side].length} className="rounded-xl bg-yellow-300 px-4 py-3 text-xs font-black uppercase tracking-widest text-black hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-40">
                      Download All {teamPosterCategoryLabel(side)}
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {templatesBySide[side].map((item) => (
                <article key={item.name} className="rounded-3xl border border-yellow-300/20 bg-black/50 p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-white/45">{item.canDownload === false ? "No poster made yet" : "Saved preset"}</p>
                  <h2 className="mt-2 text-2xl font-black uppercase text-yellow-200">{templateDisplayLabel(item)}</h2>
                  <button type="button" onClick={() => downloadTemplate(item)} disabled={loading || item.canDownload === false} className="mt-5 w-full rounded-xl bg-green-400 px-5 py-4 text-sm font-black uppercase text-black hover:bg-green-300 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/45 disabled:opacity-100">{item.canDownload === false ? "No Poster Made Yet" : `Download ${templateDisplayLabel(item)}`}</button>
                </article>
                    ))}
                    {!templatesBySide[side].length ? <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-white/45">No saved presets on this side yet.</p> : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center">
              <button type="button" onClick={() => setShowSubAgencies((current) => !current)} className="rounded-xl border border-yellow-300/35 bg-yellow-300/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-yellow-100 hover:bg-yellow-300/20">
                {showSubAgencies ? "Hide Sub-Agencies" : "Show Sub-Agencies"}
              </button>
            </div>
            {message ? <p className="rounded-xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-sm text-yellow-100">{message}</p> : null}
            {pictureCheck ? <div className="rounded-2xl border border-sky-300/25 bg-sky-300/10 p-5"><p className="text-xs font-black uppercase tracking-widest text-sky-100">Picture check — {pictureCheck.checked} creators</p>{pictureCheck.failed.length ? <><p className="mt-2 text-sm text-white/80">Add fallback pictures for these usernames, then run the check again:</p><textarea readOnly value={pictureCheck.failed.join("\n")} rows={Math.min(Math.max(pictureCheck.failed.length, 3), 10)} aria-label="Missing creator usernames" className="mt-3 w-full rounded-xl border border-rose-300/30 bg-black/30 px-3 py-2 font-mono text-sm text-rose-100"/><div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => void copyMissingCreatorList()} className="rounded-xl border border-sky-300/40 bg-sky-300/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-sky-100 hover:bg-sky-300/20">Copy list</button><Link href="/data/fallback-pictures" className="inline-flex rounded-xl bg-sky-300 px-4 py-3 text-xs font-black uppercase tracking-widest text-black hover:bg-sky-200">Open Fallback Pictures</Link></div></> : <p className="mt-2 text-sm font-bold text-green-200">Every creator who will appear in the posters has a picture ready.</p>}</div> : null}
            {downloadProgress ? <div className="rounded-xl border border-sky-300/25 bg-sky-300/10 p-4"><div className="flex items-center justify-between gap-4 text-xs font-black uppercase tracking-widest text-sky-100"><span>Preparing {downloadProgress.label}</span><span>{downloadProgress.current} / {downloadProgress.total}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-sky-300 transition-[width] duration-300" style={{ width: `${Math.round((downloadProgress.current / downloadProgress.total) * 100)}%` }} /></div><p className="mt-2 text-xs text-sky-100/70">Loading creator photos and rendering the poster. Download time after this is controlled by your browser.</p></div> : null}
            <div className="hidden overflow-auto rounded-3xl border border-yellow-300/20 bg-black/50 p-5">
              <div style={{ width: POSTER_WIDTH * previewScale, height: POSTER_HEIGHT * previewScale }}>
                <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
                  <PosterPreview template={visibleTemplate} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </DataAccessGuard>
  );
}
