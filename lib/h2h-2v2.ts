import {parseH2H,h2hDate,h2hTime,type H2HMatchup,type H2HPoster,type H2HTiming} from './h2h-posters';

// Template slot numbers can run across rows or down columns. Resolve the
// actual left column (top/bottom), then right column, from avatar positions.
export function h2hTeamSlots(layout:Record<`avatar${1|2|3|4}`,{x:number;y:number;width:number}>){
 const position=(n:number)=>layout[`avatar${n}` as keyof typeof layout];
 const slots=[1,2,3,4].sort((a,b)=>(position(a).x+position(a).width/2)-(position(b).x+position(b).width/2)||a-b);
 const vertical=(a:number,b:number)=>position(a).y-position(b).y||a-b;
 return [...slots.slice(0,2).sort(vertical),...slots.slice(2).sort(vertical)];
}

export function parseH2H2v2(text:string,timing:H2HTiming){
 const rows:H2HMatchup[]=[],errors:string[]=[];
 let pending:{names:string[];time:string;line:number}|undefined;
 for(const [index,raw] of text.split(/\r?\n/).entries()){
  const line=raw.replace(/\*\*/g,'').replace(/\\_/g,'_').trim();
  if(!line||/^[|\s:\-]+$/.test(line))continue;
  let parts=(line.includes('|')?line.replace(/^\|/,'').replace(/\|$/,'').split('|'):line.includes('\t')?line.split('\t'):line.includes(',')?line.split(','):line.split(/\s+/)).map(s=>s.trim().replace(/^"|"$/g,''));
  if(parts.length===4&&/^(AM|PM)$/i.test(parts[1]))parts.splice(0,2,parts[0]+parts[1]);
  if(parts.every(s=>!s)||/^(time|start time)$/i.test(parts[0]))continue;
  if(parts.length===2)parts=['',...parts];
  if(parts.length!==3){errors.push(`Line ${index+1}: use Time, left creator, right creator.`);continue;}
  const [time,...names]=parts;
  if(!pending){pending={names,time,line:index+1};continue;}
  if(time){errors.push(`Line ${pending.line}: missing the second row with a blank time.`);pending={names,time,line:index+1};continue;}
  // Each interval belongs to a whole matchup, never its second row.
  const first=parseH2H(`${pending.time}\t${pending.names.join('\t')}`,{...timing,start:timing.start});
  const second=parseH2H(`00:00\t${names.join('\t')}`,timing);
  if(first.errors.length||second.errors.length){errors.push(`Lines ${pending.line}–${index+1}: check usernames and time.`);}
  else{
   const top=first.rows[0],bottom=second.rows[0];
   const minutes=top.minutes+(!pending.time?rows.length*timing.interval:0);
   if(minutes>=1440)errors.push(`Line ${pending.line}: time goes beyond midnight.`);
   else rows.push({...top,id:`h2h-2v2-${pending.line}`,line:pending.line,minutes,name3:bottom.name1,name4:bottom.name2});
  }
  pending=undefined;
 }
 if(pending)errors.push(`Line ${pending.line}: add the second row with the other two creators.`);
 return {rows,errors};
}
export function validateH2H2v2(rows:H2HMatchup[]){
 const errors:string[]=[],warnings:string[]=[],seen=new Set<string>(),names=new Map<string,number[]>();
 for(const r of rows){
  const n=[r.name1,r.name2,r.name3||'',r.name4||''].map(s=>s.toLowerCase());
  if(n.some(s=>!s)||new Set(n).size!==4)errors.push(`Line ${r.line}: use four different creators.`);
  const key=[[n[0],n[2]].sort().join(','),[n[1],n[3]].sort().join(',')].sort().join('|')+'|'+r.minutes;
  if(seen.has(key))errors.push(`Line ${r.line}: duplicate 2v2 matchup.`);seen.add(key);
  for(const name of n)names.set(name,[...(names.get(name)||[]),r.line]);
 }
 for(const [name,lines]of names)if(lines.length>1)warnings.push(`${name} appears in multiple matchups (lines ${lines.join(', ')}).`);
 return {errors,warnings};
}
export function h2h2v2Posters(rows:H2HMatchup[],iso:string,images:Record<string,string>):H2HPoster[]{
 const date=h2hDate(iso);if(!date)throw Error('Choose a valid date.');
 const checks=validateH2H2v2(rows);if(checks.errors.length)throw Error(checks.errors.join('\n'));
 return rows.flatMap(r=>{
  const names=[r.name1,r.name2,r.name3!,r.name4!];
  return [[0,1,2,3],[2,3,0,1],[1,0,3,2],[3,2,1,0]].map((order,i)=>{
   const n=order.map(j=>names[j]);return {id:r.id+'-'+i,manager:'H2H 2V2',date,time:h2hTime(r.minutes),name1:n[0].toUpperCase(),name2:n[1].toUpperCase(),name3:n[2].toUpperCase(),name4:n[3].toUpperCase(),image1:images[n[0].toLowerCase()]||'',image2:images[n[1].toLowerCase()]||'',image3:images[n[2].toLowerCase()]||'',image4:images[n[3].toLowerCase()]||''};
  });
 });
}
export const H2H_2V2_EXAMPLE=`7:30 PM\tpoppysprivvvvvvv\tcrystalrose.rx
\temmajones2151\th_dti1
7:45 PM\tdan.bradley\trborowik8
\tshe_is_unstoppable_\telj2207
8:00 PM\tnottsania18\talfiem.090
\tboshboy110\tzenaylor
8:05 PM\tabbiegrant26\tx_cj_tokens_x
\thauschris23081407\tkatie.curnick
8:30 PM\tzaylorix\tliapaige.xo
\tbr4v3he4rt1\tbethany65.0
9:00 PM\tcharliejoe0999\tella_quinnxx
\tsparkys_entertain\tlaurenlouise29
9:30 PM\ttrevortilcock5\thannahbrissenden22
\ttammy98980\tdemonsoldier221
10:00 PM\tcourtsxox33\tliv_mc3
\tdinosaur90130\tmr.grumpy.chris69`;
