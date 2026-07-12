// dogs.js — Campanha Cachorros (GAD §8): territórios, água, brinquedos e IA
// dos rivais. Usa somente os sistemas do motor; nada aqui altera o engine.
var G = globalThis.G || (globalThis.G = {});
G.campanhas = G.campanhas || {};

(function () {
  const CUSTO_MARCA = 30;
  const CORES_RIVAIS = ['#ef7d57', '#41a6f6'];
  const COR_DONO = { player: '#a7f070', neutro: '#ffcd75' };

  // ---------------------------------------------------------------- fases
  // Cada fase é só um arquivo de dados (GAD §7): nome, cidade, objetivo,
  // tempo, eventos, mapa, inimigos, itens, desafios e recompensas.
  const NIVEIS = [
    {
      nome: 'Praça 18h30',
      cidade: 'Bairro Jardim das Táquaras',
      descricao: 'Hora do passeio. Marque mais territórios que o vira-lata rival antes de escurecer.',
      tempo: 120,
      estrelas: [600, 1100, 1600],
      eventos: [],
      objetivos: [
        { tipo: 'territorios', tipoObjetivo: 'principal', desc: 'Mais territórios que o rival', pontos: 400 },
        { tipo: 'brinquedos', tipoObjetivo: 'secundario', desc: 'Brinquedos', alvo: 2, pontos: 150 },
        { tipo: 'marcar', tipoObjetivo: 'secundario', desc: 'Marque 6 vezes', alvo: 6, pontos: 150 }
      ],
      mapa: [
        '##############################',
        '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
        '#,####,,i,,,,####,,,i,,,####,#',
        '#,#..#,,,,,,,#..#,,,,,,,#..#,#',
        '#,####,,,,,,,####,,,,,,,####,#',
        '#,,,,,,,,,,,,,,,,,,,W,,,,,,,,#',
        '#,,,,,==============,,,,,,,,,#',
        '#,,i,,=,,,,,,,,,,,,=,,t,,,,,,#',
        '#,,,,,=,,........,,=,,,,,,,,,#',
        '#,,,,,=,,.t...b..,,=,,,,,,,,,#',
        '#,H,,,=,,........,,=,,,,H,,,,#',
        '#,,,,,=,,...t....,,=,,,,,,,,,#',
        '#,,,,,=,,........,,=,,,,,,,,,#',
        '#,,,,,==============,,,,,,,,,#',
        '#,,,,,,,,,,,,,,,,,,,,,,,,,i,,#',
        '#,##,,,,t,,,,##,,,,,i,,,,b,,,#',
        '#,##,,,,,,,,,##,,W,,,,,,,,,,,#',
        '#,,P,,,,,,,,,,,,,,,,,,,E,,,,,#',
        '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
        '##############################'
      ]
    },
    {
      nome: 'Avenida das Árvores',
      cidade: 'Centro de Taquaritinga do Sul',
      descricao: 'Dois rivais, chuva chegando e uma passeata no caminho. Domine a avenida.',
      tempo: 150,
      estrelas: [800, 1400, 2000],
      eventos: [
        { em: 40, tipo: 'chuva', dur: 25 },
        { em: 78, tipo: 'passeata', dur: 20, dados: { x: 1, y: 5, w: 13, h: 2 } }
      ],
      objetivos: [
        { tipo: 'territorios', tipoObjetivo: 'principal', desc: 'Mais territórios que os rivais', pontos: 400 },
        { tipo: 'brinquedos', tipoObjetivo: 'secundario', desc: 'Brinquedos', alvo: 2, pontos: 150 },
        { tipo: 'roubos', tipoObjetivo: 'secundario', desc: 'Roube 2 territórios', alvo: 2, pontos: 200 }
      ],
      mapa: [
        '##############################',
        '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
        '#,t,,##,,i,,##,,t,,##,,i,,##,#',
        '#,,,,##,,,,,##,,,,,##,,,,,##,#',
        '#,,,,,,,,,,,,,,i,,,,,,,,,,,,,#',
        '#============================#',
        '#============================#',
        '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
        '#,i,,,t,,,,H,,,,,t,,,,i,,,t,,#',
        '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
        '#,####,,,####,,,,####,,,####,#',
        '#,#..#,,,#..#,,,,#..#,,,#..#,#',
        '#,####,,,####,,,,####,,,####,#',
        '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
        '#,,b,,,,,,,,,W,,,,,,,,,,,b,,,#',
        '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
        '#,,t,,,,i,,,,,,,,,i,,,,,,t,,,#',
        '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
        '#,P,,,,,,,,,E,,,,,,,,,E,,,,,,#',
        '##############################'
      ]
    }
  ];

  // ------------------------------------------------------------- helpers
  function chaoVizinho(nivel, x, y) {
    // caractere de chão que substitui um marcador especial no mapa
    const chs = [
      (nivel.mapa[y] || '')[x - 1], (nivel.mapa[y] || '')[x + 1],
      (nivel.mapa[y - 1] || '')[x], (nivel.mapa[y + 1] || '')[x]
    ];
    for (const c of chs) if (c === '.' || c === ',' || c === '=') return c;
    return ',';
  }

  function contarTerritorios(world) {
    const porDono = {};
    for (const t of world.territorios) {
      if (t.dono) porDono[t.dono] = (porDono[t.dono] || 0) + 1;
    }
    let rivalMax = 0;
    for (const [dono, n] of Object.entries(porDono)) {
      if (dono !== 'player' && n > rivalMax) rivalMax = n;
    }
    return { meus: porDono.player || 0, rivalMax, porDono };
  }

  function territorioEm(world, x, y) {
    return world.territorios.find(t => t.x === x && t.y === y) || null;
  }

  function corDoDono(world, dono) {
    if (!dono) return COR_DONO.neutro;
    if (dono === 'player') return COR_DONO.player;
    const e = world.entidades.find(en => en.id === dono);
    return e ? e.cor : COR_DONO.neutro;
  }

  function marcar(world, quem, t) {
    const donoAnterior = t.dono;
    const novoDono = quem.jogador ? 'player' : quem.id;
    if (donoAnterior === novoDono) return;
    t.dono = novoDono;

    if (quem.jogador) {
      world.stats.marcas++;
      let pts = Math.round(100 * t.valor);
      if (donoAnterior) { world.stats.roubos++; pts += 50; }
      G.pontos.add(world, pts, { x: t.x, y: t.y });
    } else if (donoAnterior === 'player') {
      G.mundo.msg(world, 'Roubaram um território seu!');
      G.mundo.addFx(world, '!', t.x, t.y, '#b13e53');
    }
    G.bus.emit('territorio:marcado', { world, territorio: t, quem, donoAnterior });
  }

  // ------------------------------------------------------ IA dos rivais
  // Segue o fluxo do GAD §5: território próximo → vale a pena? → marcar;
  // senão, jogador vulnerável → roubar; senão, reabastecer/vagar.
  function cerebroCachorro(world, ag) {
    const e = ag.e;

    // sem urina suficiente: procura água
    if (e.res.urina.v < CUSTO_MARCA) {
      let agua = null, melhor = Infinity;
      for (const a of world.aguas) {
        const d = G.util.manhattan(e.x, e.y, a.x, a.y);
        if (d < melhor) { melhor = d; agua = a; }
      }
      if (agua) {
        return {
          destino: { x: agua.x, y: agua.y }, canal: 1.1, rotulo: 'bebendo',
          acao: () => G.rec.encher(e, 'urina', 999)
        };
      }
    }

    // escolhe o território mais "valioso" (valor ÷ distância × prioridade)
    const agressao = world.dif.iaAgressao * (e.dados.agressao || 1);
    const jog = world.player;
    let alvo = null, valorAlvo = -1;
    for (const t of world.territorios) {
      if (t.dono === e.id) continue;
      let peso;
      if (!t.dono) {
        peso = 1;
      } else if (t.dono === 'player') {
        // só rouba se o jogador estiver longe (vulnerável)
        const dJog = jog ? G.util.manhattan(jog.x, jog.y, t.x, t.y) : 99;
        peso = (dJog > 5 ? 0.95 : 0.25) * agressao;
      } else {
        peso = 0.45 * agressao; // território de outro rival
      }
      const d = G.util.manhattan(e.x, e.y, t.x, t.y);
      const v = t.valor * peso / (1 + d * 0.12);
      if (v > valorAlvo) { valorAlvo = v; alvo = t; }
    }

    if (alvo) {
      return {
        destino: { x: alvo.x, y: alvo.y }, canal: 0.9, rotulo: 'marcando',
        acao: () => {
          if (alvo.dono === e.id) return; // alguém marcou antes: reavalia
          if (G.rec.consumir(e, 'urina', CUSTO_MARCA)) marcar(world, e, alvo);
        }
      };
    }

    // nada a fazer: vagar
    for (let i = 0; i < 12; i++) {
      const x = G.util.intAleatorio(1, world.W - 2);
      const y = G.util.intAleatorio(1, world.H - 2);
      if (G.mundo.andavel(world, x, y, e)) return { destino: { x, y } };
    }
    return null;
  }

  // ------------------------------------------------------------ campanha
  G.campanhas.dogs = {
    id: 'dogs',
    nome: 'Cachorros',
    icone: '🐕',
    descricao: 'Marque territórios, beba água e roube postes dos rivais na hora do passeio.',
    niveis: NIVEIS,

    recursosHUD: [
      { id: 'urina', nome: 'URINA', cor: '#ffcd75' },
      { id: 'folego', nome: 'FÔLEGO', cor: '#41a6f6' }
    ],

    ajudaControles: 'Setas/WASD move · ESPAÇO (segure) marca território · SHIFT corre · P pausa',

    upgrades: [
      { id: 'bexiga', nome: 'Bexiga de Aço', desc: '+30% de urina máxima', estrelasNec: 2,
        aplicar(w) { w.player.res.urina.max = Math.round(w.player.res.urina.max * 1.3); w.player.res.urina.v = w.player.res.urina.max; } },
      { id: 'patas', nome: 'Patas Rápidas', desc: '+12% de velocidade', estrelasNec: 4,
        aplicar(w) { w.player.vel *= 1.12; } },
      { id: 'faro', nome: 'Faro Fino', desc: 'Brinquedos e água aparecem no minimapa', estrelasNec: 6,
        aplicar(w) { w.faroFino = true; } }
    ],

    preparar(world) {
      world.territorios = [];
      world.aguas = [];
      world.itens = [];
      world.pocas = [];
      world.stats = { marcas: 0, roubos: 0, brinquedos: 0, rivais: 0 };
    },

    andavel(ch) { return ch !== '#'; },

    aoLerTile(world, ch, x, y) {
      const chao = () => chaoVizinho(world.nivel, x, y);
      switch (ch) {
        case 'i': world.territorios.push({ x, y, tipo: 'poste', valor: 1, dono: null }); return chao();
        case 't': world.territorios.push({ x, y, tipo: 'arvore', valor: 1.5, dono: null }); return chao();
        case 'H':
          world.territorios.push({ x, y, tipo: 'hidrante', valor: 2, dono: null });
          world.aguas.push({ x, y });
          return chao();
        case 'W': world.aguas.push({ x, y }); return chao();
        case 'b': world.itens.push({ x, y, tipo: 'brinquedo', pego: false }); return chao();
        case 'P': {
          const p = G.mundo.addEntidade(world, {
            tipo: 'cachorro', jogador: true, x, y, vel: 4.6, cor: '#e8a25c',
            res: G.rec.criar({ urina: { max: 100 }, folego: { max: 100, regen: 16 } }, world.dif.recursos)
          });
          p.dados.nome = 'Caramelo';
          return chao();
        }
        case 'E': {
          const cor = CORES_RIVAIS[world.stats.rivais % CORES_RIVAIS.length];
          const e = G.mundo.addEntidade(world, {
            tipo: 'cachorro', x, y, vel: 4.25, cor,
            res: G.rec.criar({ urina: { max: 100 } })
          });
          e.dados.agressao = 1 + world.stats.rivais * 0.15;
          world.stats.rivais++;
          G.ia.criarAgente(world, e, cerebroCachorro);
          return chao();
        }
      }
      return null;
    },

    // teclas de habilidade do jogador (movimento é genérico no motor)
    controles(world, dt) {
      const p = world.player;

      // correr (SHIFT) gasta fôlego
      if (G.input.segurando('ShiftLeft') || G.input.segurando('ShiftRight')) {
        if (p.res.folego.v > 1) {
          p.boost = { mult: 1.5, t: 0.15 };
          p.res.folego.v = Math.max(0, p.res.folego.v - 30 * dt);
        }
      }

      // marcar território (ESPAÇO, canalizado)
      const t = territorioEm(world, p.x, p.y);
      const podeMarcar = t && t.dono !== 'player' && !p.para;
      if (G.input.segurando('Space') && podeMarcar && !world.canalJogador) {
        if (p.res.urina.v >= CUSTO_MARCA) {
          world.canalJogador = {
            t: 0, dur: 0.8, rotulo: 'MARCANDO...',
            acao: (w) => {
              if (G.rec.consumir(p, 'urina', CUSTO_MARCA)) marcar(w, p, t);
            }
          };
        } else if (G.input.pressionou('Space')) {
          G.mundo.msg(world, 'Sem urina! Procure água.');
        }
      }
      if (!G.input.segurando('Space')) world.canalJogador = null;
    },

    velTile(world, e) {
      const ch = G.mundo.tile(world, e.x, e.y);
      return ch === '.' ? 1.12 : 1; // cachorro adora grama
    },

    update(world, dt) {
      const p = world.player;

      // reabastecimento parado na água / poças
      for (const e of world.entidades) {
        if (world.aguas.some(a => a.x === e.x && a.y === e.y)) {
          G.rec.encher(e, 'urina', 45 * dt);
        }
        if (world.pocas.some(a => a.x === e.x && a.y === e.y)) {
          G.rec.encher(e, 'urina', 35 * dt);
        }
      }

      // coleta de brinquedos
      for (const item of world.itens) {
        if (!item.pego && item.x === p.x && item.y === p.y) {
          item.pego = true;
          world.stats.brinquedos++;
          G.pontos.add(world, 120, { x: item.x, y: item.y });
          G.bus.emit('item:pego', { world, item });
        }
      }
    },

    aoEvento(world, ev, fase) {
      if (ev.tipo === 'chuva') {
        if (fase === 'inicio') {
          world.mods.velGlobal = 0.92; // piso molhado
          // poças viram bebedouros temporários
          world.pocas = [];
          let tentativas = 0;
          while (world.pocas.length < 8 && tentativas++ < 200) {
            const x = G.util.intAleatorio(1, world.W - 2);
            const y = G.util.intAleatorio(1, world.H - 2);
            const ch = G.mundo.tile(world, x, y);
            if ((ch === '.' || ch === ',') && !territorioEm(world, x, y)) {
              world.pocas.push({ x, y });
            }
          }
          G.mundo.msg(world, 'Poças dágua por toda parte!');
        } else {
          world.mods.velGlobal = 1;
        }
      }
    },

    avaliadores: {
      territorios(world) {
        const c = contarTerritorios(world);
        return {
          prog: c.meus,
          texto: c.meus + ' × ' + c.rivalMax,
          feito: !!world.fim && world.fim.resultado === 'vitoria'
        };
      },
      brinquedos(world, o) {
        const n = world.stats.brinquedos;
        return { prog: n, feito: n >= o.alvo };
      },
      marcar(world, o) {
        const n = world.stats.marcas;
        return { prog: n, feito: n >= o.alvo };
      },
      roubos(world, o) {
        const n = world.stats.roubos;
        return { prog: n, feito: n >= o.alvo };
      }
    },

    avaliarFim(world) {
      // vitória antecipada: dominou tudo
      if (world.territorios.length &&
          world.territorios.every(t => t.dono === 'player')) {
        return { resultado: 'vitoria', motivo: 'Dominou todos os territórios do bairro!' };
      }
      return null;
    },

    aoTempoEsgotado(world) {
      const c = contarTerritorios(world);
      if (c.meus > c.rivalMax) {
        return { resultado: 'vitoria', motivo: 'O bairro é seu: ' + c.meus + ' × ' + c.rivalMax + ' territórios.' };
      }
      return { resultado: 'derrota', motivo: 'Os rivais dominaram: ' + c.meus + ' × ' + c.rivalMax + ' territórios.' };
    },

    resumo(world) {
      const c = contarTerritorios(world);
      const totalBrinq = world.itens.length;
      return [
        { texto: 'Territórios: ' + c.meus + ' × ' + c.rivalMax, ok: c.meus > c.rivalMax },
        { texto: 'Marcações feitas: ' + world.stats.marcas, ok: world.stats.marcas > 0 },
        { texto: 'Territórios roubados: ' + world.stats.roubos, ok: world.stats.roubos > 0 },
        { texto: 'Brinquedos: ' + world.stats.brinquedos + '/' + totalBrinq, ok: world.stats.brinquedos >= totalBrinq }
      ];
    },

    // ------------------------------------------------------- desenho
    corTile(ch) {
      switch (ch) {
        case '#': return { base: '#29366f', detalhe: '#3d466b' };
        case '=': return { base: '#333c57', detalhe: '#ffcd75' };
        case '.': return { base: '#38b764', detalhe: 'rgba(0,0,0,.14)' };
        default: return { base: '#566c86' };
      }
    },

    corMinimapa(ch) {
      switch (ch) {
        case '#': return '#1f2438';
        case '=': return '#333c57';
        case '.': return '#2d7d4f';
        default: return '#4a5a75';
      }
    },

    minimapaExtra(ctx, world, mx, my, esc) {
      for (const t of world.territorios) {
        ctx.fillStyle = corDoDono(world, t.dono);
        ctx.fillRect(mx + t.x * esc, my + t.y * esc, esc, esc);
      }
      if (world.faroFino) {
        ctx.fillStyle = '#73eff7';
        for (const a of world.aguas) ctx.fillRect(mx + a.x * esc, my + a.y * esc, esc, esc);
        ctx.fillStyle = '#f4f4f4';
        for (const i of world.itens) {
          if (!i.pego) ctx.fillRect(mx + i.x * esc, my + i.y * esc, esc, esc);
        }
      }
    },

    hudExtra(ctx, world, x, y) {
      const c = contarTerritorios(world);
      ctx.fillStyle = 'rgba(26,28,44,.82)';
      ctx.fillRect(x, y, 96, 13);
      ctx.fillStyle = COR_DONO.player;
      ctx.fillRect(x + 3, y + 3, 7, 7);
      ctx.fillStyle = '#f4f4f4';
      ctx.textAlign = 'left';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(String(c.meus), x + 13, y + 10);
      ctx.fillStyle = '#ef7d57';
      ctx.fillRect(x + 34, y + 3, 7, 7);
      ctx.fillStyle = '#f4f4f4';
      ctx.fillText(String(c.rivalMax), x + 44, y + 10);
      ctx.fillStyle = '#94b0c2';
      ctx.fillText('TERRIT.', x + 58, y + 10);
    },

    desenharMundo(ctx, world) {
      const T = G.TILE;

      // poças (chuva)
      for (const pc of world.pocas) {
        ctx.fillStyle = '#41a6f6';
        ctx.beginPath();
        ctx.ellipse(pc.x * T + T / 2, pc.y * T + T / 2 + 4, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // fontes de água (sem território)
      for (const a of world.aguas) {
        if (territorioEm(world, a.x, a.y)) continue;
        const px = a.x * T, py = a.y * T;
        ctx.fillStyle = '#566c86';
        ctx.fillRect(px + 6, py + 8, 12, 10);
        ctx.fillStyle = '#73eff7';
        ctx.fillRect(px + 8, py + 10, 8, 5);
      }

      // territórios: mancha do dono + objeto
      for (const t of world.territorios) {
        const px = t.x * T, py = t.y * T;
        if (t.dono) {
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = corDoDono(world, t.dono);
          ctx.beginPath();
          ctx.ellipse(px + T / 2, py + T - 4, 9, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (t.tipo === 'poste') {
          ctx.fillStyle = '#94b0c2';
          ctx.fillRect(px + 11, py + 2, 3, 18);
          ctx.fillStyle = '#ffcd75';
          ctx.fillRect(px + 9, py, 7, 4);
        } else if (t.tipo === 'arvore') {
          ctx.fillStyle = '#7a4841';
          ctx.fillRect(px + 10, py + 10, 4, 10);
          ctx.fillStyle = '#257953';
          ctx.beginPath();
          ctx.arc(px + T / 2, py + 8, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#38b764';
          ctx.beginPath();
          ctx.arc(px + T / 2 - 2, py + 6, 5, 0, Math.PI * 2);
          ctx.fill();
        } else { // hidrante
          ctx.fillStyle = '#b13e53';
          ctx.fillRect(px + 8, py + 8, 8, 12);
          ctx.fillRect(px + 10, py + 5, 4, 4);
          ctx.fillStyle = '#ffcd75';
          ctx.fillRect(px + 6, py + 11, 2, 3);
          ctx.fillRect(px + 16, py + 11, 2, 3);
        }
      }

      // brinquedos (ossos)
      for (const i of world.itens) {
        if (i.pego) continue;
        const px = i.x * T, py = i.y * T;
        ctx.fillStyle = '#f4f4f4';
        ctx.fillRect(px + 7, py + 10, 10, 4);
        ctx.fillRect(px + 5, py + 8, 4, 8);
        ctx.fillRect(px + 15, py + 8, 4, 8);
      }
    },

    desenharEntidade(ctx, world, e, px, py) {
      const andando = !!e.para;
      const passo = andando ? Math.sin(e.prog * Math.PI * 2) * 2 : 0;
      const dx = e.dir.dx, olhaEsq = dx < 0;

      // sombra
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      ctx.ellipse(px + 12, py + 20, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // corpo
      ctx.fillStyle = e.cor;
      ctx.fillRect(px + 5, py + 9, 14, 8);
      // cabeça (vira conforme a direção horizontal)
      const hx = olhaEsq ? px + 1 : px + 15;
      ctx.fillRect(hx, py + 5, 8, 8);
      // orelha
      ctx.fillRect(olhaEsq ? hx + 5 : hx, py + 2, 3, 4);
      // focinho
      ctx.fillStyle = '#1a1c2c';
      ctx.fillRect(olhaEsq ? hx : hx + 6, py + 9, 2, 2);
      // rabo
      ctx.fillStyle = e.cor;
      ctx.fillRect(olhaEsq ? px + 18 : px + 3, py + 6 - passo, 3, 5);
      // patas
      ctx.fillRect(px + 6, py + 17 + passo, 3, 4);
      ctx.fillRect(px + 15, py + 17 - passo, 3, 4);
      // coleira do jogador
      if (e.jogador) {
        ctx.fillStyle = '#b13e53';
        ctx.fillRect(olhaEsq ? px + 8 : px + 13, py + 10, 3, 6);
      }

      // canalizando (marcando/bebendo): gotinhas
      const canalizando =
        (e.jogador && world.canalJogador) ||
        world.agentes.some(a => a.e === e && a.canal);
      if (canalizando && world.decorrido % 0.4 < 0.25) {
        ctx.fillStyle = '#ffcd75';
        ctx.fillRect(px + (olhaEsq ? 20 : 1), py + 12, 2, 2);
        ctx.fillRect(px + (olhaEsq ? 22 : 3), py + 16, 2, 2);
      }
    }
  };
})();
