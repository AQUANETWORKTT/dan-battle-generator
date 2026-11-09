const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file,require){const context={exports:{},require,Date,Map,Set};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);return context.exports;}
const base=load('lib/h2h-posters.ts'),h=load('lib/h2h-2v2.ts',()=>base),timing={fillMissing:true,start:'19:30',interval:5};
const p=h.parseH2H2v2(h.H2H_2V2_EXAMPLE,timing);
assert.equal(p.errors.length,0);assert.equal(p.rows.length,8);assert.equal(h.validateH2H2v2(p.rows).errors.length,0);
assert.equal(p.rows[3].minutes,20*60+5);assert.equal(p.rows[1].name3,'she_is_unstoppable_');
const images=Object.fromEntries(p.rows.flatMap(r=>[r.name1,r.name2,r.name3,r.name4]).map(n=>[n,'photo:'+n]));
const posters=h.h2h2v2Posters(p.rows,'2026-11-09',images);assert.equal(posters.length,32);
const r=p.rows[0],n=[r.name1,r.name2,r.name3,r.name4];
for(const [i,order]of [[0,1,2,3],[2,3,0,1],[1,0,3,2],[3,2,1,0]].entries())for(let slot=0;slot<4;slot++){
 assert.equal(posters[i]['name'+(slot+1)],n[order[slot]].toUpperCase());assert.equal(posters[i]['image'+(slot+1)],'photo:'+n[order[slot]]);
 assert.equal(posters[i].time,'7:30PM');
}
const md=h.parseH2H2v2('| **8:05 PM** | a | b |\n|---|---|---|\n| | c | d |\n| | | |',timing);assert.equal(md.errors.length,0);assert.equal(md.rows.length,1);
assert.equal(h.parseH2H2v2('8PM\ta\tb',timing).errors.length,1);
assert.ok(h.parseH2H2v2('8PM\ta\tb\n9PM\tc\td',timing).errors.length);
const intervals=h.parseH2H2v2('a\tb\nc\td\ne\tf\ng\th',timing);assert.equal(intervals.rows[1].minutes,1175);
assert.ok(h.validateH2H2v2([{...r,name4:r.name1}]).errors.length);
assert.ok(h.validateH2H2v2([r,{...r,name1:r.name2,name2:r.name1,name3:r.name4,name4:r.name3}]).errors.length);
console.log('PASS: eight supplied matchups, 32 posters, exact times, four orientations, matching photos, Markdown, intervals and invalid input.');
for(const positions of [[[0,0],[500,0],[0,500],[500,500]],[[0,0],[0,500],[500,0],[500,500]]]){
 const layout=Object.fromEntries(positions.map(([x,y],i)=>['avatar'+(i+1),{x,y,width:200}]));
 const slots=h.h2hTeamSlots(layout);
 for(const poster of posters.slice(0,4)){
  const teamOrder=[poster.name1,poster.name3,poster.name2,poster.name4];
  const placed=Object.fromEntries(slots.map((slot,i)=>[slot,teamOrder[i]]));
  const left=Object.keys(layout).filter(k=>layout[k].x===0).map(k=>placed[Number(k.slice(6))]).sort();
  assert.ok([ [n[0],n[2]], [n[1],n[3]] ].some(team=>JSON.stringify(team.map(s=>s.toUpperCase()).sort())===JSON.stringify(left)));
  assert.equal(placed[slots[0]],poster.name1);
 }
}
console.log('PASS: teams remain in columns and filename owner stays top-left with row-numbered and column-numbered templates.');
