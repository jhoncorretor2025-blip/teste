// Testes estruturais da v4.4.0 — central da tela inicial e Loja no menu principal.
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
const config = ler('js/config.js');
const css = ler('css/style.css');
const sw = ler('sw.js');
const version = ler('version.txt');
const versao = config.match(/VERSION = '([^']+)'/)?.[1] || '';

relatorio.secao('Loja no menu principal');
relatorio.check('Loja existe como quinta aba principal', index.includes('data-tab="loja"') && index.includes('🛒 <span>Loja</span>'));
relatorio.check('Loja usa a seção shop existente', main.includes("loja: 'progresso'") && main.includes("requestedTab === 'loja' ? 'shop'"));
relatorio.check('URL ?tab=loja é aceita', main.includes("'loja', 'ranking', 'conquistas'"));
relatorio.check('Celular reserva cinco posições na barra inferior', css.includes('grid-template-columns:repeat(5,1fr)'));

relatorio.secao('10 melhorias da tela inicial');
relatorio.check('1. Botão Jogar Agora', index.includes('🚀 JOGAR AGORA') && css.includes('.homeHeroActions'));
relatorio.check('2. Resumo completo da partida', index.includes('id="homeMatchSummary"') && main.includes('homeMatchSummary'));
relatorio.check('3. Escolha visual da inimiga', index.includes('id="hunterHomeOffBtn"') && index.includes('id="hunterHomeOnBtn"'));
relatorio.check('4. Carteira com moedas, nível e Liga', ['homeCoins','homeLevel','homeLeague'].every((id) => index.includes('id="' + id + '"')));
relatorio.check('5. Próxima conquista', index.includes('id="homeNextAchievement"') && main.includes('nextAchievement'));
relatorio.check('6. Desafio do Dia', index.includes('id="dailyChallengeMenu"') && index.includes('id="homeDailyDesc"'));
relatorio.check('7. Sequência de dias', index.includes('id="homeStreakValue"') && main.includes('loadStreakDays()'));
relatorio.check('8. Prévia do mapa e preço dos premium', index.includes('id="homeMapPreview"') && index.includes('id="homePremiumMaps"') && main.includes('item.cost'));
relatorio.check('9. Prévia da Minha Mioquinha', index.includes('id="homeSnakeVisual"') && main.includes('HEAD_SHAPES') && main.includes('SKIN_PATTERNS'));
relatorio.check('10. Resumo compacto do progresso', index.includes('id="homeProgressSummary"') && main.includes('loadBestLength'));

relatorio.secao('Atualização dos dados');
relatorio.check('Home acompanha mudanças da progressão', progression.includes("new CustomEvent('progressionUpdated')") && main.includes("addEventListener('progressionUpdated'"));
relatorio.check('Clique em Loja/Home realmente abre a Loja', main.includes("homeOpenShopBtn") && main.includes("switchToTab('loja', 'push')"));
relatorio.check('Escolha rápida da inimiga sincroniza a configuração real', main.includes('homeHunterChoice') && main.includes("hunterEnabledStart"));

relatorio.secao('Versão');
relatorio.check('Versão 4.4.0', versao === '4.4.0');
relatorio.check('Versão sincronizada no site', index.includes('4.4.0') && version.trim() === '4.4.0');
relatorio.check('Cache 4.4.0', sw.includes('snake-arena-v4.4.0'));

relatorio.fim();
