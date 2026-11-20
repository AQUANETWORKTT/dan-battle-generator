const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
let now=0,focused=true,cleanup,timer,writes=[],listeners={};
const document={visibilityState:'visible',hasFocus:()=>focused,addEventListener:(key,fn)=>listeners[key]=fn,removeEventListener:()=>{}};
const window={addEventListener:(key,fn)=>listeners[key]=fn,removeEventListener:()=>{},setInterval:fn=>{timer=fn;return 1},clearInterval:()=>{}};
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/manager/ActivityTracker.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:exportsObject,Date:class extends Date{static now(){return now}},document,window,clearInterval:()=>{},fetch:async(url,options)=>{writes.push(JSON.parse(options.body));return {ok:true}},require:name=>name==='react'?{useEffect:fn=>{cleanup=fn()}}:require(name)});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 exportsObject.default({enabled:false});assert.equal(writes.length,0);
 exportsObject.default({enabled:true});await settle();assert.equal(writes[0].seconds,0,'An existing session records a visit immediately');
 now=30000;timer();await settle();assert.equal(writes.at(-1).seconds,30);
 focused=false;now=40000;listeners.blur();await settle();assert.equal(writes.at(-1).seconds,10);
 const count=writes.length;now=70000;timer();await settle();assert.equal(writes.length,count,'Hidden/unfocused tabs must not accumulate use');
 focused=true;now=80000;listeners.focus();await settle();assert.equal(writes.at(-1).seconds,0,'Returning does not count the break');
 for(let t=110000;t<=380000;t+=30000){now=t;timer();await settle();}
 const idleCount=writes.length;now=410000;timer();await settle();assert.equal(writes.length,idleCount,'Stop after five minutes without input');
 now=420000;listeners.pointerdown();await settle();assert.equal(writes.at(-1).seconds,0);
 cleanup();await settle();
 console.log('Activity tracker passed: existing session visit, foreground seconds, blur pause, focus return, idle timeout and input resume.');
})().catch(error=>{console.error(error);process.exit(1)});
