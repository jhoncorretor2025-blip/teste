// Tudo que o jogo guarda no navegador da pessoa (localStorage): recordes, perfil e
// configurações, conquistas, histórico de partidas, atalhos de teclado, escolhas de time.
// Cada dado tem seu par salvar/carregar; todos protegidos com try/catch, então se o
// navegador bloquear o armazenamento (aba anônima, por exemplo) o jogo segue funcionando.
// As chaves ficam nas constantes *_KEY de cada bloco — mude o NOME de uma chave e todo mundo
// perde o que tinha salvo, então evite.

import { ACHIEVEMENTS, BOARD_THEMES, HEAD_SHAPES } from './config.js';

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

// Configurações da Minhoca Caçadora — ficam salvas neste navegador.
// Mantém o código com valores padrão, mas permite personalizar a dificuldade sem editar arquivos.
const HUNTER_SETTINGS_KEY = 'snakeArenaHunterSettings';

export function loadHunterSettings(defaults) {
  try {
    const saved = JSON.parse(localStorage.getItem(HUNTER_SETTINGS_KEY));
    if (!saved || typeof saved !== 'object') return JSON.parse(JSON.stringify(defaults));

    // Migra apenas o antigo padrão da Caçadora. Se a pessoa configurou manualmente,
    // preserva a configuração dela.
    const eraPadraoAntigo =
      saved.milestones?.[0]?.foodThreshold === 100 &&
      saved.milestones?.[0]?.durationSec === 35 &&
      saved.milestones?.[1]?.foodThreshold === 150 &&
      saved.milestones?.[1]?.durationSec === 50 &&
      saved.burstDurationSec === 2.5 &&
      saved.burstIntervalSec === 8 &&
      saved.predictionSteps === 3 &&
      saved.growthPerVictim === 8;
    if (eraPadraoAntigo) return JSON.parse(JSON.stringify(defaults));

    return {
      ...JSON.parse(JSON.stringify(defaults)),
      ...saved,
      milestones: Array.isArray(saved.milestones)
        ? saved.milestones.slice(0, 2).map((m, i) => ({
            ...(defaults.milestones[i] || {}),
            ...(m || {}),
          }))
        : JSON.parse(JSON.stringify(defaults.milestones)),
    };
  } catch {
    return JSON.parse(JSON.stringify(defaults));
  }
}

export function saveHunterSettings(settings) {
  try { localStorage.setItem(HUNTER_SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

// Formata milissegundos num texto amigável tipo "2h 15min" ou "38min"
export function formatPlaytime(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

// Data da última vez que jogou + sequência de dias seguidos jogando — melhoria #14/#17
const LAST_PLAYED_KEY = 'snakeArenaLastPlayedAt';
const STREAK_KEY = 'snakeArenaStreakDays';

export function loadLastPlayedAt() {
  return Number(localStorage.getItem(LAST_PLAYED_KEY)) || null;
}

export function loadStreakDays() {
  return Number(localStorage.getItem(STREAK_KEY)) || 0;
}

// Chamado toda vez que uma partida começa — atualiza a data e a sequência de dias
export function updateStreakAndLastPlayed() {
  const now = Date.now();
  const today = new Date(now).toDateString();
  const previousLastPlayed = loadLastPlayedAt();
  let streak = loadStreakDays();

  if (!previousLastPlayed) {
    streak = 1; // primeira vez jogando
  } else {
    const previousDay = new Date(previousLastPlayed).toDateString();
    if (previousDay === today) {
      // já jogou hoje, mantém a sequência como está
    } else {
      const oneDayMs = 24 * 60 * 60 * 1000;
      const gapDays = Math.round((new Date(today).getTime() - new Date(previousDay).getTime()) / oneDayMs);
      streak = gapDays === 1 ? streak + 1 : 1;
    }
  }

  try {
    localStorage.setItem(LAST_PLAYED_KEY, String(now));
    localStorage.setItem(STREAK_KEY, String(streak));
  } catch {}
  return { lastPlayedAt: previousLastPlayed, streak };
}

// --- Galeria de Conquistas ---
const UNLOCKED_KEY = 'snakeArenaUnlockedAchievements';
const PROGRESS_KEY = 'snakeArenaAchievementProgress';

// Mesmo motivo do cache de progresso acima: algumas conquistas são checadas de novo a
// CADA comidinha comida depois de já desbloqueadas (ex: "century", checada em toda
// comidinha assim que a pontuação passa de 100) — sem cache, isso seria uma leitura de
// localStorage por comidinha pelo resto da partida inteira, à toa, já que o resultado
// nunca muda depois da primeira vez.
let desbloqueadasCache = null;

export function loadUnlockedAchievements() {
  if (desbloqueadasCache) return desbloqueadasCache;
  try { desbloqueadasCache = JSON.parse(localStorage.getItem(UNLOCKED_KEY)) || []; } catch { desbloqueadasCache = []; }
  return desbloqueadasCache;
}

// Correção de desempenho: antes, CADA comidinha comida (mesmo as comuns) disparava uma
// leitura + gravação de verdade no localStorage (JSON.parse/JSON.stringify a cada uma).
// Isso é uma operação SÍNCRONA (trava a thread principal do navegador até terminar) — em
// celulares mais fracos, dá pra sentir como uma "travadinha" bem na hora de comer, já que
// é exatamente quando isso rodava. Agora: lê do localStorage só UMA vez (fica guardado em
// memória depois), e a GRAVAÇÃO fica represada — no máximo uma vez a cada meio segundo —
// mesmo comendo várias comidinhas seguidas rapidamente. Os números continuam certinhos na
// hora (é a leitura de disco que é adiada, não a conta), e nada se perde: ainda grava na
// hora quando uma conquista é desbloqueada, e também ao pausar/trocar de aba/fechar.
let progressoCache = null;
let gravacaoPendente = null;

function loadAchievementProgress() {
  if (progressoCache) return progressoCache;
  try {
    progressoCache = { totalFoods: 0, totalStars: 0, totalMissions: 0, onlineGames: 0, themesUsed: [], headsUsed: [], ...JSON.parse(localStorage.getItem(PROGRESS_KEY)) };
  } catch {
    progressoCache = { totalFoods: 0, totalStars: 0, totalMissions: 0, onlineGames: 0, themesUsed: [], headsUsed: [] };
  }
  return progressoCache;
}

function gravarProgressoAgora() {
  if (gravacaoPendente) { clearTimeout(gravacaoPendente); gravacaoPendente = null; }
  if (!progressoCache) return;
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressoCache)); } catch {}
}

function saveAchievementProgress(progress) {
  progressoCache = progress; // o valor em memória já fica certo na hora
  if (gravacaoPendente) return; // já tem uma gravação agendada — essa chamada só atualiza o cache
  gravacaoPendente = setTimeout(gravarProgressoAgora, 500);
}

// Se a pessoa trocar de aba, minimizar ou fechar o jogo, garante que o progresso mais
// recente (mesmo que ainda represado) não se perde
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') gravarProgressoAgora(); });
  window.addEventListener?.('pagehide', gravarProgressoAgora);
}

// Desbloqueia uma conquista (se ainda não tiver sido) e retorna os dados dela se for
// a primeira vez — quem chamou usa isso pra mostrar um aviso festivo na tela
export function unlockAchievement(id) {
  const unlocked = loadUnlockedAchievements();
  if (unlocked.includes(id)) return null; // já desbloqueada — some daqui sem tocar no localStorage
  unlocked.push(id);
  desbloqueadasCache = unlocked; // atualiza o cache também, não só o localStorage
  try { localStorage.setItem(UNLOCKED_KEY, JSON.stringify(unlocked)); } catch {}
  return ACHIEVEMENTS.find((a) => a.id === id) || null;
}

// Soma nos contadores cumulativos (comida/estrela/missão/tema/cabeça) e desbloqueia
// automaticamente qualquer conquista cumulativa que tenha batido a meta agora
export function trackCumulativeProgress(field, amountOrValue) {
  const progress = loadAchievementProgress();
  const newlyUnlocked = [];

  if (field === 'themesUsed' || field === 'headsUsed') {
    if (!progress[field].includes(amountOrValue)) progress[field].push(amountOrValue);
  } else {
    progress[field] = (progress[field] || 0) + amountOrValue;
  }
  saveAchievementProgress(progress);

  for (const a of ACHIEVEMENTS.filter((x) => x.cumulative === field)) {
    const target = a.target === 'ALL_THEMES' ? BOARD_THEMES.length : a.target === 'ALL_HEADS' ? HEAD_SHAPES.length : a.target;
    const current = Array.isArray(progress[field]) ? progress[field].length : progress[field];
    if (current >= target) {
      const unlocked = unlockAchievement(a.id);
      if (unlocked) newlyUnlocked.push(unlocked);
    }
  }
  return newlyUnlocked;
}

// --- Histórico de confrontos com um amigo específico (por nome), online ---
const MATCH_HISTORY_KEY = 'snakeArenaMatchHistory';

export function loadMatchHistory(partnerName) {
  try {
    const all = JSON.parse(localStorage.getItem(MATCH_HISTORY_KEY)) || {};
    return all[partnerName] || { wins: 0, losses: 0 };
  } catch { return { wins: 0, losses: 0 }; }
}

export function recordMatchResult(partnerName, won, stats = {}) {
  if (!partnerName) return;
  try {
    const all = JSON.parse(localStorage.getItem(MATCH_HISTORY_KEY)) || {};
    const entry = { wins:0, losses:0, games:0, totalScore:0, bestScore:0, totalFood:0, totalEliminations:0, ...(all[partnerName] || {}) };
    if (won) entry.wins++; else entry.losses++;
    entry.games++;
    entry.totalScore += Number(stats.score) || 0;
    entry.bestScore = Math.max(entry.bestScore || 0, Number(stats.score) || 0);
    entry.totalFood += Number(stats.food) || 0;
    entry.totalEliminations += Number(stats.eliminations) || 0;
    all[partnerName] = entry;
    localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(all));
  } catch {}
}

// Atalhos de teclado remapeáveis (melhoria #1)
const SHORTCUTS_KEY = 'snakeArenaShortcuts';
export function saveShortcuts(shortcuts) {
  try { localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts)); } catch {}
}
export function loadShortcuts() {
  try { return JSON.parse(localStorage.getItem(SHORTCUTS_KEY)); } catch { return null; }
}

// Escolhas de time que valem a pena lembrar entre uma visita e outra: o tamanho de cada lado
// (pra quem cria a sala) e "no time de quem criou / no adversário" (pra quem entra).
const TEAM_PREFS_KEY = 'snakeArenaTeamPrefs';
export function saveTeamPrefs(prefs) {
  try { localStorage.setItem(TEAM_PREFS_KEY, JSON.stringify(prefs)); } catch {}
}
export function loadTeamPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(TEAM_PREFS_KEY));
    return p && typeof p === 'object' && !Array.isArray(p) ? p : null;
  } catch { return null; }
}
