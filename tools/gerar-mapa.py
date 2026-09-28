#!/usr/bin/env python3
"""Gera docs/MAPA-DO-CODIGO.md a partir do código de verdade.

Por que existe: documentação escrita à mão fica velha. Este arquivo é GERADO, então nunca
mente. Rode `python3 tools/gerar-mapa.py` depois de mexer em qualquer módulo (o
`verificar-projeto.py` avisa se você esqueceu). A saída é determinística (sem datas), pra dar
pra comparar com o arquivo atual e detectar se está desatualizado.

Uso:  python3 tools/gerar-mapa.py            -> escreve docs/MAPA-DO-CODIGO.md
      python3 tools/gerar-mapa.py --stdout   -> só imprime (usado pela verificação)
"""
import re, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
JS = RAIZ / 'js'


def descricao(texto):
    """Comentário `//` do topo do arquivo (as primeiras linhas antes do primeiro import/código)."""
    linhas = []
    for l in texto.splitlines():
        s = l.strip()
        if s.startswith('//'):
            linhas.append(s.lstrip('/').strip())
        elif s == '' and not linhas:
            continue
        else:
            break
    return ' '.join(x for x in linhas if x)[:400]


def exportados(texto):
    nomes = re.findall(r'^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z0-9_$]+)', texto, re.M)
    nomes += [n.strip() for grupo in re.findall(r'^export\s*\{([^}]*)\}', texto, re.M) for n in grupo.split(',') if n.strip()]
    return sorted(set(nomes))


def importa_de(texto):
    return sorted(set(re.findall(r"from\s+'\./([A-Za-z0-9_\-]+)\.js'", texto)))


def campos_do_estado(texto):
    """Chaves de topo do objeto `state` (com o comentário que vem depois delas, se tiver)."""
    m = re.search(r'export const state\s*=\s*\{', texto)
    if not m:
        return []
    corpo, prof, i = [], 1, m.end()
    ini = i
    while i < len(texto) and prof:
        prof += {'{': 1, '}': -1}.get(texto[i], 0)
        i += 1
    bloco = texto[ini:i - 1]
    campos = []
    nivel = 0
    for linha in bloco.splitlines():
        if nivel == 0:
            mm = re.match(r'\s{2}([A-Za-z0-9_]+)\s*:\s*(.*)', linha)
            if mm:
                coment = re.search(r'//\s*(.*)$', mm.group(2))
                campos.append((mm.group(1), coment.group(1).strip() if coment else ''))
        nivel += linha.count('{') + linha.count('[') - linha.count('}') - linha.count(']')
    return campos


def gerar():
    arquivos = sorted(JS.glob('*.js'))
    saida = ['# Mapa do código (GERADO — não edite à mão)', '',
             'Gerado por `python3 tools/gerar-mapa.py`. Se você mexeu em algum módulo, rode de novo.', '',
             '## Módulos em `js/`', '',
             '| Módulo | Linhas | O que faz (comentário do topo) | Importa de |',
             '|---|---:|---|---|']
    textos = {}
    for a in arquivos:
        t = a.read_text(encoding='utf-8')
        textos[a.name] = t
        d = descricao(t).replace('|', '\\|') or '_(sem comentário no topo)_'
        imp = ', '.join(f'`{x}`' for x in importa_de(t)) or '—'
        saida.append(f'| `{a.name}` | {len(t.splitlines())} | {d} | {imp} |')

    saida += ['', '## O que cada módulo exporta', '']
    for nome, t in textos.items():
        ex = exportados(t)
        saida.append(f'- **`{nome}`**: ' + (', '.join(f'`{e}`' for e in ex) if ex else '_(nada — só efeitos ao carregar)_'))

    net = textos.get('net.js', '')
    tipos = sorted(set(re.findall(r"type:\s*'([a-zA-Z]+)'", net)) | set(re.findall(r"msg\.type\s*===\s*'([a-zA-Z]+)'", net)))
    saida += ['', '## Tipos de mensagem da rede (`net.js`)', '',
              'Detalhes de quem manda o quê em `docs/PROTOCOLO-ONLINE.md`.', '',
              ', '.join(f'`{t}`' for t in tipos)]

    campos = campos_do_estado(textos.get('state.js', ''))
    saida += ['', f'## Campos do `state` (`state.js`) — {len(campos)} campos', '',
              'Todo o jogo lê e escreve neste objeto único. Comentário = o que está escrito no código.', '',
              '| Campo | Comentário |', '|---|---|']
    for c, coment in campos:
        saida.append(f'| `{c}` | {coment.replace("|", chr(92) + "|") or "—"} |')

    html = (RAIZ / 'index.html').read_text(encoding='utf-8')
    ids = sorted(set(re.findall(r'id="([^"]+)"', html)))
    saida += ['', f'## Elementos da tela (`index.html`) — {len(ids)} ids', '',
              'O JS acha os elementos por `$(\'id\')`. Ao remover/renomear um id, atualize o JS (o `verificar-projeto.py` confere).', '',
              ', '.join(f'`{i}`' for i in ids), '']
    return '\n'.join(saida)


if __name__ == '__main__':
    texto = gerar()
    if '--stdout' in sys.argv:
        print(texto)
    else:
        destino = RAIZ / 'docs' / 'MAPA-DO-CODIGO.md'
        destino.parent.mkdir(exist_ok=True)
        destino.write_text(texto, encoding='utf-8')
        print(f'✅ escrito {destino.relative_to(RAIZ)} ({len(texto.splitlines())} linhas)')
