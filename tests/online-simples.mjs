// Verifica o novo fluxo simples da aba Online sem depender de navegador real.
// O teste é intencionalmente textual porque o comportamento visual é controlado por HTML/CSS,
// enquanto o clique automático do convite fica no main.js.
import fs from 'fs';
import path from 'path';
import { RAIZ, novoRelatorio } from './_ambiente.mjs';

const index = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(RAIZ, 'js/main.js'), 'utf8');
const css = fs.readFileSync(path.join(RAIZ, 'css/style.css'), 'utf8');
const r = novoRelatorio();

r.secao('Aba Online: modo simples por padrão');
r.check('existe o seletor de modo simples/complexo', /data-online-mode="simple"/.test(index) && /data-online-mode="complex"/.test(index));
r.check('modo simples começa visível', /id="onlineSimpleMode" class="onlineSimpleMode"/.test(index));
r.check('modo complexo começa escondido', /id="onlineComplexMode" class="hidden"/.test(index));
r.check('modo simples tem criar sala rápida', /id="onlineSimpleCreateBtn"/.test(index));
r.check('modo simples tem copiar link', /id="onlineSimpleCopyBtn"/.test(index));
r.check('modo simples tem entrada por link', /id="onlineSimpleJoinCode"/.test(index) && /id="onlineSimpleJoinBtn"/.test(index));

r.secao('Convite por link entra automaticamente');
r.check('o convite preenche o campo simples', /onlineSimpleJoinCode.*location.href/s.test(main));
r.check('o convite inicia ENTRAR automaticamente', /setTimeout(() => {s*if (!net.isOnline().*?$('joinBtn').click()/s.test(main));
r.check('o link simples usa a mesma função real de criação de sala', /$('hostBtn').click()/.test(main));

r.secao('Acabamento visual');
r.check('há CSS específico para os dois modos', /.onlineModeSwitchs*{/s.test(css) && /.onlineSimpleModes*{/s.test(css));
r.check('modo simples funciona no modo claro', /.lightMode .onlineModeSwitch/s.test(css));

r.fim();
