const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict'),crypto=require('crypto');
const compile=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function moduleFor(path,require){const box={exports:{},require,process:{env:{}},Buffer,Date,crypto};vm.runInNewContext(compile(path),box);return box.exports;}
const auth=moduleFor('lib/atlas-auth.ts',id=>{if(id==='node:crypto')return crypto;throw Error(id)});
assert(!auth.atlasSessionValid('true'));assert(!auth.atlasSessionValid('forged'));assert(auth.atlasSessionValid(auth.atlasSessionToken()));assert(!auth.atlasSessionValid(auth.atlasSessionToken(Date.now()-1000)));
let w={templates:[],defaults:{}};
const clone=x=>JSON.parse(JSON.stringify(x));
const store={readAtlasWorkspace:async()=>clone(w),changeAtlasWorkspace:async fn=>fn(w)};
class ResponseMock { constructor(body,opts={}){this.body=body;this.status=opts.status||200;this.cookies={set(){},delete(){}}} static json(body,opts){return new ResponseMock(body,opts)} }
const route=moduleFor('app/api/atlas/[...path]/route.ts',id=>{if(id==='next/server')return{NextResponse:ResponseMock};if(id.includes('atlas-auth'))return auth;if(id.includes('atlas-generator-store'))return store;if(id.includes('submissions-supabase'))return{submissionsSupabase:{}};if(id.includes('tiktok-avatar'))return{};throw Error(id)});
const request=(path,method='GET',body={},token=auth.atlasSessionToken())=>({nextUrl:new URL('http://localhost/api/atlas/'+path),method,cookies:{get:()=>token?{value:token}:undefined},headers:{get:()=>null},json:async()=>body});
(async()=>{
 assert.equal((await route.GET(request('poster-templates','GET',{},''))).status,401);
 let r=await route.GET(request('poster-templates'));assert.equal(r.body.templates.length,0);
 r=await route.POST(request('poster-templates','POST',{template:{id:'first-class-id',name:'Bad cross-access',template_json:{avatar1:{},avatar2:{},username1:{},username2:{}}}}));assert.equal(r.status,400);assert.equal(w.templates.length,0);
 r=await route.POST(request('poster-templates','POST',{template:{name:'Atlas test',template_json:{avatar1:{},avatar2:{},username1:{},username2:{}}}}));assert.equal(r.status,200);const id=r.body.template.id;
 await route.PUT(request('poster-templates','PUT',{settingKey:'poster-template-default',templateId:id}));assert.equal(w.defaults['poster-template-default'],id);
 r=await route.PUT(request('poster-templates','PUT',{settingKey:'poster-template-default',templateId:'first-class-id'}));assert.equal(r.status,400);
 r=await route.GET(request('team-poster-templates'));assert.equal(r.body.templates.length,0);
 r=await route.DELETE(request('records','DELETE',{id:'first-class-id'}));assert.equal(r.status,400);assert.equal(w.templates.length,1);
 await route.DELETE(request('poster-templates','DELETE',{id}));assert.equal(w.templates.length,0);assert.equal(Object.keys(w.defaults).length,0);
 const originRequest=request('poster-templates','POST');originRequest.headers.get=()=> 'https://other.example';assert.equal((await route.POST(originRequest)).status,403);
 const source=fs.readFileSync('app/atlas/generator/AtlasGenerator.tsx','utf8');assert(!source.includes('NEXT_PUBLIC_SUBMISSIONS'));assert(!/fetch\(["'`]\/api\/(?!atlas\/)/.test(source));assert(!source.includes('url(/first-class/'));assert(!source.includes('"/posters/dan-battle/background.png"'));
 console.log('Passed: signed Atlas sessions, empty library, scoped CRUD/defaults, cross-agency ID rejection, origin protection, default cleanup and no First Class data calls. Tests used an in-memory store only.');
})().catch(e=>{console.error(e);process.exitCode=1});
