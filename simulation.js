// ── SEEDED RNG ──
function seededRNG(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── DVFS FREQUENCY LEVELS ──
const FREQ_LEVELS = [
  { name: "Ultra-Low", ghz: 0.3, voltage: 0.75, speed: 0.2,  color: "#00ff9d" },
  { name: "Low",       ghz: 0.6, voltage: 0.85, speed: 0.4,  color: "#00d4aa" },
  { name: "Medium",    ghz: 1.0, voltage: 1.00, speed: 0.65, color: "#f39c12" },
  { name: "High",      ghz: 1.4, voltage: 1.10, speed: 0.85, color: "#e67e22" },
  { name: "Max",       ghz: 1.8, voltage: 1.20, speed: 1.0,  color: "#ff6b6b" },
];

const FREQ_MAP = {};
FREQ_LEVELS.forEach(f => FREQ_MAP[f.name] = f);

function power(f) {
  return f.voltage * f.voltage * f.ghz;
}

const PRI_LABELS = ["Background", "Normal", "Interactive", "Real-Time"];

// ── TASK GENERATOR ──
function generateTasks(n, seed) {
  const rng = seededRNG(seed);
  const ri  = (a, b) => Math.floor(rng() * (b - a + 1)) + a;
  const tasks = [];
  let t = 0;
  const priWeights = [0.2, 0.4, 0.25, 0.15];

  for (let i = 0; i < n; i++) {
    const arrival = t;
    const burst   = ri(3, 12);
    const r = rng();
    let pri = 0, acc = 0;
    for (let p = 0; p < 4; p++) {
      acc += priWeights[p];
      if (r < acc) { pri = p; break; }
    }
    const slackF   = [3.5, 2.5, 1.8, 1.3][pri];
    const deadline = arrival + Math.floor(burst * slackF) + ri(2, 6);
    tasks.push({ id: i + 1, arrival, burst, deadline, priority: pri });
    t += ri(0, 4);
  }
  return tasks;
}

function cloneTasks(tasks) {
  return tasks.map(t => ({
    ...t,
    remaining:   t.burst,
    startTime:   null,
    finishTime:  null,
    energyUsed:  0,
  }));
}

// ── ALGORITHM 1: ROUND ROBIN ──
function roundRobin(tasks, quantum) {
  const ts = cloneTasks(tasks);
  const queue = [], timeline = [];
  let time = 0, idx = 0;
  const freq = FREQ_LEVELS[4]; // always max
  const pw   = power(freq);

  while (idx < ts.length || queue.length > 0) {
    while (idx < ts.length && ts[idx].arrival <= time) queue.push(ts[idx++]);
    if (!queue.length) { time++; continue; }

    const task = queue.shift();
    if (task.startTime === null) task.startTime = time;

    const run    = Math.min(quantum, task.remaining);
    task.energyUsed += pw * run;
    task.remaining  -= run;
    timeline.push({ tid: task.id, start: time, end: time + run, freq: freq.name, priority: task.priority });
    time += run;

    while (idx < ts.length && ts[idx].arrival <= time) queue.push(ts[idx++]);
    if (task.remaining > 0) queue.push(task);
    else task.finishTime = time;
  }
  return { tasks: ts, timeline };
}

// ── ALGORITHM 2: EDF ──
function edf(tasks) {
  const ts = cloneTasks(tasks);
  const queue = [], timeline = [];
  let time = 0, idx = 0;
  const freq = FREQ_LEVELS[4]; // always max
  const pw   = power(freq);

  while (idx < ts.length || queue.length > 0) {
    while (idx < ts.length && ts[idx].arrival <= time) queue.push(ts[idx++]);
    if (!queue.length) { time++; continue; }

    queue.sort((a, b) => a.deadline - b.deadline);
    const task = queue.shift();
    if (task.startTime === null) task.startTime = time;

    task.energyUsed += pw * task.remaining;
    timeline.push({ tid: task.id, start: time, end: time + task.remaining, freq: freq.name, priority: task.priority });
    time            += task.remaining;
    task.remaining   = 0;
    task.finishTime  = time;

    while (idx < ts.length && ts[idx].arrival <= time) queue.push(ts[idx++]);
  }
  return { tasks: ts, timeline };
}

// ── ALGORITHM 3: ENERGY-AWARE EDF + DVFS ──
function pickFreq(task, currentTime) {
  const avail = task.deadline - currentTime;
  if (avail <= 0) return FREQ_LEVELS[4];

  // Minimum speed needed to finish before deadline
  const minSpeed = task.remaining / avail;

  // Priority buffer: higher priority = less risk tolerance
  const buffer   = [0.0, 0.05, 0.15, 0.25][task.priority];
  const required = minSpeed + buffer;

  // Pick lowest frequency level that meets required speed
  for (const lv of FREQ_LEVELS) {
    if (lv.speed >= required) return lv;
  }
  return FREQ_LEVELS[4];
}

function energyAwareEDF(tasks) {
  const ts = cloneTasks(tasks);
  const queue = [], timeline = [];
  let time = 0, idx = 0;

  while (idx < ts.length || queue.length > 0) {
    while (idx < ts.length && ts[idx].arrival <= time) queue.push(ts[idx++]);
    if (!queue.length) { time++; continue; }

    queue.sort((a, b) => a.deadline - b.deadline);
    const task = queue.shift();
    if (task.startTime === null) task.startTime = time;

    const freq       = pickFreq(task, time);
    const actualTime = task.remaining / freq.speed;
    const energy     = power(freq) * actualTime;

    task.energyUsed += energy;
    timeline.push({ tid: task.id, start: time, end: time + actualTime, freq: freq.name, priority: task.priority });
    time            += actualTime;
    task.remaining   = 0;
    task.finishTime  = time;

    while (idx < ts.length && ts[idx].arrival <= time) queue.push(ts[idx++]);
  }
  return { tasks: ts, timeline };
}

// ── STATS ──
function computeStats(result, totalTime) {
  const completed = result.tasks.filter(t => t.finishTime !== null);
  const missed    = result.tasks.filter(t => t.finishTime === null || t.finishTime > t.deadline);
  const energy    = completed.reduce((s, t) => s + t.energyUsed, 0);
  const avgTA     = completed.reduce((s, t) => s + (t.finishTime - t.arrival), 0) / (completed.length || 1);
  const avgWait   = completed.reduce((s, t) => s + (t.finishTime - t.arrival - t.burst), 0) / (completed.length || 1);

  return {
    energy:     +energy.toFixed(2),
    avgTA:      +avgTA.toFixed(2),
    avgWait:    +avgWait.toFixed(2),
    misses:     missed.length,
    completed:  completed.length,
    throughput: +(completed.length / (totalTime || 1)).toFixed(4),
  };
}
