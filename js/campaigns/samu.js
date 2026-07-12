// samu.js — Campanha SAMU (GAD §8): trânsito, pacientes, hospital, sirene e
// café. Reutiliza movimento, recursos, IA, eventos e objetivos do motor —
// só mudam as regras e os elementos do cenário.
var G = globalThis.G || (globalThis.G = {});
G.campanhas = G.campanhas || {};

(function () {
  const CORES_CARROS = ['#ef7d57', '#41a6f6', '#a7f070', '#ffcd75', '#73eff7', '#94b0c2'];

  const NIVEIS = [
    {
      nome: 'Plantão no Centro',
      cidade: 'Centro de Taquaritinga do Sul',
      descricao: 'Fim de tarde no plantão. Busque os pacientes e leve-os ao hospital antes que seja tarde.',
      tempo: 150,
      estrelas: [1200, 1700, 2200],
      maxPerdidos: 2,
      ocorrencias: { primeiro: 2, intervalo: 32, maxAtivos: 2, timer: 45 },
      eventos: [],
      objetivos: [
        { tipo: 'resgates', tipoObjetivo: 'principal', desc: 'Resgate pacientes', alvo: 3, pontos: 400 },
        { tipo: 'sem_perder', tipoObjetivo: 'secundario', desc: 'Sem perder pacientes', pontos: 200 },
        { tipo: 'rapidos', tipoObjetivo: 'secundario', desc: 'Resgates com folga', alvo: 1, pontos: 150 }
      ],
      mapa: [
        '##############################',
        '#=======p=============C======#',
        '#=####=####=#####=####=#####=#',
        '#=####=####=#####=####=#####=#',
        '#=####=####=#####=####=#####=#',
        '#==TT==============p=========#',
        '#=####=####=#####=####=#####=#',
        '#=####=####X#####=####=#####=#',
        '#=####=####=#####=####=#####=#',
        '#====C======TTTT========p====#',
        '#=####=####=#####=####=#####=#',
        '#=####=####=#####=####p#####=#',
        '#=####=####=#####=####=#####=#',
        '#===p=============C==========#',
        '#=####=####=#####=####=#####=#',
        '#=####=####=#####=####=#####=#',
        '#=####=####=#####=####=#####=#',
        '#=========C===============B==#',
        '##############################',
        '##############################'
      ]
    },
    {
      nome: 'Hora do Rush',
      cidade: 'Avenida Central, 18h30 em ponto',
      descricao: 'Chuva, passeata e o trânsito parado. O plantão mais difícil do mês.',
      tempo: 180,
      estrelas: [1400, 2000, 2600],
      maxPerdidos: 2,
      ocorrencias: { primeiro: 2, intervalo: 26, maxAtivos: 3, timer: 40 },
      eventos: [
        { em: 50, tipo: 'chuva', dur: 30 },
        { em: 90, tipo: 'passeata', dur: 25, dados: { x: 11, y: 2, w: 1, h: 7 } }
      ],
      objetivos: [
        { tipo: 'resgates', tipoObjetivo: 'principal', desc: 'Resgate pacientes', alvo: 5, pontos: 400 },
        { tipo: 'sem_perder', tipoObjetivo: 'secundario', desc: 'Sem perder pacientes', pontos: 250 },
        { tipo: 'rapidos', tipoObjetivo: 'secundario', desc: 'Resgates com folga', alvo: 3, pontos: 200 }
      ],
      mapa: [
        '##############################',
        '#====T=========p======C======#',
        '#=####=####=#####=####=#####=#',
        '#=####C####=#####=####=#####=#',
        '#=####=####=#####=####=#####=#',
        '#=p====TTT===========C====T==#',
        '#=####=####=#####=####=#####=#',
        '#=####=####=#####=####=#####=#',
        '#=####=####=#####=####=#####=#',
        '#======C====TTTT=====p=======#',
        '#=####=####=#####=####=#####=#',
        '#=####=####=#####X####=#####=#',
        '#=####=####p#####=####=#####=#',
        '#=====T=============C===p====#',
        '#=####=####=#####=####=#####=#',
        '#=####=####=#####=####=#####=#',
        '#=####=####=#####=####C#####=#',
        '#=p=======C=========B========#',
        '##############################',
        '##############################'
      ]
    }
  ];

  // ------------------------------------------------------ IA dos carros
  // Mesmo ciclo do motor (GAD §5): aqui o "cérebro" só passeia pelas ruas;
  // o congestionamento emerge da densidade de carros.
  function cerebroCarro(world, ag) {
    const e = ag.e;
    for (let i = 0; i < 16; i++) {
      const x = G.util.intAleatorio(1, world.W - 2);
      const y = G.util.intAleatorio(1, world.H - 2);
      if (!G.mundo.andavel(world, x, y, e)) continue;
      const d = G.util.manhattan(e.x, e.y, x, y);
      if (d >= 4 && d <= 16) return { destino: { x, y } };
    }
    return null;
  }

  function novaOcorrencia(world) {
    const livres = world.pontosPaciente.filter(p =>
      !world.pacientes.some(a => a.x === p.x && a.y === p.y) &&
      !(world.player.x === p.x && world.player.y === p.y));
    if (!livres.length) return;
    const ponto = G.util.escolha(livres);
    const timer = world.nivel.ocorrencias.timer + (world.bonusPaciente || 0);
    world.pacientes.push({ x: ponto.x, y: ponto.y, timer, max: timer });
    G.mundo.msg(world, 'Nova ocorrência!');
    G.mundo.addFx(world, '+', ponto.x, ponto.y, '#b13e53');
    G.bus.emit('ocorrencia:nova', { world, ponto });
  }

  // ------------------------------------------------------------ campanha
  G.campanhas.samu = {
    id: 'samu',
    nome: 'SAMU',
    icone: '🚑',
    descricao: 'Corte o trânsito das 18h30, use a sirene com sabedoria e salve todo mundo.',
    niveis: NIVEIS,

    recursosHUD: [
      { id: 'sirene', nome: 'SIRENE', cor: '#b13e53' },
      { id: 'cafe', nome: 'CAFÉ', cor: '#e8a25c', discreto: true }
    ],

    ajudaControles: 'Setas/WASD dirige · SHIFT (segure) sirene · E toma café · P pausa',

    botoesTouch: [
      { code: 'ShiftLeft', rotulo: 'SIRENE' },
      { code: 'KeyE', rotulo: 'CAFÉ' }
    ],

    upgrades: [
      { id: 'cafe2', nome: 'Café Duplo', desc: '+1 dose de café por plantão', estrelasNec: 2,
        aplicar(w) { w.player.res.cafe.max = 3; w.player.res.cafe.v = 3; } },
      { id: 'sirene2', nome: 'Sirene Reforçada', desc: 'Sirene gasta 35% menos', estrelasNec: 4,
        aplicar(w) { w.drenoSirene = 16 * 0.65; } },
      { id: 'moto', nome: 'Motolância de Apoio', desc: 'Pacientes resistem +12s', estrelasNec: 6,
        aplicar(w) { w.bonusPaciente = 12; } }
    ],

    preparar(world) {
      world.pacientes = [];
      world.pontosPaciente = [];
      world.tilesLentos = [];
      world.hospital = null;
      world.sireneAtiva = false;
      world.drenoSirene = 16;
      world.bonusPaciente = 0;
      world.stats = {
        salvos: 0, perdidos: 0, rapidos: 0, carregando: null,
        proxOcorrencia: null
      };
    },

    andavel(ch) { return ch === '=' || ch === 'T' || ch === 'X'; },

    aoLerTile(world, ch, x, y) {
      switch (ch) {
        case 'p': world.pontosPaciente.push({ x, y }); return '=';
        case 'T': world.tilesLentos.push({ x, y }); return null; // mantém 'T'
        case 'X': world.hospital = { x, y }; return null;        // mantém 'X'
        case 'B': {
          G.mundo.addEntidade(world, {
            tipo: 'ambulancia', jogador: true, x, y, vel: 6, cor: '#f4f4f4',
            res: G.rec.criar({ sirene: { max: 100 }, cafe: { max: 2 } }, world.dif.recursos)
          });
          // café é contado em doses inteiras, não percentual
          world.player.res.cafe.max = Math.max(1, Math.round(2 * world.dif.recursos));
          world.player.res.cafe.v = world.player.res.cafe.max;
          return '=';
        }
        case 'C': {
          const e = G.mundo.addEntidade(world, {
            tipo: 'carro', x, y, vel: 2 + Math.random() * 0.8,
            cor: G.util.escolha(CORES_CARROS)
          });
          G.ia.criarAgente(world, e, cerebroCarro);
          return '=';
        }
      }
      return null;
    },

    controles(world, dt) {
      const p = world.player;

      // sirene: segura SHIFT; recurso limitado com recarga lenta
      world.sireneAtiva = false;
      if ((G.input.segurando('ShiftLeft') || G.input.segurando('ShiftRight')) &&
          p.res.sirene.v > 0.5) {
        world.sireneAtiva = true;
        p.res.sirene.v = Math.max(0, p.res.sirene.v - world.drenoSirene * dt);
      } else {
        G.rec.encher(p, 'sirene', 3 * dt);
      }

      // café: dose única de velocidade
      if (G.input.pressionou('KeyE')) {
        if (G.rec.consumir(p, 'cafe', 1)) {
          p.boost = { mult: 1.6, t: 3 };
          G.mundo.msg(world, 'Cafezinho! Acelera!');
        } else {
          G.mundo.msg(world, 'Acabou o café do plantão...');
        }
      }
    },

    velTile(world, e) {
      const ch = G.mundo.tile(world, e.x, e.y);
      if (e.jogador) {
        if (world.sireneAtiva) return 1; // sirene fura o trânsito
        let m = ch === 'T' ? 0.5 : 1;
        const carros = G.mundo.entidadesEm(world, e.x, e.y, 'carro').length +
          (e.para ? G.mundo.entidadesEm(world, e.para.x, e.para.y, 'carro').length : 0);
        if (carros > 0) m *= Math.max(0.35, Math.pow(0.55, carros));
        return m;
      }
      return ch === 'T' ? 0.6 : 1; // carros também sofrem no congestionamento
    },

    update(world, dt) {
      const p = world.player;
      const st = world.stats;
      const oc = world.nivel.ocorrencias;

      // agenda de ocorrências (GAD §5: "Receber ocorrência")
      if (st.proxOcorrencia == null) st.proxOcorrencia = oc.primeiro;
      st.proxOcorrencia -= dt;
      if (st.proxOcorrencia <= 0 && world.pacientes.length < oc.maxAtivos) {
        novaOcorrencia(world);
        st.proxOcorrencia = oc.intervalo;
      }

      // carros encostam quando a sirene se aproxima
      for (const e of world.entidades) {
        if (e.tipo !== 'carro') continue;
        e.paralisado = world.sireneAtiva &&
          G.util.dist(e.x, e.y, p.x, p.y) <= 3.2;
      }

      // relógio dos pacientes (na rua e a bordo)
      for (let i = world.pacientes.length - 1; i >= 0; i--) {
        const pac = world.pacientes[i];
        pac.timer -= dt;
        if (pac.timer <= 0) {
          world.pacientes.splice(i, 1);
          st.perdidos++;
          G.pontos.add(world, -100, { x: pac.x, y: pac.y });
          G.mundo.msg(world, 'Paciente perdido...');
          G.bus.emit('paciente:perdido', { world });
        } else if (!st.carregando && pac.x === p.x && pac.y === p.y) {
          world.pacientes.splice(i, 1);
          st.carregando = pac;
          G.mundo.msg(world, 'Paciente a bordo! Corra ao hospital.');
          G.bus.emit('paciente:embarcado', { world });
        }
      }
      if (st.carregando) {
        st.carregando.timer -= dt;
        if (st.carregando.timer <= 0) {
          st.carregando = null;
          st.perdidos++;
          G.pontos.add(world, -100, { x: p.x, y: p.y });
          G.mundo.msg(world, 'Não deu tempo...');
          G.bus.emit('paciente:perdido', { world });
        } else if (p.x === world.hospital.x && p.y === world.hospital.y) {
          const folga = st.carregando.timer;
          st.salvos++;
          if (folga >= 15) st.rapidos++;
          st.carregando = null;
          G.pontos.add(world, 300 + Math.round(folga * 8), { x: p.x, y: p.y });
          G.mundo.msg(world, 'Paciente salvo!');
          G.bus.emit('paciente:salvo', { world, folga });
        }
      }
    },

    aoEvento(world, ev, fase) {
      if (ev.tipo === 'chuva') {
        if (fase === 'inicio') {
          world.mods.velGlobal = 0.85; // pista molhada: todo mundo mais lento
          G.mundo.msg(world, 'Pista molhada, trânsito pior!');
        } else {
          world.mods.velGlobal = 1;
        }
      } else if (ev.tipo === 'passeata' && fase === 'inicio') {
        G.mundo.msg(world, 'Rua bloqueada! Busque outra rota.');
      }
    },

    avaliadores: {
      resgates(world, o) {
        const n = world.stats.salvos;
        return { prog: n, feito: n >= o.alvo };
      },
      sem_perder(world) {
        return {
          texto: world.stats.perdidos + ' perd.',
          feito: !!world.fim && world.fim.resultado === 'vitoria' && world.stats.perdidos === 0
        };
      },
      rapidos(world, o) {
        const n = world.stats.rapidos;
        return { prog: n, feito: n >= o.alvo };
      }
    },

    avaliarFim(world) {
      const alvo = world.nivel.objetivos[0].alvo;
      if (world.stats.salvos >= alvo) {
        return { resultado: 'vitoria', motivo: 'Todos os chamados atendidos. Plantão de herói!' };
      }
      if (world.stats.perdidos >= world.nivel.maxPerdidos) {
        return { resultado: 'derrota', motivo: 'Pacientes demais perdidos. O plantão acabou mal.' };
      }
      return null;
    },

    aoTempoEsgotado(world) {
      return {
        resultado: 'derrota',
        motivo: 'O turno acabou com ' + world.stats.salvos + ' resgate(s) — a meta era ' +
          world.nivel.objetivos[0].alvo + '.'
      };
    },

    resumo(world) {
      return [
        { texto: 'Pacientes salvos: ' + world.stats.salvos, ok: world.stats.salvos > 0 },
        { texto: 'Pacientes perdidos: ' + world.stats.perdidos, ok: world.stats.perdidos === 0 },
        { texto: 'Resgates com folga: ' + world.stats.rapidos, ok: world.stats.rapidos > 0 }
      ];
    },

    // ------------------------------------------------------- desenho
    corTile(ch) {
      switch (ch) {
        case '#': return { base: '#29366f', detalhe: '#3d466b' };
        case '=': return { base: '#333c57', detalhe: '#ffcd75' };
        case 'T': return { base: '#41304b' };
        case 'X': return { base: '#94b0c2' };
        default: return { base: '#566c86' };
      }
    },

    corMinimapa(ch) {
      switch (ch) {
        case '#': return '#1f2438';
        case 'T': return '#5d275d';
        case 'X': return '#b13e53';
        default: return '#4a5a75';
      }
    },

    minimapaExtra(ctx, world, mx, my, esc) {
      // pacientes piscam em vermelho
      if (world.decorrido % 0.5 < 0.3) {
        ctx.fillStyle = '#b13e53';
        for (const pac of world.pacientes) {
          ctx.fillRect(mx + pac.x * esc - 1, my + pac.y * esc - 1, esc + 2, esc + 2);
        }
      }
    },

    hudExtra(ctx, world, x, y) {
      const st = world.stats;
      ctx.fillStyle = 'rgba(26,28,44,.82)';
      ctx.fillRect(x, y, 96, st.carregando ? 26 : 13);
      ctx.textAlign = 'left';
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#a7f070';
      ctx.fillText('SALVOS ' + st.salvos, x + 3, y + 10);
      ctx.fillStyle = st.perdidos ? '#b13e53' : '#94b0c2';
      ctx.fillText('PERD. ' + st.perdidos, x + 55, y + 10);
      if (st.carregando) {
        const pisca = world.decorrido % 0.6 < 0.35;
        ctx.fillStyle = pisca ? '#b13e53' : '#f4f4f4';
        ctx.fillText('A BORDO ' + Math.ceil(st.carregando.timer) + 's', x + 3, y + 22);
      }
    },

    desenharMundo(ctx, world) {
      const T = G.TILE;

      // cones nos trechos congestionados
      for (const tl of world.tilesLentos) {
        const px = tl.x * T, py = tl.y * T;
        ctx.fillStyle = '#ef7d57';
        ctx.fillRect(px + 4, py + 16, 4, 5);
        ctx.fillRect(px + 16, py + 4, 4, 5);
      }

      // hospital
      if (world.hospital) {
        const px = world.hospital.x * T, py = world.hospital.y * T;
        ctx.fillStyle = '#f4f4f4';
        ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
        ctx.fillStyle = '#b13e53';
        ctx.fillRect(px + T / 2 - 2, py + 5, 4, 14);
        ctx.fillRect(px + 5, py + T / 2 - 2, 14, 4);
      }

      // pacientes esperando (com barrinha de tempo)
      for (const pac of world.pacientes) {
        const px = pac.x * T, py = pac.y * T;
        const pisca = world.decorrido % 0.5 < 0.3;
        ctx.fillStyle = '#e8c39e';
        ctx.fillRect(px + 9, py + 6, 6, 5);   // cabeça
        ctx.fillStyle = '#41a6f6';
        ctx.fillRect(px + 8, py + 11, 8, 8);  // corpo
        if (pisca) {
          ctx.fillStyle = '#b13e53';
          ctx.fillRect(px + 17, py + 2, 5, 5);
          ctx.fillStyle = '#f4f4f4';
          ctx.fillRect(px + 19, py + 3, 1, 3);
          ctx.fillRect(px + 18, py + 4, 3, 1);
        }
        const frac = G.util.clamp(pac.timer / pac.max, 0, 1);
        ctx.fillStyle = '#10121f';
        ctx.fillRect(px + 4, py - 3, 16, 3);
        ctx.fillStyle = frac < 0.3 ? '#b13e53' : '#a7f070';
        ctx.fillRect(px + 4, py - 3, 16 * frac, 3);
      }
    },

    desenharEntidade(ctx, world, e, px, py) {
      // sombra
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      ctx.ellipse(px + 12, py + 20, 9, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      const horizontal = e.dir.dy === 0;
      const cw = horizontal ? 18 : 12, chh = horizontal ? 12 : 18;
      const cx = px + (24 - cw) / 2, cy = py + (24 - chh) / 2;

      if (e.tipo === 'ambulancia') {
        ctx.fillStyle = '#f4f4f4';
        ctx.fillRect(cx, cy, cw, chh);
        ctx.fillStyle = '#b13e53'; // faixa
        if (horizontal) ctx.fillRect(cx, cy + chh / 2 - 1, cw, 3);
        else ctx.fillRect(cx + cw / 2 - 1, cy, 3, chh);
        ctx.fillStyle = '#41a6f6'; // para-brisa
        if (horizontal) ctx.fillRect(e.dir.dx >= 0 ? cx + cw - 5 : cx + 1, cy + 2, 4, chh - 4);
        else ctx.fillRect(cx + 2, e.dir.dy >= 0 ? cy + chh - 5 : cy + 1, cw - 4, 4);
        // giroflex
        if (world.sireneAtiva) {
          const alterna = (world.decorrido * 6 | 0) % 2 === 0;
          ctx.fillStyle = alterna ? '#b13e53' : '#41a6f6';
          ctx.fillRect(px + 9, py + 8, 6, 6);
          ctx.globalAlpha = 0.25;
          ctx.beginPath();
          ctx.arc(px + 12, py + 11, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = '#b13e53';
          ctx.fillRect(px + 10, py + 9, 4, 4);
        }
      } else { // carro
        ctx.fillStyle = e.cor;
        ctx.fillRect(cx + 1, cy + 1, cw - 2, chh - 2);
        ctx.fillStyle = '#29366f';
        if (horizontal) ctx.fillRect(cx + cw / 2 - 3, cy + 2, 6, chh - 4);
        else ctx.fillRect(cx + 2, cy + chh / 2 - 3, cw - 4, 6);
        if (e.paralisado) { // encostado para a sirene
          ctx.fillStyle = '#ffcd75';
          ctx.fillRect(px + 10, py - 2, 4, 4);
        }
      }
    }
  };
})();
