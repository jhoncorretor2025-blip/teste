// Testa o próprio verificador (tools/verificar-projeto.py): estraga UMA coisa por vez numa cópia do
// projeto e confirma que a checagem certa reprova. Um verificador que nunca reprova não vale nada.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { RAIZ, novoRelatorio } from './_ambiente.mjs';

function copia() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'verificador-'));
  fs.cpSync(RAIZ, d, { recursive: true, filter: (o) => !/(^|[\\/])(node_modules|\.git)([\\/]|$)/.test(path.relative(RAIZ, o)) && path.basename(o) !== 'verificador-pega-erros.mjs' });
  return d;
}
// roda o verificador na cópia e devolve { falharam: Set de números de checagem, codigo }
function verificar(d) {
  const r = spawnSync('python3', [path.join(d, 'tools/verificar-projeto.py')], { encoding: 'utf8' });
  const falharam = new Set(); let atual = 0;
  for (const l of r.stdout.split('\n')) {
    const m = l.match(/^(\d+)\) /); if (m) atual = +m[1];
    if (/^\s{2}❌/.test(l) && atual) falharam.add(atual); // só linhas de checagem; o resumo final não conta
  }
  return { falharam, codigo: r.status };
}
const ler = (d, p) => fs.readFileSync(path.join(d, p), 'utf8');
const gravar = (d, p, t) => fs.writeFileSync(path.join(d, p), t);
const r = novoRelatorio();

const CASOS = [
  [1, 'versão diferente em version.txt', (d) => gravar(d, 'version.txt', '9.9.9')],
  [1, 'versão diferente no sw.js (nome do cache)', (d) => gravar(d, 'sw.js', ler(d, 'sw.js').replace(/snake-arena-v[\d.]+/, 'snake-arena-v0.0.1'))],
  [2, 'id do HTML renomeado (o JS ainda usa o antigo)', (d) => gravar(d, 'index.html', ler(d, 'index.html').replace('id="joinTeamRow"', 'id="joinTeamRowX"'))],
  [3, 'módulo novo que ninguém importa (código morto)', (d) => gravar(d, 'js/orfao.js', '// órfão\nexport const x = 1;\n')],
  [4, 'módulo real fora da lista ASSETS do sw.js', (d) => gravar(d, 'sw.js', ler(d, 'sw.js').replace("  './js/teams.js',\n", ''))],
  [4, 'arquivo inexistente listado no ASSETS do sw.js', (d) => gravar(d, 'sw.js', ler(d, 'sw.js').replace("'./js/net.js',", "'./js/net.js',\n  './js/nao-existe.js',"))],
  [5, 'erro de sintaxe num módulo', (d) => gravar(d, 'js/utils.js', ler(d, 'js/utils.js') + '\n}}} isto quebra\n')],
  [6, 'mapa do código desatualizado', (d) => gravar(d, 'docs/MAPA-DO-CODIGO.md', ler(d, 'docs/MAPA-DO-CODIGO.md') + '\nlixo\n')],
  [6, 'módulo criado sem regenerar o mapa', (d) => { gravar(d, 'js/extra.js', '// extra\nexport const y = 2;\n'); gravar(d, 'js/main.js', "import './extra.js';\n" + ler(d, 'js/main.js')); }],
  [7, 'módulo sem nenhuma menção nos guias', (d) => { for (const g of ['AGENTS.md', 'docs/ARQUITETURA.md']) gravar(d, g, ler(d, g).replaceAll('tutorial.js', 'tutorial-x')); }],
  [8, 'token do GitHub esquecido num arquivo', (d) => gravar(d, 'docs/esquecido.md', 'meu token: github_pat_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4'.repeat(2))],
  [9, 'tema na config sem <option> no HTML', (d) => gravar(d, 'index.html', ler(d, 'index.html').replace(/<option value="garden">[^<]*<\/option>/, ''))],
  [9, 'tamanho de mapa no HTML que a config não tem', (d) => gravar(d, 'index.html', ler(d, 'index.html').replace('<option value="large">', '<option value="gigante">Gigante</option><option value="large">'))],
  [10, 'guia cita uma função que não existe', (d) => gravar(d, 'AGENTS.md', ler(d, 'AGENTS.md') + '\nMexa em `funcaoQueNaoExiste` para isso.\n')],
  [10, 'guia cita um arquivo que não existe', (d) => gravar(d, 'AGENTS.md', ler(d, 'AGENTS.md') + '\nVeja `js/fantasma.js`.\n')],
];

r.secao('Base: o projeto intacto passa em tudo');
const base = copia(); const b = verificar(base);
r.check('cópia intacta: nenhuma checagem reprova', b.falharam.size === 0 && b.codigo === 0, [...b.falharam].join(','));

r.secao('Cada defeito de propósito precisa ser pego pela checagem certa');
for (const [checagem, nome, estragar] of CASOS) {
  const d = copia(); estragar(d);
  const v = verificar(d);
  r.check(`#${checagem} pega: ${nome}`, v.falharam.has(checagem) && v.codigo === 1, `reprovaram: [${[...v.falharam].join(',')}]`);
  fs.rmSync(d, { recursive: true, force: true });
}

r.secao('E não reprova à toa (mudança inofensiva)');
const inofensivo = copia();
gravar(inofensivo, 'README.md', ler(inofensivo, 'README.md') + '\nMais uma linha de texto qualquer.\n');
gravar(inofensivo, 'docs/ARQUITETURA.md', ler(inofensivo, 'docs/ARQUITETURA.md') + '\nUma frase nova sem nada de código.\n');
const vi = verificar(inofensivo);
r.check('só texto novo no README e num guia: passa em tudo', vi.falharam.size === 0 && vi.codigo === 0, `[${[...vi.falharam].join(',')}]`);
fs.rmSync(base, { recursive: true, force: true }); fs.rmSync(inofensivo, { recursive: true, force: true });
r.fim();
