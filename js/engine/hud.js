// hud.js — Interface (GAD §14). Prioridades: 1) jogabilidade (HUD discreto),
// 2) cronômetro, 3) recursos, 4) objetivos, 5) minimapa.
var G = globalThis.G || (globalThis.G = {});

G.hud = {
  desenhar(ctx, world) {
    const L = G.render.LARG, A = G.render.ALT;

    // 2) CRONÔMETRO — relógio temático no topo, sempre visível
    const critico = world.tempoRestante <= 15;
    ctx.fillStyle = 'rgba(26,28,44,.82)';
    ctx.fillRect(L / 2 - 46, 0, 92, 22);
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = critico && (world.decorrido % 0.8 < 0.4) ? '#b13e53' : '#ffcd75';
    ctx.fillText(G.util.relogio(world.decorrido), L / 2, 12);
    // barra de tempo restante
    const frac = G.util.clamp(world.tempoRestante / world.tempoTotal, 0, 1);
    ctx.fillStyle = '#333c57';
    ctx.fillRect(L / 2 - 40, 16, 80, 3);
    ctx.fillStyle = critico ? '#b13e53' : '#a7f070';
    ctx.fillRect(L / 2 - 40, 16, 80 * frac, 3);

    // 3) RECURSOS do jogador — canto superior esquerdo
    if (world.player) {
      let y = 6;
      ctx.textAlign = 'left';
      ctx.font = 'bold 8px monospace';
      for (const rh of world.campanha.recursosHUD) {
        const r = world.player.res[rh.id];
        if (!r) continue;
        ctx.fillStyle = 'rgba(26,28,44,.82)';
        ctx.fillRect(4, y - 2, 96, 13);
        ctx.fillStyle = '#94b0c2';
        ctx.fillText(rh.nome, 7, y + 5);
        ctx.fillStyle = '#333c57';
        ctx.fillRect(48, y + 1, 48, 5);
        ctx.fillStyle = rh.cor;
        if (rh.discreto) { // recurso em unidades (ex.: cafés)
          for (let i = 0; i < r.max; i++) {
            ctx.globalAlpha = i < Math.round(r.v) ? 1 : 0.25;
            ctx.fillRect(48 + i * 9, y, 7, 7);
          }
          ctx.globalAlpha = 1;
        } else {
          ctx.fillRect(48, y + 1, 48 * G.util.clamp(r.v / r.max, 0, 1), 5);
        }
        y += 15;
      }
      // placar extra da campanha (ex.: contagem de territórios)
      if (world.campanha.hudExtra) world.campanha.hudExtra(ctx, world, 4, y + 2);
    }

    // 4) OBJETIVOS — canto superior direito, texto curto
    ctx.textAlign = 'right';
    ctx.font = 'bold 8px monospace';
    let oy = 6;
    ctx.fillStyle = 'rgba(26,28,44,.82)';
    ctx.fillRect(L - 180, 2, 178, 12 + world.objetivos.length * 11);
    ctx.fillStyle = '#ffcd75';
    ctx.fillText('PONTOS ' + world.score, L - 8, oy + 4);
    oy += 12;
    for (const o of world.objetivos) {
      ctx.fillStyle = o.feito ? '#a7f070' : (o.tipoObjetivo === 'principal' ? '#f4f4f4' : '#94b0c2');
      const prog = o.texto != null ? o.texto : (o.alvo ? o.prog + '/' + o.alvo : '');
      ctx.fillText((o.feito ? '✔ ' : '') + o.desc + (prog !== '' ? '  ' + prog : ''), L - 8, oy + 4);
      oy += 11;
    }

    // 5) MINIMAPA — canto inferior direito, discreto
    this.minimapa(ctx, world, L, A);

    // Canalização do jogador (ex.: marcando território)
    if (world.canalJogador) {
      const c = world.canalJogador;
      ctx.fillStyle = 'rgba(26,28,44,.85)';
      ctx.fillRect(L / 2 - 44, A - 46, 88, 18);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f4f4f4';
      ctx.fillText(c.rotulo, L / 2, A - 38);
      ctx.fillStyle = '#333c57';
      ctx.fillRect(L / 2 - 38, A - 34, 76, 4);
      ctx.fillStyle = '#ffcd75';
      ctx.fillRect(L / 2 - 38, A - 34, 76 * G.util.clamp(c.t / c.dur, 0, 1), 4);
    }

    // Mensagens (banner central)
    let my = 34;
    ctx.textAlign = 'center';
    ctx.font = 'bold 9px monospace';
    for (const m of world.msgs) {
      ctx.globalAlpha = Math.min(1, m.t);
      ctx.fillStyle = 'rgba(26,28,44,.9)';
      ctx.fillRect(L / 2 - 90, my - 8, 180, 13);
      ctx.fillStyle = '#ffcd75';
      ctx.fillText(m.texto, L / 2, my + 2);
      ctx.globalAlpha = 1;
      my += 16;
    }

    // Evento ativo (selo discreto sob o relógio)
    if (world.eventosAtivos.length) {
      const nomes = world.eventosAtivos
        .map(ev => (G.eventosMundo.tipos[ev.tipo] || {}).nome || ev.tipo).join(' · ');
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#73eff7';
      ctx.fillText('⚡ ' + nomes, L / 2, 30);
    }

    // Contagem regressiva (GAD §3)
    if (world.fase === 'contagem') {
      ctx.fillStyle = 'rgba(16,18,34,.55)';
      ctx.fillRect(0, 0, L, A);
      ctx.font = 'bold 64px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffcd75';
      const n = Math.ceil(world.contagem);
      ctx.fillText(n > 0 ? String(n) : 'JÁ!', L / 2, A / 2 + 20);
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#f4f4f4';
      ctx.fillText(world.nivel.objetivos[0].desc, L / 2, A / 2 + 48);
    }

    // Pausa
    if (world.fase === 'pausa') {
      ctx.fillStyle = 'rgba(16,18,34,.7)';
      ctx.fillRect(0, 0, L, A);
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffcd75';
      ctx.fillText('PAUSA', L / 2, A / 2);
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#94b0c2';
      ctx.fillText('P para continuar · M para sair ao menu', L / 2, A / 2 + 20);
    }
  },

  minimapa(ctx, world, L, A) {
    const esc = 3;
    const mw = world.W * esc, mh = world.H * esc;
    const mx = L - mw - 6, my = A - mh - 6;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#10121f';
    ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
    for (let y = 0; y < world.H; y++) {
      for (let x = 0; x < world.W; x++) {
        const ch = world.tiles[y][x];
        ctx.fillStyle = world.campanha.corMinimapa(ch);
        ctx.fillRect(mx + x * esc, my + y * esc, esc, esc);
      }
    }
    if (world.campanha.minimapaExtra) {
      world.campanha.minimapaExtra(ctx, world, mx, my, esc);
    }
    // jogador pisca em branco
    if (world.player && world.decorrido % 0.6 < 0.4) {
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(mx + world.player.x * esc - 1, my + world.player.y * esc - 1, esc + 2, esc + 2);
    }
    ctx.globalAlpha = 1;
  }
};
