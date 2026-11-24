const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict'),{renderToStaticMarkup}=require('react-dom/server');
const source=fs.readFileSync('app/manager/Portal.tsx','utf8');
const component=source.slice(source.indexOf('function MasterTaskSummary('),source.indexOf('export default function Dashboard('));
function render(custom=[]){
 const state=[[{id:'one',username:'creator',manager:'Team A',managerKey:'a',completed:true},{id:'two',username:'other',manager:'Team B',managerKey:'b',completed:false}],[],custom,[{key:'a',name:'Team A'},{key:'b',name:'Team B'},{key:'empty',name:'No tasks'}],true];let i=0;const exports={};
 vm.runInNewContext(ts.transpileModule(component+'\nexports.render=MasterTaskSummary;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require,Map,Set,Date,appLinkVisible:c=>c.appLinkDays>=3,isAppLinkCompleted:()=>false,useState:()=>[state[i++],()=>{}],useEffect:()=>{}});
 return renderToStaticMarkup(exports.render({data:{month:'2026-11',creators:[]},onBack:()=>{}}));
}
const html=render();assert(html.includes('master-tasks-complete'));assert(html.includes('Team A'));assert(html.includes('All tasks complete'));assert(html.includes('Team B'));assert(!html.includes('No tasks'));
assert(!render([{id:'custom',managerKey:'a',text:'Still to do',completed:false}]).includes('class="master-tasks-complete"'),'Pending custom tasks prevent all-complete status');
console.log('Task summary passed: completed managers remain green, pending managers remain visible, no-task managers excluded, custom tasks included.');
