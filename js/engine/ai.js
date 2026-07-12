// ai.js — Sistema de IA (GAD §4/§5). Ciclo fixo para todo agente:
//   Observar → Planejar → Mover → Executar ação → Reavaliar
// A campanha só fornece o "cérebro" (prioridades/habilidades/objetivos);
// o motor cuida de caminho, passos e canalização de ações.
var G = globalThis.G || (globalThis.G = {});

G.ia = {
  criarAgente(world, e, cerebro) {
    const ag = { e, cerebro, tReplan: Math.random() * 0.4, caminho: [], plano: null, canal: null, memoria: {} };
    world.agentes.push(ag);
    return ag;
  },

  update(world, ag, dt) {
    const e = ag.e;
    if (e.paralisado) return;

    // EXECUTAR AÇÃO canalizada (ex.: marcar território leva ~1s)
    if (ag.canal) {
      ag.canal.t += dt;
      if (ag.canal.t >= ag.canal.dur) {
        const acao = ag.canal.acao;
        ag.canal = null;
        ag.tReplan = 0;
        if (acao) acao(world, ag);
      }
      return;
    }

    // OBSERVAR + PLANEJAR + REAVALIAR: o cérebro roda em intervalos; a
    // dificuldade alonga/encurta o tempo de reação (GAD §10).
    ag.tReplan -= dt;
    if (ag.tReplan <= 0) {
      ag.tReplan = world.dif.iaReacao * (0.45 + Math.random() * 0.35);
      const plano = ag.cerebro(world, ag);
      if (plano) {
        const mudou = !ag.plano || !ag.plano.destino || !plano.destino ||
          ag.plano.destino.x !== plano.destino.x || ag.plano.destino.y !== plano.destino.y;
        ag.plano = plano;
        if (mudou && plano.destino) {
          ag.caminho = G.util.astar(
            world.W, world.H,
            (x, y) => !G.mundo.andavel(world, x, y, e),
            { x: e.x, y: e.y }, plano.destino
          ) || [];
        }
      }
    }

    // MOVER: segue o caminho planejado; se algo bloqueou (passeata, obra),
    // descarta o caminho e replaneja no próximo ciclo.
    if (!e.para && ag.caminho.length) {
      const prox = ag.caminho[0];
      if (prox.x === e.x && prox.y === e.y) {
        ag.caminho.shift();
      } else {
        const dx = Math.sign(prox.x - e.x), dy = Math.sign(prox.y - e.y);
        if (G.mov.tenta(world, e, dx, dy)) {
          ag.caminho.shift();
        } else {
          ag.caminho = [];
          ag.tReplan = 0;
        }
      }
    }

    // Chegou ao destino do plano → executa a ação (direta ou canalizada)
    if (!e.para && !ag.caminho.length && ag.plano && ag.plano.destino &&
        e.x === ag.plano.destino.x && e.y === ag.plano.destino.y) {
      const plano = ag.plano;
      ag.plano = null;
      if (plano.acao) {
        if (plano.canal) {
          ag.canal = { t: 0, dur: plano.canal, acao: plano.acao, rotulo: plano.rotulo };
        } else {
          plano.acao(world, ag);
        }
      }
    }
  }
};
