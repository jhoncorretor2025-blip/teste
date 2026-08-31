// Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial.
// Este é o único arquivo carregado pelo index.html — ele importa todo o resto.

import { $, safe } from './utils.js';
import { VERSION } from './config.js';
import { state } from './state.js';
import { makePlayers } from './players.js';
import { startGame } from './loop.js';
import { render } from './render.js';
import { setupInput } from './input.js';
import { unlockAudio } from './sound.js';
import { loadBest } from './storage.js';

$('start').addEventListener('click', () => {
  unlockAudio(); // libera o som — precisa de um clique do jogador antes (regra do navegador)
  startGame();
});
$('restart').addEventListener('click', startGame);
$('pause').addEventListener('click', () => state.paused = !state.paused);

$('back').addEventListener('click', () => {
  state.running = false;
  clearInterval(state.timer);
  $('game').classList.add('hidden');
  $('menu').classList.remove('hidden');
  render();
});

$('share').addEventListener('click', async () => {
  const url = location.href.split('?')[0];
  try {
    if (navigator.share) await navigator.share({ title: 'Snake Arena', text: 'Vem jogar Snake Arena comigo!', url });
    else { await navigator.clipboard.writeText(url); alert('Link copiado!'); }
  } catch {}
});

$('refresh').addEventListener('click', () => {
  location.href = location.pathname + '?v=' + VERSION + '&t=' + Date.now();
});

$('mode').addEventListener('change', e => state.mode = e.target.value);

$('count').addEventListener('change', e => {
  state.count = +e.target.value;
  state.types = state.count === 3 ? ['human', 'human', 'human'] : ['human', 'cpu', 'cpu'];
  makePlayers();
});

$('players').addEventListener('change', e => {
  const i = +e.target.dataset.i;
  if (e.target.classList.contains('ptype')) state.types[i] = e.target.value;
  if (e.target.classList.contains('pcontrol')) state.controls[i] = e.target.value;
  if (e.target.classList.contains('pshow')) state.show[i] = e.target.checked;
});

$('players').addEventListener('input', e => {
  if (e.target.classList.contains('pname')) {
    const i = +e.target.dataset.i;
    state.names[i] = safe(e.target.value, `Jogador ${i + 1}`);
  }
});

$('myName').addEventListener('input', e => state.names[0] = safe(e.target.value, 'Jhon'));

state.best = loadBest(); // carrega o recorde salvo no navegador (melhoria #7)

setupInput();
makePlayers();
render();
