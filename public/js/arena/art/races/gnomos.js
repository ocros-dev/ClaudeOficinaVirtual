// Raza «gnomos» · Taller del Engranaje (paquete A-GNO). Arte 16 bits propio, 3 etapas y variantes A/B.
// Menudos, cabeza enorme y gafas grandes de latón con cristal turquesa; cada uno lleva un artilugio a la espalda.
// Clases: 0 Piloto de mecha (puño mecánico con taladro, caldera con chimenea), 1 Artífice (llave inglesa, torreta en el hombro, dron),
//         2 Alquimista (frasco de poción, bandolera de viales, depósito burbujeante).
// Guía: docs/arena-estilo-16bits.md. Solo se importa de '../kit16/*'. Sin Math.random (usa ctx.rng).
// Orden del archivo: 1 paleta · 2 poses · 3 datos del fotograma · 4 piezas · 5 dibujo de cada clase · 6 efectos vivos.
//   Etapa 1 Formación · 2 Engranaje Vivo (cristales y juntas encendidos en turquesa, engranaje de la mochila, chispas) ·
//   3 Maquinaria Maestra (+6 % de tamaño, exoesqueleto de varillas y pistones, antena con luz, drones en órbita).
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------------------------------------------------------------------------------------------
// 1. Paleta (spec: cobre #b8703a, turquesa #2ab0b0). [sombra profunda, sombra, base, luz, brillo]. B = chaqueta turquesa con detalles de cobre y pelo rojo.
const COBRE = ['#3a1c0c', '#7a4020', '#b8703a', '#e0a060', '#ffd49a'], TURQ = ['#06282c', '#0e5a60', '#2ab0b0', '#6ae0d8', '#d0fffa'];
const RAMPAS = {
  skin:   [['#8a5a44', '#bc866a', '#f0c8a8', '#ffe2c8', '#fff4e6'], ['#7a4e3c', '#a87458', '#dca884', '#f0c8a8', '#ffe6cc']],
  hair:   [['#4a5262', '#7c8696', '#b4bcc8', '#dae0e8', '#ffffff'], ['#4a0c08', '#8a2418', '#c8402a', '#ec6a44', '#ffa078']],
  coat:   [COBRE, TURQ],
  teal:   [TURQ, COBRE],
  brass:  [['#4a3408', '#8a6414', '#d0a030', '#f0d068', '#fff4b8']],
  steel:  [['#1c2430', '#3c4a5c', '#76889c', '#a8bccc', '#e4f0fa']],
  leather:[['#1c1008', '#3c2616', '#62402a', '#8a5e3e', '#b48458']],
  glass:  [['#06303a', '#0e6a78', '#32c8d0', '#8af0f0', '#ffffff']],
  potion: [['#14420e', '#2a8a1c', '#5ad03a', '#a4f070', '#f0ffc8']],
  potion2:[['#4a0c40', '#8a1c7a', '#d042b8', '#f08ae0', '#ffe0f8']],
};
const IRIS = [['#0a3a40', '#1a7a86', '#2a9aa6'], ['#0e5a60', '#2ab0b0', '#6ae0d8'], ['#6ae0d8', '#d0fffa', '#ffffff']];
const EMIT = ['#7af0e8', '#ffc880'];

// ---------------------------------------------------------------------------------------------
// 2. Poses propias. Ángulos: 0 = colgando, 90 = al frente, 180 = arriba. Los gnomos trotan: piernas cortas y mucho vaivén.
const G = o => ({ pl: 'NF', ...o });
const idleAt = (k, f) => f(k, [0, .5, 1, .5][k]);
const PILO = {
  idle: k => idleAt(k, (_, b) => G({ cr: .13 + b * .012, lean: 6, sp: 2, nk: 1, hipN: 22, knN: 20, hipF: -18, knF: 22, shN: 54 + b * 3, elN: 74 - b * 3, shF: 26, elF: 80 })),
  block: () => G({ cr: .16, lean: 10, sp: 4, nk: 3, shN: 80, elN: 96, shF: 50, elF: 100 }),
};
const ARTI = {
  idle: k => idleAt(k, (_, b) => G({ cr: .12 + b * .012, lean: 5, sp: 2, nk: 1, hipN: 20, knN: 18, hipF: -16, knF: 20, shN: 40 + b * 3, elN: 66, shF: 22, elF: 70 })),
  fire: k => [G({ cr: .14, lean: 6, sp: 2, nk: 0, hipN: 26, knN: 24, hipF: -28, knF: 12, shN: 76, elN: 18, shF: 46, elF: 70 }),
    G({ cr: .12, lean: 2, sp: 0, nk: 0, hipN: 20, knN: 16, hipF: -30, knF: 8, shN: 82, elN: 22, shF: 40, elF: 74 })][k],
};
const ALQU = {
  idle: k => idleAt(k, (_, b) => G({ cr: .1 + b * .01, lean: 3, sp: 1, nk: 2, hipN: 14, knN: 14, hipF: -12, knF: 14, shN: 52 + b * 2, elN: 96 - b * 3, shF: 22, elF: 70 })),
  fire: k => [G({ cr: .14, lean: -4, sp: -4, nk: -2, hipN: 24, knN: 22, hipF: -22, knF: 18, shN: 150, elN: -40, shF: 40, elF: 70 }),
    G({ cr: .16, lean: 14, sp: 6, nk: 2, hipN: 32, knN: 30, hipF: -28, knF: 12, shN: 96, elN: 6, shF: 30, elF: 70 })][k],
};
const POSE = [PILO, ARTI, ALQU];
const poseDe = i => (anim, k) => { const f = POSE[i][anim]; return f ? f(k) : null; };
const VIENTO = { run: .8, walk: .25, atk1: .4, atk2: .45, atk3: .55, charge: -.1, hit: -.7, launched: .5, victory: .1, transform: -.3, cast: .2, fire: .25 };

// ---------------------------------------------------------------------------------------------
// 3. Datos del fotograma
function info(P, ctx) {
  const { J, L, A } = P, s = L.H / 60, st = ctx.stage, ph = ctx.phase * TAU;
  const aT = A.torsoLean * D, up = [sin(aT), -cos(aT)], fwd = [cos(aT), sin(aT)];
  const ah = A.headAng * D, hu = [sin(ah), -cos(ah)], hf = [cos(ah), sin(ah)];
  const R = L.head * .40;
  const tumbled = Math.abs(ctx.pose.rot || 0) > 25;
  const wind = (VIENTO[ctx.anim] ?? 0) + (st - 1) * .08;
  const gravity = tumbled ? [-up[0], -up[1]] : [0, 1];
  const tp = (f, v) => add(f <= .45 ? mix(J.root, J.spine, f / .45) : mix(J.spine, J.chest, (f - .45) / .55), fwd, v);
  const hp = (x, y) => [J.head[0] + hf[0] * x * R - hu[0] * y * R, J.head[1] + hf[1] * x * R - hu[1] * y * R];
  return { J, L, A, s, st, ph, aT, up, fwd, hu, hf, R, wind, gravity, tp, hp, tumbled, hw: L.hipW / 2, tw: L.torsoW / 2, ctx, golpe: ctx.anim === 'hit' || ctx.anim === 'launched' };
}

// ---------------------------------------------------------------------------------------------
// 4. Piezas
function banda(P, p, d, w, h, mat, tone = 2, o = {}) {
  const n = [d[1], -d[0]], a = add(p, d, h / 2), b = add(p, d, -h / 2);
  return P.poly([add(a, n, w / 2), add(a, n, -w / 2), add(b, n, -w / 2), add(b, n, w / 2)], mat, { shade: 'flat', tone, ...o });
}
const dot = (P, p, m, t, o = {}) => P.line([p, p], m, t, o);
// Engranaje: disco de latón con dientes que giran con la fase del fotograma (8 dientes: la vuelta se cierra en 1/8)
function engranaje(P, p, r, rot, mat = 'brass', teeth = 8) {
  for (let i = 0; i < teeth; i++) { const a = rot + i * TAU / teeth, q = [p[0] + cos(a) * (r + .7), p[1] + sin(a) * (r + .7)]; P.blob(q, 1.0, 1.0, mat, { shade: 'flat', tone: 3 }); }
  P.blob(p, r, r, mat, { shade: 'sphere', line: true });
  P.blob(p, r * .42, r * .42, 'steel', { shade: 'flat', tone: 1 });
  dot(P, add(p, [-.4, -.4]), 'steel', 4);
}
// Cristal turquesa luminoso: junta o piloto que en etapa 2+ se enciende
const luz = (P, c, p) => { if (c.st >= 2) P.emit({ px: [p] }); };

function bota(P, c, S) {
  const { J, L } = P, s = c.s;
  const top = mix(J['ft' + S], J['kn' + S], .5), d = P.dir('leg' + S + '.lower');
  P.cap(top, J['ft' + S], L.shinW * 1.25, L.shinW * 1.05, 'leather');
  banda(P, top, d, L.shinW * 1.5, 1.4 * s, 'brass', 2);
  P.cap(J['heel' + S], J['toe' + S], L.ankle * 2.4, L.ankle * 1.8, 'leather');
  P.blob(add(J['toe' + S], [-.4 * s, -.3 * s]), 2.2 * s, 1.9 * s, 'leather', { shade: 'sphere' });
  P.line([add(J['toe' + S], [-2 * s, -.2 * s]), add(J['toe' + S], [-.2 * s, -.2 * s])], 'steel', 3, { on: 'leather' });
}
function pierna(P, c, S, layer, cl) {
  const { L } = P, s = c.s, st = c.st;
  P.layer(layer);
  P.limb('leg' + S + '.upper', 'leather', L.thighW * 1.1, L.thighW * .92);
  const kn = P.j('kn' + S), d = P.dir('leg' + S + '.upper'), n = [d[1], -d[0]];
  P.limb('leg' + S + '.lower', 'leather', L.shinW * 1.15, L.shinW * .95);
  P.fold([add(kn, d, -1.2), add(kn, n, -2 * s)], 'leather');
  if (st === 3) {                                                                      // exoesqueleto: varilla de acero con pistón de latón y rótula
    const a = add(P.j('hip' + S), d, 2), b = P.j('ft' + S);
    P.cap(a, kn, 1.6 * s, 1.6 * s, 'steel', { shade: 'cyl', line: S === 'N' });
    P.cap(kn, add(b, [0, -2 * s]), 1.6 * s, 1.4 * s, 'steel', { shade: 'cyl', line: S === 'N' });
    P.blob(kn, 1.9 * s, 1.9 * s, 'brass', { shade: 'sphere', line: S === 'N' });
    luz(P, c, kn);
  }
  bota(P, c, S);
  void cl;
}

function falda(P, c, near, o) {
  const { L } = P, { tp, hw, s, wind, gravity: g, ph } = c, back = [-1, 0];
  const len = L.thigh * o.len * (near ? .92 : 1.08);
  const sway = (wind * 5 + sin(ph + (near ? 0 : 1.3)) * 1.0) * s;
  const a = tp(.2, -hw * (near ? 1.05 : .9)), b = tp(.2, hw * (near ? 1.15 : .3));
  const bBot = add(add(b, g, len * (near ? .84 : .9)), back, sway * .5), aBot = add(add(a, g, len * 1.04), back, sway + (near ? 0 : 1.5 * s));
  const mid = add(mix(aBot, bBot, .5), g, 1.2 * s);
  P.smooth([a, mix(a, b, .5), b, bBot, mid, aBot], o.mat, { n: 3, line: near });
  if (near) {
    P.fold([mix(a, b, .4), add(mix(aBot, bBot, .4), g, -2 * s)], o.mat);
    P.line([add(bBot, g, -.5), add(mid, g, -.5), add(aBot, g, -.5)], o.hem, 3, { on: o.mat });
  }
}

// Mochila de artilugio por clase (se pinta detrás del tronco)
function mochila(P, c, cl) {
  const { tp, tw, s, st, ph, wind } = c, o = tp(.72, -tw * 1.18);
  P.layer('body');
  if (cl === 0) {                                                                      // caldera de acero con chimenea, tobera y vapor
    P.cap(add(o, [-1 * s, 6 * s]), add(o, [-1 * s, -6 * s]), 8.6 * s, 8.0 * s, 'steel', { shade: 'cyl', line: true });
    for (const k of [-4, 0, 4]) banda(P, add(o, [-1 * s, k * s]), [0, 1], 8.8 * s, 1.1 * s, 'brass', 3);
    P.cap(add(o, [-3.4 * s, -5.5 * s]), add(o, [-3.4 * s, -13 * s]), 2.6 * s, 2.2 * s, 'steel', { shade: 'cyl', line: true });                // chimenea
    banda(P, add(o, [-3.4 * s, -12.4 * s]), [0, 1], 3.4 * s, 1.2 * s, 'brass', 3);
    P.poly([add(o, [-4 * s, 6 * s]), add(o, [-11 * s - wind * 2, 9 * s]), add(o, [-10 * s - wind * 2, 12 * s]), add(o, [-1 * s, 8 * s])], 'brass', { shade: 'vol', line: true });  // tobera
    for (let i = 0; i < 3; i++) { const k = (ph / TAU + i / 3) % 1; P.blob(add(o, [(-3.4 - k * 3 - wind * 3) * s, (-14 - k * 8) * s]), (1.1 + k * 1.3) * s, (1.1 + k * 1.3) * s, 'steel', { shade: 'flat', tone: 3 - Math.floor(k * 2), }); }
    if (st >= 2) P.emit({ px: [add(o, [-10 * s - wind * 2, 11 * s])] });
  } else if (cl === 1) {                                                               // caja de herramientas con manivela y dos engranajes que giran
    P.poly([add(o, [-5 * s, 6 * s]), add(o, [3 * s, 6 * s]), add(o, [3 * s, -6 * s]), add(o, [-5 * s, -6 * s])], 'leather', { shade: 'vol', line: true });
    banda(P, add(o, [-1 * s, 0]), [0, 1], 8.2 * s, 1.1 * s, 'brass', 3);
    engranaje(P, add(o, [-6 * s, -3 * s]), 3.4 * s, ph / 8 * 1, 'brass');
    engranaje(P, add(o, [-4 * s, -9 * s]), 2.4 * s, -ph / 8 * 1.5 + .2, st >= 2 ? 'teal' : 'steel');
    P.line([add(o, [-1 * s, -6 * s]), add(o, [-1 * s, -11 * s])], 'steel', 3, {});
    if (st >= 2) P.emit({ px: [add(o, [-6 * s, -3 * s]), add(o, [-4 * s, -9 * s])] });
  } else {                                                                             // depósito de cristal con burbujas y tubo a la cintura
    P.blob(add(o, [-1 * s, 0]), 5 * s, 6.6 * s, 'glass', { shade: 'sphere', line: true });
    P.blob(add(o, [-1 * s, 2 * s]), 4 * s, 4.2 * s, 'potion', { shade: 'vol' });
    P.cap(add(o, [-1 * s, -5.6 * s]), add(o, [-1 * s, -9 * s]), 2.4 * s, 2.2 * s, 'glass', { shade: 'cyl', line: true });
    P.blob(add(o, [-1 * s, -10 * s]), 1.8 * s, 1.5 * s, 'brass', { shade: 'sphere' });
    for (let i = 0; i < 3; i++) { const k = (ph / TAU + i / 3) % 1; dot(P, add(o, [(-2 + i * 1.6) * s, (3 - k * 8) * s]), 'potion', 4); }
    P.line([add(o, [3 * s, 4 * s]), add(o, [6 * s, 8 * s]), add(o, [7 * s, 12 * s])], 'brass', 3, {});
    if (st >= 2) P.emit({ px: [add(o, [-2 * s, -1 * s]), add(o, [0, 3 * s])] });
  }
  if (st === 3) {                                                                      // antena del exoesqueleto con luz
    const b = add(o, [-3 * s, -(cl === 0 ? 4 : 7) * s]);
    P.line([b, add(b, [-3 * s - wind, -9 * s])], 'steel', 3, {});
    P.emit({ px: [add(b, [-3 * s - wind, -9.6 * s])] });
  }
}

function torso(P, c, cl) {
  const { tp, tw, hw, s, st, fwd } = c;
  P.layer('body');
  const mat = cl === 1 ? 'teal' : 'coat';
  const sh = [tp(-.02, -hw * .98), tp(.2, -tw * .9), tp(.5, -tw * .86), tp(.78, -tw * 1.0), tp(1.0, -tw * .9), tp(1.12, -tw * .38),
    tp(1.12, tw * .42), tp(1.0, tw * 1.06), tp(.74, tw * 1.16), tp(.46, tw * .84), tp(.2, hw * .96), tp(-.02, hw * 1.02)];
  P.smooth(sh, mat, { n: 3 });
  P.fold([tp(.88, tw * .8), tp(.6, tw * .5)], mat);
  P.fold([tp(.58, -tw * .66), tp(.4, -tw * .5)], mat);
  if (cl === 0) {                                                                      // chaqueta de piloto: placas de latón, manómetro y correas
    P.poly([tp(.9, tw * .1), tp(.9, tw * 1.0), tp(.5, tw * .92), tp(.5, tw * .12)], 'steel', { shade: 'vol', line: true });
    P.blob(tp(.74, tw * .5), 2.4 * s, 2.4 * s, 'brass', { shade: 'sphere', line: true });
    P.blob(tp(.74, tw * .5), 1.4 * s, 1.4 * s, 'glass', { shade: 'flat', tone: 3 });
    P.line([tp(.74, tw * .5), tp(.8, tw * .6)], 'steel', 0, {});
    luz(P, c, tp(.74, tw * .5));
    for (const q of [tp(.88, tw * .2), tp(.88, tw * .9), tp(.52, tw * .9)]) dot(P, q, 'brass', 4);
    P.strip([tp(1.1, -tw * .5), tp(.8, -tw * .1), tp(.5, 0)], 1.8 * s, 1.6 * s, 'leather', { shade: 'cyl', line: true });
  } else if (cl === 1) {                                                               // mandil de cuero con bolsillos y asas de herramientas
    P.smooth([tp(.96, tw * .1), tp(.98, tw * 1.0), tp(.5, tw * 1.08), tp(.4, tw * .4), tp(.5, tw * .1)], 'leather', { n: 2, line: true });
    P.line([tp(.7, tw * .2), tp(.7, tw * 1.0)], 'leather', 1, { on: 'leather' });
    P.line([tp(.72, tw * .6), tp(.72, tw * .6)], 'brass', 3, {});
    for (let i = 0; i < 3; i++) P.line([tp(.88, tw * (.3 + i * .25)), tp(.76, tw * (.3 + i * .25))], 'steel', 3 + (i % 2), { on: 'leather' });
    P.strip([tp(1.12, -tw * .2), tp(.9, tw * .1)], 1.5 * s, 1.5 * s, 'brass', { shade: 'cyl' });
  } else {                                                                             // bata larga, bandolera de viales
    P.strip([tp(1.1, -tw * .3), tp(.8, tw * .5), tp(.5, tw * 1.0)], 2.2 * s, 2.0 * s, 'leather', { shade: 'cyl', line: true });
    for (let i = 0; i < 4; i++) { const q = mix(tp(1.0, -tw * .1), tp(.52, tw * .96), .12 + i * .25); P.blob(add(q, fwd, .8), 1.4 * s, 1.7 * s, i % 2 ? 'potion2' : 'potion', { shade: 'sphere', line: i === 0 }); dot(P, add(q, [-.4, -1.4]), 'glass', 4); }
    if (st >= 2) P.emit({ px: [tp(.86, tw * .45), tp(.62, tw * .8)] });
  }
  P.poly([tp(1.0, -tw * .5), tp(1.16, -tw * .36), tp(1.16, tw * .3), tp(1.0, tw * .62)], cl === 2 ? 'coat' : cl === 1 ? 'teal' : 'leather', { shade: 'vol', line: true });  // cuello alto
  P.poly([tp(.4, -tw * .84), tp(.4, tw * .84), tp(.22, hw * 1.0), tp(.22, -hw * .98)], 'leather', { shade: 'vol', line: true });
  const knot = add(tp(.33, 0), fwd, tw * .4);
  engranaje(P, knot, 1.6 * s, c.ph / 8 * .5, 'brass', 6);                                // hebilla en forma de engranaje
  if (st === 3) {                                                                      // arnés del exoesqueleto sobre el pecho
    P.line([tp(1.12, -tw * .6), tp(.7, -tw * .9), tp(.4, -tw * .8)], 'steel', 3, {});
    P.line([tp(1.14, tw * .5), tp(.9, tw * 1.1), tp(.5, tw * 1.1)], 'steel', 3, {});
    luz(P, c, tp(.9, tw * 1.08));
  }
}

// Cabeza de perfil: cráneo grande y redondo, nariz bulbosa, bigote y barba corta; las gafas ocupan casi toda la cara.
function cabeza(P, c) {
  const { hp, R, J, s } = c;
  P.layer('body');
  P.cap(J.chest, J.head, c.L.head * .3, c.L.head * .28, 'skin', { dt: -1 });
  P.blob(J.head, R * 1.04, R * 1.04, 'skin', { shade: 'flat', tone: 2 });
  P.smooth([hp(.1, -.6), hp(.98, -.46), hp(1.08, -.1), hp(1.46, .34), hp(1.1, .52), hp(1.08, .7), hp(.88, 1.0), hp(.25, 1.04), hp(-.1, .6)], 'skin', { n: 3, shade: 'flat', tone: 3 });
  P.smooth([hp(.0, .5), hp(.8, .66), hp(.9, 1.0), hp(.25, 1.04), hp(-.12, .6)], 'skin', { n: 3, shade: 'flat', tone: 2, on: 'skin' });
  P.blob(hp(.62, .2), R * .3, R * .26, 'skin', { shade: 'flat', tone: 4 });
  P.blob(hp(1.34, .36), R * .32, R * .3, 'skin', { shade: 'sphere' });                                          // nariz de botón
  dot(P, hp(1.42, .26), 'skin', 4, { on: 'skin' });
  P.blob(hp(.02, .3), R * .3, R * .36, 'skin', { shade: 'flat', tone: 3, line: true });                          // oreja redonda
  void s;
}
function barba(P, c, cl) {
  const { hp, R, s, gravity: g, wind } = c, n = cl === 2 ? 1.9 : 1;
  P.layer('top');
  P.smooth([hp(.4, .6), hp(1.1, .66), hp(1.0, 1.0), add(hp(.7, 1.1), g, R * .5 * n), add(hp(.3, 1.0), g, R * .3 * n)], 'hair', { n: 3, line: true });
  P.smooth([hp(.95, .46), hp(1.4, .62), hp(1.2, .88), hp(.8, .74)], 'hair', { n: 3, line: true });             // bigote
  P.line([hp(1.0, .56), hp(1.3, .66)], 'hair', 4, { on: 'hair' });
  void wind; void s;
}
// Gafas grandes: aro de latón, cristal turquesa con brillo y correa. Brillan en etapa 2+.
function gafas(P, c, cl) {
  const { hp, R, s, st } = c, o = hp(.78, -.02), r = R * .58;
  P.layer('top');
  const up = cl === 0 && st < 99 ? 0 : 0;
  P.strip([hp(.2, -.1 + up), hp(-.5, -.2), hp(-1.0, -.3)], 1.6 * s, 1.6 * s, 'leather', { shade: 'cyl', smooth: true, line: true });                // correa
  P.blob(o, r * 1.18, r * 1.18, 'brass', { shade: 'sphere', line: true });
  P.blob(o, r * .82, r * .82, 'glass', { shade: 'vol' });
  P.line([add(o, [-r * .5, -r * .4]), add(o, [-r * .1, -r * .7])], 'glass', 4, { on: 'glass' });
  dot(P, add(o, [-r * .4, -r * .2]), 'white', 0);
  P.eye([o[0] + .3, o[1] - .1], { iris: 'iris', size: 2 });
  if (st >= 2) P.emit({ px: [add(o, [r * .4, r * .3])] });
  banda(P, add(o, [-r * 1.1, 0]), [0, 1], 2.6 * s, 1.2 * s, 'brass', 3);
}

// Sombreros y cascos por clase
function sombrero(P, c, cl) {
  const { hp, R, s, wind, st } = c;
  P.layer('top');
  P.smooth([hp(-.3, .3), hp(-1.1, .1), hp(-1.2, -.8), hp(-.4, -1.2), hp(.6, -1.0), hp(.2, -.3)], 'hair', { n: 3, line: true });                     // pelo
  if (cl === 0) {                                                                      // casco de piloto: cúpula de latón con aletas y luz
    P.smooth([hp(-1.2, .2), hp(-1.3, -.8), hp(-.5, -1.5), hp(.6, -1.5), hp(1.1, -.9), hp(1.1, -.46), hp(.2, -.5), hp(-.6, .0)], 'brass', { n: 3, line: true });
    P.strip([hp(1.1, -.5), hp(.2, -.62), hp(-1.2, -.3)], 1.7 * s, 1.7 * s, 'steel', { shade: 'cyl', smooth: true, line: true });
    P.poly([hp(-.9, -1.1), hp(-1.9 - wind * .4, -1.5), hp(-1.7, -.7), hp(-1.0, -.4)], 'leather', { shade: 'vol', line: true });                     // aleta trasera
    dot(P, hp(.2, -1.2), 'brass', 4); dot(P, hp(.7, -1.0), 'brass', 4);
    P.blob(hp(.1, -1.5), 1.2 * s, 1.2 * s, 'glass', { shade: 'sphere' }); luz(P, c, hp(.1, -1.5));
  } else if (cl === 1) {                                                               // gorra plana con engranaje y visera
    P.smooth([hp(-1.2, -.05), hp(-1.1, -.9), hp(-.2, -1.35), hp(.8, -1.1), hp(1.0, -.6), hp(.2, -.5)], 'teal', { n: 3, line: true });
    P.poly([hp(.6, -.7), hp(1.9, -.64), hp(1.8, -.38), hp(.6, -.44)], 'teal', { shade: 'vol', line: true });
    engranaje(P, hp(.1, -.9), 1.4 * s, c.ph / 8 * .5, 'brass', 6);
    P.line([hp(-.8, -1.0), hp(-.2, -1.25), hp(.5, -1.1)], 'teal', 4, { on: 'teal' });
  } else {                                                                             // gorro puntiagudo que se dobla hacia atrás, con ala ancha y parche
    P.poly([hp(-1.4, -.5), hp(1.7, -.58), hp(1.5, -.3), hp(-1.4, -.22)], 'coat', { shade: 'vol', line: true });
    P.smooth([hp(1.0, -.5), hp(.4, -1.5), hp(-.6, -2.4 - wind * .2), hp(-1.9 - wind * .4, -2.3), hp(-1.3, -1.7), hp(-1.2, -.5)], 'coat', { n: 3, line: true });
    P.fold([hp(.4, -.9), hp(-.4, -1.9)], 'coat'); P.fold([hp(-.4, -.8), hp(-1.0, -1.4)], 'coat');
    banda(P, hp(.2, -.6), [1, 0], 1.4 * s, 4 * s, 'leather', 3);
    P.blob(hp(.6, -1.0), 1.5 * s, 1.5 * s, st >= 2 ? 'potion2' : 'brass', { shade: 'sphere' });
  }
}

function brazo(P, c, S, layer, cl) {
  const { J, L } = P, s = c.s, near = S === 'N', st = c.st;
  P.layer(layer);
  const sh = J['sh' + S], el = J['el' + S], ha = J['ha' + S], dU = P.dir('arm' + S + '.upper'), dL = P.dir('arm' + S + '.lower');
  const manga = cl === 1 ? 'teal' : 'coat';
  P.blob(sh, L.upperW * .62, L.upperW * .62, manga, { shade: 'sphere' });
  P.limb('arm' + S + '.upper', manga, L.upperW * 1.2, L.upperW * 1.05);
  P.fold([add(sh, dU, 2 * s), add(el, dU, -3 * s)], manga);
  if (cl === 0 && near) {                                                              // brazo mecánico: pistón de acero, junta de latón y puño enorme
    P.limb('arm' + S + '.lower', 'steel', L.lowerW * 1.8, L.lowerW * 1.6, { line: true });
    P.blob(el, 2.6 * s, 2.6 * s, 'brass', { shade: 'sphere', line: true });
    P.line([add(el, dL, 1.5 * s), add(ha, dL, -2 * s)], 'steel', 4, { on: 'steel' });
    banda(P, mix(el, ha, .6), dL, L.lowerW * 2, 1.2 * s, 'brass', 3);
    luz(P, c, add(el, [0, 0]));
  } else {
    P.limb('arm' + S + '.lower', 'skin', L.lowerW * 1.1, L.lowerW * .95);
    P.cap(el, mix(el, ha, .62), L.lowerW * 1.5, L.lowerW * 1.9, manga, { shade: 'cyl', line: near });
    banda(P, mix(el, ha, .62), dL, L.lowerW * 1.9, 1.3 * s, 'brass', 2, { line: near });
  }
  if (st === 3 && !(cl === 0 && near)) {                                               // pistón del exoesqueleto en el antebrazo
    P.cap(add(sh, dU, 1 * s), add(ha, dL, -1 * s), 1.3 * s, 1.2 * s, 'steel', { shade: 'cyl', line: near });
    P.blob(el, 1.5 * s, 1.5 * s, 'brass', { shade: 'sphere' }); luz(P, c, el);
  }
  return add(ha, dL, .6 * s);
}
function puño(P, c, p, d, cl, near) {
  const s = c.s;
  if (cl === 0 && near) {
    P.blob(p, 4.6 * s, 4.2 * s, 'steel', { shade: 'sphere', line: true });
    P.blob(add(p, d, 2.6 * s), 2.6 * s, 3.2 * s, 'brass', { shade: 'sphere', line: true });
    for (let i = -1; i <= 1; i++) dot(P, add(add(p, d, 3 * s), [d[1] * i * 1.5, -d[0] * i * 1.5]), 'steel', 0);
  } else P.blob(p, 2.1 * s, 2.0 * s, 'leather', { shade: 'sphere', line: near });
}

// --- armas y artilugios ---
// Taladro del puño: cono de acero con espiral de latón que avanza con la fase; cohete en el antebrazo
function taladro(P, c, hand, d) {
  const s = c.s, n = [d[1], -d[0]], st = c.st, ctx = c.ctx;
  const b = add(hand, d, 5.6 * s), tip = add(b, d, 9 * s);
  P.layer('top');
  P.poly([add(b, n, -3 * s), tip, add(b, n, 3 * s)], 'steel', { shade: 'vol', line: true });
  for (let i = 0; i < 3; i++) { const k = (i + (ctx.phase * 3)) % 3 / 3, q = mix(b, tip, k * .9), w = (1 - k * .9) * 3 * s; P.line([add(q, n, -w), add(add(q, n, w), d, 1.6 * s)], i % 2 ? 'brass' : 'steel', 4, {}); }
  banda(P, b, d, 6.6 * s, 1.4 * s, 'brass', 3);
  const rk = add(add(hand, d, -9 * s), n, 3.6 * s);                                      // cohete propulsor en el antebrazo
  P.cap(rk, add(rk, d, 8 * s), 3.2 * s, 2.6 * s, 'brass', { shade: 'cyl', line: true });
  P.poly([add(add(rk, d, 8 * s), n, -1.6 * s), add(add(rk, d, 11 * s), n, 0), add(add(rk, d, 8 * s), n, 1.6 * s)], 'steel', { shade: 'vol', line: true });
  if (/^atk|charge/.test(ctx.anim) && ctx.frame >= 1) P.emit({ poly: [add(rk, d, -.4 * s), add(add(rk, d, -6 * s), n, -.8 * s), add(add(rk, d, -4 * s), n, .6 * s)] });   // llama del cohete
  if (st >= 2) P.emit({ px: [add(b, d, 2 * s)] });
  P.anchor('muzzle', tip); P.anchor('rod', tip);
  return tip;
}
// Llave inglesa gigante (casi del tamaño del gnomo): mango de acero con cabeza abierta y tuerca
function llave(P, c, hand, d) {
  const s = c.s, n = [d[1], -d[0]], st = c.st, hc = add(hand, d, 15 * s), q = (a, b) => add(add(hc, d, a * s), n, b * s);
  P.layer('top');
  P.cap(add(hand, d, -6 * s), hc, 2.8 * s, 2.6 * s, 'steel', { shade: 'cyl', line: true });
  banda(P, add(hand, d, -2 * s), d, 3.6 * s, 1.2 * s, 'brass', 3);
  P.poly([q(-3, -4.4), q(3, -4.4), q(3.6, -1.4), q(1.2, -1.4), q(1.2, 1.4), q(3.6, 1.4), q(3, 4.4), q(-3, 4.4)], 'steel', { shade: 'vol', line: true });  // mordaza
  P.line([q(-2.6, -4.2), q(2.8, -4.2)], 'steel', 4, { on: 'steel' });
  dot(P, q(-1, 0), 'brass', 4); dot(P, q(-1, 2.6), 'brass', 3);
  if (st >= 2) P.emit({ px: [q(2, -4.2)] });
  P.anchor('rod', hc); P.anchor('muzzle', hc);
  return hc;
}
// Torreta en el hombro: base de latón, cañón turquesa que gira hacia el objetivo. Fogonazo en el disparo.
function torreta(P, c, cl) {
  const { J, L, s, ctx, st } = c, sh = J.shN, o = add(sh, [-.5 * s, -L.upperW * .9 - 2 * s]);
  const aim = ctx.anim === 'fire' ? (ctx.frame === 0 ? -8 : -3) : -12 + sin(c.ph) * 4, u = [cos(aim * D), sin(aim * D)];
  P.layer('top');
  P.blob(o, 2.8 * s, 2.0 * s, 'brass', { shade: 'sphere', line: true });
  const tip = add(o, u, 9 * s);
  P.cap(add(o, u, 1 * s), tip, 3 * s, 2.4 * s, 'teal', { shade: 'cyl', line: true });
  banda(P, add(o, u, 5 * s), u, 3.6 * s, 1.1 * s, 'brass', 3);
  P.blob(add(o, [0, -1.6 * s]), 1.2 * s, 1.2 * s, 'glass', { shade: 'sphere' });
  if (ctx.anim === 'fire' && ctx.frame === 0) P.emit({ poly: [add(tip, [0, -1.4]), add(tip, [6 * s, -.4]), add(tip, [3 * s, .4]), add(tip, [5.4 * s, 2.2]), add(tip, [0, 1.4])] });
  if (st >= 2) P.emit({ px: [add(o, [0, -1.6 * s])] });
  P.anchor('turret', tip);
  void cl;
}
// Dron: cuerpo de acero con dos hélices que parpadean y una luz turquesa. Flota junto a la cabeza.
function dron(P, c) {
  const { hp, s, ph, st } = c, p = add(hp(2.6, -1.6), [0, sin(ph) * 1.4 * s]);
  P.layer('top');
  P.blob(p, 3 * s, 2.1 * s, 'steel', { shade: 'sphere', line: true });
  P.blob(add(p, [0, 1.2 * s]), 1.2 * s, 1.0 * s, 'glass', { shade: 'sphere' });
  P.line([add(p, [-4 * s, -2.6 * s]), add(p, [-1 * s, -2.6 * s])], 'steel', Math.floor(ph / TAU * 4) % 2 ? 4 : 2, {});
  P.line([add(p, [1 * s, -2.6 * s]), add(p, [4 * s, -2.6 * s])], 'steel', Math.floor(ph / TAU * 4) % 2 ? 2 : 4, {});
  P.line([add(p, [-2 * s, -1.4 * s]), add(p, [-2 * s, -2.6 * s])], 'steel', 1, {}); P.line([add(p, [2 * s, -1.4 * s]), add(p, [2 * s, -2.6 * s])], 'steel', 1, {});
  if (st >= 2) P.emit({ px: [add(p, [0, 1.2 * s])] });
}
// Frasco de poción: botella redonda de cristal con líquido, cuello de latón y corcho. Se muestra hasta que se lanza.
function frasco(P, c, hand, d, tipo) {
  const s = c.s, st = c.st, ctx = c.ctx, u = [d[0] * .4, -.7 + d[1] * .4], l = Math.hypot(u[0], u[1]) || 1, v = [u[0] / l, u[1] / l], n = [v[1], -v[0]];
  const o = add(hand, v, 5 * s), liq = tipo ? 'potion2' : 'potion';
  P.layer('top');
  P.blob(o, 4.6 * s, 4.6 * s, 'glass', { shade: 'sphere', line: true });
  P.blob(add(o, [0, 1.2 * s]), 3.6 * s, 3.4 * s, liq, { shade: 'vol' });
  P.line([add(o, [-2.6 * s, -1.6 * s]), add(o, [-1.2 * s, -3 * s])], 'glass', 4, { on: 'glass' });
  P.cap(add(o, v, 3.8 * s), add(o, v, 7 * s), 2.4 * s, 2.2 * s, 'glass', { shade: 'cyl', line: true });
  P.cap(add(o, v, 6.6 * s), add(o, v, 8.4 * s), 2.2 * s, 2.0 * s, 'leather', { shade: 'cyl', line: true });
  banda(P, add(o, v, 5 * s), v, 3.2 * s, 1 * s, 'brass', 3);
  const k = (c.ph / TAU) % 1;
  dot(P, add(o, [(-1 + k * 2) * s, (1 - k * 4) * s]), liq, 4);
  if (st >= 2) P.emit({ px: [add(o, n, 1 * s), add(o, v, 9.6 * s + k * 2)] });                                     // burbujas que brillan
  P.anchor('muzzle', o); P.anchor('rod', o);
  void ctx;
  return o;
}

// ---------------------------------------------------------------------------------------------
// 5. Dibujo de cada clase
const fa = [{ len: .5, mat: 'coat', hem: 'brass' }, { len: .46, mat: 'teal', hem: 'brass' }, { len: 1.0, flare: 1, mat: 'coat', hem: 'brass' }];
function dibujar(P, ctx, cl) {
  const c = info(P, ctx), { J, s } = c, anim = ctx.anim;
  mochila(P, c, cl);
  pierna(P, c, 'F', 'far', cl);
  brazo(P, c, 'F', 'far', cl);
  puño(P, c, add(J.haF, P.dir('armF.lower'), .5 * s), P.dir('armF.lower'), cl, false);
  falda(P, c, false, fa[cl]);
  torso(P, c, cl);
  const patada = c.A['legN.upper'] > 55;
  if (patada) { falda(P, c, true, fa[cl]); pierna(P, c, 'N', 'near', cl); } else { pierna(P, c, 'N', 'near', cl); falda(P, c, true, fa[cl]); }
  cabeza(P, c);
  barba(P, c, cl);
  sombrero(P, c, cl);
  gafas(P, c, cl);
  if (cl === 1) { torreta(P, c, cl); dron(P, c); }
  const hand = brazo(P, c, 'N', 'near', cl), d = P.dir('armN.lower');
  if (cl === 0) { taladro(P, c, hand, d); puño(P, c, hand, d, 0, true); }
  else if (cl === 1) { llave(P, c, hand, d); puño(P, c, hand, d, 1, true); }
  else {
    if (!(anim === 'fire' && ctx.frame >= 1)) frasco(P, c, hand, d, ctx.frame % 2 && anim === 'cast' ? 1 : 0);
    else P.anchor('muzzle', add(hand, [12 * s, -3 * s]));
    puño(P, c, hand, d, 2, true);
  }
  if (cl === 0 && anim.startsWith('atk') && ctx.frame === 1) {                         // chispas de metal en el impacto
    const r = ctx.rng, o = add(hand, d, 16 * s);
    for (let i = 0; i < 4; i++) { const a = r() * TAU, dd = 3 + r() * 4; P.emit({ px: [[o[0] + cos(a) * dd + 2, o[1] + sin(a) * dd]] }); }
  }
  P.anchor('haN', hand);
  P.anchor('head', J.head);
}

// ---------------------------------------------------------------------------------------------
// 6. Efectos vivos. Contrato real de render/scene.js: c = { x, y (pies), w, h, t (ms), lite, face, alpha, idx, variant }.
const px = (g, x, y, col, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.globalAlpha = 1; };
const escala = c => Math.max(.8, Math.min(1.3, (c.h || 64) / 64));
const PAL_FX = [['#e0ffff', '#5ae8e0', '#2ab0b0'], ['#fff0d0', '#ffc880', '#e0a060']];
// Engranaje de píxeles: aro de 8 dientes que gira (rot en radianes)
function gear(g, x, y, r, rot, col, a) {
  for (let i = 0; i < 8; i++) { const an = rot + i * TAU / 8; px(g, x + cos(an) * (r + 1), y + sin(an) * (r + 1), col, a); }
  for (let i = 0; i < 10; i++) { const an = i * TAU / 10; px(g, x + cos(an) * r * .6, y + sin(an) * r * .6, col, a * .8); }
}
const fx = {
  back(g, c, stage) {
    if (stage < 2) return;
    const t = c.t / 1000, s = escala(c), pal = PAL_FX[c.variant ? 1 : 0];
    g.save(); g.translate(c.x, c.y);
    // dos engranajes de píxeles que giran despacio detrás (≤ 0,5 vuelta/s) y chispas que saltan
    const n = c.lite ? 1 : 2;
    for (let i = 0; i < n; i++) gear(g, (-16 - i * 10) * s * c.face, (-30 + i * 9) * s, (4 - i) * s, t * (i ? -1.2 : .9), pal[i + 1], .75);
    if (stage === 3 && !c.lite) for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * .4; px(g, cos(a) * 20 * s, sin(a) * 6 * s, pal[2], .5); }
    g.restore();
  },
  front(g, c, stage) {
    if (stage < 2) return;
    const t = c.t / 1000, s = escala(c), pal = PAL_FX[c.variant ? 1 : 0];
    g.save(); g.translate(c.x, c.y);
    if (!c.lite) {                                                                       // chispa turquesa cada ~0,7 s
      const f = t * 1.4, k = Math.floor(f), ph = f - k;
      if (ph < .45) for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + k; px(g, ((k * 23 + (c.idx || 0) * 9) % 17 - 8) * s * c.face + cos(a) * ph * 7, -(10 + (k * 11) % 20) * s + sin(a) * ph * 6 + ph * ph * 5, pal[i % 3], 1 - ph / .45); }
    }
    if (stage === 3) {                                                                   // drones en órbita alrededor de la cabeza (2; con lite, uno)
      const n = c.lite ? 1 : 2;
      for (let i = 0; i < n; i++) {
        const a = t * .9 + i * Math.PI, X = cos(a) * 15 * s, Y = -42 * s + sin(a) * 4 * s, back = sin(a) < 0, bl = Math.floor(t * 8 + i) % 2;
        const al = back ? .55 : 1;
        for (let dx = -2; dx <= 2; dx++) px(g, X + dx, Y, '#76889c', al);
        px(g, X, Y + 1, pal[1], al); px(g, X - 1, Y + 1, '#3c4a5c', al); px(g, X + 1, Y + 1, '#3c4a5c', al);
        px(g, X - 2 + bl * 4, Y - 1, '#e4f0fa', al * .8);
        px(g, X, Y + 2, pal[0], al);
      }
    }
    g.restore();
  },
};
// Remate de la transformación: un anillo de engranajes que gira y se abre, con lluvia de chispas turquesa
function transformFx(g, c, k) {
  const s = escala(c), pal = PAL_FX[c.variant ? 1 : 0];
  g.save(); g.translate(c.x, c.y);
  const r = (8 + 30 * Math.min(1, k * 1.3)) * s;
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + k * 4; gear(g, cos(a) * r, -26 * s + sin(a) * r * .5, 3 * s, k * 8 + i, pal[i % 3], Math.max(0, 1 - k)); }
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, rr = (4 + k * 32) * s; px(g, cos(a) * rr, sin(a) * rr * .3, pal[i % 3], Math.max(0, 1 - k)); }
  g.restore();
}

// ---------------------------------------------------------------------------------------------
const CUERPO = [{ body: 'menudo', height: 44, shoulder: 1.1, headScale: 1.0 }, { body: 'menudo', height: 44, shoulder: 1.0, headScale: 1.0 }, { body: 'menudo', height: 44, shoulder: .96, headScale: 1.0 }];
const ANC = ['haN', 'haF', 'head', 'chest', 'muzzle', 'rod', 'turret'];
export default {
  id: 'gnomos',
  kit: 1,
  ready: true,
  materials: ['skin', 'hair', 'coat', 'teal', 'brass', 'steel', 'leather', 'glass', 'potion', 'potion2', 'iris'],
  ramps(variant, stage) {
    const v = variant ? 1 : 0, st = Math.max(1, Math.min(3, stage || 1)), pick = k => RAMPAS[k][Math.min(v, RAMPAS[k].length - 1)];
    return {
      skin: ramp5(pick('skin')), hair: ramp5(pick('hair')), coat: ramp5(pick('coat')), teal: ramp5(pick('teal')), brass: ramp5(pick('brass')), steel: ramp5(pick('steel')),
      leather: ramp5(pick('leather')), glass: ramp5(pick('glass')), potion: ramp5(pick('potion')), potion2: ramp5(pick('potion2')),
      iris: ramp5([IRIS[st - 1][0], IRIS[st - 1][1], IRIS[st - 1][2], '#ffffff', '#ffffff']),
    };
  },
  emit: variant => EMIT[variant ? 1 : 0],
  geomStage: s => s,
  extraAnims: {},
  extraPoses: {},
  classes: [
    { id: 'piloto', name: 'Piloto de mecha', build: CUERPO[0], anchors: ANC, pose: poseDe(0), draw: (P, ctx) => dibujar(P, ctx, 0) },
    { id: 'artifice', name: 'Artífice', build: CUERPO[1], anchors: ANC, pose: poseDe(1), draw: (P, ctx) => dibujar(P, ctx, 1) },
    { id: 'alquimista', name: 'Alquimista', build: CUERPO[2], anchors: ANC, pose: poseDe(2), draw: (P, ctx) => dibujar(P, ctx, 2) },
  ],
  stageScale: [1, 1, 1.06],
  fx,
  transformFx,
};
