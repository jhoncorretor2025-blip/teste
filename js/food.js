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
function sortearRaridadeVisual() {
  const r = Math.random();
  if (r < 0.01) return 'legendary';
  if (r < 0.05) return 'epic';
  if (r < 0.15) return 'rare';
  return 'normal';
}

export function ensureFoods() {
  while (state.foods.filter(f => f.kind === 'normal').length < state.foodCount) {
    const p = freeCell();
    state.foods.push({ x: p.x, y: p.y, kind: 'normal', value: 1, rarity: sortearRaridadeVisual() });
  }
  if (!state.foods.some(f => f.kind === 'bonus')) {
    const p = freeCell();
    state.foods.push({ x: p.x, y: p.y, kind: 'bonus', value: 5 });
  }
}

// Consolidação de comida acumulada em estrelas — quando MUITA comida se espalha pelo
// mapa (o mais comum: depois que várias minhocas grandes morrem de uma vez, derramando
// tudo o que comeram), fica poluído visualmente e difícil de ver o que é importante.
// A cada 5 comidas "comuns" (normal ou derramada) acima do limite, um grupo delas pisca
// por um tempinho e depois se funde numa única estrela — assim o mapa se "limpa"
// sozinho, e ainda dá uma recompensa maior por aquilo que seria só clutter.
const LIMITE_COMIDA_ANTES_DE_CONSOLIDAR = 50;
const QUANTIDADE_POR_ESTRELA = 5;
const TEMPO_PISCANDO_MS = 1500;

export function checkFoodConsolidation() {
  const comuns = state.foods.filter((f) => (f.kind === 'normal' || f.kind === 'drop') && !f.piscando);
  if (comuns.length < LIMITE_COMIDA_ANTES_DE_CONSOLIDAR) return;
  // Pega o primeiro grupo de 5 e marca pra começar a piscar (o desenho na tela cuida
  // do efeito visual sozinho, olhando pra essa marcação)
  const grupo = comuns.slice(0, QUANTIDADE_POR_ESTRELA);
  const consolidaEm = Date.now() + TEMPO_PISCANDO_MS;
  grupo.forEach((f) => { f.piscando = true; f.consolidaEm = consolidaEm; });
}

export function updateFoodConsolidation() {
  const prontas = state.foods.filter((f) => f.piscando && Date.now() >= f.consolidaEm);
  if (prontas.length === 0) return;
  // Todas as que ficaram marcadas no MESMO instante nascem juntas — vira 1 estrela no
  // lugar da primeira delas
  const centro = { x: prontas[0].x, y: prontas[0].y };
  prontas.forEach((f) => {
    const idx = state.foods.indexOf(f);
    if (idx >= 0) state.foods.splice(idx, 1);
  });
  state.foods.push({ x: centro.x, y: centro.y, kind: 'bonus', value: 5 });
  return centro; // devolve onde a estrela nasceu, pra quem chamou poder tocar um efeito
}

// Quando uma minhoca morre, ela "derrama" comida no tabuleiro proporcional ao que comeu
export function dropFood(i) {
  for (let n = 0; n < state.foodsEaten[i]; n++) {
    const p = freeCell();
    state.foods.push({ x: p.x, y: p.y, kind: 'drop', value: 1, owner: i, rarity: sortearRaridadeVisual() });
  }
}

// Derrama exatamente 1 comida numa posição específica — usado como custo do turbo (melhoria #2)
export function dropOne(x, y, owner) {
  const p = occupied(x, y) ? freeCell() : { x, y };
  state.foods.push({ x: p.x, y: p.y, kind: 'drop', value: 1, owner, rarity: sortearRaridadeVisual() });
}

// Cria partículas de explosão (usado ao nascer, comer e morrer)
export function burst(x, y, color, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 1.5;
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 24 + Math.random() * 18, color });
  }
}
