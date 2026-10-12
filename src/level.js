// Base común de los niveles: casillas, colisiones y decoración automática.
// Cada nivel (src/levels/*.js) usa estas funciones para construirse.

export const TILE = 16;
export const T = { EMPTY: 0, SOLID: 1, WOOD: 2, CLOUD: 3 };
export const GROUND = 12; // fila donde está el suelo normal

// Ruido determinista: la decoración sale igual en cada partida.
export function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function createBase(id, theme, cols, rows = 15) {
  const tiles = new Uint8Array(cols * rows);
  const set = (c, r, t) => {
    if (c >= 0 && c < cols && r >= 0 && r < rows) tiles[r * cols + c] = t;
  };
  const tileAt = (c, r) => (c < 0 || c >= cols || r < 0 || r >= rows ? T.EMPTY : tiles[r * cols + c]);
  const surfaceRow = (c) => {
    for (let r = 0; r < rows; r++) if (tileAt(c, r) === T.SOLID) return r;
    return -1;
  };

  const L = {
    id,
    theme,
    cols,
    rows,
    width: cols * TILE,
    height: rows * TILE,
    tiles,
    tileAt,
    // Los bordes laterales del nivel son paredes; por abajo se cae al agua.
    isSolid: (c, r) => (c < 0 || c >= cols ? true : tileAt(c, r) === T.SOLID),
    isOneWay: (c, r) => tileAt(c, r) === T.WOOD || tileAt(c, r) === T.CLOUD,
    waterY: 13 * TILE + 4,
    start: { x: 0, y: 0 },
    gomitas: [],
    hearts: [],
    springs: [],
    npcSpots: [],
    decor: [],
    shades: [],
    pits: [],
    garland: null,
  };

  const B = {
    level: L,
    px: (c) => c * TILE + TILE / 2,
    ground(c0, c1, top = GROUND) {
      for (let c = c0; c <= c1; c++) for (let r = top; r < rows; r++) set(c, r, T.SOLID);
    },
    block(c0, c1, r0, r1) {
      for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) set(c, r, T.SOLID);
    },
    plat(c0, c1, r, t = T.WOOD) {
      for (let c = c0; c <= c1; c++) set(c, r, t);
    },
    // Corazoncitos: lista de [columna, fila]
    hearts(list) {
      L.hearts = list.map(([c, r]) => ({ x: c * TILE + 8, y: r * TILE + 8 }));
    },
    // Honguitos saltarines: lista de [columna, fila de la superficie]
    springs(list) {
      L.springs = list.map(([c, r]) => ({ x: B.px(c), base: r * TILE, top: r * TILE - 10 }));
    },
    // Decoración apoyada en la primera superficie sólida de la columna.
    put(type, c, extra = {}) {
      const r = surfaceRow(Math.floor(c));
      if (r > 0) L.decor.push({ type, x: c * TILE + 8, y: r * TILE, ...extra });
    },
    // Calcula huecos con agua y siembra flores y pasto donde no estorban.
    finish(busyCols = []) {
      for (let c = 0; c < cols; c++) {
        if (tileAt(c, rows - 1) === T.SOLID) continue;
        const last = L.pits[L.pits.length - 1];
        if (last && last[1] === c - 1) last[1] = c;
        else L.pits.push([c, c]);
      }
      const busy = new Set(busyCols.map(Math.floor));
      L.springs.forEach((s) => busy.add(Math.floor(s.x / TILE)));
      L.npcSpots.forEach((s) => busy.add(Math.floor(s.x / TILE)));
      L.decor.forEach((d) => d.type !== 'tree' && d.type !== 'bush' && busy.add(Math.floor(d.x / TILE)));
      for (let c = 1; c < cols - 1; c++) {
        if (busy.has(c)) continue;
        const r = surfaceRow(c);
        if (r <= 0) continue;
        const n = hash2(c, 3);
        const ox = Math.floor(hash2(c, 9) * 8) - 4;
        if (n < 0.3) L.decor.push({ type: 'flower', x: c * TILE + 8 + ox, y: r * TILE, variant: Math.floor(hash2(c, 5) * 8), phase: hash2(c, 1) * 6 });
        else if (n < 0.5) L.decor.push({ type: 'tuft', x: c * TILE + 8 + ox, y: r * TILE });
      }
      return L;
    },
  };
  return B;
}
