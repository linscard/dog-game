// save.js — arquitetura de salvamento (GAD §13): salva apenas progressão
// (estrelas, XP, dificuldade). Estado de partida nunca é salvo.
var G = globalThis.G || (globalThis.G = {});

G.save = {
  CHAVE: 'jogo-18h30-v1',
  dados: null,

  carregar() {
    let d = null;
    try {
      if (typeof localStorage !== 'undefined') {
        d = JSON.parse(localStorage.getItem(this.CHAVE));
      }
    } catch (e) { /* storage indisponível ou corrompido: começa do zero */ }
    this.dados = Object.assign({ estrelas: {}, xp: 0, dificuldade: 'normal' }, d || {});
    return this.dados;
  },

  gravar() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.CHAVE, JSON.stringify(this.dados));
      }
    } catch (e) { /* sem persistência: jogo segue funcionando */ }
  },

  estrelasFase(idFase) { return this.dados.estrelas[idFase] || 0; },

  setEstrelas(idFase, n) {
    if (n > this.estrelasFase(idFase)) {
      this.dados.estrelas[idFase] = n;
      this.gravar();
    }
  },

  // Total de estrelas de uma campanha (ids de fase têm prefixo "<campanha>-").
  estrelasCampanha(idCampanha) {
    let total = 0;
    for (const [id, n] of Object.entries(this.dados.estrelas)) {
      if (id.startsWith(idCampanha + '-')) total += n;
    }
    return total;
  },

  addXp(n) { this.dados.xp += Math.max(0, Math.round(n)); this.gravar(); },

  setDificuldade(d) { this.dados.dificuldade = d; this.gravar(); }
};
