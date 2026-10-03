# v4.5.7 — assistência para controle no celular
- **Novo:** no celular/tela de toque, a partida ganha uma margem de resposta de aproximadamente **15%**, dando mais tempo para virar e reduzindo mortes por atraso na reação.
- **Joystick mais responsivo:** a zona mínima para reconhecer o movimento caiu de 12px para 8px.
- **Controles maiores no celular:** joystick passou de 116px para 128px e turbo de 82px para 88px.
- **PC preservado:** essas mudanças de ritmo só entram quando o aparelho informa controle por toque; a velocidade escolhida no computador continua igual.
- Nenhum critério de conquista ou progresso foi alterado.

# v4.5.6 — ordem personalizada das conquistas
- **Novo:** dentro de cada categoria, as conquistas já **concluídas pelo jogador sobem para o primeiro lugar**.
- **Ordem preservada:** as concluídas mantêm a ordem original de dificuldade entre si, e as pendentes também mantêm a ordem original.
- Para um jogador novo, sem conquistas concluídas, a lista continua começando pela conquista mais fácil e seguindo a progressão normal.
- O número exibido no card acompanha a nova ordem visual.
- Nenhum critério, meta ou progresso salvo foi alterado.

# v4.5.5 — categoria Coleção para conquistas de longo prazo
- **Organização:** `Colecionador`, `Camaleão` e `Mestre dos Mapas` agora ficam na categoria **🏆 Coleção**.
- Essas conquistas exigem progresso acumulado entre partidas e desbloqueios ao longo do tempo, então ficam separadas dos desafios de uma única partida.
- Nenhum critério, meta ou progresso salvo foi alterado.

# v4.5.5 — conquista discreta no celular
- **Corrigido:** o aviso de conquista não fica mais grande e totalmente no meio da partida no celular.
- No celular, a conquista agora aparece em uma faixa menor, na parte superior central, com transparência e desfoque leves.
- O jogador continua vendo a conquista, mas consegue enxergar a arena por trás dela e jogar sem ter a área central bloqueada.
- No computador, o visual existente continua igual.

# v4.5.4 — criar sala não trava mais sem avisar
- **Corrigido:** no modo simples da aba Online, quando algo dava errado ao criar a sala, a tela ficava presa em "⏳ Criando sua sala..." pra sempre, sem mostrar o motivo (os avisos iam pra um campo escondido nesse modo).
- Agora o aviso aparece onde a pessoa está olhando, em português simples: sem internet, servidor de salas inacessível, módulo online não carregou, etc.
- Se o código sorteado já estiver em uso, o jogo tenta outro sozinho (até 6 vezes), sem a pessoa perceber.
- Tempo limite de 15 segundos: se o servidor de salas não responder, avisa e libera o botão de novo (antes travava pra sempre).
- O modo simples sempre cria sala **aberta** (sem senha) com código novo: uma senha ligada antes no modo completo, ou um código antigo ainda preso no servidor, não quebram mais a criação rápida.
- Versões acertadas: `config.js` e `sw.js` estavam em 4.5.1 enquanto `version.txt` e `index.html` estavam em 4.5.3 — agora todos em 4.5.4.
- Novos testes que **executam o jogo de verdade** no arquivo que roda (`js/main_stable_342.js`): `tests/criar-sala-real.mjs` (19 checagens, incluindo falhas) e `tests/online-ponta-a-ponta-real.mjs` (anfitrião cria → amigo abre o link e entra → partida começa → amigo recebe o jogo).

# v4.5.3 — correção da criação rápida da sala
- Corrigido o botão **🏠 Criar sala rápida** do modo simples.
- A criação agora continua mesmo se o preset casual encontrar algum campo incompatível.
- O botão rápido usa o mesmo fluxo real de criação de sala do modo complexo, evitando duplicação da lógica.
- Mantido o Modo complexo e todas as opções existentes.

# v4.5.2 — online simples e convite por link
- A aba **🌐 Online** agora começa no **Modo simples**, com apenas criar sala rápida, copiar link e entrar por convite.
- O **Modo complexo** mantém todas as configurações avançadas, times, presets, diagnóstico, segurança e lobby.
- Links de sala agora iniciam automaticamente a entrada do convidado, sem exigir que ele procure a aba Online e clique manualmente.
- Mantido o fluxo existente de salas e a compatibilidade com as opções avançadas.

# v4.5.1 — correção visual da v4.5.0
- Aplicado o acabamento visual das novas funções de Conquistas, incluindo barra geral, filtros e alto contraste.
- Ativados visualmente o brilho da sequência, a barra de XP da tela inicial, as prévias da Loja e os indicadores de teclado.
- Mantida a correção de feedback tátil da v4.5.0.

# v4.5.0 — Conquistas e acessibilidade
- Filtros rápidos na galeria: **Todas, Concluídas e Em andamento**.
- Barra visual geral com percentual e contagem dinâmica das conquistas.
- Novo agrupamento de dicas/avisos no cabeçalho por meio de botão de informações.
- XP agora aparece também na tela inicial com barra preenchível.
- Sequência ativa ganhou destaque visual com brilho/animação.
- Loja mostra miniaturas dos mapas especiais, inclusive quando bloqueados.
- Adicionado **Alto contraste** persistente nas configurações, com reforço visual da arena e canvas.
- Adicionados indicadores de teclado na tela da partida no PC.
- Comer comida comum agora também fornece feedback tátil curto; o feedback de dano/morte existente foi preservado.
- Navegação móvel mantém cinco áreas na ordem **Jogar, Loja, Progresso, Online e Config.**

# v4.4.1 — conquistas iniciantes renovadas
- **Bom Apetite:** agora exige 20 pontos de comida em uma partida.
- **Aguentou Firme:** agora exige 45 segundos sem morrer.
- **Crescendo:** agora exige 30 segmentos na mesma partida.
- **Estrela Cadente:** continua sendo a primeira estrela.
- **Chuva de Estrelas:** nova conquista iniciante para pegar 10 estrelas na mesma partida.
- Os antigos objetivos de 10 comidas, 30 segundos, 15 segmentos e 25 comidas foram aposentados para não deixar conquistas antigas marcadas como concluídas com critérios diferentes.

# v4.4.0 — nova tela inicial e Loja direta
- Adicionada a **🛒 Loja** como opção do menu principal, também na navegação inferior do celular.
- A tela inicial agora reúne moedas, nível, Liga, Desafio do Dia, sequência de dias e resumo do progresso.
- Adicionado resumo completo da próxima partida, incluindo velocidade, mapa, dificuldade, modo e Minhoca Inimiga.
- A escolha da Minhoca Inimiga ganhou dois cartões rápidos para ativar ou desativar sem abrir as configurações avançadas.
- Adicionadas prévia visual do mapa, preços dos mapas premium, prévia da Minha Mioquinha e próxima conquista.
- O botão principal passou a destacar **🚀 JOGAR AGORA** e os atalhos de Loja, Personalização e Progresso ficaram disponíveis na própria tela inicial.
- Mantidos os dados existentes de moedas, compras, progressão, conquistas e multiplayer.

# v4.3.0 — novas conquistas para a progressão
- Adicionadas 18 conquistas novas ligadas à Minhoca Caçadora, zonas de fuga, moedas, Loja, mapas especiais, fantasias, Liga, sequência, Desafio do Dia e número de partidas.
- A Loja agora registra moedas ganhas e moedas gastas ao longo do tempo para permitir conquistas cumulativas.
- As conquistas de loja e progressão são verificadas automaticamente e aparecem no mesmo aviso animado da galeria.
- Mantidas as conquistas já existentes e todo o progresso salvo anteriormente.

# v4.2.2 — correção final da Loja
- Corrigido o erro que impedia a Loja de renderizar os itens.
- Adicionados os arrays persistentes de mapas e fantasias desbloqueados.
- Corrigida a exibição dos itens bloqueados/desbloqueados na Loja.
- Corrigado o bloqueio dos mapas premium no seletor.
- Mantidos a Minhoca Inimiga opcional e as 3 zonas de fuga de 3 segundos.

# v4.2.1 — correção da Loja e desbloqueios
- Corrigida a integração da Loja com a progressão do jogador.
- Mapas e fantasias agora podem ser comprados com moedas e ficam desbloqueados no navegador.
- Mapas premium ficam bloqueados no seletor até a compra.
- Fantasias premium ficam bloqueadas na personalização até a compra.
- Após comprar uma fantasia, a personalização é atualizada automaticamente.
- Mantidos a Minhoca Inimiga opcional e as 3 zonas vermelhas de 3 segundos.

# v4.2.1 — correção da Loja
- Corrigida a integração entre a Loja e o módulo de progressão: mapas e fantasias agora possuem desbloqueio e compra por moedas.
- Corrigido o bloqueio visual dos mapas premium no seletor.
- Corrigida a atualização das fantasias depois da compra.
- Mantida a escolha da Minhoca Inimiga, as 3 zonas de fuga de 3 segundos e o restante do conteúdo da v4.2.0.

# v4.2.0 — inimiga opcional, zonas de fuga e Loja
- Adicionada escolha rápida no início da partida para jogar com ou sem a Minhoca Inimiga.
- A Minhoca Inimiga agora cria 3 zonas vermelhas na arena.
- Para desaparecer, a inimiga precisa entrar em cada zona e permanecer 3 segundos.
- As zonas mostram número, contagem de 3 segundos e progresso 0/3 → 3/3.
- As zonas são sincronizadas no multiplayer pelo anfitrião.
- Criada a Loja da Mioquinha usando somente moedas virtuais.
- Adicionados 4 mapas especiais compráveis: Cyber Neon, Aurora Boreal, Vulcão e Mundo Doce.
- Adicionadas 5 fantasias compráveis: Neon, Fogo, Gelo, Galáxia e Veneno.
- Conteúdos premium ficam bloqueados até a compra; conteúdos clássicos continuam livres.
- Compras e desbloqueios ficam salvos no navegador do jogador.
- Mantidos XP, moedas, desafio do dia, sequência, Liga, conquistas, multiplayer e controles.

# v4.1.2 — ajuste no desafio diário
- Corrigido o desafio diário de sobrevivência para contar apenas o tempo sobrevivido durante a partida.
- A tela do progresso atualiza o contador de renovação do desafio diário periodicamente.
- Mantidos Desafio do Dia, sequência de dias, Liga, XP, moedas e desafio de partida.

# v4.1.1 — correção da progressão diária e Liga
- Corrigida a estrutura do módulo de progressão para manter uma única definição de cada função.
- Mantidos Desafio do Dia, recompensas de sequência, Liga, XP, moedas, desafio de partida e cosméticos.
- Versão/cache sincronizados para evitar carregar a lógica quebrada da 4.1.0.

# v4.1.0 — desafio do dia, sequência e Liga da Mioquinha
- Adicionado **Desafio do Dia**, escolhido de forma determinística pela data local e renovado automaticamente à meia-noite.
- O Desafio do Dia tem progresso e recompensa próprios, separado do desafio aleatório de cada partida.
- A sequência de dias agora entrega uma recompensa diária de moedas e XP, com bônus maiores nos marcos de 3, 7, 14 e 30 dias.
- Adicionada a **Liga da Mioquinha** com Bronze, Prata, Ouro, Platina, Diamante e Lenda.
- Corridas com bom desempenho rendem pontos de Liga; resultados de torneio também rendem pontos.
- No online, cada jogador acompanha seu próprio desafio, sequência e Liga a partir dos dados que já recebe, sem enviar progresso pessoal pela rede.
- A aba Progresso ganhou cards dedicados para desafio diário, sequência e Liga.
- Mantidos moedas, XP, cosméticos, conquistas, desafio de partida, gameplay e multiplayer.

# v4.0.0 — progressão, moedas e desafios
- Mantido o Combo existente e integrado à nova progressão: combos rápidos dão XP e moedas extras.
- Adicionadas moedas 🪙 persistentes no navegador para recompensar comida, combos e marcos.
- Adicionado XP e nível do jogador, com evolução automática e barra de progresso.
- Adicionados desafios aleatórios por partida, com metas e recompensas de moedas/XP.
- Adicionados três cosméticos simples compráveis com moedas: Rastro Dourado, Cabeça Neon e Emblema Campeão.
- Cosméticos ficam salvos no navegador e podem ser equipados pelo painel de Progresso.
- Mantido o multiplayer sem colocar o progresso pessoal dentro do pacote de estado.
- Não foram adicionados Power-ups.

# v3.10.0 — pacote visual premium
- Reforçada a identidade da tela inicial, com hero, botão Jogar e cartões de destaque mais impactantes.
- Melhorada a leitura do placar com identidade visual por jogador, hierarquia e destaque do líder.
- Comidas ganharam tratamento visual por raridade e melhor destaque na legenda.
- Arena, HUD, missão, resultado e contagem regressiva receberam acabamento mais profundo.
- Lobby online e convite ganharam mais destaque visual.
- Controles mobile, reações e botões auxiliares receberam acabamento e feedback de interação.
- Modo Claro continua adaptado e a mecânica do jogo não foi alterada.

# v3.9.0 — direção visual e acabamento da Mioquinha
- Reforçada a identidade visual gamer da Mioquinha com hierarquia mais clara e aparência de aplicativo/jogo.
- Hero inicial ganhou destaque maior para o botão Jogar e melhor separação entre ação principal e Compartilhar.
- Menu, abas, cards, campos e botões passaram a seguir uma linguagem visual mais consistente.
- Placar, status, missão e arena receberam acabamento visual mais forte sem alterar as regras da partida.
- Tela de resultado e lobby online ganharam superfícies e destaques alinhados ao novo visual.
- Mantida a versão para celular e o Modo Claro, com contraste adaptado.
- Mantidos gameplay, multiplayer, salas com/sem senha, controles, temas e personalização.

# v3.8.0 — Refinamento completo do Design System
- Padronizada a hierarquia visual de botões, campos, cards e estados de foco.
- Criados tokens de cor, espaçamento, borda e sombra para a interface.
- Grid de configuração do jogo corrigido para não deixar coluna vazia no desktop.
- Melhorada a legibilidade de textos auxiliares e tamanhos mínimos de controles.
- Foco visível padronizado para teclado e acessibilidade.
- Navegação mobile respeita a área segura do aparelho.
- Removida da interface a apresentação visual do código interno da sala, mantendo a geração automática.
- Nome da tela Sobre alinhado com a marca Mioquinha.
- Preservados gameplay, multiplayer, salas com/sem senha, temas e controles.

# v3.7.0 — Redesign visual completo
- Nova identidade visual gamer moderna em toda a interface.
- HUD, placar, status, missão e lobby online com maior profundidade visual.
- Arena com moldura, vinheta e acabamento visual.
- Tela de resultado e contagem regressiva mais destacadas.
- Controles mobile redesenhados visualmente.
- Brilho extra nas cabeças e auras para comidas raras, épicas e lendárias.
- Corrigido o preenchimento do antigo campo de código removido.
- Última sala não exibe mais o código para o jogador.
- Mantidos multiplayer, salas com/sem senha e geração automática do código.

# v3.6.12 — experiência visual e multiplayer
- Novo destaque visual no menu com os principais recursos.
- Fluxo de sala mais simples: o código deixa de aparecer para o jogador.
- Convite principal passa a destacar a cópia do link.
- Cartão de sala pronta com instrução clara para compartilhar.
- Melhorias de responsividade e suporte a redução de movimento.
- Mantidos o multiplayer, salas com/sem senha e geração automática do código.

## [3.6.11] — 2026-10-02
- **Salas online:** ao criar uma sala, agora é possível escolher entre **sem senha** ou **com senha**.
- **Sala sem senha:** o link é suficiente e o convidado entra automaticamente ao abrir o convite.
- **Sala com senha:** a sala exige uma senha numérica de 4 dígitos; a senha não fica exposta no link.
- **Entrada:** quando a sala é protegida, o convidado vê o campo de senha e só entra com a senha correta.

## [3.6.6] — 2026-09-30
- **Dragão:** a cabeça ganhou uma carinha própria, com chifres, olhos de réptil, focinho, narinas, boca, dentes e espinhos laterais. O desenho antigo parecia apenas uma cabeça verde com pontas.
- **Compatibilidade:** o restante das cabeças de animais continua com o visual anterior.

## [3.6.5] — 2026-09-30
- **Animais:** cabeças de gato, coelho, urso, raposa, coruja, dragão e outros formatos agora têm detalhes de rosto mais claros (focinho/nariz e expressão), além dos olhos.
- **Campo de Girassóis:** removida a camada atmosférica que criava aparência de névoa; a iluminação do tema ficou bem mais discreta.
- **Visual:** preservada a identidade das cabeças e o restante do jogo.

## [3.6.4] — 2026-09-30
- **Conquista:** popup ficou mais transparente, permitindo enxergar melhor a partida por trás.
- **Minhoca Inimiga:** as duas aparições padrão ficaram menos eficientes: menor duração, rajada mais curta e espaçada, menor antecipação, menor crescimento por vítima e distração reduzida.
- **Migração:** configurações antigas que ainda estavam exatamente no padrão anterior são convertidas automaticamente; configurações personalizadas continuam preservadas.

## [3.6.3] — 2026-09-30
- **Conquistas:** corrigida a numeração da galeria. Agora cada categoria fica realmente em ordem do mais fácil ao mais difícil, com números consecutivos (1, 2, 3, 4...) sem pular números quando algumas já foram desbloqueadas.

## [3.6.2] — 2026-09-30
- **Celular:** a câmera agora se adapta à proporção da tela em retrato e paisagem, eliminando as grandes faixas vazias dentro da arena.
- **Celular:** os botões de Pausar/Reiniciar/Menu ficam em uma única linha e a interface da partida fica mais compacta.
- **Paisagem:** a arena aproveita praticamente toda a altura disponível, principalmente no modo compacto/tela cheia.
- **PC:** o comportamento da câmera e o layout de desktop permanecem como antes.

## [3.6.1] — 2026-09-30
- **Celular:** layout do jogo online reorganizado para evitar estouro lateral e elementos espremidos.
- **Visitante:** removido o placar duplicado no rodapé e reorganizados placar, reações, chat e botões.
- **Arena:** controles touch permanecem dentro da área da arena e os cards de jogadores respeitam a largura do celular.
- **Cache:** CSS e versão atualizados para garantir que o celular baixe a correção nova.

## [3.6.0] — 2026-09-30
- **Salas por código:** o anfitrião pode criar uma sala usando um código numérico de 4 dígitos.
- **PIN:** a sala pode exigir um PIN numérico de 4 dígitos antes de liberar a entrada.
- **Entrada sem link:** quem estiver no site pode digitar código + PIN e entrar diretamente.
- **Compatibilidade:** o link de convite continua disponível como alternativa.

## [3.5.1] — 2026-09-30
- **Correção gráfica:** ativadas as chamadas da iluminação dinâmica e dos efeitos especiais de comidas que já faziam parte do renderizador, mas não estavam sendo executadas.
- **Estabilidade:** nova cadeia gráfica para garantir que a atualização seja carregada sem depender de módulos antigos em cache.

## [3.5.0] — 2026-09-30
- **Iluminação:** luzes ambientais dinâmicas para dar profundidade aos mapas.
- **Minhoca:** corpo com volume, reflexos e contorno 3D.
- **Turbo:** efeito de velocidade com riscos luminosos e partículas.
- **Comidas:** efeitos próprios de brilho, pulso e partículas para itens de maior raridade.
- **Eliminações:** impacto com anel, explosão e fragmentos luminosos.
- **Mapas:** camada visual adicional específica por família de tema.
- **Líder:** coroa, halo, partículas e identificação "LÍDER".
- **Caçadora:** mira visual sobre o líder e integração com o efeito de perigo já existente.
- **Conquistas:** acabamento visual adicional nos cards/popup.
- **Partículas:** limite inteligente e núcleo luminoso para manter o jogo fluido.

## [3.4.4] — 2026-09-30
- **Splash/topo:** corrigido o carregamento da tela inicial para ela permanecer como camada fixa sobre a página, eliminando a faixa branca que aparecia no topo depois do carregamento.
- **Tema:** o splash agora mantém fundo escuro mesmo quando o navegador ou o modo claro estiver ativo.

## [3.4.3] — 2026-09-30
- **Conquistas:** cada card agora exibe um número pequeno de dificuldade de 1 a 14 dentro da categoria, seguindo a progressão do mais fácil ao mais difícil.
- **Ordem visual:** a numeração permanece ligada à dificuldade mesmo quando as conquistas desbloqueadas aparecem antes das bloqueadas.

## [3.4.1] — 2026-09-30
- **Conquistas:** as 56 conquistas foram reorganizadas dentro de cada categoria em ordem progressiva, do objetivo mais fácil ao mais difícil, mantendo todas as conquistas existentes.

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

## [3.6.10] — 2026-10-01
- **Salas online:** removido o PIN. Agora a sala é criada com um código automático de 4 números e o convite usa um link direto.
- **Entrada por link:** ao abrir o link de convite, o jogo cai na aba Online e preenche a sala; o convidado toca em **ENTRAR NO JOGO** e entra sem PIN.
- **Entrada automática:** novas salas aceitam o convidado automaticamente; não há mais pedido de aprovação manual.
- **Compartilhamento:** o painel da sala agora destaca copiar e enviar o link como forma principal de convite.

## [3.6.9] — 2026-10-01
- **Minhoca Caçadora:** agora existem 5 aparições padrão, aos 100, 150, 200, 250 e 300 alimentos.
- **Primeiras 4 aparições:** ficam bem mais fáceis: a caçadora anda mais devagar, não usa rajada, não antecipa a direção e cresce menos.
- **5ª aparição em diante:** passa para um comportamento médio, com velocidade normal, rajada moderada e pequena antecipação.
- **Compatibilidade:** configurações padrão antigas salvas no navegador são migradas para a nova progressão; presets personalizados continuam respeitados.

## [3.6.8] — 2026-10-01
- **5 melhorias simples**, sugeridas e aprovadas pelo dono:
  1. **Causa da morte**: em vez de só "Você morreu!", mostra "Bateu na parede", "Colidiu com [nome]" ou "A Minhoca Caçadora te pegou".
  2. **Recorde de maior cobra**: guarda o maior tamanho (não pontuação) já alcançado numa partida, mostrado na aba Progresso.
  3. **Tela "Sobre"**: novo botão na aba Config., mostra a versão do jogo e um obrigado.
  4. **Som/vibração especial de novo recorde pessoal**: uma fanfarra de 4 notas + vibração distinta, e "🎉 Novo recorde!" aparece como segunda linha na mensagem de morte, tocando um pouco depois do som normal de morte pra não se misturar.
  5. **"Melhor que X% das suas partidas"**: aparece na mensagem de morte (no lugar do "novo recorde", quando não é o caso) comparando com as últimas 200 partidas salvas — só quando há pelo menos 3 partidas anteriores e o resultado é positivo.

## [3.6.7] — 2026-10-01
- **Visual:** melhorados 3 visuais de cabeça que ficavam genéricos demais no tamanho real do jogo: 🐲 Dragãozinho (tinha só 3 bolinhas quase invisíveis; ganhou 2 chifres grandes recurvados + focinho com narinas), 🦉 Coruja (ganhou um biquinho laranja) e 🐻 Ursinho (ganhou focinho claro + narizinho). As novas cabeças que o ChatGPT adicionou nesse mesmo dia (raposa, tubarão, abelha, macaco, leão, unicórnio, alienígena, pirata, robô, caveira) não foram mexidas.
- Correção na própria ferramenta `tools/verificar-projeto.py`/`gerar-mapa.py`: o jeito de achar "quem importa quem" não reconhecia `import ... from './arquivo.js?v=X.Y.Z'` (com uma query de cache-busting), e por isso achava (errado) que `render.js` era código morto, sem ninguém importando. Corrigido — isso evita que uma IA futura apague `render.js` por engano, achando que não é usado.
- Pendências novas registradas em `docs/PENDENCIAS.md`: parte da suíte de testes ficou desatualizada depois das mudanças grandes feitas pelo ChatGPT no mesmo dia (Minhoca Caçadora reformada, auto-atualização desativada, CSS crescido) — não foram corrigidas agora por não ser o pedido da vez.
- **Nota importante (processo):** uma publicação anterior hoje (`95bff09`) tinha sido feita em cima de uma cópia local desatualizada e apagou por engano cerca de 240 commits de trabalho do ChatGPT (v2.94.10 → v3.6.6). Foi revertida imediatamente (`6b464c3`) assim que percebida. Lição registrada em `docs/ARMADILHAS.md`.

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
