// Testes estruturais das novas conquistas da v4.3.0.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { novoRelatorio } from './_ambiente.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');
const relatorio = novoRelatorio();

const config = ler('js/config.js');
const progression = ler('js/progression.js');
const state = ler('js/state.js');
const loop = ler('js/loop_stable_336.js');
const main = ler('js/main_stable_342.js');
const index = ler('index.html');
const sw = ler('sw.js');

const novosIds = [
  'hunter_accept', 'hunter_zone_first', 'hunter_zone_exact', 'hunter_zone_perfect',
  'hunter_no_fear', 'coins_earned_100', 'coins_wallet_500', 'shop_first_purchase',
  'skin_first', 'skins_3', 'maps_2', 'maps_all', 'coins_spent_500', 'skins_5',
  'league_legend', 'streak_7', 'daily_10', 'games_50',
];

relatorio.secao('Conquistas novas');
relatorio.check('Todas as 18 novas conquistas estão no catálogo', novosIds.every((id) => config.includes("id: '" + id + "'")));
relatorio.check('Conquistas de loja usam moedas/progresso cumulativo', progression.includes('coinsEarned') && progression.includes('coinsSpent'));
relatorio.check('Primeira compra é reconhecida', progression.includes("shop_first_purchase"));
relatorio.check('Conquistas de fantasias existem', progression.includes("skin_first") && progression.includes("skins_3") && progression.includes("skins_5"));
relatorio.check('Conquistas de mapas existem', progression.includes("maps_2") && progression.includes("maps_all"));
relatorio.check('Conquista de 500 moedas gastas existe', progression.includes("coins_spent_500"));
relatorio.check('Liga Lenda e 10 desafios do dia são verificados', progression.includes("league_legend") && progression.includes("daily_10"));
relatorio.check('Sequência de 7 dias é verificada', loop.includes("streak_7"));
relatorio.check('Veterano de 50 partidas é verificado', loop.includes("games_50"));

relatorio.secao('Minhoca Caçadora');
relatorio.check('Desafio Aceito ao iniciar com inimiga', loop.includes("hunter_accept"));
relatorio.check('Primeira zona desbloqueia conquista', loop.includes("hunter_zone_first"));
relatorio.check('Zona de 3 segundos desbloqueia conquista', loop.includes("hunter_zone_exact") && loop.includes('HUNTER_ZONE_HOLD_MS = 3000'));
relatorio.check('3 zonas desbloqueiam Fuga Perfeita', loop.includes("hunter_zone_perfect"));
relatorio.check('Sem Medo usa 10 segundos de Caçadora ativa', loop.includes("hunter_no_fear") && loop.includes('>= 10000'));
relatorio.check('Início da Caçadora fica no estado e é enviado pelo anfitrião', loop.includes('hunterStartedAt: state.hunterStartedAt') && state.includes('hunterStartedAt'));
relatorio.check('Conquistas da Caçadora também funcionam no cliente online', main.includes("unlockOnline('hunter_zone_perfect')") && main.includes("unlockOnline('hunter_no_fear')"));

relatorio.secao('Versão');
relatorio.check('Versão 4.3.0 no config', config.includes("VERSION = '4.3.0'"));
relatorio.check('Versão 4.3.0 no site', index.includes('4.3.0'));
relatorio.check('Cache 4.3.0', sw.includes('snake-arena-v4.3.0'));
relatorio.fim();
