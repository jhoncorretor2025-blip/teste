// Sistema de missões — melhoria #3.
// Uma missão fica ativa por vez (aparece na faixa "🎯 ..." acima da arena).
// Qualquer jogador pode contribuir para completar; quem der o passo final ganha o bônus.
// Além de "comer" e "pegar estrela", também tem "sobreviver" (tempo) e "eliminar" (só
// aparece quando tem mais de 1 jogador, já que sozinho não tem quem eliminar).

import { MISSIONS } from './config.js';
import { state } from './state.js';
import { $, announce } from './utils.js';
import { sfx } from './sound.js';
import { burst } from './food.js';

function pickMission() {
  const pool = MISSIONS.filter((m) => m.type !== 'eliminate' || state.count > 1);
  const m = pool[Math.floor(Math.random() * pool.length)];
  return { ...m, progress: 0, done: false, startedAt: Date.now(), diedSet: new Set() };
}

export function startMission() {
  state.mission = pickMission();
  renderMission();
}

export function renderMission() {
  const box = $('mission');
  if (!box || !state.mission) return;
  const m = state.mission;
  if (m.type === 'survive') {
    const secondsLeft = Math.max(0, m.target - Math.floor((Date.now() - m.startedAt) / 1000));
    box.textContent = `🎯 ${m.label} — faltam ${secondsLeft}s`;
  } else {
    box.textContent = `🎯 ${m.label} — ${Math.min(m.progress, m.target)}/${m.target}`;
  }
}

function completeMission(winnerIdx) {
  const m = state.mission;
  m.done = true;
  if (winnerIdx != null) state.scores[winnerIdx] += m.reward;
  const h = winnerIdx != null ? state.snakes[winnerIdx]?.[0] : null;
  if (h) burst(h.x, h.y, '#ffd24d', 30);
  sfx.mission();
  announce(`Missão completa: ${m.label}!`);
  setTimeout(startMission, 900);
}

// Chamado toda vez que alguém come uma comida — atualiza o progresso se ela contar para a missão atual
export function trackFoodForMission(i, food) {
  const m = state.mission;
  if (!m || m.done) return;
  const counts = (m.type === 'star' && food.kind === 'bonus') || (m.type === 'eat' && food.kind !== 'bonus');
  if (!counts) return;

  m.progress++;
  if (m.progress >= m.target) completeMission(i);
  renderMission();
}

// Chamado quando alguém elimina outro jogador (bateu na cobra de alguém, não na parede)
export function trackEliminationForMission(killerIdx) {
  const m = state.mission;
  if (!m || m.done || m.type !== 'eliminate') return;
  m.progress++;
  if (m.progress >= m.target) completeMission(killerIdx);
  renderMission();
}

// Chamado quando alguém morre — se tiver uma missão de sobreviver rolando, essa pessoa
// "quebrou" a sequência dela (mas os outros continuam podendo completar)
export function trackDeathForMission(deadIdx) {
  const m = state.mission;
  if (!m || m.done || m.type !== 'survive') return;
  m.diedSet.add(deadIdx);
}

// Confere se alguma missão de "sobreviver" já bateu o tempo — chamado a cada tick
export function checkSurvivalMission() {
  const m = state.mission;
  if (!m || m.done || m.type !== 'survive') return;
  if (Date.now() - m.startedAt < m.target * 1000) return;
  // Todo mundo que ficou vivo o tempo todo (não morreu nenhuma vez) ganha a recompensa
  let anyWinner = false;
  for (let i = 0; i < state.count; i++) {
    if (state.alive[i] && !m.diedSet.has(i)) {
      state.scores[i] += m.reward;
      anyWinner = true;
    }
  }
  completeMission(null); // a recompensa já foi distribuída manualmente acima
  if (!anyWinner) announce('Ninguém sobreviveu a tempo — próxima missão!');
}
