// Nivel 1 · Gomitas of Love: el jardín encantado.

import { TILE, T, GROUND, createBase } from '../level.js';

export function createGomitasLevel() {
  const B = createBase('gomitas', 'day', 212);
  const L = B.level;
  const { px, ground, block, plat } = B;

  // ---- Zona 1: jardín de inicio ----
  ground(0, 26);
  ground(19, 26, 11);
  ground(22, 26, 10);
  ground(29, 44);
  plat(31, 33, 10);
  plat(35, 37, 8);

  // ---- Zona 2: el lago y el honguito saltarín ----
  ground(48, 52);
  ground(56, 58, 11);
  ground(62, 108);
  plat(68, 74, 6);

  // ---- Zona 3: la colina ----
  ground(88, 101, 10);
  ground(92, 101, 8);
  plat(94, 95, 6);
  plat(97, 99, 4);
  plat(102, 103, 10);

  // ---- Zona 4: camino de nubes ----
  plat(110, 112, 11, T.CLOUD);
  plat(115, 117, 10, T.CLOUD);
  plat(120, 123, 9, T.CLOUD);
  plat(124, 127, 4, T.CLOUD);
  plat(127, 130, 10, T.CLOUD);
  plat(133, 135, 11, T.CLOUD);

  // ---- Zona 5: el túnel secreto ----
  ground(136, L.cols - 1);
  plat(141, 142, 10);
  plat(143, 144, 8);
  block(146, 162, 6, 7);
  block(162, 162, 6, 11);
  plat(163, 164, 8);
  plat(165, 166, 10);

  L.start = { x: px(10), y: GROUND * TILE };

  // Gomitas (x, y = centro en píxeles)
  L.gomitas = [
    { x: px(36), y: 8 * TILE - 12, color: 0 },
    { x: px(70), y: 6 * TILE - 12, color: 1 },
    { x: px(98), y: 4 * TILE - 12, color: 2 },
    { x: px(126), y: 4 * TILE - 12, color: 3 },
    { x: px(159), y: GROUND * TILE - 12, color: 4 },
  ];

  B.hearts([
    [16, 11], [17, 11], [20.5, 9], [21.5, 9], [27.5, 7.5], [32, 8.5],
    [46, 9.5], [50, 11], [54.5, 9.5], [57, 9], [60.5, 9.5], [67, 6.5], [72, 4.5],
    [77, 11], [79, 11], [81, 11], [90, 8.5], [94.5, 4.5],
    [111, 9.5], [116, 8.5], [121, 7.5], [128.5, 8.5], [134, 9.5],
    [149, 10.5], [151, 10.5], [153, 10.5], [155, 10.5], [150, 4.5], [153, 4.5], [156, 4.5],
    [172, 11], [176, 9.5], [180, 11], [184, 9.5],
  ]);
  B.springs([[66, GROUND], [123, 9]]);

  // Puntos donde aparece él (x centro, y = pies)
  L.npcSpots = [
    { x: px(15), y: GROUND * TILE },
    { x: px(41), y: GROUND * TILE },
    { x: px(73), y: 6 * TILE },
    { x: px(100), y: 8 * TILE },
    { x: px(139), y: GROUND * TILE },
    { x: px(198), y: GROUND * TILE }, // punto final
  ];
  L.goalX = 192 * TILE;
  L.shades = [{ x: 146 * TILE, y: 8 * TILE, w: 16 * TILE, h: 4 * TILE }];
  L.garland = { x1: px(190), x2: px(206), y: GROUND * TILE };

  [[3, 0], [24, 1], [43, 0], [64, 1], [83, 0], [106, 1], [137, 0], [171, 1], [187, 0], [205, 0]].forEach(([c, v]) => B.put('tree', c, { variant: v }));
  [7, 30, 50, 78, 86, 104, 168, 181, 194, 209].forEach((c, i) => B.put('bush', c, { variant: i % 2 }));
  [12, 144, 189].forEach((c) => B.put('sign', c));

  return B.finish();
}
