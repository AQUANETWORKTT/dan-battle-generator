import { createClient } from "@supabase/supabase-js";

console.log(
  "SUPABASE URL:",
  process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL
);

export const submissionsSupabase = createClient(
  process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY!
);