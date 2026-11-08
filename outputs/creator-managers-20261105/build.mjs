import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const dir='C:/Users/james/daniel-battle-generator/outputs/creator-managers-20261105';
const rows=JSON.parse(await fs.readFile(dir+'/matched.json','utf8'));
if(rows.length!==40||new Set(rows.map(r=>r.username)).size!==40)throw Error('Invalid list');
const wb=Workbook.create(),s=wb.worksheets.add('Creators');
s.showGridLines=false;s.freezePanes.freezeRows(1);
s.getRange('A1:B41').values=[['Creator username','Manager'],...rows.map(r=>[r.username,r.manager])];
s.getRange('A1:B41').format.font={name:'Arial',size:11};
s.getRange('A1:A41').format.columnWidth=28;
s.getRange('B1:B41').format.columnWidth=36;
s.getRange('A1:B41').format.rowHeight=25;
s.getRange('A1:B1').format={fill:'#172C3D',font:{bold:true,color:'#FFFFFF',size:12},rowHeight:32};
for(let i=0;i<rows.length;i++){
 s.getRange(`A${i+2}:B${i+2}`).format.fill=rows[i].record?(i%2?'#EDF3F8':'#FFFFFF'):'#FFF1CE';
}
wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'Creators!A1:B8',include:'values',tableMaxRows:8,tableMaxCols:2})).ndjson);
const png=await wb.render({sheetName:'Creators',range:'A1:B16',scale:1.5,format:'png'});
await fs.writeFile(dir+'/preview.png',new Uint8Array(await png.arrayBuffer()));
await(await SpreadsheetFile.exportXlsx(wb)).save(dir+'/Alphabetical creators and managers.xlsx');
console.log('40 unique names; 37 confirmed managers; 3 highlighted unmatched names.');
