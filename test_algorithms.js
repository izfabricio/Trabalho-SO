/* Test harness for scheduling algorithms — run with Node.js */

const PROCESS_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#f59e0b','#ef4444','#10b981','#ec4899','#f97316'];

function scheduleFCFS(processes) {
    const procs = processes.map(p => ({ ...p }));
    procs.sort((a, b) => a.arrival - b.arrival);
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

function scheduleSJF(processes) {
    const procs = processes.map(p => ({ ...p, done: false }));
    const gantt = [];
    let time = 0;
    let completed = 0;
    const n = procs.length;
    while (completed < n) {
        const available = procs.filter(p => !p.done && p.arrival <= time);
        if (available.length === 0) {
            const nextArrival = Math.min(...procs.filter(p => !p.done).map(p => p.arrival));
            gantt.push({ name: 'idle', start: time, end: nextArrival });
            time = nextArrival;
            continue;
        }
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

function scheduleSRTF(processes) {
    const procs = processes.map(p => ({ ...p, remaining: p.burst }));
    const gantt = [];
    const preemptions = [];
    let time = 0;
    let completed = 0;
    const n = procs.length;
    let currentProcess = null;
    const maxTime = Math.max(...procs.map(p => p.arrival)) + procs.reduce((s, p) => s + p.burst, 0);
    while (completed < n && time <= maxTime) {
        const available = procs.filter(p => p.remaining > 0 && p.arrival <= time);
        if (available.length === 0) {
            const pending = procs.filter(p => p.remaining > 0);
            if (pending.length === 0) break;
            const nextArrival = Math.min(...pending.map(p => p.arrival));
            gantt.push({ name: 'idle', start: time, end: nextArrival });
            time = nextArrival;
            currentProcess = null;
            continue;
        }
        available.sort((a, b) => {
            if (a.remaining !== b.remaining) return a.remaining - b.remaining;
            return processes.findIndex(p => p.name === a.name) - processes.findIndex(p => p.name === b.name);
        });
        const chosen = available[0];
        if (currentProcess && currentProcess !== chosen.name && procs.find(p => p.name === currentProcess && p.remaining > 0)) {
            preemptions.push({ time, preempted: currentProcess, by: chosen.name });
        }
        currentProcess = chosen.name;
        let runUntil = time + chosen.remaining;
        for (const p of procs) {
            if (p.remaining > 0 && p.arrival > time && p.arrival < runUntil) {
                const chosenRemainingAtArrival = chosen.remaining - (p.arrival - time);
                if (p.remaining < chosenRemainingAtArrival) {
                    runUntil = p.arrival;
                    break;
                }
            }
        }
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

// ======= TEST CASES =======

function testScenarioA() {
    console.log('=== Cenário A: SJF Não Preemptivo ===');
    const processes = [
        { name: 'P1', arrival: 0, burst: 7 },
        { name: 'P2', arrival: 2, burst: 5 },
        { name: 'P3', arrival: 4, burst: 2 },
        { name: 'P4', arrival: 5, burst: 1 },
        { name: 'P5', arrival: 6, burst: 3 },
    ];
    const result = scheduleSJF(processes);
    const gantt = mergeGantt(result.gantt);
    console.log('Gantt:', gantt.map(b => `${b.name}(${b.start}-${b.end})`).join(', '));
    const avgWait = result.processes.reduce((s, p) => s + p.waitTime, 0) / result.processes.length;
    console.log('Wait times:', result.processes.map(p => `${p.name}=${p.waitTime}`).join(', '));
    console.log('Avg wait:', avgWait);
    console.log('Expected Gantt: P1(0-7), P4(7-8), P3(8-10), P5(10-13), P2(13-18)');
    console.log('Expected avg: 4.2');
    console.log('PASS:', Math.abs(avgWait - 4.2) < 0.01 ? '✅' : '❌');
    console.log();
}

function testScenarioB() {
    console.log('=== Cenário B: SRTF (Preemptivo) ===');
    const processes = [
        { name: 'P1', arrival: 0, burst: 6 },
        { name: 'P2', arrival: 1, burst: 3 },
        { name: 'P3', arrival: 2, burst: 4 },
        { name: 'P4', arrival: 4, burst: 2 },
    ];
    const result = scheduleSRTF(processes);
    const gantt = mergeGantt(result.gantt);
    console.log('Gantt:', gantt.map(b => `${b.name}(${b.start}-${b.end})`).join(', '));
    const avgWait = result.processes.reduce((s, p) => s + p.waitTime, 0) / result.processes.length;
    console.log('Wait times:', result.processes.map(p => `${p.name}=${p.waitTime}`).join(', '));
    console.log('Avg wait:', avgWait);
    console.log('Expected Gantt: P1(0-1), P2(1-4), P4(4-6), P3(6-10), P1(10-15)');
    console.log('Expected avg: 3.25');
    console.log('PASS:', Math.abs(avgWait - 3.25) < 0.01 ? '✅' : '❌');
    console.log('Preemptions:', result.preemptions.length);
    result.preemptions.forEach(p => console.log(`  t=${p.time}: ${p.by} preemptou ${p.preempted}`));
    console.log();
}

function testScenarioC() {
    console.log('=== Cenário C: FCFS ===');
    const processes = [
        { name: 'P1', arrival: 0, burst: 6 },
        { name: 'P2', arrival: 1, burst: 3 },
        { name: 'P3', arrival: 2, burst: 4 },
        { name: 'P4', arrival: 4, burst: 2 },
    ];
    const result = scheduleFCFS(processes);
    const gantt = mergeGantt(result.gantt);
    console.log('Gantt:', gantt.map(b => `${b.name}(${b.start}-${b.end})`).join(', '));
    const avgWait = result.processes.reduce((s, p) => s + p.waitTime, 0) / result.processes.length;
    console.log('Wait times:', result.processes.map(p => `${p.name}=${p.waitTime}`).join(', '));
    console.log('Avg wait:', avgWait);
    console.log('Expected Gantt: P1(0-6), P2(6-9), P3(9-13), P4(13-15)');
    console.log('Expected avg: 5.25');
    console.log('PASS:', Math.abs(avgWait - 5.25) < 0.01 ? '✅' : '❌');
    console.log();
}

testScenarioA();
testScenarioB();
testScenarioC();
