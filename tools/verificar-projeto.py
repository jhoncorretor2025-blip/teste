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

print('3) Nenhum módulo morto (todo js/*.js é alcançável a partir de main.js)')
grafo = {f.name: set(m + '.js' for m in re.findall(r"from\s+'\./([A-Za-z0-9_\-]+)\.js'", f.read_text(encoding='utf-8'))) for f in JS.glob('*.js')}
vistos, fila = set(), ['main.js']
while fila:
    n = fila.pop()
    if n in vistos or n not in grafo: continue
    vistos.add(n); fila += grafo[n]
mortos = sorted(set(grafo) - vistos)
ok(f'{len(vistos)} módulos, todos em uso') if not mortos else falha(f'módulos que ninguém importa: {mortos}', 'Código morto engana quem vem depois (já aconteceu com um hunter.js antigo). Apague ou ligue de verdade.')

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

print()
if falhas:
    print(f'❌ {len(falhas)} problema(s). Corrija antes de publicar.'); sys.exit(1)
print('✅ Projeto OK' + (f' ({len(avisos)} aviso(s))' if avisos else ''))
