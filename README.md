# Simulador de Escalonamento de CPU

Trabalho da disciplina de Sistemas Operacionais.

## Autores

- Fabricio Oliveira
- Ricardo Mitsujhy
- Igor Menezes

## Descrição

Aplicação web que simula algoritmos de escalonamento de CPU. O usuário insere os processos com seus tempos de chegada e duração (burst), escolhe o algoritmo e visualiza o resultado.

### Algoritmos implementados

- **FCFS** — First Come, First Served
- **SJF** — Shortest Job First (Não Preemptivo)
- **SRTF** — Shortest Remaining Time First (Preemptivo)

## Como usar

1. Abrir o arquivo `index.html` no navegador
2. Adicionar os processos com tempo de chegada e burst
3. Escolher o algoritmo desejado
4. Clicar em "Simular Escalonamento"

## Saídas

- Diagrama de Gantt
- Tabela com métricas de cada processo (tempo de espera, início, conclusão)
- Tempo médio de espera
- Log de preempções (apenas para SRTF)

## Tecnologias

- HTML5
- CSS3
- JavaScript
