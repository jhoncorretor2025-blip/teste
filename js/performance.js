// Histórico de desempenho da Mioquinha: guarda as últimas partidas e desenha gráficos simples no próprio navegador.
// Não depende de biblioteca externa, então continua funcionando offline e no celular.

const HISTORY_KEY = 'snakeArenaPerformanceHistoryV1';
const LAST_KEY = 'snakeArenaLastPerformanceV1';
const CURRENT_KEY = 'snakeArenaCurrentPerformanceV1';
const MAX_HISTORY = 30;
const SAMPLE_MS = 5000;

function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

let lastSampleAt = 0;

export function startPerformanceRun(meta = {}) {
  const run = {
    startedAt: Date.now(),
    mode: meta.mode || 'classic',
    mapSize: meta.mapSize || 'medium',
    samples: [],
  };
  write(CURRENT_KEY, run);
  lastSampleAt = 0;
  samplePerformanceRun({ score: 0, length: 3, food: 0, force: true });
}

export function samplePerformanceRun({ score = 0, length = 0, food = 0, force = false } = {}) {
  const run = read(CURRENT_KEY, null);
  if (!run) return;
  const now = Date.now();
  if (!force && now - lastSampleAt < SAMPLE_MS) return;
  lastSampleAt = now;
  run.samples = Array.isArray(run.samples) ? run.samples : [];
  run.samples.push({
    t: Math.max(0, Math.round((now - run.startedAt) / 1000)),
    score: Math.max(0, Number(score) || 0),
    length: Math.max(0, Number(length) || 0),
    food: Math.max(0, Number(food) || 0),
  });
  if (run.samples.length > 180) run.samples.shift();
  write(CURRENT_KEY, run);
}

export function finishPerformanceRun({ score = 0, length = 0, food = 0, survivedSec = 0, reason = 'derrota' } = {}) {
  const run = read(CURRENT_KEY, null);
  if (!run) return null;
  samplePerformanceRun({ score, length, food, force: true });
  const finishedAt = Date.now();
  const samples = Array.isArray(run.samples) ? run.samples : [];
  const result = {
    id: finishedAt,
    date: finishedAt,
    mode: run.mode,
    mapSize: run.mapSize,
    score: Math.max(0, Number(score) || 0),
    length: Math.max(0, Number(length) || 0),
    food: Math.max(0, Number(food) || 0),
    survivedSec: Math.max(0, Number(survivedSec) || 0),
    reason,
    samples: samples.slice(-180),
  };
  const history = read(HISTORY_KEY, []);
  history.push(result);
  write(HISTORY_KEY, history.slice(-MAX_HISTORY));
  write(LAST_KEY, result);
  try { localStorage.removeItem(CURRENT_KEY); } catch {}
  document.dispatchEvent(new CustomEvent('performanceUpdated', { detail: result }));
  return result;
}

export function loadPerformanceHistory(limit = MAX_HISTORY) {
  return read(HISTORY_KEY, []).slice(-Math.max(1, Number(limit) || 10)).reverse();
}

export function loadLastPerformance() {
  return read(LAST_KEY, null);
}

export function performanceSummary(history = loadPerformanceHistory(30)) {
  if (!history.length) return { average: 0, best: 0, games: 0, bestLength: 0, averageSurvival: 0 };
  return {
    average: Math.round(history.reduce((n, r) => n + (r.score || 0), 0) / history.length),
    best: Math.max(...history.map(r => r.score || 0)),
    games: history.length,
    bestLength: Math.max(...history.map(r => r.length || 0)),
    averageSurvival: Math.round(history.reduce((n, r) => n + (r.survivedSec || 0), 0) / history.length),
  };
}

function prepareCanvas(canvas, height = 180) {
  if (!canvas) return null;
  const width = Math.max(280, Math.floor(canvas.clientWidth || canvas.parentElement?.clientWidth || 600));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
}

function chartFrame(ctx, width, height, title, empty) {
  ctx.font = '700 13px system-ui';
  ctx.fillStyle = '#dbe5f5';
  ctx.fillText(title, 14, 20);
  if (empty) {
    ctx.font = '12px system-ui';
    ctx.fillStyle = '#7f8da6';
    ctx.fillText(empty, 14, 48);
    return null;
  }
  return { left: 38, right: width - 14, top: 32, bottom: height - 28 };
}

export function drawPerformanceCharts(scoreCanvas, historyCanvas, last = loadLastPerformance(), history = loadPerformanceHistory(10)) {
  const scoreChart = prepareCanvas(scoreCanvas, 190);
  if (scoreChart) {
    const { ctx, width, height } = scoreChart;
    const frame = chartFrame(ctx, width, height, 'Evolução da pontuação na última partida', last?.samples?.length ? null : 'Jogue uma partida para gerar o primeiro gráfico.');
    if (frame) {
      const samples = last.samples.length ? last.samples : [{ t: 0, score: last.score || 0 }];
      const maxScore = Math.max(1, ...samples.map(s => s.score || 0));
      const maxT = Math.max(1, ...samples.map(s => s.t || 0));
      ctx.strokeStyle = 'rgba(130,150,180,.22)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = frame.bottom - (frame.bottom - frame.top) * i / 4;
        ctx.beginPath(); ctx.moveTo(frame.left, y); ctx.lineTo(frame.right, y); ctx.stroke();
      }
      ctx.beginPath();
      samples.forEach((s, i) => {
        const x = frame.left + (frame.right - frame.left) * ((s.t || 0) / maxT);
        const y = frame.bottom - (frame.bottom - frame.top) * ((s.score || 0) / maxScore);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.strokeStyle = '#67ef8a';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#67ef8a';
      const end = samples[samples.length - 1];
      const ex = frame.left + (frame.right - frame.left) * ((end.t || 0) / maxT);
      const ey = frame.bottom - (frame.bottom - frame.top) * ((end.score || 0) / maxScore);
      ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7f8da6';
      ctx.font = '11px system-ui';
      ctx.fillText('0s', frame.left, height - 8);
      ctx.fillText(Math.round(maxT) + 's', frame.right - 24, height - 8);
      ctx.fillText(String(maxScore), 5, frame.top + 4);
    }
  }

  const barChart = prepareCanvas(historyCanvas, 180);
  if (barChart) {
    const { ctx, width, height } = barChart;
    const frame = chartFrame(ctx, width, height, 'Últimas partidas', history.length ? null : 'O histórico aparecerá depois das primeiras partidas.');
    if (frame) {
      const rows = history.slice().reverse();
      const max = Math.max(1, ...rows.map(r => r.score || 0));
      const gap = 6;
      const barWidth = Math.max(12, (frame.right - frame.left - gap * (rows.length - 1)) / rows.length);
      rows.forEach((r, i) => {
        const h = (frame.bottom - frame.top) * ((r.score || 0) / max);
        const x = frame.left + i * (barWidth + gap);
        const y = frame.bottom - h;
        ctx.fillStyle = i === rows.length - 1 ? '#ffd24d' : '#5b7aa8';
        ctx.fillRect(x, y, barWidth, h);
        ctx.fillStyle = '#9fb0c9';
        ctx.font = '10px system-ui';
        ctx.fillText(String(r.score || 0), x, Math.max(frame.top + 10, y - 3));
      });
    }
  }
}

export function renderPerformanceDashboard() {
  const last = loadLastPerformance();
  const history = loadPerformanceHistory(10);
  const summary = performanceSummary(loadPerformanceHistory(30));
  const summaryEl = document.getElementById('performanceSummary');
  if (summaryEl) {
    summaryEl.innerHTML = [
      ['🎮 Partidas', summary.games],
      ['📊 Média', summary.average],
      ['🏆 Melhor', summary.best],
      ['📏 Maior', summary.bestLength],
      ['⏱️ Sobrevivência média', summary.averageSurvival + 's'],
    ].map(([label, value]) => '<div><span>' + label + '</span><b>' + value + '</b></div>').join('');
  }
  const lastEl = document.getElementById('lastPerformanceSummary');
  if (lastEl) {
    if (!last) {
      lastEl.textContent = 'Ainda não há uma partida registrada.';
    } else {
      lastEl.innerHTML = '🏁 Última partida: <b>' + last.score + ' pontos</b> • 📏 ' + last.length + ' partes • 🍎 ' + last.food + ' comidas • ⏱️ ' + last.survivedSec + 's';
    }
  }
  drawPerformanceCharts(
    document.getElementById('performanceScoreChart'),
    document.getElementById('performanceHistoryChart'),
    last,
    history
  );
}
