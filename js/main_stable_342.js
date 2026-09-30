// Antes de editar: leia o AGENTS.md na raiz do repositório e rode `npm test` antes de publicar.
// Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial.
// Este é o único arquivo carregado pelo index.html — ele importa todo o resto.

import { $, safe, setVibrationEnabled, setTapVibrationEnabled, announce, vibrate } from './utils.js';
import { VERSION, COLORS, ZOOM_LEVELS, REACTIONS, ACHIEVEMENTS, BOARD_THEMES, SNAKE_COLORS, TEAMS, HUNTER_DEFAULTS } from './config.js';
import { planTeams } from './teams.js';
import { loadTeamPrefs, saveTeamPrefs } from './storage.js';
import { state } from './state.js';
import { makePlayers, label } from './players.js';
import { startGame, startOnlineHostGame, startClientGame, applyRemoteState, tryBoost, updateGamesPlayedBadge, switchScreen, updateSessionStatsDisplay, loadSavedGame, clearSavedGame, resumeSavedGame } from './loop_stable_336.js';
import { render } from './render_stable_341.js';
import { setupInput, setDir } from './input.js';
import { unlockAudio, setMuted, toggleMusic, setSfxVolume, setMusicVolume } from './sound.js';
import { loadBest, loadMuted, saveMuted, loadProfile, saveProfile, resetSettings, loadVibration, saveVibration, loadGamesPlayed, loadAllModeBests, loadSessionGamesToday, loadLastPlayedAt, loadStreakDays, recordMatchResult, loadMatchHistory, loadUnlockedAchievements, unlockAchievement, trackCumulativeProgress, saveShortcuts, loadShortcuts, loadHunterSettings, saveHunterSettings } from './storage.js';
import { maybeShowTutorial, setupTutorial } from './tutorial.js';
import { shareScoreCard } from './share.js';
import { renderLeaderboard, toggleLeaderboard } from './leaderboard.js';
import * as net from './net_stable_360.js';

// --- Multiplayer online (criar/entrar em sala) ---
// Sistema de "pronto" — cada cliente avisa quando tá preparado, o anfitrião vê quem
// já confirmou antes de decidir começar (mas continua podendo começar mesmo sem todos)
const readyStatus = { 0: true };
let onlineLobbyPlayers = [];
let onlineLobbyConfig = null;
const disconnectedOnline = {};
const onlineDisconnectTimers = {};
function updateReadyDisplay() {
  const box = $('readyStatusDisplay');
  if (!box) return;
  const total = net.connectedCount();
  if (total === 0) { box.textContent = ''; return; }
  const readyCount = Object.values(readyStatus).filter(Boolean).length;
  box.textContent = `✅ ${readyCount} de ${total} jogador(es) prontos`;
}

$('clientReadyBtn').addEventListener('click', () => {
  net.sendInput({ type: 'ready', ready: true });
  $('clientReadyOverlay').querySelector('h2').textContent = '✅ Prontinho!';
  $('clientReadyOverlay').querySelector('p').textContent = 'Esperando o dono da sala começar a partida...';
  $('clientReadyBtn').textContent = 'Aguardando...';
  $('clientReadyBtn').disabled = true;
});

// Placar acumulado da sessão online — soma as vitórias de cada torneio enquanto a sala
// continuar a mesma (usando o botão "Jogar de novo"), reseta se sair ou criar sala nova
let sessionWins = {};
function updateSessionScoreDisplay() {
  const box = $('sessionScoreDisplay');
  if (!box) return;
  const total = Object.values(sessionWins).reduce((a, b) => a + b, 0);
  if (total === 0) { box.classList.add('hidden'); return; }
  const parts = Object.entries(sessionWins).map(([slot, w]) => `${label(Number(slot))}: ${w} vitória${w === 1 ? '' : 's'}`);
  box.textContent = `📊 Nessa sala hoje: ${parts.join(' • ')}`;
  box.classList.remove('hidden');
}

// Conquistas exclusivas do multiplayer: os clientes não simulam o jogo, então
// acompanham os estados enviados pelo anfitrião para desbloquear objetivos online.
let onlineAchievementStartAt = 0;
let onlineLastFoods = 0;
function checkOnlineAchievementsFromState() {
  if (!net.isOnline() || !state.running) return;
  const totalPlayers = state.count || 0;
  if (totalPlayers >= 3) unlockOnline('online_trio');
  if (totalPlayers >= 6) unlockOnline('online_full_room');
  if (state.teamMode) unlockOnline('online_team');

  const myFood = state.foodsEaten[net.mySlot] || 0;
  const myScore = state.scores[net.mySlot] || 0;
  const myElims = state.eliminations[net.mySlot] || 0;
  if (myFood > 0) unlockOnline('online_first_food');
  if (myFood >= 25) unlockOnline('online_food_25');
  if (myScore >= 100) unlockOnline('online_score_100');
  if (myScore >= 500) unlockOnline('online_score_500');
  if (myElims >= 1) unlockOnline('online_kill_1');
  if (myElims >= 3) unlockOnline('online_kill_3');

  // Só conta tempo a partir do começo desta partida online.
  if (!onlineAchievementStartAt) onlineAchievementStartAt = Date.now();
  if (state.alive[net.mySlot] && Date.now() - onlineAchievementStartAt >= 120000) {
    unlockOnline('online_survive_2m');
  }

  onlineLastFoods = Math.max(onlineLastFoods, myFood);
}
function unlockOnline(id) {
  const a = unlockAchievement(id);
  if (a) document.dispatchEvent(new CustomEvent('achievementUnlocked', { detail: a }));
}

net.setHandlers({
  onJoinRequest: (request) => {
    const name = safe(request.name, 'Alguém');
    showJoinApprovalPrompt(name, request);
  },
  // O anfitrião decide em qual time cada amigo cai, respeitando o tamanho de cada lado
  // e a escolha da pessoa (com o anfitrião ou contra ele). Devolve o time (0/1) ou undefined
  // se a partida não for em times.
  onAssignTeam: (slot, pref) => {
    if (!$('teamMode').checked) return undefined;
    state.teamPrefs[slot] = pref === 'other' ? 'other' : 'mine';
    const prefs = Array.from({ length: slot + 1 }, (_, i) => (state.teamPrefs[i] === 'other' ? 'other' : 'mine'));
    const plano = planTeams({ sizeMine: state.teamSizeMine, sizeOther: state.teamSizeOther, prefs, hostTeam: state.teams[0] === 1 ? 1 : 0 });
    state.teams[slot] = plano.teams[slot];
    return plano.teams[slot];
  },
  onPeerJoined: () => {
    state.count = Math.min(6, 1 + net.connectedCount());
    $('roomStatus').textContent = `👥 ${net.connectedCount()} amigo(s) conectado(s). Pode clicar em "Jogar" quando quiser!`;
    updateOnlineLobbyUI();
    makePlayers();
    $('startFromHostPanel').classList.add('waitingPulse'); // chama atenção: tem gente esperando
    updateReadyDisplay();
    broadcastOnlineLobby();
    // Se a pessoa saiu da aba (foi ver outra coisa) enquanto esperava, um toque sonoro
    // de notificação avisa que já pode voltar e começar a partida
    if (window.Notification && window.Notification.permission === 'granted' && document.hidden) {
      try { new window.Notification('🐍 Snake Arena', { body: 'Um amigo entrou na sua sala! Volte pra começar a jogar.' }); } catch {}
    }
  },
  onPeerLeft: (slot) => {
    const wasPlaying = net.isHost() && state.running && slot > 0 && slot < state.count;
    if (wasPlaying) {
      clearTimeout(onlineDisconnectTimers[slot]);
      disconnectedOnline[slot] = { name: state.names[slot] || `Jogador ${slot + 1}`, at: Date.now() };
      $('roomStatus').textContent = `🔄 ${disconnectedOnline[slot].name} caiu. Tentando reconectar por até 8s...`;
      state.toast = { x: Math.floor(state.mapW / 2), y: Math.floor(state.mapH / 2), text: '🔄 Reconectando jogador...', color: '#ffd24d', until: Date.now() + 2200 };
      onlineDisconnectTimers[slot] = setTimeout(() => {
        if (!disconnectedOnline[slot]) return;
        state.types[slot] = 'cpu';
        $('roomStatus').textContent = `🤖 ${disconnectedOnline[slot].name} não voltou em 8s. A CPU assumiu temporariamente.`;
      }, 8000);
    } else {
      state.count = Math.min(6, 1 + net.connectedCount());
      state.teamPrefs.length = Math.min(state.teamPrefs.length, state.count);
      makePlayers();
    }
    updateOnlineLobbyUI();
    if (net.connectedCount() === 0) $('startFromHostPanel').classList.remove('waitingPulse');
    delete readyStatus[slot];
    updateReadyDisplay();
    broadcastOnlineLobby();
  },
  onPeerList: () => broadcastOnlineLobby(),
  onLobby: (players, config) => {
    onlineLobbyPlayers = Array.isArray(players) ? players : [];
    onlineLobbyConfig = config || null;
    renderOnlineLobby();
  },
  onMatchResult: (result) => {
    if (!result) return;
    document.dispatchEvent(new CustomEvent('onlineMatchResult', { detail: result }));
  },
  onStateUpdate: (msg) => {
    applyRemoteState(msg);
    capturePartnerNameOnce(msg.names?.[0]);
    checkOnlineAchievementsFromState();
  },
  // A configuração estável da sala agora pode chegar a qualquer momento: entrada tardia,
  // reconexão ou após uma troca de anfitrião. Ela não depende do primeiro pacote de estado.
  onRoomConfig: (msg) => {
    state.colors = msg.colors || state.colors;
    state.names = msg.names || state.names;
    state.heads = msg.heads || state.heads;
    state.patterns = msg.patterns || state.patterns;
    state.palettes = msg.palettes || state.palettes;
    state.trailColors = msg.trailColors || state.trailColors;
    state.mapW = msg.mapW || state.mapW;
    state.mapH = msg.mapH || state.mapH;
    state.theme = msg.theme || state.theme;
    state.teamMode = msg.teamMode ?? state.teamMode;
    state.teams = msg.teams || state.teams;
    state.count = msg.count || state.count;
    render();
  },
  // O host é a fonte oficial desses dados. O net.js pede a configuração sempre que
  // alguém entra ou reconecta, então não há dependência do pacote raro inicial.
  getRoomConfig: () => ({
    colors: state.colors,
    names: state.names,
    heads: state.heads,
    patterns: state.patterns,
    palettes: state.palettes,
    trailColors: state.trailColors,
    mapW: state.mapW,
    mapH: state.mapH,
    theme: state.theme,
    teamMode: state.teamMode,
    teams: state.teams,
    count: state.count,
  }),
  // Aplica de verdade a direção/turbo que o amigo manda — sem isso a minhoca dele
  // nunca virava, só seguia reto na direção que nasceu (bug relatado)
  onInput: (slot, msg) => {
    if (disconnectedOnline[slot]) {
      clearTimeout(onlineDisconnectTimers[slot]);
      delete onlineDisconnectTimers[slot];
      delete disconnectedOnline[slot];
      state.types[slot] = 'human';
      $('roomStatus').textContent = `✅ ${state.names[slot] || `Jogador ${slot + 1}`} voltou! Controle devolvido.`;
      state.toast = { x: Math.floor(state.mapW / 2), y: Math.floor(state.mapH / 2), text: '✅ Jogador reconectado!', color: '#67ef8a', until: Date.now() + 1800 };
    }
    if (msg.type === 'dir') setDir(slot, msg.dir);
    else if (msg.type === 'boost') tryBoost(slot);
    else if (msg.type === 'reaction') {
      showReaction(msg.emoji);
      net.broadcastRaw({ type: 'reaction', emoji: msg.emoji, from: slot }); // repassa pra todo mundo
    } else if (msg.type === 'chat') {
      appendChatMessage(slot, msg.text);
      net.broadcastRaw({ type: 'chat', text: msg.text, from: slot }); // repassa pra todo mundo
    } else if (msg.type === 'ready') {
      readyStatus[slot] = !!msg.ready;
      updateReadyDisplay();
      broadcastOnlineLobby();
    }
  },
  onReaction: (emoji) => showReaction(emoji),
  onChat: (text, from) => appendChatMessage(from, text),
  onCountdown: (n) => {
    // Assim que a contagem regressiva chega, o jogo já tá prestes a começar de verdade —
    // esconde a tela de "aguardando pronto" AQUI TAMBÉM, não só quando o primeiro estado
    // chegar. Sem isso, se o primeiro pacote de estado demorasse ou se perdesse, a pessoa
    // ficava presa atrás de uma tela quase preta pra sempre, mesmo o jogo já tendo começado.
    $('clientReadyOverlay').classList.add('hidden');
    $('overlay').classList.add('hidden');
    if (!state.debugCountdownRecebidoAt) state.debugCountdownRecebidoAt = Date.now();
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
  // Migração automática de anfitrião — a sala não morre se quem hospedava cair
  onHostLeft: () => {
    $('joinStatus').textContent = '⚠️ O anfitrião saiu! Tentando reconectar a sala automaticamente...';
    announce('O anfitrião saiu da sala. Tentando reconectar automaticamente.');
  },
  onBecameNewHost: () => {
    $('roomStatus').textContent = '👑 Novo anfitrião ativo! A sala vai retomar automaticamente.';
    $('hostPanel').classList.remove('hidden');
    state.toast = { x: Math.floor(state.mapW / 2), y: Math.floor(state.mapH / 2), text: '👑 Novo anfitrião assumiu!', color: '#ffd24d', until: Date.now() + 2600 };
    setTimeout(() => {
      if (net.isOnline() && net.isHost()) {
        $('hostPanel').classList.add('hidden');
        startOnlineHostGame();
      }
    }, 4500);
  },
  onRejoinedAfterMigration: () => {
    $('joinStatus').textContent = '✅ Reconectado com o novo anfitrião! Aguardando a partida recomeçar...';
  },
  onMigrationFailed: () => {
    $('joinStatus').textContent = '😕 Não deu pra reconectar a sala automaticamente. Peça um novo link/código.';
  },
});

document.querySelectorAll('.onlinePreset').forEach((btn) => {
  btn.addEventListener('click', () => applyOnlinePreset(btn.dataset.onlinePreset));
});
$('onlineDiagBtn').addEventListener('click', runOnlineDiagnostics);
$('leaveOnlineBtn').addEventListener('click', leaveOnlineLobby);
setInterval(() => {
  updateOnlineLobbyUI();
  if (net.isOnline() && net.isHost()) broadcastOnlineLobby();
}, 1000);
updateOnlineLobbyUI();
renderOnlineLobby();

function normalizeRoomNumberUI(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 4);
}

function generateRoomNumberUI() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function createOnlineRoom() {
  if (!navigator.onLine) {
    $('roomStatus').textContent = '📡 Sem conexão com a internet — o multiplayer online precisa de internet.';
    return;
  }

  unlockAudio();
  state.teamPrefs = ['mine'];
  syncTeamCapacity();
  sessionWins = {};
  onlineLobbyPlayers = [];
  onlineLobbyConfig = null;
  renderOnlineLobby();
  updateSessionScoreDisplay();

  const requestedCode = normalizeRoomNumberUI($('hostRoomCodeInput')?.value);
  const requestedPin = normalizeRoomNumberUI($('hostRoomPinInput')?.value) || generateRoomNumberUI();

  if (requestedCode && requestedCode.length !== 4) {
    $('roomStatus').textContent = '⚠️ O código da sala precisa ter 4 números.';
    return;
  }
  if (requestedPin.length !== 4) {
    $('roomStatus').textContent = '⚠️ O PIN precisa ter 4 números.';
    return;
  }

  const code = requestedCode || generateRoomNumberUI();
  const peerId = 'mioquinha-room-' + code;

  $('hostBtn').disabled = true;
  const originalHostText = $('hostBtn').textContent;
  $('hostBtn').textContent = '⏳ Criando sala...';

  net.hostRoom(
    (roomId) => {
      $('hostBtn').textContent = originalHostText;
      $('hostPanel').classList.remove('hidden');
      $('roomCode').textContent = code;
      $('roomPinDisplay').textContent = requestedPin;
      $('hostRoomCodeInput').value = code;
      $('hostRoomPinInput').value = requestedPin;
      $('roomStatus').textContent = '👥 Sala pronta! Passe somente o código e o PIN para seus amigos.';
      updateOnlineLobbyUI();
      $('count').disabled = true;
      state.count = 1;
      makePlayers();

      if (window.Notification && window.Notification.permission === 'default') {
        window.Notification.requestPermission().catch(() => {});
      }
    },
    (err) => {
      $('hostBtn').disabled = false;
      $('hostBtn').textContent = originalHostText;

      if (err?.type === 'unavailable-id') {
        $('roomStatus').textContent = '⚠️ Esse código já está sendo usado por outra sala. Escolha outro código.';
        return;
      }

      $('roomStatus').textContent = '❌ Não consegui criar a sala: ' + (err?.message || err);
    },
    peerId,
    { roomCode: code, roomPin: requestedPin, requirePin: true }
  );
}

$('hostBtn').addEventListener('click', createOnlineRoom);

$('copyRoom').addEventListener('click', async () => {
  const link = buildRoomLink();
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
// Monta o link de convite já com as configurações da sala embutidas — permite mostrar
// uma prévia pra quem recebe o link, ANTES de conectar de verdade (melhoria #9)
function applyOnlinePreset(name) {
  const presets = {
    casual: { format: 'ffa', mode: 'classic', speed: 'normal', map: 'medium', diff: 'normal', noWalls: false },
    teams: { format: 'teams', mode: 'classic', speed: 'normal', map: 'medium', diff: 'normal', noWalls: false, mine: 2, other: 2 },
    chaos: { format: 'teams', mode: 'turbo', speed: 'fast', map: 'large', diff: 'hardmid', noWalls: false, mine: 3, other: 3 },
    training: { format: 'ffa', mode: 'classic', speed: 'slow', map: 'small', diff: 'easy', noWalls: true },
  };
  const p = presets[name];
  if (!p) return;
  $('onlineFormat').value = p.format;
  $('onlineFormat').dispatchEvent(new window.Event('change'));
  $('mode').value = p.mode;
  $('mode').dispatchEvent(new window.Event('change'));
  $('speedSelect').value = p.speed;
  $('speedSelect').dispatchEvent(new window.Event('change'));
  $('mapSize').value = p.map;
  $('mapSize').dispatchEvent(new window.Event('change'));
  $('difficulty').value = p.diff;
  $('difficulty').dispatchEvent(new window.Event('change'));
  $('noWalls').checked = p.noWalls;
  $('noWalls').dispatchEvent(new window.Event('change'));
  if (p.mine) $('teamSizeMine').value = String(p.mine);
  if (p.other) $('teamSizeOther').value = String(p.other);
  if (p.mine || p.other) syncTeamCapacity();
  updateRoomSettingsPreview();
  const labels = { casual: '🎯 1×1 Casual', teams: '🤝 Times 2×2', chaos: '🔥 Caos 3×3', training: '🎓 Treino' };
  $('roomLobbyHint').textContent = `✅ ${labels[name]} aplicado. Agora crie a sala e envie o convite.`;
  announce(`${labels[name]} aplicado.`);
}

function getOnlineLobbyConfig() {
  const text = (id) => $(id)?.selectedOptions?.[0]?.text || '';
  return {
    format: $('onlineFormat')?.value || 'ffa',
    mode: text('mode'),
    speed: text('speedSelect'),
    map: text('mapSize'),
    difficulty: text('difficulty'),
    theme: text('boardTheme'),
    noWalls: $('noWalls')?.checked || false,
    teams: $('teamMode')?.checked ? `${state.teamSizeMine} × ${state.teamSizeOther}` : null,
    tournament: $('tournamentMode')?.checked || false,
  };
}

function broadcastOnlineLobby() {
  if (!net.isOnline() || !net.isHost()) return;
  const players = net.getConnectedPeers().map((p) => ({
    slot: p.slot, host: !!p.host,
    name: state.names[p.slot] || (p.host ? 'Anfitrião' : `Jogador ${p.slot + 1}`),
    team: state.teamMode ? state.teams[p.slot] : null,
    ready: p.host ? true : !!readyStatus[p.slot],
    ping: Number.isFinite(p.ping) ? Math.round(p.ping) : null, disconnected: false,
  }));
  Object.entries(disconnectedOnline).forEach(([slot, info]) => {
    const s = Number(slot);
    if (!players.some(p => p.slot === s)) players.push({ slot:s, host:false, name:info.name, team:state.teamMode?state.teams[s]:null, ready:false, ping:null, disconnected:true });
  });
  const config = getOnlineLobbyConfig();
  onlineLobbyPlayers = players;
  onlineLobbyConfig = config;
  renderOnlineLobby();
  net.broadcastRaw({ type: 'lobby', players, config });
}

// Correção: essa função era chamada em 6 lugares (ao entrar/sair da sala, a cada 1s, ao
// hospedar/entrar) mas nunca tinha sido definida — o jogo quebrava assim que abria
// ("ReferenceError: updateOnlineLobbyUI is not defined"), travando todo mundo na telinha
// de carregamento com "Tentar novamente" (que só repetia o mesmo erro). renderOnlineLobby()
// já atualiza TUDO que existe na tela do lobby, então isso vira um apelido pra ela.
function updateOnlineLobbyUI() {
  renderOnlineLobby();
}

function renderOnlineLobby() {
  const box = $('onlineLobbyPlayers');
  if (!box) return;
  const players = onlineLobbyPlayers.slice().sort((a, b) => a.slot - b.slot);
  if (!players.length) {
    box.innerHTML = '<div class="onlineLobbyEmpty">👥 Crie a sala ou entre em uma para ver quem está jogando.</div>';
    return;
  }
  const teamNames = { 0: '🔵 Azul', 1: '🔴 Vermelho' };
  const signal = (ping) => {
    if (!Number.isFinite(ping)) return '📶';
    if (ping < 80) return '🟢';
    if (ping < 160) return '🟡';
    return '🔴';
  };
  box.innerHTML = players.map((p) => {
    const team = p.team == null ? '' : ` <span class="onlineLobbyTeam">${teamNames[p.team] || `Time ${p.team + 1}`}</span>`;
    const status = p.ready ? '<span class="onlineLobbyReady">✅ Pronto</span>' : '<span class="onlineLobbyWaiting">⏳ Aguardando</span>';
    const ping = p.host ? '👑 Host' : `${signal(p.ping)} ${Number.isFinite(p.ping) ? `${Math.round(p.ping)} ms` : '—'}`;
    return `<div class="onlineLobbyPlayer">
      <div class="onlineLobbyAvatar">${p.host ? '👑' : '🐍'}</div>
      <div class="onlineLobbyPlayerMain"><b>${escapeChatText(p.name || 'Jogador')}</b><span>P${p.slot + 1}${team}</span></div>
      <div class="onlineLobbyPlayerMeta">${status}<small>${ping}</small></div>
    </div>`;
  }).join('');
  const count = players.length;
  const ready = players.filter(p => p.ready).length;
  const cfg = onlineLobbyConfig;
  const configText = cfg
    ? `${cfg.format === 'teams' ? '🤝 Times' : '⚔️ Todos contra todos'} • ${cfg.map} • ${cfg.speed}${cfg.noWalls ? ' • 🌀 Sem paredes' : ''}${cfg.tournament ? ' • 🏆 Torneio' : ''}${cfg.teams ? ` • ${cfg.teams}` : ''}`
    : '';
  const cfgBox = $('onlineLobbyConfig');
  if (cfgBox) cfgBox.textContent = configText ? `⚙️ Configuração da sala: ${configText}` : '';
  const summary = $('onlineLobbySummary');
  if (summary) summary.textContent = `👥 ${count}/6 jogadores • ✅ ${ready}/${count} prontos`;
  const lobbyStatus = $('onlineLobbyStatus');
  if (lobbyStatus) {
    const disconnected = players.filter(p => p.disconnected).length;
    lobbyStatus.textContent = disconnected ? `⚠️ ${disconnected} jogador(es) desconectado(s). A CPU protege a partida e o slot fica reservado.` : ready === count ? '🟢 Todos os jogadores estão prontos.' : `🟡 ${count - ready} jogador(es) ainda não confirmaram.`;
  }
  const clientBox = $('onlineClientLobby'), clientPlayers = $('onlineClientLobbyPlayers'), clientCfg = $('onlineClientLobbyConfig'), clientStatus = $('onlineClientLobbyStatus');
  if (clientBox && clientPlayers) {
    clientBox.classList.toggle('hidden', !net.isOnline() || net.isHost() || !players.length);
    clientPlayers.innerHTML = players.map(p => {
      const team = p.team == null ? '' : ` <span class="onlineLobbyTeam">${teamNames[p.team] || `Time ${p.team + 1}`}</span>`;
      const status = p.disconnected ? '<span class="onlineLobbyDisconnected">⚠️ CPU</span>' : p.ready ? '<span class="onlineLobbyReady">✅ Pronto</span>' : '<span class="onlineLobbyWaiting">⏳ Aguardando</span>';
      const ping = p.disconnected ? '🔄 Reconectando...' : p.host ? '👑 Host' : '📶';
      return `<div class="onlineLobbyPlayer"><div class="onlineLobbyAvatar">${p.host?'👑':p.disconnected?'🤖':'🐍'}</div><div class="onlineLobbyPlayerMain"><b>${escapeChatText(p.name||'Jogador')}</b><span>P${p.slot+1}${team}</span></div><div class="onlineLobbyPlayerMeta">${status}<small>${ping}</small></div></div>`;
    }).join('');
    if(clientCfg) clientCfg.textContent=configText?`⚙️ ${configText}`:'';
    if(clientStatus) clientStatus.textContent=`${players.filter(p=>!p.disconnected).length}/${count} conectados • ${ready}/${count} prontos`;
  }

  const active = net.isOnline();
  $('leaveOnlineBtn')?.classList.toggle('hidden', !active);
  const host = net.isHost();
  const capacity = $('teamMode').checked
    ? Math.max(2, state.teamSizeMine + state.teamSizeOther)
    : 6;
  if (host) {
    const humans = Math.min(capacity, 1 + net.connectedCount());
    const pct = Math.max(0, Math.min(100, humans / capacity * 100));
    $('roomCapacityText').textContent = `${humans} / ${capacity}`;
    $('roomCapacityFill').style.width = `${pct}%`;
    $('roomLobbyHint').textContent = humans >= capacity
      ? '🟢 Sala cheia. Todos os jogadores já podem começar!'
      : `🟢 Aguardando ${capacity - humans} vaga(s). Você já pode começar quando quiser.`;
  }
}

function runOnlineDiagnostics() {
  const box = $('onlineDiagDisplay');
  if (!box) return;
  const online = navigator.onLine;
  const peerJs = typeof window.Peer === 'function';
  const webRtc = typeof window.RTCPeerConnection === 'function';
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const quality = conn?.effectiveType ? String(conn.effectiveType).toUpperCase() : 'não disponível';
  let latency = null;
  if (net.isHost()) {
    const values = Object.values(net.pingStats).filter(v => Number.isFinite(v));
    if (values.length) latency = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  } else if (net.isOnline() && Number.isFinite(net.hostLatency)) {
    latency = Math.round(net.hostLatency);
  }
  const rows = [
    [online, 'Internet detectada pelo navegador'],
    [peerJs, 'PeerJS carregado'],
    [webRtc, 'WebRTC/DataChannel disponível'],
    [net.isOnline(), 'Sessão online ativa'],
  ];
  const status = rows.map(([ok, label]) => `<span class="diagItem">${ok ? '🟢' : '🔴'} ${label}</span>`).join('');
  const ping = latency == null ? '📶 Ping da sala: aguardando conexão' : `📶 Ping médio: <b>${latency} ms</b>`;
  box.innerHTML = `${status}<span class="diagItem">📡 Qualidade estimada: <b>${quality}</b></span><span class="diagItem">${ping}</span><small>ℹ️ O teste de internet é apenas uma indicação; a conexão real entre jogadores depende da rede e do WebRTC.</small>`;
  box.classList.remove('hidden');
}

function leaveOnlineLobby() {
  if (!net.isOnline()) return;
  if (state.running && !confirm('Sair da sala online? A partida atual será encerrada.')) return;
  state.running = false;
  clearInterval(state.timer);
  net.disconnect();
  sessionWins = {};
  updateSessionScoreDisplay();
  releaseWakeLock();
  $('hostPanel').classList.add('hidden');
  $('roomCode').textContent = '...';
  $('roomStatus').textContent = '';
  $('joinStatus').textContent = '';
  $('hostBtn').disabled = false;
  $('joinBtn').disabled = false;
  $('startFromHostPanel').classList.remove('waitingPulse');
  $('leaveOnlineBtn').classList.add('hidden');
  $('roomLobbyHint').textContent = '🟢 Sala fechada neste aparelho. Você pode criar outra.';
  switchScreen('game', 'menu');
  document.querySelector('.siteHeader').classList.remove('hidden');
  render();
}

function buildRoomLink() {
  const params = new URLSearchParams({
    room: $('roomCode').textContent,
    mode: state.mode,
    map: $('mapSize').value,
    diff: state.difficulty,
    theme: state.theme,
    noWalls: state.noWalls ? '1' : '0',
  });
  if ($('teamMode').checked) {
    params.set('fmt', 'teams');
    params.set('ta', String(state.teamSizeMine));
    params.set('tb', String(state.teamSizeOther));
  }
  return location.origin + location.pathname + '?' + params.toString();
}

// --- Times online: capacidade, preferências e escolha de quem entra ---
// Reaplica o tamanho de cada lado: define quantos cabem na sala e avisa o anfitrião quantas
// CPUs vão completar as vagas.
function syncTeamCapacity() {
  const times = $('teamMode').checked;
  state.teamSizeMine = +$('teamSizeMine').value || 2;
  state.teamSizeOther = +$('teamSizeOther').value || 2;
  net.setMaxPlayers(times ? state.teamSizeMine + state.teamSizeOther : 6);
  $('teamSizeRow').classList.toggle('hidden', !times);
  if (times) {
    const total = state.teamSizeMine + state.teamSizeOther;
    $('teamSizeHint').textContent = `Total: ${total} minhocas — cabem até ${total - 1} amigo(s) na sala, e o que sobrar vira 🤖 CPU.`;
  }
  salvarPrefsDeTime();
  recomputeLobbyTeams();
  updateRoomSettingsPreview();
}

// Refaz o time de cada pessoa que já está na sala, com base nas escolhas e nos tamanhos
function recomputeLobbyTeams() {
  if (!(net.isOnline() && net.isHost()) || !$('teamMode').checked) return;
  const humanos = 1 + net.connectedCount();
  const prefs = Array.from({ length: humanos }, (_, i) => (state.teamPrefs[i] === 'other' ? 'other' : 'mine'));
  const plano = planTeams({ sizeMine: state.teamSizeMine, sizeOther: state.teamSizeOther, prefs, hostTeam: state.teams[0] === 1 ? 1 : 0 });
  for (let i = 0; i < humanos; i++) state.teams[i] = plano.teams[i];
  makePlayers();
}

// Lê, de um link (ou só do "?room=...&fmt=teams&ta=2&tb=2"), se a sala é de times e de quantos
function lerInfoDeTimes(texto) {
  try {
    const p = new URL(String(texto).trim(), location.origin).searchParams;
    if (p.get('fmt') === 'teams') return { ta: +p.get('ta') || 2, tb: +p.get('tb') || 2 };
  } catch {}
  return null;
}

// Mostra (ou esconde) a escolha "no time de quem criou / no adversário" pra quem vai entrar
function refreshJoinTeamChoice(info) {
  $('joinTeamRow').classList.toggle('hidden', !info);
  if (!info) return;
  $('joinTeamChoice').options[0].textContent = `🤝 No time de quem criou a sala (time de ${info.ta})`;
  $('joinTeamChoice').options[1].textContent = `⚔️ No time adversário (time de ${info.tb})`;
}
$('joinCode').addEventListener('input', () => {
  const texto = $('joinCode').value;
  if (texto.includes('room=')) refreshJoinTeamChoice(lerInfoDeTimes(texto)); // colou um link inteiro
});

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
  const pin = normalizeRoomNumberUI($('joinPin').value);

  if (!code) return;
  if (!navigator.onLine) {
    $('joinStatus').textContent = '📡 Sem conexão com a internet — não dá pra entrar em uma sala sem internet.';
    return;
  }
  if (normalizeRoomNumberUI(code).length !== 4) {
    $('joinStatus').textContent = '⚠️ O código da sala precisa ter 4 números.';
    return;
  }
  if (pin.length !== 4) {
    $('joinStatus').textContent = '⚠️ Digite o PIN de 4 números da sala.';
    return;
  }

  unlockAudio();
  $('joinBtn').disabled = true;
  const originalJoinText = $('joinBtn').textContent;
  $('joinBtn').textContent = '⏳ Entrando...';
  $('joinStatus').innerHTML = '<span class="spinner"></span>Conectando com a sala...';

  const escolhaDeTime = $('joinTeamRow').classList.contains('hidden')
    ? 'mine'
    : ($('joinTeamChoice').value === 'other' ? 'other' : 'mine');

  if (!$('joinTeamRow').classList.contains('hidden')) salvarPrefsDeTime();

  net.joinRoomByCode(normalizeRoomNumberUI(code), pin, state.names[0],
    (slot, time) => {
      $('joinStatus').textContent = '✅ Entrada autorizada!';
      updateOnlineLobbyUI();
      $('joinBtn').textContent = originalJoinText;
      document.querySelector('.siteHeader').classList.add('hidden');
      saveLastOnlineRoom(normalizeRoomNumberUI(code), null);
      partnerNameCaptured = false;
      startClientGame();

      if (time === 0 || time === 1) {
        const rotulo = TEAMS.find((t) => t.value === time)?.label || '';
        $('clientReadyOverlay').querySelector('h2').textContent = '🌐 Você entrou no ' + rotulo + '!';
        announce('Você entrou no ' + rotulo + '.');
      }
    },
    (err) => {
      $('joinBtn').disabled = false;
      $('joinBtn').textContent = originalJoinText;

      let msg = '❌ Não consegui entrar. ';
      if (err?.type === 'peer-unavailable') msg += 'Essa sala não existe ou já fechou.';
      else if (err?.message === 'wrongPin') msg += 'PIN incorreto. Confere os 4 números com quem criou a sala.';
      else if (err?.message === 'invalidRoomCode') msg += 'O código precisa ter 4 números.';
      else if (err?.message === 'invalidRoomPin') msg += 'O PIN precisa ter 4 números.';
      else if (err?.type === 'network' || err?.type === 'server-error' || err?.type === 'disconnected' || err?.type === 'socket-error' || err?.type === 'socket-closed') msg += 'Parece que a internet caiu no meio do caminho.';
      else if (err?.message === 'full') msg += 'Essa sala já está cheia.';
      else if (err?.message === 'timeout') msg += 'A conexão demorou demais. Tenta novamente.';
      else if (err?.message === 'rejected') msg += 'O dono da sala não aceitou sua entrada.';
      else msg += 'Confere o código e o PIN.';
      $('joinStatus').textContent = msg;
    },
    () => {
      $('joinStatus').innerHTML = '<span class="spinner"></span>Conectado! Validando o PIN e esperando a autorização do dono...';
    },
    escolhaDeTime
  );
});

// Se a pessoa abriu um link de convite (?room=CODIGO), já deixa o código preenchido
const roomFromUrl = new URLSearchParams(location.search).get('room');
if (new URLSearchParams(location.search).get('diag') === '1') {
  $('diagPanel').classList.remove('hidden');
}

// Correção: essa constante era declarada lá embaixo (perto de activateProgressSection),
// mas switchToTab() já era chamada aqui em cima, assim que a página abre (pra ler ?tab= da
// URL) — e switchToTab() usa TAB_ALIASES. Com "const", isso é um erro garantido toda vez
// ("Cannot access before initialization"), travando o carregamento. Motivo: quem é
// declarado com const/let só existe de verdade a partir da linha onde é declarado, mesmo
// que a função que o usa já exista antes (funções são content içadas; const/let não).
// Navegação principal: quatro áreas simples. Os nomes antigos "ranking" e "conquistas"
// continuam aceitos em links antigos e atalhos, mas agora apontam para Progresso.
const TAB_ALIASES = { ranking: 'progresso', conquistas: 'progresso' };

// Atalhos de app (melhoria #2) — segurar o ícone no Android oferece "Jogar Rápido" e
// "Ver Conquistas", que chegam aqui como parâmetros na URL
const urlAction = new URLSearchParams(location.search);
const ABAS_VALIDAS = ['jogar', 'personalizar', 'online', 'progresso', 'ranking', 'conquistas'];
const tabDaUrl = urlAction.get('tab');
const secaoDaUrl = urlAction.get('section') || 'stats';
if (tabDaUrl && ABAS_VALIDAS.includes(tabDaUrl)) {
  switchToTab(tabDaUrl, 'replace', secaoDaUrl);
} else if (roomFromUrl) {
  // Abriu um link de convite de sala — já vai direto pra aba Online, sem precisar clicar
  switchToTab('online', 'replace');
}
if (urlAction.get('quickplay') === '1') {
  setTimeout(() => $('startHero')?.click(), 300); // um tiquinho de atraso pra tudo terminar de montar
}
if (roomFromUrl) $('joinCode').value = roomFromUrl;
if (roomFromUrl) refreshJoinTeamChoice(lerInfoDeTimes(location.search));

// Prévia da sala — se o link já veio com as configurações embutidas, mostra o que a
// pessoa vai encontrar ANTES de precisar clicar em entrar de verdade
const urlParams = new URLSearchParams(location.search);
if (roomFromUrl && urlParams.get('mode')) {
  const mapNames = { small: 'Pequeno', normal: 'Normal', large: 'Grande' };
  const modeNames = { classic: 'Clássico', turbo: 'Turbo Worms' };
  const diffNames = { easy: '🐣 Fácil', easymid: '🙂 Fácil+', normal: '😐 Médio', hardmid: '😈 Médio+', hard: '💀 Difícil' };
  const parts = [
    modeNames[urlParams.get('mode')] || urlParams.get('mode'),
    `Mapa ${mapNames[urlParams.get('map')] || urlParams.get('map')}`,
    diffNames[urlParams.get('diff')] || urlParams.get('diff'),
  ];
  if (urlParams.get('noWalls') === '1') parts.push('🌀 Sem paredes');
  if (urlParams.get('fmt') === 'teams') parts.push(`🤝 Times ${urlParams.get('ta') || 2} vs ${urlParams.get('tb') || 2}`);
  $('roomPreviewDisplay').textContent = `👀 Prévia da sala: ${parts.join(' • ')}`;
  $('roomPreviewDisplay').classList.remove('hidden');
}

// --- Botões principais ---
function doStart() {
  unlockAudio();
  requestWakeLock();
  saveQuickRepeat();
  document.querySelector('.siteHeader').classList.add('hidden');
  maybeSuggestLandscape();
  $('startFromHostPanel').classList.remove('waitingPulse');
  Object.keys(readyStatus).forEach((k) => delete readyStatus[k]);
  readyStatus[0] = true;
  onlineLobbyPlayers = [];
  onlineLobbyConfig = null;
  renderOnlineLobby();
  updateReadyDisplay();
  // Toque pessoal: jogando sozinho, a arena ganha um contorno na cor da sua minhoca
  const arenaEl = document.querySelector('.arena');
  if (arenaEl) {
    if (state.count === 1 && !(net.isOnline())) {
      arenaEl.style.boxShadow = `0 0 0 3px ${state.colors[0]}, 0 8px 30px ${state.colors[0]}55`;
    } else {
      arenaEl.style.boxShadow = '';
    }
  }
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
  const { n, icon, name, desc } = e.detail;
  if (n != null) {
    // Formato antigo: marco de partidas jogadas
    $('achievementPopup').querySelector('.achievementEmoji').textContent = '🏆';
    $('achievementSub').textContent = `🎮 ${n} partidas jogadas neste aparelho`;
  } else {
    // Formato novo: conquista da galeria, com ícone e nome próprios
    $('achievementPopup').querySelector('.achievementEmoji').textContent = icon || '🏆';
    $('achievementSub').textContent = `${name} — ${desc}`;
  }
  $('achievementPopup').classList.remove('hidden');
  requestAnimationFrame(() => $('achievementPopup').classList.add('show'));
  vibrate([30, 60, 30, 60, 60]);
  clearTimeout(achievementHideTimer);
  achievementHideTimer = setTimeout(() => {
    $('achievementPopup').classList.remove('show');
    setTimeout(() => $('achievementPopup').classList.add('hidden'), 350);
  }, 3200);
});
let achievementHideTimer = null;

// Fim do Modo Torneio: mostra o campeão e o placar de cada rodada, reaproveitando o
// overlay que já existia na tela (endTitle/endText/continueBtn) sem uso nenhum até agora
function renderOnlineResultStats(result) {
  const box = $('onlineResultStats');
  if (!box || !result) return;
  const names = result.names || [];
  const wins = result.wins || [];
  const scores = result.scores || [];
  const foods = result.foodsEaten || [];
  const elims = result.eliminations || [];
  const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const rows = names.map((name, i) => ({i, name:name || label(i), wins:wins[i]||0, score:scores[i]||0, food:foods[i]||0, elim:elims[i]||0}))
    .sort((a,b)=>(b.wins-a.wins)||(b.score-a.score)||(b.food-a.food)||(a.i-b.i));
  box.classList.remove('hidden');
  box.innerHTML =
    '<div class="onlineResultSummary">' +
      '<div><span>👥 Jogadores</span><b>' + rows.length + '</b></div>' +
      '<div><span>⭐ Pontos totais</span><b>' + rows.reduce((n,p)=>n+p.score,0) + '</b></div>' +
      '<div><span>🍎 Comidas</span><b>' + rows.reduce((n,p)=>n+p.food,0) + '</b></div>' +
      '<div><span>☠️ Eliminações</span><b>' + rows.reduce((n,p)=>n+p.elim,0) + '</b></div>' +
    '</div>' +
    '<div class="onlineResultRanking">' +
      rows.map((p,pos)=>'<div class="onlineResultRow ' + (p.i===net.mySlot?'you ':'') + (p.i===result.champion?'champion':'') + '">' +
        '<span class="onlineResultPlace">' + (pos===0?'🥇':pos===1?'🥈':pos===2?'🥉':(pos+1)+'º') + '</span>' +
        '<div class="onlineResultPlayer"><b>' + safe(p.name) + (p.i===net.mySlot?' • 🫵 Você':'') + (p.i===result.champion?' • 👑 Campeão':'') + '</b>' +
        '<small>🏆 ' + p.wins + ' rodada(s) • 🍎 ' + p.food + ' • ☠️ ' + p.elim + ' • ⭐ ' + p.score + '</small></div>' +
      '</div>').join('') +
    '</div>';
}

document.addEventListener('onlineMatchResult', (e) => {
  const { champion, wins, scores = [], foodsEaten = [], eliminations = [], teams = [], teamMode = false, names = [] } = e.detail;
  $('endTitle').textContent = '🏁 Resultado da partida!';
  const ranking = names.map((name, i) => ({ i, name: name || label(i), score: scores[i] || 0, food: foodsEaten[i] || 0, elim: eliminations[i] || 0, wins: wins[i] || 0 }))
    .sort((a, b) => (b.wins - a.wins) || (b.score - a.score) || (b.food - a.food));
  const championName = names[champion] || label(champion);
  renderOnlineResultStats(e.detail);
  const placar = wins.map((w, i) => `${i === champion ? '👑 ' : ''}${names[i] || label(i)}: ${w} rodada${w === 1 ? '' : 's'}`).join(' • ');
  const destaque = ranking.map((p, pos) => `${pos + 1}º ${p.name}: 🏆 ${p.wins} • 🍎 ${p.food} • ☠️ ${p.elim} • ⭐ ${p.score}`).join('\n');
  // Vibração de "vitória" — animada e crescente, bem diferente da de derrota, só pra
  // quem realmente venceu (nos outros dispositivos, seus jogadores não são o campeão)
  if (champion === net.mySlot) vibrate([40, 30, 40, 30, 40, 30, 200]);
  $('endText').textContent = `${championName} venceu o torneio!\n\n${destaque}\n\n${placar}`;
  $('overlay').classList.remove('hidden');

  // Histórico de confrontos (só faz sentido claro no 1x1) e placar acumulado da sessão —
  // ambos só quando é online de verdade, já que contra CPU não é bem um "confronto"
  if (net.isOnline() && state.count === 2) {
    const opponentSlot = net.mySlot === 0 ? 1 : 0;
    const opponentName = state.names[opponentSlot];
    recordMatchResult(opponentName, champion === net.mySlot, {
      score: scores[net.mySlot] || 0,
      food: foodsEaten[net.mySlot] || 0,
      eliminations: eliminations[net.mySlot] || 0,
    });
    showMatchHistory(opponentName);
  }
  if (net.isOnline()) {
    sessionWins[champion] = (sessionWins[champion] || 0) + 1;
    updateSessionScoreDisplay();

    const my = net.mySlot;
    if ((foodsEaten[my] || 0) > 0) unlockOnline('online_first_food');
    if ((foodsEaten[my] || 0) >= 25) unlockOnline('online_food_25');
    if ((scores[my] || 0) >= 100) unlockOnline('online_score_100');
    if ((scores[my] || 0) >= 500) unlockOnline('online_score_500');
    if ((eliminations[my] || 0) >= 1) unlockOnline('online_kill_1');
    if ((eliminations[my] || 0) >= 3) unlockOnline('online_kill_3');
    if (champion === my) unlockOnline('online_champion');
  }

  // A revanche usa a mesma sala: o anfitrião dispara uma nova partida e os clientes
  // recebem a contagem regressiva automaticamente, sem novo código ou convite.
  const showPlayAgain = net.isOnline() && net.isHost();
  $('playAgainSameRoomBtn').classList.toggle('hidden', !showPlayAgain);
  $('playAgainSameRoomBtn').textContent = '🔁 Jogar novamente com essa galera';
  $('playAgainSameRoomBtn').onclick = () => {
    $('overlay').classList.add('hidden');
    startOnlineHostGame();
  };
  if (net.isOnline() && !net.isHost()) {
    $('playAgainSameRoomBtn').classList.remove('hidden');
    $('playAgainSameRoomBtn').textContent = '⏳ Aguardando o anfitrião iniciar a revanche...';
    $('playAgainSameRoomBtn').disabled = true;
  } else {
    $('playAgainSameRoomBtn').disabled = false;
  }

  $('continueBtn').onclick = () => {
    $('overlay').classList.add('hidden');
    $('back').click();
  };
});

// Confere a pontuação a cada meio segundo e atualiza o ícone da aba — não precisa ser
// em todo quadro, só rápido o bastante pra sentir que tá "ao vivo"
setInterval(() => {
  if (state.running) { try { updateScoreFavicon(state.scores[net.mySlot] || 0); } catch {} }
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
  clearSavedGame();
  net.disconnect();
  sessionWins = {};
  updateSessionScoreDisplay();
  releaseWakeLock();
  $('count').disabled = false;
  $('hostPanel').classList.add('hidden');
  $('hostBtn').disabled = false;
  $('joinBtn').disabled = false;
  switchScreen('game', 'menu');
  document.querySelector('.siteHeader').classList.remove('hidden');
  document.querySelector('.arena').style.boxShadow = '';
  renderLeaderboard();
  updateTopRecordDisplay();
  updateBestByModeDisplay();
  updateSessionStatsDisplay(loadSessionGamesToday());
  applyQuickRepeat();
  resetFavicon();
  if (pendingUpdateReg) { showUpdateBanner(pendingUpdateReg); pendingUpdateReg = null; }
  checarVersaoDeVerdade(); // idem pro outro mecanismo de atualização: dá uma nova chance assim que sair da sala, sem precisar esperar o próximo minuto
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
  const best = state.best || 0;
  $('topRecordDisplay').innerHTML = `🏅 Seu recorde: <b>${best}</b> pontos`;
  $('progressRecordMini')?.replaceChildren(document.createTextNode(`🏅 ${best}`));
  $('progressBestValue')?.replaceChildren(document.createTextNode(String(best)));
  $('progressGamesValue')?.replaceChildren(document.createTextNode(String(loadGamesPlayed() || 0)));
  $('progressSessionValue')?.replaceChildren(document.createTextNode(String(loadSessionGamesToday() || 0)));
}

function activateProgressSection(section = 'stats') {
  const valid = ['stats', 'ranking', 'achievements', 'history'];
  const target = valid.includes(section) ? section : 'stats';
  document.querySelectorAll('.progressNavBtn').forEach((b) => {
    const active = b.dataset.progressSection === target;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.progressSection').forEach((p) => {
    p.classList.toggle('hidden', p.dataset.progressPanel !== target);
  });
}
function switchToTab(tab, modoUrl = 'push', progressSection = null) {
  tab = TAB_ALIASES[tab] || tab;
  const btn = document.querySelector(`.tabBtn[data-tab="${tab}"]`);
  if (!btn) return;
  document.querySelectorAll('.tabBtn').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');

  // Ao entrar na aba JOGAR, a configuração da partida fica aberta automaticamente.
  // Assim a pessoa vê imediatamente quantidade de jogadores, controles, mapa, velocidade
  // e demais opções, sem precisar descobrir o botão de configurações.
  if (tab === 'jogar') {
    const settingsBox = $('gameAdvancedSettings');
    const settingsBtn = $('gameSettingsToggle');
    if (settingsBox && settingsBtn) {
      settingsBox.classList.remove('hidden');
      settingsBtn.setAttribute('aria-expanded', 'true');
      settingsBtn.classList.add('open');
      const arrow = settingsBtn.querySelector('span');
      if (arrow) arrow.textContent = '▴';
    }
  }

  const current = document.querySelector('.tabPanel:not(.hidden)');
  if (current) current.classList.add('tabFading');
  setTimeout(() => {
    document.querySelectorAll('.tabPanel').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== tab));
    const next = document.querySelector('.tabPanel:not(.hidden)');
    if (next) {
      next.classList.add('tabFading');
      requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove('tabFading')));
    }
    if (tab === 'progresso') activateProgressSection(progressSection || 'stats');
  }, 120);

  if (modoUrl === 'push' || modoUrl === 'replace') {
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    if (tab === 'progresso' && progressSection && progressSection !== 'stats') params.set('section', progressSection);
    else params.delete('section');
    const novaUrl = location.pathname + '?' + params.toString();
    if (modoUrl === 'push') history.pushState({ tab, section: progressSection }, '', novaUrl);
    else history.replaceState({ tab, section: progressSection }, '', novaUrl);
  }
}

document.querySelector('.tabBar')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.tabBtn');
  if (!btn) return;
  switchToTab(btn.dataset.tab, 'push');
});

document.querySelectorAll('.progressNavBtn').forEach((btn) => {
  btn.addEventListener('click', () => {
    activateProgressSection(btn.dataset.progressSection);
    const params = new URLSearchParams(location.search);
    params.set('tab', 'progresso');
    if (btn.dataset.progressSection === 'stats') params.delete('section');
    else params.set('section', btn.dataset.progressSection);
    history.pushState({ tab: 'progresso', section: btn.dataset.progressSection }, '', location.pathname + '?' + params.toString());
  });
});

// Botão "voltar"/"avançar" do navegador troca de área também, em vez de sair do jogo.
window.addEventListener('popstate', (e) => {
  const params = new URLSearchParams(location.search);
  switchToTab(e.state?.tab || params.get('tab') || 'jogar', 'none', e.state?.section || params.get('section') || 'stats');
});

$('refresh').addEventListener('click', () => {
  location.href = location.pathname + '?v=' + VERSION + '&t=' + Date.now();
});

$('gameSettingsToggle')?.addEventListener('click', () => {
  const box = $('gameAdvancedSettings');
  const btn = $('gameSettingsToggle');
  if (!box || !btn) return;
  const open = box.classList.toggle('hidden') === false;
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.querySelector('span').textContent = open ? '▴' : '▾';
  btn.classList.toggle('open', open);
});

document.querySelectorAll('.settingsJump').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = $('settingsSection' + btn.dataset.settingsJump.charAt(0).toUpperCase() + btn.dataset.settingsJump.slice(1));
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

$('settingsSearch')?.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  const panel = document.querySelector('.tabPanel[data-panel="personalizar"]');
  if (!panel) return;
  panel.querySelectorAll('label.check, select.select, button.bindShortcut, #silentModeBtn, #resetSettings, #installHelpBtn').forEach((el) => {
    if (!q) { el.classList.remove('searchDimmed'); el.style.removeProperty('display'); return; }
    const text = (el.textContent + ' ' + (el.id || '') + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();
    const match = text.includes(q);
    el.classList.toggle('searchDimmed', !match);
    el.style.display = match ? '' : 'none';
  });
});

$('mode').addEventListener('change', e => { state.mode = e.target.value; updateRoomSettingsPreview(); });
function updateDifficultyColor() {
  const val = $('difficulty').value;
  const cls = (val === 'easy' || val === 'easymid') ? 'diff-easy' : (val === 'hard' || val === 'hardmid') ? 'diff-hard' : 'diff-normal';
  $('difficulty').classList.remove('diff-easy', 'diff-normal', 'diff-hard');
  $('difficulty').classList.add(cls);
}
$('difficulty').addEventListener('change', e => { state.difficulty = e.target.value; updateRoomSettingsPreview(); updateDifficultyColor(); });
updateDifficultyColor();
$('speedSelect').addEventListener('change', updateRoomSettingsPreview);
$('mapSize').addEventListener('change', updateRoomSettingsPreview);
$('zoomLevel').addEventListener('change', (e) => {
  state.zoom = e.target.value;
  persistZoom();
});
$('noWalls').addEventListener('change', updateRoomSettingsPreview);
// Cor da barra de status do navegador combina com o tema do tabuleiro escolhido —
// no Android/iPhone isso pinta a área da hora/bateria da mesma cor do jogo
function updateStatusBarColor() {
  const theme = BOARD_THEMES.find((t) => t.value === state.theme) || BOARD_THEMES[0];
  $('metaThemeColor')?.setAttribute('content', theme.bg);
  updateThemePreview(theme);
}

// Prévia do mapa logo abaixo do seletor de tema: mostra o fundo, a comidinha e a decoração
// do tema escolhido, pra ver a mudança na hora — sem precisar começar uma partida
const ICONES_DECORACAO = { stars: '✦ ✧ ✦', bubbles: '○ ◦ ○', sand: '· ∙ ·', snow: '❄ ❅ ❄', spores: '● ∘ ●', sparkles: '✦ ✧ ✦', petals: '❀ ✿ ❀', none: '' };
function updateThemePreview(theme) {
  const el = $('themePreview');
  if (!el) return;
  el.style.background = `radial-gradient(circle at 50% 50%, ${theme.bg2 || theme.bg}, ${theme.bg} 78%)`;
  el.style.borderColor = theme.grid;
  el.style.color = theme.accent || '#fff';
  el.textContent = `${theme.food}  ${ICONES_DECORACAO[theme.deco] || ''}  ${theme.food}`;
}
$('boardTheme').addEventListener('change', e => { state.theme = e.target.value; updateStatusBarColor(); });
$('vibrationOn').addEventListener('change', e => {
  state.vibrationOn = e.target.checked;
  setVibrationEnabled(state.vibrationOn);
  saveVibration(state.vibrationOn);
});

// Modo Silencioso — liga som mudo e vibração num clique só, prático pra biblioteca,
// sala de aula ou qualquer lugar que precise ficar quieto mas ainda sentir o jogo
$('silentModeBtn').addEventListener('click', () => {
  state.muted = true;
  setMuted(true);
  $('mute').textContent = '🔇';
  saveMuted(true);
  state.vibrationOn = true;
  setVibrationEnabled(true);
  $('vibrationOn').checked = true;
  saveVibration(true);
  announce('Modo silencioso ativado: som desligado, vibração ligada.');
});

// Mostra um resuminho das configurações escolhidas bem em cima do botão "Criar sala",
// pra ficar claro o que vai valer na sala antes de criar
function updateRoomSettingsPreview() {
  const get = (id) => $(id).selectedOptions[0]?.text || '';
  const humanCount = state.types.slice(0, state.count).filter((t) => t === 'human').length;
  const cpuCount = state.count - humanCount;
  const composition = cpuCount > 0 ? `${humanCount} humano${humanCount === 1 ? '' : 's'}, ${cpuCount} CPU` : `${humanCount} humano${humanCount === 1 ? '' : 's'}`;
  const parts = [composition, get('mode'), get('speedSelect'), get('mapSize'), get('difficulty')];
  if ($('noWalls').checked) parts.push('🌀 Sem paredes');
  if ($('teamMode').checked) parts.push(`🤝 Times ${state.teamSizeMine} vs ${state.teamSizeOther}`);
  if ($('tournamentMode').checked) parts.push('🏆 Modo Torneio');
  $('roomSettingsPreview').textContent = '⚙️ Vai criar a sala com: ' + parts.join(' • ');
  $('playSummaryDisplay').textContent = composition + (state.count > 1 ? ' na partida' : '');
}

$('count').addEventListener('change', e => {
  state.count = +e.target.value;
  if (!state.types[0]) state.types[0] = 'human'; // sempre garante que você seja humano
  makePlayers();
  updateRoomSettingsPreview();
});

$('players').addEventListener('change', e => {
  const i = +e.target.dataset.i;
  if (e.target.classList.contains('ptype')) { state.types[i] = e.target.value; updateRoomSettingsPreview(); }
  if (e.target.classList.contains('pcontrol')) { state.controls[i] = e.target.value; makePlayers(); }
  if (e.target.classList.contains('pcolor')) { state.colors[i] = e.target.value; if (i === 0) persistProfile(); }
  if (e.target.classList.contains('ptrail')) { state.trailColors[i] = e.target.value; if (i === 0) persistProfile(); }
  if (e.target.classList.contains('nameColorSelect')) { state.nameColor = e.target.value; persistProfile(); }
  if (e.target.classList.contains('phead')) { state.heads[i] = e.target.value; if (i === 0) persistProfile(); }
  if (e.target.classList.contains('ppattern')) { state.patterns[i] = e.target.value; if (i === 0) persistProfile(); }
  if (e.target.classList.contains('ppalette')) { state.palettes[i] = e.target.value; if (i === 0) persistProfile(); }
  if (e.target.classList.contains('pteam')) {
    state.teams[i] = +e.target.value;
    if (net.isOnline() && net.isHost()) {
      if (i > 0) state.teamPrefs[i] = state.teams[i] === (state.teams[0] === 1 ? 1 : 0) ? 'mine' : 'other';
      recomputeLobbyTeams();
    }
  }
  if (e.target.classList.contains('pshow')) state.show[i] = e.target.checked;
});

$('players').addEventListener('click', e => {
  const btn = e.target.closest('.randomColorBtn');
  if (!btn) return;
  const idx = Number(btn.dataset.i);
  const options = COLORS.filter((c) => c !== state.colors[idx]);
  const newColor = options[Math.floor(Math.random() * options.length)] || COLORS[0];
  state.colors[idx] = newColor;
  const select = document.querySelector(`.pcolor[data-i="${idx}"]`);
  if (select) select.value = newColor;
  if (idx === 0) persistProfile();
});

// Ligar/desligar o modo Times reconstrói os cards de jogador (mostra/esconde o seletor de time)
$('teamMode').addEventListener('change', () => { makePlayers(); syncTeamCapacity(); });
$('teamSizeMine').addEventListener('change', syncTeamCapacity);
$('teamSizeOther').addEventListener('change', syncTeamCapacity);
$('joinTeamChoice').addEventListener('change', () => salvarPrefsDeTime());

// Lembra as escolhas de time entre uma visita e outra: o tamanho de cada lado (quem cria a
// sala) e "com o anfitrião / contra" (quem entra). O FORMATO (Times ou Todos contra Todos)
// não é lembrado de propósito: ele também liga o modo Times do jogo local, e abrir o jogo
// já em Times sem a pessoa pedir seria uma surpresa chata.
function salvarPrefsDeTime() {
  saveTeamPrefs({
    mine: +$('teamSizeMine').value,
    other: +$('teamSizeOther').value,
    joinChoice: $('joinTeamChoice').value === 'other' ? 'other' : 'mine',
  });
}
(function restaurarPrefsDeTime() {
  const p = loadTeamPrefs();
  if (!p) return;
  const tamanho = (v) => ([1, 2, 3].includes(Number(v)) ? String(Number(v)) : null); // ignora lixo salvo
  if (tamanho(p.mine)) $('teamSizeMine').value = tamanho(p.mine);
  if (tamanho(p.other)) $('teamSizeOther').value = tamanho(p.other);
  if (p.joinChoice === 'other' || p.joinChoice === 'mine') $('joinTeamChoice').value = p.joinChoice;
  state.teamSizeMine = +$('teamSizeMine').value;
  state.teamSizeOther = +$('teamSizeOther').value;
})();

// Formato da partida (Times vs Todos-contra-Todos) e cor do time, direto na aba Online —
// tudo isso já existia espalhado (checkbox de time + cor por jogador), aqui só fica mais
// claro e junto num lugar só, logo de cara, antes de criar a sala
$('myTeamColor').innerHTML = SNAKE_COLORS.map((c) => `<option value="${c.hex}">${c.name}</option>`).join('');
$('onlineFormat').addEventListener('change', (e) => {
  const isTeams = e.target.value === 'teams';
  $('teamMode').checked = isTeams;
  $('teamMode').dispatchEvent(new window.Event('change'));
  $('teamColorRow').classList.toggle('hidden', !isTeams);
});
$('myTeamColor').addEventListener('change', (e) => {
  const color = e.target.value;
  // Aplica a cor escolhida em TODO MUNDO do seu time (você é sempre o slot 0, o anfitrião)
  for (let i = 0; i < state.count; i++) {
    if (state.teams[i] === state.teams[0]) state.colors[i] = color;
  }
  makePlayers();
});
$('tournamentMode').addEventListener('change', e => {
  updateRoomSettingsPreview();
  $('tournamentMode').closest('.tournamentBox').classList.toggle('active', e.target.checked);
});

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

// Botões rápidos de tamanho dos controles, direto na tela do jogo — não precisa abrir
// o menu de configurações só pra isso
function adjustControlSize(delta) {
  state.controlSize = Math.max(70, Math.min(150, state.controlSize + delta));
  document.documentElement.style.setProperty('--ctrl-scale', state.controlSize / 100);
  $('controlSize').value = state.controlSize;
  persistComfortSettings();
  vibrate(10);
}
$('ctrlSizeUpBtn').addEventListener('click', () => adjustControlSize(10));
$('ctrlSizeDownBtn').addEventListener('click', () => adjustControlSize(-10));

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
  if (state.lightMode) { state.amoledMode = false; $('amoledMode').checked = false; document.querySelector('.app').classList.remove('amoledMode'); }
  persistComfortSettings();
});

$('amoledMode').addEventListener('change', (e) => {
  state.amoledMode = e.target.checked;
  document.querySelector('.app').classList.toggle('amoledMode', state.amoledMode);
  if (state.amoledMode) { state.lightMode = false; $('lightMode').checked = false; document.querySelector('.app').classList.remove('lightMode'); }
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
      amoledMode: state.amoledMode,
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
  if (typeof saved.amoledMode === 'boolean') state.amoledMode = saved.amoledMode;

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
  $('amoledMode').checked = state.amoledMode;
  document.querySelector('.app').classList.toggle('amoledMode', state.amoledMode);
}

// Convidar pelo WhatsApp — já abre com o link da sala preenchido, sem precisar copiar/colar
$('whatsappInvite').addEventListener('click', () => {
  const link = buildRoomLink();
  const texto = encodeURIComponent(`Vem jogar Snake Arena comigo! 🐍 ${link}`);
  window.open(`https://wa.me/?text=${texto}`, '_blank');
});

// Compartilhamento nativo da sala — abre o menu de compartilhar do próprio celular
// (Telegram, SMS, e-mail, Instagram, o que a pessoa tiver instalado), não só WhatsApp
$('nativeShareRoom').addEventListener('click', async () => {
  const link = buildRoomLink();
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
  saveProfile({ name: state.names[0], color: state.colors[0], head: state.heads[0], pattern: state.patterns[0], palette: state.palettes[0], touchControl: state.touchControl, trailColor: state.trailColors[0], nameColor: state.nameColor });
}

// --- Configuração da Minhoca Inimiga ---
// Os valores vêm do código como padrão, mas agora podem ser alterados pela interface.
// Tudo fica salvo no aparelho e volta ao abrir o jogo.
function applyHunterSettingsToUI() {
  const h = state.hunterConfig || HUNTER_DEFAULTS;
  $('hunterEnabled').checked = h.enabled !== false;
  $('hunterThreshold1').value = h.milestones?.[0]?.foodThreshold ?? 100;
  $('hunterDuration1').value = h.milestones?.[0]?.durationSec ?? 35;
  $('hunterThreshold2').value = h.milestones?.[1]?.foodThreshold ?? 150;
  $('hunterDuration2').value = h.milestones?.[1]?.durationSec ?? 50;
  $('hunterBurstDuration').value = h.burstDurationSec ?? 2.5;
  $('hunterBurstInterval').value = h.burstIntervalSec ?? 8;
  $('hunterDistractionRadius').value = h.distractionRadius ?? 6;
  $('hunterPrediction').value = h.predictionSteps ?? 3;
  $('hunterGrowth').value = h.growthPerVictim ?? 8;
  $('hunterBodyLength').value = h.bodyLength ?? 50;
  updateHunterSettingsSummary();
}

function readHunterSettingsFromUI() {
  const num = (id, fallback) => {
    const n = Number($(id)?.value);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    enabled: !!$('hunterEnabled')?.checked,
    milestones: [
      { foodThreshold: Math.max(10, num('hunterThreshold1', 100)), durationSec: Math.max(5, num('hunterDuration1', 35)) },
      { foodThreshold: Math.max(20, num('hunterThreshold2', 150)), durationSec: Math.max(5, num('hunterDuration2', 50)) },
    ],
    burstDurationSec: Math.max(0.5, num('hunterBurstDuration', 2.5)),
    burstIntervalSec: Math.max(1, num('hunterBurstInterval', 8)),
    distractionRadius: Math.max(1, num('hunterDistractionRadius', 6)),
    distractionDurationSec: state.hunterConfig?.distractionDurationSec ?? 3,
    predictionSteps: Math.max(0, num('hunterPrediction', 3)),
    growthPerVictim: Math.max(0, num('hunterGrowth', 8)),
    bodyLength: Math.max(10, num('hunterBodyLength', 50)),
  };
}

function saveHunterSettingsFromUI() {
  state.hunterConfig = readHunterSettingsFromUI();
  saveHunterSettings(state.hunterConfig);
  updateHunterSettingsSummary();
  updateRoomSettingsPreview();
}

function updateHunterSettingsSummary() {
  const h = state.hunterConfig || HUNTER_DEFAULTS;
  const s = $('hunterSettingsStatus');
  const summary = $('hunterLiveSummary');
  const behavior = $('hunterLiveBehavior');
  if (s) {
    s.textContent = h.enabled === false ? '🔴 Desativada' : (state.hunterActive ? '☠️ Ativa agora' : '🟢 Ativa');
    s.className = 'hunterStatusBadge ' + (h.enabled === false ? 'off' : state.hunterActive ? 'live' : '');
  }
  if (summary) { const restante = state.hunterActive ? ` • ⏱️ Agora: ${Math.max(0, Math.ceil((state.hunterEndsAt - Date.now()) / 1000))}s restantes` : ''; summary.textContent = `1ª: ${h.milestones?.[0]?.foodThreshold ?? 100} alimentos / ${h.milestones?.[0]?.durationSec ?? 35}s • 2ª: ${h.milestones?.[1]?.foodThreshold ?? 150} alimentos / ${h.milestones?.[1]?.durationSec ?? 50}s${restante}`; }
  if (behavior) behavior.textContent = `🎯 Persegue o líder • 💨 Rajada por ${h.burstDurationSec ?? 2.5}s a cada ${h.burstIntervalSec ?? 8}s • 🧠 Antecipação: ${h.predictionSteps ?? 3} casas • 🐍 Tamanho: ${h.bodyLength ?? 50}`;
}

const hunterFieldIds = ['hunterEnabled','hunterThreshold1','hunterDuration1','hunterThreshold2','hunterDuration2','hunterBurstDuration','hunterBurstInterval','hunterDistractionRadius','hunterPrediction','hunterGrowth','hunterBodyLength'];
hunterFieldIds.forEach((id) => {
  const el = $(id);
  el?.addEventListener(el.type === 'checkbox' ? 'change' : 'input', saveHunterSettingsFromUI);
});

const HUNTER_PRESETS = {
  normal: { enabled:true, milestones:[{foodThreshold:100,durationSec:35},{foodThreshold:150,durationSec:50}], burstDurationSec:2.5, burstIntervalSec:8, distractionRadius:6, predictionSteps:3, growthPerVictim:8, bodyLength:50 },
  hard: { enabled:true, milestones:[{foodThreshold:75,durationSec:45},{foodThreshold:125,durationSec:60}], burstDurationSec:3, burstIntervalSec:7, distractionRadius:8, predictionSteps:4, growthPerVictim:10, bodyLength:55 },
  chaos: { enabled:true, milestones:[{foodThreshold:50,durationSec:60},{foodThreshold:90,durationSec:90}], burstDurationSec:5, burstIntervalSec:5, distractionRadius:10, predictionSteps:6, growthPerVictim:14, bodyLength:65 },
  reset: JSON.parse(JSON.stringify(HUNTER_DEFAULTS)),
};
document.querySelectorAll('.hunterPreset').forEach((btn) => {
  btn.addEventListener('click', () => {
    const preset = HUNTER_PRESETS[btn.dataset.hunterPreset];
    if (!preset) return;
    state.hunterConfig = JSON.parse(JSON.stringify(preset));
    saveHunterSettings(state.hunterConfig);
    applyHunterSettingsToUI();
    vibrate(15);
  });
});

setInterval(updateHunterSettingsSummary, 700);

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
        // Tenta travar a tela na paisagem automaticamente — funciona em vários navegadores
        // Android assim que entra em tela cheia, sem precisar instalar nada. Se não der
        // (bem comum no iPhone/Safari), sem problema, a pessoa só gira o aparelho na mão.
        try { await screen.orientation?.lock?.('landscape'); } catch {}
      } else if (!on && document.fullscreenElement) {
        try { screen.orientation?.unlock?.(); } catch {}
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


const mobileGameMoreBtn = $('mobileGameMoreBtn');
const mobileGameMenu = $('mobileGameMenu');

function closeMobileGameMenu() {
  if (!mobileGameMenu || !mobileGameMoreBtn) return;
  mobileGameMenu.classList.add('hidden');
  mobileGameMoreBtn.setAttribute('aria-expanded', 'false');
}

function runMobileGameAction(action) {
  const targetMap = {
    ctrlDown: 'ctrlSizeDownBtn',
    ctrlUp: 'ctrlSizeUpBtn',
    touch: 'touchControlToggle',
    zoom: 'zoomToggle',
    mute: 'mute',
    music: 'musicBtn',
    share: 'shareScore',
    screenshot: 'screenshotBtn',
    diag: 'diagToggleBtn',
    focus: 'focusModeBtn',
    pip: 'pipBtn',
  };
  const id = targetMap[action];
  if (!id) return;
  $(id)?.click();
  // Keep the menu open only for diagnostic panels; every other action is a quick command.
  if (action !== 'diag') closeMobileGameMenu();
}

mobileGameMoreBtn?.addEventListener('click', (event) => {
  event.stopPropagation();
  const open = mobileGameMenu?.classList.toggle('hidden') === false;
  mobileGameMoreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
});

mobileGameMenu?.addEventListener('click', (event) => {
  const item = event.target.closest('[data-game-action]');
  if (!item) return;
  runMobileGameAction(item.dataset.gameAction);
});

document.addEventListener('click', (event) => {
  if (!mobileGameMenu || !mobileGameMoreBtn) return;
  if (!mobileGameMenu.contains(event.target) && event.target !== mobileGameMoreBtn) closeMobileGameMenu();
});

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
  $('silentModeBtn').textContent = '🔇 Modo Silencioso (sem vibração neste navegador)';
}

updateGamesPlayedBadge(loadGamesPlayed());
updateSessionStatsDisplay(loadSessionGamesToday());
updateBestByModeDisplay();

function updateBestByModeDisplay() {
  const all = loadAllModeBests();
  const box = $('bestByModeDisplay');
  if (!box) return;
  box.innerHTML = `🏆 Recordes por modo:<br>Clássico: <b>${all.classic || 0}</b> • ⚡ Turbo: <b>${all.turbo || 0}</b> • 🎪 Torneio (rodada): <b>${all.tournament || 0}</b>`;
}

try {
  const savedZoom = localStorage.getItem('snakeArenaZoom');
  if (savedZoom) state.zoom = savedZoom;
} catch {}
applyZoomButton();

const savedVolumes = loadVolumes();
if (typeof savedVolumes.sfx === 'number') { $('sfxVolume').value = Math.round(savedVolumes.sfx * 100); setSfxVolume(savedVolumes.sfx); }
if (typeof savedVolumes.music === 'number') { $('musicVolume').value = Math.round(savedVolumes.music * 100); setMusicVolume(savedVolumes.music); }

// Nome/cor/cabeça que a pessoa escolheu da última vez (melhoria #18)
state.hunterConfig = loadHunterSettings(HUNTER_DEFAULTS);
const profile = loadProfile();
if (profile.name) { state.names[0] = profile.name; $('myName').value = profile.name; }
if (profile.color) state.colors[0] = profile.color;
if (profile.head) state.heads[0] = profile.head;
if (profile.pattern) state.patterns[0] = profile.pattern;
if (profile.palette) state.palettes[0] = profile.palette;
if (profile.trailColor) state.trailColors[0] = profile.trailColor;
if (profile.nameColor) state.nameColor = profile.nameColor;
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
  const sc = state.shortcuts;
  if (e.code === sc.restart) { e.preventDefault(); $('restart').click(); }
  else if (e.code === sc.mute) { e.preventDefault(); $('mute').click(); }
  else if (e.code === sc.zoom) { e.preventDefault(); $('zoomToggle').click(); }
  else if (e.code === sc.compact) { e.preventDefault(); $('compactBtn').click(); }
  else if (e.code === 'F11') { e.preventDefault(); $('compactBtn').click(); } // atalho #8: F11 já aciona o modo maximizado do próprio jogo
});

setupTutorial();
applyHunterSettingsToUI();
makePlayers();
$('leaderboardToggle').addEventListener('click', toggleLeaderboard);
render();
renderLeaderboard();
updateTopRecordDisplay();
updateRoomSettingsPreview();
maybeShowTutorial();

// Service Worker desativado temporariamente para eliminar o ciclo de recarregamento.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
    .catch(() => {});
}

// Checagem de versão à parte, direta da internet (segurança extra) — em vez de
// depender só do mecanismo de atualização do Service Worker (que pode demorar a
// "perceber" uma versão nova em certos navegadores/situações), busca um arquivinho
// simples (version.txt) direto do servidor, adicionando um número aleatório na URL
// pra IMPOSSIBILITAR que fique preso em cache de qualquer camada (navegador, proxy,
// etc.). Se a versão aí for diferente da que está rodando agora, força uma atualização
// completa sozinho, sem precisar de nenhuma ação da pessoa.
async function checarVersaoDeVerdade() {
  // Não faz reload automático. A versão é verificada apenas para informação.
  return false;
}

let pendingUpdateReg = null;
function showUpdateBanner(reg) {
  pendingUpdateReg = reg || null;
  announce('🔄 Atualização disponível. Ela não será aplicada automaticamente.');
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
  if (!confirm('Isso vai substituir suas configurações atuais (tema, mapa, dificuldade, etc). Continuar?')) return;
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
    if (cfg.theme) { $('boardTheme').value = cfg.theme; state.theme = cfg.theme; updateStatusBarColor(); }
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
  setTimeout(() => $('landscapeHint').classList.remove('show'), 6000);
}

// Botão de ação na dica de paisagem — tenta tela cheia + travar a orientação de uma vez,
// funciona tanto no navegador quanto no app instalado (não precisa baixar nada)
$('landscapeHintBtn').addEventListener('click', async () => {
  if (!$('game').classList.contains('compact')) await toggleCompactMode(true);
  $('landscapeHint').classList.remove('show');
});

// Indicador de bateria e aviso quando tá acabando — usa a API de Bateria quando o
// navegador suporta (nem todos suportam, então tudo aqui é opcional/silencioso se não der)
let lowBatteryWarned = false;
if (navigator.getBattery) {
  navigator.getBattery().then((battery) => {
    function updateBatteryUI() {
      const pct = Math.round(battery.level * 100);
      $('batteryStatus').classList.remove('hidden');
      $('batteryPercent').textContent = pct;
      $('batteryStatus').style.color = (pct <= 20 && !battery.charging) ? '#ff5577' : '';
      if (pct <= 15 && !battery.charging && !lowBatteryWarned) {
        lowBatteryWarned = true;
        announce(`Bateria em ${pct}%. Considere ativar o economizador de energia ou ligar o carregador.`);
      }
      if (battery.charging || pct > 20) lowBatteryWarned = false;
    }
    updateBatteryUI();
    battery.addEventListener('levelchange', updateBatteryUI);
    battery.addEventListener('chargingchange', updateBatteryUI);
  }).catch(() => {});
}

// A tela de carregamento agora é controlada pelo inicializador do index.html.
// Isso permite mostrar progresso e, principalmente, informar se o JavaScript travar.

// Lembra a última sala online que a pessoa entrou (e com quem), pra facilitar tentar de
// novo depois — útil se a sala ainda tiver aberta e a pessoa só perdeu a conexão à toa.
// Não garante que vai funcionar (a sala pode ter fechado), só poupa de digitar o código de novo.
const LAST_ROOM_KEY = 'snakeArenaLastRoom';

function saveLastOnlineRoom(code, partnerName) {
  try {
    const existing = JSON.parse(localStorage.getItem(LAST_ROOM_KEY)) || {};
    localStorage.setItem(LAST_ROOM_KEY, JSON.stringify({ code, partnerName: partnerName || existing.partnerName || null }));
  } catch {}
  updateLastRoomButton();
}

let partnerNameCaptured = false;
function capturePartnerNameOnce(name) {
  if (partnerNameCaptured || !name) return;
  partnerNameCaptured = true;
  try {
    const existing = JSON.parse(localStorage.getItem(LAST_ROOM_KEY)) || {};
    localStorage.setItem(LAST_ROOM_KEY, JSON.stringify({ ...existing, partnerName: name }));
  } catch {}
  updateLastRoomButton();
  showMatchHistory(name);
}

// Histórico de confrontos — mostra quantas vezes você já jogou (e venceu/perdeu) contra
// essa pessoa em partidas 1x1 anteriores
function showMatchHistory(partnerName) {
  const box = $('matchHistoryDisplay');
  if (!box) return;
  const history = loadMatchHistory(partnerName);
  const total = history.wins + history.losses;
  if (total === 0) { box.classList.add('hidden'); return; }
  const winRate = total ? Math.round((history.wins / total) * 100) : 0;
  const avgScore = total ? Math.round((history.totalScore || 0) / total) : 0;
  box.innerHTML = `📜 <b>${total} confrontos</b> com ${escapeChatText(partnerName)}<br>` +
    `🏆 ${history.wins} vitória${history.wins === 1 ? '' : 's'} • 💀 ${history.losses} derrota${history.losses === 1 ? '' : 's'} • 📊 ${winRate}% de vitórias<br>` +
    `⭐ Média: ${avgScore} pontos • 🍎 ${history.totalFood || 0} comidas • ☠️ ${history.totalEliminations || 0} eliminações`;
  box.classList.remove('hidden');
}

function updateLastRoomButton() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(LAST_ROOM_KEY)); } catch {}
  const btn = $('lastRoomBtn');
  if (!data?.code) { btn.classList.add('hidden'); return; }
  btn.textContent = data.partnerName
    ? `🔄 Tentar de novo: sala de ${data.partnerName} (${data.code})`
    : `🔄 Tentar de novo: última sala (${data.code})`;
  btn.classList.remove('hidden');
  btn.onclick = () => {
    $('joinCode').value = data.code;
    $('joinBtn').click();
  };
}
updateLastRoomButton();

// Versão do jogo no rodapé do menu (melhoria #11)
$('versionFooter').textContent = `Snake Arena • v${VERSION}`;

// Mensagem de "bem-vindo de volta" com a data da última vez e a sequência de dias —
// mostra o que já tava salvo ANTES dessa visita contar como uma partida nova
const previousLastPlayed = loadLastPlayedAt();
const previousStreak = loadStreakDays();
if (previousLastPlayed) {
  const daysSince = Math.floor((Date.now() - previousLastPlayed) / (24 * 60 * 60 * 1000));
  const quando = daysSince === 0 ? 'hoje mais cedo' : daysSince === 1 ? 'ontem' : `há ${daysSince} dias`;
  const streakTexto = previousStreak > 1 ? ` • 🔥 ${previousStreak} dias seguidos jogando!` : '';
  $('welcomeBackDisplay').textContent = `👋 Bem-vindo de volta! Última vez: ${quando}${streakTexto}`;
}

// Convite genérico pra chamar alguém sem precisar já ter criado uma sala (melhoria #12)
$('genericInviteBtn').addEventListener('click', shareLink);

// Aviso gentil de "ainda aí?" — se a SUA minhoca ficar muito tempo sem virar de jeito
// nenhum enquanto a partida tá rolando, é sinal de que talvez tenha saído do celular
let afkWarned = false;
setInterval(() => {
  if (!state.running || state.paused) { afkWarned = false; return; }
  const idleMs = Date.now() - (state.lastTurnAt[net.mySlot] || Date.now());
  if (idleMs > 30000 && !afkWarned) {
    afkWarned = true;
    const h = state.snakes[net.mySlot]?.[0];
    if (h) state.toast = { x: h.x, y: h.y, text: '👋 Ainda aí?', color: '#8fd3ff', until: Date.now() + 2500 };
    announce('Você está aí? Faz um tempo que não muda de direção.');
  } else if (idleMs < 30000) {
    afkWarned = false;
  }
}, 5000);

// Aviso proativo de "sem internet" — atualiza na hora se a conexão cair ou voltar,
// mesmo sem a pessoa ter tentado clicar em nada ainda
function updateConnectivityWarning() {
  const box = $('connectivityWarning');
  if (!box) return;
  box.classList.toggle('hidden', navigator.onLine);
}
window.addEventListener('online', updateConnectivityWarning);
window.addEventListener('offline', updateConnectivityWarning);
updateConnectivityWarning();

// Indicador de "no wi-fi" vs "nos dados móveis" — só funciona em navegadores que
// suportam a API de Informação de Rede (a maioria dos Android; iPhone/Safari não tem)
function updateConnectionTypeDisplay() {
  const box = $('connectionTypeDisplay');
  if (!box) return;
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) { box.textContent = ''; return; }
  const isWifi = conn.type === 'wifi';
  const isCellular = conn.type === 'cellular';
  if (isWifi) box.textContent = '📶 Conectado no Wi-Fi';
  else if (isCellular) box.textContent = '📱 Conectado nos dados móveis';
  else if (conn.effectiveType) box.textContent = `📡 Qualidade estimada: ${String(conn.effectiveType).toUpperCase()}`;
  else box.textContent = '';
}
const netConn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
if (netConn) netConn.addEventListener('change', updateConnectionTypeDisplay);
updateConnectionTypeDisplay();

// Se tinha uma partida local rolando quando o navegador fechou sem querer, oferece
// continuar de onde parou — só aparece se realmente tiver algo salvo, e some depois de usado
const savedGame = loadSavedGame();
if (savedGame) {
  $('resumeGameBtn').classList.remove('hidden');
  $('resumeGameBtn').addEventListener('click', () => {
    document.querySelector('.siteHeader').classList.add('hidden');
    requestWakeLock();
    resumeSavedGame(savedGame);
    $('resumeGameBtn').classList.add('hidden');
  });
}

// Galeria de Conquistas — mostra cada uma com destaque se já foi desbloqueada, ou
// esmaecida com "?" no lugar da descrição se ainda não
function renderAchievementsGallery() {
  const grid = $('achievementsGrid');
  if (!grid) return;
  const unlocked = loadUnlockedAchievements();
  $('achievementsProgress').textContent = `${unlocked.length} de ${ACHIEVEMENTS.length} conquistas desbloqueadas`;

  const groups = [
    { key: 'iniciante', title: '🟢 Iniciante', subtitle: 'Primeiros objetivos para pegar o jeito' },
    { key: 'intermediario', title: '🟡 Intermediário', subtitle: 'Desafios que exigem mais consistência' },
    { key: 'avancado', title: '🔴 Avançado', subtitle: 'Conquistas para dominar a arena' },
    { key: 'online', title: '🌐 Online', subtitle: 'Desafios exclusivos para partidas multiplayer' },
  ];

  grid.innerHTML = groups.map((group) => {
    const items = ACHIEVEMENTS
      .map((a, originalIndex) => ({ a, originalIndex }))
      .filter(({ a }) => a.category === group.key)
      .map((item, difficultyIndex) => ({ ...item, difficultyNumber: difficultyIndex + 1 }))
      .sort((x, y) => {
        const xUnlocked = unlocked.includes(x.a.id);
        const yUnlocked = unlocked.includes(y.a.id);
        // Primeiro aparecem as conquistadas. Dentro de cada bloco, preserva a ordem
        // de dificuldade definida no config.js.
        if (xUnlocked !== yUnlocked) return xUnlocked ? -1 : 1;
        return x.difficultyNumber - y.difficultyNumber;
      });
    return `
      <div style="grid-column:1/-1;margin-top:10px">
        <div style="font-size:1rem;font-weight:800;margin-bottom:2px">${group.title}</div>
        <div class="muted" style="margin-bottom:7px">${group.subtitle}</div>
      </div>
      ${items.map(({ a, difficultyNumber }) => {
        const isUnlocked = unlocked.includes(a.id);
        return `<div class="achievementCard ${isUnlocked ? 'unlocked' : 'locked'}" title="${a.desc}">
          <span class="aLevel" aria-label="Dificuldade ${difficultyNumber}">${difficultyNumber}</span>
          <span class="aIcon">${a.icon}</span>
          <span class="aName">${a.name}</span>
          <span class="aDesc">${a.desc}</span>
          <span class="aStatus">${isUnlocked ? '✅ Desbloqueada' : '🔒 Bloqueada'}</span>
        </div>`;
      }).join('')}
    `;
  }).join('');
}
renderAchievementsGallery();
document.addEventListener('achievementUnlocked', renderAchievementsGallery);
document.querySelector('.tabBar')?.addEventListener('click', (e) => {
  if (e.target.closest('.tabBtn')?.dataset.tab === 'conquistas') renderAchievementsGallery();
});

// Atalhos de teclado remapeáveis (melhoria #1) — clica no botão, aperta a tecla nova
function shortcutKeyLabel(code) {
  return code ? code.replace('Key', '').replace('Arrow', '').replace('Digit', '') : '?';
}
const savedShortcuts = loadShortcuts();
if (savedShortcuts) Object.assign(state.shortcuts, savedShortcuts);
function updateShortcutButtons() {
  for (const action of Object.keys(state.shortcuts)) {
    const btn = document.querySelector(`.bindShortcut[data-action="${action}"]`);
    const span = btn?.querySelector('span');
    if (span) span.textContent = shortcutKeyLabel(state.shortcuts[action]);
  }
}
let listeningForShortcut = null;
document.querySelectorAll('.bindShortcut').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bindShortcut').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    btn.querySelector('span').textContent = 'Aperte uma tecla...';
    listeningForShortcut = btn.dataset.action;
  });
});
document.addEventListener('keydown', (e) => {
  if (!listeningForShortcut) return;
  e.preventDefault();
  state.shortcuts[listeningForShortcut] = e.code;
  saveShortcuts(state.shortcuts);
  listeningForShortcut = null;
  document.querySelectorAll('.bindShortcut').forEach((b) => b.classList.remove('active'));
  updateShortcutButtons();
});
updateShortcutButtons();

// Cursor personalizado (melhoria #5) — só faz sentido no PC (celular não tem cursor de
// mouse pra trocar), e a pessoa pode desligar se preferir a setinha normal
const CURSOR_KEY = 'snakeArenaCustomCursor';
function applyCustomCursor(on) {
  document.body.classList.toggle('customCursor', on && !isTouchDevice);
}
const cursorSaved = localStorage.getItem(CURSOR_KEY);
const cursorOn = cursorSaved === null ? true : cursorSaved === '1';
$('customCursorToggle').checked = cursorOn;
$('customCursorToggle').disabled = isTouchDevice;
if (isTouchDevice) $('customCursorToggle').closest('label').title = 'Cursor personalizado só faz sentido em aparelhos com mouse.';
applyCustomCursor(cursorOn);
$('customCursorToggle').addEventListener('change', (e) => {
  applyCustomCursor(e.target.checked);
  try { localStorage.setItem(CURSOR_KEY, e.target.checked ? '1' : '0'); } catch {}
});

// Janela flutuante / Picture-in-Picture (melhoria #7) — captura o canvas do jogo como
// um "vídeo ao vivo" e pede pro navegador abrir numa janelinha sempre visível por cima
$('pipBtn').addEventListener('click', async () => {
  if (!document.pictureInPictureEnabled) {
    alert('Seu navegador não suporta janela flutuante (Picture-in-Picture). Funciona bem no Chrome/Edge.');
    return;
  }
  try {
    const canvas = $('arenaCanvas');
    const video = $('pipVideo');
    if (!video.srcObject) {
      video.srcObject = canvas.captureStream(30); // 30 quadros por segundo é suficiente
      await video.play();
    }
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await video.requestPictureInPicture();
    }
  } catch {
    alert('Não consegui abrir a janela flutuante agora. Tenta de novo.');
  }
});

updateStatusBarColor(); // já deixa a barra de status combinando com o tema salvo/padrão

// No iPhone, o teclado que aparece pode cobrir o campo que a pessoa tá digitando —
// rola a tela suavemente pra manter o campo visível assim que o teclado sobe (melhoria #8)
document.addEventListener('focusin', (e) => {
  if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.target.type === 'range' || e.target.type === 'checkbox') return;
  setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
});

// Pedido de entrada na sala — mostra o nome de quem quer entrar e espera o anfitrião
// decidir. Se mais de um pedido chegar ao mesmo tempo, empilha e mostra um de cada vez.
const joinRequestQueue = [];
function showJoinApprovalPrompt(name, request) {
  joinRequestQueue.push({ name, request });
  if (joinRequestQueue.length === 1) displayNextJoinRequest();
}
// Texto do popup: em partida de Times, diz em qual time a pessoa quer jogar — e avisa se
// aquele lado já está cheio (aí ela vai pro outro)
function textoDoPedidoDeEntrada(pedido) {
  const base = `${pedido.name} quer entrar na sua sala`;
  if (!$('teamMode').checked) return `${base}. Aceitar?`;
  const pref = pedido.request.teamPref === 'other' ? 'other' : 'mine';
  const slot = pedido.request.slot;
  const prefs = Array.from({ length: slot + 1 }, (_, i) => (i === slot ? pref : (state.teamPrefs[i] === 'other' ? 'other' : 'mine')));
  const plano = planTeams({ sizeMine: state.teamSizeMine, sizeOther: state.teamSizeOther, prefs, hostTeam: state.teams[0] === 1 ? 1 : 0 });
  const lado = pref === 'other' ? 'no time ADVERSÁRIO ⚔️' : 'no SEU time 🤝';
  const aviso = plano.redirecionado[slot]
    ? ` Esse lado já está cheio — ${pedido.name} vai ficar ${pref === 'other' ? 'no seu time' : 'no time adversário'}.`
    : '';
  return `${base} e quer jogar ${lado}.${aviso} Aceitar?`;
}
function displayNextJoinRequest() {
  const next = joinRequestQueue[0];
  if (!next) { $('joinApprovalOverlay').classList.add('hidden'); return; }
  $('joinApprovalText').textContent = textoDoPedidoDeEntrada(next);
  $('joinApprovalOverlay').classList.remove('hidden');
  vibrate([30, 50, 30]);
  announce(`${next.name} pediu para entrar na sala.`);
}
$('joinApproveBtn').addEventListener('click', () => {
  const next = joinRequestQueue.shift();
  if (next) net.approveJoinRequest(next.request);
  displayNextJoinRequest();
});
$('joinRejectBtn').addEventListener('click', () => {
  const next = joinRequestQueue.shift();
  if (next) net.rejectJoinRequest(next.request);
  displayNextJoinRequest();
});

// Botão de diagnóstico — mostra/esconde o painel técnico sem precisar mexer na URL
$('diagToggleBtn').addEventListener('click', () => {
  $('diagPanel').classList.toggle('hidden');
  // Se a pessoa deixou aberto de propósito, não some sozinho; se fechou, também não reabre
  state.diagManual = !$('diagPanel').classList.contains('hidden');
  state.diagAutoShown = false;
});

// Recuperação de conexão travada (melhoria #10 + robustez) — se o cliente ficar muito
// tempo sem receber nenhum pacote do anfitrião durante uma partida ativa, primeiro avisa,
// e se continuar demorando ainda mais, força uma reconexão de verdade — é um problema
// conhecido do WebRTC/PeerJS onde um lado "trava" silenciosamente sem soltar erro nenhum,
// e recriar a conexão do zero costuma resolver.
let avisoInstavelMostrado = false;
let reconexaoForcadaTentada = false;
setInterval(() => {
  if (!net.isOnline() || net.isHost() || !state.running) return;

  // Dois jeitos de medir "há quanto tempo sem novidade": se já recebeu o primeiro
  // pacote alguma vez, mede a partir do ÚLTIMO recebido; se NUNCA recebeu nada (o
  // caso mais crítico, é o que a pessoa realmente reportou), mede a partir de quando
  // a contagem regressiva chegou (prova de que o anfitrião já tinha começado a mandar
  // coisa havia um tempo, então o "silêncio total" depois disso é bem suspeito).
  let semNoticias;
  if (state.receivedFirstState) {
    semNoticias = Date.now() - (state.debugLastStateAt || 0);
  } else if (state.debugCountdownRecebidoAt) {
    semNoticias = Date.now() - state.debugCountdownRecebidoAt;
  } else if (state.debugJoinedAt) {
    // Nem a contagem regressiva chegou ainda — pode ser só que o anfitrião ainda não
    // clicou em "Jogar" (normal, não é bug), então dá uma janela bem maior antes de
    // desconfiar de verdade que o canal travou completamente
    semNoticias = Date.now() - state.debugJoinedAt;
    if (semNoticias < 20000) return;
  } else {
    return;
  }

  if (semNoticias > 5000 && !avisoInstavelMostrado) {
    avisoInstavelMostrado = true;
    $('badge').textContent = '⚠️ Conexão instável — sem novidades do anfitrião há alguns segundos...';
  } else if (semNoticias < 3000 && avisoInstavelMostrado) {
    avisoInstavelMostrado = false;
    reconexaoForcadaTentada = false;
    $('badge').textContent = '🌐 ONLINE';
  }

  if (semNoticias > 10000 && !reconexaoForcadaTentada) {
    reconexaoForcadaTentada = true;
    $('badge').textContent = '🔄 Reconectando de verdade (a conexão travou sem avisar)...';
    net.forcarReconexaoPorDadosParados();
  }
}, 2000);
