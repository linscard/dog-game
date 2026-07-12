// input.js — teclado. Direção usa a última tecla pressionada ainda segurada,
// o que dá o controle "respondão" típico de jogos de grade.
var G = globalThis.G || (globalThis.G = {});

G.input = {
  seguradas: {},
  toques: {},        // teclas que desceram neste frame (borda)
  pilhaDir: [],      // ordem em que as teclas de direção foram pressionadas

  DIRECOES: {
    ArrowUp: { dx: 0, dy: -1 }, KeyW: { dx: 0, dy: -1 },
    ArrowDown: { dx: 0, dy: 1 }, KeyS: { dx: 0, dy: 1 },
    ArrowLeft: { dx: -1, dy: 0 }, KeyA: { dx: -1, dy: 0 },
    ArrowRight: { dx: 1, dy: 0 }, KeyD: { dx: 1, dy: 0 }
  },

  init() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (ev) => {
      if (this.DIRECOES[ev.code] || ev.code === 'Space') ev.preventDefault();
      if (!this.seguradas[ev.code]) this.toques[ev.code] = true;
      this.seguradas[ev.code] = true;
      if (this.DIRECOES[ev.code] && !this.pilhaDir.includes(ev.code)) {
        this.pilhaDir.push(ev.code);
      }
    });
    window.addEventListener('keyup', (ev) => {
      this.seguradas[ev.code] = false;
      const i = this.pilhaDir.indexOf(ev.code);
      if (i >= 0) this.pilhaDir.splice(i, 1);
    });
    window.addEventListener('blur', () => {
      this.seguradas = {};
      this.pilhaDir = [];
    });
  },

  direcao() {
    for (let i = this.pilhaDir.length - 1; i >= 0; i--) {
      const code = this.pilhaDir[i];
      if (this.seguradas[code]) return this.DIRECOES[code];
    }
    return null;
  },

  segurando(code) { return !!this.seguradas[code]; },
  pressionou(code) { return !!this.toques[code]; },

  // chamado no fim de cada frame para limpar as bordas
  fimDoFrame() { this.toques = {}; }
};
