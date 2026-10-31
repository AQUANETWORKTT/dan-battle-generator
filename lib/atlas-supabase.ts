import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let client: SupabaseClient<any> | undefined;
export function atlasDatabaseConfigured() { return Boolean(process.env.ATLAS_SUPABASE_URL && process.env.ATLAS_SUPABASE_SERVICE_ROLE_KEY); }
export function getAtlasDatabase() {
  if (!atlasDatabaseConfigured()) throw Error("Atlas database is not configured. Set ATLAS_SUPABASE_URL and ATLAS_SUPABASE_SERVICE_ROLE_KEY on the Atlas project and run the Atlas database setup SQL.");
  client ||= createClient(process.env.ATLAS_SUPABASE_URL!, process.env.ATLAS_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
// Lazy: builds and login work before the new database is configured. There is
// deliberately no First Class fallback, even when its environment keys exist.
export const atlasSupabase = new Proxy({} as SupabaseClient<any>, { get(_target, property) { const db = getAtlasDatabase(); const value = Reflect.get(db, property); return typeof value === "function" ? value.bind(db) : value; } });
