// Tutorial rápido pra quem visita o jogo pela primeira vez — melhoria #9.
// Só aparece uma vez (guarda um "já vi" no navegador da pessoa).

import { $ } from './utils.js';

const KEY = 'snakeArenaTutorialSeen';

export function maybeShowTutorial() {
  if (localStorage.getItem(KEY)) return;
  $('tutorial').classList.remove('hidden');
}

export function setupTutorial() {
  $('tutorialClose').addEventListener('click', () => {
    localStorage.setItem(KEY, '1');
    $('tutorial').classList.add('hidden');
  });
}
