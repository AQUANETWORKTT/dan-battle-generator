const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const engine={};
function evaluate(file,mocks,exports={}){vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Map,Set,Date,process,require:name=>mocks[name]});return exports;}
evaluate('lib/team-earnings.ts',{},engine);
const creator=(id,managerKey)=>({id,username:id,managerKey,diamonds:300000,previousDiamonds:200000,hours:20,validDays:8});
const agency=[creator('dan','firstclassagencydan'),creator('abbie','abbie'),creator('mike','mikehalesjb'),creator('megan','megan')];
const assignments={managerGroups:{abbie:'Team Dan / James',megan:'Team Mike / Indi',removed:'Team Dan / James'},deletedManagers:['removed'],managerParents:{abbie:'removed'},managerNames:{abbie:'Abbie',megan:'Megan'}};
const db={from(table){let name;const q={select(){return q},eq(key,value){if(key==='name')name=value;return q},order(){return q},range:async()=>({data:[],error:null}),maybeSingle:async()=>({data:{template_json:name==='manager-assignment-settings'?{assignments}:{}},error:null})};return q;}};
const source=evaluate('lib/team-earnings-server.ts',{
 'server-only':{},'./creator-api-search/db':{database:()=>db},
 './manager-overview-server':{loadOverview:async()=>({creators:agency,month:'2026-11',previous:'2026-10',latest:'2026-11-20',total:1200000})},
 './portal-result-cache':{portalResultCache:fn=>fn},'./recruitment-team-owner':{recruitmentTeamOwner:key=>key},
 './recruitment-manager-aliases':{recruitmentManagerIdentity:key=>key},
 './incremental-targets':{DEFAULT_AGENCY_TARGET:10000000,incrementalTargets:()=>[],incrementalPrediction:()=>5},'./team-earnings':engine,
});
(async()=>{
 const result=await source.loadTeamEarningsSources();
 assert.equal(result.creators.map(c=>c.username).join(','),'dan,abbie');
 assert(!result.managers.some(m=>m.key==='removed'),'Deleted assignments must not reappear in earnings');
 assert.equal(result.managers.find(m=>m.key==='abbie').parent,'owner:Team Dan / James','Deleted parents fall back to the owner');
 assert(result.managers.every(m=>m.group==='Team Dan / James'));
 assert.equal(Array.isArray(result.agencyCreators),false,'Other agency creators must not be returned to the page');
 assert.equal(result.agencyCreators.eligible,4,'Advanced eligibility still uses the whole agency');
 const settings=engine.defaultEarningsSettings();
 const fromSummary=engine.calculateTeamEarnings(result.creators,result.agencyCreators,result.managers,settings,5);
 const fromRows=engine.calculateTeamEarnings(result.creators,agency,result.managers,settings,5);
 assert.equal(fromSummary.grossCents,fromRows.grossCents);
 assert.equal(JSON.stringify(engine.earningsOpportunities(result.creators,result.agencyCreators,result.managers,settings,5)),JSON.stringify(engine.earningsOpportunities(result.creators,agency,result.managers,settings,5)));
 console.log('Earnings scope passed: Dan / James only, no Mike / Indi creator payload, agency bonus calculations preserved.');
})().catch(error=>{console.error(error);process.exit(1)});
