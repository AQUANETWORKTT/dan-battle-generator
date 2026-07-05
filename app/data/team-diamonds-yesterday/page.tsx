"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { saveAs } from "file-saver";
import { toBlob } from "html-to-image";
import DataAccessGuard from "../../components/DataAccessGuard";

type CreatorStat = {
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
};

type TeamPosterElement = {
  id: string;
  kind: "avatar" | "username" | "diamonds" | "text";
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
  elements: TeamPosterElement[];
};

const TEMPLATE_STORAGE_KEY = "dan-team-diamonds-poster-template-v1";
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
  const startY = 455;
  const rowGap = 103;

  for (let index = 0; index < 10; index += 1) {
    const rowY = startY + index * rowGap;
    elements.push({ id: `avatar-${index + 1}`, kind: "avatar", x: 145, y: rowY, width: 92, height: 92, value: "" });
    elements.push({ id: `username-${index + 1}`, kind: "username", x: 275, y: rowY + 15, width: 430, height: 58, value: "", fontFamily: "Luckiest Guy", fontSize: 42, color: "#FFFFFF", fontWeight: 900 });
    elements.push({ id: `diamonds-${index + 1}`, kind: "diamonds", x: 725, y: rowY + 15, width: 210, height: 58, value: "", fontFamily: "Luckiest Guy", fontSize: 42, color: "#FACC15", fontWeight: 900 });
  }

  return { backgroundUrl: "", elements };
}

function normalizeTemplate(input: Partial<TeamPosterTemplate> | null): TeamPosterTemplate {
  const base = createDefaultTemplate();
  const byId = new Map((input?.elements || []).map((element) => [element.id, element]));
  return {
    backgroundUrl: input?.backgroundUrl || "",
    elements: base.elements.map((element) => ({ ...element, ...(byId.get(element.id) || {}) })),
  };
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
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const previewScale = 0.42;
  const visibleTemplate = useMemo(() => template || getSavedTemplate(), [template]);

  async function buildPreview() {
    setLoading(true);
    setMessage("");

    try {
      const savedTemplate = getSavedTemplate();
      if (!savedTemplate) {
        setMessage("Save a Team Dan Poster Builder template in the poster generator first.");
        return;
      }

      const month = getCurrentMonth();
      const yesterday = getYesterdayDateKey();
      const res = await fetch(`/api/data-analysis/daily-stats?month=${month}&t=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load Daniel daily stats.");

      const rows = ((json.rows || []) as CreatorStat[])
        .filter((row) => row.stat_date === yesterday)
        .filter(isTeamDanRow)
        .filter((row) => getUsername(row))
        .filter((row) => getUsername(row) !== EXCLUDED_USERNAME)
        .sort((a, b) => safeNumber(b.diamonds) - safeNumber(a.diamonds))
        .slice(0, 10);

      if (!rows.length) {
        setMessage(`No Team Dan rows found for ${yesterday}.`);
        return;
      }

      const rowsWithAvatars = await Promise.all(
        rows.map(async (row) => {
          const username = getUsername(row);
          return {
            username,
            diamonds: safeNumber(row.diamonds),
            avatar: await fetchTikTokAvatar(username),
          };
        })
      );

      const filledTemplate: TeamPosterTemplate = {
        ...savedTemplate,
        elements: savedTemplate.elements.map((element) => {
          const match = element.id.match(/^(avatar|username|diamonds)-(\d+)$/);
          if (!match) return element;
          const row = rowsWithAvatars[Number(match[2]) - 1];
          if (!row) return element.kind === "avatar" ? { ...element, imageUrl: "" } : { ...element, value: "" };
          if (element.kind === "avatar") return { ...element, imageUrl: row.avatar, value: row.username };
          if (element.kind === "username") return { ...element, value: row.username.toUpperCase() };
          if (element.kind === "diamonds") return { ...element, value: formatCompactDiamonds(row.diamonds) };
          return element;
        }),
      };

      setTemplate(filledTemplate);
      setMessage(`Preview built from Team Dan top ${rowsWithAvatars.length} for ${yesterday}.`);
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
              Uses Daniel creator daily stats, filters firstclassagency_dan@outlook.com, sorts yesterday by diamonds, fills the saved poster template, and downloads the final PNG.
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
