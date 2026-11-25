// Movimientos de Humanos (MV-1). Disciplina: pasos firmes (carrera corta, nunca teletransporte), esgrima de estocada, corte
// ascendente y tajo cruzado, empujón de escudo que lanza y retroceso en guardia. Hechicero: esfera de cristal que estalla en 3.
// Sanadora: halo y barrera. Técnica de equipo: Carga del Alba (formación en V y estocada de luz).
// Solo se importan funciones de paso de ../actions.js. `s` = { stage, i, role, fast, burst, style, lite, race }.
import { run, sidestep, jumpBack, strike, combo, charge, beam, shoot, cast, buff, home, wait, pose, fx } from '../actions.js';

const GOLD = '#ffe08a', LIGHT = '#fff2c0';
// Empujón con el escudo: golpe corto con la pose de bloqueo, empuja y lanza
const shieldBash = (ms = 110, o = {}) => strike('block', ms, { knock: 9, fx: 'spark', lunge: 16, ...o });

const vanguard = {
  // Tanteo: paso firme, estocada y retroceso a la guardia con el escudo arriba
  probe: s => [run('target.front', s.fast ? 100 : 120, { ghosts: 0 }), strike('atk1', s.fast ? 105 : 130, { knock: 5, fx: 'slash', lunge: 16, at: .38 }), pose('block', 80), home(s.fast ? 140 : 190)],

  // Combo: estocada, corte ascendente, tajo cruzado y, desde la etapa 2, empujón de escudo; el remate lanza (etapa 3: onda de luz)
  combo: s => [
    run('target.front', 105, { ghosts: 0 }),
    strike('atk1', s.fast ? 85 : 100, { knock: 4, fx: 'slash', lunge: 16, at: .38 }),
    strike('atk2', s.fast ? 85 : 100, { knock: 5, fx: 'slash', lunge: 10, tilt: -1 }),
    strike('atk3', s.fast ? 95 : 115, { knock: 6, fx: 'slash', lunge: 12 }),
    ...(s.stage >= 2 ? [shieldBash(s.fast ? 90 : 110)] : []),
    strike('atk3', s.fast ? 120 : 160, { knock: 16, launch: true, fx: 'blast', big: s.stage >= 3, lunge: 18 }),
    ...(s.stage >= 3 ? [fx('shockwave', { at: 'target', r: 90, color: GOLD, double: true })] : []),
    pose('block', 70), home(s.fast ? 170 : 240),
  ],

  // Cruce de golpes: finta, estocada y guardia
  spar: () => [run('target.front', 120, { ghosts: 0 }), strike('atk1', 130, { knock: 3, fx: 'slash' }), strike('atk2', 130, { knock: 3, fx: 'slash' }), jumpBack(-20, 110), home(200)],

  // Ráfaga: estocadas encadenadas en formación cerrada
  burst: s => [
    run('target.front', 80, { ghosts: 0 }),
    ...Array.from({ length: Math.min(6, 2 + (s.burst || 2)) }, (_, i) => strike(['atk1', 'atk2', 'atk3'][i % 3], 62, { knock: 3 + (i === 5 ? 6 : 0), fx: i % 2 ? 'spark' : 'slash', lunge: 8 })),
    shieldBash(80, { knock: 12, launch: true, fx: 'blast' }), home(150),
  ],

  finisher: () => [
    run('target.front', 130, { ghosts: 0 }),
    ...combo(['atk1', 'atk2', 'atk3'], 100, { knock: 5, fx: 'slash' }),
    shieldBash(120), strike('atk3', 210, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 18 }),
    fx('shockwave', { at: 'target', r: 110, color: GOLD, double: true, shake: true }), home(240),
  ],
};

const ranged = {
  probe: s => [shoot('orb', 220, { at: .25, flight: 110, knock: 4, size: .8, color: '#7ad8ff', color2: '#e8fbff' }), pose('block', 60)],

  // Hechicero: carga de runas y esfera de cristal que estalla en 3 (tres impactos); desde la etapa 2 se añade un haz de luz
  beam: s => [
    charge(s.fast ? 200 : 380, { ring: 'runes', color: '#7ad8ff', size: 18 }),
    shoot('orb', s.fast ? 280 : 340, { count: 3, at: .15, gap: .2, flight: 110, arc: 26, size: 1.5, knock: 8, fx: 'blast', color: '#7ad8ff', color2: '#e8fbff', big: true }),
    ...(s.stage >= 2 ? [beam(220, { w: 18, ramp: 'gold' })] : []),
    wait(60),
  ],

  // Disparo largo: retroceso en guardia y esfera de cristal en arco que cruza la pantalla
  longshot: s => [
    jumpBack(-40, s.fast ? 80 : 90),
    shoot('orb', s.fast ? 220 : 270, { at: .1, flight: 110, arc: 34, knock: 7, size: 1.3, fx: 'blast', count: s.stage >= 3 ? 2 : 1, gap: .3, color: '#7ad8ff', color2: '#e8fbff' }),
    wait(70), home(190),
  ],
  spar: () => [shoot('orb', 220, { at: .25, flight: 120, knock: 3, size: .7, color: '#7ad8ff' }), sidestep(-14, 100), wait(60)],
  burst: s => [...Array.from({ length: Math.min(4, 2 + (s.burst || 2)) }, (_, i) => shoot('orb', 110, { at: .2, flight: 90, knock: 3 + i, size: .8, color: '#7ad8ff' })), wait(60)],
  finisher: () => [charge(520, { ring: 'runes', color: '#7ad8ff', size: 24 }), beam(520, { big: true, w: 36, ramp: 'blue' }), fx('shockwave', { at: 'target', r: 90, color: '#7ad8ff' }), wait(100)],
};

const support = {
  // Sanadora: halo, haz de luz y barrera que envuelve a los otros dos
  buff: s => [
    cast(s.fast ? 220 : 380, { halo: true, ray: true, color: LIGHT }),
    fx('ring', { r: 64, color: LIGHT, squash: .45 }),
    buff(['vanguard', 'ranged'], s.fast ? 450 : 750),
  ],
  probe: () => [cast(260, { halo: false, ray: true, at: .3 }), wait(60)],
  spar: () => [cast(240, { halo: true, ray: true, at: .3 }), jumpBack(-12, 100)],
  burst: () => [cast(200, { halo: true, ray: true, at: .25 }), wait(80)],
  finisher: () => [charge(500, { ring: 'light', color: LIGHT }), beam(500, { w: 20, ramp: 'gold' }), fx('ring', { at: 'target', r: 70, color: LIGHT }), wait(100)],
};

// Carga del Alba: formación en V (punta al frente, alas a los lados) y estocada de luz que cruza la arena.
// Duraciones iguales: carrera 120 + 40, 130, 130, 200, 120, 150, 260.
function team(s) {
  const to = ['target.front', 'target.side', 'target.behind'][s.i] || 'target.front';
  const light = (ms, o) => (s.i === 1 ? shoot('orb', ms, { at: .15, flight: 80, count: 2, gap: .3, size: 1.1, color: '#7ad8ff', color2: '#e8fbff', fx: 'blast', knock: 6, ...o })
    : s.i === 2 ? strike('cast', ms, { knock: 5, fx: 'spark', lunge: 0, ...o }) : strike('atk1', ms, { knock: 5, fx: 'slash', lunge: 14, ...o }));
  return [
    run(to, 120, { ghosts: 0 }), wait(40),
    light(130), s.i === 0 ? strike('atk2', 130, { knock: 6, fx: 'slash', lunge: 10 }) : light(130, { knock: 7 }),
    s.i === 0 ? strike('atk3', 200, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 20 })
      : s.i === 1 ? shoot('orb', 200, { at: .2, flight: 90, count: 3, gap: .2, size: 1.5, knock: 10, fx: 'blast', big: true, color: '#7ad8ff', color2: '#e8fbff' })
        : strike('cast', 200, { knock: 10, fx: 'blast', big: true, lunge: 0 }),
    wait(120),
    s.i === 0 ? fx('wave', { color: LIGHT, big: true }) : fx('ring', { at: 'target', r: 80, color: GOLD, squash: .4 }),
    s.i === 0 ? fx('shockwave', { at: 'target', r: 120, color: GOLD, double: true, shake: true }) : fx('spark', { at: 'target', n: 12, color: LIGHT, color2: GOLD }),
    wait(150), home(260),
  ];
}

export default {
  styles: { opener: 'run', spark: GOLD, spark2: LIGHT, beam: 'gold', ring: 'light', projectile: 'orb', projColor: '#7ad8ff', projColor2: '#e8fbff', light: LIGHT, finisher: 'atk3', teamFx: 'shockwave' },
  vanguard, ranged, support, team, paint: {},
};
