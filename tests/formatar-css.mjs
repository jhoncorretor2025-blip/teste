// tools/formatar-css.py: deixa o CSS legível SEM mudar o que ele faz.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { JSDOM } from 'jsdom';
import { RAIZ, novoRelatorio } from './_ambiente.mjs';

const ferramenta = path.join(RAIZ, 'tools/formatar-css.py');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'css-'));
const f = (nome, texto) => { const p = path.join(tmp, nome); fs.writeFileSync(p, texto); return p; };
const rodar = (...args) => spawnSync('python3', [ferramenta, ...args], { encoding: 'utf8' });
const semEspacos = (t) => t.replace(/\s+/g, '');
const r = novoRelatorio();

// CSS "difícil": ; { } dentro de texto e de url(), comentário com ; e {, @media aninhado, seletor com :not()
const MINIFICADO = 'a{color:red;background:url("data:image/svg+xml;utf8,<svg>{;}</svg>")}b,c{margin:0}@media (max-width:600px){a{x:y;z:w}.q:not(.r){k:v}}/* nota; com { chave */.z{content:"a;b{c}"}.u{background:url(x.png?a=1;b=2)}';
const p = f('a.css', MINIFICADO);
const saida = rodar(p);
const bonito = fs.readFileSync(p, 'utf8');

r.secao('Formatação segura');
r.check('a ferramenta termina bem', saida.status === 0, saida.stdout.trim().slice(0, 90));
r.check('tirando os espaços, o conteúdo é IDÊNTICO ao original', semEspacos(bonito) === semEspacos(MINIFICADO));
r.check('uma declaração por linha', /\n\s+color:red;\n/.test(bonito) && /\n\s+margin:0\n/.test(bonito));
r.check('o texto com ; { } dentro NÃO foi quebrado', bonito.includes('content:"a;b{c}"') && bonito.includes('data:image/svg+xml;utf8,<svg>{;}</svg>'));
r.check('url() sem aspas com ; dentro NÃO foi quebrado', bonito.includes('url(x.png?a=1;b=2)'));
r.check('o comentário com ; e { ficou inteiro', bonito.includes('/* nota; com { chave */'));
r.check('o @media aninhado ganhou indentação (2 níveis)', /\n  a \{\n    x:y;/.test(bonito) || /\n  a \{\n    x:y;\n    z:w/.test(bonito), JSON.stringify(bonito.split('\n').filter((l) => l.includes('x:y')).join('|')));
r.check('rodar de novo não muda nada (estável)', (() => { const antes = fs.readFileSync(p, 'utf8'); rodar(p); return fs.readFileSync(p, 'utf8') === antes; })());

r.secao('O navegador enxerga o mesmo CSS (comparando as regras que o jsdom interpreta)');
const regras = (css) => { const w = new JSDOM(`<style>${css}</style>`).window; return Array.from(w.document.styleSheets[0].cssRules).map((x) => x.cssText.replace(/\s+/g, ' ')); };
const a1 = regras(MINIFICADO), a2 = regras(bonito);
r.check('mesmo número de regras e mesmo texto normalizado', a1.length > 0 && a1.length === a2.length && a1.every((x, i) => x === a2[i]), `${a1.length} regras`);

r.secao('Detector de linha gigante (--checar)');
const gigante = f('gigante.css', '.x{' + 'margin:0;'.repeat(80) + '}\n');
r.check('CSS com linha de 700+ caracteres é reprovado (código 1)', rodar('--checar', gigante).status === 1);
fs.writeFileSync(gigante, '.x{' + 'margin:0;'.repeat(80) + '}'); rodar(gigante);
r.check('depois de formatar, passa (código 0)', rodar('--checar', gigante).status === 0);
r.check('imagem embutida (data:) numa linha comprida é tolerada', rodar('--checar', f('img.css', '.y{background:url("data:image/png;base64,' + 'A'.repeat(900) + '")}\n')).status === 0);

r.secao('O css/style.css de verdade');
r.check('está legível (passa no --checar)', rodar('--checar', path.join(RAIZ, 'css/style.css')).status === 0);
const copia = f('style-copia.css', fs.readFileSync(path.join(RAIZ, 'css/style.css'), 'utf8'));
const antes = fs.readFileSync(copia, 'utf8'); rodar(copia);
r.check('e a formatação dele já é estável (rodar de novo não muda nada)', fs.readFileSync(copia, 'utf8') === antes);
r.check('o jsdom consegue ler todas as regras dele', (() => { try { return regras(antes).length > 100; } catch { return false; } })(), `${regras(antes).length} regras`);
r.fim();
