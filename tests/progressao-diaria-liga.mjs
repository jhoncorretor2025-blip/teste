// Testes da progressão diária, sequência e Liga — não dependem da tela completa do jogo.
import { JSDOM } from 'jsdom';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { novoRelatorio } from './_ambiente.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const relatorio = novoRelatorio();
const dom = new JSDOM('<!doctype html><body><div id="progressionToast"></div></body>', { url:'http://localhost/' });
const w = dom.window;
globalThis.window = w;
globalThis.document = w.document;
globalThis.localStorage = w.localStorage;

const mod = await import(pathToFileURL(path.join(raiz,'js/progression.js')).href + '?teste-progressao-diaria=' + Date.now());
const {
  DAILY_CHALLENGES, LEAGUES, getLeagueInfo, calculateLevel,
  loadProgression, trackProgressionEvent, addLeaguePoints,
  claimStreakReward
} = mod;

relatorio.secao('Desafio do Dia');
const data = loadProgression();
relatorio.check('Desafio diário é criado automaticamente', !!data.dailyChallenge);
relatorio.check('Desafio diário pertence à lista válida', DAILY_CHALLENGES.some(c => c.id === data.dailyChallenge.id));
const idHoje = data.dailyChallenge.id;
const novamente = loadProgression();
relatorio.check('Mesmo dia mantém o mesmo desafio', novamente.dailyChallenge.id === idHoje);

relatorio.secao('Sequência');
const reward1 = claimStreakReward(1);
relatorio.check('Primeira recompensa diária pode ser recebida', reward1.claimed === true);
const reward2 = claimStreakReward(1);
relatorio.check('Recompensa diária não duplica no mesmo dia', reward2.claimed === false);
relatorio.check('Moedas da recompensa inicial foram salvas', loadProgression().coins >= 5);

relatorio.secao('Liga');
relatorio.check('0 pontos começa em Bronze', getLeagueInfo(0).current.id === 'bronze');
relatorio.check('100 pontos chegam à Prata', getLeagueInfo(100).current.id === 'silver');
relatorio.check('300 pontos chegam ao Ouro', getLeagueInfo(300).current.id === 'gold');
relatorio.check('Lenda é a última liga', LEAGUES.at(-1).id === 'legend');
const antes = loadProgression().leaguePoints || 0;
addLeaguePoints(125, 'teste');
relatorio.check('Pontos de Liga são persistidos', loadProgression().leaguePoints === antes + 125);

relatorio.secao('Compatibilidade da progressão');
relatorio.check('Nível inicial continua 1', calculateLevel(0) === 1);
relatorio.check('Eventos de progressão continuam aceitos', !!trackProgressionEvent('score', 0));

relatorio.fim();
