const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const env={SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY:'test-only-secret-with-more-than-thirty-two-characters'};
function load(path,deps={},globals={}){const box={exports:{},require:name=>{if(name==='server-only')return {};if(name in deps)return deps[name];throw Error(name);},process:{env},URL,URLSearchParams,Buffer,Date,Map,Set,Promise,...globals};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);return box.exports;}
const types=load('lib/creator-api-search/types.ts'),model=load('lib/available-creators.ts',{'./creator-api-search/types':types});
assert.equal(model.availabilityLabel('2026-11-04T00:01:00Z',Date.parse('2026-11-04T23:59:00Z')),'AVAILABLE TODAY');
assert.equal(model.availabilityLabel('2026-11-03T23:59:00Z',Date.parse('2026-11-04T00:01:00Z')),'AVAILABLE YESTERDAY');
assert.equal(model.availabilityLabel('2026-11-02T12:00:00Z',Date.parse('2026-11-04T12:00:00Z')),'AVAILABLE 2 DAYS AGO');
assert.equal(model.availabilityLabel('2026-10-24T23:30:00Z',Date.parse('2026-10-25T23:30:00Z')),'AVAILABLE TODAY');
assert(model.hiddenUntilRescan('2026-11-04T10:00:00Z','2026-11-04T11:00:00Z'));
assert(!model.hiddenUntilRescan('2026-11-04T12:00:00Z','2026-11-04T11:00:00Z'));
assert(!model.hiddenUntilRescan('2026-11-04T10:00:00Z'));
const stamp='2026-11-04T12:00:00Z',later='2026-11-04T13:00:00Z';
function job(id,name,status,checkedAt=stamp,extra={}){return {id,run_id:'run',created_at:later,results:{[name]:{username:name,status,checkedAt,invitationType:'Regular',...extra}}};}
const jobs=[job('1','gone','Available'),job('2','gone','Ineligible',later),job('3','good','Available',stamp,{name:'Sam ⭐ .𖥔 ݁ ཐི༏ཋྀ .𖥔 ݁'}),job('4','excluded','Available',later,{name:'محمد ⭐'}),job('5','failed','Available'),job('6','failed','Failed',later),{...job('7','good','Pending'),results:{good:{username:'good',status:'Pending'}}},job('8','renamed_old','Available',stamp,{creatorId:'12345'}),job('9','renamed_new','Ineligible',later,{creatorId:'12345'})];
const rankings=['gone','good','excluded','failed','renamed_old','renamed_new'].map((username,index)=>({username,league:'A1',rank:index+1,diamonds:1000-index}));
const run={id:'run',updated_at:stamp,payload:{region:'GB',results:{A1:rankings,A2:[{...rankings[1],league:'A2'}]}}};
const directory=model.availableDirectory(model.latestObservations(jobs.slice().reverse()),[run],Date.parse('2026-11-05T12:00:00Z'));
assert.deepEqual(Array.from(directory.rows,row=>row.username),['good']);assert.equal(directory.lastCheck,later);assert.equal(directory.excluded,1);assert.equal(directory.stale,1);assert.equal(directory.rows[0].league,'A1');assert.equal(directory.rows[0].live,null);
assert.equal(model.safeAvatar('javascript:alert(1)'),undefined);assert.equal(model.safeAvatar('https://user:pass@example.com/a'),undefined);
const auth=load('lib/available-creators-auth.ts',{'node:crypto':require('node:crypto')});
const token=auth.managerViewToken();assert(auth.managerViewAllowed(token));assert(!auth.managerViewAllowed(token+'x'));assert(!auth.managerViewAllowed('leadership.'+token.split('.').slice(1).join('.')));assert(!auth.managerViewAllowed('available-creators.1.'+'a'.repeat(64)));
const searchAuth=load('lib/creator-api-search/auth.ts',{'node:crypto':require('node:crypto')});assert(!searchAuth.searchSessionValid(token));assert(!auth.managerViewAllowed(searchAuth.searchSessionToken()));
class Reply extends Response{static json(body,init={}){return new Reply(JSON.stringify(body),{...init,headers:{'content-type':'application/json',...init.headers}});}}
class SearchError extends Error{constructor(message,status=400){super(message);this.status=status;}}
class ProviderError extends Error{}
let reads=0,updates=0,marks=0;
const route=load('app/api/available-creators/route.ts',{'next/server':{NextResponse:Reply},'@/lib/creator-api-search/auth':{SEARCH_COOKIE:'signed',searchSessionValid:value=>value==='valid'},'@/lib/available-creators-auth':auth,'@/lib/available-creators-store':{readAvailableCreators:async()=>{reads++;return directory;},hideAvailableCreator:async()=>({hiddenAt:stamp}),markAvailableCreatorMessaged:async()=>{marks++;return {messagedAt:'2026-11-04T12:00:00Z'};},updateAvailableCreator:async()=>{updates++;return {ok:true};}},'@/lib/creator-api-search/service':{SearchError},'@/lib/creator-api-search/provider':{ProviderError}});
function request(method='GET',access='',admin=false,body={}){return {method,nextUrl:new URL('https://firstclassagency.management/api/available-creators'+(access?'?access='+access:'')),cookies:{get:key=>({value:admin?(key==='signed'?'valid':'true'):'true'})},headers:new Headers({origin:'https://firstclassagency.management'}),json:async()=>body};}
(async()=>{
 let body='{"avatarLarger":"https:\\u002F\\u002Fexample.test/a?x=1\\u0026y=2"}';
 const scraper=load('lib/tiktok-profile-avatar.ts',{}, {AbortSignal,fetch:async()=>({ok:true,text:async()=>body})});
 assert.equal(await scraper.scrapeTikTokAvatar('sample'),'https://example.test/a?x=1&y=2');
 body='blocked';assert.equal(await scraper.scrapeTikTokAvatar('sample'),null);

 const manyJobs=[...Array.from({length:500},(_,i)=>job('old'+i,'old'+i,'Ineligible')),job('final','good','Available',later,{name:'Sam ⭐'})],records=new Map();let pages=0,paid=0;
 const database=()=>({from(table){return {select(){return this;},order(){return this;},eq(key,value){this.key=value;return this;},async range(from,to){pages++;return {data:manyJobs.slice(from,to+1),error:null};},async in(key,values){return {data:table==='runs'?[run]:values.filter(value=>records.has(value)).map(value=>({name:value,template_json:records.get(value)})),error:null};},async maybeSingle(){return {data:records.has(this.key)?{template_json:records.get(this.key)}:null,error:null};},async upsert(row){records.set(row.name,row.template_json);return {data:null,error:null};}};}});
 const store=load('lib/available-creators-store.ts',{'./creator-api-search/db':{database,checked:async query=>{const result=await query;if(result.error)throw Error('database failed');return result;},JOBS:'jobs',RUNS:'runs'},'./creator-api-search/service':{SearchError,creatorEndpoint:async(name)=>{paid++;return {body:{data:[{username:name,name:'Sam ⭐',avatar:'https://example.test/photo.jpg',is_live:true}]},fetchedAt:new Date().toISOString()};}},'./tiktok-profile-avatar':{scrapeTikTokAvatar:async()=>{paid++;return 'https://example.test/photo.jpg';}},'./creator-api-search/reports':{reportDates:()=>['2026-11-03','2026-11-02','2026-11-01'],reportHistory:async()=>{throw Error('quota reached');}},'./creator-api-search/types':types,'./available-creators':model});
 const saved=await store.readAvailableCreators();assert.equal(pages,2);assert.equal(paid,0);assert.equal(saved.rows.length,1);assert.equal(saved.rows[0].history,undefined);await store.readAvailableCreators();assert.equal(pages,2);
 await assert.rejects(store.updateAvailableCreator('not_available'),/currently Available/);assert.equal(paid,0);
 await store.updateAvailableCreator('good');assert.equal(paid,1);assert(records.has('available-creator-profile-v1:good'));assert.equal((await store.readAvailableCreators()).rows[0].avatar,'https://example.test/photo.jpg');
 assert.equal(pages,2,'saving a picture must not reload all scans');
 await store.updateAvailableCreator('good');assert.equal(paid,1,'normal scraper photo reused');
 await assert.rejects(store.updateAvailableCreator('good',true),/quota reached/);assert.equal(paid,1,'history does not scrape photos');
 assert.equal((await store.readAvailableCreators()).rows[0].live,null);assert.equal(pages,2);

 const actionToken=auth.creatorActionToken({username:'good',creatorId:'123'});assert(auth.creatorActionIdentity(actionToken,'good'));assert(!auth.creatorActionIdentity(actionToken,'other'));assert(!auth.creatorActionIdentity(actionToken+'x','good'));
 const beforePages=pages;await store.markAvailableCreatorMessaged('good',true,{username:'good'});assert.equal(pages,beforePages,'signed actions do not rebuild directory');
 const marked=await store.markAvailableCreatorMessaged('good',true);
 assert(marked.messagedAt);assert.equal((await store.readAvailableCreators()).rows[0].messagedAt,marked.messagedAt);
 assert.equal(records.get('available-creator-messaged-v1:name:good').messagedAt,marked.messagedAt);
 await store.markAvailableCreatorMessaged('good',false);assert.equal((await store.readAvailableCreators()).rows[0].messagedAt,undefined);
 assert.equal(records.get('available-creator-messaged-v1:name:good').messagedAt,null);
 await assert.rejects(store.markAvailableCreatorMessaged('gone',true),/no longer available/);
 await assert.rejects(store.markAvailableCreatorMessaged('good','yes'),/Choose whether/);
 assert.equal((await route.POST(request('POST',token,false,{action:'messaged',username:'good',actionToken:auth.creatorActionToken({username:'good'}),messaged:true}))).status,200);assert.equal(marks,1);
 assert.equal((await route.POST(request('POST','',false,{action:'messaged',username:'good',actionToken:auth.creatorActionToken({username:'good'}),messaged:true}))).status,401);
 assert.equal((await route.POST(request('POST','',true,{action:'messaged',username:'good',actionToken:auth.creatorActionToken({username:'good'}),messaged:true}))).status,403);
 const badMessage=request('POST',token,false,{action:'messaged',username:'good',actionToken:auth.creatorActionToken({username:'good'}),messaged:true});badMessage.headers.set('origin','https://wrong.example');assert.equal((await route.POST(badMessage)).status,403);assert.equal(marks,1);
 assert.equal((await route.POST(request('POST',token,false,{action:'hide',username:'good',actionToken:auth.creatorActionToken({username:'good'})}))).status,200);
 assert.equal((await route.POST(request('POST',token,false,{action:'hide',username:'good'}))).status,403);
 await store.hideAvailableCreator({username:'good'});assert.equal((await store.readAvailableCreators()).rows.length,0);assert(records.get('available-creator-hidden-v1:name:good').hiddenAt);
 assert.equal((await route.GET(request())).status,401);assert.equal(reads,0);
 const viewer=await route.GET(request('GET',token));assert.equal(viewer.status,200);assert.equal(viewer.headers.get('cache-control'),'private, no-store');
 assert.equal((await route.POST(request('POST',token,false,{action:'enrich',username:'good'}))).status,401);assert.equal(updates,0);
 assert.equal((await route.POST(request('POST',token,false,{action:'share'}))).status,401);
 assert.equal((await route.POST(request('POST','',true,{action:'enrich',username:'good'}))).status,200);assert.equal(updates,1);
 const share=await (await route.POST(request('POST','',true,{action:'share'}))).json();assert(share.path.startsWith('/available-creators?access='));assert.equal(share.expiresInDays,30);
 const cross=request('POST','',true,{action:'enrich'});cross.headers.set('origin','https://wrong.example');assert.equal((await route.POST(cross)).status,403);
 env.SITE_MODE='atlas';assert.equal((await route.GET(request('GET',token))).status,404);env.SITE_MODE='events';assert.equal((await route.GET(request('GET',token))).status,404);
 console.log('PASS: latest actual checks, revoked/failed availability, ID-based rename, duplicate leagues, pending results, lettering exclusions, stale timestamps, safe avatar URLs, signed read-only links, expiry, tampering, paid-action restrictions, origin checks and deployment isolation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
