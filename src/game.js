// Lógica del juego: estados, gomitas, emociones, encuentros con él,
// partículas, cámara y escena final. No toca el DOM: avisa de lo que pasa
// mediante `emit(nombre, datos)` y main.js se encarga de sonido e interfaz.

import { Player, HEIGHT } from './player.js';

export const STEP = 1 / 120; // paso fijo de simulación
export const REACT_TIME = 0.8;
const MAX_PARTICLES = 320;
const NO_INPUT = { left: false, right: false, jump: false };

export class Game {
  constructor(config, level, emit = () => {}) {
    this.config = config;
    this.level = level;
    this.emit = emit;
    this.view = { w: 320, h: 180 };
    this.player = new Player(level, config.physics);
    this.reset();
  }

  setView(w, h) {
    this.view.w = w;
    this.view.h = h;
    this.updateCamera(1, true);
  }

  // Deja todo como al principio (pantalla de título).
  reset() {
    const lvl = this.level;
    this.state = 'title'; // title | playing | ending | won
    this.time = 0;
    this.player.reset(lvl.start.x, lvl.start.y);
    this.player.reactT = 0;
    this.player.cheer = false;
    this.gomitas = lvl.gomitas.map((g) => ({ ...g, collected: false }));
    this.hearts = lvl.hearts.map((h) => ({ ...h, collected: false }));
    this.count = 0;
    this.heartCount = 0;
    this.mood = 0;
    this.particles = [];
    this.bubbles = { her: null, him: null };
    this.bubbleSeq = 0;
    this.springAnim = lvl.springs.map(() => 0);
    this.npc = { spot: 0, x: 0, y: 0, facing: -1, state: 'idle', t: 0, cheerT: 0, spoken: false, love: false };
    this.placeNpc(0);
    this.ending = null;
    this.respawnT = 0;
    this.invulnT = 0;
    this.missingCd = 0;
    this.fxT = 0;
    this.cam = { x: 0, y: 0 };
    this.updateCamera(1, true);
  }

  start() {
    this.reset();
    this.state = 'playing';
    this.emit('start');
  }

  get total() {
    return this.gomitas.length;
  }

  // ------------------------------------------------------------
  step(dt, input) {
    this.time += dt;
    const pl = this.player;
    pl.reactT = Math.max(0, pl.reactT - dt);
    this.invulnT = Math.max(0, this.invulnT - dt);
    this.missingCd = Math.max(0, this.missingCd - dt);

    if (this.state === 'playing') {
      if (this.respawnT > 0) {
        this.respawnT -= dt;
        if (this.respawnT <= 0) this.respawn();
      } else {
        pl.update(dt, input);
        this.handlePlayerEvents();
        this.checkPickups();
        this.checkFall();
        this.checkGoal();
      }
      if (this.state === 'playing') this.updateNpc(dt);
    } else if (this.state === 'ending' || this.state === 'won') {
      this.updateEnding(dt);
    } else {
      pl.update(dt, NO_INPUT);
      pl.events.length = 0;
      this.npc.facing = -1;
    }

    this.updateMoodFx(dt);
    this.updateParticles(dt);
    for (const who of ['her', 'him']) {
      const b = this.bubbles[who];
      if (b && (b.t -= dt) <= 0) this.bubbles[who] = null;
    }
    for (let i = 0; i < this.springAnim.length; i++) this.springAnim[i] = Math.max(0, this.springAnim[i] - dt);
    this.updateCamera(dt, false);
  }

  // ------------------------------------------------------------
  handlePlayerEvents() {
    const pl = this.player;
    for (const ev of pl.events) {
      if (ev.type === 'jump') {
        this.emit('jump');
        this.dust(pl.x, pl.y, 3);
      } else if (ev.type === 'land') {
        this.emit('land');
        this.dust(pl.x, pl.y, 5);
      } else if (ev.type === 'spring') {
        this.springAnim[ev.index] = 0.3;
        this.emit('spring');
        this.burst('spark', pl.x, pl.y, 6, { color: '#ffffff', speed: 60 });
      }
    }
    pl.events.length = 0;
  }

  checkPickups() {
    const pl = this.player;
    const cy = pl.y - HEIGHT / 2;
    for (const g of this.gomitas) {
      if (g.collected) continue;
      if (Math.abs(pl.x - g.x) < 12 && Math.abs(cy - g.y) < 17) this.collectGomita(g);
    }
    for (const h of this.hearts) {
      if (h.collected) continue;
      if (Math.abs(pl.x - h.x) < 9 && Math.abs(cy - h.y) < 14) {
        h.collected = true;
        this.heartCount++;
        this.burst('spark', h.x, h.y, 5, { color: '#ff8fb8', speed: 45 });
        this.emit('heart', { hearts: this.heartCount });
      }
    }
  }

  collectGomita(g) {
    if (g.collected) return; // nunca dos veces
    g.collected = true;
    this.count++;
    const nMoods = this.config.texts.moods.length;
    this.mood = Math.min(nMoods - 1, Math.round((this.count / this.total) * (nMoods - 1)));
    this.player.reactT = REACT_TIME;
    const colors = ['#ff4d6d', '#ff9f1c', '#ffd60a', '#52d273', '#b06cff'];
    this.burst('spark', g.x, g.y, 16, { color: colors[g.color % colors.length], speed: 95 });
    this.burst('spark', g.x, g.y, 8, { color: '#ffffff', speed: 60 });
    this.burst('heart', g.x, g.y, 7, { speed: 55, up: 50 });
    const lines = this.config.texts.pickup;
    this.say('her', lines[Math.min(this.count - 1, lines.length - 1)], 3);
    if (Math.abs(this.npc.x - this.player.x) < 260) this.npc.cheerT = 1.4;
    this.emit('gomita', { count: this.count, total: this.total, mood: this.mood });
    if (this.count === this.total) this.emit('allGomitas');
  }

  checkFall() {
    const pl = this.player;
    if (pl.y > this.level.waterY + 14 && this.respawnT <= 0) {
      this.respawnT = 0.7;
      this.burst('splash', pl.x, this.level.waterY, 12, { speed: 90, up: 120 });
      this.emit('splash');
    }
  }

  respawn() {
    const pl = this.player;
    const { safeX, safeY, facing } = pl;
    const keep = { reactT: 0, cheer: false };
    pl.reset(safeX, safeY);
    Object.assign(pl, keep);
    pl.facing = facing;
    this.invulnT = 1;
    this.burst('puff', safeX, safeY - 10, 8, { speed: 40 });
    this.emit('respawn');
  }

  checkGoal() {
    const pl = this.player;
    const last = this.level.npcSpots.length - 1;
    // Al acercarse a la meta, él ya debe estar esperando allí.
    if (pl.x > this.level.goalX - 240 && this.npc.spot < last && this.npc.state !== 'leaving') {
      this.npc.state = 'leaving';
      this.npc.t = 0;
      this.npc.jumpTo = last;
    }
    if (this.ending || this.count < this.total) return;
    if (pl.x >= this.level.goalX && pl.onGround) this.startEnding();
  }

  // ------------------------------------------------------------
  // Él: espera en un punto, dice algo, y sale corriendo al siguiente.
  placeNpc(i) {
    const s = this.level.npcSpots[i];
    Object.assign(this.npc, { spot: i, x: s.x, y: s.y, state: 'idle', t: 0, spoken: false, jumpTo: null });
  }

  updateNpc(dt) {
    const n = this.npc;
    const pl = this.player;
    const last = this.level.npcSpots.length - 1;
    const dx = pl.x - n.x;
    const dy = pl.y - n.y;
    n.cheerT = Math.max(0, n.cheerT - dt);
    if (Math.abs(dx) > 4) n.facing = dx < 0 ? -1 : 1;

    if (n.state === 'leaving') {
      n.t += dt;
      if (n.t > 0.45) {
        this.burst('puff', n.x, n.y - 12, 10, { speed: 45 });
        this.emit('poof');
        this.placeNpc(n.jumpTo ?? Math.min(n.spot + 1, last));
        this.burst('puff', n.x, n.y - 12, 8, { speed: 35 });
      }
      return;
    }

    const near = Math.abs(dx) < 92 && Math.abs(dy) < 72;
    if (n.spot === last) {
      if (near && this.count < this.total && this.missingCd <= 0) {
        const missing = this.total - this.count;
        const T = this.config.texts;
        this.say('him', missing === 1 ? T.missingOne : T.missingMany.replace('{n}', missing), 3.5);
        this.missingCd = 7;
        this.emit('missing', { missing });
      }
      return;
    }
    if (!n.spoken && near) {
      n.spoken = true;
      n.t = 0;
      const line = this.config.texts.npc[n.spot];
      if (line) this.say('him', line, 3.2);
    }
    if (n.spoken) n.t += dt;
    if ((n.spoken && n.t > 3.3 && (dx > 12 || n.t > 6)) || dx > 180) {
      n.state = 'leaving';
      n.t = 0;
    }
  }

  say(who, text, dur) {
    this.bubbles[who] = { text, t: dur, id: ++this.bubbleSeq };
    this.emit('talk', { who });
  }

  // ------------------------------------------------------------
  // Escena final. Solo puede empezar una vez por partida.
  startEnding() {
    if (this.ending) return;
    this.ending = { t: 0, phase: 0 };
    this.state = 'ending';
    const last = this.level.npcSpots.length - 1;
    if (this.npc.spot !== last || this.npc.state !== 'idle') this.placeNpc(last);
    this.npc.cheerT = 0;
    this.bubbles.her = this.bubbles.him = null;
    this.emit('endingStart');
  }

  updateEnding(dt) {
    const e = this.ending;
    const pl = this.player;
    const n = this.npc;
    const T = this.config.texts;
    e.t += dt;
    n.facing = -1;

    if (e.phase === 0) {
      // Ella camina sola hasta quedar frente a él.
      const target = n.x - 26;
      const dir = pl.x < target - 2 ? 1 : pl.x > target + 2 ? -1 : 0;
      pl.update(dt, { left: dir < 0, right: dir > 0, jump: false });
      pl.events.length = 0;
      if ((dir === 0 && pl.onGround && Math.abs(pl.vx) < 5) || e.t > 6) {
        if (e.t > 6) { pl.x = target; pl.y = n.y; pl.vy = 0; pl.onGround = true; }
        pl.vx = 0;
        pl.facing = 1;
        e.phase = 1;
        e.t = 0;
      }
      return;
    }

    pl.update(dt, NO_INPUT);
    pl.events.length = 0;
    pl.facing = 1;
    const mid = (pl.x + n.x) / 2;

    if (e.t > 0.5 && !e.asked) {
      e.asked = true;
      this.say('him', T.endingAsk, 2.3);
    }
    if (e.t > 3 && !e.love) {
      e.love = true;
      pl.cheer = true;
      n.love = true;
      this.burst('heart', mid, pl.y - 26, 22, { speed: 90, up: 90 });
      this.burst('spark', mid, pl.y - 26, 18, { color: '#fff3a6', speed: 110 });
      this.emit('bigText');
    }
    if (e.love) {
      // Lluvia suave de corazones y brillos mientras dure la escena.
      this.fxT -= dt;
      if (this.fxT <= 0) {
        this.fxT = 0.09;
        const x = this.cam.x + Math.random() * this.view.w;
        this.spawn({ type: 'heart', x, y: this.cam.y - 6, vx: (Math.random() - 0.5) * 16, vy: 26 + Math.random() * 30, life: 6, g: 0, sway: Math.random() * 6, variant: (Math.random() * 3) | 0, small: Math.random() < 0.4 });
        if (Math.random() < 0.5) this.spawn({ type: 'spark', x: mid + (Math.random() - 0.5) * 80, y: pl.y - 10 - Math.random() * 60, vx: 0, vy: -8, life: 0.6, g: 0, color: Math.random() < 0.5 ? '#ffffff' : '#fff3a6' });
      }
      // Se acercan para el abrazo.
      if (e.t > 4.4) pl.x += (n.x - 13 - pl.x) * Math.min(1, dt * 3);
    }
    if (e.t > 6.2 && !e.replied) {
      e.replied = true;
      this.say('him', T.endingReply, 3.4);
    }
    if (e.t > 9 && this.state === 'ending') {
      this.state = 'won';
      this.emit('won', { count: this.count, total: this.total, hearts: this.heartCount, heartsTotal: this.hearts.length });
    }
  }

  // ------------------------------------------------------------
  // Efectos que dependen del estado emocional.
  updateMoodFx(dt) {
    if (this.state === 'ending' || this.state === 'won') return;
    this.fxT -= dt;
    if (this.fxT > 0) return;
    const pl = this.player;
    const headY = pl.y - 22;
    if (this.mood === 0) {
      this.fxT = 1.1;
      for (const s of [-1, 1]) this.spawn({ type: 'steam', x: pl.x + s * 7, y: headY, vx: s * 16, vy: -22, life: 0.55, g: -20 });
    } else if (this.mood === 1) {
      this.fxT = 2.2;
      this.spawn({ type: 'steam', x: pl.x - pl.facing * 7, y: headY, vx: -pl.facing * 12, vy: -20, life: 0.5, g: -20 });
    } else if (this.mood >= 4) {
      this.fxT = this.mood >= 5 ? 0.45 : 0.9;
      this.spawn({ type: 'heart', x: pl.x + (Math.random() - 0.5) * 14, y: headY - 2, vx: (Math.random() - 0.5) * 14, vy: -26, life: 1, g: 0, small: true, variant: (Math.random() * 3) | 0 });
      if (this.mood >= 5) this.spawn({ type: 'spark', x: pl.x + (Math.random() - 0.5) * 22, y: pl.y - Math.random() * 26, vx: 0, vy: -10, life: 0.45, g: 0, color: '#fff3a6' });
    } else {
      this.fxT = 1;
    }
  }

  spawn(p) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    p.max = p.life;
    this.particles.push(p);
  }

  burst(type, x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
      const sp = (o.speed || 60) * (0.45 + Math.random() * 0.55);
      this.spawn({
        type, x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (o.up || 0),
        life: type === 'heart' ? 1.1 + Math.random() * 0.5 : 0.45 + Math.random() * 0.35,
        g: type === 'heart' ? 60 : type === 'splash' ? 420 : type === 'puff' ? 0 : 120,
        color: o.color,
        variant: (Math.random() * 3) | 0,
        small: type === 'heart' && Math.random() < 0.4,
      });
    }
  }

  dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.spawn({ type: 'dust', x: x + (Math.random() - 0.5) * 8, y: y - 1, vx: (Math.random() - 0.5) * 50, vy: -8 - Math.random() * 18, life: 0.3 + Math.random() * 0.15, g: 0 });
    }
  }

  updateParticles(dt) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt + (p.sway ? Math.sin(this.time * 2 + p.sway) * 10 * dt : 0);
      p.y += p.vy * dt;
    }
  }

  // ------------------------------------------------------------
  updateCamera(dt, snap) {
    const { w, h } = this.view;
    const lvl = this.level;
    const pl = this.player;
    let tx;
    let ty = pl.y - 20 - h * 0.56;
    if (this.state === 'title' || this.ending) tx = (pl.x + this.npc.x) / 2 - w / 2;
    else tx = pl.x + pl.facing * 22 - w / 2;
    tx = Math.max(0, Math.min(Math.max(0, lvl.width - w), tx));
    ty = Math.max(0, Math.min(Math.max(0, lvl.height - h), ty));
    if (snap) {
      this.cam.x = tx;
      this.cam.y = ty;
    } else {
      this.cam.x += (tx - this.cam.x) * (1 - Math.exp(-dt * 5));
      this.cam.y += (ty - this.cam.y) * (1 - Math.exp(-dt * 4));
    }
  }
}
