// Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial.
// Este é o único arquivo carregado pelo index.html — ele importa todo o resto.

import { $, safe, setVibrationEnabled, setTapVibrationEnabled, announce, vibrate } from './utils.js';
import { VERSION, COLORS, ZOOM_LEVELS, REACTIONS } from './config.js';
import { state } from './state.js';
import { makePlayers, label } from './players.js';
import { startGame, startOnlineHostGame, startClientGame, applyRemoteState, tryBoost, updateGamesPlayedBadge, switchScreen } from './loop.js';
import { render } from './render.js';
import { setupInput, setDir } from './input.js';
import { unlockAudio, setMuted, toggleMusic, setSfxVolume, setMusicVolume } from './sound.js';
import { loadBest, loadMuted, saveMuted, loadProfile, saveProfile, resetSettings, loadVibration, saveVibration, loadGamesPlayed } from './storage.js';
import { maybeShowTutorial, setupTutorial } from './tutorial.js';
import { shareScoreCard } from './share.js';
import { renderLeaderboard, toggleLeaderboard } from './leaderboard.js';
import * as net from './net.js';

// --- Multiplayer online (criar/entrar em sala) ---
net.setHandlers({
  onPeerJoined: () => {
    state.count = Math.min(6, 1 + net.connectedCount());
    $('roomStatus').textContent = `👥 ${net.connectedCount()} amigo(s) conectado(s). Pode clicar em "Jogar" quando quiser!`;
    makePlayers();
  },
  onPeerLeft: () => {
    state.count = Math.min(6, 1 + net.connectedCount());
    $('roomStatus').textContent = `👥 ${net.connectedCount()} amigo(s) conectado(s).`;
    makePlayers();
  },
  onStateUpdate: (msg) => applyRemoteState(msg),
  // Aplica de verdade a direção/turbo que o amigo manda — sem isso a minhoca dele
  // nunca virava, só seguia reto na direção que nasceu (bug relatado)
  onInput: (slot, msg) => {
    if (msg.type === 'dir') setDir(slot, msg.dir);
    else if (msg.type === 'boost') tryBoost(slot);
    else if (msg.type === 'reaction') {
      showReaction(msg.emoji);
      net.broadcastRaw({ type: 'reaction', emoji: msg.emoji, from: slot }); // repassa pra todo mundo
    } else if (msg.type === 'chat') {
      appendChatMessage(slot, msg.text);
      net.broadcastRaw({ type: 'chat', text: msg.text, from: slot }); // repassa pra todo mundo
    }
  },
  onReaction: (emoji) => showReaction(emoji),
  onChat: (text, from) => appendChatMessage(from, text),
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

// Copia só o código da sala (sem o link inteiro), pra quem prefere mandar assim
$('copyRoomCode').addEventListener('click', async () => {
  const code = $('roomCode').textContent;
  try {
    await navigator.clipboard.writeText(code);
    $('copyRoomCode').textContent = 'Copiado! ✅';
    setTimeout(() => $('copyRoomCode').textContent = 'Copiar só o código', 1500);
  } catch { alert(code); }
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
      document.querySelector('.siteHeader').classList.add('hidden');
      startClientGame();
    },
    (err) => {
      $('joinBtn').disabled = false;
      let msg = '❌ Não consegui entrar. ';
      if (err?.type === 'peer-unavailable') msg += 'Essa sala não existe (ou já fechou) — confere o código com quem criou, ou pede pra criar de novo.';
      else if (err?.type === 'network' || err?.type === 'server-error' || err?.type === 'disconnected' || err?.type === 'socket-error' || err?.type === 'socket-closed') msg += 'Parece que a internet caiu no meio do caminho — confere sua conexão e tenta de novo.';
      else if (err?.message === 'full') msg += 'Essa sala já está cheia (máximo de 6 jogadores).';
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
  requestWakeLock();
  saveQuickRepeat();
  document.querySelector('.siteHeader').classList.add('hidden');
  maybeSuggestLandscape();
  if (net.isOnline() && net.isHost()) startOnlineHostGame();
  else startGame();
}

// Mostra uma reação rápida (emoji) na tela, e a fileira de reações só aparece no online
function showReaction(emoji) {
  state.reactionToast = { emoji, until: Date.now() + 1500 };
}

// Ícone da aba mostrando a pontuação ao vivo — só redesenha quando o número muda
let lastFaviconScore = null;
const faviconCanvas = document.createElement('canvas');
faviconCanvas.width = 64; faviconCanvas.height = 64;
const faviconCtx = faviconCanvas.getContext('2d');
function updateScoreFavicon(score) {
  if (score === lastFaviconScore) return;
  lastFaviconScore = score;
  faviconCtx.clearRect(0, 0, 64, 64);
  faviconCtx.fillStyle = '#0b1220';
  faviconCtx.beginPath();
  faviconCtx.roundRect(2, 2, 60, 60, 16);
  faviconCtx.fill();
  faviconCtx.strokeStyle = '#67ef8a';
  faviconCtx.lineWidth = 4;
  faviconCtx.stroke();
  faviconCtx.fillStyle = '#67ef8a';
  faviconCtx.font = 'bold 34px system-ui, sans-serif';
  faviconCtx.textAlign = 'center';
  faviconCtx.textBaseline = 'middle';
  faviconCtx.fillText(String(score).slice(0, 4), 32, 34);
  $('faviconLink').href = faviconCanvas.toDataURL('image/png');
}
function resetFavicon() {
  lastFaviconScore = null;
  $('faviconLink').href = 'icon.svg';
}

// Pop-up animado de conquista — aparece por 2.5s e some sozinho
document.addEventListener('achievementUnlocked', (e) => {
  $('achievementSub').textContent = `🎮 ${e.detail.n} partidas jogadas neste aparelho`;
  $('achievementPopup').classList.remove('hidden');
  requestAnimationFrame(() => $('achievementPopup').classList.add('show'));
  vibrate([30, 60, 30, 60, 60]);
  clearTimeout(achievementHideTimer);
  achievementHideTimer = setTimeout(() => {
    $('achievementPopup').classList.remove('show');
    setTimeout(() => $('achievementPopup').classList.add('hidden'), 350);
  }, 2500);
});
let achievementHideTimer = null;

// Fim do Modo Torneio: mostra o campeão e o placar de cada rodada, reaproveitando o
// overlay que já existia na tela (endTitle/endText/continueBtn) sem uso nenhum até agora
document.addEventListener('tournamentOver', (e) => {
  const { champion, wins } = e.detail;
  $('endTitle').textContent = '🏆 Torneio Finalizado!';
  const placar = wins.map((w, i) => `${i === champion ? '👑 ' : ''}${label(i)}: ${w} rodada${w === 1 ? '' : 's'}`).join(' • ');
  $('endText').textContent = `${label(champion)} venceu o torneio! ${placar}`;
  $('overlay').classList.remove('hidden');
  $('continueBtn').onclick = () => {
    $('overlay').classList.add('hidden');
    $('back').click();
  };
});

// Confere a pontuação a cada meio segundo e atualiza o ícone da aba — não precisa ser
// em todo quadro, só rápido o bastante pra sentir que tá "ao vivo"
setInterval(() => {
  if (state.running) updateScoreFavicon(state.scores[net.mySlot] || 0);
}, 500);

document.querySelector('.reactionRow')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.reactionBtn');
  if (!btn) return;
  const emoji = btn.dataset.emoji;
  showReaction(emoji); // mostra pra mim mesmo na hora
  if (net.isOnline()) {
    if (net.isHost()) net.broadcastRaw({ type: 'reaction', emoji, from: net.mySlot });
    else net.sendInput({ type: 'reaction', emoji });
  }
});

// Chat de texto simples — mostra as últimas mensagens numa caixinha, mantém só as 20 mais recentes
function escapeChatText(s) {
  return String(s || '').trim().replace(/[<>]/g, '').slice(0, 80);
}
function appendChatMessage(from, text) {
  const log = $('chatLog');
  const div = document.createElement('div');
  div.className = 'chatMsg';
  div.innerHTML = `<b>${label(from)}:</b> ${escapeChatText(text)}`;
  log.appendChild(div);
  while (log.children.length > 20) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
}

function sendChatMessage() {
  const input = $('chatInput');
  const text = escapeChatText(input.value);
  if (!text) return;
  input.value = '';
  appendChatMessage(net.mySlot, text); // mostra pra mim mesmo na hora
  if (net.isOnline()) {
    if (net.isHost()) net.broadcastRaw({ type: 'chat', text, from: net.mySlot });
    else net.sendInput({ type: 'chat', text });
  }
}
$('chatSendBtn').addEventListener('click', sendChatMessage);
$('chatInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChatMessage();
});

// Não deixa a tela do celular apagar sozinha enquanto tá jogando
let wakeLock = null;
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch {
    // Alguns navegadores recusam (ex: aba em segundo plano) — sem problema, ignora
  }
}
function releaseWakeLock() {
  try { wakeLock?.release(); } catch {}
  wakeLock = null;
}
// Se a tela travar sozinha e a pessoa voltar pro app, tenta pedir de novo
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.running && !wakeLock) requestWakeLock();
});

$('start').addEventListener('click', doStart);
$('startHero').addEventListener('click', doStart);
$('startFromHostPanel').addEventListener('click', doStart);
$('restart').addEventListener('click', () => {
  requestWakeLock();
  if (net.isOnline() && net.isHost()) startOnlineHostGame();
  else startGame();
});
$('pause').addEventListener('click', () => state.paused = !state.paused);

$('back').addEventListener('click', () => {
  // Só pergunta se a partida ainda tá rolando de verdade — se já morreu ou o torneio
  // acabou, sair direto é o esperado, sem precisar confirmar nada
  if (state.running && !confirm('Tem certeza que quer sair da partida? O progresso dessa rodada não é salvo.')) return;
  state.running = false;
  clearInterval(state.timer);
  net.disconnect();
  releaseWakeLock();
  $('count').disabled = false;
  $('hostPanel').classList.add('hidden');
  $('hostBtn').disabled = false;
  $('joinBtn').disabled = false;
  switchScreen('game', 'menu');
  document.querySelector('.siteHeader').classList.remove('hidden');
  renderLeaderboard();
  updateTopRecordDisplay();
  applyQuickRepeat();
  resetFavicon();
  if (pendingUpdateReg) { showUpdateBanner(pendingUpdateReg); pendingUpdateReg = null; }
  render();
});

function shareLink() {
  const url = location.href.split('?')[0];
  navigator.share
    ? navigator.share({ title: 'Snake Arena', text: 'Vem jogar Snake Arena comigo!', url }).catch(() => {})
    : navigator.clipboard.writeText(url).then(() => alert('Link copiado!')).catch(() => {});
}
$('share').addEventListener('click', shareLink);
$('shareHero').addEventListener('click', shareLink);

// Mostra o recorde pessoal em destaque logo no topo do menu (fácil de ver sem rolar a tela)
function updateTopRecordDisplay() {
  $('topRecordDisplay').innerHTML = `🏅 Seu recorde: <b>${state.best || 0}</b> pontos`;
}

// Abas do menu (Jogar / Personalizar / Online / Ranking) — deixa a tela inicial mais limpa
document.querySelector('.tabBar')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.tabBtn');
  if (!btn) return;
  document.querySelectorAll('.tabBtn').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');
  const tab = btn.dataset.tab;
  document.querySelectorAll('.tabPanel').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== tab));
});

$('refresh').addEventListener('click', () => {
  location.href = location.pathname + '?v=' + VERSION + '&t=' + Date.now();
});

$('mode').addEventListener('change', e => { state.mode = e.target.value; updateRoomSettingsPreview(); });
$('difficulty').addEventListener('change', e => { state.difficulty = e.target.value; updateRoomSettingsPreview(); });
$('speedSelect').addEventListener('change', updateRoomSettingsPreview);
$('mapSize').addEventListener('change', updateRoomSettingsPreview);
$('zoomLevel').addEventListener('change', (e) => {
  state.zoom = e.target.value;
  persistZoom();
});
$('noWalls').addEventListener('change', updateRoomSettingsPreview);
$('boardTheme').addEventListener('change', e => state.theme = e.target.value);
$('vibrationOn').addEventListener('change', e => {
  state.vibrationOn = e.target.checked;
  setVibrationEnabled(state.vibrationOn);
  saveVibration(state.vibrationOn);
});

// Mostra um resuminho das configurações escolhidas bem em cima do botão "Criar sala",
// pra ficar claro o que vai valer na sala antes de criar
function updateRoomSettingsPreview() {
  const get = (id) => $(id).selectedOptions[0]?.text || '';
  const parts = [get('mode'), get('speedSelect'), get('mapSize'), get('difficulty')];
  if ($('noWalls').checked) parts.push('🌀 Sem paredes');
  if ($('teamMode').checked) parts.push('🤝 Modo Times');
  if ($('tournamentMode').checked) parts.push('🏆 Modo Torneio');
  $('roomSettingsPreview').textContent = '⚙️ Vai criar a sala com: ' + parts.join(' • ');
}

$('count').addEventListener('change', e => {
  state.count = +e.target.value;
  if (!state.types[0]) state.types[0] = 'human'; // sempre garante que você seja humano
  makePlayers();
});

$('players').addEventListener('change', e => {
  const i = +e.target.dataset.i;
  if (e.target.classList.contains('ptype')) state.types[i] = e.target.value;
  if (e.target.classList.contains('pcontrol')) { state.controls[i] = e.target.value; makePlayers(); }
  if (e.target.classList.contains('pcolor')) { state.colors[i] = e.target.value; if (i === 0) persistProfile(); }
  if (e.target.classList.contains('phead')) { state.heads[i] = e.target.value; if (i === 0) persistProfile(); }
  if (e.target.classList.contains('ppattern')) { state.patterns[i] = e.target.value; if (i === 0) persistProfile(); }
  if (e.target.classList.contains('ppalette')) { state.palettes[i] = e.target.value; if (i === 0) persistProfile(); }
  if (e.target.classList.contains('pteam')) state.teams[i] = +e.target.value;
  if (e.target.classList.contains('pshow')) state.show[i] = e.target.checked;
});

// Ligar/desligar o modo Times reconstrói os cards de jogador (mostra/esconde o seletor de time)
$('teamMode').addEventListener('change', () => { makePlayers(); updateRoomSettingsPreview(); });
$('tournamentMode').addEventListener('change', updateRoomSettingsPreview);

// Botões de gravar tecla personalizada: clica, aperta a tecla que quiser, pronto
$('players').addEventListener('click', (e) => {
  const btn = e.target.closest('.bindKey');
  if (!btn) return;
  const i = +btn.dataset.i, dir = btn.dataset.dir;
  document.querySelectorAll('.bindKey.listening').forEach(b => b.classList.remove('listening'));
  btn.classList.add('listening');
  const original = btn.textContent;
  btn.textContent = '⌨️ ...';

  function captureKey(ev) {
    ev.preventDefault();
    if (!state.customKeys[i]) state.customKeys[i] = {};
    state.customKeys[i][dir] = ev.code;
    document.removeEventListener('keydown', captureKey, true);
    btn.classList.remove('listening');
    if (i === 0) persistProfile();
    makePlayers();
  }
  document.addEventListener('keydown', captureKey, true);
});

// Volume dos efeitos sonoros e da música, cada um com seu próprio controle
$('sfxVolume').addEventListener('input', (e) => {
  const v = +e.target.value / 100;
  setSfxVolume(v);
  saveVolumes(v, +$('musicVolume').value / 100);
});
$('musicVolume').addEventListener('input', (e) => {
  const v = +e.target.value / 100;
  setMusicVolume(v);
  saveVolumes(+$('sfxVolume').value / 100, v);
});
function saveVolumes(sfx, music) {
  try { localStorage.setItem('snakeArenaVolumes', JSON.stringify({ sfx, music })); } catch {}
}
function loadVolumes() {
  try { return JSON.parse(localStorage.getItem('snakeArenaVolumes')) || {}; } catch { return {}; }
}

$('players').addEventListener('input', e => {
  if (e.target.classList.contains('pname')) {
    const i = +e.target.dataset.i;
    state.names[i] = safe(e.target.value, `Jogador ${i + 1}`);
  }
});

$('myName').addEventListener('input', e => { state.names[0] = safe(e.target.value, 'Jhon'); persistProfile(); });

// Alterna entre joystick (bolinha), D-pad (setas) e arrastar o dedo (swipe) no celular
const TOUCH_MODES = ['joystick', 'dpad', 'swipe'];
const TOUCH_ICONS = { joystick: '🕹️', dpad: '⬆️', swipe: '👆' };
const TOUCH_LABELS = { joystick: 'joystick', dpad: 'setas', swipe: 'arrastar o dedo' };

function applyTouchControl() {
  const mode = state.touchControl;
  $('joystick').classList.toggle('hidden', mode !== 'joystick');
  $('dpad').classList.toggle('hidden', mode !== 'dpad');
  $('stickText').classList.toggle('hidden', mode === 'dpad');
  $('stickText').textContent = mode === 'swipe' ? 'Arraste na tela pra virar' : 'Arraste para virar';
  $('touchControl').value = mode;
  $('touchControlToggle').textContent = TOUCH_ICONS[mode] || '🕹️';
  $('touchControlToggle').setAttribute('aria-label', `Usando ${TOUCH_LABELS[mode]} — toque pra trocar`);
}

$('touchControl').addEventListener('change', (e) => {
  state.touchControl = e.target.value;
  applyTouchControl();
  persistProfile();
});

// Tamanho dos controles de toque (ajustável) — salva a preferência
$('controlSize').addEventListener('input', (e) => {
  state.controlSize = +e.target.value;
  document.documentElement.style.setProperty('--ctrl-scale', state.controlSize / 100);
  persistComfortSettings();
});

// Inverter o lado dos controles (bom pra quem é canhoto)
$('controlsSwapped').addEventListener('change', (e) => {
  state.controlsSwapped = e.target.checked;
  $('touch').classList.toggle('swapped', state.controlsSwapped);
  persistComfortSettings();
});

// Vibração ao tocar nos botões (feedback tátil), separada da vibração de eventos do jogo
$('tapVibration').addEventListener('change', (e) => {
  state.tapVibration = e.target.checked;
  setTapVibrationEnabled(state.tapVibration);
  persistComfortSettings();
});

// Modo texto grande — interface mais simples, botões e letras maiores
$('bigTextMode').addEventListener('change', (e) => {
  state.bigTextMode = e.target.checked;
  document.querySelector('.app').classList.toggle('bigText', state.bigTextMode);
  persistComfortSettings();
});

$('lightMode').addEventListener('change', (e) => {
  state.lightMode = e.target.checked;
  document.querySelector('.app').classList.toggle('lightMode', state.lightMode);
  persistComfortSettings();
});

function persistComfortSettings() {
  try {
    localStorage.setItem('snakeArenaComfort', JSON.stringify({
      controlSize: state.controlSize,
      controlsSwapped: state.controlsSwapped,
      tapVibration: state.tapVibration,
      bigTextMode: state.bigTextMode,
      lightMode: state.lightMode,
    }));
  } catch {}
}

function applyComfortSettings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('snakeArenaComfort')) || {}; } catch {}
  if (typeof saved.controlSize === 'number') state.controlSize = saved.controlSize;
  if (typeof saved.controlsSwapped === 'boolean') state.controlsSwapped = saved.controlsSwapped;
  if (typeof saved.tapVibration === 'boolean') state.tapVibration = saved.tapVibration;
  if (typeof saved.bigTextMode === 'boolean') state.bigTextMode = saved.bigTextMode;
  if (typeof saved.lightMode === 'boolean') state.lightMode = saved.lightMode;

  $('controlSize').value = state.controlSize;
  document.documentElement.style.setProperty('--ctrl-scale', state.controlSize / 100);
  $('controlsSwapped').checked = state.controlsSwapped;
  $('touch').classList.toggle('swapped', state.controlsSwapped);
  $('tapVibration').checked = state.tapVibration;
  setTapVibrationEnabled(state.tapVibration);
  $('bigTextMode').checked = state.bigTextMode;
  document.querySelector('.app').classList.toggle('bigText', state.bigTextMode);
  $('lightMode').checked = state.lightMode;
  document.querySelector('.app').classList.toggle('lightMode', state.lightMode);
}

// Convidar pelo WhatsApp — já abre com o link da sala preenchido, sem precisar copiar/colar
$('whatsappInvite').addEventListener('click', () => {
  const link = location.origin + location.pathname + '?room=' + $('roomCode').textContent;
  const texto = encodeURIComponent(`Vem jogar Snake Arena comigo! 🐍 ${link}`);
  window.open(`https://wa.me/?text=${texto}`, '_blank');
});

// Compartilhamento nativo da sala — abre o menu de compartilhar do próprio celular
// (Telegram, SMS, e-mail, Instagram, o que a pessoa tiver instalado), não só WhatsApp
$('nativeShareRoom').addEventListener('click', async () => {
  const link = location.origin + location.pathname + '?room=' + $('roomCode').textContent;
  const texto = 'Vem jogar Snake Arena comigo! 🐍';
  if (navigator.share) {
    try { await navigator.share({ title: 'Snake Arena', text: texto, url: link }); }
    catch {} // pessoa cancelou o compartilhamento — sem problema
  } else {
    try {
      await navigator.clipboard.writeText(`${texto} ${link}`);
      $('nativeShareRoom').textContent = 'Copiado! ✅';
      setTimeout(() => $('nativeShareRoom').textContent = '📤 Outras formas de compartilhar', 1500);
    } catch { alert(link); }
  }
});

// Mesmo botão de trocar controle, mas direto na tela do jogo — importante porque quem
// entra numa sala pelo link nunca vê o menu principal, então precisa poder trocar aqui
$('touchControlToggle').addEventListener('click', () => {
  const idx = TOUCH_MODES.indexOf(state.touchControl);
  state.touchControl = TOUCH_MODES[(idx + 1) % TOUCH_MODES.length];
  applyTouchControl();
  persistProfile();
});

// Botão de trocar o zoom da câmera direto na tela do jogo — cada jogador ajusta o seu
// (não depende do anfitrião, funciona igual pra quem entrou numa sala pelo link também)
const ZOOM_VALUES = ZOOM_LEVELS.map(z => z.value);
function applyZoomButton() {
  const z = ZOOM_LEVELS.find(z => z.value === state.zoom) || ZOOM_LEVELS[1];
  $('zoomToggle').textContent = z.value === 'close' ? '🔍' : z.value === 'far' ? '🌍' : '🔎';
  $('zoomToggle').setAttribute('aria-label', `Câmera: ${z.label.replace('🔍 ', '').replace('🔎 ', '').replace('🌍 ', '')} — toque pra trocar`);
  $('zoomLevel').value = state.zoom;
}
function persistZoom() {
  try { localStorage.setItem('snakeArenaZoom', state.zoom); } catch {}
  applyZoomButton();
}
$('zoomToggle').addEventListener('click', () => {
  const idx = ZOOM_VALUES.indexOf(state.zoom);
  state.zoom = ZOOM_VALUES[(idx + 1) % ZOOM_VALUES.length];
  persistZoom();
});

function persistProfile() {
  saveProfile({ name: state.names[0], color: state.colors[0], head: state.heads[0], pattern: state.patterns[0], palette: state.palettes[0], touchControl: state.touchControl });
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
// Modo compacto (esconde placar/menus) é separado de pedir tela cheia de verdade —
// a tela cheia de verdade faz o navegador mostrar um aviso ("toque ESC pra sair" ou
// parecido) bem em cima dos controles em alguns celulares, atrapalhando o toque.
// Por isso só pedimos tela cheia quando a pessoa clica no botão de propósito — o modo
// automático (primeira vez no celular) usa só o modo compacto, sem esse aviso.
async function toggleCompactMode(requestFullscreenToo) {
  const on = $('game').classList.toggle('compact');
  $('compactBtn').classList.toggle('active', on);
  if (requestFullscreenToo) {
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
  }
  render();
  setTimeout(render, 250); // garante que o canvas recalcule o tamanho depois do layout assentar
  return on;
}

$('compactBtn').addEventListener('click', () => toggleCompactMode(true));

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
  if (!confirm('Isso vai apagar seu nome, cor, formato de cabeça, controle de toque, vibração e preferência de som salvos, voltando tudo ao padrão. O recorde e o ranking NÃO são apagados. Continuar?')) return;
  resetSettings();
  state.names[0] = 'Jhon';
  state.colors[0] = COLORS[0];
  state.heads[0] = 'round';
  state.patterns[0] = 'solid';
  state.palettes[0] = 'auto';
  state.customKeys[0] = {};
  state.zoom = 'normal';
  localStorage.removeItem('snakeArenaZoom');
  applyZoomButton();
  setSfxVolume(1); setMusicVolume(0.6);
  $('sfxVolume').value = 100; $('musicVolume').value = 60;
  localStorage.removeItem('snakeArenaVolumes');
  state.touchControl = 'joystick';
  $('touchControl').value = 'joystick';
  applyTouchControl();
  state.muted = false;
  setMuted(false);
  $('mute').textContent = '🔊';
  state.vibrationOn = true;
  setVibrationEnabled(true);
  saveVibration(true);
  $('vibrationOn').checked = true;
  $('myName').value = 'Jhon';
  makePlayers();
});

state.best = loadBest();
state.muted = loadMuted();
setMuted(state.muted);
$('mute').textContent = state.muted ? '🔇' : '🔊';

state.vibrationOn = loadVibration();
setVibrationEnabled(state.vibrationOn);
$('vibrationOn').checked = state.vibrationOn;

// Safari no iPhone não suporta a API de vibração — em vez de deixar a pessoa achar que
// tá ligado mas não sentir nada, avisamos e desativamos o controle
if (!navigator.vibrate) {
  $('vibrationOn').disabled = true;
  $('vibrationOn').checked = false;
  const vibeLabel = $('vibrationOn').closest('label');
  if (vibeLabel) vibeLabel.title = 'Seu navegador (comum no iPhone/Safari) não suporta vibração — por isso essa opção está desativada.';
  const note = document.createElement('div');
  note.className = 'muted';
  note.style.fontSize = '.72rem';
  note.style.marginTop = '-4px';
  note.textContent = '📳 Vibração não é suportada neste navegador (comum no iPhone).';
  $('vibrationOn').closest('label')?.after(note);
  $('tapVibration').disabled = true;
  $('tapVibration').checked = false;
}

updateGamesPlayedBadge(loadGamesPlayed());

try {
  const savedZoom = localStorage.getItem('snakeArenaZoom');
  if (savedZoom) state.zoom = savedZoom;
} catch {}
applyZoomButton();

const savedVolumes = loadVolumes();
if (typeof savedVolumes.sfx === 'number') { $('sfxVolume').value = Math.round(savedVolumes.sfx * 100); setSfxVolume(savedVolumes.sfx); }
if (typeof savedVolumes.music === 'number') { $('musicVolume').value = Math.round(savedVolumes.music * 100); setMusicVolume(savedVolumes.music); }

// Nome/cor/cabeça que a pessoa escolheu da última vez (melhoria #18)
const profile = loadProfile();
if (profile.name) { state.names[0] = profile.name; $('myName').value = profile.name; }
if (profile.color) state.colors[0] = profile.color;
if (profile.head) state.heads[0] = profile.head;
if (profile.pattern) state.patterns[0] = profile.pattern;
if (profile.palette) state.palettes[0] = profile.palette;
if (profile.touchControl) { state.touchControl = profile.touchControl; $('touchControl').value = profile.touchControl; }
applyTouchControl();
applyComfortSettings();

setupInput();

// Atalhos de teclado extras pro PC — pausar (P) já existia; esses são novos.
// Só funcionam durante o jogo, e nunca quando a pessoa tá digitando em algum campo
// (nome, tecla personalizada etc), pra não atrapalhar quem tá escrevendo.
document.addEventListener('keydown', (e) => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (typing || $('game').classList.contains('hidden')) return;
  if (e.code === 'KeyR') { e.preventDefault(); $('restart').click(); }
  else if (e.code === 'KeyM') { e.preventDefault(); $('mute').click(); }
  else if (e.code === 'KeyZ') { e.preventDefault(); $('zoomToggle').click(); }
  else if (e.code === 'KeyC') { e.preventDefault(); $('compactBtn').click(); }
});

setupTutorial();
makePlayers();
$('leaderboardToggle').addEventListener('click', toggleLeaderboard);
render();
renderLeaderboard();
updateTopRecordDisplay();
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

let pendingUpdateReg = null;
function showUpdateBanner(reg) {
  // Se tiver uma partida rolando, não interrompe na hora — espera a pessoa voltar pro
  // menu (isso evita aquela tela aparecendo do nada no meio do jogo, atrapalhando)
  if (state.running) {
    pendingUpdateReg = reg;
    return;
  }
  $('updateBanner').classList.remove('hidden');
  $('updateBannerBtn').onclick = () => {
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    location.reload();
  };
}

// No celular, ativa o modo maximizado (⛶) sozinho na primeira partida — a maioria nem
// sabia que esse botão existia, então isso já entrega a melhor experiência de cara.
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
if (isTouchDevice && !localStorage.getItem('snakeArenaAutoCompactSeen')) {
  const autoCompactOnce = () => {
    setTimeout(() => {
      if (!$('game').classList.contains('hidden') && !$('game').classList.contains('compact')) {
        toggleCompactMode(false); // sem tela cheia de verdade — só esconde placar/menus
        announce('Modo compacto ativado automaticamente. Toque no botão de expandir pra desativar.');
      }
    }, 400);
    localStorage.setItem('snakeArenaAutoCompactSeen', '1');
    $('start').removeEventListener('click', autoCompactOnce);
    $('startHero').removeEventListener('click', autoCompactOnce);
  };
  $('start').addEventListener('click', autoCompactOnce);
  $('startHero').addEventListener('click', autoCompactOnce);
}

// "Jogar com [nome] de novo" — lembra a última configuração usada com 2+ jogadores no
// mesmo aparelho, pra não precisar escolher tudo de novo toda vez
function saveQuickRepeat() {
  const count = +$('count').value;
  if (count < 2 || net.isOnline()) return; // só faz sentido no local, com companhia
  try {
    localStorage.setItem('snakeArenaQuickRepeat', JSON.stringify({
      count,
      mateName: state.names[1] || 'Jogador 2',
      mode: $('mode').value, speed: $('speedSelect').value, mapSize: $('mapSize').value,
      difficulty: $('difficulty').value, noWalls: $('noWalls').checked, teamMode: $('teamMode').checked,
    }));
  } catch {}
}

function loadQuickRepeat() {
  try { return JSON.parse(localStorage.getItem('snakeArenaQuickRepeat')); } catch { return null; }
}

function applyQuickRepeat() {
  const qr = loadQuickRepeat();
  const btn = $('quickRepeatBtn');
  if (!qr) { btn.classList.add('hidden'); return; }
  btn.textContent = `🔄 Jogar com ${qr.mateName} de novo`;
  btn.classList.remove('hidden');
  btn.onclick = () => {
    $('count').value = String(qr.count);
    $('count').dispatchEvent(new Event('change', { bubbles: true }));
    state.names[1] = qr.mateName;
    $('mode').value = qr.mode; state.mode = qr.mode;
    $('speedSelect').value = qr.speed;
    $('mapSize').value = qr.mapSize;
    $('difficulty').value = qr.difficulty; state.difficulty = qr.difficulty;
    $('noWalls').checked = qr.noWalls;
    $('teamMode').checked = qr.teamMode;
    makePlayers();
    updateRoomSettingsPreview();
    doStart();
  };
}
applyQuickRepeat();

// Efeito de "ondinha" ao tocar nos botões — confirma visualmente que o toque registrou
document.addEventListener('pointerdown', (e) => {
  const btn = e.target.closest('.btn,.iconBtn,.refresh,.tabBtn,.reactionBtn,.bindKey');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'rippleEffect';
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);
});

// Copiar estatísticas (recorde + partidas jogadas) num texto simples
$('copyStatsBtn').addEventListener('click', async () => {
  const games = loadGamesPlayed();
  const best = loadBest();
  const text = `🐍 Snake Arena - Minhas estatísticas\n🏅 Recorde: ${best} pontos\n🎮 Partidas jogadas: ${games}`;
  try {
    await navigator.clipboard.writeText(text);
    $('copyStatsBtn').textContent = 'Copiado! ✅';
    setTimeout(() => $('copyStatsBtn').textContent = '📋 Copiar minhas estatísticas', 1500);
  } catch { alert(text); }
});

// Código de configuração — junta as opções escolhidas num texto curto pra compartilhar,
// pra outra pessoa já abrir com tudo igual sem precisar escolher de novo
function buildConfigCode() {
  const cfg = {
    mode: $('mode').value, speed: $('speedSelect').value, mapSize: $('mapSize').value,
    difficulty: $('difficulty').value, noWalls: $('noWalls').checked,
    teamMode: $('teamMode').checked, tournamentMode: $('tournamentMode').checked,
    zoom: $('zoomLevel').value, theme: $('boardTheme').value,
  };
  return btoa(encodeURIComponent(JSON.stringify(cfg)));
}
$('copyConfigCodeBtn').addEventListener('click', async () => {
  const code = buildConfigCode();
  try {
    await navigator.clipboard.writeText(code);
    $('copyConfigCodeBtn').textContent = 'Copiado! ✅';
    setTimeout(() => $('copyConfigCodeBtn').textContent = '🔤 Copiar código de configuração', 1500);
  } catch { alert(code); }
});
$('applyConfigCodeBtn').addEventListener('click', () => {
  try {
    const cfg = JSON.parse(decodeURIComponent(atob($('pasteConfigCode').value.trim())));
    if (cfg.mode) { $('mode').value = cfg.mode; state.mode = cfg.mode; }
    if (cfg.speed) $('speedSelect').value = cfg.speed;
    if (cfg.mapSize) $('mapSize').value = cfg.mapSize;
    if (cfg.difficulty) { $('difficulty').value = cfg.difficulty; state.difficulty = cfg.difficulty; }
    if (typeof cfg.noWalls === 'boolean') $('noWalls').checked = cfg.noWalls;
    if (typeof cfg.teamMode === 'boolean') { $('teamMode').checked = cfg.teamMode; makePlayers(); }
    if (typeof cfg.tournamentMode === 'boolean') $('tournamentMode').checked = cfg.tournamentMode;
    if (cfg.zoom) { $('zoomLevel').value = cfg.zoom; state.zoom = cfg.zoom; persistZoom(); }
    if (cfg.theme) { $('boardTheme').value = cfg.theme; state.theme = cfg.theme; }
    updateRoomSettingsPreview();
    $('configCodeStatus').textContent = '✅ Configurações aplicadas!';
    setTimeout(() => $('configCodeStatus').textContent = '', 2500);
  } catch {
    $('configCodeStatus').textContent = '❌ Código inválido — confere se copiou certinho.';
  }
});

// Instruções de instalar como app — diferentes pra iPhone, Android e computador
$('installHelpBtn').addEventListener('click', () => {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  let html;
  if (isIOS) {
    html = `<p>No iPhone/iPad, pelo Safari:</p>
      <p>1. Toque no ícone de <b>Compartilhar</b> (quadrado com seta pra cima), na barra de baixo.</p>
      <p>2. Role a lista e toque em <b>"Adicionar à Tela de Início"</b>.</p>
      <p>3. Toque em <b>"Adicionar"</b> no canto superior direito.</p>
      <p>Pronto! O ícone do jogo aparece na tela inicial, como um app de verdade. 🐍</p>`;
  } else if (isAndroid) {
    html = `<p>No Android, pelo Chrome:</p>
      <p>1. Toque nos <b>3 pontinhos</b> no canto superior direito.</p>
      <p>2. Toque em <b>"Instalar app"</b> ou <b>"Adicionar à tela inicial"</b>.</p>
      <p>3. Confirme tocando em <b>"Instalar"</b>.</p>
      <p>Pronto! O jogo abre igual um app instalado, com ícone próprio. 🐍</p>`;
  } else {
    html = `<p>No computador, pelo Chrome/Edge:</p>
      <p>1. Procure o ícone de <b>instalar</b> (uma tela com uma setinha) na barra de endereço.</p>
      <p>2. Clique nele e depois em <b>"Instalar"</b>.</p>
      <p>No celular, os passos são diferentes — abra essa página direto do seu celular pra ver as instruções certas pra ele.</p>`;
  }
  $('installHelpText').innerHTML = html;
  $('installHelpOverlay').classList.remove('hidden');
});
$('installHelpCloseBtn').addEventListener('click', () => $('installHelpOverlay').classList.add('hidden'));

// Print de tela de verdade — baixa a imagem exata do que tá na arena agora, diferente
// do cartão de pontuação estilizado (que já existe no botão 📸)
$('screenshotBtn').addEventListener('click', () => {
  try {
    const url = $('arenaCanvas').toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `snake-arena-print-${Date.now()}.png`;
    a.click();
  } catch {
    alert('Não consegui gerar o print — tenta de novo.');
  }
});

// Modo sem distração — liga o modo compacto (sem forçar tela cheia de verdade) e mantém
// a tela acordada, tudo num toque só
let focusModeOn = false;
$('focusModeBtn').addEventListener('click', () => {
  focusModeOn = !focusModeOn;
  $('focusModeBtn').classList.toggle('active', focusModeOn);
  if (focusModeOn) {
    if (!$('game').classList.contains('compact')) toggleCompactMode(false);
    requestWakeLock();
    announce('Modo sem distração ativado.');
  } else {
    announce('Modo sem distração desativado.');
  }
});

// Sugestão de virar o celular — só aparece uma vez, quando faz sentido (mapa grande ou
// câmera longe, e o celular tá na vertical), pra não incomodar sempre
function maybeSuggestLandscape() {
  const isPortrait = window.innerWidth < window.innerHeight;
  const wouldBenefit = $('mapSize').value === 'large' || $('zoomLevel').value === 'far';
  if (!isPortrait || !wouldBenefit) return;
  if (localStorage.getItem('snakeArenaLandscapeHintSeen')) return;
  localStorage.setItem('snakeArenaLandscapeHintSeen', '1');
  $('landscapeHint').classList.add('show');
  setTimeout(() => $('landscapeHint').classList.remove('show'), 4000);
}
