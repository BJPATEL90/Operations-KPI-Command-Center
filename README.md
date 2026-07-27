# Operations KPI Command Center

A Google Apps Script dashboard that consolidates the latest operational KPI
reports from Gmail into one manager-friendly view.

## Current reports

- Inventory Cycle Count
- Inward TAT
- FEFO Violations
- Open Gatepass Ageing
- Open Putaway

Each report uses configurable Gmail search rules, links back to its source
email, and includes an external dashboard link when one is available.

## Key features

- Google OAuth and approved-user access
- Configuration managed through Google Sheets
- Latest matching Gmail report selected automatically
- KPI cards and ageing tables
- Real report-tab navigation
- Scheduled KPI summary email at approximately 11:00 AM IST

## Project structure

- `apps-script/` — deployed Google Apps Script dashboard and Gmail parsers
- `config-build/` — generator for the configuration workbook
- `app/`, `worker/`, and related folders — optional web application surface

## Validation

Run the KPI parser tests with:

```bash
node apps-script/parser.test.cjs
```

## Live dashboard

[Open Operations KPI Command Center](https://script.google.com/macros/s/AKfycby5ih5rzT02m8e254Ulu553JUZV5nm1lx3O1o4-clLAh79fsQIcE7-zGwUra7NgVl_eTA/exec)

Access is restricted to approved Mosaic Wellness Google accounts.
