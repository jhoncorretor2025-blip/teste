// O "coração" do jogo: nascer, resetar, iniciar partida e o tick (cada passo do jogo).

import { $ } from './utils.js';
import { SPEEDS, TURBO_FACTOR, BOOST_DURATION, BOOST_COOLDOWN, DIFFICULTY, MILESTONE_STEP, SPECIAL_MILESTONES, TOURNAMENT_ROUNDS, TOURNAMENT_ROUND_MS, HUNTER_MILESTONES, COLORS, BOARD_THEMES, MAP_SIZES } from './config.js';
import { state } from './state.js';
import { planTeams, unifyTeamColors } from './teams.js';
import { occupied, freeCell, ensureFoods, dropFood, dropOne, burst, wall, checkFoodConsolidation, updateFoodConsolidation } from './food.js';
import { aiDir, hunterDir } from './ai.js';
import { render } from './render_stable_341.js';
import { syncSettings, label } from './players.js';
import { startMission, trackFoodForMission, renderMission, trackEliminationForMission, trackDeathForMission, checkSurvivalMission } from './mission.js';
import { sfx } from './sound.js';
import { vibrate, announce, setVibrationEnabled } from './utils.js';
import { saveBest, saveBestByMode, addToLeaderboard, incrementGamesPlayed, GAME_MILESTONES, addPlaytime, incrementSessionGames, loadSessionGamesToday, loadTotalPlaytime, formatPlaytime, updateStreakAndLastPlayed, unlockAchievement, trackCumulativeProgress } from './storage_v4510.js';
import { isHost, isOnline, broadcastState, broadcastRaw, connectedCount, mySlot } from './net.js';
import { startProgressionChallenge, trackProgressionEvent, rewardFood, rewardMatchStart, rewardMilestone, claimStreakReward, awardLeagueRun, addLeaguePoints } from './progression.js';

let currentInterval = 160; // guarda o intervalo do tick atual, pra calcular chances por segundo direito
let clientReadyFallbackTimer = null;
let remoteProgressSnapshot = { alive:false, score:0, food:0, length:0, runStartedAt:0 }; // rede de segurança pra nunca deixar o cliente preso na tela de espera


// 🌟 Desafio das 50 comidas: uma inimiga exclusiva para cada Mioquinha que atingir 50.
const FIFTY_FEATURE_KEY = '__mioquinhaFiftyFoodFeature';
const fiftyFeature = globalThis[FIFTY_FEATURE_KEY] || {
  enemies: [],
  armed: Array(6).fill(true),
};
globalThis[FIFTY_FEATURE_KEY] = fiftyFeature;

const FIFTY_FOOD_THRESHOLD = 50;
const FIFTY_ENEMY_DURATION_MS = 20000;
const FIFTY_ENEMY_LENGTH = 12;
const FIFTY_ENEMY_SAFE_DISTANCE = 9;

function makeFiftyEnemyBody(head, dir, length = FIFTY_ENEMY_LENGTH) {
  const body = [];
  for (let k = 0; k < length; k++) {
    let x = head.x - dir.x * k;
    let y = head.y - dir.y * k;
    if (state.noWalls) {
      x = (x + state.mapW) % state.mapW;
      y = (y + state.mapH) % state.mapH;
    } else if (x < 0 || x >= state.mapW || y < 0 || y >= state.mapH) {
      return null;
    }
    body.push({ x, y });
  }
  return body;
}

function findSafeFiftyEnemySpawn(targetIndex) {
  const targetHead = state.snakes[targetIndex]?.[0];
  const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  let best = null;
  let bestScore = -1;

  for (let n = 0; n < 260; n++) {
    const p = {
      x: Math.floor(Math.random() * state.mapW),
      y: Math.floor(Math.random() * state.mapH),
    };

    const targetDist = targetHead
      ? Math.abs(p.x - targetHead.x) + Math.abs(p.y - targetHead.y)
      : Infinity;
    if (targetDist < FIFTY_ENEMY_SAFE_DISTANCE) continue;

    for (const dir of dirs) {
      const body = makeFiftyEnemyBody(p, dir);
      if (!body) continue;

      let minSnakeDistance = Infinity;
      for (const seg of body) {
        minSnakeDistance = Math.min(minSnakeDistance, minDistanceToSnakes(seg.x, seg.y));
      }

      const overlapsOtherEnemy = fiftyFeature.enemies.some(enemy =>
        enemy.snake?.some(seg => body.some(p2 => p2.x === seg.x && p2.y === seg.y))
      );
      if (overlapsOtherEnemy) continue;

      const score = Math.min(minSnakeDistance, targetDist);
      if (score > bestScore) {
        bestScore = score;
        best = { p, dir, body };
      }

      if (minSnakeDistance >= FIFTY_ENEMY_SAFE_DISTANCE && targetDist >= FIFTY_ENEMY_SAFE_DISTANCE) {
        return { p, dir, body };
      }
    }
  }

  return best;
}

function spawnFiftyEnemy(targetIndex) {
  const spawn = findSafeFiftyEnemySpawn(targetIndex);
  if (!spawn) return false;

  fiftyFeature.enemies = fiftyFeature.enemies.filter(enemy => enemy.target !== targetIndex);
  fiftyFeature.enemies.push({
    target: targetIndex,
    snake: spawn.body,
    dir: spawn.dir,
    endsAt: Date.now() + FIFTY_ENEMY_DURATION_MS,
  });

  const h = spawn.body[0];
  state.toast = {
    x: h.x,
    y: h.y,
    text: '☠️ Inimiga de 50 comidas para ' + (state.names[targetIndex] || 'Jogador ' + (targetIndex + 1)),
    color: '#ff4058',
    until: Date.now() + 2200,
  };
  sfx.hunterArrives();
  vibrate([35, 50, 35]);
  return true;
}

export function updateFiftyFoodEnemies() {
  if (isOnline() && !isHost()) return;

  const now = Date.now();
  if (!Array.isArray(fiftyFeature.enemies)) fiftyFeature.enemies = [];
  if (!Array.isArray(fiftyFeature.armed)) fiftyFeature.armed = Array(6).fill(true);

  // Cada slot é armado de novo quando cai abaixo de 50; ao atingir 50, dispara uma vez.
  for (let i = 0; i < state.count; i++) {
    const food = state.foodsEaten[i] || 0;

    if (food < FIFTY_FOOD_THRESHOLD) {
      fiftyFeature.armed[i] = true;
      continue;
    }

    const active = fiftyFeature.enemies.some(
      enemy => enemy.target === i && now < enemy.endsAt
    );

    if (fiftyFeature.armed[i] && !active && state.alive[i]) {
      if (spawnFiftyEnemy(i)) fiftyFeature.armed[i] = false;
    }
  }

  const next = [];

  for (const enemy of fiftyFeature.enemies) {
    const target = enemy.target;

    // Some aos 20 segundos ou quando o alvo morre.
    if (now >= enemy.endsAt || !state.alive[target] || !state.snakes[target]?.[0]) continue;

    const head = enemy.snake?.[0];
    const targetHead = state.snakes[target][0];
    if (!head || !targetHead) continue;

    enemy.dir = hunterDir(head, enemy.dir, targetHead);

    let nx = head.x + enemy.dir.x;
    let ny = head.y + enemy.dir.y;

    if (state.noWalls) {
      nx = (nx + state.mapW) % state.mapW;
      ny = (ny + state.mapH) % state.mapH;
    } else if (wall(nx, ny)) {
      const alternatives = [
        enemy.dir,
        { x: -enemy.dir.y, y: enemy.dir.x },
        { x: enemy.dir.y, y: -enemy.dir.x },
        { x: -enemy.dir.x, y: -enemy.dir.y },
      ];
      const choice = alternatives.find(d => !wall(head.x + d.x, head.y + d.y)) || enemy.dir;
      enemy.dir = choice;
      nx = head.x + enemy.dir.x;
      ny = head.y + enemy.dir.y;
      if (wall(nx, ny)) continue;
    }

    enemy.snake.unshift({ x: nx, y: ny });
    while (enemy.snake.length > FIFTY_ENEMY_LENGTH) enemy.snake.pop();

    if (enemy.snake.some(p => p.x === targetHead.x && p.y === targetHead.y)) {
      kill(target);
      continue;
    }

    next.push(enemy);
  }

  fiftyFeature.enemies = next;
}

// Acha uma célula livre e, de preferência, BEM longe de qualquer minhoca viva —
// evita o problema de nascer de novo já grudado num adversário e morrer na hora
// de novo (respawn injusto).
const SAFE_SPAWN_DISTANCE = 8;

function minDistanceToSnakes(x, y) {
  let min = Infinity;
  for (let j = 0; j < state.count; j++) {
    if (!state.alive[j] || !state.snakes[j]) continue;
    for (const seg of state.snakes[j]) {
      const d = Math.abs(seg.x - x) + Math.abs(seg.y - y);
      if (d < min) min = d;
    }
  }
  return min;
}

function findSafeSpawn(prefX, prefY) {
  let best = null, bestDist = -1;
  for (let n = 0; n < 60; n++) {
    const x = n === 0 ? prefX : Math.floor(Math.random() * state.mapW);
    const y = n === 0 ? prefY : Math.floor(Math.random() * state.mapH);
    if (occupied(x, y)) continue;
    const d = minDistanceToSnakes(x, y);
    if (d > bestDist) { bestDist = d; best = { x, y }; }
    if (d >= SAFE_SPAWN_DISTANCE) return { x, y }; // já achou um cantinho tranquilo o bastante
  }
  return best || freeCell();
}

// Coloca (ou recoloca) uma minhoca no tabuleiro em sua posição inicial
// Calcula pontos de nascimento espalhados pelo mapa, funciona pra qualquer quantidade
// de jogadores (1 a 6) — cada um nasce numa posição diferente ao redor de uma "elipse"
// dentro do tabuleiro, virado pro centro (assim ninguém já nasce indo direto pra parede).
function computeStartPoint(i, total, w, h) {
  const cx = w / 2, cy = h / 2;
  const rx = w * 0.36, ry = h * 0.36;
  const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
  const x = Math.round(cx + Math.cos(angle) * rx);
  const y = Math.round(cy + Math.sin(angle) * ry);
  const toCenterX = cx - x, toCenterY = cy - y;
  const dir = Math.abs(toCenterX) > Math.abs(toCenterY)
    ? { dx: Math.sign(toCenterX) || 1, dy: 0 }
    : { dx: 0, dy: Math.sign(toCenterY) || 1 };
  return { x, y, dx: dir.dx, dy: dir.dy };
}

function findSafePlayerSpawn(prefX, prefY, dx, dy) {
  let best = null, bestDistance = -1;

  for (let n = 0; n < 250; n++) {
    const x = n === 0 ? prefX : Math.floor(Math.random() * state.mapW);
    const y = n === 0 ? prefY : Math.floor(Math.random() * state.mapH);
    const body = [
      { x, y },
      { x: x - dx, y: y - dy },
      { x: x - 2 * dx, y: y - 2 * dy },
    ];

    if (body.some((p) => wall(p.x, p.y))) continue;

    let minDistance = Infinity;
    for (const seg of body) {
      minDistance = Math.min(minDistance, minDistanceToSnakes(seg.x, seg.y));
    }

    if (minDistance > bestDistance && body.every((p) => !occupied(p.x, p.y))) {
      bestDistance = minDistance;
      best = { x, y };
    }

    if (minDistance >= SAFE_SPAWN_DISTANCE && body.every((p) => !occupied(p.x, p.y))) {
      return { x, y };
    }
  }

  return best || findSafeSpawn(prefX, prefY);
}

export function spawn(i) {
  const w = state.mapW, h = state.mapH;
  const s = computeStartPoint(i, Math.max(state.count, i + 1), w, h);
  const p = findSafePlayerSpawn(s.x, s.y, s.dx, s.dy);
  state.snakes[i] = [{ x: p.x, y: p.y }, { x: p.x - s.dx, y: p.y - s.dy }, { x: p.x - 2 * s.dx, y: p.y - 2 * s.dy }];
  state.dirs[i] = { x: s.dx, y: s.dy };
  state.nextDirs[i] = { x: s.dx, y: s.dy };
  state.alive[i] = true;
  state.grow[i] = 0;
  state.respawnAt[i] = 0;
  state.boosting[i] = false;
  state.milestones[i] = 3; // já nasce com 3 partes, não conta como marco de crescimento
  state.spawnedAt[i] = Date.now();
  burst(p.x, p.y, state.colors[i], 14);
}

// Zera tudo e coloca todas as minhocas de volta no tabuleiro
// ("eliminations" e "best" NÃO são zerados aqui — eles são o histórico da sessão)
export function reset() {
  clearInterval(state.timer);
  state.snakes = []; state.alive = []; state.dirs = []; state.nextDirs = [];
  state.foods = [];
  state.scores = Array(6).fill(0);
  state.foodsEaten = Array(6).fill(0);
  state.starsCollected = Array(6).fill(0);
  state.grow = Array(6).fill(0);
  state.respawnAt = Array(6).fill(0);
  state.particles = [];
  state.shake = 0;
  state.hunterActive = false;
  state.hunterSnake = [];
  state.hunterStartedAt = 0;
  state.hunterMilestoneIndex = 0;
  state.hunterMoveTick = 0;
  state.secondPlaceBonusTarget = -1;
  state.secondPlaceBonusRemaining = 0;
  state.secondPlaceBonusCollected = 0;
  state.hunterBurstUntil = 0;
  state.hunterNextBurstAt = 0;
  state.hunterDistractedUntil = 0;
  state.hunterDistractedTarget = -1;
  state.hunterNearMiss = Array(6).fill(false);
  state.hunterCloseToAnyone = false;
  resetHunterZones();
  state.boostUsedCount = Array(6).fill(0);
  state.lastTurnAt = Array(6).fill(Date.now());
  fiftyFeature.enemies = [];
  fiftyFeature.armed = Array(6).fill(true);
  for (let i = 0; i < state.count; i++) spawn(i);
  ensureFoods();
  startMission();
}

// Chamado pelos botões "Jogar" e "Reiniciar"
// Atualiza o texto de "X partidas jogadas", com uma menção especial nos marcos (10, 25, 50...)
export function updateGamesPlayedBadge(n) {
  const box = $('gamesPlayedBadge');
  if (!box) return;
  const hit = GAME_MILESTONES.includes(n);
  box.textContent = `🎮 ${n} partida${n === 1 ? '' : 's'} jogada${n === 1 ? '' : 's'} neste aparelho` + (hit ? ' 🎉 Conquista desbloqueada!' : '');
  if (hit) document.dispatchEvent(new CustomEvent('achievementUnlocked', { detail: { n } }));
}

// Mostra "você jogou X vezes hoje" (separado do total histórico) e o tempo total jogado
export function updateSessionStatsDisplay(sessionCount) {
  const box = $('sessionStatsDisplay');
  if (!box) return;
  const totalTime = formatPlaytime(loadTotalPlaytime());
  box.textContent = `📅 ${sessionCount} partida${sessionCount === 1 ? '' : 's'} hoje • ⏱️ ${totalTime} jogados no total`;
}

// Troca de tela com uma leve transição suave, em vez de aparecer/sumir na hora
export function switchScreen(hideId, showId) {
  const hideEl = $(hideId), showEl = $(showId);
  hideEl.classList.add('fading');
  setTimeout(() => {
    hideEl.classList.add('hidden');
    hideEl.classList.remove('fading');
    showEl.classList.remove('hidden');
    showEl.classList.add('fading');
    requestAnimationFrame(() => requestAnimationFrame(() => showEl.classList.remove('fading')));
  }, 150);
}

// Soma tempo jogado a cada 3 segundos, só enquanto a partida está rodando de verdade —
// funciona mesmo se o navegador fechar sem avisar, já que vai salvando aos poucos
setInterval(() => {
  const contando = state.running && !state.paused && (!isOnline() || state.receivedFirstState) && (state.alive[mySlot] || !isOnline());
  if (contando) { addPlaytime(3000); updateSessionStatsDisplay(loadSessionGamesToday()); }
}, 3000);

// Salva e retoma a partida — pra quando o navegador fecha sem querer no meio do jogo.
// Só faz sentido no LOCAL (offline), já que uma sala online depende da conexão em tempo
// real com quem estava jogando junto, e essa conexão não existe mais depois de fechar.
const SAVE_KEY = 'snakeArenaSavedGame';
const SAVE_FIELDS = [
  'count', 'types', 'names', 'colors', 'heads', 'patterns', 'palettes', 'controls', 'trailColors',
  'mode', 'difficulty', 'mapW', 'mapH', 'mapSize', 'noWalls', 'theme', 'speed',
  'teamMode', 'teams', 'tournamentMode', 'tournamentRound', 'tournamentWins',
  'tournamentRoundScore', 'tournamentRoundEndsAt', 'zoom',
  'snakes', 'alive', 'dirs', 'nextDirs', 'foods', 'scores', 'foodsEaten', 'starsCollected', 'grow',
  'respawnAt', 'milestones', 'eliminations', 'boosting', 'boostUsedCount', 'mission',
  'hunterActive', 'hunterSnake', 'hunterDir', 'hunterEndsAt', 'hunterMilestoneIndex', 'hunterStartedAt',
  'hunterZones', 'hunterZoneCompleted', 'hunterZoneProgress', 'hunterZoneCurrent', 'hunterZoneEnteredAt', 'hunterZoneHoldProgress',
  'secondPlaceBonusTarget', 'secondPlaceBonusRemaining', 'secondPlaceBonusCollected',
];

function snapshotGameState() {
  if (isOnline()) return; // online nunca salva — a sala já não existiria mais depois
  if (!state.running) return;
  const snap = { ts: Date.now() };
  for (const key of SAVE_FIELDS) snap[key] = state[key];
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); } catch {}
}

export function loadSavedGame() {
  try {
    const snap = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!snap) return null;
    if (Date.now() - snap.ts > 30 * 60 * 1000) { clearSavedGame(); return null; } // mais de 30min, descarta
    return snap;
  } catch { return null; }
}

export function clearSavedGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}

setInterval(snapshotGameState, 3000);

// Retoma uma partida salva — não passa pela contagem regressiva, já entra direto de
// onde parou, com o jogo já rodando
export function resumeSavedGame(snap) {
  for (const key of SAVE_FIELDS) if (key in snap) state[key] = snap[key];
  switchScreen('menu', 'game');
  $('overlay').classList.add('hidden');
  $('badge').textContent = (state.mode === 'turbo' ? '⚡ TURBO WORMS' : '🏆 CLÁSSICO') + (state.noWalls ? ' 🌀' : '');
  const spd = SPEEDS.find((s) => s.value === state.speed) || SPEEDS[1];
  // Assistência mobile: em telas de toque, damos 15% mais tempo entre passos.
  // Isso melhora a janela para virar sem alterar a velocidade escolhida no PC.
  const mobileAssist = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)')?.matches;
  const baseInterval = state.mode === 'turbo' ? Math.round(spd.tick * TURBO_FACTOR) : spd.tick;
  currentInterval = mobileAssist ? Math.round(baseInterval * 1.15) : baseInterval;
  state.paused = false;
  state.running = true;
  render();
  setTimeout(render, 250); // mesma proteção do startClientGame — corrige o canvas depois da transição de tela
  state.timer = setInterval(tick, currentInterval);
}

export function startGame() {
  syncSettings();
  setVibrationEnabled(state.vibrationOn);
  const totalGames = incrementGamesPlayed();
  updateGamesPlayedBadge(totalGames);
  if (totalGames >= 5) announceAchievement(unlockAchievement('games_5'));
  if (totalGames >= 10) announceAchievement(unlockAchievement('games_10'));
  if (totalGames >= 50) announceAchievement(unlockAchievement('games_50'));
  updateSessionStatsDisplay(incrementSessionGames());
  const streakInfo = updateStreakAndLastPlayed();
  window.__mioquinhaStreak = streakInfo.streak;
  claimStreakReward(streakInfo.streak);
  if (streakInfo.streak >= 7) announceAchievement(unlockAchievement('streak_7'));
  clearSavedGame();

  announceAchievement(unlockAchievement('first_game'));
  if (state.noWalls) announceAchievement(unlockAchievement('no_walls'));
  if (state.hunterConfig?.enabled !== false) announceAchievement(unlockAchievement('hunter_accept'));
  announceAchievements(trackCumulativeProgress('themesUsed', state.theme));
  announceAchievements(trackCumulativeProgress('headsUsed', state.heads[0]));
  if (isOnline()) {
    announceAchievement(unlockAchievement('social'));
    announceAchievement(unlockAchievement('online_first'));
    announceAchievements(trackCumulativeProgress('onlineGames', 1));
    if (state.count >= 3) announceAchievement(unlockAchievement('online_trio'));
    if (state.count >= 6) announceAchievement(unlockAchievement('online_full_room'));
    if (state.teamMode) announceAchievement(unlockAchievement('online_team'));
  }

  reset();
  rewardMatchStart();
  startProgressionChallenge();
  // Aviso do tamanho do mapa logo que a partida começa — trocar de mapa quase não muda o que
  // se vê na tela (a câmera mostra sempre uma "janelinha"), então o jogo avisa qual é o mapa
  const NOME_DO_MAPA = { small: 'Pequeno', medium: 'Médio', large: 'Grande' };
  const cabecaInicial = state.snakes[mySlot]?.[0];
  if (cabecaInicial) {
    state.toast = { x: cabecaInicial.x, y: cabecaInicial.y, text: `🗺️ Mapa ${NOME_DO_MAPA[state.mapSize] || ''} — ${state.mapW}×${state.mapH}`, color: '#8fd3ff', until: Date.now() + 5200 };
  }
  switchScreen('menu', 'game');
  $('overlay').classList.add('hidden');
  $('badge').textContent = (state.mode === 'turbo' ? '⚡ TURBO WORMS' : '🏆 CLÁSSICO') + (state.noWalls ? ' 🌀' : '');
  state.running = false;
  state.paused = false;

  // Modo Torneio: zera tudo e começa na rodada 1 — o cronômetro da rodada só liga
  // depois da contagem regressiva, senão a primeira rodada perderia uns segundos à toa
  if (state.tournamentMode) {
    state.tournamentRound = 1;
    state.tournamentWins = Array(6).fill(0);
    state.tournamentRoundScore = Array(6).fill(0);
    state.tournamentChampion = null;
  }

  render();
  // A velocidade escolhida no menu define o ritmo base; o Turbo Worms roda mais rápido ainda
  const spd = SPEEDS.find(s => s.value === state.speed) || SPEEDS[1];
  // Assistência mobile: em telas de toque, damos 15% mais tempo entre passos.
  // Isso melhora a janela para virar sem alterar a velocidade escolhida no PC.
  const mobileAssist = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)')?.matches;
  const baseInterval = state.mode === 'turbo' ? Math.round(spd.tick * TURBO_FACTOR) : spd.tick;
  currentInterval = mobileAssist ? Math.round(baseInterval * 1.15) : baseInterval;

  // Contagem regressiva "3, 2, 1, VAI!" antes de começar de verdade — melhoria visual #8
  runCountdown(3, () => {
    state.running = true;
    if (state.tournamentMode) state.tournamentRoundEndsAt = Date.now() + TOURNAMENT_ROUND_MS;
    // Dados que quase nunca mudam durante a partida (cor, nome, cabeça, tema, tamanho do
    // mapa etc.) — mandados uma vez só aqui, separado do pacote frequente de cada instante,
    // pra manter os pacotes de cada tick bem menores (e mais confiáveis em mapas grandes)
    if (isHost()) {
      broadcastRaw({
        type: 'state',
        colors: state.colors, names: state.names, heads: state.heads,
        patterns: state.patterns, palettes: state.palettes, trailColors: state.trailColors,
        mapW: state.mapW, mapH: state.mapH, theme: state.theme,
        teamMode: state.teamMode, teams: state.teams,
      });
    }
    state.timer = setInterval(tick, currentInterval);
  });
}

function runCountdown(n, done) {
  $('countdownOverlay').classList.remove('hidden');
  $('countdownText').textContent = n > 0 ? String(n) : 'VAI! 🚀';
  if (isHost()) broadcastRaw({ type: 'countdown', n });

  if (n <= 0) {
    announce('Partida começou!');
    setTimeout(() => { $('countdownOverlay').classList.add('hidden'); done(); }, 500);
    return;
  }
  setTimeout(() => runCountdown(n - 1, done), 700);
}

// Ativa o turbo de uma minhoca. Agora custa 1 "comidinha" (melhoria #2) — sem comida no bucho, sem turbo.
export function tryBoost(i) {
  const now = Date.now();
  if (!state.alive[i] || state.boosting[i] || now < state.boostReadyAt[i]) return false;
  if (state.foodsEaten[i] < 1) {
    // Sem "combustível" — dá um aviso claro, senão parece que apertar o botão não fez nada
    const h = state.snakes[i]?.[0];
    if (h) state.toast = { x: h.x, y: h.y, text: '🚫 Sem combustível! Coma mais.', color: '#ff5577', until: Date.now() + 1000 };
    if (i === mySlot) vibrate([15, 40, 15]);
    return false;
  }

  state.foodsEaten[i]--;
  state.scores[i] = Math.max(0, state.scores[i] - 1);
  const h = state.snakes[i][0];
  dropOne(h.x, h.y, i);

  state.boosting[i] = true;
  state.boostUsedCount[i] = (state.boostUsedCount[i] || 0) + 1;
  if (i === mySlot) {
    if (state.boostUsedCount[i] >= 1) announceAchievement(unlockAchievement('boost_first'));
    if (state.boostUsedCount[i] >= 10) announceAchievement(unlockAchievement('boost_10'));
  }
  state.boostUntil[i] = now + BOOST_DURATION;
  state.boostReadyAt[i] = now + BOOST_COOLDOWN;
  state.boostReadySoundPlayed[i] = false;
  sfx.boost();
  vibrate(15);
  return true;
}

// Mata uma minhoca: derrama comida, faz explosão, som/vibração e guarda o recorde
export function kill(i, killer = -1) {
  trackDeathForMission(i);
  if (state.hunterActive) state.hunterVictims.add(i);
  if (i === mySlot) {
    const runScore = state.scores[i] || 0;
    const runLength = state.snakes[i]?.length || 0;
    const survivedSec = Math.floor((Date.now() - (state.spawnedAt[i] || Date.now())) / 1000);
    awardLeagueRun({ score: runScore, length: runLength, survivedSec });
  }
  saveBest(state.scores[i]);
  saveBestByMode(state.mode, state.tournamentMode, state.scores[i]);
  state.best = Math.max(state.best, state.scores[i]);
  if (state.types[i] === 'human') addToLeaderboard(state.names[i], state.scores[i], survivedSec * 1000);
  dropFood(i);
  const h = state.snakes[i]?.[0];
  if (h) burst(h.x, h.y, state.colors[i], 24);
  state.shake = 7;
  state.flash = 6; // clarão vermelho — melhoria visual #4
  state.snakes[i] = [];
  state.alive[i] = false;
  state.scores[i] = 0;
  state.foodsEaten[i] = 0;
  state.grow[i] = 0;
  fiftyFeature.armed[i] = true;
  fiftyFeature.enemies = fiftyFeature.enemies.filter(enemy => enemy.target !== i);
  state.boosting[i] = false;
  state.comboCount[i] = 0;
  state.respawnAt[i] = Date.now() + 900;
  sfx.death();
  vibrate([80, 40, 160]); // padrão de "derrota" — dois toques curtos e um mais longo
  if (killer >= 0 && killer < state.count) {
    const killerName = state.names[killer] || `Jogador ${killer + 1}`;
    const victimName = state.names[i] || `Jogador ${i + 1}`;
    state.toast = { x: h?.x ?? Math.floor(state.mapW/2), y: h?.y ?? Math.floor(state.mapH/2), text: `💥 ${killerName} eliminou ${victimName}!`, color: state.colors[killer] || '#ffd24d', until: Date.now()+2200 };
  }
  if (i === mySlot) {
    state.deathMessage = { text: '💀 Você morreu!', until: Date.now() + 1400 };
  }
}

function updateParticles() {
  state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life--; });
  state.particles = state.particles.filter(p => p.life > 0);
}

// Move e checa colisão para a lista de índices dada. Usado 1x por tick para todo mundo,
// e mais 1x só para quem estiver turbinando (assim eles andam 2 casas naquele tick).
function stepMovement(indices) {
  const heads = {};
  indices.forEach(i => {
    let nx = state.snakes[i][0].x + state.dirs[i].x;
    let ny = state.snakes[i][0].y + state.dirs[i].y;
    if (state.noWalls) { nx = (nx + state.mapW) % state.mapW; ny = (ny + state.mapH) % state.mapH; } // teleporta pro outro lado
    heads[i] = { x: nx, y: ny };
  });

  const die = {};
  indices.forEach(i => {
    const h = heads[i];
    if (wall(h.x, h.y)) { die[i] = -1; return; }
    for (let j = 0; j < state.count; j++) {
      if (j === i || !state.alive[j]) continue;
      if (state.teamMode && state.teams[i] === state.teams[j]) continue; // aliados não se eliminam
      if (state.snakes[j].some(p => p.x === h.x && p.y === h.y)) { die[i] = j; return; }
    }
  });

  indices.forEach(i => {
    if (i in die) {
      if (die[i] >= 0) {
        state.eliminations[die[i]] = (state.eliminations[die[i]] || 0) + 1;
        trackEliminationForMission(die[i]);
        if (die[i] === mySlot && state.eliminations[die[i]] >= 3) announceAchievement(unlockAchievement('eliminator'));
        if (isOnline() && die[i] === mySlot && state.eliminations[die[i]] >= 1) announceAchievement(unlockAchievement('online_kill_1'));
        if (isOnline() && die[i] === mySlot && state.eliminations[die[i]] >= 3) announceAchievement(unlockAchievement('online_kill_3'));
        if (die[i] === mySlot && state.eliminations[die[i]] >= 5) announceAchievement(unlockAchievement('eliminator_5'));
        if (die[i] === mySlot && state.eliminations[die[i]] >= 10) announceAchievement(unlockAchievement('eliminator_10'));
      }
      kill(i, die[i]);
      return;
    }
    const h = heads[i];
    state.snakes[i].unshift(h);
    const candidato = state.foods.find(q => q.x === h.x && q.y === h.y);
    const f = candidato && (candidato.kind !== 'secondPlace' || candidato.target === i) ? candidato : null;
    if (f) {
      // Combo de velocidade: comer rápido e seguido dá pontos extras, que vão subindo
      const eatNow = Date.now();
      state.comboCount[i] = (eatNow - (state.lastEatAt[i] || 0) < 2200) ? (state.comboCount[i] || 0) + 1 : 1;
      state.lastEatAt[i] = eatNow;
      const combo = state.comboCount[i];
      const comboBonus = combo >= 3 ? Math.min(5, combo - 2) : 0;
      if (i === mySlot) {
        rewardFood(f.value, combo);
        trackProgressionEvent('foods', f.value);
        trackProgressionEvent('combo', combo);
        trackProgressionEvent('score', state.scores[i] + f.value + comboBonus);
      }

      state.scores[i] += f.value + comboBonus;
      state.foodsEaten[i] += f.value;
      state.grow[i] += f.value;
      if (state.tournamentMode) state.tournamentRoundScore[i] += f.value + comboBonus;
      state.foods.splice(state.foods.indexOf(f), 1);
      const corComida = f.kind === 'bonus' ? '#ffd24d' : f.kind === 'streak' ? '#c084fc' : state.colors[i];
      burst(h.x, h.y, corComida, f.kind === 'bonus' || f.kind === 'streak' ? 24 : 12);
      sfx[f.kind === 'bonus' ? 'star' : f.kind === 'streak' ? 'star' : f.kind === 'drop' ? 'drop' : 'eat']();
      if (f.kind === 'bonus' || f.kind === 'streak') vibrate(f.kind === 'streak' ? [15, 30, 15] : 20);
      else vibrate(8);
      if (comboBonus > 0) {
        state.toast = { x: h.x, y: h.y, text: `🔥 Combo x${combo}! +${comboBonus}`, color: '#ff9f4d', until: Date.now() + 900 };
      } else if (f.kind === 'streak') {
        state.toast = { x: h.x, y: h.y, text: `👑 Bônus de sequência! +${f.value}`, color: '#c084fc', until: Date.now() + 1200 };
      }
      state.floatingScores.push({
        x: h.x, y: h.y, text: `+${f.value + comboBonus}`,
        color: corComida,
        bornAt: Date.now(),
      });
      trackFoodForMission(i, f);

      // Conquistas — só rastreadas pra VOCÊ (mySlot), já que são do seu aparelho
      if (i === mySlot) {
        announceAchievement(unlockAchievement('first_food'));
        announceAchievements(trackCumulativeProgress('totalFoods', f.value));
        if (f.kind === 'bonus') {
          state.starsCollected[i] = (state.starsCollected[i] || 0) + 1;
          announceAchievement(unlockAchievement('first_star'));
          announceAchievements(trackCumulativeProgress('totalStars', 1));
          if (state.starsCollected[i] >= 10) announceAchievement(unlockAchievement('star_10'));
        }
        if (f.kind === 'secondPlace') {
          state.secondPlaceBonusCollected = (state.secondPlaceBonusCollected || 0) + 1;
          if (state.secondPlaceBonusCollected >= 5) announceAchievement(unlockAchievement('second_bonus_5'));
        }
        if (combo >= 5) announceAchievement(unlockAchievement('combo_master'));
        if (combo >= 10) announceAchievement(unlockAchievement('combo_10'));
        if (isOnline()) announceAchievement(unlockAchievement('online_first_food'));
        if (state.foodsEaten[i] >= 20) announceAchievement(unlockAchievement('food_20'));
        if (isOnline() && state.foodsEaten[i] >= 25) announceAchievement(unlockAchievement('online_food_25'));
        if (state.foodsEaten[i] >= 25) announceAchievement(unlockAchievement('food_25'));
        if (state.scores[i] >= 25) announceAchievement(unlockAchievement('score_25'));
        if (state.scores[i] >= 50) announceAchievement(unlockAchievement('score_50'));
        if (state.scores[i] >= 100) announceAchievement(unlockAchievement('century'));
        if (isOnline() && state.scores[i] >= 100) announceAchievement(unlockAchievement('online_score_100'));
        if (state.scores[i] >= 250) announceAchievement(unlockAchievement('score_250'));
        if (state.scores[i] >= 350) announceAchievement(unlockAchievement('score_350'));
        if (state.scores[i] >= 500) announceAchievement(unlockAchievement('score_500'));
        if (isOnline() && state.scores[i] >= 500) announceAchievement(unlockAchievement('online_score_500'));
        if (state.scores[i] >= 1000) announceAchievement(unlockAchievement('score_1000'));
        if (state.scores[i] >= 1500) announceAchievement(unlockAchievement('score_1500'));
      }
    }
    if (state.grow[i] > 0) state.grow[i]--;
    else state.snakes[i].pop();

    // Marco de crescimento (10, 20, 30...) — os marcos especiais (20/50/100) ganham uma festa maior
    const len = state.snakes[i].length;
    if (len >= state.milestones[i] + MILESTONE_STEP) {
      state.milestones[i] = Math.floor(len / MILESTONE_STEP) * MILESTONE_STEP;
      const special = SPECIAL_MILESTONES.find(m => m.at === state.milestones[i]);
      if (i === mySlot) rewardMilestone();
      if (special) {
        burst(h.x, h.y, special.color, 46);
        sfx.mission(); sfx.mission(); // dobro de som pra dar mais destaque
        vibrate([30, 60, 30, 60, 40]);
        state.toast = { x: h.x, y: h.y, text: special.text, color: special.color, until: Date.now() + 2000 };
      } else {
        burst(h.x, h.y, '#ffd24d', 26);
        sfx.mission();
        vibrate(25);
        state.toast = { x: h.x, y: h.y, text: `✨ ${state.milestones[i]}!`, color: state.colors[i], until: Date.now() + 1200 };
      }
    }
  });
}

// Fecha a rodada atual do Modo Torneio: descobre quem fez mais pontos NESSA rodada,
// dá o ponto de rodada vencida pra essa pessoa, e ou começa a próxima rodada ou,
// se já foi a última (melhor de 3), encerra o torneio e mostra o campeão geral.
function endTournamentRound() {
  let winner = 0;
  for (let i = 1; i < state.count; i++) {
    if (state.tournamentRoundScore[i] > state.tournamentRoundScore[winner]) winner = i;
  }
  state.tournamentWins[winner] = (state.tournamentWins[winner] || 0) + 1;
  if (winner === mySlot && state.tournamentWins[winner] >= 3) announceAchievement(unlockAchievement('tournament_3wins'));
  const roundJustEnded = state.tournamentRound;

  if (roundJustEnded >= TOURNAMENT_ROUNDS) {
    let champion = 0;
    for (let i = 1; i < state.count; i++) {
      if (state.tournamentWins[i] > state.tournamentWins[champion]) champion = i;
    }
    state.tournamentChampion = champion;
    if (champion === mySlot) announceAchievement(unlockAchievement('tournament_champion'));
    if (isOnline() && champion === mySlot) {
      announceAchievement(unlockAchievement('online_champion'));
    }
    state.running = false;
    clearSavedGame();
    render();
    const result = {
      champion,
      wins: [...state.tournamentWins].slice(0, state.count),
      scores: [...state.scores].slice(0, state.count),
      foodsEaten: [...state.foodsEaten].slice(0, state.count),
      eliminations: [...state.eliminations].slice(0, state.count),
      teams: [...state.teams].slice(0, state.count),
      teamMode: !!state.teamMode,
      names: [...state.names].slice(0, state.count),
    };
    if (isHost()) broadcastRaw({ type: 'onlineMatchResult', result });
    if (!isOnline()) addLeaguePoints(champion === mySlot ? 25 : 8, 'resultado do torneio');
    document.dispatchEvent(new CustomEvent('tournamentOver', { detail: result }));
    return;
  }

  state.toast = {
    x: Math.floor(state.mapW / 2), y: Math.floor(state.mapH / 2),
    text: `🏁 Rodada ${roundJustEnded} vencida por ${label(winner)}!`,
    color: state.colors[winner], until: Date.now() + 2200,
  };
  state.tournamentRound++;
  state.tournamentRoundScore = Array(6).fill(0);
  state.tournamentRoundEndsAt = Date.now() + TOURNAMENT_ROUND_MS;
  for (let i = 0; i < state.count; i++) spawn(i);
}

// Um "passo" do jogo: decide direções, move todo mundo, checa colisões, come comida, redesenha
// Acha quem tá comendo mais nessa partida agora (só entre quem tá vivo) — é quem a
// Minhoca Caçadora persegue. Comida reseta quando morre, então precisa tá numa sequência
// boa sem morrer pra "merecer" a visita dela.
// Avisa na tela quando uma conquista da galeria é desbloqueada — reaproveita o mesmo
// popup que já existia pros marcos de "partidas jogadas"
function announceAchievement(achievement) {
  if (!achievement) return;
  document.dispatchEvent(new CustomEvent('achievementUnlocked', { detail: achievement }));
}
function announceAchievements(list) {
  (list || []).forEach((a, idx) => setTimeout(() => announceAchievement(a), idx * 3400));
}

function findFoodLeader() {
  let leaderFood = -1, leaderIdx = -1;
  for (let i = 0; i < state.count; i++) {
    if (state.alive[i] && state.foodsEaten[i] > leaderFood) { leaderFood = state.foodsEaten[i]; leaderIdx = i; }
  }
  return { leaderIdx, leaderFood };
}

// Bônus do 2º lugar:
// quando o segundo colocado já comeu MAIS DE 25 comidas, ele recebe uma sequência de
// 5 comidas especiais valendo 10 pontos cada. Só uma aparece por vez e cada uma nasce
// perto da minhoca que está em 2º lugar naquele momento.
const SEGUNDO_LUGAR_MIN_COMIDAS = 25;
const SEGUNDO_LUGAR_TOTAL_BONUS = 5;
const SEGUNDO_LUGAR_RAIO_COMIDA = 7;

function findFoodSecondPlace() {
  const ranking = [];
  for (let i = 0; i < state.count; i++) {
    if (!state.alive[i]) continue;
    ranking.push({ i, food: state.foodsEaten[i] || 0 });
  }
  ranking.sort((x, y) => y.food - x.food);
  const second = ranking[1];
  return {
    leaderIdx: ranking[0]?.i ?? -1,
    leaderFood: ranking[0]?.food ?? -1,
    secondIdx: second?.i ?? -1,
    secondFood: second?.food ?? -1,
  };
}

function findFoodNearPlayer(i, radius = SEGUNDO_LUGAR_RAIO_COMIDA) {
  const head = state.snakes[i]?.[0];
  if (!head) return freeCell();

  // Primeiro tenta posições próximas da cabeça. Assim o bônus realmente fica "perto dela".
  for (let n = 0; n < 250; n++) {
    const dx = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
    const dy = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
    if (Math.abs(dx) + Math.abs(dy) > radius) continue;
    const x = head.x + dx, y = head.y + dy;
    if (wall(x, y) || occupied(x, y)) continue;
    return { x, y };
  }
  return freeCell();
}

function clearSecondPlaceBonusFoods() {
  state.foods = state.foods.filter((f) => f.kind !== 'secondPlace');
}

// Executado pelo anfitrião. O bônus fica preso ao jogador que realmente está em 2º lugar.
// Quando uma das 5 comidas é comida, no próximo tick nasce a próxima, novamente perto dele.
function updateSecondPlaceBonusFood() {
  // No jogo local o aparelho é a autoridade; no online apenas o anfitrião pode criar a comida.
  if (isOnline() && !isHost()) return;

  const { secondIdx, secondFood } = findFoodSecondPlace();

  if (secondIdx === -1 || secondFood <= SEGUNDO_LUGAR_MIN_COMIDAS) {
    if (state.secondPlaceBonusTarget !== -1) clearSecondPlaceBonusFoods();
    state.secondPlaceBonusTarget = -1;
    state.secondPlaceBonusRemaining = 0;
    return;
  }

  // Mudou quem está em 2º: encerra a sequência antiga e começa uma nova para o novo 2º.
  if (state.secondPlaceBonusTarget !== secondIdx) {
    clearSecondPlaceBonusFoods();
    state.secondPlaceBonusTarget = secondIdx;
    state.secondPlaceBonusRemaining = SEGUNDO_LUGAR_TOTAL_BONUS;
  }

  if (state.secondPlaceBonusRemaining <= 0) return;

  const jaExiste = state.foods.some(
    (f) => f.kind === 'secondPlace' && f.target === secondIdx
  );
  if (jaExiste) return;

  const p = findFoodNearPlayer(secondIdx);
  state.foods.push({
    x: p.x,
    y: p.y,
    kind: 'secondPlace',
    value: 10,
    target: secondIdx,
  });
  state.secondPlaceBonusRemaining--;

  const h = state.snakes[secondIdx]?.[0];
  if (h) {
    state.toast = {
      x: h.x,
      y: h.y,
      text: '💎 Bônus do 2º lugar! +10',
      color: '#63e6ff',
      until: Date.now() + 1800,
    };
  }
}

// Confere se é hora de fazer a Minhoca Caçadora aparecer — só uma checagem simples de
// "o líder já comeu o suficiente pro próximo marco?"
function hunterBehaviorForAppearance(appearance, cfg = {}) {
  const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const base = {
    moveEveryTicks: 1,
    burstEnabled: true,
    burstSteps: 2,
    burstDurationSec: Math.max(0.5, number(cfg.burstDurationSec, 1.5)),
    burstIntervalSec: Math.max(1, number(cfg.burstIntervalSec, 12)),
    distractionRadius: Math.max(1, number(cfg.distractionRadius, 4)),
    predictionSteps: Math.max(0, number(cfg.predictionSteps, 1)),
    growthPerVictim: Math.max(0, number(cfg.growthPerVictim, 2)),
    bodyLength: Math.max(10, number(cfg.bodyLength, 35)),
  };

  if (cfg.progressiveDifficulty !== false && appearance <= 4) {
    return {
      ...base,
      moveEveryTicks: 2,
      burstEnabled: false,
      burstSteps: 1,
      burstDurationSec: 0,
      burstIntervalSec: 999999,
      distractionRadius: 1,
      predictionSteps: 0,
      growthPerVictim: 0,
      bodyLength: Math.min(base.bodyLength, 25),
    };
  }
  return base;
}

// Confere se é hora de fazer a Minhoca Caçadora aparecer — os cinco marcos padrão são
// 100, 150, 200, 250 e 300 alimentos.
function checkHunterSpawn() {
  if (state.hunterActive) return;
  if (state.hunterMilestoneIndex >= (state.hunterConfig?.milestones?.length || HUNTER_MILESTONES.length)) return;
  const hunterCfg = state.hunterConfig || { enabled: true, milestones: HUNTER_MILESTONES };
  if (hunterCfg.enabled === false) return;
  const milestone = hunterCfg.milestones[state.hunterMilestoneIndex] || HUNTER_MILESTONES[state.hunterMilestoneIndex];
  const { leaderIdx, leaderFood } = findFoodLeader();
  if (leaderIdx === -1 || leaderFood < milestone.foodThreshold) return;
  const appearance = state.hunterMilestoneIndex + 1;
  spawnHunter(milestone.durationSec, appearance);
  state.hunterMilestoneIndex++;
}

// Monta o corpo inicial da Minhoca Caçadora (50 partes) a partir da posição da cabeça.
// Percorre o mapa em zigue-zague, linha por linha, então cada parte é vizinha da anterior.
// O corpo ocupa umas 3 linhas, e vai SEMPRE pro lado do mapa que tem mais espaço (sobe se a
// cabeça nasceu embaixo, desce se nasceu em cima) — antes ele "dava a volta" pelo outro
// lado do mapa e a cauda reaparecia lá no topo, teletransportada, quebrando o corpo.
export function montarCorpoDaCacadora(p, mapW, mapH, tamanho = 50) {
  const total = Math.min(tamanho, mapW * mapH);
  const sentidoVertical = p.y >= mapH / 2 ? -1 : 1;
  const corpo = [];
  for (let passo = 0; passo < total; passo++) {
    const linhaRelativa = Math.floor((p.x + passo) / mapW);
    const indiceNaLinha = (p.x + passo) % mapW;
    // linhas "pares" andam pra direita, "ímpares" pra esquerda: sem pulos entre uma e outra
    const coluna = linhaRelativa % 2 === 0 ? indiceNaLinha : mapW - 1 - indiceNaLinha;
    const linha = Math.max(0, Math.min(mapH - 1, p.y + sentidoVertical * linhaRelativa));
    corpo.push({ x: coluna, y: linha });
  }
  return corpo;
}

const SAFE_HUNTER_DISTANCE = 7;

function findSafeHunterSpawn(bodyLength) {
  let best = null;
  let bestDistance = -1;

  // A cabeça e, principalmente, o corpo inteiro precisam nascer afastados das cobrinhas.
  // Testamos muitas posições e guardamos também a melhor encontrada como fallback.
  for (let n = 0; n < 300; n++) {
    const p = {
      x: Math.floor(Math.random() * state.mapW),
      y: Math.floor(Math.random() * state.mapH),
    };
    const body = montarCorpoDaCacadora(p, state.mapW, state.mapH, bodyLength);
    let minDistance = Infinity;
    for (const seg of body) {
      minDistance = Math.min(minDistance, minDistanceToSnakes(seg.x, seg.y));
    }
    if (minDistance > bestDistance) best = { p, body, distance: minDistance };
    if (minDistance >= SAFE_HUNTER_DISTANCE) return { p, body };
  }

  return best ? { p: best.p, body: best.body } : {
    p: freeCell(),
    body: montarCorpoDaCacadora({ x: 2, y: 2 }, state.mapW, state.mapH, bodyLength),
  };
}

function spawnHunter(durationSec, appearance = 1) {
  const hunterCfg = state.hunterConfig || {};
  const behavior = hunterBehaviorForAppearance(appearance, hunterCfg);
  const bodyLength = behavior.bodyLength;
  const spawn = findSafeHunterSpawn(bodyLength);
  const p = spawn.p;
  state.hunterVictims = new Set();
  // A Minhoca Caçadora nasce bem grande (50 partes) — bem mais ameaçadora de se ver chegando
  const corpo = spawn.body;
  state.hunterSnake = corpo;
  state.hunterDir = { x: 1, y: 0 };
  state.hunterActive = true;
  state.hunterStartedAt = Date.now();
  state.hunterEndsAt = Date.now() + durationSec * 1000;
  state.hunterMoveTick = 0;
  state.hunterBurstUntil = 0;
  state.hunterNextBurstAt = behavior.burstEnabled ? Date.now() + 5000 : 0; // quatro primeiras sem rajada
  state.hunterDistractedUntil = 0;
  state.hunterDistractedTarget = -1;
  state.hunterNearMiss = Array(6).fill(false);
  state.hunterZones = createHunterZones();
  state.hunterZoneCompleted = [false, false, false];
  state.hunterZoneProgress = 0;
  state.hunterZoneCurrent = -1;
  state.hunterZoneEnteredAt = 0;
  state.hunterZoneHoldProgress = 0;
  state.toast = { x: p.x, y: p.y, text: '☠️ Minhoca Caçadora apareceu!', color: '#ff2222', until: Date.now() + 2800 };
  sfx.hunterArrives();
  vibrate([40, 60, 40, 60, 40]);
}

// Move a Minhoca Caçadora um passo em direção a quem tá liderando agora (o alvo pode
// mudar no meio da perseguição, se outra pessoa assumir a liderança), e mata quem tocar
const RAIO_DISTRACAO = 6; // valores padrão; a aba de configuração pode sobrescrever
const DURACAO_DISTRACAO_MS = 3000;
const DURACAO_RAJADA_MS = 2500;
const INTERVALO_ENTRE_RAJADAS_MS = 8000;

const HUNTER_ZONE_COUNT = 3;
const HUNTER_ZONE_RADIUS = 2;
const HUNTER_ZONE_HOLD_MS = 3000;

function hunterZoneDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function createHunterZones() {
  const zones = [];
  const playerHeads = [];
  for (let i = 0; i < state.count; i++) {
    if (state.alive[i] && state.snakes[i]?.[0]) playerHeads.push(state.snakes[i][0]);
  }
  for (let z = 0; z < HUNTER_ZONE_COUNT; z++) {
    let found = null;
    for (let attempt = 0; attempt < 350; attempt++) {
      const p = { x: Math.floor(Math.random() * state.mapW), y: Math.floor(Math.random() * state.mapH) };
      if (wall(p.x, p.y)) continue;
      if (playerHeads.some(h => hunterZoneDistance(p, h) < 8)) continue;
      if (state.hunterSnake?.[0] && hunterZoneDistance(p, state.hunterSnake[0]) < 8) continue;
      if (zones.some(other => hunterZoneDistance(p, other) < 9)) continue;
      found = p;
      break;
    }
    if (!found) found = freeCell();
    zones.push({ ...found, radius: HUNTER_ZONE_RADIUS });
  }
  return zones;
}

function resetHunterZones() {
  state.hunterZones = [];
  state.hunterStartedAt = 0;
  state.hunterZoneCompleted = [false, false, false];
  state.hunterZoneProgress = 0;
  state.hunterZoneCurrent = -1;
  state.hunterZoneEnteredAt = 0;
  state.hunterZoneHoldProgress = 0;
}

function finishHunterByZones() {
  state.hunterActive = false;
  state.hunterEndsAt = Date.now();
  state.hunterSnake = [];
  state.hunterCloseToAnyone = false;
  state.hunterZoneCurrent = -1;
  state.hunterZoneEnteredAt = 0;
  state.hunterZoneHoldProgress = 0;
  state.toast = {
    x: Math.floor(state.mapW / 2),
    y: Math.floor(state.mapH / 2),
    text: '✅ 3/3 zonas! A Caçadora desapareceu!',
    color: '#ff5b78',
    until: Date.now() + 2600,
  };
  sfx.star();
  vibrate([30, 50, 30, 50, 120]);
}

function updateHunterZones() {
  if (!state.hunterActive || !state.hunterSnake[0] || !state.hunterZones?.length) return;
  const head = state.hunterSnake[0];
  const now = Date.now();
  let inside = -1;
  for (let i = 0; i < state.hunterZones.length; i++) {
    if (state.hunterZoneCompleted[i]) continue;
    const radius = state.hunterZones[i].radius || HUNTER_ZONE_RADIUS;
    if (hunterZoneDistance(head, state.hunterZones[i]) <= radius) {
      inside = i;
      break;
    }
  }
  if (inside === -1) {
    state.hunterZoneCurrent = -1;
    state.hunterZoneEnteredAt = 0;
    state.hunterZoneHoldProgress = 0;
    return;
  }
  if (inside !== state.hunterZoneCurrent) {
    state.hunterZoneCurrent = inside;
    state.hunterZoneEnteredAt = now;
    state.hunterZoneHoldProgress = 0;
  }
  const elapsed = now - state.hunterZoneEnteredAt;
  state.hunterZoneHoldProgress = Math.min(1, elapsed / HUNTER_ZONE_HOLD_MS);
  if (elapsed < HUNTER_ZONE_HOLD_MS) return;

  state.hunterZoneCompleted[inside] = true;
  state.hunterZoneProgress = state.hunterZoneCompleted.filter(Boolean).length;
  if (state.hunterZoneProgress >= 1) announceAchievement(unlockAchievement('hunter_zone_first'));
  if (state.hunterZoneProgress >= 1) announceAchievement(unlockAchievement('hunter_zone_exact'));
  if (state.hunterZoneProgress >= HUNTER_ZONE_COUNT) announceAchievement(unlockAchievement('hunter_zone_perfect'));
  state.toast = {
    x: head.x,
    y: head.y,
    text: state.hunterZoneProgress >= 3
      ? '✅ 3/3! Salva!'
      : '🛑 Zona ' + (inside + 1) + ' concluída! ' + state.hunterZoneProgress + '/3',
    color: '#ff5b78',
    until: Date.now() + 1600,
  };
  sfx.star();
  vibrate([20, 40, 20]);
  state.hunterZoneCurrent = -1;
  state.hunterZoneEnteredAt = 0;
  state.hunterZoneHoldProgress = 0;
  if (state.hunterZoneProgress >= HUNTER_ZONE_COUNT) finishHunterByZones();
}

export function updateHunter() {
  if (!state.hunterActive) return;
  if (Date.now() >= state.hunterEndsAt) {
    state.hunterActive = false;
    if (!state.hunterVictims.has(mySlot)) announceAchievement(unlockAchievement('hunter_escape'));
    state.hunterSnake = [];
    state.hunterCloseToAnyone = false;
    resetHunterZones();
    return;
  }

  const head = state.hunterSnake[0];
  if (state.hunterStartedAt && state.alive[mySlot] && Date.now() - state.hunterStartedAt >= 10000) {
    announceAchievement(unlockAchievement('hunter_no_fear'));
  }
  updateHunterZones();
  if (!state.hunterActive) return;
  const appearance = Math.max(1, state.hunterMilestoneIndex);
  const behavior = hunterBehaviorForAppearance(appearance, state.hunterConfig || {});
  state.hunterMoveTick = (state.hunterMoveTick || 0) + 1;

  // Melhoria #8 — Distração: se alguém usar o turbo perto o suficiente da caçadora
  // (e não for ela quem já tá perseguindo), ela muda de alvo por alguns segundos —
  // dá pra jogar em equipe, um "distraindo" ela pra proteger quem tá na mira
  if (Date.now() >= state.hunterDistractedUntil) {
    for (let i = 0; i < state.count; i++) {
      if (!state.alive[i] || !state.boosting[i]) continue;
      const h = state.snakes[i][0];
      if (Math.abs(h.x - head.x) + Math.abs(h.y - head.y) <= behavior.distractionRadius) {
        state.hunterDistractedTarget = i;
        state.hunterDistractedUntil = Date.now() + (state.hunterConfig?.distractionDurationSec || DURACAO_DISTRACAO_MS / 1000) * 1000;
        break;
      }
    }
  }

  const distraida = Date.now() < state.hunterDistractedUntil && state.alive[state.hunterDistractedTarget];
  const { leaderIdx } = findFoodLeader();
  const alvoIdx = distraida ? state.hunterDistractedTarget : leaderIdx;
  const alvoSnake = alvoIdx !== -1 && state.alive[alvoIdx] ? state.snakes[alvoIdx] : null;

  // Melhoria #5 — Corta caminho: em vez de mirar só onde o alvo ESTÁ agora, mira um
  // pouco à frente de pra onde ele tá indo, "cortando caminho" como um caçador de
  // verdade faria, ficando mais difícil de despistar
  let target = null;
  if (alvoSnake) {
    const alvoHead = alvoSnake[0];
    const alvoDir = state.dirs[alvoIdx] || { x: 0, y: 0 };
    const PASSOS_DE_PREVISAO = behavior.predictionSteps;
    target = { x: alvoHead.x + alvoDir.x * PASSOS_DE_PREVISAO, y: alvoHead.y + alvoDir.y * PASSOS_DE_PREVISAO };
  }

  // Melhoria #4 — Rajada: só entra no perfil médio a partir da 5ª aparição.
  if (!behavior.burstEnabled) {
    state.hunterBurstUntil = 0;
    state.hunterNextBurstAt = 0;
  } else {
    if (!state.hunterBurstUntil && Date.now() >= state.hunterNextBurstAt) {
      state.hunterBurstUntil = Date.now() + behavior.burstDurationSec * 1000;
    }
    if (state.hunterBurstUntil && Date.now() >= state.hunterBurstUntil) {
      state.hunterBurstUntil = 0;
      state.hunterNextBurstAt = Date.now() + behavior.burstIntervalSec * 1000;
    }
  }

  // Nas quatro primeiras aparições ela anda só a cada 2 ticks.
  const deveMover = state.hunterMoveTick % behavior.moveEveryTicks === 0;
  const passosNesseInstante = deveMover ? (state.hunterBurstUntil ? behavior.burstSteps : 1) : 0;

  for (let passo = 0; passo < passosNesseInstante; passo++) {
    const h = state.hunterSnake[0];
    state.hunterDir = hunterDir(h, state.hunterDir, target);
    const newHead = { x: h.x + state.hunterDir.x, y: h.y + state.hunterDir.y };
    state.hunterSnake.unshift(newHead);
    state.hunterSnake.pop(); // tamanho fixo (a não ser que tenha crescido por uma vítima)
  }

  // É invencível — ninguém a machuca, mas ela mata (sem dó) quem ela tocar
  for (let i = 0; i < state.count; i++) {
    if (!state.alive[i]) continue;
    const h = state.snakes[i][0];
    const tocou = state.hunterSnake.some((p) => p.x === h.x && p.y === h.y);
    const distancia = Math.abs(h.x - state.hunterSnake[0].x) + Math.abs(h.y - state.hunterSnake[0].y);

    if (tocou) {
      // Melhoria #7 — Cresce a cada vítima: fica maior (e mais ameaçadora) a cada
      // pessoa que ela pega durante a mesma aparição
      for (let n = 0; n < behavior.growthPerVictim; n++) {
        const ultimo = state.hunterSnake[state.hunterSnake.length - 1];
        state.hunterSnake.push({ ...ultimo });
      }
      kill(i);
    } else {
      // Melhoria #9 — Fuga por pouco: se chegou a ficar bem coladinho (1 célula) na
      // caçadora e escapou vivo, ganha uma pontuação bônus de "escapada por pouco"
      if (distancia === 1) {
        state.hunterNearMiss[i] = true; // ficou colado nela — se escapar, vale o bônus
      } else if (distancia > 2 && state.hunterNearMiss[i]) {
        // Já se afastou vivo depois do susto: agora sim, ganha o bônus (e pode valer de novo depois)
        state.hunterNearMiss[i] = false;
        state.scores[i] += 3;
        state.toast = { x: h.x, y: h.y, text: `😅 ${state.names[i] || 'Alguém'} escapou por pouco! +3`, color: '#4dd4ff', until: Date.now() + 1400 };
      }
    }
  }

  // Melhoria #10 — Aviso no minimapa: liga uma "bandeira" simples de "tem gente perto
  // dela agora" (o desenho do minimapa usa isso pra piscar em vermelho)
  const RAIO_PERIGO_MINIMAPA = 5;
  state.hunterCloseToAnyone = false;
  for (let i = 0; i < state.count; i++) {
    if (!state.alive[i]) continue;
    const h = state.snakes[i][0];
    if (Math.abs(h.x - state.hunterSnake[0].x) + Math.abs(h.y - state.hunterSnake[0].y) <= RAIO_PERIGO_MINIMAPA) {
      state.hunterCloseToAnyone = true;
      break;
    }
  }
}

function tick() {
  if (!state.running || state.paused) return;

  if (state.tournamentMode && Date.now() >= state.tournamentRoundEndsAt) {
    endTournamentRound();
    return;
  }

  checkSurvivalMission();
  if (state.mission?.type === 'survive') renderMission(); // atualiza a contagem regressiva na tela

  expandirMapaOnlineSeNecessario();
  checkHunterSpawn();
  if (state.alive[mySlot]) {
    const mySnake = state.snakes[mySlot] || [];
    trackProgressionEvent('survive', Math.floor((Date.now() - state.spawnedAt[mySlot]) / 1000));
    trackProgressionEvent('length', mySnake.length);
    const survivedMs = Date.now() - state.spawnedAt[mySlot];
    if (survivedMs >= 45000) announceAchievement(unlockAchievement('survive_45'));
    if (survivedMs >= 120000) announceAchievement(unlockAchievement('survivor'));
    if (isOnline() && survivedMs >= 120000) announceAchievement(unlockAchievement('online_survive_2m'));
    if (survivedMs >= 300000) announceAchievement(unlockAchievement('survive_5m'));
    if (mySnake.length >= 30) announceAchievement(unlockAchievement('length_30'));
    if (mySnake.length >= 20) announceAchievement(unlockAchievement('length_20'));
    if (mySnake.length >= 25) announceAchievement(unlockAchievement('length_25'));
    if (mySnake.length >= 35) announceAchievement(unlockAchievement('length_35'));
    if (mySnake.length >= 50) announceAchievement(unlockAchievement('length_50'));
    if (mySnake.length >= 75) announceAchievement(unlockAchievement('length_75'));
  }
  updateHunter();
  updateSecondPlaceBonusFood();
  checkFoodConsolidation();
  const estrelaNascida = updateFoodConsolidation();
  if (estrelaNascida) {
    burst(estrelaNascida.x, estrelaNascida.y, '#ffd24d', 20);
    sfx.star();
  }

  const now = Date.now();
  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.normal;
  // Chance de a CPU turbinar sozinha, calculada por SEGUNDO (não por tick) — assim ela não
  // fica turbinando toda hora só porque o Turbo Worms roda com tick menor (melhoria #1).
  const cpuBoostChance = diff.boostPerSecond * (currentInterval / 1000);

  for (let i = 0; i < state.count; i++) {
    if (!state.alive[i]) {
      if (now >= state.respawnAt[i]) spawn(i);
      continue;
    }
    if (state.types[i] === 'cpu') {
      state.nextDirs[i] = aiDir(i);
      if (!state.boosting[i] && now >= state.boostReadyAt[i] && Math.random() < cpuBoostChance) tryBoost(i);
    }
    const prevDir = state.dirs[i];
    state.dirs[i] = state.nextDirs[i];
    if (prevDir && (prevDir.x !== state.dirs[i].x || prevDir.y !== state.dirs[i].y)) {
      state.lastTurnAt[i] = Date.now();
    }
    if (state.boosting[i] && now >= state.boostUntil[i]) state.boosting[i] = false;

    // Aviso sonoro sutil quando o turbo (só o MEU, não o dos outros) está quase liberado
    if (i === mySlot && !state.boosting[i] && !state.boostReadySoundPlayed[i] &&
        state.boostReadyAt[i] > now && state.boostReadyAt[i] - now <= 400) {
      sfx.boostReady();
      state.boostReadySoundPlayed[i] = true;
    }
  }

  const aliveIdx = [];
  for (let i = 0; i < state.count; i++) if (state.alive[i]) aliveIdx.push(i);
  stepMovement(aliveIdx);

  // Quem tá com turbo ativo anda MAIS UMA vez nesse mesmo tick (total 2x mais rápido que o
  // normal). Chegamos a testar 3x, mas isso fazia a virada "atrasar" — a minhoca conseguia
  // escapar várias casas na direção antiga antes de virar de vez. 2x fica rápido e continua
  // respondendo rápido quando você vira.
  const boostedIdx = aliveIdx.filter(i => state.alive[i] && state.boosting[i]);
  if (boostedIdx.length) stepMovement(boostedIdx);

  // Desafio das 50 comidas.
  updateFiftyFoodEnemies();

  // Rastro de partículas atrás de quem tá turbinando — melhoria visual #3
  boostedIdx.forEach(i => {
    const tail = state.snakes[i]?.[state.snakes[i].length - 1];
    if (tail) burst(tail.x, tail.y, state.colors[i], 2);
  });

  ensureFoods();
  updateParticles();
  if (state.shake > 0) state.shake = Math.max(0, state.shake - 1);
  if (state.flash > 0) state.flash = Math.max(0, state.flash - 1);
  render();

  // Anfitrião: manda o estado do jogo pra todo mundo conectado, várias vezes por segundo.
  // Só os campos que MUDAM de verdade a cada instante — cor, nome, formato de cabeça,
  // tema, tamanho do mapa etc. quase nunca mudam durante a partida, então mandar tudo
  // isso de novo a cada pacotinho só deixa o pacote maior à toa (o que pode causar falha
  // de transmissão silenciosa em mapas grandes com minhocas compridas). Esses dados "que
  // quase nunca mudam" são mandados à parte, só quando a partida começa.
  if (isHost()) {
    broadcastState({
      snakes: state.snakes, foods: state.foods, scores: state.scores,
      foodsEaten: state.foodsEaten, eliminations: state.eliminations,
      alive: state.alive, boosting: state.boosting,
      show: state.show, showOthers: state.showOthers,
      count: state.count, mission: state.mission, best: state.best,
      dirs: state.dirs, shake: state.shake, flash: state.flash,
      toast: state.toast,
      hunterActive: state.hunterActive, hunterSnake: state.hunterSnake,
      fiftyFoodEnemies: fiftyFeature.enemies,
      boostReadyAt: state.boostReadyAt,
      hunterStartedAt: state.hunterStartedAt,
      hunterZones: state.hunterZones,
      hunterZoneCompleted: state.hunterZoneCompleted,
      hunterZoneProgress: state.hunterZoneProgress,
      hunterZoneCurrent: state.hunterZoneCurrent,
      hunterZoneHoldProgress: state.hunterZoneHoldProgress,
      mapW: state.mapW, mapH: state.mapH, onlineMapMode: state.onlineMapMode,
    });
  }
}

function sortearMapaOnline() {
  const tamanhos = MAP_SIZES.filter((m) => m.value !== 'small');
  const tamanho = tamanhos[Math.floor(Math.random() * tamanhos.length)] || MAP_SIZES[2];
  const temasGratis = BOARD_THEMES.filter((t) => !['cyber','aurora','volcano','candy'].includes(t.value));
  const tema = temasGratis[Math.floor(Math.random() * temasGratis.length)] || BOARD_THEMES[0];
  state.mapSize = tamanho.value;
  state.mapW = tamanho.w;
  state.mapH = tamanho.h;
  state.foodCount = tamanho.foods;
  state.theme = tema.value;
  if ($('mapSize')) $('mapSize').value = tamanho.value;
  if ($('boardTheme')) $('boardTheme').value = tema.value;
}

function expandirMapaOnlineSeNecessario() {
  if (!isOnline() || !isHost()) return;
  let maior = 0;
  for (let i=0; i<state.count; i++) maior = Math.max(maior, state.snakes[i]?.length || 0);
  if (maior < 50) return;
  const degraus = Math.floor((maior - 50) / 25) + 1;
  const larguraAlvo = Math.min(120, 56 + degraus * 8);
  const alturaAlvo = Math.min(90, 44 + degraus * 6);
  if (larguraAlvo > state.mapW || alturaAlvo > state.mapH) {
    state.mapW = Math.max(state.mapW, larguraAlvo);
    state.mapH = Math.max(state.mapH, alturaAlvo);
    state.mapSize = 'large';
    ensureFoods();
  }
}

// Prepara e inicia uma partida ONLINE como anfitrião — o total de jogadores vira
// "você + quantos amigos estão conectados agora", todos humanos (sem CPU no online).
export function startOnlineHostGame() {
  if (state.onlineMapMode === 'random') sortearMapaOnline();
  const humanos = Math.min(6, 1 + connectedCount());
  if ($('teamMode').checked) {
    // Partida em Times: os tamanhos de cada lado vêm do anfitrião, cada amigo entra no lado
    // que escolheu (se coube), e o que sobrar de vaga vira CPU
    const prefs = Array.from({ length: humanos }, (_, i) => (state.teamPrefs[i] === 'other' ? 'other' : 'mine'));
    const hostTeam = state.teams[0] === 1 ? 1 : 0;
    const plano = planTeams({ sizeMine: state.teamSizeMine, sizeOther: state.teamSizeOther, prefs, hostTeam });
    state.count = plano.count;
    state.types = plano.types.slice();
    for (let i = 0; i < plano.count; i++) state.teams[i] = plano.teams[i];
    const cores = unifyTeamColors({ colors: state.colors, teams: state.teams, count: plano.count, hostTeam, palette: COLORS });
    for (let i = 0; i < plano.count; i++) state.colors[i] = cores[i];
    let numeroCpu = 0;
    for (let i = 0; i < plano.count; i++) if (state.types[i] === 'cpu') state.names[i] = `🤖 CPU ${++numeroCpu}`;
  } else {
    state.count = humanos;
    state.types = Array(state.count).fill('human');
  }
  startGame();
}

// Mostra a tela de jogo pro CLIENTE (quem entrou numa sala). Ele não roda a simulação —
// só fica esperando os pacotes de estado do anfitrião pra desenhar na tela.
export function startClientGame() {
  switchScreen('menu', 'game');
  $('overlay').classList.add('hidden');
  $('badge').textContent = '🌐 Aguardando o anfitrião iniciar...';
  state.running = true;
  state.paused = false;
  state.receivedFirstState = false;
  state.debugCountdownRecebidoAt = 0;
  remoteProgressSnapshot = { alive:false, score:0, food:0, length:0, runStartedAt:Date.now() };
  state.debugJoinedAt = Date.now(); // quando terminou de entrar de vez — base pra detectar se NADA chegar depois
  // Temporário: mostra o diagnóstico técnico automaticamente pra quem ENTRA numa sala,
  // sem precisar tocar em nenhum botão — facilita muito mandar um print de ajuda
  $('diagPanel').classList.remove('hidden');
  state.diagAutoShown = true; // foi aberto sozinho: some sozinho quando os dados começarem a chegar
  state.diagManual = false;
  $('clientReadyOverlay').classList.remove('hidden');
  $('clientReadyOverlay').querySelector('h2').textContent = '🌐 Você entrou na sala!';
  $('clientReadyOverlay').querySelector('p').textContent = 'Avise que já está pronto pra começar.';
  $('clientReadyBtn').textContent = '✅ Estou Pronto!';
  $('clientReadyBtn').disabled = false;
  updateSessionStatsDisplay(incrementSessionGames());
  const streakInfo = updateStreakAndLastPlayed();
  window.__mioquinhaStreak = streakInfo.streak;
  claimStreakReward(streakInfo.streak);
  rewardMatchStart();
  startProgressionChallenge();
  announceAchievement(unlockAchievement('social'));
  announceAchievement(unlockAchievement('online_first'));
  announceAchievements(trackCumulativeProgress('onlineGames', 1));
  render();
  // Rede de segurança final: se por QUALQUER motivo nem a contagem regressiva nem o
  // primeiro pacote de estado chegarem (problema de rede raro, mas real), a pessoa NUNCA
  // deve ficar presa pra sempre atrás dessa tela — depois de um tempo bom (20s, dá tempo
  // de sobra pro anfitrião ver o pedido e clicar em Jogar), esconde de qualquer jeito.
  clearTimeout(clientReadyFallbackTimer);
  clientReadyFallbackTimer = setTimeout(() => {
    if (!state.receivedFirstState) {
      $('clientReadyOverlay').classList.add('hidden');
      $('badge').textContent = '⚠️ Sem notícias do anfitrião ainda — pode ser instabilidade de rede.';
    }
  }, 20000);
  // A troca de tela (switchScreen) tem uma transição suave de 150ms antes da arena ficar
  // visível de verdade — se desenhar só uma vez agora, o canvas mede o tamanho do pai
  // ENQUANTO ele ainda tá escondido (tamanho zero!) e fica preso assim até que uma
  // partida de verdade comece a chegar. Redesenha de novo depois que a transição termina,
  // e mais uma vez um pouco depois por segurança (celulares às vezes demoram mais pra
  // recalcular o layout depois de mudar o "display").
  setTimeout(render, 250);
  setTimeout(render, 600);
}

// Aplica um pacote de estado recebido do anfitrião (chamado pelo net.js) e redesenha a tela.
export function applyRemoteState(msg) {
  state.debugStatesReceived = (state.debugStatesReceived || 0) + 1;
  state.debugLastStateAt = Date.now();
  if (!state.receivedFirstState) {
    state.receivedFirstState = true;
    $('clientReadyOverlay').classList.add('hidden');
    // O painel de diagnóstico só abria sozinho pra ajudar a caçar o problema de "nada chega".
    // Agora que os dados chegaram, ele já cumpriu o papel e some — a não ser que a pessoa
    // tenha aberto de propósito pelo botão 🩺 (aí fica até ela fechar).
    if (state.diagAutoShown) {
      state.diagAutoShown = false;
      if (!state.diagManual) $('diagPanel').classList.add('hidden');
    }
    // Momento mais crítico pra tela preta: é AGORA que a partida de verdade começa a
    // aparecer pro cliente. Força mais um redesenho logo em seguida, de segurança —
    // mesmo com o ResizeObserver, alguns celulares demoram um pouquinho a mais.
    setTimeout(render, 200);
  }
  state.snakes = msg.snakes || state.snakes;
  state.dirs = msg.dirs || state.dirs;
  state.foods = msg.foods || state.foods;
  state.scores = msg.scores || state.scores;
  state.foodsEaten = msg.foodsEaten || state.foodsEaten;
  state.eliminations = msg.eliminations || state.eliminations;
  state.alive = msg.alive || state.alive;
  state.boosting = msg.boosting || state.boosting;
  state.boostReadyAt = msg.boostReadyAt || state.boostReadyAt;
  if (Array.isArray(msg.fiftyFoodEnemies)) {
    fiftyFeature.enemies = msg.fiftyFoodEnemies;
  }
  state.colors = msg.colors || state.colors;
  state.names = msg.names || state.names;
  state.show = msg.show || state.show;
  state.showOthers = msg.showOthers ?? state.showOthers;
  state.count = msg.count || state.count;
  state.mission = msg.mission ?? state.mission;
  state.best = msg.best ?? state.best;
  state.shake = msg.shake ?? 0;
  state.flash = msg.flash ?? 0;
  state.heads = msg.heads || state.heads;
  state.patterns = msg.patterns || state.patterns;
  state.trailColors = msg.trailColors || state.trailColors;
  state.hunterActive = msg.hunterActive ?? state.hunterActive;
  state.hunterSnake = msg.hunterSnake || state.hunterSnake;
  if (Array.isArray(msg.hunterZones)) state.hunterZones = msg.hunterZones;
  if (Array.isArray(msg.hunterZoneCompleted)) state.hunterZoneCompleted = msg.hunterZoneCompleted;
  state.hunterZoneProgress = msg.hunterZoneProgress ?? state.hunterZoneProgress;
  state.hunterZoneCurrent = msg.hunterZoneCurrent ?? state.hunterZoneCurrent;
  state.hunterZoneHoldProgress = msg.hunterZoneHoldProgress ?? state.hunterZoneHoldProgress;
  state.palettes = msg.palettes || state.palettes;
  state.mapW = msg.mapW || state.mapW;
  state.theme = msg.theme || state.theme;
  state.mapH = msg.mapH || state.mapH;
  state.teamMode = msg.teamMode ?? state.teamMode;
  state.teams = msg.teams || state.teams;
  const my = mySlot;
  const previousAlive = remoteProgressSnapshot.alive;
  const previousScore = remoteProgressSnapshot.score;
  const previousFood = remoteProgressSnapshot.food;
  const previousLength = remoteProgressSnapshot.length;
  if (!previousAlive && state.alive[my]) remoteProgressSnapshot.runStartedAt = Date.now();
  if (state.alive[my]) {
    trackProgressionEvent('foods', Math.max(0, (state.foodsEaten[my] || 0) - previousFood));
    trackProgressionEvent('score', state.scores[my] || 0);
    trackProgressionEvent('length', state.snakes[my]?.length || 0);
    trackProgressionEvent('survive', Math.floor((Date.now() - remoteProgressSnapshot.runStartedAt) / 1000));
  } else if (previousAlive && previousScore > 0) {
    awardLeagueRun({
      score: previousScore,
      length: previousLength,
      survivedSec: Math.floor((Date.now() - remoteProgressSnapshot.runStartedAt) / 1000)
    });
  }
  remoteProgressSnapshot = {
    alive:!!state.alive[my],
    score:state.scores[my] || 0,
    food:state.foodsEaten[my] || 0,
    length:state.snakes[my]?.length || 0,
    runStartedAt:remoteProgressSnapshot.runStartedAt,
  };
  state.toast = msg.toast || null;
  renderMission();
  $('badge').textContent = '🌐 ONLINE';
  render();
}
