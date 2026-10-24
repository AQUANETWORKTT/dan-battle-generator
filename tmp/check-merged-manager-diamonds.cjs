const fs = require('fs'), vm = require('vm'), ts = require('typescript');
const {createClient} = require('@supabase/supabase-js');
const source = fs.readFileSync('lib/submissions-supabase.ts', 'utf8');
const client = createClient(process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL || source.match(/https:\/\/[^"\s]+/)[0], process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY || source.match(/eyJ[^"\s]+/)[0]);
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const aliases = {exports:{}};
vm.runInNewContext(compile('lib/recruitment-manager-aliases.ts'), aliases);
const box = {exports:{}, require(id) {
  if(id === 'next/server') return {NextResponse:{json:(body,options)=>({body,status:options?.status||200})}};
  if(id.includes('submissions-supabase')) return {submissionsSupabase:client};
  if(id.includes('recruitment-manager-aliases')) return aliases.exports;
  throw Error(id);
}};
vm.runInNewContext(compile('app/api/data-analysis/manager-leaderboard/route.ts'), box);
(async()=>{
 const result = await box.exports.GET();
 if(result.status!==200) throw Error(result.body.error);
 console.log(JSON.stringify({startDate:result.body.startDate,endDate:result.body.endDate,matchingManagers:result.body.managers.filter(m=> /kyran|ashwalbridge|firstclassagencyash/.test(m.key))},null,2));
 const totals = {};
 for(let from=0;;from+=1000) {
  const {data,error}=await client.from('creator_daily_stats').select('*').gte('stat_date',result.body.startDate).lte('stat_date',result.body.endDate).or('data_period.is.null,data_period.neq.mature_month_total').range(from,from+999);
  if(error) throw error;
  for(const row of data) {
   const raw=String(row.manager_email||row.creator_network_manager||row['Creator Network manager']||row.email||'');
   if(!/kyran|kieran|ashwalbridge|firstclassagency[_.-]?ash|brandy/i.test(raw)) continue;
   totals[raw]=(totals[raw]||0)+(Number(String(row.diamonds||row.Diamonds||0).replace(/[^\d.-]/g,''))||0);
  }
  if(data.length<1000)break;
 }
 console.log(JSON.stringify({sourceTotals:totals},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
