// Minhoca Caçadora Invencível: aparece quando um jogador atinge marcos de comida
// (100, 150...) e persegue quem chegou lá por um tempo. Ela nunca morre — se encostar
// no alvo, ele é eliminado na hora. Depois do tempo, ela desaparece sozinha.
//
// Só o anfitrião (host) ou uma partida local calcula tudo isso — no online, o cliente
// só recebe o estado pronto via broadcastState() e desenha, igual ao resto do jogo.

import { state } from './state.js';
import { wall } from './food.js';
import { dist, vibrate } from './utils.js';
import { kill } from './loop.js';
import { sfx } from './sound.js';

const MARCOS = [
  { at: 100, durationSec: 30 },
  { at: 150, durationSec: 45 },
];
const AVISO_SEC = 3; // quantos segundos de aviso antes da perseguição começar de verdade
const TAMANHO_INICIAL = 5;

// Roda a cada tick: vê se algum jogador acabou de bater um marco e ainda não tem
// caçadora nenhuma rolando — se sim, começa uma.
export function checkHunterTrigger() {
  if (state.hunter) return; // já tem uma caçadora ativa, não empilha duas
  for (let i = 0; i < state.count; i++) {
    if (!state.alive[i]) continue;
    for (const marco of MARCOS) {
      if (state.foodsEaten[i] >= marco.at && !state.hunterTriggered[i].includes(marco.at)) {
        state.hunterTriggered[i].push(marco.at);
        spawnHunter(i, marco.durationSec);
        return; // só um marco por tick, mesmo que dois jogadores batam junto
      }
    }
  }
}

function randomSpawnPoint(avoidSlot) {
  const alvo = state.snakes[avoidSlot]?.[0];
  // Tenta achar um ponto livre, de preferência longe do alvo (pelo menos 1/3 do mapa)
  const minDist = Math.min(state.mapW, state.mapH) / 3;
  for (let tries = 0; tries < 60; tries++) {
    const x = 2 + Math.floor(Math.random() * (state.mapW - 4));
    const y = 2 + Math.floor(Math.random() * (state.mapH - 4));
    if (wall(x, y)) continue;
    if (alvo && dist({ x, y }, alvo) < minDist && tries < 40) continue; // primeiras tentativas exigem distância
    return { x, y };
  }
  return { x: Math.floor(state.mapW / 2), y: Math.floor(state.mapH / 2) };
}

function spawnHunter(targetSlot, durationSec) {
  const p = randomSpawnPoint(targetSlot);
  const segments = [];
  for (let k = 0; k < TAMANHO_INICIAL; k++) segments.push({ x: p.x, y: p.y });

  const now = Date.now();
  state.hunter = {
    phase: 'warning',
    targetSlot,
    segments,
    dir: { x: 1, y: 0 },
    warningUntil: now + AVISO_SEC * 1000,
    huntUntil: now + (AVISO_SEC + durationSec) * 1000,
    durationSec,
  };
  state.toast = {
    x: p.x, y: p.y,
    text: `🎯 ${state.names[targetSlot] || 'Jogador'} está sendo caçado!`,
    color: '#ff3355',
    until: now + 2600,
  };
  sfx.mission();
  vibrate([40, 80, 40, 80, 60]);
}

// Move a caçadora um passo em direção ao alvo — atravessa corpos de minhoca (ela é
// "sobrenatural"), mas respeita a borda do mapa/paredes internas, senão pareceria bugada.
function stepHunter() {
  const h = state.hunter;
  const head = h.segments[0];
  const target = state.snakes[h.targetSlot]?.[0];

  if (!target || !state.alive[h.targetSlot]) { state.hunter = null; return; }

  const dirsPossiveis = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  let melhor = h.dir, melhorScore = -1e9;
  for (const d of dirsPossiveis) {
    if (d.x === -h.dir.x && d.y === -h.dir.y) continue; // não dá meia-volta em cima do próprio rastro
    const p = { x: head.x + d.x, y: head.y + d.y };
    if (wall(p.x, p.y)) continue;
    const sc = -dist(p, target);
    if (sc > melhorScore) { melhorScore = sc; melhor = d; }
  }
  h.dir = melhor;

  const novaCabeca = { x: head.x + h.dir.x, y: head.y + h.dir.y };
  h.segments.unshift(novaCabeca);
  if (h.segments.length > TAMANHO_INICIAL) h.segments.pop();

  // Encostou no alvo (cabeça da caçadora tocando qualquer parte do corpo dele)? Ele morre.
  const corpoAlvo = state.snakes[h.targetSlot] || [];
  if (corpoAlvo.some(q => q.x === novaCabeca.x && q.y === novaCabeca.y)) {
    kill(h.targetSlot);
    state.toast = {
      x: novaCabeca.x, y: novaCabeca.y,
      text: `☠️ A Caçadora pegou ${state.names[h.targetSlot] || 'o jogador'}!`,
      color: '#ff3355',
      until: Date.now() + 2200,
    };
    sfx.mission();
    vibrate([60, 40, 60, 40, 100]);
    state.hunter = null;
  }
}

// Roda a cada tick: cuida da transição aviso -> perseguição -> some sozinha no fim do tempo.
export function updateHunter() {
  if (!state.hunter) return;
  const now = Date.now();
  const h = state.hunter;

  if (now >= h.huntUntil) { state.hunter = null; return; }

  if (h.phase === 'warning') {
    if (now >= h.warningUntil) h.phase = 'hunting';
    return; // durante o aviso ela fica parada, só o contador desce
  }

  stepHunter();
}
