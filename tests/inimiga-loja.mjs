// Testes estruturais da nova escolha da inimiga, zonas de fuga e Loja.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { novoRelatorio } from './_ambiente.mjs';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=p=>fs.readFileSync(path.join(raiz,p),'utf8');
const relatorio=novoRelatorio();
const index=ler('index.html');
const state=ler('js/state.js');
const loop=ler('js/loop_stable_336.js');
const render=ler('js/render_stable_341.js');
const prog=ler('js/progression.js');
const players=ler('js/players.js');

relatorio.secao('Minhoca Inimiga');
relatorio.check('Há escolha rápida Sim/Não no início',index.includes('id="hunterEnabledStart"'));
relatorio.check('Estado guarda as 3 zonas',state.includes('hunterZones')&&state.includes('hunterZoneCompleted'));
relatorio.check('São 3 zonas',loop.includes('const HUNTER_ZONE_COUNT = 3'));
relatorio.check('Cada zona exige 3 segundos',loop.includes('const HUNTER_ZONE_HOLD_MS = 3000'));
relatorio.check('A Caçadora pode ser desligada',loop.includes("hunterCfg.enabled === false"));
relatorio.check('Progresso das zonas vai para o online',loop.includes('hunterZoneCompleted: state.hunterZoneCompleted')&&loop.includes('hunterZoneHoldProgress: state.hunterZoneHoldProgress'));
relatorio.check('As zonas são desenhadas na arena',render.includes('function drawHunterZones')&&render.includes('drawHunterZones();'));

relatorio.secao('Loja');
relatorio.check('Loja possui mapas especiais',prog.includes('export const SHOP_MAPS')&&prog.includes('buyMap'));
relatorio.check('Loja possui fantasias',prog.includes('export const SHOP_SKINS')&&prog.includes('buySkin'));
relatorio.check('Mapas premium são bloqueados no seletor',index.includes('data-shop-map="cyber"'));
relatorio.check('Fantasias premium são bloqueadas no seletor',players.includes('isSkinUnlocked')&&players.includes('disabled'));
relatorio.check('Loja aparece como seção própria',index.includes('data-progress-section="shop"')&&index.includes('data-progress-panel="shop"'));

relatorio.secao('Versão');
relatorio.check('Projeto está na v4.2.0',ler('version.txt').trim()==='4.2.0');
relatorio.check('Service Worker está na v4.2.0',ler('sw.js').includes('snake-arena-v4.2.0'));
relatorio.fim();
