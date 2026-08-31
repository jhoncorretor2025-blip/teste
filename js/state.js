// Estado do jogo — tudo que muda durante uma partida vive aqui dentro.
// Todos os outros arquivos importam esse mesmo objeto "state" e leem/alteram ele.

import { COLORS } from './config.js';

export const state = {
  count: 1,
  types: ['human', 'cpu', 'cpu'],
  names: ['Jhon', 'Jogador 2', 'Jogador 3'],
  controls: ['arrows', 'wasd', 'ijkl'],
  colors: [...COLORS], // cor escolhida por cada jogador — melhoria #7
  show: [true, true, true],
  showOthers: true,
  mode: 'classic',
  difficulty: 'normal', // melhoria #3
  running: false,
  paused: false,
  muted: false, // melhoria #8
  timer: null,

  snakes: [],
  alive: [],
  dirs: [],
  nextDirs: [],
  foods: [],
  scores: [],
  foodsEaten: [],
  grow: [],
  respawnAt: [],
  particles: [],
  shake: 0,

  joyId: null,

  // --- Turbo (melhoria #1) — por jogador ---
  boosting: [false, false, false],
  boostUntil: [0, 0, 0],
  boostReadyAt: [0, 0, 0],

  // --- Missão ativa (melhoria #3) ---
  mission: null,

  // --- Recorde salvo no navegador (melhoria #7) ---
  best: 0,

  // --- Eliminações desta sessão, sobrevive a "Reiniciar" (melhoria #10) ---
  eliminations: [0, 0, 0],
};
