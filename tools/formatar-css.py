#!/usr/bin/env python3
"""Deixa um CSS legível (uma declaração por linha) SEM mudar nada do que ele faz.

Por que existe: o css/style.css chegou a ter linhas de mais de 13 mil caracteres (tudo colado).
Editar no meio de uma linha assim é o jeito mais fácil de quebrar o visual sem perceber.

Uso:  python3 tools/formatar-css.py css/style.css            reescreve o arquivo, legível
      python3 tools/formatar-css.py --checar css/style.css   só confere (código 1 se tiver linha longa demais)

GARANTIA: a ferramenta só acrescenta espaços e quebras de linha DEPOIS de { ; } (onde espaço não
significa nada). Ela confere que, tirando todo o espaço em branco, o antes e o depois são idênticos —
se não forem, NÃO grava nada. Textos entre aspas, comentários e url(...) são copiados como estão.
Sem dependências (só Python).
"""
import re, sys
from pathlib import Path

LIMITE_LINHA = 400  # linhas maiores que isso (fora imagens embutidas "data:") são consideradas ilegíveis


def formatar(css):
    saida, i, n = [], 0, len(css)
    profundidade = 0   # dentro de quantos { }
    parenteses = 0     # dentro de ( ) — ex: url(...) — onde ; { } NÃO são estrutura

    def pular_espacos():
        nonlocal i
        while i < n and css[i].isspace():
            i += 1

    def linha_nova():
        saida.append('\n' + '  ' * profundidade)

    def tirar_espaco_do_fim():
        while saida and saida[-1].strip() == '':
            saida.pop()

    while i < n:
        c = css[i]
        if c == '/' and css[i:i + 2] == '/*':                   # comentário: copia inteiro
            fim = css.find('*/', i + 2)
            fim = n if fim < 0 else fim + 2
            saida.append(css[i:fim]); i = fim; pular_espacos(); linha_nova()
        elif c in '"\'':                                         # texto entre aspas: copia inteiro
            j = i + 1
            while j < n and css[j] != c:
                j += 2 if css[j] == '\\' else 1
            saida.append(css[i:j + 1]); i = j + 1
        elif c == '(':
            parenteses += 1; saida.append(c); i += 1
        elif c == ')':
            parenteses = max(0, parenteses - 1); saida.append(c); i += 1
        elif parenteses > 0:                                     # dentro de ( ): tudo é texto
            saida.append(c); i += 1
        elif c == '{':
            tirar_espaco_do_fim()
            saida.append(' {'); profundidade += 1; i += 1; pular_espacos(); linha_nova()
        elif c == ';':
            saida.append(';'); i += 1; pular_espacos()
            if i < n and css[i] == '}':
                pass                                             # o } cuida da linha
            else:
                linha_nova()
        elif c == '}':
            tirar_espaco_do_fim()
            profundidade = max(0, profundidade - 1)
            saida.append('\n' + '  ' * profundidade + '}'); i += 1; pular_espacos()
            saida.append('\n\n' if profundidade == 0 else '\n' + '  ' * profundidade)
        else:
            saida.append(c); i += 1
    tirar_espaco_do_fim()
    return ''.join(saida).strip('\n') + '\n'


def sem_espacos(t):
    return re.sub(r'\s+', '', t)


def linhas_longas(css):
    return [(k + 1, len(l)) for k, l in enumerate(css.split('\n')) if len(l) > LIMITE_LINHA and 'data:' not in l]


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) != 1:
        sys.exit(__doc__)
    caminho = Path(args[0]); css = caminho.read_text(encoding='utf-8')
    if '--checar' in sys.argv:
        ruins = linhas_longas(css)
        if ruins:
            print(f'❌ {caminho}: {len(ruins)} linha(s) ilegível(is) (mais de {LIMITE_LINHA} caracteres): {ruins[:5]}. Rode: python3 tools/formatar-css.py {caminho}')
            sys.exit(1)
        print(f'✅ {caminho} legível'); sys.exit(0)
    novo = formatar(css)
    if sem_espacos(novo) != sem_espacos(css):
        sys.exit('❌ ABORTADO: a formatação mudaria o conteúdo do CSS (isso não deveria acontecer). Nada foi gravado.')
    if formatar(novo) != novo:
        sys.exit('❌ ABORTADO: a formatação não é estável (rodar duas vezes daria resultado diferente). Nada foi gravado.')
    caminho.write_text(novo, encoding='utf-8')
    print(f'✅ {caminho}: {len(css.splitlines())} → {len(novo.splitlines())} linhas; maior linha agora: {max(len(l) for l in novo.split(chr(10)))} caracteres (conteúdo idêntico, só espaços)')
