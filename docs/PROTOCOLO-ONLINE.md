# Protocolo online (`js/net.js`)

Multiplayer **ponto a ponto** com PeerJS 1.5.4 (WebRTC). O projeto não tem servidor próprio: `new Peer()` é criado **sem opções**, então vale a configuração padrão do PeerJS. As conexões são `reliable: true` com `serialization: 'json'`. O **código da sala é o id do Peer do anfitrião**.

Papéis: **anfitrião** (slot 0; roda o jogo) e **clientes** (slots 1, 2, …; só mandam entradas e desenham).

## Configuração estável da sala
Além do `state` frequente, o host envia `roomConfig` ao cliente sempre que a entrada é
finalizada (entrada nova ou reconexão). O pacote contém `colors, names, heads, patterns,
palettes, trailColors, mapW, mapH, theme, teamMode, teams, count`. O cliente aplica esses
dados por `onRoomConfig`. Isso torna a sincronização idempotente e corrige o caso de
entrada tardia que perdeu o pacote raro inicial.

## Mensagens
Todas têm `type`. O lado que recebe trata em `net.js` (`configurarHostConnHandlers` no cliente; `conn.on('data')` no anfitrião).

**Cliente → anfitrião**
| type | campos | para quê |
|---|---|---|
| `joinRequest` | `name`, `teamPref` (`'mine'`/`'other'`) | entrar na sala; em salas novas a entrada é automática |
| `reconnectRequest` | `name`, `teamPref` | voltar depois de uma queda; **entra direto, sem aprovação** |
| `ping` / `pong` | `ts` | medir latência |
| `dir` | `dir` | direção pedida |
| `boost` | — | turbo |
| `ready` | `ready` | "estou pronto" no lobby |
| `reaction` | `emoji` | reação (o anfitrião repassa a todos) |
| `chat` | `text` | mensagem (o anfitrião repassa a todos) |

**Anfitrião → clientes**
| type | campos | para quê |
|---|---|---|
| `welcome` | `slot`, `team` | entrada aceita; `team` (0/1) só existe em partida de times |
| `rejected` | — | o anfitrião recusou |
| `full` | — | sala lotada (e a conexão é fechada) |
| `state` | veja "Pacotes de estado" | o jogo |
| `countdown` | `n` | contagem regressiva do início |
| `peerlist` | `peers` | quem está na sala (base da migração de anfitrião) |
| `reaction` / `chat` | `emoji`/`text`, `from` | repasse |
| `ping` / `pong` | `ts` | latência (o anfitrião mede a de cada cliente) |

## Fluxo de entrada
1. O cliente abre uma conexão. Se a sala estiver cheia, o anfitrião responde `full` e fecha.
2. O cliente envia `joinRequest` com o nome e a preferência de time.
3. Em salas novas sem PIN, o anfitrião aceita automaticamente e `finalizeJoin` faz, **nesta ordem**: `onAssignTeam` (decide o time) → `welcome` → `peerlist` → `onPeerJoined`.
4. O cliente recebe `welcome`, inicia a tela online e pode começar a jogar assim que o anfitrião iniciar a partida.

> 🔗 O link de convite contém o código da sala e as configurações da partida. O cliente pode entrar automaticamente ao abrir o link.

## Reconexão, migração e ping
- **Queda passageira:** o cliente espera 1,5 s e tenta reconectar no **mesmo** anfitrião com `reconnectRequest` (timeout de 4 s). Se falhar, parte para a migração.
- **Migração de anfitrião:** o cliente com o **menor slot** entre os que sobraram vira o novo anfitrião, com id derivado do código (`código + "-mig"`); os outros reconectam nele.
- **Ping:** a cada 3 s cada lado manda `ping`; `pingStats[slot]` (no anfitrião) e `hostLatency` (no cliente) guardam o resultado, mostrado no placar como 📶.
- **Dados parados** (`main.js`): sem novidade do anfitrião há **5 s** → aviso; há **10 s** → `forcarReconexaoPorDadosParados` fecha a conexão e o fluxo de reconexão assume; se **nada** chegou desde a entrada, espera 20 s antes de agir.

## Pacotes de estado (`type: 'state'`)
Dois formatos, ambos com `type: 'state'`, tratados por `applyRemoteState` (`loop.js`), que só sobrescreve o que veio (`msg.campo ?? state.campo`).

**Frequente** — a cada `tick` (`broadcastState`): `snakes, foods, scores, foodsEaten, eliminations, alive, boosting, show, showOthers, count, mission, best, dirs, shake, flash, toast, hunterActive, hunterSnake`.

**Raro** — **uma única vez**, quando a partida começa (logo depois da contagem regressiva): `colors, names, heads, patterns, palettes, trailColors, mapW, mapH, theme, teamMode, teams`. Ficou separado pra manter o pacote frequente pequeno (pacotes grandes já causaram falhas silenciosas em mapa grande).

> ⚠️ **Ponto frágil conhecido:** como o pacote raro nunca é reenviado, quem **entra ou reconecta depois do início da partida** (ou perde esse pacote) fica sem nomes, cores, tamanho do mapa, tema e times. Uma correção natural é reenviá-lo para o cliente quando ele entra/reconecta e/ou de tempos em tempos.

## Regras para mexer no protocolo
- **Campo novo no estado:** adicione no `broadcastState` (ou no pacote raro, se quase nunca muda) **e** no `applyRemoteState`, com o `??`/`||` para não apagar o que já existe. E rode o teste `tests/online-basico.mjs`.
- **Mensagem nova:** trate nos **dois** lados e atualize esta página.
- **Nunca** deixe `catch {}` vazio em envio de rede: `broadcastRaw` guarda tentativas/falhas em `sendDiag`, que aparece no painel 🩺 do anfitrião.
- Lembre: o `render.js` roda nos dois lados; se algo depende só de dados que o anfitrião calcula no `tick`, o cliente não vê.


## V4.5.9
- `onlineMapMode` identifica sorteio ou escolha manual do mapa.
- `mapW` e `mapH` seguem também nos estados frequentes porque podem crescer durante a partida.
- O nome do convidado é repassado no callback de entrada para manter o nome real no lobby e no placar.
