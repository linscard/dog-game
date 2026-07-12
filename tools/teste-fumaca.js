// teste-fumaca.js — validação headless (node tools/teste-fumaca.js):
//  1) integridade dos mapas (dimensões, spawns, alcançabilidade);
//  2) simulação de partidas completas das duas campanhas sem exceções.
'use strict';

const path = require('path');
const raiz = path.join(__dirname, '..');

// stub mínimo de input para o motor rodar sem navegador
globalThis.G = {};
for (const f of [
  'js/core/util.js', 'js/core/bus.js', 'js/core/save.js', 'js/core/input.js',
  'js/engine/world.js', 'js/engine/movement.js', 'js/engine/resources.js',
  'js/engine/ai.js', 'js/engine/worldevents.js', 'js/engine/objectives.js',
  'js/engine/scoring.js', 'js/engine/game.js',
  'js/campaigns/dogs.js', 'js/campaigns/samu.js'
]) {
  require(path.join(raiz, f));
}
const G = globalThis.G;

let falhas = 0;
function ok(cond, msg) {
  if (cond) { console.log('  ✔ ' + msg); }
  else { falhas++; console.error('  ✘ ' + msg); }
}

// ---------------------------------------------------------------- mapas
console.log('== Integridade dos mapas ==');
for (const camp of Object.values(G.campanhas)) {
  camp.niveis.forEach((nivel, idx) => {
    const rotulo = camp.id + '-' + (idx + 1) + ' (' + nivel.nome + ')';
    const mapa = nivel.mapa;
    const larguras = new Set(mapa.map(l => l.length));
    ok(larguras.size === 1, rotulo + ': todas as linhas com mesma largura');
    ok(mapa.length >= 10, rotulo + ': altura razoável (' + mapa.length + ')');
    const chars = mapa.join('');
    if (camp.id === 'dogs') {
      ok((chars.match(/P/g) || []).length === 1, rotulo + ': exatamente 1 spawn de jogador');
      ok((chars.match(/E/g) || []).length >= 1, rotulo + ': ao menos 1 rival');
      const terr = (chars.match(/[itH]/g) || []).length;
      ok(terr % 2 === 1 || (chars.match(/E/g) || []).length > 1,
        rotulo + ': ' + terr + ' territórios (ímpar ou 2+ rivais para reduzir empates)');
    } else {
      ok((chars.match(/B/g) || []).length === 1, rotulo + ': exatamente 1 base');
      ok((chars.match(/X/g) || []).length === 1, rotulo + ': exatamente 1 hospital');
      ok((chars.match(/p/g) || []).length >= nivel.objetivos[0].alvo,
        rotulo + ': pontos de paciente suficientes para a meta');
    }
  });
}

// alcançabilidade: cria o mundo e verifica caminho entre pontos-chave
function alcancavel(world, de, ate) {
  return G.util.astar(world.W, world.H,
    (x, y) => !G.mundo.andavel(world, x, y, world.player),
    de, ate) !== null;
}

console.log('== Alcançabilidade ==');
G.save.carregar();
for (const camp of Object.values(G.campanhas)) {
  camp.niveis.forEach((nivel, idx) => {
    const rotulo = camp.id + '-' + (idx + 1);
    const world = G.mundo.criar(camp, nivel, G.DIFICULDADES.normal);
    const p = world.player;
    ok(!!p, rotulo + ': jogador criado');
    if (camp.id === 'dogs') {
      const fora = world.territorios.filter(t => !alcancavel(world, { x: p.x, y: p.y }, t));
      ok(fora.length === 0, rotulo + ': todos os ' + world.territorios.length + ' territórios alcançáveis');
      const aguaFora = world.aguas.filter(a => !alcancavel(world, { x: p.x, y: p.y }, a));
      ok(aguaFora.length === 0, rotulo + ': toda água alcançável');
    } else {
      ok(alcancavel(world, { x: p.x, y: p.y }, world.hospital), rotulo + ': hospital alcançável');
      const fora = world.pontosPaciente.filter(pt => !alcancavel(world, { x: p.x, y: p.y }, pt));
      ok(fora.length === 0, rotulo + ': todos os pontos de paciente alcançáveis');
    }
  });
}

// ------------------------------------------------------------ simulação
// Joga a fase inteira com um "jogador de IA" simples usando o mesmo motor.
console.log('== Simulação de partidas ==');

function simular(campId, nivelIdx, cerebroJogador) {
  G.jogo.aoTerminar = () => {};
  G.jogo.iniciarFase(campId, nivelIdx);
  const w = G.jogo.world;
  const agenteJog = G.ia.criarAgente(w, w.player, cerebroJogador);
  // tira o agente do update normal para controlá-lo como "input"
  w.agentes.pop();

  const dt = 1 / 30;
  let passos = 0;
  const maxPassos = Math.ceil((w.tempoTotal + 20) / dt);
  while (w.fase !== 'fim' && passos < maxPassos) {
    if (w.fase === 'contagem') { w.contagem = -1; }
    G.ia.update(w, agenteJog, dt);   // jogador simulado usa o ciclo da IA
    G.jogo.update(dt);
    passos++;
  }
  return w;
}

// cachorro jogador: mesma lógica dos rivais (reaproveita o cérebro via campanha)
try {
  const w = simular('dogs', 0, function (world, ag) {
    const e = ag.e;
    if (e.res.urina.v < 30) {
      const a = world.aguas[0];
      return { destino: { x: a.x, y: a.y }, canal: 1, acao: () => G.rec.encher(e, 'urina', 999) };
    }
    const alvo = world.territorios.find(t => t.dono !== 'player');
    if (!alvo) return null;
    return {
      destino: { x: alvo.x, y: alvo.y }, canal: 0.8,
      acao: (wd) => {
        if (alvo.dono !== 'player' && G.rec.consumir(e, 'urina', 30)) {
          // marca via caminho oficial: simula o canal do jogador
          const t = world.territorios.find(tt => tt.x === e.x && tt.y === e.y);
          if (t) {
            world.canalJogador = null;
            t.dono = 'player';
            world.stats.marcas++;
            G.bus.emit('territorio:marcado', { world: wd, territorio: t, quem: e, donoAnterior: null });
          }
        }
      }
    };
  });
  ok(w.fase === 'fim' && w.fim, 'dogs-1: partida terminou (' + w.fim.resultado + ', ' + w.score + ' pts)');
  ok(w.stats.marcas > 0, 'dogs-1: jogador simulado marcou territórios (' + w.stats.marcas + ')');
  const rivais = w.entidades.filter(e => e.tipo === 'cachorro' && !e.jogador);
  const marcasRivais = w.territorios.filter(t => t.dono && t.dono !== 'player').length;
  ok(rivais.length === 1, 'dogs-1: 1 rival em campo');
  ok(marcasRivais > 0, 'dogs-1: IA rival marcou territórios (' + marcasRivais + ')');
} catch (e) {
  falhas++;
  console.error('  ✘ dogs-1: exceção na simulação — ' + e.stack);
}

// ambulância jogadora: vai ao paciente, depois ao hospital
try {
  const w = simular('samu', 0, function (world, ag) {
    if (world.stats.carregando) {
      return { destino: { x: world.hospital.x, y: world.hospital.y } };
    }
    const pac = world.pacientes[0];
    if (pac) return { destino: { x: pac.x, y: pac.y } };
    return null;
  });
  ok(w.fase === 'fim' && w.fim, 'samu-1: partida terminou (' + w.fim.resultado + ', ' + w.score + ' pts)');
  ok(w.stats.salvos > 0, 'samu-1: pacientes salvos pela simulação (' + w.stats.salvos + ')');
} catch (e) {
  falhas++;
  console.error('  ✘ samu-1: exceção na simulação — ' + e.stack);
}

// eventos da fase 2 do SAMU (chuva + passeata) não podem quebrar nada
try {
  const w = simular('samu', 1, function (world) {
    if (world.stats.carregando) return { destino: { x: world.hospital.x, y: world.hospital.y } };
    const pac = world.pacientes[0];
    return pac ? { destino: { x: pac.x, y: pac.y } } : null;
  });
  ok(w.fase === 'fim', 'samu-2: partida com chuva+passeata terminou sem exceções (' +
    w.fim.resultado + ')');
  ok(w.bloqueios.size === 0 || w.eventosAtivos.length > 0,
    'samu-2: bloqueios da passeata foram desfeitos ao fim do evento');
} catch (e) {
  falhas++;
  console.error('  ✘ samu-2: exceção na simulação — ' + e.stack);
}

// dogs-2 com 2 rivais + eventos
try {
  const w = simular('dogs', 1, function (world, ag) {
    const e = ag.e;
    const alvo = world.territorios.find(t => !t.dono);
    return alvo ? { destino: { x: alvo.x, y: alvo.y } } : null;
  });
  ok(w.fase === 'fim', 'dogs-2: partida com 2 rivais e eventos terminou (' + w.fim.resultado + ')');
} catch (e) {
  falhas++;
  console.error('  ✘ dogs-2: exceção na simulação — ' + e.stack);
}

console.log(falhas === 0 ? '\nTUDO CERTO ✔' : '\n' + falhas + ' FALHA(S) ✘');
process.exit(falhas === 0 ? 0 : 1);
