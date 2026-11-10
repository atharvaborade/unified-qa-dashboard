import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('combines Playwright and Cypress reports into Power BI data', () => {
  const root = mkdtempSync(join(tmpdir(), 'qa-dashboard-'));
  const playwright = join(root, 'playwright.json');
  const cypress = join(root, 'cypress.json');
  const output = join(root, 'output');
  mkdirSync(output);
  writeFileSync(playwright, JSON.stringify({ exitCode: 0, parallelWorkers: 3, scenarios: [{ name: 'books a slot', status: 'passed', stepCount: 4 }] }));
  writeFileSync(cypress, JSON.stringify([{ name: 'Booking', elements: [{ type: 'scenario', name: 'cancels a slot', steps: [{ result: { status: 'failed' } }] }] }]));
  const result = spawnSync(process.execPath, ['scripts/aggregate.js'], { cwd: process.cwd(), env: { ...process.env, PLAYWRIGHT_REPORT: playwright, CYPRESS_REPORT: cypress, DASHBOARD_OUTPUT: output }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(readFileSync(join(output, 'latest.json')));
  assert.deepEqual(data.totals, { scenarios: 2, passed: 1, failed: 1, skipped: 0, passRate: 50 });
  assert.equal(data.health, 'red');
  assert.match(readFileSync(join(output, 'latest.csv'), 'utf8'), /Cypress,slotwise-cypress-bdd,Booking,cancels a slot,failed,1/);
});

