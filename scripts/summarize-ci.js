import { appendFileSync, readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('public/data/latest.json', 'utf8'));
const lines = [
  '## Unified QA snapshot', '',
  '| Framework | Total | Passed | Failed | Pass rate |',
  '| --- | ---: | ---: | ---: | ---: |',
  ...data.frameworks.map(item => `| ${item.framework} | ${item.total} | ${item.passed} | ${item.failed} | ${item.passRate}% |`),
  '', `Overall status: **${data.health}**`, '',
];
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
for (const framework of data.frameworks) {
  for (const scenario of framework.scenarios.filter(item => item.status === 'failed').slice(0, 10)) {
    console.log(`::error title=${framework.framework} scenario failed::${scenario.name}`);
  }
}
console.log(lines.join('\n'));
