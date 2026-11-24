const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
let queues=0,resumes=0;const secret='unit-test-cron';
const next={NextResponse:{json:(body,options={})=>({body,status:options.status||200})}};
const service={preparedPosterStatus:async()=>({phase:'ready',posters:[]}),resumeTeamPosterPreparation:async()=>{resumes++},queueTeamPosterPreparation:async()=>{queues++},downloadPreparedPoster:async(generation)=>{if(generation!=='current')throw Error('No longer current');return {blob:new Blob(['PNG']),filename:'Team Example.png'}},posterWorkerAllowed:h=>h==='Bearer scoped-worker'};
function route(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Response,process:{env:{CRON_SECRET:secret}},require:n=>n==='next/server'?next:n==='@/lib/creator-api-search/auth'?{SEARCH_COOKIE:'owner',searchSessionValid:value=>value==='signed-owner'}:n==='@/lib/team-poster-preparation'?service:require(n)});return exports;}
const owner=route('app/api/team-poster-preparation/route.ts'),worker=route('app/api/team-poster-preparation/run/route.ts');
const request=(url='https://example.com/api/team-poster-preparation',token='',headers={})=>({nextUrl:new URL(url),cookies:{get:()=>({value:token})},headers:new Headers(headers)});
(async()=>{
 assert.equal((await owner.GET(request())).status,403);assert.equal((await owner.GET(request(undefined,'true'))).status,403);assert.equal((await owner.POST(request())).status,403);assert.equal(queues,0);
 assert.equal((await owner.GET(request(undefined,'signed-owner'))).status,200);
 assert.equal((await owner.POST(request(undefined,'signed-owner',{origin:'https://wrong.example'}))).status,403);assert.equal(queues,0);
 assert.equal((await owner.POST(request(undefined,'signed-owner',{origin:'https://example.com'}))).status,200);assert.equal(queues,1);
 assert.equal((await owner.GET(request('https://example.com/api/team-poster-preparation?file=team-poster-test&generation=stale','signed-owner'))).status,409);
 const file=await owner.GET(request('https://example.com/api/team-poster-preparation?file=team-poster-test&generation=current','signed-owner'));assert.equal(file.status,200);assert.equal(file.headers.get('Content-Type'),'image/png');assert.equal(file.headers.get('Cache-Control'),'private, no-store');
 assert.equal((await worker.POST(request())).status,401);assert.equal((await worker.POST(request(undefined,'',{authorization:'Bearer scoped-worker'}))).status,200);assert.equal((await worker.GET(request(undefined,'',{authorization:'Bearer '+secret}))).status,200);assert.equal(resumes,2);
 console.log('PASS: signed-owner access, forged legacy-cookie rejection, same-origin mutations, private PNG downloads, stale versions and isolated worker/cron authentication.');
})().catch(e=>{console.error(e);process.exit(1)});
