import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY;

export function getSubmissionsSupabase() {
  if (!url || !url.startsWith("https://")) {
    return null;
  }

  if (!key) {
    return null;
  }

  return createClient(url, key);
}