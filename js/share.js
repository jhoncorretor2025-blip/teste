// Gera um "cartão" de pontuação em imagem e compartilha (ou baixa) — melhoria #11.
// Não depende de nenhum servidor: desenha tudo num canvas escondido, na hora.

import { state } from './state.js';

export async function shareScoreCard() {
  const W = 900, H = 900;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0d1b33');
  grad.addColorStop(1, '#050911');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * W, y = Math.random() * H * 0.45, r = Math.random() * 1.6 + 0.4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 60px system-ui, sans-serif';
  ctx.fillText('🐍 Snake Arena', W / 2, 130);

  const color = state.colors[0] || '#67ef8a';
  ctx.fillStyle = color;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.roundRect(W / 2 - 160 + i * 36, 190, 30, 30, 8);
    ctx.fill();
  }

  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(state.names[0] || 'Jogador', W / 2, 300);

  ctx.font = 'bold 128px system-ui, sans-serif';
  ctx.fillStyle = '#ffd24d';
  ctx.fillText(String(state.scores[0] || 0), W / 2, 460);
  ctx.font = '34px system-ui, sans-serif';
  ctx.fillStyle = '#a6b3c9';
  ctx.fillText('pontos nessa partida', W / 2, 500);

  const stats = [
    ['🍎 Comidas', state.foodsEaten[0] || 0],
    ['🎯 Eliminações', state.eliminations[0] || 0],
    ['🏅 Recorde', state.best || 0],
  ];
  ctx.font = 'bold 32px system-ui, sans-serif';
  stats.forEach(([lbl, val], i) => {
    const y = 600 + i * 68;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c5cee0';
    ctx.fillText(lbl, W / 2 - 220, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(val), W / 2 + 220, y);
  });

  ctx.textAlign = 'center';
  ctx.font = '26px system-ui, sans-serif';
  ctx.fillStyle = '#7d8bab';
  ctx.fillText('Jogue também: ' + location.origin + location.pathname, W / 2, H - 50);

  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'snake-arena-pontuacao.png', { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Minha pontuação no Snake Arena',
        text: `Fiz ${state.scores[0] || 0} pontos no Snake Arena! 🐍`,
      });
      return;
    } catch {
      // pessoa cancelou o compartilhamento — sem problema, não faz nada
      return;
    }
  }

  // Sem suporte a compartilhar arquivo (ex: navegador de PC) — baixa a imagem direto
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'snake-arena-pontuacao.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
