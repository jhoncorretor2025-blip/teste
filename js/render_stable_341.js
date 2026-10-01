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

import { $, vibrate } from './utils.js';
import { ICONS, TRICOLOR_PALETTES, ZOOM_LEVELS, BOARD_THEMES, MILESTONE_STEP } from './config.js';
import { state } from './state.js';
import { label } from './players.js';
import { mySlot, isOnline, isHost, sendDiag, pingStats, hostLatency } from './net.js';
import { sfx } from './sound.js';

const canvas = $('arenaCanvas');
let wasNearEdge = false; // controla a vibração de aviso de borda, só dispara uma vez
const ctx = canvas.getContext('2d');

// Substituto do roundRect() aplicado no PROTÓTIPO — protege QUALQUER canvas do jogo (o
// principal, o do favicon, minimapa, etc.), não só o que foi criado primeiro. Essa função
// de canvas é relativamente NOVA (Safari 16+/2022, Chrome 99+/2022); em celulares com
// navegador mais antigo ela nem existe, e SEM esse substituto o jogo (ou até só o ícone
// da aba) parava de desenhar silenciosamente ao tentar chamar uma função inexistente.
if (typeof window.CanvasRenderingContext2D !== 'undefined' && typeof window.CanvasRenderingContext2D.prototype.roundRect !== 'function') {
  window.CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const radius = typeof r === 'number' ? r : (r?.[0] ?? 0);
    this.beginPath();
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
  };
}

let cell = 20, offX = 0, offY = 0; // tamanho de cada célula e deslocamento pra centralizar
let viewW = 32, viewH = 25; // tamanho real da janela mostrada (nunca maior que o mapa)
let camX = 0, camY = 0; // canto superior-esquerdo da câmera, em células do mundo

// Pega a janela de visão (largura/altura em células) do nível de zoom escolhido
function getZoomWindow() {
  const z = ZOOM_LEVELS.find((z) => z.value === state.zoom) || ZOOM_LEVELS[1];
  return { w: z.w, h: z.h };
}

function resizeCanvas() {
  const box = canvas.parentElement; // .arena
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = Math.max(1, box.clientWidth);
  const ch = Math.max(1, box.clientHeight);

  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';

  const zoom = getZoomWindow();
  viewW = Math.min(state.mapW, zoom.w);
  viewH = Math.min(state.mapH, zoom.h);
  cell = Math.min(canvas.width / viewW, canvas.height / viewH);
  offX = (canvas.width - cell * viewW) / 2;
  offY = (canvas.height - cell * viewH) / 2;
}

window.addEventListener('resize', resizeCanvas);

// Observa a área da arena de verdade (ResizeObserver) — muito mais confiável que
// adivinhar com setTimeout quando a transição de tela termina ou quando o layout do
// celular termina de se ajustar. Corrige o canvas assim que o tamanho real mudar,
// não importa quanto tempo isso demore em cada aparelho.
if (typeof ResizeObserver !== 'undefined') {
  const arenaEl = canvas.parentElement;
  if (arenaEl) {
    const ro = new ResizeObserver(() => {
      // resizeCanvas() sozinho limpa o conteúdo do canvas (é assim que <canvas> funciona
      // ao mudar de tamanho) — por isso chama render() inteiro, que redesenha tudo de
      // novo com o tamanho certo, em vez de deixar a tela em branco depois do ajuste
      if (arenaEl.clientWidth > 0 && arenaEl.clientHeight > 0) render();
    });
    ro.observe(arenaEl);
  }
}
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 60));
resizeCanvas();

// Recalcula onde a câmera deve estar, seguindo a minhoca do jogador local (cada pessoa
// segue a própria, inclusive no online) — sem deixar a janela sair dos limites do mapa.
function updateCamera() {
  const mySnake = state.snakes[mySlot];
  let target = mySnake && mySnake[0] ? mySnake[0] : null;
  // Respaldo mais esperto: se por algum motivo a SUA minhoca não for encontrada (ex: um
  // problema de sincronização), segue QUALQUER minhoca viva em vez do centro fixo do
  // mapa — em mapas grandes, cair no centro quando ninguém nasceu ali deixava a câmera
  // mostrando uma área vazia, dando a falsa impressão de que nada estava sendo desenhado.
  if (!target) {
    for (let i = 0; i < state.count; i++) {
      if (state.alive[i] && state.snakes[i]?.[0]) { target = state.snakes[i][0]; break; }
    }
  }
  if (!target) target = { x: state.mapW / 2, y: state.mapH / 2 };
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

// Camada extra de estrelas bem ao fundo — se move só uma fração do quanto a câmera anda,
// dando aquela sensação de profundidade/paralaxe (como se estivesse mais longe)
const FAR_STARS = Array.from({ length: 50 }, () => ({
  rx: Math.random(), ry: Math.random(),
  r: Math.random() * 1 + 0.2,
  o: 0.06 + Math.random() * 0.14,
}));

// --- Fundo de cada tema ---
// Antes só a cor de fundo e a das linhas mudavam de tema pra tema (e eram escuras e parecidas),
// enquanto as estrelinhas brancas eram SEMPRE as mesmas — por isso parecia que só a comidinha
// trocava. Agora cada tema tem seu brilho central e sua própria decoração animada flutuando.
const DECO = Array.from({ length: 90 }, () => ({
  rx: Math.random(), ry: Math.random(),
  r: 0.5 + Math.random() * 1.1,   // tamanho relativo
  sp: 0.45 + Math.random() * 0.9, // velocidade relativa
  ph: Math.random() * Math.PI * 2, // fase (pra não pulsarem todos juntos)
  o: 0.3 + Math.random() * 0.5,   // opacidade base
}));
const enrola = (v, span) => ((v % span) + span) % span;

function drawThemeAtmosphere(theme) {
  // O Campo de Girassóis precisa ficar limpo e nítido: a luz atmosférica anterior
  // deixava uma "névoa" sobre o mapa.
  if (theme.value === 'sunflower') return;
  // Luz ambiental lenta e específica do tema; calculada no desenho para funcionar também online.
  const t = Date.now() / 1000;
  const w = canvas.width, h = canvas.height;
  if (typeof ctx.createRadialGradient === 'function') {
    ctx.save();
    ctx.globalAlpha = 0.13;
    for (let i = 0; i < 3; i++) {
      const px = w * (0.18 + i * 0.34) + Math.sin(t * (0.18 + i * 0.04) + i * 2.1) * w * 0.10;
      const py = h * (0.24 + (i % 2) * 0.44) + Math.cos(t * (0.15 + i * 0.03) + i) * h * 0.08;
      const radius = Math.min(w, h) * (0.18 + i * 0.025);
      const g = ctx.createRadialGradient(px, py, 0, px, py, radius);
      g.addColorStop(0, theme.bg2 || theme.accent || '#ffffff');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }
  ctx.save();
  ctx.lineWidth = Math.max(1, cell * 0.035);
  const accent = theme.accent || '#ffffff';
  if (theme.value === 'cyber' || theme.value === 'city') {
    const scanY = (t * cell * 1.1) % (h + cell * 2) - cell;
    ctx.globalAlpha = 0.11;
    ctx.strokeStyle = accent;
    ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(w, scanY); ctx.stroke();
  } else if (theme.value === 'aurora') {
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-w * 0.15, h * 0.58);
    ctx.quadraticCurveTo(w * 0.28, h * 0.20 + Math.sin(t * 0.35) * h * 0.05, w * 0.62, h * 0.48);
    ctx.quadraticCurveTo(w * 0.84, h * 0.70 + Math.cos(t * 0.28) * h * 0.04, w * 1.15, h * 0.32);
    ctx.stroke();
  } else if (theme.value === 'volcano') {
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = '#ff9b4a';
    for (let i = 0; i < 9; i++) {
      const ex = ((i * 97 + t * (10 + i)) % (w + 60)) - 30;
      const ey = h - ((i * 41 + t * (7 + i * 0.3)) % (h * 0.75));
      ctx.beginPath();
      ctx.arc(ex, ey, Math.max(1, cell * (0.035 + (i % 3) * 0.02)), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme.value === 'ocean' || theme.value === 'deep' || theme.value === 'swamp') {
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = accent;
    for (let i = 0; i < 5; i++) {
      const bx = w * (0.12 + i * 0.20) + Math.sin(t * 0.25 + i) * cell * 2;
      const by = h - ((t * cell * (0.18 + i * 0.03) + i * h * 0.16) % (h + cell * 4));
      ctx.beginPath();
      ctx.arc(bx, by, cell * (0.25 + (i % 2) * 0.12), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
  if (typeof ctx.createRadialGradient === 'function') {
    ctx.save();
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.30, w / 2, h / 2, Math.hypot(w, h) * 0.65);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.20)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

function drawDynamicGraphicLighting(theme) {
  const t = Date.now() / 1000;
  const w = canvas.width, h = canvas.height;
  const accent = theme.accent || '#ffffff';

  ctx.save();
  ctx.globalAlpha = theme.value === 'sunflower' ? 0.025 : 0.10;
  ctx.globalCompositeOperation = 'screen';

  const spots = [
    { x: 0.18 + Math.sin(t * 0.19) * 0.08, y: 0.22 + Math.cos(t * 0.17) * 0.06 },
    { x: 0.78 + Math.cos(t * 0.14) * 0.07, y: 0.68 + Math.sin(t * 0.16) * 0.06 },
  ];

  for (const spot of spots) {
    const x = w * spot.x;
    const y = h * spot.y;
    const r = Math.min(w, h) * 0.26;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, accent);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawThemeBackdrop(theme) {
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, w, h);
  // Brilho suave no centro, num tom mais claro do próprio tema — dá "clima" ao mapa
  if (theme.bg2 && theme.bg2 !== theme.bg && typeof ctx.createRadialGradient === 'function') {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
    g.addColorStop(0, theme.bg2);
    g.addColorStop(1, theme.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  if (typeof drawThemeAtmosphere === 'function') drawThemeAtmosphere(theme);
  drawDynamicGraphicLighting(theme);
  if (theme.deco === 'stars') drawStars();
  else if (theme.deco && theme.deco !== 'none') drawThemeDeco(theme);
}


// --- Decoração física do mapa (bioma) ---
// Diferente das partículas flutuantes, estes objetos têm posição FIXA no mundo.
// Isso evita que flores/girassóis pisquem ou troquem de lugar a cada frame.
// São apenas decorativos: não interferem em colisão, comida ou movimentação.
let biomeCacheKey = '';
let biomeObjects = [];

function biomeRand(seed) {
  let x = (seed >>> 0) || 1;
  return function () {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) / 4294967296);
  };
}

function getBiomeObjects(theme) {
  const key = `${theme.value}:${state.mapW}x${state.mapH}`;
  if (key === biomeCacheKey && biomeObjects.length) return biomeObjects;

  biomeCacheKey = key;
  const rand = biomeRand(
    Array.from(theme.value).reduce((a, c) => ((a * 31 + c.charCodeAt(0)) >>> 0), state.mapW * 97 + state.mapH * 193)
  );
  const amount = {
    sunflower: 64, garden: 72, forest: 34, desert: 28,
    ice: 30, deep: 34, space: 22, night: 48, void: 24
  }[theme.value] || 0;

  biomeObjects = Array.from({ length: amount }, () => ({
    x: 1.2 + rand() * Math.max(1, state.mapW - 2.4),
    y: 1.2 + rand() * Math.max(1, state.mapH - 2.4),
    s: 0.65 + rand() * 0.75,
    r: rand()
  }));
  return biomeObjects;
}

function drawSunflowerWorld(x, y, size, variant = 0) {
  const stem = Math.max(1.2, cell * 0.07 * size);
  ctx.save();
  ctx.globalAlpha = 0.78;
  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(x, y + cell * 0.34 * size, cell * 0.25 * size, cell * 0.08 * size, 0, 0, Math.PI * 2); ctx.fill();
  // caule
  ctx.strokeStyle = variant > 0.5 ? '#4f9d43' : '#6fb34f';
  ctx.lineWidth = stem;
  ctx.beginPath(); ctx.moveTo(x, y + cell * 0.30 * size); ctx.lineTo(x, y - cell * 0.02 * size); ctx.stroke();
  // folhas
  ctx.fillStyle = '#5ca943';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + side * cell * 0.16 * size, y + cell * 0.18 * size, cell * 0.16 * size, cell * 0.07 * size, side * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  // pétalas
  const petals = 10;
  for (let i = 0; i < petals; i++) {
    const a = i / petals * Math.PI * 2;
    ctx.fillStyle = i % 2 ? '#ffd84a' : '#ffc928';
    ctx.beginPath();
    ctx.ellipse(
      x + Math.cos(a) * cell * 0.22 * size,
      y + Math.sin(a) * cell * 0.22 * size,
      cell * 0.12 * size, cell * 0.075 * size, a, 0, Math.PI * 2
    );
    ctx.fill();
  }
  ctx.fillStyle = '#70451f';
  ctx.beginPath(); ctx.arc(x, y, cell * 0.14 * size, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a66b2c';
  ctx.beginPath(); ctx.arc(x - cell * 0.04 * size, y - cell * 0.04 * size, cell * 0.055 * size, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawFlowerWorld(x, y, size, variant = 0) {
  const palettes = [
    ['#ff6fae', '#ffd7e8'], ['#a78bfa', '#e9ddff'],
    ['#ffd34d', '#fff0a6'], ['#ff7a59', '#ffd0c5'], ['#62d7ff', '#d5f7ff']
  ];
  const [c1, c2] = palettes[Math.floor(variant * palettes.length) % palettes.length];
  ctx.save();
  ctx.globalAlpha = 0.76;
  ctx.strokeStyle = '#4f9d43';
  ctx.lineWidth = Math.max(1, cell * 0.055 * size);
  ctx.beginPath(); ctx.moveTo(x, y + cell * 0.28 * size); ctx.lineTo(x, y); ctx.stroke();
  ctx.fillStyle = '#5ca943';
  ctx.beginPath(); ctx.ellipse(x - cell * 0.12 * size, y + cell * 0.18 * size, cell * 0.13 * size, cell * 0.055 * size, -0.4, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    ctx.fillStyle = i % 2 ? c1 : c2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * cell * 0.16 * size, y + Math.sin(a) * cell * 0.16 * size, cell * 0.105 * size, cell * 0.065 * size, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#8b5a2b';
  ctx.beginPath(); ctx.arc(x, y, cell * 0.075 * size, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawTreeWorld(x, y, size) {
  ctx.save();
  ctx.globalAlpha = 0.64;
  ctx.fillStyle = '#5a3821';
  ctx.fillRect(x - cell * 0.065 * size, y, cell * 0.13 * size, cell * 0.38 * size);
  ctx.fillStyle = '#2f8a4b';
  ctx.beginPath(); ctx.arc(x, y - cell * 0.05 * size, cell * 0.30 * size, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4faa5a';
  ctx.beginPath(); ctx.arc(x - cell * 0.16 * size, y - cell * 0.16 * size, cell * 0.18 * size, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawCactusWorld(x, y, size) {
  ctx.save();
  ctx.globalAlpha = 0.62;
  ctx.strokeStyle = '#62a83d';
  ctx.lineCap = 'round';
  ctx.lineWidth = cell * 0.13 * size;
  ctx.beginPath(); ctx.moveTo(x, y + cell * 0.32 * size); ctx.lineTo(x, y - cell * 0.22 * size); ctx.moveTo(x, y - cell * 0.03 * size); ctx.lineTo(x + cell * 0.18 * size, y - cell * 0.10 * size); ctx.moveTo(x + cell * 0.18 * size, y - cell * 0.10 * size); ctx.lineTo(x + cell * 0.18 * size, y - cell * 0.25 * size); ctx.stroke();
  ctx.restore();
}

function drawPineWorld(x, y, size) {
  ctx.save();
  ctx.globalAlpha = 0.60;
  ctx.fillStyle = '#dff5ff';
  ctx.beginPath();
  ctx.moveTo(x, y - cell * 0.42 * size);
  ctx.lineTo(x - cell * 0.28 * size, y + cell * 0.25 * size);
  ctx.lineTo(x + cell * 0.28 * size, y + cell * 0.25 * size);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a9d8ea';
  ctx.beginPath(); ctx.moveTo(x, y - cell * 0.15 * size); ctx.lineTo(x - cell * 0.34 * size, y + cell * 0.34 * size); ctx.lineTo(x + cell * 0.34 * size, y + cell * 0.34 * size); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawRockWorld(x, y, size, ice = false) {
  ctx.save();
  ctx.globalAlpha = 0.48;
  ctx.fillStyle = ice ? '#b8e8f5' : '#a97b4f';
  ctx.beginPath();
  ctx.moveTo(x - cell * 0.28 * size, y + cell * 0.18 * size);
  ctx.lineTo(x - cell * 0.16 * size, y - cell * 0.16 * size);
  ctx.lineTo(x + cell * 0.08 * size, y - cell * 0.24 * size);
  ctx.lineTo(x + cell * 0.29 * size, y + cell * 0.10 * size);
  ctx.lineTo(x + cell * 0.12 * size, y + cell * 0.22 * size);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawSeaweedWorld(x, y, size) {
  ctx.save();
  ctx.globalAlpha = 0.48;
  ctx.strokeStyle = '#4bd1a5';
  ctx.lineWidth = Math.max(1, cell * 0.07 * size);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * cell * 0.12 * size, y + cell * 0.30 * size);
    ctx.quadraticCurveTo(x + i * cell * 0.20 * size, y, x + i * cell * 0.05 * size, y - cell * 0.34 * size);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBiomeDecorations(theme) {
  const objects = getBiomeObjects(theme);
  if (!objects.length) return;
  ctx.save();
  for (const o of objects) {
    const x = sx(o.x) + cell / 2;
    const y = sy(o.y) + cell / 2;
    if (x < -cell * 2 || x > canvas.width + cell * 2 || y < -cell * 2 || y > canvas.height + cell * 2) continue;
    if (theme.value === 'sunflower') drawSunflowerWorld(x, y, o.s, o.r);
    else if (theme.value === 'garden') drawFlowerWorld(x, y, o.s, o.r);
    else if (theme.value === 'forest') drawTreeWorld(x, y, o.s);
    else if (theme.value === 'desert') (o.r > 0.38 ? drawCactusWorld(x, y, o.s) : drawRockWorld(x, y, o.s));
    else if (theme.value === 'ice') (o.r > 0.35 ? drawPineWorld(x, y, o.s) : drawRockWorld(x, y, o.s, true));
    else if (theme.value === 'deep') drawSeaweedWorld(x, y, o.s);
    else if (theme.value === 'space') {
      ctx.globalAlpha = 0.30;
      ctx.fillStyle = o.r > 0.55 ? '#9ec5ff' : '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, cell * 0.18 * o.s, 0, Math.PI * 2); ctx.fill();
    } else if (theme.value === 'night') {
      const pulse = 0.35 + 0.35 * Math.sin(Date.now() / 650 + o.r * 10);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = o.r > 0.5 ? '#ffd85a' : '#b8f7ff';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = cell * 0.5;
      ctx.beginPath(); ctx.arc(x, y, Math.max(1.2, cell * 0.08 * o.s), 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (theme.value === 'void') {
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#7d8797';
      ctx.lineWidth = Math.max(1, cell * 0.035);
      ctx.beginPath(); ctx.arc(x, y, cell * 0.20 * o.s, 0, Math.PI * 1.4); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFoodGraphicAccent(food) {
  if (!food) return;
  const rarity = food.rarity || 'normal';
  if (rarity === 'normal' && food.kind !== 'bonus' && food.kind !== 'secondPlace') return;

  const x = sx(food.x) + cell / 2;
  const y = sy(food.y) + cell / 2;
  const now = Date.now();
  const pulse = 0.5 + 0.5 * Math.sin(now / 170 + food.x * 0.7 + food.y);
  const color = rarity === 'legendary' ? '#ffd24d'
    : rarity === 'epic' ? '#b57bff'
    : rarity === 'rare' ? '#63b3ff'
    : food.kind === 'bonus' ? '#ffd24d'
    : '#63e6ff';

  ctx.save();
  ctx.globalAlpha = 0.35 + pulse * 0.28;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = cell * 0.55;

  const ring = cell * (0.52 + pulse * 0.12);
  ctx.lineWidth = Math.max(1, cell * 0.035);
  ctx.beginPath();
  ctx.arc(x, y, ring, -Math.PI * 0.15, Math.PI * 1.45);
  ctx.stroke();

  if (rarity === 'epic' || rarity === 'legendary' || food.kind === 'secondPlace') {
    ctx.globalAlpha = 0.68;
    ctx.fillStyle = color;
    for (let n = 0; n < 4; n++) {
      const a = now / 650 + n * Math.PI / 2;
      const rr = cell * (0.58 + pulse * 0.10);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      const s = Math.max(1, cell * 0.035);
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
    }
  }
  ctx.restore();
}

function drawThemeReaction(theme) {
  const head = state.snakes[mySlot]?.[0];
  if (!head || !state.alive[mySlot]) return;
  const x = sx(head.x) + cell / 2, y = sy(head.y) + cell / 2;
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 500);
  const accent = theme.accent || '#ffffff';

  ctx.save();
  ctx.globalAlpha = 0.11 + pulse * 0.07;
  ctx.strokeStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = cell * 0.42;
  ctx.lineWidth = Math.max(1, cell * 0.04);

  if (['deep','ocean','swamp','ice','glacier'].includes(theme.value)) {
    ctx.beginPath(); ctx.arc(x, y, cell * (0.75 + pulse * 0.16), 0, Math.PI * 2); ctx.stroke();
  } else if (['cyber','city','space','aurora'].includes(theme.value)) {
    ctx.beginPath(); ctx.arc(x, y, cell * (0.64 + pulse * 0.11), 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha *= 0.45;
    ctx.beginPath(); ctx.arc(x, y, cell * 0.42, 0, Math.PI * 2); ctx.stroke();
  } else if (['desert','canyon','sunset','volcano'].includes(theme.value)) {
    ctx.beginPath(); ctx.ellipse(x, y + cell * 0.08, cell * (0.72 + pulse * 0.08), cell * 0.25, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    for (let n = 0; n < 3; n++) {
      const ang = Date.now() / 1200 + n * 2.1;
      const rr = cell * (0.70 + n * 0.11);
      ctx.beginPath(); ctx.arc(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, cell * 0.045, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawMapGraphicForeground(theme) {
  const w = canvas.width, h = canvas.height;
  const t = Date.now() / 1000;
  const accent = theme.accent || '#ffffff';

  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1, cell * 0.025);

  if (['space','night','void','cyber','aurora'].includes(theme.value)) {
    for (let i = 0; i < 9; i++) {
      const x = ((i * 149 + t * (6 + i)) % (w + 80)) - 40;
      const y = ((i * 83 + t * (3 + i * 0.3)) % (h + 80)) - 40;
      ctx.beginPath();
      ctx.arc(x, y, cell * (0.08 + (i % 3) * 0.04), 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (['forest','garden','sunflower','jungle','swamp'].includes(theme.value)) {
    for (let i = 0; i < 7; i++) {
      const x = ((i * 181 + t * (4 + i)) % (w + 80)) - 40;
      const y = h - ((i * 67 + t * (2 + i * 0.2)) % (h + 80));
      ctx.beginPath();
      ctx.arc(x, y, cell * (0.10 + (i % 2) * 0.05), 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    const sweep = (t * cell * 0.25) % (w + h);
    ctx.beginPath();
    ctx.moveTo(sweep - h, 0);
    ctx.lineTo(sweep, h);
    ctx.stroke();
  }
  ctx.restore();
}

function drawThemeDeco(theme) {
  const t = Date.now() / 1000;
  const spanX = state.mapW * 1.6, spanY = state.mapH * 1.6;
  const kind = theme.deco;
  ctx.save();
  ctx.fillStyle = theme.accent;
  ctx.strokeStyle = theme.accent;
  for (const p of DECO) {
    // cada tipo tem seu jeito de se mover: bolhas sobem, neve cai, areia voa de lado...
    let dx = 0, dy = 0;
    const balanco = Math.sin(t * 0.7 * p.sp + p.ph);
    if (kind === 'bubbles') { dy = -1.1 * p.sp; dx = balanco * 0.5; }
    else if (kind === 'snow') { dy = 0.9 * p.sp; dx = balanco * 0.7; }
    else if (kind === 'sand') { dx = 2.1 * p.sp; dy = balanco * 0.25; }
    else if (kind === 'spores') { dy = -0.3 * p.sp; dx = balanco * 0.45; }
    else if (kind === 'petals') { dx = 0.8 * p.sp; dy = 0.6 * p.sp; }
    const wx = enrola(p.rx * spanX + t * dx, spanX) - state.mapW * 0.3;
    const wy = enrola(p.ry * spanY + t * dy, spanY) - state.mapH * 0.3;
    // paralaxe leve: a decoração anda um pouco menos que a câmera, parecendo mais ao fundo
    const x = offX + (wx - camX * 0.6) * cell;
    const y = offY + (wy - camY * 0.6) * cell;
    if (x < -20 || x > canvas.width + 20 || y < -20 || y > canvas.height + 20) continue;

    if (kind === 'bubbles') {
      ctx.globalAlpha = p.o * 0.6;
      ctx.lineWidth = Math.max(1, cell * 0.05);
      ctx.beginPath();
      ctx.arc(x, y, cell * (0.1 + p.r * 0.14), 0, Math.PI * 2);
      ctx.stroke();
    } else if (kind === 'snow') {
      ctx.globalAlpha = p.o * 0.85;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, cell * 0.07 * p.r), 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'sand') {
      ctx.globalAlpha = p.o * 0.55;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.8, cell * 0.045 * p.r), 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'spores') {
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = cell * 0.5;
      ctx.globalAlpha = p.o * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.5 + p.ph)));
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, cell * 0.09 * p.r), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (kind === 'sparkles') {
      const brilho = Math.max(0, Math.sin(t * 1.8 * p.sp + p.ph));
      if (brilho < 0.05) continue;
      const L = cell * 0.3 * p.r;
      ctx.globalAlpha = brilho * p.o;
      ctx.lineWidth = Math.max(1, cell * 0.04);
      ctx.beginPath();
      ctx.moveTo(x - L, y); ctx.lineTo(x + L, y);
      ctx.moveTo(x, y - L); ctx.lineTo(x, y + L);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, cell * 0.05), 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'petals') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.8 * p.sp + p.ph);
      ctx.globalAlpha = p.o * 0.65;
      ctx.beginPath();
      ctx.ellipse(0, 0, cell * 0.14 * p.r, cell * 0.06 * p.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawStars() {
  const t = Date.now() / 4000;

  // Camada distante (paralaxe): posição fixa no "mundo grande", só reage a uma fração
  // do movimento da câmera — parece mais longe, quase parada
  ctx.save();
  for (const s of FAR_STARS) {
    const worldX = s.rx * state.mapW * 2 - state.mapW * 0.5;
    const worldY = s.ry * state.mapH * 2 - state.mapH * 0.5;
    const x = offX + (worldX - camX * 0.35) * cell;
    const y = offY + (worldY - camY * 0.35) * cell;
    if (x < -10 || x > canvas.width + 10 || y < -10 || y > canvas.height + 10) continue;
    ctx.globalAlpha = s.o;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

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

// Trilha de energia suave usando a cor de rastro já escolhida pelo jogador.
function drawTurboCinematic(snake, playerIndex, boosting) {
  if (!boosting || !snake || snake.length < 2) return;

  const color = (state.trailColors[playerIndex] && state.trailColors[playerIndex] !== 'auto')
    ? state.trailColors[playerIndex] : state.colors[playerIndex] || '#ffffff';
  const head = snake[0];
  const next = snake[1] || head;
  const dx = Math.sign(head.x - next.x) || 1;
  const dy = Math.sign(head.y - next.y);
  const hx = sx(head.x) + cell / 2;
  const hy = sy(head.y) + cell / 2;
  const now = Date.now();

  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = cell * 0.65;
  ctx.lineWidth = Math.max(1, cell * 0.06);
  ctx.globalAlpha = 0.45;

  for (let n = 0; n < 4; n++) {
    const offset = (n - 1.5) * cell * 0.15;
    const wobble = Math.sin(now / 85 + n) * cell * 0.05;
    ctx.beginPath();
    ctx.moveTo(hx - dx * cell * (0.55 + n * 0.20) + dy * offset, hy - dy * cell * (0.55 + n * 0.20) - dx * offset);
    ctx.lineTo(hx - dx * cell * (1.10 + n * 0.24) + dy * offset + wobble, hy - dy * cell * (1.10 + n * 0.24) - dx * offset + wobble);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.82;
  ctx.fillStyle = '#ffffff';
  for (let n = 0; n < 5; n++) {
    const p = snake[Math.min(snake.length - 1, 1 + n * 2)];
    const pulse = 0.6 + 0.4 * Math.sin(now / 70 + n * 1.7 + playerIndex);
    ctx.beginPath();
    ctx.arc(sx(p.x) + cell / 2, sy(p.y) + cell / 2, Math.max(1, cell * (0.03 + pulse * 0.025)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnergyTrail(snake, playerIndex, boosting) {
  if (!snake || snake.length < 2) return;
  const pattern = state.patterns[playerIndex] || 'solid';
  const trailColor = (state.trailColors[playerIndex] && state.trailColors[playerIndex] !== 'auto')
    ? state.trailColors[playerIndex] : state.colors[playerIndex];
  const reach = Math.min(snake.length, boosting ? 18 : 11);
  const now = Date.now();

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = boosting ? 0.38 : (pattern === 'neon' ? 0.20 : 0.14);
  ctx.strokeStyle = trailColor || '#ffffff';
  ctx.shadowColor = trailColor || '#ffffff';
  ctx.shadowBlur = boosting ? cell * 1.1 : cell * 0.45;
  ctx.lineWidth = boosting ? cell * 0.23 : cell * 0.10;

  if (pattern === 'electric') {
    ctx.beginPath();
    for (let k = reach - 1; k >= 0; k--) {
      const p = snake[k];
      const x = sx(p.x) + cell / 2, y = sy(p.y) + cell / 2;
      const off = (k % 2 ? -1 : 1) * cell * 0.06;
      if (k === reach - 1) ctx.moveTo(x + off, y - off); else ctx.lineTo(x + off, y - off);
    }
    ctx.stroke();
  } else {
    ctx.beginPath();
    for (let k = reach - 1; k >= 0; k--) {
      const p = snake[k];
      const x = sx(p.x) + cell / 2, y = sy(p.y) + cell / 2;
      if (k === reach - 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  if (boosting || ['fire','ice','galaxy','venom'].includes(pattern)) {
    ctx.globalAlpha = boosting ? 0.75 : 0.55;
    ctx.fillStyle = trailColor || '#ffffff';
    const step = pattern === 'galaxy' || pattern === 'ice' ? 2 : 3;
    for (let k = 1; k < reach; k += step) {
      const p = snake[k];
      const px = sx(p.x) + cell / 2, py = sy(p.y) + cell / 2;
      const pulse = 0.55 + 0.45 * Math.sin(now / 100 + k * 1.6 + playerIndex);
      ctx.save();
      ctx.translate(px, py);
      if (pattern === 'galaxy' || pattern === 'ice') {
        const s = cell * (0.04 + pulse * 0.035);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-s / 2, -s / 2, s, s);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, cell * (0.03 + pulse * 0.025)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  ctx.restore();
}
// Desenha a cabeça da minhoca no formato escolhido pelo jogador
function drawHead(x, y, shape, color) {
  const pad = cell * 0.1, size = cell - pad * 2, r = cell * 0.25;
  const cx = sx(x) + pad, cy = sy(y) + pad;

  // Mesma sombrinha sutil da cabeça, pra combinar com o corpo
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.roundRect(cx + size * 0.06, cy + size * 0.12, size, size, r);
  ctx.fill();

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
  } else if (shape === 'fox' || shape === 'lion' || shape === 'monkey') {
    ctx.roundRect(cx, cy, size, size, r * 1.15);
  } else if (shape === 'shark' || shape === 'alien' || shape === 'robot' || shape === 'skull') {
    ctx.roundRect(cx, cy, size, size, r * 0.9);
  } else if (shape === 'bee' || shape === 'unicorn' || shape === 'pirata') {
    ctx.roundRect(cx, cy, size, size, r * 1.1);
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
  } else if (shape === 'sunflower') {
    // Pétalas amarelas ao redor, com um centro escuro — a base colorida já fica por
    // baixo, mas as pétalas dominam a aparência
    const ccx = cx + size / 2, ccy = cy + size / 2, r = size / 2;
    ctx.fillStyle = '#ffd23f';
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const px = ccx + Math.cos(ang) * r * 0.82;
      const py = ccy + Math.sin(ang) * r * 0.82;
      ctx.beginPath();
      ctx.ellipse(px, py, r * 0.34, r * 0.19, ang, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#6b4423';
    ctx.beginPath();
    ctx.arc(ccx, ccy, r * 0.52, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 'rose') {
    // Pétalas rosa em camadas, criando um efeito de rosa desabrochando
    const ccx = cx + size / 2, ccy = cy + size / 2, r = size / 2;
    const petalColors = ['#a3134f', '#e91e8c', '#ff8fc4'];
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = petalColors[layer];
      const layerR = r * (0.95 - layer * 0.22);
      const petals = 5;
      for (let a = 0; a < petals; a++) {
        const ang = (a / petals) * Math.PI * 2 + layer * 0.4;
        const px = ccx + Math.cos(ang) * layerR * 0.48;
        const py = ccy + Math.sin(ang) * layerR * 0.48;
        ctx.beginPath();
        ctx.ellipse(px, py, layerR * 0.42, layerR * 0.3, ang, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (shape === 'fox') {
    // Orelhas pontudas + focinho
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.18, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.02, cy - size * 0.25);
    ctx.lineTo(cx + size * 0.42, cy + size * 0.06);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.82, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.98, cy - size * 0.25);
    ctx.lineTo(cx + size * 0.58, cy + size * 0.06);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.ellipse(cx + size * 0.5, cy + size * 0.67, size * 0.28, size * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  } else if (shape === 'shark') {
    // Barbatana dorsal e focinho
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.25, cy + size * 0.08);
    ctx.lineTo(cx + size * 0.5, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.72, cy + size * 0.08);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.08, cy + size * 0.58);
    ctx.lineTo(cx - size * 0.22, cy + size * 0.48);
    ctx.lineTo(cx + size * 0.08, cy + size * 0.4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, cell * 0.045);
    ctx.beginPath();
    ctx.arc(cx + size * 0.5, cy + size * 0.62, size * 0.22, 0.1, Math.PI - 0.1); ctx.stroke();
  } else if (shape === 'bee') {
    // Listras e anteninhas
    ctx.strokeStyle = '#202020'; ctx.lineWidth = Math.max(1, cell * 0.1);
    for (const yy of [0.32, 0.52, 0.72]) {
      ctx.beginPath(); ctx.moveTo(cx + size * 0.1, cy + size * yy); ctx.lineTo(cx + size * 0.9, cy + size * yy); ctx.stroke();
    }
    ctx.lineWidth = Math.max(1, cell * 0.035);
    ctx.beginPath(); ctx.moveTo(cx + size * 0.32, cy + size * 0.1); ctx.lineTo(cx + size * 0.15, cy - size * 0.2);
    ctx.moveTo(cx + size * 0.68, cy + size * 0.1); ctx.lineTo(cx + size * 0.85, cy - size * 0.2); ctx.stroke();
  } else if (shape === 'unicorn') {
    // Chifre central e crina
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.5, cy - size * 0.36);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.08);
    ctx.lineTo(cx + size * 0.62, cy + size * 0.08);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(1, cell * 0.035);
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.18, cy + size * 0.16); ctx.quadraticCurveTo(cx + size * 0.06, cy + size * 0.45, cx + size * 0.2, cy + size * 0.86);
    ctx.stroke();
  } else if (shape === 'monkey') {
    // Orelhas laterais e topete
    ctx.beginPath(); ctx.arc(cx + size * 0.08, cy + size * 0.5, size * 0.19, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + size * 0.92, cy + size * 0.5, size * 0.19, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c98b5b';
    ctx.beginPath(); ctx.ellipse(cx + size * 0.5, cy + size * 0.65, size * 0.3, size * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  } else if (shape === 'lion') {
    // Juba em pequenos círculos
    ctx.fillStyle = '#f0a33a';
    for (let a = 0; a < 12; a++) {
      const ang = a * Math.PI / 6, px = cx + size * 0.5 + Math.cos(ang) * size * 0.54, py = cy + size * 0.5 + Math.sin(ang) * size * 0.54;
      ctx.beginPath(); ctx.arc(px, py, size * 0.16, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx + size * 0.5, cy + size * 0.5, size * 0.34, 0, Math.PI * 2); ctx.fill();
  } else if (shape === 'alien') {
    // Antenas e olhos grandes
    ctx.strokeStyle = '#9cff57'; ctx.lineWidth = Math.max(1, cell * 0.045);
    ctx.beginPath(); ctx.moveTo(cx + size * 0.32, cy + size * 0.12); ctx.lineTo(cx + size * 0.18, cy - size * 0.22);
    ctx.moveTo(cx + size * 0.68, cy + size * 0.12); ctx.lineTo(cx + size * 0.82, cy - size * 0.22); ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(cx + size * 0.33, cy + size * 0.48, size * 0.1, size * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + size * 0.67, cy + size * 0.48, size * 0.1, size * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  } else if (shape === 'pirata') {
    // Chapéu e tapa-olho
    ctx.fillStyle = '#161616';
    ctx.beginPath();
    ctx.roundRect(cx + size * 0.02, cy - size * 0.22, size * 0.96, size * 0.28, size * 0.08); ctx.fill();
    ctx.fillRect(cx + size * 0.28, cy - size * 0.38, size * 0.44, size * 0.18);
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.roundRect(cx + size * 0.18, cy + size * 0.35, size * 0.64, size * 0.17, size * 0.06); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${cell * 0.28}px sans-serif`; ctx.fillText('✕', cx + size * 0.54, cy + size * 0.45);
  } else if (shape === 'robot') {
    // Antena e detalhes quadrados
    ctx.strokeStyle = '#d7e2ef'; ctx.lineWidth = Math.max(1, cell * 0.05);
    ctx.beginPath(); ctx.moveTo(cx + size * 0.5, cy - size * 0.02); ctx.lineTo(cx + size * 0.5, cy - size * 0.32); ctx.stroke();
    ctx.fillStyle = '#d7e2ef'; ctx.beginPath(); ctx.arc(cx + size * 0.5, cy - size * 0.35, size * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx + size * 0.2, cy + size * 0.38, size * 0.16, size * 0.13);
    ctx.fillRect(cx + size * 0.64, cy + size * 0.38, size * 0.16, size * 0.13);
  } else if (shape === 'skull') {
    // Olhos e nariz de caveira
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(cx + size * 0.32, cy + size * 0.48, size * 0.11, size * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + size * 0.68, cy + size * 0.48, size * 0.11, size * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + size * 0.5, cy + size * 0.58); ctx.lineTo(cx + size * 0.44, cy + size * 0.72); ctx.lineTo(cx + size * 0.56, cy + size * 0.72); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(1, cell * 0.035);
    ctx.beginPath(); ctx.moveTo(cx + size * 0.3, cy + size * 0.82); ctx.lineTo(cx + size * 0.7, cy + size * 0.82); ctx.stroke();
  }

  // Reflexo de luz para dar acabamento 3D.
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(cx + size * 0.34, cy + size * 0.22, size * 0.18, size * 0.07, -0.30, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Carinhas dos animais: olhos + focinho/nariz simples. Antes todos recebiam apenas
  // dois olhos genéricos, então gato, coelho, urso etc. pareciam apenas "cabeças coloridas".
  const animalFace = ['owl', 'cat', 'bunny', 'dragon', 'bear', 'fox', 'shark', 'bee', 'unicorn', 'monkey', 'lion'].includes(shape);
  if (animalFace) {
    const faceY = cy + size * 0.48;
    ctx.save();
    ctx.fillStyle = shape === 'cat' || shape === 'fox' ? '#24151a' : '#10151d';
    ctx.beginPath();
    if (shape === 'owl') {
      ctx.arc(cx + size * 0.5, faceY + size * 0.08, size * 0.08, 0, Math.PI * 2);
    } else if (shape === 'shark') {
      ctx.arc(cx + size * 0.5, faceY + size * 0.12, size * 0.055, 0, Math.PI * 2);
    } else {
      ctx.moveTo(cx + size * 0.5, faceY);
      ctx.lineTo(cx + size * 0.42, faceY + size * 0.07);
      ctx.quadraticCurveTo(cx + size * 0.5, faceY + size * 0.14, cx + size * 0.58, faceY + size * 0.07);
      ctx.closePath();
    }
    ctx.fill();
    if (['cat', 'bunny', 'bear', 'fox', 'monkey'].includes(shape)) {
      ctx.strokeStyle = 'rgba(20,20,25,.8)';
      ctx.lineWidth = Math.max(1, cell * 0.025);
      ctx.beginPath();
      ctx.arc(cx + size * 0.5, faceY + size * 0.05, size * 0.10, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Olhinhos em toda cabeça, com uma piscadinha de vez em quando — dá mais vida e é
  // barato de desenhar (só dois pontinhos ou dois tracinhos quando pisca)
  const eyeY = cy + size * 0.36;
  const eyeR = size * 0.09;
  const blinking = Math.sin(Date.now() / 480 + x * 7 + y * 3) > 0.985;
  ctx.fillStyle = '#0b1220';
  ctx.strokeStyle = '#0b1220';
  ctx.lineWidth = Math.max(1, eyeR * 0.9);
  if (blinking) {
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.28 - eyeR, eyeY); ctx.lineTo(cx + size * 0.28 + eyeR, eyeY);
    ctx.moveTo(cx + size * 0.72 - eyeR, eyeY); ctx.lineTo(cx + size * 0.72 + eyeR, eyeY);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx + size * 0.28, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.72, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// v3.5.1 graphics — refinamentos visuais sem alterar a lógica da partida
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
function drawBodySegment(x, y, color, pattern, k, palette) {
  const pad = cell * 0.1, size = cell - pad * 2, r = cell * 0.22;
  const cx = sx(x) + pad, cy = sy(y) + pad;

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.roundRect(cx + size * 0.06, cy + size * 0.12, size, size, r);
  ctx.fill();

  let fillColor = color;
  if (pattern === 'tricolor') {
    const preset = TRICOLOR_PALETTES.find(p => p.value === palette);
    if (preset && preset.colors) fillColor = preset.colors[k % 3];
    else {
      const variant = k % 3;
      fillColor = variant === 1 ? shadeColor(color, 55) : variant === 2 ? shadeColor(color, -55) : color;
    }
  } else if (pattern === 'fire') {
    fillColor = k % 3 === 0 ? '#ff5533' : k % 3 === 1 ? '#ff9f43' : '#ffd34d';
  } else if (pattern === 'ice') {
    fillColor = k % 2 ? '#8ee9ff' : '#d9fbff';
  } else if (pattern === 'galaxy') {
    fillColor = k % 3 === 0 ? '#7047c6' : k % 3 === 1 ? '#2b3d91' : '#a07ce9';
  } else if (pattern === 'electric') {
    fillColor = k % 2 ? '#51e6ff' : '#b7f8ff';
  } else if (pattern === 'venom') {
    fillColor = k % 2 ? '#72c94b' : '#3f8f3b';
  }

  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.roundRect(cx, cy, size, size, r);
  ctx.fill();

  /* v3.5.1 volume overlay — reflexo, sombra e contorno */
  ctx.save();
  const vg = ctx.createLinearGradient(cx, cy, cx + size, cy + size);
  vg.addColorStop(0, 'rgba(255,255,255,0.22)');
  vg.addColorStop(0.34, 'rgba(255,255,255,0.03)');
  vg.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = vg;
  ctx.beginPath();
  ctx.roundRect(cx, cy, size, size, r);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = Math.max(1, cell * 0.028);
  ctx.beginPath();
  ctx.roundRect(cx + cell * 0.015, cy + cell * 0.015, size - cell * 0.03, size - cell * 0.03, Math.max(1, r - cell * 0.02));
  ctx.stroke();
  ctx.restore();

  if (pattern === 'stripes' && k % 2 === 1) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.roundRect(cx, cy, size, size, r); ctx.fill();
  } else if (pattern === 'dots') {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(sx(x) + cell / 2, sy(y) + cell / 2, cell * 0.13, 0, Math.PI * 2); ctx.fill();
  } else if (pattern === 'neon') {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = cell * 0.65;
    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth = Math.max(1, cell * 0.035);
    ctx.stroke();
    ctx.restore();
  } else if (pattern === 'fire') {
    ctx.fillStyle = k % 2 ? '#ffe26b' : '#ff6a2a';
    ctx.globalAlpha = 0.72;
    ctx.beginPath(); ctx.arc(sx(x) + cell * 0.5, sy(y) + cell * 0.38, cell * 0.10, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (pattern === 'ice') {
    ctx.fillStyle = '#ffffffaa';
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.18, cy + size * 0.28);
    ctx.lineTo(cx + size * 0.46, cy + size * 0.10);
    ctx.lineTo(cx + size * 0.35, cy + size * 0.34);
    ctx.closePath(); ctx.fill();
  } else if (pattern === 'galaxy') {
    ctx.fillStyle = '#ffffffcc';
    const star = size * 0.08;
    ctx.fillRect(cx + size * (0.20 + (k % 3) * 0.24), cy + size * 0.28, star, star);
    ctx.fillRect(cx + size * (0.42 + (k % 2) * 0.20), cy + size * 0.64, star, star);
  } else if (pattern === 'electric') {
    ctx.strokeStyle = '#ffffffdd';
    ctx.lineWidth = Math.max(1, cell * 0.035);
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.18, cy + size * 0.58);
    ctx.lineTo(cx + size * 0.40, cy + size * 0.35);
    ctx.lineTo(cx + size * 0.56, cy + size * 0.62);
    ctx.lineTo(cx + size * 0.78, cy + size * 0.36);
    ctx.stroke();
  } else if (pattern === 'venom') {
    ctx.fillStyle = '#c7ff5a';
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(cx + size * 0.28, cy + size * 0.70, cell * 0.055, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.72, cy + size * 0.70, cell * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Minimapa no canto — só aparece quando o mapa é maior que a janela de visão (Mapa Grande),
// que é justamente quando a câmera segue a minhoca e fica mais fácil se perder.
// Confete de verdade caindo quando completa a missão — detecta a troca de "não completa"
// pra "completa" olhando pro estado, então funciona tanto pra quem hospeda quanto pra
// quem entrou na sala (ambos recebem essa informação, um direto e outro pela rede).
let lastMissionDone = false;
let confetti = [];
const CONFETTI_COLORS = ['#ff6b6b', '#ffd24d', '#4dd9ff', '#67ef8a', '#ff72bd', '#b57bff'];

function checkMissionConfetti() {
  const done = !!state.mission?.done;
  if (done && !lastMissionDone) spawnConfetti();
  lastMissionDone = done;
}

function spawnConfetti() {
  for (let i = 0; i < 44; i++) {
    confetti.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 120,
      vx: (Math.random() - 0.5) * 2.4,
      vy: 2 + Math.random() * 2.6,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      w: 5 + Math.random() * 5,
      h: 3 + Math.random() * 4,
      life: 100 + Math.random() * 40,
    });
  }
}

function updateAndDrawConfetti() {
  confetti.forEach((c) => {
    c.x += c.vx; c.y += c.vy; c.vy += 0.035; c.rot += c.rotSpeed; c.life--;
  });
  confetti = confetti.filter((c) => c.life > 0 && c.y < canvas.height + 30);

  ctx.save();
  for (const c of confetti) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.globalAlpha = Math.min(1, c.life / 30);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.restore();
  }
  ctx.restore();
}

// Desenha a Minhoca Caçadora — visual bem diferente das minhocas normais, pra ficar
// claro que é uma ameaça especial: escura, com um brilho vermelho pulsante e uma
// caveira na cabeça em vez de olhinhos fofos.
const FIFTY_FEATURE_KEY = '__mioquinhaFiftyFoodFeature';

function drawFiftyFoodEnemies() {
  const enemies = globalThis[FIFTY_FEATURE_KEY]?.enemies;
  if (!Array.isArray(enemies)) return;
  const agora = Date.now();

  for (const enemy of enemies) {
    if (!enemy?.snake?.length || agora >= enemy.endsAt) continue;
    const targetIsMe = enemy.target === mySlot;
    const seconds = Math.max(0, Math.ceil((enemy.endsAt - agora) / 1000));

    ctx.save();
    ctx.globalAlpha = targetIsMe ? 1 : 0.88;

    for (let k = enemy.snake.length - 1; k >= 0; k--) {
      const p = enemy.snake[k];
      const px = sx(p.x), py = sy(p.y);
      const size = cell * 0.78;

      ctx.fillStyle = '#240711';
      ctx.shadowColor = '#ff304f';
      ctx.shadowBlur = targetIsMe ? cell * 0.40 : cell * 0.22;
      ctx.beginPath();
      ctx.roundRect(px + cell * 0.11, py + cell * 0.11, size, size, cell * 0.20);
      ctx.fill();

      ctx.fillStyle = k % 2 ? '#741328' : '#b41c37';
      ctx.shadowBlur = targetIsMe ? cell * 0.18 : cell * 0.08;
      ctx.beginPath();
      ctx.roundRect(px + cell * 0.15, py + cell * 0.15, size - cell * 0.08, size - cell * 0.08, cell * 0.16);
      ctx.fill();
    }

    const h = enemy.snake[0];
    const hx = sx(h.x) + cell / 2, hy = sy(h.y) + cell / 2;
    const pulse = 0.82 + 0.18 * Math.sin(agora / 150 + enemy.target);

    ctx.globalAlpha = targetIsMe ? pulse : 0.86;
    ctx.fillStyle = '#ff304f';
    ctx.shadowColor = '#ff183d';
    ctx.shadowBlur = cell * 0.65;
    ctx.beginPath();
    ctx.arc(hx, hy, cell * 0.42, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `900 ${Math.max(12, cell * 0.55)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = cell * 0.35;
    ctx.fillText('☠️', hx, hy);

    ctx.font = `900 ${Math.max(9, cell * 0.38)}px system-ui`;
    ctx.fillStyle = targetIsMe ? '#ff9aaa' : '#d9a2ac';
    ctx.fillText('☠️ ' + (state.names[enemy.target] || 'Jogador ' + (enemy.target + 1)) + ' • ' + seconds + 's', hx, hy - cell * 0.72);

    if (targetIsMe) {
      ctx.globalAlpha = 0.26 + 0.18 * Math.sin(agora / 140);
      ctx.strokeStyle = '#ff4058';
      ctx.lineWidth = Math.max(1.5, cell * 0.065);
      ctx.beginPath();
      ctx.arc(hx, hy, cell * (0.72 + 0.08 * Math.sin(agora / 120)), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawHunter() {
  if (!state.hunterActive || !state.hunterSnake.length) return;
  const pulse = 0.5 + Math.sin(Date.now() / 150) * 0.5;
  ctx.save();
  ctx.shadowColor = '#ff2222';
  ctx.shadowBlur = cell * (0.7 + pulse * 0.5);
  for (let k = state.hunterSnake.length - 1; k >= 0; k--) {
    const p = state.hunterSnake[k];
    const pad = cell * 0.08, size = cell - pad * 2;
    const cx = sx(p.x) + pad, cy = sy(p.y) + pad;
    ctx.fillStyle = k === 0 ? '#3a0a0a' : '#1a0505';
    ctx.beginPath();
    ctx.roundRect(cx, cy, size, size, cell * 0.2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,40,40,${0.5 + pulse * 0.5})`;
    ctx.lineWidth = Math.max(1, cell * 0.05);
    ctx.stroke();
  }
  ctx.restore();

  // Rastro de fumaça escura (melhoria #2) — desenhado direto a partir do corpo, sem
  // depender de partículas (que só existem no anfitrião), então todo mundo vê igual.
  // As últimas partes do corpo soltam "fiapos" escuros que sobem e vão sumindo.
  const agora = Date.now();
  const inicioFumaca = Math.max(1, state.hunterSnake.length - 14);
  for (let k = inicioFumaca; k < state.hunterSnake.length; k++) {
    const p = state.hunterSnake[k];
    const idade = (k - inicioFumaca) / Math.max(1, state.hunterSnake.length - inicioFumaca); // 0 = perto do corpo, 1 = ponta
    const balanco = Math.sin(agora / 260 + k * 1.7);
    const fx = sx(p.x) + cell / 2 + balanco * cell * 0.25;
    const fy = sy(p.y) + cell / 2 - idade * cell * 0.9 - ((agora / 90 + k * 3) % 6) * cell * 0.05;
    ctx.save();
    ctx.globalAlpha = 0.34 * (1 - idade * 0.7);
    ctx.fillStyle = '#0b0b0f';
    ctx.beginPath();
    ctx.arc(fx, fy, cell * (0.28 + idade * 0.32), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Olhos vermelhos brilhantes e pulsantes na cabeça (melhoria #1) — bem mais
  // reconhecível de longe do que a caveirinha de antes. A direção vem da posição da
  // cabeça em relação ao segundo segmento, pra funcionar igual no celular.
  const head = state.hunterSnake[0];
  const neck = state.hunterSnake[1] || { x: head.x - 1, y: head.y };
  let dx = Math.sign(head.x - neck.x), dy = Math.sign(head.y - neck.y);
  if (!dx && !dy) dx = 1;
  const hx = sx(head.x) + cell / 2, hy = sy(head.y) + cell / 2;
  const perpX = -dy, perpY = dx; // perpendicular à direção do movimento
  const olhoBrilho = 0.55 + pulse * 0.45;
  ctx.save();
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = cell * (0.8 + pulse * 0.9);
  for (const lado of [-1, 1]) {
    const ox = hx + dx * cell * 0.12 + perpX * lado * cell * 0.22;
    const oy = hy + dy * cell * 0.12 + perpY * lado * cell * 0.22;
    ctx.fillStyle = `rgba(255,${Math.round(30 + pulse * 40)},${Math.round(30 + pulse * 20)},${olhoBrilho})`;
    ctx.beginPath();
    ctx.arc(ox, oy, cell * (0.15 + pulse * 0.05), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff'; // pontinho de brilho no centro
    ctx.beginPath();
    ctx.arc(ox, oy, cell * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Distância (em células) entre a cabeça da minhoca do jogador local e a cabeça da
// Minhoca Caçadora — usada pela vinheta e pelo batimento. Calculada aqui, a partir do
// que já é transmitido pra todo mundo, pra funcionar igual no anfitrião e nos celulares.
function distanciaAteCacadora() {
  if (!state.hunterActive || !state.hunterSnake[0]) return null;
  if (!state.alive[mySlot] || !state.snakes[mySlot]?.[0]) return null;
  const h = state.snakes[mySlot][0], c = state.hunterSnake[0];
  return Math.hypot(h.x - c.x, h.y - c.y);
}

// Vinheta vermelha nas bordas da tela (melhoria #3) — fica mais forte quanto mais
// perto a caçadora está de VOCÊ especificamente, dando aquela sensação de perigo.
function drawHunterTargetLock() {
  if (!state.hunterActive) return;

  let leader = -1;
  let top = -1;
  for (let i = 0; i < state.count; i++) {
    if (state.alive[i] && (state.scores[i] || 0) > top) {
      top = state.scores[i] || 0;
      leader = i;
    }
  }
  const target = leader >= 0 ? state.snakes[leader]?.[0] : null;
  if (!target) return;

  const x = sx(target.x) + cell / 2;
  const y = sy(target.y) + cell / 2;
  const now = Date.now();
  const pulse = 0.55 + 0.45 * Math.sin(now / 130);

  ctx.save();
  ctx.globalAlpha = 0.42 + pulse * 0.24;
  ctx.strokeStyle = '#ff4058';
  ctx.shadowColor = '#ff304f';
  ctx.shadowBlur = cell * 0.55;
  ctx.lineWidth = Math.max(1, cell * 0.045);

  const r = cell * (0.94 + pulse * 0.12);
  const gap = cell * 0.24;
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.beginPath();
    ctx.arc(x, y, r, a + 0.16, a + Math.PI / 2 - 0.16);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(x, y, r * 0.58, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHunterVignette() {
  const d = distanciaAteCacadora();
  if (d === null) return;
  const RAIO_DE_PERIGO = 14;
  const perigo = Math.max(0, Math.min(1, 1 - d / RAIO_DE_PERIGO));
  if (perigo <= 0) return;
  const pulso = 0.85 + Math.sin(Date.now() / (260 - perigo * 150)) * 0.15;
  const w = canvas.width, h = canvas.height;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * (0.55 - perigo * 0.25), w / 2, h / 2, Math.hypot(w, h) / 2);
  g.addColorStop(0, 'rgba(255,0,0,0)');
  g.addColorStop(1, `rgba(255,0,0,${(0.62 * perigo * pulso).toFixed(3)})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Marcador de time na cabecinha: uma FORMA por time (▲ Azul, ■ Vermelho), além da cor —
// ajuda quem tem dificuldade com cores e evita matar aliado sem querer.
function desenharMarcadorDeTime(time, x, y) {
  const r = cell * 0.2;
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0b1220';
  ctx.lineWidth = Math.max(1, cell * 0.06);
  ctx.beginPath();
  if (time === 0) {
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y + r * 0.85);
    ctx.lineTo(x - r, y + r * 0.85);
    ctx.closePath();
  } else {
    ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Setinha na borda da tela apontando pra Minhoca Caçadora quando ela está FORA da tela.
// Em mapa grande a câmera mostra só um pedaço, e antes só o minimapa avisava onde ela
// estava — agora dá pra ver na hora de que lado o perigo vem, e a que distância (em casas).
function drawHunterPointer() {
  if (!state.hunterActive || !state.hunterSnake[0]) return;
  const w = canvas.width, h = canvas.height;
  const cabeca = state.hunterSnake[0];
  const hx = sx(cabeca.x) + cell / 2, hy = sy(cabeca.y) + cell / 2;
  const margem = cell * 0.6;
  if (hx >= margem && hx <= w - margem && hy >= margem && hy <= h - margem) return; // já aparece na tela

  // Ponto da borda (com uma folga) onde a linha do centro da tela até a caçadora cruza
  const folga = cell * 1.5;
  const dx = hx - w / 2, dy = hy - h / 2;
  const escala = Math.min((w / 2 - folga) / Math.max(Math.abs(dx), 1e-6), (h / 2 - folga) / Math.max(Math.abs(dy), 1e-6));
  let px = w / 2 + dx * escala, py = h / 2 + dy * escala;

  // Não fica em cima do minimapa (canto de cima à direita): se cair ali, desce um pouquinho
  const mmW = Math.min(150, w * 0.34), mmH = mmW * (state.mapH / state.mapW);
  if (px > w - mmW - 14 - folga * 0.5 && py < 14 + mmH + folga * 0.5) py = 14 + mmH + folga;

  // Distância até a SUA minhoca (ou até o centro da tela, se você estiver morto)
  const eu = state.alive[mySlot] ? state.snakes[mySlot]?.[0] : null;
  const distancia = Math.round(eu ? Math.hypot(eu.x - cabeca.x, eu.y - cabeca.y) : Math.hypot(dx, dy) / cell);

  const angulo = Math.atan2(hy - py, hx - px);
  const pulso = 0.5 + 0.5 * Math.sin(Date.now() / (60 + Math.min(distancia, 40) * 7)); // mais perto = pulsa mais rápido
  const s = cell * (0.75 + pulso * 0.2);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angulo);
  ctx.shadowColor = '#ff2222';
  ctx.shadowBlur = cell * (0.6 + pulso * 0.6);
  ctx.fillStyle = `rgba(255,50,50,${(0.75 + pulso * 0.25).toFixed(2)})`;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, cell * 0.06);
  ctx.beginPath();
  ctx.moveTo(s, 0);
  ctx.lineTo(-s * 0.6, s * 0.7);
  ctx.lineTo(-s * 0.25, 0);
  ctx.lineTo(-s * 0.6, -s * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Texto com a distância, um pouco pra dentro da tela (sem girar junto com a seta)
  ctx.save();
  ctx.font = `bold ${Math.round(cell * 0.6)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`☠️ ${distancia}`, px - Math.cos(angulo) * cell * 1.7, py - Math.sin(angulo) * cell * 1.7);
  ctx.restore();
}

// Batimento cardíaco (melhoria #6) — quanto mais perto a caçadora, mais rápido bate.
// Toca daqui porque o render roda tanto no anfitrião quanto nos celulares.
let ultimoBatimentoEm = 0;
function tocarBatimentoSePerto() {
  const d = distanciaAteCacadora();
  if (d === null || d > 14) return;
  const intervalo = 260 + Math.max(0, d - 2) * 62; // ~260ms bem colada até ~1000ms lá longe
  const agora = Date.now();
  if (agora - ultimoBatimentoEm >= intervalo) {
    ultimoBatimentoEm = agora;
    sfx.hunterHeartbeat();
  }
}

function drawMinimap() {
  // Antes só aparecia em mapas grandes (que não cabiam na câmera de uma vez); agora
  // aparece sempre, já que ver comida/minhocas de relance ajuda em qualquer tamanho de mapa
  const mmW = Math.min(150, canvas.width * 0.34);
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

  // Comidinhas e estrelas no minimapa — bem maiores e com contorno branco, pra dar
  // pra ver de relance mesmo numa tela pequena de celular
  for (const f of state.foods) {
    const r = f.kind === 'bonus' || f.kind === 'secondPlace' ? 3.2 : 2.2;
    ctx.fillStyle = f.kind === 'bonus' ? '#ffd24d' : f.kind === 'secondPlace' ? '#63e6ff' : f.kind === 'drop' ? (state.colors[f.owner] || '#ff4f7a') : '#ff4f7a';
    ctx.beginPath();
    ctx.arc(mx + f.x * scale, my + f.y * scale, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // A Minhoca Caçadora também aparece, pra dar um aviso de longe de onde ela tá.
  // Melhoria #10: quando ela chega perto de QUALQUER jogador (não só de você), o ponto
  // dela pisca em vermelho com um anel crescendo — todo mundo fica sabendo que tem
  // perigo rolando em algum canto do mapa. A proximidade é calculada aqui mesmo, com os
  // dados que já chegam pra todos, então funciona igual no celular e no anfitrião.
  if (state.hunterActive && state.hunterSnake[0]) {
    const hc = state.hunterSnake[0];
    let alguemPerto = false;
    for (let i = 0; i < state.count; i++) {
      const s = state.snakes[i]?.[0];
      if (state.alive[i] && s && Math.abs(s.x - hc.x) + Math.abs(s.y - hc.y) <= 5) { alguemPerto = true; break; }
    }
    const hx = mx + hc.x * scale, hy = my + hc.y * scale;
    const piscaLigado = Math.floor(Date.now() / 200) % 2 === 0;
    if (alguemPerto) {
      const anel = ((Date.now() % 700) / 700);
      ctx.strokeStyle = `rgba(255,60,60,${(1 - anel).toFixed(2)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(hx, hy, 3.2 + anel * 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = alguemPerto && !piscaLigado ? '#ffffff' : '#ff2222';
    ctx.beginPath();
    ctx.arc(hx, hy, alguemPerto ? 4.2 : 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  for (let i = 0; i < state.count; i++) {
    if (!state.alive[i] || !state.snakes[i]?.[0]) continue;
    const h = state.snakes[i][0];
    const r = i === mySlot ? 4.5 : 3.5;
    ctx.fillStyle = state.colors[i];
    ctx.beginPath();
    ctx.arc(mx + h.x * scale, my + h.y * scale, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // retângulo mostrando a área que a câmera tá vendo agora
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1.3;
  ctx.strokeRect(mx + camX * scale, my + camY * scale, viewW * scale, viewH * scale);

  // Varredura de radar discreta girando no minimapa.
  const radarT = (Date.now() / 900) % (Math.PI * 2);
  const rcx = mx + mmW / 2, rcy = my + mmH / 2;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#67ef8a';
  ctx.lineWidth = Math.max(1, Math.min(2, mmW * 0.012));
  ctx.beginPath();
  ctx.moveTo(rcx, rcy);
  ctx.lineTo(rcx + Math.cos(radarT) * mmW * 0.50, rcy + Math.sin(radarT) * mmW * 0.50);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// Indicador visual de sinal (melhoria #1) — barrinhas coloridas tipo celular, baseadas
// no ping de cada jogador. Só aparece online, e nunca pro próprio jogador local (não
// faz sentido medir ping até você mesmo).
function sinalIndicador(i) {
  if (!isOnline()) return '';
  let ping = null;
  if (isHost()) {
    if (i === mySlot) return ''; // você é o anfitrião, não tem ping até você mesmo
    ping = pingStats[i];
  } else {
    if (i !== 0) return ''; // cliente só sabe o ping até o anfitrião (slot 0)
    ping = hostLatency;
  }
  if (ping == null) return ' <span class="sinalBadge" title="Medindo...">📶</span>';
  const cor = ping < 100 ? '#3fcf68' : ping < 250 ? '#ffd24d' : '#ff5577';
  return ` <span class="sinalBadge" style="color:${cor}" title="${ping}ms de ping">📶 ${ping}ms</span>`;
}

function renderOnlineMatchStats(rankOrder) {
  const box = typeof document !== 'undefined' ? document.getElementById('onlineMatchStats') : null;
  if (!box || !isOnline()) {
    if (box) box.classList.add('hidden');
    return;
  }

  let ping = null;
  if (isHost()) {
    const values = Object.values(pingStats).filter(v => Number.isFinite(v));
    if (values.length) ping = Math.round(values.reduce((a,b)=>a+b,0) / values.length);
  } else if (Number.isFinite(hostLatency)) {
    ping = Math.round(hostLatency);
  }

  const myRank = rankOrder.indexOf(mySlot) + 1;
  const totalScore = rankOrder.reduce((n,i)=>n+(state.scores[i]||0),0);
  const totalFood = rankOrder.reduce((n,i)=>n+(state.foodsEaten[i]||0),0);
  const totalElim = rankOrder.reduce((n,i)=>n+(state.eliminations[i]||0),0);
  const quality = ping == null ? '📶 Medindo' : ping < 100 ? '🟢 Excelente' : ping < 250 ? '🟡 Estável' : '🔴 Instável';

  box.classList.remove('hidden');
  box.innerHTML =
    '<div class="onlineStatsTitle">🌐 Painel Online <span>' + (isHost() ? '👑 Anfitrião' : '🎮 Cliente') + '</span></div>' +
    '<div class="onlineStatsGrid">' +
      '<div><span>🏅 Sua posição</span><b>' + myRank + 'º / ' + state.count + '</b></div>' +
      '<div><span>⭐ Pontos totais</span><b>' + totalScore + '</b></div>' +
      '<div><span>🍎 Comidas</span><b>' + totalFood + '</b></div>' +
      '<div><span>☠️ Eliminações</span><b>' + totalElim + '</b></div>' +
      '<div><span>📶 Conexão</span><b>' + quality + '</b></div>' +
      '<div><span>📡 Ping</span><b>' + (ping == null ? '—' : ping + ' ms') + '</b></div>' +
    '</div>';
}

export function renderScores() {
  let h = '';
  const teamBadge = ['🔵', '🔴'];

  // Descobre quem tá na frente (só faz sentido com mais de 1 jogador, e com pontuação > 0)
  // Ordem visual do ranking fica sempre disponível, inclusive quando há só 1 jogador.
  // O desempate usa comida consumida e, por último, a ordem original dos slots.
  const rankOrder = Array.from({ length: state.count }, (_, i) => i).sort((a, b) => {
    const scoreDiff = (state.scores[b] || 0) - (state.scores[a] || 0);
    if (scoreDiff !== 0) return scoreDiff;
    const foodDiff = (state.foodsEaten[b] || 0) - (state.foodsEaten[a] || 0);
    return foodDiff !== 0 ? foodDiff : a - b;
  });

  let leaderIdx = -1;
  if (state.count > 1) {
    let maxScore = 0;
    for (let i = 0; i < state.count; i++) {
      if ((state.scores[i] || 0) > maxScore) { maxScore = state.scores[i]; leaderIdx = i; }
    }
  }

  // No Modo Torneio, também descobre quem tá ganhando o TORNEIO (mais rodadas vencidas
  // até agora) — diferente de quem tá liderando só essa rodada
  let tournamentLeaderIdx = -1;
  if (state.tournamentMode && state.count > 1) {
    let maxWins = 0;
    for (let i = 0; i < state.count; i++) {
      if ((state.tournamentWins[i] || 0) > maxWins) { maxWins = state.tournamentWins[i]; tournamentLeaderIdx = i; }
    }
  }

  for (let i = 0; i < state.count; i++) {
    const boost = state.boosting[i] ? ' • ⚡' : '';
    const team = state.teamMode ? ` ${teamBadge[state.teams[i]] || ''}` : '';
    const wins = state.tournamentMode ? ` • 🏆${state.tournamentWins[i] || 0}` : '';
    const leader = i === leaderIdx ? ' 👑' : '';
    const leaderClass = (i === leaderIdx ? ' leaderScore' : '') + (i === tournamentLeaderIdx ? ' tournamentLeading' : '');
    // Recorde histórico batido AGORA é diferente de só liderar a rodada — usa um troféu
    // dourado especial, já que é uma conquista maior (bate o melhor de sempre desse aparelho)
    const beatingRecord = (state.scores[i] || 0) > 0 && (state.scores[i] || 0) > state.best;
    const recordBadge = beatingRecord ? ' <span class="newRecordBadge">🏆 NOVO RECORDE!</span>' : '';
    const len = state.snakes[i]?.length || 0;
    const milestoneProgress = state.alive[i] ? Math.max(0, Math.min(1, (len - state.milestones[i]) / MILESTONE_STEP)) : 0;
    const progressBar = state.alive[i]
      ? `<div class="milestoneBar"><div class="milestoneBarFill" style="width:${Math.round(milestoneProgress * 100)}%;background:${state.colors[i]}"></div></div>`
      : '';
    // "Você" — só faz sentido mostrar com mais de 1 jogador na tela, senão é óbvio demais
    const youBadge = (i === mySlot && state.count > 1) ? ' <span class="youBadge">🫵 Você</span>' : '';
    const sinalBadge = sinalIndicador(i);
    // Ícone Humano/CPU — ajuda a saber de relance quem é controlado por gente de verdade
    const typeIcon = state.types[i] === 'cpu' ? '🤖' : '🧑';
    const rank = rankOrder.indexOf(i) + 1;
    const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
    const rankClass = ` rank-${Math.min(rank, 3)}`;
    const nameStyle = (i === 0 && state.nameColor && state.nameColor !== 'auto') ? ` style="color:${state.nameColor}"` : '';
    h += `<div class="score${leaderClass}${rankClass}" data-rank="${rank}" style="border-color:${state.colors[i]}"><span class="rankBadge">${rankIcon}</span> ${ICONS[i]} ${typeIcon} <b${nameStyle}>${label(i)}</b>${youBadge}${sinalBadge}${leader}${recordBadge}${team} • 🍎 ${state.foodsEaten[i] || 0} • ⭐ <span class="scoreNum">${state.scores[i] || 0}</span> • 🎯 ${state.eliminations[i] || 0}${wins}${boost}${state.alive[i] ? '' : ' • ☠️'}${progressBar}</div>`;
  }
  // Placar somado dos times: quem está ganhando de relance (o de cima, em dourado)
  if (state.teamMode && state.count > 1) {
    const total = [0, 0];
    for (let i = 0; i < state.count; i++) total[state.teams[i] === 1 ? 1 : 0] += state.scores[i] || 0;
    const lider = total[0] === total[1] ? -1 : (total[0] > total[1] ? 0 : 1);
    const cor = (t) => (lider === t ? '#ffd24d' : '#ffffff');
    const borda = lider === -1 ? '#8aa0c8' : (lider === 0 ? '#63b3ff' : '#ff5577');
    h = `<div class="score teamTotal" style="border-color:${borda}">🔵 Azul <b style="color:${cor(0)}">${total[0]}</b> × <b style="color:${cor(1)}">${total[1]}</b> Vermelho 🔴${lider === -1 ? ' • empate' : ''}</div>` + h;
  }
  h += `<div class="score" style="border-color:#ffd24d">🏅 Recorde: ${state.best || 0}</div>`;
  $('scores').innerHTML = h;
  renderOnlineMatchStats(rankOrder);
  const scoresBottomBox = $('scoresBottom');
  if (scoresBottomBox) scoresBottomBox.innerHTML = h;
  $('alive').textContent = state.alive.filter(Boolean).length;

  // Indicador de quantos turbos ainda dá pra usar (baseado na comida acumulada)
  const fuelBox = $('boostFuelCount');
  if (fuelBox) fuelBox.textContent = state.foodsEaten[mySlot] || 0;
  const usedBox = $('boostUsedDisplay');
  if (usedBox) usedBox.textContent = `⚡ Turbo usado: ${state.boostUsedCount[mySlot] || 0}x`;

  // Contador de jogadores online (melhoria #13) — só aparece durante partidas online
  const onlineBox = $('onlineCount');
  if (onlineBox) {
    if (isOnline()) {
      onlineBox.classList.remove('hidden');
      $('onlineCountNum').textContent = state.count;
    } else {
      onlineBox.classList.add('hidden');
    }
  }

  // Fileira de reações rápidas (emojis) — só faz sentido jogando com outra pessoa online
  const reactionBox = $('reactionRow');
  if (reactionBox) reactionBox.classList.toggle('hidden', !isOnline());

  // Caixa de chat de texto — mesma regra: só faz sentido jogando online com outra pessoa
  const chatBox = $('chatBox');
  if (chatBox) chatBox.classList.toggle('hidden', !isOnline());

  // Indicador de rodada e tempo restante do Modo Torneio
  const tBox = $('tournamentStatus');
  if (tBox) {
    tBox.classList.toggle('hidden', !state.tournamentMode);
    if (state.tournamentMode) {
      $('tournamentRoundNum').textContent = state.tournamentRound || 1;
      const secsLeft = Math.max(0, Math.ceil((state.tournamentRoundEndsAt - Date.now()) / 1000));
      $('tournamentSecondsLeft').textContent = secsLeft;
    }
  }
}

// Efeito visual de morte detectado pela transição vivo -> morto.
const ultimoAliveVisual = Array(6).fill(null);
const ultimaCabecaVisual = Array(6).fill(null);
let deathEffects = [];

function rastrearMortesVisuais() {
  for (let i = 0; i < state.count; i++) {
    const alive = !!state.alive[i];
    if (ultimoAliveVisual[i] === true && !alive && ultimaCabecaVisual[i]) {
      deathEffects.push({
        x: ultimaCabecaVisual[i].x,
        y: ultimaCabecaVisual[i].y,
        color: state.colors[i] || '#ffffff',
        bornAt: Date.now(),
      });
    }
    ultimoAliveVisual[i] = alive;
    if (alive && state.snakes[i]?.[0]) ultimaCabecaVisual[i] = { ...state.snakes[i][0] };
  }
}

function drawDeathEffects() {
  const agora = Date.now(), duracao = 650;
  deathEffects = deathEffects.filter(e => agora - e.bornAt < duracao);
  for (const e of deathEffects) {
    const p = Math.max(0, Math.min(1, (agora - e.bornAt) / duracao));
    const x = sx(e.x) + cell / 2, y = sy(e.y) + cell / 2;
    ctx.save();
    ctx.globalAlpha = 0.60 * (1 - p);
    ctx.strokeStyle = e.color;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = cell * (0.8 - p * 0.35);
    ctx.lineWidth = Math.max(1, cell * 0.08);
    ctx.beginPath();
    ctx.arc(x, y, cell * (0.45 + p * 1.55), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.86 * (1 - p);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${cell * 0.95}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💥', x, y);
    ctx.restore();

    // v3.5.1 death shards — pequenas faíscas saem do impacto.
    ctx.save();
    ctx.globalAlpha = 0.72 * (1 - p);
    ctx.strokeStyle = e.color;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = cell * 0.35;
    ctx.lineWidth = Math.max(1, cell * 0.035);
    for (let s = 0; s < 8; s++) {
      const a = s * Math.PI / 4;
      const inner = cell * (0.40 + p * 0.55);
      const outer = cell * (0.72 + p * 1.00);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner);
      ctx.lineTo(x + Math.cos(a) * outer, y + Math.sin(a) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawLeaderCrown() {
  if (state.count < 2) return;
  let leader = -1, topScore = 0;
  for (let i = 0; i < state.count; i++) {
    if (state.alive[i] && (state.scores[i] || 0) > topScore) { topScore = state.scores[i] || 0; leader = i; }
  }
  if (leader < 0 || !state.snakes[leader]?.[0]) return;
  const h = state.snakes[leader][0];
  const now = Date.now();
  const pulse = 0.75 + 0.25 * Math.sin(now / 180);
  const x = sx(h.x) + cell / 2;
  const y = sy(h.y) + cell / 2;

  ctx.save();
  ctx.globalAlpha = 0.15 + pulse * 0.10;
  ctx.strokeStyle = '#ffd24d';
  ctx.shadowColor = '#ffd24d';
  ctx.shadowBlur = cell * 0.80;
  ctx.lineWidth = Math.max(1, cell * 0.06);
  ctx.beginPath();
  ctx.arc(x, y, cell * (0.72 + pulse * 0.10), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.font = `900 ${Math.max(12, cell * 0.72)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffd24d';
  ctx.shadowBlur = cell * 0.55;
  ctx.fillText('👑', x, y - cell * 0.30);
  ctx.font = `900 ${Math.max(8, cell * 0.28)}px system-ui`;
  ctx.fillText('LÍDER', x, y - cell * 0.76);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = '#fff0a8';
  for (let n = 0; n < 4; n++) {
    const a = now / 900 + n * Math.PI / 2;
    const rr = cell * 0.78;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1, cell * 0.035), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnhancedParticles() {
  const agora = Date.now();
  /* v3.5.1 particle cap — mantém o visual rico sem sobrecarregar celular/PC */
  const start = Math.max(0, state.particles.length - 140);
  for (let i = start; i < state.particles.length; i++) {
    const p = state.particles[i];
    const x = sx(p.x) + cell / 2, y = sy(p.y) + cell / 2;
    const lifeRatio = Math.max(0, Math.min(1, (p.life || 0) / 40));
    const size = Math.max(1, cell * (0.05 + lifeRatio * 0.09));
    ctx.save();
    ctx.globalAlpha = lifeRatio * 0.95;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = size * 1.8;
    ctx.translate(x, y);
    ctx.rotate(agora / 180 + i * 1.7);
    ctx.beginPath();
    if (i % 3 === 0) {
      ctx.moveTo(0, -size); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0); ctx.closePath();
    } else if (i % 3 === 1) {
      ctx.rect(-size, -size, size * 2, size * 2);
    } else {
      ctx.arc(0, 0, size, 0, Math.PI * 2);
    }
    ctx.fill();
    if (lifeRatio > 0.35) {
      ctx.globalAlpha *= 0.45;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, size * 0.32), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function draw() {
  if (
    canvas.parentElement.clientWidth !== canvas._lastW ||
    canvas.parentElement.clientHeight !== canvas._lastH ||
    state.zoom !== canvas._lastZoom ||
    state.mapW !== canvas._lastMapW ||
    state.mapH !== canvas._lastMapH
  ) {
    resizeCanvas();
    canvas._lastW = canvas.parentElement.clientWidth;
    canvas._lastH = canvas.parentElement.clientHeight;
    canvas._lastZoom = state.zoom;
    canvas._lastMapW = state.mapW;
    canvas._lastMapH = state.mapH;
  }
  updateCamera();
  if (typeof rastrearMortesVisuais === 'function') rastrearMortesVisuais();

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.shake) ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);

  const theme = BOARD_THEMES.find((t) => t.value === state.theme) || BOARD_THEMES[0];
  drawThemeBackdrop(theme);
  drawBiomeDecorations(theme);
  drawMapGraphicForeground(theme);
  if (typeof drawThemeReaction === 'function') drawThemeReaction(theme);

  ctx.strokeStyle = theme.grid;
  const gxStart = Math.floor(camX), gxEnd = Math.ceil(camX + viewW);
  const gyStart = Math.floor(camY), gyEnd = Math.ceil(camY + viewH);
  for (let x = gxStart; x <= gxEnd; x++) { ctx.beginPath(); ctx.moveTo(sx(x), sy(gyStart)); ctx.lineTo(sx(x), sy(gyEnd)); ctx.stroke(); }
  for (let y = gyStart; y <= gyEnd; y++) { ctx.beginPath(); ctx.moveTo(sx(gxStart), sy(y)); ctx.lineTo(sx(gxEnd), sy(y)); ctx.stroke(); }

  // Borda bem visível nos limites reais do mapa — ajuda a saber exatamente onde é a
  // "parede" (ou o "teleporte", no modo sem paredes), mesmo quando a câmera só mostra
  // um pedaço do mapa por vez. Vermelho brilhante = machuca; azul tracejado = teleporta.
  ctx.save();
  const borderColor = state.noWalls ? '#4dd9ff' : '#ff4d4d';
  ctx.strokeStyle = borderColor;
  ctx.shadowColor = borderColor;

  // Se a SUA minhoca estiver perto da borda (e ela machucar), a borda pulsa mais forte
  // como um aviso de perigo — ajuda bastante quem tem dificuldade de perceber o limite.
  // Também vibra uma vez só ao ENTRAR na zona de perigo, não toda hora (senão enjoa).
  let dangerPulse = 0;
  if (!state.noWalls) {
    const myHead = state.snakes[mySlot]?.[0];
    if (myHead) {
      const distToEdge = Math.min(myHead.x, myHead.y, state.mapW - myHead.x, state.mapH - myHead.y);
      if (distToEdge < 4) {
        dangerPulse = (1 - distToEdge / 4) * (0.5 + Math.sin(Date.now() / 130) * 0.5);
        if (!wasNearEdge) { vibrate(25); wasNearEdge = true; }
      } else {
        wasNearEdge = false;
      }
    }
  }
  ctx.lineWidth = Math.max(2, cell * (0.12 + dangerPulse * 0.16));
  ctx.shadowBlur = cell * (0.6 + dangerPulse * 1.2);
  if (state.noWalls) ctx.setLineDash([cell * 0.4, cell * 0.25]);
  ctx.strokeRect(sx(0), sy(0), state.mapW * cell, state.mapH * cell);
  ctx.setLineDash([]);
  ctx.restore();

  const t = Date.now() / 180;
  for (const f of state.foods) {
    const x = sx(f.x) + cell / 2, y = sy(f.y) + cell / 2;
    if (x < -cell * 2 || x > canvas.width + cell * 2 || y < -cell * 2 || y > canvas.height + cell * 2) continue;
    const bob = Math.sin(Date.now() / 330 + f.x * 1.7 + f.y * 2.1) * cell * 0.05;
    const rot = Math.sin(Date.now() / 700 + f.x * 0.8 + f.y) * 0.08;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.translate(x, y + bob); ctx.rotate(rot);
    if (f.piscando) {
      const visible = Math.floor(Date.now() / 120) % 2 === 0;
      if (!visible) { ctx.restore(); continue; }
      ctx.scale(1.16, 1.16);
      ctx.font = `${cell}px sans-serif`;
      ctx.shadowBlur = 18; ctx.shadowColor = '#ffd24d'; ctx.fillText(theme.food, 0, 0);
      ctx.restore(); continue;
    }
    if (f.kind === 'bonus') {
      const pulse = 1 + Math.sin(Date.now() / 170) * 0.10;
      ctx.scale(pulse, pulse);
      ctx.font = `${cell * 1.2}px sans-serif`;
      ctx.shadowBlur = 15 + Math.sin(t) * 8; ctx.shadowColor = '#ffd24d'; ctx.fillText('⭐', 0, 0);
    } else if (f.kind === 'secondPlace') {
      const pulse = 1.05 + Math.sin(Date.now() / 140) * 0.12;
      ctx.scale(pulse, pulse);
      ctx.font = `${cell * 1.28}px sans-serif`;
      ctx.shadowBlur = 18 + Math.sin(t * 1.4) * 10; ctx.shadowColor = '#63e6ff'; ctx.fillText('💎', 0, 0);
      ctx.font = `${cell * 0.32}px sans-serif`; ctx.fillText('✦', cell * 0.62, -cell * 0.48);
    } else {
      const pulse = 0.96 + Math.sin(Date.now() / 280 + f.x) * 0.05;
      const rarity = f.rarity || 'normal';
      const style = {
        normal: { color: '#ff4f7a', scale: 1, ring: null },
        rare: { color: '#63b3ff', scale: 1.04, ring: '#63b3ff' },
        epic: { color: '#b57bff', scale: 1.09, ring: '#b57bff' },
        legendary: { color: '#ffd24d', scale: 1.15, ring: '#ffd24d' },
      }[rarity] || { color: '#ff4f7a', scale: 1, ring: null };
      ctx.scale(pulse * style.scale, pulse * style.scale);
      ctx.font = `${cell}px sans-serif`;
      ctx.shadowBlur = rarity === 'normal' ? 9 : rarity === 'rare' ? 13 : rarity === 'epic' ? 17 : 22;
      ctx.shadowColor = f.kind === 'drop' ? (state.colors[f.owner] || style.color) : style.color;
      ctx.fillText(theme.food, 0, 0);
      if (style.ring) {
        ctx.globalAlpha = 0.46 + Math.sin(Date.now() / 180) * 0.16;
        ctx.strokeStyle = style.ring;
        ctx.lineWidth = Math.max(1, cell * 0.045);
        ctx.beginPath(); ctx.arc(0, 0, cell * 0.57, 0, Math.PI * 2); ctx.stroke();
      }
      if (rarity === 'epic' || rarity === 'legendary') {
        ctx.globalAlpha = rarity === 'legendary' ? 0.92 : 0.66;
        ctx.fillStyle = style.color;
        ctx.font = `${cell * 0.27}px sans-serif`;
        ctx.fillText(rarity === 'legendary' ? '✦' : '◆', cell * 0.56, -cell * 0.48);
      }
    }
    ctx.restore();
    drawFoodGraphicAccent(f);
  }
  drawFiftyFoodEnemies();

    for (let i = 0; i < state.count; i++) if (state.alive[i]) {
    const s = state.snakes[i];
    if (!s || !s.length) continue; // proteção: marcada como viva mas sem dados ainda (ex: acabou de entrar) — não trava o resto do desenho
    const boosting = state.boosting[i];

    if (typeof drawEnergyTrail === 'function') drawEnergyTrail(s, i, boosting);
    drawTurboCinematic(s, i, boosting);

    ctx.save();
    // Rastro neon: um brilho na cor da minhoca, mais forte pertinho da cabeça e
    // desaparecendo em direção à cauda — dá aquele efeito de "luz deixada no ar"
    const trailReach = Math.min(s.length, 12);
    for (let k = s.length - 1; k >= 0; k--) {
      const p = s[k];
      const fade = Math.max(0, 1 - k / trailReach);
      ctx.shadowBlur = boosting ? cell * 0.8 : cell * (0.15 + 0.35 * fade);
      ctx.shadowColor = (state.trailColors[i] && state.trailColors[i] !== 'auto') ? state.trailColors[i] : state.colors[i];
      ctx.globalAlpha = k === 0 ? 1 : (boosting ? 0.92 : 0.82);
      if (k === 0) {
        // Efeito "squash": achata rapidinho a cabeça bem no instante que vira uma curva,
        // dá uma sensação de movimento mais viva (efeito clássico de animação)
        // Squash na curva + respiração contínua, sem alterar colisões.
        const nowVisual = Date.now();
        const sinceTurn = nowVisual - (state.lastTurnAt[i] || 0);
        const turnSquash = sinceTurn < 140 ? 1 - (1 - sinceTurn / 140) * 0.22 : 1;
        const breathe = 1 + Math.sin(nowVisual / 150 + i * 1.7) * 0.025;
        const hx = sx(p.x) + cell / 2, hy = sy(p.y) + cell / 2;
        ctx.save();
        ctx.translate(hx, hy);
        ctx.scale((1 / turnSquash) * breathe, turnSquash * (1 - (breathe - 1) * 0.45));
        ctx.translate(-hx, -hy);
        drawHead(p.x, p.y, state.heads[i] || 'round', state.colors[i]);
        ctx.restore();
        // Destaque na SUA própria minhoca — um aneizinho branco pulsante ao redor da
        // cabeça, fácil de achar você mesmo no meio de várias minhocas na tela
        if (i === mySlot) {
          const pulse = 0.5 + Math.sin(Date.now() / 260) * 0.5;          // Aviso piscando enquanto o turbo está disponível e não está sendo usado.
          const turboReady = !boosting &&
            (state.foodsEaten[i] || 0) >= 1 &&
            Date.now() >= (state.boostReadyAt[i] || 0);
          if (turboReady && Math.floor(Date.now() / 260) % 2 === 0) {
            const tx = sx(p.x) + cell / 2;
            const ty = sy(p.y) - cell * 0.86;
            ctx.save();
            ctx.globalAlpha = 0.95;
            ctx.strokeStyle = '#ffd24d';
            ctx.fillStyle = '#ffd24d';
            ctx.shadowColor = '#ffd24d';
            ctx.shadowBlur = cell * 0.55;
            ctx.lineWidth = Math.max(1.5, cell * 0.065);
            ctx.beginPath();
            ctx.arc(sx(p.x) + cell / 2, sy(p.y) + cell / 2, cell * (0.80 + pulse * 0.07), 0, Math.PI * 2);
            ctx.stroke();
            ctx.font = `900 ${Math.max(11, cell * 0.47)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡ TURBO', tx, ty);
            ctx.restore();
          }


          ctx.save();
          ctx.globalAlpha = 0.35 + pulse * 0.35;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1.5, cell * 0.06);
          ctx.beginPath();
          ctx.arc(sx(p.x) + cell / 2, sy(p.y) + cell / 2, cell * (0.62 + pulse * 0.08), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      } else {
        drawBodySegment(p.x, p.y, state.colors[i], state.patterns[i] || 'solid', k, state.palettes[i]);
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

    if (state.teamMode && state.count > 1) desenharMarcadorDeTime(state.teams[i] === 1 ? 1 : 0, sx(h.x) + cell * 0.92, sy(h.y) + cell * 0.1);

    if (state.show[i] && (i === 0 || state.showOthers)) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${cell * 0.6}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${label(i)} • 🍎 ${state.foodsEaten[i] || 0}`, sx(h.x) + cell / 2, sy(h.y) - 4);
    }
  }

  if (typeof drawDeathEffects === 'function') drawDeathEffects();
  if (typeof drawLeaderCrown === 'function') drawLeaderCrown();
  drawHunter();
  drawHunterTargetLock();

  if (typeof drawEnhancedParticles === 'function') drawEnhancedParticles();

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

  drawHunterPointer(); // setinha na borda quando a caçadora está fora da tela
  drawHunterVignette(); // melhoria #3 — borda vermelha quando a caçadora tá perto de você
  tocarBatimentoSePerto(); // melhoria #6 — batimento acelerando conforme ela se aproxima
  drawMinimap();
  checkMissionConfetti();
  updateAndDrawConfetti();

  // Números de pontos flutuando ("+1", "+5"...) — sobem devagar e desaparecem
  const FLOAT_DURATION = 700;
  state.floatingScores = state.floatingScores.filter((fs) => Date.now() - fs.bornAt < FLOAT_DURATION);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `900 ${Math.round(cell * 0.5)}px system-ui, sans-serif`;
  for (const fs of state.floatingScores) {
    const age = Date.now() - fs.bornAt;
    const progress = age / FLOAT_DURATION;
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.fillStyle = fs.color;
    ctx.fillText(fs.text, sx(fs.x) + cell / 2, sy(fs.y) - progress * cell * 1.4);
  }
  ctx.restore();

  // Reação rápida (emoji) recebida de outro jogador — aparece grande no centro por um instante
  if (state.reactionToast && Date.now() < state.reactionToast.until) {
    const left = state.reactionToast.until - Date.now();
    ctx.save();
    ctx.globalAlpha = Math.min(1, left / 250);
    ctx.font = `${Math.round(cell * 3.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#000';
    ctx.fillText(state.reactionToast.emoji, canvas.width / 2, canvas.height * 0.32);
    ctx.restore();
  }

  // Aviso grande e legível de "Você morreu" — bem no centro, letra grande, com contorno
  if (state.deathMessage && Date.now() < state.deathMessage.until) {
    const left = state.deathMessage.until - Date.now();
    ctx.save();
    ctx.globalAlpha = Math.min(1, left / 300);
    ctx.font = `900 ${Math.round(Math.min(canvas.width, canvas.height) * 0.09)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.fillStyle = '#ff5577';
    ctx.strokeText(state.deathMessage.text, canvas.width / 2, canvas.height * 0.42);
    ctx.fillText(state.deathMessage.text, canvas.width / 2, canvas.height * 0.42);
    ctx.restore();
  }

  // Clarão vermelho rápido quando alguém morre
  if (state.flash > 0) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255,60,80,${(state.flash / 6) * 0.35})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.restore();
}

let renderErrorShown = false;
let renderCallCount = 0;
export function render() {
  const diag = document.getElementById('diagPanel');
  if (diag && !diag.classList.contains('hidden')) {
    try {
      diag.textContent = [
        `>>> render() chamado ${++renderCallCount}x até agora`,
        `pacotes de estado recebidos do anfitrião: ${state.debugStatesReceived || 0}`,
        `último pacote recebido há: ${state.debugLastStateAt ? ((Date.now() - state.debugLastStateAt) / 1000).toFixed(1) + 's atrás' : 'NUNCA recebeu nenhum'}`,
        `receivedFirstState=${state.receivedFirstState}`,
        `role=${isOnline() ? (mySlot === 0 ? 'ANFITRIÃO' : 'CLIENTE') : 'local'}`,
        `canvas: ${canvas.width}x${canvas.height} (estilo: ${canvas.style.width} x ${canvas.style.height})`,
        `arena pai: ${canvas.parentElement.clientWidth}x${canvas.parentElement.clientHeight}`,
        `cell=${cell} viewW=${viewW} viewH=${viewH} offX=${offX} offY=${offY}`,
        `mySlot=${mySlot} state.count=${state.count} isOnline=${isOnline()}`,
        `câmera: camX=${camX.toFixed(1)} camY=${camY.toFixed(1)} (mapa: ${state.mapW}x${state.mapH})`,
        `posição de cada minhoca: ${state.snakes.map((s, i) => s?.[0] ? `[${i}]:(${s[0].x},${s[0].y})` : `[${i}]:vazia`).join(' ')}`,
        `state.snakes.length=${state.snakes.length} snake[mySlot] existe? ${!!state.snakes[mySlot]?.length}`,
        `state.alive=${JSON.stringify(state.alive)}`,
        `hasRoundRect nativo=${typeof canvas.getContext('2d').roundRect === 'function'}`,
        `game.compact=${document.getElementById('game')?.classList.contains('compact')}`,
        ...(isHost() ? [
          `--- DIAGNÓSTICO DE ENVIO (você é o anfitrião) ---`,
          `tentativas de enviar: ${sendDiag.tentativas} | sucessos: ${sendDiag.sucessos} | falhas: ${sendDiag.falhas}`,
          `conexões ativas na última tentativa de envio: ${sendDiag.ultimaContagemConns}`,
          `último erro de envio: ${sendDiag.ultimoErro || '(nenhum)'}`,
        ] : []),
      ].join('\n');
    } catch (diagErr) {
      diag.textContent = 'Erro ao gerar diagnóstico: ' + diagErr.message;
    }
  }
  try {
    renderScores();
    draw();
  } catch (err) {
    // Se o desenho travar por qualquer motivo (navegador antigo, etc.), mostra um aviso
    // visível na tela em vez de deixar tudo preto sem nenhuma pista do que aconteceu —
    // só uma vez, pra não spammar a tela a cada quadro
    if (!renderErrorShown) {
      renderErrorShown = true;
      const box = document.getElementById('renderErrorBanner');
      if (box) {
        box.textContent = `⚠️ Erro ao desenhar: ${err.message}. Tenta atualizar o navegador ou usar outro (Chrome/Safari mais recentes).`;
        box.classList.remove('hidden');
        box.classList.add('show');
      }
      if (diag) diag.textContent += `\n\n*** ERRO CAPTURADO: ${err.message}\n${err.stack || ''}`;
    }
  }
}

// Exposto só pra fins de teste/depuração — mostra onde a câmera está agora
export function getCameraDebug() {
  return { cell, offX, offY, viewW, viewH, camX, camY };
}
