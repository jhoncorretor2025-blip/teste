// O "coração" do jogo: nascer, resetar, iniciar partida e o tick (cada passo do jogo).

import { $ } from './utils.js';
import { TICK, TURBO_TICK, BOOST_DURATION, BOOST_COOLDOWN, DIFFICULTY } from './config.js';
import { state } from './state.js';
import { occupied, freeCell, ensureFoods, dropFood, dropOne, burst, wall } from './food.js';
import { aiDir } from './ai.js';
import { render } from './render.js';
import { syncSettings } from './players.js';
import { startMission, trackFoodForMission } from './mission.js';
import { sfx } from './sound.js';
import { vibrate } from './utils.js';
import { saveBest } from './storage.js';

let currentInterval = TICK; // guarda o intervalo do tick atual, pra calcular chances por segundo direito

// Coloca (ou recoloca) uma minhoca no tabuleiro em sua posição inicial
export function spawn(i) {
  const starts = [{ x: 6, y: 7, dx: 1, dy: 0 }, { x: 43, y: 23, dx: -1, dy: 0 }, { x: 25, y: 26, dx: 0, dy: -1 }];
  const s = starts[i];
  const p = occupied(s.x, s.y) ? freeCell() : s;
  state.snakes[i] = [{ x: p.x, y: p.y }, { x: p.x - s.dx, y: p.y - s.dy }, { x: p.x - 2 * s.dx, y: p.y - 2 * s.dy }];
  state.dirs[i] = { x: s.dx, y: s.dy };
  state.nextDirs[i] = { x: s.dx, y: s.dy };
  state.alive[i] = true;
  state.grow[i] = 0;
  state.respawnAt[i] = 0;
  state.boosting[i] = false;
  burst(p.x, p.y, state.colors[i], 14);
}

// Zera tudo e coloca todas as minhocas de volta no tabuleiro
// ("eliminations" e "best" NÃO são zerados aqui — eles são o histórico da sessão)
export function reset() {
  clearInterval(state.timer);
  state.snakes = []; state.alive = []; state.dirs = []; state.nextDirs = [];
  state.foods = [];
  state.scores = Array(3).fill(0);
  state.foodsEaten = Array(3).fill(0);
  state.grow = Array(3).fill(0);
  state.respawnAt = Array(3).fill(0);
  state.particles = [];
  state.shake = 0;
  for (let i = 0; i < state.count; i++) spawn(i);
  ensureFoods();
  startMission();
}

// Chamado pelos botões "Jogar" e "Reiniciar"
export function startGame() {
  syncSettings();
  reset();
  $('menu').classList.add('hidden');
  $('game').classList.remove('hidden');
  $('overlay').classList.add('hidden');
  $('badge').textContent = state.mode === 'turbo' ? '⚡ TURBO WORMS' : '🏆 CLÁSSICO';
  state.running = true;
  state.paused = false;
  render();
  // Modo Turbo Worms roda com um tick menor = o jogo inteiro fica mais rápido
  currentInterval = state.mode === 'turbo' ? TURBO_TICK : TICK;
  state.timer = setInterval(tick, currentInterval);
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
  dropFood(i);
  const h = state.snakes[i]?.[0];
  if (h) burst(h.x, h.y, state.colors[i], 24);
  state.shake = 7;
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
    heads[i] = { x: state.snakes[i][0].x + state.dirs[i].x, y: state.snakes[i][0].y + state.dirs[i].y };
  });

  const die = {};
  indices.forEach(i => {
    const h = heads[i];
    if (wall(h.x, h.y)) { die[i] = -1; return; }
    for (let j = 0; j < state.count; j++) {
      if (j !== i && state.alive[j] && state.snakes[j].some(p => p.x === h.x && p.y === h.y)) { die[i] = j; return; }
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
      sfx[f.kind === 'bonus' ? 'star' : 'eat']();
      if (f.kind === 'bonus') vibrate(20);
      trackFoodForMission(i, f);
    }
    if (state.grow[i] > 0) state.grow[i]--;
    else state.snakes[i].pop();
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

  const boostedIdx = aliveIdx.filter(i => state.alive[i] && state.boosting[i]);
  if (boostedIdx.length) stepMovement(boostedIdx);

  ensureFoods();
  updateParticles();
  if (state.shake > 0) state.shake = Math.max(0, state.shake - 1);
  render();
}
