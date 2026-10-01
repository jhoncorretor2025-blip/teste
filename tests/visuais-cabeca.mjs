// Fumaça: todo formato de cabeça (incluindo os bichinhos melhorados: coruja com bico,
// urso com focinho, dragão com chifres+focinho) desenha sem lançar erro, pra qualquer
// combinação de tamanho de célula. Não confere a aparência em si (isso foi conferido
// visualmente antes de publicar) — só que o código não quebra.
import { RAIZ, novoRelatorio, criarGravador, criarJanela, ativar, importarDe } from './_ambiente.mjs';
const g = criarGravador();
const w = criarJanela({ gravador: g }); ativar(w);
const { HEAD_SHAPES } = await importarDe(RAIZ)('js/config.js');
const { state } = await importarDe(RAIZ)('js/state.js');
const loop = await importarDe(RAIZ)('js/loop.js');
const renderMod = await importarDe(RAIZ)('js/render.js');
const r = novoRelatorio();

function mudar(id, v) { const el = w.document.getElementById(id); el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); }
for (const h of HEAD_SHAPES) {
  state.running = false;
  mudar('mapSize', 'medium'); mudar('count', '1'); mudar('boardTheme', 'void');
  loop.startGame();
  state.heads[0] = h.value;
  g.zerar();
  let erro = null;
  try { renderMod.render(); } catch (e) { erro = e; }
  r.check(`cabeça "${h.name}" (${h.value}) desenha sem erro`, erro === null, erro?.message);
  clearInterval(state.timer);
}
r.fim(w.__erros);
