import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath = "C:/Users/james/Downloads/Creator data 2026_10_05 21_16 UTC+0.xlsx";
const workbookPath = "C:/Users/james/daniel-battle-generator/outputs/creator-target-tracker/First-Class-Creator-Targets-September-2026.xlsx";
const previewPath = "C:/Users/james/daniel-battle-generator/outputs/creator-target-tracker/preview.png";

const source = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const sourceValues = source.worksheets.getItemAt(0).getUsedRange().values;
const sourceHeaders = sourceValues[0].map((value) => String(value || "").trim());
const sourceColumn = (name) => sourceHeaders.indexOf(name);
const durationHours = (value) => {
  if (typeof value === "number") return Math.floor(value);
  const match = String(value || "").match(/(\d+)\s*h/i);
  return match ? Number(match[1]) : 0;
};
const numeric = (value) => Number(value) || 0;
const key = (value) => String(value || "").trim().replace(/^@/, "").toLowerCase();
const sourceByUsername = new Map(sourceValues.slice(1).filter((row) => key(row[sourceColumn("Creator's username")])).map((row) => [key(row[sourceColumn("Creator's username")]), row]));

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const sheet = workbook.worksheets.getItem("Creator Targets");
const trackerValues = sheet.getUsedRange().values;
const updates = [];
for (let index = 4; index < trackerValues.length; index += 1) {
  const existing = trackerValues[index];
  const sourceRow = sourceByUsername.get(key(existing[0]));
  if (!sourceRow) throw new Error(`Creator from tracker is not present in the new export: ${existing[0]}`);
  updates.push([
    String(sourceRow[sourceColumn("Creator's username")] || "").trim().replace(/^@/, ""),
    String(sourceRow[sourceColumn("Group")] || "").trim(),
    String(sourceRow[sourceColumn("Creator Network manager")] || "").trim(),
    // The export's main columns are the complete September campaign totals.
    // Its "last month" columns refer to August and are not the requested data.
    numeric(sourceRow[sourceColumn("Diamonds")]),
    durationHours(sourceRow[sourceColumn("LIVE duration")]),
    numeric(sourceRow[sourceColumn("Valid go LIVE days")]),
  ]);
}
if (updates.length !== sourceByUsername.size) throw new Error(`The new export has ${sourceByUsername.size} creators but the tracker has ${updates.length}.`);
sheet.getRange(`A5:F${updates.length + 4}`).values = updates;
workbook.recalculate();
const check = await workbook.inspect({ kind: "table", range: "Creator Targets!A1:J10", include: "values,formulas", tableMaxRows: 10, tableMaxCols: 10 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: "Creator Targets", range: "A1:J22", scale: 1.5, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);
console.log(JSON.stringify({ workbookPath, creators: updates.length }));
