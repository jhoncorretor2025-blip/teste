// Controles: teclado (setas / WASD / IJKL / personalizado), turbo (tecla ou botão de
// toque), joystick, D-pad de setas e arrastar o dedo (swipe) na tela.
// No modo online, o CLIENTE não controla o jogo direto — ele manda a direção pro anfitrião,
// que é quem realmente decide o que acontece (evita trapaça e mantém todo mundo sincronizado).

import { $ } from './utils.js';
import { CK, KD, D, BOOST_KEYS, BOOST_COOLDOWN } from './config.js';
import { state } from './state.js';
import { tryBoost } from './loop.js';
import { isOnline, isHost, mySlot, sendInput } from './net.js';

function reverse(a, b) {
  return a && b && a.x === -b.x && a.y === -b.y;
}

// Muda a direção de uma minhoca LOCAL (não deixa dar meia-volta em cima do próprio corpo)
export function setDir(i, d) {
  if (state.alive[i] && !reverse(state.dirs[i], d)) state.nextDirs[i] = { x: d.x, y: d.y };
}

// Move a "minha" minhoca — local (host/offline) manda direto, cliente online manda pro anfitrião
function moveMine(d) {
  if (isOnline() && !isHost()) sendInput({ type: 'dir', dir: d });
  else setDir(mySlot, d);
}

function boostMine() {
  if (isOnline() && !isHost()) sendInput({ type: 'boost' });
  else tryBoost(mySlot);
}

// Verifica se uma tecla bate com o esquema de controle de um jogador — inclui o
// esquema "personalizado" (custom), onde cada tecla foi escolhida pela própria pessoa.
function matchesDirKey(i, code) {
  if (state.controls[i] === 'custom') {
    const ck = state.customKeys[i] || {};
    if (code === ck.up) return D.up;
    if (code === ck.down) return D.down;
    if (code === ck.left) return D.left;
    if (code === ck.right) return D.right;
    return null;
  }
  const keys = CK[state.controls[i]] || CK.arrows;
  return keys.includes(code) ? KD[code] : null;
}

function matchesBoostKey(i, code) {
  if (state.controls[i] === 'custom') return (state.customKeys[i] || {}).boost === code;
  return BOOST_KEYS[state.controls[i]] === code;
}

function handleKey(e) {
  if (!state.running) return;
  if (e.code === 'KeyP' && !(isOnline() && !isHost())) { state.paused = !state.paused; return; }
  if (state.paused) return;

  if (isOnline() && !isHost()) {
    // Cliente: sempre usa Setas pra mover e Espaço pro turbo, não importa o que escolheu no menu
    if (CK.arrows.includes(e.code)) { e.preventDefault(); moveMine(KD[e.code]); }
    if (e.code === 'Space') { e.preventDefault(); boostMine(); }
    return;
  }

  // Local ou anfitrião: cada jogador HUMANO LOCAL usa o esquema de controle escolhido pra ele.
  // No online, o anfitrião só controla a própria minhoca (as outras são de amigos remotos).
  for (let i = 0; i < state.count; i++) {
    if (state.types[i] !== 'human') continue;
    if (isOnline() && i !== mySlot) continue;
    const dir = matchesDirKey(i, e.code);
    if (dir) { e.preventDefault(); setDir(i, dir); }
    if (matchesBoostKey(i, e.code)) { e.preventDefault(); tryBoost(i); }
  }
}

// Deixa o botão de turbo "apagado" enquanto está em cooldown, pra dar um retorno visual
function flashBoostButton() {
  const btn = $('boostTouch');
  if (!btn) return;
  btn.style.opacity = '0.4';
  btn.style.pointerEvents = 'none';
  setTimeout(() => { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }, BOOST_COOLDOWN);
}

// Liga os listeners de teclado, botão de turbo, joystick, D-pad e arrastar o dedo
export function setupInput() {
  document.addEventListener('keydown', handleKey, { passive: false });

  $('boostTouch').addEventListener('click', () => {
    boostMine();
    flashBoostButton();
  });

  // Controle alternativo em forma de setas (D-pad), pra quem prefere botão a arrastar o dedo
  const dpadDirs = { dpadUp: D.up, dpadDown: D.down, dpadLeft: D.left, dpadRight: D.right };
  Object.keys(dpadDirs).forEach(id => {
    const btn = $(id);
    if (!btn) return;
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); moveMine(dpadDirs[id]); });
  });

  function joystickMove(e) {
    const r = $('joystick').getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const x = e.clientX - cx, y = e.clientY - cy;
    const ax = Math.abs(x), ay = Math.abs(y);
    if (Math.max(ax, ay) < 12) return;
    moveMine(ax > ay ? (x > 0 ? D.right : D.left) : (y > 0 ? D.down : D.up));
    const max = r.width * 0.33, m = Math.min(max, Math.hypot(x, y)), a = Math.atan2(y, x);
    $('stick').style.transform = `translate(${Math.cos(a) * m}px,${Math.sin(a) * m}px)`;
  }

  $('joystick').addEventListener('pointerdown', e => {
    e.preventDefault();
    state.joyId = e.pointerId;
    $('joystick').setPointerCapture(state.joyId);
    joystickMove(e);
  });
  $('joystick').addEventListener('pointermove', e => {
    if (e.pointerId === state.joyId) { e.preventDefault(); joystickMove(e); }
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev =>
    $('joystick').addEventListener(ev, () => {
      state.joyId = null;
      $('stick').style.transform = 'translate(0,0)';
    })
  );

  // Arrastar o dedo direto na arena (swipe) — outro jeito de controlar, sem bolinha nem botão
  let swipeStart = null;
  const arenaEl = $('arenaCanvas');
  if (arenaEl) {
    arenaEl.addEventListener('pointerdown', (e) => {
      if (state.touchControl !== 'swipe') return;
      swipeStart = { x: e.clientX, y: e.clientY };
    });
    arenaEl.addEventListener('pointerup', (e) => {
      if (state.touchControl !== 'swipe' || !swipeStart) return;
      const dx = e.clientX - swipeStart.x, dy = e.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return; // arrasto curto demais, ignora
      moveMine(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? D.right : D.left) : (dy > 0 ? D.down : D.up));
    });
  }
}
