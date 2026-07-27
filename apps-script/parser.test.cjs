const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("apps-script/Code.gs", "utf8");
const context = vm.createContext({ console });
vm.runInContext(source, context);

const inventoryBody = `
Last Quarter
99.02%
Qty: 41,83,737
01 Apr 2026 - 30 Jun 2026
Last Month
98.6%
Qty: 12,33,128
01 Jun 2026 - 30 Jun 2026
Month to Date
99.56%
Qty: 23,69,548
01 Jul 2026 - 28 Jul 2026
Yesterday
0%
Qty: 0
27 Jul 2026 - 27 Jul 2026
No cycle count was performed.
`;

const fefoBody = `
FEFO Violation Overview
10
Affected Product by FEFO
12
Violated Batch Count
21
Disaptch First Batch Count
79%
Overall FEFO Compliance %
21%
Overall FEFO Non-Compliance %
`;

const gatepassBody = `
Open Gatepass Ageing Summary — By Owner
Sr No Gatepass Owner 0–15 Days 16–30 Days Above 30 Days Grand Total
Open Qty GP Count Open Qty GP Count Open Qty GP Count Qty Total Count Total
1 Sahil 1,92,614 199 6,867 51 13,438 57 2,12,919 307
2 Shraddha 3,20,782 178 4,737 32 2,889 48 3,28,408 258
3 Suraj Gupta 3,18,621 152 697 12 1,868 12 3,21,186 176
4 Unknown 2,619 4 0 1 0 1 2,619 6
GRAND TOTAL 8,34,636 533 12,301 96 18,195 118 8,65,132 747
Critical Ageing Alert — Beyond Threshold
`;

const putawayBody = `
Created By Remaining Putaway Details
c/b2b Created By 0-3 days 4-7 days Above 7 days Grand Total
Putaway Count Quantity Putaway Count Quantity Putaway Count Quantity Putaway Count Total Qty
Rupesh rtv.warehouse@mosaicwellness.in 0 0 0 0 1 216 1 216
Rupesh Total 0 0 0 0 1 216 1 216
Sahil Total 7 250 6 62 17 1175 30 1487
Shraddha Total 30 3055 25 1451 64 3005 116 7511
Suraj Gupta Total 21 16720 23 3798 31 7566 74 28084
Grand Total 58 20025 54 5311 113 11962 220 37298
Regards,
Farhana Teli
`;

const inwardTatBody = `
Vehicle Arrival to Putaway TAT
Last Quarter, Last Month, Month to Date, and Yesterday.
KPI1: Unloading to Putaway · KPI2: GRN to Putaway · KPI3: Unloading to GRN
LAST QUARTER
29:50
KPI2: 13:00
KPI3: 15:50
01 Apr – 30 Jun 2026
LAST MONTH
28:24
KPI2: 14:24
KPI3: 14:00
01 Jun – 30 Jun 2026
MONTH TO DATE
27:09
KPI2: 17:51
KPI3: 09:29
Records: 552
01 Jul – 27 Jul 2026
YESTERDAY
—
KPI2: —
KPI3: —
Records: 26
27 Jul 2026
Yesterday: 0 of 26 records are complete.
`;

const inwardTatHtml = `
<table>
  <tr><th>LAST QUARTER</th><td>29:50</td><td>01 Apr &ndash; 30 Jun 2026</td></tr>
  <tr><th>LAST MONTH</th><td>28:24</td><td>01 Jun &ndash; 30 Jun 2026</td></tr>
  <tr><th>MONTH TO DATE</th><td>27:09</td><td>01 Jul &ndash; 27 Jul 2026</td></tr>
  <tr><th>YESTERDAY</th><td>&mdash;</td><td>27 Jul 2026</td></tr>
</table>
`;

const inventory = context.parseConfiguredMetrics_(inventoryBody, [
  { label: "Last Quarter", searchLabels: ["Last Quarter"], valuePosition: "AFTER", tone: "positive", noteRule: "DATE_RANGE", noteValue: "Last Quarter" },
  { label: "Last Month", searchLabels: ["Last Month"], valuePosition: "AFTER", tone: "positive", noteRule: "DATE_RANGE", noteValue: "Last Month" },
  { label: "Month to Date", searchLabels: ["Month to Date", "MTD"], valuePosition: "AFTER", tone: "positive", noteRule: "DATE_RANGE", noteValue: "Month to Date" },
  { label: "Yesterday", searchLabels: ["Yesterday"], valuePosition: "AFTER", tone: "warning", noteRule: "NO_CYCLE_COUNT", noteValue: "Yesterday" },
]);
const fefo = context.parseConfiguredMetrics_(fefoBody, [
  { label: "Violated Batch Count", searchLabels: ["Violated Batch Count"], valuePosition: "BEFORE_OR_AFTER", tone: "warning", noteRule: "FIXED", noteValue: "Latest reported value" },
  { label: "Dispatch First Batch Count", searchLabels: ["Disaptch First Batch Count", "Dispatch First Batch Count"], valuePosition: "BEFORE_OR_AFTER", tone: "", noteRule: "FIXED", noteValue: "Latest reported value" },
  { label: "Overall FEFO Compliance", searchLabels: ["Overall FEFO Compliance %"], valuePosition: "BEFORE_OR_AFTER", tone: "positive", noteRule: "FIXED", noteValue: "Latest reported value" },
  { label: "Overall FEFO Non-Compliance", searchLabels: ["Overall FEFO Non-Compliance %"], valuePosition: "BEFORE_OR_AFTER", tone: "warning", noteRule: "FIXED", noteValue: "Latest reported value" },
]);
const inwardTat = context.parseConfiguredMetrics_(inwardTatBody, [
  { label: "Last Quarter", searchLabels: ["Last Quarter"], valuePosition: "AFTER", tone: "positive", noteRule: "DATE_RANGE", noteValue: "Last Quarter" },
  { label: "Last Month", searchLabels: ["Last Month"], valuePosition: "AFTER", tone: "", noteRule: "DATE_RANGE", noteValue: "Last Month" },
  { label: "Month to Date", searchLabels: ["Month to Date", "MTD"], valuePosition: "AFTER", tone: "positive", noteRule: "DATE_RANGE", noteValue: "Month to Date" },
  { label: "Yesterday", searchLabels: ["Yesterday"], valuePosition: "AFTER", tone: "warning", noteRule: "DATE_RANGE", noteValue: "Yesterday" },
]);
const inwardTatFromHtml = context.parseBestConfiguredMetrics_(
  "HTML-only Inward TAT email",
  inwardTatHtml,
  [
    { label: "Last Quarter", searchLabels: ["Last Quarter"], valuePosition: "AFTER", tone: "positive", noteRule: "DATE_RANGE", noteValue: "Last Quarter" },
    { label: "Last Month", searchLabels: ["Last Month"], valuePosition: "AFTER", tone: "", noteRule: "DATE_RANGE", noteValue: "Last Month" },
    { label: "Month to Date", searchLabels: ["Month to Date", "MTD"], valuePosition: "AFTER", tone: "positive", noteRule: "DATE_RANGE", noteValue: "Month to Date" },
    { label: "Yesterday", searchLabels: ["Yesterday"], valuePosition: "AFTER", tone: "warning", noteRule: "DATE_RANGE", noteValue: "Yesterday" },
  ],
);

assert.deepEqual(
  Array.from(inventory, (metric) => metric.value),
  ["99.02%", "98.6%", "99.56%", "0%"],
);
assert.deepEqual(
  Array.from(fefo, (metric) => metric.value),
  ["12", "21", "79%", "21%"],
);
assert.deepEqual(
  Array.from(inwardTat, (metric) => metric.value),
  ["29:50", "28:24", "27:09", "—"],
);
assert.deepEqual(
  Array.from(inwardTat, (metric) => metric.note),
  [
    "01 Apr – 30 Jun 2026",
    "01 Jun – 30 Jun 2026",
    "01 Jul – 27 Jul 2026",
    "27 Jul 2026",
  ],
);
assert.deepEqual(
  Array.from(inwardTatFromHtml, (metric) => metric.value),
  ["29:50", "28:24", "27:09", "—"],
);
const gatepass = context.parseOwnerAgeingTable_(gatepassBody);
assert.equal(gatepass.rows.length, 4);
assert.equal(gatepass.rows[2].owner, "Suraj Gupta");
assert.equal(gatepass.rows[0].above30Qty, 13438);
assert.equal(gatepass.totals.totalQty, 865132);
assert.equal(gatepass.totals.totalCount, 747);
const putaway = context.parsePutawayTotalsTable_(putawayBody);
assert.deepEqual(
  Array.from(putaway.rows, (row) => row.owner),
  ["Rupesh Total", "Sahil Total", "Shraddha Total", "Suraj Gupta Total"],
);
assert.equal(putaway.rows[0].above7Qty, 216);
assert.equal(putaway.rows[3].totalQty, 28084);
assert.equal(putaway.totals.totalCount, 220);
assert.equal(putaway.totals.totalQty, 37298);

const sheets = {
  Settings: [
    ["Key", "Value", "Description"],
    ["TIME_ZONE", "Asia/Kolkata", ""],
    ["CACHE_MINUTES", 30, ""],
    ["SCHEDULED_EMAIL_HOUR", 11, ""],
    ["EMAIL_RECIPIENTS", "bhavesh.patel@mosaicwellness.in", ""],
    ["ALLOWED_USERS", "bhavesh.patel@mosaicwellness.in|shailendra@mosaicwellness.in", ""],
    ["DASHBOARD_URL", "https://example.com/dashboard", ""],
    ["SCHEDULE_ENABLED", true, ""],
  ],
  Reports: [
    ["Active", "Sort Order", "Report ID", "Report Name", "Category", "Sender Email", "Gmail Search Query", "Subject Contains", "Dashboard URL Fallback", "Display Type"],
    [true, 1, "inventory-cycle-count", "Inventory Cycle Count", "Inventory control", "bhavesh.patel@mosaicwellness.in", "inventory query", "Daily Cycle count inventory", "https://example.com/inventory", "METRIC_CARDS"],
    [true, 2, "inward-tat", "Inward TAT", "Inbound operations", "bhavesh.patel@mosaicwellness.in", "inward query", "Inward TAT |", "https://example.com/inward", "METRIC_CARDS"],
    [true, 3, "fefo-violations", "FEFO Violations", "Dispatch compliance", "farhana.teli@mosaicwellness.in", "fefo query", "Daily FEFO Violation Check", "https://example.com/fefo", "METRIC_CARDS"],
    [true, 4, "open-gatepass-ageing", "Open Gatepass Ageing", "Gatepass ageing", "farhana.teli@mosaicwellness.in", "gatepass query", "Open Gatepass Ageing Report", "", "OWNER_AGEING_TABLE"],
    [true, 5, "open-putaway", "Open Putaway", "Putaway ageing", "farhana.teli@mosaicwellness.in", "putaway query", "Open Putaway Report", "", "PUTAWAY_TOTALS_TABLE"],
  ],
  "KPI Fields": [
    ["Active", "Report ID", "Display Order", "KPI Label", "Search Labels", "Value Position", "Tone", "Note Rule", "Note Value"],
    [true, "inventory-cycle-count", 1, "Last Quarter", "Last Quarter", "AFTER", "positive", "DATE_RANGE", "Last Quarter"],
    [true, "inward-tat", 1, "Last Quarter", "Last Quarter", "AFTER", "positive", "DATE_RANGE", "Last Quarter"],
    [true, "fefo-violations", 1, "Violated Batch Count", "Violated Batch Count", "BEFORE_OR_AFTER", "warning", "FIXED", "Latest reported value"],
  ],
};

context.SpreadsheetApp = {
  openById() {
    return {
      getUrl: () => "https://docs.google.com/spreadsheets/d/test",
      getSheetByName(name) {
        const values = sheets[name];
        return values
          ? { getDataRange: () => ({ getValues: () => values }) }
          : null;
      },
    };
  },
};

const runtime = context.readRuntimeConfiguration_();
assert.equal(runtime.reports.length, 5);
assert.equal(runtime.reports[0].metrics[0].label, "Last Quarter");
assert.equal(runtime.reports[1].id, "inward-tat");
assert.equal(runtime.reports[3].displayType, "OWNER_AGEING_TABLE");
assert.equal(runtime.reports[4].displayType, "PUTAWAY_TOTALS_TABLE");
assert.match(context.buildConfigSignature_(runtime), /inward-tat/);
assert.deepEqual(Array.from(runtime.allowedEmails), [
  "bhavesh.patel@mosaicwellness.in",
  "shailendra@mosaicwellness.in",
]);
assert.equal(runtime.scheduledEmailHour, 11);

console.log("KPI parser tests passed");
