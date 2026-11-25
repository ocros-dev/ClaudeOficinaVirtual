// Movimientos de Tempestarios (MV-1). Sello de la raza: teletransporte relámpago con residuales, combos de puños y
// patadas con chispa, patada voladora que lanza y rayo violeta grande. Crecen por etapa (1-4): la etapa 4 es serena,
// sin gritos: un solo golpe enorme y el trueno llega después (fx 'sky' con retardo).
// Solo se importan funciones de paso de ../actions.js. Cualquier clave que falte se toma de generic.js.
// `s` = { stage, i, role, fast, burst, style, lite, race }.
import { dash, jumpBack, sidestep, teleport, strike, combo, charge, beam, shoot, cast, buff, home, wait, pose, fx } from '../actions.js';

const SPARK = '#d8c4ff', SPARK2 = '#8a4aff', SERENE = '#e0d0ff';
// Rampa de rayo de la etapa serena: lavanda casi blanca
const SERENE_RAMP = ['#4a3a90', '#8a7ad0', '#c8b8ff', '#e8e0ff', '#ffffff'];

// Aparecer junto al objetivo: etapa 1, arrancada en línea recta con estela; etapa 2+, teletransporte de rayo con residuales
function appear(s, to = 'target.front', ms = 90) {
  if (s.stage < 2) return [dash(to, ms + 10, { ghosts: 2 })];
  return [teleport(to, ms, { ghosts: s.stage >= 3 ? 4 : 3 })];
}
// Patada voladora: arrancada con la animación de patada y estela
const flyingKick = (ms = 105) => dash('target.front', ms, { anim: 'kick', ghosts: 3, h: 12 });

const vanguard = {
  // Tanteo: aparece, puño y patada; vuelve con residuales
  probe: s => s.stage >= 4
    ? [teleport('target.behind', 80, { ghosts: 4 }), strike('atk1', 150, { knock: 6, fx: 'spark', at: .3 }), home(170, { ghosts: 2 })]
    : [...appear(s, 'target.front', 80), strike('atk1', 85, { knock: 5, fx: 'spark' }), strike('kick', 100, { knock: 7, fx: 'spark', lunge: 14 }), home(s.fast ? 140 : 190, { ghosts: s.stage >= 2 ? 2 : 0 })],

  // Combo: crece con la etapa. 1 puños y patada; 2 teletransporte tras el objetivo; 3 cadena de teletransportes y trueno; 4 un golpe enorme
  combo: s => {
    const ms = s.fast ? 70 : 85;
    if (s.stage === 1) return [
      dash('target.front', 90, { ghosts: 2 }),
      ...combo(['atk1', 'atk2', 'kick'], ms, { fx: 'spark' }),
      flyingKick(100), strike('kick', 120, { knock: 16, launch: true, fx: 'blast', lunge: 14 }),
      home(s.fast ? 170 : 230, { ghosts: 1 }),
    ];
    if (s.stage === 2) return [
      teleport('target.behind', 80, { ghosts: 3 }),
      ...combo(['atk1', 'atk2'], ms - 10, { fx: 'spark' }),
      teleport('target.behind', 70, { ghosts: 3 }),
      ...combo(['atk2', 'kick'], ms - 10, { fx: 'spark' }),
      strike('kick', 125, { knock: 16, launch: true, fx: 'blast', lunge: 14 }),
      home(s.fast ? 170 : 240, { ghosts: 3 }),
    ];
    if (s.stage === 3) return [
      teleport('target.behind', 75, { ghosts: 4 }),
      ...combo(['atk1', 'atk2', 'kick'], ms - 15, { fx: 'spark' }),
      teleport('target.above', 65, { ghosts: 4 }),
      flyingKick(95),
      strike('kick', 135, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 16 }),
      fx('sky', { at: 'target', r: 80, color: SPARK2 }),
      home(s.fast ? 180 : 250, { ghosts: 3 }),
    ];
    // Etapa 4: sin gritos, un solo golpe enorme y el trueno llega después
    return [
      teleport('target.behind', 70, { ghosts: 4 }),
      pose('charge', 80),
      strike('atk3', 240, { knock: 20, launch: true, fx: 'blast', big: true, wave: true, at: .28, lunge: 18 }),
      wait(s.fast ? 140 : 260),
      fx('sky', { at: 'target', delay: .35, r: 100, color: SERENE }),
      wait(180),
      home(260, { ghosts: 3 }),
    ];
  },

  spar: s => [...appear(s, 'target.front', 90), strike('atk1', 120, { knock: 3, fx: 'spark' }), strike('kick', 120, { knock: 3, fx: 'spark' }), sidestep(16, 100), home(210, { ghosts: s.stage >= 2 ? 1 : 0 })],

  // Ráfaga: puños y patadas rapidísimos; cuenta todas las herramientas apiladas
  burst: s => [
    ...appear(s, 'target.front', 70),
    ...Array.from({ length: Math.min(6, 2 + (s.burst || 2)) }, (_, i) => strike(['atk1', 'atk2', 'kick'][i % 3], 58, { knock: 3 + (i === 5 ? 6 : 0), fx: 'spark', lunge: 6 })),
    strike('kick', 90, { knock: 12, launch: true, fx: 'blast' }),
    home(150, { ghosts: s.stage >= 2 ? 2 : 0 }),
  ],

  // Remate largo: teletransportes encadenados, patada voladora y el rayo del cielo
  finisher: s => [
    teleport('target.behind', 85, { ghosts: 4 }),
    ...combo(['atk1', 'atk2', 'kick', 'atk3'], 85, { fx: 'spark' }),
    teleport('target.behind', 70, { ghosts: 4 }), flyingKick(100),
    strike('kick', 190, { knock: 18, launch: true, fx: 'blast', big: true, wave: true, lunge: 16 }),
    fx('sky', { at: 'target', delay: s.stage >= 4 ? .35 : 0, r: 100, color: s.stage >= 4 ? SERENE : SPARK2 }),
    wait(120), home(260, { ghosts: 3 }),
  ],
};

const bolt = (s, o = {}) => shoot('bolt', 200, { at: .2, flight: 100, knock: 4, size: .9, fx: 'spark', color: s.stage >= 4 ? SERENE : '#b890ff', ...o });

const ranged = {
  // Tanteo a distancia: un rayito (dos desde la etapa 2)
  probe: s => [bolt(s, { count: s.stage >= 2 ? 2 : 1, gap: .25 }), wait(60)],

  // Rayo cargado: anillo de arcos y haz violeta recto; crece con la etapa y, en la 3, cae un rayo del cielo
  beam: s => {
    const big = s.stage >= 3, serene = s.stage >= 4;
    return [
      charge(s.fast ? 220 : 400 + s.stage * 25, { ring: 'arcs', color: serene ? SERENE : SPARK, size: 14 + s.stage * 3 }),
      beam(s.fast ? 280 : 420, { big: true, w: 22 + s.stage * 6, ramp: serene ? SERENE_RAMP : undefined }),
      ...(big ? [fx('sky', { at: 'target', delay: serene ? .3 : 0, r: 70, color: serene ? SERENE : SPARK2 })] : []),
      wait(60),
    ];
  },

  // Disparo largo: teletransporte atrás, ráfaga de rayitos y regreso con relámpago
  longshot: s => [
    s.stage >= 2 ? teleport({ dx: -48 }, 80, { ghosts: 3 }) : jumpBack(-44, s.fast ? 90 : 110),
    shoot('bolt', s.fast ? 220 : 280, { count: s.stage >= 3 ? 3 : 2, at: .1, gap: .18, flight: 95, knock: 6, size: 1.2, fx: 'blast', color: s.stage >= 4 ? SERENE : '#b890ff' }),
    wait(60), s.stage >= 2 ? teleport('home', 80, { ghosts: 2 }) : home(190),
  ],

  spar: s => [bolt(s, { knock: 3, size: .7 }), sidestep(-14, 100), wait(60)],
  burst: s => [...Array.from({ length: Math.min(4, 2 + (s.burst || 2)) }, (_, i) => shoot('bolt', 105, { at: .2, flight: 85, knock: 3 + i, size: .8, color: '#b890ff' })), wait(60)],
  finisher: s => [
    charge(520, { ring: 'arcs', color: s.stage >= 4 ? SERENE : SPARK, size: 26 }),
    beam(560, { big: true, w: 44, ramp: s.stage >= 4 ? SERENE_RAMP : undefined }),
    fx('sky', { at: 'target', delay: s.stage >= 4 ? .3 : 0, r: 90, color: s.stage >= 4 ? SERENE : SPARK2 }),
    wait(100),
  ],
};

const support = {
  // Pararrayos: la varilla atrae un rayo del cielo, absorbe la descarga y la reparte como pulso al resto
  buff: s => [
    cast(s.fast ? 220 : 340, { halo: true, ray: true, color: s.stage >= 4 ? SERENE : SPARK }),
    fx('sky', { r: 36, color: s.stage >= 4 ? SERENE : SPARK, delay: s.stage >= 4 ? .3 : 0 }),
    fx('ring', { r: 70, color: SPARK, squash: .45 }),
    buff(['vanguard', 'ranged'], s.fast ? 450 : 750),
  ],
  probe: () => [cast(240, { halo: false, ray: true, at: .3 }), wait(60)],
  spar: () => [cast(240, { halo: true, ray: true, at: .3 }), sidestep(12, 100)],
  burst: () => [cast(200, { halo: true, ray: true, at: .25 }), fx('spark', { n: 12, color: SPARK }), wait(80)],
  finisher: s => [charge(500, { ring: 'light', color: SERENE }), beam(500, { w: 20, ramp: s.stage >= 4 ? SERENE_RAMP : undefined }), fx('sky', { at: 'target', r: 70, color: SPARK2 }), wait(100)],
};

// Tormenta de Cumbre: los 3 se separan en teletransportes, golpean desde tres lados y juntan un único rayo desde el cielo.
// Los tres guiones duran lo mismo para ir sincronizados (teleport 100 + 40, 130, 90, 130, 190, 120, 150, 260).
function team(s) {
  const first = ['target.front', 'target.behind', 'target.above'][s.i] || 'target.front';
  const serene = s.stage >= 4, col = serene ? SERENE : SPARK2;
  const hit = (n, o = {}) => {
    if (s.i === 1) return shoot('bolt', n, { at: .15, flight: 80, count: 2, gap: .3, knock: 5, size: 1, color: '#b890ff', fx: 'spark', ...o });
    if (s.i === 2) return strike('cast', n, { knock: 5, fx: 'spark', lunge: 0, ...o });
    return strike(n > 150 ? 'kick' : 'atk1', n, { knock: 6, fx: 'spark', lunge: 12, ...o });
  };
  const finale = s.i === 1
    ? shoot('bolt', 190, { at: .2, flight: 80, count: 3, gap: .2, knock: 10, size: 1.5, fx: 'blast', big: true, color: '#b890ff' })
    : s.i === 2 ? strike('cast', 190, { knock: 10, fx: 'blast', big: true, lunge: 0 })
      : strike('kick', 190, { knock: 16, launch: true, fx: 'blast', big: true, wave: true, lunge: 16 });
  return [
    teleport(first, 100, { ghosts: 4 }), wait(40),
    hit(130), teleport('target.behind', 90, { ghosts: 3 }), hit(130, { knock: 7 }),
    finale,
    wait(120),
    s.i === 0 ? fx('sky', { at: 'target', delay: serene ? .35 : 0, r: 120, color: col, shake: true })
      : s.i === 1 ? fx('ring', { at: 'target', r: 70, color: col, squash: .35 }) : fx('spark', { at: 'target', n: 14, color: col, color2: '#ffffff' }),
    wait(150), home(260, { ghosts: 2 }),
  ];
}

export default {
  styles: { opener: stage => (stage >= 2 ? 'teleport' : 'dash'), finisher: 'kick', teamFx: 'sky', spark: SPARK, spark2: SPARK2, beam: 'violet', ring: 'arcs', projectile: 'orb', projColor: '#b890ff', light: SERENE },
  vanguard, ranged, support, team, paint: {},
};
