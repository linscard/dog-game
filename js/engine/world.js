// world.js — mundo da partida: mapa em ASCII vindo do arquivo da fase (GAD §7),
// entidades e estado compartilhado. A campanha interpreta os caracteres
// especiais do mapa; o motor só conhece '#' (parede) e bloqueios dinâmicos.
var G = globalThis.G || (globalThis.G = {});

G.TILE = 24; // pixels por tile na resolução interna

G.mundo = {
  criar(campanha, nivel, dif) {
    const linhas = nivel.mapa;
    const world = {
      campanha, nivel, dif,
      W: linhas[0].length,
      H: linhas.length,
      tiles: [],
      entidades: [],
      agentes: [],
      player: null,
      bloqueios: new Map(),      // "x,y" -> {tipo} (ex.: passeata)
      mods: { velGlobal: 1, chuva: false },
      tempoTotal: Math.round(nivel.tempo * dif.tempo),
      tempoRestante: Math.round(nivel.tempo * dif.tempo),
      decorrido: 0,
      score: 0,
      fase: 'contagem',
      contagem: 3.4,
      canalJogador: null,        // ação canalizada do jogador (ex.: marcar)
      eventosPendentes: (nivel.eventos || []).map(e => Object.assign({}, e)),
      eventosAtivos: [],
      objetivos: [],
      fim: null,                 // {resultado:'vitoria'|'derrota', motivo}
      stats: {},
      fx: [],                    // textos flutuantes
      msgs: [],                  // banner de mensagens do HUD
      melhoriasAtivas: []
    };

    campanha.preparar(world);

    // Interpreta o mapa: a campanha decide o que cada caractere significa e
    // devolve o caractere de chão que fica no lugar (ou null para manter).
    for (let y = 0; y < world.H; y++) {
      world.tiles.push([]);
      for (let x = 0; x < world.W; x++) {
        const ch = linhas[y][x];
        const troca = campanha.aoLerTile(world, ch, x, y);
        world.tiles[y].push(troca != null ? troca : ch);
      }
    }

    // Melhorias desbloqueadas por estrelas da campanha (GAD §6)
    const estrelas = G.save.estrelasCampanha(campanha.id);
    for (const up of (campanha.upgrades || [])) {
      if (estrelas >= up.estrelasNec) {
        up.aplicar(world);
        world.melhoriasAtivas.push(up.nome);
      }
    }

    G.objetivos.preparar(world);
    return world;
  },

  tile(world, x, y) {
    if (x < 0 || y < 0 || x >= world.W || y >= world.H) return '#';
    return world.tiles[y][x];
  },

  andavel(world, x, y, e) {
    const ch = this.tile(world, x, y);
    if (ch === '#') return false;
    if (world.bloqueios.has(x + ',' + y)) return false;
    return world.campanha.andavel(ch, e);
  },

  addEntidade(world, ent) {
    const e = Object.assign({
      id: 'e' + world.entidades.length,
      tipo: '?', jogador: false,
      x: 0, y: 0, de: null, para: null, prog: 0,
      dir: { dx: 0, dy: 1 },
      vel: 4, boost: null, paralisado: false,
      res: {}, cor: '#f4f4f4', dados: {}
    }, ent);
    world.entidades.push(e);
    if (e.jogador) world.player = e;
    return e;
  },

  removeEntidade(world, e) {
    const i = world.entidades.indexOf(e);
    if (i >= 0) world.entidades.splice(i, 1);
  },

  entidadesEm(world, x, y, tipo) {
    return world.entidades.filter(e =>
      e.x === x && e.y === y && (!tipo || e.tipo === tipo));
  },

  bloquear(world, x, y, tipo) { world.bloqueios.set(x + ',' + y, { tipo }); },
  desbloquear(world, x, y) { world.bloqueios.delete(x + ',' + y); },

  addFx(world, texto, x, y, cor) {
    world.fx.push({ texto, x, y, t: 1.4, cor: cor || '#ffcd75' });
  },

  msg(world, texto) { world.msgs.push({ texto, t: 3 }); }
};
