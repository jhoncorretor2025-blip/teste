// A barra de navegação (.tabBar) no celular ficava esticada pra tela inteira, em pé,
// virando um bug feio: uma regra ANTIGA (@media max-width:600px) definia
// "position:sticky; top:0", e uma regra NOVA (@media max-width:700px) definia
// "position:fixed; bottom:8px" — sem remover a antiga. Como um celular comum bate nas
// DUAS media queries ao mesmo tempo (600px está DENTRO de 700px), o navegador aplicava
// os dois: um elemento "position:fixed" com TANTO "top" QUANTO "bottom" definidos se
// estica pra preencher a distância entre os dois — virando a tela inteira em vez de uma
// barra compacta embaixo.
//
// Esse teste lê o CSS como TEXTO (o parser de CSS do jsdom não dá conta do arquivo
// inteiro — tem recursos modernos demais pra ele) e confere, pra cada seletor de
// navegação sensível a posição, que nenhuma OUTRA regra (numa media query de largura
// diferente, mas que também vale pra celular) redefine "top"/"bottom" de um jeito que
// bata de frente com a regra "de verdade".
import fs from 'fs';
import path from 'path';
import { RAIZ, novoRelatorio } from './_ambiente.mjs';

const css = fs.readFileSync(path.join(RAIZ, 'css/style.css'), 'utf8');
const r = novoRelatorio();

r.secao('.tabBar: só uma regra de celular define "top", e ela não conflita com "bottom"');
// Acha toda regra ".tabBar { ... }" (só esse seletor, não ".tabBar .tabBtn" nem ".tabBar::algo")
// junto com a condição de media query em que ela está (se tiver)
const regrasTabBar = [];
const regexBloco = /(@media\s*\(([^)]*)\)\s*\{[^{}]*\.tabBar\s*\{([^}]*)\}[^{}]*\}|(?<!\S)\.tabBar\s*\{([^}]*)\})/g;
for (const m of css.matchAll(/\.tabBar\s*\{([^}]*)\}/g)) {
  const antes = css.slice(0, m.index);
  // acha a media query mais próxima que ENVOLVE essa regra (procurando pra trás o @media aberto correspondente)
  const aberturas = [...antes.matchAll(/@media\s*\(([^)]*)\)\s*\{/g)];
  let media = null;
  let prof = 0;
  for (let i = antes.length - 1; i >= 0; i--) {
    if (antes[i] === '}') prof++;
    else if (antes[i] === '{') { if (prof === 0) { const mm = antes.slice(0, i).match(/@media\s*\(([^)]*)\)\s*$/); if (mm) media = mm[1]; break; } prof--; }
  }
  regrasTabBar.push({ media, corpo: m[1] });
}
const doCelular = regrasTabBar.filter((x) => x.media && /max-width\s*:\s*\d+px/.test(x.media) && parseInt(x.media.match(/max-width\s*:\s*(\d+)/)[1]) <= 900);
r.check('achou pelo menos 1 regra de .tabBar pra celular (senão o teste não testa nada de verdade)', doCelular.length >= 1, `achou ${doCelular.length}`);

const comTop = doCelular.filter((x) => /(?<!-)\btop\s*:/.test(x.corpo));
const comBottom = doCelular.filter((x) => /\bbottom\s*:/.test(x.corpo));
r.check('nenhuma regra de celular define "top" pro .tabBar (a barra é fixa só por "bottom")', comTop.length === 0,
  comTop.map((x) => `@media(${x.media}) tem top`).join('; '));
r.check('exatamente 1 regra de celular define "bottom" (a barra fixa de verdade)', comBottom.length === 1,
  `achou ${comBottom.length}: ${comBottom.map((x) => x.media).join(' | ')}`);

r.secao('A barra continua com position:fixed e as bordas certas pro celular');
const fixa = doCelular.find((x) => /position\s*:\s*fixed/.test(x.corpo));
r.check('existe uma regra position:fixed pra celular', !!fixa);
r.check('ela define bottom, left e right (barra colada nos 3 lados de baixo, não o topo)',
  fixa && /\bbottom\s*:/.test(fixa.corpo) && /\bleft\s*:/.test(fixa.corpo) && /\bright\s*:/.test(fixa.corpo));

r.fim();
