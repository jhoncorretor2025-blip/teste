# Mapa do código (GERADO — não edite à mão)

Gerado por `python3 tools/gerar-mapa.py`. Se você mexeu em algum módulo, rode de novo.

## Módulos em `js/`

| Módulo | Linhas | O que faz (comentário do topo) | Importa de |
|---|---:|---|---|
| `ai.js` | 79 | Cérebro das minhocas controladas por CPU. | `config`, `food`, `state`, `utils` |
| `config.js` | 291 | Configurações fixas do jogo — tamanho do tabuleiro, velocidade, cores etc. Se quiser deixar o jogo mais rápido, mexa no TICK. Se quiser mais/menos comida, mexa no NORMAL_FOODS. | — |
| `food.js` | 100 | Tudo sobre comida no tabuleiro: onde nasce, quando cai ao morrer, e as "partículas" de efeito visual. | `state` |
| `input.js` | 170 | Controles: teclado (setas / WASD / IJKL / personalizado), turbo (tecla ou botão de toque), joystick, D-pad de setas e arrastar o dedo (swipe) na tela. No modo online, o CLIENTE não controla o jogo direto — ele manda a direção pro anfitrião, que é quem realmente decide o que acontece (evita trapaça e mantém todo mundo sincronizado). | `config`, `loop`, `net`, `state`, `utils` |
| `leaderboard.js` | 49 | Mostra o ranking local: comparação de recordes entre quem já jogou nesse aparelho. Fica salvo só no navegador (localStorage), então funciona bem quando os amigos passam o mesmo celular de mão em mão pra jogar, cada um com seu nome. Clicando em "Ver ranking completo" expande de 5 pra até 20 posições, com data de quando cada um jogou. | `storage`, `utils` |
| `loop.js` | 1124 | O "coração" do jogo: nascer, resetar, iniciar partida e o tick (cada passo do jogo). | `ai`, `config`, `food`, `mission`, `net`, `players`, `render`, `sound`, `state`, `storage`, `teams`, `utils` |
| `loop_stable_334.js` | 1099 | O "coração" do jogo: nascer, resetar, iniciar partida e o tick (cada passo do jogo). | `ai`, `config`, `food`, `mission`, `net`, `players`, `render_stable_334`, `sound`, `state`, `storage`, `teams`, `utils` |
| `loop_stable_335.js` | 1286 | O "coração" do jogo: nascer, resetar, iniciar partida e o tick (cada passo do jogo). | `ai`, `config`, `food`, `mission`, `net`, `players`, `render_stable_335`, `sound`, `state`, `storage`, `teams`, `utils` |
| `loop_stable_336.js` | 1286 | O "coração" do jogo: nascer, resetar, iniciar partida e o tick (cada passo do jogo). | `ai`, `config`, `food`, `mission`, `net`, `players`, `render_stable_336`, `sound`, `state`, `storage`, `teams`, `utils` |
| `main.js` | 2398 | Antes de editar: leia o AGENTS.md na raiz do repositório e rode `npm test` antes de publicar. Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial. Este é o único arquivo carregado pelo index.html — ele importa todo o resto. | `config`, `input`, `leaderboard`, `loop`, `net`, `players`, `render`, `share`, `sound`, `state`, `storage`, `teams`, `tutorial`, `utils` |
| `main_stable_334.js` | 2386 | Antes de editar: leia o AGENTS.md na raiz do repositório e rode `npm test` antes de publicar. Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial. Este é o único arquivo carregado pelo index.html — ele importa todo o resto. | `config`, `input`, `leaderboard`, `loop_stable_334`, `net`, `players`, `render_stable_334`, `share`, `sound`, `state`, `storage`, `teams`, `tutorial`, `utils` |
| `main_stable_335.js` | 2386 | Antes de editar: leia o AGENTS.md na raiz do repositório e rode `npm test` antes de publicar. Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial. Este é o único arquivo carregado pelo index.html — ele importa todo o resto. | `config`, `input`, `leaderboard`, `loop_stable_335`, `net`, `players`, `render_stable_335`, `share`, `sound`, `state`, `storage`, `teams`, `tutorial`, `utils` |
| `main_stable_336.js` | 2430 | Antes de editar: leia o AGENTS.md na raiz do repositório e rode `npm test` antes de publicar. Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial. Este é o único arquivo carregado pelo index.html — ele importa todo o resto. | `config`, `input`, `leaderboard`, `loop_stable_335`, `net`, `players`, `render_stable_335`, `share`, `sound`, `state`, `storage`, `teams`, `tutorial`, `utils` |
| `main_stable_337.js` | 2430 | Antes de editar: leia o AGENTS.md na raiz do repositório e rode `npm test` antes de publicar. Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial. Este é o único arquivo carregado pelo index.html — ele importa todo o resto. | `config`, `input`, `leaderboard`, `loop_stable_336`, `net`, `players`, `render_stable_336`, `share`, `sound`, `state`, `storage`, `teams`, `tutorial`, `utils` |
| `main_stable_338.js` | 2441 | Antes de editar: leia o AGENTS.md na raiz do repositório e rode `npm test` antes de publicar. Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial. Este é o único arquivo carregado pelo index.html — ele importa todo o resto. | `config`, `input`, `leaderboard`, `loop_stable_336`, `net`, `players`, `render_stable_336`, `share`, `sound`, `state`, `storage`, `teams`, `tutorial`, `utils` |
| `main_stable_339.js` | 2442 | Antes de editar: leia o AGENTS.md na raiz do repositório e rode `npm test` antes de publicar. Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial. Este é o único arquivo carregado pelo index.html — ele importa todo o resto. | `config`, `input`, `leaderboard`, `loop_stable_336`, `net`, `players`, `render_stable_336`, `share`, `sound`, `state`, `storage`, `teams`, `tutorial`, `utils` |
| `main_stable_340.js` | 2442 | Antes de editar: leia o AGENTS.md na raiz do repositório e rode `npm test` antes de publicar. Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial. Este é o único arquivo carregado pelo index.html — ele importa todo o resto. | `config`, `input`, `leaderboard`, `loop_stable_336`, `net`, `players`, `render_stable_340`, `share`, `sound`, `state`, `storage`, `teams`, `tutorial`, `utils` |
| `main_stable_341.js` | 2442 | Antes de editar: leia o AGENTS.md na raiz do repositório e rode `npm test` antes de publicar. Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial. Este é o único arquivo carregado pelo index.html — ele importa todo o resto. | `config`, `input`, `leaderboard`, `loop_stable_336`, `net`, `players`, `render_stable_341`, `share`, `sound`, `state`, `storage`, `teams`, `tutorial`, `utils` |
| `main_stable_342.js` | 2494 | Antes de editar: leia o AGENTS.md na raiz do repositório e rode `npm test` antes de publicar. Ponto de entrada do jogo: liga os botões da tela e dá o "start" inicial. Este é o único arquivo carregado pelo index.html — ele importa todo o resto. | `config`, `input`, `leaderboard`, `loop_stable_336`, `net_stable_360`, `players`, `render_stable_341`, `share`, `sound`, `state`, `storage`, `teams`, `tutorial`, `utils` |
| `mission.js` | 98 | Sistema de missões — melhoria #3. Uma missão fica ativa por vez (aparece na faixa "🎯 ..." acima da arena). Qualquer jogador pode contribuir para completar; quem der o passo final ganha o bônus. Além de "comer" e "pegar estrela", também tem "sobreviver" (tempo) e "eliminar" (só aparece quando tem mais de 1 jogador, já que sozinho não tem quem eliminar). | `config`, `food`, `net`, `sound`, `state`, `storage`, `utils` |
| `net.js` | 449 | Multiplayer ONLINE (aparelhos diferentes), usando PeerJS (WebRTC ponto-a-ponto). Não precisa de servidor nosso: os navegadores se conectam direto um com o outro. Como funciona: - Quem cria a sala vira o "anfitrião" (host) — o jogo de verdade roda só no aparelho dele. - Quem entra na sala é "cliente" — só manda a direção que quer ir, e recebe de volta a posição de todo mundo pra desenhar na tela (n | — |
| `net_stable_360.js` | 556 | Multiplayer ONLINE (aparelhos diferentes), usando PeerJS (WebRTC ponto-a-ponto). Não precisa de servidor nosso: os navegadores se conectam direto um com o outro. Como funciona: - Quem cria a sala vira o "anfitrião" (host) — o jogo de verdade roda só no aparelho dele. - Quem entra na sala é "cliente" — só manda a direção que quer ir, e recebe de volta a posição de todo mundo pra desenhar na tela (n | — |
| `players.js` | 124 | Tudo relacionado à tela de configuração dos jogadores (menu inicial). | `config`, `net`, `state`, `utils` |
| `render.js` | 1957 | Tudo que é desenhado na tela (canvas): placar, tabuleiro, comidas, minhocas e partículas. O canvas se redimensiona sozinho pro tamanho real da caixa da arena — isso evita tanto distorção quanto sobra de espaço em branco, e deixa o jogo sempre do maior tamanho possível dentro do espaço disponível. CÂMERA: em mapas grandes, mostrar o tabuleiro inteiro deixaria tudo minúsculo. Por isso, se o mapa for | `config`, `net`, `players`, `sound`, `state`, `utils` |
| `render_stable_334.js` | 1878 | Tudo que é desenhado na tela (canvas): placar, tabuleiro, comidas, minhocas e partículas. O canvas se redimensiona sozinho pro tamanho real da caixa da arena — isso evita tanto distorção quanto sobra de espaço em branco, e deixa o jogo sempre do maior tamanho possível dentro do espaço disponível. CÂMERA: em mapas grandes, mostrar o tabuleiro inteiro deixaria tudo minúsculo. Por isso, se o mapa for | `config`, `net`, `players`, `sound`, `state`, `utils` |
| `render_stable_335.js` | 1975 | Tudo que é desenhado na tela (canvas): placar, tabuleiro, comidas, minhocas e partículas. O canvas se redimensiona sozinho pro tamanho real da caixa da arena — isso evita tanto distorção quanto sobra de espaço em branco, e deixa o jogo sempre do maior tamanho possível dentro do espaço disponível. CÂMERA: em mapas grandes, mostrar o tabuleiro inteiro deixaria tudo minúsculo. Por isso, se o mapa for | `config`, `net`, `players`, `sound`, `state`, `utils` |
| `render_stable_336.js` | 2010 | Tudo que é desenhado na tela (canvas): placar, tabuleiro, comidas, minhocas e partículas. O canvas se redimensiona sozinho pro tamanho real da caixa da arena — isso evita tanto distorção quanto sobra de espaço em branco, e deixa o jogo sempre do maior tamanho possível dentro do espaço disponível. CÂMERA: em mapas grandes, mostrar o tabuleiro inteiro deixaria tudo minúsculo. Por isso, se o mapa for | `config`, `net`, `players`, `sound`, `state`, `utils` |
| `render_stable_340.js` | 2280 | Tudo que é desenhado na tela (canvas): placar, tabuleiro, comidas, minhocas e partículas. O canvas se redimensiona sozinho pro tamanho real da caixa da arena — isso evita tanto distorção quanto sobra de espaço em branco, e deixa o jogo sempre do maior tamanho possível dentro do espaço disponível. CÂMERA: em mapas grandes, mostrar o tabuleiro inteiro deixaria tudo minúsculo. Por isso, se o mapa for | `config`, `net`, `players`, `sound`, `state`, `utils` |
| `render_stable_341.js` | 2392 | Tudo que é desenhado na tela (canvas): placar, tabuleiro, comidas, minhocas e partículas. O canvas se redimensiona sozinho pro tamanho real da caixa da arena — isso evita tanto distorção quanto sobra de espaço em branco, e deixa o jogo sempre do maior tamanho possível dentro do espaço disponível. CÂMERA: em mapas grandes, mostrar o tabuleiro inteiro deixaria tudo minúsculo. Por isso, se o mapa for | `config`, `net`, `players`, `sound`, `state`, `utils` |
| `share.js` | 97 | Gera um "cartão" de pontuação em imagem e compartilha (ou baixa) — melhoria #11. Não depende de nenhum servidor: desenha tudo num canvas escondido, na hora. | `state` |
| `sound.js` | 131 | Efeitos sonoros do jogo — não usa nenhum arquivo de áudio: os sons são gerados na hora pelo navegador (Web Audio API), então não precisa baixar nem hospedar nada extra. | — |
| `state.js` | 118 | Estado do jogo — tudo que muda durante uma partida vive aqui dentro. Todos os outros arquivos importam esse mesmo objeto "state" e leem/alteram ele. Os arrays por jogador vão até 6 posições (você + até 5 adversários). | `config` |
| `storage.js` | 440 | Tudo que o jogo guarda no navegador da pessoa (localStorage): recordes, perfil e configurações, conquistas, histórico de partidas, atalhos de teclado, escolhas de time. Cada dado tem seu par salvar/carregar; todos protegidos com try/catch, então se o navegador bloquear o armazenamento (aba anônima, por exemplo) o jogo segue funcionando. As chaves ficam nas constantes *_KEY de cada bloco — mude o N | `config` |
| `teams.js` | 82 | Montagem dos times na partida online. Lógica "pura" (sem tela, sem rede), pra ser fácil de testar e de entender: - o anfitrião define quantas minhocas tem em cada lado (contando CPUs); - quem entra escolhe: jogar NO time do anfitrião ("mine") ou no time ADVERSÁRIO ("other"); - se o lado escolhido já estiver cheio, a pessoa vai pro outro lado; - as vagas que sobrarem depois dos humanos viram CPU. O | — |
| `tutorial.js` | 18 | Tutorial rápido pra quem visita o jogo pela primeira vez — melhoria #9. Só aparece uma vez (guarda um "já vi" no navegador da pessoa). | `utils` |
| `utils.js` | 52 | Pequenas funções de apoio usadas em vários arquivos. | — |

## O que cada módulo exporta

- **`ai.js`**: `aiDir`, `hunterDir`, `reverse`, `safeMove`
- **`config.js`**: `ACHIEVEMENTS`, `BOARD_THEMES`, `BOOST_COOLDOWN`, `BOOST_DURATION`, `BOOST_KEYS`, `CK`, `COLORS`, `D`, `DIFFICULTY`, `HEAD_SHAPES`, `HUNTER_DEFAULTS`, `HUNTER_MILESTONES`, `ICONS`, `KD`, `MAP_SIZES`, `MAX_PLAYERS`, `MILESTONE_STEP`, `MISSIONS`, `REACTIONS`, `SKIN_PATTERNS`, `SNAKE_COLORS`, `SPECIAL_MILESTONES`, `SPEEDS`, `TEAMS`, `TOURNAMENT_ROUNDS`, `TOURNAMENT_ROUND_MS`, `TRICOLOR_PALETTES`, `TURBO_FACTOR`, `VERSION`, `W`, `ZOOM_LEVELS`
- **`food.js`**: `burst`, `checkFoodConsolidation`, `dropFood`, `dropOne`, `ensureFoods`, `freeCell`, `occupied`, `updateFoodConsolidation`, `wall`
- **`input.js`**: `setDir`, `setupInput`
- **`leaderboard.js`**: `renderLeaderboard`, `toggleLeaderboard`
- **`loop.js`**: `applyRemoteState`, `clearSavedGame`, `kill`, `loadSavedGame`, `montarCorpoDaCacadora`, `reset`, `resumeSavedGame`, `spawn`, `startClientGame`, `startGame`, `startOnlineHostGame`, `switchScreen`, `tryBoost`, `updateGamesPlayedBadge`, `updateHunter`, `updateSessionStatsDisplay`
- **`loop_stable_334.js`**: `applyRemoteState`, `clearSavedGame`, `kill`, `loadSavedGame`, `montarCorpoDaCacadora`, `reset`, `resumeSavedGame`, `spawn`, `startClientGame`, `startGame`, `startOnlineHostGame`, `switchScreen`, `tryBoost`, `updateGamesPlayedBadge`, `updateHunter`, `updateSessionStatsDisplay`
- **`loop_stable_335.js`**: `applyRemoteState`, `clearSavedGame`, `kill`, `loadSavedGame`, `montarCorpoDaCacadora`, `reset`, `resumeSavedGame`, `spawn`, `startClientGame`, `startGame`, `startOnlineHostGame`, `switchScreen`, `tryBoost`, `updateFiftyFoodEnemies`, `updateGamesPlayedBadge`, `updateHunter`, `updateSessionStatsDisplay`
- **`loop_stable_336.js`**: `applyRemoteState`, `clearSavedGame`, `kill`, `loadSavedGame`, `montarCorpoDaCacadora`, `reset`, `resumeSavedGame`, `spawn`, `startClientGame`, `startGame`, `startOnlineHostGame`, `switchScreen`, `tryBoost`, `updateFiftyFoodEnemies`, `updateGamesPlayedBadge`, `updateHunter`, `updateSessionStatsDisplay`
- **`main.js`**: _(nada — só efeitos ao carregar)_
- **`main_stable_334.js`**: _(nada — só efeitos ao carregar)_
- **`main_stable_335.js`**: _(nada — só efeitos ao carregar)_
- **`main_stable_336.js`**: _(nada — só efeitos ao carregar)_
- **`main_stable_337.js`**: _(nada — só efeitos ao carregar)_
- **`main_stable_338.js`**: _(nada — só efeitos ao carregar)_
- **`main_stable_339.js`**: _(nada — só efeitos ao carregar)_
- **`main_stable_340.js`**: _(nada — só efeitos ao carregar)_
- **`main_stable_341.js`**: _(nada — só efeitos ao carregar)_
- **`main_stable_342.js`**: _(nada — só efeitos ao carregar)_
- **`mission.js`**: `checkSurvivalMission`, `renderMission`, `startMission`, `trackDeathForMission`, `trackEliminationForMission`, `trackFoodForMission`
- **`net.js`**: `approveJoinRequest`, `broadcastRaw`, `broadcastState`, `connectedCount`, `disconnect`, `forcarReconexaoPorDadosParados`, `getConnectedPeers`, `hostLatency`, `hostRoom`, `isHost`, `isOnline`, `joinRoom`, `mySlot`, `pingStats`, `rejectJoinRequest`, `role`, `sendDiag`, `sendInput`, `setHandlers`, `setMaxPlayers`
- **`net_stable_360.js`**: `approveJoinRequest`, `broadcastRaw`, `broadcastState`, `connectedCount`, `disconnect`, `forcarReconexaoPorDadosParados`, `getConnectedPeers`, `getRoomCredentials`, `hostLatency`, `hostRoom`, `isHost`, `isOnline`, `joinRoom`, `joinRoomByCode`, `mySlot`, `pingStats`, `rejectJoinRequest`, `role`, `sendDiag`, `sendInput`, `setHandlers`, `setMaxPlayers`
- **`players.js`**: `label`, `makePlayers`, `syncSettings`
- **`render.js`**: `draw`, `getCameraDebug`, `getViewWindow`, `render`, `renderScores`
- **`render_stable_334.js`**: `draw`, `getCameraDebug`, `render`, `renderScores`
- **`render_stable_335.js`**: `draw`, `getCameraDebug`, `render`, `renderScores`
- **`render_stable_336.js`**: `draw`, `getCameraDebug`, `render`, `renderScores`
- **`render_stable_340.js`**: `draw`, `getCameraDebug`, `render`, `renderScores`
- **`render_stable_341.js`**: `draw`, `getCameraDebug`, `render`, `renderScores`
- **`share.js`**: `shareScoreCard`
- **`sound.js`**: `isMusicOn`, `isMuted`, `setMusicVolume`, `setMuted`, `setSfxVolume`, `sfx`, `toggleMusic`, `unlockAudio`
- **`state.js`**: `state`
- **`storage.js`**: `GAME_MILESTONES`, `addPlaytime`, `addToLeaderboard`, `formatPlaytime`, `incrementGamesPlayed`, `incrementSessionGames`, `loadAllModeBests`, `loadBest`, `loadBestByMode`, `loadBestLength`, `loadGamesPlayed`, `loadHunterSettings`, `loadLastPlayedAt`, `loadLeaderboard`, `loadMatchHistory`, `loadMuted`, `loadProfile`, `loadScoreHistory`, `loadSessionGamesToday`, `loadShortcuts`, `loadStreakDays`, `loadTeamPrefs`, `loadTotalPlaytime`, `loadUnlockedAchievements`, `loadVibration`, `recordGameScore`, `recordMatchResult`, `resetSettings`, `saveBest`, `saveBestByMode`, `saveBestLength`, `saveHunterSettings`, `saveMuted`, `saveProfile`, `saveShortcuts`, `saveTeamPrefs`, `saveVibration`, `trackCumulativeProgress`, `unlockAchievement`, `updateStreakAndLastPlayed`
- **`teams.js`**: `MAX_JOGADORES`, `planTeams`, `unifyTeamColors`
- **`tutorial.js`**: `maybeShowTutorial`, `setupTutorial`
- **`utils.js`**: `$`, `announce`, `dist`, `safe`, `setTapVibrationEnabled`, `setVibrationEnabled`, `tapVibrate`, `vibrate`

## Tipos de mensagem da rede (`net.js`)

Detalhes de quem manda o quê em `docs/PROTOCOLO-ONLINE.md`.

`chat`, `countdown`, `full`, `joinRequest`, `lobby`, `onlineMatchResult`, `peerlist`, `ping`, `pong`, `reaction`, `reconnectRequest`, `rejected`, `roomConfig`, `state`, `welcome`

## Campos do `state` (`state.js`) — 98 campos

Todo o jogo lê e escreve neste objeto único. Comentário = o que está escrito no código.

| Campo | Comentário |
|---|---|
| `count` | — |
| `types` | — |
| `names` | — |
| `controls` | — |
| `colors` | cor escolhida por cada jogador |
| `heads` | formato de cabeça |
| `patterns` | padrão de pele do corpo |
| `palettes` | cores usadas no padrão Tricolor |
| `teamMode` | modo times: aliados não se eliminam entre si |
| `teams` | qual time (0 ou 1) cada jogador está |
| `teamSizeMine` | partida online em Times: quantas minhocas no time do anfitrião (contando CPUs) |
| `teamSizeOther` | ...e quantas no time adversário |
| `teamPrefs` | preferência de time de cada humano, por slot ('mine' = com o anfitrião, 'other' = contra) |
| `touchControl` | controle de toque: 'joystick', 'dpad' ou 'swipe' |
| `zoom` | zoom da câmera — preferência pessoal, cada jogador ajusta o seu |
| `controlSize` | tamanho dos controles de toque (%), ajustável |
| `controlsSwapped` | inverter lado dos controles (bom pra canhotos) |
| `bigTextMode` | modo texto grande, interface mais simples |
| `lightMode` | modo claro da interface (menu), separado do tema do tabuleiro |
| `tapVibration` | vibração ao tocar nos botões (feedback tátil) |
| `customKeys` | teclas personalizadas por jogador (melhoria de mapeamento) |
| `show` | — |
| `showOthers` | — |
| `mode` | — |
| `mapSize` | tamanho do mapa escolhido no menu |
| `mapW` | dimensões reais do mapa atual (mudam junto com mapSize) |
| `foodCount` | — |
| `speed` | velocidade escolhida no menu |
| `noWalls` | — |
| `theme` | tema visual do tabuleiro (fundo, grade e comida) — antes era só cor de fundo |
| `vibrationOn` | vibração pode ser desligada separado do som |
| `difficulty` | — |
| `running` | — |
| `paused` | — |
| `muted` | — |
| `timer` | — |
| `snakes` | — |
| `alive` | — |
| `dirs` | — |
| `nextDirs` | — |
| `foods` | — |
| `scores` | — |
| `foodsEaten` | — |
| `grow` | — |
| `respawnAt` | — |
| `particles` | — |
| `shake` | — |
| `flash` | clarão vermelho ao morrer |
| `milestones` | maior marco de tamanho já comemorado |
| `toast` | {x, y, text, color, until} — texto flutuante de comemoração |
| `reactionToast` | {emoji, text, until} — reação rápida recebida de outro jogador |
| `floatingScores` | números "+1", "+5" etc. que sobem e desaparecem ao comer |
| `lastTurnAt` | quando cada minhoca virou por último — pro efeito "squash" na cabeça |
| `trailColors` | cor do rastro neon, separada da cor da minhoca |
| `nameColor` | cor do texto do SEU nome no placar (só o jogador 0/você) |
| `shortcuts` | atalhos de teclado remapeáveis |
| `amoledMode` | preto puro (#000), economiza bateria em telas OLED |
| `hunterConfig` | — |
| `hunterActive` | — |
| `hunterSnake` | segmentos dela, no mesmo formato de uma minhoca normal |
| `hunterDir` | — |
| `hunterEndsAt` | — |
| `hunterMilestoneIndex` | quantos marcos (100, 150...) já foram usados nessa partida |
| `diagAutoShown` | o painel 🩺 foi aberto sozinho (não pela pessoa) — some sozinho quando os dados chegarem |
| `diagManual` | a pessoa abriu o painel 🩺 de propósito — aí ele NÃO some sozinho |
| `secondPlaceBonusTarget` | jogador atualmente em 2º lugar que pode receber a sequência de bônus |
| `secondPlaceBonusRemaining` | quantas comidas especiais de 10 ainda podem nascer para esse 2º lugar |
| `secondPlaceBonusCollected` | quantas das comidas especiais o jogador já coletou nesta partida |
| `hunterBurstUntil` | até quando a rajada de velocidade atual dura (0 = sem rajada agora) |
| `hunterNextBurstAt` | quando a próxima rajada de velocidade pode começar |
| `hunterDistractedUntil` | até quando ela tá "distraída" perseguindo outro alvo (não o líder) |
| `hunterDistractedTarget` | o slot de quem a distraiu com o turbo (-1 = ninguém) |
| `hunterNearMiss` | por jogador: tá "por pouco" perto da caçadora agora? |
| `hunterCloseToAnyone` | pra piscar no minimapa quando ela chega perto de QUALQUER jogador |
| `boostUsedCount` | quantas vezes cada um usou o turbo nessa partida |
| `spawnedAt` | quando cada minhoca nasceu por último — pra conquista de sobreviver |
| `hunterVictims` | quem morreu enquanto a Minhoca Caçadora estava ativa nessa aparição |
| `receivedFirstState` | cliente: já recebeu o primeiro pacote de estado real do anfitrião? |
| `debugStatesReceived` | diagnóstico: quantos pacotes de estado o cliente já recebeu |
| `debugLastStateAt` | diagnóstico: timestamp do último pacote de estado recebido |
| `debugCountdownRecebidoAt` | diagnóstico: quando a contagem regressiva chegou (detecta "nunca recebeu nada depois disso") |
| `deathMessage` | {text, sub, until} — aviso grande de "Você morreu" pro jogador local; "sub" é uma segunda linha menor, usada pra "🎉 Novo recorde!" (melhoria #4) |
| `tournamentMode` | modo torneio: melhor de 3 rodadas |
| `tournamentRound` | rodada atual (1, 2 ou 3) |
| `tournamentWins` | quantas rodadas cada jogador já venceu no torneio |
| `tournamentRoundEndsAt` | timestamp de quando a rodada atual termina |
| `tournamentRoundScore` | pontos acumulados na rodada (não zera ao morrer, ao contrário do score normal) |
| `tournamentChampion` | índice de quem venceu o torneio (definido só quando termina) |
| `joyId` | — |
| `boosting` | — |
| `boostUntil` | — |
| `boostReadyAt` | — |
| `boostReadySoundPlayed` | evita tocar o aviso mais de uma vez por espera |
| `mission` | — |
| `best` | — |
| `eliminations` | — |
| `comboCount` | quantas comidas seguidas rápidas — combo de velocidade |
| `lastEatAt` | timestamp da última comida, pra calcular o combo |

## Elementos da tela (`index.html`) — 229 ids

O JS acha os elementos por `$('id')`. Ao remover/renomear um id, atualize o JS (o `verificar-projeto.py` confere).

`aboutBtn`, `aboutCloseBtn`, `aboutOverlay`, `aboutText`, `aboutVersionLine`, `achievementPopup`, `achievementSub`, `achievementsGrid`, `achievementsProgress`, `alive`, `amoledMode`, `appSplash`, `applyConfigCodeBtn`, `arenaCanvas`, `back`, `badge`, `batteryPercent`, `batteryStatus`, `bestByModeDisplay`, `bigTextMode`, `boardTheme`, `boostFuelCount`, `boostTouch`, `boostUsedDisplay`, `bootProgressBar`, `bootProgressDetail`, `bootProgressPercent`, `bootProgressStatus`, `bootRetryBtn`, `chatBox`, `chatInput`, `chatLog`, `chatSendBtn`, `clientReadyBtn`, `clientReadyOverlay`, `compactBtn`, `configCodeStatus`, `connectionTypeDisplay`, `connectivityWarning`, `continueBtn`, `controlSize`, `controlsSwapped`, `copyConfigCodeBtn`, `copyRoom`, `copyRoomCode`, `copyRoomPin`, `copyStatsBtn`, `count`, `countdownOverlay`, `countdownText`, `ctrlSizeDownBtn`, `ctrlSizeUpBtn`, `customCursorToggle`, `diagPanel`, `diagToggleBtn`, `difficulty`, `dpad`, `dpadDown`, `dpadLeft`, `dpadRight`, `dpadUp`, `endText`, `endTitle`, `faviconLink`, `focusModeBtn`, `game`, `gameAdvancedSettings`, `gameSettingsToggle`, `gamesPlayedBadge`, `genericInviteBtn`, `hostBtn`, `hostPanel`, `hostRoomCodeInput`, `hostRoomPinInput`, `hunterBodyLength`, `hunterBurstDuration`, `hunterBurstInterval`, `hunterDistractionRadius`, `hunterDuration1`, `hunterDuration2`, `hunterEnabled`, `hunterGrowth`, `hunterLiveBehavior`, `hunterLiveInfo`, `hunterLiveSummary`, `hunterPrediction`, `hunterSettingsBox`, `hunterSettingsStatus`, `hunterThreshold1`, `hunterThreshold2`, `installHelpBtn`, `installHelpCloseBtn`, `installHelpOverlay`, `installHelpText`, `joinApprovalOverlay`, `joinApprovalText`, `joinApproveBtn`, `joinBtn`, `joinCode`, `joinPin`, `joinRejectBtn`, `joinStatus`, `joinTeamChoice`, `joinTeamRow`, `joystick`, `landscapeHint`, `landscapeHintBtn`, `lastRoomBtn`, `leaderboardList`, `leaderboardToggle`, `leaveOnlineBtn`, `lightMode`, `mapSize`, `matchHistoryDisplay`, `menu`, `metaThemeColor`, `mission`, `mobileGameMenu`, `mobileGameMoreBtn`, `mode`, `musicBtn`, `musicVolume`, `mute`, `myName`, `myTeamColor`, `nativeShareRoom`, `noWalls`, `onlineClientLobby`, `onlineClientLobbyConfig`, `onlineClientLobbyPlayers`, `onlineClientLobbyStatus`, `onlineCount`, `onlineCountNum`, `onlineDiagBtn`, `onlineDiagDisplay`, `onlineFormat`, `onlineLobbyConfig`, `onlineLobbyDisplay`, `onlineLobbyPlayers`, `onlineLobbyStatus`, `onlineLobbySummary`, `onlineMatchStats`, `onlineQuickTools`, `onlineResultStats`, `overlay`, `pasteConfigCode`, `pause`, `pipBtn`, `pipVideo`, `playAgainSameRoomBtn`, `playSummaryDisplay`, `players`, `progressBestValue`, `progressGamesValue`, `progressLengthValue`, `progressRecordMini`, `progressSessionValue`, `quickRepeatBtn`, `reactionRow`, `readyStatusDisplay`, `refresh`, `renderErrorBanner`, `resetSettings`, `restart`, `resumeGameBtn`, `roomCapacityFill`, `roomCapacityText`, `roomCode`, `roomLobbyHint`, `roomPinDisplay`, `roomPreviewDisplay`, `roomSettingsPreview`, `roomStatus`, `scores`, `scoresBottom`, `screenshotBtn`, `sessionScoreDisplay`, `sessionStatsDisplay`, `settingsSearch`, `settingsSectionAppearance`, `settingsSectionControls`, `settingsSectionHunter`, `settingsSectionProfile`, `settingsSectionSound`, `sfxVolume`, `share`, `shareHero`, `shareScore`, `shortcutCompact`, `shortcutMute`, `shortcutPause`, `shortcutRestart`, `shortcutZoom`, `showMe`, `showOthers`, `silentModeBtn`, `speedSelect`, `srAnnounce`, `start`, `startFromHostPanel`, `startHero`, `stick`, `stickText`, `tapVibration`, `teamColorRow`, `teamMode`, `teamSizeHint`, `teamSizeMine`, `teamSizeOther`, `teamSizeRow`, `themePreview`, `topRecordDisplay`, `touch`, `touchControl`, `touchControlToggle`, `tournamentMode`, `tournamentRoundNum`, `tournamentSecondsLeft`, `tournamentStatus`, `tutorial`, `tutorialClose`, `updateBanner`, `updateBannerBtn`, `versionFooter`, `vibrationOn`, `welcomeBackDisplay`, `whatsappInvite`, `zoomLevel`, `zoomToggle`
