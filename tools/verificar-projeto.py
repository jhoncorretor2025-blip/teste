#!/usr/bin/env python3
"""Verifica se o projeto está "de pé" ANTES de publicar. Rode: python3 tools/verificar-projeto.py

Cada checagem existe por causa de um erro real que já aconteceu neste projeto (veja
docs/ARMADILHAS.md). Sai com código 1 se algo estiver errado, com a explicação em português.
"""
import re, subprocess, sys, shutil
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
JS = RAIZ / 'js'
falhas, avisos = [], []


def ok(msg): print(f'  ✅ {msg}')
def falha(msg, dica=''):
    falhas.append(msg); print(f'  ❌ {msg}' + (f'\n     ↳ {dica}' if dica else ''))
def aviso(msg): avisos.append(msg); print(f'  ⚠️  {msg}')
def ler(p): return (RAIZ / p).read_text(encoding='utf-8')


print('1) Versão igual nos 4 lugares (config.js, version.txt, sw.js, index.html)')
versao = re.search(r"VERSION\s*=\s*'([^']+)'", ler('js/config.js')).group(1)
txt = ler('version.txt').strip()
cache = re.search(r"CACHE\s*=\s*'snake-arena-v([^']+)'", ler('sw.js')).group(1)
no_html = set(re.findall(r'(?<![\d.@])(\d+\.\d+\.\d+)(?![\d.])', ler('index.html')))
if txt == versao and cache == versao and no_html <= {versao}:
    ok(f'tudo em {versao}')
else:
    falha(f'versões diferentes: config.js={versao}, version.txt={txt}, sw.js={cache}, index.html={sorted(no_html)}',
          'Use `python3 tools/bump-versao.py X.Y.Z` — ele troca nos 4 lugares de uma vez. Se ficar desigual, o jogo pode ficar preso em cache velho ou recarregar em loop.')

print('2) Todo id usado no JS existe no index.html')
ids_html = set(re.findall(r'id="([^"]+)"', ler('index.html')))
ids_js = set()
for f in JS.glob('*.js'):
    t = f.read_text(encoding='utf-8')
    ids_js |= set(re.findall(r"\$\('([^']+)'\)", t)) | set(re.findall(r'getElementById\([\'"]([^\'"]+)[\'"]\)', t))
faltando = sorted(ids_js - ids_html)
ok(f'{len(ids_js)} ids conferidos') if not faltando else falha(f'ids que o JS usa e o HTML não tem: {faltando}', 'Um `$("x")` nulo derruba o script inteiro na hora de carregar.')

print('3) Nenhum módulo morto NOVO (a partir do arquivo realmente carregado pelo index.html)')
grafo = {f.name: set(m + '.js' for m in re.findall(r"from\s+'\./([A-Za-z0-9_\-]+)\.js(?:\?[^']*)?'", f.read_text(encoding='utf-8'))) for f in JS.glob('*.js')}
html_entrada = re.search(r"import\(\s*['\"]\.?/js/([A-Za-z0-9_\-]+)\.js", ler('index.html'))
entrada_ativa = (html_entrada.group(1) + '.js') if html_entrada else 'main_stable_342.js'
vistos, fila = set(), [entrada_ativa]
while fila:
    n = fila.pop()
    if n in vistos or n not in grafo: continue
    vistos.add(n); fila += grafo[n]
mortos = sorted(set(grafo) - vistos)
MORTOS_CONHECIDOS = {
    'main.js',
    *{f'main_stable_{n}.js' for n in range(334, 342)},
    'loop.js', 'loop_stable_334.js', 'loop_stable_335.js',
    'render.js', 'render_stable_334.js', 'render_stable_335.js',
    'render_stable_336.js', 'render_stable_340.js',
    'storage_v459.js', 'storage_v4510.js',
}
mortos_novos = sorted(set(mortos) - MORTOS_CONHECIDOS)
if not mortos_novos:
    ok(f'{len(vistos)} módulos ativos; {len(mortos)} legados conhecidos ignorados')
else:
    falha(f'módulos que ninguém importa e não estão na lista de legados: {mortos_novos}', 'Código morto NOVO engana quem vem depois. Ligue o módulo ao caminho ativo ou remova-o; os backups antigos já estão na lista de exceções.')

print('4) sw.js (modo offline) lista todos os arquivos do jogo')
sw = ler('sw.js')
assets = set(re.findall(r"'\./([^']+)'", sw.split('const ASSETS')[1].split('];')[0]))
esperados = {f'js/{n}' for n in grafo} | {'index.html', 'css/style.css', 'manifest.webmanifest', 'icon.svg'}
sem_cache = sorted(esperados - assets); inexistentes = sorted(a for a in assets if a and not (RAIZ / a).exists())
ok(f'{len(assets)} arquivos no cache offline') if not sem_cache and not inexistentes else falha(
    f'fora do cache: {sem_cache}; listados mas inexistentes: {inexistentes}',
    'Módulo novo precisa entrar em ASSETS no sw.js, senão o jogo quebra offline. E um arquivo inexistente na lista quebra a instalação inteira do cache.')

print('5) Sintaxe de todos os módulos (como módulo ES)')
if shutil.which('node'):
    ruins = []
    for f in sorted(JS.glob('*.js')):
        r = subprocess.run(['node', '--input-type=module', '--check'], input=f.read_text(encoding='utf-8'), capture_output=True, text=True)
        if r.returncode: ruins.append((f.name, r.stderr.strip().splitlines()[-1] if r.stderr else '?'))
    r = subprocess.run(['node', '--check', str(RAIZ / 'sw.js')], capture_output=True, text=True)
    if r.returncode: ruins.append(('sw.js', r.stderr.strip()[:120]))
    ok('sem erro de sintaxe') if not ruins else falha(f'erro de sintaxe: {ruins}', 'Sempre com --input-type=module: `node --check arquivo.js` sozinho já deu falso "ok" aqui.')
else:
    aviso('node não encontrado — não deu pra checar a sintaxe')

print('6) docs/MAPA-DO-CODIGO.md está em dia')
sys.path.insert(0, str(RAIZ / 'tools'))
import importlib.util
spec = importlib.util.spec_from_file_location('gerar_mapa', RAIZ / 'tools' / 'gerar-mapa.py'); gm = importlib.util.module_from_spec(spec); spec.loader.exec_module(gm)
mapa = RAIZ / 'docs' / 'MAPA-DO-CODIGO.md'
ok('mapa igual ao código') if mapa.exists() and mapa.read_text(encoding='utf-8') == gm.gerar() else falha('o mapa do código está desatualizado (ou não existe)', 'Rode `python3 tools/gerar-mapa.py`.')

print('7) Os guias citam todos os módulos')
guias = ''.join(ler(p) for p in ('AGENTS.md', 'docs/ARQUITETURA.md') if (RAIZ / p).exists())
sem_citar = sorted(n for n in grafo if n not in guias)
ok('AGENTS.md/ARQUITETURA.md falam de todos os módulos') if guias and not sem_citar else falha(f'módulos sem menção nos guias: {sem_citar or "(guias não existem)"}', 'Módulo novo? Acrescente uma linha sobre ele em AGENTS.md ou docs/ARQUITETURA.md.')

print('8) Nenhum segredo (token) nos arquivos')
achou = []
for p in RAIZ.rglob('*'):
    if p.is_file() and '.git' not in p.parts and 'node_modules' not in p.parts and p.suffix in {'.js', '.mjs', '.py', '.md', '.html', '.json', '.txt', '.sh', '.css'}:
        if re.search(r'github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{20,}', p.read_text(encoding='utf-8', errors='ignore')):
            achou.append(str(p.relative_to(RAIZ)))
ok('nenhum token encontrado') if not achou else falha(f'TOKEN em: {achou}', 'Apague AGORA e REVOGUE o token no GitHub (Settings → Developer settings). O repositório é público!')

print('9) Temas e tamanhos de mapa: config.js e index.html com os mesmos valores')
cfg = ler('js/config.js'); html = ler('index.html')
def opcoes(id_select):
    m = re.search(r'<select id="%s".*?</select>' % id_select, html, re.S)
    return set(re.findall(r'<option value="([^"]+)"', m.group(0))) if m else set()
def da_config(nome):
    m = re.search(r'export const %s = \[(.*?)\n\];' % nome, cfg, re.S)
    return set(re.findall(r"value:\s*'([^']+)'", m.group(0))) if m else set()
diferencas = []
for nome, sel in (('BOARD_THEMES', 'boardTheme'), ('MAP_SIZES', 'mapSize')):
    a, b = da_config(nome), opcoes(sel)
    if a != b: diferencas.append(f'{nome} × <select id="{sel}">: só na config={sorted(a - b)}, só no HTML={sorted(b - a)}')
ok('temas e mapas iguais nos dois lugares') if not diferencas else falha('; '.join(diferencas), 'São duas listas separadas: tema novo precisa entrar na config E como <option> no HTML.')

print('10) O que os guias citam existe de verdade no código')
GUIAS = ['AGENTS.md', 'docs/ARQUITETURA.md', 'docs/PROTOCOLO-ONLINE.md', 'docs/ARMADILHAS.md', 'docs/DECISOES.md', 'docs/PENDENCIAS.md']
EXTENSOES = r'\.(js|mjs|py|md|html|css|txt|json|webmanifest|svg)$'
CITADOS_DE_PROPOSITO = {'js/hunter.js', 'hunter.js'}  # arquivo apagado, citado só pra avisar que não existe mais
LIVRES = {'npm', 'node', 'python3', 'true', 'false', 'null', 'main', 'http'}  # palavras comuns que não são nomes do código
corpo = ''.join(p.read_text(encoding='utf-8', errors='ignore') for pasta in ('js', 'tools', 'tests') for p in (RAIZ / pasta).glob('*') if p.is_file()) + ler('index.html') + ler('sw.js') + ler('package.json')
inexistentes = []
for guia in GUIAS:
    if not (RAIZ / guia).exists(): continue
    texto = re.sub(r'```.*?```', '', ler(guia), flags=re.S)  # ignora blocos de código (desenhos de árvore etc.)
    for token in sorted(set(re.findall(r'`([^`\n]+)`', texto))):
        if token in CITADOS_DE_PROPOSITO or token in LIVRES: continue
        if re.search(r'[\s*<>?{}…=$|(]', token.replace('()', '')): continue  # comando, padrão, trecho de código: não dá pra checar
        if '/' in token or re.search(EXTENSOES, token):
            alvo = token.rstrip('/')
            if not any((RAIZ / pre / alvo).exists() for pre in ('', 'js', 'docs', 'tools', 'tests', 'css')):
                inexistentes.append(f'{guia}: arquivo/pasta `{token}`')
        elif re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*(\(\))?', token):
            nome = token.replace('()', '')
            if not re.search(r'\b%s\b' % re.escape(nome), corpo):
                inexistentes.append(f'{guia}: nome `{token}`')
ok('todo arquivo, função e constante citados nos guias existem') if not inexistentes else falha(
    f'{len(inexistentes)} citação(ões) sem correspondente no código: {inexistentes[:8]}',
    'O guia está falando de algo que não existe mais (ou foi renomeado). Corrija o guia — documentação errada é pior que nenhuma.')

print('11) Memória do projeto: CHANGELOG com a versão atual, decisões e pendências')
problemas = []
for arq in ('CHANGELOG.md', 'docs/DECISOES.md', 'docs/PENDENCIAS.md'):
    if not (RAIZ / arq).exists(): problemas.append(f'falta {arq}')
if (RAIZ / 'CHANGELOG.md').exists():
    log = ler('CHANGELOG.md')
    if not re.search(r'^## \[%s\]' % re.escape(versao), log, re.M): problemas.append(f'o CHANGELOG.md não tem "## [{versao}]" (a versão atual)')
    if not re.search(r'^## \[Não lançado\]', log, re.M): problemas.append('o CHANGELOG.md não tem a seção "## [Não lançado]"')
    if re.search(r'^\s*- \(descreva o que mudou', log, re.M): problemas.append('sobrou o lembrete "(descreva o que mudou…)" no CHANGELOG.md — preencha')
ok('CHANGELOG tem a versão atual; decisões e pendências existem') if not problemas else falha('; '.join(problemas), 'Registre o que mudou em CHANGELOG.md → "Não lançado" (o bump-versao.py move pra versão nova). Sem esse registro, a próxima IA não sabe o que já foi feito.')

print('12) CSS legível (sem linhas gigantes)')
ruins_css = [(k + 1, len(l)) for k, l in enumerate(ler('css/style.css').split('\n')) if len(l) > 400 and 'data:' not in l]
ok('nenhuma linha do CSS passa de 400 caracteres') if not ruins_css else falha(f'{len(ruins_css)} linha(s) gigante(s) em css/style.css: {ruins_css[:4]}', 'Rode `python3 tools/formatar-css.py css/style.css` — editar no meio de uma linha enorme é o jeito mais fácil de quebrar o visual.')

print('13) Nenhuma chamada a função que não existe em lugar nenhum (bug real já visto: função chamada mas nunca definida, quebrando o carregamento)')
import re, sys
from pathlib import Path
GLOBAIS_CONHECIDOS = {
 'Array','Object','Math','JSON','Promise','Date','Number','String','Boolean','Map','Set','WeakMap','WeakSet',
 'RegExp','Error','TypeError','RangeError','Symbol','Proxy','Reflect','ArrayBuffer','Uint8Array','Int32Array',
 'Float32Array','parseInt','parseFloat','isNaN','isFinite','encodeURIComponent','decodeURIComponent','encodeURI','decodeURI',
 'setTimeout','setInterval','clearTimeout','clearInterval','requestAnimationFrame','cancelAnimationFrame','queueMicrotask',
 'fetch','alert','confirm','prompt','structuredClone','btoa','atob',
 'document','window','navigator','location','history','localStorage','sessionStorage','console','globalThis','self',
 'CustomEvent','Event','EventTarget','URL','URLSearchParams','Blob','File','FileReader','Image','Audio','AudioContext',
 'webkitAudioContext','Notification','ServiceWorkerRegistration','MutationObserver','ResizeObserver','IntersectionObserver',
 'Peer','requestIdleCallback','performance','crypto','indexedDB','caches',
 'if','for','while','switch','catch','function','return','typeof','instanceof','new','delete','void','in','of','do','else',
 'async','await','yield','static','super','this','true','false','null','undefined','case',
}
# depois de um desses (ignorando espaço), uma "/" começa uma expressão regular; depois de
# qualquer outra coisa (nome, número, ")", "]"), "/" é divisão — igual o navegador decide
ANTES_DE_REGEX = re.compile(r'(^|[(,=:;!&|?{}\[]|\breturn\b|\btypeof\b|\bcase\b)\s*$')

def remover_texto_e_comentarios(codigo):
    saida = []
    i, n = 0, len(codigo)
    while i < n:
        c = codigo[i]
        if codigo[i:i+2] == '//':
            fim = codigo.find('\n', i); fim = n if fim < 0 else fim
            saida.append(' ' * (fim - i)); i = fim
        elif codigo[i:i+2] == '/*':
            fim = codigo.find('*/', i + 2); fim = n if fim < 0 else fim + 2
            saida.append(re.sub(r'[^\n]', ' ', codigo[i:fim])); i = fim
        elif c == '/' and ANTES_DE_REGEX.search(''.join(saida[-12:])):
            # expressão regular /.../flags — o conteúdo não é string nem código, pula igual comentário
            j = i + 1; dentro_colchete = False
            while j < n:
                if codigo[j] == '\\': j += 2; continue
                if codigo[j] == '[': dentro_colchete = True
                elif codigo[j] == ']': dentro_colchete = False
                elif codigo[j] == '/' and not dentro_colchete: j += 1; break
                elif codigo[j] == '\n': break  # regex não atravessa linha; então não era regex — desiste
                j += 1
            while j < n and codigo[j].isalpha(): j += 1  # flags (g, i, m...)
            saida.append(re.sub(r'[^\n]', ' ', codigo[i:j])); i = j
        elif c in '\'"':
            j = i + 1
            while j < n and codigo[j] != c:
                j += 2 if codigo[j] == '\\' else 1
            j = min(j + 1, n)
            saida.append(re.sub(r'[^\n]', ' ', codigo[i:j])); i = j
        elif c == '`':
            j = i + 1; texto = ['`']
            while j < n and codigo[j] != '`':
                if codigo[j] == '\\': texto.append('  '); j += 2
                elif codigo[j:j+2] == '${':
                    k = j + 2; prof = 1
                    while k < n and prof:
                        prof += {'{': 1, '}': -1}.get(codigo[k], 0); k += 1
                    texto.append('${' + codigo[j+2:k-1] + '}'); j = k
                else:
                    texto.append('\n' if codigo[j] == '\n' else ' '); j += 1
            texto.append('`' if j < n else ''); j = min(j + 1, n)
            saida.append(''.join(texto)); i = j
        else:
            saida.append(c); i += 1
    return ''.join(saida)

def coletar_definidos(codigo_limpo):
    definidos = set(GLOBAIS_CONHECIDOS)
    definidos |= set(re.findall(r'\bfunction\*?\s+([A-Za-z_$][\w$]*)', codigo_limpo))
    definidos |= set(re.findall(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=', codigo_limpo))
    definidos |= set(re.findall(r'\bclass\s+([A-Za-z_$][\w$]*)', codigo_limpo))
    for grupo in re.findall(r'\bimport\s*\{([^}]*)\}', codigo_limpo):
        for parte in grupo.split(','):
            nome = parte.split(' as ')[-1].strip()
            if nome: definidos.add(nome)
    definidos |= set(re.findall(r'\bimport\s+([A-Za-z_$][\w$]*)\s+from', codigo_limpo))
    for lista in re.findall(r'\(([^()]*)\)\s*(?:=>|\{)', codigo_limpo):
        definidos |= set(re.findall(r'[A-Za-z_$][\w$]*', lista))
    definidos |= set(re.findall(r'[{,]\s*([A-Za-z_$][\w$]*)\s*[,}:]', codigo_limpo))
    return definidos

def coletar_chamados(codigo_limpo):
    chamadas = {}
    for m in re.finditer(r'(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(', codigo_limpo):
        nome = m.group(1)
        antes = codigo_limpo[:m.start()]
        if re.search(r'\.\s*$', antes): continue                       # .metodo(
        # acha o ")" que fecha esta chamada: "nome(...) {" no começo de uma instrução/propriedade é a
        # DEFINIÇÃO de um método (forma curta em objeto/classe), não uma chamada
        i, prof = m.end(), 1
        while i < len(codigo_limpo) and prof:
            prof += {'(': 1, ')': -1}.get(codigo_limpo[i], 0); i += 1
        depois = codigo_limpo[i:i + 40].lstrip()
        if depois.startswith('{') and not re.search(r'(=|:|return|=>|\?|&&|\|\|)\s*$', antes): continue
        chamadas.setdefault(nome, antes.count('\n') + 1)
    return chamadas


# Só os arquivos do caminho ATIVO (o que o index.html realmente carrega, e tudo que ele importa) e
# POR ARQUIVO: antes bastava o nome existir em QUALQUER arquivo do projeto — assim passou batido
# um tapVibrate() usado no main_stable_342.js sem ser importado de utils.js (erro só ao clicar).
_entrada = re.search(r"import\('\./js/([A-Za-z0-9_\-]+)\.js", ler('index.html'))
_entrada = (_entrada.group(1) + '.js') if _entrada else 'main.js'
_vistos, _fila = set(), [_entrada]
while _fila:
    _n = _fila.pop()
    if _n in _vistos or _n not in grafo: continue
    _vistos.add(_n); _fila += grafo[_n]
fantasmas_13 = []
for _arq in sorted(_vistos):
    _t = remover_texto_e_comentarios((JS / _arq).read_text(encoding='utf-8'))
    _def = coletar_definidos(_t)
    for _nome, _linha in coletar_chamados(_t).items():
        if _nome not in _def: fantasmas_13.append(f'{_arq}:{_linha} chama `{_nome}(...)`, que não é definida nem IMPORTADA nesse arquivo')
ok('nenhuma função-fantasma encontrada') if not fantasmas_13 else falha('; '.join(fantasmas_13),
    'Essa função é chamada mas não existe em NENHUM arquivo (nem local, nem importada). Foi assim que a v2.94.x travou toda vez na tela de carregamento: chamava updateOnlineLobbyUI() sem nunca defini-la. Defina a função, ou corrija o nome se foi só erro de digitação/renomeação.')

print()
if falhas:
    print(f'❌ {len(falhas)} problema(s). Corrija antes de publicar.'); sys.exit(1)
print('✅ Projeto OK' + (f' ({len(avisos)} aviso(s))' if avisos else ''))
