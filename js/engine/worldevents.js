// worldevents.js — Sistema de Eventos (GAD §4): eventos modificam regras
// temporariamente. Novos eventos são registrados sem alterar os existentes;
// a campanha reage via hook aoEvento (ex.: chuva enche poças p/ cachorros,
// mas atrasa o trânsito p/ o SAMU).
var G = globalThis.G || (globalThis.G = {});

G.eventosMundo = {
  tipos: {},

  registrar(tipo, def) { this.tipos[tipo] = def; },

  update(world, dt) {
    // dispara eventos agendados no arquivo da fase
    for (let i = world.eventosPendentes.length - 1; i >= 0; i--) {
      const ev = world.eventosPendentes[i];
      if (world.decorrido >= ev.em) {
        world.eventosPendentes.splice(i, 1);
        this.iniciar(world, ev);
      }
    }
    // tique e término dos ativos
    for (let i = world.eventosAtivos.length - 1; i >= 0; i--) {
      const ev = world.eventosAtivos[i];
      const def = this.tipos[ev.tipo];
      ev.rest -= dt;
      if (def && def.tick) def.tick(world, ev, dt);
      if (ev.rest <= 0) {
        world.eventosAtivos.splice(i, 1);
        if (def && def.fim) def.fim(world, ev);
        if (world.campanha.aoEvento) world.campanha.aoEvento(world, ev, 'fim');
        G.bus.emit('evento:fim', { world, ev });
      }
    }
  },

  iniciar(world, evBase) {
    const def = this.tipos[evBase.tipo];
    if (!def) return;
    const ev = Object.assign({ rest: evBase.dur || 15 }, evBase);
    world.eventosAtivos.push(ev);
    def.inicio(world, ev);
    if (world.campanha.aoEvento) world.campanha.aoEvento(world, ev, 'inicio');
    G.mundo.msg(world, def.nome + '!');
    G.bus.emit('evento:inicio', { world, ev });
  }
};

// ---- Eventos básicos do motor (reutilizados por qualquer campanha) ----

// Chuva: marca o mundo como chuvoso; efeitos específicos ficam na campanha.
G.eventosMundo.registrar('chuva', {
  nome: 'Chuva',
  inicio(world) { world.mods.chuva = true; },
  fim(world) {
    world.mods.chuva = false;
    world.pocas = [];
  }
});

// Passeata: bloqueia uma área do mapa (dados: {x,y,w,h}); rotas mudam.
G.eventosMundo.registrar('passeata', {
  nome: 'Passeata',
  inicio(world, ev) {
    ev.tilesBloqueados = [];
    const a = ev.dados;
    for (let y = a.y; y < a.y + a.h; y++) {
      for (let x = a.x; x < a.x + a.w; x++) {
        if (G.mundo.tile(world, x, y) === '#') continue;
        if (world.bloqueios.has(x + ',' + y)) continue;
        // não prende ninguém dentro: tile com entidade fica livre
        if (G.mundo.entidadesEm(world, x, y).length) continue;
        G.mundo.bloquear(world, x, y, 'passeata');
        ev.tilesBloqueados.push({ x, y });
      }
    }
  },
  fim(world, ev) {
    for (const t of ev.tilesBloqueados || []) G.mundo.desbloquear(world, t.x, t.y);
  }
});
