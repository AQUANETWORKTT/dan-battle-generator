const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const env={SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY:'local-test-secret-for-star-tracker-32-characters'};
function load(file,deps={}){const box={exports:{},require:name=>{if(name==='server-only')return {};if(name==='node:crypto')return require(name);if(name in deps)return deps[name];throw Error(name);},process:{env},Date,Buffer,URL,Response,Set,Map};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);return box.exports;}
const plain=value=>JSON.parse(JSON.stringify(value));
const model=load('lib/star-tracker.ts'),search=load('lib/creator-api-search/auth.ts'),auth=load('lib/star-tracker-auth.ts',{'./creator-api-search/auth':search});
assert.equal(model.STARTING_STARS,10);
assert.deepEqual(plain(model.STAR_CAMPAIGNS.map(c=>c.label)),['Valid Days 1st','Gift Gallery','Crocodile Countdown','The Jungle Marathon','Jungle Giants','Jungle Ambush','Venemous Victory']);
assert.equal(model.starTotal({awards:{'gift-gallery':{stars:10},'jungle-giants':{stars:10},'crocodile-countdown':{stars:5}}}),35);
for(const agency of ['Horizon','Respawn','Paradise','Atlas','Dragonheart','Vanguard','Honey Bloom','Trident','Aqua'])assert.equal(model.firstClassStarCreator({agency,creator_username:'firstclass_person'},{}),false);
assert.equal(model.firstClassStarCreator({agency:'First Class',manager_email:'manager@example.com'},{managerexamplecom:'Respawn'}),false);
assert.equal(model.firstClassStarCreator({agency:'First Class',manager_email:'normal@example.com'},{}),true);
assert.equal(model.firstClassStarCreator({agency:'First Class',group_name:'Dragonheart sub agency'},{}),false);
assert.equal(model.firstClassStarCreator({agency:'First Class',manager_email:'jbollins997@example.com'},{}),false);
const valid={creatorId:'10001',campaign:'gift-gallery',stars:0,revision:0};assert(model.validStarInput(valid));
for(const override of [{stars:-1},{stars:1.5},{stars:'2'},{stars:1000001},{revision:-1},{campaign:'starting'},{creatorId:'username'}])assert(!model.validStarInput({...valid,...override}));
const token=auth.starSessionToken();assert(auth.starSessionValid(token));assert(!auth.starSessionValid('true'));assert(!auth.starSessionValid(token.replace('star-tracker','leadership')));assert(!auth.starSessionValid(token.slice(0,-1)+(token.endsWith('0')?'1':'0')));assert(!auth.starSessionValid(auth.starSessionToken(Date.now()-31*86400000)));
const roster=Array.from({length:1005},(_,i)=>({creator_id:String(10001+i),creator_username:'creator_'+i,agency:'First Class',stat_date:'2026-11-02',manager_email:'internal@example.com'}));
roster.push({creator_id:'90001',creator_username:'external',agency:'Respawn',stat_date:'2026-11-02'});
const tables={creator_daily_stats:roster,poster_templates:[{name:'manager-assignment-settings',template_json:{assignments:{managerGroups:{}}}}]};
class Query{
 constructor(table){this.table=table;this.filters=[];this.op='read';}
 select(){return this;}eq(key,value){this.filters.push(row=>key.includes('->>')?String(row[key.split('->>')[0]]?.[key.split('->>')[1]])===value:row[key]===value);return this;}
 like(key,value){this.filters.push(row=>String(row[key]).startsWith(value.replace(/%$/,'')));return this;}
 or(){return this;}order(){return this;}limit(n){this.last=n-1;return this;}range(first,last){this.first=first;this.last=last;return this;}maybeSingle(){this.one=true;return this;}single(){this.one=true;return this;}
 insert(value){this.op='insert';this.value=plain(value);return this;}update(value){this.op='update';this.value=plain(value);return this;}
 then(ok,bad){try{const table=tables[this.table];let rows=table.filter(row=>this.filters.every(f=>f(row)));if(this.op==='insert'){if(table.some(row=>row.name===this.value.name))return Promise.resolve({data:null,error:{code:'23505',message:'Duplicate name'}}).then(ok,bad);table.push(this.value);rows=[this.value];}if(this.op==='update')rows.forEach(row=>Object.assign(row,this.value));rows=rows.slice(this.first||0,this.last===undefined?undefined:this.last+1);return Promise.resolve({data:plain(this.one?rows[0]||null:rows),error:null}).then(ok,bad);}catch(error){return Promise.reject(error).then(ok,bad);}}
}
const db={from:name=>new Query(name)};
const store=load('lib/star-tracker-store.ts',{'./creator-api-search/db':{database:()=>db},'./star-tracker':model});
const next={json:(data,opts)=>Response.json(data,opts)};
const api=load('app/api/star-tracker/route.ts',{'next/server':{NextResponse:next},'@/lib/star-tracker-auth':auth,'@/lib/star-tracker-store':store,'@/lib/star-tracker':model});
function request(body={},signed=true,origin='http://localhost:3105'){return {cookies:{get:name=>signed&&name===auth.STAR_COOKIE?{value:token}:undefined},headers:new Headers({host:'localhost:3105',origin}),nextUrl:new URL('http://localhost:3105/api/star-tracker'),json:async()=>body};}
(async()=>{
 assert.equal((await api.GET(request({},false))).status,401);assert.equal((await api.PATCH(request(valid,false))).status,401);assert.equal((await api.PATCH(request(valid,true,'https://elsewhere.test'))).status,403);assert.equal((await api.PATCH(request({...valid,stars:-1}))).status,400);
 const first=await store.readTracker();assert.equal(first.creators.length,1005);assert.equal(model.starTotal(first.creators[0]),10);
 const saved=await store.saveStarAward(valid);assert.equal(saved.stars,0);assert.equal(saved.revision,1);
 const repeated=await store.saveStarAward(valid);assert.equal(repeated.revision,1);assert.equal(tables.poster_templates.filter(row=>row.name.startsWith(store.STAR_PREFIX)).length,1);
 const earned=await store.saveStarAward({...valid,stars:10,revision:1});assert.equal(earned.revision,2);
 await store.saveStarAward({...valid,campaign:'jungle-giants',stars:10});await store.saveStarAward({...valid,campaign:'crocodile-countdown',stars:5});
 let restored=await store.readTracker();assert.equal(model.starTotal(restored.creators.find(c=>c.id==='10001')),35);
 const race=await Promise.allSettled([store.saveStarAward({...valid,stars:7,revision:2}),store.saveStarAward({...valid,stars:9,revision:2})]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(race.filter(r=>r.status==='rejected'&&r.reason instanceof store.StarConflict).length,1);
 roster[0].creator_username='renamed_creator';roster.push({creator_id:'80001',creator_username:'new_creator',agency:'First Class',stat_date:'2026-11-02'});
 restored=await store.readTracker();assert.equal(restored.creators.length,1006);assert.equal(restored.creators.find(c=>c.id==='10001').username,'renamed_creator');assert(restored.creators.find(c=>c.id==='10001').awards['jungle-giants']);
 const conflict=await api.PATCH(request({...valid,stars:20,revision:0}));assert.equal(conflict.status,409);assert.equal((await conflict.json()).award.revision,3);
 await assert.rejects(()=>store.saveStarAward({...valid,creatorId:'90001'}),/not in the current First Class roster/);
 console.log('Star Tracker tests passed: exact columns, 10 starting stars, totals, all agency exclusions, >1000 creators, stable IDs, permanent store/reload, zero, idempotent retries, concurrent revision conflicts and signed API access.');
})().catch(error=>{console.error(error);process.exitCode=1;});
