# 🐍 Snake Arena — jogo da minhoquinha

Jogo de minhocas para navegador (celular e computador), de 1 a 6 jogadores: no mesmo aparelho ou **online** entre aparelhos, com CPUs, missões, conquistas, times e uma Minhoca Caçadora.

**👉 Jogar:** https://jhoncorretor2025-blip.github.io/teste/

## Rodar no seu computador
```bash
python3 -m http.server 8000
# abra http://localhost:8000
```
(Não abre dando duplo clique no `index.html`: o navegador bloqueia módulos ES em arquivo local.)

## Para quem vai mexer no código (pessoa ou IA)
Comece pelo **[AGENTS.md](AGENTS.md)**: ele explica a estrutura, onde mexer em cada coisa, como testar e como publicar. Para saber **o que já foi feito**, veja o **[CHANGELOG.md](CHANGELOG.md)**; o que falta está em [`docs/PENDENCIAS.md`](docs/PENDENCIAS.md) e os porquês em [`docs/DECISOES.md`](docs/DECISOES.md). Também há guias em [`docs/`](docs/) — incluindo o **[padrão para usar em outros sites](docs/PADRAO-PARA-NOVOS-SITES.md)**.

- Verificar o projeto: `npm run verificar`
- Rodar os testes: `npm install` e depois `npm test`

É um site estático (HTML + CSS + JavaScript), sem etapa de build.
