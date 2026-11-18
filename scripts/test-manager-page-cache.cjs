const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function compile(source,globals){const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,...globals});return exports;}
(async()=>{
 let requests=0,fail=false;
 const posters=compile(fs.readFileSync('lib/manager-page-data.ts','utf8'),{fetch:async()=>{requests++;if(fail)throw Error('Offline');return Response.json({templates:['saved']});}});
 const pair=await Promise.all([posters.managerPageFetch('/templates'),posters.managerPageFetch('/templates')]);
 assert.equal(requests,1);assert.equal((await pair[0].json()).templates[0],'saved');assert.equal((await pair[1].json()).templates[0],'saved','Each consumer gets its own readable response');
 posters.clearManagerPageData();fail=true;await assert.rejects(()=>posters.managerPageFetch('/templates'),/Offline/);fail=false;await posters.managerPageFetch('/templates');assert.equal(requests,3,'Failed loads can be retried');

 const source=fs.readFileSync('app/manager/Portal.tsx','utf8');
 const functions=source.slice(source.indexOf('const overviewVersions'),source.indexOf('export function Picture'));
 let counts={},revision='upload-one',posterClears=0;
 const portal=compile(functions,{clearManagerPageData:()=>posterClears++,fetch:async url=>{const key=url.split('/').at(-1);counts[key]=(counts[key]||0)+1;return Response.json(key.includes('overview')?{snapshotVersion:revision}:{items:['ready']});}});
 for(const page of ['overview','development','inactive','leaderboard']){
  await Promise.all([portal.portalRequest(page),portal.portalRequest(page)]);
  await portal.portalRequest(page);
  assert.equal(counts[page],1,page+' must reuse its request across navigation');
 }
 // Login/logout boundaries discard the previous account's browser cache.
 await portal.portalRequest('logout',{});revision='upload-two';await portal.portalRequest('overview');await portal.portalRequest('leaderboard');
 assert.equal(counts.overview,2);assert.equal(counts.leaderboard,2);assert(posterClears>=2);
 console.log('Manager page caching passed: prefetch deduplication, page reuse, retry, independent response bodies and logout clearing.');
})().catch(e=>{console.error(e);process.exit(1)});
