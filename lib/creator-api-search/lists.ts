import type {Contact,Eligibility} from './types';

export function sortByDiamonds<T extends {username:string;diamonds?:number|null}>(rows:T[]):T[]{
 const value=(row:T)=>typeof row.diamonds==='number'&&Number.isFinite(row.diamonds)&&row.diamonds>=0?row.diamonds:null;
 return [...rows].sort((a,b)=>{const left=value(a),right=value(b);if(left===null&&right!==null)return 1;if(left!==null&&right===null)return -1;return (right??0)-(left??0)||a.username.localeCompare(b.username,'en');});
}

export function orderedUsernames(names:string[],totals:Record<string,number|null|undefined>):string[]{
 return sortByDiamonds([...new Set(names)].map(username=>({username,diamonds:totals[username]??null}))).map(row=>row.username);
}

export function availableLists<T extends {username:string;diamonds?:number|null}>(rows:T[],eligibility:Record<string,Eligibility>,contacts:Contact[]){
 const blocked=new Set(contacts.map(row=>row.username));
 const all=sortByDiamonds(rows.filter(row=>eligibility[row.username]?.status==='Available'&&Boolean(eligibility[row.username]?.checkedAt)));
 return {
  all,
  premium:all.filter(row=>eligibility[row.username].invitationType==='Premium'),
  regular:all.filter(row=>eligibility[row.username].invitationType==='Regular'),
  unclassified:all.filter(row=>!['Premium','Regular'].includes(eligibility[row.username].invitationType||'')),
  fresh:all.filter(row=>!blocked.has(row.username)),
 };
}
