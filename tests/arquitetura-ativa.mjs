// Teste estrutural: garante que o caminho que o GitHub Pages realmente carrega não volte a depender dos legados.
// Não executa o jogo; protege imports, entrada principal e versionamento contra regressões futuras.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
function check(ok, msg) { if (!ok) failures.push(msg); }
const html = read('index.html');
const main = read('js/main_stable_342.js');
const input = read('js/input.js');
const loop = read('js/loop_stable_336.js');
const leaderboard = read('js/leaderboard.js');
const sw = read('sw.js');
const version = read('version.txt').trim();
check(html.includes("import('./js/main_stable_342.js?"), 'index.html não aponta para main_stable_342.js');
check(main.includes("from './loop_stable_336.js'"), 'main_stable_342.js não usa loop_stable_336.js');
check(main.includes("from './render_stable_341.js'"), 'main_stable_342.js não usa render_stable_341.js');
check(main.includes("from './storage.js'"), 'main_stable_342.js não usa storage.js');
check(!main.includes("storage_v4510.js") && !main.includes("storage_v459.js"), 'main_stable_342.js usa storage versionado');
check(input.includes("from './loop_stable_336.js'"), 'input.js aponta para loop.js legado');
check(loop.includes("from './render_stable_341.js'"), 'loop_stable_336.js não usa render_stable_341.js');
check(loop.includes("from './storage.js'"), 'loop_stable_336.js não usa storage.js');
check(leaderboard.includes("from './storage.js'"), 'leaderboard.js usa storage versionado');
check(sw.includes('./js/main_stable_342.js') && sw.includes('./js/loop_stable_336.js') && sw.includes('./js/render_stable_341.js') && sw.includes('./js/net_stable_360.js'), 'sw.js não contém todos os módulos ativos');
check(version === '4.5.25', 'version.txt não está em 4.5.25');
check(html.includes('4.5.25'), 'index.html não está em 4.5.25');
check(sw.includes('snake-arena-v4.5.25'), 'sw.js não está em 4.5.25');
if (failures.length) {
  for (const f of failures) console.error('❌ ' + f);
  console.log('RESULTADO: ❌ ' + failures.length + ' falha(s)');
  process.exit(1);
}
console.log('RESULTADO: ✅ Arquitetura ativa consistente');
