// Raza «enanos» · Clanes de la Forja (paquete A-ENA). Arte 16 bits propio, 3 etapas y variantes A/B.
// Clases: 0 Martillador (yelmo, coraza y martillo de guerra), 1 Artillero (sombrero con visera y cañón de mano),
//         2 Rúnico (capucha, túnica de runas y báculo con piedra rúnica flotante).
// Guía: docs/arena-estilo-16bits.md. Solo se importa de '../kit16/*'. Sin Math.random (usa ctx.rng).
// Orden del archivo: 1 paleta · 2 poses · 3 datos del fotograma · 4 piezas · 5 dibujo de cada clase · 6 efectos vivos.
//   Etapa 1 Formación · 2 Forja Encendida (bordes de la armadura al rojo, cuentas de brasa en las trenzas, chispas) ·
//   3 Corazón de Volcán (+8 % de tamaño, hombreras con púas, grietas de magma, puntas de barba humeantes, ojos blancos).
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------------------------------------------------------------------------------------------
// 1. Paleta (spec: rojo brasa #c8602a, hierro #6a6f7a, runas #5ac8ff). [sombra profunda, sombra, base, luz, brillo]. B = pizarra, barba blanca y oro.
const RAMPAS = {
  skin:    [['#6e3a2a', '#a0644a', '#d49470', '#f0be98', '#ffe0c4'], ['#5e3224', '#8e5638', '#c08460', '#dca47c', '#f4c8a0']],
  hair:    [['#240a06', '#4e1a0e', '#8a3416', '#b85a28', '#e89252'], ['#3a3a4a', '#6a6a80', '#a8a8bc', '#d4d4e4', '#f8f8ff']],
  cloth:   [['#3a1208', '#7a2c12', '#c8602a', '#e88a4a', '#ffbe84'], ['#1e222e', '#3a4252', '#5e6a80', '#8696b0', '#b8c8e0']],
  robe:    [['#1a080e', '#401424', '#6e2438', '#98405a', '#c47a90'], ['#0a1230', '#16284e', '#2a4478', '#4a6aa4', '#86a4d4']],
  iron:    [['#1e222c', '#3c4250', '#6a6f7a', '#9aa2b0', '#d4dce8'], ['#2a2a34', '#50505c', '#808090', '#b0b4c4', '#e8ecf8']],
  gold:    [['#4a3008', '#8a5c14', '#c8a040', '#e8d078', '#fff4c0'], ['#5a3a0c', '#a06c18', '#e0b438', '#f8dc78', '#fffad0']],
  leather: [['#1c1008', '#3a2414', '#5e3c24', '#84583a', '#aa7e54']],
  pants:   [['#14101a', '#2a2230', '#463a48', '#645660', '#847682']],
  rune:    [['#0a2a5a', '#1a5a9a', '#3a9ae0', '#5ac8ff', '#d8f4ff']],
  magma:   [['#4a0a04', '#a02208', '#e85a14', '#ffa02a', '#fff0a0']],
};
const IRIS = [['#1a1008', '#3a2a1a', '#6a4a2a'], ['#3a1a04', '#8a4a10', '#f0902a'], ['#6a3a08', '#d08a20', '#ffd070']];
const EMIT = ['#ffc060', '#fff0b0'];

// ---------------------------------------------------------------------------------------------
// 2. Poses propias. Ángulos: 0 = colgando, 90 = al frente, 180 = arriba. Los enanos van bajos y con las piernas abiertas.
const G = o => ({ pl: 'NF', ...o });
const idleAt = (k, f) => f(k, [0, .5, 1, .5][k]);
// Martillador: martillo a dos manos; la mano lejana sigue a la cercana (se corrige en pose()).
const MART = {
  idle: k => idleAt(k, (_, b) => G({ cr: .2 + b * .015, lean: 5 + b, sp: 3, nk: 1, hipN: 26, knN: 26, hipF: -22, knF: 28, shN: 44 + b * 3, elN: 76 - b * 3 })),
  walk: () => ({ shN: 36, elN: 96 }), run: () => ({ shN: 30, elN: 104 }),
  block: () => G({ cr: .22, lean: 10, sp: 5, shN: 64, elN: 100 }),
  atk1: k => [G({ cr: .18, lean: -8, sp: -5, nk: -1, hipN: 28, knN: 26, hipF: -28, knF: 22, shN: 160, elN: 20 }),
    G({ cr: .27, lean: 24, sp: 8, nk: 4, hipN: 46, knN: 46, hipF: -36, knF: 8, shN: 104, elN: -68 }),
    G({ cr: .22, lean: 16, sp: 4, nk: 2, hipN: 38, knN: 38, hipF: -30, knF: 14, shN: 86, elN: -56 })][k],
  atk2: k => [G({ cr: .2, lean: -10, sp: -6, hipN: 26, knN: 26, hipF: -30, knF: 20, shN: -20, elN: 110 }),
    G({ cr: .22, lean: 16, sp: 8, hipN: 40, knN: 40, hipF: -32, knF: 12, shN: 96, elN: -30 }),
    G({ cr: .2, lean: 10, sp: 4, hipN: 32, knN: 30, hipF: -26, knF: 16, shN: 110, elN: -10 })][k],
  atk3: k => [G({ cr: .14, lean: -12, sp: -9, nk: -4, hipN: 20, knN: 14, hipF: -20, knF: 14, shN: 172, elN: 8 }),
    G({ cr: .3, lean: 28, sp: 9, nk: 6, hipN: 50, knN: 54, hipF: -40, knF: 6, shN: 100, elN: -86 }),
    G({ cr: .24, lean: 18, sp: 4, nk: 2, hipN: 38, knN: 34, hipF: -30, knF: 14, shN: 80, elN: -62 })][k],
  charge: k => [{ shN: 120, elN: 30 }, { shN: 150, elN: 16 }, { shN: 166, elN: 8 }][k],
  cast: k => [{ shN: 100, elN: 60 }, { shN: 156, elN: 24 }, { shN: 172, elN: 8 }, { shN: 116, elN: -56 }][k],
};
// Artillero: el cañón en la mano cercana, la otra mano al cinto o al cañón.
const ARTI = {
  idle: k => idleAt(k, (_, b) => G({ cr: .19 + b * .012, lean: 6, sp: 3, nk: 1, hipN: 26, knN: 26, hipF: -22, knF: 28, shN: 62 + b * 3, elN: 50 - b * 3, shF: 24, elF: 78 })),
  fire: k => [G({ cr: .2, lean: 8, sp: 3, nk: 0, hipN: 30, knN: 28, hipF: -34, knF: 12, shN: 92, elN: 4, shF: 52, elF: 86 }),
    G({ cr: .18, lean: -2, sp: -2, nk: 0, hipN: 22, knN: 18, hipF: -36, knF: 8, shN: 100, elN: 40, shF: 40, elF: 90 })][k],
  block: () => G({ cr: .2, lean: 10, sp: 5, shN: 80, elN: 100, shF: 70, elF: 110 }),
};
// Rúnico: báculo en la mano cercana, la otra mano abierta con una runa.
const RUNI = {
  idle: k => idleAt(k, (_, b) => G({ cr: .12 + b * .01, lean: 3, sp: 1, nk: 2, hipN: 16, knN: 16, hipF: -14, knF: 16, shN: 26 + b * 2, elN: 64, shF: 46, elF: 74 + b * 3 })),
  cast: k => [G({ cr: .14, lean: 2, sp: 0, hipN: 18, knN: 16, hipF: -16, knF: 16, shN: 40, elN: 50, shF: 40, elF: 70 }),
    G({ cr: .14, lean: 0, sp: -2, nk: -2, hipN: 18, knN: 16, hipF: -16, knF: 16, shN: 130, elN: 20, shF: 70, elF: 74 }),
    G({ cr: .16, lean: -6, sp: -6, nk: -6, hipN: 20, knN: 20, hipF: -18, knF: 18, shN: 168, elN: 8, shF: 140, elF: 20 }),
    G({ cr: .15, lean: 5, sp: 3, nk: 1, hipN: 24, knN: 22, hipF: -22, knF: 14, shN: 100, elN: 6, shF: 96, elF: 10 })][k],
};
const POSE = [MART, ARTI, RUNI];
function pose(cl, anim, k, base) {
  const f = POSE[cl][anim], o = f ? f(k) : null;
  if (cl !== 0) return o;
  const q = { ...base, ...o };
  return { ...o, shF: q.shN - 6, elF: q.elN };                    // el martillo se agarra con las dos manos
}
const VIENTO = { run: .9, walk: .25, atk1: .5, atk2: .55, atk3: .7, charge: -.1, hit: -.8, launched: .5, victory: .1, transform: -.3, cast: .2, fire: .3 };

// ---------------------------------------------------------------------------------------------
// 3. Datos del fotograma
function info(P, ctx) {
  const { J, L, A } = P, s = L.H / 60, st = ctx.stage, ph = ctx.phase * TAU;
  const aT = A.torsoLean * D, up = [sin(aT), -cos(aT)], fwd = [cos(aT), sin(aT)];
  const ah = A.headAng * D, hu = [sin(ah), -cos(ah)], hf = [cos(ah), sin(ah)];
  const R = L.head * .40;
  const tumbled = Math.abs(ctx.pose.rot || 0) > 25;
  const wind = (VIENTO[ctx.anim] ?? 0) + (st - 1) * .1;
  const gravity = tumbled ? [-up[0], -up[1]] : [0, 1];
  const tp = (f, v) => add(f <= .45 ? mix(J.root, J.spine, f / .45) : mix(J.spine, J.chest, (f - .45) / .55), fwd, v);
  const hp = (x, y) => [J.head[0] + hf[0] * x * R - hu[0] * y * R, J.head[1] + hf[1] * x * R - hu[1] * y * R];
  return { J, L, A, s, st, ph, aT, up, fwd, hu, hf, R, wind, gravity, tp, hp, tumbled, hw: L.hipW / 2, tw: L.torsoW / 2, ctx, v: ctx.variant || 0, golpe: ctx.anim === 'hit' || ctx.anim === 'launched' };
}

// ---------------------------------------------------------------------------------------------
// 4. Piezas
function banda(P, p, d, w, h, mat, tone = 2, o = {}) {
  const n = [d[1], -d[0]], a = add(p, d, h / 2), b = add(p, d, -h / 2);
  return P.poly([add(a, n, w / 2), add(a, n, -w / 2), add(b, n, -w / 2), add(b, n, w / 2)], mat, { shade: 'flat', tone, ...o });
}
const dot = (P, p, m, t, o = {}) => P.line([p, p], m, t, o);
function rombo(P, p, rx, ry, mat, o = {}) { return P.poly([[p[0], p[1] - ry], [p[0] + rx, p[1]], [p[0], p[1] + ry], [p[0] - rx, p[1]]], mat, o); }
// Brasa: línea de magma que solo se pinta sobre el material indicado (borde al rojo de la armadura)
function brasa(P, pts, on, tone = 3) { P.line(pts, 'magma', tone, { on }); }
// Emblema del clan: A yunque (rombo con base), B martillo cruzado (aspa)
function emblema(P, c, p, k = 1) {
  const s = c.s * k;
  if (!c.v) { rombo(P, p, 2.2 * s, 1.8 * s, 'gold', { shade: 'vol' }); banda(P, add(p, [0, 2.3 * s]), [1, 0], 4.4 * s, 1.1 * s, 'gold', 2); }
  else { P.line([add(p, [-2.2 * s, -2 * s]), add(p, [2.2 * s, 2 * s])], 'gold', 3, {}); P.line([add(p, [2.2 * s, -2 * s]), add(p, [-2.2 * s, 2 * s])], 'gold', 3, {}); dot(P, p, 'gold', 4); }
}

function bota(P, c, S, cl) {
  const { J, L } = P, s = c.s;
  const top = mix(J['ft' + S], J['kn' + S], cl === 0 ? .5 : .42), d = P.dir('leg' + S + '.lower');
  P.cap(top, J['ft' + S], L.shinW * 1.25, L.shinW * 1.05, 'leather');
  banda(P, top, d, L.shinW * 1.45, 1.5 * s, cl === 0 ? 'iron' : 'gold', 2);
  P.cap(J['heel' + S], J['toe' + S], L.ankle * 2.2, L.ankle * 1.5, 'leather');
  P.blob(add(J['toe' + S], [-.6 * s, -.4 * s]), 2.3 * s, 2.0 * s, 'iron', { shade: 'sphere' });                 // puntera de hierro
}
function pierna(P, c, S, layer, cl) {
  const { L } = P, s = c.s;
  P.layer(layer);
  P.limb('leg' + S + '.upper', 'pants', L.thighW * 1.12, L.thighW * .94);
  const kn = P.j('kn' + S), d = P.dir('leg' + S + '.upper'), n = [d[1], -d[0]];
  if (cl === 0) {                                                                    // grebas y rodilleras de hierro
    P.limb('leg' + S + '.lower', 'iron', L.shinW * 1.3, L.shinW * 1.05, { line: S === 'N' });
    P.blob(add(kn, d, .5), 3.0 * s, 2.8 * s, 'iron', { shade: 'sphere', line: S === 'N' });
    if (c.st >= 2) brasa(P, [add(kn, n, -2.4 * s), add(add(kn, d, 1), n, 2.4 * s)], 'iron');
  } else {
    P.limb('leg' + S + '.lower', 'pants', L.shinW * 1.15, L.shinW * .95);
    P.fold([add(kn, d, -1.5), add(kn, n, -2.4 * s)], 'pants');
  }
  bota(P, c, S, cl);
}

// Faldón (cota de placas, delantal o túnica). len = largo (× muslo)
function falda(P, c, near, o) {
  const { L } = P, { tp, hw, s, wind, gravity: g, ph } = c, back = [-1, 0];
  const len = L.thigh * o.len * (near ? .92 : 1.08);
  const sway = (wind * 5 + sin(ph + (near ? 0 : 1.3)) * 1.0) * s, fl = (o.flare || 0) * s;
  const a = tp(.2, -hw * (near ? 1.05 : .9)), b = tp(.2, hw * (near ? 1.15 : .3));
  const bBot = add(add(add(b, g, len * (near ? .84 : .9)), back, sway * .5), [1, 0], near ? fl : fl * .4);
  const aBot = add(add(a, g, len * 1.04), back, sway + (near ? 0 : 2 * s) + fl * .5);
  const mid = add(mix(aBot, bBot, .5), g, 1.2 * s);
  P.smooth([a, mix(a, b, .5), b, bBot, mid, aBot], o.mat, { n: 3, line: near });
  if (near) {
    P.fold([mix(a, b, .35), add(mix(aBot, bBot, .35), g, -2 * s)], o.mat);
    P.fold([mix(a, b, .72), add(mix(aBot, bBot, .72), g, -3 * s)], o.mat);
    P.line([add(bBot, g, -.5), add(mid, g, -.5), add(aBot, g, -.5)], o.hem || 'gold', 3, { on: o.mat });
    if (o.runas) for (let i = 0; i < 3; i++) { const q = add(mix(mix(a, b, .25 + i * .25), mix(aBot, bBot, .25 + i * .25), .62), g, 0); P.line([q, add(q, [0, 2 * s])], 'rune', 3, { on: o.mat }); dot(P, add(q, [1, 1 * s]), 'rune', 4); }
  }
}

function torso(P, c, cl) {
  const { tp, tw, hw, s, fwd, st } = c;
  P.layer('body');
  const mat = cl === 1 ? 'leather' : 'cloth';
  const sh = [tp(-.02, -hw * .98), tp(.2, -tw * .9), tp(.5, -tw * .86), tp(.78, -tw * 1.04), tp(1.0, -tw * .92), tp(1.12, -tw * .38),
    tp(1.12, tw * .42), tp(1.0, tw * 1.1), tp(.74, tw * 1.22), tp(.46, tw * .86), tp(.2, hw * .98), tp(-.02, hw * 1.04)];
  P.smooth(sh, cl === 2 ? 'robe' : 'cloth', { n: 3 });
  if (cl === 0) {                                                                   // coraza de hierro con ribete de oro, remaches y emblema
    const pe = [tp(.3, -tw * .76), tp(.58, -tw * .92), tp(.98, -tw * .9), tp(1.08, tw * .3), tp(.96, tw * 1.12), tp(.7, tw * 1.2), tp(.44, tw * .88)];
    P.smooth(pe, 'iron', { n: 3, line: true });
    P.line([tp(1.06, tw * .3), tp(.94, tw * 1.08), tp(.7, tw * 1.16), tp(.46, tw * .84)], 'gold', 3, { on: 'iron' });
    P.fold([tp(.9, tw * .7), tp(.62, tw * .5)], 'iron');
    P.fold([tp(.56, -tw * .66), tp(.4, -tw * .44)], 'iron');
    P.poly([tp(1.0, -tw * .5), tp(1.18, -tw * .36), tp(1.18, tw * .3), tp(1.0, tw * .64)], 'iron', { shade: 'vol', line: true });  // gorjal
    for (const q of [tp(.9, tw * .96), tp(.62, tw * 1.0), tp(.84, -tw * .62)]) dot(P, q, 'gold', 4);
    emblema(P, c, tp(.76, tw * .56), .9);
    if (st >= 2) brasa(P, [tp(.46, tw * .84), tp(.7, tw * 1.18), tp(.96, tw * 1.1)], 'iron', 2);
    if (st === 3) {                                                                 // grietas de magma en la coraza
      brasa(P, [tp(.98, tw * .5), tp(.86, tw * .64), tp(.9, tw * .86), tp(.74, tw * .96), tp(.6, tw * .8), tp(.5, tw * .9)], 'iron', 3);
      brasa(P, [tp(.86, tw * .64), tp(.7, tw * .52), tp(.62, tw * .6)], 'iron', 4);
    }
  } else if (cl === 1) {                                                            // chaleco de cuero, camisa roja y bandolera de proyectiles
    P.smooth([tp(.3, -tw * .8), tp(.6, -tw * .9), tp(1.0, -tw * .8), tp(1.06, tw * .2), tp(.92, tw * 1.06), tp(.64, tw * 1.14), tp(.4, tw * .8)], 'leather', { n: 3, line: true });
    P.strip([tp(1.12, -tw * .2), tp(.82, tw * .5), tp(.5, tw * .9)], 2.8 * s, 2.5 * s, 'leather', { shade: 'cyl', line: true });
    for (let i = 0; i < 4; i++) { const q = mix(tp(1.0, -tw * .1), tp(.52, tw * .9), .1 + i * .26); P.blob(add(q, c.fwd, .4), 1.3 * s, 1.5 * s, 'gold', { shade: 'sphere' }); }
    P.poly([tp(1.0, -tw * .5), tp(1.16, -tw * .36), tp(1.16, tw * .3), tp(1.0, tw * .62)], 'cloth', { shade: 'vol', line: true });
    P.fold([tp(.9, tw * .7), tp(.62, tw * .5)], 'leather');
    P.fold([tp(.56, -tw * .66), tp(.4, -tw * .44)], 'leather');
    if (st >= 2) brasa(P, [tp(.4, tw * .8), tp(.64, tw * 1.12), tp(.92, tw * 1.04)], 'leather', 2);
    if (st === 3) { dot(P, tp(.8, tw * .2), 'magma', 4); P.line([tp(.7, tw * .3), tp(.58, tw * .5)], 'magma', 3, { on: 'leather' }); }
  } else {                                                                          // túnica larga con cuello de hierro y paneles de runas
    P.poly([tp(1.0, -tw * .5), tp(1.2, -tw * .36), tp(1.2, tw * .3), tp(1.0, tw * .64)], 'iron', { shade: 'vol', line: true });
    P.strip([tp(1.12, tw * .4), tp(.82, tw * .2), tp(.5, tw * .15), tp(.2, tw * .22)], 2.2 * s, 1.8 * s, 'iron', { shade: 'cyl', line: true });
    const r = [tp(.94, tw * .8), tp(.8, tw * .6), tp(.7, tw * .84), tp(.56, tw * .62), tp(.44, tw * .78)];
    P.line(r, 'rune', 3, { on: 'robe' }); dot(P, r[2], 'rune', 4);
    P.line([tp(.86, -tw * .5), tp(.7, -tw * .34), tp(.76, -tw * .62)], 'rune', 2, { on: 'robe' });
    P.fold([tp(.88, tw * 1.0), tp(.62, tw * .8)], 'robe');
    P.fold([tp(.58, -tw * .66), tp(.4, -tw * .5)], 'robe');
  }
  // cinto ancho con hebilla; en el Martillador y el Artillero lleva bolsa o frasco de pólvora
  const w0 = tp(.33, 0);
  P.poly([tp(.4, -tw * .86), tp(.4, tw * .86), tp(.22, hw * 1.04), tp(.22, -hw * 1.0)], 'leather', { shade: 'vol', line: true });
  const knot = add(w0, fwd, tw * .42);
  rombo(P, knot, 2.3 * s, 2.0 * s, 'gold', { shade: 'vol', line: true });
  if (cl === 1) { P.blob(add(knot, [-4.5 * s, 1.5 * s]), 2.0 * s, 2.4 * s, 'leather', { shade: 'sphere', line: true }); dot(P, add(knot, [-4.5 * s, -.6 * s]), 'gold', 3); }
  if (cl === 2) for (let i = 0; i < 3; i++) P.blob(add(knot, [(-3 - i * 3) * s, 1.2 * s]), 1.2 * s, 1.5 * s, 'rune', { shade: 'sphere' });
}

// Cabeza de perfil: frente y cejas pesadas, nariz grande; la barba cubre mandíbula y cuello.
function cabeza(P, c) {
  const { hp, R, J } = c;
  P.layer('body');
  P.cap(J.chest, J.head, c.L.head * .32, c.L.head * .3, 'skin', { dt: -1 });
  P.blob(J.head, R, R * 1.05, 'skin', { shade: 'flat', tone: 2 });
  P.smooth([hp(.1, -.6), hp(.98, -.5), hp(1.06, -.1), hp(1.4, .3), hp(1.1, .5), hp(1.05, .7), hp(.88, 1.0), hp(.25, 1.02), hp(-.1, .6)], 'skin', { n: 3, shade: 'flat', tone: 3 });
  P.smooth([hp(.0, .5), hp(.8, .66), hp(.9, 1.0), hp(.25, 1.02), hp(-.12, .6)], 'skin', { n: 3, shade: 'flat', tone: 2, on: 'skin' });
  P.blob(hp(.7, .1), R * .34, R * .26, 'skin', { shade: 'flat', tone: 4 });
  P.blob(hp(1.26, .34), R * .3, R * .26, 'skin', { shade: 'sphere' });                                       // nariz
  P.blob(hp(.02, .22), R * .2, R * .3, 'skin', { shade: 'flat', tone: 2 });
}
// Barba larga con dos tonos de mechón. o.len (× R), o.trenzas = lista de [x, grosor]
function barba(P, c, o) {
  const { hp, R, s, gravity: g, wind, ph, st } = c, hm = 'hair';
  const bl = R * o.len, fly = -wind * R * 1.1, sw = sin(ph + .5) * .8 * s;
  P.layer('top');
  P.smooth([hp(-.05, .35), hp(.95, .42), hp(1.12, .8), add(hp(1.04, 1.0), g, bl * .55), add(add(hp(.76, 1.1), g, bl), [fly * .7 + sw, 0]), add(add(hp(.3, 1.05), g, bl * .86), [fly * .5 + sw, 0]), add(hp(-.1, .9), g, bl * .4)], hm, { n: 3, line: true });
  for (const [x, w, k] of [[.78, 1, .9], [.4, .8, .7], [.95, .9, .5]]) P.line([hp(x, .8), add(add(hp(x, 1.0), g, bl * k), [fly * k * .6 + sw * k, 0])], hm, 4, { on: hm });
  P.line([hp(.6, .95), add(add(hp(.55, 1.0), g, bl * .75), [fly * .5, 0])], hm, 0, { on: hm });
  P.line([hp(.2, .9), add(add(hp(.15, 1.0), g, bl * .6), [fly * .4, 0])], hm, 1, { on: hm });
  // bigote: dos alas que salen de bajo la nariz
  P.smooth([hp(.9, .42), hp(1.26, .58), hp(1.12, .86), hp(.7, .72)], hm, { n: 3, line: true });
  P.line([hp(.95, .55), hp(1.2, .64)], hm, 4, { on: hm });
  for (const [x, k] of o.trenzas || []) {                                                                    // trenza: bolas de pelo con abrazadera
    const b0 = add(hp(x, 1.1), g, bl * .55);
    for (let i = 0; i < 3; i++) P.blob(add(add(b0, g, i * 3 * s), [fly * .5 * (i + 1) / 3 + sw, 0]), 1.8 * s, 1.8 * s, hm, { shade: 'sphere', line: true });
    const e = add(add(b0, g, 9.6 * s), [fly * .5 + sw, 0]);
    banda(P, e, [0, 1], 3.2 * s, 1.2 * s, 'gold', 3);
    if (st >= 2) P.blob(add(e, g, 1.8 * s), 1.2 * s, 1.2 * s, 'magma', { shade: 'sphere' });                      // cuenta de brasa
    if (k) P.blob(add(e, g, 1.6 * s), 1.4 * s, 1.4 * s, 'rune', { shade: 'sphere' });
  }
  if (st === 3) {                                                                                           // puntas humeantes
    const t = add(add(hp(.7, 1.1), g, bl + 1.2 * s), [fly * .7 + sw, 0]);
    P.line([add(t, [-3 * s, -1.4 * s]), t, add(t, [3 * s, -1.2 * s])], 'magma', 3, { on: hm });
    dot(P, t, 'magma', 4);
  }
}
function ojo(P, c, cl) {
  const { hp, st } = c, e = hp(.74, .0), golpe = c.golpe;
  P.layer('top');
  P.eye([e[0] - .4, e[1] - .2], { iris: 'iris', size: 2 });
  P.line([hp(.4, golpe ? -.5 : -.3), hp(.8, -.22), hp(1.18, golpe ? -.2 : -.08)], 'hair', 1, { on: 'skin' });        // ceja pesada
  P.line([hp(.5, -.4), hp(1.0, -.32)], 'hair', 3, { on: 'skin' });
  dot(P, hp(1.28, .12), 'skin', 4, { on: 'skin' });
  if (st === 3) dot(P, e, 'white', 0);
  void cl;
}

// Casco, sombrero o capucha por clase. Detrás del casco asoma el pelo rojo del cogote.
function nuca(P, c) {
  const { hp, R, wind, s } = c;
  P.layer('body');
  P.lock(hp(-.7, .0), { n: 4, ang: -4 - wind * 30, len: R * 1.6, w: R * .9, w1: 1.4, curve: 10, sway: 3 }, 'hair', { dt: -1, line: true });
  P.lock(hp(-.5, .4), { n: 4, ang: -10 - wind * 26, len: R * 1.3, w: R * .7, w1: 1.2, curve: 8, sway: 3 }, 'hair', { line: true });
  void s;
}
function casco(P, c, cl) {
  const { hp, R, s, st, wind } = c;
  P.layer('top');
  if (cl === 0) {                                                                    // yelmo cerrado con nasal, cresta de crin y banda de oro
    P.smooth([hp(-1.18, .2), hp(-1.24, -.7), hp(-.5, -1.5), hp(.5, -1.54), hp(1.16, -.9), hp(1.14, -.42), hp(.2, -.5), hp(-.5, .1)], 'iron', { n: 3, line: true });
    P.strip([hp(1.14, -.5), hp(.3, -.58), hp(-1.12, -.3)], 1.8 * s, 1.8 * s, 'gold', { shade: 'cyl', smooth: true, line: true });
    P.poly([hp(1.02, -.5), hp(1.16, -.44), hp(1.22, .4), hp(1.04, .34)], 'iron', { shade: 'vol', line: true });      // nasal
    P.smooth([hp(-.35, -.1), hp(.2, 0), hp(.18, .9), hp(-.42, .76)], 'iron', { n: 2, line: true });                  // carrillera
    P.strip([hp(-1.0, -1.2), hp(-.1, -1.72 - wind * .2), hp(.9, -1.5)], 2.6 * s, 1.4 * s, 'cloth', { shade: 'cyl', smooth: true, line: true });
    P.line([hp(-.6, -1.2), hp(0, -1.4), hp(.6, -1.3)], 'iron', 4, { on: 'iron' });
    dot(P, hp(-.1, -.5), 'gold', 4); dot(P, hp(.6, -.55), 'gold', 4);
    if (st >= 2) brasa(P, [hp(-1.1, -.4), hp(-.9, -1.0), hp(-.3, -1.38)], 'iron', 2);
    if (st === 3) { brasa(P, [hp(.1, -1.4), hp(.3, -1.0), hp(.2, -.7)], 'iron', 3); brasa(P, [hp(.3, -1.0), hp(.7, -.9)], 'iron', 4); }
  } else if (cl === 1) {                                                             // sombrero de cuero con visera ancha y chapa de proyectil
    P.smooth([hp(-1.15, -.15), hp(-1.1, -.95), hp(-.3, -1.5), hp(.7, -1.3), hp(1.0, -.7), hp(.2, -.6)], 'leather', { n: 3, line: true });
    P.poly([hp(-.9, -.62), hp(2.0, -.62), hp(2.1, -.36), hp(-.9, -.3)], 'leather', { shade: 'vol', line: true });  // visera
    P.line([hp(-.8, -.62), hp(1.9, -.62)], 'leather', 4, { on: 'leather' });
    P.strip([hp(1.0, -.7), hp(.2, -.8), hp(-1.1, -.55)], 1.9 * s, 1.9 * s, 'gold', { shade: 'cyl', smooth: true, line: true });
    P.blob(hp(.62, -.95), 1.5 * s, 1.9 * s, 'iron', { shade: 'sphere', line: true });
    P.line([hp(-.6, -1.3), hp(-.1, -1.45), hp(.4, -1.35)], 'leather', 4, { on: 'leather' });
    if (st >= 2) brasa(P, [hp(-.9, -.35), hp(.6, -.38), hp(1.8, -.4)], 'leather', 2);
    if (st === 3) { P.line([hp(1.4, -.58), hp(1.9, -.5)], 'magma', 4, { on: 'leather' }); }
  } else {                                                                           // capucha puntiaguda, diadema de hierro y gema rúnica
    P.smooth([hp(.9, -.64), hp(.2, -1.4), hp(-.8, -2.1 - wind * .3), hp(-1.6, -1.2), hp(-1.55, .6), hp(-1.0, 1.3), hp(-.3, .5), hp(-.1, -.1)], 'robe', { n: 3, line: true });
    P.fold([hp(-.2, -1.2), hp(-.9, -.2)], 'robe'); P.fold([hp(-.7, -1.8), hp(-1.2, -.8)], 'robe');
    P.line([hp(-.1, -.2), hp(-.35, .6), hp(-.9, 1.2)], 'robe', 0, { on: 'robe' });
    P.strip([hp(1.04, -.5), hp(.3, -.66), hp(-.6, -.56)], 1.7 * s, 1.7 * s, 'iron', { shade: 'cyl', smooth: true, line: true });
    P.blob(hp(.96, -.52), 1.6 * s, 1.6 * s, 'rune', { shade: 'sphere', line: true });
    P.emit({ px: [hp(.9, -.58)] });
    P.line([hp(-.4, -1.3), hp(-.8, -1.0), hp(-.5, -.8)], 'rune', 3, { on: 'robe' });
    if (st >= 2) P.line([hp(-1.3, -.2), hp(-1.3, .5)], 'rune', 4, { on: 'robe' });
    if (st === 3) { P.line([hp(-.2, -1.7), hp(.1, -1.4)], 'magma', 3, { on: 'robe' }); dot(P, hp(-.8, -2.1), 'rune', 4); }
  }
  void R;
}

function brazo(P, c, S, layer, cl) {
  const { J, L } = P, s = c.s, near = S === 'N', st = c.st;
  P.layer(layer);
  const sh = J['sh' + S], el = J['el' + S], ha = J['ha' + S], dU = P.dir('arm' + S + '.upper'), dL = P.dir('arm' + S + '.lower');
  const manga = cl === 2 ? 'robe' : 'cloth';
  P.blob(sh, L.upperW * .62, L.upperW * .62, manga, { shade: 'sphere' });
  P.limb('arm' + S + '.upper', manga, L.upperW * 1.3, L.upperW * 1.15);
  P.fold([add(sh, dU, 3 * s), add(el, dU, -4 * s)], manga);
  if (cl === 0) {                                                                    // brazal de hierro con banda de oro
    P.limb('arm' + S + '.lower', 'iron', L.lowerW * 1.4, L.lowerW * 1.15);
    P.blob(el, 2.7 * s, 2.7 * s, 'iron', { shade: 'sphere', line: near });
    banda(P, mix(el, ha, .74), dL, L.lowerW * 1.6, 1.4 * s, 'gold', 2, { line: near });
    P.blob(add(sh, dU, -.5 * s), L.upperW * .82, L.upperW * .68, 'iron', { shade: 'sphere', line: near });          // hombrera
    P.line([add(sh, [-L.upperW * 1.2, L.upperW * .9]), add(sh, [L.upperW * 1.2, L.upperW * .9])], 'gold', 2, { on: 'iron' });
    if (st >= 2) brasa(P, [add(sh, [-L.upperW * 1.2, L.upperW * .9]), add(sh, [L.upperW * .3, L.upperW * 1.2])], 'iron', 2);
    if (st === 3) {                                                                  // púas de la hombrera con grieta de magma
      const b = add(sh, dU, -1.5 * s), u = [0, -1];
      P.poly([add(b, [-2.2 * s, -L.upperW * .6]), add(add(b, u, 4.6 * s), [-1.2 * s, 0]), add(b, [2.2 * s, -L.upperW * .6])], 'iron', { shade: 'vol', line: near });
      brasa(P, [add(b, u, .8 * s), add(b, u, 3.4 * s)], 'iron', 4);
    }
  } else {
    P.limb('arm' + S + '.lower', 'skin', L.lowerW * 1.2, L.lowerW * 1.0);
    P.cap(el, mix(el, ha, .68), L.lowerW * 1.5, cl === 2 ? L.lowerW * 2.5 : L.lowerW * 1.8, manga, { shade: 'cyl', line: near });
    P.fold([add(el, dL, 1 * s), add(mix(el, ha, .6), dL, 0)], manga);
    banda(P, mix(el, ha, .68), dL, L.lowerW * (cl === 2 ? 2.5 : 1.8), 1.5 * s, cl === 2 ? 'iron' : 'leather', 2, { line: near });
    if (cl === 2) P.line([mix(el, ha, .2), mix(el, ha, .55)], 'rune', 3, { on: 'robe' });
  }
  return add(ha, dL, .6 * s);
}
// Puño: guantelete de hierro (Martillador), guante de cuero (Artillero) o mano desnuda (Rúnico)
function puño(P, c, p, d, cl, line = true) {
  const s = c.s;
  P.blob(p, 2.7 * s, 2.6 * s, cl === 0 ? 'iron' : cl === 1 ? 'leather' : 'skin', { shade: 'sphere', line });
  banda(P, add(p, d, .2), [d[1], -d[0]], 3.6 * s, 1.2 * s, cl === 2 ? 'skin' : 'gold', cl === 2 ? 1 : 3, { shade: 'flat' });
}

// --- armas ---
// Martillo de guerra: mango de cuero con abrazaderas de oro, cabeza de hierro con remaches y púa trasera. d = dirección del antebrazo.
function martillo(P, c, hand, d) {
  const s = c.s, n = [d[1], -d[0]], st = c.st, len = 20 * s;
  const hc = add(hand, d, len), back = add(hand, d, -8 * s);
  P.layer('top');
  P.cap(back, add(hc, d, -1 * s), 2.7 * s, 2.3 * s, 'leather', { shade: 'cyl', line: true });
  P.blob(add(back, d, -.8 * s), 2.0 * s, 2.0 * s, 'gold', { shade: 'sphere', line: true });
  banda(P, add(hand, d, -3.4 * s), d, 3.4 * s, 1.2 * s, 'gold', 3);
  banda(P, add(hc, d, -2.6 * s), d, 3.6 * s, 1.2 * s, 'gold', 2);
  const head = [add(add(hc, d, -3.6 * s), n, -6.6 * s), add(add(hc, d, 3.6 * s), n, -6.6 * s), add(add(hc, d, 3.6 * s), n, 5.4 * s), add(add(hc, d, -3.6 * s), n, 5.4 * s)];
  P.poly(head, 'iron', { shade: 'vol', line: true });
  P.poly([add(add(hc, d, -2.4 * s), n, 5.2 * s), add(add(hc, d, 2.4 * s), n, 5.2 * s), add(hc, n, 9 * s)], 'iron', { shade: 'vol', line: true });  // púa
  P.line([add(add(hc, d, -3 * s), n, -6.2 * s), add(add(hc, d, -3 * s), n, 4.8 * s)], 'iron', 4, { on: 'iron' });
  P.line([add(add(hc, d, 3 * s), n, -6.2 * s), add(add(hc, d, 3 * s), n, 4.8 * s)], 'iron', 1, { on: 'iron' });
  dot(P, add(add(hc, d, 0), n, -4.6 * s), 'gold', 4); dot(P, add(add(hc, d, 0), n, 3.2 * s), 'gold', 4);
  if (st >= 2) brasa(P, [add(add(hc, d, 3.4 * s), n, -6.4 * s), add(add(hc, d, 3.4 * s), n, 5 * s)], 'iron', 3);
  if (st === 3) {                                                                    // la cabeza arde: grieta de magma y lengua de fuego en 3 píxeles
    brasa(P, [add(add(hc, d, -1 * s), n, -5 * s), add(hc, n, 0), add(add(hc, d, 1 * s), n, 3.4 * s)], 'iron', 4);
    const f = Math.floor(c.ph * 2) % 2;
    P.emit({ px: [add(hc, n, -7.6 * s - f), add(add(hc, n, -8.6 * s - f), d, 1), add(add(hc, d, -1.5 * s), n, -7.4 * s)] });
  }
  P.anchor('muzzle', add(hc, n, -6 * s));
  P.anchor('rod', hc);
  return hc;
}
// Cañón de mano: cañón de hierro con aros de latón, boca acampanada, culata de madera y depósito
function canon(P, c, hand, d) {
  const s = c.s, n = [d[1], -d[0]], st = c.st, ctx = c.ctx;
  const b0 = add(hand, d, -5.5 * s), b1 = add(hand, d, 10 * s), tip = add(b1, d, 3 * s);
  P.layer('top');
  P.cap(add(b0, d, -2.5 * s), add(b0, n, 0), 4.6 * s, 4.6 * s, 'leather', { shade: 'cyl', line: true });          // culata
  P.cap(b0, b1, 5.0 * s, 4.2 * s, 'iron', { shade: 'cyl', line: true });
  P.poly([add(b1, n, -2.6 * s), add(tip, n, -3.6 * s), add(tip, n, 3.6 * s), add(b1, n, 2.6 * s)], 'iron', { shade: 'vol', line: true });  // boca
  for (const k of [.1, .5, .86]) banda(P, mix(b0, b1, k), d, 5.6 * s, 1.2 * s, 'gold', k > .5 ? 3 : 2);
  P.line([add(b0, n, -1.8 * s), add(b1, n, -1.4 * s)], 'iron', 4, { on: 'iron' });
  P.blob(add(mix(b0, b1, .3), n, 3.4 * s), 2.2 * s, 2.0 * s, 'gold', { shade: 'sphere', line: true });             // depósito de pólvora
  dot(P, add(b0, n, -3 * s), 'iron', 4);
  if (st >= 2) brasa(P, [add(b1, n, -2.2 * s), add(tip, n, -3.2 * s)], 'iron', 3);
  if (st === 3) { brasa(P, [mix(b0, b1, .2), mix(b0, b1, .8)], 'iron', 3); dot(P, mix(b0, b1, .5), 'magma', 4); }
  if (ctx.anim === 'fire' && ctx.frame === 0) {                                      // fogonazo y humo de la boca
    P.emit({ poly: [add(tip, n, -1.6 * s), add(add(tip, d, 7 * s), n, -.5 * s), add(add(tip, d, 3 * s), n, 0), add(add(tip, d, 6 * s), n, 3 * s), add(tip, n, 1.6 * s)] });
    P.emit({ px: [add(add(tip, d, 9 * s), n, -1 * s), add(add(tip, d, 8 * s), n, 3.4 * s)] });
  } else if (ctx.anim === 'fire') {
    for (let i = 0; i < 3; i++) P.blob(add(add(tip, d, (3 + i * 3) * s), n, (-1 - i) * s), (1.6 + i * .5) * s, (1.6 + i * .5) * s, 'iron', { shade: 'sphere', dt: 1 });
  }
  P.anchor('muzzle', add(tip, d, 1 * s));
  return tip;
}
// Báculo rúnico: palo de cuero con cuna de hierro; la piedra rúnica flota sobre ella y dos esquirlas la orbitan despacio
function baculo(P, c, hand, d) {
  const s = c.s, st = c.st, ph = c.ph;
  let u = [d[0] * .36, -.66 + d[1] * .36]; const l = Math.hypot(u[0], u[1]) || 1; u = [u[0] / l, u[1] / l];
  const n = [u[1], -u[0]], b = add(hand, u, -11 * s), t = add(hand, u, 19 * s);
  P.layer('top');
  P.cap(b, t, 2.6 * s, 2.0 * s, 'leather', { shade: 'cyl', line: true });
  banda(P, add(hand, u, -2.4 * s), u, 3.6 * s, 1.1 * s, 'gold', 3);
  P.cap(add(b, u, .4 * s), add(b, u, 2.6 * s), 3.6 * s, 3.0 * s, 'iron', { shade: 'cyl' });
  P.strip([add(t, n, -2.4 * s), add(add(t, u, 3.2 * s), n, -3.6 * s), add(add(t, u, 5.6 * s), n, -2.6 * s)], 1.5 * s, 1.1 * s, 'iron', { shade: 'cyl', smooth: true, line: true });
  P.strip([add(t, n, 2.4 * s), add(add(t, u, 3.2 * s), n, 3.6 * s), add(add(t, u, 5.6 * s), n, 2.6 * s)], 1.5 * s, 1.1 * s, 'iron', { shade: 'cyl', smooth: true, line: true });
  const cen = add(t, u, (8.4 + sin(ph * TAU) * .5) * s);
  rombo(P, add(cen, [0, 0]), 3.4 * s, 4.8 * s, 'rune', { shade: 'vol', line: true });
  P.line([add(cen, [-1.4 * s, -1.2 * s]), add(cen, [0, -3.4 * s])], 'rune', 4, { on: 'rune' });
  P.line([add(cen, [-.8 * s, 1.2 * s]), add(cen, [.6 * s, 2.4 * s])], 'rune', 1, { on: 'rune' });
  P.emit({ px: [add(cen, [0, 0]), add(cen, [0, 1])] });
  for (let i = 0; i < (st >= 2 ? 2 : 1); i++) {                                       // esquirlas orbitantes
    const a = ph * TAU + i * Math.PI, q = [cen[0] + cos(a) * 6.4 * s, cen[1] + sin(a) * 2.2 * s - 1];
    rombo(P, q, 1.1 * s, 1.6 * s, 'rune', { shade: 'flat', tone: 3 }); dot(P, q, 'rune', 4);
  }
  if (st === 3) P.emit({ px: [add(cen, [-5.6 * s, 3 * s]), add(cen, [5.6 * s, -1 * s]), add(cen, [0, -6.5 * s])] });
  P.anchor('rod', cen); P.anchor('muzzle', cen);
  return cen;
}

// ---------------------------------------------------------------------------------------------
// 5. Dibujo de cada clase. Orden: lejano → tronco → pierna cercana → cabeza → barba → casco → arma y brazo cercano.
function dibujar(P, ctx, cl) {
  const c = info(P, ctx), { J, s } = c;
  pierna(P, c, 'F', 'far', cl);
  brazo(P, c, 'F', 'far', cl);
  if (cl === 2) puño(P, c, add(J.haF, P.dir('armF.lower'), .6 * s), P.dir('armF.lower'), 2, false);
  const fa = [{ len: .66, mat: 'cloth', hem: 'gold' }, { len: .64, mat: 'leather', hem: 'gold' }, { len: 1.28, flare: 1.6, mat: 'robe', hem: 'iron', runas: true }][cl];
  falda(P, c, false, fa);
  torso(P, c, cl);
  const patada = c.A['legN.upper'] > 55;
  if (patada) { falda(P, c, true, fa); pierna(P, c, 'N', 'near', cl); } else { pierna(P, c, 'N', 'near', cl); falda(P, c, true, fa); }
  nuca(P, c);
  cabeza(P, c);
  barba(P, c, [{ len: 3.5, trenzas: [[.5, 0], [.95, 0]] }, { len: 2.4, trenzas: [[.7, 0]] }, { len: 3.8, trenzas: [[.7, 1]] }][cl]);
  casco(P, c, cl);
  ojo(P, c, cl);
  const hand = brazo(P, c, 'N', 'near', cl), d = P.dir('armN.lower');
  let tip;
  if (cl === 0) {
    tip = martillo(P, c, hand, d);
    puño(P, c, add(J.haF, P.dir('armF.lower'), .6 * s), P.dir('armF.lower'), 0);
  } else if (cl === 1) tip = canon(P, c, hand, d);
  else tip = baculo(P, c, hand, d);
  puño(P, c, hand, d, cl);
  if (cl === 2) P.line([add(J.haF, [0, -3.2 * s]), add(J.haF, [0, -3.2 * s])], 'rune', 4, {});
  if (cl === 0 && ctx.anim.startsWith('atk') && ctx.frame === 1) {                    // chispas del yunque en el impacto
    const r = ctx.rng, o = add(hand, d, 20 * s);
    for (let i = 0; i < 5; i++) { const a = r() * TAU, dd = 3 + r() * 5; P.emit({ px: [[o[0] + cos(a) * dd + 2, o[1] + sin(a) * dd]] }); }
  }
  void tip;
  P.anchor('haN', hand);
  P.anchor('head', J.head);
}

// ---------------------------------------------------------------------------------------------
// 6. Efectos vivos. Contrato real de render/scene.js: c = { x, y (pies), w, h, t (ms), lite, face, alpha, idx, variant }.
const px = (g, x, y, col, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.globalAlpha = 1; };
const escala = c => Math.max(.8, Math.min(1.3, (c.h || 64) / 64));
const BRASA = [['#fff0b0', '#ffb040', '#e85a14'], ['#ffffff', '#ffe8a0', '#e0b438']];
const fx = {
  back(g, c, stage) {
    if (stage < 2) return;
    const t = c.t / 1000, s = escala(c), pal = BRASA[c.variant ? 1 : 0];
    g.save(); g.translate(c.x, c.y);
    if (stage === 3) {                                                                  // grietas de lava en el suelo: aro de puntos que respira (≤ 1 Hz)
      const n = c.lite ? 12 : 26, br = .55 + .25 * sin(t * 2.4);
      for (let i = 0; i < n; i++) { const a = i / n * TAU; px(g, cos(a) * 20 * s, sin(a) * 6 * s, i % 3 ? pal[2] : pal[1], br); }
      if (!c.lite) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .4; for (let r = 4; r < 17; r += 3) px(g, cos(a) * r * s, sin(a) * r * .3 * s, pal[2], .55); }
    }
    const n = c.lite ? 3 : stage === 2 ? 6 : 10;                                          // brasas que suben sin llama
    for (let i = 0; i < n; i++) {
      const k = (t * .4 + i / n) % 1, x = sin(i * 6.1 + k * 3.4) * 12 * s, y = -3 * s - k * 52 * s;
      px(g, x, y, pal[i % 3], sin(k * Math.PI) * .9);
    }
    g.restore();
  },
  front(g, c, stage) {
    if (stage < 2 || c.lite) return;
    const t = c.t / 1000, s = escala(c), pal = BRASA[c.variant ? 1 : 0];
    g.save(); g.translate(c.x, c.y);
    const f = t * 1.4, k = Math.floor(f), ph = f - k;                                    // chispa de yunque cada ~0,7 s
    if (ph < .45) {
      const bx = ((k * 29 + (c.idx || 0) * 13) % 19 - 9) * s * c.face, by = -(14 + (k * 11) % 22) * s;
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + k; px(g, bx + cos(a) * ph * 9 * s, by + sin(a) * ph * 7 * s + ph * ph * 6, pal[i % 3], 1 - ph / .45); }
    }
    if (stage === 3) for (let i = 0; i < 3; i++) { const kk = (t * .5 + i / 3) % 1; px(g, sin(i * 4 + 1) * 11 * s - c.face * 4 * s, -48 * s + kk * 40 * s, pal[1], .8 - kk * .7); }
    g.restore();
  },
};

// Remate de la transformación: un martillazo al suelo (anillo de brasas que se abre) y fuente de chispas
function transformFx(g, c, k) {
  const s = escala(c), pal = BRASA[c.variant ? 1 : 0];
  g.save(); g.translate(c.x, c.y);
  const r = 6 + 34 * Math.min(1, k * 1.4);
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; px(g, cos(a) * r * s, sin(a) * r * .32 * s, pal[i % 3], Math.max(0, 1 - k)); }
  if (k < .7) for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i / 12 - .5) * 1.7, v = 16 + (i * 7) % 11, tt = k * 1.6;
    px(g, cos(a) * v * tt * s, sin(a) * v * tt * s * 1.5 + tt * tt * 22 * s, pal[i % 3], 1 - k / .7);
  }
  g.restore();
}

// ---------------------------------------------------------------------------------------------
const CUERPO = [{ body: 'robusto', height: 52, shoulder: 1.1, headScale: 1.12 }, { body: 'robusto', height: 50, shoulder: 1.04, headScale: 1.12 }, { body: 'robusto', height: 50, shoulder: 1.0, headScale: 1.12 }];
const poseDe = i => (anim, k, base) => pose(i, anim, k, base) || null;
const ANC = ['haN', 'haF', 'head', 'chest', 'muzzle', 'rod'];
export default {
  id: 'enanos',
  kit: 1,
  ready: true,
  materials: ['skin', 'hair', 'cloth', 'robe', 'iron', 'gold', 'leather', 'pants', 'rune', 'magma', 'iris'],
  ramps(variant, stage) {
    const v = variant ? 1 : 0, st = Math.max(1, Math.min(3, stage || 1)), pick = k => RAMPAS[k][Math.min(v, RAMPAS[k].length - 1)];
    const iron = st === 1 ? pick('iron') : st === 2 ? (v ? ['#2a2a34', '#58505c', '#8a8494', '#bcb8c8', '#f0eef8'] : ['#241e24', '#4a4048', '#76707a', '#aaa2ae', '#e0d8e0']) : (v ? ['#30282c', '#5e4e54', '#908490', '#c4bac4', '#f6f0f4'] : ['#2a1c20', '#523c40', '#80707a', '#b4a4aa', '#ece0e4']);
    return {
      skin: ramp5(pick('skin')), hair: ramp5(pick('hair')), cloth: ramp5(pick('cloth')), robe: ramp5(pick('robe')), iron: ramp5(iron), gold: ramp5(pick('gold')),
      leather: ramp5(pick('leather')), pants: ramp5(pick('pants')), rune: ramp5(pick('rune')), magma: ramp5(pick('magma')),
      iris: ramp5([IRIS[st - 1][0], IRIS[st - 1][1], IRIS[st - 1][2], '#ffffff', '#ffffff']),
    };
  },
  emit: variant => EMIT[variant ? 1 : 0],
  geomStage: s => s,
  extraAnims: {},
  extraPoses: {},
  classes: [
    { id: 'martillador', name: 'Martillador', build: CUERPO[0], anchors: ANC, pose: poseDe(0), draw: (P, ctx) => dibujar(P, ctx, 0) },
    { id: 'artillero', name: 'Artillero', build: CUERPO[1], anchors: ANC, pose: poseDe(1), draw: (P, ctx) => dibujar(P, ctx, 1) },
    { id: 'runico', name: 'Rúnico', build: CUERPO[2], anchors: ANC, pose: poseDe(2), draw: (P, ctx) => dibujar(P, ctx, 2) },
  ],
  stageScale: [1, 1, 1.08],
  fx,
  transformFx,
};
