import {starTotal, type StarCreator} from './star-tracker';

export type StarStanding={username:string;team:string;stars:number;rank:number;joint:boolean};
const LOCAL_PICTURES:Record<string,string>={cerilaw83:'/avatars/cerilaw83.jpg',serenitetiktok:'/avatars/cerilaw83.jpg',tictock739:'/avatars/tictock739.jpg',kaylanortheast:'/avatars/kayla_northeast.jpg',lozza2706:'/avatars/lozza2706.jpg',kieransmithmilner:'/avatars/kieransmithmilner.jpg'};
export function localStarAvatar(username:string){return LOCAL_PICTURES[username.toLowerCase()]||'';}
export function leaderboardTeam(label:string){
 const key=label.replace(/^team\s+/i,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(/^(mikehales(?:jb)?|ind[yi](?:owner)?|dumpcreators(?:crossagency)?|mike(?:and)?ind[yi])$/.test(key))return 'Team Mike / Indi';
 if(key==='kjb'||key==='danjames'||key==='danandjames')return 'Team Dan / James';
 return label;
}
export function teamLabel(raw:string,configured?:string){
 const name=(configured||raw.split('@')[0].replace(/^firstclassagency[_.-]?/i,'').replace(/[_.-]+/g,' ')).trim().replace(/^team\s+/i,'');
 return leaderboardTeam(name?'Team '+(configured?name:name.replace(/\b\w/g,c=>c.toUpperCase())):'Team First Class');
}
export function starStandings(creators:StarCreator[],teams:Record<string,string>={}):StarStanding[]{
 const sorted=creators.map(c=>({username:c.username,team:teams[c.id]||'Team First Class',stars:starTotal(c)})).sort((a,b)=>b.stars-a.stars||a.username.localeCompare(b.username,'en',{sensitivity:'base'}));
 const counts=new Map<number,number>();for(const row of sorted)counts.set(row.stars,(counts.get(row.stars)||0)+1);
 let rank=0,previous:number|undefined;
 return sorted.map(row=>{if(row.stars!==previous){rank++;previous=row.stars;}return {...row,rank,joint:counts.get(row.stars)!>1};});
}
export function searchStandings(rows:StarStanding[],query:string){const term=query.trim().replace(/^@/,'').toLowerCase();return term?rows.filter(row=>row.username.toLowerCase().includes(term)):rows.slice(0,100);}
