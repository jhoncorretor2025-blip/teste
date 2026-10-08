import fs from 'node:fs';
const state=fs.readFileSync('js/state.js','utf8');
const events=fs.readFileSync('js/negative_events.js','utf8');
const loop=fs.readFileSync('js/loop_stable_336.js','utf8');
const input=fs.readFileSync('js/input.js','utf8');
for (const [label,text,needles] of [
  ['state',state,['negativeEvent: null']],
  ['events',events,['invert','freeze','confusion','slow','fog','startNegativeEvents']],
  ['loop',loop,['startNegativeEvents();','shouldSkipMovement(tickCount)','stopNegativeEvents();']],
  ['input',input,['transformDirection','canTurn']]
]) for (const n of needles) if(!text.includes(n)) throw new Error(label+' ausente: '+n);
if((index.match(/4\.5\.32/g)||[]).length<4) throw new Error('versão não sincronizada no index');
if(!sws.includes('snake-arena-v4.5.32')) throw new Error('cache não sincronizado');
console.log('OK: eventos negativos + versão 4.5.32');
