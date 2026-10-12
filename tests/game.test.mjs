// Pruebas de lógica sin navegador:  node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createLevel, TILE } from '../src/level.js';
import { Player } from '../src/player.js';
import { Game, STEP } from '../src/game.js';
import { solveRoute, search, snap, touches } from './solver.mjs';

const level = createLevel();
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
