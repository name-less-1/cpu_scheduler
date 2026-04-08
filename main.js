// ── RENDER STATS CARD ──
function renderStats(elId, s, minEnergy) {
  const el = document.getElementById(elId);
  const isBest = s.energy === minEnergy;
  el.innerHTML = `
    <div class="stat-row">
      <span class="stat-label">Total Energy</span>
      <span class="stat-val ${isBest ? 'good' : ''}">${s.energy}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Avg Turnaround</span>
      <span class="stat-val">${s.avgTA}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Avg Wait Time</span>
      <span class="stat-val">${s.avgWait}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Deadline Misses</span>
      <span class="stat-val ${s.misses === 0 ? 'good' : s.misses > 3 ? 'warn' : ''}">${s.misses}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Throughput</span>
      <span class="stat-val">${s.throughput}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Tasks Done</span>
      <span class="stat-val">${s.completed}</span>
    </div>
  `;
}

// ── RENDER TASK TABLE ──
function renderTable(tasks, rrResult, edfResult, eaResult) {
  const tbody = document.getElementById('taskTableBody');
  tbody.innerHTML = '';

  tasks.forEach(t => {
    const rrT  = rrResult.tasks.find(x => x.id === t.id);
    const edfT = edfResult.tasks.find(x => x.id === t.id);
    const eaT  = eaResult.tasks.find(x => x.id === t.id);

    const fmt = (v, dl) => {
      if (v == null) return '<span style="color:#4a6b8a">—</span>';
      const missed = v > dl;
      return `<span style="color:${missed ? '#ff6b6b' : '#c8dff0'}">${v.toFixed(1)}${missed ? ' ⚠' : ''}</span>`;
    };

    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="color:var(--accent)">T${t.id}</td>
      <td>${t.arrival}</td>
      <td>${t.burst}</td>
      <td style="color:var(--accent3)">${t.deadline}</td>
      <td><span class="pri-badge pri-${t.priority}">${PRI_LABELS[t.priority]}</span></td>
      <td>${fmt(rrT?.finishTime,  t.deadline)}</td>
      <td>${fmt(edfT?.finishTime, t.deadline)}</td>
      <td>${fmt(eaT?.finishTime,  t.deadline)}</td>
      <td style="color:var(--rr)">${rrT?.energyUsed.toFixed(2) ?? '—'}</td>
      <td style="color:var(--ea)">${eaT?.energyUsed.toFixed(2) ?? '—'}</td>
    `;
    tbody.appendChild(row);
  });
}

// ── MAIN RUN ──
function runAll() {
  const n       = +document.getElementById('taskCount').value;
  const quantum = +document.getElementById('quantum').value;
  const seed    = +document.getElementById('seed').value || 42;

  const tasks  = generateTasks(n, seed);
  const rrRes  = roundRobin(tasks, quantum);
  const edfRes = edf(tasks);
  const eaRes  = energyAwareEDF(tasks);

  const maxTime = Math.max(
    ...rrRes.timeline.map(e => e.end),
    ...edfRes.timeline.map(e => e.end),
    ...eaRes.timeline.map(e => e.end),
  );

  const rrS  = computeStats(rrRes,  maxTime);
  const edfS = computeStats(edfRes, maxTime);
  const eaS  = computeStats(eaRes,  maxTime);

  const minEnergy = Math.min(rrS.energy, edfS.energy, eaS.energy);

  renderStats('rrStats',  rrS,  minEnergy);
  renderStats('edfStats', edfS, minEnergy);
  renderStats('eaStats',  eaS,  minEnergy);

  const rrSave  = ((1 - eaS.energy / rrS.energy)  * 100).toFixed(1);
  const edfSave = ((1 - eaS.energy / edfS.energy) * 100).toFixed(1);
  document.getElementById('energySave').textContent =
    `↓ ${rrSave}% vs RR  ·  ↓ ${edfSave}% vs EDF`;

  renderGantt('ganttRR',  'axisRR',  rrRes.timeline,  maxTime);
  renderGantt('ganttEDF', 'axisEDF', edfRes.timeline, maxTime);
  renderGantt('ganttEA',  'axisEA',  eaRes.timeline,  maxTime);

  renderCharts(rrS, edfS, eaS, eaRes.timeline);
  renderTable(tasks, rrRes, edfRes, eaRes);
}

// Run on page load
runAll();
