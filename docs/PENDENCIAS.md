# O que ainda falta (pendências, ideias e o que nunca foi conferido)

Junto com o `CHANGELOG.md` (o que **já foi feito**) e `docs/DECISOES.md` (**por que** é assim), este arquivo diz **o que falta**. Terminou algo daqui? **Apague o item** e registre no `CHANGELOG.md`. Achou algo novo? **Acrescente aqui**, com o que já foi tentado.

## 🔴 Bug em aberto: multiplayer real no celular
Com o anfitrião no PC e o amigo no celular, o celular não recebe os dados do jogo (embora o ping funcione e o anfitrião veja a minhoca do amigo se mexer). Sintoma, o que já foi tentado e o próximo passo mais útil (print do painel 🩺 **do anfitrião**) estão no fim de `docs/ARMADILHAS.md`. **Nunca foi conseguido esse print.**

## 🟢 Correção aplicada na 2.86.0
- **Slots do multiplayer:** corrigido o risco de os slots mudarem quando alguém sai da sala. O slot agora fica associado à própria conexão.

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
- **Do começo do desenvolvimento:** Modo Cooperativo; Desafio do Dia; Lista de amigos favoritos; algumas melhorias específicas de Android/iPhone (só parcialmente feitas).
- **Das 15 melhorias online propostas** (feitas: sinal 📶, ping, aviso de conexão instável e reconexão automática): animação de entrada de minhoca nova; contorno piscando quando alguém entra/sai; coroa ou brilho no anfitrião; compactar os pacotes com nomes de campo curtos; enviar menos vezes quando ninguém se move; interpolação entre pacotes; priorizar a posição das minhocas no envio; histórico detalhado de partidas online (já existem o placar da sessão e o histórico de confrontos); botão de convidar mais gente durante a partida; trocar de anfitrião manualmente.

## 🔵 Nunca conferido em aparelho de verdade
Tudo o que é online foi testado só com **rede simulada**. Ainda precisa de teste com **dois aparelhos reais**: os times online (escolha, aviso de time, CPUs, marcadores ▲ ■, placar somado), a setinha da caçadora e o visual dos temas no celular (a velocidade e a quantidade das partículas foram escolhidas no olho, sem ver a tela).
- **Conquistas:** houve suspeita de que nem todas desbloqueiam em todos os cenários. Não foi verificado.

## ⚪ Melhorias de estrutura possíveis
- Os três maiores arquivos (`main.js`, `render.js`, `loop.js`) acumulam muita coisa; dividir por assunto facilitaria editar (veja os tamanhos em `docs/MAPA-DO-CODIGO.md`). Lembre: módulo novo entra no `ASSETS` do `sw.js` e nos guias (o verificador cobra).
- Sem teste próprio: `ai.js`, `mission.js`, `sound.js`, `storage.js` (incluindo as conquistas), `share.js`, `tutorial.js`, `leaderboard.js`, `players.js`, `input.js` e `food.js`.
