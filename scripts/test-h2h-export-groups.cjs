const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const m={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/h2h-export-groups.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:m,Map});
const posters=[{name1:'@HORIZON_PERSON',name2:'external'},{name1:'external',name2:'horizon_person'},{name1:'firstclass',name2:'other'},{name1:'paradise',name2:'friend'},{name1:'respawn',name2:'friend'}];
const members=[{username:'horizon_person',group:'Horizon',manager:'Ignored'},{username:'firstclass',group:'Team Dan / James',manager:'Team Abbie'},{username:'paradise',group:'Paradise',manager:'Ignored'},{username:'respawn',group:'Respawn',manager:'Ignored'}];
const plan=m.h2hExportPlan(posters,members);
assert.equal(plan.length,5);assert.equal(plan.map(p=>p.folder).join('|'),'Horizon|Unsorted|First Class/Team Abbie|Paradise|Respawn');
assert.equal(plan[0].poster.name2,'external','External opponent stays on the agency poster');
assert.equal(m.h2hExportFolder({username:'x',group:'Team Mike / Indi',manager:'Team Megan'}),'First Class/Team Megan');
assert.equal(m.h2hExportFolder({username:'x',group:'First Class',manager:'../Team : slash/test'}),'First Class/..-Team - slash-test');
assert.equal(m.h2hExportPlan(posters,[]).length,posters.length);assert(m.h2hExportPlan(posters,[]).every(entry=>entry.folder==='Unsorted'));
assert.equal(new Set(plan.map(entry=>entry.poster)).size,posters.length,'Every poster appears exactly once');
console.log('H2H export grouping passed: all orientations preserved, unmatched in Unsorted, opponents retained, sub-agency folders, First Class managers and safe ZIP paths.');

assert.equal(m.h2hExportFolder({username:'exempt',group:'Exempt',manager:'Unused'}),'Unsorted');
assert.equal(m.h2hExportPlan([{name1:'exempt',name2:'external'}],[{username:'exempt',group:'Exempt',manager:'Unused'}])[0].folder,'Unsorted');
