// Cada link de aba (?tab=...) abre a tela certa, sem nenhum erro de JavaScript. Cada aba roda em processo
// próprio (o estado do jogo é um singleton por processo). Substitui as buscas de texto que quebravam a cada
// mudança na escrita do código (ex.: a Loja é uma SEÇÃO da aba Progresso: ?tab=loja → progresso + shop).
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { RAIZ, novoRelatorio, criarJanela, ativar, importarDe, esperar, criarRedeFalsa } from './_ambiente.mjs';
const tab = process.argv[2];
if (tab) {
  const w = criarJanela({ url: `http://localhost/index.html?tab=${tab}`, Peer: criarRedeFalsa().FakePeer }); ativar(w);
  await importarDe(RAIZ)('js/main_stable_342.js'); await esperar(400);
  const painel = [...w.document.querySelectorAll('.tabPanel')].filter((p) => !p.classList.contains('hidden')).map((p) => p.dataset.panel);
  const secao = [...w.document.querySelectorAll('[data-progress-section].active')].map((b) => b.dataset.progressSection);
  console.log('@@' + JSON.stringify({ painel, secao, erros: w.__erros.filter((e) => !/Not implemented|Could not load/i.test(String(e))).length }));
  process.exit(0);
}
const ESPERADO = { jogar: ['jogar'], online: ['online'], progresso: ['progresso'], loja: ['progresso', 'shop'], ranking: ['progresso', 'ranking'],
  conquistas: ['progresso', 'achievements'], historico: ['progresso', 'history'], config: ['personalizar'], personalizar: ['personalizar'] };
const r = novoRelatorio();
for (const [t, [painel, secao]] of Object.entries(ESPERADO)) {
  const out = spawnSync(process.execPath, [fileURLToPath(import.meta.url), t], { encoding: 'utf8', timeout: 60000 }).stdout || '';
  const l = out.split('\n').find((x) => x.startsWith('@@')); const v = l ? JSON.parse(l.slice(2)) : { painel: [], secao: [], erros: -1 };
  r.check(`?tab=${t} abre "${painel}"${secao ? ` / seção "${secao}"` : ''}, sem erros`, v.painel.join() === painel && (!secao || v.secao.includes(secao)) && v.erros === 0, JSON.stringify(v));
}
r.fim();
