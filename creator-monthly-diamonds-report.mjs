import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/james/daniel-battle-generator/outputs/creator-diamonds-apr-sep";
const sourceRows = [
  ["kayjb_3","kayjb_3","7359135580782854149",95261,1341187,452336,977310,1130893,748412],
  ["mavismim","mavismim","7598582930843271185",73018,369,130870,52178,505463,332105],
  ["flexzontik","flexzontik","7426095833990447105",309741,146603,80575,220165,291633,433245],
  ["2026_phyco","2026_phyco","7520902402413871121",276003,485096,329277,920779,1299051,0],
  ["vitaliacy0","vitaliacy0","7461916031532072977",null,null,null,null,null,481632],
  ["joshuahurd1","joshuahurd1","7359138100993884166",null,null,null,171285,424676,249326],
  ["poppy_cooper06","poppy_cooper06","7453158353573838864",69286,162951,255068,283283,609527,166127],
  ["theartfulsunshine","theartfulsunshine","7523161029426331649",180110,262082,117721,157694,269147,126764],
  ["paigeoliviaax1","paigeoliviaax1","7410264319340068881",516541,593358,610480,284010,96036,258717],
  ["benofwands","benofwands","7476859546733084688",385513,159055,62350,215912,248829,128349],
  ["ronniefieldd","ronniefieldd","7496631469230686224",103838,377763,42655,125809,259055,62987],
  ["doryelizabeth09","doryelizabeth09","7487192490576019473",null,null,null,null,221417,91382],
  ["xegjae","xegjae","7516098707817807888",3,219,200,2060,3169,104002],
  ["elliex035","elliex035","7589651406747942913",188450,97058,220340,172313,112742,0],
  ["kets540","kets540","7555865516762693649",109059,121232,61971,84138,68722,36503],
  ["primalnxs","primalnxs","7525033072316743697",239651,56321,22943,145134,78564,40929],
  ["itsmecheryl1983","itsmecheryl1983","7545240391705067537",null,null,null,null,null,49512],
  ["saraaelisabeth","saraaelisabeth","7364684700755116033",80600,56710,56627,63946,25824,35021],
  ["peakseb","peakseb","7565085827529965584",78469,137668,46632,13171,22655,4342],
  ["mikehalesmma","mikehalesmma","7391065624660819969",61781,2494,13001,7639,5054,5235],
  ["ih8cheese2","ih8cheese2","7614146871044358145",60796,5380,5303,18890,2363,5360],
  ["itsnotmeitsyoux2","itsnotmeitsyoux2","7484344144631119888",160414,29183,11540,1357,3850,942],
  ["elle.montyy","elle.montyy","7359137040824369158",210,0,0,7,0,0],
  ["samirr7z","samirr7z","7547719121325015041",2093,0,0,0,1,0],
  ["livs_privxx5","livs_privxx5","7467602102492168193",324507,36457,31179,1386,0,0],
  ["ben_dy318","ben_dy318","7517578745444646913",108997,18097,11,0,11257,0],
];
// A zero-width prefix forces Excel to retain 19-digit IDs as text, without
// changing their visible value or allowing scientific notation.
const rows = sourceRows.map((row) => [row[0], row[1], `\u200B${row[2]}`, ...row.slice(3)]);

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Monthly diamonds");
sheet.showGridLines = false;
sheet.getRange("A1:I1").merge();
sheet.getRange("A1").values = [["Creator diamonds by month"]];
sheet.getRange("A2").values = [["Matched by creator ID from the September 2026 export. September covers 1–19 September. Blank means the creator was not present in that month’s export."]];
sheet.mergeCells("A2:I2");
sheet.getRange("A4:I4").values = [["Supplied name", "Latest export name", "Creator ID", "April 2026", "May 2026", "June 2026", "July 2026", "August 2026", "September 2026"]];
sheet.getRange(`A5:I${rows.length + 4}`).values = rows;
sheet.getRange("A1:I1").format = { font: { name: "Arial", size: 16, bold: true, color: "#1F2937" } };
sheet.getRange("A2:I2").format = { font: { name: "Arial", size: 10, italic: true, color: "#4B5563" }, wrapText: false };
sheet.getRange("A4:I4").format = { fill: "#1F4E78", font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", borders: { preset: "all", style: "thin", color: "#D9E2F3" } };
sheet.getRange(`A5:I${rows.length + 4}`).format.font = { name: "Arial", size: 10, color: "#1F2937" };
sheet.getRange(`A5:I${rows.length + 4}`).format.verticalAlignment = "center";
sheet.getRange(`D5:I${rows.length + 4}`).format.numberFormat = "#,##0";
sheet.getRange(`C5:C${rows.length + 4}`).format.numberFormat = "@";
sheet.getRange(`D5:I${rows.length + 4}`).format.horizontalAlignment = "right";
sheet.getRange(`A5:I${rows.length + 4}`).format.borders = { preset: "insideHorizontal", style: "thin", color: "#E5E7EB" };
sheet.getRange(`A5:C${rows.length + 4}`).format.fill = "#F8FAFC";
sheet.getRange(`D5:I${rows.length + 4}`).conditionalFormats.add("colorScale", { colors: ["#FFFFFF", "#DDEBF7", "#5B9BD5"], thresholds: ["min", { type: "percentile", value: 50 }, "max"] });
sheet.getRange("A1").format.rowHeight = 28;
sheet.getRange("A2").format.rowHeight = 22;
sheet.getRange("A4").format.rowHeight = 24;
sheet.getRange("A:A").format.columnWidth = 22;
sheet.getRange("B:B").format.columnWidth = 22;
sheet.getRange("C:C").format.columnWidth = 24;
sheet.getRange("D:I").format.columnWidth = 16;
sheet.freezePanes.freezeRows(4);
sheet.freezePanes.freezeColumns(3);
const table = sheet.tables.add(`A4:I${rows.length + 4}`, true, "CreatorMonthlyDiamonds");
table.style = "TableStyleMedium2";
workbook.recalculate();
const inspection = await workbook.inspect({ kind: "table", range: "Monthly diamonds!A1:I12", include: "values", tableMaxRows: 12, tableMaxCols: 9 });
console.log(inspection.ndjson);
const preview = await workbook.render({ sheetName: "Monthly diamonds", range: "A1:I14", scale: 1.25, format: "png" });
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(`${outputDir}/preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/creator-diamonds-apr-sep-2026.xlsx`);
