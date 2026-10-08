// Ferramenta (não é teste): desenha a arena inteira num canvas de CELULAR (390x600) com 3 jogadores
// e salva um PNG — pra ver o radar com a legenda de nome + pontuação.
import fs from 'fs';
import { createRequire } from 'module';
import { RAIZ, criarJanela, ativar, importarDe, criarRedeFalsa } from './_ambiente.mjs';
let createCanvas;
for (const base of [import.meta.url, 'file:///home/claude/']) { try { ({ createCanvas } = createRequire(base)('@napi-rs/canvas')); break; } catch {} }
if (!createCanvas) { console.log('Falta o pacote opcional: rode  npm i @napi-rs/canvas  e tente de novo.'); process.exit(0); }
const L = 390, A = 600;
const w = criarJanela({ Peer: criarRedeFalsa().FakePeer }); w.HTMLElement.prototype.scrollIntoView = () => {};
Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return this.className === 'arena' ? L : 0; } });
Object.defineProperty(w.HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return this.className === 'arena' ? A : 0; } });
ativar(w);
const real = createCanvas(L, A); const ctx = real.getContext('2d');
w.HTMLCanvasElement.prototype.getContext = () => ctx;
await importarDe(RAIZ)('js/main_stable_342.js');
const { state } = await importarDe(RAIZ)('js/state.js');
const loop = await importarDe(RAIZ)('js/loop_stable_336.js');
const rend = await importarDe(RAIZ)('js/render_stable_341.js');
const $ = (id) => w.document.getElementById(id);
const mudar = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('change', { bubbles: true })); };
mudar('mapSize', 'large'); mudar('count', '3'); mudar('boardTheme', 'void');
loop.startGame(); clearInterval(state.timer); state.paused = true;
state.names = ['Jhonatan', 'Alessandra', 'Maria Eduarda Silva', 'x', 'y', 'z'];
state.scores = [120, 85, 340, 0, 0, 0]; state.alive = [true, true, false, false, false, false];
const mk = (x, y) => [0, 1, 2, 3].map((k) => ({ x: x - k, y }));
state.snakes[0] = mk(20, 14); state.snakes[1] = mk(35, 25); state.snakes[2] = []; state.dirs[0] = { x: 1, y: 0 };
state.foods = [];
for (let i = 0; i < 15; i++) rend.render();
fs.writeFileSync(process.argv[2], real.toBuffer('image/png')); console.log('salvo');
process.exit(0);
