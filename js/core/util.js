// util.js — matemática, A* e formatação compartilhados por todos os sistemas.
var G = globalThis.G || (globalThis.G = {});

G.util = {
  clamp(v, a, b) { return v < a ? a : (v > b ? b : v); },
  lerp(a, b, t) { return a + (b - a) * t; },

  dist(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  },

  manhattan(ax, ay, bx, by) { return Math.abs(ax - bx) + Math.abs(ay - by); },

  escolha(arr) { return arr[(Math.random() * arr.length) | 0]; },

  intAleatorio(a, b) { return a + ((Math.random() * (b - a + 1)) | 0); },

  // Relógio temático: toda partida começa às 18:30:00.
  relogio(segundosDecorridos) {
    const t = 18 * 3600 + 30 * 60 + Math.max(0, Math.floor(segundosDecorridos));
    const h = (t / 3600) | 0;
    const m = ((t % 3600) / 60) | 0;
    const s = t % 60;
    return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  },

  // A* em grade 4-direções. `bloqueado(x,y)` decide o que é parede.
  // Retorna lista de passos {x,y} SEM incluir a origem, ou null se não há caminho.
  astar(largura, altura, bloqueado, ini, fim) {
    if (ini.x === fim.x && ini.y === fim.y) return [];
    if (bloqueado(fim.x, fim.y)) return null;

    const idx = (x, y) => y * largura + x;
    const gCusto = new Float32Array(largura * altura).fill(Infinity);
    const veio = new Int32Array(largura * altura).fill(-1);
    const fechado = new Uint8Array(largura * altura);
    const aberto = [{ x: ini.x, y: ini.y, f: 0 }];
    gCusto[idx(ini.x, ini.y)] = 0;

    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (aberto.length) {
      // pega o menor f (mapas pequenos: busca linear é suficiente)
      let mi = 0;
      for (let i = 1; i < aberto.length; i++) if (aberto[i].f < aberto[mi].f) mi = i;
      const atual = aberto.splice(mi, 1)[0];
      const ia = idx(atual.x, atual.y);
      if (fechado[ia]) continue;
      fechado[ia] = 1;

      if (atual.x === fim.x && atual.y === fim.y) {
        const caminho = [];
        let c = ia;
        while (c !== idx(ini.x, ini.y)) {
          caminho.push({ x: c % largura, y: (c / largura) | 0 });
          c = veio[c];
          if (c === -1) return null;
        }
        return caminho.reverse();
      }

      for (const [dx, dy] of DIRS) {
        const nx = atual.x + dx, ny = atual.y + dy;
        if (nx < 0 || ny < 0 || nx >= largura || ny >= altura) continue;
        if (bloqueado(nx, ny)) continue;
        const ni = idx(nx, ny);
        if (fechado[ni]) continue;
        const ng = gCusto[ia] + 1;
        if (ng < gCusto[ni]) {
          gCusto[ni] = ng;
          veio[ni] = ia;
          aberto.push({ x: nx, y: ny, f: ng + this.manhattan(nx, ny, fim.x, fim.y) });
        }
      }
    }
    return null;
  }
};
