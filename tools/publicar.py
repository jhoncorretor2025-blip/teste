#!/usr/bin/env python3
"""Publica as mudanças no GitHub num ÚNICO commit e confere o resultado.

Uso:
  export GITHUB_TOKEN=...                       # token com "Contents: Read and write" neste repositório
  python3 tools/publicar.py                      # SIMULAÇÃO: só mostra o que seria enviado
  python3 tools/publicar.py --mensagem "o que mudou" --enviar
  python3 tools/publicar.py --mensagem "..." --enviar --apagar-removidos   # também apaga do GitHub o que você apagou aqui

Por que um commit só: vários commits seguidos disparam vários builds do GitHub Pages que se
atropelam (os do meio dão "errored"; só o do último importa). Aqui vai tudo de uma vez.
Por que compara por hash: descobre o que mudou sem baixar cada arquivo.
O token vem SÓ da variável de ambiente — nunca grave token em arquivo (o repositório é público).
Outro site? Use --repo dono/nome-do-repo (e --branch, se não for main). Só usa a biblioteca padrão do Python.
"""
import argparse, base64, hashlib, json, os, sys, time, urllib.error, urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTAS_IGNORADAS = {'.git', 'node_modules', '__pycache__', '.venv'}
EXTENSOES_IGNORADAS = {'.pyc'}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--repo', default='jhoncorretor2025-blip/teste')
    ap.add_argument('--branch', default='main')
    ap.add_argument('--mensagem', help='mensagem do commit (obrigatória com --enviar)')
    ap.add_argument('--enviar', action='store_true', help='envia de verdade (sem isto é só simulação)')
    ap.add_argument('--apagar-removidos', action='store_true', help='apaga do GitHub o que não existe mais aqui')
    ap.add_argument('--sem-esperar', action='store_true', help='não espera o build do Pages terminar')
    a = ap.parse_args()

    token = os.environ.get('GITHUB_TOKEN')
    if not token:
        sys.exit('❌ Falta a variável GITHUB_TOKEN. Peça ao dono um token (Contents: Read and write) só deste repositório e rode:\n   export GITHUB_TOKEN=...   (não grave o token em nenhum arquivo!)')
    if a.enviar and not a.mensagem:
        sys.exit('❌ Com --enviar é preciso --mensagem "o que mudou".')

    base = f'https://api.github.com/repos/{a.repo}'

    def api(caminho, dados=None, metodo=None):
        req = urllib.request.Request(base + caminho, data=json.dumps(dados).encode() if dados is not None else None, method=metodo,
                                     headers={'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            sys.exit(f'❌ GitHub respondeu {e.code} em {metodo or "GET"} {caminho}: {e.read().decode()[:300]}')

    def hash_git(b):  # o mesmo hash que o Git usa pra cada arquivo
        return hashlib.sha1(b'blob %d\0' % len(b) + b).hexdigest()

    locais = {}
    for pasta, dirs, arquivos in os.walk(RAIZ, followlinks=False):
        dirs[:] = [d for d in dirs if d not in PASTAS_IGNORADAS]
        for nome in arquivos:
            p = Path(pasta) / nome
            if p.suffix in EXTENSOES_IGNORADAS or p.is_symlink(): continue
            locais[p.relative_to(RAIZ).as_posix()] = p.read_bytes()

    head = api(f'/git/ref/heads/{a.branch}')['object']['sha']
    commit_head = api(f'/git/commits/{head}')
    arvore = api(f'/git/trees/{commit_head["tree"]["sha"]}?recursive=1')
    if arvore.get('truncated'): sys.exit('❌ A árvore do repositório é grande demais pra esta ferramenta.')
    remoto = {t['path']: t['sha'] for t in arvore['tree'] if t['type'] == 'blob'}

    novos = sorted(p for p in locais if p not in remoto)
    mudados = sorted(p for p in locais if p in remoto and hash_git(locais[p]) != remoto[p])
    so_remoto = sorted(p for p in remoto if p not in locais)

    print(f'Repositório: {a.repo} ({a.branch}) — último commit {head[:7]}')
    print(f'  🆕 novos: {len(novos)}   ✏️  mudados: {len(mudados)}   🗑️  só no GitHub: {len(so_remoto)}')
    for p in novos: print(f'     + {p}')
    for p in mudados: print(f'     ~ {p}')
    for p in so_remoto: print(f'     {"-" if a.apagar_removidos else "?"} {p}' + ('' if a.apagar_removidos else '   (existe só no GitHub; use --apagar-removidos pra apagar)'))
    if not novos and not mudados and not (a.apagar_removidos and so_remoto):
        print('✅ Nada pra enviar: o GitHub já está igual a esta pasta.'); return
    if not a.enviar:
        print('\n(simulação — nada foi enviado. Use --mensagem "..." --enviar)'); return

    entradas = []
    for p in novos + mudados:
        blob = api('/git/blobs', {'content': base64.b64encode(locais[p]).decode(), 'encoding': 'base64'}, 'POST')
        entradas.append({'path': p, 'mode': '100644', 'type': 'blob', 'sha': blob['sha']})
    if a.apagar_removidos:
        entradas += [{'path': p, 'mode': '100644', 'type': 'blob', 'sha': None} for p in so_remoto]
    nova_arvore = api('/git/trees', {'base_tree': commit_head['tree']['sha'], 'tree': entradas}, 'POST')
    novo = api('/git/commits', {'message': a.mensagem, 'tree': nova_arvore['sha'], 'parents': [head]}, 'POST')
    api(f'/git/refs/heads/{a.branch}', {'sha': novo['sha']}, 'PATCH')
    print(f'\n✅ Enviado em UM commit: {novo["sha"][:7]}  https://github.com/{a.repo}/commit/{novo["sha"]}')

    if not a.sem_esperar:
        for i in range(24):
            try:
                builds = api('/pages/builds?per_page=10')
            except SystemExit:
                print('   (não consegui consultar o build do Pages — token sem essa permissão?)'); break
            meu = next((b for b in builds if b['commit'] == novo['sha']), None)
            print(f'   build do Pages: {meu["status"] if meu else "aguardando começar"}')
            if meu and meu['status'] in ('built', 'errored'): break
            time.sleep(10)

    depois = {t['path']: t['sha'] for t in api(f'/git/trees/{novo["sha"]}?recursive=1')['tree'] if t['type'] == 'blob'}
    ruins = [p for p in novos + mudados if depois.get(p) != hash_git(locais[p])]
    print('✅ Conferido: tudo no GitHub é idêntico ao que está aqui.' if not ruins else f'⚠️  Diferem no GitHub: {ruins}')
    print('   Dica: o endereço raw.githubusercontent.com guarda cache; confie nesta conferência (API), não nele.')


if __name__ == '__main__':
    main()
