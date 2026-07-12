// touch.js — controle de toque para celular: direcional virtual à esquerda e
// botões de ação à direita. Cada campanha declara seus botões (botoesTouch);
// tudo é traduzido em teclas virtuais no G.input, então o motor e as
// campanhas não mudam nada (GAD §16: simplicidade dos controles).
var G = globalThis.G || (globalThis.G = {});

(function () {
  if (typeof document === 'undefined') return;

  const SETAS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

  G.touch = {
    disponivel: false,
    raiz: null,
    campanhaAtual: null,
    pidDpad: null,

    init() {
      this.disponivel = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      if (!this.disponivel) return;

      const raiz = document.createElement('div');
      raiz.id = 'touch';
      raiz.innerHTML =
        '<div id="dpad">' +
        '<span class="seta cima">▲</span><span class="seta baixo">▼</span>' +
        '<span class="seta esq">◀</span><span class="seta dir">▶</span>' +
        '</div>' +
        '<div id="botoes-acao"></div>' +
        '<div class="btn-topo" id="btn-pausa">⏸</div>' +
        '<div class="btn-topo" id="btn-sair">✕</div>';
      document.body.appendChild(raiz);
      this.raiz = raiz;

      this.ligarDpad(raiz.querySelector('#dpad'));
      this.ligarBotao(raiz.querySelector('#btn-pausa'), 'KeyP');
      this.ligarBotao(raiz.querySelector('#btn-sair'), 'KeyM');
    },

    // direcional analógico de 4 direções: arrasta o dedo e a direção segue
    ligarDpad(dpad) {
      const soltarTudo = () => SETAS.forEach(c => G.input.virtualUp(c));

      const atualiza = (ev) => {
        const r = dpad.getBoundingClientRect();
        const dx = ev.clientX - (r.left + r.width / 2);
        const dy = ev.clientY - (r.top + r.height / 2);
        if (Math.hypot(dx, dy) < r.width * 0.14) { soltarTudo(); return; }
        const code = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
          : (dy > 0 ? 'ArrowDown' : 'ArrowUp');
        for (const c of SETAS) if (c !== code) G.input.virtualUp(c);
        G.input.virtualDown(code);
        dpad.dataset.dir = code;
      };

      dpad.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        try { dpad.setPointerCapture(ev.pointerId); } catch (e) { /* toque sintético */ }
        this.pidDpad = ev.pointerId;
        atualiza(ev);
      });
      dpad.addEventListener('pointermove', (ev) => {
        if (ev.pointerId === this.pidDpad) atualiza(ev);
      });
      const fim = (ev) => {
        if (ev.pointerId !== this.pidDpad) return;
        this.pidDpad = null;
        dpad.dataset.dir = '';
        soltarTudo();
      };
      dpad.addEventListener('pointerup', fim);
      dpad.addEventListener('pointercancel', fim);
    },

    ligarBotao(el, code) {
      el.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        el.classList.add('apertado');
        G.input.virtualDown(code);
      });
      const soltar = () => {
        el.classList.remove('apertado');
        G.input.virtualUp(code);
      };
      el.addEventListener('pointerup', soltar);
      el.addEventListener('pointercancel', soltar);
      el.addEventListener('pointerleave', soltar);
    },

    montarBotoes(campanha) {
      const box = this.raiz.querySelector('#botoes-acao');
      box.innerHTML = '';
      for (const b of (campanha.botoesTouch || [])) {
        const el = document.createElement('div');
        el.className = 'btn-acao';
        el.textContent = b.rotulo;
        this.ligarBotao(el, b.code);
        box.appendChild(el);
      }
    },

    // chamado a cada quadro: mostra os controles só durante a partida
    update() {
      if (!this.raiz) return;
      const w = G.jogo.world;
      const emPartida = G.jogo.estado === 'partida' && !!w;
      this.raiz.classList.toggle('visivel', emPartida);
      this.raiz.classList.toggle('pausado', emPartida && w.fase === 'pausa');
      if (emPartida && this.campanhaAtual !== w.campanha) {
        this.campanhaAtual = w.campanha;
        this.montarBotoes(w.campanha);
      }
    }
  };
})();
