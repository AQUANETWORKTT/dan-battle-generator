"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { flushSync } from "react-dom";
import {CreatorStat, TeamPosterElement, TeamPosterCategory, TeamPosterTemplate, safeNumber, formatCompactDiamonds, getLiveHours, formatPosterHours, dailyPosterRows, getUsername, matchesTemplateManager, createDefaultTemplate, normalizeTemplate, templateLabel, templateSlug, teamPosterCategoryLabel, fallbackAvatarFor} from "@/lib/team-poster-model";
import {firstClassPosterSide} from "@/lib/team-poster-preparation-model";
import PreparedTeamPosters, {type PreparedTeamPostersHandle} from "./PreparedTeamPosters";
import DataAccessGuard from "../../components/DataAccessGuard";

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

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getYesterdayDateKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

type SavedTemplateRow = { name: string; template: TeamPosterTemplate };

function isTeamPosterTemplate(name: string) {
  return name === TEAM_DAN_POSTER_TEMPLATE_NAME || name.startsWith("team-poster-");
}

async function getTeamPosterTemplates(): Promise<SavedTemplateRow[]> {
  // Filter in the database before applying its row limit. Other shared settings
  // must never crowd older saved team presets out of the downloader.
  const [response,assignmentsResponse]=await Promise.all([fetch('/api/team-poster-templates',{cache:'no-store'}),fetch('/api/data-analysis/manager-assignments',{cache:'no-store'})]);
  const assignments=await assignmentsResponse.json();if(!assignmentsResponse.ok)throw Error(assignments.error||'Could not load manager assignments.');
  const managerGroups=assignments.managerGroups||assignments.assignments?.managerGroups||{};
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Could not load saved team presets.');
  const data=(Array.isArray(result.templates)?result.templates:[]) as {name:string;template_json:TeamPosterTemplate|null;background_url:string|null}[];

  const templates = await Promise.all(
    data
      .filter((row) => isTeamPosterTemplate(String(row.name || "")) && row.template_json && firstClassPosterSide(row.template_json,managerGroups))
      .map(async (row) => ({
        name: String(row.name),
        template: normalizeTemplate({
          ...(row.template_json as TeamPosterTemplate),
          teamSide:firstClassPosterSide(row.template_json as TeamPosterTemplate,managerGroups) as TeamPosterCategory,
          backgroundUrl:(row.template_json as TeamPosterTemplate).backgroundUrl||row.background_url||'',
        })
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

function PosterPreview({ template, renderSignature }: { template: TeamPosterTemplate; renderSignature: string }) {
  return (
    <div
      id="team-dan-poster-preview"
      data-poster-signature={renderSignature}
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
  const [teamsLoading,setTeamsLoading]=useState(true);
  const [teamsError,setTeamsError]=useState("");
  const [teamsRetry,setTeamsRetry]=useState(0);
  const [selectedTemplateName, setSelectedTemplateName] = useState(TEAM_DAN_POSTER_TEMPLATE_NAME);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [pictureCheck, setPictureCheck] = useState<{ checked: number; failed: string[] } | null>(null);
  const [latestStatDate, setLatestStatDate] = useState("");
  const [posterRenderSignature, setPosterRenderSignature] = useState("");
  const posterRenderSignatureRef = useRef("");
  const [missedTeams,setMissedTeams]=useState<string[]>([]);
  const [readyTeams,setReadyTeams]=useState<string[]>([]);

  const preparedPosters=useRef<PreparedTeamPostersHandle>(null);
  const previewScale = 0.42;
  // A browser-local template should enhance the poster, not be required for it.
  // This lets every signed-in user build a poster even when no public custom template exists yet.
  const selectedSavedTemplate = templates.find((item) => item.name === selectedTemplateName)?.template || savedTemplate;
  const visibleTemplate = useMemo(() => template || selectedSavedTemplate || getSavedTemplate() || createDefaultTemplate(), [template, selectedSavedTemplate]);
  const templateCards = templates;
  const templatesBySide = {
    dan: templateCards.filter((item) => (item.template.teamSide || "dan") === "dan"),
    "mike-indi": templateCards.filter((item) => item.template.teamSide === "mike-indi"),
    "sub-agencies": templateCards.filter((item) => item.template.teamSide === "sub-agencies"),
    paradise: templateCards.filter((item) => item.template.teamSide === "paradise"),
    horizon: templateCards.filter((item) => item.template.teamSide === "horizon"),
    trident: templateCards.filter((item) => item.template.teamSide === "trident"),
    respawn: templateCards.filter((item) => item.template.teamSide === "respawn"),
  };
  const visibleSides: TeamPosterCategory[] = ["dan", "mike-indi", "sub-agencies"];

  useEffect(() => {
    let cancelled = false;

    async function loadTemplate() {
      setTeamsLoading(true);setTeamsError('');
      try {
        const savedTemplates=await getTeamPosterTemplates();
        if(cancelled)return;
        setTemplates(savedTemplates);
        const original=savedTemplates.find(item=>item.name===TEAM_DAN_POSTER_TEMPLATE_NAME);
        if(original)setSavedTemplate(original.template);
      }catch(error){if(!cancelled)setTeamsError(error instanceof Error?error.message:'Could not load teams.');}
      finally{if(!cancelled)setTeamsLoading(false);}
    }

    loadTemplate();
    return () => {
      cancelled = true;
    };
  }, [teamsRetry]);

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
    const expectedDate = getYesterdayDateKey();
    if (!response.ok || !/^\d{4}-\d{2}-\d{2}$/.test(statDate)) {
      throw new Error(status.error || "No Creator Daily Stats upload is available.");
    }
    if (statDate !== expectedDate) {
      throw new Error(`Yesterday's data (${expectedDate}) is not ready yet. The newest available upload is ${statDate}, so no posters were downloaded.`);
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
      const renderSignature = `${statDate}:${activeTemplate.managerKey || "team-dan"}:${diamondCreators.map((creator) => creator.username).join(",")}:${hourCreators.map((creator) => creator.username).join(",")}`;
      flushSync(() => { setTemplate(filledTemplate); setPosterRenderSignature(renderSignature); });
      posterRenderSignatureRef.current = renderSignature;
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

  async function downloadAllPosters(side?: TeamPosterCategory | "first-class") {
    if(!preparedPosters.current){setMessage('Checking prepared posters…');return;}
    await preparedPosters.current.download(side||'first-class');
  }

  async function checkPictures() {
    const allItems = templates.length
      ? templates
      : [{ name: TEAM_DAN_POSTER_TEMPLATE_NAME, template: savedTemplate || createDefaultTemplate() }];
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
        const normalizeFallbackUsername = (value: string) => value.trim().replace(/^@/, "").toLowerCase();
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
        ? failed.filter((username) => !(fallbacks.avatars || []).some((avatar: { username: string }) => avatar.username.trim().replace(/^@/, "").toLowerCase() === username.trim().replace(/^@/, "").toLowerCase())).length
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
    if(!preparedPosters.current){setMessage('Checking prepared posters…');return;}
    await preparedPosters.current.download('first-class',item.name);
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
            <button type="button" onClick={() => void downloadAllPosters("first-class")} disabled={loading} className="mb-6 w-full rounded-2xl bg-yellow-300 px-6 py-5 text-lg font-black uppercase tracking-wider text-black hover:bg-yellow-200 disabled:opacity-50">Download All First Class</button>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-200/70">Team Posters</p>
                <h1 className="mt-3 text-4xl font-black uppercase text-yellow-300 md:text-6xl">Team Diamonds Yesterday</h1>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => void checkPictures()} disabled={loading} className="rounded-xl border border-sky-300/40 bg-sky-300/10 px-5 py-3 text-sm font-black uppercase text-sky-100 hover:bg-sky-300/20 disabled:opacity-50">Check Pictures</button>

              </div>
            </div>
            <p className="mt-3 max-w-3xl text-white/60">
              Your saved team presets, ready to download. Layouts and data sources are managed in Posters.
            </p>
          </section>

          <PreparedTeamPosters ref={preparedPosters} onMissingTeamsChange={setMissedTeams} onReadyTeamsChange={setReadyTeams}/>
          <section className="mt-6 space-y-5">
            {teamsError?<div className="rounded-xl border border-red-400/40 p-4 text-red-200">{teamsError}<button type="button" onClick={()=>setTeamsRetry(n=>n+1)} className="ml-3 rounded-lg border px-3 py-2 font-bold">Retry loading teams</button></div>:null}
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
                  <p className="text-xs font-black uppercase tracking-widest text-white/45">Saved preset</p>
                  <h2 className="mt-2 text-2xl font-black uppercase text-yellow-200">{templateLabel(item.name)}</h2>
                  <button type="button" onClick={() => downloadTemplate(item)} disabled={loading || !readyTeams.includes(item.name)} className={`mt-5 w-full rounded-xl px-5 py-4 text-sm font-black uppercase ${readyTeams.includes(item.name)?"bg-green-400 text-black hover:bg-green-300":"bg-red-500 text-white hover:bg-red-400"}`}>{missedTeams.includes(item.name)?"Team missed":`Download ${templateLabel(item.name)}`}</button>
                </article>
                    ))}
                    {!templatesBySide[side].length ? <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-white/45">{teamsLoading?"Loading teams…":teamsError?"Teams could not be loaded.":"No saved presets on this side yet."}</p> : null}
                  </div>
                </div>
              ))}
            </div>
            {message ? <p className="rounded-xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-sm text-yellow-100">{message}</p> : null}
            {pictureCheck ? <div className="rounded-2xl border border-sky-300/25 bg-sky-300/10 p-5"><p className="text-xs font-black uppercase tracking-widest text-sky-100">Picture check — {pictureCheck.checked} creators</p>{pictureCheck.failed.length ? <><p className="mt-2 text-sm text-white/80">Add fallback pictures for these usernames, then run the check again:</p><textarea readOnly value={pictureCheck.failed.join("\n")} rows={Math.min(Math.max(pictureCheck.failed.length, 3), 10)} aria-label="Missing creator usernames" className="mt-3 w-full rounded-xl border border-rose-300/30 bg-black/30 px-3 py-2 font-mono text-sm text-rose-100"/><div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => void copyMissingCreatorList()} className="rounded-xl border border-sky-300/40 bg-sky-300/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-sky-100 hover:bg-sky-300/20">Copy list</button><Link href="/data/fallback-pictures" className="inline-flex rounded-xl bg-sky-300 px-4 py-3 text-xs font-black uppercase tracking-widest text-black hover:bg-sky-200">Open Fallback Pictures</Link></div></> : <p className="mt-2 text-sm font-bold text-green-200">Every creator who will appear in the posters has a picture ready.</p>}</div> : null}
            {downloadProgress ? <div className="rounded-xl border border-sky-300/25 bg-sky-300/10 p-4"><div className="flex items-center justify-between gap-4 text-xs font-black uppercase tracking-widest text-sky-100"><span>Preparing {downloadProgress.label}</span><span>{downloadProgress.current} / {downloadProgress.total}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-sky-300 transition-[width] duration-300" style={{ width: `${Math.round((downloadProgress.current / downloadProgress.total) * 100)}%` }} /></div><p className="mt-2 text-xs text-sky-100/70">Loading creator photos and rendering the poster. Download time after this is controlled by your browser.</p></div> : null}
            <div className="hidden overflow-auto rounded-3xl border border-yellow-300/20 bg-black/50 p-5">
              <div style={{ width: POSTER_WIDTH * previewScale, height: POSTER_HEIGHT * previewScale }}>
                <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
                  <PosterPreview template={visibleTemplate} renderSignature={posterRenderSignature} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </DataAccessGuard>
  );
}
