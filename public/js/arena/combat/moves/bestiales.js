// Movimientos de Bestiales (MV-3). Sello de la raza: ferocidad y velocidad animal. Oso guardián: carreras a cuatro patas,
// saltos de caza, zarpazos encadenados y rodear a la presa. Zorra ilusionista: espejismos (imágenes residuales), dardos
// y medias lunas. Ciervo-sanador: luz de luna y aullidos. Crecen por etapa (1-3): la 2 rodea y salta por detrás; la 3
// encadena saltos de caza y remata con un aullido a la luna.
// Solo se importan funciones de paso de ../actions.js. Cualquier clave que falte se toma de generic.js.
// `s` = { stage, i, role, fast, burst, style, lite, race }.
import { run, leap, jumpBack, sidestep, strike, combo, charge, beam, shoot, cast, buff, home, wait, pose, fx } from '../actions.js';

const MOON = '#cfe0ff', MOON2 = '#ffffff', LILAC = '#bca8ff', LIGHT = '#bcd8ff';
// Rampa de luz de luna (lila profundo → blanco) para los rayos de la zorra
const LILAC_RAMP = ['#2a2a7a', '#5a4ac8', '#9a88ff', '#d8ccff', '#ffffff'];

// Zarpazo: golpe rápido de garra con tajo
const claw = (anim, ms, o = {}) => strike(anim, ms, { knock: 4, fx: 'slash', lunge: 10, ...o });
// Aullido: la bestia se alza y suelta un anillo de luna (no daña: es presencia)
const howl = (r = 70, color = MOON) => [fx('ring', { r, color, squash: .4 }), fx('spark', { n: 12, color, color2: MOON2, speed: 130 })];

const vanguard = {
  // Tanteo: carrera a cuatro patas, doble zarpazo y vuelta corriendo
  probe: s => [
    run('target.front', s.fast ? 75 : 90, { ghosts: s.stage >= 2 ? 2 : 0 }),
    claw('atk1', s.fast ? 85 : 100), claw('atk2', s.fast ? 85 : 100, { knock: 6 }),
    home(s.fast ? 130 : 170, { ghosts: s.stage >= 2 ? 1 : 0 }),
  ],

  // Combo: crece con la etapa. 1 salto de caza y zarpazos; 2 rodea a la presa y muerde por detrás; 3 encadena saltos y aúlla
  combo: s => {
    const ms = s.fast ? 62 : 74;
    if (s.stage === 1) return [
      leap('target.front', 105, { h: 40 }),
      ...combo(['atk1', 'atk2', 'atk1'], ms, { fx: 'slash' }),
      strike('atk3', s.fast ? 115 : 135, { knock: 16, launch: true, fx: 'blast', lunge: 14 }),
      home(s.fast ? 150 : 210, { ghosts: 1 }),
    ];
    if (s.stage === 2) return [
      run('target.front', 80, { ghosts: 2 }),
      claw('atk1', ms), claw('atk2', ms),
      sidestep(-30, 80, { ghosts: 3 }),                                 // rodea a la presa
      leap('target.behind', 100, { h: 44 }),
      ...combo(['atk1', 'atk2', 'atk1'], ms - 6, { fx: 'slash' }),
      strike('atk3', s.fast ? 115 : 135, { knock: 16, launch: true, fx: 'blast', big: true, lunge: 16 }),
      fx('spark', { at: 'target', n: 14, color: MOON, color2: MOON2, speed: 150 }),
      home(s.fast ? 160 : 230, { ghosts: 3 }),
    ];
    return [
      run('target.front', 75, { ghosts: 3 }),
      ...combo(['atk1', 'atk2', 'atk1'], ms - 8, { fx: 'slash' }),
      leap('target.behind', 95, { h: 52, ghosts: 2 }),
      ...combo(['atk2', 'atk1', 'atk2'], ms - 8, { fx: 'slash' }),
      leap('target.front', 100, { h: 66, land: false }),
      strike('atk3', s.fast ? 120 : 150, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 18 }),
      ...howl(90),
      home(s.fast ? 170 : 240, { ghosts: 3 }),
    ];
  },

  spar: s => [run('target.front', 95, { ghosts: 0 }), claw('atk1', 120, { knock: 3 }), claw('atk2', 120, { knock: 3 }), sidestep(16, 90, { ghosts: 1 }), home(190)],

  // Ráfaga: zarpazos rapidísimos alternos que cuentan todas las herramientas apiladas
  burst: s => [
    run('target.front', 70, { ghosts: s.stage >= 2 ? 2 : 0 }),
    ...Array.from({ length: Math.min(6, 2 + (s.burst || 2)) }, (_, i) => claw(i % 2 ? 'atk2' : 'atk1', 56, { knock: 3 + (i === 5 ? 6 : 0), lunge: 6 })),
    strike('atk3', 90, { knock: 12, launch: true, fx: 'blast' }),
    home(140, { ghosts: s.stage >= 2 ? 2 : 0 }),
  ],

  // Remate largo: carrera, cuatro zarpazos, salto de caza desde lo alto y aullido
  finisher: s => [
    run('target.front', 85, { ghosts: 3 }),
    ...combo(['atk1', 'atk2', 'atk1', 'atk2'], 78, { fx: 'slash' }),
    leap('target.behind', 100, { h: 56, ghosts: 2 }),
    leap('target.front', 105, { h: 70, land: false }),
    strike('atk3', 190, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 16 }),
    ...howl(100), wait(80), home(240, { ghosts: 3 }),
  ],
};

const dart = (s, o = {}) => ({ color: LILAC, color2: MOON2, ...o });

const ranged = {
  // Tanteo: dos dardos de ilusión (tres desde la etapa 3)
  probe: s => [shoot('dart', 200, { count: s.stage >= 3 ? 3 : 2, at: .2, gap: .22, flight: 90, knock: 3, size: .9, fx: 'spark', ...dart(s) }), wait(50)],

  // Rayo cargado: orbes de luna que giran y haz lila; desde la etapa 2 deja espejismos y en la 3 una media luna lo remata
  beam: s => [
    charge(s.fast ? 210 : 360 + s.stage * 20, { ring: 'orbs', color: LILAC, color2: MOON2, size: 14 + s.stage * 3 }),
    beam(s.fast ? 270 : 400, { big: true, w: 20 + s.stage * 6, ramp: LILAC_RAMP }),
    ...(s.stage >= 2 ? [sidestep(-20, 70, { ghosts: 3 })] : []),
    ...(s.stage >= 3 ? [fx('ring', { at: 'target', r: 80, color: LILAC, squash: .4 }), fx('spark', { at: 'target', n: 14, color: LILAC, color2: MOON2 })] : []),
    wait(50),
  ],

  // Disparo largo: salto atrás y tres medias lunas pegadas al suelo (cinco en la etapa 3)
  longshot: s => [
    jumpBack(-44, s.fast ? 75 : 85, { h: 24, ghosts: 2 }),
    shoot('moon', s.fast ? 230 : 290, { count: s.stage >= 3 ? 5 : 3, at: .08, gap: s.stage >= 3 ? .15 : .2, flight: 100, knock: 5, size: 1.1, fx: 'spark', color: MOON, color2: MOON2 }),
    wait(60), home(180, { ghosts: s.stage >= 2 ? 2 : 0 }),
  ],

  spar: s => [shoot('dart', 200, { at: .25, flight: 110, knock: 3, size: .7, ...dart(s) }), sidestep(-14, 90, { ghosts: 2 }), wait(50)],
  burst: s => [...Array.from({ length: Math.min(4, 2 + (s.burst || 2)) }, (_, i) => shoot('dart', 100, { at: .2, flight: 80, knock: 3 + i, size: .8, ...dart(s) })), wait(50)],
  finisher: s => [
    charge(520, { ring: 'orbs', color: LILAC, color2: MOON2, size: 26 }),
    beam(540, { big: true, w: 44, ramp: LILAC_RAMP }),
    fx('ring', { at: 'target', r: 100, color: MOON, squash: .4 }), fx('spark', { at: 'target', n: 18, color: LILAC, color2: MOON2, speed: 160 }),
    sidestep(-22, 70, { ghosts: 3 }), wait(60),
  ],
};

const support = {
  // Luz de luna: halo, anillo y aullido suave que bendice a los otros dos
  buff: s => [
    cast(s.fast ? 220 : 360, { halo: true, ray: true, color: LIGHT }),
    fx('ring', { r: 66, color: LIGHT, squash: .45 }),
    ...(s.stage >= 3 ? [fx('ring', { r: 96, color: MOON2, squash: .45 })] : []),
    fx('spark', { n: 12, color: LIGHT, color2: MOON2, speed: 70 }),
    buff(['vanguard', 'ranged'], s.fast ? 450 : 750),
  ],
  probe: () => [cast(240, { halo: false, ray: true, at: .3 }), wait(60)],
  spar: () => [cast(240, { halo: true, ray: true, at: .3 }), sidestep(12, 90, { ghosts: 1 })],
  burst: () => [cast(200, { halo: true, ray: true, at: .25 }), fx('spark', { n: 10, color: LIGHT }), wait(70)],
  finisher: s => [charge(500, { ring: 'light', color: LIGHT }), beam(500, { w: 20, ramp: 'white' }), ...howl(80, LIGHT), wait(80)],
};

// Cacería de la Manada: el oso salta sobre la presa, la zorra la rodea con espejismos y el ciervo la baña de luna;
// después aúllan los tres y rematan juntos. Los tres guiones duran lo mismo (120 + 40, 130, 130, 160, 200, 120, 150, 260).
function team(s) {
  const i = s.i, to = ['target.front', 'target.behind', 'target.side'][i] || 'target.front';
  const hit = (ms, o = {}) => i === 1 ? shoot('dart', ms, { at: .15, flight: 70, count: 2, gap: .3, knock: 5, size: 1, fx: 'spark', ...dart(s), ...o })
    : i === 2 ? strike('cast', ms, { knock: 5, fx: 'spark', lunge: 0, ...o }) : claw(o.anim || 'atk1', ms, { knock: 6, lunge: 12 });
  return [
    i === 1 ? run(to, 120, { ghosts: 3 }) : leap(to, 120, { h: i === 0 ? 40 : 24 }), wait(40),
    hit(130), i === 0 ? claw('atk2', 130, { knock: 7, lunge: 12 }) : hit(130, { knock: 7 }),
    // aullido de los tres (el oso salta en el sitio)
    i === 0 ? leap({ dx: 6 }, 160, { h: 74, land: false }) : pose('cast', 160),
    fx('ring', { r: 76, color: MOON, squash: .4 }),
    i === 0 ? strike('atk3', 200, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 18 })
      : i === 1 ? shoot('moon', 200, { at: .2, flight: 120, count: 3, gap: .2, size: 1.6, knock: 10, fx: 'blast', big: true, color: MOON, color2: MOON2 })
        : strike('cast', 200, { knock: 10, fx: 'blast', big: true, lunge: 0 }),
    wait(120),
    i === 0 ? fx('shockwave', { at: 'target', r: 120, color: MOON, double: true, shake: true })
      : i === 1 ? fx('ring', { at: 'target', r: 90, color: LILAC, squash: .35 }) : fx('spark', { at: 'target', n: 16, color: LIGHT, color2: MOON2 }),
    wait(150), home(260, { ghosts: 3 }),
  ];
}

export default {
  styles: { opener: 'run', spark: MOON, spark2: MOON2, beam: 'blue', ring: 'orbs', projectile: 'dart', projColor: MOON, projColor2: MOON2, light: LIGHT, finisher: 'atk3', teamFx: 'shockwave' },
  vanguard, ranged, support, team, paint: {},
};
