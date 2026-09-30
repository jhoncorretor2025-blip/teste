// Bug real: criar uma sala no celular, trocar de app (mandar o link pelo WhatsApp) e
// voltar fazia o jogo "zerar" — a sala inteira sumia, como se o navegador tivesse
// recarregado do zero. Causa: as DUAS checagens de atualização automática (a do
// version.txt e a do Service Worker) só se seguravam durante uma PARTIDA rodando
// (state.running), mas não durante a ESPERA na sala (depois de criar, antes de
// apertar "Jogar") — que é bem mais comum de coincidir com "saí pra mandar o link".
import { RAIZ, novoRelatorio, criarJanela, ativar, importarDe, esperar, criarRedeFalsa, simularTrocarDeAppEVoltar } from './_ambiente.mjs';

const { FakePeer } = criarRedeFalsa();
const w = criarJanela({ Peer: FakePeer }); ativar(w);
const r = novoRelatorio();

// Simula version.txt respondendo uma versão DIFERENTE (como se tivesse publicado algo
// novo enquanto a pessoa estava com o jogo aberto) e conta limpezas de cache/recarregamentos
let limpouCache = false;
w.caches = { keys: async () => ['algum-cache'], delete: async () => { limpouCache = true; return true; } };
// location.reload() não dá pra "escutar" de verdade no jsdom (é uma limitação conhecida —
// a propriedade não é reconfigurável); então mede indiretamente: o código só chega em
// "location.reload()" depois de ter desregistrado o Service Worker. Se isso aconteceu,
// é sinal de que a atualização foi aplicada de verdade.
let desregistrouServiceWorker = false;
let versaoSimulada; // preenchido logo abaixo, lendo a versão REAL — se tivesse fixo um número, ficaria desatualizado a cada bump de versão e o teste quebraria sozinho (foi exatamente isso que aconteceu aqui)
w.fetch = async (url) => {
  if (String(url).includes('version.txt')) return { ok: true, text: async () => versaoSimulada };
  return { ok: false };
};
w.navigator.serviceWorker = { register: async () => ({ addEventListener(){}, update: async () => {}, getRegistrations: async () => [] }), getRegistrations: async () => { desregistrouServiceWorker = true; return []; } };
global.fetch = w.fetch; global.caches = w.caches;

const { VERSION } = await importarDe(RAIZ)('js/config.js');
versaoSimulada = VERSION; // igual à versão rodando de verdade, pra checagem automática inicial não disparar à toa
await importarDe(RAIZ)('js/main.js');
const { state } = await importarDe(RAIZ)('js/state.js');
const $ = (id) => w.document.getElementById(id);

r.secao('Criou a sala e está esperando o amigo entrar (partida NÃO começou ainda)');
$('hostBtn').click();
await esperar(60);
r.check('está online de verdade', (await importarDe(RAIZ)('js/net.js')).isOnline() === true);
r.check('a partida ainda NÃO está rodando (só esperando na sala)', state.running === false);

r.secao('Enquanto espera, o jogo detecta uma versão nova (simulando "saiu, voltou depois de eu publicar algo")');
versaoSimulada = '9.9.9'; // AGORA sim, com a sala já criada, finge que publiquei uma versão nova
simularTrocarDeAppEVoltar(w); // exatamente o que o usuário fez: saiu pro WhatsApp e voltou
await esperar(300);
r.check('NÃO limpou o cache à toa (a sala continua intacta, não recarregou do zero)', !limpouCache);
r.check('NÃO desregistrou o Service Worker (não recarregou de verdade)', !desregistrouServiceWorker);

r.secao('Só DEPOIS que a pessoa sai da sala (clica em Voltar) é que a atualização represada pode acontecer');
$('back').click();
simularTrocarDeAppEVoltar(w); // a checagem periódica também reage a isso (segurança extra, além do gatilho direto do botão Voltar)
await esperar(300);
r.check('agora sim, fora da sala, a atualização foi aplicada', limpouCache && desregistrouServiceWorker, `limpouCache=${limpouCache} desregistrouServiceWorker=${desregistrouServiceWorker}`);

r.fim(w.__erros);
