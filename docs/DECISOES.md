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

**6. O anfitrião aprova manualmente quem entra (v2.61.0)** — com um "aprovar sozinho" após 6 s para quem abre uma versão muito antiga em cache.
- **Por quê:** o dono quer decidir quem joga. **Cuidado:** a **reconexão automática** (`reconnectRequest`, v2.76.0) **não** pede aprovação: se pedisse, o anfitrião teria que notar um popup novo e o cliente ficaria parado esperando.

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

## Visual
**14. Cada tema visual tem o seu fundo: cor, brilho central, decoração animada e comidinha (v2.82.0).**
- **Por quê:** antes só a cor de fundo e a das linhas mudavam, e escuras e parecidas; as estrelinhas eram sempre iguais. **Regra:** o fundo mais claro de cada tema (`bg2`) precisa ter contraste ≥ 2,6 com **todas** as cores de minhoca (a roxa quase sumia). O verificador confere que `BOARD_THEMES` e o `<select id="boardTheme">` têm os mesmos temas.
