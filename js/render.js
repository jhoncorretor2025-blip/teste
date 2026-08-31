// Tudo que é desenhado na tela (canvas): placar, tabuleiro, comidas, minhocas e partículas.

import { $ } from './utils.js';
import { W, H, CELL, ICONS } from './config.js';
import { state } from './state.js';
import { label } from './players.js';

const canvas = $('arenaCanvas');
const ctx = canvas.getContext('2d');

// Campinho de estrelinhas do fundo, geradas uma vez só (melhoria visual #6)
const STARS = Array.from({ length: 55 }, () => ({
  x: Math.random() * W * CELL,
  y: Math.random() * H * CELL,
  r: Math.random() * 1.4 + 0.3,
  speed: 0.1 + Math.random() * 0.22,
  o: 0.12 + Math.random() * 0.35,
}));

function drawStars() {
  const t = Date.now() / 40;
  ctx.save();
  for (const s of STARS) {
    const x = (s.x + t * s.speed) % (W * CELL);
    ctx.globalAlpha = s.o;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Desenha a cabeça da minhoca no formato escolhido pelo jogador (melhoria visual #12)
function drawHead(x, y, shape, color) {
  const cx = x * CELL + 2, cy = y * CELL + 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (shape === 'square') {
    ctx.rect(cx, cy, 16, 16);
  } else if (shape === 'diamond') {
    ctx.moveTo(cx + 8, cy);
    ctx.lineTo(cx + 16, cy + 8);
    ctx.lineTo(cx + 8, cy + 16);
    ctx.lineTo(cx, cy + 8);
    ctx.closePath();
  } else if (shape === 'owl') {
    ctx.roundRect(cx, cy, 16, 16, 6);
  } else {
    ctx.roundRect(cx, cy, 16, 16, 5); // 'round' (padrão)
  }
  ctx.fill();
  if (shape === 'owl') {
    // orelhinhas triangulares
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy + 3); ctx.lineTo(cx - 2, cy - 4); ctx.lineTo(cx + 6, cy + 1);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy + 3); ctx.lineTo(cx + 18, cy - 4); ctx.lineTo(cx + 10, cy + 1);
    ctx.closePath(); ctx.fill();
  }
}

export function renderScores() {
  let h = '';
  for (let i = 0; i < state.count; i++) {
    const boost = state.boosting[i] ? ' • ⚡' : '';
    h += `<div class="score" style="border-color:${state.colors[i]}">${ICONS[i]} <b>${label(i)}</b> • 🍎 ${state.foodsEaten[i] || 0} • ⭐ ${state.scores[i] || 0} • 🎯 ${state.eliminations[i] || 0}${boost}${state.alive[i] ? '' : ' • ☠️'}</div>`;
  }
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
  drawStars();

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
    const boosting = state.boosting[i];

    ctx.save();
    if (boosting) {
      // Brilho/rastro de luz enquanto está turbinando — melhoria visual #3
      ctx.shadowBlur = 16;
      ctx.shadowColor = state.colors[i];
    }
    for (let k = s.length - 1; k >= 0; k--) {
      const p = s[k];
      ctx.globalAlpha = k === 0 ? 1 : (boosting ? 0.92 : 0.82);
      if (k === 0) {
        drawHead(p.x, p.y, state.heads[i] || 'round', state.colors[i]);
      } else {
        ctx.fillStyle = state.colors[i];
        ctx.beginPath();
        ctx.roundRect(p.x * CELL + 2, p.y * CELL + 2, 16, 16, 5);
        ctx.fill();
      }
    }
    ctx.restore();

    // Olhos apontando pra direção que a minhoca tá indo — melhoria visual #2
    const h = s[0];
    const dir = state.dirs[i] || { x: 1, y: 0 };
    const cx = h.x * CELL + 10, cy = h.y * CELL + 10;
    const fx = dir.x * 4, fy = dir.y * 4;
    const px = -dir.y * 4, py = dir.x * 4;
    ctx.fillStyle = '#07110b';
    ctx.beginPath();
    ctx.arc(cx + fx + px, cy + fy + py, 2, 0, Math.PI * 2);
    ctx.arc(cx + fx - px, cy + fy - py, 2, 0, Math.PI * 2);
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

  // Texto flutuante de comemoração (marco de crescimento) — melhoria visual #3
  if (state.toast && Date.now() < state.toast.until) {
    const left = state.toast.until - Date.now();
    ctx.save();
    ctx.globalAlpha = Math.min(1, left / 300);
    ctx.fillStyle = state.toast.color || '#ffd24d';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#000';
    ctx.fillText(state.toast.text, state.toast.x * CELL + 10, state.toast.y * CELL - 14);
    ctx.restore();
  }

  // Clarão vermelho rápido quando alguém morre — melhoria visual #4
  if (state.flash > 0) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255,60,80,${(state.flash / 6) * 0.35})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.restore();
}

export function render() {
  renderScores();
  draw();
}
