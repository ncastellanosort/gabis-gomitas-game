// Entrada: teclado y botones táctiles (Pointer Events).

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
};

export class Input {
  constructor() {
    this.keys = new Set(); // acciones mantenidas por teclado
    this.touch = new Map(); // pointerId -> acción
    this.enabled = false; // solo se capturan teclas durante la partida
    this.listeners = [];
    this.onAction = () => {}; // teclas sueltas: pause, mute

    this.on(window, 'keydown', (e) => {
      const action = KEYS[e.code];
      if (action) {
        if (this.enabled) e.preventDefault(); // que las flechas no muevan la página
        this.keys.add(action);
      } else if (!e.repeat) {
        if (e.code === 'KeyP' || e.code === 'Escape') this.onAction('pause');
        else if (e.code === 'KeyM') this.onAction('mute');
      }
    });
    this.on(window, 'keyup', (e) => {
      const action = KEYS[e.code];
      if (action) this.keys.delete(action);
    });
    this.on(window, 'blur', () => this.clear());
  }

  on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this.listeners.push(() => target.removeEventListener(type, fn, opts));
  }

  // Zona táctil con uno o más botones. El dedo puede deslizarse de un botón
  // a otro, y al salir de todos (o levantarse) el botón se suelta.
  bindPad(pad) {
    const buttons = [...pad.querySelectorAll('[data-action]')];
    const hit = (e) => {
      let best = null;
      for (const b of buttons) {
        const r = b.getBoundingClientRect();
        const m = 14; // margen generoso alrededor del botón
        if (e.clientX >= r.left - m && e.clientX <= r.right + m && e.clientY >= r.top - m && e.clientY <= r.bottom + m) {
          const d = Math.hypot(e.clientX - (r.left + r.right) / 2, e.clientY - (r.top + r.bottom) / 2);
          if (!best || d < best.d) best = { b, d };
        }
      }
      return best ? best.b.dataset.action : null;
    };
    const refresh = () => {
      const active = new Set(this.touch.values());
      for (const b of buttons) b.classList.toggle('down', active.has(b.dataset.action));
    };
    const set = (e) => {
      const a = hit(e);
      if (a) this.touch.set(e.pointerId, a);
      else this.touch.delete(e.pointerId);
      refresh();
    };
    const release = (e) => {
      this.touch.delete(e.pointerId);
      refresh();
    };
    this.on(pad, 'pointerdown', (e) => {
      e.preventDefault();
      try { pad.setPointerCapture(e.pointerId); } catch { /* puntero ya liberado */ }
      set(e);
    });
    this.on(pad, 'pointermove', (e) => {
      if (this.touch.has(e.pointerId) || e.buttons || e.pointerType === 'touch') {
        if (e.pointerType !== 'mouse' || e.buttons) set(e);
      }
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.on(pad, type, release);
    this.on(pad, 'contextmenu', (e) => e.preventDefault());
    this.refreshPads = this.refreshPads || [];
    this.refreshPads.push(refresh);
  }

  clear() {
    this.keys.clear();
    this.touch.clear();
    (this.refreshPads || []).forEach((f) => f());
  }

  state() {
    const s = { left: this.keys.has('left'), right: this.keys.has('right'), jump: this.keys.has('jump') };
    for (const a of this.touch.values()) s[a] = true;
    return s;
  }

  destroy() {
    this.listeners.forEach((off) => off());
    this.listeners.length = 0;
  }
}
