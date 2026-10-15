export type OnboardingDay = { date:string; diamonds:number; hours:number; liveDays:number; matches:number; day:number; upcoming:boolean };
export function onboardingDays(start:string, latest:string, rows:{date:string;diamonds:number;hours:number;liveDays:number;matches:number}[]):OnboardingDay[] {
  return Array.from({length:14},(_,index)=>{
    const d=new Date(`${start}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+index);const date=d.toISOString().slice(0,10);
    const stats=rows.filter(row=>row.date===date).reduce((sum,row)=>({diamonds:sum.diamonds+row.diamonds,hours:sum.hours+row.hours,liveDays:sum.liveDays+row.liveDays,matches:sum.matches+row.matches}),{diamonds:0,hours:0,liveDays:0,matches:0});
    return {...stats,date,day:index+1,upcoming:date>latest};
  });
}
export function onboardingAdvice(days:OnboardingDay[]):string[] {
  const elapsed=days.filter(d=>!d.upcoming), live=elapsed.filter(d=>d.hours>0||d.liveDays>0||d.diamonds>0||d.matches>0);
  if(!elapsed.length)return ["Onboarding has not started yet. Confirm the creator’s first LIVE date and check their setup together."];
  const advice:string[]=[];
  const missed=elapsed.length-live.length,short=live.filter(d=>d.hours>0&&d.hours<1);
  if(!live.length)return [`No LIVE activity recorded across ${elapsed.length} onboarding days. Contact the creator, identify what is stopping them and agree a supported first LIVE. Check lighting, sound, camera and connection.`];
  if(missed)advice.push(`LIVE routine: activity on ${live.length}/${elapsed.length} days, with ${missed} missed day${missed===1?"":"s"}. Ask what prevented those sessions and agree realistic regular time slots.`);
  else advice.push(`Strong consistency: LIVE activity on all ${elapsed.length} elapsed onboarding days. Recognise their effort and maintain the routine rather than adding unnecessary changes.`);
  if(short.length)advice.push(`Session length: ${short.length} LIVE day${short.length===1?" was":"s were"} under one hour (${short.map(d=>`${d.date}: ${d.hours.toFixed(2)}h`).join(", ")}). Help them prepare enough conversation and structure to reach at least one hour per session.`);
  const matches=live.reduce((sum,d)=>sum+d.matches,0);
  if(matches===0)advice.push("Matches: none recorded so far. Check their confidence with battles and arrange a suitable introductory match with guidance.");
  else advice.push(`Matches: ${matches} recorded across onboarding. Review how they welcome viewers and keep the room engaged before, during and after matches.`);
  const best=[...live].sort((a,b)=>b.diamonds-a.diamonds)[0];
  const lowest=Math.min(...live.map(d=>d.diamonds));
  if(best.diamonds>0 && live.length>1 && lowest<best.diamonds*.5)advice.push(`Diamond results vary: their strongest day was ${best.date} (${best.diamonds.toLocaleString("en-GB")} diamonds, ${best.hours.toFixed(1)}h, ${best.matches} matches). Watch that LIVE replay alongside a lower-result day. Look for differences in timing, session length, conversation and audience engagement before deciding what to repeat.`);
  else if(best.diamonds===0)advice.push("Diamonds: no gifts recorded yet despite LIVE activity. Review a recent LIVE for conversation, viewer retention and how confidently they engage their audience.");
  else advice.push(`Diamond results are relatively steady across active days. Build on what is working and agree one achievable growth goal; their strongest day was ${best.date} with ${best.diamonds.toLocaleString("en-GB")} diamonds.`);
  advice.push("Community: encourage the creator to welcome viewers by name and ask open questions. Review a recent LIVE and choose one practical improvement together.");
  advice.push("Networking: suggest people for your creator to network with. Building connections can expand their exposure to new gifters and viewers.");
  return advice;
}
