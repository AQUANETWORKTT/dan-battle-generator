const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
const compile=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const steps={exports:{}};vm.runInNewContext(compile('lib/onboarding-steps.ts'),steps);
let downloaded;
const report={exports:{},Blob,location:{origin:'http://localhost'},fetch:async()=>({ok:false}),setTimeout:()=>0,URL:{createObjectURL:blob=>{downloaded=blob;return 'blob:test'},revokeObjectURL:()=>{}},document:{createElement:()=>({click(){}})},require(id){if(id.includes('onboarding-steps'))return steps.exports;if(id.includes('onboarding-report-data'))return{onboardingAdvice:()=>[]};throw Error(id)}};
vm.runInNewContext(compile('app/onboarding/report.ts'),report);
(async()=>{
 await report.exports.downloadOnboardingReport({username:'example',manager:'Manager',days:12,reportStart:'2026-10-01',reportEnd:'2026-10-12',weekly:{diamonds:100,hours:5,liveDays:3,matches:2},daily:[],notes:'General feedback',stepNotes:{1:'Chat created',3:'Lighting & audio checked',12:'Signed off'},handoverNotes:'Manager handover <important>'});
 const html=await downloaded.text();
 for(const step of steps.exports.onboardingSteps)assert(html.includes(`<h2>Day ${step.day} · `));
 for(const text of ['Chat created','Lighting &amp; audio checked','Signed off','General feedback','Manager handover &lt;important&gt;','Day 12 · Handover to the manager'])assert(html.includes(text));
 assert(!html.includes('<important>'));assert(!html.includes('Week 1'));assert(!html.includes('Week 2'));
 console.log('Passed: downloaded manager report contains all 12 steps, saved step notes, general notes and escaped Day 12 handover. No real records changed.');
})().catch(e=>{console.error(e);process.exitCode=1});
