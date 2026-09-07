// Estado do jogo — tudo que muda durante uma partida vive aqui dentro.
// Todos os outros arquivos importam esse mesmo objeto "state" e leem/alteram ele.
// Os arrays por jogador vão até 6 posições (você + até 5 adversários).

import { COLORS } from './config.js';

export const state = {
  count: 1,
  types: ['human', 'cpu', 'cpu', 'cpu', 'cpu', 'cpu'],
  names: ['Jhon', 'Jogador 2', 'Jogador 3', 'Jogador 4', 'Jogador 5', 'Jogador 6'],
  controls: ['arrows', 'wasd', 'ijkl', 'custom', 'custom', 'custom'],
  colors: [...COLORS], // cor escolhida por cada jogador
  heads: ['round', 'round', 'round', 'round', 'round', 'round'], // formato de cabeça
  patterns: ['solid', 'solid', 'solid', 'solid', 'solid', 'solid'], // padrão de pele do corpo
  palettes: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto'], // cores usadas no padrão Tricolor
  teamMode: false, // modo times: aliados não se eliminam entre si
  teams: [0, 1, 0, 1, 0, 1], // qual time (0 ou 1) cada jogador está
  touchControl: 'joystick', // controle de toque: 'joystick', 'dpad' ou 'swipe'
  zoom: 'normal', // zoom da câmera — preferência pessoal, cada jogador ajusta o seu
  controlSize: 100, // tamanho dos controles de toque (%), ajustável
  controlsSwapped: false, // inverter lado dos controles (bom pra canhotos)
  bigTextMode: false, // modo texto grande, interface mais simples
  lightMode: false, // modo claro da interface (menu), separado do tema do tabuleiro
  tapVibration: true, // vibração ao tocar nos botões (feedback tátil)
  customKeys: [{}, {}, {}, {}, {}, {}], // teclas personalizadas por jogador (melhoria de mapeamento)
  show: [true, true, true, true, true, true],
  showOthers: true,
  mode: 'classic',
  mapSize: 'medium', // tamanho do mapa escolhido no menu
  mapW: 40, mapH: 31, // dimensões reais do mapa atual (mudam junto com mapSize)
  foodCount: 3,
  speed: 'normal', // velocidade escolhida no menu
  noWalls: false,
  theme: 'space', // tema visual do tabuleiro (fundo, grade e comida) — antes era só cor de fundo
  vibrationOn: true, // vibração pode ser desligada separado do som
  difficulty: 'normal',
  running: false,
  paused: false,
  muted: false,
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
  flash: 0, // clarão vermelho ao morrer
  milestones: [0, 0, 0, 0, 0, 0], // maior marco de tamanho já comemorado
  toast: null, // {x, y, text, color, until} — texto flutuante de comemoração
  reactionToast: null, // {emoji, text, until} — reação rápida recebida de outro jogador
  deathMessage: null, // {text, until} — aviso grande de "Você morreu" pro jogador local
  tournamentMode: false, // modo torneio: melhor de 3 rodadas
  tournamentRound: 0, // rodada atual (1, 2 ou 3)
  tournamentWins: [0, 0, 0, 0, 0, 0], // quantas rodadas cada jogador já venceu no torneio
  tournamentRoundEndsAt: 0, // timestamp de quando a rodada atual termina
  tournamentRoundScore: [0, 0, 0, 0, 0, 0], // pontos acumulados na rodada (não zera ao morrer, ao contrário do score normal)
  tournamentChampion: null, // índice de quem venceu o torneio (definido só quando termina)

  joyId: null,

  // --- Turbo — por jogador ---
  boosting: [false, false, false, false, false, false],
  boostUntil: [0, 0, 0, 0, 0, 0],
  boostReadyAt: [0, 0, 0, 0, 0, 0],
  boostReadySoundPlayed: [false, false, false, false, false, false], // evita tocar o aviso mais de uma vez por espera

  // --- Missão ativa ---
  mission: null,

  // --- Recorde salvo no navegador ---
  best: 0,

  // --- Eliminações desta sessão, sobrevive a "Reiniciar" ---
  eliminations: [0, 0, 0, 0, 0, 0],
  comboCount: [0, 0, 0, 0, 0, 0], // quantas comidas seguidas rápidas — combo de velocidade
  lastEatAt: [0, 0, 0, 0, 0, 0], // timestamp da última comida, pra calcular o combo
};
