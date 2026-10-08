const __V = (await import('fs')).readFileSync(new URL('../version.txt', import.meta.url), 'utf8').trim(); // versão ATUAL: estes testes tinham o número da época escrito à mão e quebravam a cada versão nova
const compact = (t) => String(t).replace(/\s*([{}:;,])\s*/g, '$1').replace(/;}/g, '}'); // CSS sem espaços em volta de { } : ; , — o teste funciona com CSS formatado OU compacto
// Testes estruturais da v4.5.1 — galeria de conquistas, acessibilidade e UX.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { novoRelatorio } from './_ambiente.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');
const relatorio = novoRelatorio();

const index = ler('index.html');
const main = ler('js/main_stable_342.js');
const progression = ler('js/progression.js');
const state = ler('js/state.js');
const loop = ler('js/loop_stable_336.js');
const css = compact(ler('css/style.css'));
const config = ler('js/config.js');
const sw = ler('sw.js');
const version = ler('version.txt');
const versao = config.match(/VERSION = '([^']+)'/)?.[1] || '';

relatorio.secao('Conquistas');
relatorio.check('Barra geral dinâmica', index.includes('id="achievementsOverallBar"') && main.includes('achievementsOverallBar') && main.includes('achievementsPercent'));
relatorio.check('Filtro Todas/Concluídas/Em andamento', ['all','done','pending'].every((v) => index.includes('data-achievement-filter="' + v + '"')) && main.includes('achievementFilter'));
relatorio.check('Cards usam filtro de status', main.includes("achievementFilter === 'done'"));
relatorio.check('Galeria mantém as quatro categorias', ['iniciante','intermediario','avancado','online'].every((v) => main.includes("key: '" + v + "'")));

relatorio.secao('Tela inicial e progressão');
relatorio.check('XP visível na tela inicial', index.includes('homeXpBar') && index.includes('homeXpLabel') && main.includes('xpForNextLevel'));
relatorio.check('Streak recebe destaque', main.includes('streakActive') && css.includes('@keyframes streakGlow'));
relatorio.check('Loja tem prévia visual dos mapas', progression.includes('BOARD_THEMES') && progression.includes('shopVisualPreview'));

relatorio.secao('Acessibilidade e jogabilidade');
relatorio.check('Alto contraste configurável e salvo', index.includes('id="highContrast"') && state.includes('highContrast') && main.includes('highContrast: state.highContrast') && css.includes('.app.highContrast'));
relatorio.check('Feedback tátil ao comer comida comum', loop.includes('else vibrate(8)'));
relatorio.check('Feedback de dano/morte preservado', loop.includes('vibrate([80, 40, 160])'));
relatorio.check('Atalhos visíveis durante a partida', index.includes('id="pcKeyHints"') && main.includes('updatePcKeyHints') && css.includes('.pcKeyHints'));

relatorio.secao('Navegação e header');
relatorio.check('Header agrupa dicas/avisos', index.includes('headerInfoBtn') && index.includes('headerInfoOverlay') && main.includes('headerInfoCloseBtn'));
relatorio.check('Bottom navigation com Loja', index.includes('data-tab="loja"') && css.includes('grid-template-columns:repeat(5,1fr)'));

relatorio.secao('Versão');
relatorio.check('Versão 4.5.1 sincronizada', versao === __V && index.includes(versao) && version.trim() === versao && sw.includes('snake-arena-v' + versao));

relatorio.fim();
