const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file,mocks={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Map,Set,Date,process,require:n=>n in mocks?mocks[n]:n.startsWith('.')?load(path.resolve(path.dirname(file),n+'.ts'),mocks):require(n)});return exports;}
const engine=load('lib/team-earnings.ts');let saved=null,fxFail=false,sourceReads=0;
const sources={month:'2026-11',managers:[{key:'owner:Team Dan / James',name:'Dan / James',group:'Team Dan / James',owner:true,parent:null}]};
const db={from(){let action='read',values,filters=[];const q={select(){return q},eq(key,value){filters.push(row=>row[key]===value);return q},insert(value){action='insert';values=value;return q},update(value){action='update';values=value;return q},async maybeSingle(){if(action==='read')return {data:saved,error:null};if(action==='insert'&&saved)return {data:null,error:{code:'23505'}};if(action==='update'&&(!saved||!filters.every(f=>f(saved))))return {data:null,error:null};saved={id:'settings',...values};return {data:{updated_at:saved.updated_at},error:null};}};return q}};
const route=load('app/api/data/team-earnings/route.ts',{
 'next/server':{NextResponse:{json:(body,{status=200}={})=>({body,status})}},
 '@/lib/creator-api-search/auth':{SEARCH_COOKIE:'owner',searchSessionValid:value=>value==='yes'},
 '@/lib/creator-api-search/db':{database:()=>db},'@/lib/team-earnings':engine,
 '@/lib/team-earnings-server':{loadTeamEarningsSources:async()=>{sourceReads++;return sources;},earningsExchangeRate:async manual=>{if(fxFail&&manual===null)throw Error('FX unavailable');return {rate:manual??.8,date:'2026-11-20',source:'Test reference rate'};}},
});
const request=(method,body={},owner=true,origin='https://example.com')=>({method,nextUrl:new URL('https://example.com/api/data/team-earnings'),headers:{get:key=>key==='host'?'example.com':key==='origin'?origin:null},cookies:{get:()=>({value:owner?'yes':undefined})},json:async()=>body});
(async()=>{
 assert.equal((await route.GET(request('GET',{},false))).status,401);assert.equal(sourceReads,0);
 assert.equal((await route.PUT(request('PUT',{},true,'https://other.com'))).status,403);
 const first=await route.GET(request('GET'));assert.equal(first.body.settings.groups['Team Dan / James'].ownerPercent,70);assert.equal(first.body.fx.rate,.8);
 let settings=engine.defaultEarningsSettings();settings.groups['Team Dan / James'].ownerPercent=101;assert.equal((await route.PUT(request('PUT',{settings,updatedAt:null}))).status,400);
 settings=engine.defaultEarningsSettings();let result=await route.PUT(request('PUT',{settings,updatedAt:null}));assert.equal(result.status,200);
 assert.equal((await route.PUT(request('PUT',{settings,updatedAt:'old'}))).status,409);
 result=await route.POST(request('POST',{action:'add-incentive',creator:'creator',description:'Challenge',currency:'USD',amount:100,updatedAt:saved.updated_at}));assert.equal(result.status,200);assert.equal(saved.template_json.incentives[0].gbpCents,8000);
 settings={...saved.template_json,usdToGbpOverride:.7,incentives:[]};result=await route.PUT(request('PUT',{settings,updatedAt:saved.updated_at}));assert.equal(result.status,200);assert.equal(saved.template_json.incentives.length,1,'A settings edit cannot erase incentives');assert.equal(saved.template_json.incentives[0].gbpCents,8000,'Saved incentive FX stays locked');
 await route.POST(request('POST',{action:'add-incentive',creator:'creator',description:'Next incentive',currency:'USD',amount:100,updatedAt:saved.updated_at}));assert.equal(saved.template_json.incentives[1].gbpCents,7000);
 await route.POST(request('POST',{action:'add-incentive',creator:'creator',description:'Pounds',currency:'GBP',amount:100,updatedAt:saved.updated_at}));assert.equal(saved.template_json.incentives[2].gbpCents,10000);
 assert.equal((await route.POST(request('POST',{action:'add-incentive',creator:'creator',description:'Too small',currency:'USD',amount:.001,updatedAt:saved.updated_at}))).status,400);
 settings={...saved.template_json,usdToGbpOverride:null};await route.PUT(request('PUT',{settings,updatedAt:saved.updated_at}));fxFail=true;
 result=await route.GET(request('GET'));assert.equal(result.status,200);assert.equal(result.body.fx,null);assert(result.body.fxError.includes('unavailable'));
 console.log('Team earnings API passed: leadership/origin checks, defaults, percent validation, stale-save protection, USD/GBP conversions, preserved incentive history, locked FX and exchange-rate failure.');
})().catch(error=>{console.error(error);process.exit(1)});
