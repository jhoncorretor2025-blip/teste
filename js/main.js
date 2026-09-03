// Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial.
// Este é o único arquivo carregado pelo index.html — ele importa todo o resto.

import { $, safe } from './utils.js';
import { VERSION, COLORS } from './config.js';
import { state } from './state.js';
import { makePlayers } from './players.js';
import { startGame, startOnlineHostGame, startClientGame, applyRemoteState, tryBoost } from './loop.js';
import { render } from './render.js';
import { setupInput, setDir } from './input.js';
import { unlockAudio, setMuted, toggleMusic } from './sound.js';
import { loadBest, loadMuted, saveMuted, loadProfile, saveProfile, resetSettings } from './storage.js';
import { maybeShowTutorial, setupTutorial } from './tutorial.js';
import { shareScoreCard } from './share.js';
import { renderLeaderboard } from './leaderboard.js';
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
  // Aplica de verdade a direção/turbo que o amigo manda — sem isso a minhoca dele
  // nunca virava, só seguia reto na direção que nasceu (bug relatado)
  onInput: (slot, msg) => {
    if (msg.type === 'dir') setDir(slot, msg.dir);
    else if (msg.type === 'boost') tryBoost(slot);
  },
  onCountdown: (n) => {
    $('countdownOverlay').classList.remove('hidden');
    $('countdownText').textContent = n > 0 ? String(n) : 'VAI! 🚀';
    if (n <= 0) setTimeout(() => $('countdownOverlay').classList.add('hidden'), 500);
  },
  onConnectionStatus: (status) => {
    // Mostra no card certo (anfitrião ou quem entrou) dependendo de qual tá visível
    const box = net.isHost() ? $('roomStatus') : $('joinStatus');
    if (!box) return;
    if (status === 'disconnected') {
      box.dataset.prevText = box.textContent;
      box.textContent = '🔄 Conexão caiu, reconectando sozinho...';
    } else if (status === 'connected' && box.dataset.prevText) {
      box.textContent = net.isHost()
        ? `✅ Reconectado! 👥 ${net.connectedCount()} amigo(s) conectado(s).`
        : '✅ Reconectado!';
      delete box.dataset.prevText;
    }
  },
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

// Aceita tanto o código puro quanto o link inteiro colado (com "?room=..."),
// já que muita gente cola o link inteiro em vez de só o código — não devia dar erro por isso.
function extractRoomCode(raw) {
  const trimmed = raw.trim();
  if (trimmed.includes('room=')) {
    try {
      const url = new URL(trimmed, location.origin);
      const r = url.searchParams.get('room');
      if (r) return r;
    } catch {}
  }
  return trimmed;
}

$('joinBtn').addEventListener('click', () => {
  const code = extractRoomCode($('joinCode').value);
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
      let msg = '❌ Não consegui entrar. ';
      if (err?.type === 'peer-unavailable') msg += 'Essa sala não existe (ou já fechou) — confere o código com quem criou, ou pede pra criar de novo.';
      else if (err?.type === 'network' || err?.type === 'server-error' || err?.type === 'disconnected' || err?.type === 'socket-error' || err?.type === 'socket-closed') msg += 'Parece que a internet caiu no meio do caminho — confere sua conexão e tenta de novo.';
      else if (err?.message === 'full') msg += 'Essa sala já está cheia (máximo de 3 jogadores).';
      else msg += 'Confere o código ou pede pro seu amigo criar a sala de novo.';
      $('joinStatus').textContent = msg;
    }
  );
});

// Se a pessoa abriu um link de convite (?room=CODIGO), já deixa o código preenchido
const roomFromUrl = new URLSearchParams(location.search).get('room');
if (roomFromUrl) $('joinCode').value = roomFromUrl;

// --- Botões principais ---
function doStart() {
  unlockAudio();
  if (net.isOnline() && net.isHost()) startOnlineHostGame();
  else startGame();
}

$('start').addEventListener('click', doStart);
$('startFromHostPanel').addEventListener('click', doStart);
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
  renderLeaderboard();
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

$('mode').addEventListener('change', e => { state.mode = e.target.value; updateRoomSettingsPreview(); });
$('difficulty').addEventListener('change', e => { state.difficulty = e.target.value; updateRoomSettingsPreview(); });
$('speedSelect').addEventListener('change', updateRoomSettingsPreview);
$('mapSize').addEventListener('change', updateRoomSettingsPreview);
$('noWalls').addEventListener('change', updateRoomSettingsPreview);

// Mostra um resuminho das configurações escolhidas bem em cima do botão "Criar sala",
// pra ficar claro o que vai valer na sala antes de criar
function updateRoomSettingsPreview() {
  const get = (id) => $(id).selectedOptions[0]?.text || '';
  const parts = [get('mode'), get('speedSelect'), get('mapSize'), get('difficulty')];
  if ($('noWalls').checked) parts.push('🌀 Sem paredes');
  if ($('teamMode').checked) parts.push('🤝 Modo Times');
  $('roomSettingsPreview').textContent = '⚙️ Vai criar a sala com: ' + parts.join(' • ');
}

$('count').addEventListener('change', e => {
  state.count = +e.target.value;
  state.types = state.count === 3 ? ['human', 'human', 'human'] : ['human', 'cpu', 'cpu'];
  makePlayers();
});

$('players').addEventListener('change', e => {
  const i = +e.target.dataset.i;
  if (e.target.classList.contains('ptype')) state.types[i] = e.target.value;
  if (e.target.classList.contains('pcontrol')) state.controls[i] = e.target.value;
  if (e.target.classList.contains('pcolor')) { state.colors[i] = e.target.value; if (i === 0) persistProfile(); }
  if (e.target.classList.contains('phead')) { state.heads[i] = e.target.value; if (i === 0) persistProfile(); }
  if (e.target.classList.contains('ppattern')) { state.patterns[i] = e.target.value; if (i === 0) persistProfile(); }
  if (e.target.classList.contains('pteam')) state.teams[i] = +e.target.value;
  if (e.target.classList.contains('pshow')) state.show[i] = e.target.checked;
});

// Ligar/desligar o modo Times reconstrói os cards de jogador (mostra/esconde o seletor de time)
$('teamMode').addEventListener('change', () => { makePlayers(); updateRoomSettingsPreview(); });

$('players').addEventListener('input', e => {
  if (e.target.classList.contains('pname')) {
    const i = +e.target.dataset.i;
    state.names[i] = safe(e.target.value, `Jogador ${i + 1}`);
  }
});

$('myName').addEventListener('input', e => { state.names[0] = safe(e.target.value, 'Jhon'); persistProfile(); });

// Alterna entre joystick (bolinha) e D-pad (setas) no controle de toque do celular
function applyTouchControl() {
  const isDpad = state.touchControl === 'dpad';
  $('joystick').classList.toggle('hidden', isDpad);
  $('dpad').classList.toggle('hidden', !isDpad);
  $('touchControl').value = state.touchControl;
  $('touchControlToggle').textContent = isDpad ? '⬆️' : '🕹️';
  $('touchControlToggle').setAttribute('aria-label', isDpad ? 'Usando setas — toque pra trocar pro joystick' : 'Usando joystick — toque pra trocar pra setas');
}

$('touchControl').addEventListener('change', (e) => {
  state.touchControl = e.target.value;
  applyTouchControl();
  persistProfile();
});

// Mesmo botão de trocar controle, mas direto na tela do jogo — importante porque quem
// entra numa sala pelo link nunca vê o menu principal, então precisa poder trocar aqui
$('touchControlToggle').addEventListener('click', () => {
  state.touchControl = state.touchControl === 'dpad' ? 'joystick' : 'dpad';
  applyTouchControl();
  persistProfile();
});

function persistProfile() {
  saveProfile({ name: state.names[0], color: state.colors[0], head: state.heads[0], pattern: state.patterns[0], touchControl: state.touchControl });
}

// Botão de música ambiente (melhoria #13)
$('musicBtn').addEventListener('click', () => {
  unlockAudio();
  const on = toggleMusic();
  $('musicBtn').style.opacity = on ? '1' : '.5';
});

// Botão de mudo — a preferência fica salva no navegador
$('mute').addEventListener('click', () => {
  state.muted = !state.muted;
  setMuted(state.muted);
  saveMuted(state.muted);
  $('mute').textContent = state.muted ? '🔇' : '🔊';
});

// Modo compacto: esconde placar/missão/menus e deixa só a arena e os controles,
// pra jogar com a tela bem maior. Também tenta pedir tela cheia de verdade no navegador.
$('compactBtn').addEventListener('click', async () => {
  const on = $('game').classList.toggle('compact');
  $('compactBtn').classList.toggle('active', on);
  try {
    if (on && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    } else if (!on && document.fullscreenElement) {
      await document.exitFullscreen();
    }
  } catch {
    // Se o navegador bloquear a tela cheia de verdade, sem problema — o modo compacto
    // (esconder placar/menus) já funciona sozinho.
  }
  render();
  setTimeout(render, 250); // garante que o canvas recalcule o tamanho depois do layout assentar
});

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && $('game').classList.contains('compact')) {
    $('game').classList.remove('compact');
    $('compactBtn').classList.remove('active');
    render();
  }
});

// Compartilhar pontuação como imagem (melhoria #11)
$('shareScore').addEventListener('click', () => {
  shareScoreCard();
});

// Resetar configurações (nome, cor, cabeça, padrão, som) pro padrão de fábrica (melhoria #13)
$('resetSettings').addEventListener('click', () => {
  if (!confirm('Isso vai apagar seu nome, cor, formato de cabeça e preferência de som salvos, voltando tudo ao padrão. O recorde e o ranking NÃO são apagados. Continuar?')) return;
  resetSettings();
  state.names[0] = 'Jhon';
  state.colors[0] = COLORS[0];
  state.heads[0] = 'round';
  state.patterns[0] = 'solid';
  state.touchControl = 'joystick';
  $('touchControl').value = 'joystick';
  applyTouchControl();
  state.muted = false;
  setMuted(false);
  $('mute').textContent = '🔊';
  $('myName').value = 'Jhon';
  makePlayers();
});

state.best = loadBest();
state.muted = loadMuted();
setMuted(state.muted);
$('mute').textContent = state.muted ? '🔇' : '🔊';

// Nome/cor/cabeça que a pessoa escolheu da última vez (melhoria #18)
const profile = loadProfile();
if (profile.name) { state.names[0] = profile.name; $('myName').value = profile.name; }
if (profile.color) state.colors[0] = profile.color;
if (profile.head) state.heads[0] = profile.head;
if (profile.pattern) state.patterns[0] = profile.pattern;
if (profile.touchControl) { state.touchControl = profile.touchControl; $('touchControl').value = profile.touchControl; }
applyTouchControl();

setupInput();
setupTutorial();
makePlayers();
render();
renderLeaderboard();
updateRoomSettingsPreview();
maybeShowTutorial();

// Deixa o jogo instalável como app e funcionando offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    // Confere se já tem uma versão nova esperando (ex: a pessoa abriu o jogo de novo
    // depois de eu ter publicado uma atualização)
    if (reg.waiting) showUpdateBanner(reg);

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(reg);
        }
      });
    });
  }).catch(() => {});
}

function showUpdateBanner(reg) {
  $('updateBanner').classList.remove('hidden');
  $('updateBannerBtn').onclick = () => {
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    location.reload();
  };
}
