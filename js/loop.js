// O "coração" do jogo: nascer, resetar, iniciar partida e o tick (cada passo do jogo).

import { $ } from './utils.js';
import { SPEEDS, TURBO_FACTOR, BOOST_DURATION, BOOST_COOLDOWN, DIFFICULTY, MILESTONE_STEP, SPECIAL_MILESTONES } from './config.js';
import { state } from './state.js';
import { occupied, freeCell, ensureFoods, dropFood, dropOne, burst, wall } from './food.js';
import { aiDir } from './ai.js';
import { render } from './render.js';
import { syncSettings } from './players.js';
import { startMission, trackFoodForMission, renderMission } from './mission.js';
import { sfx } from './sound.js';
import { vibrate, announce, setVibrationEnabled } from './utils.js';
import { saveBest, addToLeaderboard, incrementGamesPlayed, GAME_MILESTONES } from './storage.js';
import { isHost, isOnline, broadcastState, broadcastRaw, connectedCount } from './net.js';
import { checkHunterTrigger, updateHunter } from './hunter.js';

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
  state.hunter = null;
  state.hunterTriggered = Array(6).fill(null).map(() => []);
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
}

export function startGame() {
  syncSettings();
  setVibrationEnabled(state.vibrationOn);
  updateGamesPlayedBadge(incrementGamesPlayed());
  reset();
  $('menu').classList.add('hidden');
  $('game').classList.remove('hidden');
  $('overlay').classList.add('hidden');
  $('badge').textContent = (state.mode === 'turbo' ? '⚡ TURBO WORMS' : '🏆 CLÁSSICO') + (state.noWalls ? ' 🌀' : '');
  state.running = false;
  state.paused = false;
  render();
  // A velocidade escolhida no menu define o ritmo base; o Turbo Worms roda mais rápido ainda
  const spd = SPEEDS.find(s => s.value === state.speed) || SPEEDS[1];
  currentInterval = state.mode === 'turbo' ? Math.round(spd.tick * TURBO_FACTOR) : spd.tick;

  // Contagem regressiva "3, 2, 1, VAI!" antes de começar de verdade — melhoria visual #8
  runCountdown(3, () => {
    state.running = true;
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
  if (state.foodsEaten[i] < 1) return false; // precisa de "combustível"

  state.foodsEaten[i]--;
  state.scores[i] = Math.max(0, state.scores[i] - 1);
  const h = state.snakes[i][0];
  dropOne(h.x, h.y, i);

  state.boosting[i] = true;
  state.boostUntil[i] = now + BOOST_DURATION;
  state.boostReadyAt[i] = now + BOOST_COOLDOWN;
  sfx.boost();
  vibrate(15);
  return true;
}

// Mata uma minhoca: derrama comida, faz explosão, som/vibração e guarda o recorde
export function kill(i) {
  saveBest(state.scores[i]);
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
  state.respawnAt[i] = Date.now() + 900;
  sfx.death();
  vibrate(150);
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
      if (die[i] >= 0) state.eliminations[die[i]] = (state.eliminations[die[i]] || 0) + 1;
      kill(i);
      return;
    }
    const h = heads[i];
    state.snakes[i].unshift(h);
    const f = state.foods.find(q => q.x === h.x && q.y === h.y);
    if (f) {
      state.scores[i] += f.value;
      state.foodsEaten[i] += f.value;
      state.grow[i] += f.value;
      state.foods.splice(state.foods.indexOf(f), 1);
      burst(h.x, h.y, f.kind === 'bonus' ? '#ffd24d' : state.colors[i], f.kind === 'bonus' ? 24 : 12);
      sfx[f.kind === 'bonus' ? 'star' : f.kind === 'drop' ? 'drop' : 'eat']();
      if (f.kind === 'bonus') vibrate(20);
      trackFoodForMission(i, f);
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

// Um "passo" do jogo: decide direções, move todo mundo, checa colisões, come comida, redesenha
function tick() {
  if (!state.running || state.paused) return;
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
    state.dirs[i] = state.nextDirs[i];
    if (state.boosting[i] && now >= state.boostUntil[i]) state.boosting[i] = false;
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
  if (!isOnline() || isHost()) {
    checkHunterTrigger();
    updateHunter();
  }
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
      heads: state.heads, toast: state.toast, patterns: state.patterns, palettes: state.palettes,
      mapW: state.mapW, mapH: state.mapH, bgColor: state.bgColor,
      teamMode: state.teamMode, teams: state.teams,
      hunter: state.hunter,
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
  $('menu').classList.add('hidden');
  $('game').classList.remove('hidden');
  $('overlay').classList.add('hidden');
  $('badge').textContent = '🌐 Aguardando o anfitrião iniciar...';
  state.running = true;
  state.paused = false;
  render();
}

// Aplica um pacote de estado recebido do anfitrião (chamado pelo net.js) e redesenha a tela.
export function applyRemoteState(msg) {
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
  state.palettes = msg.palettes || state.palettes;
  state.mapW = msg.mapW || state.mapW;
  state.bgColor = msg.bgColor || state.bgColor;
  state.mapH = msg.mapH || state.mapH;
  state.teamMode = !!msg.teamMode;
  state.teams = msg.teams || state.teams;
  state.hunter = msg.hunter || null;
  state.toast = msg.toast || null;
  renderMission();
  $('badge').textContent = '🌐 ONLINE';
  render();
}
