const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,Map,Set,require:n=>n.startsWith('.')?load(path.resolve(path.dirname(file),n+'.ts')):require(n)});return exports;}
const {creatorJoiningDate,elapsedJoiningDays}=load('lib/creator-joining-date.ts'),reminder=load('lib/app-link-reminder.ts'),{buildCreatorHistory}=load('lib/creator-history.ts');
function check(joined,days,expected){const rows=[{stat_date:'2026-11-20',days_since_joining:days,join_time:joined+' 12:30:00 (UTC+0)'}],date=creatorJoiningDate(rows);assert.equal(date.date,joined);assert.equal(buildCreatorHistory(rows).joinedDate,joined);assert.equal(reminder.appLinkDue({joinedDate:date.date,appLinkDays:elapsedJoiningDays(date.date,'2026-11-21')}),expected);}
check('2026-11-20',2,false);check('2026-11-19',3,false);check('2026-11-18',4,true);check('2026-11-17',5,false);
assert.equal(creatorJoiningDate([{stat_date:'2026-11-20',days_since_joining:2}]).date,'2026-11-20','First saved day must not be backdated just because the counter already says 2');
assert.equal(elapsedJoiningDays('2026-10-24','2026-10-27'),3,'Calendar days remain stable across UK daylight saving');
assert.equal(reminder.appLinkDue({appLinkDays:null}),false);
assert(reminder.appLinkDue({joinedDate:'2026-11-18',appLinkDays:4}),'Keep a new unfinished reminder after its due day');
assert(!reminder.appLinkDue({joinedDate:'2026-01-01',appLinkDays:324}),'No historic backlog');
const creator={id:'123',managerKey:'abbie',appLinkDays:5};
assert.equal(reminder.appLinkTaskId(creator),'app-link:123','Onboarding completion must not reset each month');
assert(reminder.appLinkCompleted(creator,[{id:'app-link:2026-10:123',managerKey:'abbie',completed:true}]),'Preserve previously completed month-based reminders');
assert(!reminder.appLinkCompleted(creator,[{id:'app-link:2026-10:123',managerKey:'abbie',completed:true},{id:'app-link:123',managerKey:'abbie',completed:false}]),'New explicit undo overrides old completion');
console.log('App-link reminder passed: actual join date, 18th/19th/20th cutoff on 21st, overdue tasks, lookup consistency, DST and persistent completion.');
