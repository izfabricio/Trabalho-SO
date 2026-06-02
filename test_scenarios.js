// Teste dos 3 cenários

// Copia das funções do app.js para teste
var cores = ["#2196F3", "#4CAF50", "#FF9800", "#9C27B0", "#F44336"];

function calcularFCFS(processos) {
  var ordenados = processos.slice().sort(function (a, b) { return a.chegada - b.chegada || a.indice - b.indice; });
  var gantt = [], resultados = [], tempoAtual = 0;
  for (var i = 0; i < ordenados.length; i++) {
    var p = ordenados[i];
    var inicio = Math.max(tempoAtual, p.chegada), fim = inicio + p.burst, espera = inicio - p.chegada;
    gantt.push({ nome: p.nome, inicio: inicio, fim: fim });
    resultados.push({ nome: p.nome, chegada: p.chegada, burst: p.burst, inicio: inicio, conclusao: fim, espera: espera });
    tempoAtual = fim;
  }
  var soma = 0; for (var i = 0; i < resultados.length; i++) soma += resultados[i].espera;
  return { gantt: gantt, resultados: resultados, media: soma / resultados.length };
}

function calcularSJF(processos) {
  var restantes = processos.slice(), concluidos = [], gantt = [], resultados = [], tempoAtual = 0;
  while (concluidos.length < processos.length) {
    var disponiveis = [];
    for (var i = 0; i < restantes.length; i++) { if (restantes[i].chegada <= tempoAtual) disponiveis.push(restantes[i]); }
    if (disponiveis.length === 0) {
      var m = Infinity; for (var i = 0; i < restantes.length; i++) { if (restantes[i].chegada < m) m = restantes[i].chegada; }
      tempoAtual = m; continue;
    }
    disponiveis.sort(function (a, b) { return a.burst - b.burst || a.chegada - b.chegada || a.indice - b.indice; });
    var e = disponiveis[0], inicio = tempoAtual, fim = inicio + e.burst, espera = inicio - e.chegada;
    gantt.push({ nome: e.nome, inicio: inicio, fim: fim });
    resultados.push({ nome: e.nome, chegada: e.chegada, burst: e.burst, inicio: inicio, conclusao: fim, espera: espera });
    concluidos.push(e.nome);
    var nr = []; for (var i = 0; i < restantes.length; i++) { if (restantes[i].nome !== e.nome) nr.push(restantes[i]); }
    restantes = nr; tempoAtual = fim;
  }
  resultados.sort(function (a, b) { return processos.findIndex(function (p) { return p.nome === a.nome; }) - processos.findIndex(function (p) { return p.nome === b.nome; }); });
  var soma = 0; for (var i = 0; i < resultados.length; i++) soma += resultados[i].espera;
  return { gantt: gantt, resultados: resultados, media: soma / resultados.length };
}

function calcularSRTF(processos) {
  var n = processos.length, tempoRestante = {}, tempoConclusao = {};
  for (var i = 0; i < n; i++) tempoRestante[processos[i].nome] = processos[i].burst;
  var tempoMax = 0;
  for (var i = 0; i < n; i++) { tempoMax += processos[i].burst; }
  tempoMax += Math.max.apply(null, processos.map(function (p) { return p.chegada; }));
  var timeline = [], concluidos = 0, processoAtual = null;
  for (var t = 0; t <= tempoMax && concluidos < n; t++) {
    var disp = [];
    for (var i = 0; i < n; i++) { if (processos[i].chegada <= t && tempoRestante[processos[i].nome] > 0) disp.push(processos[i]); }
    if (disp.length === 0) { timeline[t] = null; continue; }
    disp.sort(function (a, b) { return tempoRestante[a.nome] - tempoRestante[b.nome] || a.chegada - b.chegada || a.indice - b.indice; });
    var e = disp[0]; timeline[t] = e.nome; processoAtual = e.nome; tempoRestante[e.nome]--;
    if (tempoRestante[e.nome] === 0) { concluidos++; tempoConclusao[e.nome] = t + 1; processoAtual = null; }
  }
  var gantt = [], i = 0;
  while (i < timeline.length) {
    if (timeline[i] === null || timeline[i] === undefined) { i++; continue; }
    var nome = timeline[i], inicio = i;
    while (i < timeline.length && timeline[i] === nome) i++;
    gantt.push({ nome: nome, inicio: inicio, fim: i });
  }
  var resultados = [];
  for (var j = 0; j < n; j++) {
    var p = processos[j], c = tempoConclusao[p.nome], esp = c - p.chegada - p.burst;
    resultados.push({ nome: p.nome, chegada: p.chegada, burst: p.burst, inicio: timeline.indexOf(p.nome), conclusao: c, espera: esp });
  }
  var soma = 0; for (var i = 0; i < resultados.length; i++) soma += resultados[i].espera;
  return { gantt: gantt, resultados: resultados, media: soma / resultados.length };
}

// Testes
function ganttStr(gantt) {
  var s = "";
  for (var i = 0; i < gantt.length; i++) {
    if (i > 0) s += " → ";
    s += gantt[i].nome + "(" + gantt[i].inicio + "-" + gantt[i].fim + ")";
  }
  return s;
}

// Cenário 1 - SJF
var c1 = [
  { nome: "P1", chegada: 0, burst: 7, indice: 0 },
  { nome: "P2", chegada: 2, burst: 5, indice: 1 },
  { nome: "P3", chegada: 4, burst: 2, indice: 2 },
  { nome: "P4", chegada: 5, burst: 1, indice: 3 },
  { nome: "P5", chegada: 6, burst: 3, indice: 4 }
];
var r1 = calcularSJF(c1);
console.log("Cenário 1 (SJF): " + ganttStr(r1.gantt));
console.log("Esperado:        P1(0-7) → P4(7-8) → P3(8-10) → P5(10-13) → P2(13-18)");
console.log("Média: " + r1.media + " (esperado 4.2)");
console.log(ganttStr(r1.gantt) === "P1(0-7) → P4(7-8) → P3(8-10) → P5(10-13) → P2(13-18)" && Math.abs(r1.media - 4.2) < 0.01 ? "✅ PASSOU" : "❌ FALHOU");

// Cenário 2 - SRTF
var c2 = [
  { nome: "P1", chegada: 0, burst: 6, indice: 0 },
  { nome: "P2", chegada: 1, burst: 3, indice: 1 },
  { nome: "P3", chegada: 2, burst: 4, indice: 2 },
  { nome: "P4", chegada: 4, burst: 2, indice: 3 }
];
var r2 = calcularSRTF(c2);
console.log("\nCenário 2 (SRTF): " + ganttStr(r2.gantt));
console.log("Esperado:         P1(0-1) → P2(1-4) → P4(4-6) → P3(6-10) → P1(10-15)");
console.log("Média: " + r2.media + " (esperado 3.25)");
console.log(ganttStr(r2.gantt) === "P1(0-1) → P2(1-4) → P4(4-6) → P3(6-10) → P1(10-15)" && Math.abs(r2.media - 3.25) < 0.01 ? "✅ PASSOU" : "❌ FALHOU");

// Cenário 3 - FCFS
var c3 = [
  { nome: "P1", chegada: 0, burst: 6, indice: 0 },
  { nome: "P2", chegada: 1, burst: 3, indice: 1 },
  { nome: "P3", chegada: 2, burst: 4, indice: 2 },
  { nome: "P4", chegada: 4, burst: 2, indice: 3 }
];
var r3 = calcularFCFS(c3);
console.log("\nCenário 3 (FCFS): " + ganttStr(r3.gantt));
console.log("Esperado:         P1(0-6) → P2(6-9) → P3(9-13) → P4(13-15)");
console.log("Média: " + r3.media + " (esperado 5.25)");
console.log(ganttStr(r3.gantt) === "P1(0-6) → P2(6-9) → P3(9-13) → P4(13-15)" && Math.abs(r3.media - 5.25) < 0.01 ? "✅ PASSOU" : "❌ FALHOU");
