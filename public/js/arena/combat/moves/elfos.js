// Movimientos de Elfos (MV-1). Agilidad: saltos, volteretas y paso fantasma (esquiva lateral con residual). Danzante: remolino
// de dos espadas, salto y corte. Arquera: flecha cargada y lluvia de 3 flechas desde un salto atrás. Druida: raíces y flores.
// Técnica de equipo: Lluvia de hojas (saltan y descargan un aguacero de flechas y cuchillas).
// Solo se importan funciones de paso de ../actions.js. `s` = { stage, i, role, fast, burst, style, lite, race }.
import { leap, jumpBack, sidestep, strike, combo, charge, shoot, cast, buff, home, wait, fx } from '../actions.js';

const LEAF = '#a0ffc0', LEAF2 = '#e8ffe0', PINK = '#ffb0d8';
// Paso fantasma: esquiva lateral rápida con residual (la etapa 2+ deja dos)
const ghostStep = (s, dy = 24, ms = 90) => sidestep(dy, ms, { ghosts: s.stage >= 2 ? 2 : 1 });

const vanguard = {
  // Tanteo: paso fantasma, salto sobre el objetivo y corte rápido; vuelve con una voltereta atrás
  probe: s => [ghostStep(s, 18, 70), leap('target.front', s.fast ? 95 : 105, { h: 34 }), strike('atk1', s.fast ? 100 : 120, { knock: 5, fx: 'slash', lunge: 12, at: .38 }), jumpBack(-26, 100), home(s.fast ? 120 : 170)],

  // Combo: salto, remolino de cuatro cortes alternos (dos espadas), voltereta atrás y salto con corte descendente que lanza
  combo: s => [
    leap('target.front', 115, { h: 38 }),
    ...combo(['atk1', 'atk2', 'atk1', 'atk2'], s.fast ? 62 : 74, { knock: 4, fx: 'slash', lastFx: 'slash' }),
    ...(s.stage >= 2 ? [sidestep(-26, 80, { ghosts: 2 })] : []),
    jumpBack(-34, 110, { h: 24 }),
    leap('target.front', s.fast ? 120 : 150, { h: 56, land: false }),
    strike('atk3', s.fast ? 120 : 150, { knock: 16, launch: true, fx: 'blast', big: s.stage >= 3, lunge: 14 }),
    ...(s.stage >= 3 ? [fx('spark', { at: 'target', n: 16, color: LEAF, color2: PINK, speed: 160 })] : []),
    home(s.fast ? 170 : 240, { ghosts: s.stage >= 2 ? 2 : 0 }),
  ],

  spar: s => [ghostStep(s, 16), leap('target.front', 120, { h: 30 }), strike('atk1', 120, { knock: 3, fx: 'slash' }), strike('atk2', 120, { knock: 3, fx: 'slash' }), jumpBack(-24, 100), home(180)],

  // Ráfaga: remolino de cortes veloz que cuenta todas las herramientas
  burst: s => [
    leap('target.front', 90, { h: 28 }),
    ...Array.from({ length: Math.min(6, 2 + (s.burst || 2)) }, (_, i) => strike(i % 2 ? 'atk2' : 'atk1', 58, { knock: 3 + (i === 5 ? 6 : 0), fx: 'slash', lunge: 7 })),
    strike('atk3', 90, { knock: 12, launch: true, fx: 'blast' }), jumpBack(-30, 90, { h: 20 }), home(130),
  ],

  finisher: s => [
    leap('target.front', 125, { h: 40 }),
    ...combo(['atk1', 'atk2', 'atk1', 'atk2'], 85, { knock: 5, fx: 'slash' }),
    jumpBack(-36, 110, { h: 28 }), leap('target.front', 150, { h: 62, land: false }),
    strike('atk3', 190, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 16 }),
    fx('spark', { at: 'target', n: 18, color: LEAF, color2: PINK, speed: 170 }), home(240, { ghosts: 2 }),
  ],
};

const arrow = (o = {}) => ({ color: '#e8e0c8', color2: LEAF, ...o });

const ranged = {
  probe: () => [shoot('arrow', 220, { at: .25, flight: 100, knock: 4, size: .9, ...arrow() }), wait(60)],

  // Flecha cargada: voltereta atrás, carga de orbes verdes y flecha grande que atraviesa; desde la etapa 2 va seguida de otras dos
  beam: s => [
    charge(s.fast ? 200 : 360, { ring: 'orbs', color: LEAF, size: 15 }),
    shoot('arrow', s.fast ? 260 : 320, { count: s.stage >= 2 ? 3 : 1, at: .15, gap: .25, flight: 85, size: 2.1, knock: 11, fx: 'blast', big: true, ...arrow({ color: LEAF }) }),
    wait(60), jumpBack(-22, 90, { h: 20 }), home(150),
  ],

  // Lluvia de 3 flechas desde un salto atrás, en arco; en la etapa 3, cinco
  longshot: s => [
    jumpBack(-44, s.fast ? 85 : 100, { h: 26 }),
    shoot('arrow', s.fast ? 240 : 300, { count: s.stage >= 3 ? 5 : 3, at: .1, gap: s.stage >= 3 ? .14 : .2, flight: 105, arc: 36, knock: 5, size: 1.1, fx: 'spark', ...arrow() }),
    wait(70), home(190),
  ],
  spar: s => [shoot('arrow', 220, { at: .25, flight: 110, knock: 3, size: .8, ...arrow() }), ghostStep(s, -16), wait(50)],
  burst: s => [...Array.from({ length: Math.min(4, 2 + (s.burst || 2)) }, (_, i) => shoot('arrow', 105, { at: .2, flight: 80, knock: 3 + i, size: .9, ...arrow() })), wait(60)],
  finisher: () => [jumpBack(-30, 100, { h: 24 }), charge(480, { ring: 'orbs', color: LEAF, size: 22 }), shoot('arrow', 420, { count: 5, at: .1, gap: .16, flight: 85, size: 2, knock: 9, fx: 'blast', big: true, ...arrow({ color: LEAF }) }), wait(80), home(180)],
};

const support = {
  // Druida: halo rosado, brote de flores que cura y raíces que sujetan al objetivo
  buff: s => [
    cast(s.fast ? 220 : 380, { halo: true, ray: true, color: PINK }),
    fx('ring', { r: 66, color: LEAF, squash: .4 }),
    fx('spark', { n: 16, color: LEAF, color2: PINK, speed: 70 }),
    buff(['vanguard', 'ranged'], s.fast ? 450 : 750),
  ],
  probe: () => [cast(260, { halo: false, ray: true, at: .3, color: PINK }), wait(60)],
  spar: () => [cast(240, { halo: true, ray: true, at: .3, color: PINK }), sidestep(12, 100, { ghosts: 1 })],
  burst: () => [cast(200, { halo: true, ray: true, at: .25, color: PINK }), fx('spark', { n: 10, color: LEAF, color2: PINK }), wait(80)],
  finisher: () => [charge(500, { ring: 'light', color: PINK }), cast(380, { halo: true, ray: true, at: .3, color: LEAF }), fx('ring', { at: 'target', r: 80, color: LEAF, squash: .4 }), wait(100)],
};

// Lluvia de hojas: saltan, y desde el aire descargan un aguacero de cuchillas (Danzante), flechas (Arquera) y savia (Druida).
// Duraciones iguales: salto 130 + 40, 130, salto 110, 130, 200, 120, 150, 260.
function team(s) {
  const first = ['target.front', 'target.side', 'target.behind'][s.i] || 'target.front';
  const mid = (ms, o) => (s.i === 1 ? shoot('arrow', ms, { at: .1, flight: 80, count: 3, gap: .2, arc: 30, size: 1.1, knock: 5, ...arrow(), ...o })
    : s.i === 2 ? strike('cast', ms, { knock: 5, fx: 'spark', lunge: 0, ...o }) : strike('atk1', ms, { knock: 5, fx: 'slash', lunge: 12, ...o }));
  return [
    leap(first, 130, { h: 52 }), wait(40),
    mid(130), leap('target.behind', 110, { h: 60, land: false }), mid(130, { knock: 7 }),
    s.i === 1 ? shoot('arrow', 200, { count: 6, at: .05, gap: .12, flight: 80, arc: 44, size: 1.6, knock: 10, fx: 'blast', big: true, ...arrow({ color: LEAF }) })
      : s.i === 2 ? strike('cast', 200, { knock: 10, fx: 'blast', big: true, lunge: 0 })
        : strike('atk3', 200, { knock: 16, launch: true, fx: 'blast', big: true, wave: true, lunge: 16 }),
    wait(120),
    s.i === 0 ? fx('shockwave', { at: 'target', r: 110, color: LEAF, double: true, shake: true }) : fx('ring', { at: 'target', r: 80, color: s.i === 2 ? PINK : LEAF, squash: .4 }),
    fx('spark', { at: 'target', n: s.i === 0 ? 18 : 10, color: LEAF, color2: PINK, speed: 160 }),
    wait(150), home(260, { ghosts: 2 }),
  ];
}

export default {
  styles: { opener: 'leap', spark: LEAF, spark2: LEAF2, beam: 'green', ring: 'orbs', projectile: 'arrow', projColor: '#e8e0c8', projColor2: LEAF, light: PINK, finisher: 'atk3', teamFx: 'shockwave' },
  vanguard, ranged, support, team, paint: {},
};
