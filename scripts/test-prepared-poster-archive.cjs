const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict'),JSZip=require('jszip');
const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/prepared-poster-archive.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports:out,require,Set,Uint8Array});
(async()=>{
 const posters=[{name:'one',label:'Team Chloe'},{name:'two',label:'Team CJ'},{name:'three',label:'Team Chloe'},{name:'four',label:'Whole Agency'}];let active=0,peak=0;const progress=[];
 const bytes=await out.preparedPosterArchive(posters,'2026-11-23',async name=>{active++;peak=Math.max(active,peak);await new Promise(resolve=>setImmediate(resolve));active--;return Buffer.from('cached-png-'+name);},done=>progress.push(done));
 const archive=await JSZip.loadAsync(bytes);const files=Object.keys(archive.files);assert.equal(files.length,4);assert.equal(new Set(files).size,4);assert(files.includes('Team Chloe-2026-11-23-2.png'));assert.equal(await archive.file('Team CJ-2026-11-23.png').async('string'),'cached-png-two');assert(peak<=3);assert.deepEqual(progress,[1,2,3,4]);
 await assert.rejects(()=>out.preparedPosterArchive(posters,'2026-11-23',async name=>{if(name==='two')throw Error('Missing cached image');return Buffer.from('png');}),/Missing cached image/);
 const component=fs.readFileSync('app/data/team-diamonds-yesterday/PreparedTeamPosters.tsx','utf8');assert(!component.includes('showDirectoryPicker'),'Batch downloads must never open a folder picker');
 console.log('PASS: one ZIP contains every cached PNG, duplicate labels keep both images, concurrency is bounded, failed downloads never silently omit a poster, and no folder picker remains.');
})().catch(e=>{console.error(e);process.exit(1)});
