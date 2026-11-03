const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const env={POSTER_GENERATOR_SESSION_SECRET:'local-test-secret-with-at-least-32-characters'};
function load(file,deps){const box={exports:{},require:name=>{if(name in deps)return deps[name];throw Error('Unexpected dependency '+name);},process:{env},Buffer,Date,URL,Response};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);return box.exports;}
const auth=load('lib/poster-generator-auth.ts',{'server-only':{},'node:crypto':require('node:crypto')});
const token=auth.posterSessionToken();
assert(auth.posterSessionValid(token));assert(!auth.posterSessionValid(undefined));assert(!auth.posterSessionValid('true'));
assert(!auth.posterSessionValid(token.replace('poster.','leadership.')));assert(!auth.posterSessionValid(token.slice(0,-1)+(token.endsWith('0')?'1':'0')));
assert(!auth.posterSessionValid(auth.posterSessionToken(Date.now()-31*86400000)));
const next={json:(data,options={})=>{const r=Response.json(data,options);r.savedCookies=[];r.cookies={set:(...args)=>r.savedCookies.push(args)};return r;},next:()=>({action:'next'}),redirect:url=>({action:'redirect',url:String(url)})};
let allowed=['saved-design'];
const route=load('app/api/poster-generator/[...path]/route.ts',{
  'next/server':{NextResponse:next},'@/lib/poster-generator-auth':auth,
  '@/app/api/poster-templates/route':{GET:async()=>Response.json({templates:[{id:'saved-design'},{id:'private-design'}],managerTemplateIds:allowed,defaults:{single:'private-design',two:'saved-design'}})},
  '@/app/api/data-analysis/fallback-avatars/route':{GET:async()=>Response.json({avatars:[{username:'one',imageUrl:'data:image/png;base64,AA'},{username:'empty',imageUrl:''}]})},
  '@/app/api/tiktok-avatar/route':{POST:async()=>Response.json({avatar:'https://p16.tiktokcdn.com/photo.jpeg'})},
  '@/app/api/tiktok-avatar-image/route':{GET:async()=>new Response('image')},
});
function request(path,{method='GET',cookie=token,body={},origin}={}){return {method,nextUrl:new URL('http://localhost:3103/api/poster-generator/'+path),headers:new Headers(origin?{origin}:{}),cookies:{get:name=>name===auth.POSTER_COOKIE&&cookie?{value:cookie}:undefined},json:async()=>body,clone(){return this;}};}
async function call(path,options){return route[options?.method||'GET'](request(path,options),{params:Promise.resolve({path:path.split('?')[0].split('/')})});}
(async()=>{
  assert.equal((await call('templates',{cookie:null})).status,401);
  assert.equal((await call('login',{method:'POST',body:{password:'fc1'},cookie:null})).status,401);
  const login=await call('login',{method:'POST',body:{password:'FC1'},cookie:null});assert.equal(login.status,200);
  assert.equal(login.savedCookies.length,1);assert.equal(login.savedCookies[0][0],auth.POSTER_COOKIE);assert(login.savedCookies[0][2].httpOnly);
  assert.equal((await call('templates')).status,200);
  const filtered=await (await call('templates')).json();assert.deepEqual(filtered.templates,[{id:'saved-design'}]);assert.deepEqual(filtered.defaults,{two:'saved-design'});
  allowed=[];assert.equal((await (await call('templates')).json()).templates.length,0);allowed=['saved-design'];
  assert.equal((await (await call('fallback-avatars')).json()).avatars.length,1);
  for(const method of ['POST','PUT','DELETE'])assert.equal((await call('templates',{method})).status,403);
  assert.equal((await call('avatar',{method:'POST',body:{username:'valid.name'}})).status,200);
  assert.equal((await call('avatar',{method:'POST',body:{username:'../bad'}})).status,400);
  assert.equal((await call('avatar',{method:'POST',body:{username:'valid'},origin:'https://foreign.example'})).status,403);
  for(const url of ['http://127.0.0.1/private','https://example.com/image','https://tiktokcdn.com.evil.example/image','https://user:pass@tiktokcdn.com/image'])assert.equal((await call('avatar-image?url='+encodeURIComponent(url))).status,400);
  assert.equal((await call('avatar-image?url='+encodeURIComponent('https://p16.tiktokcdn.com/image'))).status,200);
  assert.equal((await call('data')).status,403);
  const middleware=load('middleware.ts',{'next/server':{NextResponse:next}}).middleware;
  function visit(path,cookies={}){const url='http://localhost:3103'+path;return middleware({url,nextUrl:new URL(url),headers:new Headers({host:'localhost:3103'}),cookies:{get:name=>cookies[name]?{value:cookies[name]}:undefined}});}
  assert.equal(visit('/poster-generator',{[auth.POSTER_COOKIE]:token}).action,'next');
  for(const path of ['/generator','/data','/api/poster-templates'])assert.equal(visit(path,{[auth.POSTER_COOKIE]:token}).action,'redirect');
  assert.equal(visit('/generator',{'first-class-space-auth':'true'}).action,'next');
  let leader=false,saved;
  const rows=[{id:'saved-design',name:'Design',template_json:{avatar1:{},avatar2:{},username1:{},username2:{}}}];
  const admin=load('app/api/poster-templates/route.ts',{
    'next/server':{NextResponse:next},'next/headers':{cookies:async()=>({get:()=>leader?{value:'true'}:undefined})},
    '@/lib/submissions-supabase':{submissionsSupabase:{from:()=>({select:()=>Promise.resolve({data:rows,error:null}),upsert:async value=>{saved=value;return {error:null};}})}}
  });
  assert.equal((await admin.PATCH({json:async()=>({allowedIds:['saved-design']})})).status,403);assert.equal(saved,undefined);
  leader=true;
  assert.equal((await admin.PATCH({json:async()=>({allowedIds:['missing']})})).status,400);assert.equal(saved,undefined);
  assert.equal((await admin.PATCH({json:async()=>({allowedIds:['saved-design','saved-design']})})).status,200);
  assert.equal(saved.name,'manager-poster-template-access');assert.deepEqual(JSON.parse(JSON.stringify(saved.template_json.allowedIds)),['saved-design']);
  assert.equal((await admin.PATCH({json:async()=>({allowedIds:[]})})).status,200);assert.equal(saved.template_json.allowedIds.length,0);
  console.log('Poster Generator signed access, read-only API, photo proxy and leadership separation passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
