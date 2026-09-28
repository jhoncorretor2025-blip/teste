// tools/bump-versao.py: troca a versão nos 4 lugares E cuida do CHANGELOG (a memória do projeto).
// Roda numa CÓPIA do projeto (nunca no de verdade).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { RAIZ, novoRelatorio } from './_ambiente.mjs';

const copia = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-'));
  fs.cpSync(RAIZ, d, { recursive: true, filter: (o) => !/(^|[\\/])(node_modules|\.git)([\\/]|$)/.test(path.relative(RAIZ, o)) });
  return d;
};
const ler = (d, p) => fs.readFileSync(path.join(d, p), 'utf8');
const gravar = (d, p, t) => fs.writeFileSync(path.join(d, p), t);
const py = (d, ferramenta, ...args) => spawnSync('python3', [path.join(d, 'tools', ferramenta), ...args], { encoding: 'utf8' });
const r = novoRelatorio();
const HOJE = /\d{4}-\d{2}-\d{2}/;

r.secao('Trocar a versão com itens em "Não lançado"');
let d = copia();
const antiga = ler(d, 'js/config.js').match(/VERSION = '([^']+)'/)[1];
let log = ler(d, 'CHANGELOG.md');
log = log.replace('## [Não lançado]', '## [Não lançado]').replace(/(## \[Não lançado\][^\n]*\n)/, '$1- Item de teste ABC123: mexi em alguma coisa.\n');
gravar(d, 'CHANGELOG.md', log);
let x = py(d, 'bump-versao.py', '9.9.9');
r.check('o bump termina bem', x.status === 0, (x.stderr || x.stdout).split('\n').filter(Boolean).pop());
r.check('config.js, version.txt e sw.js na versão nova', ler(d, 'js/config.js').includes("VERSION = '9.9.9'") && ler(d, 'version.txt') === '9.9.9' && ler(d, 'sw.js').includes('snake-arena-v9.9.9'));
r.check('index.html sem nenhum resto da versão velha', !ler(d, 'index.html').includes(antiga) && ler(d, 'index.html').includes('9.9.9'));
const novo = ler(d, 'CHANGELOG.md');
const secao = novo.match(/## \[9\.9\.9\] — (\d{4}-\d{2}-\d{2})\n([\s\S]*?)(?=\n## \[)/);
r.check('o CHANGELOG ganhou "## [9.9.9] — data de hoje"', !!secao && HOJE.test(secao[1]), secao?.[1]);
r.check('o item de "Não lançado" foi MOVIDO para a versão nova', !!secao && secao[2].includes('Item de teste ABC123'));
const naoLancado = novo.match(/## \[Não lançado\][^\n]*\n([\s\S]*?)(?=\n## \[)/)[1];
r.check('"Não lançado" ficou vazio de novo (com o aviso "nada por enquanto")', !naoLancado.includes('ABC123') && naoLancado.includes('_(nada por enquanto)_'));
r.check('a nova entrada vem ANTES das versões antigas', novo.indexOf('## [9.9.9]') < novo.indexOf(`## [${antiga}]`));
x = py(d, 'verificar-projeto.py');
r.check('depois disso o verificador passa em tudo', x.status === 0, x.stdout.split('\n').filter((l) => l.includes('❌')).join(' | '));

r.secao('Trocar a versão com "Não lançado" VAZIO: exige que a pessoa descreva');
d = copia();
gravar(d, 'CHANGELOG.md', ler(d, 'CHANGELOG.md').replace(/(## \[Não lançado\][^\n]*\n)[\s\S]*?(?=\n## \[)/, '$1*(mudanças que não trocam a versão do jogo: só documentação, ferramentas e testes)*\n_(nada por enquanto)_\n'));
x = py(d, 'bump-versao.py', '9.9.8');
r.check('o bump termina, avisando que estava vazio', x.status === 0 && /vazio/i.test(x.stdout), x.stdout.split('\n').filter((l) => /CHANGELOG/.test(l)).join(' '));
r.check('deixou o lembrete "(descreva o que mudou…)" na versão nova', /## \[9\.9\.8\][^\n]*\n- \(descreva o que mudou/.test(ler(d, 'CHANGELOG.md')));
x = py(d, 'verificar-projeto.py');
r.check('e o verificador REPROVA enquanto o lembrete estiver lá', x.status === 1 && x.stdout.split('\n').some((l) => /^\s{2}❌.*descreva/.test(l)));
gravar(d, 'CHANGELOG.md', ler(d, 'CHANGELOG.md').replace('- (descreva o que mudou nesta versão)', '- Escrevi o que mudou.'));
x = py(d, 'verificar-projeto.py');
r.check('preenchido, o verificador volta a passar', x.status === 0, x.stdout.split('\n').filter((l) => l.includes('❌')).join(' | '));

r.secao('Entradas inválidas');
d = copia();
r.check('a mesma versão de agora é recusada', py(d, 'bump-versao.py', antiga).status !== 0);
r.check('formato inválido é recusado (2.84)', py(d, 'bump-versao.py', '2.84').status !== 0);
r.check('formato inválido é recusado (abc)', py(d, 'bump-versao.py', 'abc').status !== 0);
r.check('nada foi alterado depois das recusas', ler(d, 'version.txt') === antiga);
r.fim();
