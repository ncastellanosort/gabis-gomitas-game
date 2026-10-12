// Lógica del juego: estados, gomitas y emociones (nivel 1), pistas y
// sospechosos (nivel 2), Arya, partículas, cámara y escenas finales. No toca el DOM: avisa de lo que pasa
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
    this.mode = level.id; // 'gomitas' | 'pipu'
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
    this.clues = (lvl.clues || []).map((c) => ({ ...c, collected: false, sat: false, sitT: 0 }));
    this.suspects = Object.fromEntries(Object.entries(lvl.suspects || {}).map(([id, s]) => [id, { facing: -1, ...s, spoken: false, hinted: false }]));
    this.wrong = 0;
    this.pipu = { state: 'hidden', t: 0 };
    this.guardCd = 0;
    this.shadow = { i: 0, state: 'lurk' }; // la sombra que huye (nivel 2)
    this.nico = { spoken: false };
    this.papers = (lvl.papers || []).map((p) => ({ ...p, read: false }));
    this.hearts = lvl.hearts.map((h) => ({ ...h, collected: false }));
    this.count = 0;
    this.heartCount = 0;
    this.mood = this.mode === 'gomitas' ? 0 : 3;
    this.particles = [];
    this.bubbles = {};
    this.bubbleSeq = 0;
    this.springAnim = lvl.springs.map(() => 0);
    this.npc = { spot: 0, x: lvl.start.x, y: lvl.start.y, facing: -1, state: 'idle', t: 0, cheerT: 0, spoken: false, love: false, hidden: this.mode !== 'gomitas' };
    if (this.mode === 'gomitas') this.placeNpc(0);
    else if (lvl.him) Object.assign(this.npc, { hidden: false, x: lvl.him.x, y: lvl.him.y }); // menú
    else if (lvl.shadowSpots) Object.assign(this.npc, { hidden: false, shadow: true, x: lvl.shadowSpots[0].x, y: lvl.shadowSpots[0].y });
    this.arya = { x: lvl.start.x - 22, y: lvl.start.y, facing: 1, moving: false, air: false, sit: false, idleT: 0, hopT: 0, guiltyT: 0, override: null };
    this.trail = [{ x: this.arya.x, y: this.arya.y, air: false }];
    this.idleT = 0;
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
    return this.mode === 'pipu' ? this.clues.length : this.gomitas.length;
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
        if (this.mode === 'gomitas') this.checkGoal();
        else this.checkClues();
      }
      if (this.state === 'playing') {
        if (this.mode === 'gomitas') this.updateNpc(dt);
        else this.updateCase(dt);
      }
    } else if (this.state === 'ending' || this.state === 'won') {
      if (this.mode === 'gomitas') this.updateEnding(dt);
      else this.updateCaseEnding(dt);
    } else {
      pl.update(dt, NO_INPUT);
      pl.events.length = 0;
      this.npc.facing = -1;
    }

    this.updateArya(dt);
    this.updateMoodFx(dt);
    this.updateParticles(dt);
    for (const who in this.bubbles) {
      const b = this.bubbles[who];
      if (b && (b.t -= dt) <= 0) delete this.bubbles[who];
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
    this.arya.hopT = 0.7;
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
    // Arya reaparece con ella.
    this.arya.x = safeX - facing * 18;
    this.arya.y = safeY;
    this.trail = [{ x: this.arya.x, y: this.arya.y, air: false }];
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
    this.bubbles = {};
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
      this.emit('won', { mode: 'gomitas', count: this.count, total: this.total, hearts: this.heartCount, heartsTotal: this.hearts.length });
    }
  }


  // ------------------------------------------------------------
  // Arya la acompaña siempre: sigue el mismo camino, un poquito atrás.
  updateArya(dt) {
    const a = this.arya;
    const pl = this.player;
    const tr = this.trail;
    const last = tr[tr.length - 1];
    if (Math.hypot(pl.x - last.x, pl.y - last.y) >= 2) tr.push({ x: pl.x, y: pl.y, air: !pl.onGround });
    if (tr.length > 700) tr.shift();
    this.idleT = pl.onGround && Math.abs(pl.vx) < 8 ? this.idleT + dt : 0;
    a.hopT = Math.max(0, a.hopT - dt);
    a.guiltyT = Math.max(0, a.guiltyT - dt);

    let tx, ty, air = false, wantSit = false;
    if (a.override) {
      tx = a.override.x;
      ty = a.override.y;
      wantSit = !!a.override.sit;
    } else if (this.idleT > 0.25 && this.respawnT <= 0) {
      // Ella está quieta: Arya se acomoda a su lado, sobre suelo firme.
      const side = pl.x - pl.facing * 18;
      const r = Math.floor(pl.y / 16);
      tx = this.level.tileAt(Math.floor(side / 16), r) ? side : pl.x;
      ty = pl.y;
      tr.length = 0;
      tr.push({ x: tx, y: ty, air: false });
    } else {
      let i = tr.length - 1;
      let acc = 0;
      while (i > 0 && acc < 22) {
        acc += Math.hypot(tr[i].x - tr[i - 1].x, tr[i].y - tr[i - 1].y);
        i--;
      }
      tx = tr[i].x;
      ty = tr[i].y;
      air = tr[i].air;
      if (i > 0) tr.splice(0, i);
    }
    const dx = tx - a.x;
    const dy = ty - a.y;
    const d = Math.hypot(dx, dy);
    const maxStep = (a.override ? 170 : 260) * dt;
    if (d <= maxStep) { a.x = tx; a.y = ty; }
    else { a.x += (dx / d) * maxStep; a.y += (dy / d) * maxStep; }
    a.moving = d > 0.6;
    if (Math.abs(dx) > 0.6) a.facing = dx > 0 ? 1 : -1;
    else if (!a.moving) a.facing = a.override && a.override.face ? a.override.face : pl.x >= a.x ? 1 : -1;
    a.air = !a.override && air && a.moving;
    a.idleT = a.moving ? 0 : a.idleT + dt;
    a.sit = !a.moving && (wantSit || a.idleT > 1.6);
  }

  // Dónde está la cabeza de cada personaje (para los globos de diálogo).
  speakerPos(who) {
    if (who === 'her') return { x: this.player.x, y: this.player.y - 31 };
    if (who === 'him') return { x: this.npc.x, y: this.npc.y - 37 };
    if (who === 'arya') return { x: this.arya.x + this.arya.facing * 4, y: this.arya.y - 19 };
    if (who === 'pipu') return { x: this.level.bed.x, y: this.level.bed.y - 26 };
    const s = this.suspects[who];
    return { x: s.x, y: s.y - (who === 'tiana' ? 24 : who === 'carino' ? 22 : 19) };
  }

  // ------------------------------------------------------------
  // NIVEL 2 · El asesinato de Pipu
  checkClues() {
    const pl = this.player;
    const cy = pl.y - HEIGHT / 2;
    for (const c of this.clues) {
      if (c.collected || c.hidden) continue;
      if (Math.abs(pl.x - c.x) < 12 && Math.abs(cy - c.y) < 17) this.collectClue(c);
    }
  }

  collectClue(c) {
    if (c.collected || c.hidden) return;
    c.collected = true;
    this.count++;
    this.player.reactT = REACT_TIME;
    this.arya.guiltyT = 2.5;
    this.burst('spark', c.x, c.y, 14, { color: '#fff3a6', speed: 90 });
    this.burst('spark', c.x, c.y, 8, { color: '#ffffff', speed: 60 });
    this.say('her', this.config.texts.pipu.clues[c.kind].say, 3.4);
    this.emit('clue', { count: this.count, total: this.total, kind: c.kind });
    if (this.count === this.total) this.emit('allClues');
  }

  updateCase(dt) {
    const pl = this.player;
    const a = this.arya;
    const T = this.config.texts.pipu;
    this.guardCd = Math.max(0, this.guardCd - dt);

    // Interrogatorios: cada sospechoso da su coartada al acercarse.
    for (const id in this.suspects) {
      const s = this.suspects[id];
      const dx = pl.x - s.x;
      if (Math.abs(dx) > 4) s.facing = dx < 0 ? -1 : 1;
      const near = Math.abs(dx) < 70 && Math.abs(pl.y - s.y) < 60;
      if (near && !s.spoken) {
        s.spoken = true;
        this.say(id, T.alibi[id], 4.2);
        this.emit('suspect', { id });
      } else if (near && s.spoken && !s.hinted && T.hint[id] && this.count === this.total && !this.bubbles[id]) {
        s.hinted = true;
        this.say(id, T.hint[id], 4.2);
      }
    }

    // La pista escondida: Arya corre a sentarse encima y solo se ve cuando se levanta.
    const hc = this.clues.find((c) => c.hidden);
    let override = null;
    if (hc) {
      const d = Math.abs(pl.x - hc.x);
      if (!hc.sat && d < 80 && Math.abs(pl.y - hc.ground) < 70) {
        hc.sat = true;
        this.say('arya', T.aryaWhistle, 2.6);
        this.emit('bark');
      }
      if (hc.sat) {
        override = { x: hc.x, y: hc.ground, sit: true };
        const seated = Math.abs(a.x - hc.x) < 3;
        if (seated) hc.sitT += dt;
        if (seated && hc.sitT > 1 && d > 105) {
          hc.hidden = false;
          override = null;
          this.burst('spark', hc.x, hc.y, 12, { color: '#bfe9ff', speed: 70 });
          this.say('her', T.revealed, 3.4);
          this.emit('reveal');
        }
      }
    }
    // Arya vigila su camita: ahí hay un bulto muy sospechoso.
    const bed = this.level.bed;
    if (pl.x > bed.x - 110) {
      override = { x: bed.x - 24, y: bed.y, sit: false, face: -1 };
      if (this.guardCd <= 0 && pl.x > bed.x - 80) {
        this.guardCd = 9;
        this.say('arya', T.aryaGuard, 3);
        this.emit('bark');
      }
    }
    a.override = override;

    // Notas anónimas: se leen al pasar.
    this.papers.forEach((p, i) => {
      if (p.read || Math.abs(pl.x - p.x) > 12 || Math.abs(pl.y - p.y) > 30) return;
      p.read = true;
      this.say('her', T.papers[i], 4.6);
      this.emit('paper');
    });

    // La sombra: aparece a lo lejos, huye al acercarse y al final da la cara.
    const n = this.npc;
    const sh = this.shadow;
    if (sh.state === 'revealed') {
      if (Math.abs(pl.x - n.x) > 4) n.facing = pl.x < n.x ? -1 : 1;
      return;
    }
    const spots = this.level.shadowSpots;
    const last = sh.i === spots.length - 1;
    const dx = pl.x - n.x;
    if (n.state === 'leaving') {
      n.t += dt;
      if (n.t > 0.45) {
        this.burst('puff', n.x, n.y - 12, 10, { speed: 45 });
        this.emit('poof');
        sh.i = Math.min(sh.i + 1, spots.length - 1);
        Object.assign(n, { x: spots[sh.i].x, y: spots[sh.i].y, state: 'idle', t: 0 });
      }
    } else {
      if (Math.abs(dx) > 4) n.facing = dx < 0 ? -1 : 1;
      if (Math.abs(dx) < 80 && Math.abs(pl.y - n.y) < 70) {
        if (last) {
          sh.state = 'revealed';
          n.shadow = false;
          n.spoken = true;
          this.nico.spoken = true;
          this.burst('puff', n.x, n.y - 12, 10, { speed: 45 });
          this.say('him', T.nicoReveal, 4.6);
          this.emit('reveal');
        } else {
          this.say('her', T.shadowLines[Math.min(sh.i, T.shadowLines.length - 1)], 2.4);
          this.emit('sting');
          n.state = 'leaving';
          n.t = 0;
        }
      } else if (!last && dx > 170) {
        n.state = 'leaving'; // pasó de largo: la sombra se adelanta
        n.t = 0;
      }
    }
  }

  // Acusar desde la libreta. Devuelve { ok, text }.
  accuse(who) {
    const T = this.config.texts.pipu;
    if (this.state !== 'playing' || this.ending) return { ok: false, text: '' };
    if (this.count < this.total) return { ok: false, text: T.needClues };
    if (who !== 'arya') {
      this.wrong++;
      return { ok: false, text: T.defense[who] };
    }
    return { ok: true, text: T.aryaRevealed };
  }

  // Escena final del caso: corte a la camita de Arya. Solo una vez.
  startCaseEnding() {
    if (this.ending || this.count < this.total) return;
    const bed = this.level.bed;
    const pl = this.player;
    this.ending = { t: 0, done: {} };
    this.state = 'ending';
    pl.reset(bed.x - 56, bed.y);
    pl.reactT = 0;
    pl.cheer = false;
    this.respawnT = 0;
    this.arya.override = { x: bed.x - 24, y: bed.y, sit: true, face: -1 };
    Object.assign(this.npc, { hidden: true, shadow: false, state: 'idle' });
    this.arya.x = bed.x - 24;
    this.arya.y = bed.y;
    this.trail = [{ x: this.arya.x, y: this.arya.y, air: false }];
    this.bubbles = {};
    this.updateCamera(1, true);
    this.emit('endingStart');
  }

  updateCaseEnding(dt) {
    const e = this.ending;
    const pl = this.player;
    const T = this.config.texts.pipu;
    const bed = this.level.bed;
    e.t += dt;
    pl.update(dt, NO_INPUT);
    pl.events.length = 0;
    pl.facing = 1;
    this.pipu.t += dt;
    const at = (t, key, fn) => {
      if (e.t >= t && !e.done[key]) { e.done[key] = true; fn(); }
    };
    at(0.6, 'react', () => { pl.reactT = 0; this.say('her', T.endReact, 2.4); });
    at(3.3, 'her1', () => this.say('her', T.endHer1, 2.4));
    at(5.8, 'arya1', () => { this.arya.guiltyT = 9; this.say('arya', T.endArya1, 2.2); this.emit('bark'); });
    at(8.2, 'blanket', () => {
      this.pipu.state = 'sleep';
      this.burst('puff', bed.x, bed.y - 10, 12, { speed: 55 });
      this.emit('poof');
      this.say('her', T.endHer2, 2);
    });
    at(10.4, 'arya2', () => { this.arya.override.face = -1; this.say('arya', T.endArya2, 3); });
    at(13.6, 'burp', () => {
      this.pipu.state = 'awake';
      this.pipu.t = 0;
      pl.cheer = true;
      this.arya.override = { x: bed.x - 24, y: bed.y, sit: false, face: 1 };
      e.party = true;
      this.say('pipu', T.endPipu, 2.2);
      this.burst('heart', bed.x, bed.y - 20, 18, { speed: 90, up: 90 });
      this.burst('spark', bed.x, bed.y - 20, 16, { color: '#fff3a6', speed: 110 });
      this.emit('burp');
      this.emit('bigText');
    });
    at(16.2, 'him', () => {
      const n = this.npc;
      Object.assign(n, { hidden: false, x: bed.x + 46, y: bed.y, facing: -1, state: 'idle', spoken: true });
      this.burst('puff', n.x, n.y - 12, 10, { speed: 45 });
      this.emit('poof');
      this.say('him', T.endHim, 3.2);
    });
    at(19.6, 'arya3', () => { this.say('arya', T.endArya3, 2.4); this.emit('bark'); });
    if (this.pipu.state === 'sleep') {
      this.fxT -= dt;
      if (this.fxT <= 0) {
        this.fxT = 0.7;
        this.spawn({ type: 'zzz', x: bed.x + 6, y: bed.y - 22, vx: 8, vy: -14, life: 1.5, g: 0 });
      }
    }
    if (e.party) {
      this.arya.hopT = this.arya.hopT > 0 ? this.arya.hopT : 0.6;
      this.fxT -= dt;
      if (this.fxT <= 0) {
        this.fxT = 0.12;
        const x = this.cam.x + Math.random() * this.view.w;
        this.spawn({ type: 'heart', x, y: this.cam.y - 6, vx: (Math.random() - 0.5) * 16, vy: 26 + Math.random() * 30, life: 6, g: 0, sway: Math.random() * 6, variant: (Math.random() * 3) | 0, small: Math.random() < 0.4 });
      }
    }
    if (e.t > 22.1 && this.state === 'ending') {
      this.state = 'won';
      this.emit('won', { mode: 'pipu', count: this.count, total: this.total, wrong: this.wrong, hearts: this.heartCount, heartsTotal: this.hearts.length });
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
    if (lvl.focusX) tx = lvl.focusX - w / 2;
    else if (this.mode === 'pipu') tx = (this.ending ? (pl.x + lvl.bed.x + 24) / 2 : pl.x + pl.facing * 22) - w / 2;
    else if (this.state === 'title' || this.ending) tx = (pl.x + this.npc.x) / 2 - w / 2;
    else tx = pl.x + pl.facing * 22 - w / 2;
    tx = Math.max(0, Math.min(Math.max(0, lvl.width - w), tx));
    // En las escenas finales la cámara baja un poco: los personajes quedan
    // más arriba y el cartel final no los tapa.
    const maxY = Math.max(0, lvl.height - h) + (this.ending ? 28 : 0);
    if (this.ending) ty = maxY;
    ty = Math.max(0, Math.min(maxY, ty));
    if (snap) {
      this.cam.x = tx;
      this.cam.y = ty;
    } else {
      this.cam.x += (tx - this.cam.x) * (1 - Math.exp(-dt * 5));
      this.cam.y += (ty - this.cam.y) * (1 - Math.exp(-dt * 4));
    }
  }
}
