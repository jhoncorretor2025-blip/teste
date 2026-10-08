// Bichinhos (gato, dragão, coruja...) têm rosto PRÓPRIO. Bug que isso evita: o render() desenhava,
// por cima de TODA cabeça, dois "olhos de direção" pretos e grandes (cor #07110b) — no dragão eles
// tapavam o rosto detalhado, no gatinho viravam olhos a mais. Conferido também VENDO a imagem
// renderizada de verdade (tests/_desenhar-cabecas.mjs gera um PNG de cada cabeça).
import { RAIZ, novoRelatorio, criarGravador, criarJanela, ativar, importarDe } from './_ambiente.mjs';
const g = criarGravador();
const w = criarJanela({ gravador: g }); ativar(w);
await importarDe(RAIZ)('js/main_stable_342.js');
const { state } = await importarDe(RAIZ)('js/state.js');
const loop = await importarDe(RAIZ)('js/loop_stable_336.js');
const rend = await importarDe(RAIZ)('js/render_stable_341.js');
const { HEAD_SHAPES } = await importarDe(RAIZ)('js/config.js');
const r = novoRelatorio();
const mudar = (id, v) => { const el = w.document.getElementById(id); el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); };
const COR_OLHO_DE_DIRECAO = '#07110b';
const COM_ROSTO = ['owl', 'cat', 'bunny', 'dragon', 'bear', 'fox', 'shark', 'bee', 'unicorn', 'monkey', 'lion'];

function olhosDeDirecao(forma) {
  state.running = false; mudar('mapSize', 'small'); mudar('count', '1'); mudar('boardTheme', 'void');
  loop.startGame(); clearInterval(state.timer); state.paused = true;
  state.heads[0] = forma;
  state.snakes[0] = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]; state.dirs[0] = { x: 1, y: 0 }; state.foods = [];
  for (let i = 0; i < 6; i++) rend.render();
  g.zerar(); rend.render();
  return g.preenchimentosCom(COR_OLHO_DE_DIRECAO);
}

r.secao('Cabeças básicas CONTINUAM com os olhos de direção (é o único olho delas)');
for (const forma of ['round', 'square', 'diamond']) {
  r.check(`"${forma}" desenha os olhos de direção`, olhosDeDirecao(forma) >= 1, String(olhosDeDirecao(forma)));
}
r.secao('Bichinhos com rosto próprio NÃO recebem os olhos de direção por cima');
for (const forma of COM_ROSTO) {
  r.check(`"${forma}" não tem olhos de direção por cima do rosto`, olhosDeDirecao(forma) === 0, String(olhosDeDirecao(forma)));
}
r.secao('Todas as cabeças da lista continuam desenhando sem erro');
for (const h of HEAD_SHAPES) {
  let erro = null; try { olhosDeDirecao(h.value); } catch (e) { erro = e; }
  r.check(`"${h.value}" desenha`, erro === null, erro?.message);
}
r.fim(w.__erros);
