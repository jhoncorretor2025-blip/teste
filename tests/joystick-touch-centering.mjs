// Regressão do joystick: o polegar visual deve ficar centrado e retornar ao soltar.
import assert from 'assert';
import fs from 'fs';
import { RAIZ, criarJanela, ativar, importarDe } from './_ambiente.mjs';

const w = criarJanela();
ativar(w);
w.HTMLElement.prototype.setPointerCapture ||= function () {};

const joystick = w.document.getElementById('joystick');
const stick = w.document.getElementById('stick');
assert(joystick && stick, 'o joystick e sua bolinha precisam existir');

const css = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
assert.match(
  css,
  /#game\s+\.touch\s+\.stick\s*\{\s*left:\s*50%;\s*top:\s*50%;\s*\}/,
  'o CSS precisa manter a âncora do polegar no centro, em qualquer layout móvel',
);

joystick.getBoundingClientRect = () => ({
  left: 0, top: 0, right: 132, bottom: 132, width: 132, height: 132,
  x: 0, y: 0, toJSON() {},
});

const { setupInput } = await importarDe(RAIZ)('js/input.js?joystick-centering-v4557');
setupInput();

function pointer(type, x, y) {
  const e = new w.Event(type, { bubbles: true, cancelable: true });
  for (const [key, value] of Object.entries({ pointerId: 1, clientX: x, clientY: y })) {
    Object.defineProperty(e, key, { configurable: true, value });
  }
  return e;
}

// O centro do joystick é (66, 66); arrastar até (106, 66) desloca 40 px à direita.
joystick.dispatchEvent(pointer('pointerdown', 106, 66));
assert.equal(
  stick.style.transform,
  'translate(-50%, -50%) translate(40px, 0px)',
  'a bolinha deve conservar a centralização quando se desloca',
);

// Voltar para a zona neutra deve recentralizar visualmente a bolinha.
joystick.dispatchEvent(pointer('pointermove', 66, 66));
assert.equal(
  stick.style.transform,
  'translate(-50%, -50%) translate(0px, 0px)',
  'a bolinha deve voltar ao centro ao retornar à zona neutra',
);

// Soltar o dedo também precisa devolver a bolinha à posição inicial.
joystick.dispatchEvent(pointer('pointerup', 106, 66));
assert.equal(
  stick.style.transform,
  'translate(-50%, -50%) translate(0px, 0px)',
  'a bolinha deve voltar ao centro ao soltar o toque',
);

w.close();
console.log('RESULTADO: OK — joystick centralizado ao arrastar, voltar ao centro e soltar');
process.exit(0);
