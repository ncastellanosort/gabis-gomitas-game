// Dibuja el mundo en un canvas de baja resolución (pixel art nítido).

import { TILE, T, hash2 } from './level.js';
import { buildSprites, makeCanvas } from './sprites.js';
import { REACT_TIME } from './game.js';

const SKY = ['#8ecbff', '#9ed4ff', '#afdcff', '#c1e5ff', '#d4ecff', '#e6f0ff', '#f6eefc', '#ffe9f3', '#ffdfeb'];
const SKY_NIGHT = ['#3b3f8f', '#4347a0', '#4c52ae', '#5960bb', '#6a70c6', '#7d82d0', '#9391d8', '#ab9fde', '#c4ade2'];
const BG_W = 512;

export class Renderer {
  constructor(canvas, level, config) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.S = buildSprites(config);
    this.worlds = {};
    this.setLevel(level);
    this.far = this.buildHills(150, [[18, 2, 1], [9, 5, 2.3]], '#c9b6ee', '#ddd0f7', false);
    this.mid = this.buildHills(176, [[12, 3, 0.5], [5, 7, 4]], '#a6e3b8', '#c6f2cf', true);
    this.clouds = Array.from({ length: 8 }, (_, i) => ({
      x: i * 95 + hash2(i, 1) * 50, y: 8 + hash2(i, 2) * 70, v: 2 + hash2(i, 3) * 4, s: i % 3,
    }));
    this.butterflies = Array.from({ length: 12 }, (_, i) => ({
      x: 120 + i * 270 + hash2(i, 4) * 120, y: 120 + hash2(i, 5) * 50, c: i % 3, ph: hash2(i, 6) * 10,
    }));
    this.resize(320, 180);
  }

  // Cambia de nivel (la capa del mundo se dibuja una vez y se guarda).
  setLevel(level) {
    this.level = level;
    this.night = level.theme === 'night';
    this.world = this.worlds[level.id] || (this.worlds[level.id] = this.buildWorld());
    this.stars = Array.from({ length: 46 }, (_, i) => ({ x: hash2(i, 31), y: hash2(i, 32) * 0.55, big: hash2(i, 33) > 0.8, ph: hash2(i, 34) * 6 }));
  }

  resize(w, h) {
    this.cv.width = w;
    this.cv.height = h;
    this.ctx.imageSmoothingEnabled = false;
  }

  // ---------- Capas pre-dibujadas ----------
  buildHills(base, waves, color, light, withTrees) {
    const H = this.level.height;
    const c = makeCanvas(BG_W, H);
    const x = c.getContext('2d');
    const top = (px) => Math.round(base + waves.reduce((s, [a, k, ph]) => s + a * Math.sin((px / BG_W) * Math.PI * 2 * k + ph), 0));
    if (withTrees) {
      for (let i = 0; i < 9; i++) {
        const px = Math.floor(i * (BG_W / 9) + hash2(i, 11) * 30);
        const y = top(px);
        const r = 5 + Math.floor(hash2(i, 12) * 4);
        x.fillStyle = '#9a86b8';
        x.fillRect(px, y - 8, 2, 10);
        x.fillStyle = i % 2 ? '#ffb7d3' : '#8ed6a8';
        for (let dy = -r; dy <= r; dy++) {
          const half = Math.floor(Math.sqrt(r * r - dy * dy));
          x.fillRect(px + 1 - half, y - 8 - r + dy, half * 2, 1);
        }
        x.fillStyle = i % 2 ? '#ffd3e5' : '#b4ecc6';
        x.fillRect(px - 2, y - 11 - r, 3, 2);
      }
    }
    for (let px = 0; px < BG_W; px++) {
      const y = top(px);
      x.fillStyle = color;
      x.fillRect(px, y, 1, H - y);
      x.fillStyle = light;
      x.fillRect(px, y, 1, 2);
    }
    return c;
  }

  buildWorld() {
    const lvl = this.level;
    const c = makeCanvas(lvl.width, lvl.height);
    const x = c.getContext('2d');
    for (const s of lvl.shades) {
      x.fillStyle = 'rgba(72, 48, 110, 0.32)';
      x.fillRect(s.x, s.y, s.w, s.h);
    }
    for (let r = 0; r < lvl.rows; r++) {
      for (let col = 0; col < lvl.cols; col++) {
        const t = lvl.tileAt(col, r);
        if (t === T.SOLID) this.paintGround(x, col, r);
        else if (t === T.WOOD) this.paintWood(x, col, r);
        else if (t === T.CLOUD) this.paintCloud(x, col, r);
      }
    }
    return c;
  }

  paintGround(x, col, row) {
    const lvl = this.level;
    const solid = (c, r) => (r >= lvl.rows ? true : lvl.isSolid(c, r));
    const up = solid(col, row - 1), dn = solid(col, row + 1), lf = solid(col - 1, row), rt = solid(col + 1, row);
    const x0 = col * TILE, y0 = row * TILE;
    for (let py = 0; py < TILE; py++) {
      for (let px = 0; px < TILE; px++) {
        const wx = x0 + px, wy = y0 + py;
        const n = hash2(wx, wy);
        let color = wy > 216 ? '#c1876b' : '#c98f72';
        if (n < 0.035) color = '#d9a585';
        // piedritas sueltas en vez de ruido fino
        const stone = hash2(Math.floor(wx / 4), Math.floor(wy / 3) + 40);
        if (stone > 0.955) color = (wx % 4 === 3 || wy % 3 === 2) ? '#a96d52' : '#b57a5d';
        if ((!lf && px === 0) || (!rt && px === 15) || (!dn && py === 15)) color = '#8a5a48';
        if (!up) {
          const depth = 4 + [0, 0, 1, 2, 2, 1][wx % 6];
          if (py === 0 && ((!lf && px === 0) || (!rt && px === 15))) continue;
          if (py === 0) color = '#c9f7b0';
          else if (py < depth - 1) color = hash2(wx, wy + 9) > 0.9 ? '#a6eca0' : '#86db8f';
          else if (py === depth - 1) color = '#55b877';
          else if (py === depth) color = '#b07558';
        }
        x.fillStyle = color;
        x.fillRect(wx, wy, 1, 1);
      }
    }
  }

  paintWood(x, col, row) {
    const lvl = this.level;
    const lf = lvl.tileAt(col - 1, row) === T.WOOD, rt = lvl.tileAt(col + 1, row) === T.WOOD;
    const x0 = col * TILE, y0 = row * TILE;
    const rows = ['#fff0f6', '#ffc2da', '#ffb3d1', '#ffb3d1', '#ff8fbd', '#d95f95'];
    for (let py = 0; py < 6; py++) {
      for (let px = 0; px < TILE; px++) {
        const edgeL = !lf && px === 0, edgeR = !rt && px === 15;
        if ((edgeL || edgeR) && (py === 0 || py === 5)) continue;
        let color = rows[py];
        if (edgeL || edgeR) color = '#b8457a';
        else if (px % 8 === 7 && py > 0 && py < 5) color = '#ff8fbd';
        x.fillStyle = color;
        x.fillRect(x0 + px, y0 + py, 1, 1);
      }
    }
    // corazoncito tallado y soportes
    x.fillStyle = '#ffffff';
    x.fillRect(x0 + 3, y0 + 2, 1, 1); x.fillRect(x0 + 5, y0 + 2, 1, 1); x.fillRect(x0 + 4, y0 + 3, 1, 1);
    x.fillStyle = '#b8457a';
    if (!lf) { x.fillRect(x0 + 2, y0 + 6, 3, 1); x.fillRect(x0 + 2, y0 + 7, 2, 1); x.fillRect(x0 + 2, y0 + 8, 1, 1); }
    if (!rt) { x.fillRect(x0 + 11, y0 + 6, 3, 1); x.fillRect(x0 + 12, y0 + 7, 2, 1); x.fillRect(x0 + 13, y0 + 8, 1, 1); }
  }

  paintCloud(x, col, row) {
    const lvl = this.level;
    const lf = lvl.tileAt(col - 1, row) === T.CLOUD, rt = lvl.tileAt(col + 1, row) === T.CLOUD;
    const x0 = col * TILE, y0 = row * TILE;
    const bump = [2, 1, 0, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0, 1, 2];
    for (let px = 0; px < TILE; px++) {
      let top = bump[px], bottom = 10 - [0, 1, 1, 0][px % 4];
      if (!lf) { top += [5, 3, 1][px] || 0; bottom -= [3, 1][px] || 0; }
      if (!rt) { top += [5, 3, 1][15 - px] || 0; bottom -= [3, 1][15 - px] || 0; }
      for (let py = top; py <= bottom; py++) {
        x.fillStyle = py === bottom ? '#a9c6ef' : py >= bottom - 2 ? '#dbe9ff' : '#ffffff';
        x.fillRect(x0 + px, y0 + py, 1, 1);
      }
    }
  }

  // ---------- Cuadro completo ----------
  draw(g) {
    const ctx = this.ctx;
    const w = this.cv.width, h = this.cv.height;
    const lvl = this.level;
    const cx = Math.round(g.cam.x), cy = Math.round(g.cam.y);
    const t = g.time;
    this.g = g; this.cx = cx; this.cy = cy; this.w = w; this.h = h;

    // Cielo en franjas
    const night = this.night;
    const sky = night ? SKY_NIGHT : SKY;
    const band = Math.ceil((h * 0.85) / SKY.length);
    sky.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, i * band, w, i === SKY.length - 1 ? h : band);
    });
    // Sol
    const sx = Math.round(w * 0.8), sy = 30 - Math.round(cy * 0.05);
    if (night) {
      for (const st of this.stars) {
        if (Math.sin(t * 1.5 + st.ph) < -0.6) continue; // titilan
        const px = Math.round(st.x * w), py = Math.round(st.y * h);
        if (st.big) this.spark(px, py, '#ffffff', false);
        else { ctx.fillStyle = '#ffffff'; ctx.fillRect(px, py, 1, 1); }
      }
      ctx.fillStyle = '#ffffff'; this.disc(sx, sy, 13);
      ctx.fillStyle = sky[0]; this.disc(sx + 6, sy - 3, 11); // luna creciente
    } else {
      ctx.fillStyle = '#fff9dc'; this.disc(sx, sy, 15);
      ctx.fillStyle = '#fff2b0'; this.disc(sx, sy, 11);
    }

    // Nubes y colinas con parallax
    for (const c of this.clouds) {
      const P = w + 160;
      const x = ((((c.x * 1.7 - cx * 0.12 + t * c.v) % P) + P) % P) - 80;
      ctx.drawImage(this.S.clouds[c.s], Math.round(x), Math.round(c.y - cy * 0.08));
    }
    const cyMax = lvl.height - h;
    this.tiled(this.far, 0.2, h - lvl.height + Math.round((cyMax - cy) * 0.75));
    this.tiled(this.mid, 0.45, h - lvl.height + Math.round((cyMax - cy) * 0.45));

    // Decoración de fondo, mundo, decoración frontal
    for (const d of lvl.decor) {
      const x = d.x - cx;
      if (x < -50 || x > w + 50) continue;
      if (d.type === 'tree') { const s = this.S.trees[d.variant]; ctx.drawImage(s, x - (s.width >> 1), d.y - cy - s.height + 2); }
      else if (d.type === 'bush') { const s = this.S.bushes[d.variant]; ctx.drawImage(s, x - (s.width >> 1), d.y - cy - s.height + 2); }
    }
    this.garland(t);
    const wh = Math.min(h, lvl.height - cy);
    ctx.drawImage(this.world, cx, cy, w, wh, 0, 0, w, wh);
    if (wh < h) { ctx.fillStyle = '#c1876b'; ctx.fillRect(0, wh, w, h - wh); } // más tierra bajo el nivel
    for (const d of lvl.decor) {
      const x = d.x - cx;
      if (x < -20 || x > w + 20) continue;
      if (d.type === 'flower') {
        const f = this.S.flowers[d.variant][Math.sin(t * 1.6 + d.phase) > 0.3 ? 1 : 0];
        ctx.drawImage(f.c, x - 3, d.y - cy - f.h + 1);
      } else if (d.type === 'tuft') ctx.drawImage(this.S.tuft.c, x - 3, d.y - cy - 3);
      else if (d.type === 'sign') ctx.drawImage(this.S.sign.c, x - 7, d.y - cy - 15);
      else if (d.type === 'lamp') {
        ctx.fillStyle = '#4a3a5a'; ctx.fillRect(x - 1, d.y - cy - 30, 2, 31); ctx.fillRect(x - 3, d.y - cy - 1, 6, 2);
        ctx.fillRect(x - 3, d.y - cy - 38, 6, 2); ctx.fillRect(x - 4, d.y - cy - 31, 8, 2);
      }
    }
    // De noche: todo el paisaje se tiñe de azul; lo que brilla se dibuja después.
    if (night) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#8f96dc';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      for (const d of lvl.decor) {
        if (d.type !== 'lamp') continue;
        const x = d.x - cx;
        if (x < -40 || x > w + 40) continue;
        const y = d.y - cy - 34;
        // halo suave del farol
        ctx.fillStyle = '#fff3a6';
        const flick = Math.floor(t * 3 + d.x) % 2;
        ctx.globalAlpha = 0.1; this.disc(x, y, 26 + flick);
        ctx.globalAlpha = 0.14; this.disc(x, y, 15);
        ctx.globalAlpha = 0.2; this.disc(x, y, 7);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff3a6'; ctx.fillRect(x - 2, y - 2, 4, 5);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 3);
      }
    }
    if (lvl.scene) this.crimeScene(lvl.scene);
    for (const b of this.butterflies) {
      const x = Math.round(b.x + Math.sin(t * 0.7 + b.ph) * 30 - cx);
      if (x < -10 || x > w + 10) continue;
      const y = Math.round(b.y + Math.sin(t * 1.9 + b.ph) * 9 - cy);
      if (night) { // luciérnagas
        if (Math.sin(t * 3 + b.ph) > -0.2) { ctx.fillStyle = '#fff3a6'; ctx.fillRect(x, y, 2, 2); }
      } else ctx.drawImage(this.S.butterflies[b.c][Math.floor(t * 8 + b.ph) % 2].c, x, y);
    }

    // Honguitos
    lvl.springs.forEach((s, i) => {
      const down = g.springAnim[i] > 0.18;
      const sp = this.S.spring[down ? 1 : 0];
      ctx.drawImage(sp.c, s.x - 8 - cx, s.base - sp.h - cy);
    });

    // Corazoncitos y gomitas
    for (let i = 0; i < g.hearts.length; i++) {
      const hh = g.hearts[i];
      if (hh.collected) continue;
      const x = hh.x - cx;
      if (x < -10 || x > w + 10) continue;
      ctx.drawImage(this.S.hearts[1].c, x - 3, Math.round(hh.y - 3 + Math.sin(t * 3 + i) * 1.5) - cy);
    }
    g.gomitas.forEach((gm, i) => {
      if (gm.collected) return;
      const x = gm.x - cx;
      if (x < -20 || x > w + 20) return;
      const y = Math.round(gm.y + Math.sin(t * 2.6 + i * 1.3) * 3) - cy;
      const pulse = Math.floor(t * 3 + i) % 2;
      const gl = this.S.glow[pulse];
      ctx.globalAlpha = 0.38;
      ctx.drawImage(gl, x - (gl.width >> 1), y - (gl.height >> 1));
      ctx.globalAlpha = 1;
      const sp = this.S.gomitas[gm.color % this.S.gomitas.length];
      ctx.drawImage(sp.c, x - 6, y - 7);
      // destellos que giran alrededor
      for (let k = 0; k < 3; k++) {
        const a = t * 2.2 + (k * Math.PI * 2) / 3 + i;
        if (Math.floor(t * 6 + k) % 3 === 0) continue;
        this.spark(Math.round(x + Math.cos(a) * 12), Math.round(y + Math.sin(a) * 10), '#ffffff', k === 0);
      }
    });

    // Pistas del caso
    (g.clues || []).forEach((c, i) => {
      if (c.collected || c.hidden) return;
      const x = c.x - cx;
      if (x < -20 || x > w + 20) return;
      const sp = this.S.clues[c.kind];
      const y = Math.round(c.y + Math.sin(t * 2.6 + i * 1.3) * 2) - cy;
      const gl = this.S.glow[Math.floor(t * 3 + i) % 2];
      ctx.globalAlpha = 0.38;
      ctx.drawImage(gl, x - (gl.width >> 1), y - (gl.height >> 1));
      ctx.globalAlpha = 1;
      ctx.drawImage(sp.c, x - (sp.w >> 1), y - (sp.h >> 1));
      for (let k = 0; k < 3; k++) {
        const a = t * 2.2 + (k * Math.PI * 2) / 3 + i;
        if (Math.floor(t * 6 + k) % 3 === 0) continue;
        this.spark(Math.round(x + Math.cos(a) * 12), Math.round(y + Math.sin(a) * 10), '#fff3a6', k === 0);
      }
    });
    this.drawCase(g);
    this.drawHim(g);
    this.drawArya(g);
    this.drawHer(g);
    if (g.ending && g.ending.love) {
      const mx = Math.round((g.player.x + g.npc.x) / 2) - cx;
      const up = Math.min(1, (g.ending.t - 3) / 1.2);
      const y = Math.round(g.player.y - 34 - up * 14 + Math.sin(t * 3) * 2) - cy;
      const hb = this.S.heartBig;
      if (Math.floor(t * 4) % 4 === 0) ctx.drawImage(hb.c, 0, 0, hb.w, hb.h, mx - 8, y - 1, hb.w + 2, hb.h + 2);
      else ctx.drawImage(hb.c, mx - 7, y);
    }

    // Agua
    for (const [c0, c1] of lvl.pits) {
      const x0 = c0 * TILE - cx, x1 = (c1 + 1) * TILE - cx;
      if (x1 < 0 || x0 > w) continue;
      const wy = lvl.waterY - cy;
      const a = Math.max(0, x0), b = Math.min(w, x1);
      ctx.fillStyle = night ? '#5a78d6' : '#7fc8f8'; ctx.fillRect(a, wy + 1, b - a, h - wy);
      ctx.fillStyle = night ? '#4660bd' : '#62b3ee'; ctx.fillRect(a, wy + 12, b - a, h - wy);
      for (let x = a; x < b; x += 4) {
        const wx = x + cx;
        const o = Math.round(Math.sin(wx / 9 + t * 2.4) * 1.2);
        ctx.fillStyle = night ? '#c9d6ff' : '#d6f1ff'; ctx.fillRect(x, wy + o, Math.min(4, b - x), 1);
        ctx.fillStyle = night ? '#8ea6f0' : '#a5dcff'; ctx.fillRect(x, wy + o + 1, Math.min(4, b - x), 1);
        if (hash2(Math.floor(wx / 4), 77) > 0.86) { ctx.fillStyle = night ? '#8ea6f0' : '#b9e6ff'; ctx.fillRect(x, wy + 7 + (Math.floor(t * 2 + wx) % 3), 3, 1); }
      }
    }

    this.drawParticles(g);

    // Pétalos flotando (en espacio de pantalla)
    for (let i = 0; i < 12; i++) {
      const px = (((hash2(i, 21) * (w + 40) - t * (8 + i) - cx * 0.6) % (w + 40)) + w + 40) % (w + 40) - 20;
      const py = (hash2(i, 22) * h + t * (9 + (i % 4) * 3) + Math.sin(t + i) * 6) % h;
      ctx.fillStyle = i % 3 ? '#ffc2da' : '#ffffff';
      ctx.fillRect(Math.round(px), Math.round(py), 2, 1);
    }
  }

  disc(cx, cy, r) {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      this.ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
    }
  }

  tiled(layer, factor, y) {
    const off = Math.floor(this.cx * factor) % BG_W;
    for (let x = -off; x < this.w; x += BG_W) this.ctx.drawImage(layer, x, y);
  }

  spark(x, y, color, big) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    if (big) { ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x, y - 2, 1, 5); }
    else { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
  }

  // Guirnalda de corazones de la zona final
  garland(t) {
    const gl = this.level.garland;
    if (!gl) return;
    const ctx = this.ctx;
    const x1 = gl.x1 - this.cx, x2 = gl.x2 - this.cx;
    if (x2 < -10 || x1 > this.w + 10) return;
    const top = gl.y - 58 - this.cy;
    for (const x of [x1, x2]) {
      for (let y = 0; y < 58; y++) {
        ctx.fillStyle = Math.floor(y / 4) % 2 ? '#ff9ec4' : '#fff7ea';
        ctx.fillRect(x - 1, top + y, 3, 1);
      }
      ctx.drawImage(this.S.hearts[0].c, x - 3, top - 6);
    }
    const n = 13;
    for (let i = 1; i < n; i++) {
      const k = i / n;
      const x = Math.round(x1 + (x2 - x1) * k);
      const sag = Math.round(Math.sin(k * Math.PI) * 16 + Math.sin(t * 2 + i) * 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 4, top + 2 + sag, 8, 1);
      const s = i % 2 ? this.S.hearts[i % 3].c : this.S.heartsSmall[i % 3].c;
      ctx.drawImage(s, x - (s.width >> 1), top + 4 + sag);
    }
  }

  // ---------- Ella ----------
  drawHer(g) {
    const p = g.player;
    if (g.respawnT > 0) return;
    if (g.invulnT > 0 && Math.floor(g.time * 16) % 2) return;
    const S = this.S.her;
    const t = g.time;
    const mood = g.mood;
    let torso = 'idle', legs = 'stand', dy = 0, headDy = 0, hop = 0;
    const reacting = p.reactT > 0 && p.onGround;

    if (p.cheer || reacting) {
      const k = p.cheer ? (t * 2.1) % 1 : 1 - p.reactT / REACT_TIME;
      hop = -Math.round(Math.sin(k * Math.PI) * (p.cheer ? 8 : 6));
      torso = 'fall';
      legs = hop < -2 ? 'jump' : 'stand';
    } else if (!p.onGround) {
      if (p.vy < 0) { torso = 'up'; legs = 'jump'; }
      else { torso = 'fall'; legs = 'fall'; }
    } else if (p.landT > 0) {
      legs = 'squat'; dy = 2;
    } else if (Math.abs(p.vx) > 14) {
      const f = Math.floor(p.walkPhase / 7) % 4;
      legs = ['stride', 'passR', 'stride', 'passL'][f];
      torso = f % 2 ? 'idle' : 'swing';
      dy = f % 2 ? -1 : 0;
      if (mood <= 1 && f % 2 === 0) headDy = 1; // pisa fuerte cuando está brava
    } else if (mood <= 1) {
      torso = 'crossed';
      legs = mood === 0 && Math.floor(t * 5) % 2 ? 'tap' : 'stand';
    } else if (mood === 2) {
      torso = 'crossed';
      headDy = Math.floor(t * 1.4) % 2;
    } else {
      dy = -(Math.floor(t * (mood >= 4 ? 4 : 2.4)) % 2);
      if (mood >= 5 && Math.floor(t * 2) % 2) torso = 'swing';
    }

    const flip = p.facing < 0;
    const k = flip ? 'f' : 'c';
    const x = Math.round(p.x) - 8 - this.cx;
    const y = Math.round(p.y) - this.cy + hop;
    const ctx = this.ctx;
    ctx.drawImage(S.legs[legs][k], x, y - 5);
    ctx.drawImage(S.torso[torso][k], x, y - 12 + dy);
    const hy = y - 24 + dy + headDy;
    ctx.drawImage(S.head[k], x, hy);
    ctx.drawImage(S.faces[mood][k], x + (flip ? 3 : 5), hy + 6);
    if (mood <= 3 && (t + 0.3) % 3.4 < 0.13) ctx.drawImage(S.blink[k], x + (flip ? 3 : 5), hy + 6);
    if (mood <= 1 && (t % 1.3 < (mood === 0 ? 0.85 : 0.4))) {
      ctx.drawImage(this.S.anger.c, x + (flip ? -3 : 12), hy - 3 - (Math.floor(t * 6) % 2));
    }
  }

  // ---------- Él ----------
  drawHim(g) {
    const n = g.npc;
    if (n.hidden) return;
    const S = this.S.him;
    const t = g.time;
    const dist = Math.abs(g.player.x - n.x);
    let torso = 'hold', legs = 'stand', hop = 0, bag = [13, 9 + (Math.floor(t * 2) % 2)];
    let face = n.love ? 'love' : g.mood <= 1 ? 'nervous' : 'happy';

    if (n.state === 'leaving') {
      hop = -Math.round(Math.sin(Math.min(1, n.t / 0.45) * Math.PI) * 10);
      torso = 'cheer'; legs = 'hop'; bag = [10, -4];
    } else if (n.cheerT > 0 || n.love) {
      const k = (t * (n.love ? 2.1 : 3)) % 1;
      hop = -Math.round(Math.sin(k * Math.PI) * (n.love ? 4 : 5));
      if (n.love && g.ending.t < 4.4) { bag = [15, 8]; hop = 0; }
      else { torso = 'cheer'; legs = hop < -1 ? 'hop' : 'stand'; bag = [10, -4]; }
      if (!n.love) face = 'happy';
    } else if (g.state === 'title' || (!n.spoken && dist < 190)) {
      torso = Math.floor(t * 5) % 2 ? 'waveA' : 'waveB';
    }

    const flip = n.facing < 0;
    const k = flip ? 'f' : 'c';
    const x = Math.round(n.x) - 8 - this.cx;
    const top = Math.round(n.y) - 26 - this.cy + hop;
    if (x < -40 || x > this.w + 40) return;
    const ctx = this.ctx;
    ctx.drawImage(S.legs[legs][k], x, top + 20);
    ctx.drawImage(S.torso[torso][k], x, top + 8);
    ctx.drawImage(S.head[k], x, top);
    ctx.drawImage(S.faces[face][k], x + 4, top + 5);
    // En el caso de Pipu llega con las manos vacías: se comieron el paquete.
    if (g.mode !== 'pipu') ctx.drawImage(this.S.bag[k], x + (flip ? 16 - bag[0] - 9 : bag[0]), top + bag[1]);
  }

  // ---------- Arya ----------
  drawArya(g) {
    const a = g.arya;
    const S = this.S.arya;
    const t = g.time;
    let frame = 'stand';
    if (a.sit) frame = 'sit';
    else if (a.moving) frame = Math.floor(t * 11) % 2 ? 'run1' : 'run2';
    else if (Math.floor(t * 6) % 2) frame = 'wag';
    const hop = a.hopT > 0 ? -Math.round(Math.abs(Math.sin(a.hopT * 9)) * 5) : 0;
    if (hop < 0) frame = 'run1';
    const flip = a.facing < 0;
    const x = Math.round(a.x) - 9 - this.cx;
    const y = Math.round(a.y) - 13 - this.cy + hop;
    if (x < -30 || x > this.w + 30) return;
    const ctx = this.ctx;
    ctx.drawImage(S[frame][flip ? 'f' : 'c'], x, y);
    if (a.guiltyT > 0 || (a.override && a.override.sit)) {
      // gotita de "yo no fui"
      const sx = x + (flip ? 3 : 14), sy = y - 1 + (Math.floor(t * 4) % 3);
      ctx.fillStyle = '#8fd3ff'; ctx.fillRect(sx, sy, 1, 2);
      ctx.fillStyle = '#e6f6ff'; ctx.fillRect(sx, sy, 1, 1);
      if (Math.floor(t * 2) % 2) ctx.drawImage(this.S.note.c, x + (flip ? -4 : 19), y - 4 - (Math.floor(t * 5) % 2));
    }
  }

  // ---------- El caso: escena del crimen, sospechosos y camita ----------
  crimeScene(sc) {
    const ctx = this.ctx;
    const x = sc.x - this.cx, y = sc.y - this.cy;
    if (x < -70 || x > this.w + 70) return;
    const ch = this.S.chalk;
    ctx.drawImage(ch, x - (ch.width >> 1), y - ch.height + 1);
    // cinta amarilla entre dos postes
    for (const px of [x - 30, x + 30]) {
      ctx.fillStyle = '#6e4535'; ctx.fillRect(px - 1, y - 20, 2, 21);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(px - 2, y - 22, 4, 3);
    }
    for (let i = -29; i < 29; i++) {
      const sag = Math.round(Math.sin(((i + 29) / 58) * Math.PI) * 3);
      ctx.fillStyle = Math.floor((i + 30) / 4) % 2 ? '#3b2244' : '#ffd23f';
      ctx.fillRect(x + i, y - 19 + sag, 1, 3);
    }
  }

  drawCase(g) {
    const lvl = this.level;
    if (!lvl.bed) return;
    const ctx = this.ctx;
    const t = g.time;
    for (const id in g.suspects) {
      const s = g.suspects[id];
      const sp = this.S[id];
      const x = Math.round(s.x) - (sp.w >> 1) - this.cx;
      if (x < -30 || x > this.w + 30) continue;
      const bob = g.bubbles[id] ? Math.floor(t * 6) % 2 : Math.floor(t * 1.6 + s.x) % 2 ? 0 : 0;
      // Dibujados mirando a la derecha; se voltean hacia la detective.
      ctx.drawImage(sp[s.facing < 0 ? 'f' : 'c'], x, Math.round(s.y) - sp.h - this.cy - bob);
    }
    // Camita de Arya
    const bx = lvl.bed.x - this.cx, by = lvl.bed.y - this.cy;
    if (bx < -40 || bx > this.w + 40) return;
    const P = g.pipu;
    if (P.state !== 'hidden') {
      const awake = P.state === 'awake';
      const hop = awake ? -Math.round(Math.abs(Math.sin(P.t * 5)) * 7) - 4 : 0;
      const sp = this.S.pipu[awake ? 'awake' : 'sleep'];
      ctx.drawImage(sp.c, bx - 7, by - (awake ? 16 : 13) + hop);
    }
    ctx.fillStyle = '#c2337a'; ctx.fillRect(bx - 16, by - 3, 32, 4);
    ctx.fillStyle = '#ff8fbd'; ctx.fillRect(bx - 17, by - 6, 34, 4);
    ctx.fillStyle = '#ffc2da'; ctx.fillRect(bx - 16, by - 7, 32, 1);
    ctx.fillStyle = '#c2337a'; ctx.fillRect(bx - 18, by - 5, 1, 4); ctx.fillRect(bx + 17, by - 5, 1, 4);
    if (P.state === 'hidden') {
      // el bulto sospechoso bajo la cobija (respira)
      const up = Math.floor(t * 1.3) % 2;
      ctx.fillStyle = '#b9a3e3';
      for (let dy = 0; dy < 9 + up; dy++) {
        const half = Math.round(Math.sqrt(1 - (dy / (9 + up)) ** 2) * 9);
        ctx.fillRect(bx - half, by - 7 - dy, half * 2, 1);
      }
      ctx.fillStyle = '#d6c7f2'; ctx.fillRect(bx - 4, by - 14 - up, 5, 1); ctx.fillRect(bx - 6, by - 12 - up, 2, 1);
    } else if (P.state === 'sleep') {
      ctx.fillStyle = '#b9a3e3'; ctx.fillRect(bx - 12, by - 8, 24, 3);
      ctx.fillStyle = '#d6c7f2'; ctx.fillRect(bx - 12, by - 9, 24, 1);
    }
  }

  // ---------- Partículas ----------
  drawParticles(g) {
    const ctx = this.ctx;
    for (const p of g.particles) {
      const x = Math.round(p.x) - this.cx, y = Math.round(p.y) - this.cy;
      if (x < -8 || x > this.w + 8 || y < -8 || y > this.h + 8) continue;
      const k = p.life / p.max;
      if (p.type === 'heart') {
        if (k < 0.25 && Math.floor(g.time * 20) % 2) continue;
        const s = (p.small ? this.S.heartsSmall : this.S.hearts)[p.variant || 0];
        ctx.drawImage(s.c, x - (s.w >> 1), y - (s.h >> 1));
      } else if (p.type === 'spark') {
        if (k < 0.3 && Math.floor(g.time * 24) % 2) continue;
        this.spark(x, y, p.color || '#ffffff', k > 0.6);
      } else if (p.type === 'zzz' || p.type === 'note') {
        if (k < 0.25 && Math.floor(g.time * 16) % 2) continue;
        ctx.drawImage(this.S[p.type].c, x - 1, y - 1);
      } else if (p.type === 'splash') {
        ctx.fillStyle = k > 0.5 ? '#d6f1ff' : '#a5dcff';
        ctx.fillRect(x, y, 2, 2);
      } else {
        // polvo, humo y vapor: bolitas que se encogen
        const r = p.type === 'dust' ? (k > 0.5 ? 2 : 1) : k > 0.66 ? 3 : k > 0.33 ? 2 : 1;
        ctx.fillStyle = p.type === 'steam' ? '#ffffff' : p.type === 'puff' ? '#fff7ea' : '#f3e4d4';
        ctx.fillRect(x - r + 1, y - r, r * 2 - 1, r * 2 + 1);
        ctx.fillRect(x - r, y - r + 1, r * 2 + 1, r * 2 - 1);
      }
    }
  }
}
