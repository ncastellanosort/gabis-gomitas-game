// Pruebas de lógica sin navegador:  node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { TILE } from '../src/level.js';
import { createGomitasLevel } from '../src/levels/gomitas.js';
import { createPipuLevel } from '../src/levels/pipu.js';
import { Player } from '../src/player.js';
import { Game, STEP } from '../src/game.js';
import { solveRoute, solveTargets, search, snap, touches } from './solver.mjs';

const level = createGomitasLevel();
const pipu = createPipuLevel();
const NONE = { left: false, right: false, jump: false };
const run = (game, input, seconds) => { for (let i = 0; i < seconds / STEP; i++) game.step(STEP, input); };

test('movimiento, gravedad y colisiones', () => {
  const p = new Player(level, CONFIG.physics);
  const x0 = p.x;
  for (let i = 0; i < 120; i++) p.update(STEP, { right: true });
  assert.ok(p.x > x0 + 60, 'avanza a la derecha');
  assert.equal(p.y, level.start.y, 'sigue sobre el suelo');
  for (let i = 0; i < 240; i++) p.update(STEP, { left: true });
  assert.ok(p.x < x0, 'avanza a la izquierda');
  for (let i = 0; i < 600; i++) p.update(STEP, { left: true });
  assert.ok(p.x >= 5, 'no atraviesa el borde del nivel');

  // Salto: sube, baja y aterriza en el mismo suelo.
  let top = p.y;
  p.update(STEP, { jump: true });
  for (let i = 0; i < 200; i++) { p.update(STEP, { jump: true }); top = Math.min(top, p.y); }
  assert.ok(level.start.y - top > 45, `salto alto (${level.start.y - top}px)`);
  assert.equal(p.y, level.start.y);
  assert.ok(p.onGround);
  // Mantener pulsado no produce saltos infinitos.
  for (let i = 0; i < 200; i++) p.update(STEP, { jump: true });
  assert.equal(p.y, level.start.y, 'sin saltos repetidos al mantener');

  // Salto corto al soltar pronto.
  let top2 = p.y;
  p.update(STEP, NONE);
  p.update(STEP, { jump: true });
  for (let i = 0; i < 200; i++) { p.update(STEP, NONE); top2 = Math.min(top2, p.y); }
  assert.ok(level.start.y - top2 < level.start.y - top - 15, 'el salto corto es más bajo');

  // Pared: la colina de la zona 3 (2 casillas de alto) no se atraviesa caminando.
  p.reset(86 * TILE, 12 * TILE);
  for (let i = 0; i < 400; i++) p.update(STEP, { right: true });
  assert.ok(p.x <= 88 * TILE - 5 + 0.01, 'la pared detiene');
});

let route;
test('el nivel se puede completar (todas las gomitas y la meta)', () => {
  route = solveRoute(level, CONFIG.physics);
  assert.ok(route.ok, `tramo imposible: ${route.failed}`);
  console.log('   ruta:', route.legs.map((l) => `${l.name} ${(l.inputs.length * STEP).toFixed(1)}s`).join(' · '));
});

test('se puede volver atrás desde la meta hasta cada gomita', () => {
  const p = new Player(level, CONFIG.physics);
  p.reset(level.goalX + 40, 12 * TILE);
  let state = snap(p);
  for (const g of [...level.gomitas].reverse()) {
    const res = search(level, CONFIG.physics, state, touches(g), { minX: g.x - 260, maxX: state[0] + 260 });
    assert.ok(res, `no se puede volver a la gomita en x=${g.x}`);
    state = res.end;
  }
});

test('partida completa: gomitas, emociones, victoria y reinicio', () => {
  const events = [];
  const game = new Game(CONFIG, level, (name, data) => events.push({ name, data }));
  game.start();
  const moods = [game.mood];
  let wonEarly = false;
  for (const input of route.inputs) {
    game.step(STEP, input);
    if (game.mood !== moods[moods.length - 1]) moods.push(game.mood);
    if (game.count < game.total && game.state !== 'playing') wonEarly = true;
  }
  assert.equal(game.count, 5, 'recoge las 5 gomitas');
  assert.deepEqual(moods, [0, 1, 2, 3, 4, 5], 'la emoción cambia con cada gomita');
  assert.equal(events.filter((e) => e.name === 'gomita').length, 5, 'cada gomita cuenta una sola vez');
  assert.ok(!wonEarly, 'no hay victoria antes de tiempo');
  assert.equal(game.state, 'ending', 'la escena final empieza al llegar con todo');

  // Los controles ya no mueven a la protagonista y la escena no se repite.
  run(game, { left: true, jump: true }, 14);
  assert.equal(game.state, 'won');
  assert.equal(events.filter((e) => e.name === 'endingStart').length, 1, 'escena final una sola vez');
  assert.equal(events.filter((e) => e.name === 'bigText').length, 1);
  assert.equal(events.filter((e) => e.name === 'won').length, 1);
  assert.ok(Math.abs(game.player.x - game.npc.x) < 30, 'terminan juntos');

  // Reinicio completo.
  game.start();
  assert.equal(game.state, 'playing');
  assert.equal(game.count, 0);
  assert.equal(game.mood, 0);
  assert.equal(game.heartCount, 0);
  assert.equal(game.ending, null);
  assert.ok(game.gomitas.every((g) => !g.collected));
  assert.equal(game.player.x, level.start.x);
  assert.equal(game.npc.spot, 0);
  run(game, { right: true }, 1);
  assert.ok(game.player.x > level.start.x + 50, 'los controles responden tras reiniciar');
});

test('llegar a la meta sin todas las gomitas no da la victoria', () => {
  const events = [];
  const game = new Game(CONFIG, level, (name, data) => events.push({ name, data }));
  game.start();
  game.player.reset(level.goalX - 30, 12 * TILE);
  run(game, { right: true }, 3);
  assert.equal(game.state, 'playing');
  assert.equal(game.ending, null);
  assert.ok(events.some((e) => e.name === 'missing' && e.data.missing === 5), 'él avisa de que faltan gomitas');
  assert.equal(game.npc.spot, level.npcSpots.length - 1, 'él espera en la meta');
});

test('una gomita no se recoge dos veces y caer al agua no quita gomitas', () => {
  const game = new Game(CONFIG, level);
  game.start();
  const g = game.gomitas[0];
  game.player.reset(g.x, g.y + 11);
  run(game, NONE, 0.5);
  assert.equal(game.count, 1);
  game.player.reset(g.x, g.y + 11);
  run(game, NONE, 0.5);
  assert.equal(game.count, 1);
  game.collectGomita(g);
  assert.equal(game.count, 1);

  // Caída al agua: reaparece en suelo firme con sus gomitas.
  game.player.reset(44 * TILE - 8, 12 * TILE);
  run(game, NONE, 0.1);
  run(game, { right: true }, 1.2);
  assert.ok(game.respawnT > 0 || game.player.y > 12 * TILE, 'cayó al agua');
  run(game, NONE, 2);
  assert.equal(game.count, 1, 'conserva las gomitas');
  assert.ok(game.player.y <= 12 * TILE && game.player.onGround, 'reaparece sobre el suelo');
});

// ------------------------------------------------------------
// Nivel 2 · El asesinato de Pipu
// ------------------------------------------------------------
// Llegar y quedarse quieta (para poder esperar sin alterar la ruta).
const nearX = (x, r) => (p) => Math.abs(p.x - x) < r && p.onGround && Math.abs(p.vx) < 1 && !p.jumpHeld;
let caseRoute;
test('nivel 2: todas las pistas son alcanzables (incluida la que tapa Arya)', () => {
  const [pelos, huellas, foto, babas, envoltorio] = pipu.clues;
  caseRoute = solveTargets(pipu, CONFIG.physics, [
    { name: 'pelos', x: pelos.x, test: touches(pelos) },
    { name: 'huellas', x: huellas.x, test: touches(huellas) },
    { name: 'foto', x: foto.x, test: touches(foto) },
    { name: 'acercarse a las babas', x: babas.x, test: nearX(babas.x - 40, 12) },
    { name: 'alejarse', x: babas.x - 150, test: nearX(babas.x - 150, 12) },
    { name: 'babas', x: babas.x, test: touches(babas) },
    // Se exige tocarlo desde arriba de la nube, para que la ruta pueda continuar.
    { name: 'envoltorio', x: envoltorio.x, test: (p) => touches(envoltorio)(p) && p.y <= envoltorio.ground },
    { name: 'sombra', x: pipu.shadowSpots[3].x, test: nearX(pipu.shadowSpots[3].x - 40, 12) },
  ]);
  assert.ok(caseRoute.ok, `tramo imposible: ${caseRoute.failed}`);
});

test('nivel 2: se puede volver atrás desde el final hasta cada pista', () => {
  const p = new Player(pipu, CONFIG.physics);
  p.reset(pipu.bed.x - 60, 12 * TILE);
  let state = snap(p);
  for (const c of [...pipu.clues].reverse()) {
    const res = search(pipu, CONFIG.physics, state, touches(c), { minX: c.x - 260, maxX: state[0] + 260 });
    assert.ok(res, `no se puede volver a la pista ${c.kind}`);
    state = res.end;
  }
});

test('nivel 2: caso completo, acusaciones y final', () => {
  const events = [];
  const game = new Game(CONFIG, pipu, (name, data) => events.push({ name, data }));
  game.start();
  assert.ok(game.npc.shadow && !game.npc.hidden, 'él empieza como una sombra misteriosa');
  assert.equal(game.accuse('nico').ok, false);
  assert.deepEqual(game.accuse('arya'), { ok: false, text: CONFIG.texts.pipu.needClues }, 'sin pistas no se puede acusar a Arya');
  assert.equal(game.accuse('chif').ok, false);
  assert.equal(game.wrong, 0, 'acusar sin pistas no cuenta como fallo');

  let hiddenTaken = false;
  for (const leg of caseRoute.legs) {
    for (const input of leg.inputs) game.step(STEP, input);
    if (leg.name === 'acercarse a las babas') {
      run(game, NONE, 3); // Arya corre a sentarse encima
      const babas = game.clues[3];
      assert.ok(babas.sat && babas.hidden, 'Arya tapa la pista');
      assert.ok(Math.abs(game.arya.x - babas.x) < 3 && game.arya.sit, 'Arya está sentada sobre la pista');
      game.collectClue(babas);
      hiddenTaken = hiddenTaken || babas.collected;
    }
    if (leg.name === 'alejarse') assert.equal(game.clues[3].hidden, false, 'al alejarse, Arya se levanta y la pista aparece');
    if (leg.name === 'envoltorio') {
      // Con las 5 pistas pero sin saber quién es la sombra, todavía no se puede acusar.
      assert.equal(game.count, 5);
      assert.equal(game.canAccuse, false);
      assert.equal(game.accuse('arya').text, CONFIG.texts.pipu.needShadow);
      assert.equal(events.filter((e) => e.name === 'allClues').length, 0, 'el aviso de acusar espera a que aparezca él');
      game.startCaseEnding();
      assert.equal(game.state, 'playing');
    }
  }
  assert.ok(!hiddenTaken, 'la pista tapada no se puede recoger');
  assert.equal(game.count, 5, 'recoge las 5 pistas');
  assert.equal(events.filter((e) => e.name === 'clue').length, 5);
  assert.equal(events.filter((e) => e.name === 'allClues').length, 1);
  assert.ok(game.suspects.chif.spoken && game.suspects.tiana.spoken, 'los dos sospechosos dieron su coartada');
  assert.equal(game.state, 'playing', 'el caso no se cierra solo');

  // Acusaciones falsas: se defienden y cuentan como fallo.
  assert.equal(game.accuse('chif').text, CONFIG.texts.pipu.defense.chif);
  assert.equal(game.accuse('tiana').ok, false);
  assert.ok(game.nico.spoken && game.canAccuse, 'tras desenmascarar a la sombra ya se puede acusar');
  assert.equal(game.accuse('nico').text, CONFIG.texts.pipu.defense.nico);
  assert.equal(game.accuse('carino').text, CONFIG.texts.pipu.defense.carino);
  assert.equal(game.wrong, 4);
  assert.ok(events.filter((e) => e.name === 'sting').length >= 1, 'la sombra aparece y huye');
  assert.ok(game.papers.some((p) => p.read), 'se leen notas anónimas');
  assert.equal(game.state, 'playing');
  assert.equal(game.accuse('arya').ok, true);

  game.startCaseEnding();
  game.startCaseEnding();
  assert.equal(game.state, 'ending');
  run(game, { left: true, jump: true }, 1);
  assert.equal(game.bubbles.her?.text, CONFIG.texts.pipu.endReact, 'ella reacciona primero');
  run(game, { left: true, jump: true }, 8);
  assert.equal(game.pipu.state, 'sleep', 'Pipu aparece dormido en la camita');
  run(game, NONE, 16);
  assert.equal(game.state, 'won');
  assert.equal(game.pipu.state, 'awake', 'Pipu está vivo');
  assert.equal(game.npc.hidden, false, 'él llega preguntando por sus gomitas');
  assert.equal(events.filter((e) => e.name === 'endingStart').length, 1, 'final una sola vez');
  assert.equal(events.filter((e) => e.name === 'won').length, 1);
  assert.equal(events.find((e) => e.name === 'won').data.wrong, 4);
  assert.equal(game.npc.shadow, false, 'al final ya no es una sombra');
  assert.equal(game.accuse('arya').ok, false, 'no se puede acusar otra vez');

  game.start();
  assert.equal(game.count, 0);
  assert.equal(game.pipu.state, 'hidden');
  assert.ok(game.clues.every((c) => !c.collected) && game.clues[3].hidden);
});

test('Arya acompaña en los dos niveles sin quedarse atrás', () => {
  for (const [lvl, inputs] of [[level, route.inputs], [pipu, caseRoute.inputs]]) {
    const game = new Game(CONFIG, lvl);
    game.start();
    let far = 0;
    let busy = 0; // tras sus travesuras, Arya tiene un par de segundos para alcanzarla
    for (const input of inputs) {
      game.step(STEP, input);
      if (game.state !== 'playing') break;
      busy = game.arya.override ? 2 : busy - STEP;
      if (busy <= 0 && game.respawnT <= 0) far = Math.max(far, Math.hypot(game.arya.x - game.player.x, game.arya.y - game.player.y));
    }
    assert.ok(far < 60, `Arya se alejó ${far.toFixed(0)}px en ${lvl.id}`);
  }
});

test('tocar a un personaje vuelve a mostrar lo último que dijo', () => {
  const game = new Game(CONFIG, pipu);
  game.start();
  run(game, NONE, 0.5); // el Cariñosito da su declaración al empezar
  const c = game.suspects.carino;
  assert.equal(game.bubbles.carino.text, CONFIG.texts.pipu.alibi.carino);
  run(game, NONE, 6);
  assert.equal(game.bubbles.carino, undefined, 'el globo ya se fue');
  assert.equal(game.tapAt(c.x + 3, c.y - 8), true);
  assert.equal(game.bubbles.carino.text, CONFIG.texts.pipu.alibi.carino, 'vuelve a salir al tocarlo');
  assert.equal(game.tapAt(c.x + 300, c.y - 150), false, 'tocar el vacío no hace nada');
  assert.equal(game.tapAt(game.suspects.chif.x, game.suspects.chif.y - 8), false, 'quien no ha hablado no dice nada');
});
