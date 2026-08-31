// Guarda o recorde (melhor pontuação) no navegador do jogador, entre visitas — melhoria #7.
// Usa localStorage: fica salvo só naquele navegador/celular, não é compartilhado entre pessoas.

const KEY = 'snakeArenaBest';

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
