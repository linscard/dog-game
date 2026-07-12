// scoring.js — Sistema de Pontuação (GAD §4) e conversão em estrelas (GAD §6).
var G = globalThis.G || (globalThis.G = {});

G.pontos = {
  add(world, n, opts) {
    world.score = Math.max(0, world.score + n);
    if (opts && opts.x != null) {
      G.mundo.addFx(world, (n > 0 ? '+' : '') + n, opts.x, opts.y,
        n > 0 ? '#a7f070' : '#b13e53');
    }
    G.bus.emit('pontos:mudou', { world, delta: n });
  },

  // limiar de estrelas vem do arquivo da fase; derrota nunca dá estrela
  estrelas(world) {
    if (!world.fim || world.fim.resultado !== 'vitoria') return 0;
    const e = world.nivel.estrelas;
    if (world.score >= e[2]) return 3;
    if (world.score >= e[1]) return 2;
    if (world.score >= e[0]) return 1;
    return 1; // venceu: garante ao menos 1 estrela
  }
};
