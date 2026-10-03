## v4.5.5 — notificações de conquista discretas no celular
**Decisão:** em telas de até 700px, o aviso de conquista fica menor e deslocado para a parte superior central, com transparência.
**Motivo:** a conquista precisa ser percebida sem bloquear a região central da arena, que é justamente onde a pessoa precisa enxergar para jogar.
**Cuidados:** o aviso continua sem capturar toques (`pointer-events:none`) e o comportamento visual do computador não foi alterado.

## v4.5.3 — criação rápida resiliente
**Decisão:** o botão **Criar sala rápida** não pode depender do sucesso de um preset visual/configurável para iniciar a sala.
**Comportamento:** tenta aplicar o preset casual, mas sempre segue para a criação pelo botão real da sala. Se houver erro no preset, a sala ainda pode ser criada.
**Motivo:** o fluxo simples deve ser o caminho mais direto e tolerante a diferenças de cache/versão.

## v4.5.2 — online simples por padrão
**Decisão:** a aba Online passa a ter dois níveis de interface: **Modo simples** para o fluxo mais comum (criar sala → copiar link → jogar) e **Modo complexo** para quem precisa de configurações avançadas.
**Por quê:** a quantidade de opções da aba Online estava escondendo a ação principal. O modo simples reduz a tela sem remover nenhuma função.
**Cuidados:** o modo complexo continua contendo as configurações existentes. Links de convite abertos pelo navegador iniciam automaticamente a entrada na sala; salas sem senha continuam sendo o caminho rápido.

## v4.5.1 — acabamento visual
**Decisão:** separar a correção visual das funcionalidades da v4.5.0 em um patch de versão para manter o histórico claro e permitir conferir exatamente o que foi corrigido.

## v4.5.0 — Conquistas e acessibilidade
**Decisão:** a galeria de conquistas passa a tratar descoberta como uma tela de acompanhamento, mostrando percentual geral e permitindo filtrar entre concluídas e pendentes.
**Acessibilidade:** o Alto contraste é salvo junto das preferências do aparelho e aumenta o contraste da interface e da arena.
**Loja:** mapas bloqueados continuam sendo clicáveis para comprar e agora exibem uma miniatura visual do tema antes da compra.

## v4.4.1 — renovação das conquistas iniciantes
**Decisão:** objetivos iniciantes com metas mais baixas e repetitivas foram substituídos por metas mais claras e progressivas: 20 comidas, 45 segundos, 30 segmentos e uma sequência de 10 estrelas na mesma partida.
**Migração:** os IDs antigos `food_10`, `survive_30`, `length_15` e `food_25` são retirados da lista de desbloqueios salvos na primeira leitura da progressão, evitando que uma conquista antiga permaneça marcada como concluída com um critério novo.

## v4.4.0 — central da partida e Loja na navegação principal
**Decisão:** a Loja passa a ser uma área principal da navegação, mas continua apontando para a mesma seção `shop` do painel de Progresso.
**Por quê:** isso deixa a compra fácil de encontrar em PC e celular sem criar um segundo sistema de moedas ou inventário.
**Cuidados:** a tela inicial é somente uma visão rápida dos dados já existentes. Compras, progressão e escolhas continuam sendo feitas pelos mesmos módulos e permanecem salvas no navegador.

## v4.3.0 — conquistas ligadas à nova progressão
**Decisão:** usar as conquistas como uma camada de longo prazo sobre os recursos já existentes, sem criar moedas separadas nem exigir mudanças no multiplayer para o progresso pessoal.

**Como funciona:** conquistas de partidas e da Caçadora são disparadas pelo jogo; conquistas de Loja, moedas, Liga e Desafio do Dia são conferidas pelo módulo de progressão. Moedas ganhas e gastas ficam em contadores cumulativos novos, preservando o saldo atual.

**Cuidado:** o progresso pessoal continua local ao navegador. As conquistas online que dependem de estado da partida continuam sendo conferidas no cliente a partir do estado enviado pelo anfitrião.

# Decisões de projeto (e por quê)

Para uma IA não **desfazer sem querer** algo que foi decidido de propósito. Cada decisão diz **o que**, **por quê** e **o que cuidar**. Ao tomar uma decisão nova (ou mudar uma), registre aqui. O que foi *feito* mora no `CHANGELOG.md`; o que *falta* mora em `docs/PENDENCIAS.md`.

## Base do projeto
**1. Site estático, sem build, sem servidor nosso.**
- **Por quê:** quem mantém não é programador; publicar = subir arquivos para o GitHub Pages, sem custo e sem nada para "instalar".
- **Cuidado:** sem servidor não há banco de dados nem conta de usuário — tudo que fica salvo vai para o `localStorage` do aparelho (`js/storage.js`), e o online é ponto a ponto.

**2. Português do Brasil em tudo, e comentários que explicam o PORQUÊ.**
- **Por quê:** o dono lê o código e as mensagens; um comentário com o motivo evita que a próxima IA "conserte" algo de propósito.

**3. Código separado em módulos por assunto (desde a v2.4.0).**
- **Por quê:** o arquivo único ficou impossível de manter. **Cuidado:** os três maiores (`main.js`, `render.js`, `loop.js`) ainda acumulam muita coisa — veja `docs/PENDENCIAS.md`.

**4. Testes dentro do repositório, com `jsdom` (sem navegador de verdade); publicar num commit só.**
- **Por quê:** os testes já foram perdidos uma vez quando o ambiente de trabalho foi apagado; e enviar arquivo por arquivo gerava centenas de commits repetidos e builds do Pages que se atropelavam (o `CHANGELOG.md` explica).
- **Cuidado:** o teste simula a rede. Mexeu em rede? Confirme também com **dois aparelhos de verdade**.

## Online
**5. Multiplayer ponto a ponto (PeerJS), com o anfitrião como fonte da verdade (v2.5.0).**
- **Por quê:** não temos servidor. **Consequência:** só o anfitrião roda o `tick`; o cliente só desenha o que recebe (veja `docs/PROTOCOLO-ONLINE.md`).

**6. Salas por link simplificam a entrada (v3.6.10)** — sem PIN e sem aprovação manual. O código de 4 dígitos continua identificando a sala; o link já leva esse código e deixa tudo preenchido para o convidado clicar em **ENTRAR NO JOGO**.
- **Por quê:** o fluxo desejado é simples: criar sala, copiar o link, mandar para o amigo e ele entrar sem etapas extras. **Cuidado:** a sala continua sendo ponto a ponto e depende do anfitrião manter o jogo aberto.

**7. O estado do jogo é enviado em dois pacotes: frequente e raro (v2.68.0).**
- **Por quê:** pacotes grandes falhavam em mapa grande. **Cuidado:** o pacote raro (nomes, cores, mapa, tema, times) é enviado **uma vez só** — quem entra depois não recebe (é uma pendência conhecida).

**8. Serialização JSON forçada nas conexões (v2.77.0).**
- **Por quê:** o ping funcionava e o pacote de estado não. **Atenção:** foi uma **hipótese**; não ficou provado que resolveu o bug do celular.

**9. O painel 🩺 de diagnóstico abre sozinho ao entrar numa sala e some quando os dados chegam (v2.66.0 a v2.83.0).**
- **Por quê:** para descobrir o bug do "nada chega" sem depender de a pessoa achar o botão. Se os dados **não** chegam, ele fica aberto — é justamente quando ajuda. Se a pessoa abrir de propósito, ele não some.

## Atualização e cache
**10. Todo aparelho se atualiza sozinho pelo `version.txt` (v2.78.0), e o service worker usa "rede primeiro" para html/js/css (v2.71.0 e v2.72.0).**
- **Por quê:** aparelhos ficavam presos em versão velha e isso atrapalhava até a investigação de bugs.
- **Cuidado:** só troque a versão quando o **jogo** mudou (a versão nova faz todo aparelho aberto recarregar). E o service worker **sempre** precisa devolver alguma resposta (a v2.71.0 quebrou isso e a v2.72.0 consertou).

## Regras do jogo
**11. Minhoca Caçadora: persegue o líder de comida, nasce com 50 partes, e a lógica vive só em `js/loop.js` (+ `hunterDir` em `js/ai.js`).**
- **Por quê:** existia um `hunter.js` paralelo que ninguém usava e enganava quem editava (foi apagado). **Fumaça, vinheta e batimento** são calculados no `render.js` (não no `tick`) porque **partículas só existem no anfitrião** e o amigo não veria.

**12. Comida de sequência vencedora: líder com 25+ de vantagem, 👑 valendo 10 a cada 15 s (v2.79.0). Consolidação: 50+ comidas comuns viram estrelas em grupos de 5.**
- **Por quê:** são números **pedidos pelo dono** (o exemplo dele: 50 comidas viram 10 estrelas). Mexer neles muda o equilíbrio do jogo — pergunte antes.

**13. Times online: tamanhos de 1 a 3 por lado, padrão 2 × 2; o anfitrião é sempre do "meu time"; CPUs completam as vagas (v2.81.0).**
- **Por quê:** o dono pediu para definir quantas minhocas de cada lado e deixar quem entra escolher. **Cuidado:** as escolhas (tamanhos e "com/contra") ficam salvas no aparelho, mas o **formato** Times × Todos contra Todos **não** — ele também liga o modo Times do jogo local, e abrir o jogo já em Times seria uma surpresa (v2.83.0).
- Cada time usa uma cor só e ganha uma forma na cabeça (▲ Azul, ■ Vermelho) para não depender só de cor.

## Ferramentas
**15. O verificador ganhou uma checagem de "função-fantasma" (chamada, mas nunca definida em lugar nenhum) — v2.94.6.**
- **Por quê:** foi exatamente esse tipo de erro (`updateOnlineLobbyUI is not defined`) que travou o jogo na tela de carregamento depois de 129 commits de outra IA sem passar pelo verificador. Detalhes técnicos e limitações em `docs/ARMADILHAS.md` (casos 26-27).
- **Cuidado:** é uma checagem heurística (não é um parser de JavaScript de verdade) — ela remove strings/comentários/regex antes de procurar, mas **não entende ordem de execução**. Ela pega "nunca existe", não pega "existe, mas tarde demais" (erro de `const`/`let` usado cedo demais). Pra esse segundo tipo, o que continua protegendo é rodar o jogo de verdade nos testes (`npm test`).

## Visual
**14. Cada tema visual tem o seu fundo: cor, brilho central, decoração animada e comidinha (v2.82.0).**
- **Por quê:** antes só a cor de fundo e a das linhas mudavam, e escuras e parecidas; as estrelinhas eram sempre iguais. **Regra:** o fundo mais claro de cada tema (`bg2`) precisa ter contraste ≥ 2,6 com **todas** as cores de minhoca (a roxa quase sumia). O verificador confere que `BOARD_THEMES` e o `<select id="boardTheme">` têm os mesmos temas.
**16. No celular, a janela da câmera acompanha a proporção real da arena; no PC, o zoom antigo continua valendo.**
- **Por quê:** a janela fixa de 32 × 25 células deixava grandes faixas pretas quando o telefone ficava em retrato ou paisagem.
- **Cuidado:** a adaptação só é ativada em aparelhos móveis com toque; não altere a regra do PC sem testar o layout desktop.


## 17. Design System visual consolidado (v3.8.0)
- A interface passa a usar uma escala curta e consistente de cores, espaçamentos, raios e sombras.
- **Por quê:** a Mioquinha já tinha muitos componentes funcionando, mas pequenas diferenças entre cards, botões e estados faziam as telas parecerem menos coesas.
- **Cuidado:** o redesign é visual; não muda as regras do jogo nem o protocolo online. O objetivo é ajustar pesos visuais e legibilidade, não criar uma nova interface do zero.

## 18. Direção visual v3.9.0
**Decisão:** consolidar a Mioquinha com uma identidade visual de jogo/app, usando superfícies escuras em camadas, verde como ação principal e ciano/violeta como acentos.

**Por quê:** a interface tinha bons componentes isolados, mas ainda parecia mais um painel de configuração do que um produto de jogo. O novo acabamento aumenta a sensação de identidade sem mexer na mecânica.

**Cuidados:** manter contraste, preservar o Modo Claro e não usar efeitos visuais que cubram o canvas ou prejudiquem os controles.


## 19. Direção visual v3.10.0
**Decisão:** adicionar uma camada de acabamento premium focada em sensação de jogo, feedback e hierarquia, sem alterar regras, controles ou protocolo online.

**Por quê:** a interface já tinha a base visual, mas ainda podia ganhar mais presença no início da partida, placar, raridade das comidas, resultado e lobby.

**Cuidados:** efeitos discretos, respeito à redução de movimento, canvas legível e Modo Claro preservado.


## v4.0.0 — Progressão pessoal fora do estado de rede
- Moedas, XP, nível, desafios e cosméticos ficam no `localStorage` por jogador.
- O multiplayer não transmite esses dados pessoais: isso mantém os pacotes menores e evita que a progressão de um aparelho altere a de outro.
- O Combo já existia; a decisão foi integrá-lo à progressão em vez de criar um segundo sistema concorrente.

## 19. Progressão diária e Liga v4.1.0
**Decisão:** o Desafio do Dia usa a data local como semente, a sequência diária dá uma recompensa única por dia e a Liga acumula pontos localmente.

**Por quê:** o projeto é estático e não possui servidor próprio. A solução entrega progressão recorrente sem depender de banco ou serviço externo.

**Cuidados:** o desafio diário e a Liga são dados locais ao aparelho e não representam um ranking global. O progresso pessoal não deve entrar no pacote de estado do multiplayer.
## 20. Inimiga opcional, zonas de fuga e Loja v4.2.0
**Decisão:** a Caçadora pode ser desligada antes da partida. Quando ligada, três zonas vermelhas aparecem no mapa; a Caçadora precisa permanecer três segundos em cada zona para desaparecer.
**Por quê:** a pressão da inimiga passa a ter uma estratégia de fuga clara e previsível.
**Loja:** mapas especiais e fantasias premium usam somente moedas virtuais já existentes; não há pagamento real.
**Online:** as zonas são criadas pelo anfitrião e entram no pacote de estado frequente para todos desenharem a mesma situação.
