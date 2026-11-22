import 'server-only';
import {database} from './creator-api-search/db';
import {loadOverview} from './manager-overview-server';
import {portalResultCache} from './portal-result-cache';
import {recruitmentTeamOwner} from './recruitment-team-owner';
import {DEFAULT_AGENCY_TARGET,incrementalTargets,incrementalPrediction} from './incremental-targets';
import {earningsAgencySummary,type EarningsCreator,type EarningsManager} from './team-earnings';
import {earningsManagerAssignments} from './earnings-manager-assignments';

const snapshot=portalResultCache(async()=>{
 const db=database();
 const [overview,setting]=await Promise.all([loadOverview(null,true),db.from('poster_templates').select('template_json').eq('name','manager-assignment-settings').maybeSingle()]);
 if(setting.error)throw Error(setting.error.message);
 const assignments=setting.data?.template_json?.assignments||{};
 const {groups,names,parents,deleted}=earningsManagerAssignments(assignments);
 deleted.add('bmwe46320dhotmailcouk');
 const mature:any[]=[];
 for(let from=0;;from+=1000){const r=await db.from('mature_creator_month_totals').select('*').eq('month',overview.previous).order('creator_username').range(from,from+999);if(r.error)throw Error(r.error.message);mature.push(...r.data);if(r.data.length<1000)break;}
 const priorById=new Map(mature.filter(r=>r.creator_id).map(r=>[String(r.creator_id),Number(r.diamonds)||0])),priorByName=new Map(mature.map(r=>[String(r.creator_username||'').toLowerCase(),Number(r.diamonds)||0]));
 const agencyCreators:EarningsCreator[]=overview.creators.map(c=>({id:c.id,username:c.username,managerKey:recruitmentTeamOwner(c.managerKey),diamonds:c.diamonds,previousDiamonds:priorById.get(c.id)??priorByName.get(c.username.toLowerCase())??c.previousDiamonds,hours:c.hours,validDays:c.validDays}));
 const forecastManagers:EarningsManager[]=['Team Dan / James','Team Mike / Indi'].map(group=>({key:'owner:'+group,name:group,group,parent:null,owner:true}));
 const ownerAliases=new Map([['firstclassagencydan','owner:Team Dan / James'],['firstclassagencyjames','owner:Team Dan / James'],['firstclassindi','owner:Team Mike / Indi'],['mikehalesjb','owner:Team Mike / Indi']]);
 for(const [key,group] of Object.entries(groups)){
  if(!['Team Dan / James','Team Mike / Indi'].includes(group)||ownerAliases.has(key)||deleted.has(key))continue;
  const savedParent=parents[key],parent=savedParent&&!deleted.has(savedParent)&&groups[savedParent]===group?(ownerAliases.get(savedParent)||savedParent):'owner:'+group;
  forecastManagers.push({key,name:names[key]||key,group,parent});
 }
 const forecastKnown=new Set(forecastManagers.map(m=>m.key));
 const forecastCreators=agencyCreators.flatMap(c=>{
  const managerKey=ownerAliases.get(c.managerKey)||c.managerKey;
  return forecastKnown.has(managerKey)?[{...c,managerKey}]:[];
 });
 const managerList=forecastManagers.filter(manager=>manager.group==='Team Dan / James'),known=new Set(managerList.map(manager=>manager.key));
 const creators=forecastCreators.filter(creator=>known.has(creator.managerKey));
 const target=await db.from('poster_templates').select('template_json').eq('name','incremental-agency-target-'+overview.month).maybeSingle();if(target.error)throw Error(target.error.message);
 const agencyTarget=Number(target.data?.template_json?.agencyTarget)||DEFAULT_AGENCY_TARGET,days=new Date(Number(overview.month.slice(0,4)),Number(overview.month.slice(5)),0).getDate(),day=Number(overview.latest.slice(-2));
 // Match the existing Incremental Tracker's latest uploaded day and pace calculation.
 const automaticIncremental=incrementalPrediction(overview.total,incrementalTargets(agencyTarget,days,day));
 return {month:overview.month,latest:overview.latest,creators,agencyCreators:earningsAgencySummary(agencyCreators),managers:managerList,forecast:{creators:forecastCreators,managers:forecastManagers},automaticIncremental,agencyTarget,agencyDiamonds:overview.total};
},'team-earnings-source-v5');
export function loadTeamEarningsSources(){return snapshot(true);}

export async function earningsExchangeRate(manual:number|null){
 if(manual!==null)return {rate:manual,date:new Date().toISOString().slice(0,10),source:'Manual'};
 const response=await fetch('https://api.frankfurter.dev/v2/rate/USD/GBP?providers=ecb',{next:{revalidate:3600},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Exchange rate unavailable. Enter a USD → GBP rate in settings.');
 const data=await response.json();
 if(!Number.isFinite(data.rate)||data.rate<=0||!/^\d{4}-\d{2}-\d{2}$/.test(data.date))throw Error('The exchange rate response was invalid.');
 return {rate:Number(data.rate),date:String(data.date),source:'ECB via Frankfurter'};
}
