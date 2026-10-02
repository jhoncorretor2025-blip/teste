// Configurações fixas do jogo — tamanho do tabuleiro, velocidade, cores etc.
// Se quiser deixar o jogo mais rápido, mexa no TICK. Se quiser mais/menos comida, mexa no NORMAL_FOODS.

export const W = 40, H = 31, CELL = 20, NORMAL_FOODS = 3;
export const VERSION = '4.0.0';

// --- Galeria de Conquistas — cada uma tem um jeito próprio de ser desbloqueada.
// "cumulative" são as que somam ao longo de VÁRIAS partidas (guardadas à parte);
// as outras são checadas dentro de UMA partida só (em loop.js/mission.js).
export const ACHIEVEMENTS = [
  // 🟢 Iniciante — do mais fácil ao mais difícil
  { id: 'first_game', name: 'Primeira Partida', desc: 'Jogue sua primeira partida', icon: '🎮', category: 'iniciante' },
  { id: 'first_food', name: 'Primeira Mordida', desc: 'Coma sua primeira comidinha', icon: '🍎', category: 'iniciante' },
  { id: 'boost_first', name: 'Primeiro Turbo', desc: 'Use o turbo pela primeira vez', icon: '⚡', category: 'iniciante' },
  { id: 'score_25', name: 'Começo Forte', desc: 'Faça 25 pontos numa partida', icon: '⭐', category: 'iniciante' },
  { id: 'food_10', name: 'Bom Apetite', desc: 'Coma 10 pontos de comida numa partida', icon: '🥕', category: 'iniciante' },
  { id: 'survive_30', name: 'Aguentou Firme', desc: 'Sobreviva 30 segundos sem morrer', icon: '🛡️', category: 'iniciante' },
  { id: 'length_15', name: 'Crescendo', desc: 'Chegue a 15 segmentos numa partida', icon: '🐛', category: 'iniciante' },
  { id: 'first_star', name: 'Estrela Cadente', desc: 'Pegue sua primeira estrela', icon: '🌟', category: 'iniciante' },
  { id: 'score_50', name: 'Meio Centenar', desc: 'Faça 50 pontos numa partida', icon: '🏅', category: 'iniciante' },
  { id: 'games_5', name: 'Frequentador', desc: 'Jogue 5 partidas no total', icon: '🎮', category: 'iniciante' },
  { id: 'no_walls', name: 'Sem Limites', desc: 'Jogue uma partida sem paredes', icon: '🌀', category: 'iniciante' },
  { id: 'length_20', name: 'Minhoca Crescida', desc: 'Chegue a 20 segmentos numa partida', icon: '🪱', category: 'iniciante' },
  { id: 'food_25', name: 'Fome de Vitória', desc: 'Coma 25 pontos de comida numa partida', icon: '🍏', category: 'iniciante' },
  { id: 'games_10', name: 'Ritmo de Jogo', desc: 'Jogue 10 partidas no total', icon: '🎯', category: 'iniciante' },

  // 🟡 Intermediário — do mais fácil ao mais difícil
  { id: 'appetite', name: 'Grande Apetite', desc: 'Coma 50 pontos de comida no total', icon: '🍎', cumulative: 'totalFoods', target: 50, category: 'intermediario' },
  { id: 'combo_master', name: 'Combo Mestre', desc: 'Faça um combo de velocidade x5 numa partida', icon: '🔥', category: 'intermediario' },
  { id: 'century', name: 'Century', desc: 'Faça 100 pontos numa única partida', icon: '💯', category: 'intermediario' },
  { id: 'length_25', name: 'Minhoca Robusta', desc: 'Chegue a 25 segmentos numa partida', icon: '🐍', category: 'intermediario' },
  { id: 'boost_10', name: 'Turbo Frequente', desc: 'Use o turbo 10 vezes numa partida', icon: '⚡', category: 'intermediario' },
  { id: 'survivor', name: 'Sobrevivente', desc: 'Sobreviva 2 minutos numa partida sem morrer', icon: '🛡️', category: 'intermediario' },
  { id: 'score_250', name: 'Pontuador', desc: 'Faça 250 pontos numa partida', icon: '💎', category: 'intermediario' },
  { id: 'combo_10', name: 'Combo Explosivo', desc: 'Faça um combo de velocidade x10', icon: '💥', category: 'intermediario' },
  { id: 'length_35', name: 'Gigante em Formação', desc: 'Chegue a 35 segmentos numa partida', icon: '🐉', category: 'intermediario' },
  { id: 'score_350', name: 'Alta Pontuação', desc: 'Faça 350 pontos numa partida', icon: '🚀', category: 'intermediario' },
  { id: 'survive_5m', name: 'Resistência', desc: 'Sobreviva 5 minutos sem morrer', icon: '⏱️', category: 'intermediario' },
  { id: 'hunter_escape', name: 'Escapou da Caçadora', desc: 'Sobreviva a uma aparição inteira da Minhoca Caçadora', icon: '💀', category: 'intermediario' },
  { id: 'eliminator', name: 'Eliminador', desc: 'Elimine 3 adversários numa partida só', icon: '⚔️', category: 'intermediario' },
  { id: 'tournament_champion', name: 'Campeão de Torneio', desc: 'Vença um Modo Torneio', icon: '🏆', category: 'intermediario' },

  // 🔴 Avançado — do mais fácil ao mais difícil
  { id: 'social', name: 'Sociável', desc: 'Jogue uma partida online com um amigo', icon: '👥', category: 'avancado' },
  { id: 'collector', name: 'Colecionador', desc: 'Experimente todos os formatos de cabeça', icon: '🐍', cumulative: 'headsUsed', target: 'ALL_HEADS', category: 'avancado' },
  { id: 'chameleon', name: 'Camaleão', desc: 'Jogue em todos os temas de tabuleiro', icon: '🌈', cumulative: 'themesUsed', target: 'ALL_THEMES', category: 'avancado' },
  { id: 'star_hunter', name: 'Caçador de Estrelas', desc: 'Pegue 10 estrelas no total', icon: '⭐', cumulative: 'totalStars', target: 10, category: 'avancado' },
  { id: 'mission_master', name: 'Missão Cumprida', desc: 'Complete 10 missões no total', icon: '🎯', cumulative: 'totalMissions', target: 10, category: 'avancado' },
  { id: 'score_500', name: 'Imparável', desc: 'Faça 500 pontos numa partida', icon: '🚀', category: 'avancado' },
  { id: 'length_50', name: 'Gigante', desc: 'Chegue a 50 segmentos numa partida', icon: '🐉', category: 'avancado' },
  { id: 'eliminator_5', name: 'Caçador de Inimigos', desc: 'Elimine 5 adversários numa partida', icon: '☠️', category: 'avancado' },
  { id: 'second_bonus_5', name: 'Virada Especial', desc: 'Pegue as 5 comidinhas especiais do 2º lugar', icon: '💎', category: 'avancado' },
  { id: 'tournament_3wins', name: 'Tricampeão', desc: 'Vença 3 rodadas no total de um torneio', icon: '👑', category: 'avancado' },
  { id: 'score_1000', name: 'Lenda da Arena', desc: 'Alcance 1.000 pontos numa partida', icon: '👑', category: 'avancado' },
  { id: 'length_75', name: 'Colosso', desc: 'Chegue a 75 segmentos numa partida', icon: '🦖', category: 'avancado' },
  { id: 'eliminator_10', name: 'Destruidor', desc: 'Elimine 10 adversários numa partida', icon: '💀', category: 'avancado' },
  { id: 'score_1500', name: 'Mestre da Arena', desc: 'Alcance 1.500 pontos numa partida', icon: '🏆', category: 'avancado' },

  // 🌐 Online — do mais fácil ao mais difícil
  { id: 'online_first', name: 'Primeira Conexão', desc: 'Jogue sua primeira partida online', icon: '🌐', category: 'online' },
  { id: 'online_first_food', name: 'Primeira Mordida Online', desc: 'Coma sua primeira comidinha em uma partida online', icon: '🍎', category: 'online' },
  { id: 'online_trio', name: 'Trio Online', desc: 'Jogue uma partida online com 3 ou mais jogadores', icon: '👥', category: 'online' },
  { id: 'online_team', name: 'Time Unido', desc: 'Jogue uma partida online no modo Times', icon: '🤝', category: 'online' },
  { id: 'online_3_games', name: 'Conexão Frequente', desc: 'Jogue 3 partidas online', icon: '🔗', cumulative: 'onlineGames', target: 3, category: 'online' },
  { id: 'online_food_25', name: 'Banquete Online', desc: 'Coma 25 pontos de comida em uma partida online', icon: '🍽️', category: 'online' },
  { id: 'online_10_games', name: 'Veterano Online', desc: 'Jogue 10 partidas online', icon: '🛰️', cumulative: 'onlineGames', target: 10, category: 'online' },
  { id: 'online_score_100', name: 'Centena Online', desc: 'Faça 100 pontos em uma partida online', icon: '💯', category: 'online' },
  { id: 'online_kill_1', name: 'Primeiro Abate Online', desc: 'Elimine um adversário em uma partida online', icon: '⚔️', category: 'online' },
  { id: 'online_survive_2m', name: 'Sobrevivente Online', desc: 'Sobreviva 2 minutos em uma partida online', icon: '🛡️', category: 'online' },
  { id: 'online_full_room', name: 'Sala Completa', desc: 'Jogue uma partida online com 6 jogadores', icon: '🏟️', category: 'online' },
  { id: 'online_kill_3', name: 'Caçador Online', desc: 'Elimine 3 adversários em uma partida online', icon: '☠️', category: 'online' },
  { id: 'online_score_500', name: 'Mestre Online', desc: 'Faça 500 pontos em uma partida online', icon: '🚀', category: 'online' },
  { id: 'online_champion', name: 'Campeão Online', desc: 'Vença um torneio online', icon: '👑', category: 'online' },
];


// --- Minhoca Caçadora: aparece quando o líder come muita comida, persegue ele
// por um tempo, é invencível (mata quem tocar, mas ninguém consegue matá-la) ---
// --- Configuração da Minhoca Caçadora ---
// Os valores abaixo são os mesmos comportamentos que já existiam no código,
// agora expostos na interface. O usuário pode ajustar sem editar JavaScript.
export const HUNTER_DEFAULTS = {
  enabled: true,
  progressiveDifficulty: true,
  milestones: [
    { foodThreshold: 100, durationSec: 15 },
    { foodThreshold: 150, durationSec: 15 },
    { foodThreshold: 200, durationSec: 18 },
    { foodThreshold: 250, durationSec: 18 },
    { foodThreshold: 300, durationSec: 22 },
  ],
  distractionRadius: 4,
  distractionDurationSec: 2,
  burstDurationSec: 1.5,
  burstIntervalSec: 12,
  predictionSteps: 1,
  bodyLength: 35,
  growthPerVictim: 2,
};

// Compatibilidade: partes antigas do jogo ainda importam esta constante.
export const HUNTER_MILESTONES = HUNTER_DEFAULTS.milestones;

// --- Zoom da câmera (quanto do mapa aparece na tela de cada vez) ---
export const ZOOM_LEVELS = [
  { value: 'close', label: '🔍 Câmera Perto', w: 22, h: 17 },
  { value: 'normal', label: '🔎 Câmera Normal', w: 32, h: 25 },
  { value: 'far', label: '🌍 Câmera Longe', w: 44, h: 34 },
];

// --- Cor de fundo do tabuleiro (melhoria #2) ---
// --- Temas completos de tabuleiro (fundo + grade + comida) — melhoria de design ---
// Cada tema tem: fundo (bg), tom mais claro do brilho no centro (bg2), linhas do tabuleiro
// (grid), a comidinha (food), uma cor de destaque (accent) e o tipo de decoração animada
// que flutua no fundo (deco) — assim trocar de tema muda o MAPA todo, não só a comidinha.
export const BOARD_THEMES = [
  // 🌌 Universo & Fantasia
  { value: 'space',    name: '🌌 Espacial',           bg: '#07152b', bg2: '#173d72', grid: '#24508a', food: '🍎', accent: '#ffffff', deco: 'stars', category: 'universe' },
  { value: 'night',    name: '🟣 Roxo Noite',         bg: '#241040', bg2: '#47217f', grid: '#3a2266', food: '🍒', accent: '#e0bcff', deco: 'sparkles', category: 'universe' },
  { value: 'void',     name: '⚫ Vazio',              bg: '#000000', bg2: '#0c0c0c', grid: '#1a1a1a', food: '🍎', accent: '#ffffff', deco: 'none', category: 'universe' },
  { value: 'cyber',    name: '🤖 Cyber Neon',         bg: '#07121f', bg2: '#15354b', grid: '#18b9d8', food: '🔷', accent: '#8cf5ff', deco: 'stars', category: 'universe' },
  { value: 'aurora',   name: '🌌 Aurora Boreal',      bg: '#071c27', bg2: '#153f3a', grid: '#2e8c79', food: '🫐', accent: '#b6ffe7', deco: 'sparkles', category: 'universe' },

  // 🌿 Natureza
  { value: 'forest',   name: '🌲 Floresta',           bg: '#0a2a17', bg2: '#17572d', grid: '#1c4a2c', food: '🍄', accent: '#9be37f', deco: 'spores', category: 'nature' },
  { value: 'garden',   name: '🌸 Jardim de Flores',   bg: '#294b22', bg2: '#56833b', grid: '#477034', food: '🌸', accent: '#ff9ecb', deco: 'petals', category: 'nature' },
  { value: 'sunflower',name: '🌻 Campo de Girassóis', bg: '#35551f', bg2: '#6e8d32', grid: '#58742c', food: '🌻', accent: '#ffd24d', deco: 'petals', category: 'nature' },
  { value: 'jungle',   name: '🌴 Selva Tropical',     bg: '#082a24', bg2: '#17634a', grid: '#248060', food: '🍌', accent: '#caffb2', deco: 'spores', category: 'nature' },
  { value: 'swamp',    name: '🐸 Pântano',            bg: '#172619', bg2: '#344e26', grid: '#536f34', food: '🫛', accent: '#d5f29b', deco: 'bubbles', category: 'nature' },

  // 🌊 Água & Gelo
  { value: 'deep',     name: '🌊 Azul Profundo',      bg: '#04304f', bg2: '#095985', grid: '#0f5378', food: '🍇', accent: '#a8ecff', deco: 'bubbles', category: 'water' },
  { value: 'ice',      name: '❄️ Gelo',               bg: '#173f55', bg2: '#275971', grid: '#3a6d87', food: '🐟', accent: '#ffffff', deco: 'snow', category: 'water' },
  { value: 'ocean',    name: '🐠 Oceano Tropical',     bg: '#06384a', bg2: '#087a78', grid: '#14a8a0', food: '🐠', accent: '#b8ffff', deco: 'bubbles', category: 'water' },
  { value: 'glacier',  name: '🧊 Geleira',             bg: '#102d3c', bg2: '#3c7087', grid: '#71a9bf', food: '🧊', accent: '#eefcff', deco: 'snow', category: 'water' },

  // 🏜️ Aventura
  { value: 'desert',   name: '🏜️ Deserto',            bg: '#40230f', bg2: '#79491e', grid: '#6b3f1e', food: '🌵', accent: '#f2d58f', deco: 'sand', category: 'adventure' },
  { value: 'volcano',  name: '🌋 Vulcão',              bg: '#250c0b', bg2: '#5a2114', grid: '#8a3a1f', food: '🔥', accent: '#ffd0a1', deco: 'sand', category: 'adventure' },
  { value: 'canyon',   name: '🏞️ Cânion',              bg: '#2e1c16', bg2: '#67412d', grid: '#8b5a3c', food: '🪨', accent: '#ffe0bf', deco: 'sand', category: 'adventure' },
  { value: 'sunset',   name: '🌅 Pôr do Sol',          bg: '#3a1625', bg2: '#74432a', grid: '#9b6641', food: '🍊', accent: '#ffe0a6', deco: 'sparkles', category: 'adventure' },

  // 🎪 Divertidos & Especiais
  { value: 'candy',    name: '🍭 Mundo Doce',           bg: '#351a35', bg2: '#6c3567', grid: '#9b5e9a', food: '🍬', accent: '#ffd8ff', deco: 'sparkles', category: 'fun' },
  { value: 'city',     name: '🏙️ Cidade Neon',         bg: '#101523', bg2: '#252e55', grid: '#5966aa', food: '🍔', accent: '#e6ecff', deco: 'stars', category: 'fun' },
  { value: 'autumn',   name: '🍂 Outono',               bg: '#321c12', bg2: '#6c3a20', grid: '#87502d', food: '🍂', accent: '#ffd8ad', deco: 'petals', category: 'fun' },
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
  { type: 'survive', target: 20, label: '🛡️ Sobreviva 20 segundos sem morrer', reward: 10 },
  { type: 'eliminate', target: 1, label: '⚔️ Elimine 1 adversário', reward: 12 },
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
  easymid: { label: '😌 Fácil+', mistake: 0.20, boostPerSecond: 0.015, lookahead: false },
  normal: { label: '😐 Médio', mistake: 0.08, boostPerSecond: 0.02, lookahead: false },
  hardmid: { label: '😬 Médio+', mistake: 0.04, boostPerSecond: 0.028, lookahead: true },
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
  { name: '⚪ Arredondada', value: 'round', category: 'classic' },
  { name: '⬛ Quadrada', value: 'square', category: 'classic' },
  { name: '🔷 Diamante', value: 'diamond', category: 'classic' },

  { name: '🦉 Coruja', value: 'owl', category: 'animals' },
  { name: '🐱 Gatinho', value: 'cat', category: 'animals' },
  { name: '🐰 Coelhinho', value: 'bunny', category: 'animals' },
  { name: '🐲 Dragãozinho', value: 'dragon', category: 'animals' },
  { name: '🐻 Ursinho', value: 'bear', category: 'animals' },
  { name: '🦊 Raposinha', value: 'fox', category: 'animals' },
  { name: '🦈 Tubarão', value: 'shark', category: 'animals' },
  { name: '🐝 Abelinha', value: 'bee', category: 'animals' },
  { name: '🐵 Macaquinho', value: 'monkey', category: 'animals' },
  { name: '🦁 Leãozinho', value: 'lion', category: 'animals' },

  { name: '🦄 Unicórnio', value: 'unicorn', category: 'fantasy' },
  { name: '👽 Alienígena', value: 'alien', category: 'fantasy' },

  { name: '🌻 Girassol', value: 'sunflower', category: 'special' },
  { name: '🌹 Rosa', value: 'rose', category: 'special' },
  { name: '🏴‍☠️ Pirata', value: 'pirata', category: 'special' },
  { name: '🤖 Robô', value: 'robot', category: 'special' },
  { name: '💀 Caveira', value: 'skull', category: 'special' },
];

// --- Padrão de pele do corpo (parte da personalização/"skin") ---
export const SKIN_PATTERNS = [
  { name: '◼️ Lisa', value: 'solid', category: 'classic' },
  { name: '🟰 Listrada', value: 'stripes', category: 'classic' },
  { name: '⚬ Pontilhada', value: 'dots', category: 'classic' },
  { name: '🌈 Tricolor', value: 'tricolor', category: 'classic' },
  { name: '💚 Neon', value: 'neon', category: 'themed' },
  { name: '🔥 Fogo', value: 'fire', category: 'themed' },
  { name: '❄️ Gelo', value: 'ice', category: 'themed' },
  { name: '🌌 Galáxia', value: 'galaxy', category: 'themed' },
  { name: '⚡ Elétrico', value: 'electric', category: 'themed' },
  { name: '☣️ Veneno', value: 'venom', category: 'themed' },
];

// --- Marco de crescimento (melhoria #3) ---
export const MILESTONE_STEP = 10;

// Marcos especiais, com festa maior que o marco normal de 10 em 10
export const SPECIAL_MILESTONES = [
  { at: 20, text: '🔥 20! Mandou bem!', color: '#ff9f4d' },
  { at: 50, text: '🌟 50! Sensacional!', color: '#ffd24d' },
  { at: 100, text: '👑 100! LENDÁRIO!', color: '#ff72bd' },
];

// --- Modo Torneio: melhor de 3 rodadas cronometradas, ganha quem vencer mais rodadas ---
export const TOURNAMENT_ROUNDS = 3;
export const TOURNAMENT_ROUND_MS = 60000; // 60 segundos por rodada

// --- Conjuntos de cores prontos pro padrão Tricolor (além dos tons automáticos) ---
export const TRICOLOR_PALETTES = [
  { name: '🎨 Tons da cor principal', value: 'auto' },
  { name: '⚫⚪🔵 Preto, Branco e Azul', value: 'blackwhiteblue', colors: ['#0a0a0a', '#f2f2f2', '#1e5fd6'] },
  { name: '🔴⚪ Vermelho e Branco', value: 'redwhite', colors: ['#d61e2e', '#f2f2f2', '#a3121c'] },
  { name: '🟢🟡🔵 Verde, Amarelo e Azul', value: 'greenyellowblue', colors: ['#159242', '#ffd400', '#1e5fd6'] },
];
