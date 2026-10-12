// Arranque: une juego, dibujo, sonido, controles e interfaz.

import { CONFIG } from './config.js';
import { createGomitasLevel } from './levels/gomitas.js';
import { createPipuLevel } from './levels/pipu.js';
import { createMenuLevel } from './levels/menu.js';
import { Game, STEP } from './game.js';
import { Renderer } from './renderer.js';
import { AudioKit } from './audio.js';
import { Input } from './input.js';

const $ = (id) => document.getElementById(id);
const TX = CONFIG.texts;

const PT = TX.pipu;
const levels = { menu: createMenuLevel(), gomitas: createGomitasLevel(), pipu: createPipuLevel() };
const stage = $('stage');
const canvas = $('game');
const renderer = new Renderer(canvas, levels.menu, CONFIG);
const audio = new AudioKit(CONFIG.audio);
const input = new Input();
// La partida actual. En el menú se ve un escenario propio con todo el elenco.
let game = new Game(CONFIG, levels.menu, onGameEvent);
let level = levels.menu;

let paused = false;
let notesOpen = false;
let talkOpen = false; // primer plano de quien habla
let talkAt = 0;
let aryaRevealed = false;
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
document.querySelectorAll('.btn.level').forEach((b) => {
  const t = TX.levels[b.dataset.level];
  b.querySelector('.lv-tag').textContent = t.tag;
  b.querySelector('.lv-name').textContent = t.name;
  b.querySelector('.lv-desc').textContent = t.desc;
  b.addEventListener('click', () => beginGame(b.dataset.level));
});
$('btn-menu').textContent = TX.menu;
$('btn-menu2').textContent = TX.menu;
$('notes-title').textContent = PT.notesTitle;
$('suspects-title').textContent = PT.suspectsTitle;
$('btn-notes-close').textContent = PT.close;
$('rotate-hint').textContent = TX.rotateHint;
$('btn-resume').textContent = TX.resume;
$('btn-restart2').textContent = TX.restart;
$('btn-replay').textContent = TX.replay;

// Gomitas del logo y casillas del HUD
// Iconos del logo: una gomita (nivel 1) y Pipu (nivel 2)
document.querySelectorAll('.logo-icon').forEach((c, i) => icon(c, i ? renderer.S.pipu.awake : renderer.S.gomitas[0]));
let slots = [];
function buildSlots() {
  $('slots').textContent = '';
  slots = Array.from({ length: game.total }, () => {
    const c = document.createElement('canvas');
    c.width = 12;
    c.height = 14;
    $('slots').append(c);
    return c;
  });
}
// Dibuja un sprite centrado en un canvas pequeño.
function icon(c, sp) {
  const x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  x.drawImage(sp.c, (c.width - sp.w) >> 1, (c.height - sp.h) >> 1);
}

// ------------------------------------------------------------
// Controles táctiles
// ------------------------------------------------------------
input.bindPad($('pad-move'));
input.bindPad($('pad-jump'));
input.onAction = (a) => {
  if (talkOpen) return; // el primer plano se cierra con Enter o un toque
  if (a === 'pause') { if (notesOpen) closeNotes(); else togglePause(); }
  else if (a === 'mute') toggleSound();
  else if (a === 'notes') { if (notesOpen) closeNotes(); else openNotes(); }
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
// Tocar o hacer clic sobre un personaje (o una nota) vuelve a mostrar su texto.
canvas.addEventListener('pointerdown', (e) => {
  if (paused || busy) return;
  const r = canvas.getBoundingClientRect();
  const wx = ((e.clientX - r.left) / r.width) * canvas.width + Math.round(game.cam.x);
  const wy = ((e.clientY - r.top) / r.height) * canvas.height + Math.round(game.cam.y);
  game.tapAt(wx, wy);
});
// Nada de menús, zoom ni desplazamientos accidentales.
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (!e.target.closest?.('.scrolly')) e.preventDefault(); }, { passive: false });
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
  const S = renderer.S;
  const pipu = game.mode === 'pipu';
  slots.forEach((c, i) => {
    const item = pipu ? game.clues[i] : game.gomitas[i];
    const got = item.collected;
    if (pipu) icon(c, (got ? S.clues : S.clueGhost)[item.kind]);
    else icon(c, got ? S.gomitas[item.color] : S.gomitaGhost);
    if (!got) c.classList.remove('got');
    else if (!c.classList.contains('got')) c.classList.add('got');
  });
  $('gomitas-text').textContent = `${pipu ? PT.cluesLabel : TX.gomitasLabel}: ${game.count} / ${game.total}`;
  $('mood-text').textContent = pipu ? PT.phases[Math.min(game.count, PT.phases.length - 1)] : TX.moods[game.mood];
  if (pipu && game.count === game.total && !game.canAccuse) $('mood-text').textContent = PT.findShadow;
  $('btn-notes').classList.toggle('ready', game.canAccuse);
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

// Globos de diálogo: siguen al personaje que habla (ella, él, Arya, sospechosos...).
const bubbleEls = { her: $('bubble-her'), him: $('bubble-him') };
function bubbleEl(who) {
  if (!bubbleEls[who]) {
    const el = document.createElement('div');
    el.className = `bubble ${who}`;
    el.hidden = true;
    $('bubble-him').after(el);
    bubbleEls[who] = el;
  }
  return bubbleEls[who];
}
function syncBubbles() {
  const sw = stage.clientWidth;
  const placed = [];
  for (const who in bubbleEls) {
    if (!game.bubbles[who]) {
      bubbleEls[who].hidden = true;
      bubbleEls[who].dataset.id = '';
    }
  }
  for (const who in game.bubbles) {
    const b = game.bubbles[who];
    if (!b) continue;
    const el = bubbleEl(who);
    if (el.dataset.id !== String(b.id)) {
      el.dataset.id = String(b.id);
      el.textContent = b.text;
      el.hidden = false;
      el.classList.remove('in');
      void el.offsetWidth;
      el.classList.add('in');
    }
    const pos = game.speakerPos(who);
    const sx = view.left + (pos.x - Math.round(game.cam.x)) * view.css;
    const sy = view.top + (pos.y - Math.round(game.cam.y)) * view.css;
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
    // Si varios hablan a la vez, que no se pisen.
    for (const prev of placed) {
      if (left < prev.left + prev.w && left + bw > prev.left && top < prev.top + prev.h && top + bh > prev.top) {
        top = Math.max(4, prev.top - bh - 6);
        if (top < prev.top + prev.h && top + bh > prev.top) top = prev.top + prev.h + 6;
      }
    }
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    el.style.setProperty('--tail', `${Math.max(12, Math.min(bw - 12, sx - left))}px`);
    placed.push({ left, top, w: bw, h: bh });
  }
}

// ------------------------------------------------------------
// Primer plano: al tocar a un sospechoso del nivel 2 para interrogarlo, la cámara
// corta a su carita en grande con el texto abajo. Enter o un toque para seguir.
// ------------------------------------------------------------
function openCloseup(who) {
  const b = game.bubbles[who];
  if (!b) return;
  delete game.bubbles[who]; // el texto va en el primer plano, no en el globo
  const S = renderer.S;
  const cv = $('cu-face');
  const x = cv.getContext('2d');
  x.clearRect(0, 0, 20, 20);
  if (who === 'him') {
    x.drawImage(S.him.torso.hold.c, 2, 12);
    x.drawImage(S.him.head.c, 2, 4);
    x.drawImage(S.him.faces.nervous.c, 6, 9);
  } else icon(cv, S[who]);
  $('cu-name').textContent = PT.suspects[who === 'him' ? 'nico' : who].name;
  $('cu-text').textContent = b.text;
  $('cu-next').textContent = PT.next;
  paused = true;
  talkOpen = true;
  talkAt = performance.now();
  input.clear();
  const el = $('closeup');
  el.hidden = true;
  void el.offsetWidth; // reinicia la animación de entrada
  el.hidden = false;
  setBodyState();
}

function closeCloseup() {
  // Un pequeño margen para que el mismo toque que lo abrió no lo cierre.
  if (!talkOpen || performance.now() - talkAt < 350) return;
  talkOpen = false;
  paused = false;
  $('closeup').hidden = true;
  input.clear();
  last = performance.now();
  setBodyState();
}
$('closeup').addEventListener('click', closeCloseup);
window.addEventListener('keydown', (e) => {
  if (!talkOpen || e.repeat) return;
  if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape' || e.code === 'NumpadEnter') {
    e.preventDefault();
    closeCloseup();
  }
});

// ------------------------------------------------------------
// Libreta de la detective: pistas, sospechosos y acusación
// ------------------------------------------------------------
function renderNotes() {
  const S = renderer.S;
  const list = $('clue-list');
  list.textContent = '';
  for (const c of game.clues) {
    const li = document.createElement('li');
    li.className = c.collected ? 'found' : '';
    const cv = document.createElement('canvas');
    cv.width = 12;
    cv.height = 12;
    icon(cv, (c.collected ? S.clues : S.clueGhost)[c.kind]);
    const t = c.collected ? PT.clues[c.kind] : { name: PT.unknownClue, note: PT.unknownNote };
    const txt = document.createElement('div');
    txt.innerHTML = '<b></b><span></span>';
    txt.firstChild.textContent = t.name;
    txt.lastChild.textContent = t.note;
    li.append(cv, txt);
    list.append(li);
  }
  const box = $('suspect-list');
  box.textContent = '';
  const all = game.canAccuse;
  const cards = ['chif', 'tiana', 'nico', 'carino'];
  // Con todas las pistas aparece arriba la tarjeta misteriosa (el giro).
  if (all) cards.unshift(aryaRevealed ? 'arya' : 'mystery');
  for (const id of cards) {
    const card = document.createElement('div');
    card.className = `suspect ${id}`;
    const cv = document.createElement('canvas');
    cv.width = 18;
    cv.height = 18;
    if (id === 'arya') icon(cv, S.arya.sit);
    else if (id === 'nico') {
      // Hasta que da la cara, en la libreta solo es "la sombra".
      const x = cv.getContext('2d');
      x.drawImage((game.nico.spoken ? S.him : S.shadow).head.c, 1, 4);
      if (game.nico.spoken) x.drawImage(S.him.faces.happy.c, 5, 9);
      else { x.fillStyle = '#ffffff'; x.fillRect(6, 10, 2, 2); x.fillRect(11, 10, 2, 2); }
    }
    else if (id !== 'mystery') icon(cv, S[id]);
    const info = document.createElement('div');
    info.innerHTML = '<b></b><i></i><span></span>';
    const btn = document.createElement('button');
    btn.className = 'btn small';
    if (id === 'mystery') {
      cv.classList.add('unknown');
      info.children[0].textContent = PT.mystery;
      info.children[1].textContent = PT.mysteryKind;
      btn.textContent = PT.revealBtn;
      btn.dataset.reveal = '1';
    } else {
      const known = id === 'nico' ? game.nico.spoken : id === 'arya' || game.suspects[id].spoken;
      const who = PT.suspects[id === 'nico' && !known ? 'shadow' : id];
      info.children[0].textContent = who.name;
      info.children[1].textContent = who.kind;
      if (id !== 'arya') info.children[2].textContent = known ? `«${PT.alibi[id]}»` : id === 'nico' ? PT.shadowNote : PT.notAsked;
      btn.textContent = PT.accuse;
      btn.dataset.accuse = id;
    }
    card.append(cv, info, btn);
    box.append(card);
  }
  box.parentElement.scrollTop = 0;
}

function openNotes() {
  if (game.mode !== 'pipu' || game.state !== 'playing' || paused || busy) return;
  paused = true;
  notesOpen = true;
  input.clear();
  audio.sfx('page');
  $('notes-msg').textContent = '';
  renderNotes();
  $('screen-notes').hidden = false;
  $('btn-notes-close').focus({ preventScroll: true });
  setBodyState();
}

function closeNotes() {
  if (!notesOpen) return;
  notesOpen = false;
  paused = false;
  $('screen-notes').hidden = true;
  last = performance.now();
  document.activeElement?.blur?.();
  setBodyState();
}

$('suspect-list').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || busy) return;
  const msg = $('notes-msg');
  if (btn.dataset.reveal) {
    aryaRevealed = true;
    audio.sfx('reveal');
    renderNotes();
    msg.textContent = PT.aryaRevealed;
    return;
  }
  const who = btn.dataset.accuse;
  const res = game.accuse(who);
  msg.textContent = res.text;
  msg.classList.remove('shake');
  if (!res.ok) {
    audio.sfx('wrong');
    void msg.offsetWidth;
    msg.classList.add('shake');
    return;
  }
  // ¡Culpable! Corte a la camita de Arya.
  busy = true;
  audio.sfx('celebrate');
  setTimeout(() => $('fade').classList.add('on'), 900);
  setTimeout(() => {
    busy = false;
    closeNotes();
    game.startCaseEnding();
    $('fade').classList.remove('on');
  }, 1250);
});
$('btn-notes').addEventListener('click', openNotes);
$('btn-notes-close').addEventListener('click', closeNotes);

// ------------------------------------------------------------
// Lo que pasa en el juego → sonido e interfaz
// ------------------------------------------------------------
function onGameEvent(name, data) {
  switch (name) {
    case 'talk':
      audio.sfx('talk');
      if (data.closeup && game.state === 'playing') openCloseup(data.who);
      break;
    case 'jump': case 'land': case 'spring': case 'splash': case 'respawn': case 'poof': case 'bark': case 'burp': case 'reveal':
      audio.sfx(name);
      break;
    case 'sting':
      audio.sfx('sting');
      break;
    case 'paper':
      audio.sfx('page');
      break;
    case 'clue':
      audio.sfx('clue');
      updateHud(true);
      break;
    case 'needShadow':
      toast(PT.findShadow);
      updateHud(false);
      break;
    case 'allClues':
      updateHud(false);
      setTimeout(() => audio.sfx('celebrate'), 450);
      toast(PT.allClues);
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
      [...(game.mode === 'pipu' ? PT.bigText : TX.bigText)].forEach((ch, i) => {
        const s = document.createElement('span');
        s.textContent = ch;
        s.style.animationDelay = `${i * 0.06}s, ${i * 0.06 + 0.5}s`;
        el.append(s);
      });
      break;
    }
    case 'won':
      $('final-message').textContent = data.mode === 'pipu' ? PT.finalMessage : TX.finalMessage;
      $('final-note').textContent = data.mode === 'pipu' ? PT.finalNote : TX.finalNote;
      $('final-stats').textContent = data.mode === 'pipu'
        ? `${PT.cluesLabel}: ${data.count} / ${data.total}   ·   ${PT.wrongLabel}: ${data.wrong}`
        : `${TX.gomitasLabel}: ${data.count} / ${data.total}   ·   ${TX.heartsLabel}: ${data.hearts} / ${data.heartsTotal}`;
      $('win-card').hidden = false;
      $('btn-replay').focus({ preventScroll: true });
      break;
  }
}

function setBodyState() {
  document.body.className = document.body.className.replace(/\bstate-\w+/g, '').trim() + ` state-${paused ? 'paused' : game.state}`;
  document.body.dataset.level = game.mode;
  input.enabled = game.state !== 'title';
}

// ------------------------------------------------------------
// Estados: empezar, pausar, reiniciar
// ------------------------------------------------------------
function beginGame(id = game.mode) {
  if (busy) return;
  busy = true;
  audio.unlock();
  audio.sfx('click');
  $('fade').classList.add('on');
  setTimeout(() => {
    hideScreens();
    level = levels[id];
    game = new Game(CONFIG, level, onGameEvent);
    renderer.setLevel(level);
    game.setView(canvas.width, canvas.height);
    game.start();
    prevState = game.state;
    acc = 0;
    buildSlots();
    $('hud').hidden = false;
    $('btn-notes').hidden = id !== 'pipu';
    updateHud(false);
    setBodyState();
    audio.resume();
    audio.playMusic(id === 'pipu' ? 'mystery' : 'garden');
    (id === 'pipu' ? PT.intro : TX.intro).forEach(toast);
    $('fade').classList.remove('on');
    busy = false;
    document.activeElement?.blur?.();
  }, 260);
}

function hideScreens() {
  paused = false;
  notesOpen = false;
  aryaRevealed = false;
  clearToasts();
  input.clear();
  talkOpen = false;
  for (const id of ['screen-title', 'screen-pause', 'screen-win', 'screen-notes', 'closeup', 'win-card']) $(id).hidden = true;
  $('bigtext').textContent = '';
}

// Volver al menú de niveles.
function toMenu() {
  if (busy) return;
  busy = true;
  audio.sfx('click');
  $('fade').classList.add('on');
  setTimeout(() => {
    hideScreens();
    audio.resume();
    audio.stopMusic();
    level = levels.menu;
    game = new Game(CONFIG, level, onGameEvent);
    renderer.setLevel(level);
    game.setView(canvas.width, canvas.height);
    prevState = game.state;
    $('hud').hidden = true;
    $('screen-title').hidden = false;
    setBodyState();
    $('fade').classList.remove('on');
    busy = false;
    $('btn-level1').focus({ preventScroll: true });
  }, 260);
}

function setPaused(p, title = TX.pauseTitle) {
  if (notesOpen || talkOpen) return;
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

$('btn-replay').addEventListener('click', () => beginGame());
$('btn-restart2').addEventListener('click', () => beginGame());
$('btn-menu').addEventListener('click', toMenu);
$('btn-menu2').addEventListener('click', toMenu);
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
    while (acc >= STEP && n < 16 && !paused) {
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
$('btn-level1').focus({ preventScroll: true });

// Para depurar y para las pruebas automáticas.
window.__gomitas = { get game() { return game; }, get level() { return level; }, levels, renderer, input, audio, STEP, isPaused: () => paused };
