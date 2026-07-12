// teste-navegador.js — teste de fumaça no navegador (opcional).
// Requer: npm i playwright  (e navegadores instalados: npx playwright install chromium)
// Abre o jogo, navega menu → briefing → partida nas duas campanhas, joga com
// teclado e confere que não há erros de console.
'use strict';

const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 780 } });

  const erros = [];
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  page.on('pageerror', e => erros.push(String(e)));

  const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
  await page.goto(url);
  await page.waitForTimeout(500);

  // ---- campanha Cachorros ----
  await page.click('[data-camp="dogs"]');
  await page.click('[data-fase="0"]');
  await page.click('#btn-comecar');
  await page.waitForTimeout(4200); // contagem regressiva

  for (const [tecla, ms] of [['ArrowRight', 900], ['ArrowUp', 700], ['ArrowRight', 900]]) {
    await page.keyboard.down(tecla);
    await page.waitForTimeout(ms);
    await page.keyboard.up(tecla);
  }
  await page.keyboard.down('Space'); // tenta marcar
  await page.waitForTimeout(1200);
  await page.keyboard.up('Space');

  await page.keyboard.press('KeyP'); // pausa
  await page.keyboard.press('KeyM'); // sai ao menu
  await page.waitForTimeout(400);

  // ---- campanha SAMU ----
  await page.click('[data-camp="samu"]');
  await page.click('[data-fase="0"]');
  await page.click('#btn-comecar');
  await page.waitForTimeout(4200);
  await page.keyboard.down('ArrowLeft');
  await page.keyboard.down('ShiftLeft'); // sirene
  await page.waitForTimeout(1500);
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('KeyE');     // café
  await page.waitForTimeout(600);

  const estado = await page.evaluate(() => ({
    fase: G.jogo.world && G.jogo.world.fase,
    campanha: G.jogo.world && G.jogo.world.campanha.id,
    sirene: G.jogo.world && Math.round(G.jogo.world.player.res.sirene.v),
    boost: G.jogo.world && !!G.jogo.world.player.boost
  }));
  console.log('estado final:', JSON.stringify(estado));

  await browser.close();
  if (erros.length) {
    console.error('ERROS DE CONSOLE:\n' + erros.join('\n'));
    process.exit(1);
  }
  if (estado.fase !== 'jogando' || !estado.boost || estado.sirene >= 100) {
    console.error('Estado inesperado: ' + JSON.stringify(estado));
    process.exit(1);
  }
  console.log('NAVEGADOR OK ✔ — sem erros de console');
})().catch(e => { console.error(e); process.exit(1); });
