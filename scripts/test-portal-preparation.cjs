const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file,mocks){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Buffer,Date,Intl,console:{error(){}},require:n=>n in mocks?mocks[n]:require(n)});return exports;}
(async()=>{
 let calls=[],fail=true;
 const warmer=load('lib/prepare-manager-portals.ts',{
  'server-only':{},
  '@/app/api/poster-templates/route':{GET:async()=>{calls.push(['posters']);return {ok:true};}},
  './manager-leaderboard-server':{loadManagerLeaderboard:async tier=>calls.push(['leaderboard',tier])},
  './manager-overview-server':{loadOverviewSnapshot:async(...args)=>{calls.push(['overview',...args]);}},
  './creator-development-server':{loadCreatorDevelopment:async(scope)=>{calls.push(['development',scope]);if(fail&&scope===null)throw Error('Temporary database failure');}},
  './inactive-creators':{loadInactiveCreators:async(scope)=>calls.push(['inactive',scope])},
 });
 const first=await warmer.prepareManagerPortals();
 assert.equal(first.ready,false);assert.equal(first.failures.join(','),'owner development');
 assert.equal(calls.length,10,'One failed section must not prevent the others preparing');
 assert.equal(calls.filter(c=>c[0]==='development').length,2,'Prepare shared manager and owner results, not one expensive calculation per manager');
 assert(calls.some(c=>c[0]==='overview'&&c[2]===true),'Include the incremental chart');
 fail=false;calls=[];assert.equal((await warmer.prepareManagerPortals()).ready,true,'Failed preparations must be retryable');

 let generation=0;const store=new Map();let attempts=0;
 const {portalResultCache}=load('lib/portal-result-cache.ts',{
  'server-only':{},'./manager-portal-cache':{PORTAL_DATA_TAG:'portal'},
  './local-portal-snapshot':{localPortalSnapshot:(_,build)=>build()},
  'next/cache':{unstable_cache:(build,version)=>async(...args)=>{const key=JSON.stringify([version,...args,generation]);if(store.has(key))return store.get(key);const value=await build(...args);store.set(key,value);return value;}},
 });
 const snapshot=portalResultCache(async all=>{attempts++;if(fail)throw Error('Unavailable');return {all,upload:generation,creators:['fresh']};},'test');
 assert.equal((await snapshot(true)).upload,0);await snapshot(true);assert.equal(attempts,1);
 await snapshot(false);assert.equal(attempts,2,'Keep owner and manager snapshots separate');
 generation++;fail=true;await assert.rejects(()=>snapshot(true),/Unavailable/,'Never fall back to the old upload on failure');
 fail=false;assert.equal((await snapshot(true)).upload,1,'A retry must use the latest generation');
 console.log('Portal preparation passed: shared warming, owner separation, section failures, retry, invalidation and no stale fallback.');
})().catch(e=>{console.error(e);process.exit(1)});
