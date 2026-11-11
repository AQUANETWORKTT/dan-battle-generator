import fs from 'node:fs/promises';
const dir='C:/Users/james/daniel-battle-generator/outputs/creator-managers-20261105';
const env=Object.fromEntries((await fs.readFile('C:/Users/james/daniel-battle-generator/.env.local','utf8')).split(/\r?\n/).filter(x=>/^[A-Z_]+=/.test(x)).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
async function get(table,params){const u=new URL('/rest/v1/'+table,env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL);for(const [k,v]of Object.entries(params))u.searchParams.set(k,v);const r=await fetch(u,{headers:{apikey:env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY}});if(!r.ok)throw Error('Lookup failed '+r.status+' '+await r.text());return r.json();}
let records=[];for(let offset=0;;offset+=1000){const rows=await get("creator_api_search_jobs",{select:"id,run_id,created_at,status,results",usernames:'cs.["coran.purser"]',order:"created_at.asc",offset:String(offset),limit:"1000"});records.push(...rows.map(r=>({job:r.id,run:r.run_id,createdAt:r.created_at,jobStatus:r.status,result:r.results?.["coran.purser"]||null})));if(rows.length<1000)break;}console.log(JSON.stringify(records,null,2));


