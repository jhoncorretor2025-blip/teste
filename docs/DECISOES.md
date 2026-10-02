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
