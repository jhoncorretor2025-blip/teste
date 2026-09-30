// Interface do jogo: painel 🩺 que some sozinho, setinha da caçadora, placar somado dos times, marcador de time.
import { RAIZ, novoRelatorio, criarGravador, criarJanela, ativar, importarDe, esperar } from './_ambiente.mjs';
const g = criarGravador();
const w = criarJanela({ gravador: g }); ativar(w);
const imp = importarDe(RAIZ);
await imp('js/main.js');
const { state } = await imp('js/state.js');
const loop = await imp('js/loop.js');
const renderMod = await imp('js/render.js');
const r = novoRelatorio();

r.secao('Câmera mobile aproveita a proporção da arena');
const portraitView = renderMod.getViewWindow(40, 31, 32, 25, 630, 686, true);
r.check('retrato reduz a largura e preenche a altura', portraitView.w === 23 && portraitView.h === 25, JSON.stringify(portraitView));
const landscapeView = renderMod.getViewWindow(40, 31, 32, 25, 1440, 670, true);
r.check('paisagem reduz a altura e preenche a largura', landscapeView.w === 32 && landscapeView.h === 15, JSON.stringify(landscapeView));
const desktopView = renderMod.getViewWindow(40, 31, 32, 25, 1440, 670, false);
r.check('PC mantém a janela de zoom original', desktopView.w === 32 && desktopView.h === 25, JSON.stringify(desktopView));
const $ = (id) => w.document.getElementById(id);
const oculto = () => $('diagPanel').classList.contains('hidden');
const pacote = { snakes: [[{ x: 5, y: 5 }, { x: 4, y: 5 }]], foods: [], scores: [0], foodsEaten: [0], eliminations: [0], alive: [true], boosting: [false], show: [true], showOthers: true, count: 1, dirs: [{ x: 1, y: 0 }], best: 0 };

r.secao('Painel 🩺 some sozinho quando os dados chegam');
loop.startClientGame();
r.check('ao entrar numa sala o painel abre sozinho (ajuda a caçar o bug)', !oculto() && state.diagAutoShown === true);
await esperar(300);
r.check('sem dados chegando, ele CONTINUA aberto (é justamente quando ajuda)', !oculto());
loop.applyRemoteState(pacote);
r.check('quando o primeiro pacote chega, o painel some sozinho', oculto() && state.diagAutoShown === false);
loop.startClientGame(); $('diagToggleBtn').click(); $('diagToggleBtn').click();
r.check('a pessoa abriu de propósito → marcado como manual', !oculto() && state.diagManual === true);
loop.applyRemoteState(pacote);
r.check('aberto de propósito NÃO some sozinho', !oculto());
$('diagToggleBtn').click();
r.check('e ela consegue fechar pelo botão', oculto());
loop.startClientGame(); $('diagToggleBtn').click(); loop.applyRemoteState(pacote);
r.check('se ela fechou, ele não reabre sozinho', oculto());
state.receivedFirstState = false; $('diagPanel').classList.add('hidden');

// jogo local de 4 minhocas em mapa grande, tema sem decoração (pra não atrapalhar as contagens)
state.running = false;
const mudar = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('change', { bubbles: true })); };
mudar('mapSize', 'large'); mudar('count', '4'); mudar('boardTheme', 'void');
$('start').click(); await esperar(2900);
state.paused = true;
const cv = w.document.querySelector('.arena canvas');
function cena({ eu = { x: 28, y: 22 }, hunter = null }) {
  state.count = 4; state.alive = [true, true, true, true, false, false];
  const corpo = (c) => [c, { x: c.x - 1, y: c.y }, { x: c.x - 2, y: c.y }];
  state.snakes[0] = corpo(eu); state.snakes[1] = corpo({ x: eu.x + 3, y: eu.y + 2 });
  state.snakes[2] = corpo({ x: eu.x + 3, y: eu.y - 2 }); state.snakes[3] = corpo({ x: eu.x - 4, y: eu.y - 3 });
  state.dirs = [{ x: 1, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0 }];
  state.foods = []; state.toast = null; state.show = [false, false, false, false, false, false];
  state.teamMode = false; state.teams = [0, 1, 0, 1, 0, 1];
  state.hunterActive = !!hunter;
  state.hunterSnake = hunter ? [hunter, { x: hunter.x - 1, y: hunter.y }, { x: hunter.x - 2, y: hunter.y }] : [];
}
// deixa a câmera assentar (ela desliza entre quadros) antes de medir; senão a contagem da grade oscila
const desenhar = () => { for (let i = 0; i < 8; i++) renderMod.render(); g.zerar(); renderMod.render(); };
const seta = () => { const ev = g.eventos; for (let i = 0; i < ev.length - 1; i++) if (ev[i].t === 'translate' && ev[i + 1].t === 'rotate') return { x: ev[i].x, y: ev[i].y, a: ev[i + 1].a }; return null; };
const distTxt = () => g.textos.map((t) => t.t.match(/^☠️ (\d+)$/)).find(Boolean);

r.secao('Setinha apontando pra caçadora fora da tela');
const W = cv.width, H = cv.height;
cena({ hunter: { x: 55, y: 22 } }); desenhar(); let s = seta();
r.check('caçadora à DIREITA → seta pra direita', s && Math.abs(s.a) < 0.35, s && `ângulo ${s.a.toFixed(2)}`);
r.check('a seta fica dentro da tela', s && s.x > 0 && s.x < W && s.y > 0 && s.y < H);
r.check('mostra a distância até a SUA minhoca (27 casas)', distTxt() && +distTxt()[1] === 27, distTxt()?.[0]);
cena({ hunter: { x: 28, y: 43 } }); desenhar(); s = seta();
r.check('caçadora EMBAIXO → seta pra baixo', s && s.a > 1.2 && s.a < 1.9);
cena({ hunter: { x: 28, y: 1 } }); desenhar(); s = seta();
r.check('caçadora EM CIMA → seta pra cima', s && s.a < -1.2 && s.a > -1.9);
cena({ hunter: { x: 1, y: 22 } }); desenhar(); s = seta();
r.check('caçadora à ESQUERDA → seta pra esquerda', s && Math.abs(Math.abs(s.a) - Math.PI) < 0.35);
cena({ hunter: { x: 55, y: 1 } }); desenhar(); s = seta();
const mmW = Math.min(150, W * 0.34), mmH = mmW * (state.mapH / state.mapW);
r.check('no canto do minimapa a seta NÃO fica em cima dele', s && !(s.x > W - mmW - 14 && s.y < 14 + mmH));
cena({ hunter: { x: 32, y: 22 } }); desenhar();
r.check('caçadora VISÍVEL na tela → sem seta', seta() === null && !distTxt());
cena({ hunter: null }); desenhar();
r.check('sem caçadora → sem seta', seta() === null && !distTxt());

r.secao('Placar somado dos times');
cena({}); state.teamMode = true; state.teams = [0, 1, 0, 1, 0, 1]; state.scores = [10, 5, 7, 2, 0, 0];
renderMod.renderScores(); let placar = $('scores').innerHTML;
r.check('mostra a linha dos times com os totais (17 × 7)', /teamTotal/.test(placar) && />17</.test(placar) && />7</.test(placar));
r.check('o time que ganha fica em dourado', /color:#ffd24d">17</.test(placar) && /color:#ffffff">7</.test(placar));
r.check('a linha dos times vem ANTES dos jogadores', placar.indexOf('teamTotal') < placar.indexOf('Jogador'));
state.scores = [5, 5, 5, 5, 0, 0]; renderMod.renderScores(); placar = $('scores').innerHTML;
r.check('empate é avisado', /empate/.test(placar));
state.scores = [1, 9, 1, 9, 0, 0]; renderMod.renderScores(); placar = $('scores').innerHTML;
r.check('vermelho na frente (18 × 2): vermelho em dourado', /color:#ffd24d">18</.test(placar) && /color:#ffffff">2</.test(placar));
state.teamMode = false; renderMod.renderScores();
r.check('fora do modo Times não aparece', !/teamTotal/.test($('scores').innerHTML));
state.teamMode = true; state.count = 1; renderMod.renderScores();
r.check('sozinho na partida não aparece', !/teamTotal/.test($('scores').innerHTML));
state.count = 4;

r.secao('Marcador de time (▲ Azul, ■ Vermelho) na cabeça');
cena({}); state.teamMode = false; desenhar(); const base = { rect: g.n('rect'), tri: g.n('closePath') };
cena({}); state.teamMode = true; state.teams = [0, 1, 0, 1, 0, 1]; desenhar();
r.check('2 no time Vermelho → 2 quadradinhos ■', g.n('rect') - base.rect === 2);
r.check('2 no time Azul → 2 triângulos ▲', g.n('closePath') - base.tri === 2);
cena({}); state.teamMode = true; state.teams = [0, 0, 0, 1, 0, 1]; desenhar();
r.check('3 no Azul e 1 no Vermelho → 3 ▲ e 1 ■', g.n('closePath') - base.tri === 3 && g.n('rect') - base.rect === 1);
cena({}); state.teamMode = true; state.teams = [0, 1, 0, 1, 0, 1]; state.alive[3] = false; desenhar();
r.check('minhoca morta não tem marcador', g.n('rect') - base.rect === 1 && g.n('closePath') - base.tri === 2);
cena({}); state.teamMode = false; desenhar();
r.check('fora do modo Times não desenha marcador', g.n('rect') === base.rect && g.n('closePath') === base.tri);
r.fim(w.__erros);
