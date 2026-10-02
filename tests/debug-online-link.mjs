import { RAIZ, criarJanela, ativar, importarDe, esperar, copiarProjeto, criarRedeFalsa } from './_ambiente.mjs';

const { FakePeer } = criarRedeFalsa();
const pastaAmigo = copiarProjeto();
const host = criarJanela({ Peer: FakePeer });
ativar(host);
const netH = await importarDe(RAIZ)('js/net_stable_360.js');
let hostReady = false;
let peerJoined = false;
netH.setHandlers({
  onAssignTeam: () => undefined,
  onPeerJoined: () => { peerJoined = true; },
});
netH.hostRoom(
  () => { hostReady = true; console.log('HOST_READY'); },
  (e) => console.log('HOST_FAIL', e?.type, e?.message),
  'mioquinha-room-1234',
  { roomCode: '1234', requirePin: false }
);
await esperar(100);

const friend = criarJanela({ pasta: pastaAmigo, Peer: FakePeer });
ativar(friend);
const netA = await importarDe(pastaAmigo)('js/net_stable_360.js');
let joined = false;
let failed = null;
netA.setHandlers({});
netA.joinRoomByCode(
  '1234',
  '',
  'Amigo',
  () => { joined = true; console.log('JOINED'); },
  (e) => { failed = { type:e?.type, message:e?.message }; console.log('JOIN_FAIL', e?.type, e?.message); },
  () => console.log('WAITING'),
  'mine'
);
await esperar(1000);
console.log('STATE', JSON.stringify({
  hostReady,
  peerJoined,
  hostConnections: netH.connectedCount(),
  friendOnline: netA.isOnline(),
  friendRole: netA.role,
  joined,
  failed,
}));
process.exit(joined && peerJoined ? 0 : 1);
