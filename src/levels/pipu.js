// Nivel 2 · El asesinato de Pipu: el jardín de noche.

import { TILE, T, GROUND, createBase } from '../level.js';

export function createPipuLevel() {
  const B = createBase('pipu', 'night', 142);
  const L = B.level;
  const { px, ground, plat } = B;
  const G = GROUND * TILE;

  // ---- Zona 1: la escena del crimen ----
  ground(0, 32);

  // ---- Zona 2: la colina de Chif ----
  ground(36, 97);
  plat(40, 42, 10);
  plat(44, 46, 8);
  ground(49, 58, 10);

  // ---- Zona 3: el corral de Tiana ----
  plat(72, 78, 6);

  // ---- Zona 4: el estanque ----
  plat(99, 101, 11, T.CLOUD);
  plat(104, 106, 9, T.CLOUD);
  plat(109, 111, 11, T.CLOUD);

  // ---- Zona 5: la camita de Arya ----
  ground(113, L.cols - 1);

  L.start = { x: px(7), y: G };
  L.scene = { x: px(15), y: G }; // silueta de tiza
  L.bed = { x: px(133), y: G };

  // Pistas (x, y = centro; ground = suelo donde está)
  L.clues = [
    { kind: 'pelos', x: px(22), y: G - 12, ground: G },
    { kind: 'huellas', x: px(45), y: 8 * TILE - 12, ground: 8 * TILE },
    { kind: 'foto', x: px(75), y: 6 * TILE - 12, ground: 6 * TILE },
    { kind: 'babas', x: px(89), y: G - 9, ground: G, hidden: true }, // Arya se sienta encima
    { kind: 'envoltorio', x: px(105), y: 9 * TILE - 12, ground: 9 * TILE },
  ];

  L.suspects = {
    chif: { x: px(54), y: 10 * TILE },
    tiana: { x: px(82), y: G },
    carino: { x: px(20), y: G, facing: -1 }, // al otro lado de la escena del crimen, no pegado al inicio
  };

  B.hearts([
    [11, 11], [27, 11], [34, 9.5], [41, 8.5], [51, 8.5], [56, 8.5], [62, 11], [64, 11],
    [70.5, 6.5], [73, 4.5], [77, 4.5], [94, 11], [100, 9.5], [110, 9.5], [118, 11], [122, 11],
  ]);
  B.springs([[70, GROUND]]);

  [[3, 1], [30, 0], [60, 1], [92, 0], [116, 1], [139, 0]].forEach(([c, v]) => B.put('tree', c, { variant: v }));
  [10, 38, 66, 86, 120, 128].forEach((c, i) => B.put('bush', c, { variant: i % 2 }));
  [19, 47, 68, 96, 126].forEach((c) => B.put('lamp', c));
  B.put('sign', 25);

  // La sombra: una figura misteriosa que huye cada vez que la detective se acerca.
  // El último punto es donde por fin da la cara.
  L.shadowSpots = [
    { x: px(29), y: G },
    { x: px(63), y: G },
    { x: px(95), y: G },
    { x: px(119), y: G },
  ];
  // Notas anónimas clavadas en el suelo (el texto está en config.js)
  L.papers = [{ x: px(31.5), y: G }, { x: px(65), y: G }, { x: px(115), y: G }];

  return B.finish([20, 21, 13, 14, 15, 16, 17, 22, 29, 31, 54, 63, 65, 82, 89, 95, 115, 119, 131, 132, 133, 134, 135]);
}
