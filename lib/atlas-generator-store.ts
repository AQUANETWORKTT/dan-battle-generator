import { submissionsSupabase } from "./submissions-supabase";
export const ATLAS_RECORD = "atlas-generator-workspace-v1";
export type AtlasTemplate = { id: string; name: string; background_url: string | null; template_json: Record<string, unknown>; updated_at?: string };
export type AtlasWorkspace = { templates: AtlasTemplate[]; defaults: Record<string,string> };
export const emptyAtlasWorkspace = (): AtlasWorkspace => ({ templates: [], defaults: {} });
export async function readAtlasWorkspace(): Promise<AtlasWorkspace> {
  const { data, error } = await submissionsSupabase.from("poster_templates").select("template_json").eq("name", ATLAS_RECORD).maybeSingle();
  if (error) throw Error(error.message);
  const saved = data?.template_json as Partial<AtlasWorkspace> | null;
  return { templates: Array.isArray(saved?.templates) ? saved.templates : [], defaults: saved?.defaults || {} };
}
let queue = Promise.resolve();
export function changeAtlasWorkspace<T>(change: (workspace: AtlasWorkspace) => T): Promise<T> {
  const job = queue.then(async () => {
    const workspace = await readAtlasWorkspace();
    const result = change(workspace);
    const { error } = await submissionsSupabase.from("poster_templates").upsert({ name: ATLAS_RECORD, background_url: null, template_json: workspace, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) throw Error(error.message);
    return result;
  });
  queue = job.then(() => undefined, () => undefined);
  return job;
}
