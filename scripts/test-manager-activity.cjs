const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file,mocks={},globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,Map,Set,Buffer,process,require:n=>n in mocks?mocks[n]:n==='server-only'?{}:require(n),...globals});return exports;}
const summary=load('lib/manager-activity-summary.ts');
const start='2026-11-20T00:00:00Z',end='2026-11-21T00:00:00Z';
const sample=(at,seconds=30)=>({at:'2026-11-20T'+at+'Z',seconds});
const s=summary.summarizeManagerActivity([sample('10:00:30'),sample('10:01:00'),sample('10:01:00'),sample('10:01:10'),sample('12:00:30')],start,end);
assert.equal(s.activeSeconds,100,'Overlapping tabs must not double count');assert.equal(s.sessions.length,2,'Long breaks split sessions');
assert.equal(summary.summarizeManagerActivity([{at:'2026-11-21T00:00:20Z',seconds:30}],start,end).activeSeconds,10,'Split use at UK midnight');
assert.equal(summary.summarizeManagerActivity([{at:'2026-11-21T00:00:20Z',seconds:30}],end,'2026-11-22T00:00:00Z').activeSeconds,20);
assert.equal(summary.summarizeManagerActivity([sample('10:00:00',100000),sample('10:00:00',-1)],start,end).sessions.length,0);
assert.equal(summary.summarizeManagerActivity([sample('10:00:00',0)],start,end).sessions.length,1,'A returning existing session still registers use');

(async()=>{
 let written=[],account={id:'manager-a'},tokenSeen;
 const route=load('app/api/manager-activity/route.ts',{
  'next/server':{NextResponse:{json:(body,{status=200}={})=>({body,status})}},
  '@/lib/manager-portal-mode':{MANAGER_POSTER_COOKIE:'preview-manager'},
  '@/lib/manager-portal':{MANAGER_COOKIE:'manager',accountForSession:async token=>{tokenSeen=token;return token?account:null;}},
  '@/lib/creator-api-search/db':{database:()=>({from:()=>({upsert:async(row,options)=>{written.push({row,options});return {error:null};}})})},
 });
 const request=(seconds,token='existing-session',origin='https://example.com')=>({headers:{get:k=>k==='origin'?origin:k==='host'?'example.com':null},nextUrl:new URL('https://example.com/api/manager-activity'),cookies:{get:()=>({value:token})},json:async()=>({seconds})});
 assert.equal((await route.POST(request(30))).status,200);assert.equal(tokenSeen,'existing-session');
 assert(written[0].row.key.startsWith('audit:activity:manager-a:'));assert(!written[0].row.key.includes('existing-session'));assert.equal(written[0].row.attempts,30);assert.equal(written[0].options.ignoreDuplicates,true);
 assert.equal((await route.POST(request(500))).status,400);assert.equal((await route.POST(request(30,null))).status,401);assert.equal((await route.POST(request(30,'token','https://other.com'))).status,403);assert.equal(written.length,1);
 account=null;assert.equal((await route.POST(request(30))).status,401,'Revoked/disabled sessions must not be recorded');

 const rows=[{key:'audit:login:enabled:one',started_at:'2026-11-20T08:00:00Z'},...['enabled','disabled'].map(id=>({key:'audit:activity:'+id+':session:one',started_at:'2026-11-20T10:00:30Z',attempts:30}))];
 const db={from:()=>{let prefix,from,to;const q={select(){return q},like(_,v){prefix=v.slice(0,-1);return q},gte(_,v){from=v;return q},lt(_,v){to=v;return q},order(){return q},async range(){return {data:rows.filter(r=>r.key.startsWith(prefix)&&r.started_at>=from&&r.started_at<to),error:null}}};return q;}};
 const activity=load('lib/manager-login-activity.ts',{'./creator-api-search/db':{database:()=>db},'./manager-portal':{syncAccounts:async()=>[{id:'enabled',name:'Team A',enabled:true},{id:'disabled',name:'Team B',enabled:false}]},'./manager-activity-summary':summary});
 const day=await activity.loginActivity('2026-11-20');assert.equal(day.managers.length,1);assert.equal(day.managers[0].activeSeconds,30);assert.equal(day.managers[0].count,1);assert.equal(day.managers[0].loggedIn,true);
 const spring=await activity.loginActivity('2026-03-29');assert.equal((Date.parse(spring.dayEnd)-Date.parse(spring.dayStart))/3600000,23);
 const autumn=await activity.loginActivity('2026-10-25');assert.equal((Date.parse(autumn.dayEnd)-Date.parse(autumn.dayStart))/3600000,25);
 console.log('Manager activity passed: existing sessions, unique buckets, bounded time, overlap union, visits, midnight/DST, separate sign-ins, disabled accounts and origin/auth checks.');
})().catch(error=>{console.error(error);process.exit(1)});
