import type { TeamPosterTemplate } from '@/app/atlas/generator/AtlasGenerator';
export type AtlasPosterStat = Record<string,unknown> & {creator_username?:string;stat_date?:string;creator_id?:string};
export type AtlasPosterAssignments = {managerGroups?:Record<string,string>;managerNames?:Record<string,string>;deletedManagers?:string[]};
export type AtlasPosterManager = {key:string;email:string;name:string;group:string};
export type AtlasSavedPoster = {name:string;template_json:TeamPosterTemplate};
export const atlasManagerKey=(value:unknown)=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
export const atlasCreatorName=(row:AtlasPosterStat)=>String(row.creator_username||row["Creator's username"]||'').trim().replace(/^@/,'');
export const atlasPosterLabel=(value:string)=>value.replace(/^team-poster-/,'').replace(/^atlas-team-poster$/,'All Atlas').replace(/-/g,' ');
export function atlasPosterManager(item:AtlasSavedPoster,managers:AtlasPosterManager[]) {const key=atlasManagerKey(item.template_json.managerKey||'atlas-all');return managers.find(m=>atlasManagerKey(m.key)===key||atlasManagerKey(m.email)===key);}
export function atlasHours(row:AtlasPosterStat) {
  const raw=row.live_hours??row.live_duration??row['LIVE duration']??0;
  if(typeof raw==='number')return Number.isFinite(raw)?raw:0;
  if(/^\s*\d+(?:\.\d+)?\s*$/.test(String(raw)))return Number(raw);
  const match=String(raw).match(/(?:(\d+(?:\.\d+)?)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/i);
  return match?Number(match[1]||0)+Number(match[2]||0)/60+Number(match[3]||0)/3600:0;
}
export function atlasDiamonds(row:AtlasPosterStat) {const n=Number(String(row.diamonds||0).replace(/,/g,''));return Number.isFinite(n)?n:0;}
export function atlasPosterRows(item:AtlasSavedPoster,data:AtlasPosterStat[],a:AtlasPosterAssignments) {
  const manager=atlasManagerKey(item.template_json.managerKey||'atlas-all'),unique=new Map<string,AtlasPosterStat>();
  for(const row of data){const name=atlasCreatorName(row);if(!name)continue;const id=atlasManagerKey(row.manager_email||row.creator_network_manager||row['Creator Network manager']||row.email);if(a.managerGroups?.[id]==='Excluded'||a.deletedManagers?.includes(id))continue;if(manager!=='atlasall'&&manager!==id)continue;unique.set(String(row.creator_id||name.toLowerCase()),row);}
  return [...unique.values()];
}
export function atlasPosterLeaders(rows:AtlasPosterStat[]) {const tie=(a:AtlasPosterStat,b:AtlasPosterStat)=>atlasCreatorName(a).localeCompare(atlasCreatorName(b));return {diamonds:[...rows].sort((a,b)=>atlasDiamonds(b)-atlasDiamonds(a)||tie(a,b)).slice(0,5),hours:[...rows].sort((a,b)=>atlasHours(b)-atlasHours(a)||tie(a,b)).slice(0,5)};}
export function fillAtlasPoster(item:AtlasSavedPoster,rows:AtlasPosterStat[],images:Map<string,string>):TeamPosterTemplate {
  const leaders=atlasPosterLeaders(rows);
  return {...item.template_json,elements:item.template_json.elements.map(element=>{
    const diamond=element.id.match(/^(avatar|username|diamonds)-(\d+)$/),hour=element.id.match(/^(?:avatar-hours|username-hours|hours)-(\d+)$/);
    if(!diamond&&!hour)return {...element};
    const row=diamond?leaders.diamonds[Number(diamond[2])-1]:leaders.hours[Number(hour![1])-1];
    if(!row)return {...element,value:'',imageUrl:''};
    const username=atlasCreatorName(row);
    if(element.kind==='avatar')return {...element,imageUrl:images.get(username.toLowerCase())||''};
    if(element.kind==='username')return {...element,value:username.toUpperCase()};
    if(element.kind==='diamonds'){const n=atlasDiamonds(row);return {...element,value:n>=1000?`${(n/1000).toFixed(1).replace(/\.0$/,'')}K`:String(n)};}
    if(element.kind==='hours')return {...element,value:`${atlasHours(row).toFixed(1).replace(/\.0$/,'')}H`};
    return {...element};
  })};
}
