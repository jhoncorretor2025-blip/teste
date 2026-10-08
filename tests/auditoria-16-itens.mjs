// Auditoria que EXECUTA o jogo de verdade (js/main_stable_342.js) pra cada melhoria pedida.
import { RAIZ, novoRelatorio, criarGravador, criarJanela, ativar, importarDe, esperar, copiarProjeto, criarRedeFalsa } from './_ambiente.mjs';
const ENTRADA = 'js/main_stable_342.js';
const { FakePeer } = criarRedeFalsa();
const $ = (w, id) => w.document.getElementById(id);
const r = novoRelatorio();
const pastaAmigo = copiarProjeto();
const semScroll = (w) => { w.HTMLElement.prototype.scrollIntoView = () => {}; };

// ---- host + amigo online, com NOME de cada um salvo no perfil antes de abrir
const gH = criarGravador(), gA = criarGravador();
const host = criarJanela({ pasta: RAIZ, Peer: FakePeer, gravador: gH, semente: { snakeArenaProfile: JSON.stringify({ name: 'Jhonatan' }) } }); semScroll(host); ativar(host);
await importarDe(RAIZ)(ENTRADA);
const hs = (await importarDe(RAIZ)('js/state.js')).state;
const netH = await importarDe(RAIZ)('js/net.js');
$(host, 'onlineSimpleCreateBtn').click(); await esperar(200);
const link = $(host, 'onlineSimpleRoomLink').value;

const A = criarJanela({ pasta: pastaAmigo, url: link, Peer: FakePeer, gravador: gA, semente: { snakeArenaProfile: JSON.stringify({ name: 'Alessandra' }) } }); semScroll(A); ativar(A);
await importarDe(pastaAmigo)(ENTRADA);
const as = (await importarDe(pastaAmigo)('js/state.js')).state;
await esperar(1500);
ativar(host);
$(host, 'onlineSimpleStartBtn').click();
await esperar(3800);
ativar(A); await esperar(150);

r.secao('NOMES REAIS dos jogadores');
r.check('anfitrião tem o próprio nome', hs.names[0] === 'Jhonatan', hs.names[0]);
r.check('anfitrião vê o NOME REAL do amigo (não "Jogador 2")', hs.names[1] === 'Alessandra', hs.names[1]);
r.check('amigo vê o nome do anfitrião', as.names[0] === 'Jhonatan', as.names[0]);
r.check('amigo vê o PRÓPRIO nome real', as.names[1] === 'Alessandra', as.names[1]);

r.secao('MAPA online');
r.check('o mapa online começa grande (>= médio 40x31)', hs.mapW * hs.mapH >= 40 * 31, `${hs.mapW}x${hs.mapH}`);
r.check('o amigo recebeu o MESMO tamanho de mapa', as.mapW === hs.mapW && as.mapH === hs.mapH, `host ${hs.mapW}x${hs.mapH} amigo ${as.mapW}x${as.mapH}`);

// cresce conforme a maior minhoca cresce
ativar(host);
const w0 = hs.mapW, h0 = hs.mapH;
const cabeca = hs.snakes[0][0];
for (let i = 0; i < 90; i++) hs.snakes[0].push({ x: Math.max(0, cabeca.x - i - 1), y: cabeca.y });
await esperar(500);
r.check('o mapa AUMENTOU depois que a minhoca ficou comprida', hs.mapW > w0 || hs.mapH > h0, `${w0}x${h0} → ${hs.mapW}x${hs.mapH}`);
ativar(A); await esperar(300);
r.check('o amigo recebeu o mapa já aumentado', as.mapW === hs.mapW && as.mapH === hs.mapH, `host ${hs.mapW}x${hs.mapH} amigo ${as.mapW}x${as.mapH}`);

r.secao('ELIMINAR jogadores no online + AVISO de eliminação');
ativar(host);
// Cena exata (sem parede, posições fixas) pra não depender de onde as minhocas nasceram:
// anfitrião anda pra direita pela linha y=15; o AMIGO desce pela coluna x=18 e bate no corpo dele.
hs.noWalls = true;
hs.alive[0] = hs.alive[1] = true; hs.respawnAt[0] = hs.respawnAt[1] = 0;
hs.snakes[0] = [20,19,18,17,16,15,14,13].map((x) => ({ x, y: 15 }));
hs.dirs[0] = { x: 1, y: 0 }; if (hs.nextDirs) hs.nextDirs[0] = { x: 1, y: 0 };
hs.snakes[1] = [{ x: 18, y: 13 }, { x: 18, y: 12 }, { x: 18, y: 11 }];
hs.dirs[1] = { x: 0, y: 1 }; if (hs.nextDirs) hs.nextDirs[1] = { x: 0, y: 1 };
hs.foods = [];
const elimAntes = hs.eliminations[0] || 0;
await esperar(480);
r.check('o amigo morreu (alive[1] = false no anfitrião)', hs.alive[1] === false, JSON.stringify(hs.alive));
r.check('o anfitrião ganhou +1 eliminação', (hs.eliminations[0] || 0) === elimAntes + 1, `${elimAntes} → ${hs.eliminations[0]}`);
ativar(A); await esperar(80);
r.check('o amigo também sabe que morreu', as.alive[1] === false, JSON.stringify(as.alive));
const aviso = as.toast?.text || '';
r.check('o amigo vê o aviso "X eliminou Y" com os nomes reais', /Jhonatan eliminou Alessandra/.test(aviso), aviso);
r.check('o amigo vê QUEM o eliminou na mensagem de morte', /Jhonatan te eliminou/.test(as.deathMessage?.text || ''), as.deathMessage?.text);

r.secao('RADAR (minimapa) com nome e pontuação');
ativar(host); await esperar(500); // deixa o amigo renascer / voltar ao jogo
gH.zerar();
const m = await importarDe(RAIZ)('js/render_stable_341.js'); m.render();
const textosH = gH.textos.map((t) => t.t);
r.check('a legenda do radar escreve o nome do amigo, sozinho numa linha (não é a etiqueta da minhoca)', textosH.includes('Alessandra'), textosH.slice(0, 14).join(' | '));
r.check('a legenda marca VOCÊ com estrela', textosH.includes('★ Jhonatan'), textosH.slice(0, 14).join(' | '));
r.check('a legenda mostra as pontuações como números', textosH.filter((t) => /^\d+$/.test(t)).length >= 2, textosH.filter((t) => /^\d+$/.test(t)).join(','));

r.secao('RANKING com nome, pontuação, data e duração');
const stor = await importarDe(RAIZ)('js/storage_v4510.js');
host.localStorage.removeItem('snakeArenaLeaderboard');
stor.addToLeaderboard('Jhonatan', 120, 95000);
const placar = stor.loadLeaderboard();
r.check('o ranking guarda nome + pontuação', placar[0]?.name === 'Jhonatan' && placar[0]?.score === 120, JSON.stringify(placar[0]));
r.check('o ranking guarda data e duração', !!placar[0]?.date && placar[0]?.durationMs === 95000, JSON.stringify(placar[0]));
const lb = await importarDe(RAIZ)('js/leaderboard.js');
lb.renderLeaderboard?.();
const htmlRank = ($(host, 'leaderboardList') || $(host, 'leaderboard') || { innerHTML: '' }).innerHTML || host.document.body.innerHTML;
r.check('a tela do ranking mostra o nome e a pontuação', /Jhonatan/.test(htmlRank) && /120/.test(htmlRank), (htmlRank.match(/Jhonatan[^<]{0,60}/) || ['(não achei)'])[0]);

r.secao('TEMPO de jogo: total, hoje, histórico por dia, conquistas');
host.localStorage.removeItem('snakeArenaTotalPlaytimeMs'); host.localStorage.removeItem('snakeArenaDailyPlaytimeMs');
stor.addPlaytime(5 * 60 * 1000);
r.check('o tempo total soma', stor.loadTotalPlaytime() === 300000, String(stor.loadTotalPlaytime()));
r.check('o tempo de HOJE soma', stor.loadTodayPlaytime() === 300000, String(stor.loadTodayPlaytime()));
r.check('o histórico por dia tem hoje', stor.loadPlaytimeHistory(14).length >= 1 && (JSON.stringify(stor.loadPlaytimeHistory(14)).includes('300000')), JSON.stringify(stor.loadPlaytimeHistory(14)));
stor.addPlaytime(6 * 60 * 1000); // passa de 10 minutos
r.check('conquista "Primeiros Minutos" (10 min) desbloqueia', stor.loadUnlockedAchievements().includes('playtime_10m'), JSON.stringify(stor.loadUnlockedAchievements()));
stor.addPlaytime(2 * 60 * 60 * 1000);
r.check('conquista "Maratona do Dia" (2h no mesmo dia) desbloqueia', stor.loadUnlockedAchievements().includes('playtime_day_2h'));
r.check('conquista de 1 hora desbloqueia', stor.loadUnlockedAchievements().includes('playtime_1h'));

r.fim(host.__erros, A.__erros);
