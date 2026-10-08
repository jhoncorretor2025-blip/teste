// Fluxo simples da aba Online: estrutura da tela e gatilhos no arquivo que o jogo REALMENTE executa
// (o comportamento de ponta a ponta está em criar-sala-real e online-ponta-a-ponta-real).
import fs from 'fs';
import path from 'path';
import { RAIZ, novoRelatorio } from './_ambiente.mjs';
const compact = (t) => String(t).replace(/\s*([{}:;,])\s*/g, '$1').replace(/;}/g, '}');
const index = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(RAIZ, 'js/main_stable_342.js'), 'utf8');
const css = compact(fs.readFileSync(path.join(RAIZ, 'css/style.css'), 'utf8'));
const r = novoRelatorio();
r.secao('Aba Online: modo simples por padrão');
r.check('existe o seletor de modo simples/complexo', /data-online-mode="simple"/.test(index) && /data-online-mode="complex"/.test(index));
r.check('modo simples começa visível', /id="onlineSimpleMode" class="onlineSimpleMode"/.test(index));
r.check('modo complexo começa escondido', /id="onlineComplexMode" class="hidden"/.test(index));
r.check('modo simples tem criar sala rápida', /id="onlineSimpleCreateBtn"/.test(index));
r.check('modo simples tem copiar link', /id="onlineSimpleCopyBtn"/.test(index));
r.check('modo simples tem entrada por link', /id="onlineSimpleJoinCode"/.test(index) && /id="onlineSimpleJoinBtn"/.test(index));
r.secao('Convite por link entra automaticamente');
r.check('o convite inicia ENTRAR sozinho (clica no botão de entrar depois de um instante)', /setTimeout\(\(\) => \$\('joinBtn'\)\?\.click\(\), \d+\)/.test(main));
r.check('o botão do modo simples usa a função real de criação de sala', /createOnlineRoom\(\{ simples: true \}\)/.test(main));
r.secao('Acabamento visual');
r.check('há CSS específico para os dois modos', css.includes('.onlineModeSwitch{') && css.includes('.onlineSimpleMode{'));
r.check('modo simples funciona no modo claro', css.includes('.lightMode .onlineModeSwitch'));
r.fim();
