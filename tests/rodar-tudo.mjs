// Roda todos os testes (tests/*.mjs) um por um e dá um veredito só. Uso: npm test   (ou: node tests/rodar-tudo.mjs)
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const arquivos = fs.readdirSync(dir).filter((f) => f.endsWith('.mjs') && !f.startsWith('_') && f !== 'rodar-tudo.mjs').sort();
let falhou = 0;
for (const f of arquivos) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8', timeout: 240000 });
  const saida = (r.stdout || '') + (r.stderr || '');
  const resultado = saida.split('\n').filter((l) => l.startsWith('RESULTADO:')).pop() || '(sem resultado — travou ou deu erro)';
  const ok = r.status === 0;
  console.log(`${ok ? '✅' : '❌'} ${f.padEnd(34)} ${resultado}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  if (!ok) { falhou++; console.log(saida.split('\n').filter((l) => l.includes('❌') || l.includes('Erros JS') || l.includes('Error')).slice(0, 6).map((l) => '      ' + l).join('\n')); }
}
console.log(falhou ? `\n❌ ${falhou} arquivo(s) de teste com falha` : `\n✅ Todos os ${arquivos.length} arquivos de teste passaram`);
process.exit(falhou ? 1 : 0);
