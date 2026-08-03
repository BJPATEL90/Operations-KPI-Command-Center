# Operations KPI Command Center

A restricted Google Apps Script dashboard that consolidates the latest
operational KPI emails into one manager-friendly view. It reads report emails
from Gmail, extracts configured KPIs, links back to the original email and
source dashboard, and sends a scheduled HTML summary.

## Live links

- [Open the KPI dashboard on GitHub Pages](https://bjpatel90.github.io/Operations-KPI-Command-Center/docs/)
- [Open the secure Apps Script view](https://script.google.com/macros/s/AKfycbxEtx7ixBmTku1k1L9xrm1LqO96B_7jJxwx3Vzamj6EHyaELqxybhFiEM8ARjvQCyVm/exec)
- [Open the configuration sheet](https://docs.google.com/spreadsheets/d/1irCr4_VwE9kG3hSSER_LjkieP0UMgTx7HBbdsB3kB0U/edit)
- [Open the spreadsheet-bound Apps Script project](https://script.google.com/d/1GKqTDXBLWGzO7qFlWWyaU8dy0H-L6sRFMlziu14MUMHi4N8eb8bvqTNh/edit)

The dashboard is available only to approved Mosaic Wellness Google accounts.

The GitHub Pages application uses Google Identity Services with OAuth Client ID
`1021762366002-vo41asis58ss3qtt5j8tnkloujf1t73f.apps.googleusercontent.com`.
The access token remains in browser memory and is sent only to Google's Apps
Script API. No OAuth client secret is stored in this repository.

## Current reports

| Order | Report | KPIs or table shown | Sender | External dashboard |
|---:|---|---|---|---|
| 1 | Inventory Cycle Count | Last Quarter, Last Month, Month to Date, Yesterday | `bhavesh.patel@mosaicwellness.in` | [Inventory Visibility](https://bjpatel90.github.io/Inventory_Visibility/) |
| 2 | Inward TAT | Last Quarter, Last Month, Month to Date, Yesterday | `bhavesh.patel@mosaicwellness.in` | [Inward TAT](https://bjpatel90.github.io/Inward-TAT/) |
| 3 | Inventory Adjustment Report | Daily Total Events, Added Qty, Removed Qty, Net Variance, Balanced SKUs, Variance SKUs, Facilities, Users Impacted; plus MTD Events, Added, Removed, and Variance | `bhavesh.patel@mosaicwellness.in` | [Inventory Adjustment dashboard](https://bjpatel90.github.io/inventory-adjustment-dashboard/) |
| 4 | FEFO Violations | Violated Batch Count, Dispatch First Batch Count, Overall Compliance, Overall Non-Compliance | `farhana.teli@mosaicwellness.in` | [FEFO dashboard](https://datastudio.google.com/u/0/reporting/320397c5-8ecd-4e85-b281-36d3694a82e8/page/JaFbF) |
| 5 | Open Gatepass Ageing | Owner-wise quantities and counts for 0–15, 16–30, Above 30 Days, and Grand Total | `farhana.teli@mosaicwellness.in` | Source email and attached CSV |
| 6 | Open Putaway | Rupesh Total, Sahil Total, Shraddha Total, Suraj Gupta Total, and Grand Total across 0–3, 4–7, and Above 7 Days | `farhana.teli@mosaicwellness.in` | Source email and attached CSV |

Every report includes a clickable source-email link. The source-dashboard button
is shown when a dashboard URL is available.

## Dashboard behaviour

- The dashboard opens with no report filter selected, so all reports are
  visible.
- Selecting a report button displays only that report.
- Selecting the active button again clears the filter and restores all reports.
- The latest non-reply email matching the configured sender and subject is used.
- Plain-text email parsing is preferred. Structured HTML parsing is used when
  the plain-text body is incomplete.
- Cached data expires after 30 minutes.
- Report additions and configuration changes automatically invalidate stale
  cached payloads.

## Scheduled email

The current Google Sheet configuration is:

- Schedule enabled: `TRUE`
- Scheduled time: approximately `11:30 AM`
- Time zone: `Asia/Kolkata`
- Current recipients: `bhavesh.patel@mosaicwellness.in`,
  `shailendra.singh@mosaicwellness.in`, `shailendra@mosaicwellness.in`, and
  `manish.khaladkar@mosaicwellness.in`
- Dashboard data refresh trigger: hourly

Each report section includes:

- KPI values or the requested ageing table
- source dashboard link when available
- source Gmail link
- the latest source-email date and time

### Trigger installation

Publishing a deployment does not install Apps Script time triggers. The
deployment owner must run `setupDashboard` once from the Apps Script editor.
That function safely removes the dashboard's old trigger instances and creates:

1. `refreshKpiCache_` — every hour
2. `sendScheduledKpiEmail_` — daily around the configured hour

The owner can run `sendTestKpiEmail` to send a test summary only to
`bhavesh.patel@mosaicwellness.in`.

## Access control

The current approved dashboard viewers are:

- `bhavesh.patel@mosaicwellness.in`
- `shailendra.singh@mosaicwellness.in`
- `shailendra@mosaicwellness.in`
- `manish.khaladkar@mosaicwellness.in`

Viewer access and scheduled-email recipients are separate settings. Both are
managed in the configuration sheet.

## Configuration sheet

The Google Sheet is the source of truth and contains four tabs:

### `Read Me`

Usage instructions and configuration status.

### `Settings`

Controls the time zone, cache duration, scheduled hour, recipients, approved
viewers, dashboard URL, and schedule-enabled flag.

### `Reports`

One row per report, including:

- active status and sort order
- report ID, title, and category
- sender and Gmail search query
- required subject text
- fallback dashboard URL
- display type

Supported display types:

- `METRIC_CARDS`
- `OWNER_AGEING_TABLE`
- `PUTAWAY_TOTALS_TABLE`

### `KPI Fields`

Defines metric labels and extraction rules for card-based reports. Search-label
alternatives are separated with `|`.

## Google permissions

The Apps Script manifest requests:

- read-only Gmail access
- Google Sheets access for the configuration workbook
- Apps Script trigger management
- email sending
- signed-in user email

The web app is restricted to the Google Workspace domain and runs as the
deployment owner.

### GitHub OAuth/API connection

The Google Cloud project containing the OAuth Client ID must also be connected
to the spreadsheet-bound Apps Script project:

1. In Apps Script, open **Project Settings**.
2. Under **Google Cloud Platform (GCP) Project**, select **Change project**.
3. Enter project number `1021762366002`.
4. In that Google Cloud project, enable the **Google Apps Script API**.
5. In the OAuth web client, keep
   `https://bjpatel90.github.io` as an authorized JavaScript origin.

The API executable is restricted to the Mosaic Wellness domain, and the script
performs an additional approved-user check before returning KPI data.

## Project structure

```text
apps-script/
  Code.gs              Gmail parsing, access control, caching and email logic
  Index.html           Dashboard interface
  appsscript.json      Apps Script manifest and OAuth scopes
  parser.test.cjs      Parser and configuration tests

config-build/
  build-config.mjs     Builds the Google Sheets-ready configuration workbook

outputs/kpi-config/
  operations-kpi-configuration.xlsx
```

The other application folders provide an optional web-application surface. The
live Gmail-connected dashboard is hosted by Google Apps Script.

## Validation

Run the parser and configuration tests from the repository root:

```bash
node apps-script/parser.test.cjs
```

Expected result:

```text
KPI parser tests passed
```

## Deployment

The Apps Script source is bound to the configuration spreadsheet and is
managed with `clasp`. It is also available from **Extensions → Apps Script**
inside the configuration sheet.

```bash
cd apps-script
clasp push --force
clasp deploy --deploymentId AKfycbxEtx7ixBmTku1k1L9xrm1LqO96B_7jJxwx3Vzamj6EHyaELqxybhFiEM8ARjvQCyVm
```

After changing reports or KPI rules, update the configuration sheet and use the
dashboard normally. The configuration-aware cache will refresh when it detects
the change.

## Troubleshooting

### A new report is missing

Reload the dashboard. If the browser still shows an older version, use
`Ctrl + F5`.

### KPI values show `—`

Confirm that the latest source email matches the configured sender and subject,
then check its visible text against the search labels in `KPI Fields`.

### Spreadsheet permission error

Authorize the requested Google Sheets permission. The script uses
`SpreadsheetApp.openById` to read the configuration workbook.

### Scheduled email is not arriving

Check all of the following:

1. `SCHEDULE_ENABLED` is `TRUE`.
2. `EMAIL_RECIPIENTS` contains the intended addresses.
3. `setupDashboard` has been run successfully by the deployment owner.
4. The two time-based triggers appear in the Apps Script **Triggers** page.
5. The Apps Script email quota has not been exhausted.

## Repository

[BJPATEL90/Operations-KPI-Command-Center](https://github.com/BJPATEL90/Operations-KPI-Command-Center)
