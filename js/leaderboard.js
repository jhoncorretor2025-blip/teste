// Mostra o ranking local: comparação de recordes entre quem já jogou nesse aparelho — melhoria #12.
// Fica salvo só no navegador (localStorage), então funciona bem quando os amigos passam
// o mesmo celular de mão em mão pra jogar, cada um com seu nome.

import { $ } from './utils.js';
import { loadLeaderboard } from './storage.js';

const MEDALS = ['🥇', '🥈', '🥉'];

function escapeHtml(s) {
  return String(s).replace(/[<>]/g, '');
}

export function renderLeaderboard() {
  const box = $('leaderboardList');
  if (!box) return;
  const board = loadLeaderboard();

  if (!board.length) {
    box.textContent = 'Ninguém jogou ainda neste aparelho — joga uma partida pra aparecer aqui!';
    return;
  }

  box.innerHTML = board
    .slice(0, 5)
    .map((e, i) => `<div>${MEDALS[i] || `${i + 1}.`} <b>${escapeHtml(e.name)}</b> — ${e.score} pts</div>`)
    .join('');
}
