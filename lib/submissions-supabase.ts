import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY;

console.log("SUBMISSIONS URL =", JSON.stringify(url));
console.log("SUBMISSIONS KEY EXISTS =", !!key);

export const submissionsSupabase = createClient(
  url || "https://dxupgmsscysvztxdtaku.supabase.co",
  key || "missing"
);