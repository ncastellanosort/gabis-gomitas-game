// Nivel: plataformas, gomitas, corazoncitos, honguitos y decoración.
// Todo se construye con unas pocas funciones para que sea fácil de retocar.

export const TILE = 16;
export const T = { EMPTY: 0, SOLID: 1, WOOD: 2, CLOUD: 3 };

const COLS = 212;
const ROWS = 15;
const GROUND = 12; // fila donde está el suelo normal

// Ruido determinista: la decoración sale igual en cada partida.
export function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function createLevel() {
  const tiles = new Uint8Array(COLS * ROWS);
  const set = (c, r, t) => {
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) tiles[r * COLS + c] = t;
  };
  const ground = (c0, c1, top = GROUND) => {
    for (let c = c0; c <= c1; c++) for (let r = top; r < ROWS; r++) set(c, r, T.SOLID);
  };
  const block = (c0, c1, r0, r1) => {
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) set(c, r, T.SOLID);
  };
  const plat = (c0, c1, r, t = T.WOOD) => {
    for (let c = c0; c <= c1; c++) set(c, r, t);
  };

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
  ground(136, COLS - 1);
  plat(141, 142, 10);
  plat(143, 144, 8);
  block(146, 162, 6, 7);
  block(162, 162, 6, 11);
  plat(163, 164, 8);
  plat(165, 166, 10);

  const tileAt = (c, r) => (c < 0 || c >= COLS || r < 0 || r >= ROWS ? T.EMPTY : tiles[r * COLS + c]);
  // Los bordes laterales del nivel son paredes; por abajo se cae al agua.
  const isSolid = (c, r) => (c < 0 || c >= COLS ? true : tileAt(c, r) === T.SOLID);
  const isOneWay = (c, r) => {
    const t = tileAt(c, r);
    return t === T.WOOD || t === T.CLOUD;
  };
  const px = (c) => c * TILE + TILE / 2;

  // Gomitas (x, y = centro en píxeles)
  const gomitas = [
    { x: px(36), y: 8 * TILE - 12, color: 0 },
    { x: px(70), y: 6 * TILE - 12, color: 1 },
    { x: px(98), y: 4 * TILE - 12, color: 2 },
    { x: px(126), y: 4 * TILE - 12, color: 3 },
    { x: px(159), y: GROUND * TILE - 12, color: 4 },
  ];

  // Corazoncitos extra (columna, fila)
  const hearts = [
    [16, 11], [17, 11], [20.5, 9], [21.5, 9], [27.5, 7.5], [32, 8.5],
    [46, 9.5], [50, 11], [54.5, 9.5], [57, 9], [60.5, 9.5], [67, 6.5], [72, 4.5],
    [77, 11], [79, 11], [81, 11], [90, 8.5], [94.5, 4.5],
    [111, 9.5], [116, 8.5], [121, 7.5], [128.5, 8.5], [134, 9.5],
    [149, 10.5], [151, 10.5], [153, 10.5], [155, 10.5], [150, 4.5], [153, 4.5], [156, 4.5],
    [172, 11], [176, 9.5], [180, 11], [184, 9.5],
  ].map(([c, r]) => ({ x: c * TILE + 8, y: r * TILE + 8 }));

  // Honguitos saltarines (x centro, top = superficie donde rebota)
  const springs = [
    { x: px(66), base: GROUND * TILE },
    { x: px(123), base: 9 * TILE },
  ].map((s) => ({ ...s, top: s.base - 10 }));

  // Puntos donde aparece él (x centro, y = pies)
  const npcSpots = [
    { x: px(15), y: GROUND * TILE },
    { x: px(41), y: GROUND * TILE },
    { x: px(73), y: 6 * TILE },
    { x: px(100), y: 8 * TILE },
    { x: px(139), y: GROUND * TILE },
    { x: px(198), y: GROUND * TILE }, // punto final
  ];

  // Huecos con agua: columnas sin suelo.
  const pits = [];
  for (let c = 0; c < COLS; c++) {
    if (tileAt(c, ROWS - 1) === T.SOLID) continue;
    const last = pits[pits.length - 1];
    if (last && last[1] === c - 1) last[1] = c;
    else pits.push([c, c]);
  }

  // Primera superficie sólida de una columna (para apoyar decoración).
  const surfaceRow = (c) => {
    for (let r = 0; r < ROWS; r++) if (tileAt(c, r) === T.SOLID) return r;
    return -1;
  };

  // ---- Decoración ----
  const decor = [];
  const onGround = (type, c, extra = {}) => {
    const r = surfaceRow(Math.floor(c));
    if (r > 0) decor.push({ type, x: c * TILE + 8, y: r * TILE, ...extra });
  };
  [[3, 0], [24, 1], [43, 0], [64, 1], [83, 0], [106, 1], [137, 0], [171, 1], [187, 0], [205, 0]].forEach(
    ([c, v]) => onGround('tree', c, { variant: v })
  );
  [7, 30, 50, 78, 86, 104, 168, 181, 194, 209].forEach((c, i) => onGround('bush', c, { variant: i % 2 }));
  [12, 144, 189].forEach((c) => onGround('sign', c));

  const busy = new Set();
  springs.forEach((s) => busy.add(Math.floor(s.x / TILE)));
  npcSpots.forEach((s) => busy.add(Math.floor(s.x / TILE)));
  decor.forEach((d) => d.type === 'sign' && busy.add(Math.floor(d.x / TILE)));
  for (let c = 1; c < COLS - 1; c++) {
    if (busy.has(c)) continue;
    const r = surfaceRow(c);
    if (r <= 0) continue;
    const n = hash2(c, 3);
    const ox = Math.floor(hash2(c, 9) * 8) - 4;
    if (n < 0.3) decor.push({ type: 'flower', x: c * TILE + 8 + ox, y: r * TILE, variant: Math.floor(hash2(c, 5) * 8), phase: hash2(c, 1) * 6 });
    else if (n < 0.5) decor.push({ type: 'tuft', x: c * TILE + 8 + ox, y: r * TILE });
  }

  return {
    cols: COLS,
    rows: ROWS,
    width: COLS * TILE,
    height: ROWS * TILE,
    tiles,
    tileAt,
    isSolid,
    isOneWay,
    start: { x: px(10), y: GROUND * TILE },
    gomitas,
    hearts,
    springs,
    npcSpots,
    goalX: 192 * TILE,
    pits,
    waterY: 13 * TILE + 4,
    decor,
    shades: [{ x: 146 * TILE, y: 8 * TILE, w: 16 * TILE, h: 4 * TILE }],
    garland: { x1: px(190), x2: px(206), y: GROUND * TILE },
  };
}
