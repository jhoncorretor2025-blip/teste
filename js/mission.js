// Sistema de missões — melhoria #3.
// Uma missão fica ativa por vez (aparece na faixa "🎯 ..." acima da arena).
// Qualquer jogador pode contribuir para completar; quem der o passo final ganha o bônus.

import { MISSIONS } from './config.js';
import { state } from './state.js';
import { $, announce } from './utils.js';
import { sfx } from './sound.js';
import { burst } from './food.js';

function pickMission() {
  const m = MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
  return { ...m, progress: 0, done: false };
}

export function startMission() {
  state.mission = pickMission();
  renderMission();
}

export function renderMission() {
  const box = $('mission');
  if (!box || !state.mission) return;
  const m = state.mission;
  box.textContent = `🎯 ${m.label} — ${Math.min(m.progress, m.target)}/${m.target}`;
}

// Chamado toda vez que alguém come uma comida — atualiza o progresso se ela contar para a missão atual
export function trackFoodForMission(i, food) {
  const m = state.mission;
  if (!m || m.done) return;
  const counts = (m.type === 'star' && food.kind === 'bonus') || (m.type === 'eat' && food.kind !== 'bonus');
  if (!counts) return;

  m.progress++;
  if (m.progress >= m.target) {
    m.done = true;
    state.scores[i] += m.reward;
    const h = state.snakes[i]?.[0];
    if (h) burst(h.x, h.y, '#ffd24d', 30);
    sfx.mission();
    announce(`Missão completa: ${m.label}!`);
    setTimeout(startMission, 900);
  }
  renderMission();
}
