"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
// Compatibility adapter for the copied editor. No database credentials or
// arbitrary database/table access are ever exposed to the Atlas browser.
type Result = { data: any; error: { message: string } | null };
const urls = new Map<string,string>();
async function api(path: string, options?: RequestInit): Promise<Result> {
  try { const response = await fetch(`/api/atlas/${path}`, { cache: "no-store", ...options }); const body = await response.json(); return response.ok ? { data: body, error: null } : { data: null, error: { message: body.error || "Atlas request failed." } }; }
  catch { return { data: null, error: { message: "Could not connect to Atlas. Please retry." } }; }
}
class AtlasQuery implements PromiseLike<Result> {
  private operation = "select"; private value: any; private filters: Record<string,unknown> = {}; private singleRow = false;
  private query: {filters: {op:string;key:string;value:unknown}[];orders:{key:string;ascending:boolean}[];start:number;end:number} = {filters:[],orders:[],start:0,end:999};
  constructor(private table: string) {}
  select(_fields?: string) { return this; }
  eq(key: string, value: unknown) { this.filters[key] = value; this.query.filters.push({op:"eq",key,value}); return this; }
  gte(key: string, value: unknown) { this.query.filters.push({op:"gte",key,value}); return this; }
  lte(key: string, value: unknown) { this.query.filters.push({op:"lte",key,value}); return this; }
  order(key: string, options?: {ascending?:boolean}) { this.query.orders.push({key,ascending:options?.ascending!==false}); return this; }
  limit(limit: number) { this.query.end = this.query.start+limit-1; return this; }
  range(start: number, end: number) { this.query.start=start; this.query.end=end; return this; }
  or(value: string) { this.query.filters.push({op:"or",key:"",value}); return this; }
  in(key: string,value:unknown[]) { this.query.filters.push({op:"in",key,value}); return this; }
  maybeSingle() { this.singleRow = true; return this; }
  single() { this.singleRow = true; return this; }
  upsert(value: any, _options?: unknown) { this.operation = "upsert"; this.value = value; return this; }
  delete() { this.operation = "delete"; return this; }
  private async run(): Promise<Result> {
    if (this.table === "creator_daily_stats") {
      if(this.operation!=="select") return {data:null,error:{message:"Creator stats are read-only. Use Backstage Upload to import data."}};
      const result = await api("data-query",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(this.query)});
      return result.error ? result : {data:this.singleRow ? result.data.rows[0] || null : result.data.rows,error:null};
    }
    if (this.table !== "poster_templates") return { data: null, error: { message: "This data source is not connected to Atlas." } };
    if (this.operation === "upsert") { const r = await api("records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template: this.value }) }); return { data: r.data?.template, error: r.error }; }
    if (this.operation === "delete") return api("records", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.filters) });
    const r = await api("records"); if (r.error) return r;
    const rows = (r.data.templates || []).filter((row: any) => Object.entries(this.filters).every(([key,value]) => row[key] === value));
    return { data: this.singleRow ? rows[0] || null : rows, error: null };
  }
  then<TResult1 = Result, TResult2 = never>(resolve?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null, reject?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null) { return this.run().then(resolve, reject); }
}
export function getAtlasGeneratorClient(): SupabaseClient<any> {
  return { from: (table: string) => new AtlasQuery(table), storage: { from: (_bucket: string) => ({
    async upload(path: string, file: File, _options?: unknown) { const form = new FormData(); form.set("file", file); const r = await api("upload", { method: "POST", body: form }); if (r.data?.url) urls.set(path, r.data.url); return { data: r.data, error: r.error }; },
    getPublicUrl(path: string) { return { data: { publicUrl: urls.get(path) || "" } }; },
  }) } } as unknown as SupabaseClient<any>;
}
