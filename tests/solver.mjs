// Buscador de rutas: usa la física real de la protagonista para demostrar
// que cada tramo del nivel se puede recorrer, y devuelve las pulsaciones.

import { Player, HEIGHT } from '../src/player.js';
import { STEP } from '../src/game.js';

const MACRO = 8; // pasos de simulación por decisión
const ACTIONS = [];
for (const d of [1, 0, -1]) for (const j of [false, true]) ACTIONS.push({ left: d < 0, right: d > 0, jump: j });

const FIELDS = ['x', 'y', 'vx', 'vy', 'facing', 'onGround', 'coyote', 'buffer', 'jumpHeld', 'springing', 'walkPhase', 'landT', 'safeX', 'safeY'];
export const snap = (p) => FIELDS.map((f) => p[f]);
export const restore = (p, s) => { FIELDS.forEach((f, i) => (p[f] = s[i])); p.events.length = 0; };

const key = (p) =>
  `${Math.round(p.x / 3)},${Math.round(p.y / 3)},${Math.round(p.vx / 34)},${Math.round(p.vy / 60)},${p.onGround ? 1 : 0}${p.jumpHeld ? 1 : 0}${p.springing ? 1 : 0}`;

// Búsqueda en anchura desde `from` hasta que isGoal(player) sea verdadero.
export function search(level, physics, from, isGoal, { minX = -Infinity, maxX = Infinity, maxNodes = 4e6 } = {}) {
  const p = new Player(level, physics);
  const nodes = [{ s: from, parent: -1, a: null }];
  const seen = new Set();
  restore(p, from);
  seen.add(key(p));
  for (let i = 0; i < nodes.length && nodes.length < maxNodes; i++) {
    for (const a of ACTIONS) {
      restore(p, nodes[i].s);
      let ok = true;
      let goal = false;
      let steps = 0;
      for (; steps < MACRO; ) {
        p.update(STEP, a);
        steps++;
        if (p.y > level.waterY + 14 || p.x < minX || p.x > maxX) { ok = false; break; }
        if (isGoal(p)) { goal = true; break; }
      }
      if (!ok) continue;
      const k = key(p);
      if (!goal && seen.has(k)) continue;
      seen.add(k);
      nodes.push({ s: snap(p), parent: i, a, steps });
      if (goal) {
        const inputs = [];
        for (let n = nodes.length - 1; nodes[n].parent >= 0; n = nodes[n].parent) {
          for (let q = 0; q < nodes[n].steps; q++) inputs.push(nodes[n].a);
        }
        return { inputs: inputs.reverse(), end: nodes[nodes.length - 1].s, explored: nodes.length };
      }
    }
  }
  return null;
}

export const touches = (g) => (p) => Math.abs(p.x - g.x) < 12 && Math.abs(p.y - HEIGHT / 2 - g.y) < 17;

// Ruta por una lista de objetivos { name, x, test } en orden.
export function solveTargets(level, physics, targets) {
  const p = new Player(level, physics);
  let state = snap(p);
  const legs = [];
  for (const t of targets) {
    const x0 = state[0];
    const res = search(level, physics, state, t.test, { minX: Math.min(x0, t.x) - 260, maxX: Math.max(x0, t.x) + 260 });
    if (!res) return { ok: false, failed: t.name, legs };
    legs.push({ name: t.name, inputs: res.inputs, explored: res.explored });
    state = res.end;
  }
  return { ok: true, legs, inputs: legs.flatMap((l) => l.inputs) };
}

// Nivel 1 completo: inicio → cada gomita en orden → meta.
export function solveRoute(level, physics) {
  return solveTargets(level, physics, [
    ...level.gomitas.map((g, i) => ({ name: `gomita ${i + 1}`, x: g.x, test: touches(g) })),
    { name: 'meta', x: level.goalX, test: (q) => q.x >= level.goalX && q.onGround },
  ]);
}
