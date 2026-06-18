import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL ||
  "https://dxupgmsscysvztxdtaku.supabase.co";

const key = process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY || "";

export const submissionsSupabase = createClient(url, key);