import fs from 'fs'; import path from 'path'; import { RAIZ, novoRelatorio } from './_ambiente.mjs';
const c=fs.readFileSync(path.join(RAIZ,'js/config.js'),'utf8'); const m=fs.readFileSync(path.join(RAIZ,'js/main_stable_342.js'),'utf8'); const r=novoRelatorio();
r.secao('Conquistas de longo prazo');
r.check('Colecionador em Coleção',/id: 'collector'[^\n]*category: 'colecao'/.test(c));
r.check('Camaleão em Coleção',/id: 'chameleon'[^\n]*category: 'colecao'/.test(c));
r.check('Mestre dos Mapas em Coleção',/id: 'maps_all'[^\n]*category: 'colecao'/.test(c));
r.check('Galeria exibe Coleção',/key: 'colecao'/.test(m) && /title: '🏆 Coleção'/.test(m));
r.fim();