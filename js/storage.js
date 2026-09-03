// Guarda o recorde (melhor pontuação) e a preferência de som no navegador do jogador, entre visitas.
// Usa localStorage: fica salvo só naquele navegador/celular, não é compartilhado entre pessoas.

const KEY = 'snakeArenaBest';
const MUTE_KEY = 'snakeArenaMuted';
const VIBE_KEY = 'snakeArenaVibration';

export function loadBest() {
  return Number(localStorage.getItem(KEY)) || 0;
}

// Salva a pontuação se ela for maior que o recorde atual. Devolve o recorde (novo ou o mesmo).
export function saveBest(score) {
  const best = loadBest();
  if (score > best) {
    localStorage.setItem(KEY, String(score));
    return score;
  }
  return best;
}

// Preferência de som mudo
export function loadMuted() {
  return localStorage.getItem(MUTE_KEY) === '1';
}

export function saveMuted(v) {
  localStorage.setItem(MUTE_KEY, v ? '1' : '0');
}

// Preferência de vibração (separada do som mudo)
export function loadVibration() {
  const raw = localStorage.getItem(VIBE_KEY);
  return raw === null ? true : raw === '1'; // liga por padrão se nunca escolheu
}

export function saveVibration(v) {
  localStorage.setItem(VIBE_KEY, v ? '1' : '0');
}

// Lembra o nome, a cor e o formato de cabeça que a pessoa escolheu — melhoria #18
const PROFILE_KEY = 'snakeArenaProfile';

export function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; }
  catch { return {}; }
}

export function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

// Ranking local — comparação de recordes entre quem já jogou nesse aparelho — melhoria #12
const LEADERBOARD_KEY = 'snakeArenaLeaderboard';

export function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || []; }
  catch { return []; }
}

export function addToLeaderboard(name, score) {
  if (!score || score <= 0) return loadLeaderboard();
  const board = loadLeaderboard();
  board.push({ name, score, date: Date.now() });
  board.sort((a, b) => b.score - a.score);
  const trimmed = board.slice(0, 20);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
  return trimmed;
}

// Reseta nome, cor, formato de cabeça, padrão de pele e som mudo pro padrão de fábrica — melhoria #13.
// (Não mexe no recorde nem no ranking — isso é histórico, não configuração.)
export function resetSettings() {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(MUTE_KEY);
}

// Contador de partidas jogadas neste aparelho — conquistas simples
const GAMES_KEY = 'snakeArenaGamesPlayed';
export const GAME_MILESTONES = [10, 25, 50, 100, 200];

export function loadGamesPlayed() {
  return Number(localStorage.getItem(GAMES_KEY)) || 0;
}

export function incrementGamesPlayed() {
  const n = loadGamesPlayed() + 1;
  localStorage.setItem(GAMES_KEY, String(n));
  return n;
}
