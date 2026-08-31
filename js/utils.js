// Pequenas funções de apoio usadas em vários arquivos.

export const $ = id => document.getElementById(id);

// Limpa o nome digitado pelo jogador (tira < > e limita tamanho)
export const safe = (s, f) => String(s || '').trim().replace(/[<>]/g, '').slice(0, 14) || f;

// Distância entre duas células do tabuleiro (usada pela IA para achar a comida mais perto)
export const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// Faz o celular vibrar (se o navegador suportar) — melhoria #5
export function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}
