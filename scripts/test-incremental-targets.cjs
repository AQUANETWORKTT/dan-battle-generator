const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(path,deps={}){const box={exports:{},require:n=>deps[n],Response,URL,Date,Map};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);return box.exports;}
const model=load('lib/incremental-targets.ts');
const rows=model.incrementalTargets(50000000,30,30);
assert.deepEqual(Array.from(rows,r=>r.level),[2,3,4,5,7,8,9,10,11,12,13,14,15]);
assert.deepEqual(Array.from(rows,r=>r.completion),[70,75,80,85,90,95,100,105,110,115,120,125,130]);
assert.equal(rows[0].monthlyTotal,35000000);assert.equal(rows[6].monthlyTotal,50000000);assert.equal(rows[12].monthlyTotal,65000000);
assert.equal(model.incrementalTargets(50000000,30,15)[6].dayTarget,25000000);
for(const row of rows)assert.equal(model.incrementalPrediction(row.dayTarget,rows),row.level);
assert.equal(model.incrementalPrediction(0,rows),0);assert(Number.isFinite(model.incrementalPrediction(1,model.incrementalTargets(1,31,1))));
for(const input of ['50M','50,000,000','50000k'])assert.equal(model.parseAgencyTarget(input),50000000);
for(const input of ['', '0','-5','50oops','NaN','Infinity','1.1','999999999999999999'])assert.equal(model.parseAgencyTarget(input),null);
const records=new Map([['incremental-data-tracking-2026-11',{entries:[{day:30,diamonds:50000000,prediction:14,targetLabel:'14% TARGET',savedAt:'2026-11-01'}]}]]);
const db={from(){let name;return {select(){return this;},eq(_,value){name=value;return this;},async maybeSingle(){return {data:records.has(name)?{template_json:records.get(name)}:null,error:null};},async upsert(record){records.set(record.name,record.template_json);return {error:null};}};}};
class Reply extends Response{static json(value,init={}){return new Reply(JSON.stringify(value),init);}}
const api=load('app/api/data/incremental-tracking/route.ts',{'next/server':{NextResponse:Reply},'@/lib/submissions-supabase':{submissionsSupabase:db},'@/lib/incremental-targets':model});
const request=(body,method='PATCH')=>new Request('http://localhost/api/data/incremental-tracking',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
(async()=>{
 const before=JSON.stringify(records.get('incremental-data-tracking-2026-11'));
 assert.equal((await api.PATCH(request({month:'2026-11',agencyTarget:0}))).status,400);
 assert.equal((await api.PATCH(request({month:'2026-11',agencyTarget:50000000}))).status,200);
 assert.equal(JSON.stringify(records.get('incremental-data-tracking-2026-11')),before);
 let data=await (await api.GET(new Request('http://localhost/api/data/incremental-tracking?month=2026-11'))).json();assert.equal(data.agencyTarget,50000000);assert.equal(data.entries[0].prediction,9);
 await api.PUT(request({month:'2026-11',entries:[{day:15,diamonds:25000000,prediction:9,targetLabel:'9% TARGET'}]},'PUT'));
 data=await (await api.GET(new Request('http://localhost/api/data/incremental-tracking?month=2026-11'))).json();assert.equal(data.agencyTarget,50000000);assert.equal(data.entries[0].diamonds,25000000);assert.equal(data.entries[0].prediction,9);
 data=await (await api.GET(new Request('http://localhost/api/data/incremental-tracking?month=2026-10'))).json();assert.equal(data.agencyTarget,model.DEFAULT_AGENCY_TARGET);
 console.log('PASS: all 13 completion/incremental mappings, whole-number thresholds, daily pace, interpolation, input validation, monthly persistence, recalculated history and separate saves preserving targets and daily totals.');
})().catch(e=>{console.error(e);process.exitCode=1;});
