import { NextRequest, NextResponse } from "next/server";
import { accountForSession, managerAndJuniorKeys, MANAGER_COOKIE } from "@/lib/manager-portal";
import { fullManagerAccess } from "@/lib/manager-portal-mode";
import { addManagerNote, managerNotes } from "@/lib/manager-notes";

export const dynamic = "force-dynamic";
async function handle(request: NextRequest) {
  const account = await accountForSession(request.cookies.get(MANAGER_COOKIE)?.value);
  const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
  if (!fullManagerAccess(account)) return json({ error: "Please sign in." }, 401);
  const keys = new Set(await managerAndJuniorKeys(account!.manager_key));
  if (request.method === "GET") return json({ notes: (await managerNotes()).filter((note) => keys.has(note.managerKey)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!title || !note || title.length > 120 || note.length > 2000) return json({ error: "Add a title and a note." }, 400);
    const saved = await addManagerNote({ managerKey: account!.manager_key, manager: account!.display_name, title, body: note });
    return json({ note: saved });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not save note." }, 400);
  }
}
export const GET = handle;
export const POST = handle;
