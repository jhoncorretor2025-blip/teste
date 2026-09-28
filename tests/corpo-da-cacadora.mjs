// Corpo inicial da Minhoca Caçadora (loop.js → montarCorpoDaCacadora), em TODAS as posições de nascimento.
// Bug real que este teste pegou: o corpo "dava a volta" pelo topo do mapa e a cauda reaparecia teletransportada.
import { RAIZ, novoRelatorio, criarJanela, ativar, importarDe } from './_ambiente.mjs';
const w = criarJanela(); ativar(w);
const { montarCorpoDaCacadora } = await importarDe(RAIZ)('js/loop.js');
const r = novoRelatorio();

// a versão ANTIGA (com o "dar a volta"), guardada aqui pra PROVAR que o teste pega o defeito
function corpoAntigo(p, mapW, mapH, tamanho = 50) {
  const corpo = [];
  for (let passo = 0; passo < Math.min(tamanho, mapW * mapH); passo++) {
    const rel = Math.floor((p.x + passo) / mapW), idx = (p.x + passo) % mapW;
    corpo.push({ x: rel % 2 === 0 ? idx : mapW - 1 - idx, y: (p.y + rel) % mapH });
  }
  return corpo;
}
const MAPAS = { pequeno: [28, 22], medio: [40, 31], grande: [56, 44] };
function varrer(fn) {
  const res = {};
  for (const [nome, [W, H]] of Object.entries(MAPAS)) {
    let casos = 0, ruins = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      casos++;
      const c = fn({ x, y }, W, H);
      const bom = c.length === 50
        && c.every((s) => s.x >= 0 && s.x < W && s.y >= 0 && s.y < H)                                        // dentro do mapa
        && c.every((s, i) => i === 0 || Math.abs(s.x - c[i - 1].x) + Math.abs(s.y - c[i - 1].y) === 1)       // cada parte é vizinha da anterior
        && new Set(c.map((s) => `${s.x},${s.y}`)).size === c.length                                          // sem sobrepor
        && c[0].x === x && c[0].y === y;                                                                     // a cabeça nasce onde deveria
      if (!bom) ruins++;
    }
    res[nome] = { casos, ruins };
  }
  return res;
}
const antigo = varrer(corpoAntigo);
r.check('PROVA: o teste pega o defeito da versão antiga', Object.values(antigo).some((v) => v.ruins > 0), Object.entries(antigo).map(([n, v]) => `${n}: ${v.ruins}/${v.casos}`).join(' | '));
for (const [nome, v] of Object.entries(varrer(montarCorpoDaCacadora))) {
  r.check(`mapa ${nome}: as ${v.casos} posições de nascimento geram corpo perfeito`, v.ruins === 0, v.ruins ? `${v.ruins} ruins` : '');
}
r.fim(w.__erros);
