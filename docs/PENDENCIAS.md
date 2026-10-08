# O que ainda falta (pendências, ideias e o que nunca foi conferido)

Junto com o `CHANGELOG.md` (o que **já foi feito**) e `docs/DECISOES.md` (**por que** é assim), este arquivo diz **o que falta**. Terminou algo daqui? **Apague o item** e registre no `CHANGELOG.md`. Achou algo novo? **Acrescente aqui**, com o que já foi tentado.

## 🟡 Modo offline desligado (decisão do ChatGPT, vale conferir se é isso que o dono quer)
Ao abrir, o jogo **desregistra todos os Service Workers** (`navigator.serviceWorker.getRegistrations()` → `unregister()` em `main_stable_342.js`). Foi feito pra acabar com versão velha presa em cache, mas na prática o `sw.js` nunca roda e **o jogo não abre sem internet** (o `sw.js` e a lista de arquivos dele continuam sendo mantidos à toa). Se o offline voltar a ser desejado, é preciso parar de desregistrar e resolver o cache de outro jeito.

## ✅ Suíte de testes (08/10, v4.5.43): 0 arquivos vermelhos de 43
Os testes velhos com número de versão escrito à mão e buscas de texto desatualizadas foram corrigidos. Regra pra não voltar: teste novo lê a versão de `version.txt`, importa `js/main_stable_342.js` (não `main.js`) e prefere **executar** o jogo a procurar texto.

## 🟡 Suíte de testes desatualizada em relação às mudanças do ChatGPT (30/09)
Depois de centenas de commits de outra IA no mesmo dia (v2.94.10 → v3.6.6+), alguns testes antigos passaram a falhar — não por bug novo, e sim porque o comportamento que eles verificavam mudou de propósito:
- `nao-apaga-sala-ao-voltar.mjs`: o commit "Desativa reload automático do Service Worker e verificador de versão" parece ter desligado (ou mudado bastante) o mecanismo de auto-atualização que esse teste cobre. Precisa reler `js/main.js` (função `checarVersaoDeVerdade`) e `docs/ARMADILHAS.md`/`docs/DECISOES.md` (casos 30) pra entender o que ainda vale, e atualizar o teste (ou os documentos) de acordo.
- `melhorias-de-interface.mjs`: os testes da setinha da Minhoca Caçadora dão ângulo inválido (tipo `9948976424.99`) — a Caçadora passou por reformas bem grandes (config migrada pro "novo padrão", comida dos 50 alimentos, menos eficiente). Precisa reler o estado atual dela em `js/loop.js`/`js/state.js` e refazer o cenário de teste.
- `formatar-css.mjs`: o `css/style.css` cresceu bastante (não é mais estável rodando o formatador duas vezes) — provavelmente algum recurso novo de CSS que `tools/formatar-css.py` não trata direito ainda (parecido com o caso das expressões regulares, resolvido antes). Precisa investigar com um CSS mínimo reproduzindo o problema, igual foi feito da outra vez.
- `verificador-pega-erros.mjs` e `bump-versao-e-changelog.mjs`: alguns testes assumiam "o projeto limpo passa em TODAS as checagens" — mas agora há 3 avisos aceitos de propósito (os arquivos `_stable_*`, veja abaixo). Os testes precisam aprender a tolerar esses 3 avisos conhecidos, em vez de esperar zero.
Nenhum desses mexe com o jogo em si — só a suíte de testes ficou desatualizada. Não foram corrigidos agora porque não era o pedido da vez (trocar os visuais de cabeça) e mexer neles exigiria entender a fundo mudanças grandes feitas por outra IA.

## 🟡 Arquivos `js/*_stable_NNN.js` (criados pelo ChatGPT) sem explicação registrada
Existem 18 arquivos assim (`main_stable_334.js` até `342`, `loop_stable_334-336`, `render_stable_334-341`, `net_stable_360.js`) que ninguém importa e não estão no cache do Service Worker — o verificador aponta isso a cada checagem (3 avisos aceitos por enquanto). Parecem backups/pontos de restauração de um fluxo de trabalho do ChatGPT. **Não foram apagados** por precaução (podem ser necessários pra ele reverter algo) — mas vale perguntar/confirmar se ainda servem pra alguma coisa; se não, apagar e documentar por quê.

## 🔴 Bug em aberto: multiplayer real no celular
Com o anfitrião no PC e o amigo no celular, o celular não recebe os dados do jogo (embora o ping funcione e o anfitrião veja a minhoca do amigo se mexer). Sintoma, o que já foi tentado e o próximo passo mais útil (print do painel 🩺 **do anfitrião**) estão no fim de `docs/ARMADILHAS.md`. **Nunca foi conseguido esse print.** **Atualização:** entre a v2.84.0 e a v2.94.5 (outra IA), o multiplayer online passou por um rework grande — reenvio da configuração estável pra quem entra tarde (v2.85.0), slots fixos ao sair jogador (v2.86.0), lobby visual completo (v2.90.0/2.92.0). Nada disso foi testado em **aparelho real**; pode (ou não) ter mexido nesse bug. Vale re-testar do zero antes de investigar mais.

## 🟢 Correções e melhorias aplicadas na 2.89.0
- **Mobile:** opções secundárias da partida foram agrupadas em um menu de três pontos, reduzindo poluição visual e melhorando uso com uma mão.
- **Mobile:** cabeçalho inicial ficou mais compacto sem esconder ações essenciais.

## 🟢 Correções e melhorias aplicadas na 2.88.0
- **Navegação:** menu reorganizado em quatro áreas e Progresso unificado.
- **Configurações:** opções avançadas da partida escondidas até o usuário pedir e busca rápida adicionada.
- **Responsividade:** navegação mobile com barra inferior e navegação desktop preservada no topo.

## 🟢 Correções aplicadas na 2.87.0
- **Slots do multiplayer:** além de manter o slot preso à conexão, a criação de uma nova conexão agora procura o menor slot realmente livre. Isso evita colisão quando, por exemplo, o slot 1 sai e o slot 2 continua.
- **Aba Online:** adicionados presets de partida, diagnóstico rápido, ocupação da sala e saída controlada da sala.

## 🟢 Correção aplicada na 2.86.0
- **Slots do multiplayer:** corrigido o risco de os slots mudarem quando alguém sai da sala. O slot agora fica associado à própria conexão.

## 🟢 Melhorias aplicadas na 2.90.0
- **Lobby online:** lista visual em tempo real com jogadores, pronto, times e ping individual.
- **Configuração da sala:** resumo atualizado em tempo real.
- **Pronto:** anfitrião contado como pronto.
- **Slots:** visualização usa o slot real da conexão.

## 🟢 Melhorias aplicadas na 2.91.0
- **Resultado online:** placar detalhado sincronizado pelo anfitrião.
- **Revanche:** nova partida na mesma sala, sem recriar convite.
- **Clientes:** recebem a revanche pela contagem regressiva e não precisam sair/reentrar.

## 🟠 Pontos frágeis conhecidos (ainda não corrigidos)
- **Configuração estável — corrigida na 2.85.0.** Nomes, cores, tamanho do mapa, tema e times agora são enviados em `roomConfig` sempre que uma entrada é finalizada, inclusive em reconexões. O bug de estado que não chega ao celular continua em investigação.
- **Texto de qualidade da conexão — corrigido na 2.85.0.** Quando só existe `effectiveType`, a interface agora mostra "Qualidade estimada", sem chamar isso de tipo de rede.

## 🟡 Testes que existiam e foram perdidos (recriar em `tests/`)
Quando o ambiente de trabalho foi reiniciado, estes testes sumiram (só existiam lá). A funcionalidade continua no jogo, mas **sem teste**. Cada linha diz o que o teste verificava:
- **Fundos por tema:** cor de fundo e brilho central de cada um dos 9 temas, decoração animada de cada tipo (comparando com o tema Vazio, que não desenha nada), temas bem diferentes entre si, contraste das minhocas, prévia no menu, aviso do tamanho do mapa ao começar.
- **Minhoca Caçadora, as 10 melhorias:** rajada de velocidade, distração por turbo (perto distrai, longe não), mira à frente do alvo, crescimento a cada vítima, bônus de escapada (só depois de se afastar vivo), olhos, fumaça, vinheta, minimapa e batimento (mais rápido quanto mais perto).
- **Comida de sequência vencedora:** liga quando a caçadora some e o líder tem 25+ de vantagem, aparece 👑 valendo 10, desliga se a vantagem cair.
- **Consolidação de comida em estrela:** com 50+ comidas comuns, um grupo de 5 pisca e vira ⭐.
- **Rede:** reconexão direta sem trocar de anfitrião; migração de anfitrião quando ele some de vez; reconexão por "dados parados" (reproduzindo o canal que aceita enviar mas nunca entrega); aprovação manual de entrada continua exigida para gente nova.
- **Times online completos:** 2 × 2 com pedidos "com/contra", lado cheio, sala lotada recusando, cores por time, e a montagem com CPUs se movendo de verdade e o cliente recebendo os pacotes; modo Times **local** e "Todos contra Todos" iguais ao que eram.
- **Links por aba** (`?tab=`), botão voltar, e link de convite que abre na aba Online.
- **Auto-atualização:** versão nova no `version.txt` → limpa cache e desregistra o service worker; versão igual → não mexe em nada.
- **Service worker:** sem cache e sem rede, sempre responde (nunca `undefined`); casos normais continuam funcionando.
- **Ping e indicador de sinal 📶** no placar.

## 🟡 Ideias pedidas que **não** foram feitas
- **Do começo do desenvolvimento:** Modo Cooperativo; Lista de amigos favoritos; algumas melhorias específicas de Android/iPhone (só parcialmente feitas).
- **Das 15 melhorias online propostas** (feitas: sinal 📶, ping, aviso de conexão instável e reconexão automática): animação de entrada de minhoca nova; contorno piscando quando alguém entra/sai; coroa ou brilho no anfitrião; compactar os pacotes com nomes de campo curtos; enviar menos vezes quando ninguém se move; interpolação entre pacotes; priorizar a posição das minhocas no envio; histórico detalhado de partidas online (já existem o placar da sessão e o histórico de confrontos); botão de convidar mais gente durante a partida; trocar de anfitrião manualmente.

## 🔵 Nunca conferido em aparelho de verdade
Tudo o que é online foi testado só com **rede simulada**. Ainda precisa de teste com **dois aparelhos reais**: os times online (escolha, aviso de time, CPUs, marcadores ▲ ■, placar somado), a setinha da caçadora e o visual dos temas no celular (a velocidade e a quantidade das partículas foram escolhidas no olho, sem ver a tela).
- **Conquistas:** houve suspeita de que nem todas desbloqueiam em todos os cenários. Não foi verificado.

## ⚪ Melhorias de estrutura possíveis
- Os três maiores arquivos (`main.js`, `render.js`, `loop.js`) acumulam muita coisa; dividir por assunto facilitaria editar (veja os tamanhos em `docs/MAPA-DO-CODIGO.md`). Lembre: módulo novo entra no `ASSETS` do `sw.js` e nos guias (o verificador cobra).
- Sem teste próprio: `ai.js`, `mission.js`, `sound.js`, `storage.js` (incluindo as conquistas), `share.js`, `tutorial.js`, `leaderboard.js`, `players.js`, `input.js` e `food.js`.
