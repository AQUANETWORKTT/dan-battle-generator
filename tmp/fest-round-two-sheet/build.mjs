import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';

const root='C:/Users/james/daniel-battle-generator';
const rows=JSON.parse(await fs.readFile(path.join(root,'tmp/community-fest-recalculated-mapped.json'),'utf8'));
const out=path.join(root,'outputs/community-fest-2026-11-25');
await fs.mkdir(out,{recursive:true});
const workbook=Workbook.create(),sheet=workbook.worksheets.add('Round 2 by manager');
sheet.showGridLines=false;
sheet.freezePanes.freezeRows(2);
const col=n=>{let result='';for(n++;n;n=Math.floor((n-1)/26))result=String.fromCharCode(65+(n-1)%26)+result;return result;};
const groups=[
 {key:'Team Dan / James',label:'DAN / JAMES',color:'#8A6820',tint:'#FCF8ED'},
 {key:'Team Mike / Indi',label:'MIKE / INDI',color:'#205985',tint:'#F0F6FB'},
 {key:'Horizon',label:'HORIZON',color:'#32654B',tint:'#F1F7F3'},
 {key:'Respawn',label:'RESPAWN',color:'#624780',tint:'#F7F3FA'},
 {key:'Paradise',label:'PARADISE',color:'#8A4562',tint:'#FBF3F6'},
];
const placed=[],blocks=[];let start=0;
for(const group of groups){
 const members=rows.filter(r=>r.group===group.key);
 const managers=[...new Set(members.map(r=>r.manager))].sort((a,b)=>a==='Dan / James'?-1:b==='Dan / James'?1:a.localeCompare(b));
 const end=start+managers.length-1,height=Math.max(...managers.map(m=>members.filter(r=>r.manager===m).length))+2;
 const range=`${col(start)}1:${col(end)}${height}`;
 sheet.getRange(range).format={font:{name:'Arial',size:11,color:'#17202A'},fill:group.tint,verticalAlignment:'center',rowHeight:25,columnWidth:28};
 const title=sheet.getRange(`${col(start)}1:${col(end)}1`);title.merge();title.values=[[group.label]];
 title.format={fill:group.color,font:{name:'Arial',size:14,bold:true,color:'#FFFFFF'},rowHeight:34,horizontalAlignment:'center',verticalAlignment:'center'};
 for(let i=0;i<managers.length;i++){
  const manager=managers[i],column=col(start+i),creators=members.filter(r=>r.manager===manager).sort((a,b)=>(a.username||a.display).localeCompare(b.username||b.display));
  const header=sheet.getRange(`${column}2`);header.values=[[manager==='—'?'Manager unconfirmed':manager]];
  header.format={fill:'#263343',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeight:31,horizontalAlignment:'center',verticalAlignment:'center',borders:{bottom:{style:'medium',color:group.color},right:{style:'thin',color:'#FFFFFF'}}};
  const values=creators.map(r=>[r.username||r.display]);
  sheet.getRange(`${column}3:${column}${values.length+2}`).values=values;
  sheet.getRange(`${column}3:${column}${values.length+2}`).setNumberFormat('@');
  placed.push(...creators.map(r=>({id:r.id,cell:`${column}${creators.indexOf(r)+3}`,value:r.username||r.display,manager,group:group.key})));
 }
 blocks.push({group:group.key,range,start:col(start),end:col(end),count:members.length,managers:managers.length});
 const gutter=col(end+1);sheet.getRange(`${gutter}1:${gutter}20`).format.columnWidth=4;
 start=end+2;
}
sheet.getRange('A19').values=[['Source: Community FEST export, 25 Nov 2026. Advancement calculated using the supplied track/rank cutoffs.']];
sheet.getRange('A20').values=[['kacey and TR4IN are display names. The manager for hannahbentley27 has not been confirmed.']];
sheet.getRange('A19:AB20').format={font:{name:'Arial',size:10,color:'#59636F'},rowHeight:23,fill:'#FFFFFF'};
workbook.recalculate();
assert.equal(placed.length,85);assert.equal(new Set(placed.map(p=>p.id)).size,85);
for(const item of placed)assert.equal(sheet.getRange(item.cell).values[0][0],item.value);
const inspection=await workbook.inspect({kind:'table',range:'A1:D6',include:'values',tableMaxRows:6,tableMaxCols:4,maxChars:1600});
console.log(inspection.ndjson);
for(const [name,range] of [['dan','A1:I17'],['mike','K1:O14'],['subs','Q1:AB9']]){
 const image=await workbook.render({sheetName:sheet.name,range,scale:1.4,format:'png'});
 await fs.writeFile(path.join(root,`tmp/fest-round-two-sheet/${name}.png`),new Uint8Array(await image.arrayBuffer()));
}
const file=await SpreadsheetFile.exportXlsx(workbook);await file.save(path.join(out,'Round 2 creators by manager.xlsx'));
await fs.writeFile(path.join(root,'tmp/fest-round-two-sheet/verification.json'),JSON.stringify({blocks,placed},null,2));
console.log(JSON.stringify({file:path.join(out,'Round 2 creators by manager.xlsx'),creators:placed.length,groups:blocks},null,2));
