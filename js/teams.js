// Montagem dos times na partida online. Lógica "pura" (sem tela, sem rede), pra ser fácil
// de testar e de entender:
//
//  - o anfitrião define quantas minhocas tem em cada lado (contando CPUs);
//  - quem entra escolhe: jogar NO time do anfitrião ("mine") ou no time ADVERSÁRIO ("other");
//  - se o lado escolhido já estiver cheio, a pessoa vai pro outro lado;
//  - as vagas que sobrarem depois dos humanos viram CPU.
//
// Os slots (posições) seguem a ordem de entrada: o anfitrião é sempre o slot 0, os amigos
// vêm em seguida, e as CPUs ocupam os últimos slots.

export const MAX_JOGADORES = 6;

// prefs: uma preferência por HUMANO, na ordem dos slots ('mine' | 'other'); o item 0 é o
// anfitrião e sempre fica no time dele. hostTeam: 0 ou 1 (o time em que o anfitrião está).
export function planTeams({ sizeMine, sizeOther, prefs, hostTeam = 0 }) {
  const mineTeam = hostTeam;
  const otherTeam = 1 - hostTeam;
  const humanos = Math.min(MAX_JOGADORES, Math.max(1, prefs.length));
  const total = Math.min(MAX_JOGADORES, Math.max(sizeMine + sizeOther, humanos));

  const capacidade = { [mineTeam]: sizeMine, [otherTeam]: sizeOther };
  const usados = { [mineTeam]: 0, [otherTeam]: 0 };
  const cheio = (t) => usados[t] >= capacidade[t];

  const teams = Array(total).fill(null);
  const types = Array(total).fill('cpu');
  const redirecionado = Array(total).fill(false);

  for (let slot = 0; slot < humanos; slot++) {
    const queria = slot === 0 || prefs[slot] !== 'other' ? mineTeam : otherTeam;
    let t = queria;
    if (cheio(t)) {
      const outro = 1 - t;
      // Lado escolhido lotado: vai pro outro; se os dois estiverem lotados (sala passou
      // da capacidade), vai pro que tiver menos gente, pra não desequilibrar ainda mais
      t = !cheio(outro) ? outro : (usados[mineTeam] <= usados[otherTeam] ? mineTeam : otherTeam);
    }
    teams[slot] = t;
    types[slot] = 'human';
    redirecionado[slot] = t !== queria;
    usados[t]++;
  }

  for (let slot = humanos; slot < total; slot++) {
    const t = !cheio(mineTeam) ? mineTeam : (!cheio(otherTeam) ? otherTeam : (usados[mineTeam] <= usados[otherTeam] ? mineTeam : otherTeam));
    teams[slot] = t;
    usados[t]++;
  }

  return {
    count: total,
    teams,
    types,
    redirecionado,
    // quantas vagas ainda estão livres pra HUMANOS em cada lado (as CPUs cedem lugar)
    livres: {
      mine: Math.max(0, sizeMine - countTime(teams, types, mineTeam, humanos)),
      other: Math.max(0, sizeOther - countTime(teams, types, otherTeam, humanos)),
    },
  };
}

function countTime(teams, types, team, humanos) {
  let n = 0;
  for (let i = 0; i < humanos; i++) if (teams[i] === team) n++;
  return n;
}

// Todo mundo do mesmo time com a mesma cor (fica fácil saber quem é aliado e quem não é).
// O time do anfitrião usa a cor dele; o time adversário usa uma cor diferente.
export function unifyTeamColors({ colors, teams, count, hostTeam = 0, palette }) {
  const corDoAnfitriao = colors[0];
  let corAdversaria = null;
  for (let i = 0; i < count; i++) {
    if (teams[i] !== hostTeam && colors[i] && colors[i] !== corDoAnfitriao) { corAdversaria = colors[i]; break; }
  }
  if (!corAdversaria) corAdversaria = palette.find((c) => c !== corDoAnfitriao) || corDoAnfitriao;
  const resultado = colors.slice();
  for (let i = 0; i < count; i++) resultado[i] = teams[i] === hostTeam ? corDoAnfitriao : corAdversaria;
  return resultado;
}
