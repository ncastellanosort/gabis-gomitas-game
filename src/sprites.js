// Pixel art original del juego, dibujado píxel a píxel desde código.
// Cada sprite es una lista de filas; cada letra es un color de la paleta
// y el punto es transparente. Los personajes se arman por capas
// (piernas + torso + cabeza + cara) para poder animarlos y cambiarles la expresión.

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function flip(src) {
  const c = makeCanvas(src.width, src.height);
  const x = c.getContext('2d');
  x.translate(src.width, 0);
  x.scale(-1, 1);
  x.drawImage(src, 0, 0);
  return c;
}

export function fromRows(name, rows, pal) {
  const w = rows[0].length;
  const c = makeCanvas(w, rows.length);
  const x = c.getContext('2d');
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`Sprite "${name}", fila ${y}: ancho ${row.length}, se esperaba ${w}`);
    for (let i = 0; i < w; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      if (!pal[ch]) throw new Error(`Sprite "${name}": color "${ch}" sin definir`);
      x.fillStyle = pal[ch];
      x.fillRect(i, y, 1, 1);
    }
  });
  return { c, f: flip(c), w, h: rows.length };
}

const mapRows = (name, set, pal) => Object.fromEntries(Object.entries(set).map(([k, rows]) => [k, fromRows(`${name}.${k}`, rows, pal)]));

// ------------------------------------------------------------------
// ELLA  (16 x 24: cabeza 14 filas, torso 7, piernas 5)
// ------------------------------------------------------------------
const HER_HEAD = [
  '....hhHhhhHh....',
  '..hhHoHHhHoHhh..',
  '.hHoHHhHHoHHHhh.',
  '.hHHHoHHHHHhoHh.',
  'hHhHHHHhHHHHHHHh',
  'hHoHHHsHssHsHoHh',
  'hHHHhssssssssHHh',
  'hoHHHssssssssHhh',
  'hHHhHssssssssHHh',
  'hHoHHssssssssoHh',
  '.hHHhssssssssHh.',
  '.hoHHhSssssSHHh.',
  '..hHhH.....hHh..',
  '...hh.......h...',
];

// Caras (8 x 6), una por estado emocional. Se pintan sobre la cabeza.
const HER_FACES = [
  // 0 · muy brava
  ['k......k', '.kk..kk.', '.wk..wk.', '........', '...mm...', '..m..m..'],
  // 1 · brava pero sorprendida
  ['.kk....k', '.....kk.', '.wk..wk.', '.wk..wk.', '...mm...', '...mm...'],
  // 2 · se le escapa una sonrisita (mira para otro lado)
  ['........', '.kk..kk.', '.kw..kw.', '.kw..kw.', '.....m..', '..mmm...'],
  // 3 · contenta
  ['.kk..kk.', '........', '.wk..wk.', '.wk..wk.', 'b.m..m.b', '...mm...'],
  // 4 · muy feliz
  ['........', '..k...k.', '.k.k.k.k', 'b......b', 'b.mmmm.b', '...rr...'],
  // 5 · enamorada
  ['........', '.p.p.p.p', '.ppp.ppp', '..p...p.', 'b.mmmm.b', '..mrrm..'],
];
const HER_BLINK = ['........', '........', '.ss..ss.', '.kk..kk.', '........', '........'];

// Top negro sin mangas (y, con brillo Y), brazos (s) y pantalón (v).
const HER_PANTS = ['.....vvvvvv.....', '.....vvVVvv.....'];
const HER_TORSO = {
  idle: ['......yyyy......', '....syyyyyys....', '....syYyyyys....', '....syyyyyys....', '....syyyyyys....', ...HER_PANTS],
  crossed: ['......yyyy......', '....syyyyyys....', '....ssssSsss....', '.....yyyyyy.....', '.....yyyyyy.....', ...HER_PANTS],
  swing: ['......yyyy......', '....syyyyyys....', '....syYyyyys....', '...s.yyyyyy.s...', '.....yyyyyy.....', ...HER_PANTS],
  up: ['......yyyy......', '....syyyyyys....', '..sssyYyyyysss..', '.....yyyyyy.....', '.....yyyyyy.....', ...HER_PANTS],
  fall: ['.s....yyyy....s.', '..s.syyyyyys.s..', '...ssyYyyyyss...', '.....yyyyyy.....', '.....yyyyyy.....', ...HER_PANTS],
};

const HER_LEGS = {
  stand: ['.....ss..ss.....', '.....ss..ss.....', '.....ss..ss.....', '.....ww..ww.....', '.....ppp.ppp....'],
  tap: ['.....ss..ss.....', '.....ss..ss.....', '.....ss..ss.....', '.....ww..wwp....', '.....ppp.pp.....'],
  stride: ['.....sss.ss.....', '....ss...ss.....', '....ss....ss....', '....ww....ww....', '....ppp...ppp...'],
  passR: ['.....ss..ss.....', '.....ss..ss.....', '.....ss..ww.....', '.....ww..ppp....', '.....ppp........'],
  passL: ['.....ss..ss.....', '.....ss..ss.....', '.....ww..ss.....', '.....ppp.ww.....', '.........ppp....'],
  jump: ['.....ss..ss.....', '.....ss..ss.....', '....sss..ww.....', '....ww...ppp....', '....ppp.........'],
  fall: ['.....ss..ss.....', '....ss....ss....', '....ss....ss....', '....ww....ww....', '...ppp....ppp...'],
  squat: ['................', '................', '....sss..sss....', '....ww....ww....', '...ppp....ppp...'],
};

// ------------------------------------------------------------------
// ÉL  (16 x 26: cabeza 11 filas, torso filas 8-19, piernas 6)
// ------------------------------------------------------------------
const HIM_HEAD = [
  '.....kkkkkk.....',
  '...kkkKKkkkkk...',
  '..kkkKkkkkkkkk..',
  '..kkkkkkkkkkkk..',
  '..kkkttkttttkk..',
  '..kttttttttttk..',
  '..kttttttttttk..',
  '..TttttttttttT..',
  '...tttttttttt...',
  '...tttttttttt...',
  '....TttttttT....',
];

const HIM_FACES = {
  nervous: ['.......q', '.wk..wkq', '.wk..wk.', '..m.m...', '.m.m.m..'],
  happy: ['........', '.wk..wk.', '.wk..wk.', '.m....m.', '..mmmm..'],
  love: ['........', '..k...k.', '.k.k.k.k', 'b.mmmm.b', '...mm...'],
};

const HIM_LOW = ['.....nnnnnn.....', '.....nnNNnn.....', '.....nn..nn.....'];
// Camiseta blanca de manga corta (j / J), brazos (t) y relojito (g) en la muñeca.
const HIM_TORSO = {
  hold: ['................', '................', '................', '......jwwj......', '....jjjwwjjj....', '...jjjjwwjjjj...', '...tJjjwwjjjttt.', '...gJjjwwjjj....', '...t.jjjjjj.....', ...HIM_LOW],
  waveA: ['.t..............', '.g..............', '.tj.............', '..jj..jwwj......', '...jjjjwwjjj....', '....jjjwwjjjj...', '....Jjjwwjjjttt.', '....Jjjwwjjj....', '.....jjjjjj.....', ...HIM_LOW],
  waveB: ['t...............', '.g..............', '.tj.............', '..jj..jwwj......', '...jjjjwwjjj....', '....jjjwwjjjj...', '....Jjjwwjjjttt.', '....Jjjwwjjj....', '.....jjjjjj.....', ...HIM_LOW],
  cheer: ['.t............t.', '.g............t.', '.tj..........jt.', '..jj..jwwj..jj..', '...jjjjwwjjjj...', '....jjjwwjjj....', '....Jjjwwjjj....', '....Jjjwwjjj....', '.....jjjjjj.....', ...HIM_LOW],
};
const HIM_LEGS = {
  stand: ['.....nn..nn.....', '.....nn..nn.....', '.....nn..nn.....', '.....nn..nn.....', '.....rr..rr.....', '.....rrW.rrW....'],
  hop: ['.....nn..nn.....', '.....nn..nn.....', '....nnn..nn.....', '....rr...rrW....', '....rrW.........', '................'],
};

// ------------------------------------------------------------------
// OBJETOS
// ------------------------------------------------------------------
const BAG = ['w.w.w.w.w', 'wwwwwwwww', 'pPPPPPPPp', 'pPrPyPgPp', 'pPPPPPPPp', 'pPgPrPyPp', 'pPPPPPPPp', 'pPyPgPrPp', 'pPPPPPPPp', 'ppppppppp'];

const GOMITA = [
  '.dd......dd.',
  'dlod....dood',
  'dooddddddood',
  '.dolooooood.',
  '.dolkookood.',
  '.dooooooood.',
  '..doollood..',
  'ddoooooooodd',
  'dolooooooood',
  'ddoloooooodd',
  '.dolooooood.',
  '.dooooooood.',
  '.dooddddood.',
  '..dd....dd..',
];
export const GOMITA_COLORS = [
  { o: '#ff4d6d', l: '#ffb3c1', d: '#c9184a' },
  { o: '#ff9f1c', l: '#ffd59e', d: '#d86f00' },
  { o: '#ffd60a', l: '#fff3a6', d: '#c79a00' },
  { o: '#52d273', l: '#c3f5cf', d: '#1f9d55' },
  { o: '#b06cff', l: '#e3ccff', d: '#7b2fd4' },
];

const HEART = ['.rr.rr.', 'rwrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
const HEART_SMALL = ['.r.r.', 'rrrrr', '.rrr.', '..r..'];
const HEART_BIG = [
  '..rrr...rrr..',
  '.rrrrr.rrrrr.',
  'rrwwrrrrrrrrr',
  'rrwrrrrrrrrrr',
  'rrrrrrrrrrrrr',
  'rrrrrrrrrrrrr',
  '.rrrrrrrrrrr.',
  '..rrrrrrrrr..',
  '...rrrrrrr...',
  '....rrrrr....',
  '.....rrr.....',
  '......r......',
];
const HEART_COLORS = ['#ff4d6d', '#ff8fb8', '#ff6fa3'];

const SPRING = [
  '....rrrrrrrr....',
  '..rrwwrrrrwwrr..',
  '.rrrwwrrrrwwrrr.',
  '.rrrrrrwwrrrrrr.',
  'rrwrrrrwwrrrrwrr',
  'rrrrrrrrrrrrrrrr',
  '.RRRRRRRRRRRRRR.',
  '....cccccccc....',
  '....cckcckcc....',
  '....cccccccc....',
  '...cccccccccc...',
  '...CCCCCCCCCC...',
];

const SIGN = [
  '..............',
  '.bbbbbbbbbb...',
  '.bLLLLLLLLbb..',
  '.bLLLLLwLLLbb.',
  '.bLwwwwwwLLLbb',
  '.bLLLLLwLLLbb.',
  '.bLLLLLLLLbb..',
  '.bbbbbbbbbb...',
  '.....bB.......',
  '.....bB.......',
  '.....bB.......',
  '.....bB.......',
  '.....bB.......',
  '.....bB.......',
  '.....bB.......',
  '.....bB.......',
];

const FLOWER_A = ['.ppp..', 'ppypp.', '.ppp..', '..g...', '.gg...', '..g...', '..g...'];
const FLOWER_B = ['.p.p..', 'ppppp.', '.ppp..', '..g...', '..gg..', '..g...', '..g...'];
const FLOWER_COLORS = ['#ff8fb8', '#ffffff', '#ffd75e', '#c39bff'];
const TUFT = ['.g...g.', '.g.g.g.', 'gG.g.Gg', '.gGgGg.'];
const ANGER = ['..r.r..', 'rr...rr', '.......', 'rr...rr', '..r.r..'];
const BUTTERFLY = [
  ['bb...bb', 'bbb.bbb', '.bbkbb.', '.bb.bb.'],
  ['.......', '.b...b.', '.bbkbb.', '.b...b.'],
];

// ------------------------------------------------------------------
// ARYA (cocker naranjita, 18 x 13), CHIF, TIANA y PIPU
// ------------------------------------------------------------------
const ARYA_HEAD = ['...........aaaa...', '..........aaaaaa..', '.........eeaaakaa.', '.........eeaaaaaan'];
const ARYA_BODY = ['aa.aaaaaaeeeaaa...', '.aaaaaaaaaeeaa....', '..aaaaaaaaaeww....', '..aaaaaaaaaaww....', '..aaaaaaaaaaa.....'];
const ARYA = {
  stand: [...ARYA_HEAD, 'a........eeeaaaww.', ...ARYA_BODY, '..aa.aa..aa.aa....', '..aa.aa..aa.aa....', '..ww.ww..ww.ww....'],
  wag: [...ARYA_HEAD, '.a.......eeeaaaww.', ...ARYA_BODY, '..aa.aa..aa.aa....', '..aa.aa..aa.aa....', '..ww.ww..ww.ww....'],
  run1: [...ARYA_HEAD, 'a........eeeaaaww.', ...ARYA_BODY, '..aa..aa.aa..aa...', '.aa....a.a....aa..', '.ww....w.w....ww..'],
  run2: [...ARYA_HEAD, 'a........eeeaaaww.', ...ARYA_BODY, '...aaa....aaa.....', '...aa.....aa......', '...ww.....ww......'],
  sit: [
    ...ARYA_HEAD,
    '.........eeeaaaww.',
    '.........eeeaaa...',
    '......aaaaeeaa....',
    '....aaaaaaaeww....',
    '...aaaaaaaaaww....',
    'a.aaaaaaaaaaa.....',
    'aaaaaaaaaaa.aa....',
    '.aaaaaaa.aa.aa....',
    '..wwww...ww.ww....',
  ],
};

// Chif es un panda rojo: orejitas redondas con borde blanco, carita blanca,
// patas oscuras y cola de anillos.
const CHIF = [
  '........ww....ww',
  '........oooooooo',
  '........owoooowo',
  '........okooooko',
  '........wwwoowww',
  '.........wwnnww.',
  '.......oooobb...',
  '......ooooobbb..',
  '.....oooooobbb..',
  '.oo..oooooobbb..',
  'owwo.ooooobbbb..',
  'oowwo.bbb.bbb...',
  '.oowo.bbb.bbb...',
];

// El Cariñosito: osito de peluche azul, gruñón, con una nube de lluvia en la panza.
const CARINO = [
  '......bb......',
  '.bb..bbbb..bb.',
  'bBBbbbbbbbbBBb',
  '.bbbbbbbbbbbb.',
  '.bkkbbbbbbkkb.',
  '.bbkbbbbbbkbb.',
  '.bbbbwwwwbbbb.',
  '.bbbwwnnwwbbb.',
  '..bbwwmmwwbb..',
  '..bbbbbbbbbb..',
  '.bbbwwwwwwbbb.',
  'bbbwwccccwwbbb',
  'bbbwccccccwbbb',
  '.bbwwcwcwwwbb.',
  '.bbbbwwwwbbbb.',
  'bbdbb....bbdbb',
];

const TIANA = [
  '..bb......bb..',
  '..bpb....bpb..',
  '..bpb....bpb..',
  '..bpb....bpb..',
  '..bbbbbbbbbb..',
  '.bbbwwwwwwbbb.',
  '.bbwwwwwwwwbb.',
  '.bbffffffffbb.',
  '.bbfkffffkfbb.',
  '.bbffffffffbb.',
  '..bbffmmffbb..',
  '...bbbbbbbb...',
  '..bbbbbbbbbb..',
  '.fbbbbwwbbbbf.',
  '..bbbbwwbbbb..',
  '..bbbbbbbbbb..',
  '..bbb....bbb..',
  '..BBB....BBB..',
];

const PIPU = [
  '....kkkkkk....',
  '...kkkkkkkk...',
  '..kkeekkeekk..',
  '..kkkkyykkkk..',
  '..kwwwyywwwk..',
  '.kkwwwwwwwwkk.',
  '.kwwwwwwwwwwk.',
  'kkwwwwwwwwwwkk',
  'kkwwwwwwwwwwkk',
  'kkwwwwwwwwwwkk',
  '.kwwwwwwwwwwk.',
  '.kkwwwwwwwwkk.',
  '..kkkkkkkkkk..',
  '..yyy....yyy..',
];
// Ojitos chinitos: una rayita. Dormido, la rayita baja y se aclara.
const PIPU_SLEEP = PIPU.map((r, i) => (i === 2 ? '..kkkkkkkkkk..' : i === 3 ? '..kggkyykggk..' : r));

// Pistas del caso
const CLUES = {
  pelos: ['.o..o..o', 'oo.oo.oo', '.ooooOo.', '..oOoo..', '...oo...'],
  huellas: ['.k.k.k.', '.k.k.k.', '.......', '..kkk..', '.kkkkk.', '.kkkkk.', '..kkk..'],
  foto: ['wwwwwwwww', 'wsssssssw', 'wsskkkssw', 'wskkkkksw', 'wskkkkksw', 'wsksssksw', 'wsksssksw', 'wsssssssw', 'wwwwwwwww', 'wwwwwwwww'],
  babas: ['...qqqqqq...', '.qqQQqqqqqq.', 'qqqqqqqQQqqq', '.qqqqqqqqqq.'],
  envoltorio: ['p.......p', 'pp.ppp.pp', 'ppppwpppp', 'pppwwwppp', 'ppppwpppp', 'pp.ppp.pp', 'p.......p'],
};
const CLUE_PAL = { o: '#f08a3c', O: '#b8662e', k: '#4a3a5a', w: '#ffffff', s: '#5b6ea8', q: '#8fd3ff', Q: '#e6f6ff', p: '#ff5fa2' };
const PAPER = ['wwwwwww', 'wkkwkkw', 'wwwwwww', 'wkkkkww', 'wwwwwww', 'wwkwkww', 'wwwkwww', 'wwwwwww'];
const ZZZ = ['zzz', '.z.', 'zzz'];
const NOTE = ['..n', '..n', 'nnn', 'nn.'];

// Silueta de tiza: el contorno de Pipu, acostado.
function chalkOutline(rows) {
  const h = rows.length, w = rows[0].length;
  const c = makeCanvas(h + 2, w + 2); // girado 90°
  const x = c.getContext('2d');
  const on = (px, py) => py >= 0 && py < h && px >= 0 && px < w && rows[py][px] !== '.';
  x.fillStyle = '#ffffff';
  for (let py = -1; py <= h; py++)
    for (let px = -1; px <= w; px++) {
      if (on(px, py)) continue;
      if ((on(px + 1, py) || on(px - 1, py) || on(px, py + 1) || on(px, py - 1)) && (px + py) % 3 !== 0) x.fillRect(py + 1, w - px, 1, 1);
    }
  return c;
}

// Manchas redondeadas con luz y sombra (árboles, arbustos, nubes).
function blob(circles, pal, seed = 1) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [cx, cy, r] of circles) {
    x0 = Math.min(x0, cx - r); y0 = Math.min(y0, cy - r);
    x1 = Math.max(x1, cx + r); y1 = Math.max(y1, cy + r);
  }
  const w = Math.ceil(x1 - x0) + 1;
  const h = Math.ceil(y1 - y0) + 1;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const inside = (x, y, grow = 0) => circles.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= (r + grow) ** 2);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = px + x0, y = py + y0;
      if (!inside(x, y)) continue;
      const n = Math.sin((px + seed * 7) * 12.9898 + py * 78.233) * 43758.5453;
      const rnd = n - Math.floor(n);
      let col = pal.mid;
      if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y + 1) || !inside(x, y - 1)) col = pal.edge;
      else if (!inside(x + 2, y + 3)) col = pal.dark;
      else if (inside(x + 3, y + 4, -3) && !inside(x - 3, y - 4, -1)) col = pal.light;
      else if (rnd > 0.94 && pal.dot) col = pal.dot;
      ctx.fillStyle = col;
      ctx.fillRect(px, py, 1, 1);
    }
  }
  return c;
}

function tree(variant) {
  const pal = variant === 0
    ? { mid: '#ff9fc6', light: '#ffd0e4', dark: '#e672a4', edge: '#c9578c', dot: '#ffe8f2' }
    : { mid: '#8fdcae', light: '#c5f3d3', dark: '#62c08d', edge: '#46a676', dot: '#ffd0e4' };
  const top = blob([[20, 14, 12], [10, 20, 9], [30, 20, 10], [20, 24, 11], [14, 10, 7], [27, 11, 7]], pal, variant + 2);
  const c = makeCanvas(top.width, top.height + 18);
  const x = c.getContext('2d');
  const tx = (top.width >> 1) - 3;
  for (let y = 0; y < 26; y++) {
    const yy = c.height - 26 + y;
    x.fillStyle = '#8a5a44'; x.fillRect(tx, yy, 6, 1);
    x.fillStyle = '#6e4535'; x.fillRect(tx + 4, yy, 2, 1);
    x.fillStyle = '#a87458'; x.fillRect(tx + 1, yy, 1, 1);
  }
  x.fillStyle = '#6e4535'; x.fillRect(tx - 1, c.height - 2, 8, 2);
  x.drawImage(top, 0, 0);
  return c;
}

function bush(variant) {
  const pal = { mid: '#6fcf7f', light: '#a6eca0', dark: '#4fb873', edge: '#3d9c62', dot: variant ? '#ff8fb8' : '#fff3a6' };
  const b = blob(variant ? [[8, 9, 7], [18, 7, 8], [28, 10, 6]] : [[7, 8, 6], [16, 7, 7]], pal, variant + 9);
  const c = makeCanvas(b.width, b.height - 4);
  c.getContext('2d').drawImage(b, 0, 0);
  return c;
}

function cloud(i) {
  const shapes = [
    [[10, 10, 7], [20, 8, 9], [31, 11, 6]],
    [[8, 8, 6], [17, 7, 7], [25, 9, 5]],
    [[12, 12, 9], [26, 9, 11], [40, 13, 8], [52, 14, 5]],
  ];
  const b = blob(shapes[i], { mid: '#ffffff', light: '#ffffff', dark: '#e3eeff', edge: '#f1f6ff' }, i);
  const c = makeCanvas(b.width, b.height - 5);
  c.getContext('2d').drawImage(b, 0, 0);
  return c;
}

function glow(r) {
  const c = makeCanvas(r * 2 + 1, r * 2 + 1);
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff';
  for (let py = 0; py <= r * 2; py++)
    for (let px = 0; px <= r * 2; px++) {
      const d = Math.hypot(px - r, py - r);
      if (d <= r && (d < r - 3 || (px + py) % 2 === 0)) x.fillRect(px, py, 1, 1);
    }
  return c;
}

// ------------------------------------------------------------------
export function buildSprites(config) {
  const h = config.her;
  const herPal = {
    h: h.hairDark, H: h.hair, o: h.hairLight, s: h.skin, S: h.skinShade,
    y: h.top, Y: h.topShine, v: h.pants, V: h.pantsShade, w: h.shoes, p: h.soles,
  };
  const herLegsPal = { ...herPal, s: h.pants }; // las piernas van con pantalón
  const facePal = { k: '#2a1a1a', w: '#ffffff', m: '#8c2f3a', b: '#f58a9a', r: '#ff6f8f', p: '#ff3d6e', s: h.skin };
  const m = config.him;
  const himPal = {
    k: m.hair, K: m.hairLight, t: m.skin, T: m.skinShade, j: m.shirt, J: m.shirtShade,
    w: m.shirt, g: m.watch, n: m.pants, N: m.pantsShade, r: m.shoes, W: m.soles,
  };
  const himFacePal = { k: '#1c1216', w: '#ffffff', m: '#6e2430', b: '#e8756f', q: '#8fd3ff' };

  const shiftTop = (rows, n) => rows.map((r, i) => (i < n ? '.' + r.slice(0, -1) : r));
  const flowers = [];
  for (const shape of [FLOWER_A, FLOWER_B]) {
    for (const col of FLOWER_COLORS) {
      const pal = { p: col, y: col === '#ffd75e' ? '#ff9f1c' : '#ffd75e', g: '#4fb873' };
      flowers.push([fromRows('flower', shape, pal), fromRows('flower2', shiftTop(shape, 3), pal)]);
    }
  }

  const A = config.arya, C = config.chif, Ti = config.tiana, Pi = config.pipu;
  const pipuPal = { k: Pi.body, w: Pi.belly, y: Pi.beak, e: Pi.eyes, g: Pi.closedEyes };

  return {
    arya: mapRows('arya', ARYA, { a: A.coat, e: A.ears, w: A.light, k: '#2a1a1a', n: A.nose }),
    chif: fromRows('chif', CHIF, { o: C.coat, w: C.light, b: C.dark, k: '#2a1a1a', n: C.nose }),
    tiana: fromRows('tiana', TIANA, { b: Ti.pajama, B: Ti.pajamaShade, p: Ti.earInside, w: Ti.wool, f: Ti.face, k: '#2a1a1a', m: '#d9788a' }),
    carino: fromRows('carino', CARINO, { b: config.carino.fur, B: config.carino.shade, w: '#ffffff', c: config.carino.cloud, d: config.carino.cloud, n: config.carino.nose, k: '#22305a', m: '#22305a' }),
    pipu: { awake: fromRows('pipu', PIPU, pipuPal), sleep: fromRows('pipuSleep', PIPU_SLEEP, pipuPal) },
    chalk: chalkOutline(PIPU),
    clues: mapRows('clue', CLUES, CLUE_PAL),
    clueGhost: mapRows('clueGhost', CLUES, Object.fromEntries(Object.keys(CLUE_PAL).map((k) => [k, '#5b4a6b']))),
    zzz: fromRows('zzz', ZZZ, { z: '#ffffff' }),
    paper: fromRows('paper', PAPER, { w: '#fff7ea', k: '#7a4b8a' }),
    // La sombra: su misma silueta, toda oscura
    shadow: (() => {
      const dark = Object.fromEntries(Object.keys(himPal).map((k) => [k, '#15122e']));
      return { head: fromRows('shadow.head', HIM_HEAD, dark), torso: mapRows('shadow.torso', HIM_TORSO, dark), legs: mapRows('shadow.legs', HIM_LEGS, dark) };
    })(),
    note: fromRows('note', NOTE, { n: '#ffffff' }),
    her: {
      head: fromRows('her.head', HER_HEAD, herPal),
      faces: HER_FACES.map((f, i) => fromRows(`her.face${i}`, f, facePal)),
      blink: fromRows('her.blink', HER_BLINK, facePal),
      torso: mapRows('her.torso', HER_TORSO, herPal),
      legs: mapRows('her.legs', HER_LEGS, herLegsPal),
    },
    him: {
      head: fromRows('him.head', HIM_HEAD, himPal),
      faces: mapRows('him.face', HIM_FACES, himFacePal),
      torso: mapRows('him.torso', HIM_TORSO, himPal),
      legs: mapRows('him.legs', HIM_LEGS, himPal),
    },
    bag: fromRows('bag', BAG, { w: '#ffffff', p: '#ff5fa2', P: '#ffe3ef', r: '#ff4d6d', y: '#ffc300', g: '#52d273' }),
    gomitas: GOMITA_COLORS.map((c, i) => fromRows(`gomita${i}`, GOMITA, { ...c, k: '#3a1830' })),
    gomitaGhost: fromRows('gomitaGhost', GOMITA, { o: '#5b4a6b', l: '#6b5a7b', d: '#4a3a5a', k: '#4a3a5a' }),
    hearts: HEART_COLORS.map((c) => fromRows('heart', HEART, { r: c, w: '#ffffff' })),
    heartsSmall: HEART_COLORS.map((c) => fromRows('heartS', HEART_SMALL, { r: c })),
    heartBig: fromRows('heartBig', HEART_BIG, { r: '#ff4d6d', w: '#ffffff' }),
    spring: [
      fromRows('spring', SPRING, { r: '#ff6f91', R: '#d94f76', w: '#ffffff', c: '#fff1d6', C: '#e8cfa6', k: '#5a3a4a' }),
      fromRows('springDown', [...SPRING.slice(0, 7), SPRING[8], SPRING[11]], { r: '#ff6f91', R: '#d94f76', w: '#ffffff', c: '#fff1d6', C: '#e8cfa6', k: '#5a3a4a' }),
    ],
    sign: fromRows('sign', SIGN, { b: '#7a4b3a', B: '#5e382b', L: '#e9b887', w: '#ffffff' }),
    flowers,
    tuft: fromRows('tuft', TUFT, { g: '#4fb873', G: '#86db8f' }),
    anger: fromRows('anger', ANGER, { r: '#ff3b3b' }),
    butterflies: ['#ffffff', '#ffd75e', '#ff8fb8'].map((c) => BUTTERFLY.map((f) => fromRows('butterfly', f, { b: c, k: '#5a3a4a' }))),
    trees: [tree(0), tree(1)],
    bushes: [bush(0), bush(1)],
    clouds: [cloud(0), cloud(1), cloud(2)],
    glow: [glow(9), glow(11)],
  };
}
