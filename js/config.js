// Configurações fixas do jogo — tamanho do tabuleiro, velocidade, cores etc.
// Se quiser deixar o jogo mais rápido, mexa no TICK. Se quiser mais/menos comida, mexa no NORMAL_FOODS.

export const W = 40, H = 31, CELL = 20, NORMAL_FOODS = 3;
export const VERSION = '2.30.2';

// --- Zoom da câmera (quanto do mapa aparece na tela de cada vez) ---
export const ZOOM_LEVELS = [
  { value: 'close', label: '🔍 Câmera Perto', w: 22, h: 17 },
  { value: 'normal', label: '🔎 Câmera Normal', w: 32, h: 25 },
  { value: 'far', label: '🌍 Câmera Longe', w: 44, h: 34 },
];

// --- Cor de fundo do tabuleiro (melhoria #2) ---
export const BG_COLORS = [
  { name: '🌌 Espacial (padrão)', value: '#050911' },
  { name: '🌊 Azul profundo', value: '#031b2e' },
  { name: '🌲 Verde escuro', value: '#04150d' },
  { name: '🟣 Roxo noite', value: '#150a26' },
  { name: '⚫ Preto puro', value: '#000000' },
];

// --- Tamanho do mapa escolhível no menu ---
// "foods" é quantas maçãs normais ficam no tabuleiro ao mesmo tempo — mapas maiores
// pedem mais comida espalhada, senão fica tudo muito vazio.
export const MAP_SIZES = [
  { value: 'small', label: '🔹 Pequeno', w: 28, h: 22, foods: 2 },
  { value: 'medium', label: '🔸 Médio', w: 40, h: 31, foods: 3 },
  { value: 'large', label: '🔷 Grande', w: 56, h: 44, foods: 5 },
];

// --- Velocidade escolhível no menu (melhoria: campo de configuração de velocidade) ---
// "tick" é quanto tempo (em ms) cada passo do jogo demora — quanto menor, mais rápido.
export const SPEEDS = [
  { value: 'slow', label: '🐢 Lenta', tick: 220 },
  { value: 'normal', label: '🚶 Normal', tick: 160 },
  { value: 'fast', label: '🏃 Rápida', tick: 115 },
  { value: 'veryfast', label: '⚡ Muito rápida', tick: 80 },
];
export const TURBO_FACTOR = 0.65; // o modo Turbo Worms roda 35% mais rápido que a velocidade escolhida

export const COLORS = ['#67ef8a', '#ff72bd', '#63b3ff', '#ffd24d', '#b57bff', '#ff9f4d'];
export const ICONS = ['🟢', '🩷', '🔵', '🟡', '🟣', '🟠'];
export const MAX_PLAYERS = 6; // até 5 adversários + você

export const D = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

export const CK = {
  arrows: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
  wasd: ['KeyW', 'KeyS', 'KeyA', 'KeyD'],
  ijkl: ['KeyI', 'KeyK', 'KeyJ', 'KeyL'],
};

export const KD = {
  ArrowUp: D.up, ArrowDown: D.down, ArrowLeft: D.left, ArrowRight: D.right,
  KeyW: D.up, KeyS: D.down, KeyA: D.left, KeyD: D.right,
  KeyI: D.up, KeyK: D.down, KeyJ: D.left, KeyL: D.right,
};

// --- Turbo (botão/tecla) ---
export const BOOST_KEYS = { arrows: 'Space', wasd: 'ShiftLeft', ijkl: 'Enter' };
export const BOOST_DURATION = 1800;
export const BOOST_COOLDOWN = 6000;

// --- Missões ---
export const MISSIONS = [
  { type: 'eat', target: 5, label: '🍎 Coma 5 alimentos', reward: 5 },
  { type: 'eat', target: 10, label: '🍎 Coma 10 alimentos', reward: 8 },
  { type: 'star', target: 1, label: '⭐ Pegue 1 estrela', reward: 5 },
  { type: 'star', target: 2, label: '⭐ Pegue 2 estrelas', reward: 10 },
];

// --- Modo Times: jogadores do mesmo time não se eliminam entre si ---
export const TEAMS = [
  { value: 0, label: '🔵 Time Azul' },
  { value: 1, label: '🔴 Time Vermelho' },
];

// --- Reações rápidas (emojis) pra mandar durante o jogo online ---
export const REACTIONS = ['👍', '😂', '🔥', '❤️', '😮'];

// --- Dificuldade da CPU (melhoria #3) ---
// boostPerSecond é a chance dela usar turbo sozinha A CADA SEGUNDO (não por tick!),
// assim ela não fica turbinando toda hora só porque o modo Turbo Worms roda mais rápido (melhoria #1).
// mistake = chance dela "errar" de propósito e tomar uma direção boba (deixa o Fácil mais fácil de verdade).
// lookahead = no Difícil, ela evita se encurralar em becos sem saída.
export const DIFFICULTY = {
  easy: { label: '🙂 Fácil', mistake: 0.35, boostPerSecond: 0.01, lookahead: false },
  normal: { label: '😐 Médio', mistake: 0.08, boostPerSecond: 0.02, lookahead: false },
  hard: { label: '😈 Difícil', mistake: 0, boostPerSecond: 0.035, lookahead: true },
};

// --- Cores escolhíveis pelos jogadores ---
export const SNAKE_COLORS = [
  { name: '🟢 Verde', hex: '#67ef8a' },
  { name: '🩷 Rosa', hex: '#ff72bd' },
  { name: '🔵 Azul', hex: '#63b3ff' },
  { name: '🟡 Amarelo', hex: '#ffd24d' },
  { name: '🟣 Roxo', hex: '#b57bff' },
  { name: '🟠 Laranja', hex: '#ff9f4d' },
];

// --- Formatos de cabeça escolhíveis ---
export const HEAD_SHAPES = [
  { name: '⚪ Arredondada', value: 'round' },
  { name: '⬛ Quadrada', value: 'square' },
  { name: '🔷 Diamante', value: 'diamond' },
  { name: '🦉 Coruja', value: 'owl' },
  { name: '🐱 Gatinho', value: 'cat' },
  { name: '🐰 Coelhinho', value: 'bunny' },
  { name: '🐲 Dragãozinho', value: 'dragon' },
  { name: '🐻 Ursinho', value: 'bear' },
];

// --- Padrão de pele do corpo (parte da personalização/"skin") ---
export const SKIN_PATTERNS = [
  { name: '◼️ Lisa', value: 'solid' },
  { name: '🟰 Listrada', value: 'stripes' },
  { name: '⚬ Pontilhada', value: 'dots' },
  { name: '🌈 Tricolor', value: 'tricolor' },
];

// --- Marco de crescimento (melhoria #3) ---
export const MILESTONE_STEP = 10;

// Marcos especiais, com festa maior que o marco normal de 10 em 10
export const SPECIAL_MILESTONES = [
  { at: 20, text: '🔥 20! Mandou bem!', color: '#ff9f4d' },
  { at: 50, text: '🌟 50! Sensacional!', color: '#ffd24d' },
  { at: 100, text: '👑 100! LENDÁRIO!', color: '#ff72bd' },
];

// --- Conjuntos de cores prontos pro padrão Tricolor (além dos tons automáticos) ---
export const TRICOLOR_PALETTES = [
  { name: '🎨 Tons da cor principal', value: 'auto' },
  { name: '⚫⚪🔵 Preto, Branco e Azul', value: 'blackwhiteblue', colors: ['#0a0a0a', '#f2f2f2', '#1e5fd6'] },
  { name: '🔴⚪ Vermelho e Branco', value: 'redwhite', colors: ['#d61e2e', '#f2f2f2', '#a3121c'] },
  { name: '🟢🟡🔵 Verde, Amarelo e Azul', value: 'greenyellowblue', colors: ['#159242', '#ffd400', '#1e5fd6'] },
];
