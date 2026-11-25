// Sonido chiptune con Web Audio: efectos y una música de fondo generada en el momento.
let ctx = null, master = null, sfxBus = null, musicBus = null;
let sfxOn = false, musicOn = false, lastType = 0;

function ensure() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.18; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.45; musicBus.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(bus, freq, start, dur, { type = 'square', vol = 0.3, slide = 0 } = {}) {
  const o = ctx.createOscillator(), gn = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, start);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, start + dur);
  gn.gain.setValueAtTime(vol, start);
  gn.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.connect(gn); gn.connect(bus);
  o.start(start); o.stop(start + dur + 0.02);
}
const N = n => 440 * Math.pow(2, (n - 69) / 12);   // nota MIDI -> Hz


// Limita la frecuencia de cada efecto del combate (y no suena si los efectos están apagados)
const lastSfx = {};
function gate(name, gap) {
  if (!sfxOn) return false;
  const t = ensure().currentTime;
  if (t - (lastSfx[name] || -9) < gap) return false;
  lastSfx[name] = t; return true;
}

export const sfx = {
  start() { if (!sfxOn) return; const t = ensure().currentTime; tone(sfxBus, N(72), t, 0.07); tone(sfxBus, N(79), t + 0.07, 0.1); },
  done()  { if (!sfxOn) return; const t = ensure().currentTime; [72, 76, 79, 84].forEach((n, i) => tone(sfxBus, N(n), t + i * 0.07, 0.12, { vol: 0.25 })); },
  door()  { if (!sfxOn) return; const t = ensure().currentTime; tone(sfxBus, N(81), t, 0.25, { type: 'triangle', vol: 0.4 }); tone(sfxBus, N(76), t + 0.22, 0.35, { type: 'triangle', vol: 0.4 }); },
  // Arena: golpe, transformación del rey y fanfarria de victoria
  hit()   { if (!sfxOn) return; const t = ensure().currentTime; tone(sfxBus, 900, t, 0.08, { vol: 0.18, slide: 0.3 }); tone(sfxBus, 180, t, 0.06, { type: 'triangle', vol: 0.3 }); },
  transform() { if (!sfxOn) return; const t = ensure().currentTime; [43, 46, 49, 52, 55].forEach((n, i) => tone(sfxBus, N(n), t + i * 0.09, 0.2, { type: 'sawtooth', vol: 0.15 })); },
  // Arena: aparición del rey y subida de etapa de una party
  bossAppear() { if (!sfxOn) return; const t = ensure().currentTime; [38, 38, 41, 34].forEach((n, i) => tone(sfxBus, N(n), t + i * 0.16, 0.3, { type: 'sawtooth', vol: 0.2 })); tone(sfxBus, N(62), t + 0.64, 0.5, { type: 'square', vol: 0.12, slide: 0.5 }); },
  heroUp() { if (!sfxOn) return; const t = ensure().currentTime; [67, 71, 74, 79].forEach((n, i) => tone(sfxBus, N(n), t + i * 0.06, 0.12, { vol: 0.18 })); },
  // Arena: llega un élite y cae un élite
  elite() { if (!sfxOn) return; const t = ensure().currentTime; [36, 43, 36].forEach((n, i) => tone(sfxBus, N(n), t + i * 0.12, 0.22, { type: 'sawtooth', vol: 0.2 })); },
  eliteDown() { if (!sfxOn) return; const t = ensure().currentTime; tone(sfxBus, 300, t, 0.25, { type: 'sawtooth', vol: 0.2, slide: 0.3 }); [79, 84].forEach((n, i) => tone(sfxBus, N(n), t + 0.15 + i * 0.07, 0.1, { vol: 0.15 })); },
  victory() { if (!sfxOn) return; const t = ensure().currentTime; [[72, 0], [72, .1], [72, .2], [79, .3], [76, .55], [84, .7]].forEach(([n, d]) => tone(sfxBus, N(n), t + d, d > .6 ? 0.4 : 0.12, { vol: 0.25 })); },
  // Arena v1.2: combate dinámico (cada efecto se limita para que las ráfagas no saturen el audio)
  dash()  { if (!gate('dash', .08)) return; const t = ctx.currentTime; tone(sfxBus, 420, t, 0.12, { type: 'sawtooth', vol: 0.09, slide: 2.6 }); },
  slash() { if (!gate('slash', .08)) return; const t = ctx.currentTime; tone(sfxBus, 1400, t, 0.09, { type: 'square', vol: 0.1, slide: 0.25 }); },
  hitBig() { if (!gate('hitBig', .1)) return; const t = ctx.currentTime; tone(sfxBus, 160, t, 0.16, { type: 'triangle', vol: 0.42, slide: 0.4 }); tone(sfxBus, 700, t, 0.1, { vol: 0.16, slide: 0.3 }); },
  shoot() { if (!gate('shoot', .08)) return; const t = ctx.currentTime; tone(sfxBus, 900, t, 0.14, { type: 'square', vol: 0.1, slide: 0.45 }); },
  cast()  { if (!gate('cast', .15)) return; const t = ctx.currentTime; [76, 79, 83].forEach((n, i) => tone(sfxBus, N(n), t + i * 0.05, 0.14, { type: 'triangle', vol: 0.14 })); },
  land()  { if (!gate('land', .12)) return; const t = ctx.currentTime; tone(sfxBus, 110, t, 0.14, { type: 'triangle', vol: 0.35, slide: 0.5 }); },
  charge() { if (!gate('charge', .2)) return; const t = ctx.currentTime; tone(sfxBus, 220, t, 0.5, { type: 'sawtooth', vol: 0.12, slide: 4 }); tone(sfxBus, 440, t + 0.1, 0.4, { type: 'square', vol: 0.05, slide: 3 }); },
  beam()  { if (!gate('beam', .2)) return; const t = ctx.currentTime; tone(sfxBus, 180, t, 0.45, { type: 'sawtooth', vol: 0.2, slide: 0.6 }); tone(sfxBus, 720, t, 0.4, { type: 'square', vol: 0.08, slide: 0.5 }); },
  clash() { if (!gate('clash', 1)) return; const t = ctx.currentTime; tone(sfxBus, 90, t, 1.4, { type: 'sawtooth', vol: 0.25, slide: 1.4 }); tone(sfxBus, 1200, t, 1.2, { type: 'square', vol: 0.06, slide: 0.7 }); },
  teleport() { if (!gate('teleport', .1)) return; const t = ctx.currentTime; tone(sfxBus, 1800, t, 0.1, { type: 'sine', vol: 0.12, slide: 0.2 }); tone(sfxBus, 400, t + 0.08, 0.1, { type: 'sine', vol: 0.12, slide: 3 }); },
  // Trueno: retardo opcional en segundos (los Tempestarios de la etapa 4 lo oyen después del golpe)
  thunder(delay = 0) { if (!gate('thunder', .4)) return; const t = ctx.currentTime + delay; tone(sfxBus, 70, t, 0.9, { type: 'sawtooth', vol: 0.3, slide: 0.35 }); tone(sfxBus, 2400, t, 0.12, { type: 'square', vol: 0.1, slide: 0.15 }); },
  type()  {
    if (!sfxOn) return;
    const t = ensure().currentTime;
    if (t - lastType < 0.09) return; lastType = t;
    tone(sfxBus, 1800 + Math.random() * 900, t, 0.02, { vol: 0.06 });
  },
};

// ---- Música: progresión C - Am - F - G con bajo y arpegio --------------------
const CHORDS = [[48, 60, 64, 67], [45, 57, 60, 64], [41, 53, 57, 60], [43, 55, 59, 62]];
const STEP = 0.16;   // segundos por semicorchea
let nextTime = 0, step = 0, timer = null;

function schedule() {
  while (nextTime < ctx.currentTime + 0.25) {
    const chord = CHORDS[Math.floor(step / 16) % CHORDS.length];
    const s = step % 16;
    if (s % 4 === 0) tone(musicBus, N(chord[0]), nextTime, STEP * 3, { type: 'triangle', vol: 0.5 });
    if (s % 2 === 0) tone(musicBus, N(chord[1 + (s / 2) % 3] + 12), nextTime, STEP * 0.9, { type: 'square', vol: 0.08 });
    if (s === 6 || s === 14) tone(musicBus, 120, nextTime, 0.05, { type: 'sawtooth', vol: 0.12, slide: 0.5 });
    nextTime += STEP; step++;
  }
}

export function setSfx(on) { sfxOn = on; if (on) { ensure(); sfx.start(); } }
export function setMusic(on) {
  musicOn = on;
  if (on) { ensure(); nextTime = ctx.currentTime + 0.05; timer = timer || setInterval(schedule, 60); }
  else { clearInterval(timer); timer = null; }
}
export const soundState = () => ({ sfxOn, musicOn });
