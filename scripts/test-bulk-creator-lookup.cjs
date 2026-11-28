const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const cache=new Map();let db;
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Map,Set,console,require:name=>{if(name==='server-only')return {};if(name==='./creator-api-search/db')return {database:()=>db};return load(path.resolve(path.dirname(file),name+'.ts'));}});return exports;}
const model=load('lib/bulk-creator-lookup.ts'),server=load('lib/bulk-creator-lookup-server.ts');
const names=model.parseLookupNames(' @ALICE \r\n\n@@bob\nAlice\nmiss_spelt\n no manager \n');
assert.deepEqual(Array.from(names),['alice','bob','alice','miss_spelt','no manager']);
const assignments={managerGroups:{firstclassagencykyranashoutlookcom:'Team Dan / James'},managerNames:{firstclassagencykyranashoutlookcom:'Team Kyran & Ash',firstclassagencyashoutlookcom:'Team Ash'},deletedManagers:['firstclassagencyashoutlookcom']};
assert.equal(model.lookupManager({manager_email:'firstclassagency_ash@outlook.com'},assignments),'Team Kyran & Ash');
assert.equal(model.lookupManager({manager_email:'firstclassagencyjames@outlook.com'},{}),'Team Dan & James');
assert.equal(model.lookupManager({manager_email:'deleted'}, {deletedManagers:['deleted']}),'No manager assigned');
const rows=new Map([['alice',{creator_id:'1234567890123456789',manager_email:'firstclassagencyjames@outlook.com'}],['bob',{creator_id:'2234567890123456789'}]]);
const result=model.lookupResults(names,rows,assignments);
assert.equal(result.summary.total,5);assert.equal(result.summary.found,3);assert.equal(result.summary.notFound,2);assert.equal(result.summary.unassigned,1);
assert.equal(model.copyLookupResults(result.results),'alice - Team Dan & James\nbob - No manager assigned\nalice - Team Dan & James\nmiss_spelt - Not found in database\nno manager - Not found in database');
assert.equal(model.parseLookupNames(Array.from({length:10000},(_,i)=>'@creator'+i).join('\n')).length,10000);
async function run(){
 let calls=0;
 db={rpc:async(_,args)=>{calls++;return {data:args.usernames.map(name=>({lookup_username:name,creator_id:'1234567890123456789'})),error:null};},from:()=>{throw Error('Indexed path must not download creator history');}};
 const bulk=Array.from({length:1001},(_,i)=>'creator'+i),found=await server.lookupCreatorRows(bulk);
 assert.equal(found.size,1001);assert.equal(calls,6);
 // Exercise paginated fallback, literal underscores, and current manager after rename.
 const queries=[];let page=0;
 const pages=[Array.from({length:1000},()=>({creator_id:'1234567890123456789',creator_username:'exact_name',manager_email:'old',stat_date:'2026-10-01'})),[],[{creator_id:'1234567890123456789',creator_username:'renamed',manager_email:'new',stat_date:'2026-11-27'}]];
 db={rpc:async()=>({error:{code:'PGRST202'}}),from:()=>{const q={select(){return q},or(v){queries.push(v);return q},order(){return q},in(){return q},range:async()=>({data:pages[page++]||[],error:null})};return q;}};
 const fallback=await server.lookupCreatorRows(['exact_name','not valid']);
 assert.equal(fallback.get('exact_name').manager_email,'new');assert.equal(fallback.has('not valid'),false);assert(queries.some(q=>q.includes('exact\\_name')));assert.equal(page,3);
 if(process.argv.includes('--live')){
  require('@next/env').loadEnvConfig(process.cwd(),true,{info(){},error(){}});
  db=require('@supabase/supabase-js').createClient(process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL,process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const started=Date.now(),a=await server.lookupAssignments(),r=await server.lookupCreatorRows(['jazphoenix','jj_200422','__bulk_test_not_a_creator__']);
  const actual=model.lookupResults(['jazphoenix','jj_200422','__bulk_test_not_a_creator__'],r,a);
  assert.equal(actual.results[0].manager,'Team Kyran & Ash');assert.equal(actual.results[2].status,'not-found');
  const history=await server.lookupManagerHistory(actual.results[0].creatorId,a);assert(history.length>0);
  console.log('Live read-only results:',JSON.stringify(actual),'history entries:',history.length,'elapsed ms:',Date.now()-started);
 }
 console.log('Bulk lookup passed: normalization, exact matching, order/duplicates, aliases, summaries, copy text, 10,000 inputs, indexed batching, paginated fallback, rename resolution and lazy history.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
