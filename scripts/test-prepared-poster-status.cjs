const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const source=fs.readFileSync('app/data/team-diamonds-yesterday/PreparedTeamPosters.tsx','utf8');
function render(status){let index=0;const values=[status,'',false],exports={};const hooks={...React,useState:()=>[values[index++],()=>{}],useEffect:()=>{},useCallback:fn=>fn,useRef:()=>({current:false}),useImperativeHandle:()=>{}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>name==='react'?hooks:name==='@/lib/team-poster-preparation-model'?{posterInScope:()=>true}:require(name)});
 return renderToStaticMarkup(React.createElement(exports.default));
}
const posters=Array.from({length:24},(_,i)=>({name:'team-'+i,label:'Team '+i,side:'dan',ready:false}));
const queued=render({phase:'queued',date:'2026-11-23',expectedDate:'2026-11-23',posters});assert(queued.includes('0 / 24'));assert(!queued.includes('0 / …'));
const failed=render({phase:'failed',error:'Poster renderer could not start.',posters});assert(failed.includes('Poster renderer could not start.'));assert(!failed.includes('Preparing posters'));assert(!failed.includes('disabled=""'),'A failed preparation must permit a retry');
const ready=render({phase:'ready',posters:posters.map(p=>({...p,ready:true}))});assert(ready.includes('24 posters'));
console.log('PASS: queued preparation shows the real 24-team total, failures stop the spinner and allow retry, and completed batches show their ready count.');
