// O "coração" do jogo: nascer, resetar, iniciar partida e o tick (cada passo do jogo).

import { $ } from './utils.js';
import { SPEEDS, TURBO_FACTOR, BOOST_DURATION, BOOST_COOLDOWN, DIFFICULTY, MILESTONE_STEP, SPECIAL_MILESTONES, TOURNAMENT_ROUNDS, TOURNAMENT_ROUND_MS, HUNTER_MILESTONES } from './config.js';
import { state } from './state.js';
import { occupied, freeCell, ensureFoods, dropFood, dropOne, burst, wall } from './food.js';
import { aiDir, hunterDir } from './ai.js';
import { render } from './render.js';
import { syncSettings, label } from './players.js';
import { startMission, trackFoodForMission, renderMission, trackEliminationForMission, trackDeathForMission, checkSurvivalMission } from './mission.js';
import { sfx } from './sound.js';
import { vibrate, announce, setVibrationEnabled } from './utils.js';
import { saveBest, saveBestByMode, addToLeaderboard, incrementGamesPlayed, GAME_MILESTONES, addPlaytime, incrementSessionGames, loadTotalPlaytime, formatPlaytime, updateStreakAndLastPlayed, unlockAchievement, trackCumulativeProgress } from './storage.js';
import { isHost, isOnline, broadcastState, broadcastRaw, connectedCount, mySlot } from './net.js';

let currentInterval = 160; // guarda o intervalo do tick atual, pra calcular chances por segundo direito

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

export function spawn(i) {
  const w = state.mapW, h = state.mapH;
  const s = computeStartPoint(i, Math.max(state.count, i + 1), w, h);
  const p = findSafeSpawn(s.x, s.y);
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
  state.grow = Array(6).fill(0);
  state.respawnAt = Array(6).fill(0);
  state.particles = [];
  state.shake = 0;
  state.hunterActive = false;
  state.hunterSnake = [];
  state.hunterMilestoneIndex = 0;
  state.boostUsedCount = Array(6).fill(0);
  state.lastTurnAt = Array(6).fill(Date.now());
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
setInterval(() => { if (state.running) addPlaytime(3000); }, 3000);

// Salva e retoma a partida — pra quando o navegador fecha sem querer no meio do jogo.
// Só faz sentido no LOCAL (offline), já que uma sala online depende da conexão em tempo
// real com quem estava jogando junto, e essa conexão não existe mais depois de fechar.
const SAVE_KEY = 'snakeArenaSavedGame';
const SAVE_FIELDS = [
  'count', 'types', 'names', 'colors', 'heads', 'patterns', 'palettes', 'controls', 'trailColors',
  'mode', 'difficulty', 'mapW', 'mapH', 'mapSize', 'noWalls', 'theme', 'speed',
  'teamMode', 'teams', 'tournamentMode', 'tournamentRound', 'tournamentWins',
  'tournamentRoundScore', 'tournamentRoundEndsAt', 'zoom',
  'snakes', 'alive', 'dirs', 'nextDirs', 'foods', 'scores', 'foodsEaten', 'grow',
  'respawnAt', 'milestones', 'eliminations', 'boosting', 'boostUsedCount', 'mission',
  'hunterActive', 'hunterSnake', 'hunterDir', 'hunterEndsAt', 'hunterMilestoneIndex',
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
  currentInterval = state.mode === 'turbo' ? Math.round(spd.tick * TURBO_FACTOR) : spd.tick;
  state.paused = false;
  state.running = true;
  render();
  state.timer = setInterval(tick, currentInterval);
}

export function startGame() {
  syncSettings();
  setVibrationEnabled(state.vibrationOn);
  updateGamesPlayedBadge(incrementGamesPlayed());
  updateSessionStatsDisplay(incrementSessionGames());
  updateStreakAndLastPlayed();
  clearSavedGame();

  announceAchievement(unlockAchievement('first_game'));
  announceAchievements(trackCumulativeProgress('themesUsed', state.theme));
  announceAchievements(trackCumulativeProgress('headsUsed', state.heads[0]));
  if (isOnline()) announceAchievement(unlockAchievement('social'));

  reset();
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
  currentInterval = state.mode === 'turbo' ? Math.round(spd.tick * TURBO_FACTOR) : spd.tick;

  // Contagem regressiva "3, 2, 1, VAI!" antes de começar de verdade — melhoria visual #8
  runCountdown(3, () => {
    state.running = true;
    if (state.tournamentMode) state.tournamentRoundEndsAt = Date.now() + TOURNAMENT_ROUND_MS;
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
  state.boostUntil[i] = now + BOOST_DURATION;
  state.boostReadyAt[i] = now + BOOST_COOLDOWN;
  state.boostReadySoundPlayed[i] = false;
  sfx.boost();
  vibrate(15);
  return true;
}

// Mata uma minhoca: derrama comida, faz explosão, som/vibração e guarda o recorde
export function kill(i) {
  trackDeathForMission(i);
  if (state.hunterActive) state.hunterVictims.add(i);
  saveBest(state.scores[i]);
  saveBestByMode(state.mode, state.tournamentMode, state.scores[i]);
  state.best = Math.max(state.best, state.scores[i]);
  if (state.types[i] === 'human') addToLeaderboard(state.names[i], state.scores[i]);
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
  state.boosting[i] = false;
  state.comboCount[i] = 0;
  state.respawnAt[i] = Date.now() + 900;
  sfx.death();
  vibrate([80, 40, 160]); // padrão de "derrota" — dois toques curtos e um mais longo
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
      }
      kill(i);
      return;
    }
    const h = heads[i];
    state.snakes[i].unshift(h);
    const f = state.foods.find(q => q.x === h.x && q.y === h.y);
    if (f) {
      // Combo de velocidade: comer rápido e seguido dá pontos extras, que vão subindo
      const eatNow = Date.now();
      state.comboCount[i] = (eatNow - (state.lastEatAt[i] || 0) < 2200) ? (state.comboCount[i] || 0) + 1 : 1;
      state.lastEatAt[i] = eatNow;
      const combo = state.comboCount[i];
      const comboBonus = combo >= 3 ? Math.min(5, combo - 2) : 0;

      state.scores[i] += f.value + comboBonus;
      state.foodsEaten[i] += f.value;
      state.grow[i] += f.value;
      if (state.tournamentMode) state.tournamentRoundScore[i] += f.value + comboBonus;
      state.foods.splice(state.foods.indexOf(f), 1);
      burst(h.x, h.y, f.kind === 'bonus' ? '#ffd24d' : state.colors[i], f.kind === 'bonus' ? 24 : 12);
      sfx[f.kind === 'bonus' ? 'star' : f.kind === 'drop' ? 'drop' : 'eat']();
      if (f.kind === 'bonus') vibrate(20);
      if (comboBonus > 0) {
        state.toast = { x: h.x, y: h.y, text: `🔥 Combo x${combo}! +${comboBonus}`, color: '#ff9f4d', until: Date.now() + 900 };
      }
      state.floatingScores.push({
        x: h.x, y: h.y, text: `+${f.value + comboBonus}`,
        color: f.kind === 'bonus' ? '#ffd24d' : state.colors[i],
        bornAt: Date.now(),
      });
      trackFoodForMission(i, f);

      // Conquistas — só rastreadas pra VOCÊ (mySlot), já que são do seu aparelho
      if (i === mySlot) {
        announceAchievements(trackCumulativeProgress('totalFoods', f.value));
        if (f.kind === 'bonus') announceAchievements(trackCumulativeProgress('totalStars', 1));
        if (combo >= 5) announceAchievement(unlockAchievement('combo_master'));
        if (state.scores[i] >= 100) announceAchievement(unlockAchievement('century'));
      }
    }
    if (state.grow[i] > 0) state.grow[i]--;
    else state.snakes[i].pop();

    // Marco de crescimento (10, 20, 30...) — os marcos especiais (20/50/100) ganham uma festa maior
    const len = state.snakes[i].length;
    if (len >= state.milestones[i] + MILESTONE_STEP) {
      state.milestones[i] = Math.floor(len / MILESTONE_STEP) * MILESTONE_STEP;
      const special = SPECIAL_MILESTONES.find(m => m.at === state.milestones[i]);
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
  const roundJustEnded = state.tournamentRound;

  if (roundJustEnded >= TOURNAMENT_ROUNDS) {
    let champion = 0;
    for (let i = 1; i < state.count; i++) {
      if (state.tournamentWins[i] > state.tournamentWins[champion]) champion = i;
    }
    state.tournamentChampion = champion;
    if (champion === mySlot) announceAchievement(unlockAchievement('tournament_champion'));
    state.running = false;
    clearSavedGame();
    render();
    document.dispatchEvent(new CustomEvent('tournamentOver', {
      detail: { champion, wins: [...state.tournamentWins].slice(0, state.count) },
    }));
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

// Confere se é hora de fazer a Minhoca Caçadora aparecer — só uma checagem simples de
// "o líder já comeu o suficiente pro próximo marco?"
function checkHunterSpawn() {
  if (state.hunterActive) return;
  if (state.hunterMilestoneIndex >= HUNTER_MILESTONES.length) return;
  const milestone = HUNTER_MILESTONES[state.hunterMilestoneIndex];
  const { leaderIdx, leaderFood } = findFoodLeader();
  if (leaderIdx === -1 || leaderFood < milestone.foodThreshold) return;
  spawnHunter(milestone.durationSec);
  state.hunterMilestoneIndex++;
}

function spawnHunter(durationSec) {
  const p = freeCell();
  state.hunterVictims = new Set();
  state.hunterSnake = [{ x: p.x, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x - 2, y: p.y }];
  state.hunterDir = { x: 1, y: 0 };
  state.hunterActive = true;
  state.hunterEndsAt = Date.now() + durationSec * 1000;
  state.toast = { x: p.x, y: p.y, text: '☠️ Minhoca Caçadora apareceu!', color: '#ff2222', until: Date.now() + 2800 };
  sfx.mission();
  vibrate([40, 60, 40, 60, 40]);
}

// Move a Minhoca Caçadora um passo em direção a quem tá liderando agora (o alvo pode
// mudar no meio da perseguição, se outra pessoa assumir a liderança), e mata quem tocar
function updateHunter() {
  if (!state.hunterActive) return;
  if (Date.now() >= state.hunterEndsAt) {
    state.hunterActive = false;
    if (!state.hunterVictims.has(mySlot)) announceAchievement(unlockAchievement('hunter_escape'));
    state.hunterSnake = [];
    return;
  }

  const { leaderIdx } = findFoodLeader();
  const head = state.hunterSnake[0];
  const target = leaderIdx !== -1 ? state.snakes[leaderIdx][0] : null;
  state.hunterDir = hunterDir(head, state.hunterDir, target);

  const newHead = { x: head.x + state.hunterDir.x, y: head.y + state.hunterDir.y };
  state.hunterSnake.unshift(newHead);
  state.hunterSnake.pop(); // tamanho fixo, ela não cresce

  // É invencível — ninguém a machuca, mas ela mata (sem dó) quem ela tocar
  for (let i = 0; i < state.count; i++) {
    if (!state.alive[i]) continue;
    const h = state.snakes[i][0];
    if (state.hunterSnake.some((p) => p.x === h.x && p.y === h.y)) kill(i);
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

  checkHunterSpawn();
  if (state.alive[mySlot] && Date.now() - state.spawnedAt[mySlot] >= 120000) {
    announceAchievement(unlockAchievement('survivor'));
  }
  updateHunter();

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

  // Anfitrião: manda o estado do jogo pra todo mundo conectado, várias vezes por segundo
  if (isHost()) {
    broadcastState({
      snakes: state.snakes, foods: state.foods, scores: state.scores,
      foodsEaten: state.foodsEaten, eliminations: state.eliminations,
      alive: state.alive, boosting: state.boosting, colors: state.colors,
      names: state.names, show: state.show, showOthers: state.showOthers,
      count: state.count, mission: state.mission, best: state.best,
      dirs: state.dirs, shake: state.shake, flash: state.flash,
      heads: state.heads, toast: state.toast, patterns: state.patterns, palettes: state.palettes, trailColors: state.trailColors,
      hunterActive: state.hunterActive, hunterSnake: state.hunterSnake,
      mapW: state.mapW, mapH: state.mapH, theme: state.theme,
      teamMode: state.teamMode, teams: state.teams,
    });
  }
}

// Prepara e inicia uma partida ONLINE como anfitrião — o total de jogadores vira
// "você + quantos amigos estão conectados agora", todos humanos (sem CPU no online).
export function startOnlineHostGame() {
  state.count = Math.min(6, 1 + connectedCount());
  state.types = Array(state.count).fill('human');
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
  $('clientReadyBtn').classList.remove('hidden');
  $('clientReadyBtn').textContent = '✅ Estou Pronto!';
  $('clientReadyBtn').disabled = false;
  updateSessionStatsDisplay(incrementSessionGames());
  announceAchievement(unlockAchievement('social'));
  render();
}

// Aplica um pacote de estado recebido do anfitrião (chamado pelo net.js) e redesenha a tela.
export function applyRemoteState(msg) {
  if (!state.receivedFirstState) {
    state.receivedFirstState = true;
    $('clientReadyBtn').classList.add('hidden');
  }
  state.snakes = msg.snakes || [];
  state.dirs = msg.dirs || [];
  state.foods = msg.foods || [];
  state.scores = msg.scores || [];
  state.foodsEaten = msg.foodsEaten || [];
  state.eliminations = msg.eliminations || [];
  state.alive = msg.alive || [];
  state.boosting = msg.boosting || [];
  state.colors = msg.colors || state.colors;
  state.names = msg.names || state.names;
  state.show = msg.show || state.show;
  state.showOthers = msg.showOthers;
  state.count = msg.count || state.count;
  state.mission = msg.mission;
  state.best = msg.best || 0;
  state.shake = msg.shake || 0;
  state.flash = msg.flash || 0;
  state.heads = msg.heads || state.heads;
  state.patterns = msg.patterns || state.patterns;
  state.trailColors = msg.trailColors || state.trailColors;
  state.hunterActive = !!msg.hunterActive;
  state.hunterSnake = msg.hunterSnake || [];
  state.palettes = msg.palettes || state.palettes;
  state.mapW = msg.mapW || state.mapW;
  state.theme = msg.theme || state.theme;
  state.mapH = msg.mapH || state.mapH;
  state.teamMode = !!msg.teamMode;
  state.teams = msg.teams || state.teams;
  state.toast = msg.toast || null;
  renderMission();
  $('badge').textContent = '🌐 ONLINE';
  render();
}
