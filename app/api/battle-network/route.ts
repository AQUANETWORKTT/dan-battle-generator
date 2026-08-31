import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";
import { AGENCY_COLUMNS, BATTLE_COLUMNS, toAgency, toBattle } from "@/lib/battle-network-data";

const SETTINGS_NAME = "battle-network-settings";
const BATTLE_CALENDAR_SETTINGS_NAME = "battle-calendar-settings";
const EXTERNAL_PASSWORD = "BATTLE";
const MASTER_PASSWORDS = new Set(["DAN44"]);
const clean = (value: unknown) => String(value || "").trim().replace(/^@/, "");
const key = (value: unknown) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const creatorKey = (value: unknown) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const time = (value: unknown) => String(value || "").slice(0, 5);
const matchRule = (value: unknown) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const isDfjdbotManager = (value: unknown) => String(value || "").toUpperCase().replace(/[^A-Z]/g, "") === "DFJD";
const currentWeekStart = () => { const date = new Date(); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return date.toISOString().slice(0, 10); };
const recentWeekStart = () => { const date = new Date(); date.setDate(date.getDate() - 14); return date.toISOString().slice(0, 10); };
const historyWeekStart = (weekStart: string) => { const date = new Date(`${weekStart}T12:00:00`); date.setDate(date.getDate() - 14); return date.toISOString().slice(0, 10); };
const endWeekStart = (weekStart: string) => { const date = new Date(`${weekStart}T12:00:00`); date.setDate(date.getDate() + 7); return date.toISOString().slice(0, 10); };
const payload = (battle: Record<string, unknown>) => ({
  id: battle.id || crypto.randomUUID(), agency_id: key(battle.agencyId), week_start: battle.weekStart,
  day: String(battle.day || "MONDAY"), creator_username: clean(battle.creatorUsername), manager: clean(battle.manager), size: String(battle.size || "LESS THAN 1K"),
  power_ups: String(battle.powerUps).toUpperCase() === "NPU" ? "NPU" : "POWER-UPS ALLOWED", requested_time: time(battle.requestedTime), actual_time: time(battle.actualTime || battle.requestedTime),
});

function battleDate(weekStart: string, day: string) {
  const offset = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].indexOf(day.toUpperCase());
  if (offset < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return "";
  const date = new Date(`${weekStart}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

async function syncDfjdbattleToCalendar(first: ReturnType<typeof toBattle>, second: ReturnType<typeof toBattle>) {
  const source = isDfjdbotManager(first.manager) ? first : isDfjdbotManager(second.manager) ? second : null;
  const opponent = source?.id === first.id ? second : first;
  if (!source || !opponent) return;
  const date = battleDate(source.weekStart, source.day);
  if (!date || !source.actualTime) return;
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", BATTLE_CALENDAR_SETTINGS_NAME).maybeSingle();
  if (error) throw new Error(error.message);
  const settings = (data?.template_json && typeof data.template_json === "object" ? data.template_json : {}) as Record<string, unknown>;
  const battles = Array.isArray(settings.battles) ? settings.battles as Record<string, unknown>[] : [];
  const exists = battles.some((battle) => battle.date === date && String(battle.manager || "").toUpperCase().replace(/[^A-Z]/g, "") === String(source.manager || "").toUpperCase().replace(/[^A-Z]/g, "") && battle.time === source.actualTime && battle.creator === source.creatorUsername && battle.opponent === opponent.creatorUsername);
  if (exists) return;
  const nextBattle = { id: crypto.randomUUID(), date, time: source.actualTime, creator: source.creatorUsername, opponent: opponent.creatorUsername, manager: source.manager, size: source.size, agency: opponent.agencyId, type: "ARRANGED BATTLE", notified: [], reminders: {} };
  const { error: saveError } = await submissionsSupabase.from("poster_templates").upsert({ name: BATTLE_CALENDAR_SETTINGS_NAME, template_json: { ...settings, battles: [...battles, nextBattle] }, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
  if (saveError) throw new Error(saveError.message);
}

async function settings() {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", SETTINGS_NAME).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.template_json || {}) as Record<string, unknown>;
}
type Incompatibility = { first: string; second: string; reason: string };
function incompatibilities(value: unknown): Incompatibility[] {
  const items = (value && typeof value === "object" ? value as Record<string, unknown> : {}).incompatibilities;
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.flatMap((item): Incompatibility[] => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const first = creatorKey(row.first), second = creatorKey(row.second), reason = clean(row.reason);
    const pair = [first, second].sort().join(":");
    if (!first || !second || first === second || seen.has(pair)) return [];
    seen.add(pair); return [{ first, second, reason }];
  });
}
function incompatible(items: Incompatibility[], first: unknown, second: unknown) {
  const left = creatorKey(first), right = creatorKey(second);
  return items.find((item) => (item.first === left && item.second === right) || (item.first === right && item.second === left));
}
type CreatorBlock = { creator: string; agencyIds: string[] };
function creatorBlocks(value: unknown): CreatorBlock[] {
  const items = (value && typeof value === "object" ? value as Record<string, unknown> : {}).creatorBlocks;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item): CreatorBlock[] => { const row = item && typeof item === "object" ? item as Record<string, unknown> : {}; const creator = creatorKey(row.creator); const agencyIds = Array.isArray(row.agencyIds) ? [...new Set(row.agencyIds.map(key).filter(Boolean))] : []; return creator && agencyIds.length ? [{ creator, agencyIds }] : []; });
}
function blockedFromAgency(blocks: CreatorBlock[], creator: unknown, agencyId: unknown) { return blocks.some((block) => block.creator === creatorKey(creator) && block.agencyIds.includes(key(agencyId))); }
async function saveSettings(next: Record<string, unknown>) {
  // Battles live exclusively in battle_network_battles. Strip the retired
  // settings copy so old schedules cannot bloat or delay the battle page.
  const { battles: _retiredBattleCache, agencies: _retiredAgencyCache, ...settingsOnly } = next;
  const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: SETTINGS_NAME, template_json: settingsOnly, background_url: null, updated_at: new Date().toISOString() }, { onConflict: "name" });
  if (error) throw new Error(error.message);
}
async function battle(id: string) {
  const { data, error } = await submissionsSupabase.from("battle_network_battles").select(BATTLE_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toBattle(data) : null;
}
async function audit(action: string, battleRow: ReturnType<typeof toBattle> | null, actorAgencyId?: string, opponentBattleId?: string) {
  if (!battleRow) return;
  const { error } = await submissionsSupabase.from("battle_network_audit_log").insert({ action, actor_agency_id: actorAgencyId || battleRow.agencyId, battle_id: battleRow.id, opponent_battle_id: opponentBattleId || battleRow.opponentBattleId || null, details: { creator: battleRow.creatorUsername, agency: battleRow.agencyId, day: battleRow.day, requestedTime: battleRow.requestedTime } });
  if (error) console.error("[battle-network] audit failed", error.message);
}
async function hasDuplicateBattle(row: { agency_id: string; week_start: string; day: string; creator_username: string; requested_time: string }, excludeId?: string) {
  let query = submissionsSupabase.from("battle_network_battles").select("id").eq("agency_id", row.agency_id).eq("week_start", row.week_start).eq("day", row.day).eq("requested_time", row.requested_time).ilike("creator_username", row.creator_username);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}

export async function GET(request: Request) {
  const startedAt = performance.now();
  try {
    const url = new URL(request.url);
    const includePasswords = url.searchParams.get("settings") === "1";
    const history = url.searchParams.get("history") === "1";
    const weekStart = url.searchParams.get("week") || currentWeekStart();
    const [agencies, battles, layout] = await Promise.all([
      submissionsSupabase.from("battle_network_agencies").select(includePasswords ? `${AGENCY_COLUMNS},password` : AGENCY_COLUMNS).order("name"),
      submissionsSupabase.from("battle_network_battles").select(BATTLE_COLUMNS).gte("week_start", historyWeekStart(weekStart)).lte("week_start", endWeekStart(weekStart)).not("creator_username", "ilike", "test-%").order("created_at", { ascending: false }), settings(),
    ]);
    if (agencies.error || battles.error) throw new Error(agencies.error?.message || battles.error?.message);
    const response = NextResponse.json({ agencies: ((agencies.data || []) as unknown as Record<string, unknown>[]).map((agency) => includePasswords ? { ...toAgency(agency), password: String(agency.password || "") } : toAgency(agency)), battles: ((battles.data || []) as unknown as Record<string, unknown>[]).map(toBattle), cardLayout: layout.cardLayout, cardTypography: layout.cardTypography, managerSettings: layout.managerSettings || {}, incompatibilities: incompatibilities(layout), creatorBlocks: creatorBlocks(layout) });
    response.headers.set("Server-Timing", `supabase;dur=${Math.round(performance.now() - startedAt)}`);
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "COULD NOT LOAD BATTLE NETWORK." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (["delete-battle", "admin-delete-battle", "cancel-match"].includes(body.action)) { const target = await battle(String(body.battleId)); await audit(body.action, target, key(body.agencyId)); }
    if (body.action === "match") { const [firstAudit, secondAudit] = await Promise.all([battle(String(body.firstId)), battle(String(body.secondId))]); await Promise.all([audit("match", firstAudit, firstAudit?.agencyId, secondAudit?.id), audit("matched-against", secondAudit, firstAudit?.agencyId, firstAudit?.id)]); }
    if (body.action === "external-login") return String(body.password || "").trim().toUpperCase() === EXTERNAL_PASSWORD ? NextResponse.json({ agency: { id: "external-agency", name: "EXTERNAL AGENCY", accent: "#94a3b8" } }) : NextResponse.json({ error: "ACCESS DENIED." }, { status: 401 });
    if (body.action === "external-select") { const { data, error } = await submissionsSupabase.from("battle_network_agencies").select("id,name,password,external_only").eq("id", key(body.agencyId)).maybeSingle(); if (error) throw new Error(error.message); if (!data?.external_only || String(data.password || "").toUpperCase() !== clean(body.password).toUpperCase()) return NextResponse.json({ error: "ACCESS DENIED." }, { status: 401 }); return NextResponse.json({ ok: true, agency: { id: data.id, name: data.name } }); }
    if (body.action === "login") { const password = String(body.password || "").trim().toUpperCase(); const selectedAgencyId = key(body.agencyId); const query = submissionsSupabase.from("battle_network_agencies").select("id,name,accent,logo_url,external_only,password").eq("external_only", false); const { data, error } = await (selectedAgencyId ? query.eq("id", selectedAgencyId).maybeSingle() : query.eq("password", password).maybeSingle()); if (error) throw new Error(error.message); const allowed = data && (String(data.password || "").toUpperCase() === password || MASTER_PASSWORDS.has(password)); return allowed ? NextResponse.json({ agency: toAgency(data) }) : NextResponse.json({ error: "ACCESS DENIED." }, { status: 401 }); }
    if (body.action === "save-card-layout") { const current = await settings(); const next = { ...current, cardLayout: body.cardLayout, cardTypography: body.cardTypography }; await saveSettings(next); return NextResponse.json({ cardLayout: body.cardLayout, cardTypography: body.cardTypography }); }
    if (body.action === "save-manager-settings") { const current = await settings(); const next = { ...current, managerSettings: body.managerSettings || {} }; await saveSettings(next); return NextResponse.json({ managerSettings: next.managerSettings }); }
    if (body.action === "save-incompatibilities") { const current = await settings(); const next = { ...current, incompatibilities: incompatibilities({ incompatibilities: body.incompatibilities }) }; await saveSettings(next); return NextResponse.json({ incompatibilities: next.incompatibilities }); }
    if (body.action === "save-creator-blocks") { const current = await settings(); const next = { ...current, creatorBlocks: creatorBlocks({ creatorBlocks: body.creatorBlocks }) }; await saveSettings(next); return NextResponse.json({ creatorBlocks: next.creatorBlocks }); }
    if (body.action === "register" || body.action === "register-external-agency") { const name = clean(body.name).toUpperCase(), id = key(name), external = body.action === "register-external-agency"; if (!id || (!external && !clean(body.password))) return NextResponse.json({ error: "COMPLETE THE AGENCY DETAILS." }, { status: 400 }); const { data, error } = await submissionsSupabase.from("battle_network_agencies").insert({ id, name, accent: body.accent || "#94a3b8", logo_url: body.logoUrl || "", external_only: external, password: clean(body.password).toUpperCase() }).select(AGENCY_COLUMNS).single(); if (error) return NextResponse.json({ error: error.message.includes("duplicate") ? "THAT AGENCY IS ALREADY ON THE LIST." : error.message }, { status: 409 }); return NextResponse.json({ agency: toAgency(data) }); }
    if (body.action === "rename-agency") { const id = key(body.agencyId); const name = clean(body.name).toUpperCase(); if (!id || !name) return NextResponse.json({ error: "COMPLETE THE AGENCY NAME." }, { status: 400 }); const { data, error } = await submissionsSupabase.from("battle_network_agencies").update({ name }).eq("id", id).select(AGENCY_COLUMNS).single(); if (error) throw new Error(error.message); return NextResponse.json({ agency: toAgency(data) }); }
    if (body.action === "save-external-agency" || body.action === "save-agency") { const agency = body.agency || {}; const id = key(agency.id); const { data, error } = await submissionsSupabase.from("battle_network_agencies").update({ name: clean(agency.name).toUpperCase(), accent: agency.accent || "#94a3b8", logo_url: agency.logoUrl || "", password: clean(agency.password).toUpperCase() }).eq("id", id).select(AGENCY_COLUMNS).single(); if (error) throw new Error(error.message); return NextResponse.json({ agency: toAgency(data) }); }
    if (body.action === "delete-agency") { const agencyId = key(body.agencyId); const { data: agencyBattles, error: listError } = await submissionsSupabase.from("battle_network_battles").select("id").eq("agency_id", agencyId); if (listError) throw new Error(listError.message); const battleIds = (agencyBattles || []).map((row) => String(row.id)); if (battleIds.length) { const { error: unlinkError } = await submissionsSupabase.from("battle_network_battles").update({ opponent_battle_id: null }).in("opponent_battle_id", battleIds); if (unlinkError) throw new Error(unlinkError.message); const { error: deleteBattlesError } = await submissionsSupabase.from("battle_network_battles").delete().eq("agency_id", agencyId); if (deleteBattlesError) throw new Error(deleteBattlesError.message); } const { error } = await submissionsSupabase.from("battle_network_agencies").delete().eq("id", agencyId); if (error) throw new Error(error.message); return NextResponse.json({ ok: true }); }
    if (body.action === "external-withdraw") { const current = await battle(String(body.battleId)); if (!current?.cancelledAt) return NextResponse.json({ error: "CANCELLED BATTLE NOT FOUND." }, { status: 404 }); const { error } = await submissionsSupabase.from("battle_network_battles").delete().eq("id", current.id); if (error) throw new Error(error.message); return NextResponse.json({ ok: true }); }
    if (body.action === "save-battle") { const row = payload(body.battle || {}); if (!row.agency_id || !row.creator_username || !row.manager || !row.requested_time) return NextResponse.json({ error: "COMPLETE BATTLE DETAILS." }, { status: 400 }); if (blockedFromAgency(creatorBlocks(await settings()), row.creator_username, row.agency_id)) return NextResponse.json({ error: "THIS CREATOR IS BANNED FROM BATTLING THIS AGENCY." }, { status: 409 }); const existing = row.id ? await battle(String(row.id)) : null; if (existing?.opponentBattleId) { row.requested_time = existing.requestedTime; const { data, error } = await submissionsSupabase.from("battle_network_battles").update(row).eq("id", existing.id).select(BATTLE_COLUMNS).single(); if (error) throw new Error(error.message); const { error: opponentError } = await submissionsSupabase.from("battle_network_battles").update({ actual_time: row.actual_time }).eq("id", existing.opponentBattleId); if (opponentError) throw new Error(opponentError.message); return NextResponse.json({ battle: toBattle(data) }); } const { data, error } = await submissionsSupabase.from("battle_network_battles").upsert(row).select(BATTLE_COLUMNS).single(); if (error) throw new Error(error.message); return NextResponse.json({ battle: toBattle(data) }); }
    if (body.action === "delete-battle") { const current = await battle(String(body.battleId)); if (!current || current.agencyId !== key(body.agencyId) || current.opponentBattleId) return NextResponse.json({ error: "BATTLE NOT FOUND OR LOCKED." }, { status: 409 }); const { error } = await submissionsSupabase.from("battle_network_battles").delete().eq("id", current.id); if (error) throw new Error(error.message); return NextResponse.json({ ok: true }); }
    if (body.action === "admin-delete-battle") { const current = await battle(String(body.battleId)); if (!current || current.opponentBattleId || current.cancelledAt) return NextResponse.json({ error: "ONLY OPEN BATTLES CAN BE DELETED." }, { status: 409 }); const { error } = await submissionsSupabase.from("battle_network_battles").delete().eq("id", current.id); if (error) throw new Error(error.message); return NextResponse.json({ ok: true }); }
    if (body.action === "cancel-match") { const current = await battle(String(body.battleId)); if (!current || current.agencyId !== key(body.agencyId) || !current.opponentBattleId) return NextResponse.json({ error: "MATCHED BATTLE NOT FOUND." }, { status: 404 }); const opponent = await battle(current.opponentBattleId); if (!opponent) return NextResponse.json({ error: "OPPONENT NOT FOUND." }, { status: 404 }); const { data: opponentAgency, error: agencyError } = await submissionsSupabase.from("battle_network_agencies").select("external_only").eq("id", opponent.agencyId).maybeSingle(); if (agencyError) throw new Error(agencyError.message); const resetHome = submissionsSupabase.from("battle_network_battles").update({ opponent_battle_id: null, actual_time: current.requestedTime, cancelled_at: null, cancelled_by: null }).eq("id", current.id); if (opponent.manager.startsWith("MANUAL:") || opponentAgency?.external_only) { const results = await Promise.all([resetHome, submissionsSupabase.from("battle_network_battles").delete().eq("id", opponent.id)]); const error = results.find((result) => result.error)?.error; if (error) throw new Error(error.message); return NextResponse.json({ ok: true, opponentDeleted: true }); } const opponentUpdate = submissionsSupabase.from("battle_network_battles").update({ opponent_battle_id: null, actual_time: opponent.requestedTime, cancelled_at: null, cancelled_by: null }).eq("id", opponent.id); const results = await Promise.all([resetHome, opponentUpdate]); const error = results.find((result) => result.error)?.error; if (error) throw new Error(error.message); return NextResponse.json({ ok: true }); }
    if (body.action === "match") { const [first, second, currentSettings] = await Promise.all([battle(String(body.firstId)), battle(String(body.secondId)), settings()]); const close = Boolean(body.close); const minutes = (value: string) => { const [hours, mins] = value.split(":").map(Number); return hours * 60 + mins; }; const difference = first && second ? Math.abs(minutes(first.requestedTime) - minutes(second.requestedTime)) : 0; if (!first || !second || first.opponentBattleId || second.opponentBattleId) return NextResponse.json({ error: "THAT BATTLE IS NO LONGER AVAILABLE." }, { status: 409 }); const blocks = creatorBlocks(currentSettings); if (blockedFromAgency(blocks, first.creatorUsername, second.agencyId) || blockedFromAgency(blocks, second.creatorUsername, first.agencyId)) return NextResponse.json({ error: "THIS CREATOR IS BANNED FROM BATTLING THIS AGENCY." }, { status: 409 }); if (incompatible(incompatibilities(currentSettings), first.creatorUsername, second.creatorUsername)) return NextResponse.json({ error: "⚠ INCOMPATIBLE CREATORS — THIS BATTLE CANNOT BE MATCHED." }, { status: 409 }); if (first.day !== second.day || matchRule(first.size) !== matchRule(second.size) || matchRule(first.powerUps) !== matchRule(second.powerUps) || (!close && first.requestedTime !== second.requestedTime) || (close && (difference === 0 || difference > 15 || minutes(first.requestedTime) < 1080 || minutes(second.requestedTime) < 1080))) return NextResponse.json({ error: "BATTLES MUST MATCH ON DAY, TIME, SIZE AND POWER-UP RULES." }, { status: 409 }); const actualTime = close ? second.requestedTime : first.requestedTime; const updates = [{ id: first.id, opponent_battle_id: second.id, actual_time: actualTime }, { id: second.id, opponent_battle_id: first.id, actual_time: actualTime }]; const results = await Promise.all(updates.map(({ id, ...update }) => submissionsSupabase.from("battle_network_battles").update(update).eq("id", id))); const error = results.find((result) => result.error)?.error; if (error) throw new Error(error.message); await syncDfjdbattleToCalendar({ ...first, actualTime }, { ...second, actualTime }); return NextResponse.json({ ok: true }); }
    const source = await battle(String(body.sourceId));
    if (["claim-battle", "external-claim", "add-manual-opponent"].includes(body.action)) {
      if (!source || source.opponentBattleId) return NextResponse.json({ error: "THAT BATTLE IS NO LONGER AVAILABLE." }, { status: 409 });
      const agencyId = body.action === "claim-battle" ? key(body.agencyId) : key(body.opponentAgencyId || String(body.creatorUsername || "").split("::")[0]);
      const username = body.action === "external-claim" ? clean(String(body.creatorUsername || "").split("::").pop()) : clean(body.creatorUsername);
      const { data: agency, error: agencyError } = await submissionsSupabase.from("battle_network_agencies").select(AGENCY_COLUMNS).eq("id", agencyId).maybeSingle();
      if (agencyError) throw new Error(agencyError.message); if (!agency || !username) return NextResponse.json({ error: "COMPLETE THE OPPONENT DETAILS." }, { status: 409 }); const currentSettings = await settings(); const blocks = creatorBlocks(currentSettings); if (blockedFromAgency(blocks, source.creatorUsername, agencyId) || blockedFromAgency(blocks, username, source.agencyId)) return NextResponse.json({ error: "THIS CREATOR IS BANNED FROM BATTLING THIS AGENCY." }, { status: 409 }); if (incompatible(incompatibilities(currentSettings), source.creatorUsername, username)) return NextResponse.json({ error: "⚠ INCOMPATIBLE CREATORS — THIS BATTLE CANNOT BE CLAIMED." }, { status: 409 }); if (await hasDuplicateBattle({ agency_id: agencyId, week_start: source.weekStart, day: source.day, creator_username: username, requested_time: source.requestedTime })) return NextResponse.json({ error: "A BATTLE FOR THIS CREATOR AT THIS TIME ALREADY EXISTS." }, { status: 409 });
      const { data: created, error: insertError } = await submissionsSupabase.from("battle_network_battles").insert({ agency_id: agencyId, week_start: source.weekStart, day: source.day, creator_username: username, manager: body.action === "claim-battle" ? clean(body.manager) : body.action === "add-manual-opponent" ? `MANUAL: ${clean(body.displayAgencyName) || "MANUAL AGENCY"}` : agency.name, size: source.size, power_ups: source.powerUps, requested_time: source.requestedTime, actual_time: source.requestedTime, opponent_battle_id: source.id }).select(BATTLE_COLUMNS).single();
      if (insertError) throw new Error(insertError.message); const { error: updateError } = await submissionsSupabase.from("battle_network_battles").update({ opponent_battle_id: created.id }).eq("id", source.id); if (updateError) throw new Error(updateError.message); await syncDfjdbattleToCalendar(source, toBattle(created)); return NextResponse.json({ battle: toBattle(created) });
    }
    return NextResponse.json({ error: "UNKNOWN BATTLE NETWORK ACTION." }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "COULD NOT SAVE BATTLE NETWORK." }, { status: 500 }); }
}
