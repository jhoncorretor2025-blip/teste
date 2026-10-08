// Mapa online: ALEATÓRIO (sorteia tamanho e tema a cada partida, nunca o menor) e ESCOLHIDO (o
// anfitrião decide no menu e o jogo respeita).
import { RAIZ, novoRelatorio, criarJanela, ativar, importarDe, esperar, criarRedeFalsa } from './_ambiente.mjs';
const { FakePeer } = criarRedeFalsa();
const $ = (w, id) => w.document.getElementById(id);
const r = novoRelatorio();
const w = criarJanela({ Peer: FakePeer }); w.HTMLElement.prototype.scrollIntoView = () => {}; ativar(w);
await importarDe(RAIZ)('js/main_stable_342.js');
const { state } = await importarDe(RAIZ)('js/state.js');
const loop = await importarDe(RAIZ)('js/loop_stable_336.js');
const cfg = await importarDe(RAIZ)('js/config.js');
$(w, 'onlineSimpleCreateBtn').click(); await esperar(200); // vira anfitrião online

r.secao('Mapa ALEATÓRIO');
state.onlineMapMode = 'random';
const tamanhos = new Set(), temas = new Set(); let usouPequeno = false;
for (let i = 0; i < 60; i++) {
  loop.startOnlineHostGame();
  tamanhos.add(`${state.mapW}x${state.mapH}`); temas.add(state.theme);
  if (state.mapW <= 28) usouPequeno = true;
  clearInterval(state.timer); state.running = false;
}
r.check('o tamanho muda de uma partida pra outra (sorteio de verdade)', tamanhos.size >= 2, [...tamanhos].join(', '));
r.check('o tema também é sorteado', temas.size >= 3, [...temas].join(', '));
r.check('nunca sorteia o mapa pequeno no online', !usouPequeno);
const gratis = cfg.BOARD_THEMES.filter((t) => !['cyber', 'aurora', 'volcano', 'candy'].includes(t.value)).map((t) => t.value);
r.check('só sorteia temas liberados (não os da Loja)', [...temas].every((t) => gratis.includes(t)), [...temas].filter((t) => !gratis.includes(t)).join(','));

r.secao('Mapa ESCOLHIDO pelo anfitrião');
for (const m of cfg.MAP_SIZES) {
  state.onlineMapMode = 'manual';
  $(w, 'mapSize').value = m.value; $(w, 'mapSize').dispatchEvent(new w.Event('change', { bubbles: true }));
  loop.startOnlineHostGame();
  r.check(`escolhendo "${m.value}" o jogo usa ${m.w}x${m.h}`, state.mapW === m.w && state.mapH === m.h, `${state.mapW}x${state.mapH}`);
  clearInterval(state.timer); state.running = false;
}
r.fim(w.__erros);
