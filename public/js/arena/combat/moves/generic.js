// Movimientos genéricos por clase (dueño: N3). Cualquier clave que falte en moves/<raza>.js se toma de aquí.
// Parametrizados por `s.style` (los estilos de cada raza: color de chispas, rampa del rayo, proyectil,
// forma de acercarse) para que cada raza se distinga desde el primer día. MV-1/2/3 los sobrescriben.
// Solo se importan las funciones de paso de actions.js. `s` = { stage, i, role, fast, burst, style, lite }.
import { dash, run, leap, jumpBack, sidestep, teleport, strike, combo, charge, beam, shoot, cast, buff, home, wait, fx } from '../actions.js';

// Acercamiento al objetivo según la raza y la etapa. s.fast: sin preparación
function approach(s, ms = 120) {
  const op = typeof s.style.opener === 'function' ? s.style.opener(s.stage) : s.style.opener || 'dash';
  const gh = s.stage >= 2 ? 3 : 1;
  switch (op) {
    case 'teleport': return [teleport(s.stage >= 2 ? 'target.behind' : 'target.front', 100, { ghosts: 3 })];
    case 'leap': return [leap('target.front', s.fast ? 130 : 170, { h: 36 })];
    case 'run': return [run('target.front', s.fast ? 110 : 150, { ghosts: 0 })];
    case 'heavy': return [dash('target.front', s.fast ? 120 : 160, { ghosts: 0 }), fx('shockwave', { r: 46 })];
    default: return [dash('target.front', ms, { ghosts: gh })];
  }
}
const finisherAnim = s => s.style.finisher || 'atk3';

const vanguard = {
  // Tanteo (0,4 s): acercamiento, golpe rápido y vuelta
  probe: s => [...approach(s, 110), strike('atk1', s.fast ? 110 : 150, { knock: 5, fx: 'slash' }), home(s.fast ? 150 : 210)],
  // Combo (0,9 s): embestida + 3 golpes + (etapa 2) teletransporte y golpe extra + remate que lanza; en etapa 3, onda
  combo: s => [
    ...approach(s, 110),
    ...combo(['atk1', 'atk2', 'atk3'], s.fast ? 80 : 105, { knock: 4, fx: 'slash', lastFx: 'spark' }),
    ...(s.stage >= 2 && !s.fast ? [teleport('target.behind', 90, { ghosts: 3 }), strike('atk1', 120, { knock: 6, fx: 'slash' })] : []),
    strike(finisherAnim(s), s.fast ? 120 : 160, { knock: 16, launch: true, fx: 'blast', wave: s.stage >= 3 }),
    home(s.fast ? 170 : 250, { ghosts: s.stage >= 2 ? 2 : 0 }),
  ],
  // Cruce de golpes sin daño (guardia viva y daño pasivo)
  spar: s => [...approach(s, 120), strike('atk1', 130, { knock: 3, fx: 'slash' }), strike('atk2', 130, { knock: 3, fx: 'slash' }), sidestep(16, 100), home(220)],
  // Ráfaga: combo rápido de 0,5 s que cuenta todas las herramientas apiladas (s.burst = cuántas)
  burst: s => [
    dash('target.front', 80, { ghosts: s.stage >= 2 ? 2 : 0 }),
    ...Array.from({ length: Math.min(6, 2 + (s.burst || 2)) }, (_, i) => strike(['atk1', 'atk2', 'atk3'][i % 3], 62, { knock: 3 + (i === 5 ? 6 : 0), fx: i % 2 ? 'spark' : 'slash', lunge: 6 })),
    strike(finisherAnim(s), 90, { knock: 12, launch: true, fx: 'blast' }), home(150),
  ],
  finisher: s => [...approach(s, 130), ...combo(['atk1', 'atk2', 'atk3'], 100, { knock: 5 }), strike(finisherAnim(s), 200, { knock: 16, launch: true, fx: 'blast', wave: true }), home(240)],
};

const ranged = {
  probe: s => [shoot(s.style.projectile || 'orb', 220, { at: .25, flight: 110, knock: 4, size: .8, fx: 'spark' }), wait(60)],
  // Rayo cargado (0,9 s): carga con anillo y haz grande
  beam: s => [charge(s.fast ? 220 : 460, { ring: s.style.ring || 'arcs' }), beam(s.fast ? 260 : 400, { big: true }), wait(60)],
  // Disparo largo (0,8 s): salto atrás y proyectil que cruza la pantalla
  longshot: s => [jumpBack(-44, s.fast ? 90 : 110), shoot(s.style.projectile || 'orb', s.fast ? 200 : 260, { at: .1, flight: 100, knock: 7, size: 1.2, fx: 'blast' }), wait(80), home(190)],
  spar: s => [shoot(s.style.projectile || 'orb', 220, { at: .25, flight: 120, knock: 3, size: .7 }), sidestep(-14, 100), wait(60)],
  burst: s => [...Array.from({ length: Math.min(4, 2 + (s.burst || 2)) }, (_, i) => shoot(s.style.projectile || 'orb', 110, { at: .2, flight: 90, knock: 3 + i, size: .8 })), wait(60)],
  finisher: s => [charge(500, { ring: s.style.ring || 'arcs' }), beam(520, { big: true }), wait(100)],
};

const support = {
  // Potenciación (0,8 s): halo y aura sobre los otros dos, y un haz de luz al objetivo
  buff: s => [cast(s.fast ? 220 : 400, { halo: true, ray: true }), buff(['vanguard', 'ranged'], s.fast ? 400 : 700)],
  probe: s => [cast(260, { halo: false, ray: true, at: .3 }), wait(60)],
  spar: s => [cast(240, { halo: true, ray: true, at: .3 }), sidestep(12, 100)],
  burst: s => [cast(200, { halo: true, ray: true, at: .25 }), wait(80)],
  finisher: s => [charge(500, { ring: 'light' }), beam(500, { big: false, w: 18 }), wait(100)],
};

// Técnica de equipo: se llama una vez por héroe (s.i = 0, 1, 2) y devuelve su guion; todos duran lo mismo para ir sincronizados
function team(s) {
  const dest = ['target.front', 'target.behind', 'target.above'][s.i] || 'target.front';
  const anim = s.i === 2 ? 'cast' : s.i === 1 ? 'atk2' : 'atk1';
  const last = s.i === 0 ? { knock: 16, launch: true, wave: true } : { knock: 10 };
  return [
    teleport(dest, 110, { ghosts: 3 }), wait(40),
    strike(anim, 170, { knock: 5, fx: 'slash' }), strike(s.i === 2 ? 'cast' : 'atk3', 170, { knock: 6, fx: 'slash' }),
    strike(s.i === 2 ? 'cast' : finisherAnim(s), 200, { ...last, fx: 'blast', big: true }),
    s.i === 0 ? fx(s.style.teamFx === 'sky' ? 'sky' : 'shockwave', { at: 'target', r: 100, double: true, color: s.style.spark, shake: true }) : wait(0),
    wait(110), home(260, { ghosts: 2 }),
  ];
}

export default { vanguard, ranged, support, team, styles: {}, paint: {} };
