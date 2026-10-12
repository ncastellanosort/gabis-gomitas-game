// Escenario del menú: un atardecer con todo el elenco reunido.
// No es de ningún nivel en particular.

import { TILE, GROUND, createBase } from '../level.js';

export function createMenuLevel() {
  const B = createBase('menu', 'dusk', 80);
  const L = B.level;
  const G = GROUND * TILE;
  B.ground(0, L.cols - 1);

  const cx = L.width / 2;
  L.focusX = cx; // la cámara se centra aquí
  L.start = { x: cx - 12, y: G }; // ella (Arya se sienta a su lado)
  L.him = { x: cx + 14, y: G };
  L.suspects = {
    chif: { x: cx - 58, y: G, facing: 1 },
    tiana: { x: cx + 40, y: G, facing: -1 },
    carino: { x: cx + 86, y: G, facing: -1 },
  };
  L.pipuSpot = { x: cx + 62, y: G };
  L.garland = { x1: cx - 100, x2: cx + 106, y: G };

  [[26, 0], [33, 1], [46, 0], [53, 1], [14, 1], [66, 0]].forEach(([c, v]) => B.put('tree', c, { variant: v }));
  [30, 49, 20, 60].forEach((c, i) => B.put('bush', c, { variant: i % 2 }));

  const busy = [];
  for (let c = Math.floor((cx - 70) / TILE); c <= Math.floor((cx + 100) / TILE); c++) busy.push(c);
  return B.finish(busy);
}
