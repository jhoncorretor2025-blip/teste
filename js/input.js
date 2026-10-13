// Controles: teclado (setas / WASD / IJKL / personalizado), turbo (tecla ou botão de
// toque), joystick, D-pad de setas e arrastar o dedo (swipe) na tela.
// No modo online, o CLIENTE não controla o jogo direto — ele manda a direção pro anfitrião,
// que é quem realmente decide o que acontece (evita trapaça e mantém todo mundo sincronizado).

import { $, tapVibrate } from './utils.js';
import { CK, KD, D, BOOST_KEYS, BOOST_COOLDOWN } from './config.js';
import { state } from './state.js';
import { tryBoost } from './loop_stable_336.js?v=4.5.61';
import { isOnline, isHost, mySlot, sendInput } from './net.js';
import { transformDirection, canTurn } from './negative_events.js';

function reverse(a, b) {
  return a && b && a.x === -b.x && a.y === -b.y;
}

// Muda a direção de uma minhoca LOCAL (não deixa dar meia-volta em cima do próprio corpo)
export function setDir(i, d) {
  if (!canTurn()) return;
  const transformed = transformDirection(d);
  if (state.alive[i] && !reverse(state.dirs[i], transformed)) state.nextDirs[i] = { x: transformed.x, y: transformed.y };
}

// Move a "minha" minhoca — local (host/offline) manda direto, cliente online manda pro anfitrião
function moveMine(d) {
  // Evita que toques durante pausa ou fora de uma partida alterem a próxima direção.
  if (!state.running || state.paused) return;
  if (isOnline() && !isHost()) {
    const previous = state.inputPredictionDir || state.dirs[mySlot];
    if (reverse(previous, d)) return;
    state.inputPredictionDir = { x: d.x, y: d.y };
    sendInput({ type: 'dir', dir: d });
    // Só muda a orientação visual da cabeça. Posição, colisão e pontuação continuam no host.
    document.dispatchEvent(new CustomEvent('localInputPredicted'));
  } else setDir(mySlot, d);
}

function boostMine() {
  if (!state.running || state.paused) return;
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
  if (e.code === state.shortcuts.pause && !(isOnline() && !isHost())) { state.paused = !state.paused; return; }
  if (state.paused) return;

  if (isOnline() && !isHost()) {
    // No online, o jogador local pode usar tanto Setas quanto WASD.
    // Espaço continua sendo o turbo.
    if (CK.arrows.includes(e.code) || CK.wasd.includes(e.code)) { e.preventDefault(); moveMine(KD[e.code]); }
    if (e.code === 'Space') { e.preventDefault(); boostMine(); }
    return;
  }

  // Local ou anfitrião: cada jogador HUMANO LOCAL usa o esquema de controle escolhido pra ele.
  // No online, o anfitrião só controla a própria minhoca (as outras são de amigos remotos).
  for (let i = 0; i < state.count; i++) {
    if (state.types[i] !== 'human') continue;
    if (isOnline() && i !== mySlot) continue;
    // O Jogador 1 sempre aceita Setas e WASD, independentemente da opção exibida no menu.
    // Isso evita que a pessoa tenha que lembrar qual esquema foi selecionado.
    const dir = (i === mySlot && (CK.arrows.includes(e.code) || CK.wasd.includes(e.code)))
      ? KD[e.code]
      : matchesDirKey(i, e.code);
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

  // pointerdown (não "click") pra responder na hora do toque, igual joystick e D-pad —
  // "click" só dispara depois de soltar o dedo, dando uma sensação de atraso no turbo
  $('boostTouch').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    tapVibrate();
    boostMine();
    flashBoostButton();
  });

  // Controle alternativo em forma de setas (D-pad), pra quem prefere botão a arrastar o dedo
  const dpadDirs = { dpadUp: D.up, dpadDown: D.down, dpadLeft: D.left, dpadRight: D.right };
  Object.keys(dpadDirs).forEach(id => {
    const btn = $(id);
    if (!btn) return;
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); tapVibrate(); moveMine(dpadDirs[id]); });
  });

  let lastJoystickDir = null;
  let lastJoystickAxis = null;
  const joystickEl = $('joystick');
  const stickEl = $('stick');

  function resetJoystick(pointerId = null) {
    // Um segundo dedo que solte o controle não deve interromper o dedo que o conduz.
    if (pointerId !== null && state.joyId !== pointerId) return;
    const activeId = state.joyId;
    state.joyId = null;
    lastJoystickDir = null;
    lastJoystickAxis = null;
    joystickEl.classList.remove('is-active');
    stickEl.style.transform = 'translate(0,0)';
    if (activeId !== null && activeId !== undefined) {
      try {
        if (joystickEl.hasPointerCapture?.(activeId)) joystickEl.releasePointerCapture(activeId);
      } catch {}
    }
  }

  function joystickMove(e) {
    const r = joystickEl.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const x = e.clientX - cx, y = e.clientY - cy;
    const ax = Math.abs(x), ay = Math.abs(y);
    const distance = Math.hypot(x, y);
    // Zona morta pequena e proporcional: evita tremores sem exigir um arrasto longo.
    if (distance < Math.max(7, r.width * 0.055)) return;

    // Mantém o eixo atual quando o dedo está quase na diagonal. Isso reduz oscilações
    // entre horizontal e vertical, sem tirar a resposta quando a pessoa muda de rumo.
    let axis;
    if (ax > ay * 1.12) axis = 'x';
    else if (ay > ax * 1.12) axis = 'y';
    else axis = lastJoystickAxis || (ax >= ay ? 'x' : 'y');
    lastJoystickAxis = axis;

    const dir = axis === 'x'
      ? (x > 0 ? D.right : D.left)
      : (y > 0 ? D.down : D.up);

    // Envia só quando a direção muda: resposta imediata com menos mensagens online.
    if (!lastJoystickDir || dir.x !== lastJoystickDir.x || dir.y !== lastJoystickDir.y) {
      moveMine(dir);
      lastJoystickDir = dir;
    }

    const max = Math.max(22, r.width * 0.38);
    const m = Math.min(max, distance), a = Math.atan2(y, x);
    stickEl.style.transform = `translate(${Math.cos(a) * m}px,${Math.sin(a) * m}px)`;
  }

  joystickEl.addEventListener('pointerdown', e => {
    if (state.joyId !== null && state.joyId !== undefined) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    tapVibrate();
    state.joyId = e.pointerId;
    joystickEl.classList.add('is-active');
    try { joystickEl.setPointerCapture(e.pointerId); } catch {}
    joystickMove(e);
  });
  joystickEl.addEventListener('pointermove', e => {
    if (e.pointerId === state.joyId) { e.preventDefault(); joystickMove(e); }
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev =>
    joystickEl.addEventListener(ev, e => resetJoystick(e.pointerId))
  );

  // Se o navegador perder o foco ou o app for para segundo plano, nenhum toque fica preso.
  window.addEventListener('blur', () => resetJoystick());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetJoystick();
  });

  // Arrastar o dedo direto na arena (swipe) — outro jeito de controlar, sem bolinha nem botão
  let swipeStart = null;
  const arenaEl = $('arenaCanvas');
  if (arenaEl) {
    arenaEl.addEventListener('pointerdown', (e) => {
      if (state.touchControl !== 'swipe' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      swipeStart = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
      try { arenaEl.setPointerCapture(e.pointerId); } catch {}
    });
    arenaEl.addEventListener('pointerup', (e) => {
      if (state.touchControl !== 'swipe' || !swipeStart || e.pointerId !== swipeStart.pointerId) return;
      const dx = e.clientX - swipeStart.x, dy = e.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return; // arrasto curto demais, ignora
      moveMine(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? D.right : D.left) : (dy > 0 ? D.down : D.up));
    });
    ['pointercancel', 'lostpointercapture'].forEach(ev => arenaEl.addEventListener(ev, (e) => {
      if (swipeStart && e.pointerId === swipeStart.pointerId) swipeStart = null;
    }));

    // Duplo toque na arena também ativa o turbo — alternativa ao botão dedicado.
    // Só funciona no joystick e nas setas — no modo "arrastar o dedo" (swipe), jogar
    // envolve tocar a tela várias vezes rápido pra virar, e isso ativaria o turbo sem querer.
    let lastTapTime = 0;
    arenaEl.addEventListener('pointerdown', () => {
      if (state.touchControl === 'swipe') return;
      const now = Date.now();
      if (now - lastTapTime < 300) {
        tapVibrate();
        boostMine();
        lastTapTime = 0; // evita disparar de novo com um 3º toque rápido
      } else {
        lastTapTime = now;
      }
    });
  }
}
