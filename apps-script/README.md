# Operations KPI Command Center

Google Apps Script web app for consolidating the latest KPI emails into one
restricted Mosaic Wellness dashboard.

The script is bound to the
[Operations KPI Configuration](https://docs.google.com/spreadsheets/d/1irCr4_VwE9kG3hSSER_LjkieP0UMgTx7HBbdsB3kB0U/edit)
Google Sheet. The same project opens from **Extensions → Apps Script** in that
spreadsheet. Report matching, KPI extraction labels, approved users, scheduled
recipients, and schedule settings are maintained in the sheet.

## Current reports

1. Inventory Cycle Count
2. Inward TAT
3. FEFO Violations
4. Open Gatepass Ageing — owner-wise ageing table
5. Open Putaway — selected owner totals and grand total

## Live links

- [Spreadsheet-bound Apps Script project](https://script.google.com/d/1GKqTDXBLWGzO7qFlWWyaU8dy0H-L6sRFMlziu14MUMHi4N8eb8bvqTNh/edit)
- [Restricted dashboard](https://script.google.com/macros/s/AKfycbxEtx7ixBmTku1k1L9xrm1LqO96B_7jJxwx3Vzamj6EHyaELqxybhFiEM8ARjvQCyVm/exec)

## First-time authorization

Open the project as `bhavesh.patel@mosaicwellness.in`, select
`setupDashboard`, and click **Run**. Approve the requested Gmail, Sheets,
trigger, email, and signed-in-user permissions. This installs:

- `refreshKpiCache_` every hour
- `sendScheduledKpiEmail_` daily around the configured hour

Use `sendTestKpiEmail` to send a test summary only to
`bhavesh.patel@mosaicwellness.in`.

The scheduled summary is sent around 11:00 AM Asia/Kolkata to the recipients
listed under `EMAIL_RECIPIENTS` in the Settings tab.
