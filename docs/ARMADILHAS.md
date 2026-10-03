# Armadilhas conhecidas (todas aconteceram de verdade neste projeto)

Formato: **sintoma → causa → como evitar**. Se você acabou de cair em algo parecido, acrescente uma entrada aqui.

## Ferramentas e publicação
**1. `node --check` deu "ok" e o arquivo estava quebrado.**
Causa: `node --check arquivo.js` sozinho lê como script comum e deixou passar uma chave sobrando em módulo ES. → Sempre `node --input-type=module --check < arquivo.js` (o `verificar-projeto.py` já faz assim).

**2. Aparelhos ficam presos numa versão velha (ou recarregam sem parar).**
Causa: a versão vive em **4 lugares** (`js/config.js`, `version.txt`, `sw.js`, `index.html`) e um ficou pra trás. → `python3 tools/bump-versao.py X.Y.Z`. E lembre: `version.txt` é o que faz todo aparelho aberto recarregar, então **só** troque a versão quando o comportamento do jogo mudou.

**3. O jogo quebra offline depois de criar um arquivo novo.**
Causa: `js/*.js` novo não entrou na lista `ASSETS` do `sw.js`. Um arquivo **inexistente** na lista é pior: quebra a instalação inteira do cache. → o verificador confere as duas coisas.

**4. Mexi no arquivo certo e nada mudou.**
Causa: código morto. Já existiu um `js/hunter.js` (caçadora antiga) que ninguém importava, enquanto a lógica de verdade estava no `loop.js`. → o verificador reprova módulo que nenhum outro importa. Apague o que sobrar.

**5. Enxurrada de builds "errored" no GitHub Pages.**
Causa: vários commits seguidos disparam vários builds que se atropelam; os intermediários dão "Page build failed" e só o do **último** commit importa. → `tools/publicar.py` manda tudo num commit só.

**6. Conferi o arquivo publicado e ele parecia velho.**
Causa: `raw.githubusercontent.com` guarda cache por alguns minutos. → confira pela API do GitHub (é o que o `publicar.py` faz).

**7. Token do GitHub vazou.**
O repositório é **público**. → Token só por variável de ambiente (`GITHUB_TOKEN`), nunca em arquivo. Se vazar: apague e **revogue** o token no GitHub na hora. O verificador reprova se achar um.

**8. Perdi o trabalho porque o ambiente da IA foi reiniciado.**
Já aconteceu: a pasta de trabalho foi apagada com mudanças não publicadas e todos os testes que só existiam lá. → Publique cedo e em passos pequenos; os testes vivem em `tests/`, no repositório.

## Rede e estado
**9. O que criei não aparece no celular do amigo.**
Causa: só o **anfitrião** roda o `tick`. Partículas, marcadores calculados no `tick` etc. não existem no cliente. → Ou vai no pacote de estado, ou é calculado no `render.js` a partir do que já vai no pacote (foi assim com a fumaça, a vinheta e a setinha da caçadora).

**10. Campo novo no estado chega vazio (ou apaga o que existia) no cliente.**
Causa: precisa entrar em **dois** lugares — o envio (`broadcastState`) e o recebimento (`applyRemoteState`, com `??`). → veja `PROTOCOLO-ONLINE.md`.

**11. Quem entra depois do início da partida vê tudo sem nome, cor ou mapa.**
Causa: o pacote "raro" (`colors, names, mapW, theme, teams…`) é enviado **uma vez**, no começo. A reconexão automática cai no mesmo problema. → Corrigido na 2.85.0: o host agora envia um pacote pequeno `roomConfig` toda vez que a entrada é finalizada, inclusive na reconexão.

**12. Erro de envio some sem deixar rastro.**
Causa: um `catch {}` vazio engolia as falhas de `conn.send`. → `broadcastRaw` agora conta tentativas/falhas em `sendDiag`, e o painel 🩺 mostra isso no anfitrião. Não volte a engolir erro de rede.

**13. Pacote grande demais em mapa grande.**
Por isso o estado foi dividido em frequente e raro, e a serialização foi fixada em JSON. Se aumentar o pacote frequente, teste com mapa grande e minhocas longas.

**14. "Conexão: 4g" na tela me fez achar que era dados móveis.**
Causa: é `navigator.connection.effectiveType`, uma **classificação de velocidade** — aparece "4g" mesmo em Wi-Fi. Não use isso pra concluir nada sobre o tipo de rede.

## Testes
**15. No teste, o popup do anfitrião apareceu na tela do amigo.**
Causa: os módulos usam `document`/`window` **globais**; com dois participantes no mesmo processo, um escreve na tela do outro. → Use `copiarProjeto()` (cópia isolada) + `criarRedeFalsa()` do `tests/_ambiente.mjs`, que entrega cada mensagem com as globais do dono.

**16. Teste de desenho que passa e falha "por sorte".**
Causa: a câmera desliza entre quadros e a contagem de `moveTo` inclui as linhas da grade. → deixe a câmera assentar (desenhe uns 8 quadros antes de medir) e meça por primitivas que só o seu desenho usa (`rect`, `closePath`, `fillText`).

**17. Coisas que o jsdom não simula:** `location.reload()` (teste o que vem antes dele), `canvas.toDataURL` (só avisa, não quebra) e `Proxy` sobre `location`.

**18. Um teste "de sorte" escondia um bug real.**
O teste da caçadora falhou de vez em quando; investigando, o corpo dela "dava a volta" pelo topo do mapa. → Falha intermitente = investigue, não ignore. E todo teste de correção deve **falhar sem a correção** (veja `tests/corpo-da-cacadora.mjs`, que guarda a versão antiga para provar isso).

## Visual e dados
**19. Tema novo deixou a minhoca roxa quase invisível.**
Fundos mais claros derrubaram o contraste (1,5). → Ao criar/editar tema, mantenha `bg2` com contraste ≥ 2,6 contra **todas** as cores de minhoca (`COLORS`).

**20. Tema novo não aparece no menu.**
`BOARD_THEMES` (config) e o `<select id="boardTheme">` (HTML) são listas **separadas**. → o verificador confere as duas.

**21. Todo mundo perdeu recordes/configurações.**
Renomear uma chave `*_KEY` do `storage.js` "apaga" o que estava salvo. → Nunca renomeie; se precisar migrar, leia a chave velha e grave na nova.

**22. `state` tem arrays de 6 posições.** Novo dado por jogador precisa de um array de 6 no `state.js` e ser resetado em `reset()` (`loop.js`).

## Legibilidade e histórico
**23. Mexer no CSS quebra o visual sem ninguém perceber.**
Causa: o `css/style.css` estava minificado — 56 linhas, uma delas com 13.642 caracteres. Editar no meio de uma linha assim é arriscado (para IA e para gente). → `python3 tools/formatar-css.py css/style.css` deixa uma declaração por linha e **garante** que o conteúdo é idêntico (confere sem espaços antes e depois; se não bater, não grava). O verificador reprova linhas com mais de 400 caracteres (exceto imagens embutidas `data:`).

**24. O `git log` não conta o que foi feito.**
Nas versões antigas, cada arquivo enviado virou um commit com a mesma mensagem: 686 commits, dos quais só umas 110 versões diferentes. → Leia o `CHANGELOG.md` (reconstruído desse histórico) e, ao publicar, use `tools/publicar.py` (um commit só, com mensagem que diz o que mudou).

**25. A próxima IA não sabe o que já foi feito nem por quê, e refaz ou desfaz.**
→ Registro obrigatório: `CHANGELOG.md` (feito), `docs/DECISOES.md` (por quê) e `docs/PENDENCIAS.md` (falta). O `bump-versao.py` e o verificador cobram o CHANGELOG.

## Caso de estudo: o jogo travava sempre na telinha de carregamento (v2.84.0 → v2.94.5)
Depois de 129 commits de outra IA (ChatGPT, sem passar pelo `AGENTS.md`/verificador deste projeto), o jogo passou a travar **sempre** na tela de abertura ("Mioquinha vX — carregando..."), mostrando "🔄 Tentar novamente" — e tentar de novo dava o **mesmo** erro, sempre.

**26. Função chamada, mas nunca definida em lugar nenhum.**
`main.js` chamava `updateOnlineLobbyUI()` em 6 lugares (inclusive uma vez **direto no carregamento**, fora de qualquer função) — mas essa função nunca tinha sido escrita. `ReferenceError: updateOnlineLobbyUI is not defined`, na hora, sempre. → Corrigida virando um apelido de `renderOnlineLobby()` (que já fazia tudo que o nome sugeria). **Prevenção: checagem 13 do verificador** (`tools/verificar-projeto.py`) — escaneia todo `js/*.js` e reprova qualquer `nome(...)` chamado que não seja `function`, const, let ou var, `import` nem built-in do navegador. Rodar `npm run verificar` (ou `npm test`) antes de publicar teria pego isso na hora.

**27. `const`/`let` usado antes de existir de verdade ("temporal dead zone").**
Um SEGUNDO erro, de outro tipo: `switchToTab()` (chamada assim que a página abre, pra ler `?tab=` da URL) usava `TAB_ALIASES` — só que essa constante era declarada **250 linhas depois** no arquivo. Diferente de `function`, que é toda "içada" (existe inteira desde o topo do arquivo), `const`/`let` só passam a existir de verdade na linha onde aparecem; usar antes disso é sempre erro, mesmo a função que usa já estando disponível. → Movida a declaração pra antes do primeiro uso. **Isso NÃO é pego pela checagem 13** (o nome *existe* no arquivo, só que tarde demais) nem por `node --check` (não é erro de sintaxe, só aparece **rodando** o código) — por isso testes que executam o jogo de verdade (`tests/online-basico.mjs`, que chama `switchToTab` logo na inicialização) continuam sendo a rede de segurança para esse tipo de bug. Regra prática: toda `const`/`let` usada por uma função que roda na inicialização do arquivo deve ficar declarada **antes** dessa chamada, não faz diferença ficar "perto do assunto" lá embaixo.

**28. Um erro de sintaxe comum também rolou no meio do caminho** — uma chave `}` sobrando em `net.js` (v2.94.5). Esse tipo `node --input-type=module --check` (checagem 5) pega imediatamente; foi corrigido antes de chegar até nós.

**Lição para qualquer IA que abrir este projeto:** rodar `npm run verificar` (ou melhor, `npm test`, que também **executa** o jogo) antes de considerar qualquer tarefa terminada não é opcional. As checagens 5 e 13 pegam os dois erros mais comuns (sintaxe quebrada e função-fantasma) na hora, sem precisar nem abrir o navegador.

**29. Regra de CSS antiga sobrando de um design anterior, conflitando com a nova (v2.94.8).**
A barra de navegação do celular ficava esticada pra tela inteira em pé (cobrindo o conteúdo — inclusive fazendo "Jogar" parecer não funcionar). Causa: uma regra `@media(max-width:600px) { .tabBar { position:sticky; top:0 } }` de um design de navegação ANTIGO nunca foi removida quando um design NOVO chegou (`@media(max-width:700px) { .tabBar { position:fixed; bottom:8px } }`). Como as duas media queries valem ao mesmo tempo pra qualquer celular comum (600px está DENTRO de 700px), o navegador aplicava as duas — e um elemento `position:fixed` com `top` E `bottom` definidos ao mesmo tempo (sem altura fixa) se estica pra preencher a distância entre os dois. → Prevenção: `tests/nav-mobile-sem-conflito.mjs` confere que nenhuma regra de celular do `.tabBar` define `top`, e que existe exatamente uma regra `position:fixed` com `bottom`.
**Lição geral:** ao REDESENHAR algo responsivo, procure (e apague) TODAS as regras antigas daquele seletor nas media queries relacionadas — não só adicione a nova por cima. `grep -n "\.seletor" css/style.css` antes de mexer mostra todas de uma vez.
**Limite do meu ambiente:** o `jsdom` (a ferramenta de teste) não resolve `@media` de verdade contra um tamanho de tela (sem motor de layout completo) — por isso esse teste lê o CSS como texto, em vez de simular o navegador calculando o resultado final. Funciona bem pra esse tipo de conflito, mas não substitui testar num celular de verdade.

**30. Auto-atualização só protegia "partida rodando", não "esperando na sala" (v2.94.9).**
Criar sala, trocar de app pra mandar o link, voltar → sala apagada, como se tivesse recarregado do zero. Causa: as duas checagens de auto-atualização (`checarVersaoDeVerdade` e `showUpdateBanner`) só checavam `state.running` (true só durante o JOGO em si), não cobrindo o período de ESPERA na sala (depois de `hostRoom()`/`joinRoom()`, antes do jogo começar) — que é justamente quando dá mais vontade de sair pra mandar o link. → Trocado pra também checar `net.isOnline()` (true assim que entra ou cria uma sala, ANTES do jogo começar). A atualização não se perde: fica represada e é reaplicada quando a pessoa sai da sala (o botão "Voltar" já dispara isso).
**Lição geral:** ao proteger algo contra interrupção automática ("não atualiza durante X"), pense em TODOS os momentos em que perder o estado seria ruim — não só o mais óbvio (partida rodando). Aqui "esperando alguém entrar" era tão importante de proteger quanto "jogando", mas foi esquecido na primeira versão da proteção.
**Armadilha de teste:** meu primeiro teste pra isso "passava" mesmo sem a correção, porque nunca simulava de verdade o evento `visibilitychange` (só mudava uma variável e esperava, sem a checagem rodar de novo). Criei `simularTrocarDeAppEVoltar()` em `tests/_ambiente.mjs` (dispara hidden→visible de verdade) — e SÓ confiei no teste depois de ver ele FALHAR contra o código antigo.

**31. Publicar em cima de uma cópia local desatualizada apaga trabalho de outra IA (incidente real, 30/09).**
Trabalhei numa cópia local baixada no começo de uma investigação, continuei usando ELA MESMA por várias mensagens seguidas (sem rebaixar), e no fim publiquei com `--apagar-removidos`. Nesse meio-tempo, o ChatGPT tinha feito mais de 240 commits no mesmo repositório (v2.94.10 → v3.6.6: código/PIN de sala, 42 conquistas, 20 cabeças, 21 temas, skins). Minha publicação, comparando a cópia VELHA com o repositório, achou que os arquivos novos do ChatGPT "não deviam existir" e apagou tudo, sobrescrevendo com a versão antiga. Percebido pela lista de "removidos" do próprio `publicar.py` (nomes estranhos de arquivo) — revertido na hora (`git checkout <commit-anterior-ao-meu> -- .` seguido de novo `publicar.py`).
**Prevenção:** baixar o repositório **de novo, na hora**, logo antes de qualquer publicação — nunca reutilizar uma cópia de uma mensagem anterior da conversa, especialmente sabendo que outra IA mexe no mesmo projeto em paralelo. Isso agora é a prática seguida (ver AGENTS.md).
**Se acontecer de novo:** `git log --oneline <meu-commit-ruim>^..HEAD` no repositório pra ver o estrago, `git checkout <commit-anterior-ao-meu> -- .` numa cópia fresca, conferir com `git diff <commit-anterior> -- .` que bate 100% (zero linhas), e publicar de novo — sem tentar "consertar por cima", só desfazer.

**32. Criar sala "não faz nada" e testes verdes que não provam nada (v4.5.4).**
No modo simples da aba Online, qualquer falha ao criar a sala (código em uso, servidor de salas inacessível, senha ligada antes, módulo online não carregado) escrevia o aviso num campo que fica ESCONDIDO nesse modo, e a tela ficava eternamente em "Criando sua sala...". Além disso não havia tempo limite nem nova tentativa de código. Os testes que existiam (`online-simples`, `online-criacao-rapida`) só procuravam texto dentro de `js/main.js` — que não é o arquivo que roda — e um deles nem executava (erro de sintaxe no próprio teste), então tudo parecia verde. → Corrigido em `js/main_stable_342.js` (aviso visível, nova tentativa de código, limite de 15 s) e coberto por testes que executam o jogo de verdade.
**Lição:** teste que só procura texto num arquivo não vale como teste de comportamento, e vale ainda menos se o arquivo nem é o que a página carrega. Antes de confiar num teste, confira que ele importa o mesmo arquivo do `index.html` e que falha quando o comportamento quebra.

---

# Problema em aberto: multiplayer real no celular
**Sintoma:** com anfitrião no PC e amigo no celular (mesmo Wi-Fi), a conexão fecha, o anfitrião **vê** a minhoca do amigo se mexer (as entradas chegam), o **ping funciona**, mas o celular mostra "pacotes de estado recebidos do anfitrião: 0" e nunca desenha o jogo.

**Já tentado (não resolveu, ou não foi confirmado):** tamanho do canvas, polyfill de `roundRect`, overlays cobrindo o jogo, câmera, dividir o pacote em frequente/raro, serialização JSON, reconexão automática, atualização automática de versão, service worker "rede primeiro". Nos testes simulados tudo funciona; o defeito só aparece em aparelho real.

**Pistas:** (a) o ping (mensagem pequena) chega nos dois sentidos, então o canal existe; (b) o pacote raro nunca é reenviado (armadilha 11) — quem perde esse pacote fica sem `mapW`/nomes/cores; (c) `broadcastRaw` conta falhas de envio em `sendDiag`.

**Próximo passo mais útil:** um print do painel 🩺 **no PC (anfitrião)** durante a partida, mostrando "DIAGNÓSTICO DE ENVIO" (tentativas, sucessos, falhas e último erro). Nunca foi obtido. Com ele dá pra saber se o anfitrião está enviando e falhando, ou enviando e nada chegando.
