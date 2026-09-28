// Escolhas de time lembradas entre visitas (localStorage). Cada cenário roda num PROCESSO NOVO,
// porque o jogo lê o que está salvo só na hora em que abre, e os módulos ficam em cache dentro de um processo.
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { RAIZ, novoRelatorio, criarJanela, ativar, importarDe } from './_ambiente.mjs';

if (process.argv[2] === 'filho') {
  const semente = process.env.SEMENTE ? { snakeArenaTeamPrefs: process.env.SEMENTE } : {};
  const w = criarJanela({ semente }); ativar(w);
  const imp = importarDe(RAIZ);
  await imp('js/main.js');
  const { state } = await imp('js/state.js');
  const $ = (id) => w.document.getElementById(id);
  const mudar = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('change', { bubbles: true })); };
  const saida = { aoAbrir: { mine: $('teamSizeMine').value, other: $('teamSizeOther').value, join: $('joinTeamChoice').value, stMine: state.teamSizeMine, stOther: state.teamSizeOther, formato: $('onlineFormat').value, teamMode: $('teamMode').checked } };
  if (process.env.MEXER === '1') {
    mudar('onlineFormat', 'teams'); mudar('teamSizeMine', '1'); mudar('teamSizeOther', '3'); mudar('joinTeamChoice', 'other');
    saida.salvo = w.localStorage.getItem('snakeArenaTeamPrefs');
  }
  saida.erros = w.__erros.length;
  console.log('@@' + JSON.stringify(saida));
  process.exit(0);
}
const roda = (semente, mexer = false) => {
  const out = execFileSync(process.execPath, [fileURLToPath(import.meta.url), 'filho'], { env: { ...process.env, SEMENTE: semente || '', MEXER: mexer ? '1' : '0' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 });
  return JSON.parse(out.split('\n').find((l) => l.startsWith('@@')).slice(2));
};
const r = novoRelatorio();
let x = roda('');
r.check('sem nada salvo: 2 vs 2 e "meu time"', x.aoAbrir.mine === '2' && x.aoAbrir.other === '2' && x.aoAbrir.join === 'mine');
x = roda(JSON.stringify({ mine: 3, other: 1, joinChoice: 'other' }));
r.check('os tamanhos voltam como estavam (3 e 1)', x.aoAbrir.mine === '3' && x.aoAbrir.other === '1');
r.check('a escolha de quem entra volta ("no adversário")', x.aoAbrir.join === 'other');
r.check('o jogo (não só a tela) já usa os tamanhos lembrados', x.aoAbrir.stMine === 3 && x.aoAbrir.stOther === 1);
r.check('o FORMATO não é lembrado (o modo local não liga Times sozinho)', x.aoAbrir.formato === 'ffa' && x.aoAbrir.teamMode === false);
r.check('sem erros ao abrir', x.erros === 0);
x = roda(JSON.stringify({ mine: 9, other: 'abc', joinChoice: 'x' }));
r.check('valores inválidos são ignorados', x.aoAbrir.mine === '2' && x.aoAbrir.other === '2' && x.aoAbrir.join === 'mine');
x = roda('isso não é json {{{');
r.check('texto corrompido: abre normal, sem erro', x.aoAbrir.mine === '2' && x.erros === 0);
x = roda('[1,2,3]');
r.check('lista no lugar de objeto: ignorada', x.aoAbrir.mine === '2' && x.erros === 0);
x = roda(JSON.stringify({ mine: 1 }));
r.check('só um campo salvo: usa ele e mantém o resto no padrão', x.aoAbrir.mine === '1' && x.aoAbrir.other === '2' && x.aoAbrir.join === 'mine');
x = roda('', true);
const salvo = JSON.parse(x.salvo || 'null');
r.check('mexer nas escolhas SALVA na hora', salvo && salvo.mine === 1 && salvo.other === 3 && salvo.joinChoice === 'other', x.salvo);
r.check('não grava o formato (de propósito)', salvo && !('formato' in salvo) && !('format' in salvo) && !('teamMode' in salvo));
r.fim();
