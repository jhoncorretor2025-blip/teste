// Pequenas funções de apoio usadas em vários arquivos.

export const $ = id => document.getElementById(id);

// Limpa o nome digitado pelo jogador (tira < > e limita tamanho)
export const safe = (s, f) => String(s || '').trim().replace(/[<>]/g, '').slice(0, 14) || f;

// Distância entre duas células do tabuleiro (usada pela IA para achar a comida mais perto)
export const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// Faz o celular vibrar (se o navegador suportar e a pessoa não tiver desligado)
let vibrationEnabled = true;

export function setVibrationEnabled(v) {
  vibrationEnabled = v;
}

export function vibrate(pattern) {
  if (vibrationEnabled && navigator.vibrate) navigator.vibrate(pattern);
}

// Anuncia um texto pra quem usa leitor de tela, sem precisar narrar o jogo inteiro em tempo real
// (só eventos importantes: início da partida, missão completa etc.) — melhoria de acessibilidade #20
export function announce(text) {
  const el = $('srAnnounce');
  if (el) el.textContent = text;
}
