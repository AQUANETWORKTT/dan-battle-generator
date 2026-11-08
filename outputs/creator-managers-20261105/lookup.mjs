import fs from 'node:fs/promises';
const dir='C:/Users/james/daniel-battle-generator/outputs/creator-managers-20261105';
const env=Object.fromEntries((await fs.readFile('C:/Users/james/daniel-battle-generator/.env.local','utf8')).split(/\r?\n/).filter(x=>/^[A-Z_]+=/.test(x)).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
async function get(table,params){const u=new URL('/rest/v1/'+table,env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL);for(const [k,v]of Object.entries(params))u.searchParams.set(k,v);const r=await fetch(u,{headers:{apikey:env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY}});if(!r.ok)throw Error('Lookup failed '+r.status+' '+await r.text());return r.json();}
const settings=(await get('poster_templates',{select:'template_json',name:'eq.manager-assignment-settings'}))[0]?.template_json?.assignments||{};
const key=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/(outlook|gmail|mail)com$/,'');
const names=JSON.parse(await fs.readFile(dir+'/names.json','utf8')),results=[];
for(let i=0;i<names.length;i+=5)await Promise.all(names.slice(i,i+5).map(async username=>{
 const match=await get('creator_daily_stats',{select:'creator_id,creator_username,manager_email,stat_date',creator_username:'eq.'+username,order:'stat_date.desc',limit:'1'});
 let row=match[0];if(row?.creator_id)row=(await get('creator_daily_stats',{select:'creator_id,creator_username,manager_email,stat_date',creator_id:'eq.'+row.creator_id,order:'stat_date.desc',limit:'1'}))[0]||row;
 const raw=row?.manager_email||'';const manager=Object.entries(settings.managerNames||{}).find(([k])=>key(k)===key(raw))?.[1]||raw;
 results.push({username,manager:manager||'Not found in saved records',record:row||null});
}));
results.sort((a,b)=>a.username.localeCompare(b.username,'en'));await fs.writeFile(dir+'/matched.json',JSON.stringify(results,null,2));
for(const name of ['harryellis1','louiseobrien92','pollyfirstclas']) console.log('SIMILAR',name,await get('creator_daily_stats',{select:'creator_id,creator_username,manager_email,stat_date',stat_date:'eq.2026-11-04',creator_username:'ilike.'+name+'*',limit:'20'}));
console.log(JSON.stringify(results.map(({username,manager,record})=>({username,manager,date:record?.stat_date})),null,2));

