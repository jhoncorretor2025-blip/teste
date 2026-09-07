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

// Recorde separado por modo (Clássico, Turbo Worms, Torneio) — melhoria #6
const MODE_BEST_KEY = 'snakeArenaBestByMode';

function modeLabelKey(mode, tournamentMode) {
  if (tournamentMode) return 'tournament';
  return mode === 'turbo' ? 'turbo' : 'classic';
}

export function loadBestByMode(mode, tournamentMode) {
  try {
    const all = JSON.parse(localStorage.getItem(MODE_BEST_KEY)) || {};
    return all[modeLabelKey(mode, tournamentMode)] || 0;
  } catch { return 0; }
}

export function saveBestByMode(mode, tournamentMode, score) {
  try {
    const all = JSON.parse(localStorage.getItem(MODE_BEST_KEY)) || {};
    const key = modeLabelKey(mode, tournamentMode);
    const best = all[key] || 0;
    if (score > best) {
      all[key] = score;
      localStorage.setItem(MODE_BEST_KEY, JSON.stringify(all));
      return score;
    }
    return best;
  } catch { return score; }
}

export function loadAllModeBests() {
  try { return JSON.parse(localStorage.getItem(MODE_BEST_KEY)) || {}; } catch { return {}; }
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

// Estatísticas da sessão de hoje — separado do total histórico, reseta sozinho todo dia
const SESSION_KEY = 'snakeArenaSessionStats';

export function incrementSessionGames() {
  const today = new Date().toDateString();
  let data = {};
  try { data = JSON.parse(localStorage.getItem(SESSION_KEY)) || {}; } catch {}
  if (data.date !== today) data = { date: today, count: 0 };
  data.count = (data.count || 0) + 1;
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {}
  return data.count;
}

export function loadSessionGamesToday() {
  const today = new Date().toDateString();
  try {
    const data = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (data?.date === today) return data.count || 0;
  } catch {}
  return 0;
}

// Tempo total jogado (soma de todas as partidas) — melhoria #9
const PLAYTIME_KEY = 'snakeArenaTotalPlaytimeMs';

export function addPlaytime(ms) {
  const total = (Number(localStorage.getItem(PLAYTIME_KEY)) || 0) + ms;
  try { localStorage.setItem(PLAYTIME_KEY, String(total)); } catch {}
  return total;
}

export function loadTotalPlaytime() {
  return Number(localStorage.getItem(PLAYTIME_KEY)) || 0;
}

// Formata milissegundos num texto amigável tipo "2h 15min" ou "38min"
export function formatPlaytime(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}
