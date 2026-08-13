import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function posterStore() {
  const url = process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL;
  const key = process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = posterStore();
  if (!supabase) return NextResponse.json({ error: "Poster storage is not configured." }, { status: 500 });

  const { data, error } = await supabase
    .from("poster_templates")
    .select("name,template_json,background_url")
    .or("name.eq.team-dan-poster,name.like.team-poster-%")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data || [] }, { headers: { "Cache-Control": "no-store" } });
}
