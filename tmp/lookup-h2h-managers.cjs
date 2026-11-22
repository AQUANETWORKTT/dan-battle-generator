const {loadEnvConfig}=require('@next/env');loadEnvConfig(process.cwd(),true,{info(){},error(){}});
const {createClient}=require('@supabase/supabase-js');
const db=createClient(process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL,process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const names=['JAZPHOENIX','ROSIEHUGHES81','CHARLIEVENABLES2','1IFEWITHLIL','TREVORTILCOCK5','COLEYROSSITER','COOPERQUESTXP','TUTHPICK_0','DANIELLENEWITT','SAM252410','DEMILEA_05','LUCY_ANN1481','AUSTEJA_123K2004','NICK.SANDY7','XO.CHLOE.7X','ELLA_QUINNXX'];
const key=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'').replace(/(outlook|gmail|mail)com$/,'');
(async()=>{
 const settings=await db.from('poster_templates').select('template_json').eq('name','manager-assignment-settings').maybeSingle();if(settings.error)throw Error(settings.error.message);
 const a=settings.data?.template_json?.assignments||{};
 const labels=Object.fromEntries(Object.entries(a.managerNames||{}).map(([k,v])=>[key(k),v])),groups=Object.fromEntries(Object.entries(a.managerGroups||{}).map(([k,v])=>[key(k),v]));
 const results=await Promise.all(names.map(async name=>{const r=await db.from('creator_daily_stats').select('creator_username,manager_email,email,group_name,agency,team,stat_date').ilike('creator_username',name.replace(/_/g,'\\_')).order('stat_date',{ascending:false}).limit(1);if(r.error)throw Error(r.error.message);const row=r.data[0];if(!row)return {username:name,found:false};const raw=row.manager_email||row.email||'';return {username:row.creator_username,manager:labels[key(raw)]||raw,group:groups[key(raw)]||row.group_name||row.agency||row.team,date:row.stat_date};}));
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e.message);process.exit(1)});

