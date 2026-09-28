#!/usr/bin/env python3
"""Troca a versão do jogo nos 4 lugares de uma vez. Uso: python3 tools/bump-versao.py 2.84.0

Por que existe: a versão vive em js/config.js, version.txt, sw.js (nome do cache) e index.html.
Esquecer UM deles já causou cache velho e problemas de atualização. `version.txt` é o que faz
os aparelhos já abertos se atualizarem sozinhos — então SÓ troque a versão quando o
comportamento do jogo mudou (mudança só de docs/tests/tools não precisa de versão nova).
"""
import re, sys
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
print(f'✅ {velha} → {nova}. Agora rode: python3 tools/verificar-projeto.py')
