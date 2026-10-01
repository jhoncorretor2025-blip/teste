// Regressão da dificuldade progressiva da Minhoca Caçadora.
import fs from 'fs';

const root = new URL('../', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const config = await import(new URL('js/config.js', root));

const errors = [];
const check = (name, ok, detail = '') => {
  if (!ok) errors.push(`❌ ${name}${detail ? ': ' + detail : ''}`);
  else console.log('✅ ' + name);
};

const defaults = config.HUNTER_DEFAULTS;
check('há 5 aparições padrão', defaults.milestones?.length === 5, String(defaults.milestones?.length));
check('limiares são 100/150/200/250/300',
  JSON.stringify(defaults.milestones?.map((m) => m.foodThreshold)) === '[100,150,200,250,300]');
check('progressão padrão ligada', defaults.progressiveDifficulty === true);

const loop = read('js/loop_stable_336.js');
check('spawn recebe o número da aparição', /spawnHunter\(milestone\.durationSec, appearance\)/.test(loop));
check('1ª–4ª: anda mais devagar', /appearance <= 4/.test(loop) && /moveEveryTicks: 2/.test(loop));
check('1ª–4ª: sem rajada', /burstEnabled: false/.test(loop));
check('1ª–4ª: sem antecipação', /predictionSteps: 0/.test(loop));
check('1ª–4ª: sem crescimento', /growthPerVictim: 0/.test(loop));
check('1ª–4ª: corpo menor', /bodyLength: Math\.min\(base\.bodyLength, 25\)/.test(loop));
check('5ª+: perfil médio', /burstSteps: 2/.test(loop) && /return base;/.test(loop));

const storage = read('js/storage.js');
check('padrões antigos migram', /eraPadraoAntigo \|\| eraPadraoAtual/.test(storage));
check('os 5 marcos são preenchidos', /defaults\.milestones\.map/.test(storage));

console.log(errors.length ? 'RESULTADO: ' + errors.length + ' falha(s)' : 'RESULTADO: dificuldade progressiva da caçadora OK');
if (errors.length) process.exit(1);
