## [3.4.0] — 2026-09-30
- **Reconexão:** queda temporária dá até 8 segundos para reconectar antes de a CPU assumir.
- **Anfitrião:** após migração, o novo host retoma a sala automaticamente.
- **Placar online:** painel com posição, pontuação, comidas, eliminações, conexão e ping.
- **Resultado online:** ranking detalhado com medalhas, campeão, identificação de você e resumo geral da partida.

## [3.3.5] — 2026-09-30
- **50 comidas:** ao atingir 50 comidas, cada Mioquinha recebe uma Minhoca Inimiga exclusiva por 20 segundos.
- **Multiplayer:** várias inimigas podem ficar ativas ao mesmo tempo, uma para cada jogador que atingir a marca de 50.
- **Turbo:** quando o turbo está disponível e não está sendo usado, a Mioquinha do jogador pisca com o aviso `⚡ TURBO`.

## [3.3.4] — 2026-09-30
- **Correção definitiva de carregamento:** criada uma cadeia nova `main_stable_334.js → loop_stable_334.js → render_stable_334.js` para impedir que módulos gráficos antigos em cache continuem sendo executados.
- **Placar:** `rankOrder` passa a ser definido localmente dentro de `renderScores()`, inclusive quando existe apenas um jogador.

# Histórico do que já foi feito (CHANGELOG)

Este arquivo é a **memória do projeto**: qualquer IA (ou pessoa) lê aqui o que já foi feito antes de mexer, e registra o que fez depois. Mais recente primeiro.

## Como usar e manter
- **Ao terminar qualquer trabalho**, acrescente o que mudou em **"Não lançado"** (em português simples: o que mudou e, se não for óbvio, **por quê**).
- Ao trocar a versão (`python3 tools/bump-versao.py X.Y.Z`), a ferramenta **move** o conteúdo de "Não lançado" para a versão nova, com a data de hoje. Se "Não lançado" estiver vazio, ela deixa um lembrete `(descreva o que mudou nesta versão)` — e o `npm run verificar` **reprova** enquanto o lembrete estiver aí.
- Decisões e seus motivos: `docs/DECISOES.md`. O que falta fazer: `docs/PENDENCIAS.md`. Erros que já custaram caro: `docs/ARMADILHAS.md`.
- As versões antigas (até a 2.70) foram reconstruídas do histórico do Git: as mensagens de commit da época são curtas, então trazem o título e a data, não o detalhe. Para ver commit a commit: `git log`. Atenção: nas versões antigas cada arquivo enviado virou um commit com a mesma mensagem, por isso o Git mostra centenas de commits repetidos.
- As datas são as do primeiro commit de cada versão.

## Origem
O jogo nasceu em **30/08/2026** como um "Snake" (cobrinha) num único arquivo HTML, ganhou uma segunda cobrinha, modos, mapas, CPU, turbo e virou o **Snake Arena**. Em **31/08/2026** o código foi separado em módulos (v2.4.0) e o multiplayer online entrou logo depois (v2.5.0).

## [Não lançado]
*(mudanças que não trocam a versão do jogo: só documentação, ferramentas e testes)*
_(nada por enquanto)_

## [3.2.3] — 2026-09-30
- **Correção defensiva de renderização:** os efeitos gráficos novos agora são opcionais quando uma cópia antiga do módulo está presa em cache, evitando que um único efeito impeça a Mioquinha de ser desenhada.
- **Cache:** nova identificação `render.js?v=3.2.3` para forçar a carga do módulo gráfico atualizado.

## [3.2.2] — 2026-09-30
- **Correção de cache:** o `main.js` agora carrega o `render.js` com versão própria, evitando que o navegador reutilize um módulo gráfico antigo e provoque o erro `drawEnergyTrail is not defined`.

## [3.2.1] — 2026-09-30
- **Correção urgente:** o visual da v3.2.0 não carregava a Mioquinha porque a nova função `drawEnergyTrail` ficou dentro de `drawHead`. A função foi movida para o escopo correto, permitindo que o renderizador execute normalmente.

## [3.2.0] — 2026-09-30
- **Visual do jogo:** iluminação ambiental animada, profundidade e vinheta suave nos temas.
- **Minhocas:** rastro de energia, animação contínua da cabeça, reflexos e coroa do líder.
- **Comidas:** movimento, rotação, pulso e destaque das comidas especiais.
- **Mortes/partículas:** impacto visual ampliado e partículas variadas.
- **Minimapa:** varredura de radar animada.
- **Conquistas:** popup com entrada mais forte e anel luminoso.
- **Tela inicial:** splash com identidade visual e iluminação melhoradas.
- **Menu:** microinterações visuais nos cards e botão principal.

## [3.3.2] — 2026-09-30
- **Correção de carregamento do renderizador:** `main.js` e `loop.js` agora importam exatamente o mesmo `render.js?v=3.3.2`, evitando que o loop do jogo carregue uma cópia antiga do módulo e gere `rankOrder is not defined`.

## [3.3.1] — 2026-09-30
- **Correção do placar:** a ordem visual do ranking foi movida para o escopo correto de `renderScores()`, evitando o erro `rankOrder is not defined` e permitindo que a partida seja desenhada normalmente.
- **Cache:** `render.js` passou a ser carregado como v3.3.1 para impedir reutilização do módulo gráfico anterior.

## [3.3.0] — 2026-09-30
- **Skins:** 10 estilos de corpo, com 6 estilos temáticos novos: Neon, Fogo, Gelo, Galáxia, Elétrico e Veneno.
- **Rastros:** cada estilo tem uma assinatura visual própria; o turbo ganha partículas adicionais.
- **Comidas:** comidas normais, raras, épicas e lendárias passaram a ter distinção visual, sem alterar o valor dos pontos.
- **Mapas:** a arena reage visualmente à posição da sua Mioquinha conforme o tema.
- **HUD:** posições do ranking ganharam medalhas e destaque visual para o líder.

## [2.94.9] — 2026-09-30
- **Correção urgente:** criar uma sala no celular, trocar de app (por exemplo, pra mandar o link pelo WhatsApp) e voltar fazia a sala inteira sumir, como se o navegador tivesse recarregado do zero — precisando criar tudo de novo. Causa: os dois mecanismos de atualização automática (o do `version.txt` e o do Service Worker) só se seguravam contra recarregar durante uma PARTIDA rodando (`state.running`), mas não durante a ESPERA na sala (depois de criar, antes de apertar "Jogar") — que é exatamente quando a pessoa sai pra mandar o link. Se o jogo detectasse uma versão nova publicada nesse meio tempo, recarregava a página sem aviso, apagando a sala. Agora os dois também respeitam `net.isOnline()` (hospedando OU já numa sala, mesmo sem a partida ter começado); a atualização fica represada até a pessoa sair da sala de verdade (não se perde, só espera). Detalhes em `docs/ARMADILHAS.md` (caso 30).

## [2.94.8] — 2026-09-30
- **Correção urgente:** no celular, a barra de navegação (Jogar/Online/Progresso/Config.) ficava esticada pra ocupar a tela inteira em pé, cobrindo o conteúdo de baixo — inclusive o botão de começar a partida, por isso "Jogar" parecia não funcionar. Causa: sobrava uma regra de CSS antiga (`@media(max-width:600px)`, de um design de navegação anterior) definindo `position:sticky; top:0` pro `.tabBar`, e ela nunca foi removida quando uma regra nova (`@media(max-width:700px)`) foi criada com `position:fixed; bottom:8px`. Como todo celular comum bate nas duas media queries ao mesmo tempo, o navegador aplicava as duas juntas — um elemento fixo com "top" E "bottom" definidos se estica pra preencher o espaço entre os dois. Removida a regra antiga. No PC nunca dava esse problema (a tela é larga o bastante pra não bater em nenhuma das duas media queries de celular). Detalhes técnicos em `docs/ARMADILHAS.md` (caso 29).

## [2.94.7] — 2026-09-30
- **Correção de desempenho:** comer comida causava uma "travadinha", ficando pior conforme a partida avançava. Causa: depois de passar de 100 pontos, TODA comidinha comida (a partida inteira) tentava desbloquear a conquista "century" de novo, lendo o `localStorage` do zero a cada vez — e o progresso cumulativo (comidas/estrelas) também lia e gravava no `localStorage` a cada comidinha comum. `localStorage` é síncrono (trava a thread principal até terminar). Agora os dois ficam em cache na memória, e a gravação de verdade é represada (no máximo uma vez a cada meio segundo, mesmo comendo várias seguidas rapidamente) — nada se perde, ainda grava na hora quando desbloqueia uma conquista nova e também ao pausar/trocar de aba. Medido: 40 comidinhas seguidas, que antes causavam 40 leituras + até 40 gravações reais no disco, agora causam 1 leitura (a primeira) e 1 gravação represada.

## [2.94.6] — 2026-09-30
- **Correção urgente:** o jogo travava sempre na telinha de carregamento, com "Tentar novamente" repetindo o mesmo erro. Duas funções eram chamadas sem existir de verdade no momento certo: `updateOnlineLobbyUI()` (nunca tinha sido definida — virou um apelido de `renderOnlineLobby()`) e `TAB_ALIASES` (usada 250 linhas antes de ser declarada — movida pra cima). Detalhes técnicos em `docs/ARMADILHAS.md` (casos 26-27).
- **Novo, no verificador (checagem 13):** reprova qualquer chamada a uma função que não existe em lugar nenhum do projeto — é exatamente o tipo de erro que causou a trava acima. Rodar `npm run verificar` antes de publicar agora pega isso na hora.
- **CHANGELOG reorganizado:** outra IA tinha inserido pedaços em pontos soltos do arquivo (cabeçalhos duplicados, dois formatos de título, "Não lançado" no meio do arquivo). Reconstruído do zero preservando todo o conteúdo, ordenado e sem duplicação; acrescentada a versão 2.94.5, que estava sem registro.
- CSS reformatado de novo (`tools/formatar-css.py`) depois que a outra IA acrescentou bastante CSS novo sem seguir o padrão de uma declaração por linha; `docs/MAPA-DO-CODIGO.md` regenerado (tinha ficado desatualizado com os módulos/funções novos).

## [2.94.5] — 2026-09-29
- **Correção:** sobrava uma chave `}` de fechamento em `js/net.js` (no tratamento de mensagens de rede), quebrando a sintaxe do arquivo inteiro. Era um erro de sintaxe de verdade — o tipo que `node --input-type=module --check` pega na hora.

## [2.94.4] — 2026-09-29
- Correção e republicação do inicializador para forçar uma versão nova do carregador.
- Versão incrementada para evitar que navegadores mantenham o pacote antigo em cache.
- Mantida a captura de erro do carregamento para mostrar o erro real caso algum módulo falhe.

## [2.94.3] — 2026-09-29
- A tela inicial agora mostra explicitamente a versão do jogo antes do carregamento começar.
- Versão 2.94.3 usada como marcador visual para confirmar que o arquivo novo chegou ao aparelho.

## [2.94.2] — 2026-09-29
- Nova tela de inicialização com progresso visual: 0% → 10% → 20% → 30% → 45% → 50% → 70% → 90% → 100%.
- O carregador agora identifica quando o JavaScript principal ou o módulo online demora/trava.
- O erro fica visível na própria tela, com opção de tentar novamente, em vez de deixar o usuário preso na tela da cobra.
- PeerJS passou a ser carregado pelo inicializador para que a espera também seja visível.
- Cache e versão atualizados para 2.94.2.

## [2.94.1] — 2026-09-29
- Corrigida a ordem de declaração da configuração da Minhoca Inimiga.
- O erro de inicialização fazia o JavaScript parar antes de esconder a tela de abertura, deixando o celular preso no splash da Mioquinha.
- Atualizados os identificadores de versão/cache para 2.94.1.

## [2.94.0] — 2026-09-29
- **Nova central da Minhoca Inimiga:** criada uma seção própria em Configurações.
- **Timer de aparição:** permite definir quantos alimentos o líder precisa comer e por quantos segundos a inimiga permanece.
- **2 aparições configuráveis:** primeira e segunda aparição agora têm limite e duração independentes.
- **Comportamento configurável:** rajada, intervalo entre rajadas, distância de distração, antecipação da perseguição, crescimento por vítima e tamanho inicial.
- **Status em tempo real:** o painel informa se a inimiga está ativa/desativada e resume os parâmetros atuais.
- **Presets:** Normal, Difícil, Caos e Padrão.
- **Persistência:** as configurações ficam salvas no navegador e sobrevivem ao fechamento/reabertura do jogo.
- **Compatibilidade:** os valores padrão preservam o comportamento que já existia antes da nova aba.
- **Versão:** 2.94.0.

## [2.93.0] — 2026-09-29
- **Mapas/biomas:** adicionada uma camada real de decoração fixa no mundo, separada das partículas animadas.
- **Campo de Girassóis:** agora mostra girassóis desenhados no próprio Canvas, com caule, folhas, pétalas e centro.
- **Jardim de Flores:** agora mostra flores coloridas distribuídas pelo mapa.
- **Outros biomas:** Floresta ganhou árvores, Deserto ganhou cactos/rochas, Gelo ganhou pinheiros/rochas, Azul Profundo ganhou algas, Espacial ganhou pontos de profundidade, Roxo Noite ganhou vagalumes e Vazio ganhou detalhes sutis.
- **Estabilidade visual:** as posições das decorações são determinísticas por tema/tamanho do mapa, então elas não ficam trocando de lugar a cada frame.
- **Performance:** os objetos são formas simples de Canvas, aparecem apenas quando estão na área visível e não participam das colisões.
- **Fundos:** Espacial, Campo de Girassóis e Jardim de Flores receberam fundos mais visíveis, reduzindo a sensação de “mapa preto”.
- **Versão:** 2.93.0.

## [2.92.0] — 2026-09-29
- **Online — abandono protegido:** jogador que cai durante a partida não desloca os slots; uma CPU assume temporariamente e o retorno devolve o controle.
- **Online — confronto detalhado:** histórico 1×1 acumula partidas, vitórias, derrotas, taxa de vitórias, média de pontos, comidas e eliminações.
- **Online — lobby completo:** anfitrião e clientes visualizam jogadores, prontidão, times, conexão e configuração da sala.
- **Versão:** 2.92.0.
Este arquivo é a **memória do projeto**: qualquer IA (ou pessoa) lê aqui o que já foi feito antes de mexer, e registra o que fez depois. Mais recente primeiro.

## [2.91.0] — 2026-09-29
- **Online — resultado detalhado:** ao finalizar um torneio, o resultado agora mostra colocação, rodadas vencidas, comidas, eliminações e pontuação de cada jogador.
- **Online — resultado sincronizado:** o anfitrião envia o resultado final para todos os participantes, em vez de cada aparelho calcular uma versão diferente.
- **Online — revanche:** o anfitrião pode iniciar outra partida usando a mesma sala e os mesmos jogadores, sem novo convite.
- **Online — clientes:** quem não é anfitrião vê que a revanche está aguardando o anfitrião e entra automaticamente na nova contagem regressiva.
- **Versão:** atualizada para 2.91.0.

## [2.90.0] — 2026-09-29
- **Online — lobby visual:** lista em tempo real com jogadores, slot, anfitrião, pronto e ping.
- **Online — times:** o lobby mostra visualmente o time de cada jogador.
- **Online — configuração:** quem está na sala enxerga a configuração atual enquanto espera.
- **Robustez:** a visualização usa os slots reais das conexões.
- **Versão:** 2.90.0 e cache do Service Worker sincronizado.

## [2.86.0] — 2026-09-29
- **Multiplayer:** corrigido um erro de slot após saída de jogador. Os jogadores restantes agora mantêm seus slots originais; isso evita troca de controle/placar e reduz risco de problemas na migração do anfitrião.
- **Robustez:** a conexão guarda explicitamente seu slot para não depender da posição no array de conexões.

## [2.85.0] — 2026-09-29
- **Online:** a configuração estável da sala (nomes, cores, cabeças, skins, mapa, tema e times) agora é reenviada ao entrar e reconectar, evitando cliente tardio sem essas informações.
- **Online:** a configuração ficou separada do pacote frequente de estado, reduzindo a dependência do primeiro pacote raro.
- **Conexão:** quando o navegador só informa `effectiveType`, a interface agora chama isso de **qualidade estimada** em vez de sugerir que seja Wi-Fi ou dados móveis.
- **Robustez:** versão centralizada corrigida para `2.85.0`.

## [2.84.0] — 2026-09-29
- **Interface:** a tela inicial passa a exibir **Mioquinha** como nome do jogo, sem alterar o nome técnico do projeto.
- **Interface:** "Atualizar jogo" ficou mais claro como "Verificar atualização".
- **Correção:** removido o botão "Continuar partida anterior" duplicado no HTML, que tinha o mesmo id.
- **Celular:** destaque maior para Jogar e abas mais fáceis de tocar e navegar.
- **Visual:** ajustes pontuais na tela inicial, preservando a estrutura e os recursos existentes.

## [2.83.1] — 2026-09-28
- **Corrigido:** o corpo inicial da Minhoca Caçadora (50 partes) "dava a volta" pelo mapa quando ela nascia perto da borda de baixo, e a cauda reaparecia no topo, teletransportada (podia até matar alguém "do nada" lá em cima). Agora o corpo vai sempre para o lado do mapa com mais espaço (`montarCorpoDaCacadora`, função pura).
- Teste que cobre **todas** as posições de nascimento dos 3 tamanhos de mapa; a versão antiga falhava em 49 posições por mapa.

## [2.83.0] — 2026-09-28
- Painel 🩺 de diagnóstico abre sozinho ao entrar numa sala e **some sozinho quando os dados do jogo chegam** (se a pessoa abrir de propósito, fica).
- Setinha vermelha na borda da tela apontando a caçadora quando ela está fora da tela, com a distância em casas.
- Placar somado dos times ("🔵 Azul 17 × 7 Vermelho 🔴"); o time na frente aparece em dourado.
- Lembra no aparelho o tamanho de cada time e a escolha de quem entra. O **formato** (Times ou Todos contra Todos) **não** é lembrado, de propósito: ele também liga o modo Times do jogo local.
- Marcador de time na cabeça da minhoca: ▲ Azul, ■ Vermelho (ajuda quem tem dificuldade com cores).

## [2.82.0] — 2026-09-27
- Cada tema agora tem o **seu** fundo: cor, brilho central e decoração animada própria (estrelas, bolhas, areia, neve, esporos, faíscas, pétalas).
- Prévia do tema no menu; os tamanhos de mapa mostram as medidas; aviso do tamanho do mapa quando a partida começa.
- Contraste mínimo de 2,6 entre as cores das minhocas e a parte mais clara do fundo de cada tema (a roxa quase sumia no Gelo e nos Girassóis).
- Por quê: antes só a cor de fundo e a das linhas mudavam com o tema (escuras e parecidas), e as estrelinhas eram sempre as mesmas — parecia que só a comidinha trocava.

## [2.81.0] — 2026-09-27
- **Times online:** o anfitrião define quantas minhocas em cada time (1 a 3, contando CPUs); quem entra pelo link escolhe jogar no time do anfitrião ou no adversário; as vagas que sobram viram CPU.
- O popup de aprovação mostra a escolha e avisa se o lado está cheio; a sala recusa quem chega com ela lotada; todo mundo do mesmo time usa a mesma cor; quem entra é avisado do time em que caiu.
- Nova peça: `js/teams.js` (regras dos times, função pura e testada).

## [2.80.0] — 2026-09-27
- **10 melhorias da Minhoca Caçadora:** olhos vermelhos pulsantes; fumaça atrás do corpo; vinheta vermelha na tela quando ela chega perto; rajadas de velocidade; "corta caminho" (mira à frente de onde o alvo vai); batimento cardíaco que acelera; cresce +8 partes a cada vítima; distração (quem usa turbo a até 6 casas dela a desvia por 3 s); bônus +3 de "escapou por pouco"; ponto piscante com anel no minimapa quando ela está perto de qualquer jogador.
- Fumaça, vinheta e batimento são calculados no `render.js` (e não no `tick`) porque partículas só existem no anfitrião — assim aparecem também no celular do amigo.

## [2.79.0] — 2026-09-27
- Som dramático de "chefe chegando" quando a caçadora aparece; ela passa a nascer com 50 partes.
- **Comida de sequência vencedora:** depois que a caçadora some, se o líder tem 25+ de vantagem, uma coroa 👑 valendo 10 aparece a cada 15 s (desliga se a vantagem cair).
- **Consolidação:** com 50+ comidas comuns espalhadas, grupos de 5 piscam e viram uma ⭐.

## [2.78.0] — 2026-09-20
- Auto-atualização de verdade: o jogo consulta `version.txt` direto da rede (sem cache) ao abrir, a cada 60 s e quando a pessoa volta pra aba; se a versão for outra e não houver partida, limpa os caches e recarrega.

## [2.77.0] — 2026-09-20
- Serialização JSON forçada nas conexões. Hipótese na época: o ping (mensagem pequena) chegava, mas o pacote de estado (grande) não. **Não ficou confirmado que isso resolveu** o bug do celular (veja `docs/ARMADILHAS.md`).

## [2.76.0] — 2026-09-20
- Reconexão automática: o cliente detecta "dados parados" (aviso em 5 s, reconecta em 10 s) e reconecta com `reconnectRequest`, que **entra direto, sem nova aprovação** do anfitrião.

## [2.75.0] — 2026-09-19
- Ping em tempo real e indicador de sinal 📶 no placar; aviso de conexão instável; tentativa de reconexão direta antes de migrar o anfitrião.

## [2.74.0] — 2026-09-19
- Diagnóstico de envio no painel 🩺 do anfitrião (`sendDiag`): tentativas, sucessos, falhas e último erro. Motivo: um `catch {}` vazio escondia erros de envio.

## [2.73.0] — 2026-09-18
- Cada aba do menu tem link próprio (`?tab=online`); o botão "voltar" do navegador troca de aba; link de convite de sala cai direto na aba Online.

## [2.72.0] — 2026-09-18
- **Urgente:** o service worker podia responder "nada" (`respondWith` com `undefined`) quando não havia cache nem rede; agora sempre responde, com a página "Sem conexão" como último recurso. (Bug introduzido pela 2.71.0.)

## [2.71.0] — 2026-09-17
- O nome do cache do service worker estava travado em v2.55; passou a usar "rede primeiro" para html/js/css e a checar atualização ativamente.

## [2.70.0] — 2026-09-14
- Protecao contra minhoca viva sem dados (evita travar desenho inteiro) + diagnostico automatico

## [2.69.0] — 2026-09-13
- Camera segue qualquer minhoca viva (nao so o centro do mapa) + mais dados no diagnostico

## [2.68.0] — 2026-09-13
- Reduz pacote de rede por tick (mapas grandes) + botao de diagnostico

## [2.67.0] — 2026-09-13
- Corrige overlay de pronto travado cobrindo o jogo + roundRect global

## [2.66.0] — 2026-09-13
- Painel de diagnostico visivel + mensagem de erro especifica

## [2.65.0] — 2026-09-13
- Polyfill roundRect + protecao contra erro de desenho — corrige tela preta em celulares

## [2.64.0] — 2026-09-13
- ResizeObserver robusto pra tela preta + botao pronto centralizado

## [2.63.0] — 2026-09-13
- Corrige tela preta de quem entra na sala (canvas 1x1 antes da transicao)

## [2.62.0] — 2026-09-12
- Fallback de compatibilidade — corrige trava quando ha versao antiga em cache

## [2.61.0] — 2026-09-12
- Corrige bug de conexao travada + aprovacao de entrada + formato times/FFA

## [2.60.0] — 2026-09-10
- Atalhos remapeaveis, cursor personalizado, PiP, F11, transicao de tema

## [2.59.0] — 2026-09-09
- Galeria de Conquistas visual + cor do nome no placar

## [2.58.0] — 2026-09-09
- Minimapa sempre visivel, comida/minhocas maiores e com contorno

## [2.57.0] — 2026-09-08
- Online: pronto, migracao de anfitriao, historico, placar sessao, previa sala

## [2.55.0] — 2026-09-08
- Salvar/retomar partida + placar embaixo do mapa

## [2.54.0] — 2026-09-08
- Botoes de tamanho de controle in-game, fonte responsiva, notificacao amigo entrou

## [2.53.0] — 2026-09-08
- Indicador wifi/dados, aviso sem internet, cache offline mais robusto

## [2.52.0] — 2026-09-08
- Temas Campo de Girassois e Jardim de Flores

## [2.51.0] — 2026-09-08
- Girassol e rosa, cor aleatoria, som drop, resumo, AFK, contorno solo

## [2.50.0] — 2026-09-07
- Minhoca Cacadora - aparece aos 100/150 comidinhas, persegue o lider

## [2.49.0] — 2026-09-07
- Vibracao vitoria/derrota, aviso de borda, combustivel turbo, confirmar codigo, modo silencioso

## [2.48.0] — 2026-09-07
- Placar com Voce e Humano/CPU, aviso turbo, jogar de novo mesma sala, lembrar ultima sala

## [2.47.0] — 2026-09-07
- Travar orientacao em paisagem automatico, funciona sem instalar app

## [2.46.0] — 2026-09-07
- Corrige atraso do turbo + duplo toque no modo swipe

## [2.45.0] — 2026-09-07
- Estatisticas de sessao, tempo jogado, cor de rastro separada

## [2.44.0] — 2026-09-07
- 10 melhorias graficas para celular

## [2.43.0] — 2026-09-07
- Combo de velocidade e missoes de sobreviver/eliminar
- Combo de velocidade + missoes de sobreviver e eliminar

## [2.42.0] — 2026-09-07
- Indicador de lider, recordes por modo, loading com spinner

## [2.41.0] — 2026-09-07
- Aviso sonoro do turbo quase pronto

## [2.40.1] — 2026-09-07
- Correcao critica: main.js referenciava funcoes inexistentes, quebrava o site

## [2.40.0] — 2026-09-07
- Dificuldade granular, loading visivel, duplo toque turbo

## [2.39.0] — 2026-09-06
- Splash screen e icone novo
- Splash screen e icone novo: icon.svg

## [2.38.0] — 2026-09-06
- Indicador de bateria e aviso de bateria baixa

## [2.37.0] — 2026-09-06
- Sugestao paisagem, print de tela, modo sem distracao

## [2.36.0] — 2026-09-06
- Copiar estatisticas, codigo de config, instrucoes de instalar

## [2.35.0] — 2026-09-06
- Area segura, tema auto, transicao suave, ondinha, fonte de jogo, aviso vibracao, confirmar saida

## [2.34.0] — 2026-09-06
- Esconde cabecalho no jogo + borda visivel do mapa

## [2.33.0] — 2026-09-06
- Chat de texto simples no online
- Correcao: net.js faltou no deploy do chat

## [2.32.0] — 2026-09-06
- Modo Torneio completo - melhor de 3 rodadas

## [2.31.0] — 2026-09-06
- Temas, modo claro, rastro neon, favicon, conquista animada, corte de bug do torneio

## [2.30.2] — 2026-09-04
- Aviso nao interrompe jogo + reacoes somem no modo compacto

## [2.30.1] — 2026-09-04
- Corrige tela cheia/turbo/mais compartilhamento

## [2.30.0] — 2026-09-04
- 10 melhorias de celular

## [2.29.0] — 2026-09-03
- Menu com abas, botao Jogar em destaque, recorde no topo

## [2.28.1] — 2026-09-03
- Correcao urgente: botao Jogar travando

## [2.28.0] — 2026-09-03
- Zoom da camera ajustavel + correcao de bug

## [2.27.0] — 2026-09-03
- Ate 6 jogadores, swipe, teclas custom, volumes, texto velocidade

## [2.26.0] — 2026-09-03
- Confete, cor de fundo, som drop, vibracao, copiar codigo, contador online, conquistas

## [2.25.0] — 2026-09-03
- Ranking expansivel

## [2.24.0] — 2026-09-03
- Marcos especiais + paletas de cor

## [2.23.0] — 2026-09-03
- Novos bichinhos + padrao tricolor

## [2.22.0] — 2026-09-03
- Camera sempre segue + modo Times mais visivel

## [2.21.0] — 2026-09-02
- Botao de trocar controle direto no jogo

## [2.20.0] — 2026-09-02
- Minimapa + cabeca de gatinho
- Bump versão

## [2.19.0] — 2026-09-02
- Resumo de configuracoes na sala online

## [2.18.0] — 2026-09-02
- Modo Times

## [2.17.0] — 2026-09-02
- Camera segue a minhoca em mapas grandes
- Bump versão

## [2.16.0] — 2026-09-02
- Corrige minhoca do amigo nao virar + respawn seguro + botao na sala

## [2.15.0] — 2026-09-02
- Botão de atualizar maior + aviso automático

## [2.14.0] — 2026-09-02
- Controle por setas no celular

## [2.13.0] — 2026-08-31
- Reconexão automática

## [2.12.1] — 2026-08-31
- Corrigir entrar em sala com link colado

## [2.12.0] — 2026-08-31
- Tamanho de mapa configurável

## [2.11.0] — 2026-08-31
- Modo compacto/tela cheia

## [2.10.0] — 2026-08-31
- Ranking, compartilhar e reset

## [2.9.1] — 2026-08-31
- Dica estratégica do turbo

## [2.9.0] — 2026-08-31
- Corrigir tamanho da tela + turbo mais rápido

## [2.8.1] — 2026-08-31
- Corrigir layout mobile

## [2.8.0] — 2026-08-31
- Velocidade e skin configuráveis

## [2.7.0] — 2026-08-31
- Ajuste de velocidade + 7 melhorias
- Ajuste de velocidade + 7 melhorias: icon.svg

## [2.6.0] — 2026-08-31
- Melhorias visuais

## [2.5.0] — 2026-08-31
- Multiplayer online

## [2.4.1] — 2026-08-31
- Melhorar layout mobile

## [2.4.0] — 2026-08-31
- **Marco: o código foi separado em módulos** por responsabilidade (`js/ai.js`, `config.js`, `food.js`, `input.js`, `loop.js`, `main.js`, `mission.js` e os demais), mais `index.html` e `css/style.css` — a base da estrutura de hoje. (No Git esta versão aparece só como commits automáticos, um por arquivo.)

## [2.2.3] — 2026-08-30
- Sincronizar versão e mobile UI
- Melhorar responsividade mobile

## [2.2.2] — 2026-08-30
- Padronizar textos e interface

## [2.2.1] — 2026-08-30
- Revisar textos da interface

## [2.2.0] — 2026-08-30
- Create stable game engine
- Use stable engine

## [2.1.2] — 2026-08-30
- Improve visual design system and responsive UI

## [2.1.1] — 2026-08-30
- Finalize minimap ranking missions collisions and smarter CPU
- Sync version and feature HUD

## [2.1.0] — 2026-08-30
- Features
- UI

## [2.0.0] — 2026-08-30
- Criar CSS separado do Snake Arena
- Criar lógica separada do Snake Arena
- Separar interface do Snake Arena em

## [1.16.0] — 2026-08-30
- Correção: food spawning and 5-point star
- Criar backup separado do Snake Arena

## [1.14.0] — 2026-08-30
- Add automatic Snake Arena patch workflow
- Correção: Snake Arena [auto-patch-v114]

## [1.13.0] — 2026-08-30
- Corrigir pontuacao crescimento e morte

## [1.12.2] — 2026-08-30
- Correção: start button and stabilize game

## [1.12.1] — 2026-08-30
- Correção: start button and game rendering

## [1.12.0] — 2026-08-30
- Show food count and preserve death drops

## [1.11.0] — 2026-08-30
- Correção: controls touch and snake rendering

## [1.10.1] — 2026-08-30
- Correção: death drops and controls; publish

## [1.10.0] — 2026-08-30
- Add small update button

## [1.9.3] — 2026-08-30
- Comida no lugar do corpo morto

## [1.9.2] — 2026-08-30
- Correção: keyboard controls

## [1.9.1] — 2026-08-30
- Correção: keyboard controls

## [1.9.0] — 2026-08-30
- Correção: game start error

## [1.8.0] — 2026-08-30
- Forcar atualizacao e cores dos jogadores
