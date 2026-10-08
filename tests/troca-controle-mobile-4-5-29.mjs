const compact = (t) => String(t).replace(/\s*([{}:;,])\s*/g, '$1').replace(/;}/g, '}'); // CSS sem espaços em volta de { } : ; , — o teste funciona com CSS formatado OU compacto
import fs from 'fs';
import assert from 'assert';
const root = new URL('..', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const index=read('index.html'), main=read('js/main_stable_342.js'), css=compact(read('css/style.css')), version=read('version.txt').trim();
assert(index.includes('id="mobileTouchControlToggle"'));
assert(main.includes('function cycleTouchControlQuick()'));
assert(main.includes("$('mobileTouchControlToggle')?.addEventListener('click', cycleTouchControlQuick)"));
assert(main.includes("state.touchControl === 'dpad' ? 'joystick' : 'dpad'"));
assert(css.includes('/* v4.5.29'));
assert(css.includes('left:76px'));
assert(/^\d+\.\d+\.\d+$/.test(version));
console.log('RESULTADO: OK — troca rápida posicionada junto ao joystick na v4.5.29');
