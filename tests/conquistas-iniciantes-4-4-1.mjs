// Testes estruturais das conquistas iniciantes renovadas na v4.4.1.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { novoRelatorio } from './_ambiente.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');
const relatorio = novoRelatorio();

const config = ler('js/config.js');
const storage = ler('js/storage.js');
const loop = ler('js/loop_stable_336.js');
const state = ler('js/state.js');
const index = ler('index.html');
const sw = ler('sw.js');
const version = ler('version.txt');

relatorio.secao('Catálogo iniciante');
relatorio.check('Coma 20 pontos', config.includes("id: 'food_20'") && config.includes('Coma 20 pontos de comida numa partida'));
relatorio.check('Aguentou 45 segundos', config.includes("id: 'survive_45'") && config.includes('Sobreviva 45 segundos sem morrer'));
relatorio.check('Crescendo 30 segmentos', config.includes("id: 'length_30'") && config.includes('Chegue a 30 segmentos numa partida'));
relatorio.check('Estrela Cadente primeira estrela', config.includes("id: 'first_star'") && config.includes('Pegue sua primeira estrela'));
relatorio.check('10 estrelas em uma partida', config.includes("id: 'star_10'") && config.includes('Pegue 10 estrelas numa partida'));

relatorio.secao('Gatilhos reais');
relatorio.check('Comida usa 20 pontos', loop.includes("state.foodsEaten[i] >= 20") && loop.includes("unlockAchievement('food_20')"));
relatorio.check('Sobrevivência usa 45s', loop.includes("survivedMs >= 45000") && loop.includes("unlockAchievement('survive_45')"));
relatorio.check('Tamanho usa 30 segmentos', loop.includes("mySnake.length >= 30") && loop.includes("unlockAchievement('length_30')"));
relatorio.check('Estrelas têm contador por partida', state.includes('starsCollected') && loop.includes('state.starsCollected = Array(6).fill(0)'));
relatorio.check('10 estrelas dispara na mesma partida', loop.includes("state.starsCollected[i] >= 10") && loop.includes("unlockAchievement('star_10')"));
relatorio.check('Partida salva preserva o contador de estrelas', loop.includes("'starsCollected'"));

relatorio.secao('Migração');
relatorio.check('Conquistas antigas aposentadas', storage.includes("RETIRED_ACHIEVEMENTS_V4_4_1") && storage.includes("'food_10'") && storage.includes("'survive_30'") && storage.includes("'length_15'") && storage.includes("'food_25'"));

relatorio.secao('Versão');
relatorio.check('4.4.1 sincronizada', config.includes("VERSION = '4.4.1'") && index.includes('4.4.1') && version.trim() === '4.4.1' && sw.includes('snake-arena-v4.4.1'));

relatorio.fim();
