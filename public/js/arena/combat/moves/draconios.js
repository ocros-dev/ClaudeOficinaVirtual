// Movimientos de Draconios (MV-3). Sello de la raza: poder y aliento. Lancero dracónico: embestida pesada con onda,
// estocadas de lanza, golpes de cola, vuelo corto con alas y picado desde arriba. Aliento-mago: alientos de fuego como
// rayo y bolas de fuego. Sacerdotisa de escamas: bendición de oro. Crecen por etapa (1-3): la 2 despega y pica; la 3
// castiga con aliento desde el aire y una cola que lanza.
// Solo se importan funciones de paso de ../actions.js. Cualquier clave que falte se toma de generic.js.
// `s` = { stage, i, role, fast, burst, style, lite, race }.
import { dash, jumpBack, sidestep, strike, combo, charge, beam, shoot, cast, buff, home, wait, fx } from '../actions.js';

const EMBER = '#ffb030', FLAME = '#ff6a28', GOLD = '#ffe08a', LIGHT = '#fff2c0';
// Rampa de aliento dorado para los remates de etapa 3 (carmín profundo → blanco)
const DRAGON_RAMP = ['#6a1020', '#c8301e', '#ff8a28', '#ffe08a', '#ffffff'];

// Vuelo corto con alas: ascenso sobre la presa (anim de carrera con las alas abiertas) y picado en lanza
const takeoff = (ms = 100, to = 'target.above') => dash(to, ms, { anim: 'run', ease: 'out', ghosts: 2 });
const dive = (ms = 70) => dash('target.front', ms, { anim: 'atk3', ease: 'lin', ghosts: 3 });
// Golpe de cola: giro con patada que empuja
const tail = (ms, o = {}) => strike('kick', ms, { knock: 9, fx: 'blast', lunge: 14, ...o });

const vanguard = {
  // Tanteo: embestida pesada con onda y estocada de lanza
  probe: s => [
    dash('target.front', s.fast ? 100 : 120, { ghosts: 1 }), fx('shockwave', { r: 40, color: EMBER }),
    strike('atk1', s.fast ? 105 : 125, { knock: 6, fx: 'slash', lunge: 14 }),
    home(s.fast ? 140 : 190),
  ],

  // Combo: crece con la etapa. 1 embestida, estocadas y cola; 2 despega y pica; 3 aliento desde el aire y cola que lanza
  combo: s => {
    const ms = s.fast ? 80 : 98;
    if (s.stage === 1) return [
      dash('target.front', 105, { ghosts: 1 }), fx('shockwave', { r: 46, color: EMBER }),
      ...combo(['atk1', 'atk2'], ms, { fx: 'slash' }),
      tail(ms + 20, { knock: 8 }),
      strike('atk3', s.fast ? 120 : 150, { knock: 16, launch: true, fx: 'blast', lunge: 14 }),
      home(s.fast ? 160 : 230, { ghosts: 1 }),
    ];
    if (s.stage === 2) return [
      dash('target.front', 95, { ghosts: 2 }),
      ...combo(['atk1', 'atk2'], ms - 10, { fx: 'slash' }),
      tail(ms, { knock: 9 }),
      takeoff(105), fx('spark', { n: 10, color: EMBER, color2: GOLD, speed: 100 }),
      dive(70),
      strike('atk3', s.fast ? 125 : 160, { knock: 17, launch: true, fx: 'blast', big: true, wave: true, lunge: 14 }),
      home(s.fast ? 170 : 240, { ghosts: 3 }),
    ];
    return [
      dash('target.front', 90, { ghosts: 2 }),
      ...combo(['atk1', 'atk2', 'atk1'], ms - 14, { fx: 'slash' }),
      takeoff(100, 'target.above'),
      beam(s.fast ? 200 : 260, { big: false, w: 26, ramp: 'fire' }),                  // aliento desde el aire
      dive(65),
      strike('atk3', 135, { knock: 14, fx: 'blast', big: true, lunge: 12 }),
      tail(150, { knock: 18, launch: true, big: true, wave: true, lunge: 18 }),
      fx('shockwave', { at: 'target', r: 110, color: FLAME, double: true, shake: true }),
      home(s.fast ? 170 : 250, { ghosts: 3 }),
    ];
  },

  spar: s => [dash('target.front', 110, { ghosts: 1 }), strike('atk1', 125, { knock: 3, fx: 'slash' }), tail(125, { knock: 3 }), sidestep(16, 100), home(200)],

  // Ráfaga: estocadas y colazos rapidísimos
  burst: s => [
    dash('target.front', 85, { ghosts: s.stage >= 2 ? 2 : 0 }),
    ...Array.from({ length: Math.min(6, 2 + (s.burst || 2)) }, (_, i) => (i % 3 === 2 ? tail(60, { knock: 4, lunge: 7 }) : strike(i % 2 ? 'atk2' : 'atk1', 60, { knock: 3 + (i === 5 ? 6 : 0), fx: i % 3 ? 'slash' : 'spark', lunge: 7 }))),
    strike('atk3', 95, { knock: 12, launch: true, fx: 'blast' }), home(150),
  ],

  // Remate largo: embestida, estocadas, despegue, picado y cola con onda doble
  finisher: s => [
    dash('target.front', 105, { ghosts: 2 }), fx('shockwave', { r: 50, color: EMBER }),
    ...combo(['atk1', 'atk2', 'atk1'], 88, { fx: 'slash' }),
    tail(100, { knock: 10 }),
    takeoff(110), fx('spark', { n: 14, color: EMBER, color2: GOLD, speed: 120 }), dive(70),
    strike('atk3', 190, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 16 }),
    fx('shockwave', { at: 'target', r: 120, color: FLAME, double: true, shake: true }),
    wait(70), home(240, { ghosts: 3 }),
  ],
};

// Bola de fuego del Aliento-mago
const fireball = (o = {}) => ({ color: FLAME, color2: GOLD, fx: 'blast', ...o });

const ranged = {
  // Tanteo: una bola de fuego (dos desde la etapa 2)
  probe: s => [shoot('fire', 220, { count: s.stage >= 2 ? 2 : 1, at: .22, gap: .25, flight: 100, knock: 4, size: .85, ...fireball({ fx: 'spark' }) }), wait(60)],

  // Aliento: carga de brasas y rayo de fuego. 1 aliento; 2 más ancho y con onda; 3 doble aliento (carmín y oro) y onda doble
  beam: s => [
    charge(s.fast ? 220 : 380 + s.stage * 25, { ring: 'embers', color: EMBER, color2: GOLD, size: 14 + s.stage * 3 }),
    beam(s.fast ? 270 : 400, { big: true, w: 22 + s.stage * 7, ramp: 'fire' }),
    ...(s.stage >= 2 ? [fx('shockwave', { at: 'target', r: 70 + s.stage * 15, color: FLAME, double: s.stage >= 3 })] : []),
    ...(s.stage >= 3 ? [beam(s.fast ? 150 : 220, { big: true, w: 38, ramp: DRAGON_RAMP })] : []),
    wait(60),
  ],

  // Disparo largo: saltito con alas hacia atrás y tres bolas de fuego en arco (cinco en la etapa 3)
  longshot: s => [
    jumpBack(-44, s.fast ? 90 : 105, { h: 34, ghosts: 2 }),
    shoot('fire', s.fast ? 240 : 300, { count: s.stage >= 3 ? 5 : 3, at: .1, gap: s.stage >= 3 ? .14 : .2, flight: 110, arc: 40, knock: 6, size: 1.2, ...fireball() }),
    wait(70), home(190),
  ],

  spar: () => [shoot('fire', 220, { at: .25, flight: 120, knock: 3, size: .7, ...fireball({ fx: 'spark' }) }), sidestep(-14, 100), wait(60)],
  burst: s => [...Array.from({ length: Math.min(4, 2 + (s.burst || 2)) }, (_, i) => shoot('fire', 105, { at: .2, flight: 85, knock: 3 + i, size: .8, ...fireball({ fx: 'spark' }) })), wait(60)],
  finisher: () => [
    charge(520, { ring: 'embers', color: EMBER, color2: GOLD, size: 28 }),
    beam(560, { big: true, w: 46, ramp: DRAGON_RAMP }),
    fx('shockwave', { at: 'target', r: 120, color: FLAME, double: true, shake: true }), wait(100),
  ],
};

const support = {
  // Bendición de escamas: halo dorado, llamas suaves y escudo para los otros dos
  buff: s => [
    cast(s.fast ? 220 : 380, { halo: true, ray: true, color: LIGHT }),
    fx('ring', { r: 66, color: GOLD, squash: .45 }),
    ...(s.stage >= 2 ? [fx('spark', { n: 12, color: EMBER, color2: LIGHT, speed: 80 })] : []),
    buff(['vanguard', 'ranged'], s.fast ? 450 : 750),
  ],
  probe: () => [cast(260, { halo: false, ray: true, at: .3 }), wait(60)],
  spar: () => [cast(240, { halo: true, ray: true, at: .3 }), sidestep(12, 100)],
  burst: () => [cast(200, { halo: true, ray: true, at: .25 }), fx('spark', { n: 10, color: EMBER }), wait(80)],
  finisher: () => [charge(500, { ring: 'light', color: LIGHT }), beam(500, { w: 20, ramp: 'gold' }), fx('ring', { at: 'target', r: 80, color: GOLD }), wait(100)],
};

// Picado del Linaje: el lancero vuela sobre la presa, el mago y la sacerdotisa la cercan; los tres castigan con fuego y el
// lancero cae en picado con un colazo. Los tres guiones duran lo mismo (120 + 40, 130, 130, 200, 200, 120, 150, 260).
function team(s) {
  const i = s.i, to = ['target.above', 'target.behind', 'target.side'][i] || 'target.front';
  const fireHit = (ms, o = {}) => i === 2 ? strike('cast', ms, { knock: 5, fx: 'spark', lunge: 0, ...o })
    : shoot('fire', ms, { at: .1, flight: 65, count: 2, gap: .3, knock: 5, size: 1, ...fireball({ fx: 'spark' }), ...o });
  return [
    i === 0 ? takeoff(120, to) : dash(to, 120, { ghosts: 2 }), wait(40),
    fireHit(130), fireHit(130, { knock: 7 }),
    i === 0 ? strike('atk3', 200, { knock: 8, fx: 'spark', lunge: 0 })                       // lanza en el aire (preparan el picado)
      : i === 1 ? charge(200, { ring: 'embers', color: EMBER, color2: GOLD, size: 22 }) : cast(200, { halo: true, ray: false, color: LIGHT }),
    i === 0 ? dash('target.front', 80, { anim: 'atk3', ease: 'lin', ghosts: 3 }) : wait(80),
    i === 0 ? tail(120, { knock: 18, launch: true, big: true, wave: true, lunge: 18 })
      : i === 1 ? beam(120, { big: true, w: 40, ramp: DRAGON_RAMP }) : strike('cast', 120, { knock: 10, fx: 'blast', big: true, lunge: 0 }),
    wait(120),
    i === 0 ? fx('shockwave', { at: 'target', r: 130, color: FLAME, double: true, shake: true })
      : i === 1 ? fx('ring', { at: 'target', r: 90, color: EMBER, squash: .35 }) : fx('spark', { at: 'target', n: 16, color: GOLD, color2: LIGHT }),
    wait(150), home(260, { ghosts: 2 }),
  ];
}

export default {
  styles: { opener: stage => (stage >= 2 ? 'leap' : 'heavy'), spark: EMBER, spark2: GOLD, beam: 'fire', ring: 'embers', projectile: 'fire', projColor: FLAME, projColor2: GOLD, light: LIGHT, finisher: 'atk3', teamFx: 'shockwave' },
  vanguard, ranged, support, team, paint: {},
};
