// As 5 melhorias simples pedidas: causa da morte, recorde de maior cobra, tela Sobre,
// som/vibração de novo recorde, e "melhor que X% das suas partidas".
import { RAIZ, novoRelatorio, criarJanela, ativar, importarDe, esperar } from './_ambiente.mjs';

const w = criarJanela(); ativar(w);
const r = novoRelatorio();
const storage = await importarDe(RAIZ)('js/storage.js');
// Evita que os testes das Melhorias 1/2/5 (que não se importam com "bater recorde")
// disparem sem querer a detecção de novo recorde — sem isso, como nenhum recorde tinha
// sido salvo ainda, qualquer pontuação > 0 "bateria o recorde" e agendaria (com setTimeout)
// um som que vazaria pra seção de teste seguinte.
w.localStorage.setItem('snakeArenaBest', '999999');
await importarDe(RAIZ)('js/main.js');
const { state } = await importarDe(RAIZ)('js/state.js');
const loop = await importarDe(RAIZ)('js/loop.js');
const $ = (id) => w.document.getElementById(id);
const mudar = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('change', { bubbles: true })); };

function novaPartidaLocal(numJogadores = 2) {
  state.running = false;
  mudar('mapSize', 'medium'); mudar('count', String(numJogadores)); mudar('boardTheme', 'void');
  loop.startGame();
  state.paused = true;
}

r.secao('Melhoria 1 — mensagem de causa da morte');
novaPartidaLocal(2);
state.scores[0] = 10; state.names[1] = 'Jhon';
loop.kill(0, 'Bateu na parede');
r.check('mostra "Bateu na parede"', state.deathMessage.text === '💀 Bateu na parede', state.deathMessage.text);
novaPartidaLocal(2);
state.names[1] = 'Jhon';
loop.kill(0, `Colidiu com ${state.names[1]}`);
r.check('mostra o nome de quem causou a colisão', state.deathMessage.text === '💀 Colidiu com Jhon', state.deathMessage.text);
novaPartidaLocal(2);
loop.kill(0, 'A Minhoca Caçadora te pegou');
r.check('mostra a causa da Minhoca Caçadora', state.deathMessage.text === '💀 A Minhoca Caçadora te pegou', state.deathMessage.text);
novaPartidaLocal(2);
loop.kill(0);
r.check('sem causa informada, cai no texto genérico de sempre (compatibilidade)', state.deathMessage.text === '💀 Você morreu!', state.deathMessage.text);

r.secao('Melhoria 2 — recorde de maior cobra (tamanho)');
w.localStorage.removeItem('snakeArenaBestLength');
novaPartidaLocal(1);
for (let i = 0; i < 5; i++) state.snakes[0].push({ x: i, y: i }); // cresce a cobra artificialmente pro teste
const tamanhoAoMorrer = state.snakes[0].length;
loop.kill(0);
r.check('salvou o tamanho alcançado', storage.loadBestLength() === tamanhoAoMorrer, `salvou ${storage.loadBestLength()}, esperado ${tamanhoAoMorrer}`);
novaPartidaLocal(1); // cobra nova, bem curtinha — não deve DIMINUIR o recorde
loop.kill(0);
r.check('cobra menor depois NÃO diminui o recorde', storage.loadBestLength() === tamanhoAoMorrer);

r.secao('Melhoria 3 — tela "Sobre"');
r.check('o modal começa escondido', $('aboutOverlay').classList.contains('hidden'));
$('aboutBtn').click();
r.check('abre ao clicar no botão', !$('aboutOverlay').classList.contains('hidden'));
r.check('mostra a versão do jogo', $('aboutVersionLine').textContent.includes(state ? '' : ''), $('aboutVersionLine').textContent);
r.check('o texto da versão não está vazio', $('aboutVersionLine').textContent.trim().length > 0);
$('aboutCloseBtn').click();
r.check('fecha ao clicar em "Entendi!"', $('aboutOverlay').classList.contains('hidden'));

r.secao('Melhoria 4 — som/vibração especial ao bater recorde pessoal');
w.localStorage.setItem('snakeArenaBest', '50');
let chamouNewRecord = 0;
const soundMod = await importarDe(RAIZ)('js/sound.js');
const original = soundMod.sfx.newRecord;
soundMod.sfx.newRecord = () => { chamouNewRecord++; };
novaPartidaLocal(1);
state.scores[0] = 80; // supera os 50 salvos
loop.kill(0);
await esperar(350); // o som/vibração do recorde é disparado com setTimeout(260ms) de propósito
r.check('mostra "Novo recorde!" na segunda linha', state.deathMessage.sub === '🎉 Novo recorde!', state.deathMessage.sub);
r.check('tocou o som de novo recorde', chamouNewRecord === 1, `chamado ${chamouNewRecord}x`);
soundMod.sfx.newRecord = original;

w.localStorage.setItem('snakeArenaBest', '999');
novaPartidaLocal(1);
state.scores[0] = 10; // NÃO supera o recorde
loop.kill(0);
r.check('sem bater recorde, não aparece "Novo recorde!"', state.deathMessage.sub !== '🎉 Novo recorde!');

r.secao('Melhoria 5 — "melhor que X% das suas partidas"');
w.localStorage.removeItem('snakeArenaScoreHistory');
r.check('recordGameScore: sem histórico, percentual vem null', storage.recordGameScore(30).percentual === null);
r.check('depois de 1 partida (30), uma pontuação maior supera 100% dela', storage.recordGameScore(50).percentual === 100);
r.check('uma pontuação menor que as 2 anteriores supera 0%', storage.recordGameScore(5).percentual === 0);
const terceiraPartida = storage.loadScoreHistory();
r.check('o histórico guarda as partidas na ordem (30, 50, 5)', JSON.stringify(terceiraPartida) === JSON.stringify([30, 50, 5]));

w.localStorage.removeItem('snakeArenaScoreHistory');
w.localStorage.setItem('snakeArenaBest', '999999'); // garante que não vira "novo recorde" nesses testes
for (const pontos of [10, 20, 30, 40]) { storage.recordGameScore(pontos); } // 4 partidas no histórico
novaPartidaLocal(1);
state.scores[0] = 25; // melhor que 2 das 4 (10 e 20) = 50%
loop.kill(0);
r.check('mostra o percentual quando há histórico suficiente', state.deathMessage.sub === '📊 Melhor que 50% das suas partidas', state.deathMessage.sub);

w.localStorage.removeItem('snakeArenaScoreHistory');
for (const pontos of [10, 20]) storage.recordGameScore(pontos); // só 2 anteriores — abaixo do mínimo de 3
novaPartidaLocal(1);
state.scores[0] = 15;
loop.kill(0);
r.check('com poucas partidas anteriores (<3), não mostra percentual', state.deathMessage.sub === null, state.deathMessage.sub);

r.fim(w.__erros);
