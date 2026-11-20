const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
class Reply{constructor(body,options={}){this.body=body;this.status=options.status;}static next(){return {kind:'next'}}static redirect(url){return {kind:'redirect',url:String(url)}}static rewrite(url){return {kind:'rewrite',url:String(url)}}}
function load(source){const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,process:{env:{}},require:()=>({NextResponse:Reply})});return exports.middleware;}
const source=fs.readFileSync('middleware.ts','utf8');
const request={nextUrl:new URL('https://firstclassagency.management/api/manager-activity'),url:'https://firstclassagency.management/api/manager-activity',headers:{get:k=>k==='host'?'firstclassagency.management':null},cookies:{get:key=>key==='first-class-manager-session'?{value:'manager-session'}:undefined}};
const before=load(source.replace(/    path === "\/api\/manager-activity" \|\|\r?\n/,''))(request);assert.equal(before.kind,'redirect','Reproduce missing manager route bypass');
const after=load(source)(request);assert.equal(after.kind,'next','Manager-only activity requests must reach their session-authenticated endpoint');
const ownerRequest={...request,nextUrl:new URL('https://firstclassagency.management/api/some-private-owner-route'),url:'https://firstclassagency.management/api/some-private-owner-route'};
assert.equal(load(source)(ownerRequest).kind,'redirect','Keep unrelated owner pages protected');
console.log('Manager activity routing passed: reproduced original redirect, fixed manager-only request, owner access still protected.');
