// Fluxo online de ponta a ponta com DOIS participantes isolados (anfitrião + amigo), em partida de Times,
// usando a tela de verdade: criar sala, gerar link, abrir o link, clicar em ENTRAR NO JOGO e entrar sem PIN.
import { RAIZ, novoRelatorio, criarJanela, ativar, importarDe, esperar, copiarProjeto, criarRedeFalsa } from './_ambiente.mjs';
const { FakePeer } = criarRedeFalsa();
const pastaAmigo = copiarProjeto(); // o amigo precisa da SUA cópia dos arquivos (módulos isolados)
const $ = (w, id) => w.document.getElementById(id);
const mudar = (w, id, v) => { $(w, id).value = v; $(w, id).dispatchEvent(new w.Event('change', { bubbles: true })); };
const r = novoRelatorio();

const host = criarJanela({ Peer: FakePeer }); ativar(host);
await importarDe(RAIZ)('js/main_stable_342.js');
const hs = (await importarDe(RAIZ)('js/state.js')).state;
mudar(host, 'onlineFormat', 'teams'); mudar(host, 'teamSizeMine', '1'); mudar(host, 'teamSizeOther', '1');
$(host, 'hostBtn').click(); await esperar(60);
$(host, 'copyRoom').click(); await esperar(20);
const link = host.__copiado[0];
r.check('o link da sala leva o formato e os tamanhos', /fmt=teams/.test(link) && /ta=1/.test(link) && /tb=1/.test(link), link);

const A = criarJanela({ pasta: pastaAmigo, url: link, Peer: FakePeer }); ativar(A);
await importarDe(pastaAmigo)('js/main_stable_342.js');
const as = (await importarDe(pastaAmigo)('js/state.js')).state;
await esperar(120);
// O link já preenche a sala; o convidado confirma com um único toque. ✅
// O bootstrap do index.html carrega PeerJS da CDN; no teste, reafirmamos o FakePeer
// imediatamente antes do clique para não deixar a CDN substituir o simulador.
A.Peer = FakePeer;
$(A, 'joinBtn').click();
await esperar(2200);
const netHostDebug = await importarDe(RAIZ)('js/net_stable_360.js?debug');
const netFriendDebug = await importarDe(pastaAmigo)('js/net_stable_360.js?debug');
console.log('NET_STATE_DEBUG', JSON.stringify({
  hostRole: netHostDebug.role, hostConns: netHostDebug.connectedCount(), hostStatus: $(host, 'roomStatus').textContent,
  friendRole: netFriendDebug.role, friendOnline: netFriendDebug.isOnline(), friendStatus: $(A, 'joinStatus').textContent
}));
if (A.__erros.length || host.__erros.length) console.log('ERROS JS APÓS ENTRADA:', { amigo: A.__erros.slice(0,3), host: host.__erros.slice(0,3) });
r.check('botão ENTRAR NO JOGO não gerou erro', !$(A, 'joinStatus').textContent.startsWith('❌'), $(A, 'joinStatus').textContent);
ativar(host); await esperar(30);
r.check('anfitrião aceitou a entrada automaticamente', /2 \/ 2/.test($(host, 'roomCapacityText').textContent), $(host, 'roomCapacityText').textContent);
ativar(A); await esperar(20);
r.check('amigo entrou: painel 🩺 abriu sozinho enquanto espera os dados', !$(A, 'diagPanel').classList.contains('hidden') && as.diagAutoShown === true);
r.check('amigo entrou e recebeu o time (🔴 Vermelho)', /Time Vermelho/.test($(A, 'clientReadyOverlay').querySelector('h2').textContent));

ativar(host);
$(host, 'startFromHostPanel').click();
await esperar(3600);
r.check('partida rodando no anfitrião: 2 minhocas, em Times', hs.running && hs.count === 2 && hs.teamMode === true && JSON.stringify(hs.teams.slice(0, 2)) === '[0,1]', JSON.stringify(hs.teams.slice(0, 2)));
r.check('placar do anfitrião mostra os times somados', /teamTotal/.test($(host, 'scores').innerHTML));
ativar(A); await esperar(50);
r.check('o amigo RECEBE os dados do jogo', as.receivedFirstState === true && as.debugStatesReceived > 5, `pacotes=${as.debugStatesReceived}`);
// A configuração da sala é enviada separadamente ao entrar/reconectar; o cliente deve
// terminar a partida com o mesmo mapa/tema/time do anfitrião, sem depender do primeiro state.
r.check('amigo recebe a configuração estável da sala', as.mapW === hs.mapW && as.mapH === hs.mapH && as.theme === hs.theme && as.teamMode === hs.teamMode);
r.check('e o painel 🩺 SUMIU sozinho quando os dados chegaram', $(A, 'diagPanel').classList.contains('hidden'));
r.check('o amigo sabe que é partida de times', as.teamMode === true && JSON.stringify(as.teams.slice(0, 2)) === '[0,1]');
r.fim(host.__erros, A.__erros);
