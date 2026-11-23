const fs=require('fs'),ts=require('typescript'),path=require('path');
function local(p){const code=ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;const m={exports:{}};new Function('require','module','exports',code)(s=>s.startsWith('.')?local(path.resolve(path.dirname(p),s+'.ts')):require(s),m,m.exports);return m.exports;}
const {earningsManagerAssignments}=local(path.resolve('lib/earnings-manager-assignments.ts'));
const {recruitmentManagerIdentity:key}=local(path.resolve('lib/recruitment-manager-aliases.ts'));
const {loadEnvConfig}=require('@next/env');loadEnvConfig(process.cwd(),true,{info(){},error(){}});
const {createClient}=require('@supabase/supabase-js');const db=createClient(process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL,process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const names=`mads.mcleodxoxo16
steven.m46
j_richards20
siobhanonthego
duhh_itz_michelle06
charlievenables2
nat191378
itzz_gracexo
elliebean_18
mattythedevilking
janieb551
craigbowdenjr
summ3r_tx
jj_200422
lucyh0661
cerilaw83
trevortilcock5
louiseobrien920
rhumos1
coleyrossiter
pjonezyyy542
user13586xxx
xo.chloe.7x
jdmpixxie
willowlouisebarkerx
bellescupids
chloechapman2003
arabellama_y
robertparrott4
melaniemcallister3
paganboy26
micahislive
daniellenewitt
christofs91
sam252410
zoecastle1234
bexaroonie
kaizer9025
jazphoenix
paxxavp
itsonlyba_
meesha.drakes1
moonlight19873
vasa_bbx
shanahall1997
demilea_05
shelly.the.devil.q
frostythesnowman966
courtsxox33
aj_varrow
cb_0211
luke_franklin96
austeja_123k2004
aidan.6262
summer.1x0
ells.xcc1
Jakea3458
treyyy67
zaylorix
leighanne.thomson
Shanellelal
jordyuji
smilie848
sophiejones100
j0shuaknight
nick.sandy7
aymeesliveaccount
tamika_heath23
ella_quinnxx`.split('\n');
(async()=>{const r=await db.from('poster_templates').select('template_json').eq('name','manager-assignment-settings').maybeSingle();if(r.error)throw r.error;const a=r.data.template_json.assignments;const normalized=earningsManagerAssignments(a);const rawNames=Object.fromEntries(Object.entries(a.managerNames||{}).map(([k,v])=>[key(k),v]));const out=[];for(let i=0;i<names.length;i+=10){out.push(...await Promise.all(names.slice(i,i+10).map(async name=>{const q=await db.from('creator_daily_stats').select('creator_username,manager_email,email,group_name,agency,team,stat_date').ilike('creator_username',name.replace(/_/g,'\\_')).order('stat_date',{ascending:false}).limit(1);if(q.error)throw q.error;const row=q.data[0];const k=key(row?.manager_email||row?.email||'');return {creator:name,manager:normalized.names[k]||rawNames[k]||(k==='firstclassagencyjames'||k==='firstclassagencydan'?'Team Dan / James':null),raw:k,date:row?.stat_date};})));}fs.writeFileSync('tmp/current-manager-list.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));console.log('COUNT',out.length);})().catch(e=>{console.error(e);process.exit(1)});
