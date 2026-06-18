import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL ||
  "https://dxupgmsscysvztxdtaku.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY ||
  "sb_publishable_C6sf3uuc6zW9_RAtxb7UbA_G4S3G-h_";

export const submissionsSupabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);