# Padrão para qualquer site nosso — e como aplicar na Biobel

## A ideia
Qualquer IA (ou pessoa) que chegar num site nosso deve encontrar **sempre a mesma porta de entrada**, sem precisar adivinhar:

1. **`AGENTS.md`** na raiz — o que é o site, como está organizado, onde mexer, como testar e publicar;
2. um **mapa do código gerado** (nunca desatualiza);
3. um **verificador** que reprova erros conhecidos antes de publicar;
4. **testes** dentro do repositório;
5. um **publicador** de um comando só;
6. um arquivo de **armadilhas** (o que já deu errado, pra ninguém repetir);
7. a **memória do projeto**: um `CHANGELOG.md` (o que já foi feito), `docs/DECISOES.md` (por que é assim) e `docs/PENDENCIAS.md` (o que falta) — para a IA nova não refazer o que já existe nem desfazer o que foi decidido de propósito.

O jogo da minhoquinha é o **projeto-modelo**: tudo isso já existe nele e funciona.

## O que copiar do projeto da minhoca
| Arquivo | Serve para | Precisa adaptar? |
|---|---|---|
| `AGENTS.md` | porta de entrada | **Sim** — parta de `docs/modelo/AGENTS.modelo.md` |
| `CLAUDE.md` | faz o Claude Code ler o `AGENTS.md` | Não, copie igual |
| `README.md` | apresentação | Sim |
| `docs/ARMADILHAS.md` | erros que já aconteceram | Comece com o formato e vá enchendo |
| `CHANGELOG.md` | **o que já foi feito**, versão por versão | Comece do histórico do site (veja "Reconstruir o histórico", abaixo) e mantenha a seção "Não lançado" |
| `docs/DECISOES.md` | **por que** as coisas são como são | Vá registrando cada decisão (o quê, por quê, o que cuidar) |
| `docs/PENDENCIAS.md` | **o que falta**, ideias não feitas, o que nunca foi conferido | Vá mantendo; apague o que terminar |
| `tools/formatar-css.py` | deixa CSS minificado legível, garantindo que nada muda | Copie igual, se o site tiver CSS |
| `docs/ARQUITETURA.md` | visão geral de como funciona | Sim (escreva a do site) |
| `docs/MAPA-DO-CODIGO.md` + `tools/gerar-mapa.py` | mapa **gerado** dos módulos | O gerador assume `js/*.js` com `export`/`import` e um comentário no topo de cada arquivo; adapte os caminhos se o site for diferente |
| `tools/publicar.py` | manda tudo num commit só e confere o resultado | **Quase nada**: use `--repo dono/nome-do-repo` (e `--branch`, se não for `main`) |
| `tools/verificar-projeto.py` | reprova erros conhecidos | Sim — veja abaixo quais checagens valem para qualquer site |
| `tools/bump-versao.py` | trocar a versão em todos os lugares | Só se o site tiver esse sistema de versão |
| `tests/_ambiente.mjs` | base pra testar a tela com o `jsdom` | Só se o site tiver JavaScript no navegador |
| `.gitignore`, `package.json` | organização | Sim, pequenos |

**Checagens do `verificar-projeto.py` que servem para qualquer site estático:** ids usados no JS existem no HTML; módulo que ninguém importa (código morto); erro de sintaxe; **nenhum token/segredo nos arquivos**; **CHANGELOG com a versão atual e sem lembrete pendente**; CSS sem linhas gigantes. As outras (versão em 4 lugares, `ASSETS` do service worker, temas) são específicas do jogo — mantenha só se o site tiver algo equivalente.

## Estrutura de pastas recomendada
```
index.html            (ou as páginas do site)
css/                  o visual
js/                   o código, um arquivo por assunto, cada um com comentário no topo
docs/                 ARQUITETURA.md, ARMADILHAS.md, MAPA-DO-CODIGO.md (gerado), modelo/ (se quiser)
tools/                verificar, gerar-mapa, publicar
tests/                testes automáticos
AGENTS.md  CLAUDE.md  README.md  package.json  .gitignore
```

## Passo a passo para a Biobel
1. **Onde está o código?** Se o site (ou painel) só existe dentro de uma ferramenta como o Google AI Studio, exporte/baixe os arquivos e crie um repositório no GitHub. Sem repositório não há como manter um padrão.
2. **Peça a uma IA para montar a estrutura**, entregando o prompt da próxima seção. Ela deve criar o `AGENTS.md` a partir do modelo e o mapa do código.
3. **Registre o que só o dono sabe** (a IA não tem como descobrir sozinha) — isso é o mais valioso do `AGENTS.md` da Biobel:
   - de onde vêm os dados (por exemplo, planilhas do Google: *"um arquivo por mês e uma aba por dia"* — **confirme com o dono se é assim mesmo**), como o painel lê essas planilhas e quais colunas importam;
   - as regras do negócio que o painel calcula (fechamento de caixa, metas, alertas, equipe…);
   - o que costuma dar errado (planilha com aba faltando, mês incompleto, formato de data…).
4. **Segurança (importante):** o repositório costuma ser **público**. **Nunca** coloque no repositório: chaves de API, tokens, links privados de planilha, senhas, ou **dados reais de vendas/clientes/funcionários**. Nos testes, use dados **inventados**. Se algo assim já foi publicado, apague e troque a chave/permissão.
5. Rode o verificador e os testes, e publique com o `publicar.py`.

## Reconstruir o histórico de um site que já existe
Se o site da Biobel já tem commits, **não escreva o histórico de memória**: monte o `CHANGELOG.md` do `git log` (foi assim que se fez no jogo). Passos:
1. Clone o repositório e liste os commits com data e mensagem (`git log --format='%ad|%s' --date=short --reverse`).
2. **Agrupe por versão** (ou por dia, se o site não usa versões) e **descarte as repetições**. Se cada arquivo foi enviado num commit separado, você verá centenas de mensagens iguais — no jogo eram 686 commits para umas 110 versões.
3. Escreva uma entrada por versão/dia, em português simples: o que mudou e, quando souber, **por quê**. Onde a mensagem do commit for vaga, diga isso ("sem descrição no histórico") em vez de inventar.
4. Deixe no topo a seção "Não lançado" e as instruções de manutenção. Registre no próprio arquivo de onde veio o histórico e que as datas são as dos commits.
5. Comece o `docs/DECISOES.md` e o `docs/PENDENCIAS.md` com o que o dono e o código revelarem — o que está pela metade, o que é frágil, o que ninguém testou.

## Prompt para abrir a conversa com outra IA (copie e cole)
> Você vai assumir a manutenção de um site meu. Quem mantém não é programador: explique tudo em português simples e faça mudanças pequenas.
>
> 1. **Antes de mexer em qualquer coisa**, leia o `AGENTS.md` da raiz do repositório e siga o que ele manda (estrutura, onde mexer, como testar, como publicar).
> 2. Se o `AGENTS.md` ainda não existir, sua **primeira tarefa** é criá-lo: use o modelo em `docs/modelo/AGENTS.modelo.md`, leia o código de verdade e preencha só o que você conseguir confirmar. O que você não puder confirmar, escreva como **pergunta para o dono** — não invente.
> 3. Nunca coloque senhas, tokens, chaves de API, links privados nem dados reais de clientes/vendas no repositório (ele é público).
> 4. Antes de publicar: rode o verificador e os testes. Depois de publicar: confira o resultado pela API do GitHub.
> 5. **Antes de mexer**, leia o topo do `CHANGELOG.md` (o que já foi feito) e o `docs/PENDENCIAS.md` (o que falta). Ao terminar, **registre**: o que mudou no `CHANGELOG.md` ("Não lançado"), decisões novas em `docs/DECISOES.md`, pendências em `docs/PENDENCIAS.md` e armadilhas novas em `docs/ARMADILHAS.md`, para a próxima IA.

## Várias IAs no mesmo site
- **Uma IA de cada vez.** Duas mexendo ao mesmo tempo se atropelam.
- **Antes de trocar de IA**, peça à atual: *"registre no `CHANGELOG.md`, em decisões e em pendências tudo que mudou e o que ficou pendente"*. Esses arquivos são a memória compartilhada; quem chega lê o CHANGELOG para saber o que já foi feito.
- A IA nova deve **baixar a versão mais recente** do repositório antes de começar (nada de trabalhar em cópia velha).
- Mudanças pequenas e testadas; **um commit** por publicação; mensagem de commit em português dizendo o que mudou e por quê.
- **Arquivos gerados** (como o mapa do código) não se editam à mão.
- Pendência ou bug em aberto vai para o `docs/ARMADILHAS.md`, na seção de problemas em aberto, com o que já foi tentado.

## O que eu não sei sobre a Biobel
Esta documentação foi montada a partir do **jogo da minhoquinha**. Eu **não examinei o código do site da Biobel** (nem a estrutura das planilhas dela), então **não sei** como ele está organizado hoje, se já está num repositório, nem quais checagens fazem sentido nele. O padrão acima é o caminho; o conteúdo específico da Biobel precisa ser levantado lendo o código dela — e as regras de negócio só o dono conhece.
