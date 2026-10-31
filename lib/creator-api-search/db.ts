import "server-only";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
let client:SupabaseClient<any>|undefined;
export function databaseConfigured(){return Boolean(process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY);}
export function database(){if(!databaseConfigured())throw Error('Creator API Search needs SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY and its new-table SQL migration. Existing Data Space tables are not changed.');return client||=createClient(process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL||'https://dxupgmsscysvztxdtaku.supabase.co',process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});}
export const RUNS='creator_api_search_runs',JOBS='creator_api_search_jobs',CONTROL='creator_api_search_control';
export async function checked<T extends {error:any}>(query:PromiseLike<T>):Promise<T>{const result=await query;if(result.error)throw Error(result.error.message||'Creator API Search storage failed. Check the new-table SQL migration.');return result;}
