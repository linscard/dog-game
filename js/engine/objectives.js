// objectives.js — Sistema de Objetivos (GAD §4): a fase declara os objetivos
// (tipo + alvo); a campanha fornece o avaliador de cada tipo. Vitória/derrota
// também são decididas pela campanha (avaliarFim / aoTempoEsgotado).
var G = globalThis.G || (globalThis.G = {});

G.objetivos = {
  preparar(world) {
    world.objetivos = (world.nivel.objetivos || []).map(o =>
      Object.assign({ prog: 0, feito: false, texto: null }, o));
  },

  update(world) {
    for (const o of world.objetivos) {
      if (o.feito) continue;
      const avaliador = world.campanha.avaliadores[o.tipo];
      if (!avaliador) continue;
      const r = avaliador(world, o);
      o.prog = r.prog != null ? r.prog : o.prog;
      o.texto = r.texto || null;
      if (r.feito) {
        o.feito = true;
        if (o.pontos) G.pontos.add(world, o.pontos);
        G.mundo.msg(world, 'Objetivo cumprido: ' + o.desc);
        G.bus.emit('objetivo:completo', { world, objetivo: o });
      }
    }
  }
};
