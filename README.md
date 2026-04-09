# CPU Scheduler

A browser-based **CPU scheduling simulator** focused on mobile/embedded tradeoffs. The app compares three algorithms side-by-side and visualizes their behavior with Gantt charts and performance dashboards.

## What it simulates

The simulator generates a task set (arrival, burst, deadline, priority) and runs:

1. **Round Robin (RR)**
2. **Earliest Deadline First (EDF)**
3. **Energy-Aware EDF + DVFS**

For each algorithm, it computes:

- Total energy consumption
- Average turnaround time
- Average wait time
- Deadline misses
- Throughput
- Per-task finish times and energy

## Why this project exists

This project demonstrates how scheduling strategy and CPU frequency scaling (DVFS) can affect both timing behavior and energy usage in constrained systems such as mobile and embedded devices.

## UI overview

The web UI includes:

- Controls for task count, RR quantum, and random seed
- Stats cards for RR, EDF, and EA-EDF
- Gantt charts for timeline comparison
- Charts for energy, misses, turnaround, and EA frequency distribution
- A per-task results table

## Project structure

- `index.html` — layout and UI sections
- `style.css` — visual styling
- `simulation.js` — task generation, scheduling algorithms, metrics
- `charts.js` — chart and Gantt rendering (Chart.js)
- `main.js` — orchestration and DOM updates

## Run locally

Because this is a static frontend project, you do **not** need Python or a backend runtime.

### Option 1: Open directly

Open `index.html` in your browser.

### Option 2: Serve with any static server (optional)

If your browser blocks some local-file behaviors, run any lightweight static server.
Use whichever tool you already have installed:

```bash
npx serve .
```

or

```bash
npx http-server .
```

or (only if Python is already installed)

```bash
python3 -m http.server 8000
```

Then open the local URL shown in your terminal (commonly `http://localhost:8000`).

## Notes

- Task generation is deterministic for a given seed.
- RR and EDF run at max frequency in this model.
- EA-EDF selects the lowest feasible frequency level to reduce energy while respecting deadlines when possible.

## Future improvements

- Add more algorithms (SJF, RMS, LLF)
- Add multi-core simulation
- Export/import task sets
- Add preset workloads and reproducible scenarios
- Add unit tests for scheduler logic
