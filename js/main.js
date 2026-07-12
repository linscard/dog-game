// main.js — boot, telas de UI (menu, fases, briefing, resultado, progressão)
// e o loop de quadros. As telas seguem o fluxo do GAD §3.
var G = globalThis.G || (globalThis.G = {});

(function () {
  if (typeof document === 'undefined') return; // permite testes headless

  const ui = () => document.getElementById('ui');

  function tela(html) {
    ui().innerHTML = '<div class="tela-ui"><div class="caixa">' + html + '</div></div>';
  }

  function fecharTelas() { ui().innerHTML = ''; }

  function estrelasTxt(n, total) {
    return '★'.repeat(n) + '☆'.repeat((total || 3) - n);
  }

  // ------------------------------------------------------------- menu
  function telaMenu() {
    const dif = G.save.dados.dificuldade;
    const cards = Object.values(G.campanhas).map(c => {
      const total = c.niveis.length * 3;
      const feitas = G.save.estrelasCampanha(c.id);
      return '<div class="cartao" data-camp="' + c.id + '">' +
        '<div class="icone">' + c.icone + '</div>' +
        '<h3>' + c.nome + '</h3><p>' + c.descricao + '</p>' +
        '<div class="estrelas">' + feitas + '/' + total + ' ★</div></div>';
    }).join('');

    const difBtns = Object.values(G.DIFICULDADES).map(d =>
      '<button class="btn mini' + (d.id === dif ? ' ativo' : '') + '" data-dif="' + d.id + '">' +
      d.nome + '</button>').join('');

    tela(
      '<h1>18h30</h1>' +
      '<p class="sub">A cidade inteira sai às ruas na mesma hora. Você também.</p>' +
      '<div class="cartoes">' + cards + '</div>' +
      '<h3>Dificuldade</h3><div>' + difBtns + '</div>' +
      '<div style="margin-top:14px"><button class="btn mini" id="btn-prog">Progressão</button></div>' +
      '<p class="rodape">Um motor, muitas campanhas — jogos urbanos retrô.</p>'
    );

    for (const el of ui().querySelectorAll('[data-camp]')) {
      el.onclick = () => telaFases(el.dataset.camp);
    }
    for (const el of ui().querySelectorAll('[data-dif]')) {
      el.onclick = () => { G.save.setDificuldade(el.dataset.dif); telaMenu(); };
    }
    document.getElementById('btn-prog').onclick = telaProgressao;
  }

  // ------------------------------------------------------------- fases
  function telaFases(campId) {
    const c = G.campanhas[campId];
    const linhas = c.niveis.map((n, i) => {
      const id = campId + '-' + (i + 1);
      const estrelas = G.save.estrelasFase(id);
      const travada = i > 0 && G.save.estrelasFase(campId + '-' + i) < 1;
      return '<div class="fase-item' + (travada ? ' travada' : '') + '" data-fase="' + i + '"' +
        (travada ? '' : ' data-livre="1"') + '>' +
        '<div><div class="nome">' + (i + 1) + '. ' + n.nome + (travada ? ' 🔒' : '') + '</div>' +
        '<div class="cidade">' + n.cidade + '</div></div>' +
        '<div class="estrelas">' + estrelasTxt(estrelas) + '</div></div>';
    }).join('');

    tela(
      '<h2>' + c.icone + ' ' + c.nome + '</h2>' +
      '<p class="sub">' + c.descricao + '</p>' +
      '<div class="lista-fases">' + linhas + '</div>' +
      '<button class="btn" id="btn-voltar">Voltar</button>'
    );

    for (const el of ui().querySelectorAll('[data-livre]')) {
      el.onclick = () => telaBriefing(campId, Number(el.dataset.fase));
    }
    document.getElementById('btn-voltar').onclick = telaMenu;
  }

  // --------------------------------------------------------- briefing
  // "Objetivo apresentado" antes da contagem regressiva (GAD §3)
  function telaBriefing(campId, idx) {
    const c = G.campanhas[campId];
    const n = c.niveis[idx];
    const objetivos = n.objetivos.map(o =>
      '<li>' + (o.tipoObjetivo === 'principal' ? '<b>' + o.desc + '</b>' : o.desc) +
      (o.alvo ? ' (' + o.alvo + ')' : '') + '</li>').join('');
    const eventos = (n.eventos || []).map(ev =>
      (G.eventosMundo.tipos[ev.tipo] || { nome: ev.tipo }).nome).join(', ');

    const estrelasCamp = G.save.estrelasCampanha(campId);
    const melhorias = (c.upgrades || [])
      .filter(u => estrelasCamp >= u.estrelasNec)
      .map(u => '<span class="novidade">' + u.nome + '</span>').join('');

    tela(
      '<h2>' + n.nome + '</h2>' +
      '<p class="sub">' + n.cidade + ' · ' + Math.round(n.tempo) + 's</p>' +
      '<p>' + n.descricao + '</p>' +
      '<h3>Objetivos</h3><ul class="linhas">' + objetivos + '</ul>' +
      (eventos ? '<h3>Previsão para hoje</h3><p>' + eventos + '</p>' : '') +
      (melhorias ? '<h3>Melhorias ativas</h3><div>' + melhorias + '</div>' : '') +
      '<h3>Controles</h3><p>' + c.ajudaControles + '</p>' +
      '<div style="margin-top:16px">' +
      '<button class="btn destaque" id="btn-comecar">Começar</button>' +
      '<button class="btn" id="btn-voltar">Voltar</button></div>'
    );

    document.getElementById('btn-comecar').onclick = () => {
      fecharTelas();
      G.jogo.iniciarFase(campId, idx);
    };
    document.getElementById('btn-voltar').onclick = () => telaFases(campId);
  }

  // -------------------------------------------------------- resultado
  function telaResultado(info) {
    const resumo = info.resumo.map(l =>
      '<li class="' + (l.ok ? 'ok' : 'falha') + '">' + l.texto + '</li>').join('');
    const novas = info.novasMelhorias.map(u =>
      '<span class="novidade">🏆 ' + u.nome + ' — ' + u.desc + '</span>').join('<br>');

    const proximaLivre = info.vitoria && info.temProxima;
    tela(
      '<h2>' + (info.vitoria ? 'VITÓRIA!' : 'DERROTA') + '</h2>' +
      '<p class="sub">' + info.motivo + '</p>' +
      '<div class="resultado-estrelas">' + estrelasTxt(info.estrelas) + '</div>' +
      '<div class="resultado-pontos">' + info.score + ' pontos</div>' +
      '<ul class="linhas">' + resumo + '</ul>' +
      (novas ? '<h3>Recompensas</h3><div>' + novas + '</div>' : '') +
      '<div style="margin-top:16px">' +
      (proximaLivre ? '<button class="btn destaque" id="btn-proxima">Próxima fase</button>' : '') +
      '<button class="btn" id="btn-repetir">Jogar de novo</button>' +
      '<button class="btn" id="btn-menu">Menu</button></div>'
    );

    if (proximaLivre) {
      document.getElementById('btn-proxima').onclick = () =>
        telaBriefing(info.campId, info.nivelIdx + 1);
    }
    document.getElementById('btn-repetir').onclick = () =>
      telaBriefing(info.campId, info.nivelIdx);
    document.getElementById('btn-menu').onclick = () => {
      G.jogo.sairParaMenu();
    };
  }

  // ------------------------------------------------------- progressão
  function telaProgressao() {
    const blocos = Object.values(G.campanhas).map(c => {
      const estrelas = G.save.estrelasCampanha(c.id);
      const ups = (c.upgrades || []).map(u => {
        const tem = estrelas >= u.estrelasNec;
        return '<li class="' + (tem ? 'ok' : '') + '">' + u.nome + ' — ' + u.desc +
          ' <span style="color:#94b0c2">(' + u.estrelasNec + '★)</span></li>';
      }).join('');
      return '<h3>' + c.icone + ' ' + c.nome + ' · ' + estrelas + '★</h3>' +
        '<ul class="linhas">' + ups + '</ul>';
    }).join('');

    tela(
      '<h2>Progressão</h2>' +
      '<p class="sub">Experiência total: ' + G.save.dados.xp + ' XP</p>' +
      blocos +
      '<button class="btn" id="btn-voltar">Voltar</button>'
    );
    document.getElementById('btn-voltar').onclick = telaMenu;
  }

  // ------------------------------------------------------------- boot
  function boot() {
    G.save.carregar();
    G.input.init();

    const canvas = document.getElementById('tela');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    G.jogo.aoTerminar = telaResultado;
    G.jogo.aoSairMenu = telaMenu;

    telaMenu();

    let ultimo = performance.now();
    function frame(agora) {
      const dt = Math.min((agora - ultimo) / 1000, 0.1);
      ultimo = agora;
      G.jogo.update(dt);
      G.input.fimDoFrame();
      G.jogo.desenhar(ctx);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
