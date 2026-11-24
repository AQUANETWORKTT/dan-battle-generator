import {fallbackAvatarFor,managerKeysMatch,normalizeTemplate,dailyPosterRows,matchesTemplateManager,getUsername,safeNumber,getLiveHours,formatCompactDiamonds,formatPosterHours,templateLabel,type CreatorStat,type TeamPosterTemplate} from './team-poster-model';

export type PreparedPoster = {name:string;label:string;side:string;template:TeamPosterTemplate;path?:string;missingPictures?:string[];error?:string;noData?:boolean};
export type PosterSnapshot = {date:string;posters:PreparedPoster[];fallbacks:Record<string,string>};
export function firstClassPosterSide(template:TeamPosterTemplate,groups:Record<string,string>):string|null{
 const key=(template.managerKey||'team-dan').toLowerCase();
 if(key==='team-dan'||key==='first-class-all')return 'sub-agencies';
 const group=Object.entries(groups).find(([manager])=>managerKeysMatch(manager,key))?.[1];
 if(!['Team Dan / James','Team Mike / Indi'].includes(group||''))return null;
 return template.teamSide==='sub-agencies'?'sub-agencies':group==='Team Dan / James'?'dan':'mike-indi';
}
export function makePosterSnapshot(date:string,rows:CreatorStat[],templates:{name:string;template_json:TeamPosterTemplate;background_url?:string|null}[],groups:Record<string,string>,hidden:string[],fallbacks:Record<string,string>):PosterSnapshot {
 const excluded=new Set([...hidden,'allannah.unknown444'].map(n=>n.toLowerCase()));
 const daily=dailyPosterRows(rows,date).filter(r=>getUsername(r)&&!excluded.has(getUsername(r)));
 const posters=templates.map(saved=>{
  const template=normalizeTemplate({...saved.template_json,backgroundUrl:saved.template_json.backgroundUrl||saved.background_url||''});
  const matching=daily.filter(row=>matchesTemplateManager(row,template,groups));
  const diamonds=[...matching].sort((a,b)=>safeNumber(b.diamonds)-safeNumber(a.diamonds)).slice(0,5);
  const hours=[...matching].sort((a,b)=>getLiveHours(b)-getLiveHours(a)).slice(0,5);
  const filled={...template,elements:template.elements.map(element=>{
   const d=element.id.match(/^(avatar|username|diamonds)-(\d+)$/), h=element.id.match(/^(avatar|username)-hours-(\d+)$/), hv=element.id.match(/^hours-(\d+)$/);
   if(!d&&!h&&!hv)return element;
   const row=d?diamonds[Number(d[2])-1]:hours[Number(h?.[2]||hv?.[1])-1];
   return {...element,imageUrl:undefined,value:!row?'':element.kind==='avatar'?getUsername(row):element.kind==='username'?getUsername(row).toUpperCase():element.kind==='diamonds'?formatCompactDiamonds(safeNumber(row.diamonds)):formatPosterHours(getLiveHours(row))};
  })};
  return {name:saved.name,label:templateLabel(saved.name),side:template.teamSide||'dan',template:filled,...(!matching.length?{noData:true}:{})};
 });
 const users=new Set(posters.flatMap(p=>p.template.elements.filter(e=>e.kind==='avatar').map(e=>e.value.toLowerCase())));
 const neededFallbacks=Object.fromEntries([...users].map(name=>[name,fallbackAvatarFor(name,fallbacks)]).filter(([,url])=>url));
 return {date,posters,fallbacks:neededFallbacks};
}
export function ukYesterday(now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 return new Date(Date.parse(today+'T12:00:00Z')-86400000).toISOString().slice(0,10);
}
export function posterInScope(p:{side:string},scope:string){return (scope==='all'||scope==='first-class')?['dan','mike-indi','sub-agencies'].includes(p.side):p.side===scope;}
