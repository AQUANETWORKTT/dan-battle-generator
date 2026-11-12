import "server-only";
import { database } from "./creator-api-search/db";

const NAME = "unmanaged-creators";
export type UnmanagedCreator = {
  id: string;
  username: string;
  managerKey: string;
  reason: "leave-request" | "no-contact" | "away" | "other";
  hoursAtMove: number;
  createdAt: string;
};

export async function unmanagedCreators() {
  const r = await database()
    .from("poster_templates")
    .select("template_json")
    .eq("name", NAME)
    .maybeSingle();
  if (r.error) throw Error(r.error.message);
  const records = r.data?.template_json?.records;
  return Array.isArray(records)
    ? records.filter(
        (r): r is UnmanagedCreator =>
          r &&
          typeof r.id === "string" &&
          typeof r.username === "string" &&
          typeof r.managerKey === "string" &&
          typeof r.reason === "string",
      )
    : [];
}
export async function saveUnmanagedCreators(records: UnmanagedCreator[]) {
  const r = await database().from("poster_templates").upsert(
    {
      name: NAME,
      template_json: { records },
      background_url: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" },
  );
  if (r.error) throw Error(r.error.message);
  return records;
}
