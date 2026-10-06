import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = "C:/Users/james/Downloads/Creator data 2026_10_05 19_37 UTC+0.xlsx";
const outputDir = "C:/Users/james/daniel-battle-generator/outputs/creator-target-tracker";
const outputPath = `${outputDir}/First-Class-Creator-Targets-September-2026.xlsx`;
const font = "Arial";

const sourceFile = await FileBlob.load(sourcePath);
const sourceWorkbook = await SpreadsheetFile.importXlsx(sourceFile);
const sourceSheet = sourceWorkbook.worksheets.getItemAt(0);
const sourceValues = sourceSheet.getUsedRange().values;
const headers = sourceValues[0].map((value) => String(value || "").trim());
const col = (name) => headers.indexOf(name);
const required = ["Creator ID", "Creator's username", "Group", "Creator Network manager", "Diamonds last month", "LIVE duration (hours) last month", "Valid go LIVE days last month"];
for (const name of required) if (col(name) < 0) throw new Error(`Source column not found: ${name}`);

const wholeHours = (value) => {
  if (typeof value === "number") return Math.floor(value);
  const match = String(value || "").match(/(\d+)\s*h/i);
  return match ? Number(match[1]) : 0;
};
const number = (value) => Number(value) || 0;
const rows = sourceValues.slice(1)
  .filter((row) => String(row[col("Creator's username")] || "").trim())
  .map((row) => [
    String(row[col("Creator's username")] || "").trim().replace(/^@/, ""),
    String(row[col("Group")] || "").trim(),
    String(row[col("Creator Network manager")] || "").trim(),
    number(row[col("Diamonds last month")]),
    wholeHours(row[col("LIVE duration (hours) last month")]),
    number(row[col("Valid go LIVE days last month")]),
    null,
    null,
    null,
    null,
  ]);

const workbook = Workbook.create();
const tracker = workbook.worksheets.add("Creator Targets");
const levels = workbook.worksheets.add("Activity Levels");
tracker.showGridLines = false;
levels.showGridLines = false;
tracker.tabColor = "#B88728";
levels.tabColor = "#6C5522";

tracker.getRange("A1:J1").merge();
tracker.getRange("A1").values = [["FIRST CLASS AGENCY — CREATOR TARGETS"]];
tracker.getRange("A2:J2").merge();
tracker.getRange("A2").values = [["September 2026 actuals. Enter a Diamond Target and choose an Activeness Level to fill the activity targets automatically."]];
tracker.getRange("A1:J1").format = { fill: "#15120B", font: { name: font, size: 16, bold: true, color: "#F7D878" }, horizontalAlignment: "left", verticalAlignment: "center" };
tracker.getRange("A2:J2").format = { fill: "#15120B", font: { name: font, size: 10, italic: true, color: "#F4E9C5" }, horizontalAlignment: "left", verticalAlignment: "center" };
tracker.getRange("A1:J1").format.rowHeight = 28;
tracker.getRange("A2:J2").format.rowHeight = 21;

const headings = [["Creator username", "Group", "Manager", "Last month diamonds", "Last month hours", "Last month valid days", "Diamond target", "Activeness level", "Hours target", "Valid days target"]];
tracker.getRange("A4:J4").values = headings;
tracker.getRange("A4:J4").format = { fill: "#2C2414", font: { name: font, size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "outside", style: "thin", color: "#D7B55A" } };
tracker.getRange("A4:J4").format.rowHeight = 30;

const firstDataRow = 5;
const lastDataRow = firstDataRow + rows.length - 1;
tracker.getRange(`A${firstDataRow}:J${lastDataRow}`).values = rows;
tracker.getRange(`A${firstDataRow}:J${lastDataRow}`).format = { font: { name: font, size: 10, color: "#1E1A12" }, verticalAlignment: "center" };
tracker.getRange(`A${firstDataRow}:J${lastDataRow}`).format.borders = { insideHorizontal: { style: "thin", color: "#E9E1CA" }, bottom: { style: "thin", color: "#E9E1CA" } };
tracker.getRange(`A${firstDataRow}:F${lastDataRow}`).format.fill = "#FFFDF8";
tracker.getRange(`G${firstDataRow}:H${lastDataRow}`).format = { fill: "#FFF2C7", font: { name: font, size: 10, bold: true, color: "#332606" }, verticalAlignment: "center" };
tracker.getRange(`I${firstDataRow}:J${lastDataRow}`).format = { fill: "#F1F5E8", font: { name: font, size: 10, bold: true, color: "#34411E" }, verticalAlignment: "center" };
tracker.getRange(`D${firstDataRow}:D${lastDataRow}`).format.numberFormat = "#,##0";
tracker.getRange(`E${firstDataRow}:E${lastDataRow}`).format.numberFormat = "0 \"hours\"";
tracker.getRange(`F${firstDataRow}:F${lastDataRow}`).format.numberFormat = "0 \"days\"";
tracker.getRange(`G${firstDataRow}:G${lastDataRow}`).format.numberFormat = "#,##0";
tracker.getRange(`I${firstDataRow}:I${lastDataRow}`).format.numberFormat = "0 \"hours\"";
tracker.getRange(`J${firstDataRow}:J${lastDataRow}`).format.numberFormat = "0 \"days\"";
tracker.getRange(`G${firstDataRow}:G${lastDataRow}`).dataValidation = { rule: { type: "whole", operator: "greaterThanOrEqual", formula1: 0 } };
tracker.getRange(`H${firstDataRow}:H${lastDataRow}`).dataValidation = { rule: { type: "list", formula1: "'Activity Levels'!$A$5:$A$9" } };
tracker.getRange(`I${firstDataRow}`).formulas = [[`=IFERROR(VLOOKUP(H${firstDataRow},'Activity Levels'!$A$5:$C$9,2,FALSE),"")`]];
tracker.getRange(`I${firstDataRow}:I${lastDataRow}`).fillDown();
tracker.getRange(`J${firstDataRow}`).formulas = [[`=IFERROR(VLOOKUP(H${firstDataRow},'Activity Levels'!$A$5:$C$9,3,FALSE),"")`]];
tracker.getRange(`J${firstDataRow}:J${lastDataRow}`).fillDown();
tracker.getRange(`A${firstDataRow}:J${lastDataRow}`).format.rowHeight = 20;
tracker.getRange(`A4:J${lastDataRow}`).format.borders = { preset: "outside", style: "thin", color: "#C9B676" };
tracker.getRange("A:A").format.columnWidth = 24;
tracker.getRange("B:B").format.columnWidth = 19;
tracker.getRange("C:C").format.columnWidth = 31;
tracker.getRange("D:J").format.columnWidth = 17;
tracker.freezePanes.freezeRows(4);
tracker.freezePanes.freezeColumns(1);
const table = tracker.tables.add(`A4:J${lastDataRow}`, true, "CreatorTargets");
table.style = "TableStyleMedium2";

levels.getRange("A1:C1").merge();
levels.getRange("A1").values = [["ACTIVENESS LEVEL TARGETS"]];
levels.getRange("A2:C2").merge();
levels.getRange("A2").values = [["Choose a level in Creator Targets and the last two target columns will update automatically."]];
levels.getRange("A1:C1").format = { fill: "#15120B", font: { name: font, size: 14, bold: true, color: "#F7D878" }, verticalAlignment: "center" };
levels.getRange("A2:C2").format = { fill: "#15120B", font: { name: font, size: 10, italic: true, color: "#F4E9C5" }, verticalAlignment: "center" };
levels.getRange("A1:C1").format.rowHeight = 26;
levels.getRange("A2:C2").format.rowHeight = 20;
levels.getRange("A4:C4").values = [["Activeness level", "Hours target", "Valid live days target"]];
levels.getRange("A4:C4").format = { fill: "#2C2414", font: { name: font, size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", borders: { preset: "all", style: "thin", color: "#D7B55A" } };
levels.getRange("A5:C9").values = [[1, 20, 8], [2, 30, 11], [3, 40, 15], [4, 60, 18], [5, 80, 22]];
levels.getRange("A5:C9").format = { fill: "#FFFDF8", font: { name: font, size: 10, color: "#1E1A12" }, horizontalAlignment: "center", verticalAlignment: "center", borders: { preset: "all", style: "thin", color: "#E2D5B1" } };
levels.getRange("B5:B9").format.numberFormat = "0 \"hours\"";
levels.getRange("C5:C9").format.numberFormat = "0 \"days\"";
levels.getRange("A:A").format.columnWidth = 20;
levels.getRange("B:C").format.columnWidth = 24;

workbook.recalculate();
// Disposable verification: selecting level 1 must fill the matching targets,
// then reset it so the delivered tracker remains blank and ready for input.
tracker.getRange(`H${firstDataRow}`).values = [[1]];
workbook.recalculate();
const levelCheck = tracker.getRange(`H${firstDataRow}:J${firstDataRow}`).values[0];
if (levelCheck[1] !== 20 || levelCheck[2] !== 8) throw new Error("Activeness-level targets did not calculate correctly.");
tracker.getRange(`H${firstDataRow}`).values = [[null]];
workbook.recalculate();
const keyCheck = await workbook.inspect({ kind: "table", range: `Creator Targets!A1:J${Math.min(lastDataRow, 10)}`, include: "values,formulas", tableMaxRows: 10, tableMaxCols: 10 });
console.log(keyCheck.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: "Creator Targets", range: `A1:J${Math.min(lastDataRow, 22)}`, scale: 1.5, format: "png" });
await fs.writeFile(`${outputDir}/preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, creators: rows.length }));
