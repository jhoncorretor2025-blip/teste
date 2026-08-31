// Tudo relacionado à tela de configuração dos jogadores (menu inicial).

import { $, safe } from './utils.js';
import { ICONS, SNAKE_COLORS, HEAD_SHAPES, SKIN_PATTERNS } from './config.js';
import { state } from './state.js';
import { isOnline, isHost } from './net.js';

export function label(i) {
  return safe(state.names[i], `Jogador ${i + 1}`);
}

// Monta os cartões de configuração (humano/CPU, controle, cor, nome) para cada jogador
export function makePlayers() {
  const box = $('players');
  box.innerHTML = '';
  const colorOptions = SNAKE_COLORS.map(c => `<option value="${c.hex}">${c.name}</option>`).join('');
  const headOptions = HEAD_SHAPES.map(h => `<option value="${h.value}">${h.name}</option>`).join('');
  const patternOptions = SKIN_PATTERNS.map(p => `<option value="${p.value}">${p.name}</option>`).join('');
  const onlineHost = isOnline() && isHost();

  for (let i = 0; i < state.count; i++) {
    const d = document.createElement('div');
    d.className = 'player';

    // No online, os jogadores 2 e 3 são amigos remotos — cada um controla pelo próprio aparelho
    if (onlineHost && i > 0) {
      d.innerHTML = `<b style="color:${state.colors[i]}">${ICONS[i]} Jogador ${i + 1}</b><div class="muted">🌐 Conectado — controla pelo próprio aparelho</div>`;
      box.appendChild(d);
      continue;
    }

    d.innerHTML = `
      <b style="color:${state.colors[i]}">${ICONS[i]} Jogador ${i + 1}</b>
      <select class="select ptype" data-i="${i}">
        <option value="human">👤 Humano</option>
        <option value="cpu">🤖 CPU</option>
      </select>
      <select class="select pcontrol" data-i="${i}">
        <option value="arrows">⬆️ Setas</option>
        <option value="wasd">⌨️ W A S D</option>
        <option value="ijkl">🎮 I J K L</option>
      </select>
      <select class="select pcolor" data-i="${i}" aria-label="Cor da minhoca">${colorOptions}</select>
      <select class="select phead" data-i="${i}" aria-label="Formato da cabeça">${headOptions}</select>
      <select class="select ppattern" data-i="${i}" aria-label="Padrão da pele">${patternOptions}</select>
      <input class="input pname" data-i="${i}" value="${label(i)}" maxlength="14">
      <label class="check"><input type="checkbox" class="pshow" data-i="${i}" ${state.show[i] ? 'checked' : ''}> Mostrar nome</label>
    `;
    box.appendChild(d);
    d.querySelector('.ptype').value = state.types[i] || 'cpu';
    d.querySelector('.pcontrol').value = state.controls[i] || ['arrows', 'wasd', 'ijkl'][i];
    d.querySelector('.pcolor').value = state.colors[i];
    d.querySelector('.phead').value = state.heads[i] || 'round';
    d.querySelector('.ppattern').value = state.patterns[i] || 'solid';
  }
}

// Lê os campos do card "Personalização" e "Jogo" antes de iniciar a partida
export function syncSettings() {
  state.names[0] = safe($('myName').value, 'Jhon');
  state.show[0] = $('showMe').checked;
  state.showOthers = $('showOthers').checked;
  state.mode = $('mode').value;
  state.speed = $('speedSelect').value;
  state.difficulty = $('difficulty').value;
  state.noWalls = $('noWalls').checked;
}
