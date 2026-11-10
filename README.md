# Unified QA Dashboard

A public quality-intelligence dashboard that automatically executes and combines results from:

- [Slotwise Playwright Quality Lab](https://github.com/atharvaborade/playwright-quality-lab)
- [Slotwise Cypress BDD](https://github.com/atharvaborade/slotwise-cypress-bdd)

The scheduled GitHub workflow checks out both repositories, runs both suites, normalizes their Cucumber results, updates trend data and deploys the dashboard to GitHub Pages.

## Data flow

```text
Playwright Cucumber JSON ─┐
                         ├─ aggregate.js ─ JSON + CSV ─ GitHub Pages ─ Power BI Web connector
Cypress Cucumber JSON ────┘
```

The dashboard shows totals, pass rate, failures, framework comparisons and searchable scenario evidence. These stable data endpoints are generated together:

- `data/latest.json` — web dashboard source
- `data/latest.csv` — scenario-level Power BI source
- `data/history.csv` — framework trend source

## Automatic refresh

`.github/workflows/refresh-dashboard.yml` runs every day at **06:17 UTC**, can be started manually, and runs when dashboard code changes. It uses standard GitHub-hosted runners for this public repository; no personal runner is required.

The central workflow runs both suites itself, so it does not depend on expiring artifacts or manual report uploads. A failure is also data: the dashboard publishes the failed scenarios rather than hiding the run.

The project uses public-repository standard runners and GitHub Pages. It does not configure paid runners, cloud databases or paid APIs.

## Power BI connection

After GitHub Pages is deployed, connect Power BI Desktop with **Get data → Web** and use:

```text
https://atharvaborade.github.io/unified-qa-dashboard/data/latest.csv
https://atharvaborade.github.io/unified-qa-dashboard/data/history.csv
```

Publish the report to **My Workspace**. If your Power BI/Fabric account offers scheduled refresh for this Web source, configure it from the semantic model settings. Microsoft licensing and tenant policies decide whether that service-side refresh is available; the GitHub dashboard refresh remains automatic regardless.

## Local development

```bash
npm run check
npm start
```

To generate real combined data locally, clone the source projects under `sources/playwright` and `sources/cypress`, run their tests, then execute:

```bash
npm run aggregate
```

