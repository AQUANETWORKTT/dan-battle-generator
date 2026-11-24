export const POSTER_WIDTH=1024, POSTER_HEIGHT=1536;
export const TEAM_DAN_POSTER_TEMPLATE_NAME="team-dan-poster";
export type CreatorStat = {
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

export type TeamPosterElement = {
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

export type TeamPosterCategory = "dan" | "mike-indi" | "sub-agencies" | "paradise" | "horizon" | "trident" | "respawn";

export type TeamPosterTemplate = {
  backgroundUrl: string;
  backgroundPath?: string;
  managerKey?: string;
  /** Saved download category, chosen in the Team Poster Builder. */
  teamSide?: TeamPosterCategory;
  elements: TeamPosterElement[];
};


export function safeNumber(value: unknown) {
  return Number(String(value || "0").replace(/[^\d.-]/g, "")) || 0;
}

export function formatCompactDiamonds(value: number) {
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

export function durationToHours(value: unknown) {
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

export function getLiveHours(row: CreatorStat) {
  return durationToHours(row.live_hours ?? row.live_duration ?? row["LIVE duration"]);
}

export function formatPosterHours(value: number) {
  if (value <= 0) return "0H";
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}H`;
}


export function dailyPosterRows(rows: CreatorStat[], statDate: string) {
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

export function getUsername(row: CreatorStat) {
  return String(row.creator_username || row["Creator's username"] || "")
    .replace("@", "")
    .trim()
    .toLowerCase();
}

export function isTeamDanRow(row: CreatorStat) {
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

export function getManagerKey(row: CreatorStat) {
  return String(row.manager_email || row.creator_network_manager || row["Creator Network manager"] || "")
    .trim()
    .toLowerCase();
}

// Managers can move between agency mail domains while remaining the same team.
// Compare their stable local-name identity as well as the exact source address.
export function getManagerIdentity(value: string) {
  const localPart = value.trim().toLowerCase().split("@")[0] || "";
  return localPart
    .replace(/^firstclassagency[_.-]?/, "")
    .replace(/[_.-]?(aquaagency|respawnagency|paradiseagency)$/i, "")
    .replace(/[^a-z0-9]/g, "");
}

export function managerKeysMatch(rowManagerKey: string, templateManagerKey: string) {
  const normalizeManagerKey = (value: string) => {
    const normalized = value.replace(/[^a-z0-9]/g, "");
    // Templates saved before the split referred to Kayden as "kaydenmads".
    // Keep those templates working without ever including BMW E46 / Mads.
    return ["kaydenmads", "firstclassagencykaydenoutlookcom"].includes(normalized)
      ? "firstclassagencykaydenoutlookcom"
      : normalized;
  };
  const normalizedRowKey = normalizeManagerKey(rowManagerKey);
  const normalizedTemplateKey = normalizeManagerKey(templateManagerKey);
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
const BRANDY_MANAGER_KEYS = ["brandyfalconer33", "brandyfalconer35"];
const KYRAN_MANAGER_KEY = "firstclassagencykyranoutlookcom";

export function effectiveManagerKey(row: CreatorStat) {
  const raw = getManagerKey(row).replace(/[^a-z0-9]/g, "");
  return BRANDY_MANAGER_KEYS.some((key) => raw.includes(key)) ? KYRAN_MANAGER_KEY : raw;
}

export function matchesTemplateManager(row: CreatorStat, template: TeamPosterTemplate, managerGroups: Record<string, string> = {}) {
  const managerKey = (template.managerKey || "team-dan").trim().toLowerCase();
  if (managerKey === "team-dan") return isTeamDanRow(row);
  if (managerKey === "combined:lisa-g") {
    const rowManagerKey = effectiveManagerKey(row);
    return TEAM_LISA_G_MANAGER_KEYS.some((key) => rowManagerKey.includes(key));
  }
  const selectedGroup = TEAM_POSTER_GROUP_SOURCES[managerKey];
  if (selectedGroup) {
    return managerGroups[effectiveManagerKey(row)] === selectedGroup;
  }
  if (managerKey === "first-class-all") {
    // The whole-agency poster follows the current Manager Assignments
    // configuration, rather than a possibly stale agency value on the row.
    const group = managerGroups[effectiveManagerKey(row)];
    return group === "Team Dan / James" || group === "Team Mike / Indi";
  }
  return managerKeysMatch(effectiveManagerKey(row), managerKey);
}

export function createDefaultTemplate(): TeamPosterTemplate {
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

export function normalizeTemplate(input: Partial<TeamPosterTemplate> | null): TeamPosterTemplate {
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


export function templateLabel(name: string) {
  if (name === TEAM_DAN_POSTER_TEMPLATE_NAME) return "Team Dan + James";
  return name
    .replace(/^team-poster-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function templateSlug(label: string) {
  return `team-poster-${label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "new-team"}`;
}

export const TEAM_POSTER_CATEGORY_LABELS: Record<TeamPosterCategory, string> = {
  dan: "Team Dan + James",
  "mike-indi": "Team Mike + Indi",
  "sub-agencies": "Whole Agencies",
  paradise: "Paradise",
  horizon: "Horizon",
  trident: "Trident",
  respawn: "Respawn",
};

export function teamPosterCategoryLabel(category: TeamPosterCategory) {
  return TEAM_POSTER_CATEGORY_LABELS[category];
}


export function fallbackAvatarFor(username: string, fallbackAvatars: Record<string, string> = {}) {
  const exact = username.trim().replace(/^@/, "").toLowerCase();
  if (fallbackAvatars[exact]) return fallbackAvatars[exact];
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

