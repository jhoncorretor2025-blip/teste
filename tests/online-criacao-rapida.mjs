// Regressão: o botão Criar sala rápida deve sempre tentar criar a sala,
// mesmo se o preset casual falhar.
import fs from 'fs';
import path from 'path';
import { RAIZ, novoRelatorio } from './_ambiente.mjs';

const main = fs.readFileSync(path.join(RAIZ, 'js/main.js'), 'utf8');
const index = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const r = novoRelatorio();

r.secao('Criação rápida resiliente');
r.check('botão rápido existe', /id="onlineSimpleCreateBtn"/.test(index));
r.check('preset casual é protegido por try/catch', /try \{\s*applyOnlinePreset\('casual'\)/s.test(main));
r.check('a criação real acontece depois do preset', /applyOnlinePreset\('casual'\)[\s\S]*?\$\('hostBtn'\)\.click\(\)/.test(main));
r.check('erro do preset não impede a criação', /catch \(err\) \{[\s\S]*?console\.warn[\s\S]*?\}\s*\s*try \{\s*\$\('hostBtn'\)\.click\(\)/.test(main));

r.fim();
