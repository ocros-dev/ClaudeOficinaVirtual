// Movimientos de Enanos (MV-2). Pesados y contundentes: avance con el hombro y el escudo, martillazos que agrietan el suelo y
// hacen temblar la pantalla, artillería de forja con retroceso y runas azules. Crecen por etapa (1-3): en la 2 el martillo
// se enciende (más ondas); en la 3 cae fuego del cielo y las ondas rebotan en cadena. Sin teletransportes: siempre a pie.
// Solo se importan funciones de paso de ../actions.js. Cualquier clave que falte se toma de generic.js.
// `s` = { stage, i, role, fast, burst, style, lite, race }.
import { dash, leap, jumpBack, sidestep, strike, combo, charge, beam, shoot, cast, buff, home, wait, pose, fx, rain } from '../actions.js';

const FIRE = '#ffb060', FIRE2 = '#ff7a28', EMBER = '#ff8a28', RUNE = '#5ac8ff', RUNE2 = '#c8f0ff';

// Avance con el hombro: arrancada corta sin estela, polvo y onda al plantar los pies
const charging = (s, ms = 125) => [dash('target.front', s.fast ? ms - 15 : ms, { ghosts: 0 }), fx('shockwave', { r: 44, color: FIRE })];
// Empujón con el escudo (pose de bloqueo): golpe corto que empuja
const shieldRam = (ms = 95, o = {}) => strike('block', ms, { knock: 9, fx: 'spark', lunge: 16, at: .35, ...o });
// Martillazo al suelo: golpe grande que lanza y suelta una onda; deja una grieta de brasas
const slam = (s, ms = 190, o = {}) => strike('atk3', ms, { knock: 16, launch: true, fx: 'blast', wave: true, lunge: 16, at: .55, big: s.stage >= 3, ...o });
const crack = (r = 80, o = {}) => fx('shockwave', { at: 'target', r, color: FIRE2, ...o });

const vanguard = {
  // Tanteo: avance con el hombro y un martillazo seco
  probe: s => [
    ...charging(s, 120),
    strike('atk1', s.fast ? 130 : 160, { knock: 7, fx: 'spark', lunge: 14, at: .45 }),
    ...(s.stage >= 2 ? [fx('spark', { at: 'target', n: 8, color: FIRE, color2: FIRE2 })] : []),
    home(s.fast ? 150 : 210),
  ],

  // Combo: hombro, escudo, dos martillazos y el golpe al suelo. Etapa 2: salto que aplasta antes del remate.
  // Etapa 3: martillo en llamas, lluvia de fuego y onda que rebota.
  combo: s => [
    ...charging(s, 120),
    shieldRam(90),
    strike('atk1', s.fast ? 95 : 115, { knock: 5, fx: 'spark', lunge: 12 }),
    strike('atk2', s.fast ? 95 : 115, { knock: 6, fx: 'spark', lunge: 12, tilt: -1 }),
    ...(s.stage >= 2 ? [leap('target.front', s.fast ? 130 : 160, { h: s.stage >= 3 ? 78 : 54 })] : []),
    wait(s.fast ? 20 : 50),
    slam(s, s.fast ? 150 : 190),
    crack(s.stage >= 2 ? 100 : 80, { double: s.stage >= 2, shake: s.stage >= 2 }),
    ...(s.stage >= 3 ? [rain('fire', 3, 260, { color: FIRE2 }), wait(60), crack(130, { double: true, shake: true })] : []),
    home(s.fast ? 170 : 250),
  ],

  // Cruce de golpes sin daño
  spar: () => [dash('target.front', 125, { ghosts: 0 }), strike('atk1', 150, { knock: 3, fx: 'spark' }), strike('atk2', 150, { knock: 3, fx: 'spark' }), sidestep(12, 110), home(220)],

  // Ráfaga: martillazos seguidos que cuentan todas las herramientas apiladas
  burst: s => [
    dash('target.front', 85, { ghosts: 0 }),
    ...Array.from({ length: Math.min(6, 2 + (s.burst || 2)) }, (_, i) => strike(i % 2 ? 'atk2' : 'atk1', 62, { knock: 3 + (i === 5 ? 6 : 0), fx: 'spark', lunge: 7 })),
    strike('atk3', 100, { knock: 12, launch: true, fx: 'blast', at: .5 }),
    crack(60), home(150),
  ],

  // Remate largo: Yunque de Fuego en solitario: salto, golpe que lanza, lluvia de brasas y onda en cadena
  finisher: s => [
    ...charging(s, 130),
    shieldRam(100),
    ...combo(['atk1', 'atk2', 'atk1'], 100, { knock: 5, fx: 'spark' }),
    leap('target.front', 170, { h: 84 }), wait(40),
    strike('atk3', 220, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 16, at: .55 }),
    crack(130, { double: true, shake: true }),
    rain('fire', 4, 300, { color: FIRE2 }),
    crack(100, { double: s.stage >= 2 }), wait(90),
    home(240),
  ],
};

// Artillero: cada disparo empuja al propio enano hacia atrás (retroceso) y deja polvo
const cannon = (s, o = {}) => shoot('fire', 220, { at: .28, flight: 105, knock: 5, size: .95, fx: 'blast', color: EMBER, color2: '#ffe0a0', ...o });
const recoil = (dx = -12, ms = 80) => jumpBack(dx, ms, { h: 5, ghosts: 0 });

const ranged = {
  // Tanteo: bala de cañón pequeña y retroceso
  probe: s => [cannon(s, { count: s.stage >= 3 ? 2 : 1, gap: .3 }), recoil(-10, 70), home(110)],

  // Cañonazo cargado: brasas que se concentran en la boca del cañón y salva de balas de fuego (1, 2 o 3 según la etapa);
  // cada salva empuja hacia atrás al artillero. En la etapa 3 sigue un chorro de forja.
  beam: s => [
    charge(s.fast ? 120 : 360, { ring: 'embers', color: EMBER, color2: '#ffe0a0', size: 14 + s.stage * 3 }),
    shoot('fire', s.fast ? 260 : 300, { count: s.stage, at: s.fast ? .1 : .15, gap: .3, flight: s.fast ? 85 : 105, arc: 22, size: 1.6 + s.stage * .2, knock: 12, fx: 'blast', big: true, color: EMBER, color2: '#ffe0a0' }),
    recoil(-18, 90), fx('dust', { n: 8 }),
    ...(s.stage >= 3 ? [beam(240, { w: 26, ramp: 'fire' })] : []),
    wait(40), home(170),
  ],

  // Disparo largo: retroceso potente, bala de mortero en arco que revienta con onda; dos en la etapa 3
  longshot: s => [
    jumpBack(-44, s.fast ? 85 : 100, { h: 8, ghosts: 0 }),
    shoot('fire', s.fast ? 240 : 290, { count: s.stage >= 3 ? 2 : 1, at: .12, gap: .35, flight: 115, arc: 52, knock: 8, size: 1.5, fx: 'blast', color: EMBER, color2: '#ffe0a0' }),
    fx('dust', { n: 8 }), wait(60), home(190),
  ],

  spar: () => [cannon({}, { knock: 3, size: .7 }), recoil(-8, 80), home(120)],
  burst: s => [...Array.from({ length: Math.min(4, 2 + (s.burst || 2)) }, (_, i) => shoot('fire', 110, { at: .2, flight: 85, knock: 3 + i, size: .8, color: EMBER })), recoil(-12, 80), home(120)],
  finisher: s => [
    charge(500, { ring: 'embers', color: EMBER, color2: '#ffe0a0', size: 24 }),
    shoot('fire', 360, { count: 4, at: .1, gap: .2, flight: 100, arc: 36, size: 1.7, knock: 9, fx: 'blast', big: true, color: EMBER, color2: '#ffe0a0' }),
    recoil(-20, 90), beam(480, { big: true, w: 38, ramp: 'fire' }), fx('shockwave', { at: 'target', r: 100, color: FIRE2, shake: true }), wait(80), home(190),
  ],
};

// Rúnico: runas azules que protegen y estallan (anillo y chispas en cruz)
const runeBurst = (s, r = 66) => [fx('ring', { r, color: RUNE, squash: .42 }), ...(s.stage >= 2 ? [fx('ring', { r: r + 22, color: RUNE2, squash: .42 })] : []), fx('spark', { n: 14, color: RUNE, color2: RUNE2, speed: 90 })];

const support = {
  // Runa de guardia: halo azul, runa que envuelve a los otros dos y estalla en chispas
  buff: s => [
    cast(s.fast ? 220 : 360, { halo: true, ray: true, color: RUNE2 }),
    ...runeBurst(s),
    buff(['vanguard', 'ranged'], s.fast ? 450 : 750),
  ],
  probe: () => [cast(260, { halo: false, ray: true, at: .3, color: RUNE }), wait(60)],
  spar: () => [cast(240, { halo: true, ray: true, at: .3, color: RUNE }), sidestep(10, 110)],
  burst: () => [cast(200, { halo: true, ray: true, at: .25, color: RUNE }), fx('spark', { n: 12, color: RUNE, color2: RUNE2 }), wait(80)],
  finisher: () => [charge(500, { ring: 'runes', color: RUNE }), beam(500, { w: 24, ramp: 'blue' }), fx('ring', { at: 'target', r: 80, color: RUNE, squash: .4 }), fx('spark', { at: 'target', n: 16, color: RUNE, color2: RUNE2 }), wait(100)],
};

// Yunque de Fuego: los tres se plantan en tres lados, el vanguardia salta con el martillo en llamas, el artillero llama a una
// lluvia de proyectiles de forja y el rúnico sella el suelo. El martillo cae como un meteoro y la onda rebota en cadena.
// Los tres guiones duran lo mismo (130, 120, 120, 240, 200, 200, 3 ondas con 2 esperas de 90, 150, 260).
function team(s) {
  const i = s.i;
  const hit = (ms, o = {}) => i === 1 ? shoot('fire', ms, { at: .15, flight: 70, size: 1, knock: 5, fx: 'blast', color: EMBER, color2: '#ffe0a0', ...o })
    : i === 2 ? strike('cast', ms, { knock: 4, fx: 'spark', lunge: 0, ...o })
      : strike('atk1', ms, { knock: 5, fx: 'spark', lunge: 12, ...o });
  const col = i === 2 ? RUNE : FIRE2;
  const chain = [
    i === 0 ? crack(70) : fx('ring', { at: 'target', r: 60, color: col, squash: .4 }), wait(90),
    i === 0 ? crack(100, { double: true }) : fx('ring', { at: 'target', r: 90, color: col, squash: .4 }), wait(90),
    i === 0 ? crack(140, { double: true, shake: true }) : fx('spark', { at: 'target', n: 16, color: col, color2: '#ffffff' }),
  ];
  return [
    dash(['target.front', 'target.side', 'target.behind'][i] || 'target.front', 110, { ghosts: 0 }), wait(20),
    hit(120), hit(120, { knock: 7 }),
    pose('charge', 240),                                                         // el martillo, el cañón y la runa se encienden
    i === 0 ? leap('target.front', 200, { h: 92 }) : i === 1 ? rain('fire', 5, 200, { color: FIRE2 }) : cast(200, { halo: true, ray: false, color: RUNE2 }),
    i === 0 ? slam(s, 200, { knock: 18, at: .4, big: true })
      : i === 1 ? shoot('fire', 200, { at: .15, gap: .3, count: 3, flight: 80, arc: 30, size: 1.8, knock: 10, fx: 'blast', big: true, color: EMBER, color2: '#ffe0a0' })
        : strike('cast', 200, { knock: 10, fx: 'blast', big: true, lunge: 0 }),
    ...chain,
    wait(150), home(260),
  ];
}

export default {
  styles: { opener: 'heavy', spark: FIRE, spark2: FIRE2, beam: 'fire', ring: 'embers', projectile: 'fire', projColor: EMBER, projColor2: '#ffe0a0', light: RUNE2, lightRamp: 'blue', finisher: 'atk3', teamFx: 'shockwave' },
  vanguard, ranged, support, team, paint: {},
};
