// Efeitos sonoros do jogo — melhoria #6.
// Não usa nenhum arquivo de áudio: os sons são gerados na hora pelo navegador
// (Web Audio API), então não precisa baixar nem hospedar nada extra.

let ctx = null;
let muted = false; // melhoria #8

export function setMuted(v) {
  muted = v;
  if (v) stopMusic();
  else if (musicOn) startMusic();
}
export function isMuted() { return muted; }

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function beep({ freq = 440, duration = 0.08, type = 'sine', volume = 0.2, slideTo = null }) {
  if (muted) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + duration);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch {
    // Se o navegador bloquear áudio (ex: sem interação do usuário ainda), só ignora.
  }
}

export const sfx = {
  eat: () => beep({ freq: 520, duration: 0.07, type: 'square', volume: 0.15 }),
  star: () => beep({ freq: 700, duration: 0.16, type: 'triangle', volume: 0.2, slideTo: 1100 }),
  death: () => beep({ freq: 220, duration: 0.35, type: 'sawtooth', volume: 0.18, slideTo: 60 }),
  boost: () => beep({ freq: 300, duration: 0.12, type: 'square', volume: 0.12, slideTo: 600 }),
  mission: () => beep({ freq: 660, duration: 0.22, type: 'triangle', volume: 0.22, slideTo: 990 }),
};

// Alguns navegadores só liberam áudio depois de um clique do usuário.
// Chamamos isso no clique do botão "🚀 Jogar".
export function unlockAudio() {
  try { getCtx().resume(); } catch {}
}

// --- Trilha sonora ambiente opcional (melhoria #13) ---
// Não usa nenhum arquivo de música: é um "pad" bem suave gerado na hora, tocando baixinho.
let musicNodes = null;
let musicOn = false;

export function isMusicOn() { return musicOn; }

export function toggleMusic(force) {
  const target = typeof force === 'boolean' ? force : !musicOn;
  musicOn = target;
  if (target) startMusic(); else stopMusic();
  return musicOn;
}

function startMusic() {
  if (musicNodes || muted) return;
  try {
    const c = getCtx();
    const master = c.createGain();
    master.gain.value = 0.045;
    master.connect(c.destination);

    const osc1 = c.createOscillator(); osc1.type = 'sine'; osc1.frequency.value = 110;
    const osc2 = c.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = 164.81;
    const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 800;
    osc1.connect(filter); osc2.connect(filter); filter.connect(master);

    const lfo = c.createOscillator(); lfo.frequency.value = 0.05;
    const lfoGain = c.createGain(); lfoGain.gain.value = 260;
    lfo.connect(lfoGain); lfoGain.connect(filter.frequency);

    osc1.start(); osc2.start(); lfo.start();
    musicNodes = { master, osc1, osc2, filter, lfo, lfoGain };
  } catch {}
}

function stopMusic() {
  if (!musicNodes) return;
  try {
    musicNodes.osc1.stop(); musicNodes.osc2.stop(); musicNodes.lfo.stop();
    musicNodes.master.disconnect();
  } catch {}
  musicNodes = null;
}
