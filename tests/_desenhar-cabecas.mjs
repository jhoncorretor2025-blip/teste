// Ferramenta (não é teste): roda o render() REAL do jogo num canvas de verdade (@napi-rs/canvas)
// e salva uma imagem PNG da cabeça de cada formato — pra CONFERIR o visual com os olhos, em vez
// de adivinhar pelas coordenadas. Uso: node tests/_desenhar-cabecas.mjs <saida.png> <forma1,forma2,...> [cor]
import fs from 'fs';
import { createRequire } from 'module';
import { RAIZ, criarJanela, ativar, importarDe, criarRedeFalsa } from './_ambiente.mjs';
// @napi-rs/canvas é opcional (só pra conferir o visual): instale com `npm i @napi-rs/canvas`
let createCanvas;
for (const base of [import.meta.url, 'file:///home/claude/']) { try { ({ createCanvas } = createRequire(base)('@napi-rs/canvas')); break; } catch {} }
if (!createCanvas) { console.log('Falta o pacote opcional: rode  npm i @napi-rs/canvas  e tente de novo.'); process.exit(0); }
const [saida, formas = 'cat', cor = '#ff9f4d'] = process.argv.slice(2);
const LISTA = formas.split(',');
const L = 1500, A = 1100; // canvas grande: a célula fica ~50px, a cabeça bem visível

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

const ZOOM = Number(process.env.ZOOM || 4), LADO = 90; // recorta 90x90 em volta da cabeça e amplia 4x
const out = createCanvas(LISTA.length * LADO * ZOOM, LADO * ZOOM); const octx = out.getContext('2d');
octx.fillStyle = '#0b1424'; octx.fillRect(0, 0, out.width, out.height);
for (let k = 0; k < LISTA.length; k++) {
  state.running = false; mudar('mapSize', 'small'); mudar('count', '1'); mudar('boardTheme', 'void');
  loop.startGame(); clearInterval(state.timer); state.paused = true;
  state.heads[0] = LISTA[k]; state.colors[0] = cor;
  // uma cobrinha parada, deitada, de 3 partes, no meio do mapa
  const cx = 14, cy = 11; state.snakes[0] = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
  state.dirs[0] = { x: 1, y: 0 }; state.foods = []; state.deathMessage = null; state.toast = null;
  for (let i = 0; i < 12; i++) rend.render(); // deixa a câmera assentar
  // acha a cabeça: a célula do meio do mapa fica no centro do canvas
  const cell = Math.min(L / 28, A / 22);
  octx.imageSmoothingEnabled = true;
  const hx = L / 2 + cell * 0.5, hy = A / 2 + cell * 0.3 + 5; // centro aproximado da cabeça
  octx.drawImage(real, hx - LADO / 2, hy - LADO / 2, LADO, LADO, k * LADO * ZOOM, 0, LADO * ZOOM, LADO * ZOOM);
}
fs.writeFileSync(saida, out.toBuffer('image/png'));
console.log('salvo:', saida, `(${LISTA.join(', ')})`);
process.exit(0);
