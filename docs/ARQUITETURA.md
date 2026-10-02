# Arquitetura

Visão de cima. Para "qual arquivo tem o quê", veja `MAPA-DO-CODIGO.md` (gerado); para regras de trabalho, o `AGENTS.md` na raiz.

```
 navegador
   index.html ──carrega──► css/style.css
        │        ├─ <script> PeerJS 1.5.4 (CDN)
        │        └─ <script type="module"> js/main.js?v=VERSÃO
        ▼
   main.js  (liga a tela: botões, abas, sala online)
      ├──► loop.js   (o jogo: iniciar, tick, caçadora, pacotes online) ──► render.js (desenho)
      │        ├──► state.js   (o objeto único que todos leem/escrevem)
      │        └──► ai.js · food.js · mission.js · sound.js · storage.js · teams.js
      └──► net.js    (rede PeerJS)   ·   players.js · input.js · leaderboard.js · share.js · tutorial.js · utils.js
   sw.js (service worker) + version.txt  →  modo offline e atualização automática
```

## 1. Carregamento
O `index.html` carrega o CSS, o PeerJS (CDN) e o `js/main.js` como **módulo** (`?v=VERSÃO` na URL, para furar cache). O `main.js` importa todo o resto. Não há bundler nem etapa de build: o que está na pasta é o que roda.

## 2. Telas e links
- Duas telas no HTML, `menu` e `game`; `switchScreen` (em `loop.js`) alterna.
- O menu tem 5 abas (Jogar, Personalizar, Online, Ranking, Conquistas). **Cada aba tem seu link** (`?tab=online`) e o botão "voltar" do navegador troca de aba (`switchToTab`, em `main.js`).
- **Link de convite de sala:** `?room=CÓDIGO&mode=…&map=…&diff=…&theme=…&noWalls=…` (e `&fmt=teams&ta=N&tb=N` em partida de times). Quem abre cai direto na aba Online, com o código preenchido; toca em **ENTRAR NO JOGO** para entrar, sem PIN.

## 3. Partida local
`startGame` → `syncSettings` (lê o menu e joga no `state`) → `reset` (cria as minhocas com `spawn`) → contagem regressiva → `setInterval(tick)`.

## 4. O `tick()` (em `loop.js`)
É um passo do jogo. Principais etapas (a ordem exata está no código): checar missões e a caçadora → mover cada minhoca (humanos pela direção pedida, CPUs por `aiDir`) → colisões (`kill`) → comer (pontos, combo, crescimento) → comida (`ensureFoods`, consolidação em estrelas, comida de sequência) → partículas → `render()` → **(anfitrião)** `broadcastState`.

## 5. Online
- O **anfitrião é a fonte da verdade**: cria a sala (o código da sala é o id do Peer dele), roda o `tick` e manda o estado.
- O **cliente** usa o código do link para chamar `joinRoomByCode`; salas novas sem PIN aceitam o pedido automaticamente. O cliente recebe `welcome` (posição + time) e passa a mandar **só entradas** (`dir`, `boost`…). Ele **não roda `tick`**: `applyRemoteState` copia o que chegou para o `state` local e chama `render`.
- Capacidade da sala: `setMaxPlayers` (6, ou a soma dos dois lados no modo Times).
- Robustez: reconexão automática, migração de anfitrião, ping, e detecção de "dados parados" com reconexão forçada (em `main.js`).
- Mensagens e fluxo completo: `PROTOCOLO-ONLINE.md`.

## 6. Desenho (`render.js`)
O canvas se ajusta ao tamanho da arena; a câmera segue a sua minhoca (`updateCamera`). Ordem: fundo do tema (cor, brilho central e decoração animada — `BOARD_THEMES` tem `bg`, `bg2`, `grid`, `food`, `accent`, `deco`) → grade → borda do mapa → comidas → minhocas (olhos, marcador de time) → caçadora (olhos, fumaça, seta na borda da tela, vinheta vermelha, batimento) → minimapa → avisos. O placar é HTML (`renderScores`), com a linha somada dos times. O painel 🩺 de diagnóstico também é montado aqui.

## 7. Times
`planTeams` (em `teams.js`, função pura) transforma "tamanho de cada lado + escolha de cada pessoa" em times. O anfitrião define `teamSizeMine`/`teamSizeOther`; cada amigo manda `teamPref` ao pedir entrada; `onAssignTeam` (em `main.js`) decide o time na hora da entrada; `startOnlineHostGame` (em `loop.js`) recalcula tudo ao começar e as **CPUs completam as vagas**. Cada time usa uma cor só. As escolhas ficam salvas no aparelho (`storage.js`).

## 8. Minhoca Caçadora e comidas especiais
- Aparece em marcos de comida (`HUNTER_MILESTONES`). `spawnHunter` cria o corpo (50 partes, `montarCorpoDaCacadora`); `updateHunter` faz ela perseguir o líder — ou quem usou turbo por perto —, mirar à frente, dar rajadas de velocidade, crescer ao pegar alguém e dar bônus a quem escapa por pouco.
- Comida de sequência vencedora: o jogo evoluiu bastante aqui por conta de mudanças de outra IA (ex: bônus do 2º lugar) — ver `js/loop.js` e `js/food.js` para o comportamento atual, em vez de confiar nesta descrição.
- Com 50+ comidas comuns espalhadas, grupos de 5 piscam e viram ⭐ (`checkFoodConsolidation` e `updateFoodConsolidation`, em `food.js`).

## 9. Cache, offline e atualização
- `sw.js` guarda os arquivos da lista `ASSETS` para funcionar offline. Para html/js/css usa **rede primeiro** (até 4 s) e cai pro cache; se não tiver nada, mostra "Sem conexão".
- `version.txt` **nunca** é guardado em cache. O `main.js` (`checarVersaoDeVerdade`) lê esse arquivo ao abrir, a cada 60 s e quando a pessoa volta pra aba; se for diferente da versão que está rodando e não houver partida, limpa os caches, desregistra o service worker e recarrega — é assim que todo aparelho se atualiza sozinho.

## 10. Dados salvos no aparelho
`storage.js` (chaves `snakeArena*`). A partida local salva (`SAVE_KEY` em `loop.js`) expira em 30 minutos; partida online nunca é salva.
