// Smaller-creator prompts are based on activity, never low earnings alone.
type Creator={id:string;username:string;manager:string;managerKey:string;agencyDays:number|null;diamonds:number;previousDiamonds:number;hours:number;liveDays:number;lastLive:string|null;hasPreviousRecords:boolean;comparedCurrent:number;comparedPrevious:number;comparedHours:number;previousHours:number;potentialTimeline:{date:string;known:boolean;hours:number;diamonds:number;battles:number;streams:number}[]};
export function starterFocus(creators:Creator[],latest:string){
 const candidates=creators.flatMap(c=>{
  if(Math.max(c.diamonds,c.previousDiamonds)>=10000)return [];
  const days=c.potentialTimeline.filter(d=>d.known),streams=days.reduce((sum,d)=>sum+d.streams,0),battles=days.reduce((sum,d)=>sum+d.battles,0),last=days.at(-1),away=c.lastLive?Math.floor((Date.parse(latest+'T12:00:00Z')-Date.parse(c.lastLive+'T12:00:00Z'))/86400000):null;
  let title='',observations:string[]=[],insight='',action='',badge='',weight=0;
  if(c.agencyDays!==null&&c.agencyDays>=3&&c.agencyDays<=14&&!c.lastLive&&streams===0&&days.length>=Math.min(c.agencyDays,3)){
   title='Help them get started';badge='First LIVE';weight=500;
   observations=[`Joined ${c.agencyDays} days ago. No LIVE recorded in the available history.`];insight='A first session can feel like a big step. Find out what would make it easier.';action='Check what’s holding them back and help them choose a first session. Offer a setup check if they need one.';
  }else if(c.liveDays>0&&away!==null&&away>=3){
   title='Build on a good start';badge='Restart the routine';weight=400+Math.min(away,30);
   observations=[`${c.diamonds.toLocaleString('en-GB')} diamonds across ${c.liveDays} LIVE days this month.`,`No LIVE recorded for ${away} days.`];insight='They’ve made a start. A check-in could help them keep it going.';action='Ask how their sessions felt and what’s kept them away. Find out when they next plan to go live and help them make a manageable return.';
  }else if(last&&last.streams>=2&&last.hours>0&&last.hours<last.streams){
   title='Give sessions more time';badge='Session length';weight=300;
   observations=[`LIVE time: ${last.hours.toFixed(1)} hours across ${last.streams} streams on ${last.date}.`];insight='The daily totals indicate at least one stream lasted under an hour; they don’t show the length of every session.';action='Check whether technical issues, confidence or interruptions are cutting sessions short. Help them choose a session length they can comfortably sustain.';
  }else if(c.hasPreviousRecords&&c.comparedPrevious>0&&c.previousHours>0&&c.comparedCurrent-c.comparedPrevious>=100&&c.comparedCurrent>=c.comparedPrevious*1.25&&c.comparedHours>c.previousHours){
   title='Encourage the progress';badge='Progress worth recognising';weight=200;
   observations=[`Diamonds: ${c.comparedPrevious.toLocaleString('en-GB')} → ${c.comparedCurrent.toLocaleString('en-GB')} this month versus the same dates last month.`,`LIVE time: ${c.previousHours.toFixed(1)} → ${c.comparedHours.toFixed(1)} hours.`];insight='Both earnings and time live are improving. This is progress to recognise, rather than a problem to fix.';action='Tell them what’s improved. Ask which sessions have felt best and help them keep the habits that are working.';
  }else if(c.liveDays>=3&&c.hours>=3&&battles===0){
   title='Introduce some networking';badge='Networking';weight=100;
   observations=[`LIVE days: ${c.liveDays} this month.`,`Battles: No matches recorded this month.`];insight='They’re going live regularly. Introductions could help them feel more connected.';action='Ask whether they’d like introductions to suitable creators to match with. Help them find people they feel comfortable networking with.';
  }
  if(!title)return [];
  return [{category:'starter' as const,managerKey:c.managerKey,username:c.username,manager:c.manager,title,observations,insight,action,badges:[badge],detail:observations.join(' ')+' '+insight+' '+action,comparison:'Activity through '+latest,weight}];
 }).sort((a,b)=>b.weight-a.weight||b.username.localeCompare(a.username));
 const counts=new Map<string,number>();return candidates.filter(p=>{const count=counts.get(p.managerKey)||0;counts.set(p.managerKey,count+1);return count<5;});
}
