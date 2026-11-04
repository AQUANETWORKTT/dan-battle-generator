import 'server-only';
import {database,checked,JOBS,RUNS} from './creator-api-search/db';
import {creatorEndpoint,SearchError} from './creator-api-search/service';
import {reportDates,reportHistory} from './creator-api-search/reports';
import {username,allowedRecruitmentName} from './creator-api-search/types';
import {availableDirectory,latestObservations,safeAvatar,type AvailableCreator,type AvailabilityJob} from './available-creators';

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
  const keys=directory.rows.flatMap(row=>[PROFILE+row.username,'creator-profile-report-history-v1:'+row.username+':'+[...dates].sort().join(',')]);
  const records=new Map<string,any>();
  for(let i=0;i<keys.length;i+=80){const {data}=await checked(database().from('poster_templates').select('name,template_json').in('name',keys.slice(i,i+80)));for(const record of data||[])records.set(record.name,record.template_json);}
  directory.rows=directory.rows.filter(row=>{
    const profile=records.get(PROFILE+row.username);
    if(profile&&!allowedRecruitmentName({username:row.username,name:profile.name})){directory.excluded++;return false;}
    if(profile){row.name=profile.name||row.name;row.avatar=safeAvatar(profile.avatar);row.live=typeof profile.live==='boolean'?profile.live:null;row.profileAt=profile.fetchedAt;}
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
export async function updateAvailableCreator(value:unknown){
  const name=username(value),directory=await readAvailableCreators();
  if(!name||!directory.rows.some(row=>row.username===name))throw new SearchError('Choose a currently Available creator from this panel.',404);
  const existing=await checked(database().from('poster_templates').select('template_json').eq('name',PROFILE+name).maybeSingle());
  let profile=existing.data?.template_json;
  if(!profile||Date.now()-Date.parse(profile.fetchedAt)>3600000){
    const reply=await creatorEndpoint(name,'profile',new URLSearchParams()),data=Array.isArray(reply.body?.data)?reply.body.data[0]:reply.body?.data;
    if(!data||username(data.username)!==name)throw new SearchError('TikLeap did not return the matching creator profile.',502);
    profile={name:typeof data.name==='string'?data.name:'',avatar:safeAvatar(data.avatar),live:data.is_live===true||data.is_live===1?true:data.is_live===false||data.is_live===0?false:null,fetchedAt:reply.fetchedAt};
    await checked(database().from('poster_templates').upsert({name:PROFILE+name,template_json:profile,background_url:null,updated_at:reply.fetchedAt},{onConflict:'name'}));
    cached=undefined;
  }
  if(!allowedRecruitmentName({username:name,name:profile.name})){cached=undefined;return {excluded:true};}
  const history=await reportHistory({username:name,dates:reportDates()});
  cached=undefined;
  return {excluded:false,profile,history};
}
