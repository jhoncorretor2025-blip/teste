// Controles: teclado (setas / WASD / IJKL), turbo (tecla ou botão de toque) e joystick do celular.

import { $ } from './utils.js';
import { CK, KD, D, BOOST_KEYS, BOOST_COOLDOWN } from './config.js';
import { state } from './state.js';
import { tryBoost } from './loop.js';

function reverse(a, b) {
  return a && b && a.x === -b.x && a.y === -b.y;
}

// Muda a direção de uma minhoca (não deixa dar meia-volta em cima do próprio corpo)
export function setDir(i, d) {
  if (state.alive[i] && !reverse(state.dirs[i], d)) state.nextDirs[i] = { x: d.x, y: d.y };
}

function handleKey(e) {
  if (!state.running) return;
  if (e.code === 'KeyP') { state.paused = !state.paused; return; }
  if (state.paused) return;
  for (let i = 0; i < state.count; i++) if (state.types[i] === 'human') {
    const keys = CK[state.controls[i]] || CK.arrows;
    if (keys.includes(e.code)) { e.preventDefault(); setDir(i, KD[e.code]); }
    if (BOOST_KEYS[state.controls[i]] === e.code) { e.preventDefault(); tryBoost(i); }
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

// Liga os listeners de teclado, botão de turbo e do joystick (chamar uma vez, no início)
export function setupInput() {
  document.addEventListener('keydown', handleKey, { passive: false });

  $('boostTouch').addEventListener('click', () => {
    if (tryBoost(0)) flashBoostButton();
  });

  function joystickMove(e) {
    const r = $('joystick').getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const x = e.clientX - cx, y = e.clientY - cy;
    const ax = Math.abs(x), ay = Math.abs(y);
    if (Math.max(ax, ay) < 12) return;
    setDir(0, ax > ay ? (x > 0 ? D.right : D.left) : (y > 0 ? D.down : D.up));
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
}
