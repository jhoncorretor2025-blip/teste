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
Causa: o pacote "raro" (`colors, names, mapW, theme, teams…`) é enviado **uma vez**, no começo. A reconexão automática cai no mesmo problema. → Ponto frágil **ainda não corrigido**; a correção natural é reenviar o pacote raro ao cliente que entra/reconecta.

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

---

# Problema em aberto: multiplayer real no celular
**Sintoma:** com anfitrião no PC e amigo no celular (mesmo Wi-Fi), a conexão fecha, o anfitrião **vê** a minhoca do amigo se mexer (as entradas chegam), o **ping funciona**, mas o celular mostra "pacotes de estado recebidos do anfitrião: 0" e nunca desenha o jogo.

**Já tentado (não resolveu, ou não foi confirmado):** tamanho do canvas, polyfill de `roundRect`, overlays cobrindo o jogo, câmera, dividir o pacote em frequente/raro, serialização JSON, reconexão automática, atualização automática de versão, service worker "rede primeiro". Nos testes simulados tudo funciona; o defeito só aparece em aparelho real.

**Pistas:** (a) o ping (mensagem pequena) chega nos dois sentidos, então o canal existe; (b) o pacote raro nunca é reenviado (armadilha 11) — quem perde esse pacote fica sem `mapW`/nomes/cores; (c) `broadcastRaw` conta falhas de envio em `sendDiag`.

**Próximo passo mais útil:** um print do painel 🩺 **no PC (anfitrião)** durante a partida, mostrando "DIAGNÓSTICO DE ENVIO" (tentativas, sucessos, falhas e último erro). Nunca foi obtido. Com ele dá pra saber se o anfitrião está enviando e falhando, ou enviando e nada chegando.
