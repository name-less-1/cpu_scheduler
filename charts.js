// ── CHART INSTANCES ──
let charts = {};

function destroyCharts() {
  Object.values(charts).forEach(c => c && c.destroy());
  charts = {};
}

const CHART_FONT = "'Share Tech Mono'";

const SCALE_DEFAULTS = {
  x: {
    ticks: { color: '#4a6b8a', font: { family: CHART_FONT, size: 10 } },
    grid:  { color: 'rgba(30,58,95,0.4)' },
    border:{ color: '#1e3a5f' },
  },
  y: {
    ticks: { color: '#4a6b8a', font: { family: CHART_FONT, size: 10 } },
    grid:  { color: 'rgba(30,58,95,0.4)' },
    border:{ color: '#1e3a5f' },
  },
};

const TOOLTIP_DEFAULTS = {
  backgroundColor: '#111c2d',
  borderColor:     '#00d4ff',
  borderWidth:     1,
  titleColor:      '#00d4ff',
  bodyColor:       '#c8dff0',
  titleFont: { family: CHART_FONT },
  bodyFont:  { family: CHART_FONT },
};

// ── BAR CHART ──
function makeBar(canvasId, labels, data, colors, yLabel) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0,
        borderRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...TOOLTIP_DEFAULTS,
          callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(2)}` },
        },
      },
      scales: {
        ...SCALE_DEFAULTS,
        y: {
          ...SCALE_DEFAULTS.y,
          title: {
            display: true,
            text:    yLabel,
            color:   '#4a6b8a',
            font:    { size: 10, family: CHART_FONT },
          },
        },
      },
      animation: { duration: 600 },
    },
  });
}

// ── DOUGHNUT CHART ──
function makePie(canvasId, labels, data, colors) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth:     2,
        borderColor:     '#0d1520',
        hoverOffset:     6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display:  true,
          position: 'right',
          labels: {
            color:    '#c8dff0',
            font:     { family: CHART_FONT, size: 10 },
            boxWidth: 12,
            padding:  10,
          },
        },
        tooltip: {
          ...TOOLTIP_DEFAULTS,
          callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toFixed(1)}%` },
        },
      },
      animation: { duration: 600 },
    },
  });
}

// ── GANTT RENDERING ──
function renderGantt(trackId, axisId, timeline, maxTime) {
  const track   = document.getElementById(trackId);
  const axis    = document.getElementById(axisId);
  const tooltip = document.getElementById('tooltip');
  track.innerHTML = '';
  axis.innerHTML  = '';

  for (const e of timeline) {
    const left  = (e.start / maxTime) * 100;
    const width = ((e.end - e.start) / maxTime) * 100;
    const freq  = FREQ_MAP[e.freq];

    const block = document.createElement('div');
    block.className    = 'gantt-block';
    block.style.left   = left + '%';
    block.style.width  = Math.max(width, 0.3) + '%';
    block.style.background = freq ? freq.color : '#999';
    if (width > 2) block.textContent = `T${e.tid}`;

    block.addEventListener('mousemove', ev => {
      tooltip.style.opacity = '1';
      tooltip.style.left    = (ev.clientX + 14) + 'px';
      tooltip.style.top     = (ev.clientY - 10) + 'px';
      tooltip.innerHTML     = `Task T${e.tid}<br>Start: ${e.start.toFixed(1)} &nbsp; End: ${e.end.toFixed(1)}<br>Freq: ${e.freq}<br>Priority: ${PRI_LABELS[e.priority]}`;
    });
    block.addEventListener('mouseleave', () => tooltip.style.opacity = '0');
    track.appendChild(block);
  }

  // Axis ticks
  const step = Math.ceil(maxTime / 10);
  for (let t = 0; t <= maxTime; t += step) {
    const tick = document.createElement('div');
    tick.className  = 'gantt-tick';
    tick.style.left = (t / maxTime * 100) + '%';
    tick.textContent = t.toFixed(0);
    axis.appendChild(tick);
  }
}

// ── RENDER ALL CHARTS ──
function renderCharts(rrS, edfS, eaS, eaTimeline) {
  destroyCharts();

  const algoLabels = ['Round Robin', 'EDF', 'EA-EDF'];
  const algoColors = ['#ff6b6b', '#ffd93d', '#00ff9d'];

  charts.energy     = makeBar('chartEnergy',     algoLabels, [rrS.energy,  edfS.energy,  eaS.energy],  algoColors, 'Energy');
  charts.misses     = makeBar('chartMisses',     algoLabels, [rrS.misses,  edfS.misses,  eaS.misses],  algoColors, 'Count');
  charts.turnaround = makeBar('chartTurnaround', algoLabels, [rrS.avgTA,   edfS.avgTA,   eaS.avgTA],   algoColors, 'Time');

  // Frequency breakdown pie for EA-EDF
  const freqTime = {};
  FREQ_LEVELS.forEach(f => freqTime[f.name] = 0);
  eaTimeline.forEach(e => freqTime[e.freq] += (e.end - e.start));
  const total   = Object.values(freqTime).reduce((a, b) => a + b, 0);
  const fLabels = FREQ_LEVELS.map(f => f.name).filter(k => freqTime[k] > 0);
  const fData   = fLabels.map(k => +(freqTime[k] / total * 100).toFixed(1));
  const fColors = fLabels.map(k => FREQ_MAP[k].color);

  charts.freq = makePie('chartFreq', fLabels, fData, fColors);
}
