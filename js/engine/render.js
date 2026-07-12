// render.js — desenho do mundo (câmera, tiles, entidades, clima, efeitos).
// A campanha define cores de chão e desenha seus elementos/personagens via
// hooks; o motor cuida da câmera e da ordem das camadas.
var G = globalThis.G || (globalThis.G = {});

G.render = {
  LARG: 480, ALT: 336,

  camera(world) {
    const T = G.TILE;
    const alvo = world.player ? G.mov.posPx(world.player) : { x: 0, y: 0 };
    let cx = alvo.x + T / 2 - this.LARG / 2;
    let cy = alvo.y + T / 2 - this.ALT / 2;
    cx = G.util.clamp(cx, 0, Math.max(0, world.W * T - this.LARG));
    cy = G.util.clamp(cy, 0, Math.max(0, world.H * T - this.ALT));
    return { x: Math.round(cx), y: Math.round(cy) };
  },

  desenhar(ctx, world) {
    const T = G.TILE;
    const cam = this.camera(world);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    const x0 = Math.max(0, (cam.x / T) | 0);
    const y0 = Math.max(0, (cam.y / T) | 0);
    const x1 = Math.min(world.W - 1, ((cam.x + this.LARG) / T) | 0);
    const y1 = Math.min(world.H - 1, ((cam.y + this.ALT) / T) | 0);

    // camada 1: chão
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        this.tile(ctx, world, world.tiles[y][x], x, y);
      }
    }

    // camada 2: bloqueios dinâmicos (multidão da passeata)
    for (const [chave, b] of world.bloqueios) {
      const [bx, by] = chave.split(',').map(Number);
      if (bx < x0 || bx > x1 || by < y0 || by > y1) continue;
      if (b.tipo === 'passeata') this.multidao(ctx, bx, by);
    }

    // camada 3: elementos da campanha (territórios, itens, pacientes...)
    if (world.campanha.desenharMundo) world.campanha.desenharMundo(ctx, world);

    // camada 4: entidades (ordenadas por y para sobreposição correta)
    const ents = world.entidades.slice().sort((a, b) => a.y - b.y);
    for (const e of ents) {
      const p = G.mov.posPx(e);
      world.campanha.desenharEntidade(ctx, world, e, p.x, p.y);
    }

    // camada 5: textos flutuantes
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    for (const fx of world.fx) {
      ctx.globalAlpha = Math.min(1, fx.t);
      ctx.fillStyle = fx.cor;
      ctx.fillText(fx.texto, fx.x * T + T / 2, fx.y * T - (1.4 - fx.t) * 18);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // camada 6: clima (tela inteira)
    if (world.mods.chuva) this.chuva(ctx, world);
  },

  tile(ctx, world, ch, x, y) {
    const T = G.TILE, px = x * T, py = y * T;
    const cor = world.campanha.corTile(ch);
    ctx.fillStyle = cor.base;
    ctx.fillRect(px, py, T, T);

    if (ch === '#') { // prédio com "telhado" iluminado (fim de tarde)
      ctx.fillStyle = cor.detalhe || '#3d466b';
      ctx.fillRect(px, py, T, 4);
      ctx.fillStyle = 'rgba(255,205,117,.16)';
      if ((x * 7 + y * 13) % 3 === 0) ctx.fillRect(px + 6, py + 10, 5, 6);
      if ((x * 5 + y * 11) % 4 === 0) ctx.fillRect(px + 14, py + 14, 5, 6);
    } else if (ch === '=') { // asfalto com faixa
      if (cor.detalhe && (x + y) % 2 === 0) {
        ctx.fillStyle = cor.detalhe;
        ctx.fillRect(px + T / 2 - 1, py + T / 2 - 1, 4, 2);
      }
    } else if (ch === '.') { // grama com textura
      ctx.fillStyle = cor.detalhe || 'rgba(0,0,0,.08)';
      if ((x * 3 + y * 5) % 4 === 0) ctx.fillRect(px + 4, py + 6, 2, 2);
      if ((x * 5 + y * 3) % 4 === 1) ctx.fillRect(px + 14, py + 16, 2, 2);
    }
  },

  multidao(ctx, x, y) {
    const T = G.TILE, px = x * T, py = y * T;
    const cores = ['#ef7d57', '#41a6f6', '#a7f070', '#ffcd75'];
    for (let i = 0; i < 4; i++) {
      const ox = 3 + (i % 2) * 11, oy = 3 + ((i / 2) | 0) * 11;
      ctx.fillStyle = cores[(x + y + i) % 4];
      ctx.fillRect(px + ox, py + oy + 3, 7, 6);
      ctx.fillStyle = '#e8c39e';
      ctx.fillRect(px + ox + 1, py + oy, 5, 4);
    }
  },

  chuva(ctx, world) {
    ctx.fillStyle = 'rgba(41, 54, 111, .25)';
    ctx.fillRect(0, 0, this.LARG, this.ALT);
    ctx.strokeStyle = 'rgba(115, 239, 247, .5)';
    ctx.lineWidth = 1;
    const t = world.decorrido * 640;
    ctx.beginPath();
    for (let i = 0; i < 46; i++) {
      const x = ((i * 97 + t) % (this.LARG + 40)) - 20;
      const y = (i * 61 + t * 1.3) % this.ALT;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 9);
    }
    ctx.stroke();
  }
};
