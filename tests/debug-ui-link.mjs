import { RAIZ, criarJanela, ativar, importarDe, esperar, copiarProjeto, criarRedeFalsa } from './_ambiente.mjs';

const { FakePeer } = criarRedeFalsa();
const pastaAmigo = copiarProjeto();

const host = criarJanela({ Peer: FakePeer }); ativar(host);
await importarDe(RAIZ)('js/main_stable_342.js?diag-host');
const netHost = await importarDe(RAIZ)('js/net_stable_360.js');
$(host, 'hostRoomCodeInput').value = '7341';
$(host, 'hostBtn').click();
await esperar(100);
$(host, 'copyRoom').click();
await esperar(10);
const link = host.__copiado[0];

function $(w,id){ return w.document.getElementById(id); }

const friend = criarJanela({ pasta:pastaAmigo, url:link, Peer:FakePeer }); ativar(friend);
await importarDe(pastaAmigo)('js/main_stable_342.js?diag-friend');
const netFriend = await importarDe(pastaAmigo)('js/net_stable_360.js');
console.log('DIAG_BEFORE', JSON.stringify({
  link,
  hostRole:netHost.role, hostConns:netHost.connectedCount(),
  friendRole:netFriend.role, friendOnline:netFriend.isOnline(),
  friendCode:$(friend,'joinCode').value
}));

$(friend,'joinBtn').click();
await esperar(1200);
console.log('DIAG_AFTER_1200', JSON.stringify({
  hostRole:netHost.role, hostConns:netHost.connectedCount(),
  hostStatus:$(host,'roomStatus').textContent,
  friendRole:netFriend.role, friendOnline:netFriend.isOnline(),
  friendStatus:$(friend,'joinStatus').textContent,
  friendButtonDisabled:$(friend,'joinBtn').disabled,
  friendLobby:$(friend,'clientReadyOverlay').classList.contains('hidden'),
  friendErrors:friend.__erros.slice(0,3),
  hostErrors:host.__erros.slice(0,3)
}));
process.exit(netHost.connectedCount() === 1 && netFriend.isOnline() ? 0 : 1);
