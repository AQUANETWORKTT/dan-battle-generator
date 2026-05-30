import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY || "";

export const submissionsSupabase = createClient(
  supabaseUrl || "https://dxupgmsscysvztxdtaku.supabase.co",
  supabaseAnonKey
);