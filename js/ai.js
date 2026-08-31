// Cérebro das minhocas controladas por CPU.

import { D, DIFFICULTY } from './config.js';
import { dist } from './utils.js';
import { state } from './state.js';
import { wall } from './food.js';

export function reverse(a, b) {
  return a && b && a.x === -b.x && a.y === -b.y;
}

export function safeMove(i, d) {
  const h = state.snakes[i][0], p = { x: h.x + d.x, y: h.y + d.y };
  if (wall(p.x, p.y)) return false;
  if (state.snakes.some((s, j) => j !== i && state.alive[j] && s.some(q => q.x === p.x && q.y === p.y))) return false;
  return true;
}

// Conta quantas células livres tem ao redor de um ponto — usado no modo Difícil pra IA não se encurralar
function spaceAround(p, ignoreIndex) {
  let free = 0;
  for (const d of Object.values(D)) {
    const q = { x: p.x + d.x, y: p.y + d.y };
    if (wall(q.x, q.y)) continue;
    let blocked = false;
    for (let j = 0; j < state.count; j++) {
      if (j !== ignoreIndex && state.alive[j] && state.snakes[j].some(s => s.x === q.x && s.y === q.y)) { blocked = true; break; }
    }
    if (!blocked) free++;
  }
  return free;
}

// Escolhe a melhor direção pra CPU, ajustada pela dificuldade escolhida (melhoria #3)
export function aiDir(i) {
  const h = state.snakes[i]?.[0];
  if (!h) return D.right;

  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.normal;

  const targets = state.foods.filter(f => f.kind === 'normal' || f.kind === 'bonus' || f.kind === 'drop');
  let target = targets.length ? targets.slice().sort((a, b) => dist(h, a) - dist(h, b))[0] : null;
  const bonus = state.foods.find(f => f.kind === 'bonus');
  if (bonus && dist(h, bonus) < 16) target = bonus;

  const validDirs = Object.values(D).filter(d => !reverse(state.dirs[i], d));

  let best = state.dirs[i] || D.right, bestScore = -1e9;
  for (const d of validDirs) {
    const p = { x: h.x + d.x, y: h.y + d.y };
    let sc = target ? -dist(p, target) : 0;
    if (wall(p.x, p.y)) sc -= 9999;
    if (!safeMove(i, d)) sc -= 7000;
    if (target && p.x === target.x && p.y === target.y) sc += 1000;
    if (diff.lookahead) sc += spaceAround(p, i) * 4; // Difícil: evita becos sem saída
    if (sc > bestScore) { bestScore = sc; best = d; }
  }

  // Fácil: de vez em quando erra de propósito, pra ficar batível
  if (Math.random() < diff.mistake) {
    const safe = validDirs.filter(d => safeMove(i, d));
    if (safe.length) best = safe[Math.floor(Math.random() * safe.length)];
  }

  return best;
}
