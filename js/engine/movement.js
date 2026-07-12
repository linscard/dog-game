// movement.js — Sistema de Movimento (GAD §4): deslocamento em grade com
// interpolação, colisão e modificadores de velocidade. Usado por cachorro,
// ambulância, carros e futuros personagens.
var G = globalThis.G || (globalThis.G = {});

G.mov = {
  tenta(world, e, dx, dy) {
    if (e.para || e.paralisado) return false;
    e.dir = { dx, dy };
    const nx = e.x + dx, ny = e.y + dy;
    if (!G.mundo.andavel(world, nx, ny, e)) return false;
    e.de = { x: e.x, y: e.y };
    e.para = { x: nx, y: ny };
    e.prog = 0;
    return true;
  },

  // velocidade final = base × modificador global (eventos) × terreno (campanha) × boost
  velocidade(world, e) {
    let v = e.vel * (world.mods.velGlobal || 1);
    if (world.campanha.velTile) v *= world.campanha.velTile(world, e);
    if (e.boost) v *= e.boost.mult;
    return Math.max(0.2, v);
  },

  update(world, e, dt) {
    if (e.boost) {
      e.boost.t -= dt;
      if (e.boost.t <= 0) e.boost = null;
    }
    if (!e.para || e.paralisado) return;
    e.prog += dt * this.velocidade(world, e);
    if (e.prog >= 1) {
      e.x = e.para.x;
      e.y = e.para.y;
      e.de = null;
      e.para = null;
      e.prog = 0;
      G.bus.emit('entidade:chegou', { world, e });
    }
  },

  // posição em pixels para desenho (interpolada durante o passo)
  posPx(e) {
    const T = G.TILE;
    if (!e.para) return { x: e.x * T, y: e.y * T };
    return {
      x: G.util.lerp(e.de.x, e.para.x, e.prog) * T,
      y: G.util.lerp(e.de.y, e.para.y, e.prog) * T
    };
  }
};
