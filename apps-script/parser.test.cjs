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

const inventoryAdjustmentHtml = `
<section>
  <h3>DAILY SUMMARY</h3>
  <div><strong>68</strong><span>TOTAL EVENTS</span></div>
  <div><strong>2,205</strong><span>ADDED QTY</span></div>
  <div><strong>2,205</strong><span>REMOVED QTY</span></div>
  <div><strong>+0</strong><span>NET VARIANCE</span></div>
  <div><strong>68</strong><span>BALANCED SKUS</span></div>
  <div><strong>0</strong><span>VARIANCE SKUS</span></div>
  <div><strong>2</strong><span>FACILITIES</span></div>
  <div><strong>2</strong><span>USERS IMPACTED</span></div>
  <h3>MONTH-TO-DATE SUMMARY</h3>
  <div><strong>114</strong><span>MTD EVENTS</span></div>
  <div><strong>5,697</strong><span>MTD ADDED</span></div>
  <div><strong>5,697</strong><span>MTD REMOVED</span></div>
  <div><strong>+0</strong><span>MTD VARIANCE</span></div>
</section>
`;

const inventoryAdjustmentConfig = [
  ["Total Events", "Total Events", "", "Daily summary"],
  ["Added Qty", "Added Qty", "positive", "Daily summary"],
  ["Removed Qty", "Removed Qty", "warning", "Daily summary"],
  ["Net Variance", "Net Variance", "positive", "Daily summary"],
  ["Balanced SKUs", "Balanced SKUs", "positive", "Daily summary"],
  ["Variance SKUs", "Variance SKUs", "warning", "Daily summary"],
  ["Facilities", "Facilities", "", "Daily summary"],
  ["Users Impacted", "Users Impacted", "", "Daily summary"],
  ["MTD Events", "MTD Events", "", "Month-to-date summary"],
  ["MTD Added", "MTD Added", "positive", "Month-to-date summary"],
  ["MTD Removed", "MTD Removed", "warning", "Month-to-date summary"],
  ["MTD Variance", "MTD Variance", "positive", "Month-to-date summary"],
].map(([label, searchLabel, tone, noteValue]) => ({
  label,
  searchLabels: [searchLabel],
  valuePosition: "BEFORE_OR_AFTER",
  tone,
  noteRule: "FIXED",
  noteValue,
}));

const currentInventoryPlain = `
Overall Quantity Coverage
Cycle: 01 Jul 2026 - 30 Sep 2026
As of: 07 Aug 2026
Overall coverage: 70.01%
Opening GOOD Qty: 41,06,079
Cumulative Counted: 28,74,644
Counted Today: 0
Inventory Change: +0.21% (8,760 units)
No material inventory movement detected.
Inventory Accuracy Summary
Last Quarter: 99.02%
Qty: 41,83,737
Last Month: 99.64%
Qty: 25,78,577
Month to Date: 84.72%
Qty: 69,904
Yesterday: 0%
Qty: 0
No cycle count was performed.
`;

const currentInventoryHtml = `
<div>Last Quarter</div><div>99.02%</div><div>Qty: 41,83,737</div><div>01 Apr 2026 - 30 Jun 2026</div>
<div>Last Month</div><div>99.64%</div><div>Qty: 25,78,577</div><div>01 Jul 2026 - 31 Jul 2026</div>
<div>Month to Date</div><div>84.72%</div><div>Qty: 69,904</div><div>01 Aug 2026 - 03 Aug 2026</div>
<div>Yesterday</div><div>0%</div><div>Qty: 0</div><div>02 Aug 2026 - 02 Aug 2026</div>
<div>No cycle count was performed.</div>
`;

const inventoryConfig = [
  { label: "Last Quarter", searchLabels: ["Last Quarter"], valuePosition: "AFTER", tone: "positive", noteRule: "DATE_RANGE", noteValue: "Last Quarter" },
  { label: "Last Month", searchLabels: ["Last Month"], valuePosition: "AFTER", tone: "positive", noteRule: "DATE_RANGE", noteValue: "Last Month" },
  { label: "Month to Date", searchLabels: ["Month to Date", "MTD"], valuePosition: "AFTER", tone: "positive", noteRule: "DATE_RANGE", noteValue: "Month to Date" },
  { label: "Yesterday", searchLabels: ["Yesterday"], valuePosition: "AFTER", tone: "warning", noteRule: "NO_CYCLE_COUNT", noteValue: "Yesterday" },
];

const inventory = context.parseConfiguredMetrics_(inventoryBody, inventoryConfig);
const currentInventory = context.parseBestConfiguredMetrics_(
  currentInventoryPlain,
  currentInventoryHtml,
  inventoryConfig,
);
const quantityCoverage = context.parseQuantityCoverage_(
  currentInventoryPlain,
  '<div>Daily threshold: +/-5%.</div>',
);
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
const inventoryAdjustment = context.parseBestConfiguredMetrics_(
  "",
  inventoryAdjustmentHtml,
  inventoryAdjustmentConfig,
);

assert.deepEqual(
  Array.from(inventory, (metric) => metric.value),
  ["99.02%", "98.6%", "99.56%", "0%"],
);
assert.deepEqual(
  Array.from(currentInventory, (metric) => metric.note),
  [
    "01 Apr 2026 – 30 Jun 2026",
    "01 Jul 2026 – 31 Jul 2026",
    "01 Aug 2026 – 03 Aug 2026",
    "No cycle count performed",
  ],
);
assert.equal(quantityCoverage.overall, "70.01%");
assert.equal(quantityCoverage.openingGoodQty, "41,06,079");
assert.equal(quantityCoverage.cumulativeCounted, "28,74,644");
assert.equal(quantityCoverage.countedToday, "0");
assert.equal(quantityCoverage.inventoryChange, "+0.21%");
assert.equal(quantityCoverage.progressPercent, 70.01);
assert.equal(
  quantityCoverage.note,
  "No material inventory movement detected. Daily threshold: +/-5%.",
);
assert.equal(
  context.isAutomatedOrForwardedReplySubject_(
    "Out-of-Office Re: Daily Cycle count inventory Healh report - 29 Jul 2026",
  ),
  true,
);
assert.equal(
  context.isAutomatedOrForwardedReplySubject_(
    "Daily Cycle count inventory Healh report - 29 Jul 2026",
  ),
  false,
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
assert.deepEqual(
  Array.from(inventoryAdjustment, (metric) => metric.value),
  ["68", "2,205", "2,205", "+0", "68", "0", "2", "2", "114", "5,697", "5,697", "+0"],
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
    ["SCHEDULED_EMAIL_TIME", "11:30", ""],
    ["EMAIL_RECIPIENTS", "bhavesh.patel@mosaicwellness.in", ""],
    ["ALLOWED_USERS", "bhavesh.patel@mosaicwellness.in|shailendra@mosaicwellness.in", ""],
    ["DASHBOARD_URL", "https://example.com/dashboard", ""],
    ["SCHEDULE_ENABLED", true, ""],
  ],
  Reports: [
    ["Active", "Sort Order", "Report ID", "Report Name", "Category", "Sender Email", "Gmail Search Query", "Subject Contains", "Dashboard URL Fallback", "Display Type"],
    [true, 1, "inventory-cycle-count", "Inventory Cycle Count", "Inventory control", "bhavesh.patel@mosaicwellness.in", "inventory query", "Daily Cycle count inventory", "https://example.com/inventory", "METRIC_CARDS"],
    [true, 2, "inward-tat", "Inward TAT", "Inbound operations", "bhavesh.patel@mosaicwellness.in", "inward query", "Inward TAT |", "https://example.com/inward", "METRIC_CARDS"],
    [true, 3, "inventory-adjustment", "Inventory Adjustment Report", "Inventory adjustments", "bhavesh.patel@mosaicwellness.in", "adjustment query", "Inventory Adjustment Report |", "https://example.com/adjustment", "METRIC_CARDS"],
    [true, 4, "fefo-violations", "FEFO Violations", "Dispatch compliance", "farhana.teli@mosaicwellness.in", "fefo query", "Daily FEFO Violation Check", "https://example.com/fefo", "METRIC_CARDS"],
    [true, 5, "open-gatepass-ageing", "Open Gatepass Ageing", "Gatepass ageing", "farhana.teli@mosaicwellness.in", "gatepass query", "Open Gatepass Ageing Report", "", "OWNER_AGEING_TABLE"],
    [true, 6, "open-putaway", "Open Putaway", "Putaway ageing", "farhana.teli@mosaicwellness.in", "putaway query", "Open Putaway Report", "", "PUTAWAY_TOTALS_TABLE"],
  ],
  "KPI Fields": [
    ["Active", "Report ID", "Display Order", "KPI Label", "Search Labels", "Value Position", "Tone", "Note Rule", "Note Value"],
    [true, "inventory-cycle-count", 1, "Last Quarter", "Last Quarter", "AFTER", "positive", "DATE_RANGE", "Last Quarter"],
    [true, "inward-tat", 1, "Last Quarter", "Last Quarter", "AFTER", "positive", "DATE_RANGE", "Last Quarter"],
    [true, "inventory-adjustment", 1, "Total Events", "Total Events", "BEFORE_OR_AFTER", "", "FIXED", "Daily summary"],
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
assert.equal(runtime.reports.length, 6);
assert.equal(runtime.reports[0].metrics[0].label, "Last Quarter");
assert.equal(runtime.reports[1].id, "inward-tat");
assert.equal(runtime.reports[2].id, "inventory-adjustment");
assert.equal(runtime.reports[4].displayType, "OWNER_AGEING_TABLE");
assert.equal(runtime.reports[5].displayType, "PUTAWAY_TOTALS_TABLE");
assert.match(context.buildConfigSignature_(runtime), /inward-tat/);
assert.deepEqual(Array.from(runtime.allowedEmails), [
  "bhavesh.patel@mosaicwellness.in",
  "shailendra@mosaicwellness.in",
]);
assert.equal(runtime.scheduledEmailHour, 11);
assert.equal(runtime.scheduledEmailMinute, 30);

console.log("KPI parser tests passed");
