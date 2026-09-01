// Tudo sobre comida no tabuleiro: onde nasce, quando cai ao morrer, e as "partículas" de efeito visual.

import { state } from './state.js';

export function wall(x, y) {
  return x < 0 || x >= state.mapW || y < 0 || y >= state.mapH;
}

// Verifica se uma célula está ocupada por alguma minhoca viva ou por comida
export function occupied(x, y, ignore = -1) {
  for (let i = 0; i < state.count; i++) {
    if (i !== ignore && state.alive[i] && state.snakes[i]?.some(p => p.x === x && p.y === y)) return true;
  }
  return state.foods.some(f => f.x === x && f.y === y);
}

// Sorteia uma célula livre no tabuleiro (tenta até 4000 vezes antes de desistir)
export function freeCell() {
  for (let n = 0; n < 4000; n++) {
    const p = { x: Math.floor(Math.random() * state.mapW), y: Math.floor(Math.random() * state.mapH) };
    if (!occupied(p.x, p.y)) return p;
  }
  return { x: 2, y: 2 };
}

// Garante que sempre existam N maçãs normais e 1 estrela bônus no tabuleiro
export function ensureFoods() {
  while (state.foods.filter(f => f.kind === 'normal').length < state.foodCount) {
    const p = freeCell();
    state.foods.push({ x: p.x, y: p.y, kind: 'normal', value: 1 });
  }
  if (!state.foods.some(f => f.kind === 'bonus')) {
    const p = freeCell();
    state.foods.push({ x: p.x, y: p.y, kind: 'bonus', value: 5 });
  }
}

// Quando uma minhoca morre, ela "derrama" comida no tabuleiro proporcional ao que comeu
export function dropFood(i) {
  for (let n = 0; n < state.foodsEaten[i]; n++) {
    const p = freeCell();
    state.foods.push({ x: p.x, y: p.y, kind: 'drop', value: 1, owner: i });
  }
}

// Derrama exatamente 1 comida numa posição específica — usado como custo do turbo (melhoria #2)
export function dropOne(x, y, owner) {
  const p = occupied(x, y) ? freeCell() : { x, y };
  state.foods.push({ x: p.x, y: p.y, kind: 'drop', value: 1, owner });
}

// Cria partículas de explosão (usado ao nascer, comer e morrer)
export function burst(x, y, color, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 1.5;
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 24 + Math.random() * 18, color });
  }
}
