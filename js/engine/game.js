// game.js — orquestra o gameplay loop (GAD §3): objetivo apresentado →
// contagem → exploração/decisões/recursos → fim → resultado → recompensas.
// A dificuldade só altera parâmetros (GAD §10).
var G = globalThis.G || (globalThis.G = {});

G.DIFICULDADES = {
  facil:   { id: 'facil',   nome: 'Fácil',   tempo: 1.25, recursos: 1.25, iaReacao: 1.5, iaAgressao: 0.6 },
  normal:  { id: 'normal',  nome: 'Normal',  tempo: 1.0,  recursos: 1.0,  iaReacao: 1.0, iaAgressao: 1.0 },
  dificil: { id: 'dificil', nome: 'Difícil', tempo: 0.85, recursos: 0.85, iaReacao: 0.65, iaAgressao: 1.6 }
};

G.jogo = {
  estado: 'menu',
  world: null,
  campId: null,
  nivelIdx: 0,
  aoTerminar: null,   // callback da UI (tela de resultado)
  aoSairMenu: null,   // callback da UI (voltar ao menu)

  iniciarFase(campId, nivelIdx) {
    const campanha = G.campanhas[campId];
    const nivel = campanha.niveis[nivelIdx];
    const dif = G.DIFICULDADES[G.save.dados.dificuldade] || G.DIFICULDADES.normal;

    G.bus.limparPartida();
    this.campId = campId;
    this.nivelIdx = nivelIdx;
    this.world = G.mundo.criar(campanha, nivel, dif);
    this.estado = 'partida';
  },

  sairParaMenu() {
    this.world = null;
    this.estado = 'menu';
    if (this.aoSairMenu) this.aoSairMenu();
  },

  update(dt) {
    if (this.estado !== 'partida' || !this.world) return;
    const w = this.world;

    if (w.fase === 'contagem') {
      w.contagem -= dt;
      if (w.contagem <= -0.5) {
        w.fase = 'jogando';
        G.bus.emit('partida:comecou', { world: w });
      }
      return;
    }

    if (w.fase === 'pausa') {
      if (G.input.pressionou('KeyP') || G.input.pressionou('Escape')) w.fase = 'jogando';
      if (G.input.pressionou('KeyM')) this.sairParaMenu();
      return;
    }

    if (w.fase === 'fim') return;

    // --- fase 'jogando' ---
    if (G.input.pressionou('KeyP') || G.input.pressionou('Escape')) {
      w.fase = 'pausa';
      return;
    }

    w.decorrido += dt;
    w.tempoRestante -= dt;

    // controle do jogador: direção é genérica; teclas de habilidade são da campanha
    const dir = G.input.direcao();
    if (dir && w.player) {
      if (G.mov.tenta(w, w.player, dir.dx, dir.dy)) {
        w.canalJogador = null; // mover cancela ação canalizada
      }
    }
    if (w.campanha.controles) w.campanha.controles(w, dt);

    // canal do jogador (ex.: marcar território)
    if (w.canalJogador) {
      const c = w.canalJogador;
      c.t += dt;
      if (c.t >= c.dur) {
        w.canalJogador = null;
        c.acao(w);
      }
    }

    // sistemas do motor
    for (const e of w.entidades) {
      G.mov.update(w, e, dt);
      G.rec.update(e, dt);
    }
    for (const ag of w.agentes) G.ia.update(w, ag, dt);
    G.eventosMundo.update(w, dt);
    w.campanha.update(w, dt);
    G.objetivos.update(w);

    // efeitos e mensagens
    for (let i = w.fx.length - 1; i >= 0; i--) {
      w.fx[i].t -= dt;
      if (w.fx[i].t <= 0) w.fx.splice(i, 1);
    }
    for (let i = w.msgs.length - 1; i >= 0; i--) {
      w.msgs[i].t -= dt;
      if (w.msgs[i].t <= 0) w.msgs.splice(i, 1);
    }

    // condições de fim: campanha decide (GAD §4 — Sistema de Objetivos)
    let fim = w.campanha.avaliarFim(w);
    if (!fim && w.tempoRestante <= 0) {
      w.tempoRestante = 0;
      fim = w.campanha.aoTempoEsgotado(w);
    }
    if (fim) this.finalizar(fim);
  },

  finalizar(fim) {
    const w = this.world;
    w.fim = fim;
    w.fase = 'fim';

    // reavalia objetivos que só fecham no fim (ex.: "não perca pacientes")
    G.objetivos.update(w);

    const estrelasAntes = G.save.estrelasCampanha(w.campanha.id);
    const estrelas = G.pontos.estrelas(w);
    const idFase = w.campanha.id + '-' + (this.nivelIdx + 1);
    G.save.setEstrelas(idFase, estrelas);
    G.save.addXp(w.score);
    const estrelasDepois = G.save.estrelasCampanha(w.campanha.id);

    // recompensas: melhorias recém-desbloqueadas (GAD §6)
    const novasMelhorias = (w.campanha.upgrades || []).filter(up =>
      up.estrelasNec > estrelasAntes && up.estrelasNec <= estrelasDepois);

    G.bus.emit('partida:fim', { world: w, fim });
    if (this.aoTerminar) {
      this.aoTerminar({
        vitoria: fim.resultado === 'vitoria',
        motivo: fim.motivo,
        score: w.score,
        estrelas,
        resumo: w.campanha.resumo(w),
        novasMelhorias,
        temProxima: this.nivelIdx + 1 < w.campanha.niveis.length,
        campId: this.campId,
        nivelIdx: this.nivelIdx
      });
    }
  },

  desenhar(ctx) {
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(0, 0, G.render.LARG, G.render.ALT);
    if (this.estado === 'partida' && this.world) {
      G.render.desenhar(ctx, this.world);
      G.hud.desenhar(ctx, this.world);
    }
  }
};
