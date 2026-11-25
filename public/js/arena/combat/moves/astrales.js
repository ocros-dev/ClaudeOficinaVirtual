// Movimientos de Astrales (MV-3). Sello de la raza: magia cósmica y flotación. Portales estelares (teletransporte con
// destellos dorados), estrellas de cuatro puntas como proyectiles, órbitas de energía, gravedad que lanza y lluvia de
// meteoritos. Todo es redondo y dorado/índigo: nada de rayos angulosos (eso es de los Tempestarios).
// Guardián estelar: portales y golpes de gravedad. Astróloga: estrellas y constelaciones. Monje lunar: halos y órbitas.
// Crecen por etapa (1-3): la 2 flota y abre portales por detrás; la 3 hace caer meteoritos.
// Solo se importan funciones de paso de ../actions.js. Cualquier clave que falte se toma de generic.js.
// `s` = { stage, i, role, fast, burst, style, lite, race }.
import { teleport, sidestep, strike, combo, charge, beam, shoot, cast, buff, home, wait, fx, rain } from '../actions.js';

const STAR = '#fff2c0', GOLD = '#ffd060', INDIGO = '#9a7aff', LIGHT = '#bfe8ff';
// Rampa de rayo estelar: índigo → oro → blanco (distinta de la violeta de los Tempestarios)
const STAR_RAMP = ['#241a6a', '#5a3ac8', '#a89aff', '#fff2c0', '#ffffff'];
const star = (o = {}) => ({ color: STAR, color2: GOLD, ...o });
// Portal: aparece junto al objetivo con destellos de estrella
const portal = (to, ms = 90, s) => teleport(to, ms, { ghosts: s.stage >= 2 ? 3 : 2 });
// Meteoritos dorados que caen sobre la zona de combate
const meteors = (n, ms) => rain('fire', n, ms, { color: GOLD });

const vanguard = {
  // Tanteo: portal, golpe de gravedad y regreso por otro portal
  probe: s => [
    portal('target.front', 85, s), strike('atk1', s.fast ? 105 : 125, { knock: 5, fx: 'spark', lunge: 8 }),
    teleport('home', 85, { ghosts: 1 }), home(0),
  ],

  // Combo: crece con la etapa. 1 portal y golpes; 2 portal por detrás y golpe de gravedad que lanza; 3 flota sobre la presa y la hunde con meteoritos
  combo: s => {
    const ms = s.fast ? 76 : 92;
    if (s.stage === 1) return [
      portal('target.front', 85, s),
      ...combo(['atk1', 'atk2', 'atk1'], ms, { fx: 'spark' }),
      strike('atk3', s.fast ? 120 : 150, { knock: 16, launch: true, fx: 'blast', lunge: 10 }),
      home(s.fast ? 150 : 210, { ghosts: 1 }),
    ];
    if (s.stage === 2) return [
      portal('target.front', 80, s),
      ...combo(['atk1', 'atk2'], ms - 8, { fx: 'spark' }),
      portal('target.behind', 75, s),
      ...combo(['atk2', 'atk1'], ms - 8, { fx: 'spark' }),
      strike('atk3', s.fast ? 125 : 160, { knock: 16, launch: true, fx: 'blast', big: true, wave: true, lunge: 10 }),
      fx('ring', { at: 'target', r: 76, color: GOLD, squash: .4 }),
      home(s.fast ? 170 : 240, { ghosts: 3 }),
    ];
    return [
      portal('target.front', 75, s),
      ...combo(['atk1', 'atk2', 'atk1'], ms - 14, { fx: 'spark' }),
      teleport('target.above', 70, { ghosts: 4 }),                                   // flota sobre la presa
      strike('atk3', 150, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 0 }),
      fx('ring', { at: 'target', r: 92, color: STAR, squash: .4 }),
      meteors(s.fast ? 2 : 3, s.fast ? 220 : 300),
      home(s.fast ? 180 : 250, { ghosts: 3 }),
    ];
  },

  spar: s => [portal('target.front', 90, s), strike('atk1', 120, { knock: 3, fx: 'spark' }), strike('atk2', 120, { knock: 3, fx: 'spark' }), sidestep(16, 100, { ghosts: 1 }), home(200)],

  // Ráfaga: golpes veloces de gravedad con destellos estelares
  burst: s => [
    portal('target.front', 70, s),
    ...Array.from({ length: Math.min(6, 2 + (s.burst || 2)) }, (_, i) => strike(i % 2 ? 'atk2' : 'atk1', 58, { knock: 3 + (i === 5 ? 6 : 0), fx: 'spark', lunge: 6 })),
    strike('atk3', 90, { knock: 12, launch: true, fx: 'blast' }),
    teleport('home', 80, { ghosts: 2 }), home(0),
  ],

  // Remate largo: portales, golpes, caída desde lo alto y lluvia de meteoritos
  finisher: s => [
    portal('target.behind', 85, s),
    ...combo(['atk1', 'atk2', 'atk1', 'atk2'], 85, { fx: 'spark' }),
    teleport('target.above', 70, { ghosts: 4 }),
    strike('atk3', 190, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 0 }),
    fx('ring', { at: 'target', r: 100, color: GOLD, squash: .4 }),
    meteors(4, 380), wait(60), home(240, { ghosts: 3 }),
  ],
};

const ranged = {
  // Tanteo: una estrella (dos desde la etapa 2, tres en la 3: forman un triángulo)
  probe: s => [shoot('star', 210, { count: s.stage >= 3 ? 3 : s.stage >= 2 ? 2 : 1, at: .22, gap: .22, flight: 95, knock: 4, size: .8, fx: 'spark', ...star() }), wait(60)],

  // Rayo cargado: orbes que orbitan al héroe y haz estelar redondo; 2 deja un halo en el objetivo; 3 hace caer meteoritos
  beam: s => [
    charge(s.fast ? 220 : 380 + s.stage * 25, { ring: 'orbs', color: GOLD, color2: STAR, size: 14 + s.stage * 3 }),
    beam(s.fast ? 270 : 400, { big: true, w: 22 + s.stage * 6, ramp: STAR_RAMP }),
    ...(s.stage >= 2 ? [fx('ring', { at: 'target', r: 70 + s.stage * 12, color: GOLD, squash: .4 })] : []),
    ...(s.stage >= 3 ? [meteors(s.fast ? 2 : 3, s.fast ? 200 : 260)] : []),
    wait(60),
  ],

  // Disparo largo: portal hacia atrás, abanico de estrellas en arco y regreso por otro portal
  longshot: s => [
    s.stage >= 2 ? teleport({ dx: -48 }, 80, { ghosts: 3 }) : sidestep(-20, 90, { ghosts: 1 }),
    shoot('star', s.fast ? 240 : 300, { count: s.stage >= 3 ? 5 : 3, at: .1, gap: s.stage >= 3 ? .14 : .2, flight: 110, arc: 38, knock: 5, size: 1.1, fx: 'spark', ...star() }),
    wait(60), ...(s.stage >= 2 ? [teleport('home', 80, { ghosts: 2 }), home(0)] : [home(170)]),
  ],

  spar: () => [shoot('star', 220, { at: .25, flight: 120, knock: 3, size: .7, ...star() }), sidestep(-14, 100, { ghosts: 1 }), wait(60)],
  burst: s => [...Array.from({ length: Math.min(4, 2 + (s.burst || 2)) }, (_, i) => shoot('star', 105, { at: .2, flight: 85, knock: 3 + i, size: .8, ...star() })), wait(60)],
  finisher: () => [
    charge(520, { ring: 'orbs', color: GOLD, color2: STAR, size: 28 }),
    beam(560, { big: true, w: 46, ramp: STAR_RAMP }),
    fx('ring', { at: 'target', r: 110, color: GOLD, squash: .4 }), meteors(5, 420), wait(60),
  ],
};

const support = {
  // Órbita lunar: halo, dos anillos concéntricos (órbitas) y gravedad ligera que arropa a los otros dos
  buff: s => [
    cast(s.fast ? 220 : 380, { halo: true, ray: true, color: LIGHT }),
    fx('ring', { r: 64, color: LIGHT, squash: .45 }),
    ...(s.stage >= 2 ? [fx('ring', { r: 92, color: GOLD, squash: .45 })] : []),
    fx('spark', { n: 12, color: STAR, color2: LIGHT, speed: 70 }),
    buff(['vanguard', 'ranged'], s.fast ? 450 : 750),
  ],
  probe: () => [cast(240, { halo: false, ray: true, at: .3 }), wait(60)],
  spar: () => [cast(240, { halo: true, ray: true, at: .3 }), sidestep(12, 100, { ghosts: 1 })],
  burst: () => [cast(200, { halo: true, ray: true, at: .25 }), fx('spark', { n: 12, color: STAR, color2: GOLD }), wait(80)],
  finisher: () => [charge(500, { ring: 'orbs', color: LIGHT, color2: STAR }), beam(500, { w: 22, ramp: STAR_RAMP }), fx('ring', { at: 'target', r: 80, color: LIGHT }), wait(100)],
};

// Alineación Estelar: los tres abren portales alrededor de la presa, juntan órbitas de energía y la hunden con un golpe
// de gravedad, una lluvia de estrellas y meteoritos. Los tres guiones duran lo mismo
// (portal 100 + 40, 130, 130, 200, 200, 300, 120, 150, 260).
function team(s) {
  const i = s.i, first = ['target.front', 'target.above', 'target.behind'][i] || 'target.front';
  const hit = (ms, o = {}) => i === 1 ? shoot('star', ms, { at: .1, flight: 65, count: 2, gap: .3, knock: 5, size: 1, fx: 'spark', ...star(), ...o })
    : i === 2 ? strike('cast', ms, { knock: 5, fx: 'spark', lunge: 0, ...o }) : strike('atk1', ms, { knock: 6, fx: 'spark', lunge: 8, ...o });
  return [
    teleport(first, 100, { ghosts: 4 }), wait(40),
    hit(130), hit(130, { knock: 7 }),
    charge(200, { ring: 'orbs', color: GOLD, color2: STAR, size: 22, tap: false }),            // las órbitas se cierran
    i === 0 ? strike('atk3', 200, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 0 })
      : i === 1 ? shoot('star', 200, { at: .2, flight: 90, count: 3, gap: .2, size: 1.6, knock: 10, fx: 'blast', big: true, ...star() })
        : strike('cast', 200, { knock: 10, fx: 'blast', big: true, lunge: 0 }),
    meteors(i === 0 ? 4 : 3, 300),
    wait(120),
    i === 0 ? fx('ring', { at: 'target', r: 130, color: GOLD, squash: .4, shake: true })
      : i === 1 ? fx('ring', { at: 'target', r: 90, color: STAR, squash: .35 }) : fx('spark', { at: 'target', n: 16, color: GOLD, color2: LIGHT }),
    wait(150), home(260, { ghosts: 2 }),
  ];
}

export default {
  styles: { opener: 'teleport', spark: STAR, spark2: GOLD, beam: STAR_RAMP, ring: 'orbs', projectile: 'star', projColor: STAR, projColor2: GOLD, light: LIGHT, finisher: 'atk3', teamFx: 'shockwave' },
  vanguard, ranged, support, team, paint: {},
};
