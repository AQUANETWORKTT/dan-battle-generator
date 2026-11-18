import 'server-only';
import {GET as posterTemplates} from '@/app/api/poster-templates/route';
import {loadManagerLeaderboard} from './manager-leaderboard-server';
import {loadOverviewSnapshot} from './manager-overview-server';
import {loadCreatorDevelopment} from './creator-development-server';
import {loadInactiveCreators} from './inactive-creators';

export async function prepareManagerPortals(){
 // [] selects the shared First Class snapshot without returning any team's data.
 // Manager requests filter that prepared snapshot using their authenticated keys.
 const tasks:[string,()=>Promise<unknown>][]=[
  ['manager overview',()=>loadOverviewSnapshot(true)],
  ['owner overview',()=>loadOverviewSnapshot(false)],
  ['agency incremental',()=>loadOverviewSnapshot(false,true)],
  ['manager development',()=>loadCreatorDevelopment([])],
  ['owner development',()=>loadCreatorDevelopment(null)],
  ['manager inactive',()=>loadInactiveCreators([])],
  ['owner inactive',()=>loadInactiveCreators(null)],
  ['manager leaderboard A',()=>loadManagerLeaderboard('A')],
  ['manager leaderboard B',()=>loadManagerLeaderboard('B')],
  ['poster designs',async()=>{const response=await posterTemplates();if(!response.ok)throw Error('Could not prepare poster designs.');}],
 ];
 // Overviews first; the remaining results reuse them rather than recalculate
 // creator history separately for every manager.
 const failures:string[]=[];
 for(const batch of [tasks.slice(0,3),tasks.slice(3)]){
  const results=await Promise.allSettled(batch.map(([,run])=>run()));
  results.forEach((r,i)=>{if(r.status==='rejected'){failures.push(batch[i][0]);console.error('Portal preparation failed:',batch[i][0],r.reason instanceof Error?r.reason.message:'Unknown error');}});
 }
 return {ready:failures.length===0,failures};
}
