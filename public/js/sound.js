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
