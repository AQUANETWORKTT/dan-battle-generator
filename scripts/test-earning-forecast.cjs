const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const m={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/earning-forecast.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:m,Map,Date});
const item=(creatorId,category,impact,patch={})=>({creatorId,username:creatorId,managerKey:'liv',path:['owner','liv'],category,kind:category==='activeness'?'Activeness level 5':category==='rankup'?'Rank up':category==='maintenance'?'Maintain':'Diamond growth',ownerPoolUpliftCents:impact,progress:.8,diamondsNeeded:category==='activeness'?0:12000,daysNeeded:2,hoursNeeded:3.5,targetDays:22,targetHours:80,target:200000,...patch});
const opportunities=[item('multiple','activeness',600),item('multiple','maintenance',600),item('biggest','rankup',1000),item('fallback','diamonds',400),item('multiple','diamonds',9999),item('other-team','rankup',5000,{managerKey:'rach',path:['owner','rach']})];
const managers=[{key:'liv',name:'Team Liv'},{key:'rach',name:'Team Rach'},{key:'owner',name:'Team Dan / James'}];
const rows=m.forecastCreators(opportunities,'liv','all');assert.equal(rows.map(row=>row.id).join(','),'biggest,multiple');assert.equal(rows[1].targets.length,2,'One creator can have activeness and maintenance targets');assert.equal(rows[1].impact,600,'Do not add overlapping targets or prefer growth over realistic milestones');
const message=m.earningForecastMessage(rows,managers,'liv',2,'2026-11-21');assert(message.startsWith('*Team Liv*\n*Earning forecast*'));assert(message.includes('@biggest'));assert(message.includes('@multiple'));assert(!message.includes('@fallback'));assert(!message.includes('@other-team'));assert(message.includes('Activeness level 5'));assert(message.includes('Maintenance:'));assert(message.includes('12,000 more diamonds'));assert(message.includes('2 more LIVE days'));assert(message.includes('3.5 more LIVE hours'));assert(!/[£$€%]|payout|commission|split/i.test(message),'Copied text must not expose financial amounts or rates');assert(!message.includes('1000'),'Ranking amounts must never be interpolated into text');
assert.equal(m.forecastCreators(opportunities,'liv','maintenance').length,1);assert.equal(m.forecastCreators(opportunities,'liv','rankup').length,1);
assert.equal(m.earningForecastMessage(rows,managers,'liv',1,'2026-11-21').split(/\n\d+\. @/).length-1,1);
const all=m.earningForecastMessage(m.forecastCreators(opportunities,'','all'),managers,'',99,'2026-11-21');assert(all.includes('*Team Rach*'));assert(all.includes('*Team Liv*'));assert.equal(all.split(/\n\d+\. @/).length-1,3,'Each creator is listed once regardless of number of targets');
assert.equal(m.earningForecastMessage([],managers,'liv',10,'2026-11-21'),'');
console.log('Earning forecast passed: team/target filters, unique top creators, multiple actions, overlap-safe ranking, count selection, team headings and no financial figures in copied text.');

assert(message.includes('To boost your earnings the most this month, focus on these creators:'));
assert(!message.includes('Reach '));assert(!message.includes('80 LIVE hours'));assert(!message.includes('Based on results'));

const closeRows=m.forecastCreators([item('nearly-there','activeness',1,{progress:.98}),item('nearly-there','rankup',99999,{progress:.65}),item('two-close','activeness',500,{progress:.9}),item('two-close','rankup',600,{progress:.85}),item('far','rankup',999999,{progress:.79})],'liv','all');
assert.equal(closeRows.map(row=>row.id).join(','),'two-close,nearly-there','Balance earnings gain and closeness rather than prioritising tiny gains');
assert.equal(closeRows.find(row=>row.id==='nearly-there').targets.length,1,'A far rank-up must not be attached to a close activeness target');
assert.equal(closeRows.find(row=>row.id==='two-close').targets.length,2,'Include both only when each is close');assert.equal(closeRows.find(row=>row.id==='two-close').targets[0].category,'activeness');
assert.equal(m.forecastCreators([item('boundary','rankup',50,{progress:.8})],'liv','all').length,1);
console.log('Close forecast targets passed: independent 80% minimum, one or multiple close targets, and closeness ordering.');

assert.equal(m.forecastMonthProgress('2026-11-24'),.8);
const paced=m.forecastCreators([item('on-pace','rankup',100,{progress:.64}),item('behind-pace','rankup',10000,{progress:.639}),item('both','activeness',90,{progress:.9}),item('both','rankup',200,{progress:.65})],'liv','all',.8);
assert(paced.some(row=>row.id==='on-pace'),'At 80% through the month, 64% is enough');assert(!paced.some(row=>row.id==='behind-pace'),'High earnings cannot bypass the pace threshold');assert.equal(paced.find(row=>row.id==='both').targets.length,2);
const balanced=m.forecastCreators([item('close-small','rankup',100,{progress:.98}),item('worthwhile','rankup',600,{progress:.8}),item('same-value-farther','rankup',100,{progress:.7})],'liv','all',.8);
assert.equal(balanced[0].id,'worthwhile');assert(balanced.findIndex(row=>row.id==='close-small')<balanced.findIndex(row=>row.id==='same-value-farther'));
console.log('Month pace and balanced priority passed: 64% at 80% elapsed, high-value exclusions below pace, multiple qualified targets and value/proximity weighting.');

const juniorItem=item('leo-creator','activeness',9000,{managerKey:'leo',path:['owner','liv','leo']});
const managerOnly=m.forecastCreators([...opportunities,juniorItem],'liv','all');assert(!managerOnly.some(row=>row.id==='leo-creator'),'Liv forecast excludes her juniors creators');
assert.equal(m.forecastCreators([...opportunities,juniorItem],'leo','all').map(row=>row.id).join(','),'leo-creator','Leo sees only his own creators');
assert(m.forecastCreators([...opportunities,juniorItem],'','all').some(row=>row.id==='leo-creator'),'All teams still includes junior managers');
console.log('Manager-specific forecast passed: direct assignments only, with separate junior selection.');

const combined=m.forecastCreators(opportunities,'liv','maintain-rankup');assert.equal(combined.length,2);assert(combined.every(row=>row.targets.every(target=>['maintenance','rankup'].includes(target.category))));

assert(!m.forecastCreators(opportunities,'liv','all').some(row=>row.id==='fallback'));assert(!all.includes('Diamond growth'));
