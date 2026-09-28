// Lógica de montagem dos times (js/teams.js): função pura, sem tela nem rede.
import { RAIZ, novoRelatorio, importarDe } from './_ambiente.mjs';
const { planTeams, unifyTeamColors } = await importarDe(RAIZ)('js/teams.js');
const r = novoRelatorio();
const eq = (nome, a, b) => r.check(nome, JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a) === JSON.stringify(b) ? '' : `esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);
const por = (t) => [t.filter((x) => x === 0).length, t.filter((x) => x === 1).length];

r.secao('Tamanhos, escolhas e CPUs completando as vagas');
let p = planTeams({ sizeMine: 2, sizeOther: 2, prefs: ['mine', 'mine'] });
eq('2v2, amigo COM o anfitrião: times', p.teams, [0, 0, 1, 1]);
eq('2v2, amigo COM o anfitrião: 2 CPUs completam', p.types, ['human', 'human', 'cpu', 'cpu']);
p = planTeams({ sizeMine: 2, sizeOther: 2, prefs: ['mine', 'other'] });
eq('2v2, amigo CONTRA: times', p.teams, [0, 1, 0, 1]);
p = planTeams({ sizeMine: 3, sizeOther: 1, prefs: ['mine', 'mine', 'mine'] });
eq('3v1: anfitrião + 2 amigos no mesmo time', p.teams, [0, 0, 0, 1]);
eq('3v1: sobra 1 CPU no adversário', p.types, ['human', 'human', 'human', 'cpu']);
p = planTeams({ sizeMine: 2, sizeOther: 2, prefs: ['mine', 'mine', 'mine'] });
eq('lado cheio: o 3º humano é REDIRECIONADO pro outro time', p.teams.slice(0, 3), [0, 0, 1]);
eq('lado cheio: marca quem foi redirecionado', p.redirecionado.slice(0, 3), [false, false, true]);
p = planTeams({ sizeMine: 1, sizeOther: 1, prefs: ['mine', 'mine'] });
eq('1v1: amigo redirecionado pro adversário, sem CPUs', [p.teams, p.types], [[0, 1], ['human', 'human']]);
eq('1v1: nenhuma vaga livre pra humano', p.livres, { mine: 0, other: 0 });
p = planTeams({ sizeMine: 3, sizeOther: 2, prefs: ['mine'] });
eq('só o anfitrião: vagas livres pra humanos', p.livres, { mine: 2, other: 2 });
p = planTeams({ sizeMine: 2, sizeOther: 1, prefs: ['mine', 'other'], hostTeam: 1 });
eq('anfitrião no time 1 ("meu time" = 1, "adversário" = 0)', [p.teams, p.types], [[1, 0, 1], ['human', 'human', 'cpu']]);
p = planTeams({ sizeMine: 2, sizeOther: 2, prefs: ['mine'] });
eq('sozinho no 2v2: 3 CPUs, equilibrado', [p.types, por(p.teams)], [['human', 'cpu', 'cpu', 'cpu'], [2, 2]]);

r.secao('Limites e casos estranhos');
p = planTeams({ sizeMine: 3, sizeOther: 3, prefs: ['mine', 'other', 'mine', 'other', 'mine', 'other'] });
eq('6 humanos em 3v3: total 6 e 3 de cada lado', [p.count, por(p.teams)], [6, [3, 3]]);
p = planTeams({ sizeMine: 1, sizeOther: 1, prefs: ['mine', 'mine', 'mine', 'mine'] });
eq('passou da capacidade: ninguém é perdido e divide igual', [p.count, por(p.teams)], [4, [2, 2]]);
let invalido = false;
for (const [a, b] of [[1, 1], [2, 1], [1, 3], [3, 3], [2, 2]]) for (let h = 1; h <= Math.min(6, a + b); h++) {
  const q = planTeams({ sizeMine: a, sizeOther: b, prefs: Array.from({ length: h }, (_, i) => (i % 2 ? 'other' : 'mine')) });
  if (!q.teams.every((t) => t === 0 || t === 1) || q.count !== Math.max(a + b, h) || q.types.filter((t) => t === 'human').length !== h) invalido = true;
}
r.check('nenhuma combinação gera time inválido nem perde/duplica gente', !invalido);

r.secao('Cores por time');
let c = unifyTeamColors({ colors: ['#111', '#222', '#333', '#444', '#555', '#666'], teams: [0, 1, 0, 1], count: 4, palette: ['#111', '#aaa'] });
eq('meu time todo com a minha cor', [c[0], c[2]], ['#111', '#111']);
eq('adversário todo com a cor do 1º adversário', [c[1], c[3]], ['#222', '#222']);
c = unifyTeamColors({ colors: ['#111', '#111', '#111', '#111'], teams: [0, 1, 0, 1], count: 4, palette: ['#111', '#aaa'] });
eq('se todos tinham a mesma cor, o adversário ganha uma diferente', [c[1], c[3]], ['#aaa', '#aaa']);
r.fim();
