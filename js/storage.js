// Guarda o recorde (melhor pontuação) e a preferência de som no navegador do jogador, entre visitas.
// Usa localStorage: fica salvo só naquele navegador/celular, não é compartilhado entre pessoas.

const KEY = 'snakeArenaBest';
const MUTE_KEY = 'snakeArenaMuted';

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

// Lembra o nome, a cor e o formato de cabeça que a pessoa escolheu — melhoria #18
const PROFILE_KEY = 'snakeArenaProfile';

export function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; }
  catch { return {}; }
}

export function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}
