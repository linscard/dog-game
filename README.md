# 18h30

Jogo urbano retrô em que a cidade inteira sai às ruas na mesma hora — inclusive
você. Um único motor, várias campanhas: na **Cachorros** você marca territórios
na hora do passeio; na **SAMU** você corta o trânsito do rush para salvar
pacientes. Implementação de referência do Documento de Arquitetura de Gameplay
(GAD) v1.0.

## Como jogar

Abra `index.html` em qualquer navegador moderno. Sem build, sem dependências.

| Tecla | Cachorros | SAMU |
|---|---|---|
| Setas / WASD | Move | Dirige |
| ESPAÇO (segurar) | Marca território | — |
| SHIFT (segurar) | Corre (gasta fôlego) | Sirene (fura o trânsito) |
| E | — | Toma café (turbo) |
| P / ESC | Pausa | Pausa |

## Validação do GAD (e o que foi assumido)

O documento original foi **validado como viável** — a tese central ("o jogo é
um só; as campanhas apenas mudam as regras e os elementos do cenário") está
provada aqui: as duas campanhas compartilham 100% do motor e diferem apenas em
seus arquivos de campanha. Correções e decisões assumidas:

1. **O GAD não definia mecânica concreta nenhuma** (números, duração, tamanho
   de mapa, condições exatas). Assumido: partidas de 2–3 min, mapas 30×20 em
   grade, relógio temático que começa às 18:30:00.
2. **"Nenhum sistema deve acessar diretamente outro" (§9) foi relaxado de
   propósito.** Event bus puro para movimento/física a cada frame é
   over-engineering e dificulta depuração. Adotado o padrão da indústria:
   sistemas leem estado compartilhado no loop; o barramento (`bus.js`) fica
   para *notificações* (território marcado, paciente salvo, evento iniciado) —
   exatamente o exemplo do §9.
3. **O GAD omitia sistemas obrigatórios**: entrada, renderização, câmera,
   telas (menu/briefing/resultado) e pausa. Foram adicionados.
4. **Fluxo de IA do SAMU (§5) descrevia o jogador, não uma IA.** Reinterpretado:
   na campanha SAMU a IA são os carros do trânsito (mesmo ciclo
   Observar→Planejar→Mover→Executar→Reavaliar do motor); o congestionamento
   emerge da densidade deles.
5. **"Motolância" como recurso (§4) virou melhoria desbloqueável** ("Motolância
   de Apoio": pacientes resistem +12s) — como recurso ativo ela duplicaria o
   veículo do jogador, quebrando a simplicidade de controles exigida no §16.
6. **Progressão (§6) simplificada**: estrelas por fase → melhorias
   desbloqueadas automaticamente por total de estrelas da campanha. Uma loja
   com moedas não passaria no teste do §16 ("mantém partidas rápidas?").
7. **Empate conta como derrota** na campanha Cachorros ("mais territórios que
   o rival" é estrito) — o GAD não tratava empates.
8. **Identidade "18h30"**: o documento nunca explicava o nome. Assumido como o
   horário do rush urbano — hora de passear com o cachorro, pico do trânsito —
   e incorporado ao tema (relógio na HUD, textos, iluminação de fim de tarde).

## Arquitetura (GAD → código)

```
js/core/        bus.js (§9 eventos) · save.js (§13 salvamento) · input.js · util.js
js/engine/      world.js (§7 fases como dados)   movement.js (§4 movimento)
                resources.js (§4 recursos)       ai.js (§4/§5 ciclo de IA)
                worldevents.js (§4 eventos: chuva, passeata)
                objectives.js (§4 objetivos)     scoring.js (§4 pontuação + §6 estrelas)
                hud.js (§14 interface)           render.js · game.js (§3 gameplay loop)
js/campaigns/   dogs.js · samu.js (§8 campanhas: só regras e elementos)
```

- **Fases são dados** (§7): cada fase é um objeto com nome, cidade, tempo,
  eventos agendados, mapa ASCII, objetivos e limiares de estrela. Fase nova =
  entrada nova no array `NIVEIS`, zero código de motor.
- **Eventos** (§4): `chuva` e `passeata` são registrados no motor; cada
  campanha reage via hook `aoEvento` (chuva cria poças para os cachorros, mas
  molha a pista para o SAMU). Evento novo = `G.eventosMundo.registrar(...)`,
  sem tocar nos existentes.
- **Dificuldade** (§10): só multiplica parâmetros (tempo, recursos, reação e
  agressividade da IA). Nunca muda regras.
- **Campanha nova** (§12, ex.: Alienígenas): um arquivo em `js/campaigns/`
  implementando a interface de campanha (recursos, avaliadores de objetivos,
  cérebro de IA, desenho) + um `<script>` no `index.html`.

## Testes

```
node tools/teste-fumaca.js     # integridade dos mapas, alcançabilidade e
                               # simulação headless de partidas completas
node tools/teste-navegador.js  # opcional (requer: npm i playwright):
                               # navega as telas, joga com teclado e
                               # confere que não há erros de console
```
