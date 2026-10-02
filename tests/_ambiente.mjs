// Ambiente compartilhado dos testes: cria "janelas" de navegador falsas (jsdom) com tudo que o
// jogo precisa (canvas, áudio, service worker...). Todo teste novo começa importando daqui.
//
// Regras que aprendemos na prática (veja docs/ARMADILHAS.md):
//  - Os módulos do jogo usam `document`/`window` GLOBAIS. Com 2 participantes no mesmo teste
//    (anfitrião + amigo), cada um precisa da SUA cópia dos arquivos (copiarProjeto) e das suas
//    globais na hora certa (ativar / criarRedeFalsa cuidam disso).
//  - `location.reload()` não dá pra simular no jsdom: teste o que vem antes dele.
import { JSDOM } from 'jsdom';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- relatório ----------
export function novoRelatorio() {
  let ok = 0, falhas = 0;
  return {
    secao(titulo) { console.log(`\n=== ${titulo} ===`); },
    check(nome, condicao, extra = '') {
      condicao ? ok++ : falhas++;
      console.log(`${condicao ? '✅' : '❌'} ${nome}${extra !== '' ? '  → ' + extra : ''}`);
    },
    // termina o processo: código 0 só se não teve falha NEM erro de JavaScript na página
    fim(...listasDeErros) {
      const erros = listasDeErros.flat();
      if (erros.length) console.log('Erros JS:', erros.slice(0, 2));
      console.log(`RESULTADO: ${ok} ok, ${falhas} falhas`);
      process.exit(falhas === 0 && erros.length === 0 ? 0 : 1);
    },
  };
}

// ---------- canvas de mentira que GRAVA o que foi desenhado ----------
export function criarGravador() {
  const g = { chamadas: {}, textos: [], eventos: [] };
  g.zerar = () => { g.chamadas = {}; g.textos = []; g.eventos = []; };
  g.n = (metodo) => g.chamadas[metodo] || 0; // quantas vezes o método foi chamado
  return g;
}
export function criarContexto(g) {
  const conta = (nome, extra) => (...a) => { g.chamadas[nome] = (g.chamadas[nome] || 0) + 1; extra?.(...a); };
  const ctx = {};
  for (const m of ['save', 'restore', 'clearRect', 'fillRect', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'stroke', 'fill', 'arc', 'ellipse',
    'roundRect', 'arcTo', 'strokeRect', 'strokeText', 'setLineDash', 'rect', 'scale', 'drawImage', 'quadraticCurveTo', 'bezierCurveTo', 'clip']) ctx[m] = conta(m);
  ctx.translate = conta('translate', (x, y) => g.eventos.push({ t: 'translate', x, y }));
  ctx.rotate = conta('rotate', (a) => g.eventos.push({ t: 'rotate', a }));
  ctx.fillText = conta('fillText', (t, x, y) => g.textos.push({ t: String(t), x, y }));
  ctx.measureText = () => ({ width: 10 });
  ctx.createRadialGradient = () => ({ addColorStop() {} });
  ctx.createLinearGradient = () => ({ addColorStop() {} });
  let fill = '', stroke = '';
  Object.defineProperty(ctx, 'fillStyle', { get: () => fill, set: (v) => { fill = v; } });
  Object.defineProperty(ctx, 'strokeStyle', { get: () => stroke, set: (v) => { stroke = v; } });
  for (const p of ['globalAlpha', 'shadowBlur', 'shadowColor', 'font', 'textAlign', 'textBaseline', 'lineWidth', 'lineCap', 'lineJoin', 'globalCompositeOperation']) {
    Object.defineProperty(ctx, p, { set() {}, get: () => undefined });
  }
  return ctx;
}

// ---------- janela de navegador falsa ----------
// pasta: de onde ler o jogo (a raiz do projeto, ou uma cópia isolada); url: com ?room=... pra simular link de convite;
// gravador: pra inspecionar o desenho; Peer: a rede falsa (criarRedeFalsa); semente: {chave: valor} já salvo no localStorage
export function criarJanela({ pasta = RAIZ, url = 'http://localhost/index.html', gravador = null, Peer = null, semente = {} } = {}) {
  const html = fs.readFileSync(path.join(pasta, 'index.html'), 'utf8').replace(/<script src="https:\/\/unpkg\.com[^"]*"><\/script>/, '');
  const dom = new JSDOM(html, { url, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true });
  const w = dom.window;
  Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return this.className === 'arena' ? 400 : 0; } });
  Object.defineProperty(w.HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return this.className === 'arena' ? 300 : 0; } });
  const ctx = criarContexto(gravador || criarGravador());
  w.HTMLCanvasElement.prototype.getContext = () => ctx;
  w.AudioContext = function () {
    return {
      currentTime: 0, destination: {}, resume() {},
      createOscillator: () => ({ type: '', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: () => ({ connect() {} }), start() {}, stop() {} }),
      createGain: () => ({ gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: () => ({}) }),
      createBiquadFilter: () => ({ type: '', frequency: { value: 0 }, connect() {} }),
    };
  };
  w.navigator.vibrate = () => true;
  // getRegistrations() foi adicionado aqui porque o main.js de verdade passou a chamá-lo
  // (parte de uma mudança feita por outra IA no projeto) — sem isso no mock, qualquer teste
  // que carregasse main.js até esse ponto quebrava com "getRegistrations is not a function"
  w.navigator.serviceWorker = { register: async () => ({ addEventListener() {}, update: async () => {} }), getRegistrations: async () => [] };
  w.fetch = async () => ({ ok: false });
  w.__copiado = [];
  w.navigator.clipboard = { writeText: async (t) => { w.__copiado.push(t); } }; // o que a pessoa "copiou" (ex: link da sala)
  if (Peer) w.Peer = Peer;
  for (const [k, v] of Object.entries(semente)) w.localStorage.setItem(k, v);
  w.__erros = [];
  w.addEventListener('error', (e) => w.__erros.push(e.error?.stack || e.message));
  return w;
}

let janelaAtual = null;
// Torna `w` a janela "global" (os módulos do jogo leem window/document/localStorage globais)
export function ativar(w) {
  janelaAtual = w;
  globalThis.window = w; globalThis.document = w.document; globalThis.localStorage = w.localStorage;
  Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
  Object.defineProperty(globalThis, 'location', { value: w.location, configurable: true });
  Object.defineProperty(globalThis, 'history', { value: w.history, configurable: true });
  globalThis.CustomEvent = w.CustomEvent; globalThis.fetch = w.fetch; globalThis.confirm = () => true;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
}

// Simula trocar de app e voltar (ex: sair pro WhatsApp mandar um link, depois voltar pro
// jogo) — muda document.visibilityState pra 'hidden' e de volta pra 'visible', disparando
// o evento 'visibilitychange' de verdade nas duas vezes (é assim que o navegador avisa o
// site dessas trocas; sem isso não dá pra testar nada que reaja a "a pessoa voltou pra aba").
export function simularTrocarDeAppEVoltar(w) {
  const definirEstado = (valor) => Object.defineProperty(w.document, 'visibilityState', { value: valor, configurable: true });
  definirEstado('hidden');
  w.document.dispatchEvent(new w.Event('visibilitychange'));
  definirEstado('visible');
  w.document.dispatchEvent(new w.Event('visibilitychange'));
}

// importarDe(pasta)('js/main.js') → módulo daquela pasta (cada pasta = uma cópia isolada do jogo).
// Aceita uma "?query" no final (ex: 'js/main.js?tentativa2') pra forçar reimportar o mesmo
// arquivo várias vezes sem cache do Node — mas a query precisa ser separada ANTES de virar
// URL de arquivo, senão o "?" é tratado como parte do nome (pathToFileURL escaparia
// virando "%3F", procurando um arquivo que não existe).
export const importarDe = (pasta) => (arquivo) => {
  const [caminho, query] = arquivo.split('?');
  const url = pathToFileURL(path.join(pasta, caminho)).href;
  return import(query ? `${url}?${query}` : url);
};

// Cópia isolada do projeto (pra um SEGUNDO participante: o amigo). Vai pra uma pasta temporária.
export function copiarProjeto() {
  const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'minhoca-copia-'));
  fs.cpSync(RAIZ, destino, {
    recursive: true,
    filter: (origem) => !/(^|[\\/])(node_modules|\.git|tests|tools|docs)([\\/]|$)/.test(path.relative(RAIZ, origem)),
  });
  return destino;
}

// ---------- rede falsa (no lugar do PeerJS) ----------
// Cada mensagem é entregue com as globais do DONO da conexão, então anfitrião e amigo mexem
// cada um na sua própria tela mesmo dentro do mesmo processo.
export function criarRedeFalsa() {
  const registry = new Map();
  const comDono = (dono, fn) => {
    if (!dono || dono === janelaAtual) return fn();
    const anterior = janelaAtual; ativar(dono);
    try { return fn(); } finally { if (anterior) ativar(anterior); }
  };
  class Conexao {
    constructor(local, remoto) { this.localId = local; this.remoteId = remoto; this.peer = remoto; this._h = {}; this.open = true; }
    on(ev, cb) { (this._h[ev] ||= []).push(cb); }
    _emit(ev, d) { comDono(registry.get(this.localId)?.owner, () => (this._h[ev] || []).forEach((cb) => cb(d))); }
    send(dados) { const rp = registry.get(this.remoteId); const rc = rp && rp._connsByRemote.get(this.localId); if (rc) setTimeout(() => rc._emit('data', dados), 0); }
    close() { this._emit('close'); const rp = registry.get(this.remoteId); const c = rp && rp._connsByRemote.get(this.localId); if (c && c !== this) c._emit('close'); }
  }
  class FakePeer {
    constructor(id) {
      this.id = id || ('p-' + Math.random().toString(36).slice(2, 8));
      this.owner = globalThis.window; // quem criou este Peer (a janela ativa agora)
      this._h = {}; this._connsByRemote = new Map(); registry.set(this.id, this);
      setTimeout(() => this._emit('open', this.id), 0);
    }
    on(ev, cb) { (this._h[ev] ||= []).push(cb); }
    _emit(ev, d) { comDono(this.owner, () => (this._h[ev] || []).forEach((cb) => cb(d))); }
    connect(remoteId) {
      const conn = new Conexao(this.id, remoteId); this._connsByRemote.set(remoteId, conn);
      const rp = registry.get(remoteId);
      if (!rp) { setTimeout(() => conn._emit('error', { type: 'peer-unavailable' }), 0); return conn; }
      setTimeout(() => { const rc = new Conexao(remoteId, this.id); rp._connsByRemote.set(this.id, rc); rp._emit('connection', rc); rc._emit('open'); conn._emit('open'); }, 0);
      return conn;
    }
    destroy() {}
  }
  return { FakePeer, registry };
}
