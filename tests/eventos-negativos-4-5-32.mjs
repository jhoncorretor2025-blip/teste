// Eventos negativos aleatórios (controles invertidos, sem virar, controles confusos, neblina). O efeito de LENTIDÃO
// foi removido de propósito ("parecia lag"), então não é mais procurado aqui.
import fs from 'node:fs';
const ler = (p) => fs.readFileSync(p, 'utf8');
const state = ler('js/state.js'), events = ler('js/negative_events.js'), loop = ler('js/loop_stable_336.js'), input = ler('js/input.js');
for (const [label, text, needles] of [
  ['state', state, ['negativeEvent: null']],
  ['events', events, ['invert', 'freeze', 'confusion', 'fog', 'startNegativeEvents']],
  ['loop', loop, ['startNegativeEvents();', 'stopNegativeEvents();']],
  ['input', input, ['transformDirection', 'canTurn']],
]) for (const n of needles) if (!text.includes(n)) throw new Error(label + ' ausente: ' + n);
if (/id:\s*'slow'/.test(events)) throw new Error('o efeito de lentidão (slow) voltou — foi removido de propósito porque parecia lag');
const versao = ler('version.txt').trim();
if (!ler('index.html').includes(versao)) throw new Error('versão não sincronizada no index');
if (!ler('sw.js').includes('snake-arena-v' + versao)) throw new Error('cache não sincronizado');
console.log('RESULTADO: OK: eventos negativos conferidos');
