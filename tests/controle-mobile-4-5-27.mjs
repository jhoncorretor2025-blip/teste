const compact = (t) => String(t).replace(/\s*([{}:;,])\s*/g, '$1').replace(/;}/g, '}'); // CSS sem espaços em volta de { } : ; , — o teste funciona com CSS formatado OU compacto
// Teste da experiência mobile v4.5.27: orientação, maximização e joystick.
import fs from 'fs';
import assert from 'assert';

const root = new URL('..', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');

const index = read('index.html');
const main = read('js/main_stable_342.js');
const input = read('js/input.js');
const render = read('js/render_stable_341.js');
const css = compact(read('css/style.css'));

assert(index.includes('id="landscapeHintBtn"'), 'faltou botão para virar e maximizar');
assert(index.includes('id="landscapeHintCloseBtn"'), 'faltou opção de continuar em retrato');
assert(index.includes('id="portraitMaximizeBtn"'), 'faltou botão de aproveitar a tela em retrato');
assert(main.includes('requestGameFullscreen(true)'), 'faltou tentativa de tela cheia + paisagem');
assert(main.includes("screen.orientation?.lock?.('landscape')"), 'faltou travamento de orientação paisagem');
assert(main.includes("sessionStorage.removeItem('snakeArenaLandscapeDismissed')"), 'o aviso não é renovado por partida');
assert(input.includes('let lastJoystickDir = null'), 'joystick não controla mudança de direção');
assert(input.includes('Math.max(ax, ay) < 6'), 'zona morta do joystick não foi reduzida');
assert(render.includes('portraitCompact'), 'câmera adaptativa de retrato não foi ligada ao renderizador');
assert(css.includes('#game .portraitMaximizeBtn{display:block}'), 'botão de retrato não está disponível no celular vertical');
assert(css.includes('#game .joystick{width:132px;height:132px}'), 'joystick mobile não recebeu área maior');
assert(css.includes('.dpadBtn{min-width:44px;min-height:44px}'), 'D-pad não recebeu alvo de toque acessível');

console.log('RESULTADO: ✅ controles mobile v4.5.27 verificados');
