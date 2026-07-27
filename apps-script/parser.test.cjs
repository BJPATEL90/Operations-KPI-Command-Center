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

const inventory = context.parseInventoryMetrics_(inventoryBody);
const fefo = context.parseFefoMetrics_(fefoBody);

assert.deepEqual(
  Array.from(inventory, (metric) => metric.value),
  ["99.02%", "98.6%", "99.56%", "0%"],
);
assert.deepEqual(
  Array.from(fefo, (metric) => metric.value),
  ["12", "21", "79%", "21%"],
);

console.log("KPI parser tests passed");
