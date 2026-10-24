const fs=require('fs'),{createClient}=require('@supabase/supabase-js');
const s=fs.readFileSync('lib/submissions-supabase.ts','utf8');
const c=createClient(process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL||s.match(/https:\/\/[^"\s]+/)[0],process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY||s.match(/eyJ[^"\s]+/)[0]);
(async()=>{
 const {data:latest,error:e}=await c.from('creator_daily_stats').select('stat_date').order('stat_date',{ascending:false}).limit(1).single();if(e)throw e;
 const totals={};let sample;const roster=new Set();
 for(let from=0;;from+=1000){const {data,error}=await c.from('creator_daily_stats').select('*').eq('stat_date',latest.stat_date).range(from,from+999);if(error)throw error;
 for(const r of data){const manager=String(r.manager_email||r.creator_network_manager||r['Creator Network manager']||r.email||'');const k=manager+' | '+r.data_period;totals[k]??={rows:0,diamonds:0};totals[k].rows++;totals[k].diamonds+=Number(r.diamonds)||0;if(/kyranash/i.test(manager)){sample??=r;roster.add(String(r.creator_id||r.creator_username));}}
 if(data.length<1000)break;}
 const sources={};let sum=0;
 for(let from=0;;from+=1000){const {data,error}=await c.from('creator_daily_stats').select('*').gte('stat_date',latest.stat_date.slice(0,7)+'-01').lte('stat_date',latest.stat_date).or('data_period.is.null,data_period.neq.mature_month_total').range(from,from+999);if(error)throw error;for(const r of data){if(!roster.has(String(r.creator_id||r.creator_username)))continue;const m=r.manager_email||r.email||'unknown';sum+=Number(r.diamonds)||0;sources[m]=(sources[m]||0)+(Number(r.diamonds)||0);}if(data.length<1000)break;}
 console.log(JSON.stringify({latest:latest.stat_date,currentRoster:roster.size,monthTotalForCurrentRoster:sum,sources},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
