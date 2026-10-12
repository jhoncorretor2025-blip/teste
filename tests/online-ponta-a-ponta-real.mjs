// Fluxo COMPLETO de duas pessoas jogando online, no arquivo que realmente roda
// (js/main_stable_342.js): anfitrião cria sala (modo simples) → manda o link → amigo abre o
// link e entra sozinho → anfitrião aceita → começa a partida → o amigo recebe o jogo.
import { RAIZ, novoRelatorio, criarJanela, ativar, importarDe, esperar, copiarProjeto, criarRedeFalsa } from './_ambiente.mjs';

const ENTRADA = 'js/main_stable_342.js';
const { FakePeer } = criarRedeFalsa();
const $ = (w, id) => w.document.getElementById(id);
const r = novoRelatorio();
const pastaAmigo = copiarProjeto();

const host = criarJanela({ pasta: RAIZ, Peer: FakePeer }); host.HTMLElement.prototype.scrollIntoView = () => {}; ativar(host);
await importarDe(RAIZ)(ENTRADA);
const hs = (await importarDe(RAIZ)('js/state.js')).state;

r.secao('1) Anfitrião cria a sala pelo botão do modo simples');
$(host, 'onlineSimpleCreateBtn').click(); await esperar(150);
const link = $(host, 'onlineSimpleRoomLink').value;
r.check('o link de convite foi gerado', /room=\d{4}/.test(link), link);

r.secao('2) O amigo abre o link (sem digitar nada) — sala aberta: entra direto, sem popup');
const A = criarJanela({ pasta: pastaAmigo, url: link, Peer: FakePeer }); A.HTMLElement.prototype.scrollIntoView = () => {}; ativar(A);
await importarDe(pastaAmigo)(ENTRADA);
const as = (await importarDe(pastaAmigo)('js/state.js')).state;
await esperar(1500); // a entrada automática do convite tem um pequeno atraso de propósito (350 ms)
r.check('o amigo recebeu "Entrada autorizada" sozinho', /autorizada/i.test($(A, 'joinStatus').textContent), $(A, 'joinStatus').textContent);
r.check('o amigo está dentro da sala (tela de espera abriu)', !$(A, 'clientReadyOverlay').classList.contains('hidden'));
ativar(host); await esperar(50);
r.check('o anfitrião vê 1 amigo conectado', (await importarDe(RAIZ)('js/net.js')).connectedCount() === 1);

r.secao('4) Anfitrião começa a partida');
ativar(host);
$(host, 'onlineSimpleStartBtn').click();
await esperar(3700);
r.check('a partida está rodando no anfitrião com 2 minhocas', hs.running && hs.count === 2, `running=${hs.running} count=${hs.count}`);
ativar(A); await esperar(100);
r.check('o amigo está recebendo o jogo (pacotes chegando)', as.receivedFirstState === true && as.debugStatesReceived > 5, `pacotes=${as.debugStatesReceived}`);
r.check('o amigo vê as 2 minhocas, inclusive a própria', as.snakes?.length === 2 && as.snakes.every((s) => s.length > 0));

r.secao('5) Controle do amigo chega ao anfitrião e responde na tela');
ativar(A);
A.document.dispatchEvent(new A.KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }));
r.check('o cliente mostrou previsão visual imediatamente', as.inputPredictionDir?.x === 1 && as.inputPredictionDir?.y === 0, `pred=${JSON.stringify(as.inputPredictionDir)}`);
await esperar(80);
ativar(host);
r.check('o anfitrião recebeu a direção do amigo', hs.nextDirs?.[1]?.x === 1 && hs.nextDirs?.[1]?.y === 0, `dir=${JSON.stringify(hs.nextDirs?.[1])}`);

r.secao('6) Sala protegida: o link inclui o acesso e não pede PIN manualmente');
const pastaHostProtegido = copiarProjeto();
const hostProtegido = criarJanela({ pasta:pastaHostProtegido, Peer:FakePeer });
hostProtegido.HTMLElement.prototype.scrollIntoView = () => {};
ativar(hostProtegido);
await importarDe(pastaHostProtegido)(ENTRADA);
$(hostProtegido, 'hostRoomSecurity').value = 'pin';
$(hostProtegido, 'hostRoomSecurity').dispatchEvent(new hostProtegido.Event('change', { bubbles:true }));
$(hostProtegido, 'hostRoomPin').value = '2580';
$(hostProtegido, 'hostBtn').click();
await esperar(250);
const linkProtegido = $(hostProtegido, 'onlineSimpleRoomLink').value;
r.check('convite protegido inclui a autorização no link', /room=\\d{4}/.test(linkProtegido) && /lock=1/.test(linkProtegido) && /pin=2580/.test(linkProtegido), linkProtegido);

r.secao('7) O convidado abre o link protegido e entra sem digitar a senha');
const pastaConvidadoDireto = copiarProjeto();
const convidadoDireto = criarJanela({ pasta:pastaConvidadoDireto, url:linkProtegido, Peer:FakePeer });
convidadoDireto.HTMLElement.prototype.scrollIntoView = () => {};
ativar(convidadoDireto);
await importarDe(pastaConvidadoDireto)(ENTRADA);
await esperar(1300);
r.check('a entrada foi autorizada automaticamente', /autorizada/i.test($(convidadoDireto, 'joinStatus').textContent), $(convidadoDireto, 'joinStatus').textContent);
r.check('o campo de PIN não aparece como obrigatório', $(convidadoDireto, 'joinRoomPinRow').classList.contains('hidden'));
r.check('o lobby do convidado abriu', !$(convidadoDireto, 'clientReadyOverlay').classList.contains('hidden'));

r.secao('8) Colar o link protegido também preenche a autorização sozinho');
const pastaConvidadoColado = copiarProjeto();
const convidadoColado = criarJanela({ pasta:pastaConvidadoColado, Peer:FakePeer });
convidadoColado.HTMLElement.prototype.scrollIntoView = () => {};
ativar(convidadoColado);
await importarDe(pastaConvidadoColado)(ENTRADA);
$(convidadoColado, 'joinCode').value = linkProtegido;
$(convidadoColado, 'joinCode').dispatchEvent(new convidadoColado.Event('input', { bubbles:true }));
r.check('colar o convite mantém o PIN fora do formulário obrigatório', $(convidadoColado, 'joinRoomPinRow').classList.contains('hidden'));
$(convidadoColado, 'joinBtn').click();
await esperar(1300);
r.check('o link colado entrou na sala protegida', /autorizada/i.test($(convidadoColado, 'joinStatus').textContent), $(convidadoColado, 'joinStatus').textContent);
r.check('não houve erros JS no fluxo protegido', hostProtegido.__erros.length === 0 && convidadoDireto.__erros.length === 0 && convidadoColado.__erros.length === 0);

r.fim(host.__erros, A.__erros, hostProtegido.__erros, convidadoDireto.__erros, convidadoColado.__erros);
