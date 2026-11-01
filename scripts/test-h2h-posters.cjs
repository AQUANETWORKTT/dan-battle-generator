const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const moduleContext = {exports:{},Date,Map,Set};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/h2h-posters.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,moduleContext);
const h = moduleContext.exports;
const plain = value => JSON.parse(JSON.stringify(value));
const timing = {fillMissing:true,start:'20:00',interval:5};

const supplied = h.parseH2H(h.H2H_EXAMPLE,timing);
assert.equal(supplied.errors.length,0);
assert.equal(supplied.rows.length,16);
assert.equal(h.validateH2H(supplied.rows).errors.length,0);
assert.equal(h.validateH2H(supplied.rows).warnings.length,0);
assert.equal(supplied.rows[1].name1,'penii1722');
assert.equal(supplied.rows[1].name2,'dad.of.286');
assert.equal(supplied.rows[0].name2,'Itsriverlea');
assert.equal(supplied.rows[6].name1,'Sallytuffery69');
assert.equal(h.h2hDate('2026-11-02'),'MONDAY 2ND NOVEMBER');
assert.equal(h.h2hDate('2026-02-30'),'');
assert.equal(h.h2hDate('2028-02-29'),'TUESDAY 29TH FEBRUARY');
assert.equal(h.h2hTime(supplied.rows[1].minutes),'8:05PM');
assert.equal(h.h2hTime(supplied.rows.at(-1).minutes),'9:15PM');

const images=Object.fromEntries(supplied.rows.flatMap(r=>[r.name1,r.name2]).map(name=>[name.toLowerCase(),`image-for-${name}`]));
const posters=h.h2hPosters(supplied.rows,'2026-11-02',images);
assert.equal(posters.length,32);
assert.equal(posters[0].name1,'DENS2511');
assert.equal(posters[0].name2,'ITSRIVERLEA');
for(let i=0;i<posters.length;i+=2){
  const [a,b]=[posters[i],posters[i+1]];
  assert.equal(a.name1,b.name2);assert.equal(a.name2,b.name1);
  assert.equal(a.image1,b.image2);assert.equal(a.image2,b.image1);
  assert.equal(a.date,b.date);assert.equal(a.time,b.time);
  assert.equal(a.image1,images[a.name1.toLowerCase()]);
}
assert.equal(new Set(posters.map(h.h2hFilename)).size,32);
assert.throws(()=>h.h2hPosters(supplied.rows,'2026-02-30',images),/valid event date/);

const markdown=h.parseH2H('| **Time** | Creator 1 | Creator 2 |\n|---|---|---|\n| **8:07 PM** | @one.name | two_name |',timing);
assert.equal(markdown.errors.length,0);assert.equal(markdown.rows.length,1);assert.equal(h.h2hTime(markdown.rows[0].minutes),'8:07PM');
const interval=h.parseH2H('one\ttwo\nthree\tfour\nfive\tsix',{...timing,interval:7});
assert.deepEqual(plain(interval.rows.map(r=>h.h2hTime(r.minutes))),['8PM','8:07PM','8:14PM']);
const exact=h.parseH2H('20:03\tone\ttwo\n20:11\tthree\tfour',{...timing,interval:15});
assert.deepEqual(plain(exact.rows.map(r=>h.h2hTime(r.minutes))),['8:03PM','8:11PM']);
assert.equal(h.h2hTime(h.h2hMinutes('12AM')),'12AM');
assert.equal(h.h2hTime(h.h2hMinutes('12:05PM')),'12:05PM');
assert.equal(h.h2hMinutes('8:99PM'),null);assert.equal(h.h2hMinutes('24:00'),null);
assert(h.parseH2H('23:99\tone\ttwo',timing).errors.length);
assert(h.parseH2H('bad/name\ttwo',timing).errors.length);
assert(h.parseH2H('one\ttwo',{...timing,fillMissing:false}).errors.length);
assert(h.parseH2H('one\ttwo\nthree\tfour',{...timing,start:'23:59',interval:5}).errors.length);
const duplicate=h.parseH2H('8PM\tOne\tTwo\n8PM\ttwo\tone',timing).rows;
assert(h.validateH2H(duplicate).errors.some(e=>e.includes('duplicate')));
assert.throws(()=>h.h2hPosters(duplicate,'2026-11-02',{}),/duplicate/);
assert(h.validateH2H(h.parseH2H('8PM\tOne\tone',timing).rows).errors.some(e=>e.includes('themselves')));
assert(h.validateH2H(h.parseH2H('8PM\tOne\tTwo\n8:05PM\tOne\tThree',timing).rows).warnings.length);
console.log('H2H checks passed: 16 matchups / 32 mirrored posters, exact times, arbitrary intervals, dates, names, pictures and duplicate guards.');
