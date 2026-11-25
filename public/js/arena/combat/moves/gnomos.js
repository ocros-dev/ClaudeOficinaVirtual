// Movimientos de Gnomos (MV-2). Ingenio y artilugios: saltos con resorte y propulsores, puñetazo de mecha con cohete y taladro,
// drones y torreta que disparan, bombas lanzadas en arco, trampas y rayos de engranaje, pociones de colores. Crecen por etapa
// (1-3): en la 2 se suman giros y drones; en la 3 (Maquinaria Maestra) llegan los cohetes dobles y las bombas en salva.
// Sin teletransportes: pasos cortos y saltos. Solo se importan funciones de paso de ../actions.js.
// `s` = { stage, i, role, fast, burst, style, lite, race }.
import { dash, leap, jumpBack, sidestep, strike, charge, beam, shoot, cast, buff, home, wait, fx } from '../actions.js';

const TEAL = '#2ab0b0', TEAL2 = '#9ae8e8', COPPER = '#b8703a', GOLD = '#ffd070', PINK = '#ff7ab0', GREEN = '#7aff8a';
// Rampa del rayo de engranaje: turquesa de taller con núcleo blanco
const GEAR_RAMP = ['#0a3a40', '#1a7a80', TEAL, TEAL2, '#ffffff'];

// Salto con resorte: chispas de propulsor a los pies y salto corto hacia el objetivo
const hop = (s, ms = 105, h = 30) => [fx('spark', { n: 6, color: GOLD, color2: TEAL2, speed: 80 }), leap('target.front', s.fast ? ms - 12 : ms, { h })];
// Puñetazo de mecha: el golpe lanza el cuerpo hacia delante (lunge largo) y suelta chispas turquesa
const rocketPunch = (ms = 140, o = {}) => strike('atk1', ms, { knock: 7, fx: 'spark', lunge: 26, at: .4, ...o });
// Taladro: golpes cortos y muy rápidos con chispa
const drill = (n, ms = 55) => Array.from({ length: n }, (_, i) => strike('atk2', ms, { knock: 3 + (i === n - 1 ? 2 : 0), fx: 'spark', lunge: 6, tilt: i % 2 ? -1 : 1 }));

const vanguard = {
  // Tanteo: salto con resorte, puñetazo de cohete y rebote atrás
  probe: s => [...hop(s, 100), rocketPunch(s.fast ? 120 : 140), jumpBack(-14, 80, { h: 14 }), home(s.fast ? 120 : 180)],

  // Combo: salto, puñetazo, taladro (4 golpes; 6 en la etapa 3), giro lateral con residual (etapa 2+), salto de resorte alto
  // y puñetazo de cohete que lanza. Etapa 3: segundo cohete y engranajes volando.
  combo: s => [
    ...hop(s, 100),
    rocketPunch(s.fast ? 100 : 120),
    ...drill(s.stage >= 3 ? 6 : 4, s.fast ? 50 : 58),
    ...(s.stage >= 2 ? [sidestep(-24, 80, { ghosts: 2 })] : []),
    leap('target.front', s.fast ? 120 : 150, { h: 62, land: false }),
    strike('atk3', s.fast ? 120 : 160, { knock: 16, launch: true, fx: 'blast', big: s.stage >= 3, lunge: 32, at: .45 }),
    ...(s.stage >= 3 ? [fx('spark', { at: 'target', n: 18, color: TEAL, color2: COPPER, speed: 170 }), fx('shockwave', { at: 'target', r: 100, color: TEAL, double: true, shake: true })]
      : [fx('spark', { at: 'target', n: 10, color: TEAL, color2: GOLD })]),
    home(s.fast ? 170 : 240),
  ],

  // Cruce de golpes sin daño
  spar: s => [...hop(s, 115, 22), strike('atk1', 130, { knock: 3, fx: 'spark' }), strike('atk2', 130, { knock: 3, fx: 'spark' }), sidestep(14, 100), home(200)],

  // Ráfaga: taladro frenético que cuenta todas las herramientas
  burst: s => [
    ...hop(s, 85, 22),
    ...Array.from({ length: Math.min(6, 2 + (s.burst || 2)) }, (_, i) => strike(i % 2 ? 'atk2' : 'atk1', 56, { knock: 3 + (i === 5 ? 6 : 0), fx: 'spark', lunge: 8, tilt: i % 2 ? -1 : 1 })),
    strike('atk3', 95, { knock: 12, launch: true, fx: 'blast', lunge: 24, at: .45 }), home(150),
  ],

  // Remate largo: puñetazo, taladro, giro, resorte alto y doble cohete
  finisher: s => [
    ...hop(s, 115),
    rocketPunch(110), ...drill(6, 60),
    sidestep(-26, 80, { ghosts: 2 }), jumpBack(-24, 90, { h: 26 }),
    leap('target.front', 160, { h: 84, land: false }),
    strike('atk3', 210, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 34, at: .45 }),
    fx('spark', { at: 'target', n: 20, color: TEAL, color2: COPPER, speed: 180 }), fx('shockwave', { at: 'target', r: 110, color: TEAL, double: true, shake: true }),
    wait(80), home(240, { ghosts: 2 }),
  ],
};

// Artífice: drones y torreta (orbes turquesa pequeños), bombas en arco (fuego dorado) y rayo de engranaje
const drone = (o = {}) => ({ color: TEAL, color2: TEAL2, size: .62, fx: 'spark', ...o });
const bomb = (o = {}) => ({ color: GOLD, color2: '#ff7a28', size: 1.3, fx: 'blast', ...o });

const ranged = {
  // Tanteo: dos drones disparan (uno en la etapa 1)
  probe: s => [shoot('orb', 210, { count: s.stage >= 2 ? 2 : 1, at: .2, gap: .3, flight: 85, knock: 3, ...drone() }), wait(50)],

  // Rayo de engranaje: anillo de piezas que se encajan (anillo turquesa en el suelo), drones de apoyo (etapa 2+) y haz turquesa;
  // en la etapa 3 cae después una bomba de remate.
  beam: s => [
    charge(s.fast ? 210 : 360, { ring: 'orbs', color: TEAL, color2: GOLD, size: 12 + s.stage * 3 }),
    fx('ring', { r: 40, color: TEAL, squash: .85 }),
    ...(s.stage >= 2 && !s.fast ? [shoot('orb', 150, { count: 2, at: .1, gap: .4, flight: 70, knock: 4, ...drone() })] : []),
    beam(s.fast ? 270 : 400, { big: true, w: 20 + s.stage * 6, ramp: GEAR_RAMP }),
    ...(s.stage >= 3 ? [shoot('fire', 200, { at: .15, flight: 100, arc: 46, knock: 9, big: true, ...bomb({ size: 1.6 }) })] : []),
    wait(50),
  ],

  // Disparo largo: salto de resorte atrás, aviso de trampa (anillo dorado) sobre el objetivo y bombas en arco
  longshot: s => [
    jumpBack(-42, s.fast ? 85 : 100, { h: 38 }),
    fx('ring', { at: 'target', r: 36, color: GOLD, squash: .4 }),
    shoot('fire', s.fast ? 240 : 290, { count: s.stage >= 3 ? 3 : 2, at: .1, gap: .3, flight: 115, arc: 58, knock: 6, ...bomb() }),
    wait(60), home(190),
  ],

  spar: () => [shoot('orb', 220, { at: .25, flight: 110, knock: 3, ...drone() }), sidestep(-14, 100), wait(50)],
  burst: s => [...Array.from({ length: Math.min(4, 2 + (s.burst || 2)) }, (_, i) => shoot('orb', 105, { at: .2, flight: 80, knock: 3 + i, ...drone({ size: .7 }) })), wait(60)],
  finisher: () => [
    charge(500, { ring: 'orbs', color: TEAL, color2: GOLD, size: 22 }), fx('ring', { r: 50, color: TEAL, squash: .85 }),
    shoot('orb', 120, { count: 2, at: .1, gap: .4, flight: 70, knock: 4, ...drone() }),
    beam(460, { big: true, w: 38, ramp: GEAR_RAMP }),
    shoot('fire', 260, { count: 3, at: .1, gap: .3, flight: 100, arc: 50, knock: 8, big: true, ...bomb({ size: 1.5 }) }),
    wait(70),
  ],
};

// Alquimista: pociones de colores lanzadas en arco (verde cura, rosa ralentiza) y burbujas
const potion = (o = {}) => ({ color: GREEN, color2: '#e0ffe0', size: .85, fx: 'spark', arc: 40, flight: 115, ...o });

const support = {
  // Elixir: remolino de burbujas rosas y verdes que envuelve a los otros dos
  buff: s => [
    cast(s.fast ? 220 : 360, { halo: true, ray: false, color: PINK }),
    fx('spark', { n: 12, color: GREEN, color2: PINK, speed: 70 }),
    fx('ring', { r: 60, color: PINK, squash: .42 }),
    ...(s.stage >= 2 ? [fx('ring', { r: 84, color: GREEN, squash: .42 })] : []),
    buff(['vanguard', 'ranged'], s.fast ? 450 : 750),
  ],
  probe: () => [shoot('orb', 240, { at: .3, knock: 3, ...potion() }), wait(50)],
  spar: () => [shoot('orb', 230, { at: .3, knock: 3, ...potion({ color: PINK, color2: '#ffe0f0' }) }), sidestep(12, 100)],
  burst: () => [shoot('orb', 120, { at: .2, knock: 3, ...potion({ flight: 90 }) }), shoot('orb', 120, { at: .2, knock: 3, ...potion({ flight: 90, color: PINK, color2: '#ffe0f0' }) }), wait(60)],
  finisher: () => [
    charge(480, { ring: 'light', color: PINK }),
    shoot('orb', 360, { count: 3, at: .1, gap: .25, knock: 8, big: true, ...potion({ size: 1.4, flight: 105, arc: 46, fx: 'blast' }) }),
    fx('ring', { at: 'target', r: 80, color: PINK, squash: .4 }), fx('spark', { at: 'target', n: 16, color: GREEN, color2: PINK }), wait(80),
  ],
};

// Mecha Colosal: los tres saltan al mismo punto y se ensamblan (el alquimista queda en lo alto como cabeza, los otros dos como
// cuerpo); una chispa de engranajes y el mecha lanza un único puñetazo de cohete. Después se separan.
// Los tres guiones duran lo mismo: 110 + 10, 100, 200, 80, 240, 3 efectos con 200 de espera, 260.
function team(s) {
  const i = s.i;
  const col = i === 2 ? PINK : TEAL;
  return [
    i === 2 ? dash('target.above', 110, { anim: 'launched', ghosts: 2 }) : leap('target.front', 110, { h: 44 }),
    wait(10),
    i === 1 ? strike('atk2', 100, { knock: 5, fx: 'spark', lunge: 10 }) : i === 2 ? strike('cast', 100, { knock: 4, fx: 'spark', lunge: 0 }) : strike('atk1', 100, { knock: 6, fx: 'spark', lunge: 14 }),
    fx('ring', { r: 46, color: TEAL, squash: .5 }), fx('spark', { n: 14, color: TEAL, color2: COPPER, speed: 100 }),
    charge(200, { ring: 'orbs', color: col, color2: GOLD, size: 14 }),               // el ensamblaje: las piezas encajan
    wait(80),
    i === 0 ? strike('atk3', 240, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 34, at: .4 })
      : i === 1 ? strike('atk3', 240, { knock: 12, fx: 'blast', big: true, lunge: 26, at: .4 })
        : strike('cast', 240, { knock: 10, fx: 'blast', big: true, lunge: 0, at: .4 }),
    i === 0 ? fx('shockwave', { at: 'target', r: 140, color: TEAL, double: true, shake: true }) : fx('ring', { at: 'target', r: 90, color: col, squash: .4 }),
    fx('spark', { at: 'target', n: 18, color: TEAL, color2: COPPER, speed: 170 }),
    wait(200), home(260, { ghosts: 2 }),
  ];
}

export default {
  styles: { opener: 'leap', spark: TEAL, spark2: COPPER, beam: 'ice', ring: 'orbs', projectile: 'orb', projColor: TEAL, projColor2: TEAL2, light: PINK, lightRamp: GEAR_RAMP, finisher: 'atk3', teamFx: 'shockwave' },
  vanguard, ranged, support, team, paint: {},
};
