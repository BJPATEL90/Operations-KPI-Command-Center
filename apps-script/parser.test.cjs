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

assert.deepEqual(
  Array.from(inventory, (metric) => metric.value),
  ["99.02%", "98.6%", "99.56%", "0%"],
);
assert.deepEqual(
  Array.from(fefo, (metric) => metric.value),
  ["12", "21", "79%", "21%"],
);

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
    ["Active", "Sort Order", "Report ID", "Report Name", "Category", "Sender Email", "Gmail Search Query", "Subject Contains", "Dashboard URL Fallback"],
    [true, 1, "inventory-cycle-count", "Inventory Cycle Count", "Inventory control", "bhavesh.patel@mosaicwellness.in", "inventory query", "Daily Cycle count inventory", "https://example.com/inventory"],
    [true, 2, "fefo-violations", "FEFO Violations", "Dispatch compliance", "farhana.teli@mosaicwellness.in", "fefo query", "Daily FEFO Violation Check", "https://example.com/fefo"],
  ],
  "KPI Fields": [
    ["Active", "Report ID", "Display Order", "KPI Label", "Search Labels", "Value Position", "Tone", "Note Rule", "Note Value"],
    [true, "inventory-cycle-count", 1, "Last Quarter", "Last Quarter", "AFTER", "positive", "DATE_RANGE", "Last Quarter"],
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
assert.equal(runtime.reports.length, 2);
assert.equal(runtime.reports[0].metrics[0].label, "Last Quarter");
assert.deepEqual(Array.from(runtime.allowedEmails), [
  "bhavesh.patel@mosaicwellness.in",
  "shailendra@mosaicwellness.in",
]);
assert.equal(runtime.scheduledEmailHour, 11);

console.log("KPI parser tests passed");
