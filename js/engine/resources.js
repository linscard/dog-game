// resources.js — Sistema de Recursos (GAD §4): genérico; cada campanha define
// quais recursos existem (urina/fôlego, sirene/café...). A dificuldade só
// multiplica parâmetros (GAD §10).
var G = globalThis.G || (globalThis.G = {});

G.rec = {
  // defs: { urina: {max:100, regen:0}, ... } → instância {v, max, regen}
  criar(defs, multMax) {
    const out = {};
    for (const [id, d] of Object.entries(defs)) {
      const max = Math.round(d.max * (multMax || 1));
      out[id] = { v: d.ini != null ? Math.min(d.ini, max) : max, max, regen: d.regen || 0 };
    }
    return out;
  },

  consumir(e, id, qtd) {
    const r = e.res[id];
    if (!r || r.v < qtd) return false;
    r.v -= qtd;
    G.bus.emit('recurso:mudou', { e, id });
    return true;
  },

  encher(e, id, qtd) {
    const r = e.res[id];
    if (!r) return;
    r.v = Math.min(r.max, r.v + qtd);
  },

  update(e, dt) {
    for (const r of Object.values(e.res)) {
      if (r.regen) r.v = Math.min(r.max, r.v + r.regen * dt);
    }
  }
};
