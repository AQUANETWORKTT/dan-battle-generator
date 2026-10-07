import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "outputs/creator-monthly-analysis";
const source = JSON.parse(await fs.readFile(`${outputDir}/creator-data.json`, "utf8"));
const BODY_FONT = "Arial";
const GOLD = "#C8952E";
const DARK = "#17130C";
const PALE_GOLD = "#FFF4D6";
const RED = "#FCE4E4";
const RED_TEXT = "#9C0006";
const GREEN = "#E2F0D9";
const GREEN_TEXT = "#375623";
const AMBER = "#FFF2CC";
const daysSep = Array.from({ length: 30 }, (_, index) => index + 1);
const daysOct = Array.from({ length: 6 }, (_, index) => index + 1);

const n = (value) => Number(value) || 0;
const id = (row) => String(row.creator_id || row.creator_username || "").trim();
const username = (row) => String(row.creator_username || "Unknown").trim().replace(/^@/, "");
const dateKey = (month, day) => `${month}-${String(day).padStart(2, "0")}`;
const colName = (index) => { let value = index + 1, result = ""; while (value) { const remainder = (value - 1) % 26; result = String.fromCharCode(65 + remainder) + result; value = Math.floor((value - 1) / 26); } return result; };
const sum = (items) => items.reduce((total, value) => total + n(value), 0);
const average = (items) => items.length ? sum(items) / items.length : 0;
const safeDiv = (a, b) => b ? a / b : 0;
const textId = (value) => `'${String(value)}`;

function buildCreators(rows, month, days) {
  const byCreator = new Map();
  for (const row of rows) {
    const key = id(row);
    if (!key) continue;
    const current = byCreator.get(key) || { id: key, username: username(row), manager: row.manager_email || row.email || "Unassigned", group: row.group_name || "Not in a group", agency: row.agency || "", team: row.team || "", values: {} };
    const day = Number(String(row.stat_date || "").slice(-2));
    if (day >= 1 && day <= days.length) {
      const value = current.values[day] || { diamonds: 0, hours: 0, streams: 0, followers: 0, validDays: 0 };
      value.diamonds += n(row.diamonds);
      value.hours += n(row.live_hours);
      value.streams += n(row.live_streams);
      value.followers += n(row.followers);
      value.validDays += n(row.valid_live_days);
      current.values[day] = value;
    }
    byCreator.set(key, current);
  }
  return byCreator;
}

const september = buildCreators(source.september, "2026-09", daysSep);
const october = buildCreators(source.october, "2026-10", daysOct);
const creatorIds = new Set([...september.keys(), ...october.keys()]);
const creators = [...creatorIds].map((creatorId) => {
  const prior = september.get(creatorId);
  const current = october.get(creatorId);
  const base = prior || current;
  const sep = daysSep.map((day) => prior?.values[day] || { diamonds: 0, hours: 0, streams: 0, followers: 0, validDays: 0 });
  const oct = daysOct.map((day) => current?.values[day] || { diamonds: 0, hours: 0, streams: 0, followers: 0, validDays: 0 });
  const totalDiamonds = sum(sep.map((day) => day.diamonds));
  const totalHours = sum(sep.map((day) => day.hours));
  const totalStreams = sum(sep.map((day) => day.streams));
  const liveDays = sep.filter((day) => day.hours > 0).length;
  const topDayIndex = sep.reduce((best, day, index) => day.diamonds > sep[best].diamonds ? index : best, 0);
  const bestRateIndex = sep.reduce((best, day, index) => safeDiv(day.diamonds, day.hours) > safeDiv(sep[best].diamonds, sep[best].hours) ? index : best, 0);
  const sepFirstSixDiamonds = sum(sep.slice(0, 6).map((day) => day.diamonds));
  const octSixDiamonds = sum(oct.map((day) => day.diamonds));
  const sepFirstSixHours = sum(sep.slice(0, 6).map((day) => day.hours));
  const octSixHours = sum(oct.map((day) => day.hours));
  const diamondChange = octSixDiamonds - sepFirstSixDiamonds;
  const hourChange = octSixHours - sepFirstSixHours;
  const inactive = sepFirstSixDiamonds === 0 && octSixDiamonds === 0;
  let status = "STABLE";
  let note = "Similar start to the month.";
  if (inactive) { status = "ADDRESS — NO DIAMONDS"; note = "No diamonds in either six-day period. Reach out and check live activity."; }
  else if (octSixDiamonds === 0) { status = "ADDRESS — ZERO OCTOBER"; note = "Had September diamonds but has no October diamonds so far."; }
  else if (diamondChange > 0 && hourChange >= 0) { status = "GROWING"; note = "More diamonds with equal or more live time than last month."; }
  else if (diamondChange > 0) { status = "GROWING — EFFICIENT"; note = "More diamonds despite fewer live hours."; }
  else if (diamondChange < 0 && hourChange > 0) { status = "WATCH — RETURN DOWN"; note = "More live hours but fewer diamonds than the same September days."; }
  else if (diamondChange < 0) { status = "WATCH — ACTIVITY DOWN"; note = "Lower live time and lower diamonds than the same September days."; }
  return { ...base, sep, oct, totalDiamonds, totalHours, totalStreams, liveDays, topDayIndex, bestRateIndex, sepFirstSixDiamonds, octSixDiamonds, sepFirstSixHours, octSixHours, diamondChange, hourChange, inactive, status, note };
}).sort((a, b) => b.totalDiamonds - a.totalDiamonds || a.username.localeCompare(b.username));

function setTitle(sheet, title, subtitle, width) {
  sheet.showGridLines = false;
  sheet.getRangeByIndexes(0, 0, 1, width).merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange("A1").format = { fill: DARK, font: { name: BODY_FONT, size: 16, bold: true, color: "#FFFFFF" }, verticalAlignment: "center" };
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange("A2").format = { font: { name: BODY_FONT, size: 10, italic: true, color: "#5B5345" } };
  sheet.getRange("A1").format.rowHeight = 28;
  sheet.getRange("A2").format.rowHeight = 19;
}

function setHeader(sheet, range) {
  range.format = { fill: DARK, font: { name: BODY_FONT, size: 9, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#5B4930" } };
  range.format.rowHeight = 34;
}

function applyDailyRules(sheet, startRow, endRow, startCol, count) {
  for (let offset = 0; offset < count; offset += 1) {
    const column = colName(startCol + offset);
    const range = sheet.getRange(`${column}${startRow}:${column}${endRow}`);
    range.format.numberFormat = offset % 2 === 0 ? "#,##0" : "0.0";
    range.conditionalFormats.add("cellIs", { operator: "equal", formula: 0, format: { fill: RED, font: { color: RED_TEXT, bold: true } } });
    if (offset >= 2) {
      const previous = colName(startCol + offset - 2);
      range.conditionalFormats.addCustom(`=${column}${startRow}>${previous}${startRow}`, { fill: GREEN, font: { color: GREEN_TEXT, bold: true } });
    }
  }
}

function makeSeptemberSheet(workbook) {
  const sheet = workbook.worksheets.add("September Daily");
  const firstDayCol = 14;
  const headers = ["Creator", "Creator ID", "Manager", "Group", "Agency", "Team", "Metric", "September total", "Live days", "Streams", "Diamonds / hour", "Peak diamond day", "Best D/H day", "Recommended daily live hrs", ...daysSep.map((day) => `Sep ${String(day).padStart(2, "0")}`)];
  setTitle(sheet, "FIRST CLASS AGENCY — SEPTEMBER CREATOR DAILY ANALYSIS", "Each creator has two rows: Diamonds then Live hours. Red = zero; green = higher than the prior day for that metric. Filter by Manager in column C.", headers.length);
  sheet.getRange("A4").values = [["Creators", creators.length, "September diamonds", sum(creators.map((creator) => creator.totalDiamonds)), "September live hours", sum(creators.map((creator) => creator.totalHours)), "Note", "Recommended daily live hours is the average from positive-diamond September days. Live start times are not present in the source data."]];
  sheet.getRange("A4:H4").format = { fill: PALE_GOLD, font: { name: BODY_FONT, bold: true, color: DARK }, borders: { preset: "outside", style: "thin", color: GOLD } };
  const headerRow = 6;
  sheet.getRangeByIndexes(headerRow - 1, 0, 1, headers.length).values = [headers];
  setHeader(sheet, sheet.getRangeByIndexes(headerRow - 1, 0, 1, headers.length));
  const data = [];
  for (const creator of creators) {
    const positiveDays = creator.sep.filter((day) => day.diamonds > 0 && day.hours > 0);
    const recommended = average(positiveDays.map((day) => day.hours));
    const shared = [creator.username, textId(creator.id), creator.manager, creator.group, creator.agency, creator.team];
    data.push([...shared, "DIAMONDS", creator.totalDiamonds, creator.liveDays, creator.totalStreams, safeDiv(creator.totalDiamonds, creator.totalHours), `Sep ${String(creator.topDayIndex + 1).padStart(2, "0")}`, `Sep ${String(creator.bestRateIndex + 1).padStart(2, "0")}`, recommended, ...creator.sep.map((day) => day.diamonds)]);
    data.push([...shared, "LIVE HOURS", creator.totalHours, creator.liveDays, creator.totalStreams, safeDiv(creator.totalDiamonds, creator.totalHours), "", "", "", ...creator.sep.map((day) => day.hours)]);
  }
  const startRow = 7;
  const endRow = startRow + data.length - 1;
  sheet.getRangeByIndexes(startRow - 1, 0, data.length, headers.length).values = data;
  sheet.getRange(`A${startRow}:A${endRow}`).format.font = { name: BODY_FONT, bold: true };
  sheet.getRange(`G${startRow}:G${endRow}`).format.font = { name: BODY_FONT, bold: true, color: DARK };
  sheet.getRange(`H${startRow}:H${endRow}`).format.numberFormat = "#,##0";
  sheet.getRange(`K${startRow}:K${endRow}`).format.numberFormat = "#,##0";
  sheet.getRange(`N${startRow}:N${endRow}`).format.numberFormat = "0.0";
  applyDailyRules(sheet, startRow, endRow, firstDayCol, daysSep.length);
  sheet.tables.add(`A${headerRow}:${colName(headers.length - 1)}${endRow}`, true, "SeptemberDailyTable").style = "TableStyleMedium2";
  sheet.freezePanes.freezeRows(headerRow);
  sheet.freezePanes.freezeColumns(7);
  sheet.getRange(`A1:${colName(headers.length - 1)}${endRow}`).format.font = { name: BODY_FONT, size: 9 };
  [22, 20, 27, 22, 15, 20, 13, 16, 11, 10, 15, 14, 14, 17].forEach((width, index) => sheet.getRangeByIndexes(0, index, endRow, 1).format.columnWidth = width);
  sheet.getRangeByIndexes(0, firstDayCol, endRow, daysSep.length).format.columnWidth = 11;
  return sheet;
}

function makeComparisonSheet(workbook) {
  const sheet = workbook.worksheets.add("Oct 1-6 Compare");
  const headers = ["Creator", "Creator ID", "Manager", "Group", "Month", "Period diamonds", "Period live hours", ...daysOct.map((day) => String(day).padStart(2, "0")), "Difference", "% change", "Status", "Performance note"];
  setTitle(sheet, "FIRST CLASS AGENCY — OCTOBER START VS SEPTEMBER", "Each creator has just two rows: September first, then October. Days 1–6 run left to right. October cells are green when above the September row directly above, red when below or zero.", headers.length);
  sheet.getRange("A4").values = [["October data through", "6 October 2026", "Compared creators", creators.length, "September 1–6 diamonds", sum(creators.map((creator) => creator.sepFirstSixDiamonds)), "October 1–6 diamonds", sum(creators.map((creator) => creator.octSixDiamonds))]];
  sheet.getRange("A4:H4").format = { fill: PALE_GOLD, font: { name: BODY_FONT, bold: true, color: DARK }, borders: { preset: "outside", style: "thin", color: GOLD } };
  const headerRow = 6;
  sheet.getRangeByIndexes(headerRow - 1, 0, 1, headers.length).values = [headers];
  setHeader(sheet, sheet.getRangeByIndexes(headerRow - 1, 0, 1, headers.length));
  const data = [];
  for (const creator of creators) {
    const shared = [creator.username, textId(creator.id), creator.manager, creator.group];
    const percent = creator.sepFirstSixDiamonds ? creator.diamondChange / creator.sepFirstSixDiamonds : (creator.octSixDiamonds ? 1 : 0);
    data.push([...shared, "SEPTEMBER", creator.sepFirstSixDiamonds, creator.sepFirstSixHours, ...creator.sep.slice(0, 6).map((day) => day.diamonds), "", "", "", ""]);
    data.push([...shared, "OCTOBER", creator.octSixDiamonds, creator.octSixHours, ...creator.oct.map((day) => day.diamonds), creator.diamondChange, percent, creator.status, creator.note]);
  }
  const startRow = 7;
  const endRow = startRow + data.length - 1;
  sheet.getRangeByIndexes(startRow - 1, 0, data.length, headers.length).values = data;
  sheet.getRange(`F${startRow}:F${endRow}`).format.numberFormat = "#,##0";
  sheet.getRange(`G${startRow}:G${endRow}`).format.numberFormat = "0.0";
  sheet.getRange(`N${startRow}:N${endRow}`).format.numberFormat = "#,##0;[Red]-#,##0";
  sheet.getRange(`O${startRow}:O${endRow}`).format.numberFormat = "0.0%";
  sheet.getRange(`A${startRow}:A${endRow}`).format.font = { name: BODY_FONT, bold: true };
  sheet.getRange(`G${startRow}:G${endRow}`).format.font = { name: BODY_FONT, bold: true };
  for (let day = 0; day < daysOct.length; day += 1) {
    const column = colName(7 + day);
    const range = sheet.getRange(`${column}${startRow}:${column}${endRow}`);
    range.format.numberFormat = "#,##0";
    range.conditionalFormats.addCustom(`=AND($E${startRow}="OCTOBER",${column}${startRow}=0)`, { fill: RED, font: { color: RED_TEXT, bold: true } });
    range.conditionalFormats.addCustom(`=AND($E${startRow}="OCTOBER",${column}${startRow}>${column}${startRow - 1})`, { fill: GREEN, font: { color: GREEN_TEXT, bold: true } });
    range.conditionalFormats.addCustom(`=AND($E${startRow}="OCTOBER",${column}${startRow}<${column}${startRow - 1})`, { fill: RED, font: { color: RED_TEXT, bold: true } });
  }
  sheet.getRange(`N${startRow}:N${endRow}`).conditionalFormats.add("colorScale", { colors: ["#F4CCCC", "#FFF2CC", "#D9EAD3"], thresholds: ["min", { type: "percentile", value: 50 }, "max"] });
  sheet.getRange(`P${startRow}:P${endRow}`).conditionalFormats.add("containsText", { text: "ADDRESS", format: { fill: RED, font: { color: RED_TEXT, bold: true } } });
  sheet.getRange(`P${startRow}:P${endRow}`).conditionalFormats.add("containsText", { text: "GROWING", format: { fill: GREEN, font: { color: GREEN_TEXT, bold: true } } });
  sheet.tables.add(`A${headerRow}:${colName(headers.length - 1)}${endRow}`, true, "OctoberComparisonTable").style = "TableStyleMedium2";
  sheet.freezePanes.freezeRows(headerRow);
  sheet.freezePanes.freezeColumns(7);
  sheet.getRange(`A1:${colName(headers.length - 1)}${endRow}`).format.font = { name: BODY_FONT, size: 9 };
  [22, 20, 27, 22, 14, 16, 16, 11, 11, 11, 11, 11, 11, 15, 12, 25, 54].forEach((width, index) => sheet.getRangeByIndexes(0, index, endRow, 1).format.columnWidth = width);
  return sheet;
}

function makeFocusSheet(workbook) {
  const sheet = workbook.worksheets.add("Focus — Growth & Drops");
  const rows = [...creators].sort((a, b) => {
    if (a.inactive !== b.inactive) return a.inactive ? 1 : -1;
    return b.diamondChange - a.diamondChange || b.octSixDiamonds - a.octSixDiamonds;
  });
  const headers = ["Creator", "Creator ID", "Manager", "Group", "Status", "Sep 1–6 diamonds", "Oct 1–6 diamonds", "Diamond change", "% change", "Sep 1–6 hours", "Oct 1–6 hours", "Hour change", "Sep live days", "Oct live days", "Sep streams", "Oct streams", "September total diamonds", "September D/H", "Performance note"];
  setTitle(sheet, "FIRST CLASS AGENCY — OCTOBER FOCUS: GROWTH, DECLINES & INACTIVITY", "Ranked by diamond change for 1–6 October versus 1–6 September. Creators with zero diamonds in both periods are placed at the bottom and marked for action.", headers.length);
  const growing = rows.filter((creator) => creator.diamondChange > 0).length;
  const declining = rows.filter((creator) => creator.diamondChange < 0).length;
  const inactive = rows.filter((creator) => creator.inactive).length;
  const lost = sum(rows.filter((creator) => creator.diamondChange < 0).map((creator) => Math.abs(creator.diamondChange)));
  sheet.getRange("A4").values = [["Growing", growing, "Declining", declining, "No diamonds in either period", inactive, "Diamonds lost versus September", lost]];
  sheet.getRange("A4:H4").format = { fill: PALE_GOLD, font: { name: BODY_FONT, bold: true, color: DARK }, borders: { preset: "outside", style: "thin", color: GOLD } };
  const headerRow = 6;
  sheet.getRangeByIndexes(headerRow - 1, 0, 1, headers.length).values = [headers];
  setHeader(sheet, sheet.getRangeByIndexes(headerRow - 1, 0, 1, headers.length));
  const data = rows.map((creator) => [creator.username, textId(creator.id), creator.manager, creator.group, creator.status, creator.sepFirstSixDiamonds, creator.octSixDiamonds, creator.diamondChange, creator.sepFirstSixDiamonds ? creator.diamondChange / creator.sepFirstSixDiamonds : (creator.octSixDiamonds ? 1 : 0), creator.sepFirstSixHours, creator.octSixHours, creator.hourChange, creator.sep.slice(0, 6).filter((day) => day.hours > 0).length, creator.oct.filter((day) => day.hours > 0).length, sum(creator.sep.slice(0, 6).map((day) => day.streams)), sum(creator.oct.map((day) => day.streams)), creator.totalDiamonds, safeDiv(creator.totalDiamonds, creator.totalHours), creator.note]);
  const startRow = 7;
  const endRow = startRow + data.length - 1;
  sheet.getRangeByIndexes(startRow - 1, 0, data.length, headers.length).values = data;
  sheet.getRange(`F${startRow}:H${endRow}`).format.numberFormat = "#,##0;[Red]-#,##0";
  sheet.getRange(`I${startRow}:I${endRow}`).format.numberFormat = "0.0%";
  sheet.getRange(`J${startRow}:L${endRow}`).format.numberFormat = "0.0;[Red]-0.0";
  sheet.getRange(`Q${startRow}:Q${endRow}`).format.numberFormat = "#,##0";
  sheet.getRange(`R${startRow}:R${endRow}`).format.numberFormat = "#,##0";
  sheet.getRange(`A${startRow}:A${endRow}`).format.font = { name: BODY_FONT, bold: true };
  sheet.getRange(`E${startRow}:E${endRow}`).conditionalFormats.add("containsText", { text: "ADDRESS", format: { fill: RED, font: { color: RED_TEXT, bold: true } } });
  sheet.getRange(`E${startRow}:E${endRow}`).conditionalFormats.add("containsText", { text: "GROWING", format: { fill: GREEN, font: { color: GREEN_TEXT, bold: true } } });
  sheet.getRange(`H${startRow}:H${endRow}`).conditionalFormats.add("colorScale", { colors: ["#F4CCCC", "#FFF2CC", "#D9EAD3"], thresholds: ["min", { type: "percentile", value: 50 }, "max"] });
  sheet.getRange(`A${startRow}:S${endRow}`).conditionalFormats.addCustom(`=AND($F${startRow}=0,$G${startRow}=0)`, { fill: "#F4CCCC", font: { color: RED_TEXT } });
  sheet.tables.add(`A${headerRow}:S${endRow}`, true, "FocusGrowthDropsTable").style = "TableStyleMedium2";
  sheet.freezePanes.freezeRows(headerRow);
  sheet.freezePanes.freezeColumns(5);
  sheet.getRange(`A1:S${endRow}`).format.font = { name: BODY_FONT, size: 9 };
  [22, 20, 27, 22, 25, 16, 16, 15, 12, 14, 14, 13, 12, 12, 11, 11, 18, 14, 52].forEach((width, index) => sheet.getRangeByIndexes(0, index, endRow, 1).format.columnWidth = width);
  return sheet;
}

const workbook = Workbook.create();
makeSeptemberSheet(workbook);
makeComparisonSheet(workbook);
makeFocusSheet(workbook);
workbook.recalculate();

const inspect = await workbook.inspect({ kind: "table", range: "September Daily!A1:AT14", include: "values,formulas", tableMaxRows: 14, tableMaxCols: 46 });
console.log(inspect.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "formula error scan" });
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: "Focus — Growth & Drops", range: "A1:S25", scale: 1.3, format: "png" });
await fs.writeFile(`${outputDir}/focus-preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/First-Class-Creator-Monthly-Analysis-September-2026.xlsx`);
console.log(JSON.stringify({ creators: creators.length, output: `${outputDir}/First-Class-Creator-Monthly-Analysis-September-2026.xlsx` }));
