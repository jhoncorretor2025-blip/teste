# AGENTS.md — leia isto primeiro (vale para qualquer IA ou pessoa)

> ⚠️ **Antes de dizer que terminou qualquer tarefa aqui, rode `npm test` (que já roda o verificador sozinho) e veja "✅ Projeto OK" e "✅ Todos os X arquivos de teste passaram". Sem exceção — nem para "só uma linha".**
> Já aconteceu de outra IA fazer 129 commits sem isso e o jogo ficar **travado pra sempre** na tela de abertura, dando erro toda vez que a pessoa tentava de novo (duas funções eram chamadas sem existir de verdade no momento certo — caso completo em `docs/ARMADILHAS.md`, casos 26-27). `npm test` roda o jogo de verdade e pegaria isso na hora.

## ⚠️ Quais arquivos rodam DE VERDADE (leia antes de editar qualquer `js/*.js`)
O `index.html` **não** carrega `js/main.js`. O carregador que fica no fim do `index.html` faz `import('./js/main_stable_342.js?...')`, e dali o jogo usa: `loop_stable_336.js`, `render_stable_341.js` e `net_stable_360.js` (o `net.js` só reexporta o `net_stable_360.js`, pra todo mundo dividir a mesma conexão). **Edite esses arquivos.** Mudança feita em `main.js`, `loop.js` ou `render.js` **não aparece no jogo** (já aconteceu: melhorias inteiras foram parar em arquivo que nenhuma página carrega).
- Ao criar uma versão nova de um desses arquivos, o carregador do `index.html` e os `import` dos outros precisam apontar pra ela.
- Os testes antigos que só fazem busca de texto em `js/main.js` **não provam nada** sobre o jogo no ar. Prefira testes que executem o jogo, como `tests/criar-sala-real.mjs` e `tests/online-ponta-a-ponta-real.mjs` (usam `js/main_stable_342.js`).
- O caminho ativo mantém uma única implementação de renderização: `loop_stable_336.js` e `main_stable_342.js` usam `render_stable_341.js`.

## O que é este projeto
**Snake Arena** (o "jogo da minhoquinha"): jogo de minhocas para navegador, de 1 a 6 jogadores — no mesmo aparelho ou **online** entre aparelhos —, com CPUs, modos de jogo, missões, conquistas, times e uma Minhoca Caçadora.

- **Site:** https://jhoncorretor2025-blip.github.io/teste/
- **Repositório:** https://github.com/jhoncorretor2025-blip/teste (branch `main`; o GitHub Pages publica a **raiz** do repositório)
- É um **site estático**: HTML + CSS + JavaScript (módulos ES). **Sem build, sem framework, sem servidor nosso.** O online é ponto a ponto (PeerJS/WebRTC, carregado de um CDN).
- **Idioma: português do Brasil em tudo** (textos da tela, comentários no código, mensagens de commit). Quem mantém o projeto **não é programador**: explique o que fez em linguagem simples.

## Comece por aqui (6 passos)
1. Leia este arquivo, o **topo do `CHANGELOG.md`** (o que já foi feito) e `docs/PENDENCIAS.md` (o que falta). Depois o `docs/MAPA-DO-CODIGO.md` (mapa **gerado** do código, sempre em dia).
2. Ache o lugar certo na tabela **"Onde mexer"** abaixo. Algo parece estranho? Leia `docs/DECISOES.md` antes de mudar (pode ser de propósito) e `docs/ARMADILHAS.md` se for mexer em rede, cache ou versão.
3. Faça a mudança pequena e clara.
4. Rode `npm test` (já dispara o verificador sozinho antes) — faça `npm install` uma vez antes. **Isso não é opcional, nem para mudança pequena.**
5. **Registre o que fez** (veja "Registrar o que você fez", abaixo).
6. Publique com `tools/publicar.py` — **um commit só** (veja "Publicar").

## Comandos
| Para... | Comando |
|---|---|
| Abrir o jogo no seu computador | `python3 -m http.server 8000` e abra http://localhost:8000 (**não** abre com duplo clique: módulos ES exigem http) |
| Instalar o que os testes precisam | `npm install` (só a 1ª vez; é só o `jsdom`, o site em si não usa nada) |
| Verificar o projeto antes de publicar | `npm run verificar` (= `python3 tools/verificar-projeto.py`) |
| Rodar todos os testes | `npm test` (= `node tests/rodar-tudo.mjs`, leva cerca de meio minuto) |
| Atualizar o mapa do código | `npm run mapa` (= `python3 tools/gerar-mapa.py`) |
| Trocar a versão nos 4 lugares (e mover o "Não lançado" do CHANGELOG para a versão nova) | `python3 tools/bump-versao.py 2.84.0` |
| Deixar o CSS legível (uma declaração por linha, sem mudar o visual) | `python3 tools/formatar-css.py css/style.css` |
| Publicar | `GITHUB_TOKEN=... python3 tools/publicar.py --mensagem "o que mudou" --enviar` (sem `--enviar` só mostra o que faria) |

## Estrutura de pastas
```
index.html              a tela toda (menu + jogo). Todo id que o JS usa mora aqui
css/style.css           todo o visual
js/                     o código — main_stable_342.js é o ÚNICO carregado pelo HTML; ele importa o resto
sw.js                   service worker: modo offline + cache (tem a lista ASSETS — veja armadilhas)
version.txt             número da versão; o jogo consulta e se atualiza sozinho nos aparelhos abertos
manifest.webmanifest    app instalável (ícone, atalhos)   ·   icon.svg   o ícone
CHANGELOG.md           o que JÁ FOI FEITO, versão por versão (a memória do projeto)
docs/                   guias: MAPA-DO-CODIGO (gerado), ARQUITETURA, PROTOCOLO-ONLINE, ARMADILHAS,
                        DECISOES (por que é assim), PENDENCIAS (o que falta), PADRAO-PARA-NOVOS-SITES
tools/                  verificar-projeto, bump-versao, gerar-mapa, publicar
tests/                  testes automáticos (jsdom, sem navegador de verdade); _ambiente.mjs é a base pra escrever novos
package.json            só pra rodar os testes
```
`docs/`, `tests/` e `tools/` também ficam públicos no site (é inofensivo, mas **nunca** coloque segredo em nenhum arquivo).

## Como o jogo funciona (o essencial)
- **Um objeto só guarda tudo:** `state` (`js/state.js`). Todos os módulos importam o mesmo e leem/escrevem nele.
- **`tick()`** (`js/loop.js`) é um passo do jogo: move, come, mata, decide missões e caçadora, desenha e (online) manda o estado. Roda de tempos em tempos (`setInterval`, ~160 ms no normal).
- **Quem roda o `tick`:** só a partida **local** ou o **anfitrião** da sala online. Os **clientes online não rodam `tick`**: recebem o estado pronto do anfitrião (`applyRemoteState`) e só desenham.
  - **Consequência prática:** tudo que for novo e existir só dentro do `tick` **não aparece no celular do amigo**, a menos que (a) vá no pacote de estado ou (b) seja calculado no `render.js` a partir do que já vai no pacote. Partículas, por exemplo, só existem no anfitrião.
- **Desenho:** `js/render_stable_341.js` desenha num `<canvas>` (fundo por tema, comidas, minhocas, caçadora, minimapa) e monta o placar em HTML.
- **Salvo no aparelho** (`localStorage`): recordes, perfil, conquistas, atalhos, escolhas de time… tudo em `js/storage.js`.
- Mais detalhes: `docs/ARQUITETURA.md` e `docs/PROTOCOLO-ONLINE.md`.

## Onde mexer
| Quero... | Vá em |
|---|---|
| Velocidade, tamanho de mapa, dificuldade | `js/config.js` (`SPEEDS`, `MAP_SIZES`, `DIFFICULTY`) |
| Novo **tema visual** | `js/config.js` (`BOARD_THEMES`) **e** um `<option>` no `<select id="boardTheme">` do `index.html` (o verificador confere os dois) |
| Cores das minhocas | `js/config.js` (`COLORS`, `SNAKE_COLORS`) |
| Nova conquista | `js/config.js` (`ACHIEVEMENTS`) + o gatilho em `js/loop.js`/`js/mission.js`; o que já foi desbloqueado fica em `js/storage.js` |
| Sons | `js/sound.js` (objeto `sfx`; tudo é gerado na hora, não há arquivo de áudio) |
| Regras da partida (comer, morrer, turbo) | `js/loop_stable_336.js` (`tick`, `kill`, `tryBoost`) |
| IA das CPUs | `js/ai.js` (`aiDir`) |
| **Minhoca Caçadora** | `js/loop_stable_336.js` (`checkHunterSpawn`, `spawnHunter`, `montarCorpoDaCacadora`, `updateHunter`) + `js/ai.js` (`hunterDir`) + `js/render_stable_341.js` (`drawHunter`, `drawHunterPointer`, `drawHunterVignette`) + `js/sound.js`. Já existiu um `js/hunter.js`: era código morto e foi apagado — a lógica de verdade está no `loop.js` |
| Comida (nascer, especial de sequência, virar estrela) | `js/food.js` e `js/loop_stable_336.js` |
| O que aparece na tela durante o jogo | `js/render_stable_341.js` (placar: `renderScores`) |
| Botões, abas e telas do menu | `index.html` + `js/main_stable_342.js` + `css/style.css` |
| **Times** | regras em `js/teams.js` (função pura); telas em `js/main_stable_342.js`; montagem ao começar em `js/loop_stable_336.js` (`startOnlineHostGame`) |
| Rede / protocolo online | `js/net_stable_360.js` + `js/net.js` + `docs/PROTOCOLO-ONLINE.md`. **Campo novo no pacote de estado:** `js/loop.js` no envio (`broadcastState`) **e** no recebimento (`applyRemoteState`) |
| O que fica salvo no aparelho | `js/storage.js` (**não renomeie** as chaves `*_KEY`: todo mundo perderia o que tinha salvo) |
| Modo offline / cache | `sw.js` (`ASSETS`) |

## Convenções
- **Comentários explicam o PORQUÊ** (a razão, ou o bug que aquilo evita), em português, com linguagem simples. Siga o estilo dos arquivos existentes.
- Sem build, sem TypeScript, sem dependências no navegador (só o PeerJS por CDN). ES modules, 2 espaços.
- Todo módulo começa com um **comentário no topo** dizendo o que ele faz (o mapa gerado usa isso).
- Funcionalidade nova → **teste novo** em `tests/` (comece de `tests/_ambiente.mjs`). Bug corrigido → um teste que **falharia** sem a correção.
- Mudou o jeito de o jogo se comportar? **Troque a versão** (`tools/bump-versao.py`). Mudou só docs/tests/tools? **Não** troque (a versão nova faz todo aparelho aberto recarregar).
- Não edite à mão o `docs/MAPA-DO-CODIGO.md` (é gerado).

## Registrar o que você fez (obrigatório)
Este projeto é mexido por várias IAs, uma depois da outra. O que evita retrabalho e desfazer coisas sem querer é o **registro**:
- **`CHANGELOG.md` → "Não lançado":** o que mudou, em português simples, e o **porquê** quando não for óbvio. Vale para **qualquer** mudança (até só documentação).
- **`docs/DECISOES.md`:** tomou ou mudou uma decisão? Escreva o quê, por quê e o que cuidar.
- **`docs/PENDENCIAS.md`:** terminou algo de lá? **Apague o item.** Deixou algo pela metade ou achou um problema? Acrescente, com o que já foi tentado.
- **`docs/ARMADILHAS.md`:** caiu numa armadilha nova? Acrescente (sintoma → causa → como evitar).
- Trocou a versão? O `bump-versao.py` move o "Não lançado" para a versão nova e o verificador **reprova** se a versão atual não tiver entrada no CHANGELOG.

## Antes de publicar (checklist)
1. `npm run mapa` (se mexeu em módulos ou no state).
2. `npm run verificar` → tem que dar ✅.
3. `npm test` → tem que dar ✅. Se mexeu em rede, teste também com **dois aparelhos de verdade** (o teste simula a rede; não substitui aparelho real).
4. Módulo novo? Coloque em `ASSETS` no `sw.js` e cite em `AGENTS.md` (o verificador confere).
5. **Registrou** no `CHANGELOG.md` (e em decisões/pendências, se for o caso)?
6. Publique com `tools/publicar.py` e confira o resultado pela **API** do GitHub (o endereço `raw.githubusercontent.com` guarda cache e mostra versão velha por um tempo).

## Publicar
⚠️ **Antes de publicar, baixe o repositório de novo, agora mesmo** — nunca reaproveite uma cópia de uma mensagem anterior da conversa. Este projeto é mexido por mais de uma IA (às vezes no mesmo dia); se o repositório mudou desde que você baixou, publicar com `--apagar-removidos` em cima de uma cópia velha **apaga o trabalho de quem mexeu depois de você** (já aconteceu de verdade — caso 31 em `docs/ARMADILHAS.md`). `python3 tools/publicar.py` sozinho (sem `--enviar`) mostra o que mudaria sem publicar nada — rode assim primeiro e desconfie se aparecer gente em "removidos" que você não esperava.

O `tools/publicar.py` manda **todas** as mudanças num **único commit** (evita a enxurrada de builds do Pages, em que os intermediários dão "errored" — só o último importa). Ele precisa de um token do GitHub: peça ao dono para criar um *fine-grained token* com **Contents: Read and write** só neste repositório, e passe pela variável `GITHUB_TOKEN`. **Jamais grave o token em arquivo, commit ou mensagem** — o repositório é público (o verificador procura tokens e reprova).

## Armadilhas que já custaram caro (resumo — detalhes em `docs/ARMADILHAS.md`)
1. `node --check arquivo.js` sozinho dá **falso "ok"**; use `node --input-type=module --check`.
2. A versão vive em **4 lugares**; esquecer um causa cache velho. Use `bump-versao.py`.
3. Arquivo novo em `js/` precisa entrar no `ASSETS` do `sw.js`, senão o jogo quebra offline.
4. Cliente online **não roda `tick`**: o que só existe no anfitrião não aparece no celular do amigo.
5. O pacote de estado tem **dois formatos** (frequente e raro); o raro é enviado **uma vez só**, quando a partida começa.
6. `catch {}` vazio já escondeu erros de envio de rede; o painel 🩺 (diagnóstico) existe por causa disso.
7. Testes com dois participantes exigem **cópias isoladas** do jogo (módulos usam `document` global).
8. Código morto engana: tudo em `js/` precisa ser importado por alguém (o verificador confere).
9. CSS com linhas gigantes: o `css/style.css` chegou a ter linhas de 13 mil caracteres; mantenha legível (`tools/formatar-css.py`, o verificador confere).
10. Publicar com cópia local desatualizada apaga trabalho de outra IA — baixe de novo antes de publicar, sempre (caso 31 nas armadilhas).
11. O histórico do Git é ilegível (centenas de commits repetidos, um por arquivo, nas versões antigas): a memória do projeto é o `CHANGELOG.md`, não o `git log`.

## Problema em aberto
O multiplayer **real** no celular ainda tem um bug sem causa confirmada (o celular do amigo não recebe os dados do jogo, embora o ping funcione). Está descrito, com o que já foi tentado, no fim de `docs/ARMADILHAS.md`. Se for investigar, comece pelo painel 🩺.

## Módulos (`js/`)
Detalhes, exports e imports de cada um: `docs/MAPA-DO-CODIGO.md`.
- `main.js` — ponto de entrada: liga botões, abas (`?tab=`), sala online, aprovação de entrada, times (telas), atualização automática de versão.
- `state.js` — o objeto `state`. · `config.js` — constantes fixas (velocidades, mapas, temas, cores, conquistas).
- `loop.js` — o coração: iniciar partida, `tick`, caçadora, comida especial, envio/recebimento do estado online.
- `render.js` — tudo que é desenhado (canvas, minimapa, placar, painel de diagnóstico).
- `net.js` — multiplayer (PeerJS): salas, aprovação, reconexão, migração de anfitrião, ping.
- `teams.js` — montagem dos times (lógica pura). · `players.js` — cartões dos jogadores no menu.
- `ai.js` — cérebro das CPUs e da caçadora. · `food.js` — comida e partículas. · `mission.js` — missões.
- `input.js` — teclado, joystick, D-pad, swipe, turbo. · `sound.js` — sons. · `storage.js` — dados salvos.
- `leaderboard.js` — ranking local. · `share.js` — cartão de pontuação em imagem. · `tutorial.js` — tutorial da 1ª visita. · `utils.js` — utilidades pequenas.
