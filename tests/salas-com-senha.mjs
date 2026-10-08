// Sala COM SENHA, testada de verdade (o teste antigo só procurava texto no código): o anfitrião liga a senha,
// o link marca "protegida" mas NÃO carrega a senha, e o convidado só entra com os 4 números certos.
import { RAIZ, novoRelatorio, criarJanela, ativar, importarDe, esperar, copiarProjeto, criarRedeFalsa } from './_ambiente.mjs';
const ENTRADA = 'js/main_stable_342.js';
const { FakePeer } = criarRedeFalsa();
const $ = (w, id) => w.document.getElementById(id);
const r = novoRelatorio();
const pastaAmigo = copiarProjeto();

const host = criarJanela({ pasta: RAIZ, Peer: FakePeer }); ativar(host);
await importarDe(RAIZ)(ENTRADA);
$(host, 'hostRoomSecurity').value = 'pin'; $(host, 'hostRoomSecurity').dispatchEvent(new host.Event('change', { bubbles: true }));
$(host, 'hostRoomPin').value = '4321';
$(host, 'hostBtn').click(); await esperar(250);
r.check('a sala com senha foi criada', !$(host, 'hostPanel').classList.contains('hidden'));
$(host, 'copyRoom').click(); await esperar(40);
const link = host.__copiado[0] || '';
r.check('o link marca a sala como protegida (lock=1)', /lock=1/.test(link), link);
r.check('o link NÃO carrega a senha', !/4321/.test(link), link);

const A = criarJanela({ pasta: pastaAmigo, url: link, Peer: FakePeer }); ativar(A);
await importarDe(pastaAmigo)(ENTRADA);
await esperar(900);
r.check('o convidado vê o campo da senha', !$(A, 'joinRoomPinRow').classList.contains('hidden'));
r.check('ele NÃO entra sozinho (espera a senha)', $(A, 'clientReadyOverlay').classList.contains('hidden'));

ativar(A); $(A, 'joinBtn').click(); await esperar(250);
r.check('sem senha: pede os 4 números', /senha/i.test($(A, 'joinStatus').textContent), $(A, 'joinStatus').textContent);
r.check('sem senha: não entrou', $(A, 'clientReadyOverlay').classList.contains('hidden'));

const netHost = await importarDe(RAIZ)('js/net.js');
const netA = await importarDe(pastaAmigo)('js/net.js');

ativar(A); $(A, 'joinRoomPin').value = '0000'; $(A, 'joinBtn').click(); await esperar(500);
r.check('senha ERRADA: aviso de senha incorreta', /incorreta/i.test($(A, 'joinStatus').textContent), $(A, 'joinStatus').textContent);
r.check('senha ERRADA: não entrou', $(A, 'clientReadyOverlay').classList.contains('hidden'));
// O defeito antigo: a conexão recusada era fechada e o jogo "reconectava sozinho" SEM conferir a senha (1,5 s depois)
await esperar(3200);
ativar(A);
r.check('senha ERRADA: depois de esperar o "reconectar sozinho", continua fora da sala', netHost.connectedCount() === 0 && $(A, 'clientReadyOverlay').classList.contains('hidden'), `amigos na sala: ${netHost.connectedCount()}`);
r.check('senha ERRADA: o aviso de senha incorreta continua na tela (não vira "reconectando")', /incorreta/i.test($(A, 'joinStatus').textContent), $(A, 'joinStatus').textContent);

// Um intruso que pula o "pedido de entrada" e manda direto o pedido de RECONEXÃO, sem senha
ativar(host);
const intruso = new FakePeer();
const codigoSala = new URL(link).searchParams.get('room');
const recebidas = [];
const conexao = intruso.connect('mioquinha-room-' + codigoSala);
conexao.on('data', (m) => recebidas.push(m.type));
conexao.on('open', () => conexao.send({ type: 'reconnectRequest', name: 'Intruso', teamPref: 'mine' }));
await esperar(500);
r.check('INTRUSO sem senha (reconnectRequest) recebe "wrongPin"', recebidas.includes('wrongPin'), recebidas.join(','));
r.check('INTRUSO sem senha NÃO entrou na sala', netHost.connectedCount() === 0, `amigos na sala: ${netHost.connectedCount()}`);

ativar(A); $(A, 'joinRoomPin').value = '4321'; $(A, 'joinBtn').click(); await esperar(600);
ativar(host);
r.check('senha CERTA: o anfitrião recebe o pedido de entrada (sala protegida ainda pede o "Aceitar")', !$(host, 'joinApprovalOverlay').classList.contains('hidden'));
$(host, 'joinApproveBtn').click();
const t0 = Date.now(); while (Date.now() - t0 < 5000 && netHost.connectedCount() < 1) await esperar(100);
await esperar(200); ativar(A);
r.check('senha CERTA + aceito: entrou na sala', !$(A, 'clientReadyOverlay').classList.contains('hidden') && netHost.connectedCount() === 1, `${$(A, 'joinStatus').textContent} | amigos: ${netHost.connectedCount()}`);

// A reconexão LEGÍTIMA (quem tem a senha) continua funcionando: derruba a conexão e espera voltar sozinho
ativar(A); netA.forcarReconexaoPorDadosParados(); await esperar(3500);
r.check('quem TEM a senha volta sozinho depois de uma queda de conexão', netHost.connectedCount() === 1, `amigos na sala: ${netHost.connectedCount()}`);
r.fim(host.__erros, A.__erros);
