// Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial.
// Este é o único arquivo carregado pelo index.html — ele importa todo o resto.

import { $, safe } from './utils.js';
import { VERSION } from './config.js';
import { state } from './state.js';
import { makePlayers } from './players.js';
import { startGame, startOnlineHostGame, startClientGame, applyRemoteState } from './loop.js';
import { render } from './render.js';
import { setupInput } from './input.js';
import { unlockAudio, setMuted } from './sound.js';
import { loadBest, loadMuted, saveMuted } from './storage.js';
import { maybeShowTutorial, setupTutorial } from './tutorial.js';
import * as net from './net.js';

// --- Multiplayer online (criar/entrar em sala) ---
net.setHandlers({
  onPeerJoined: () => {
    state.count = Math.min(3, 1 + net.connectedCount());
    $('roomStatus').textContent = `👥 ${net.connectedCount()} amigo(s) conectado(s). Pode clicar em "Jogar" quando quiser!`;
    makePlayers();
  },
  onPeerLeft: () => {
    state.count = Math.min(3, 1 + net.connectedCount());
    $('roomStatus').textContent = `👥 ${net.connectedCount()} amigo(s) conectado(s).`;
    makePlayers();
  },
  onStateUpdate: (msg) => applyRemoteState(msg),
});

$('hostBtn').addEventListener('click', () => {
  unlockAudio();
  $('hostBtn').disabled = true;
  net.hostRoom(
    (roomId) => {
      $('hostPanel').classList.remove('hidden');
      $('roomCode').textContent = roomId;
      $('roomStatus').textContent = '👥 0 amigo(s) conectado(s). Compartilha o link e espera a galera entrar!';
      $('count').disabled = true;
      state.count = 1;
      makePlayers();
    },
    (err) => {
      $('hostBtn').disabled = false;
      alert('Não consegui criar a sala: ' + (err?.message || err));
    }
  );
});

$('copyRoom').addEventListener('click', async () => {
  const link = location.origin + location.pathname + '?room=' + $('roomCode').textContent;
  try {
    await navigator.clipboard.writeText(link);
    $('copyRoom').textContent = 'Copiado! ✅';
    setTimeout(() => $('copyRoom').textContent = 'Copiar link', 1500);
  } catch { alert(link); }
});

$('joinBtn').addEventListener('click', () => {
  const code = $('joinCode').value.trim();
  if (!code) return;
  unlockAudio();
  $('joinBtn').disabled = true;
  $('joinStatus').textContent = 'Conectando...';
  net.joinRoom(code,
    () => {
      $('joinStatus').textContent = '';
      startClientGame();
    },
    (err) => {
      $('joinBtn').disabled = false;
      $('joinStatus').textContent = '❌ Não consegui entrar (confere o código ou pede pro seu amigo criar a sala de novo).';
    }
  );
});

// Se a pessoa abriu um link de convite (?room=CODIGO), já deixa o código preenchido
const roomFromUrl = new URLSearchParams(location.search).get('room');
if (roomFromUrl) $('joinCode').value = roomFromUrl;

// --- Botões principais ---
$('start').addEventListener('click', () => {
  unlockAudio();
  if (net.isOnline() && net.isHost()) startOnlineHostGame();
  else startGame();
});
$('restart').addEventListener('click', () => {
  if (net.isOnline() && net.isHost()) startOnlineHostGame();
  else startGame();
});
$('pause').addEventListener('click', () => state.paused = !state.paused);

$('back').addEventListener('click', () => {
  state.running = false;
  clearInterval(state.timer);
  net.disconnect();
  $('count').disabled = false;
  $('hostPanel').classList.add('hidden');
  $('hostBtn').disabled = false;
  $('joinBtn').disabled = false;
  $('game').classList.add('hidden');
  $('menu').classList.remove('hidden');
  render();
});

$('share').addEventListener('click', async () => {
  const url = location.href.split('?')[0];
  try {
    if (navigator.share) await navigator.share({ title: 'Snake Arena', text: 'Vem jogar Snake Arena comigo!', url });
    else { await navigator.clipboard.writeText(url); alert('Link copiado!'); }
  } catch {}
});

$('refresh').addEventListener('click', () => {
  location.href = location.pathname + '?v=' + VERSION + '&t=' + Date.now();
});

$('mode').addEventListener('change', e => state.mode = e.target.value);
$('difficulty').addEventListener('change', e => state.difficulty = e.target.value);

$('count').addEventListener('change', e => {
  state.count = +e.target.value;
  state.types = state.count === 3 ? ['human', 'human', 'human'] : ['human', 'cpu', 'cpu'];
  makePlayers();
});

$('players').addEventListener('change', e => {
  const i = +e.target.dataset.i;
  if (e.target.classList.contains('ptype')) state.types[i] = e.target.value;
  if (e.target.classList.contains('pcontrol')) state.controls[i] = e.target.value;
  if (e.target.classList.contains('pcolor')) state.colors[i] = e.target.value;
  if (e.target.classList.contains('pshow')) state.show[i] = e.target.checked;
});

$('players').addEventListener('input', e => {
  if (e.target.classList.contains('pname')) {
    const i = +e.target.dataset.i;
    state.names[i] = safe(e.target.value, `Jogador ${i + 1}`);
  }
});

$('myName').addEventListener('input', e => state.names[0] = safe(e.target.value, 'Jhon'));

// Botão de mudo — a preferência fica salva no navegador
$('mute').addEventListener('click', () => {
  state.muted = !state.muted;
  setMuted(state.muted);
  saveMuted(state.muted);
  $('mute').textContent = state.muted ? '🔇' : '🔊';
});

state.best = loadBest();
state.muted = loadMuted();
setMuted(state.muted);
$('mute').textContent = state.muted ? '🔇' : '🔊';

setupInput();
setupTutorial();
makePlayers();
render();
maybeShowTutorial();
