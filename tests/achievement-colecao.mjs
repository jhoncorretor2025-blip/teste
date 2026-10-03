import fs from 'fs'; import path from 'path'; import { RAIZ, novoRelatorio } from './_ambiente.mjs';
const c=fs.readFileSync(path.join(RAIZ,'js/config.js'),'utf8'); const m=fs.readFileSync(path.join(RAIZ,'js/main_stable_342.js'),'utf8'); const r=novoRelatorio();
r.secao('Conquistas de longo prazo');
r.check('Colecionador em Coleção',/id: 'collector'[^\n]*category: 'colecao'/.test(c));
r.check('Camaleão em Coleção',/id: 'chameleon'[^\n]*category: 'colecao'/.test(c));
r.check('Mestre dos Mapas em Coleção',/id: 'maps_all'[^\n]*category: 'colecao'/.test(c));
r.check('Galeria exibe Coleção',/key: 'colecao'/.test(m) && /title: '🏆 Coleção'/.test(m));
// v4.5.6 — a ordenação da galeria deve ser uma partição estável: concluídas primeiro.
const idx = m.indexOf('const categoryItems = ACHIEVEMENTS');
const block = idx >= 0 ? m.slice(idx, m.indexOf('grid.innerHTML', idx)) : '';
r.check('Galeria sobe concluídas sem perder a ordem', /completedItems = categoryItems\.filter/.test(block) && /pendingItems = categoryItems\.filter/.test(block) && /const items = \[\.\.\.completedItems, \.\.\.pendingItems\]/.test(block));
r.check('Galeria renumera pela ordem exibida', /map\(\(a, displayIndex\) => \(\{ a, difficultyNumber: displayIndex \+ 1 \}\)\)/.test(block));
r.fim();