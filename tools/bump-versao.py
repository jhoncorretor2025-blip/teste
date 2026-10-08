#!/usr/bin/env python3
"""Troca a versão do jogo nos 4 lugares de uma vez. Uso: python3 tools/bump-versao.py 2.84.0

Por que existe: a versão vive em js/config.js, version.txt, sw.js (nome do cache) e index.html.
Esquecer UM deles já causou cache velho e problemas de atualização. `version.txt` é o que faz
os aparelhos já abertos se atualizarem sozinhos — então SÓ troque a versão quando o
comportamento do jogo mudou (mudança só de docs/tests/tools não precisa de versão nova).

Também cuida do CHANGELOG.md: move o que estiver em "## [Não lançado]" para a versão nova (com a
data de hoje). Se "Não lançado" estiver vazio, deixa o lembrete "(descreva o que mudou nesta versão)"
— e o verificar-projeto.py reprova enquanto ele estiver lá.
"""
import re, sys
from datetime import date
from pathlib import Path
RAIZ = Path(__file__).resolve().parent.parent

if len(sys.argv) != 2 or not re.fullmatch(r'\d+\.\d+\.\d+', sys.argv[1]):
    sys.exit('Uso: python3 tools/bump-versao.py X.Y.Z   (ex: 2.84.0)')
nova = sys.argv[1]
cfg = (RAIZ / 'js/config.js').read_text(encoding='utf-8')
velha = re.search(r"VERSION\s*=\s*'([^']+)'", cfg).group(1)
if nova == velha: sys.exit(f'A versão já é {velha}.')
if tuple(map(int, nova.split('.'))) < tuple(map(int, velha.split('.'))):
    print(f'⚠️  {nova} é MENOR que a atual ({velha}) — os aparelhos com a versão maior podem não atualizar.')

def troca(caminho, antes, depois, exato=True):
    p = RAIZ / caminho; t = p.read_text(encoding='utf-8')
    n = len(re.findall(antes, t))
    if n == 0: sys.exit(f'❌ não achei a versão antiga em {caminho} — nada foi alterado ali; confira na mão.')
    p.write_text(re.sub(antes, depois, t), encoding='utf-8'); print(f'  {caminho}: {n} ocorrência(s) trocada(s)')

troca('js/config.js', rf"(VERSION\s*=\s*')({re.escape(velha)})(')", rf"\g<1>{nova}\g<3>")
troca('sw.js', rf"(snake-arena-v){re.escape(velha)}", rf"\g<1>{nova}")
troca('index.html', rf"(?<![\d.@]){re.escape(velha)}(?![\d.])", nova)
(RAIZ / 'version.txt').write_text(nova, encoding='utf-8'); print('  version.txt: reescrito (sem quebra de linha no fim)')


def atualizar_changelog(nova):
    p = RAIZ / 'CHANGELOG.md'
    if not p.exists():
        print('  ⚠️  CHANGELOG.md não existe — registre a versão na mão.'); return
    t = p.read_text(encoding='utf-8')
    if re.search(rf'^## \[{re.escape(nova)}\]', t, re.M):
        print(f'  CHANGELOG.md: já existe uma entrada da {nova} — não mexi.'); return
    m = re.search(r'^## \[Não lançado\][^\n]*\n(.*?)(?=^## \[)', t, re.S | re.M)
    primeiro = re.search(r'^## \[', t, re.M)
    util = [l for l in (m.group(1).split('\n') if m else []) if l.strip() and not l.strip().startswith('*(') and l.strip() != '_(nada por enquanto)_']
    corpo = '\n'.join(util) if util else '- (descreva o que mudou nesta versão)'
    secao_nova = f'## [{nova}] — {date.today().isoformat()}\n{corpo}\n\n'
    reset = '## [Não lançado]\n*(mudanças que não trocam a versão do jogo: só documentação, ferramentas e testes)*\n_(nada por enquanto)_\n\n'
    if m and primeiro and m.start() == primeiro.start():
        # "Não lançado" é a PRIMEIRA seção: esvazia e põe a versão nova logo abaixo dela
        novo_texto = t[:m.start()] + reset + secao_nova + t[m.end():]
    else:
        # Versões novas ficam no TOPO do arquivo (é como o CHANGELOG está organizado hoje) e "Não lançado" pode
        # estar em qualquer lugar (ou nem existir). Antes a entrada caía dentro/depois do "Não lançado" lá no
        # meio do arquivo, fora de ordem. Aqui: esvazia "Não lançado" onde ele estiver e põe a versão no topo.
        base = t[:m.start()] + reset + t[m.end():] if m else t
        topo = primeiro.start() if primeiro else len(base)
        novo_texto = base[:topo] + secao_nova + base[topo:]
    p.write_text(novo_texto, encoding='utf-8')
    print(f'  CHANGELOG.md: "Não lançado" movido para a versão {nova}' + ('' if util else ' — ⚠️ estava vazio: PREENCHA o lembrete antes de publicar'))


atualizar_changelog(nova)
print(f'✅ {velha} → {nova}. Agora rode: python3 tools/verificar-projeto.py')
