const fs=require('node:fs');const report=JSON.parse(fs.readFileSync('tmp/battle-decline-report.json','utf8'));
const f=n=>n.toLocaleString('en-GB');
const groups=new Map();
for(const row of report.rows){
 const average=row.liveDays?row.current/row.liveDays:0,rounded=Math.round(average),target=row.current===0?3:Math.max(3,rounded+2);
 const daily=row.liveDays?(row.current===0?`No battles are recorded across your ${row.liveDays} LIVE ${row.liveDays===1?'day':'days'} so far. Can we aim for ${target} battles each day you're LIVE to get things moving again?`:`You're averaging roughly ${rounded<1?'less than one':f(rounded)} ${rounded===1?'battle':'battles'} per LIVE day. Can we aim for ${f(target)} each day you're LIVE and build from there?`):`There are no LIVE days recorded so far this month. Can we plan your next LIVE and aim for ${target} battles per LIVE day to get started again?`;
 const message=`Hey! Just had a look at your battles. You're on ${f(row.current)} for 1–21 November, compared with ${f(row.previous)} over the same dates in October — ${f(row.down)} fewer (${row.drop}% down). Just a reminder, around 80% of diamonds come from battles. ${daily}`;
 row.message=message;row.suggested=target;row.roundedAverage=rounded;
 const items=groups.get(row.manager)||[];items.push(row);groups.set(row.manager,items);
}
let lines=['BATTLE CHECK-IN MESSAGES','Latest upload: 21 November 2026','Comparison: 1–21 November against 1–21 October 2026','Scope: Team Dan / James and its managers; 50K+ diamonds this month or last month; battles down at least 20%.','Daily averages use days LIVE, not calendar days. Targets are suggested increases of about two battles per LIVE day. The 80% reminder uses your supplied wording.','','42 individual messages — copy the paragraph beneath each username.'];
for(const [manager,rows] of groups){lines.push('','='.repeat(64),manager.toUpperCase(),'='.repeat(64));for(const row of rows)lines.push('',`@${row.username}`,'',row.message,'');}
fs.writeFileSync('outputs/battle-check-in-messages-2026-11-21.txt',lines.join('\r\n'));
let summary=['BATTLE DECLINES — DAN / JAMES SIDE','1–21 November versus 1–21 October 2026','All listed creators met the 50K+ either-month cutoff. No diamond totals are shown.',''];
for(const [manager,rows] of groups){summary.push(manager);for(const r of rows)summary.push(`@${r.username}: ${f(r.previous)} → ${f(r.current)} battles; ${f(r.down)} fewer (${r.drop}% down). ${r.liveDays?`${r.average} per LIVE day; suggest ${r.suggested}.`:'No LIVE days this month; suggest 3 when returning.'}`);summary.push('');}
fs.writeFileSync('outputs/battle-decline-summary-2026-11-21.txt',summary.join('\r\n'));
if(report.rows.length!==42||new Set(report.rows.map(r=>r.id)).size!==42)throw Error('Unexpected creator count');
for(const r of report.rows){if(r.previous-r.current!==r.down||r.current/r.previous>.8+1e-9)throw Error('Bad comparison '+r.username);if(r.message.includes('£')||r.message.includes('$'))throw Error('Unexpected money in message');}
console.log(JSON.stringify({count:report.rows.length,managers:[...groups].map(([name,rows])=>({name,count:rows.length})),examples:report.rows.filter(r=>['bradley0x','mavismim','kayjb_3'].includes(r.username)).map(r=>({username:r.username,message:r.message}))},null,2));
