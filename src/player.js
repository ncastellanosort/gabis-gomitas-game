// Protagonista: movimiento, salto, gravedad y colisiones con el nivel.
// No depende del navegador, así que también se usa en las pruebas.

import { TILE, T } from './level.js';

export const HALF_W = 5; // medio ancho de la caja de colisión
export const HEIGHT = 22;

export class Player {
  constructor(level, physics) {
    this.level = level;
    this.p = physics;
    this.events = [];
    this.reset(level.start.x, level.start.y);
  }

  reset(x, y) {
    this.x = x; // centro
    this.y = y; // pies
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = true;
    this.coyote = 0;
    this.buffer = 0;
    this.jumpHeld = false;
    this.springing = false;
    this.walkPhase = 0;
    this.landT = 0;
    this.safeX = x;
    this.safeY = y;
    this.events.length = 0;
  }

  update(dt, input) {
    const P = this.p;
    const lvl = this.level;

    // --- Horizontal: aceleración y frenado ---
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) {
      let a = this.onGround ? P.accel : P.airAccel;
      if (this.vx * dir < 0) a *= 1.8; // girar se siente más ágil
      this.vx += dir * a * dt;
      this.facing = dir;
    } else {
      const dec = (this.onGround ? P.friction : P.airFriction) * dt;
      this.vx = Math.abs(this.vx) <= dec ? 0 : this.vx - Math.sign(this.vx) * dec;
    }
    this.vx = Math.max(-P.maxSpeed, Math.min(P.maxSpeed, this.vx));

    // --- Salto: con margen (buffer) y "coyote time" ---
    const pressed = !!input.jump && !this.jumpHeld;
    this.jumpHeld = !!input.jump;
    this.buffer = pressed ? P.jumpBuffer : Math.max(0, this.buffer - dt);
    this.coyote = this.onGround ? P.coyote : Math.max(0, this.coyote - dt);
    if (this.buffer > 0 && this.coyote > 0) {
      this.vy = -P.jump;
      this.onGround = false;
      this.coyote = 0;
      this.buffer = 0;
      this.springing = false;
      this.events.push({ type: 'jump' });
    }
    // Soltar el botón recorta el salto (salto corto / salto largo).
    if (!input.jump && !this.springing && this.vy < -P.jumpCut) this.vy = -P.jumpCut;
    this.vy = Math.min(this.vy + P.gravity * dt, P.maxFall);

    // --- Mover en X ---
    let nx = this.x + this.vx * dt;
    const r0 = Math.floor((this.y - HEIGHT) / TILE);
    const r1 = Math.floor((this.y - 0.01) / TILE);
    if (this.vx > 0) {
      const c = Math.floor((nx + HALF_W) / TILE);
      for (let r = r0; r <= r1; r++) {
        if (lvl.isSolid(c, r)) { nx = c * TILE - HALF_W; this.vx = 0; break; }
      }
    } else if (this.vx < 0) {
      const c = Math.floor((nx - HALF_W) / TILE);
      for (let r = r0; r <= r1; r++) {
        if (lvl.isSolid(c, r)) { nx = (c + 1) * TILE + HALF_W; this.vx = 0; break; }
      }
    }
    this.x = nx;

    // --- Mover en Y ---
    const prevY = this.y;
    let ny = this.y + this.vy * dt;
    const c0 = Math.floor((this.x - HALF_W) / TILE);
    const c1 = Math.floor((this.x + HALF_W - 0.001) / TILE);
    if (this.vy >= 0) {
      const r = Math.floor(ny / TILE);
      let landed = false;
      for (let c = c0; c <= c1; c++) {
        const t = lvl.tileAt(c, r);
        // Las plataformas flotantes solo sostienen si se llega desde arriba.
        if (t === T.SOLID || ((t === T.WOOD || t === T.CLOUD) && prevY <= r * TILE + 0.01)) landed = true;
      }
      if (landed) {
        if (!this.onGround) {
          if (this.vy > 110) this.events.push({ type: 'land' });
          this.landT = 0.1;
        }
        ny = r * TILE;
        this.vy = 0;
        this.onGround = true;
        this.springing = false;
      } else {
        this.onGround = false;
      }
    } else {
      this.onGround = false;
      const r = Math.floor((ny - HEIGHT) / TILE);
      for (let c = c0; c <= c1; c++) {
        if (lvl.isSolid(c, r)) { ny = (r + 1) * TILE + HEIGHT; this.vy = 0; break; }
      }
    }
    this.y = ny;

    // --- Honguitos saltarines ---
    let nearSpring = false;
    for (let i = 0; i < lvl.springs.length; i++) {
      const s = lvl.springs[i];
      const dx = Math.abs(this.x - s.x);
      if (dx < 22) nearSpring = true;
      if (this.vy >= 0 && dx < 10 && this.y >= s.top && this.y <= s.base + 1) {
        this.y = s.top;
        this.vy = -P.springJump;
        this.onGround = false;
        this.springing = true;
        this.coyote = 0;
        this.events.push({ type: 'spring', index: i });
      }
    }

    // --- Último punto seguro (para reaparecer si cae al agua) ---
    if (this.onGround && !nearSpring) {
      const r = Math.floor(this.y / TILE);
      const sup = (x) => {
        const t = lvl.tileAt(Math.floor(x / TILE), r);
        return t !== T.EMPTY;
      };
      if (sup(this.x - HALF_W - 3) && sup(this.x + HALF_W + 3)) {
        this.safeX = this.x;
        this.safeY = this.y;
      }
    }

    if (this.onGround) this.walkPhase += Math.abs(this.vx) * dt;
    this.landT = Math.max(0, this.landT - dt);
  }
}
