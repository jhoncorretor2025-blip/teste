// "Robô" que clica em TUDO e anota erros de JavaScript. Cada fase roda em processo próprio (o estado
// do jogo é um singleton por processo). Fases: menu | partida local | sala online.
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { RAIZ, novoRelatorio, criarJanela, ativar, importarDe, esperar, criarRedeFalsa } from './_ambiente.mjs';
const ENTRADA = 'js/main_stable_342.js';
const fase = process.argv[2];
// erro lançado dentro de um setTimeout também só aparece no console do navegador: anota e segue
process.on('uncaughtException', (e) => globalThis.window?.__erros?.push('EXCEÇÃO: ' + String(e?.stack || e?.message || e).split('\n').slice(0, 3).join(' | ')));
// promessa rejeitada = erro que no navegador só aparece no console; aqui vira um erro anotado (e o processo não morre)
process.on('unhandledRejection', (e) => globalThis.window?.__erros?.push('PROMESSA: ' + String(e?.stack || e?.message || e).split('\n').slice(0, 3).join(' | ')));

async function abrir() {
  const { FakePeer } = criarRedeFalsa();
  const w = criarJanela({ Peer: FakePeer }); w.HTMLElement.prototype.scrollIntoView = () => {}; w.alert = () => {}; ativar(w);
  await importarDe(RAIZ)(ENTRADA);
  return w;
}
const clicaTodos = (w, filtro = () => true) => {
  const feitos = [];
  for (const el of w.document.querySelectorAll('button, [role=tab], summary')) {
    if (el.disabled || !filtro(el)) continue;
    try { el.click(); feitos.push(el.id || el.textContent.trim().slice(0, 20)); } catch (e) { w.__erros.push('CLIQUE ' + (el.id || el.textContent.trim().slice(0, 20)) + ': ' + e.message); }
  }
  return feitos;
};
if (fase) {
  const w = await abrir();
  let n = 0;
  if (fase === 'menu') {
    n = clicaTodos(w, (el) => !['start', 'startHero', 'hostBtn', 'onlineSimpleCreateBtn', 'refresh'].includes(el.id)).length;
    for (const s of w.document.querySelectorAll('select')) for (const o of [...s.options]) { try { s.value = o.value; s.dispatchEvent(new w.Event('change', { bubbles: true })); } catch (e) { w.__erros.push('SELECT ' + s.id + ': ' + e.message); } }
    for (const c of w.document.querySelectorAll('input[type=checkbox]')) { try { c.click(); c.click(); } catch (e) { w.__erros.push('CHECK ' + c.id + ': ' + e.message); } }
  } else if (fase === 'local') {
    w.document.getElementById('start').click(); await esperar(3300);
    for (const k of ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', ' ', 'p', 'Escape', 'm']) { try { w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, code: k === ' ' ? 'Space' : k.length > 1 ? k : 'Key' + k.toUpperCase(), bubbles: true })); } catch (e) { w.__erros.push('TECLA ' + k + ': ' + e.message); } await esperar(120); }
    n = clicaTodos(w, (el) => !['refresh'].includes(el.id)).length; await esperar(600);
  } else if (fase === 'online') {
    w.document.getElementById('onlineSimpleCreateBtn').click(); await esperar(300);
    n = clicaTodos(w, (el) => !['refresh', 'startHero', 'start'].includes(el.id)).length; await esperar(800);
  }
  await esperar(500);
  // "Not implemented" = coisa que o simulador (jsdom) não faz (navegar, rolar...) — não é erro do jogo
  const reais = w.__erros.filter((e) => !/Not implemented|Could not load/i.test(String(e)));
  const unicos = [...new Set(reais.map((e) => String(e).split('\n').slice(0, 2).join(' | ').slice(0, 230)))];
  console.log('@@' + JSON.stringify({ cliques: n, erros: unicos }));
  process.exit(0);
}
const r = novoRelatorio();
for (const f of ['menu', 'local', 'online']) {
  const out = spawnSync(process.execPath, [fileURLToPath(import.meta.url), f], { encoding: 'utf8', timeout: 120000 });
  const linha = (out.stdout || '').split('\n').find((l) => l.startsWith('@@'));
  const v = linha ? JSON.parse(linha.slice(2)) : { cliques: 0, erros: ['(processo travou) ' + (out.stderr || '').slice(0, 200)] };
  r.check(`fase "${f}": ${v.cliques} cliques, sem erros de JavaScript`, v.erros.length === 0, v.erros.join('  ||  '));
}
r.fim();
