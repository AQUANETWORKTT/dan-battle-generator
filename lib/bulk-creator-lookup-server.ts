import 'server-only';
import {database} from './creator-api-search/db';
import {normalizeLookupUsername,lookupManager,type LookupRow,type LookupAssignments} from './bulk-creator-lookup';

const fields='id,creator_id,creator_username,stat_date,manager_email,email';
export async function lookupAssignments():Promise<LookupAssignments>{
 const r=await database().from('poster_templates').select('template_json').eq('name','manager-assignment-settings').maybeSingle();
 if(r.error)throw Error(r.error.message);
 return r.data?.template_json?.assignments||{};
}
// Bounded batches, not a total limit. Results remain server-side until reduced
// to one current assignment per input username.
export async function lookupCreatorRows(names:string[]){
 const db=database(),unique=[...new Set(names)],matches=new Map<string,LookupRow>();
 let indexed=true;
 for(let offset=0;offset<unique.length;offset+=200){
  const batch=unique.slice(offset,offset+200),r=await db.rpc('bulk_creator_lookup',{usernames:batch});
  if(r.error){if(r.error.code==='PGRST202'){indexed=false;break;}throw Error(r.error.message);}
  for(const row of r.data||[])matches.set(row.lookup_username,row);
 }
 if(indexed)return matches;
 // Compatibility while the additive SQL migration is being installed. Strict
 // literal matching; underscores must never become SQL LIKE wildcards.
 matches.clear();
 const valid=unique.filter(n=>/^[a-z0-9._-]+$/.test(n));
 for(let offset=0;offset<valid.length;offset+=30){
  const batch=valid.slice(offset,offset+30),filters=batch.flatMap(n=>{const escaped=n.replace(/_/g,'\\_');return [`creator_username.ilike.${escaped}`,`creator_username.ilike.@${escaped}`];}).join(',');
  for(let from=0;;from+=1000){
   const r=await db.from('creator_daily_stats').select(fields).or(filters).or('data_period.is.null,data_period.neq.mature_month_total').order('stat_date',{ascending:false}).order('id',{ascending:false}).range(from,from+999);
   if(r.error)throw Error(r.error.message);
   for(const row of r.data||[]){const name=normalizeLookupUsername(row.creator_username||'');if(!matches.has(name))matches.set(name,row);}
   if((r.data||[]).length<1000)break;
  }
 }
 // A historical username must resolve to that account's latest manager, even
 // after a rename. Query IDs in bulk, never one request per creator.
 const ids=[...new Set([...matches.values()].map(r=>r.creator_id).filter((id):id is string=>Boolean(id&&/^\d{10,}$/.test(id))))],latest=new Map<string,LookupRow>();
 for(let offset=0;offset<ids.length;offset+=100)for(let from=0;;from+=1000){
  const r=await db.from('creator_daily_stats').select(fields).in('creator_id',ids.slice(offset,offset+100)).or('data_period.is.null,data_period.neq.mature_month_total').order('stat_date',{ascending:false}).order('id',{ascending:false}).range(from,from+999);
  if(r.error)throw Error(r.error.message);
  for(const row of r.data||[])if(!latest.has(row.creator_id))latest.set(row.creator_id,row);
  if((r.data||[]).length<1000)break;
 }
 for(const [name,row] of matches)if(row.creator_id&&latest.has(row.creator_id))matches.set(name,latest.get(row.creator_id)!);
 return matches;
}
export async function lookupManagerHistory(creatorId:string,assignments:LookupAssignments){
 const rows:LookupRow[]=[];
 for(let from=0;;from+=1000){
  const r=await database().from('creator_daily_stats').select('id,stat_date,manager_email,email').eq('creator_id',creatorId).or('data_period.is.null,data_period.neq.mature_month_total').order('stat_date').order('id').range(from,from+999);
  if(r.error)throw Error(r.error.message);rows.push(...r.data);if(r.data.length<1000)break;
 }
 const history:{date:string;manager:string}[]=[];
 for(const row of rows){const manager=lookupManager(row,assignments);if(history.at(-1)?.manager!==manager)history.push({date:row.stat_date||'',manager});}
 return history;
}
