const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file,mocks){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,Map,Set,Buffer,process,require:n=>n in mocks?mocks[n]:n.startsWith('@/')?{}:require(n)});return exports;}
const response={NextResponse:{json:(body,{status=200}={})=>({body,status})}};
const dan={id:'dan',managerKey:'dan',username:'dan_creator'},mike={id:'mike',managerKey:'mike',username:'mike_creator'};
const overview={loadOverview:async()=>({latest:'2026-11-19',creators:[dan],month:'2026-11'}),loadOverviewSnapshot:async all=>{assert.equal(all,true);return {latest:'2026-11-19',creators:[dan,mike],month:'2026-11'}}};
const auth={SEARCH_COOKIE:'owner',searchSessionValid:value=>value==='allowed'};
function request(url,owner=true){return {method:'GET',headers:{get:()=>null},cookies:{get:key=>({value:key==='owner'&&owner?'allowed':undefined})},nextUrl:new URL('https://example.com'+url)};}
(async()=>{
 const route=load('app/api/manager-portal/[action]/route.ts',{'next/server':response,'@/lib/creator-api-search/auth':auth,'@/lib/manager-overview-server':overview,'@/lib/manager-portal':{MANAGER_COOKIE:'manager'}});
 const context={params:Promise.resolve({action:'agency-overview'})};
 assert.equal((await route.GET(request('/api/manager-portal/agency-overview?allManagers=1'),context)).body.creators.length,2);
 assert.equal((await route.GET(request('/api/manager-portal/agency-overview'),context)).body.creators.length,2,'The whole master portal includes both First Class groups');
 assert.equal((await route.GET(request('/api/manager-portal/agency-overview?allManagers=1',false),context)).status,401);
 const morning=load('app/api/morning-messages/route.ts',{'next/server':response,'@/lib/creator-api-search/auth':auth,'@/lib/manager-overview-server':overview,'@/lib/manager-portal':{MANAGER_COOKIE:'manager'},'@/lib/morning-messages':{morningEarningsDate:()=> '2026-11-19',morningMessages:(creators,date)=>creators.map(c=>({...c,date}))},'@/lib/creator-api-search/db':{database:()=>({from:()=>({select(){return this},async in(){return {data:[],error:null}}})})}});
 const all=await morning.GET(request('/api/morning-messages?scope=owner&summary=1'));assert.equal(all.body.items.length,2);assert(all.body.items.some(i=>i.managerKey==='mike'));
 assert.equal((await morning.GET(request('/api/morning-messages?scope=owner'))).body.items.length,1);
 assert.equal((await morning.GET(request('/api/morning-messages?scope=owner&summary=1',false))).status,403);
 console.log('All-manager task scope passed: both First Class groups, all morning reminders, owner-only access and all-group master overview.');
})().catch(error=>{console.error(error);process.exit(1)});
