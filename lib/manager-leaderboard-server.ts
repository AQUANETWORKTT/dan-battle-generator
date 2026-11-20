import 'server-only';
import {GET as recruitmentLeaderboard} from '@/app/api/data-analysis/recruitment-leaderboard/route';
import {portalResultCache} from './portal-result-cache';

const snapshot=portalResultCache(async isB=>{
 const tier=isB?'B':'A';
 const response=await recruitmentLeaderboard(new Request('https://firstclassagency.management/api/data-analysis/recruitment-leaderboard?period=month&tier='+tier));
 if(!response.ok)throw Error('Could not load the manager leaderboard. Please retry.');
 const data=await response.json();
 return {tier,endDate:data.endDate,managers:(data.managers||[]).filter((m:{group:string})=>m.group==='Team Dan / James'||m.group==='Team Mike / Indi')};
},'manager-leaderboard-v2');
export function loadManagerLeaderboard(tier:'A'|'B'){return snapshot(tier==='B');}
