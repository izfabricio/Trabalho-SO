// Contador de processos
var contador = 0;

// Cores para o Gantt
var cores = ["#2196F3", "#4CAF50", "#FF9800", "#9C27B0", "#F44336", "#00BCD4", "#795548", "#607D8B", "#E91E63", "#3F51B5"];

// Adiciona a primeira vez 2 processos ao carregar a página
window.onload = function () {
  adicionarProcesso();
  adicionarProcesso();
};

// Função para adicionar uma linha de processo na tabela
function adicionarProcesso() {
  contador++;
  var tbody = document.getElementById("corpo-tabela");
  var tr = document.createElement("tr");
  tr.id = "linha-" + contador;

  tr.innerHTML =
    '<td>P' + contador + '</td>' +
    '<td><input type="number" min="0" value="" placeholder="0" id="chegada-' + contador + '"></td>' +
    '<td><input type="number" min="1" value="" placeholder="1" id="burst-' + contador + '"></td>' +
    '<td><button onclick="removerProcesso(\'' + tr.id + '\')">Remover</button></td>';

  tbody.appendChild(tr);
}

// Função para remover um processo da tabela
function removerProcesso(id) {
  var linha = document.getElementById(id);
  linha.remove();
  // Renumerar os processos
  renumerar();
}

// Renumera os processos P1, P2, P3...
function renumerar() {
  var linhas = document.getElementById("corpo-tabela").getElementsByTagName("tr");
  for (var i = 0; i < linhas.length; i++) {
    linhas[i].getElementsByTagName("td")[0].textContent = "P" + (i + 1);
  }
  contador = linhas.length;
}

// Lê os processos da tabela e valida
function lerProcessos() {
  var linhas = document.getElementById("corpo-tabela").getElementsByTagName("tr");

  if (linhas.length === 0) {
    mostrarErro("Adicione pelo menos um processo.");
    return null;
  }

  var processos = [];

  for (var i = 0; i < linhas.length; i++) {
    var inputs = linhas[i].getElementsByTagName("input");
    var chegada = parseInt(inputs[0].value);
    var burst = parseInt(inputs[1].value);

    if (isNaN(chegada) || chegada < 0) {
      mostrarErro("Tempo de chegada inválido no processo P" + (i + 1) + ".");
      return null;
    }
    if (isNaN(burst) || burst < 1) {
      mostrarErro("Burst inválido no processo P" + (i + 1) + ".");
      return null;
    }

    processos.push({
      nome: "P" + (i + 1),
      chegada: chegada,
      burst: burst,
      indice: i
    });
  }

  return processos;
}

function mostrarErro(msg) {
  var erro = document.getElementById("erro");
  erro.textContent = msg;
  erro.style.display = "block";
}

function esconderErro() {
  document.getElementById("erro").style.display = "none";
}

// ========== ALGORITMOS ==========

// FCFS
function calcularFCFS(processos) {
  // Ordena por chegada
  var ordenados = processos.slice().sort(function (a, b) {
    return a.chegada - b.chegada || a.indice - b.indice;
  });

  var gantt = [];
  var resultados = [];
  var tempoAtual = 0;

  for (var i = 0; i < ordenados.length; i++) {
    var p = ordenados[i];
    var inicio = Math.max(tempoAtual, p.chegada);
    var fim = inicio + p.burst;
    var espera = inicio - p.chegada;

    gantt.push({ nome: p.nome, inicio: inicio, fim: fim });
    resultados.push({ nome: p.nome, chegada: p.chegada, burst: p.burst, inicio: inicio, conclusao: fim, espera: espera });

    tempoAtual = fim;
  }

  var somaEspera = 0;
  for (var i = 0; i < resultados.length; i++) {
    somaEspera += resultados[i].espera;
  }
  var media = somaEspera / resultados.length;

  return { gantt: gantt, resultados: resultados, media: media, preempcoes: [] };
}

// SJF Não Preemptivo
function calcularSJF(processos) {
  var restantes = processos.slice();
  var concluidos = [];
  var gantt = [];
  var resultados = [];
  var tempoAtual = 0;

  while (concluidos.length < processos.length) {
    // Filtra os que já chegaram
    var disponiveis = [];
    for (var i = 0; i < restantes.length; i++) {
      if (restantes[i].chegada <= tempoAtual) {
        disponiveis.push(restantes[i]);
      }
    }

    if (disponiveis.length === 0) {
      // Avança o tempo até o próximo processo chegar
      var menorChegada = Infinity;
      for (var i = 0; i < restantes.length; i++) {
        if (restantes[i].chegada < menorChegada) {
          menorChegada = restantes[i].chegada;
        }
      }
      tempoAtual = menorChegada;
      continue;
    }

    // Ordena por burst (menor primeiro), depois chegada, depois índice
    disponiveis.sort(function (a, b) {
      return a.burst - b.burst || a.chegada - b.chegada || a.indice - b.indice;
    });

    var escolhido = disponiveis[0];
    var inicio = tempoAtual;
    var fim = inicio + escolhido.burst;
    var espera = inicio - escolhido.chegada;

    gantt.push({ nome: escolhido.nome, inicio: inicio, fim: fim });
    resultados.push({ nome: escolhido.nome, chegada: escolhido.chegada, burst: escolhido.burst, inicio: inicio, conclusao: fim, espera: espera });

    concluidos.push(escolhido.nome);

    // Remove dos restantes
    var novoRestantes = [];
    for (var i = 0; i < restantes.length; i++) {
      if (restantes[i].nome !== escolhido.nome) {
        novoRestantes.push(restantes[i]);
      }
    }
    restantes = novoRestantes;

    tempoAtual = fim;
  }

  // Ordena resultados pela ordem original para a tabela
  resultados.sort(function (a, b) {
    return processos.findIndex(function (p) { return p.nome === a.nome; }) -
           processos.findIndex(function (p) { return p.nome === b.nome; });
  });

  var somaEspera = 0;
  for (var i = 0; i < resultados.length; i++) {
    somaEspera += resultados[i].espera;
  }
  var media = somaEspera / resultados.length;

  return { gantt: gantt, resultados: resultados, media: media, preempcoes: [] };
}

// SRTF (Preemptivo)
function calcularSRTF(processos) {
  var n = processos.length;
  var tempoRestante = {};
  var preempcoes = [];

  for (var i = 0; i < n; i++) {
    tempoRestante[processos[i].nome] = processos[i].burst;
  }

  var tempoMax = 0;
  for (var i = 0; i < n; i++) {
    tempoMax += processos[i].burst;
    if (processos[i].chegada > tempoMax) {
      tempoMax = processos[i].chegada + processos[i].burst;
    }
  }
  tempoMax += Math.max.apply(null, processos.map(function (p) { return p.chegada; }));

  var timeline = []; // timeline[t] = nome do processo rodando no tempo t
  var concluidos = 0;
  var processoAtual = null;
  var tempoConclusao = {};

  for (var t = 0; t <= tempoMax && concluidos < n; t++) {
    // Filtra processos disponíveis
    var disponiveis = [];
    for (var i = 0; i < n; i++) {
      if (processos[i].chegada <= t && tempoRestante[processos[i].nome] > 0) {
        disponiveis.push(processos[i]);
      }
    }

    if (disponiveis.length === 0) {
      timeline[t] = null;
      continue;
    }

    // Ordena por tempo restante, depois chegada, depois índice
    disponiveis.sort(function (a, b) {
      return tempoRestante[a.nome] - tempoRestante[b.nome] || a.chegada - b.chegada || a.indice - b.indice;
    });

    var escolhido = disponiveis[0];

    // Verifica preempção
    if (processoAtual !== null && processoAtual !== escolhido.nome && tempoRestante[processoAtual] > 0) {
      var chegouAgora = false;
      for (var i = 0; i < n; i++) {
        if (processos[i].chegada === t && processos[i].nome === escolhido.nome) {
          chegouAgora = true;
        }
      }

      if (chegouAgora) {
        preempcoes.push("t=" + t + ": " + escolhido.nome + " chegou com tempo restante menor (" + tempoRestante[escolhido.nome] + ") que " + processoAtual + " (" + tempoRestante[processoAtual] + ")");
      } else {
        preempcoes.push("t=" + t + ": " + escolhido.nome + " tem menor tempo restante (" + tempoRestante[escolhido.nome] + ") que " + processoAtual + " (" + tempoRestante[processoAtual] + ")");
      }
    }

    timeline[t] = escolhido.nome;
    processoAtual = escolhido.nome;
    tempoRestante[escolhido.nome]--;

    if (tempoRestante[escolhido.nome] === 0) {
      concluidos++;
      tempoConclusao[escolhido.nome] = t + 1;
      processoAtual = null;
    }
  }

  // Monta o Gantt juntando blocos consecutivos
  var gantt = [];
  var i = 0;
  while (i < timeline.length) {
    if (timeline[i] === null || timeline[i] === undefined) {
      i++;
      continue;
    }
    var nome = timeline[i];
    var inicio = i;
    while (i < timeline.length && timeline[i] === nome) {
      i++;
    }
    gantt.push({ nome: nome, inicio: inicio, fim: i });
  }

  // Monta resultados
  var resultados = [];
  for (var j = 0; j < n; j++) {
    var p = processos[j];
    var conclusao = tempoConclusao[p.nome];
    var espera = conclusao - p.chegada - p.burst;
    var primeiroInicio = timeline.indexOf(p.nome);
    resultados.push({ nome: p.nome, chegada: p.chegada, burst: p.burst, inicio: primeiroInicio, conclusao: conclusao, espera: espera });
  }

  var somaEspera = 0;
  for (var i = 0; i < resultados.length; i++) {
    somaEspera += resultados[i].espera;
  }
  var media = somaEspera / resultados.length;

  return { gantt: gantt, resultados: resultados, media: media, preempcoes: preempcoes };
}

// ========== SIMULAÇÃO ==========

function simular() {
  esconderErro();

  var processos = lerProcessos();
  if (processos === null) return;

  var algoritmo = document.getElementById("algoritmo").value;
  var resultado;

  if (algoritmo === "fcfs") {
    resultado = calcularFCFS(processos);
  } else if (algoritmo === "sjf") {
    resultado = calcularSJF(processos);
  } else {
    resultado = calcularSRTF(processos);
  }

  mostrarResultados(resultado, algoritmo);
}

// ========== EXIBIÇÃO DOS RESULTADOS ==========

function mostrarResultados(resultado, algoritmo) {
  // Mostra a seção de resultados
  document.getElementById("resultados").style.display = "block";

  // Média de espera
  var media = resultado.media;
  if (media % 1 === 0) {
    document.getElementById("media-espera").textContent = media.toFixed(1);
  } else {
    document.getElementById("media-espera").textContent = media.toFixed(2);
  }

  // Gantt
  var ganttDiv = document.getElementById("gantt");
  ganttDiv.innerHTML = "";
  var temposDiv = document.getElementById("gantt-tempos");
  temposDiv.innerHTML = "";

  // Mapeia cores por processo
  var mapaCores = {};
  var corIndex = 0;

  for (var i = 0; i < resultado.gantt.length; i++) {
    var bloco = resultado.gantt[i];
    var duracao = bloco.fim - bloco.inicio;

    if (!mapaCores[bloco.nome]) {
      mapaCores[bloco.nome] = cores[corIndex % cores.length];
      corIndex++;
    }

    var div = document.createElement("div");
    div.className = "gantt-bloco";
    div.style.width = (duracao * 40) + "px";
    div.style.backgroundColor = mapaCores[bloco.nome];
    div.textContent = bloco.nome;
    div.title = bloco.nome + ": " + bloco.inicio + " até " + bloco.fim;
    ganttDiv.appendChild(div);

    // Tempo abaixo
    var tempo = document.createElement("div");
    tempo.className = "gantt-tempo";
    tempo.style.width = (duracao * 40) + "px";
    tempo.textContent = bloco.inicio;
    temposDiv.appendChild(tempo);

    // Último tempo
    if (i === resultado.gantt.length - 1) {
      var tempoFim = document.createElement("div");
      tempoFim.className = "gantt-tempo";
      tempoFim.textContent = bloco.fim;
      temposDiv.appendChild(tempoFim);
    }
  }

  // Tabela de métricas
  var corpoMetricas = document.getElementById("corpo-metricas");
  corpoMetricas.innerHTML = "";

  for (var i = 0; i < resultado.resultados.length; i++) {
    var r = resultado.resultados[i];
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + r.nome + "</td>" +
      "<td>" + r.chegada + "</td>" +
      "<td>" + r.burst + "</td>" +
      "<td>" + r.inicio + "</td>" +
      "<td>" + r.conclusao + "</td>" +
      "<td><strong>" + r.espera + "</strong></td>";
    corpoMetricas.appendChild(tr);
  }

  // Log de preempções (só SRTF)
  var divLog = document.getElementById("div-log");
  var logDiv = document.getElementById("log-preempcoes");

  if (algoritmo === "srtf" && resultado.preempcoes.length > 0) {
    divLog.style.display = "block";
    logDiv.innerHTML = "";
    for (var i = 0; i < resultado.preempcoes.length; i++) {
      logDiv.innerHTML += resultado.preempcoes[i] + "<br>";
    }
  } else {
    divLog.style.display = "none";
  }
}
