// Desempenho: comer comida não pode gerar 1 acesso ao localStorage por comidinha.
// Bug real que isso evita: depois de passar de 100 pontos, TODA comidinha seguinte da
// partida tentava desbloquear a conquista "century" de novo, lendo o localStorage do
// zero a cada vez (localStorage é síncrono — trava a thread principal até terminar).
// Em celular mais fraco, isso dava uma "travadinha" bem na hora de comer.
import { RAIZ, novoRelatorio, criarJanela, ativar, importarDe, esperar } from './_ambiente.mjs';

const w = criarJanela(); ativar(w);
const r = novoRelatorio();
const storage = await importarDe(RAIZ)('js/storage.js');

r.secao('trackCumulativeProgress: 40 comidinhas seguidas viram 1 gravação represada, não 40');
let agendamentos = 0;
const setTimeoutOriginal = global.setTimeout;
global.setTimeout = (fn, ms, ...a) => { if (ms === 500) agendamentos++; return setTimeoutOriginal(fn, ms, ...a); };
for (let i = 0; i < 40; i++) storage.trackCumulativeProgress('totalFoods', 1);
r.check('só 1 gravação represada agendada pras 40 chamadas', agendamentos === 1, `agendou ${agendamentos}`);
global.setTimeout = setTimeoutOriginal;
await esperar(600);
const salvo = JSON.parse(w.localStorage.getItem('snakeArenaAchievementProgress'));
r.check('mas o valor final gravado está correto (40 comidas contadas)', salvo.totalFoods === 40, `veio ${salvo?.totalFoods}`);

r.secao('unlockAchievement: já desbloqueada não lê o localStorage de novo a cada chamada');
w.localStorage.setItem('snakeArenaUnlockedAchievements', JSON.stringify(['century']));
let leituras = 0;
const proto = Object.getPrototypeOf(w.localStorage);
const getItemOriginal = proto.getItem;
proto.getItem = function (k) { leituras++; return getItemOriginal.call(this, k); };
for (let i = 0; i < 40; i++) storage.unlockAchievement('century'); // simula 40 comidinhas depois de já passar de 100 pontos
r.check('só 1 leitura de verdade nas 40 chamadas (já sabia que tava desbloqueada)', leituras === 1, `leu ${leituras} vezes`);
proto.getItem = getItemOriginal;

r.secao('Uma conquista NOVA de verdade ainda desbloqueia e grava certinho');
w.localStorage.setItem('snakeArenaUnlockedAchievements', JSON.stringify([]));
// reimporta um módulo novo (cache em memória é por import; um jogo novo = um import novo)
const storage2 = await importarDe(RAIZ)('js/storage.js?fresh');
const resultado = storage2.unlockAchievement('century');
r.check('desbloqueou e devolveu os dados da conquista', resultado?.id === 'century', JSON.stringify(resultado));
r.check('gravou no localStorage na hora (desbloqueio é raro, não precisa represar)', JSON.parse(w.localStorage.getItem('snakeArenaUnlockedAchievements')).includes('century'));
r.check('chamar nela de novo não desbloqueia (nem devolve) segunda vez', storage2.unlockAchievement('century') === null);

r.fim(w.__erros);
