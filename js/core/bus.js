// bus.js — barramento de eventos (GAD §9): sistemas conversam por eventos,
// nunca chamando telas ou HUD diretamente. Handlers de escopo 'partida' são
// limpos no início de cada partida; 'global' persiste (UI, telemetria).
var G = globalThis.G || (globalThis.G = {});

G.bus = {
  _handlers: {},

  on(evento, fn, escopo) {
    (this._handlers[evento] = this._handlers[evento] || [])
      .push({ fn, escopo: escopo || 'partida' });
  },

  emit(evento, dados) {
    const lista = this._handlers[evento];
    if (!lista) return;
    for (const h of lista.slice()) h.fn(dados);
  },

  limparPartida() {
    for (const ev of Object.keys(this._handlers)) {
      this._handlers[ev] = this._handlers[ev].filter(h => h.escopo === 'global');
      if (!this._handlers[ev].length) delete this._handlers[ev];
    }
  }
};
