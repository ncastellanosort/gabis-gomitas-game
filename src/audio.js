// Sonido 100 % generado con Web Audio: efectos y dos melodías originales.
// El audio solo arranca tras una interacción (botón JUGAR), como exigen los navegadores.

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freq(name) {
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  const midi = NOTE[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) + 1) * 12;
  return 440 * 2 ** ((midi - 69) / 12);
}

// Melodías: cada compás tiene 8 pasos. "-" alarga la nota anterior y "." es silencio.
const SONGS = {
  garden: {
    bpm: 112,
    lead: { wave: 'square', vol: 0.5, bars: [
      'E5 G5 C6 G5 E5 G5 C6 -', 'D5 G5 B5 G5 D5 G5 B5 -', 'C5 E5 A5 E5 C6 - B5 A5', 'A5 - F5 - G5 - - .',
      'E5 G5 C6 G5 E6 - D6 C6', 'B5 - D6 - B5 G5 - .', 'A5 C6 F5 A5 G5 B5 D6 -', 'C6 - G5 - C6 - . .',
    ] },
    bass: { wave: 'triangle', vol: 0.9, bars: [
      'C3 . G3 . C3 . G3 .', 'G2 . D3 . G2 . D3 .', 'A2 . E3 . A2 . E3 .', 'F2 . C3 . G2 . D3 .',
      'C3 . G3 . C3 . G3 .', 'G2 . D3 . G2 . D3 .', 'F2 . C3 . G2 . D3 .', 'C3 . G3 . C3 - . .',
    ] },
  },
  mystery: {
    bpm: 96,
    lead: { wave: 'square', vol: 0.4, bars: [
      'A4 . C5 . E5 . C5 .', 'A4 . C5 . F5 - E5 .', 'D5 . F5 . A5 . F5 .', 'E5 - D5 - C5 - B4 .',
      'A4 . C5 . E5 . C5 .', 'A4 . C5 . F5 - E5 .', 'D5 . E5 . F5 . G#5 .', 'A5 - - . E5 . A4 .',
    ] },
    bass: { wave: 'triangle', vol: 0.9, bars: [
      'A2 . E3 . A2 . E3 .', 'F2 . C3 . F2 . C3 .', 'D3 . A3 . D3 . A3 .', 'E2 . B2 . E3 . B2 .',
      'A2 . E3 . A2 . E3 .', 'F2 . C3 . F2 . C3 .', 'D3 . A3 . E2 . B2 .', 'A2 . E3 . A2 - . .',
    ] },
  },
  love: {
    bpm: 80,
    lead: { wave: 'triangle', vol: 1, bars: [
      'E5 - - G5 - - C6 -', 'B5 - A5 - - - E5 -', 'F5 - - A5 - - C6 -', 'B5 - - - D6 - - -',
      'E6 - - D6 - C6 - -', 'A5 - - C6 - - E5 -', 'F5 - A5 - G5 - B5 -', 'C6 - - - - - - -',
    ] },
    bass: { wave: 'sine', vol: 0.8, bars: [
      'C3 G3 C4 E4 G3 C4 E4 G3', 'A2 E3 A3 C4 E3 A3 C4 E3', 'F2 C3 F3 A3 C3 F3 A3 C3', 'G2 D3 G3 B3 D3 G3 B3 D3',
      'C3 G3 C4 E4 G3 C4 E4 G3', 'A2 E3 A3 C4 E3 A3 C4 E3', 'F2 C3 F3 A3 G2 D3 G3 B3', 'C3 G3 C4 E4 C4 - - -',
    ] },
  },
};

function parseTrack(track) {
  const notes = []; // { step, len, f }
  let step = 0;
  for (const bar of track.bars) {
    for (const tok of bar.split(' ')) {
      if (tok === '-') { if (notes.length) notes[notes.length - 1].len++; }
      else if (tok !== '.') notes.push({ step, len: 1, f: freq(tok) });
      step++;
    }
  }
  return { ...track, notes, steps: step };
}

export class AudioKit {
  constructor(cfg) {
    this.cfg = cfg;
    this.ctx = null;
    this.muted = !!cfg.startMuted;
    try {
      const saved = localStorage.getItem('gomitas-muted');
      if (saved !== null) this.muted = saved === '1';
    } catch { /* sin almacenamiento: no pasa nada */ }
    this.song = null;
    this.timer = null;
  }

  // Llamar desde un click/toque.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.cfg.sfxVolume;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.cfg.musicVolume;
      this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate * 0.4;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('gomitas-muted', m ? '1' : '0'); } catch { /* ignorar */ }
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  // ---------- Bloques básicos ----------
  tone(f0, f1, dur, { wave = 'square', vol = 0.3, at = 0, bus } = {}) {
    const c = this.ctx;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus || this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, { vol = 0.3, f0 = 1200, f1 = 300, type = 'lowpass', at = 0 } = {}) {
    const c = this.ctx;
    const t = c.currentTime + at;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const flt = c.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(f0, t);
    flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(flt).connect(g).connect(this.sfxBus);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  arp(names, gap, dur, opts = {}) {
    names.forEach((n, i) => this.tone(freq(n), freq(n), dur, { ...opts, at: i * gap }));
  }

  // ---------- Efectos ----------
  sfx(name) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    switch (name) {
      case 'jump': this.tone(300, 620, 0.13, { vol: 0.22 }); break;
      case 'land': this.noise(0.07, { vol: 0.25, f0: 500, f1: 120 }); this.tone(130, 70, 0.07, { wave: 'sine', vol: 0.3 }); break;
      case 'gomita':
        this.arp(['C6', 'E6', 'G6', 'C7'], 0.06, 0.12, { vol: 0.24 });
        this.arp(['E7', 'G7'], 0.07, 0.2, { wave: 'triangle', vol: 0.2, at: 0.24 });
        break;
      case 'heart': this.tone(990, 1480, 0.08, { wave: 'triangle', vol: 0.22 }); break;
      case 'spring': this.tone(180, 760, 0.2, { wave: 'sine', vol: 0.4 }); this.tone(360, 1100, 0.16, { wave: 'triangle', vol: 0.15 }); break;
      case 'splash': this.noise(0.32, { vol: 0.32, f0: 2400, f1: 300, type: 'bandpass' }); break;
      case 'respawn': this.arp(['G5', 'C6'], 0.07, 0.1, { wave: 'triangle', vol: 0.2 }); break;
      case 'poof': this.noise(0.14, { vol: 0.18, f0: 1800, f1: 500 }); break;
      case 'talk': this.tone(520, 480, 0.04, { vol: 0.1 }); this.tone(640, 600, 0.04, { vol: 0.1, at: 0.06 }); break;
      case 'click': this.tone(700, 900, 0.05, { vol: 0.16 }); break;
      case 'celebrate': this.arp(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.075, 0.16, { vol: 0.22 }); break;
      case 'goal':
        this.arp(['G5', 'C6', 'E6', 'G6'], 0.11, 0.2, { wave: 'triangle', vol: 0.3 });
        this.arp(['C6', 'E6', 'G6', 'C7'], 0.11, 0.5, { wave: 'square', vol: 0.12, at: 0.44 });
        break;
      case 'clue': this.arp(['A5', 'C6', 'E6', 'A6'], 0.07, 0.14, { vol: 0.22 }); this.arp(['E7'], 0, 0.25, { wave: 'triangle', vol: 0.18, at: 0.3 }); break;
      case 'reveal': this.arp(['E6', 'G#6', 'B6'], 0.06, 0.18, { wave: 'triangle', vol: 0.22 }); break;
      case 'bark': this.tone(420, 300, 0.07, { vol: 0.2 }); this.tone(480, 330, 0.08, { vol: 0.2, at: 0.13 }); this.noise(0.06, { vol: 0.12, f0: 1500, f1: 600 }); break;
      case 'burp': this.tone(150, 70, 0.4, { wave: 'sawtooth', vol: 0.3 }); this.tone(95, 60, 0.4, { wave: 'square', vol: 0.12 }); break;
      case 'wrong': this.arp(['E5', 'C5', 'A4'], 0.1, 0.16, { vol: 0.2 }); break;
      case 'page': this.noise(0.09, { vol: 0.14, f0: 3000, f1: 900 }); break;
      case 'love':
        this.arp(['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.08, 0.5, { wave: 'triangle', vol: 0.26 });
        break;
    }
  }

  // ---------- Música ----------
  playMusic(name) {
    if (!this.ctx || !this.cfg.music) return;
    if (this.song && this.song.name === name) return;
    this.stopMusic();
    const def = SONGS[name];
    const out = this.ctx.createGain();
    out.gain.value = 0.0001;
    out.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + 0.8);
    out.connect(this.musicBus);
    this.song = {
      name, out,
      stepDur: 60 / def.bpm / 2,
      tracks: [parseTrack(def.lead), parseTrack(def.bass)],
      next: 0, // próximo paso a programar
      t0: this.ctx.currentTime + 0.1,
    };
    this.timer = setInterval(() => this.schedule(), 90);
    this.schedule();
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.song) {
      const { out } = this.song;
      const t = this.ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setTargetAtTime(0.0001, t, 0.12);
      setTimeout(() => out.disconnect(), 900);
      this.song = null;
    }
  }

  schedule() {
    const s = this.song;
    if (!s || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    // Si la pestaña estuvo dormida, retomamos sin amontonar notas.
    if (s.t0 + s.next * s.stepDur < now - 0.2) s.t0 = now - s.next * s.stepDur + 0.05;
    const total = s.tracks[0].steps;
    while (s.t0 + s.next * s.stepDur < now + 0.35) {
      const pos = s.next % total;
      const t = s.t0 + s.next * s.stepDur;
      for (const tr of s.tracks) {
        for (const n of tr.notes) {
          if (n.step !== pos) continue;
          const dur = n.len * s.stepDur * 0.92;
          const o = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          o.type = tr.wave;
          o.frequency.value = n.f;
          const v = 0.3 * tr.vol;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(v, t + 0.012);
          g.gain.setValueAtTime(v * 0.7, t + dur * 0.6);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          o.connect(g).connect(s.out);
          o.start(t);
          o.stop(t + dur + 0.02);
        }
      }
      s.next++;
    }
  }
}
