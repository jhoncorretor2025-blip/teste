// Mostra o ranking local: comparação de recordes entre quem já jogou nesse aparelho.
// Fica salvo só no navegador (localStorage), então funciona bem quando os amigos passam
// o mesmo celular de mão em mão pra jogar, cada um com seu nome. Clicando em "Ver ranking
// completo" expande de 5 pra até 20 posições, com data de quando cada um jogou.

import { $ } from './utils.js';
import { loadLeaderboard } from './storage.js';

const MEDALS = ['🥇', '🥈', '🥉'];
let expanded = false;

function escapeHtml(s) {
  return String(s).replace(/[<>]/g, '');
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function renderLeaderboard() {
  const box = $('leaderboardList');
  const toggleBtn = $('leaderboardToggle');
  if (!box) return;
  const board = loadLeaderboard();

  if (!board.length) {
    box.textContent = 'Ninguém jogou ainda neste aparelho — joga uma partida pra aparecer aqui!';
    if (toggleBtn) toggleBtn.classList.add('hidden');
    return;
  }

  const limit = expanded ? 20 : 5;
  box.innerHTML = board
    .slice(0, limit)
    .map((e, i) => `<div>${MEDALS[i] || `${i + 1}.`} <b>${escapeHtml(e.name)}</b> — ${e.score} pts <span style="opacity:.6">(${formatDate(e.date)})</span></div>`)
    .join('');

  if (toggleBtn) {
    toggleBtn.classList.toggle('hidden', board.length <= 5);
    toggleBtn.textContent = expanded ? 'Ver só os 5 melhores' : `Ver ranking completo (${Math.min(board.length, 20)})`;
  }
}

export function toggleLeaderboard() {
  expanded = !expanded;
  renderLeaderboard();
}
