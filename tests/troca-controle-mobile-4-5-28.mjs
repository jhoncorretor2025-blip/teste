// Verifica o botão rápido de troca de controle da v4.5.28.
import fs from 'fs';
import assert from 'assert';

const root = new URL('..', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');

const index = read('index.html');
const main = read('js/main_stable_342.js');
const css = read('css/style.css');
const version = read('version.txt');

assert(index.includes('id="mobileTouchControlToggle"'), 'botão mobile de troca não existe');
assert(main.includes('function cycleTouchControl()'), 'função de troca rápida não existe');
assert(main.includes("state.touchControl === 'dpad' ? 'joystick' : 'dpad'"), 'troca rápida não alterna joystick/setas');
assert(main.includes("announce(next === 'dpad' ? 'Controle trocado para setas.' : 'Controle trocado para joystick.')"), 'feedback da troca não existe');
assert(main.includes("$('mobileTouchControlToggle')?.addEventListener('click', cycleTouchControl)"), 'listener do botão mobile não existe');
assert(css.includes('width:48px') && css.includes('height:42px'), 'botão não tem área de toque adequada');
assert(version.trim() === '4.5.28', 'versão não está em 4.5.28');

console.log('RESULTADO: ✅ troca rápida joystick/setas v4.5.28 verificada');
