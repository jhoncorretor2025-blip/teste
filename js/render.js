// Tudo que é desenhado na tela (canvas): placar, tabuleiro, comidas, minhocas e partículas.
//
// O canvas se redimensiona sozinho pro tamanho real da caixa da arena — isso evita tanto
// distorção quanto sobra de espaço em branco, e deixa o jogo sempre do maior tamanho
// possível dentro do espaço disponível.
//
// CÂMERA: em mapas grandes, mostrar o tabuleiro inteiro deixaria tudo minúsculo. Por isso,
// se o mapa for maior que uma "janela de visão" fixa, a câmera passa a seguir a MINHOCA DO
// PRÓPRIO JOGADOR (cada pessoa vê sua própria câmera, inclusive no online), centralizando
// nela e mostrando só a área ao redor. A janela é sempre menor que qualquer mapa (mesmo o
// Pequeno), então a câmera segue de perto o tempo todo, em qualquer tamanho de mapa.

import { $ } from './utils.js';
import { ICONS } from './config.js';
import { state } from './state.js';
import { label } from './players.js';
import { mySlot } from './net.js';

const canvas = $('arenaCanvas');
const ctx = canvas.getContext('2d');

// Tamanho fixo da janela de visão da câmera (em células) — sempre menor que qualquer mapa,
// pra dar uma visão "de perto" da minhoca em qualquer tamanho de mapa escolhido.
const VIEW_W = 24, VIEW_H = 19;

let cell = 20, offX = 0, offY = 0; // tamanho de cada célula e deslocamento pra centralizar
let viewW = VIEW_W, viewH = VIEW_H; // tamanho real da janela mostrada (nunca maior que o mapa)
let camX = 0, camY = 0; // canto superior-esquerdo da câmera, em células do mundo

function resizeCanvas() {
  const box = canvas.parentElement; // .arena
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = Math.max(1, box.clientWidth);
  const ch = Math.max(1, box.clientHeight);

  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';

  viewW = Math.min(state.mapW, VIEW_W);
  viewH = Math.min(state.mapH, VIEW_H);
  cell = Math.min(canvas.width / viewW, canvas.height / viewH);
  offX = (canvas.width - cell * viewW) / 2;
  offY = (canvas.height - cell * viewH) / 2;
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 60));
resizeCanvas();

// Recalcula onde a câmera deve estar, seguindo a minhoca do jogador local (cada pessoa
// segue a própria, inclusive no online) — sem deixar a janela sair dos limites do mapa.
function updateCamera() {
  const mySnake = state.snakes[mySlot];
  const target = mySnake && mySnake[0] ? mySnake[0] : { x: state.mapW / 2, y: state.mapH / 2 };
  camX = Math.max(0, Math.min(state.mapW - viewW, target.x - viewW / 2));
  camY = Math.max(0, Math.min(state.mapH - viewH, target.y - viewH / 2));
}

// Converte uma coordenada do MUNDO (célula do tabuleiro) pra coordenada da TELA (pixel)
function sx(gx) { return offX + (gx - camX) * cell; }
function sy(gy) { return offY + (gy - camY) * cell; }

// Campinho de estrelinhas do fundo, geradas uma vez só (posições relativas 0..1 do mapa inteiro)
const STARS = Array.from({ length: 90 }, () => ({
  rx: Math.random(), ry: Math.random(),
  r: Math.random() * 1.4 + 0.3,
  speed: 0.1 + Math.random() * 0.22,
  o: 0.12 + Math.random() * 0.35,
}));

function drawStars() {
  const t = Date.now() / 4000;
  ctx.save();
  for (const s of STARS) {
    const wx = (s.rx * state.mapW + t * s.speed) % state.mapW;
    const x = sx(wx), y = sy(s.ry * state.mapH);
    if (x < -10 || x > canvas.width + 10 || y < -10 || y > canvas.height + 10) continue;
    ctx.globalAlpha = s.o;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Desenha a cabeça da minhoca no formato escolhido pelo jogador
function drawHead(x, y, shape, color) {
  const pad = cell * 0.1, size = cell - pad * 2, r = cell * 0.25;
  const cx = sx(x) + pad, cy = sy(y) + pad;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (shape === 'square') {
    ctx.rect(cx, cy, size, size);
  } else if (shape === 'diamond') {
    ctx.moveTo(cx + size / 2, cy);
    ctx.lineTo(cx + size, cy + size / 2);
    ctx.lineTo(cx + size / 2, cy + size);
    ctx.lineTo(cx, cy + size / 2);
    ctx.closePath();
  } else if (shape === 'owl') {
    ctx.roundRect(cx, cy, size, size, r * 1.2);
  } else if (shape === 'cat' || shape === 'bear') {
    ctx.roundRect(cx, cy, size, size, r * 1.3);
  } else if (shape === 'bunny' || shape === 'dragon') {
    ctx.roundRect(cx, cy, size, size, r);
  } else {
    ctx.roundRect(cx, cy, size, size, r); // 'round' (padrão)
  }
  ctx.fill();
  if (shape === 'owl') {
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.12, cy + size * 0.2); ctx.lineTo(cx - size * 0.12, cy - size * 0.25); ctx.lineTo(cx + size * 0.35, cy + size * 0.05);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.88, cy + size * 0.2); ctx.lineTo(cx + size * 1.12, cy - size * 0.25); ctx.lineTo(cx + size * 0.65, cy + size * 0.05);
    ctx.closePath(); ctx.fill();
  } else if (shape === 'cat') {
    // orelhinhas triangulares e pontudas de gato
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.18, cy + size * 0.18); ctx.lineTo(cx - size * 0.06, cy - size * 0.38); ctx.lineTo(cx + size * 0.42, cy + size * 0.02);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.82, cy + size * 0.18); ctx.lineTo(cx + size * 1.06, cy - size * 0.38); ctx.lineTo(cx + size * 0.58, cy + size * 0.02);
    ctx.closePath(); ctx.fill();
    // bigodinhos
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = Math.max(1, cell * 0.035);
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.08, cy + size * 0.62); ctx.lineTo(cx - size * 0.22, cy + size * 0.56);
    ctx.moveTo(cx + size * 0.08, cy + size * 0.74); ctx.lineTo(cx - size * 0.22, cy + size * 0.78);
    ctx.moveTo(cx + size * 0.92, cy + size * 0.62); ctx.lineTo(cx + size * 1.22, cy + size * 0.56);
    ctx.moveTo(cx + size * 0.92, cy + size * 0.74); ctx.lineTo(cx + size * 1.22, cy + size * 0.78);
    ctx.stroke();
  } else if (shape === 'bunny') {
    // orelhas compridas de coelho
    ctx.beginPath();
    ctx.ellipse(cx + size * 0.28, cy - size * 0.12, size * 0.11, size * 0.4, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + size * 0.72, cy - size * 0.12, size * 0.11, size * 0.4, 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 'dragon') {
    // trinca de espinhos/chifrinhos no topo
    for (let s = 0; s < 3; s++) {
      const bx = cx + size * (0.22 + s * 0.28);
      ctx.beginPath();
      ctx.moveTo(bx, cy);
      ctx.lineTo(bx - size * 0.07, cy - size * 0.3);
      ctx.lineTo(bx + size * 0.07, cy);
      ctx.closePath();
      ctx.fill();
    }
  } else if (shape === 'bear') {
    // orelhinhas redondas de ursinho
    ctx.beginPath();
    ctx.arc(cx + size * 0.14, cy + size * 0.06, size * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + size * 0.86, cy + size * 0.06, size * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Clareia (percent > 0) ou escurece (percent < 0) uma cor hex — usado no padrão Tricolor
function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

// Desenha um segmento do corpo com o padrão de pele escolhido (liso, listrado, pontilhado ou tricolor)
function drawBodySegment(x, y, color, pattern, k) {
  const pad = cell * 0.1, size = cell - pad * 2, r = cell * 0.22;
  const cx = sx(x) + pad, cy = sy(y) + pad;

  let fillColor = color;
  if (pattern === 'tricolor') {
    const variant = k % 3;
    fillColor = variant === 1 ? shadeColor(color, 55) : variant === 2 ? shadeColor(color, -55) : color;
  }
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.roundRect(cx, cy, size, size, r);
  ctx.fill();

  if (pattern === 'stripes' && k % 2 === 1) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.roundRect(cx, cy, size, size, r);
    ctx.fill();
  } else if (pattern === 'dots') {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(sx(x) + cell / 2, sy(y) + cell / 2, cell * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Minimapa no canto — só aparece quando o mapa é maior que a janela de visão (Mapa Grande),
// que é justamente quando a câmera segue a minhoca e fica mais fácil se perder.
function drawMinimap() {
  if (viewW >= state.mapW && viewH >= state.mapH) return; // mapa já cabe inteiro, não precisa
  const mmW = Math.min(120, canvas.width * 0.28);
  const mmH = mmW * (state.mapH / state.mapW);
  const mx = canvas.width - mmW - 14, my = 14;
  const scale = mmW / state.mapW;

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(5,9,17,0.78)';
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mx, my, mmW, mmH, 6);
  ctx.fill();
  ctx.stroke();

  for (let i = 0; i < state.count; i++) {
    if (!state.alive[i] || !state.snakes[i]?.[0]) continue;
    const h = state.snakes[i][0];
    ctx.fillStyle = state.colors[i];
    ctx.beginPath();
    ctx.arc(mx + h.x * scale, my + h.y * scale, i === mySlot ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // retângulo mostrando a área que a câmera tá vendo agora
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1.3;
  ctx.strokeRect(mx + camX * scale, my + camY * scale, viewW * scale, viewH * scale);
  ctx.restore();
}

export function renderScores() {
  let h = '';
  const teamBadge = ['🔵', '🔴'];
  for (let i = 0; i < state.count; i++) {
    const boost = state.boosting[i] ? ' • ⚡' : '';
    const team = state.teamMode ? ` ${teamBadge[state.teams[i]] || ''}` : '';
    h += `<div class="score" style="border-color:${state.colors[i]}">${ICONS[i]} <b>${label(i)}</b>${team} • 🍎 ${state.foodsEaten[i] || 0} • ⭐ ${state.scores[i] || 0} • 🎯 ${state.eliminations[i] || 0}${boost}${state.alive[i] ? '' : ' • ☠️'}</div>`;
  }
  h += `<div class="score" style="border-color:#ffd24d">🏅 Recorde: ${state.best || 0}</div>`;
  $('scores').innerHTML = h;
  $('alive').textContent = state.alive.filter(Boolean).length;
}

export function draw() {
  if (canvas.parentElement.clientWidth !== canvas._lastW || canvas.parentElement.clientHeight !== canvas._lastH) {
    resizeCanvas();
    canvas._lastW = canvas.parentElement.clientWidth;
    canvas._lastH = canvas.parentElement.clientHeight;
  }
  updateCamera();

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.shake) ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);

  ctx.fillStyle = '#050911';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawStars();

  ctx.strokeStyle = '#0d2038';
  const gxStart = Math.floor(camX), gxEnd = Math.ceil(camX + viewW);
  const gyStart = Math.floor(camY), gyEnd = Math.ceil(camY + viewH);
  for (let x = gxStart; x <= gxEnd; x++) { ctx.beginPath(); ctx.moveTo(sx(x), sy(gyStart)); ctx.lineTo(sx(x), sy(gyEnd)); ctx.stroke(); }
  for (let y = gyStart; y <= gyEnd; y++) { ctx.beginPath(); ctx.moveTo(sx(gxStart), sy(y)); ctx.lineTo(sx(gxEnd), sy(y)); ctx.stroke(); }

  const t = Date.now() / 180;
  for (const f of state.foods) {
    const x = sx(f.x) + cell / 2, y = sy(f.y) + cell / 2;
    if (x < -cell || x > canvas.width + cell || y < -cell || y > canvas.height + cell) continue;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (f.kind === 'bonus') {
      ctx.font = `${cell * 1.2}px sans-serif`;
      ctx.shadowBlur = 12 + Math.sin(t) * 7;
      ctx.shadowColor = '#ffd24d';
      ctx.fillText('⭐', x, y);
    } else {
      ctx.font = `${cell}px sans-serif`;
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
      ctx.shadowBlur = cell * 0.8;
      ctx.shadowColor = state.colors[i];
    }
    for (let k = s.length - 1; k >= 0; k--) {
      const p = s[k];
      ctx.globalAlpha = k === 0 ? 1 : (boosting ? 0.92 : 0.82);
      if (k === 0) {
        drawHead(p.x, p.y, state.heads[i] || 'round', state.colors[i]);
      } else {
        drawBodySegment(p.x, p.y, state.colors[i], state.patterns[i] || 'solid', k);
      }
    }
    ctx.restore();

    // Olhos apontando pra direção que a minhoca tá indo
    const h = s[0];
    const dir = state.dirs[i] || { x: 1, y: 0 };
    const cx = sx(h.x) + cell / 2, cy = sy(h.y) + cell / 2;
    const eo = cell * 0.2;
    const fx = dir.x * eo, fy = dir.y * eo;
    const px = -dir.y * eo, py = dir.x * eo;
    ctx.fillStyle = '#07110b';
    ctx.beginPath();
    ctx.arc(cx + fx + px, cy + fy + py, cell * 0.1, 0, Math.PI * 2);
    ctx.arc(cx + fx - px, cy + fy - py, cell * 0.1, 0, Math.PI * 2);
    ctx.fill();

    if (state.show[i] && (i === 0 || state.showOthers)) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${cell * 0.6}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${label(i)} • 🍎 ${state.foodsEaten[i] || 0}`, sx(h.x) + cell / 2, sy(h.y) - 4);
    }
  }

  for (const p of state.particles) {
    const x = sx(p.x) + cell / 2, y = sy(p.y) + cell / 2;
    ctx.globalAlpha = Math.max(0, p.life / 40);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, (p.life / 12) * (cell / 20)), 0, Math.PI * 2);
    ctx.fill();
  }

  // Texto flutuante de comemoração (marco de crescimento)
  if (state.toast && Date.now() < state.toast.until) {
    const left = state.toast.until - Date.now();
    ctx.save();
    ctx.globalAlpha = Math.min(1, left / 300);
    ctx.fillStyle = state.toast.color || '#ffd24d';
    ctx.font = `bold ${cell * 0.8}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#000';
    ctx.fillText(state.toast.text, sx(state.toast.x) + cell / 2, sy(state.toast.y) - 14);
    ctx.restore();
  }

  drawMinimap();

  // Clarão vermelho rápido quando alguém morre
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

// Exposto só pra fins de teste/depuração — mostra onde a câmera está agora
export function getCameraDebug() {
  return { cell, offX, offY, viewW, viewH, camX, camY };
}
