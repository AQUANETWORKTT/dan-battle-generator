"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { saveAs } from "file-saver";
import { toBlob } from "html-to-image";
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

type TeamPosterTemplate = {
  backgroundUrl: string;
  backgroundPath?: string;
  elements: TeamPosterElement[];
};

const TEMPLATE_STORAGE_KEY = "dan-team-diamonds-poster-template-v1";
const TEAM_DAN_POSTER_TEMPLATE_NAME = "team-dan-poster";
const POSTER_WIDTH = 1024;
const POSTER_HEIGHT = 1536;
const EXCLUDED_USERNAME = "allannah.unknown444";

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

  return managerEmail === "firstclassagency_dan@outlook.com";
}

function createDefaultTemplate(): TeamPosterTemplate {
  const elements: TeamPosterElement[] = [];
  const rowGap = 98;

  const addLeaderboardRow = (group: "diamonds" | "hours", index: number, rowY: number) => {
    const suffix = group === "diamonds" ? `${index + 1}` : `hours-${index + 1}`;
    const valueId = group === "diamonds" ? `diamonds-${index + 1}` : `hours-${index + 1}`;
    const valueColor = group === "diamonds" ? "#FACC15" : "#38BDF8";
    elements.push({ id: `avatar-${suffix}`, kind: "avatar", x: 145, y: rowY, width: 92, height: 92, value: "" });
    elements.push({ id: `username-${suffix}`, kind: "username", x: 275, y: rowY + 15, width: 430, height: 58, value: "", fontFamily: "Luckiest Guy", fontSize: 42, color: "#FFFFFF", fontWeight: 900 });
    elements.push({ id: valueId, kind: group, x: 725, y: rowY + 15, width: 210, height: 58, value: "", fontFamily: "Luckiest Guy", fontSize: 42, color: valueColor, fontWeight: 900 });
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
    elements: base.elements.map((element) => ({ ...element, ...(byId.get(element.id) || {}) })),
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

async function fetchTikTokAvatar(username: string) {
  const cleanUsername = username.replace("@", "").trim().toLowerCase();
  if (!cleanUsername) return "";
  const refreshKey = Date.now();

  try {
    const res = await fetch("/api/tiktok-avatar-v2", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", Pragma: "no-cache" },
      body: JSON.stringify({ username: cleanUsername, forceRefresh: true, refresh: refreshKey }),
    });
    const json = await res.json();
    if (!json.avatar) return "";
    return `/api/tiktok-avatar-image?url=${encodeURIComponent(json.avatar)}&refresh=${refreshKey}`;
  } catch {
    return "";
  }
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

function PosterPreview({ template }: { template: TeamPosterTemplate }) {
  return (
    <div
      id="team-dan-poster-preview"
      className="relative overflow-hidden bg-black"
      style={{
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        backgroundImage: template.backgroundUrl
          ? `url(${template.backgroundUrl})`
          : "linear-gradient(180deg, #090909 0%, #241d05 55%, #050505 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {template.elements.map((element) => (
        <div
          key={element.id}
          className="absolute flex items-center justify-center overflow-hidden"
          style={{
            left: element.x,
            top: element.y,
            width: element.width,
            height: element.height,
            borderRadius: element.kind === "avatar" ? 999 : 0,
            color: element.color || "#FACC15",
            fontFamily: element.fontFamily || "Luckiest Guy",
            fontSize: element.fontSize || 42,
            fontWeight: element.fontWeight || 900,
            textShadow: element.kind === "avatar" ? undefined : "3px 3px 0 #000",
            whiteSpace: "nowrap",
          }}
        >
          {element.kind === "avatar" ? (
            element.imageUrl ? <img src={element.imageUrl} alt="" className="h-full w-full object-cover" /> : null
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
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const previewScale = 0.42;
  const visibleTemplate = useMemo(() => template || savedTemplate || getSavedTemplate(), [template, savedTemplate]);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplate() {
      const publicTemplate = await getPublicSavedTemplate();
      if (!cancelled && publicTemplate) setSavedTemplate(publicTemplate);
    }

    loadTemplate();
    return () => {
      cancelled = true;
    };
  }, []);

  async function buildPreview() {
    setLoading(true);
    setMessage("");

    try {
      const publicTemplate = await getPublicSavedTemplate();
      const activeTemplate = publicTemplate || savedTemplate || getSavedTemplate();
      if (!activeTemplate) {
        setMessage("Save a Team Dan Poster Builder template in the poster generator first.");
        return;
      }
      if (publicTemplate) setSavedTemplate(publicTemplate);

      const month = getCurrentMonth();
      const yesterday = getYesterdayDateKey();
      const res = await fetch(`/api/data-analysis/daily-stats?month=${month}&t=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load Daniel daily stats.");

      const rows = ((json.rows || []) as CreatorStat[])
        .filter((row) => row.stat_date === yesterday)
        .filter(isTeamDanRow)
        .filter((row) => getUsername(row))
        .filter((row) => getUsername(row) !== EXCLUDED_USERNAME);

      if (!rows.length) {
        setMessage(`No Team Dan rows found for ${yesterday}.`);
        return;
      }

      const diamondRows = [...rows]
        .sort((a, b) => safeNumber(b.diamonds) - safeNumber(a.diamonds))
        .slice(0, 5);
      const hourRows = [...rows]
        .sort((a, b) => getLiveHours(b) - getLiveHours(a))
        .slice(0, 5);
      const avatarByUsername = new Map<string, string>();

      await Promise.all(
        Array.from(new Set([...diamondRows, ...hourRows].map(getUsername))).map(async (username) => {
          avatarByUsername.set(username, await fetchTikTokAvatar(username));
        })
      );

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

      setTemplate(filledTemplate);
      setMessage(`Preview built from Team Dan top 5 diamonds and top 5 hours for ${yesterday}.`);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Could not build Team Dan poster.");
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
    saveAs(blob, `team-dan-diamonds-yesterday-${getYesterdayDateKey()}.png`);
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
            <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-200/70">Team Dan</p>
            <h1 className="mt-3 text-4xl font-black uppercase text-yellow-300 md:text-6xl">Team Diamonds Yesterday</h1>
            <p className="mt-3 max-w-3xl text-white/60">
              Uses Daniel creator daily stats, filters firstclassagency_dan@outlook.com, fills the saved poster template with top 5 diamonds and top 5 live hours, and downloads the final PNG.
            </p>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="space-y-4 rounded-3xl border border-yellow-300/20 bg-black/50 p-5">
              <div>
                <p className="text-xs font-black uppercase text-white/45">Team</p>
                <p className="mt-2 text-lg font-black text-yellow-200">firstclassagency_dan@outlook.com</p>
              </div>
              <button type="button" onClick={buildPreview} disabled={loading} className="w-full rounded-xl bg-yellow-300 px-5 py-4 text-sm font-black uppercase text-black hover:bg-yellow-200 disabled:opacity-50">
                {loading ? "Building..." : "Preview"}
              </button>
              <button type="button" onClick={downloadPoster} disabled={loading} className="w-full rounded-xl bg-green-400 px-5 py-4 text-sm font-black uppercase text-black hover:bg-green-300 disabled:opacity-50">
                Download Poster
              </button>
              {message ? <p className="rounded-xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-sm text-yellow-100">{message}</p> : null}
            </div>

            <div className="overflow-auto rounded-3xl border border-yellow-300/20 bg-black/50 p-5">
              {visibleTemplate ? (
                <div style={{ width: POSTER_WIDTH * previewScale, height: POSTER_HEIGHT * previewScale }}>
                  <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
                    <PosterPreview template={visibleTemplate} />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/55">
                  Save a Team Dan template in the poster generator first.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </DataAccessGuard>
  );
}
