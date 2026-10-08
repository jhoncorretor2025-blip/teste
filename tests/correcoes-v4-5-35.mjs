// Verifica as correções da v4.5.36 no caminho que o jogo realmente executa.
import fs from 'node:fs';
const index=fs.readFileSync('index.html','utf8');
const config=fs.readFileSync('js/config.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const version=fs.readFileSync('version.txt','utf8').trim();
const main=fs.readFileSync('js/main_stable_342.js','utf8');
const utils=fs.readFileSync('js/utils.js','utf8');
const input=fs.readFileSync('js/input.js','utf8');
const verifier=fs.readFileSync('tools/verificar-projeto.py','utf8');
const loop=fs.readFileSync('js/loop_stable_336.js','utf8');
const checks=[
 ['index',index,'4.5.36'],
 ['config',config,"VERSION = '4.5.36'"],
 ['version.txt',version,'4.5.36'],
 ['service worker',sw,'snake-arena-v4.5.36'],
 ['service worker / evento negativo',sw,"./js/negative_events.js"],
 ['service worker / IA ativa',sw,"./js/ai.js"],
 ['entrypoint ativo',index,'main_stable_342.js'],
 ['onRoomConfig usa net.mySlot',main,'if (net.mySlot > 0)'],
 ['onRoomConfig salva nome pelo slot certo',main,'state.names[net.mySlot]'],
 ['tapVibrate exportado',utils,'export function tapVibrate()'],
 ['input importa tapVibrate',input,"import { $, tapVibrate } from './utils.js';"],
 ['verificador usa entrypoint',verifier,'entrada_ativa'],
 ['motor ativo importa IA',loop,"from './ai.js'"]
];
for(const [label,text,needle] of checks) if(!text.includes(needle)) throw new Error(label+' sem: '+needle);
const s=main.indexOf('onRoomConfig:'); const e=main.indexOf('// O host é a fonte oficial',s); const block=main.slice(s,e);
if(/(^|[^.\\w$])mySlot\\b/.test(block)) throw new Error('onRoomConfig ainda contém mySlot sem net.');
console.log('RESULTADO: ✅ v4.5.36: correções do multiplayer, cache, controle e verificador conferidas');
