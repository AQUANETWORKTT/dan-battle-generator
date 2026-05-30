import { createClient } from "@supabase/supabase-js";

export const submissionsSupabase = createClient(
  process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY!
);