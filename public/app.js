let snapshot;
const byId = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));

function renderSummary() {
  byId('total').textContent = snapshot.totals.scenarios;
  byId('passed').textContent = snapshot.totals.passed;
  byId('failed').textContent = snapshot.totals.failed;
  byId('rate').textContent = `${snapshot.totals.passRate}%`;
  byId('updated').textContent = snapshot.generatedAt ? `Updated ${new Date(snapshot.generatedAt).toLocaleString()}` : 'Not refreshed yet';
  const health = byId('health');
  health.className = `health ${snapshot.health}`;
  health.querySelector('strong').textContent = snapshot.health === 'green' ? 'All checks passed' : snapshot.health === 'red' ? 'Failures detected' : 'Waiting for data';
  health.querySelector('small').textContent = snapshot.generatedAt ? `${snapshot.totals.scenarios} synchronized scenarios` : 'First synchronized run pending';
  byId('frameworks').innerHTML = snapshot.frameworks.map(item => `<article class="framework"><header><div><h3>${escapeHtml(item.framework)}</h3><small>${escapeHtml(item.repository)}</small></div><div class="score">${item.passRate}%</div></header><div class="bar" aria-label="${item.passRate}% passed"><span style="width:${item.passRate}%"></span></div><div class="breakdown"><span><b>${item.total}</b> total</span><span><b>${item.passed}</b> passed</span><span><b>${item.failed}</b> failed</span></div></article>`).join('');
}

function renderScenarios() {
  const framework = byId('filter').value;
  const query = byId('search').value.trim().toLowerCase();
  const rows = snapshot.frameworks.flatMap(item => item.scenarios.map(scenario => ({ ...scenario, framework: item.framework })))
    .filter(item => (framework === 'all' || item.framework === framework) && (!query || `${item.feature} ${item.name}`.toLowerCase().includes(query)));
  byId('scenarios').innerHTML = rows.map(item => `<tr><td>${escapeHtml(item.framework)}</td><td><strong>${escapeHtml(item.name)}</strong><br><small>${escapeHtml(item.feature)}</small></td><td><span class="status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td><td>${item.steps}</td></tr>`).join('');
  byId('empty').hidden = rows.length > 0;
}

fetch('data/latest.json', { cache: 'no-store' }).then(response => {
  if (!response.ok) throw new Error('Dashboard data is unavailable');
  return response.json();
}).then(data => { snapshot = data; renderSummary(); renderScenarios(); }).catch(error => {
  byId('health').querySelector('strong').textContent = 'Data unavailable';
  byId('health').querySelector('small').textContent = error.message;
});
byId('filter').addEventListener('change', () => snapshot && renderScenarios());
byId('search').addEventListener('input', () => snapshot && renderScenarios());

