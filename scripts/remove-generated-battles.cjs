const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter(Boolean)
    .filter((line) => !line.trim().startsWith("#"))
    .map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1).replace(/^['\"]|['\"]$/g, "")]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL, env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY);

supabase.from("battle_network_battles").delete().eq("week_start", "2026-08-10").like("creator_username", "test-%")
  .then(({ error }) => fs.writeFileSync("outputs/remove-generated-battles.log", error ? error.message : "Generated test battles removed."))
  .catch((error) => fs.writeFileSync("outputs/remove-generated-battles.log", error instanceof Error ? error.message : String(error)));
