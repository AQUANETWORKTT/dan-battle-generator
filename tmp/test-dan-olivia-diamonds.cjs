const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
const compile=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const aliases={exports:{}};vm.runInNewContext(compile('lib/recruitment-manager-aliases.ts'),aliases);
const rows=[
 {creator_id:'7663148096431538196',creator_username:'dan.bradley',manager_email:'mikehalesjb@gmail.com',stat_date:'2026-10-01',diamonds:100},
 {creator_id:'7663148096431538196',creator_username:'changed.username',manager_email:'deleted@gmail.com',stat_date:'2026-10-02',diamonds:200},
 {creator_id:'7663148096431538196',creator_username:'changed.username',manager_email:'firstclassagency_kyranash@outlook.com',stat_date:'2026-10-25',diamonds:300},
 {creator_id:null,creator_username:'@DAN.BRADLEY',manager_email:'other@gmail.com',stat_date:'2026-10-03',diamonds:10},
 {creator_id:'999999999',creator_username:'dan.bradley',manager_email:'other@gmail.com',stat_date:'2026-10-25',diamonds:50},
];
const assignments={managerGroups:{firstclassagencyoliviaoutlookcom:'Team Dan / James',firstclassagencykyranashoutlookcom:'Team Dan / James',othergmailcom:'Team Dan / James'},managerNames:{firstclassagencyoliviaoutlookcom:'Team Olivia'},deletedManagers:['deletedgmailcom']};
const client={from(table){let selected='';return{select(s){selected=s;return this},order(){return this},limit(){return this},eq(){return this},gte(){return this},lte(){return this},or(){return this},maybeSingle:async()=>({data:table==='poster_templates'?{template_json:{assignments}}:{stat_date:'2026-10-25'}}),range:async()=>({data:rows})}}};
const box={exports:{},require(id){if(id==='next/server')return{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}};if(id.includes('submissions-supabase'))return{submissionsSupabase:client};if(id.includes('recruitment-manager-aliases'))return aliases.exports;throw Error(id)}};
vm.runInNewContext(compile('app/api/data-analysis/manager-leaderboard/route.ts'),box);
(async()=>{const result=await box.exports.GET();assert.equal(result.status,200);const managers=result.body.managers;assert.equal(managers.find(x=>x.key==='firstclassagencyolivia').diamonds,610);assert.equal(managers.find(x=>x.key==='other').diamonds,50);assert.equal(managers.find(x=>x.key==='firstclassagencykyranash').diamonds,0);assert.equal(managers.reduce((sum,x)=>sum+x.diamonds,0),660);console.log('Passed: Dan stays with Olivia across email and username changes, excluded/deleted sources and merged-roster conflicts; no duplicate credit or same-name ID confusion.');})().catch(e=>{console.error(e);process.exitCode=1});
