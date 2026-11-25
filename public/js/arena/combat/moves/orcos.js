// Movimientos de Orcos (MV-2). Brutales y salvajes: arrancan con un rugido y corren sin estela, hachazos en torbellino,
// saltos que aplastan, jabalinas lanzadas con todo el cuerpo y chamanes de trueno y sangre. Crecen por etapa (1-3): en la 2
// el torbellino se alarga y el salto aplasta; en la 3 (Furia Ancestral) llegan los espíritus del trueno y las ondas dobles.
// Sin teletransportes: siempre a la carrera. Solo se importan funciones de paso de ../actions.js.
// `s` = { stage, i, role, fast, burst, style, lite, race }.
import { dash, run, leap, jumpBack, sidestep, strike, combo, charge, beam, shoot, cast, buff, home, wait, fx } from '../actions.js';

const BLOOD = '#e8452a', BONE = '#e8dcc0', SPIRIT = '#7ad8ff', SPIRIT2 = '#d8f4ff';

// Rugido de arranque: anillo de hueso y polvo (el rugido pesa, no es una explosión)
const roar = (r = 46) => [fx('ring', { r, color: BONE, squash: .45 }), fx('dust', { n: 8 })];
// Carrera salvaje con rugido
const charge_ = (s, ms = 115) => [...(s.fast ? [] : roar(40)), run('target.front', s.fast ? ms - 15 : ms, { ghosts: 0 })];

const vanguard = {
  // Tanteo: rugido, carrera y dos hachazos rápidos (uno por mano)
  probe: s => [
    ...charge_(s, 105),
    strike('atk1', s.fast ? 95 : 110, { knock: 6, fx: 'slash', lunge: 16, at: .4 }),
    strike('atk2', s.fast ? 95 : 110, { knock: 5, fx: 'slash', lunge: 12, tilt: -1, at: .4 }),
    home(s.fast ? 140 : 200),
  ],

  // Combo: embestida, torbellino de hachas (4 hachazos; 6 en la etapa 3), salto que aplasta y hachazo final que lanza.
  combo: s => [
    ...charge_(s, 105),
    ...combo(Array.from({ length: s.stage >= 3 ? 6 : 4 }, (_, i) => (i % 2 ? 'atk2' : 'atk1')), s.fast ? 62 : 72, { knock: 4, fx: 'slash', lastFx: 'slash' }),
    ...(s.stage >= 2 ? [sidestep(-22, 70, { ghosts: 2 })] : []),
    leap('target.front', s.fast ? 120 : 150, { h: s.stage >= 2 ? 70 : 50 }),
    strike('atk3', s.fast ? 120 : 160, { knock: 17, launch: true, fx: 'blast', wave: true, big: s.stage >= 3, lunge: 18, at: .5 }),
    ...(s.stage >= 3 ? [fx('shockwave', { at: 'target', r: 120, color: BLOOD, double: true, shake: true })] : [fx('shockwave', { at: 'target', r: 80, color: BONE })]),
    home(s.fast ? 170 : 240),
  ],

  // Cruce de golpes sin daño
  spar: () => [run('target.front', 120, { ghosts: 0 }), strike('atk1', 130, { knock: 3, fx: 'slash' }), strike('atk2', 130, { knock: 3, fx: 'slash' }), jumpBack(-18, 100), home(200)],

  // Ráfaga: tormenta de hachazos que cuenta todas las herramientas
  burst: s => [
    run('target.front', 80, { ghosts: 0 }),
    ...Array.from({ length: Math.min(6, 2 + (s.burst || 2)) }, (_, i) => strike(i % 2 ? 'atk2' : 'atk1', 58, { knock: 3 + (i === 5 ? 6 : 0), fx: 'slash', lunge: 8, tilt: i % 2 ? -1 : 1 })),
    strike('atk3', 100, { knock: 12, launch: true, fx: 'blast', at: .5 }), home(150),
  ],

  // Remate largo: rugido, torbellino, salto que aplasta y hachazo que lanza con onda doble
  finisher: s => [
    ...roar(60), run('target.front', 125, { ghosts: 0 }),
    ...combo(['atk1', 'atk2', 'atk1', 'atk2', 'atk1'], 78, { knock: 5, fx: 'slash' }),
    jumpBack(-30, 90, { h: 22 }),
    leap('target.front', 165, { h: 82 }),
    strike('atk3', 210, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 18, at: .5 }),
    fx('shockwave', { at: 'target', r: 130, color: BLOOD, double: true, shake: true }),
    wait(80), home(240),
  ],
};

// Cazador: la jabalina se lanza con el cuerpo entero (paso adelante, lanzamiento, vuelta) y viaja como una línea larga
const javelin = (ms = 210, o = {}) => shoot('dart', ms, { at: .3, flight: 90, knock: 6, size: 1.7, fx: 'spark', color: BONE, color2: BLOOD, ...o });
const lungeStep = (dx = 18, ms = 70) => dash({ dx }, ms, { anim: 'run', ghosts: 0, free: false });

const ranged = {
  // Tanteo: paso adelante y jabalina
  probe: s => [lungeStep(14, 65), javelin(s.fast ? 190 : 210, { count: s.stage >= 3 ? 2 : 1, gap: .3 }), home(110)],

  // Jabalina cargada: carga de brasas rojas, carrera corta y jabalina enorme (en la etapa 2 van dos; en la 3, tres en abanico)
  beam: s => [
    charge(s.fast ? 120 : 340, { ring: 'embers', color: BLOOD, color2: BONE, size: 14 + s.stage * 3 }),
    ...(s.fast ? [] : [lungeStep(24, 80)]),
    shoot('dart', s.fast ? 250 : 300, { count: s.stage, at: s.fast ? .1 : .2, gap: .25, flight: s.fast ? 85 : 95, arc: s.stage >= 3 ? 14 : 0, size: 2.7, knock: 12, fx: 'blast', big: true, color: BONE, color2: BLOOD }),
    fx('shockwave', { at: 'target', r: 70 + s.stage * 14, color: BLOOD }), wait(40), home(170),
  ],

  // Disparo largo: salto atrás y lluvia de jabalinas en arco (3; 4 en la etapa 3)
  longshot: s => [
    jumpBack(-42, s.fast ? 85 : 100, { h: 22 }),
    shoot('dart', s.fast ? 250 : 310, { count: s.stage >= 3 ? 4 : 3, at: .1, gap: .2, flight: 105, arc: 40, size: 1.5, knock: 5, fx: 'spark', color: BONE, color2: BLOOD }),
    wait(70), home(190),
  ],

  spar: () => [javelin(220, { knock: 3, size: 1.2 }), sidestep(-12, 100), wait(50)],
  burst: s => [...Array.from({ length: Math.min(4, 2 + (s.burst || 2)) }, (_, i) => shoot('dart', 105, { at: .2, flight: 80, knock: 3 + i, size: 1.3, color: BONE, color2: BLOOD })), wait(60)],
  finisher: () => [
    charge(500, { ring: 'embers', color: BLOOD, color2: BONE, size: 24 }), lungeStep(26, 80),
    shoot('dart', 420, { count: 5, at: .1, gap: .16, flight: 90, arc: 26, size: 2.4, knock: 10, fx: 'blast', big: true, color: BONE, color2: BLOOD }),
    fx('shockwave', { at: 'target', r: 100, color: BLOOD, shake: true }), wait(80), home(180),
  ],
};

// Chamán: golpea el suelo con el tótem; el trueno cae del cielo sobre él y la sangre/espíritu sana a los otros dos
const totem = s => [
  cast(s.fast ? 220 : 340, { halo: true, ray: true, color: SPIRIT2 }),
  fx('sky', { r: 34, color: SPIRIT }),
  fx('ring', { r: 64, color: BLOOD, squash: .42 }),
  ...(s.stage >= 2 ? [fx('ring', { r: 86, color: SPIRIT, squash: .42 })] : []),
  fx('spark', { n: s.stage >= 3 ? 18 : 12, color: SPIRIT, color2: BLOOD, speed: 90 }),
];

const support = {
  buff: s => [...totem(s), buff(['vanguard', 'ranged'], s.fast ? 450 : 750)],
  probe: () => [cast(260, { halo: false, ray: true, at: .3, color: SPIRIT }), wait(60)],
  spar: () => [cast(240, { halo: true, ray: true, at: .3, color: SPIRIT }), sidestep(10, 110)],
  burst: () => [cast(200, { halo: true, ray: true, at: .25, color: SPIRIT }), fx('spark', { n: 12, color: SPIRIT, color2: BLOOD }), wait(80)],
  finisher: () => [charge(500, { ring: 'arcs', color: SPIRIT }), beam(500, { w: 24, ramp: 'ice' }), fx('sky', { at: 'target', r: 80, color: SPIRIT }), fx('ring', { at: 'target', r: 80, color: BLOOD, squash: .4 }), wait(100)],
};

// Estampida de Colmillos: los tres corren en fila (cada uno sale 45 ms después del anterior), hachazos al pasar, atraviesan al
// objetivo, vuelven saltando y rematan: aplastamiento del berserker, jabalinas del cazador y trueno del chamán.
// Los tres guiones duran lo mismo: espera inicial i·45 y final (2-i)·45 más 130, 110, 110, 120, 120, 150, 200, 3 ondas, 150, 260.
function team(s) {
  const i = s.i;
  const hit = (ms, o = {}) => i === 1 ? shoot('dart', ms, { at: .2, flight: 70, size: 1.5, knock: 5, fx: 'spark', color: BONE, color2: BLOOD, ...o })
    : i === 2 ? strike('cast', ms, { knock: 4, fx: 'spark', lunge: 0, ...o })
      : strike(ms > 110 ? 'atk2' : 'atk1', ms, { knock: 5, fx: 'slash', lunge: 14, ...o });
  return [
    ...roar(50), wait(i * 45),
    run('target.front', 130, { ghosts: 2 }),
    hit(110), hit(110, { knock: 7 }),
    run('target.behind', 120, { ghosts: 3 }),                                    // arrasan: atraviesan al objetivo
    hit(120, { knock: 8 }),
    leap('target.front', 150, { h: 66 }),
    i === 0 ? strike('atk3', 200, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 18, at: .45 })
      : i === 1 ? shoot('dart', 200, { count: 3, at: .15, gap: .25, flight: 80, arc: 18, size: 2.4, knock: 10, fx: 'blast', big: true, color: BONE, color2: BLOOD })
        : strike('cast', 200, { knock: 10, fx: 'blast', big: true, lunge: 0 }),
    i === 0 ? fx('shockwave', { at: 'target', r: 70, color: BONE }) : fx('ring', { at: 'target', r: 60, color: i === 2 ? SPIRIT : BLOOD, squash: .4 }), wait(60),
    i === 0 ? fx('shockwave', { at: 'target', r: 110, color: BLOOD, double: true }) : i === 2 ? fx('sky', { at: 'target', r: 90, color: SPIRIT }) : fx('spark', { at: 'target', n: 14, color: BONE, color2: BLOOD }), wait(60),
    i === 0 ? fx('shockwave', { at: 'target', r: 150, color: BLOOD, double: true, shake: true }) : fx('spark', { at: 'target', n: 14, color: i === 2 ? SPIRIT : BLOOD, color2: '#ffffff' }),
    wait(150), wait((2 - i) * 45), home(260),
  ];
}

export default {
  styles: { opener: 'run', spark: BONE, spark2: BLOOD, beam: 'fire', ring: 'embers', projectile: 'dart', projColor: BONE, projColor2: BLOOD, light: SPIRIT2, lightRamp: 'ice', finisher: 'atk3', teamFx: 'shockwave' },
  vanguard, ranged, support, team, paint: {},
};
