// Multiplayer ONLINE (aparelhos diferentes), usando PeerJS (WebRTC ponto-a-ponto).
// Não precisa de servidor nosso: os navegadores se conectam direto um com o outro.
//
// Como funciona:
//  - Quem cria a sala vira o "anfitrião" (host) — o jogo de verdade roda só no aparelho dele.
//  - Quem entra na sala é "cliente" — só manda a direção que quer ir, e recebe de volta
//    a posição de todo mundo pra desenhar na tela (não simula nada, só mostra).
// Isso evita jogadores trapaceando e mantém todo mundo sincronizado com uma fonte de verdade só.

export let role = 'local'; // 'local' | 'host' | 'client'
export let mySlot = 0;     // qual minhoca (0, 1 ou 2) é a "sua" nesse aparelho

let peer = null;
let conns = [];       // host: uma conexão pra cada amigo conectado
let hostConn = null;  // cliente: a conexão com o anfitrião

let handlers = {};

export function setHandlers(h) {
  handlers = h;
}

export function isOnline() { return role !== 'local'; }
export function isHost() { return role === 'host'; }
export function connectedCount() { return conns.length; }

function getPeerCtor() {
  if (typeof window.Peer !== 'function') {
    throw new Error('Biblioteca de rede (PeerJS) ainda não carregou. Tenta de novo em alguns segundos.');
  }
  return window.Peer;
}

// Cria uma sala nova. Chama onReady(codigoDaSala) quando o código já pode ser compartilhado.
export function hostRoom(onReady, onFail) {
  role = 'host';
  mySlot = 0;
  const Peer = getPeerCtor();
  peer = new Peer();

  peer.on('open', id => onReady(id));
  peer.on('error', err => onFail && onFail(err));

  peer.on('connection', conn => {
    const slot = conns.length + 1; // slot 0 é o anfitrião; próximos são 1, 2
    if (slot > 2) { conn.close(); return; }
    conns.push(conn);

    conn.on('open', () => {
      conn.send({ type: 'welcome', slot });
      handlers.onPeerJoined && handlers.onPeerJoined(slot);
    });
    conn.on('data', msg => handlers.onInput && handlers.onInput(slot, msg));
    conn.on('close', () => {
      const idx = conns.indexOf(conn);
      if (idx >= 0) conns.splice(idx, 1);
      handlers.onPeerLeft && handlers.onPeerLeft(slot);
    });
  });
}

// Entra numa sala existente usando o código do anfitrião.
export function joinRoom(hostId, onJoined, onFail) {
  role = 'client';
  const Peer = getPeerCtor();
  peer = new Peer();

  peer.on('error', err => onFail && onFail(err));

  peer.on('open', () => {
    hostConn = peer.connect(hostId, { reliable: true });
    hostConn.on('data', msg => {
      if (msg.type === 'welcome') {
        mySlot = msg.slot;
        onJoined && onJoined(msg.slot);
      } else if (msg.type === 'state') {
        handlers.onStateUpdate && handlers.onStateUpdate(msg);
      } else if (msg.type === 'full') {
        // sala já tava cheia (3 jogadores) — não dá pra entrar
        onFail && onFail(new Error('full'));
      }
    });
    hostConn.on('error', err => onFail && onFail(err));
  });
}

// Host: manda o estado atual do jogo pra todo mundo conectado
export function broadcastState(payload) {
  conns.forEach(c => { try { c.send({ type: 'state', ...payload }); } catch {} });
}

// Cliente: manda direção/turbo pro host
export function sendInput(msg) {
  if (hostConn) { try { hostConn.send(msg); } catch {} }
}

// Encerra a conexão e volta pro modo local (usado ao clicar em "Sair"/"Menu")
export function disconnect() {
  conns.forEach(c => { try { c.close(); } catch {} });
  conns = [];
  if (hostConn) { try { hostConn.close(); } catch {} }
  hostConn = null;
  if (peer) { try { peer.destroy(); } catch {} }
  peer = null;
  role = 'local';
  mySlot = 0;
}
