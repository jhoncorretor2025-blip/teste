// Skin/cabeça/cor de cada jogador no ONLINE. Antes, o amigo mandava ao anfitrião só o NOME:
// a cor, a cabeça (gatinho, dragão...), a skin do corpo e o rastro que ele escolheu no perfil
// nunca apareciam pro anfitrião (nem pros outros) — todo mundo entrava com o visual padrão.
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { RAIZ, novoRelatorio, criarJanela, ativar, importarDe, esperar, copiarProjeto, criarRedeFalsa } from './_ambiente.mjs';
const ENTRADA = 'js/main_stable_342.js';
const { FakePeer } = criarRedeFalsa();
const $ = (w, id) => w.document.getElementById(id);
const r = novoRelatorio();
const pastaAmigo = copiarProjeto();
const semScroll = (w) => { w.HTMLElement.prototype.scrollIntoView = () => {}; };
const cfg = await importarDe(RAIZ)('js/config.js');
const paleta = cfg.TRICOLOR_PALETTES[1]?.value ?? cfg.TRICOLOR_PALETTES[1]?.id ?? cfg.TRICOLOR_PALETTES[0]?.value ?? cfg.TRICOLOR_PALETTES[0]?.id;

async function rodar(perfilAmigo) {
  const host = criarJanela({ pasta: RAIZ, Peer: FakePeer, semente: { snakeArenaProfile: JSON.stringify({ name: 'Jhonatan' }) } }); semScroll(host); ativar(host);
  await importarDe(RAIZ)(ENTRADA + '?h' + Math.random());
  const hs = (await importarDe(RAIZ)('js/state.js')).state;
  $(host, 'onlineSimpleCreateBtn').click(); await esperar(200);
  const link = $(host, 'onlineSimpleRoomLink').value;
  const A = criarJanela({ pasta: pastaAmigo, url: link, Peer: FakePeer, semente: { snakeArenaProfile: JSON.stringify(perfilAmigo) } }); semScroll(A); ativar(A);
  await importarDe(pastaAmigo)(ENTRADA + '?a' + Math.random());
  const as = (await importarDe(pastaAmigo)('js/state.js')).state;
  await esperar(1500); ativar(host);
  $(host, 'onlineSimpleStartBtn').click(); await esperar(3800); ativar(A); await esperar(150);
  return { hs, as, host, A };
}

// O estado do jogo é um singleton por processo: um 2º cenário no MESMO processo herdaria os valores do
// 1º e o teste de segurança passaria à toa. Por isso o cenário "dados malucos" roda em processo próprio.
if (process.argv[2] === 'maluco') {
  const { hs } = await rodar({ name: 'X', color: 'javascript:alert(1)', head: '<img src=x onerror=alert(1)>', pattern: 'nao-existe', palette: 'nao-existe', trailColor: 'red;}body{display:none' });
  console.log('@@' + JSON.stringify({ color: hs.colors[1], head: hs.heads[1], pattern: hs.patterns[1], palette: hs.palettes[1], trail: hs.trailColors[1] }));
  process.exit(0);
}

r.secao('A aparência escolhida pelo amigo aparece no anfitrião e no próprio amigo');
{
  const perfil = { name: 'Alessandra', color: '#ff4fa3', head: 'cat', pattern: 'galaxy', palette: paleta, trailColor: '#22d3ee' };
  const { hs, as } = await rodar(perfil);
  r.check('anfitrião vê a COR do amigo', hs.colors[1] === '#ff4fa3', hs.colors[1]);
  r.check('anfitrião vê a CABEÇA do amigo (gatinho)', hs.heads[1] === 'cat', hs.heads[1]);
  r.check('anfitrião vê a SKIN do amigo', hs.patterns[1] === 'galaxy', hs.patterns[1]);
  r.check('anfitrião vê o RASTRO do amigo', hs.trailColors[1] === '#22d3ee', hs.trailColors[1]);
  r.check('o amigo também vê o próprio visual', as.heads[1] === 'cat' && as.colors[1] === '#ff4fa3' && as.patterns[1] === 'galaxy', `${as.heads[1]} ${as.colors[1]} ${as.patterns[1]}`);
  r.check('o amigo vê o visual do anfitrião (o do anfitrião não muda)', as.heads[0] === hs.heads[0] && as.colors[0] === hs.colors[0]);
}

r.secao('Dados malucos no perfil NÃO entram (segurança) — processo separado');
{
  const saida = spawnSync(process.execPath, [fileURLToPath(import.meta.url), 'maluco'], { encoding: 'utf8', timeout: 60000 }).stdout || '';
  const linha = saida.split('\n').find((l) => l.startsWith('@@'));
  const v = linha ? JSON.parse(linha.slice(2)) : {};
  r.check('cor inválida é ignorada (fica a padrão do slot)', v.color === '#ff72bd', String(v.color));
  r.check('cabeça inválida é ignorada', v.head === 'round', String(v.head));
  r.check('skin inválida é ignorada', v.pattern === 'solid', String(v.pattern));
  r.check('paleta inválida é ignorada', v.palette === 'auto', String(v.palette));
  r.check('rastro inválido é ignorado', v.trail === 'auto', String(v.trail));
}
r.fim();
