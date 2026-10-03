// Multiplayer ONLINE (aparelhos diferentes), usando PeerJS (WebRTC ponto-a-ponto).
// Não precisa de servidor nosso: os navegadores se conectam direto um com o outro.
//
// Como funciona:
//  - Quem cria a sala vira o "anfitrião" (host) — o jogo de verdade roda só no aparelho dele.
//  - Quem entra na sala é "cliente" — só manda a direção que quer ir, e recebe de volta
//    a posição de todo mundo pra desenhar na tela (não simula nada, só mostra).
// Isso evita jogadores trapaceando e mantém todo mundo sincronizado com uma fonte de verdade só.
//
// Migração automática de anfitrião (melhoria #2): se quem hospeda cair, a sala não
// morre — o cliente com o menor "slot" assume como novo anfitrião automaticamente,
// usando um ID derivado do código original (código + "-mig"), e os outros reconectam
// nesse ID sozinhos. O jogo em si recomeça do zero no novo anfitrião (não dá pra
// continuar a simulação exata de onde parou, já que só quem hospedava tinha os dados).

export let role = 'local'; // 'local' | 'host' | 'client'
export let mySlot = 0;     // qual minhoca (0, 1 ou 2) é a "sua" nesse aparelho

let peer = null;
let conns = [];       // host: uma conexão pra cada amigo conectado
let pendingConns = []; // pedidos de entrada esperando o anfitrião aceitar ou recusar
let myName = null; // nome usado ao entrar — guardado pra reusar se precisar reconectar após migração
let onJoinedCb = null; // callback de "entrou com sucesso" — reusado na reconexão automática
let onFailCb = null; // callback de "falhou" — idem
let myTeamPref = 'mine'; // 'mine' (no time do anfitrião) ou 'other' (no adversário) — guardado pra reenviar na reconexão
let maxPlayers = 6; // capacidade da sala (no modo Times, é a soma dos dois lados)

let currentRoomCode = null;
let currentRoomPin = null;
let roomPinRequired = false;

function normalizeRoomNumber(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 4);
}

function generateRoomNumber() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function roomPeerIdFromCode(code) {
  return 'mioquinha-room-' + normalizeRoomNumber(code);
}

export function getRoomCredentials() {
  return { code: currentRoomCode, pin: currentRoomPin };
}

// O anfitrião ajusta a capacidade da sala (ex: no modo Times 2 vs 2, cabem 4)
export function setMaxPlayers(n) { maxPlayers = Math.max(1, Math.min(6, Math.round(n) || 6)); }
let hostConn = null;  // cliente: a conexão com o anfitrião

let handlers = {};

// Configuração estável da sala: é pequena e pode ser reenviada sempre que alguém
// entra ou reconecta. Isso evita que um cliente tardio fique sem nome, cor, mapa,
// tema ou times só porque perdeu o pacote raro enviado no início da partida.

let originalRoomId = null; // guarda o código ORIGINAL da sala, pra calcular o ID de migração
let knownPeers = [];       // [{slot, id}] — quem tá na sala, pra saber quem vira o próximo anfitrião
let deliberateDisconnect = false; // true quando a própria pessoa clicou em sair (não tenta migrar)
let migrating = false;

export function setHandlers(h) {
  handlers = h;
}

export function isOnline() { return role !== 'local'; }
export function isHost() { return role === 'host'; }
export function connectedCount() { return conns.length; }

export function getConnectedPeers() {
  return [
    { slot: 0, host: true, ping: 0 },
    ...conns.map(c => ({ slot: c.__slot, host: false, ping: Number.isFinite(pingStats[c.__slot]) ? pingStats[c.__slot] : null }))
  ];
}

function getPeerCtor() {
  if (typeof window.Peer !== 'function') {
    throw new Error('Biblioteca de rede (PeerJS) ainda não carregou. Tenta de novo em alguns segundos.');
  }
  return window.Peer;
}

function migratedRoomId(roomId) {
  return roomId + '-mig';
}

function nextFreeSlot() {
  // Não usa conns.length: se o slot 1 sair enquanto o slot 2 continua,
  // o próximo jogador deve ocupar o 1, nunca colidir com o 2.
  const used = new Set(
    [...conns, ...pendingConns]
      .map(c => c.__slot)
      .filter(s => Number.isInteger(s))
  );
  for (let slot = 1; slot < maxPlayers; slot++) {
    if (!used.has(slot)) return slot;
  }
  return null;
}

// Host: manda pra todo mundo conectado a lista de quem tá na sala agora (incluindo o
// próprio anfitrião no slot 0) — os clientes guardam isso pra saber quem assume se o
// anfitrião cair
function broadcastPeerList() {
  // O slot pertence à conexão, não à posição dela no array. Se o jogador 1 sair,
  // o jogador 2 continua sendo o slot 2 — nunca podemos transformar isso em slot 1.
  const list = [{ slot: 0, id: peer.id }, ...conns.map(c => ({ slot: c.__slot, id: c.peer }))];
  broadcastRaw({ type: 'peerlist', peers: list });
}

// Cria uma sala nova. Chama onReady(codigoDaSala) quando o código já pode ser compartilhado.
// forcedId (opcional): usado internamente na migração, pra o novo anfitrião nascer com
// um ID PREVISÍVEL que os outros clientes conseguem adivinhar sozinhos.
export function hostRoom(onReady, onFail, forcedId, options = {}) {
  role = 'host';
  mySlot = 0;
  deliberateDisconnect = false;
  const Peer = getPeerCtor();
  const requestedId = forcedId || options.peerId || null;
  currentRoomCode = options.roomCode || currentRoomCode || null;
  // As salas novas usam apenas o link/código. PIN fica desativado neste fluxo.
  // Mantemos o campo internamente só para compatibilidade com versões antigas.
  currentRoomPin = options.roomPin ? normalizeRoomNumber(options.roomPin) : null;
  roomPinRequired = !!options.requirePin && !!currentRoomPin;
  peer = requestedId ? new Peer(requestedId) : new Peer();
  let firstOpen = true;

  peer.on('open', id => {
    if (firstOpen) {
      firstOpen = false;
      originalRoomId = forcedId ? originalRoomId : id; // migração já sabe o id original
      if (!currentRoomCode && id.startsWith('mioquinha-room-')) currentRoomCode = id.replace('mioquinha-room-', '');
      iniciarPingAnfitriao();
      onReady(id);
    } else {
      handlers.onConnectionStatus && handlers.onConnectionStatus('connected');
    }
  });
  peer.on('error', err => onFail && onFail(err));

  // Quando o celular deixa a aba em segundo plano (ex: foi mandar o link no WhatsApp),
  // a conexão com o servidor de sinalização pode cair sozinha — reconecta automaticamente.
  peer.on('disconnected', () => {
    handlers.onConnectionStatus && handlers.onConnectionStatus('disconnected');
    if (peer && !peer.destroyed) { try { peer.reconnect(); } catch {} }
  });

  pendingConns = []; // reseta a fila de pedidos toda vez que uma nova sala é criada

  peer.on('connection', conn => {
    const slot = nextFreeSlot(); // reserva o menor slot realmente livre
    if (slot == null) {
      // Sala já está na capacidade — avisa quem tentou entrar antes de fechar a conexão
      conn.on('open', () => { conn.send({ type: 'full' }); conn.close(); });
      return;
    }
    conn.__slot = slot;
    pendingConns.push(conn);

    // Segurança de compatibilidade: se a pessoa que tentou entrar estiver com uma versão
    // ANTIGA do jogo em cache no navegador (de antes do pedido de aprovação existir), ela
    // nunca vai mandar "joinRequest" — sem isso, ela ficaria presa pra sempre e o anfitrião
    // nunca veria o popup. Depois de 6 segundos sem receber o pedido, deixa entrar direto,
    // do jeito antigo, em vez de travar os dois lados.
    let gotJoinRequest = false;
    const compatTimer = setTimeout(() => {
      if (gotJoinRequest) return;
      const pIdx = pendingConns.indexOf(conn);
      if (pIdx < 0) return;
      pendingConns.splice(pIdx, 1);

      // Em sala protegida, cliente antigo sem PIN não entra silenciosamente.
      if (roomPinRequired) {
        try { conn.send({ type: 'wrongPin' }); } catch {}
        try { conn.close(); } catch {}
        return;
      }

      conns.push(conn);
      finalizeJoin(conn, slot, 'mine');
    }, 6000);

    conn.on('data', msg => {
      if (msg.type === 'joinRequest') {
        gotJoinRequest = true;
        clearTimeout(compatTimer);

        if (roomPinRequired && msg.roomPin !== currentRoomPin) {
          try { conn.send({ type: 'wrongPin' }); } catch {}
          setTimeout(() => { try { conn.close(); } catch {} }, 80);
          return;
        }

        // No modo atual não existe PIN nem aprovação manual: receber o convite já
        // autoriza a entrada e manda o jogador direto para a sala.
        if (!roomPinRequired) {
          approveJoinRequest({ conn, slot, name: msg.name, teamPref: msg.teamPref });
          return;
        }

        handlers.onJoinRequest && handlers.onJoinRequest({
          conn,
          slot,
          name: msg.name,
          teamPref: msg.teamPref,
          authenticated: true
        });
      } else if (msg.type === 'reconnectRequest') {
        // Reconexão automática (não é gente nova pedindo pra entrar, é alguém que já
        // tava na sala e a conexão só piscou) — entra direto, SEM esperar aprovação
        // manual de novo. Não faria sentido a pessoa reconectar sozinha e o anfitrião
        // ter que notar um popup novo e clicar de novo — isso derrotaria o propósito
        // de ser "automático".
        gotJoinRequest = true;
        clearTimeout(compatTimer);
        approveJoinRequest({ conn, slot, name: msg.name, teamPref: msg.teamPref });
      } else if (msg.type === 'ping') {
        try { conn.send({ type: 'pong', ts: msg.ts }); } catch {}
      } else if (msg.type === 'pong') {
        pingStats[slot] = Date.now() - msg.ts;
      } else {
        handlers.onInput && handlers.onInput(slot, msg);
      }
    });
    conn.on('close', () => {
      clearTimeout(compatTimer);
      delete pingStats[slot];
      const pIdx = pendingConns.indexOf(conn);
      if (pIdx >= 0) pendingConns.splice(pIdx, 1);
      const idx = conns.indexOf(conn);
      if (idx >= 0) { conns.splice(idx, 1); broadcastPeerList(); handlers.onPeerLeft && handlers.onPeerLeft(slot); }
    });
  });
}

// Anfitrião aceita o pedido de entrada — só AGORA a pessoa realmente entra na sala
export function approveJoinRequest(request) {
  const pIdx = pendingConns.indexOf(request.conn);
  if (pIdx >= 0) pendingConns.splice(pIdx, 1);
  conns.push(request.conn);
  finalizeJoin(request.conn, request.slot, request.teamPref);
}

// Caminho ÚNICO pra alguém entrar de vez (aprovado na mão, reconexão ou compatibilidade):
// o anfitrião decide o time (se for partida em Times) ANTES de responder, pra a pessoa já
// saber em qual time caiu logo na resposta de boas-vindas.
function finalizeJoin(conn, slot, teamPref) {
  // Guarda o slot também na conexão para que a lista de pares e a migração continuem
  // estáveis mesmo quando alguém sai do meio da sala.
  conn.__slot = slot;
  const team = handlers.onAssignTeam ? handlers.onAssignTeam(slot, teamPref) : undefined;
  try { conn.send({ type: 'welcome', slot, team }); } catch {}
  // O pacote de configuração é separado do estado frequente: pequeno, explícito e
  // seguro para reenviar. Também corrige entrada tardia e reconexão após uma queda.
  if (handlers.getRoomConfig) {
    try {
      const config = handlers.getRoomConfig(slot);
      if (config) conn.send({ type: 'roomConfig', ...config });
    } catch {}
  }
  broadcastPeerList();
  handlers.onPeerJoined && handlers.onPeerJoined(slot, name);
}

// Anfitrião recusa o pedido — avisa a pessoa e fecha a conexão
export function rejectJoinRequest(request) {
  try { request.conn.send({ type: 'rejected' }); } catch {}
  request.conn.close();
}

// Entra numa sala existente usando o código do anfitrião. O PIN é opcional para compatibilidade.
export function joinRoom(hostId, name, onJoined, onFail, onWaitingApproval, teamPref = 'mine', roomPin = null) {
  role = 'client';
  deliberateDisconnect = false;
  myName = name;
  myTeamPref = teamPref === 'other' ? 'other' : 'mine';
  currentRoomPin = roomPin ? normalizeRoomNumber(roomPin) : null;
  roomPinRequired = false;
  onJoinedCb = onJoined;
  onFailCb = onFail;
  if (!migrating) originalRoomId = hostId; // se já tá migrando, mantém o id ORIGINAL guardado
  const Peer = getPeerCtor();
  peer = new Peer();
  let firstOpen = true;

  peer.on('error', err => onFail && onFail(err));

  peer.on('disconnected', () => {
    handlers.onConnectionStatus && handlers.onConnectionStatus('disconnected');
    if (peer && !peer.destroyed) { try { peer.reconnect(); } catch {} }
  });

  peer.on('open', () => {
    if (!firstOpen) { handlers.onConnectionStatus && handlers.onConnectionStatus('connected'); return; }
    firstOpen = false;
    hostConn = peer.connect(hostId, { reliable: true, serialization: 'json' });

    // Esse timeout cobre só a parte TÉCNICA da conexão (o "aperto de mão" direto entre
    // os dois aparelhos) — não conta a espera pela aprovação humana do anfitrião, que
    // pode demorar mais um pouco sem ser sinal de rede quebrada
    let connectionOpened = false;
    const connectTimeoutId = setTimeout(() => {
      if (!connectionOpened) onFail && onFail(new Error('timeout'));
    }, 15000);

    hostConn.on('open', () => {
      connectionOpened = true;
      clearTimeout(connectTimeoutId);
      hostConn.send({ type: 'joinRequest', name: myName, teamPref: myTeamPref, roomPin: currentRoomPin || '' });
      onWaitingApproval && onWaitingApproval();
      iniciarPingCliente();
    });

    configurarHostConnHandlers();
  });
}

// Entra pelo código curto. Primeiro tenta a sala principal e, em caso de migração,
// tenta o identificador de migração usado pelos clientes antigos.
export function joinRoomByCode(roomCode, roomPin, name, onJoined, onFail, onWaitingApproval, teamPref = 'mine') {
  const code = normalizeRoomNumber(roomCode);
  const pin = normalizeRoomNumber(roomPin);
  if (code.length !== 4) {
    onFail && onFail(new Error('invalidRoomCode'));
    return;
  }
  const baseId = roomPeerIdFromCode(code);
  const migrationId = migratedRoomId(baseId);

  let finished = false;
  const finishFail = (err) => {
    if (finished) return;
    finished = true;
    onFail && onFail(err);
  };

  // Faz a conexão normal com o código.
  joinRoom(baseId, name,
    (slot, team) => {
      if (finished) return;
      finished = true;
      onJoined && onJoined(slot, team);
    },
    (err) => {
      // Se a sala principal não existe, tenta o ID de migração. O PIN é opcional;
      // salas novas entram apenas pelo link/código.

      if (err?.type === 'peer-unavailable' && !finished) {
        joinRoom(migrationId, name,
          (slot, team) => {
            if (finished) return;
            finished = true;
            onJoined && onJoined(slot, team);
          },
          finishFail,
          onWaitingApproval,
          teamPref,
          pin
        );
      } else {
        finishFail(err);
      }
    },
    onWaitingApproval,
    teamPref,
    pin
  );
}

// Registra os handlers de dados/fechamento da conexão com o anfitrião — extraído em
// função própria pra poder ser chamado de novo depois de uma reconexão automática
// (melhoria #11), sem duplicar toda essa lógica
function configurarHostConnHandlers() {
  hostConn.on('data', msg => {
    if (msg.type === 'welcome') {
      mySlot = msg.slot;
      onJoinedCb && onJoinedCb(msg.slot, msg.team);
    } else if (msg.type === 'roomConfig') {
      handlers.onRoomConfig && handlers.onRoomConfig(msg);
    } else if (msg.type === 'wrongPin') {
      onFailCb && onFailCb(new Error('wrongPin'));
    } else if (msg.type === 'rejected') {
      onFailCb && onFailCb(new Error('rejected'));
    } else if (msg.type === 'state') {
      handlers.onStateUpdate && handlers.onStateUpdate(msg);
    } else if (msg.type === 'countdown') {
      handlers.onCountdown && handlers.onCountdown(msg.n);
    } else if (msg.type === 'reaction') {
      handlers.onReaction && handlers.onReaction(msg.emoji, msg.from);
    } else if (msg.type === 'chat') {
      handlers.onChat && handlers.onChat(msg.text, msg.from);
    } else if (msg.type === 'peerlist') {
      knownPeers = msg.peers;
      handlers.onPeerList && handlers.onPeerList(msg.peers);
    } else if (msg.type === 'lobby') {
      handlers.onLobby && handlers.onLobby(msg.players || [], msg.config || null);
    } else if (msg.type === 'onlineMatchResult') {
      handlers.onMatchResult && handlers.onMatchResult(msg.result || null);
    } else if (msg.type === 'full') {
      // sala já tava cheia (3 jogadores) — não dá pra entrar
      onFailCb && onFailCb(new Error('full'));
    } else if (msg.type === 'ping') {
      try { hostConn.send({ type: 'pong', ts: msg.ts }); } catch {}
    } else if (msg.type === 'pong') {
      hostLatency = Date.now() - msg.ts;
    }
  });
  hostConn.on('close', () => {
    if (deliberateDisconnect || migrating) return; // saída de propósito, ou já migrando — nada a fazer
    tentarReconexaoDireta();
  });
  hostConn.on('error', err => onFailCb && onFailCb(err));
}

// Se o anfitrião cair sem avisar, tenta migrar a sala sozinho — o cliente com o menor
// slot vira o novo anfitrião, e os outros reconectam automaticamente nele
// Reconexão automática (melhoria #11) — antes de assumir que o anfitrião sumiu de vez e
// partir pra migração (trocar de anfitrião), tenta reconectar direto nele de novo, já
// que às vezes é só um probleminha passageiro de rede (o anfitrião continua lá).
// Força uma reconexão de verdade quando os dados param de chegar mesmo a conexão
// dizendo que continua "aberta" — isso é um problema conhecido e documentado do
// WebRTC/PeerJS em algumas situações raras: um lado consegue mandar sem erro nenhum,
// mas os dados nunca chegam do outro lado, como se o canal tivesse "entupido" sem
// avisar. Fechar e reconectar do zero costuma resolver, já que cria um canal novo.
export function forcarReconexaoPorDadosParados() {
  if (role !== 'client' || migrating || deliberateDisconnect) return;
  if (hostConn) { try { hostConn.close(); } catch {} }
}

function tentarReconexaoDireta() {
  if (migrating || !originalRoomId) { attemptHostMigration(); return; }
  handlers.onConnectionStatus && handlers.onConnectionStatus('disconnected');
  setTimeout(() => {
    if (deliberateDisconnect || migrating) return;
    const novaConn = peer.connect(originalRoomId, { reliable: true, serialization: 'json' });
    let conectou = false;
    const timeoutReconexao = setTimeout(() => { if (!conectou) attemptHostMigration(); }, 4000);
    novaConn.on('open', () => {
      conectou = true;
      clearTimeout(timeoutReconexao);
      hostConn = novaConn;
      // Reaplica os mesmos handlers de dados/fechamento que a conexão original tinha
      configurarHostConnHandlers();
      hostConn.send({ type: 'reconnectRequest', name: myName, teamPref: myTeamPref }); // reconexão automática — entra direto, sem esperar aprovação manual de novo
      handlers.onConnectionStatus && handlers.onConnectionStatus('connected');
    });
    novaConn.on('error', () => { if (!conectou) { clearTimeout(timeoutReconexao); attemptHostMigration(); } });
  }, 1500);
}

function attemptHostMigration() {
  if (migrating || !originalRoomId) { handlers.onMigrationFailed && handlers.onMigrationFailed(); return; }
  migrating = true;
  handlers.onHostLeft && handlers.onHostLeft();

  const survivors = knownPeers.filter((p) => p.slot !== 0).sort((a, b) => a.slot - b.slot);
  if (!survivors.length) { handlers.onMigrationFailed && handlers.onMigrationFailed(); return; }

  const iAmNext = survivors[0].id === peer.id;
  const newHostId = migratedRoomId(originalRoomId);

  if (iAmNext) {
    hostRoom(
      () => { migrating = false; handlers.onBecameNewHost && handlers.onBecameNewHost(newHostId); },
      () => { migrating = false; handlers.onMigrationFailed && handlers.onMigrationFailed(); },
      newHostId
    );
  } else {
    // Dá um tempinho pro novo anfitrião terminar de subir antes de tentar conectar nele
    setTimeout(() => {
      joinRoom(
        newHostId, myName,
        (slot) => { migrating = false; handlers.onRejoinedAfterMigration && handlers.onRejoinedAfterMigration(slot); },
        () => { migrating = false; handlers.onMigrationFailed && handlers.onMigrationFailed(); },
        undefined,
        myTeamPref // mantém a escolha de time original ao reentrar depois da migração
      );
    }, 2000);
  }
}

// Host: manda o estado atual do jogo pra todo mundo conectado
export function broadcastState(payload) {
  broadcastRaw({ type: 'state', ...payload });
}

// Diagnóstico de envio — pra saber se o anfitrião está REALMENTE conseguindo mandar os
// pacotes, ou se tá falhando silenciosamente (por isso existe: um bug real onde os
// erros de conn.send() eram simplesmente descartados sem deixar nenhuma pista)
export const sendDiag = { tentativas: 0, sucessos: 0, falhas: 0, ultimoErro: null, ultimaContagemConns: 0 };

// Host: manda qualquer mensagem crua pra todo mundo conectado (usado também pela contagem regressiva)
export function broadcastRaw(msg) {
  sendDiag.ultimaContagemConns = conns.length;
  conns.forEach(c => {
    sendDiag.tentativas++;
    try {
      c.send(msg);
      sendDiag.sucessos++;
    } catch (err) {
      sendDiag.falhas++;
      sendDiag.ultimoErro = `${err?.message || err} (conexão aberta? ${c.open})`;
    }
  });
}

// Cliente: manda direção/turbo pro host
export function sendInput(msg) {
  if (hostConn) { try { hostConn.send(msg); } catch {} }
}

// --- Ping/Latência (melhoria #15) — cada lado manda um "oi" com a hora certinha, e o
// outro lado devolve na mesma hora; a diferença entre agora e aquela hora é o ping.
export const pingStats = {}; // host: latência (ms) de cada jogador conectado, por slot
export let hostLatency = null; // cliente: latência (ms) até o anfitrião

function iniciarPingCliente() {
  setInterval(() => {
    if (hostConn && hostConn.open) { try { hostConn.send({ type: 'ping', ts: Date.now() }); } catch {} }
  }, 3000);
}

function iniciarPingAnfitriao() {
  setInterval(() => {
    conns.forEach((c) => { try { c.send({ type: 'ping', ts: Date.now() }); } catch {} });
  }, 3000);
}

// Encerra a conexão e volta pro modo local (usado ao clicar em "Sair"/"Menu")
export function disconnect() {
  deliberateDisconnect = true;
  migrating = false;
  originalRoomId = null;
  currentRoomCode = null;
  currentRoomPin = null;
  roomPinRequired = false;
  knownPeers = [];
  conns.forEach(c => { try { c.close(); } catch {} });
  conns = [];
  pendingConns.forEach(c => { try { c.close(); } catch {} });
  pendingConns = [];
  if (hostConn) { try { hostConn.close(); } catch {} }
  hostConn = null;
  if (peer) { try { peer.destroy(); } catch {} }
  peer = null;
  role = 'local';
  mySlot = 0;
}

// Reforço extra: quando a aba volta a ficar visível (ex: voltou do WhatsApp depois de
// mandar o link), confere se a conexão caiu e reconecta na hora — mesmo que o evento
// "disconnected" do PeerJS não tenha disparado a tempo nesse navegador.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && peer && !peer.destroyed && peer.disconnected) {
      try { peer.reconnect(); } catch {}
    }
  });
}
