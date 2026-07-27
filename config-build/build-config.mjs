import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs/kpi-config");
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const readme = workbook.worksheets.add("Read Me");
const settings = workbook.worksheets.add("Settings");
const reports = workbook.worksheets.add("Reports");
const fields = workbook.worksheets.add("KPI Fields");

const colors = {
  ink: "#14211C",
  green: "#1E5C45",
  lime: "#DFFF7A",
  paper: "#F4F1E9",
  card: "#FFFDF8",
  line: "#DCD8CE",
  muted: "#68736E",
  coral: "#D95C43",
  white: "#FFFFFF",
};

for (const sheet of [readme, settings, reports, fields]) {
  sheet.showGridLines = false;
}

readme.getRange("A1:H2").merge();
readme.getRange("A1").values = [["Operations KPI Configuration"]];
readme.getRange("A1:H2").format = {
  fill: colors.green,
  font: { bold: true, color: colors.white, size: 22 },
  verticalAlignment: "center",
};

readme.getRange("A4:H4").merge();
readme.getRange("A4").values = [[
  "This Google Sheet is the control panel for the web dashboard and scheduled KPI email.",
]];
readme.getRange("A4:H4").format = {
  fill: colors.lime,
  font: { bold: true, color: colors.ink },
  wrapText: true,
  verticalAlignment: "center",
};

for (let row = 6; row <= 9; row += 1) {
  readme.getRange(`A${row}:C${row}`).merge();
  readme.getRange(`D${row}:E${row}`).merge();
}
readme.getRange("A6:A9").values = [
  ["Current active reports"],
  ["Current active KPI fields"],
  ["Scheduled email hour"],
  ["Configuration status"],
];
readme.getRange("D6").formulas = [["=COUNTA('Reports'!C2:C100)"]];
readme.getRange("D7").formulas = [["=COUNTA('KPI Fields'!D2:D200)"]];
readme.getRange("D8").formulas = [[
  `=INDEX('Settings'!B2:B20,MATCH("SCHEDULED_EMAIL_HOUR",'Settings'!A2:A20,0))&":00 IST"`,
]];
readme.getRange("D9").values = [["Ready"]];
readme.getRange("A6:E9").format.borders = {
  preset: "all",
  style: "thin",
  color: colors.line,
};
readme.getRange("A6:C9").format = {
  fill: colors.paper,
  font: { bold: true, color: colors.ink },
};
readme.getRange("D6:E9").format = {
  fill: colors.card,
  font: { bold: true, color: colors.green },
};

readme.getRange("A11:H11").merge();
readme.getRange("A11").values = [["How to add another dashboard"]];
readme.getRange("A11:H11").format = {
  fill: colors.green,
  font: { bold: true, color: colors.white, size: 14 },
};

readme.getRange("A12:H16").values = [
  ["1", "Add one row in Reports.", null, null, null, null, null, null],
  ["2", "Use a unique Report ID such as open-gatepass.", null, null, null, null, null, null],
  ["3", "Add each required KPI as a row in KPI Fields.", null, null, null, null, null, null],
  ["4", "Set Active to TRUE when ready.", null, null, null, null, null, null],
  ["5", "Use Refresh data on the web dashboard to apply changes.", null, null, null, null, null, null],
];
for (let row = 12; row <= 16; row += 1) {
  readme.getRange(`B${row}:H${row}`).merge();
}
readme.getRange("A12:A16").format = {
  fill: colors.lime,
  font: { bold: true, color: colors.ink },
  horizontalAlignment: "center",
};
readme.getRange("B12:H16").format = {
  fill: colors.card,
  font: { color: colors.ink },
};
readme.getRange("A12:H16").format.borders = {
  preset: "all",
  style: "thin",
  color: colors.line,
};

readme.getRange("A18:H18").merge();
readme.getRange("A18").values = [[
  "Search Labels can contain alternatives separated by |. Value Position controls whether the KPI value is read after or before its label.",
]];
readme.getRange("A18:H18").format = {
  fill: "#FFF0EC",
  font: { color: colors.coral, italic: true },
  wrapText: true,
};

readme.freezePanes.freezeRows(2);
readme.getRange("A1:A18").format.columnWidth = 8;
readme.getRange("B1:H18").format.columnWidth = 18;
readme.getRange("A1:H18").format.rowHeight = 24;
readme.getRange("A1:H2").format.rowHeight = 34;
readme.getRange("A4:H4").format.rowHeight = 38;
readme.getRange("A18:H18").format.rowHeight = 42;

const settingsRows = [
  ["Key", "Value", "Description"],
  ["TIME_ZONE", "Asia/Kolkata", "Time zone used for refreshes, dates and scheduled emails"],
  ["CACHE_MINUTES", 30, "Minutes before dashboard data is refreshed from Gmail"],
  ["SCHEDULED_EMAIL_HOUR", 11, "Daily email hour in 24-hour format"],
  ["EMAIL_RECIPIENTS", "bhavesh.patel@mosaicwellness.in", "Use | between multiple recipients"],
  [
    "ALLOWED_USERS",
    "bhavesh.patel@mosaicwellness.in|shailendra.singh@mosaicwellness.in|shailendra@mosaicwellness.in",
    "Google accounts allowed to open the dashboard",
  ],
  [
    "DASHBOARD_URL",
    "https://script.google.com/macros/s/AKfycby5ih5rzT02m8e254Ulu553JUZV5nm1lx3O1o4-clLAh79fsQIcE7-zGwUra7NgVl_eTA/exec",
    "Published consolidated dashboard URL",
  ],
  ["SCHEDULE_ENABLED", true, "TRUE sends the consolidated KPI email daily"],
];
settings.getRange(`A1:C${settingsRows.length}`).values = settingsRows;
settings.freezePanes.freezeRows(1);
settings.getRange("A1:C1").format = {
  fill: colors.green,
  font: { bold: true, color: colors.white },
  horizontalAlignment: "center",
};
settings.getRange(`A2:A${settingsRows.length}`).format = {
  fill: colors.paper,
  font: { bold: true, color: colors.ink },
};
settings.getRange(`A1:C${settingsRows.length}`).format.borders = {
  preset: "all",
  style: "thin",
  color: colors.line,
};
settings.getRange(`B2:C${settingsRows.length}`).format.wrapText = true;
settings.getRange("A1:A8").format.columnWidth = 26;
settings.getRange("B1:B8").format.columnWidth = 56;
settings.getRange("C1:C8").format.columnWidth = 54;
settings.getRange("A1:C8").format.rowHeight = 30;
settings.getRange("A6:C7").format.rowHeight = 46;
settings.getRange("B8").dataValidation = {
  rule: { type: "list", values: [true, false] },
};
settings.tables.add(`A1:C${settingsRows.length}`, true, "SettingsTable");

const reportRows = [
  [
    "Active",
    "Sort Order",
    "Report ID",
    "Report Name",
    "Category",
    "Sender Email",
    "Gmail Search Query",
    "Subject Contains",
    "Dashboard URL Fallback",
    "Display Type",
  ],
  [
    true,
    1,
    "inventory-cycle-count",
    "Inventory Cycle Count",
    "Inventory control",
    "bhavesh.patel@mosaicwellness.in",
    'from:bhavesh.patel@mosaicwellness.in subject:"Daily Cycle count inventory" -in:trash',
    "Daily Cycle count inventory",
    "https://bjpatel90.github.io/Inventory_Visibility/",
    "METRIC_CARDS",
  ],
  [
    true,
    2,
    "fefo-violations",
    "FEFO Violations",
    "Dispatch compliance",
    "farhana.teli@mosaicwellness.in",
    'from:farhana.teli@mosaicwellness.in subject:"Daily FEFO Violation Check" -in:trash',
    "Daily FEFO Violation Check",
    "https://datastudio.google.com/u/0/reporting/320397c5-8ecd-4e85-b281-36d3694a82e8/page/JaFbF",
    "METRIC_CARDS",
  ],
  [
    true,
    3,
    "open-gatepass-ageing",
    "Open Gatepass Ageing",
    "Gatepass ageing",
    "farhana.teli@mosaicwellness.in",
    'from:farhana.teli@mosaicwellness.in subject:"Open Gatepass Ageing Report" -in:trash',
    "Open Gatepass Ageing Report",
    "",
    "OWNER_AGEING_TABLE",
  ],
  [
    true,
    4,
    "open-putaway",
    "Open Putaway",
    "Putaway ageing",
    "farhana.teli@mosaicwellness.in",
    'from:farhana.teli@mosaicwellness.in subject:"Open Putaway Report" -in:trash',
    "Open Putaway Report",
    "",
    "PUTAWAY_TOTALS_TABLE",
  ],
];
reports.getRange(`A1:J${reportRows.length}`).values = reportRows;
reports.freezePanes.freezeRows(1);
reports.getRange("A1:J1").format = {
  fill: colors.green,
  font: { bold: true, color: colors.white },
  horizontalAlignment: "center",
  wrapText: true,
};
reports.getRange(`A1:J${reportRows.length}`).format.borders = {
  preset: "all",
  style: "thin",
  color: colors.line,
};
reports.getRange(`A2:J${reportRows.length}`).format.wrapText = true;
reports.getRange("A1:A100").dataValidation = {
  rule: { type: "list", values: [true, false] },
};
reports.getRange("B2:B100").dataValidation = {
  rule: { type: "whole", operator: "between", formula1: 1, formula2: 999 },
};
reports.getRange("J2:J100").dataValidation = {
  rule: {
    type: "list",
    values: [
      "METRIC_CARDS",
      "OWNER_AGEING_TABLE",
      "PUTAWAY_TOTALS_TABLE",
    ],
  },
};
reports.getRange("A1:A5").format.columnWidth = 12;
reports.getRange("B1:B5").format.columnWidth = 12;
reports.getRange("C1:C5").format.columnWidth = 25;
reports.getRange("D1:F5").format.columnWidth = 27;
reports.getRange("G1:G5").format.columnWidth = 62;
reports.getRange("H1:H5").format.columnWidth = 36;
reports.getRange("I1:I5").format.columnWidth = 60;
reports.getRange("J1:J5").format.columnWidth = 28;
reports.getRange("A1:J5").format.rowHeight = 42;
reports.tables.add(`A1:J${reportRows.length}`, true, "ReportsTable");

const fieldRows = [
  [
    "Active",
    "Report ID",
    "Display Order",
    "KPI Label",
    "Search Labels",
    "Value Position",
    "Tone",
    "Note Rule",
    "Note Value",
  ],
  [true, "inventory-cycle-count", 1, "Last Quarter", "Last Quarter", "AFTER", "positive", "DATE_RANGE", "Last Quarter"],
  [true, "inventory-cycle-count", 2, "Last Month", "Last Month", "AFTER", "positive", "DATE_RANGE", "Last Month"],
  [true, "inventory-cycle-count", 3, "Month to Date", "Month to Date|MTD", "AFTER", "positive", "DATE_RANGE", "Month to Date"],
  [true, "inventory-cycle-count", 4, "Yesterday", "Yesterday", "AFTER", "warning", "NO_CYCLE_COUNT", "Yesterday"],
  [true, "fefo-violations", 1, "Violated Batch Count", "Violated Batch Count", "BEFORE_OR_AFTER", "warning", "FIXED", "Latest reported value"],
  [true, "fefo-violations", 2, "Dispatch First Batch Count", "Disaptch First Batch Count|Dispatch First Batch Count", "BEFORE_OR_AFTER", "", "FIXED", "Latest reported value"],
  [true, "fefo-violations", 3, "Overall FEFO Compliance", "Overall FEFO Compliance %", "BEFORE_OR_AFTER", "positive", "FIXED", "Latest reported value"],
  [true, "fefo-violations", 4, "Overall FEFO Non-Compliance", "Overall FEFO Non-Compliance %", "BEFORE_OR_AFTER", "warning", "FIXED", "Latest reported value"],
];
fields.getRange(`A1:I${fieldRows.length}`).values = fieldRows;
fields.freezePanes.freezeRows(1);
fields.getRange("A1:I1").format = {
  fill: colors.green,
  font: { bold: true, color: colors.white },
  horizontalAlignment: "center",
  wrapText: true,
};
fields.getRange(`A1:I${fieldRows.length}`).format.borders = {
  preset: "all",
  style: "thin",
  color: colors.line,
};
fields.getRange(`A2:I${fieldRows.length}`).format.wrapText = true;
fields.getRange("A1:A200").dataValidation = {
  rule: { type: "list", values: [true, false] },
};
fields.getRange("C2:C200").dataValidation = {
  rule: { type: "whole", operator: "between", formula1: 1, formula2: 99 },
};
fields.getRange("F2:F200").dataValidation = {
  rule: { type: "list", values: ["AFTER", "BEFORE_OR_AFTER"] },
};
fields.getRange("G2:G200").dataValidation = {
  rule: { type: "list", values: ["", "positive", "warning"] },
};
fields.getRange("H2:H200").dataValidation = {
  rule: { type: "list", values: ["FIXED", "DATE_RANGE", "NO_CYCLE_COUNT"] },
};
fields.getRange("A1:A9").format.columnWidth = 12;
fields.getRange("B1:B9").format.columnWidth = 27;
fields.getRange("C1:C9").format.columnWidth = 14;
fields.getRange("D1:D9").format.columnWidth = 31;
fields.getRange("E1:E9").format.columnWidth = 46;
fields.getRange("F1:H9").format.columnWidth = 22;
fields.getRange("I1:I9").format.columnWidth = 34;
fields.getRange("A1:I9").format.rowHeight = 38;
fields.tables.add(`A1:I${fieldRows.length}`, true, "KpiFieldsTable");

const summary = await workbook.inspect({
  kind: "table",
  range: "Read Me!A1:H18",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 10,
  maxChars: 5000,
});
console.log(summary.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "configuration workbook formula error scan",
});
console.log(errors.ndjson);

for (const sheetName of ["Read Me", "Settings", "Reports", "KPI Fields"]) {
  const preview = await workbook.render({
    sheetName,
    autoCrop: "all",
    scale: 1.2,
    format: "png",
  });
  const previewPath = path.join(
    outputDir,
    `${sheetName.toLowerCase().replaceAll(" ", "-")}.png`,
  );
  await fs.writeFile(
    previewPath,
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const output = await SpreadsheetFile.exportXlsx(workbook);
const outputPath = path.join(outputDir, "operations-kpi-configuration.xlsx");
await output.save(outputPath);
console.log(outputPath);
