// Arranque: une juego, dibujo, sonido, controles e interfaz.

import { CONFIG } from './config.js';
import { createLevel } from './level.js';
import { Game, STEP } from './game.js';
import { Renderer } from './renderer.js';
import { AudioKit } from './audio.js';
import { Input } from './input.js';

const $ = (id) => document.getElementById(id);
const TX = CONFIG.texts;

const level = createLevel();
const stage = $('stage');
const canvas = $('game');
const renderer = new Renderer(canvas, level, CONFIG);
const audio = new AudioKit(CONFIG.audio);
const input = new Input();
const game = new Game(CONFIG, level, onGameEvent);

let paused = false;
let busy = false; // transición en curso
let view = { scale: 1, css: 1, left: 0, top: 0 };

// ------------------------------------------------------------
// Textos
// ------------------------------------------------------------
document.title = TX.title;
const words = TX.title.split(' ');
$('title-text').innerHTML = '';
words.forEach((w, i) => {
  const s = document.createElement('span');
  s.textContent = w + (i < words.length - 1 ? ' ' : '');
  if (i > 0) s.className = 'word2';
  $('title-text').append(s);
});
$('subtitle').textContent = TX.subtitle;
$('btn-play').textContent = TX.play;
$('rotate-hint').textContent = TX.rotateHint;
$('btn-resume').textContent = TX.resume;
$('btn-restart2').textContent = TX.restart;
$('btn-replay').textContent = TX.replay;
$('final-message').textContent = TX.finalMessage;
$('final-note').textContent = TX.finalNote;

// Gomitas del logo y casillas del HUD
document.querySelectorAll('.logo-gomita').forEach((c, i) => c.getContext('2d').drawImage(renderer.S.gomitas[i ? 3 : 0].c, 0, 0));
const slots = level.gomitas.map(() => {
  const c = document.createElement('canvas');
  c.width = 12;
  c.height = 14;
  $('slots').append(c);
  return c;
});

// ------------------------------------------------------------
// Controles táctiles
// ------------------------------------------------------------
input.bindPad($('pad-move'));
input.bindPad($('pad-jump'));
input.onAction = (a) => {
  if (a === 'pause') togglePause();
  else if (a === 'mute') toggleSound();
};
function enableTouchUI() {
  if (document.body.classList.contains('touch')) return;
  document.body.classList.add('touch');
  $('touch').hidden = false;
  $('hint').textContent = TX.hintTouch;
  resize();
}
$('hint').textContent = TX.hintKeyboard;
if (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0) enableTouchUI();
window.addEventListener('touchstart', enableTouchUI, { once: true, passive: true });
// Nada de menús, zoom ni desplazamientos accidentales.
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault());

// ------------------------------------------------------------
// Tamaño: escala entera para que los píxeles queden nítidos
// ------------------------------------------------------------
function resize() {
  const r = stage.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 4);
  const pw = Math.round(r.width * dpr);
  const ph = Math.round(r.height * dpr);
  const scale = Math.max(1, Math.floor(Math.min(ph / 176, pw / 256)));
  const vw = Math.min(level.width, Math.ceil(pw / scale));
  const vh = Math.min(level.height, Math.ceil(ph / scale));
  const css = scale / dpr;
  view = { scale, css, left: Math.round((r.width - vw * css) / 2), top: Math.round((r.height - vh * css) / 2) };
  if (canvas.width !== vw || canvas.height !== vh) renderer.resize(vw, vh);
  canvas.style.width = `${vw * css}px`;
  canvas.style.height = `${vh * css}px`;
  canvas.style.left = `${view.left}px`;
  canvas.style.top = `${view.top}px`;
  game.setView(vw, vh);
  const u = Math.min(r.width / 100, r.height / 56, 11);
  document.documentElement.style.setProperty('--u', `${u.toFixed(2)}px`);
  renderer.draw(game);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);

// ------------------------------------------------------------
// HUD
// ------------------------------------------------------------
function drawPortrait() {
  const c = $('portrait');
  const x = c.getContext('2d');
  x.clearRect(0, 0, 16, 14);
  x.drawImage(renderer.S.her.head.c, 0, 0);
  x.drawImage(renderer.S.her.faces[game.mood].c, 5, 6);
}

function updateHud(pop) {
  slots.forEach((c, i) => {
    const x = c.getContext('2d');
    x.clearRect(0, 0, 12, 14);
    const got = game.gomitas[i].collected;
    x.drawImage((got ? renderer.S.gomitas[game.gomitas[i].color] : renderer.S.gomitaGhost).c, 0, 0);
    if (!got) c.classList.remove('got');
    else if (!c.classList.contains('got')) c.classList.add('got');
  });
  $('gomitas-text').textContent = `${TX.gomitasLabel}: ${game.count} / ${game.total}`;
  $('mood-text').textContent = TX.moods[game.mood];
  $('hearts-text').textContent = `${game.heartCount}`;
  drawPortrait();
  if (pop) {
    const p = $('portrait');
    p.classList.remove('pop');
    void p.offsetWidth;
    p.classList.add('pop');
  }
}

// Avisos (uno tras otro)
const toasts = [];
let toastTimer = null;
function toast(text) {
  toasts.push(text);
  if (!toastTimer) nextToast();
}
function nextToast() {
  const el = $('toast');
  const text = toasts.shift();
  if (!text) {
    el.hidden = true;
    toastTimer = null;
    return;
  }
  el.hidden = true;
  void el.offsetWidth;
  el.textContent = text;
  el.hidden = false;
  toastTimer = setTimeout(nextToast, 2300);
}
function clearToasts() {
  toasts.length = 0;
  clearTimeout(toastTimer);
  toastTimer = null;
  $('toast').hidden = true;
}

// Globos de diálogo: siguen al personaje que habla.
const bubbleEls = { her: $('bubble-her'), him: $('bubble-him') };
function syncBubbles() {
  const sw = stage.clientWidth;
  let prev = null;
  for (const who of ['her', 'him']) {
    const el = bubbleEls[who];
    const b = game.bubbles[who];
    if (!b) {
      el.hidden = true;
      el.dataset.id = '';
      continue;
    }
    if (el.dataset.id !== String(b.id)) {
      el.dataset.id = String(b.id);
      el.textContent = b.text;
      el.hidden = false;
      el.classList.remove('in');
      void el.offsetWidth;
      el.classList.add('in');
    }
    const ch = who === 'her' ? game.player : game.npc;
    const sx = view.left + (ch.x - Math.round(game.cam.x)) * view.css;
    const sy = view.top + (ch.y - (who === 'her' ? 31 : 37) - Math.round(game.cam.y)) * view.css;
    const bw = el.offsetWidth;
    const bh = el.offsetHeight;
    const tail = bh * 0.3;
    if (sx < -40 || sx > sw + 40) {
      el.style.visibility = 'hidden';
      continue;
    }
    el.style.visibility = '';
    const left = Math.max(6, Math.min(sw - bw - 6, sx - bw / 2));
    let top = Math.max(4, sy - bh - tail);
    // Si los dos hablan a la vez, que no se pisen.
    if (prev && left < prev.left + prev.w && left + bw > prev.left && top < prev.top + prev.h && top + bh > prev.top) {
      top = Math.max(4, prev.top - bh - 6);
      if (top < prev.top + prev.h && top + bh > prev.top) top = prev.top + prev.h + 6;
    }
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    el.style.setProperty('--tail', `${Math.max(12, Math.min(bw - 12, sx - left))}px`);
    prev = { left, top, w: bw, h: bh };
  }
}

// ------------------------------------------------------------
// Lo que pasa en el juego → sonido e interfaz
// ------------------------------------------------------------
function onGameEvent(name, data) {
  switch (name) {
    case 'jump': case 'land': case 'spring': case 'splash': case 'respawn': case 'poof': case 'talk':
      audio.sfx(name);
      break;
    case 'heart':
      audio.sfx('heart');
      $('hearts-text').textContent = `${data.hearts}`;
      break;
    case 'gomita':
      audio.sfx('gomita');
      updateHud(true);
      break;
    case 'allGomitas':
      setTimeout(() => audio.sfx('celebrate'), 450);
      toast(TX.allGomitas);
      break;
    case 'endingStart':
      clearToasts();
      $('hud').hidden = true;
      $('bigtext').textContent = '';
      $('win-card').hidden = true;
      $('screen-win').hidden = false;
      input.clear();
      audio.sfx('goal');
      audio.playMusic('love');
      break;
    case 'bigText': {
      audio.sfx('love');
      const el = $('bigtext');
      el.textContent = '';
      [...TX.bigText].forEach((ch, i) => {
        const s = document.createElement('span');
        s.textContent = ch;
        s.style.animationDelay = `${i * 0.06}s, ${i * 0.06 + 0.5}s`;
        el.append(s);
      });
      break;
    }
    case 'won':
      $('final-stats').textContent = `${TX.gomitasLabel}: ${data.count} / ${data.total}   ·   ${TX.heartsLabel}: ${data.hearts} / ${data.heartsTotal}`;
      $('win-card').hidden = false;
      $('btn-replay').focus({ preventScroll: true });
      break;
  }
}

function setBodyState() {
  document.body.className = document.body.className.replace(/\bstate-\w+/g, '').trim() + ` state-${paused ? 'paused' : game.state}`;
  input.enabled = game.state !== 'title';
}

// ------------------------------------------------------------
// Estados: empezar, pausar, reiniciar
// ------------------------------------------------------------
function beginGame() {
  if (busy) return;
  busy = true;
  audio.unlock();
  audio.sfx('click');
  $('fade').classList.add('on');
  setTimeout(() => {
    paused = false;
    clearToasts();
    input.clear();
    $('screen-title').hidden = true;
    $('screen-pause').hidden = true;
    $('screen-win').hidden = true;
    $('win-card').hidden = true;
    $('bigtext').textContent = '';
    game.start();
    acc = 0;
    $('hud').hidden = false;
    updateHud(false);
    setBodyState();
    audio.resume();
    audio.playMusic('garden');
    TX.intro.forEach(toast);
    $('fade').classList.remove('on');
    busy = false;
    document.activeElement?.blur?.();
  }, 260);
}

function setPaused(p, title = TX.pauseTitle) {
  if (p === paused || (p && game.state !== 'playing') || busy) return;
  paused = p;
  input.clear();
  $('pause-title').textContent = title;
  $('screen-pause').hidden = !p;
  if (p) {
    audio.sfx('click');
    setTimeout(() => paused && audio.suspend(), 80);
    $('btn-resume').focus({ preventScroll: true });
  } else {
    audio.resume();
    last = performance.now();
    document.activeElement?.blur?.();
  }
  setBodyState();
}
const togglePause = () => setPaused(!paused);

function toggleSound() {
  audio.unlock();
  audio.setMuted(!audio.muted);
  syncSound();
  if (!audio.muted) audio.sfx('click');
}
function syncSound() {
  $('btn-sound').classList.toggle('off', audio.muted);
  $('btn-sound2').textContent = audio.muted ? TX.soundOff : TX.soundOn;
}
syncSound();

$('btn-play').addEventListener('click', beginGame);
$('btn-replay').addEventListener('click', beginGame);
$('btn-restart2').addEventListener('click', beginGame);
$('btn-pause').addEventListener('click', () => setPaused(true));
$('btn-restart').addEventListener('click', () => setPaused(true, TX.restartTitle));
$('btn-resume').addEventListener('click', () => setPaused(false));
$('btn-sound').addEventListener('click', toggleSound);
$('btn-sound2').addEventListener('click', toggleSound);

// Pantalla completa (si el navegador la permite)
const root = document.documentElement;
if (!root.requestFullscreen) $('btn-full').hidden = true;
$('btn-full').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      await root.requestFullscreen();
      await screen.orientation?.lock?.('landscape').catch(() => {});
    }
  } catch { /* no disponible: se juega igual */ }
});

// Al cambiar de pestaña o bloquear el teléfono: pausa automática.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    input.clear();
    if (game.state === 'playing') setPaused(true);
    else audio.suspend();
  } else if (!paused) {
    audio.resume();
    last = performance.now();
  }
});
window.addEventListener('pagehide', () => input.clear());

// ------------------------------------------------------------
// Bucle principal: simulación a paso fijo, dibujo en cada cuadro
// ------------------------------------------------------------
let last = performance.now();
let acc = 0;
let prevState = game.state;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1; // tras un parón no se "teletransporta" nada
  if (dt < 0) dt = 0;
  if (!paused) {
    acc += dt;
    const inp = input.state();
    let n = 0;
    while (acc >= STEP && n < 16) {
      game.step(STEP, inp);
      acc -= STEP;
      n++;
    }
    if (n === 16) acc = 0;
  }
  if (game.state !== prevState) {
    prevState = game.state;
    setBodyState();
  }
  renderer.draw(game);
  syncBubbles();
}

setBodyState();
resize();
drawPortrait();
requestAnimationFrame(frame);
$('btn-play').focus({ preventScroll: true });

// Para depurar y para las pruebas automáticas.
window.__gomitas = { game, renderer, input, audio, level, STEP, isPaused: () => paused };
