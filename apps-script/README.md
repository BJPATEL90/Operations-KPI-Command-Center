# Operations KPI Command Center

Google Apps Script web app for consolidating the latest KPI emails into one
restricted Mosaic Wellness dashboard.

## Approved viewers

- bhavesh.patel@mosaicwellness.in
- shailendra.singh@mosaicwellness.in
- shailendra@mosaicwellness.in

## Current reports

- Inventory Cycle Count
- FEFO Violations

The web app reads Gmail in read-only mode, caches parsed KPI values, refreshes
stale data on page load, and exposes a manual refresh action. It sends the
consolidated KPI summary daily around 11:00 AM Asia/Kolkata to
`bhavesh.patel@mosaicwellness.in`. Run `setupDashboard` once as the owner to
install the hourly data refresh and daily email triggers.

## Google Apps Script

- Project editor:
  https://script.google.com/d/1laydCcQBKrpc3tH5rLOIdfz1Vkasbh5Jq2fH73NwM91gDcxcIyDe0MiV/edit
- Restricted web app:
  https://script.google.com/macros/s/AKfycby5ih5rzT02m8e254Ulu553JUZV5nm1lx3O1o4-clLAh79fsQIcE7-zGwUra7NgVl_eTA/exec

Before first use, open the project editor as
`bhavesh.patel@mosaicwellness.in`, select `setupDashboard`, and click **Run**.
Approve the requested read-only Gmail and trigger permissions. This is required
once for the deployment owner.
