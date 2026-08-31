// Tudo que é desenhado na tela (canvas): placar, tabuleiro, comidas, minhocas e partículas.

import { $ } from './utils.js';
import { W, H, CELL, ICONS } from './config.js';
import { state } from './state.js';
import { label } from './players.js';

const canvas = $('arenaCanvas');
const ctx = canvas.getContext('2d');

export function renderScores() {
  let h = '';
  for (let i = 0; i < state.count; i++) {
    const boost = state.boosting[i] ? ' • ⚡' : '';
    h += `<div class="score" style="border-color:${state.colors[i]}">${ICONS[i]} <b>${label(i)}</b> • 🍎 ${state.foodsEaten[i] || 0} • ⭐ ${state.scores[i] || 0} • 🎯 ${state.eliminations[i] || 0}${boost}${state.alive[i] ? '' : ' • ☠️'}</div>`;
  }
  // Recorde salvo neste navegador (melhoria #7)
  h += `<div class="score" style="border-color:#ffd24d">🏅 Recorde: ${state.best || 0}</div>`;
  $('scores').innerHTML = h;
  $('alive').textContent = state.alive.filter(Boolean).length;
}

export function draw() {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.shake) ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);

  ctx.fillStyle = '#050911';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#0d2038';
  for (let x = 0; x <= W; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H * CELL); ctx.stroke(); }
  for (let y = 0; y <= H; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W * CELL, y * CELL); ctx.stroke(); }

  const t = Date.now() / 180;
  for (const f of state.foods) {
    const x = f.x * CELL + 10, y = f.y * CELL + 10;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (f.kind === 'bonus') {
      ctx.font = '24px sans-serif';
      ctx.shadowBlur = 12 + Math.sin(t) * 7;
      ctx.shadowColor = '#ffd24d';
      ctx.fillText('⭐', x, y);
    } else {
      ctx.font = '20px sans-serif';
      ctx.shadowBlur = 8;
      ctx.shadowColor = f.kind === 'drop' ? (state.colors[f.owner] || '#fff') : '#ff4f7a';
      ctx.fillText('🍎', x, y);
    }
    ctx.restore();
  }

  for (let i = 0; i < state.count; i++) if (state.alive[i]) {
    const s = state.snakes[i];
    for (let k = s.length - 1; k >= 0; k--) {
      const p = s[k];
      ctx.fillStyle = state.colors[i];
      ctx.globalAlpha = k === 0 ? 1 : 0.82;
      ctx.beginPath();
      ctx.roundRect(p.x * CELL + 2, p.y * CELL + 2, 16, 16, 5);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const h = s[0];
    ctx.fillStyle = '#07110b';
    ctx.beginPath();
    ctx.arc(h.x * CELL + 6, h.y * CELL + 6, 2, 0, Math.PI * 2);
    ctx.arc(h.x * CELL + 14, h.y * CELL + 6, 2, 0, Math.PI * 2);
    ctx.fill();
    if (state.show[i] && (i === 0 || state.showOthers)) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${label(i)} • 🍎 ${state.foodsEaten[i] || 0}`, h.x * CELL + 10, h.y * CELL - 4);
    }
  }

  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / 40);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x * CELL + 10, p.y * CELL + 10, Math.max(1, p.life / 12), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function render() {
  renderScores();
  draw();
}
