/* ============================================
   CPU Scheduler Simulator — Core Logic
   ============================================ */

(function () {
    'use strict';

    // --- Constants ---
    const PROCESS_COLORS = [
        '#3b82f6', // blue
        '#8b5cf6', // violet
        '#06b6d4', // cyan
        '#f59e0b', // amber
        '#ef4444', // red
        '#10b981', // emerald
        '#ec4899', // pink
        '#f97316', // orange
        '#6366f1', // indigo
        '#14b8a6', // teal
    ];

    // --- State ---
    let selectedAlgorithm = 'fcfs';
    let processCounter = 0;

    // --- DOM References ---
    const algoSelector = document.getElementById('algorithm-selector');
    const processTbody = document.getElementById('process-tbody');
    const btnAddProcess = document.getElementById('btn-add-process');
    const btnSimulate = document.getElementById('btn-simulate');
    const ganttContainer = document.getElementById('gantt-container');
    const algoBadge = document.getElementById('algo-badge');
    const metricsTbody = document.getElementById('metrics-tbody');
    const avgWaitValue = document.getElementById('avg-wait-value');
    const logPanel = document.getElementById('log-panel');
    const logEntries = document.getElementById('log-entries');

    // --- Initialize ---
    function init() {
        // Add default processes
        addProcessRow('P1', 0, 6);
        addProcessRow('P2', 1, 3);
        addProcessRow('P3', 2, 4);
        addProcessRow('P4', 4, 2);

        // Event listeners
        algoSelector.addEventListener('click', handleAlgoSelect);
        btnAddProcess.addEventListener('click', () => addProcessRow());
        btnSimulate.addEventListener('click', handleSimulate);
    }

    // --- Algorithm Selection ---
    function handleAlgoSelect(e) {
        const btn = e.target.closest('.algo-btn');
        if (!btn) return;

        algoSelector.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedAlgorithm = btn.dataset.algo;
    }

    // --- Process Table Management ---
    function addProcessRow(name, arrival, burst) {
        processCounter++;
        const defaultName = name || `P${processCounter}`;
        const defaultArrival = arrival !== undefined ? arrival : 0;
        const defaultBurst = burst !== undefined ? burst : 1;

        const tr = document.createElement('tr');
        tr.dataset.pid = processCounter;
        tr.innerHTML = `
            <td>
                <input type="text" class="input-name" value="${defaultName}" placeholder="Nome" id="input-name-${processCounter}">
            </td>
            <td>
                <input type="number" class="input-arrival" value="${defaultArrival}" min="0" placeholder="0" id="input-arrival-${processCounter}">
            </td>
            <td>
                <input type="number" class="input-burst" value="${defaultBurst}" min="1" placeholder="1" id="input-burst-${processCounter}">
            </td>
            <td>
                <button class="btn btn-remove" title="Remover processo" id="btn-remove-${processCounter}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                </button>
            </td>
        `;

        // Remove button handler
        tr.querySelector('.btn-remove').addEventListener('click', () => {
            tr.style.opacity = '0';
            tr.style.transform = 'translateX(-10px)';
            tr.style.transition = 'all 0.2s ease';
            setTimeout(() => tr.remove(), 200);
        });

        processTbody.appendChild(tr);
    }

    // --- Input Validation ---
    function getProcesses() {
        const rows = processTbody.querySelectorAll('tr');
        const processes = [];
        let valid = true;

        rows.forEach(row => {
            const nameInput = row.querySelector('.input-name');
            const arrivalInput = row.querySelector('.input-arrival');
            const burstInput = row.querySelector('.input-burst');

            // Clear previous errors
            [nameInput, arrivalInput, burstInput].forEach(el => el.classList.remove('input-error'));

            const name = nameInput.value.trim();
            const arrival = parseInt(arrivalInput.value, 10);
            const burst = parseInt(burstInput.value, 10);

            if (!name) {
                nameInput.classList.add('input-error');
                valid = false;
            }
            if (isNaN(arrival) || arrival < 0) {
                arrivalInput.classList.add('input-error');
                valid = false;
            }
            if (isNaN(burst) || burst < 1) {
                burstInput.classList.add('input-error');
                valid = false;
            }

            if (valid) {
                processes.push({ name, arrival, burst });
            }
        });

        if (!valid || processes.length === 0) return null;
        return processes;
    }

    // --- Scheduling Algorithms ---

    /**
     * FCFS (First Come, First Served)
     * Non-preemptive. Processes are served in order of arrival.
     */
    function scheduleFCFS(processes) {
        const procs = processes.map(p => ({ ...p }));
        procs.sort((a, b) => a.arrival - b.arrival || processes.indexOf(a) - processes.indexOf(b));

        const gantt = [];
        let time = 0;

        procs.forEach(p => {
            if (time < p.arrival) {
                gantt.push({ name: 'idle', start: time, end: p.arrival });
                time = p.arrival;
            }
            gantt.push({ name: p.name, start: time, end: time + p.burst });
            p.completion = time + p.burst;
            p.waitTime = p.completion - p.arrival - p.burst;
            time += p.burst;
        });

        return { gantt, processes: procs, preemptions: [] };
    }

    /**
     * SJF (Shortest Job First) — Non-Preemptive
     * When CPU is free, pick the arrived process with the shortest burst time.
     */
    function scheduleSJF(processes) {
        const procs = processes.map(p => ({ ...p, done: false }));
        const gantt = [];
        let time = 0;
        let completed = 0;
        const n = procs.length;

        while (completed < n) {
            // Find available processes
            const available = procs.filter(p => !p.done && p.arrival <= time);

            if (available.length === 0) {
                // Jump to next arrival
                const nextArrival = Math.min(...procs.filter(p => !p.done).map(p => p.arrival));
                gantt.push({ name: 'idle', start: time, end: nextArrival });
                time = nextArrival;
                continue;
            }

            // Pick shortest burst (stable: same burst → first in original order)
            available.sort((a, b) => {
                if (a.burst !== b.burst) return a.burst - b.burst;
                return processes.findIndex(p => p.name === a.name) - processes.findIndex(p => p.name === b.name);
            });

            const chosen = available[0];
            gantt.push({ name: chosen.name, start: time, end: time + chosen.burst });
            time += chosen.burst;
            chosen.completion = time;
            chosen.waitTime = chosen.completion - chosen.arrival - chosen.burst;
            chosen.done = true;
            completed++;
        }

        return { gantt, processes: procs, preemptions: [] };
    }

    /**
     * SRTF (Shortest Remaining Time First) — Preemptive SJF
     * At each time unit, pick the arrived process with shortest remaining time.
     */
    function scheduleSRTF(processes) {
        const procs = processes.map(p => ({ ...p, remaining: p.burst }));
        const gantt = [];
        const preemptions = [];
        let time = 0;
        let completed = 0;
        const n = procs.length;
        let currentProcess = null;

        // Compute total end time for safety
        const maxTime = Math.max(...procs.map(p => p.arrival)) + procs.reduce((s, p) => s + p.burst, 0);

        while (completed < n && time <= maxTime) {
            // Find available processes
            const available = procs.filter(p => p.remaining > 0 && p.arrival <= time);

            if (available.length === 0) {
                // Jump to next arrival
                const pending = procs.filter(p => p.remaining > 0);
                if (pending.length === 0) break;
                const nextArrival = Math.min(...pending.map(p => p.arrival));
                gantt.push({ name: 'idle', start: time, end: nextArrival });
                time = nextArrival;
                currentProcess = null;
                continue;
            }

            // Pick process with shortest remaining time
            available.sort((a, b) => {
                if (a.remaining !== b.remaining) return a.remaining - b.remaining;
                return processes.findIndex(p => p.name === a.name) - processes.findIndex(p => p.name === b.name);
            });

            const chosen = available[0];

            // Detect preemption
            if (currentProcess && currentProcess !== chosen.name && procs.find(p => p.name === currentProcess && p.remaining > 0)) {
                const newProc = procs.find(p => p.name === chosen.name);
                preemptions.push({
                    time: time,
                    preempted: currentProcess,
                    by: chosen.name,
                    reason: `${chosen.name} entrou com menor tempo restante (${newProc.remaining}) que ${currentProcess}`
                });
            }

            currentProcess = chosen.name;

            // Find how long this process will run before something changes
            // It runs until a new process arrives with shorter remaining, or it finishes
            let runUntil = time + chosen.remaining; // max: until it finishes

            // Check upcoming arrivals that might preempt
            for (const p of procs) {
                if (p.remaining > 0 && p.arrival > time && p.arrival < runUntil) {
                    // At p.arrival, chosen.remaining will be: chosen.remaining - (p.arrival - time)
                    const chosenRemainingAtArrival = chosen.remaining - (p.arrival - time);
                    if (p.remaining < chosenRemainingAtArrival) {
                        runUntil = p.arrival;
                        break;
                    }
                }
            }

            // Also check if any other currently-available process could have shorter remaining
            // (shouldn't happen since we already picked shortest, but be safe)

            const duration = runUntil - time;
            gantt.push({ name: chosen.name, start: time, end: runUntil });
            chosen.remaining -= duration;
            time = runUntil;

            if (chosen.remaining === 0) {
                chosen.completion = time;
                chosen.waitTime = chosen.completion - chosen.arrival - chosen.burst;
                completed++;
                currentProcess = null;
            }
        }

        return { gantt, processes: procs, preemptions };
    }

    // --- Merge consecutive Gantt blocks for the same process ---
    function mergeGantt(gantt) {
        if (gantt.length === 0) return [];
        const merged = [{ ...gantt[0] }];
        for (let i = 1; i < gantt.length; i++) {
            const last = merged[merged.length - 1];
            if (gantt[i].name === last.name) {
                last.end = gantt[i].end;
            } else {
                merged.push({ ...gantt[i] });
            }
        }
        return merged;
    }

    // --- Handle Simulate Click ---
    function handleSimulate() {
        const processes = getProcesses();
        if (!processes) return;

        let result;
        switch (selectedAlgorithm) {
            case 'fcfs':
                result = scheduleFCFS(processes);
                break;
            case 'sjf':
                result = scheduleSJF(processes);
                break;
            case 'srtf':
                result = scheduleSRTF(processes);
                break;
            default:
                return;
        }

        const mergedGantt = mergeGantt(result.gantt);
        const algoLabels = { fcfs: 'FCFS', sjf: 'SJF', srtf: 'SRTF' };

        // Update badge
        algoBadge.textContent = algoLabels[selectedAlgorithm];

        // Render outputs
        renderGantt(mergedGantt, processes);
        renderMetrics(result.processes, processes);
        renderLog(result.preemptions);

        // Scroll to results
        document.getElementById('gantt-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // --- Build color map from original process list ---
    function buildColorMap(processes) {
        const map = {};
        processes.forEach((p, i) => {
            map[p.name] = PROCESS_COLORS[i % PROCESS_COLORS.length];
        });
        return map;
    }

    // --- Render Gantt Chart ---
    function renderGantt(gantt, originalProcesses) {
        if (gantt.length === 0) {
            ganttContainer.innerHTML = '<div class="empty-state"><p>Nenhum resultado.</p></div>';
            return;
        }

        const colorMap = buildColorMap(originalProcesses);
        const totalTime = gantt[gantt.length - 1].end;
        const timeUnitWidth = Math.max(40, Math.min(80, 700 / totalTime));

        // Build single-row Gantt
        let blocksHTML = '';
        gantt.forEach(block => {
            const width = (block.end - block.start) * timeUnitWidth;
            if (block.name === 'idle') {
                blocksHTML += `<div class="gantt-block gantt-idle" style="width:${width}px;" data-tooltip="Ocioso: t=${block.start}→${block.end}"></div>`;
            } else {
                const color = colorMap[block.name] || '#64748b';
                blocksHTML += `<div class="gantt-block" style="width:${width}px; background: linear-gradient(135deg, ${color}, ${adjustColor(color, -20)});" data-tooltip="${block.name}: t=${block.start}→${block.end}">
                    <span class="block-label">${block.name}</span>
                </div>`;
            }
        });

        // Timeline ticks
        let timelineHTML = '';
        const tickSet = new Set();
        gantt.forEach(block => {
            tickSet.add(block.start);
            tickSet.add(block.end);
        });
        const ticks = Array.from(tickSet).sort((a, b) => a - b);

        ticks.forEach((t, i) => {
            if (i < ticks.length - 1) {
                const width = (ticks[i + 1] - t) * timeUnitWidth;
                timelineHTML += `<div class="gantt-timeline-tick" style="width:${width}px; text-align:left;">${t}</div>`;
            } else {
                timelineHTML += `<div class="gantt-timeline-tick" style="width:30px; text-align:left;">${t}</div>`;
            }
        });

        ganttContainer.innerHTML = `
            <div class="gantt-chart">
                <div class="gantt-row">
                    <div class="gantt-label">CPU</div>
                    <div class="gantt-track">${blocksHTML}</div>
                </div>
                <div class="gantt-timeline">${timelineHTML}</div>
            </div>
        `;
    }

    // --- Adjust hex color brightness ---
    function adjustColor(hex, amount) {
        hex = hex.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // --- Render Metrics Table ---
    function renderMetrics(resultProcesses, originalProcesses) {
        const colorMap = buildColorMap(originalProcesses);

        // Sort by original order
        const sorted = [...resultProcesses].sort((a, b) => {
            return originalProcesses.findIndex(p => p.name === a.name) - originalProcesses.findIndex(p => p.name === b.name);
        });

        let html = '';
        sorted.forEach(p => {
            const color = colorMap[p.name] || '#64748b';
            html += `
                <tr>
                    <td>
                        <div class="process-name-cell">
                            <span class="process-dot" style="background:${color}"></span>
                            ${p.name}
                        </div>
                    </td>
                    <td>${p.arrival}</td>
                    <td>${p.burst}</td>
                    <td>${p.completion}</td>
                    <td class="wait-cell">${p.waitTime}</td>
                </tr>
            `;
        });

        metricsTbody.innerHTML = html;

        // Average wait time
        const avgWait = sorted.reduce((sum, p) => sum + p.waitTime, 0) / sorted.length;
        // Show as integer if whole number, otherwise 2 decimal places
        avgWaitValue.textContent = Number.isInteger(avgWait) ? avgWait : avgWait.toFixed(2);
    }

    // --- Render Preemption Log ---
    function renderLog(preemptions) {
        if (selectedAlgorithm !== 'srtf' || preemptions.length === 0) {
            logPanel.classList.add('hidden');
            return;
        }

        logPanel.classList.remove('hidden');

        let html = '';
        preemptions.forEach(p => {
            html += `
                <div class="log-entry">
                    <span class="log-time">t=${p.time}:</span>
                    <span class="log-msg"><strong>${p.by}</strong> preemptou <strong>${p.preempted}</strong> — ${p.reason}</span>
                </div>
            `;
        });

        logEntries.innerHTML = html;
    }

    // --- Boot ---
    document.addEventListener('DOMContentLoaded', init);

})();
