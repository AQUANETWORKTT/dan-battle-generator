const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path'),assert=require('node:assert/strict');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Map,require:name=>load(path.resolve(path.dirname(file),name+'.ts'))});return exports;}
const {h2hDirectoryMembers}=load('lib/h2h-export-directory.ts'),{h2hExportPlan}=load('lib/h2h-export-groups.ts');
const assignments={managerGroups:{firstclassagencykyranashoutlookcom:'Team Dan / James',rachgmailcom:'Unassigned',paradoxrespawnhotmailcom:'Respawn'},managerNames:{firstclassagencykyranashoutlookcom:'Team Kyran & Ash',rachgmailcom:'Team Rach'}};
const rows=[{creator_username:'JAZPHOENIX',manager_email:'firstclassagency_ash@outlook.com',group_name:'Excluded'},{creator_username:'rosiehughes81',manager_email:'ashwalbridge@aol.com'}, {creator_username:'rachcreator',manager_email:'rach@gmail.com'}, {creator_username:'respawncreator',manager_email:'paradoxrespawn@hotmail.com'}, {creator_username:'exemptcreator',group_name:'Exempt'}];
const members=h2hDirectoryMembers(rows,assignments),plan=h2hExportPlan([...rows.map(row=>({name1:row.creator_username})),{name1:'unknown'}],members);
assert.equal(plan[0].folder,'First Class/Team Kyran & Ash');assert.equal(plan[1].folder,'First Class/Team Kyran & Ash');
assert.equal(plan[2].folder,'First Class/Team Rach');assert.equal(plan[3].folder,'Respawn');assert.equal(plan[4].folder,'Unsorted');assert.equal(plan[5].folder,'Unsorted');
assert.equal(plan.length,6,'No poster is dropped');
console.log('Assignment directory passed: saved manager names/groups override old upload groups, Kyran & Ash aliases combine, Rach gets own First Class folder, unknowns are kept.');
