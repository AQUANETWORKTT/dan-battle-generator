import {scrapeTikTokAvatar} from './tiktok-profile-avatar';
import 'server-only';
import {database,checked,JOBS,RUNS} from './creator-api-search/db';
import {SearchError} from './creator-api-search/service';
import {reportDates,reportHistory} from './creator-api-search/reports';
import {username,allowedRecruitmentName} from './creator-api-search/types';
import {availableDirectory,latestObservations,safeAvatar,type AvailableCreator,type AvailabilityJob} from './available-creators';

const MESSAGED='available-creator-messaged-v1:';
const messageKey=(row:AvailableCreator)=>MESSAGED+(row.creatorId?'id:'+row.creatorId:'name:'+row.username);
const PROFILE='available-creator-profile-v1:';
type Directory=ReturnType<typeof availableDirectory>&{refreshedAt:string;dateWindow:string[]};
let cached:{until:number;value:Directory}|undefined;
let pending:Promise<Directory>|undefined;
async function load(){
  const jobs:AvailabilityJob[]=[];
  for(let offset=0;;offset+=500){const {data}=await checked(database().from(JOBS).select('id,run_id,created_at,results').order('created_at').order('id').range(offset,offset+499));jobs.push(...data||[]);if((data?.length||0)<500)break;}
  const observations=latestObservations(jobs),ids=[...new Set(observations.filter(entry=>entry.result.status==='Available').map(entry=>entry.runId))],runs:any[]=[];
  for(let i=0;i<ids.length;i+=25){const {data}=await checked(database().from(RUNS).select('id,payload,updated_at').in('id',ids.slice(i,i+25)));runs.push(...data||[]);}
  const directory=availableDirectory(observations,runs),dates=reportDates();
  // Read existing performance caches; merely viewing the board never spends API credits.
  const keys=directory.rows.flatMap(row=>[messageKey(row),PROFILE+row.username,'creator-profile-report-history-v1:'+row.username+':'+[...dates].sort().join(',')]);
  const records=new Map<string,any>();
  for(let i=0;i<keys.length;i+=320){await Promise.all(Array.from({length:Math.min(4,Math.ceil((keys.length-i)/80))},async(_,batch)=>{const start=i+batch*80;const {data}=await checked(database().from('poster_templates').select('name,template_json').in('name',keys.slice(start,start+80)));for(const record of data||[])records.set(record.name,record.template_json);}));}
  directory.rows=directory.rows.filter(row=>{
    const message=records.get(messageKey(row));
    if(message?.messagedAt)row.messagedAt=message.messagedAt;
    const profile=records.get(PROFILE+row.username);
    if(profile&&!allowedRecruitmentName({username:row.username,name:profile.name})){directory.excluded++;return false;}
    if(profile){row.name=profile.name||row.name;row.avatar=safeAvatar(profile.avatar);row.live=null;row.profileAt=profile.fetchedAt;}
    const history=records.get('creator-profile-report-history-v1:'+row.username+':'+[...dates].sort().join(','));
    if(history)row.history={days:history.days,threeDayTotal:history.threeDayTotal,knownDays:history.knownDays,fetchedAt:history.fetchedAt};
    return true;
  });
  return {...directory,dateWindow:dates,refreshedAt:new Date().toISOString()};
}
export async function readAvailableCreators(){
  if(cached&&cached.until>Date.now())return cached.value;
  if(!pending)pending=load().then(value=>{cached={until:Date.now()+20000,value};return value;}).finally(()=>{pending=undefined;});
  return pending;
}
export async function updateAvailableCreator(value:unknown,includeHistory=false){
  const name=username(value),directory=await readAvailableCreators();
  if(!name||!directory.rows.some(row=>row.username===name))throw new SearchError('Choose a currently Available creator from this panel.',404);
  const targets=new Set([directory,...(cached?[cached.value]:[])]);
  if(includeHistory){
    const history=await reportHistory({username:name,dates:reportDates()});
    for(const target of targets){const row=target.rows.find(row=>row.username===name);if(row)row.history=history;}
    return {excluded:false,history};
  }
  const existing=await checked(database().from('poster_templates').select('template_json').eq('name',PROFILE+name).maybeSingle());
  let profile=existing.data?.template_json;
  if(!profile?.avatar||profile.source!=='normal-scraper'||!Number.isFinite(Date.parse(profile.fetchedAt))||Date.now()-Date.parse(profile.fetchedAt)>86400000){
    const avatar=safeAvatar(await scrapeTikTokAvatar(name));
    if(!avatar)throw new SearchError('Profile picture not found.',404);
    profile={name:directory.rows.find(row=>row.username===name)?.name||'',avatar,live:null,source:'normal-scraper',fetchedAt:new Date().toISOString()};
    await checked(database().from('poster_templates').upsert({name:PROFILE+name,template_json:profile,background_url:null,updated_at:profile.fetchedAt},{onConflict:'name'}));
  }
  // Patch the saved directory instead of reloading thousands of records after every photo.
  for(const target of targets){const row=target.rows.find(row=>row.username===name);if(row)Object.assign(row,{avatar:profile.avatar,live:null,profileAt:profile.fetchedAt});}
  return {excluded:false,profile};
}

export async function markAvailableCreatorMessaged(value:unknown,messaged:unknown){
  if(typeof messaged!=='boolean')throw new SearchError('Choose whether the creator has been messaged.');
  const name=username(value),directory=await readAvailableCreators(),row=directory.rows.find(item=>item.username===name);
  if(!row)throw new SearchError('This creator is no longer available on the panel.',404);
  const messagedAt=messaged?new Date().toISOString():null;
  await checked(database().from('poster_templates').upsert({name:messageKey(row),template_json:{messagedAt},background_url:null,updated_at:new Date().toISOString()},{onConflict:'name'}));
  for(const target of new Set([directory,...(cached?[cached.value]:[])])){const item=target.rows.find(item=>item.username===name);if(item)item.messagedAt=messagedAt||undefined;}
  return {username:name,messagedAt};
}
