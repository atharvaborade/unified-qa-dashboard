import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const playwrightPath = resolve(process.env.PLAYWRIGHT_REPORT || 'sources/playwright/reports/run-summary.json');
const cypressPath = resolve(process.env.CYPRESS_REPORT || 'sources/cypress/cypress/reports/cucumber-json/cucumber-report.json');
const outputDir = resolve(process.env.DASHBOARD_OUTPUT || 'public/data');
const historyInput = resolve(process.env.DASHBOARD_HISTORY || `${outputDir}/history.csv`);
const now = new Date().toISOString();

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function statusFromSteps(element) {
  const priority = ['failed', 'ambiguous', 'undefined', 'pending', 'skipped', 'passed'];
  const statuses = [...(element.before || []), ...(element.steps || []), ...(element.after || [])]
    .map(item => item.result?.status).filter(Boolean);
  return priority.find(status => statuses.includes(status)) || 'unknown';
}

function normalizePlaywright(path) {
  if (!existsSync(path)) return { framework: 'Playwright', repository: 'playwright-quality-lab', state: 'missing', scenarios: [] };
  const source = JSON.parse(readFileSync(path, 'utf8'));
  return {
    framework: 'Playwright', repository: 'playwright-quality-lab', state: source.exitCode === 0 ? 'completed' : 'failed',
    startedAt: source.startedAt, finishedAt: source.finishedAt, workers: source.parallelWorkers,
    scenarios: (source.scenarios || []).map(scenario => ({
      name: scenario.name, feature: 'Playwright BDD suite', status: scenario.status || 'unknown', steps: scenario.stepCount || 0,
    })),
  };
}

function normalizeCypress(path) {
  if (!existsSync(path)) return { framework: 'Cypress', repository: 'slotwise-cypress-bdd', state: 'missing', scenarios: [] };
  const features = JSON.parse(readFileSync(path, 'utf8'));
  const scenarios = features.flatMap(feature => (feature.elements || [])
    .filter(element => element.type === 'scenario')
    .map(element => ({
      name: element.name, feature: feature.name, status: statusFromSteps(element), steps: element.steps?.length || 0,
    })));
  return { framework: 'Cypress', repository: 'slotwise-cypress-bdd', state: scenarios.some(item => item.status === 'failed') ? 'failed' : 'completed', scenarios };
}

function summarize(run) {
  const counts = run.scenarios.reduce((all, scenario) => {
    all[scenario.status] = (all[scenario.status] || 0) + 1;
    return all;
  }, {});
  const total = run.scenarios.length;
  const passed = counts.passed || 0;
  return { ...run, total, passed, failed: counts.failed || 0, skipped: (counts.skipped || 0) + (counts.pending || 0), passRate: total ? Number((passed * 100 / total).toFixed(1)) : 0 };
}

const frameworks = [summarize(normalizePlaywright(playwrightPath)), summarize(normalizeCypress(cypressPath))];
const totals = frameworks.reduce((all, item) => ({
  scenarios: all.scenarios + item.total, passed: all.passed + item.passed,
  failed: all.failed + item.failed, skipped: all.skipped + item.skipped,
}), { scenarios: 0, passed: 0, failed: 0, skipped: 0 });
const snapshot = {
  generatedAt: now,
  health: frameworks.every(item => item.state === 'completed' && item.failed === 0) ? 'green' : frameworks.some(item => item.failed > 0 || item.state === 'failed') ? 'red' : 'waiting',
  totals: { ...totals, passRate: totals.scenarios ? Number((totals.passed * 100 / totals.scenarios).toFixed(1)) : 0 },
  frameworks,
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(`${outputDir}/latest.json`, `${JSON.stringify(snapshot, null, 2)}\n`);

const rows = [['generated_at','framework','repository','feature','scenario','status','steps']];
for (const framework of frameworks) for (const scenario of framework.scenarios) {
  rows.push([now, framework.framework, framework.repository, scenario.feature, scenario.name, scenario.status, scenario.steps]);
}
writeFileSync(`${outputDir}/latest.csv`, `${rows.map(row => row.map(csvEscape).join(',')).join('\n')}\n`);

const header = 'generated_at,framework,total,passed,failed,skipped,pass_rate';
const previous = existsSync(historyInput) ? readFileSync(historyInput, 'utf8').trim().split(/\r?\n/).filter(Boolean) : [];
const historyRows = previous[0] === header ? previous.slice(1) : [];
for (const framework of frameworks) historyRows.push([now, framework.framework, framework.total, framework.passed, framework.failed, framework.skipped, framework.passRate].map(csvEscape).join(','));
writeFileSync(`${outputDir}/history.csv`, `${header}\n${historyRows.slice(-120).join('\n')}\n`);
console.log(`Created dashboard data: ${totals.scenarios} scenarios, ${totals.passed} passed, ${totals.failed} failed.`);

