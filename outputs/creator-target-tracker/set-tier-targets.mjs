import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "C:/Users/james/daniel-battle-generator/outputs/creator-target-tracker/First-Class-Creator-Targets-September-2026.xlsx";
const outputDir = "C:/Users/james/daniel-battle-generator/outputs/creator-target-tracker";
const tiers = [100_000, 200_000, 300_000, 500_000, 700_000, 1_000_000, 1_600_000, 2_500_000];
const tierFor = (diamonds) => [...tiers].reverse().find((tier) => diamonds >= tier) || 100_000;

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const sheet = workbook.worksheets.getItem("Creator Targets");
const used = sheet.getUsedRange().values;
const values = used.slice(4).map((row) => [tierFor(Number(row[3]) || 0)]);
sheet.getRange(`G5:G${values.length + 4}`).values = values;
workbook.recalculate();
const check = await workbook.inspect({ kind: "table", range: "Creator Targets!D4:J10", include: "values,formulas", tableMaxRows: 10, tableMaxCols: 7 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: "Creator Targets", range: "A1:J22", scale: 1.5, format: "png" });
await fs.writeFile(`${outputDir}/preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path);
console.log(JSON.stringify({ path, updated: values.length }));
