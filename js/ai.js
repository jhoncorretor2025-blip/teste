// Cérebro das minhocas controladas por CPU.

import { D } from './config.js';
import { dist } from './utils.js';
import { state } from './state.js';
import { wall } from './food.js';

// Duas direções são "opostas" (a minhoca não pode dar meia-volta em cima do próprio corpo)
export function reverse(a, b) {
  return a && b && a.x === -b.x && a.y === -b.y;
}

// Verifica se mover na direção "d" não bate em parede nem em outra minhoca
export function safeMove(i, d) {
  const h = state.snakes[i][0], p = { x: h.x + d.x, y: h.y + d.y };
  if (wall(p.x, p.y)) return false;
  if (state.snakes.some((s, j) => j !== i && state.alive[j] && s.some(q => q.x === p.x && q.y === p.y))) return false;
  return true;
}

// Escolhe a melhor direção para a CPU: persegue a comida mais próxima (prioriza a estrela se estiver perto)
// e evita paredes/colisões, dando uma pontuação para cada direção possível.
export function aiDir(i) {
  const h = state.snakes[i]?.[0];
  if (!h) return D.right;

  const targets = state.foods.filter(f => f.kind === 'normal' || f.kind === 'bonus' || f.kind === 'drop');
  let target = targets.length ? targets.slice().sort((a, b) => dist(h, a) - dist(h, b))[0] : null;
  const bonus = state.foods.find(f => f.kind === 'bonus');
  if (bonus && dist(h, bonus) < 16) target = bonus;

  let best = state.dirs[i] || D.right, bestScore = -1e9;
  for (const d of Object.values(D)) {
    if (reverse(state.dirs[i], d)) continue;
    const p = { x: h.x + d.x, y: h.y + d.y };
    let sc = target ? -dist(p, target) : 0;
    if (wall(p.x, p.y)) sc -= 9999;
    if (!safeMove(i, d)) sc -= 7000;
    if (target && p.x === target.x && p.y === target.y) sc += 1000;
    if (sc > bestScore) { bestScore = sc; best = d; }
  }
  return best;
}
