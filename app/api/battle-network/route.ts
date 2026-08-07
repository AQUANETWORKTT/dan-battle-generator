import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const SETTINGS_NAME = "battle-network-settings";
const BUILT_IN_AGENCIES = [
  { id: "paradise", name: "PARADISE", password: "GEE56", accent: "#d6a65e", logoUrl: "/agency-logos/paradise.png" },
  { id: "respawn", name: "RESPAWN", password: "NICK12", accent: "#28d7c3", logoUrl: "/agency-logos/respawn.png" },
  { id: "horizon", name: "HORIZON", password: "DENS34", accent: "#f97316", logoUrl: "/agency-logos/horizon.png" },
  { id: "trident", name: "TRIDENT", password: "MARCY78", accent: "#38bdf8", logoUrl: "/agency-logos/trident.png" },
  { id: "first-class-dan-james", name: "FIRST CLASS DAN / JAMES", password: "DAN44", accent: "#facc15", logoUrl: "/logo.png" },
  { id: "honey-bloom", name: "HONEY BLOOM", password: "ABY33", accent: "#f5b942", logoUrl: "" },
];

type Agency = { id: string; name: string; password: string; accent: string; logoUrl?: string };
type Battle = { id: string; agencyId: string; weekStart: string; day: string; creatorUsername: string; manager: string; size: string; powerUps: "POWER-UPS ALLOWED" | "NPU"; requestedTime: string; actualTime: string; opponentBattleId?: string; createdAt: string };
type Store = { agencies?: Agency[]; battles?: Battle[] };
type AssignmentSettings = { managerGroups?: Record<string, string>; managerNames?: Record<string, string> };

function key(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function publicAgency(agency: Agency) { const { password: _password, ...publicValue } = agency; return publicValue; }
function normaliseBattle(value: unknown): Battle | null { const row = value as Record<string, unknown>; const creatorUsername = String(row?.creatorUsername || "").trim().replace(/^@/, ""); const agencyId = key(String(row?.agencyId || "")); if (!creatorUsername || !agencyId) return null; return { id: String(row.id || crypto.randomUUID()), agencyId, weekStart: String(row.weekStart || ""), day: String(row.day || "MONDAY"), creatorUsername, manager: String(row.manager || "").trim(), size: String(row.size || "LESS THAN 1K"), powerUps: String(row.powerUps || "").toUpperCase() === "NPU" ? "NPU" : "POWER-UPS ALLOWED", requestedTime: String(row.requestedTime || ""), actualTime: String(row.actualTime || row.requestedTime || ""), opponentBattleId: String(row.opponentBattleId || "") || undefined, createdAt: String(row.createdAt || new Date().toISOString()) }; }
function normaliseStore(value: unknown): Store { const raw = (value || {}) as Store; const custom = Array.isArray(raw.agencies) ? raw.agencies.filter((agency): agency is Agency => !!agency?.id && !!agency?.name && !!agency?.password).map((agency) => ({ ...agency, id: key(agency.id), name: agency.name.toUpperCase(), accent: agency.accent || "#94a3b8" })) : []; const agencies = [...BUILT_IN_AGENCIES, ...custom.filter((agency) => !BUILT_IN_AGENCIES.some((builtIn) => builtIn.id === agency.id))]; const battles = Array.isArray(raw.battles) ? raw.battles.map(normaliseBattle).filter((battle): battle is Battle => !!battle) : []; return { agencies, battles }; }
async function readStore() { const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle(); if (error) throw new Error(error.message); return normaliseStore((data?.template_json as Store | null) || {}); }
async function writeStore(store: Store) { const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json: store, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" }); if (error) throw new Error(error.message); }

async function managerOptions() {
  const { data } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", "manager-assignment-settings").maybeSingle();
  const settings = ((data?.template_json as { assignments?: AssignmentSettings } | null)?.assignments || {});
  const groups = settings.managerGroups || {}, names = settings.managerNames || {};
  const result: Record<string, string[]> = {};
  for (const [rawKey, group] of Object.entries(groups)) {
    if (["excluded", "recruitment", "new managers"].includes(group.toLowerCase())) continue;
    const label = names[rawKey] || names[rawKey.toLowerCase().replace(/[^a-z0-9]/g, "")] || `TEAM ${rawKey}`;
    const lowered = group.toLowerCase();
    const targets = [
      ["paradise", "paradise"], ["respawn", "respawn"], ["horizon", "horizon"], ["trident", "trident"], ["first-class-dan-james", "team dan"],
    ] as const;
    for (const [agencyId, needle] of targets) if (lowered.includes(needle)) (result[agencyId] ||= []).push(label.toUpperCase());
  }
  Object.values(result).forEach((list) => list.sort());
  return result;
}

export async function GET() { try { const store = await readStore(); return NextResponse.json({ agencies: store.agencies?.map(publicAgency), battles: store.battles, managers: await managerOptions() }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "COULD NOT LOAD BATTLE NETWORK." }, { status: 500 }); } }

export async function POST(request: Request) {
  try {
    const body = await request.json(); const store = await readStore(); const agencies = store.agencies || [], battles = store.battles || [];
    if (body.action === "login") { const password = String(body.password || "").trim().toUpperCase(); const agency = agencies.find((entry) => entry.password.toUpperCase() === password); if (!agency) return NextResponse.json({ error: "ACCESS DENIED." }, { status: 401 }); return NextResponse.json({ agency: publicAgency(agency) }); }
    if (body.action === "register") { const name = String(body.name || "").trim().toUpperCase(), password = String(body.password || "").trim().toUpperCase(); const id = key(name); if (!name || !password || id.length < 3) return NextResponse.json({ error: "ENTER AN AGENCY NAME AND PASSWORD." }, { status: 400 }); if (agencies.some((agency) => agency.id === id)) return NextResponse.json({ error: "THAT AGENCY IS ALREADY REGISTERED." }, { status: 409 }); const agency: Agency = { id, name, password, accent: "#94a3b8", logoUrl: String(body.logoUrl || "") }; await writeStore({ agencies: [...agencies, agency], battles }); return NextResponse.json({ agency: publicAgency(agency) }); }
    if (body.action === "save-battle") { const battle = normaliseBattle(body.battle); if (!battle) return NextResponse.json({ error: "ENTER A CREATOR USERNAME." }, { status: 400 }); const existing = battles.find((entry) => entry.id === battle.id); if (existing?.opponentBattleId) return NextResponse.json({ error: "CONFIRMED BATTLES ARE LOCKED." }, { status: 409 }); const next = existing ? battles.map((entry) => entry.id === battle.id ? { ...battle, createdAt: existing.createdAt } : entry) : [battle, ...battles]; await writeStore({ agencies, battles: next }); return NextResponse.json({ battle }); }
    if (body.action === "claim-battle") { const source = battles.find((entry) => entry.id === String(body.sourceId)); const agency = agencies.find((entry) => entry.id === key(String(body.agencyId || ""))); const creatorUsername = String(body.creatorUsername || "").trim().replace(/^@/, ""); const manager = String(body.manager || "").trim(); const requestedTime = String(body.requestedTime || source?.requestedTime || ""); if (!source || source.opponentBattleId || !agency || !creatorUsername || !manager || !requestedTime) return NextResponse.json({ error: "COMPLETE YOUR CREATOR, MANAGER AND REQUESTED TIME." }, { status: 409 }); if (source.agencyId === agency.id) return NextResponse.json({ error: "CHOOSE A CREATOR FROM A DIFFERENT AVAILABLE BATTLE." }, { status: 409 }); const newBattle: Battle = { id: crypto.randomUUID(), agencyId: agency.id, weekStart: source.weekStart, day: source.day, creatorUsername, manager, size: source.size, powerUps: source.powerUps, requestedTime, actualTime: requestedTime, opponentBattleId: source.id, createdAt: new Date().toISOString() }; const next = battles.map((entry) => entry.id === source.id ? { ...entry, opponentBattleId: newBattle.id } : entry); next.push(newBattle); await writeStore({ agencies, battles: next }); return NextResponse.json({ battles: next, battle: newBattle }); }
    if (body.action === "match") { const first = battles.find((entry) => entry.id === String(body.firstId)); const second = battles.find((entry) => entry.id === String(body.secondId)); const close = Boolean(body.close); if (!first || !second || first.id === second.id || first.opponentBattleId || second.opponentBattleId) return NextResponse.json({ error: "THAT BATTLE IS NO LONGER AVAILABLE." }, { status: 409 }); const toMinutes = (value: string) => { const [hours = "0", minutes = "0"] = value.split(":"); return Number(hours) * 60 + Number(minutes); }; const closeEnough = Math.abs(toMinutes(first.requestedTime) - toMinutes(second.requestedTime)) > 0 && Math.abs(toMinutes(first.requestedTime) - toMinutes(second.requestedTime)) <= 60 && toMinutes(first.requestedTime) >= 18 * 60 && toMinutes(second.requestedTime) >= 18 * 60; if (first.day !== second.day || first.size !== second.size || first.powerUps !== second.powerUps || (!close && first.requestedTime !== second.requestedTime) || (close && !closeEnough)) return NextResponse.json({ error: close ? "CLOSE MATCHES MUST BE WITHIN ONE HOUR AFTER 6 PM." : "BATTLES MUST MATCH ON DAY, TIME, SIZE AND POWER-UP RULES." }, { status: 409 }); const next = battles.map((entry) => entry.id === first.id ? { ...entry, opponentBattleId: second.id, actualTime: close ? second.requestedTime : first.actualTime } : entry.id === second.id ? { ...entry, opponentBattleId: first.id } : entry); await writeStore({ agencies, battles: next }); return NextResponse.json({ battles: next }); }
    return NextResponse.json({ error: "UNKNOWN BATTLE NETWORK ACTION." }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "COULD NOT SAVE BATTLE NETWORK." }, { status: 500 }); }
}
