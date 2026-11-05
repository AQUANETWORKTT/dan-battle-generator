import 'server-only';
import {randomUUID} from 'node:crypto';
import {database,checked} from './db';
import {getRun,withEligibility,validId,SearchError,creatorEndpoint} from './service';
import {uniqueRankings,username,outsideEnglishLetters} from './types';
import {availableLists} from './lists';

export function reportDates(now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 return [1,2,3].map(offset=>{const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-offset);return date.toISOString().slice(0,10);});
}
export function dailyHistory(body:any,dates:string[]){
 if(!Array.isArray(body?.data))throw new SearchError('TikLeap returned an unsupported history response.',502);
 const values=new Map<string,number|null>();
 for(const row of body.data){if(row?.type!=='daily'||!dates.includes(row.period))continue;const value=row.diamonds;if(typeof value!=='number'||!Number.isFinite(value)||value<0)continue;if(values.has(row.period)&&values.get(row.period)!==value)values.set(row.period,null);else if(!values.has(row.period))values.set(row.period,value);}
 const days=dates.map(date=>({date,diamonds:values.get(date)??null})),known=days.filter(row=>row.diamonds!==null);
 return {days,knownDays:known.length,knownTotal:known.reduce((sum,row)=>sum+row.diamonds!,0),threeDayTotal:dates.length===3&&known.length===3?known.reduce((sum,row)=>sum+row.diamonds!,0):null};
}
export async function reportManifest(body:any){
 if(!validId(body?.runId))throw new SearchError('Choose a saved scan.');
 if(!['all','premium','regular'].includes(body?.kind||'all'))throw new SearchError('Choose All, Premium or Regular.');
 const run=await withEligibility(await getRun(body.runId)),lists=availableLists(uniqueRankings(run.payload),run.eligibility||{},[]);
 let rows=body.kind==='premium'?lists.premium:body.kind==='regular'?lists.regular:lists.all;
 if(body.usernames!==undefined){if(!Array.isArray(body.usernames)||body.usernames.length>2000||body.usernames.some((name:any)=>(!username(name)||outsideEnglishLetters(name))))throw new SearchError('Paste up to 2,000 valid usernames.');const chosen=new Set(body.usernames.map(username));rows=rows.filter(row=>chosen.has(row.username));}
 if(!rows.length)throw new SearchError('No confirmed Available creators match this selection. Complete Backstage checks first.');
 return {schema:'firstclass-creator-report-v1',id:randomUUID(),generatedAt:new Date().toISOString(),runId:run.id,region:run.payload.region||'GB',dateWindow:reportDates(),creators:rows.map(row=>({username:row.username,name:row.name||'',creatorId:row.creatorId||null,league:row.league,rank:row.rank,rankingDiamonds:row.diamonds??null,snapshotAt:run.updated_at,availability:{status:'Available',invitationType:run.eligibility![row.username].invitationType||'Unknown',checkedAt:run.eligibility![row.username].checkedAt,reason:run.eligibility![row.username].reason||''}}))};
}
export async function reportHistory(body:any,allowRange=false){
 const name=username(body?.username),dates=body?.dates;
 if(!name||outsideEnglishLetters(body?.username)||!Array.isArray(dates)||(allowRange?(dates.length<1||dates.length>30):dates.length!==3)||new Set(dates).size!==dates.length||dates.some((date:any)=>typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z')))||dates.some((date:string)=>date>reportDates()[0]))throw new SearchError('Choose a username and three completed dates.');
 const key='creator-profile-report-history-v1:'+name+':'+[...dates].sort().join(',');
 const existing=await checked(database().from('poster_templates').select('template_json').eq('name',key).maybeSingle());
 if(existing.data?.template_json&&Date.now()-Date.parse(existing.data.template_json.fetchedAt)<21600000)return {...existing.data.template_json,cached:true};
 const reply=await creatorEndpoint(name,'history',new URLSearchParams());
 const result={username:name,...dailyHistory(reply.body,dates),fetchedAt:reply.fetchedAt,source:'TikLeap /creators/{username}/history — type=daily',cached:false};
 await checked(database().from('poster_templates').upsert({name:key,template_json:result,background_url:null,updated_at:result.fetchedAt},{onConflict:'name'}));
 return result;
}
