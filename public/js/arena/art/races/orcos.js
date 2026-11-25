// Raza «orcos» · Tribus del Colmillo (paquete A-ORC). Arte 16 bits propio, 3 etapas y variantes A/B.
// Piel pardo-rojiza (nunca verde), hueso, cuero y rojo sangre. Colmillos cortos y pelo negro hacia atrás.
// Clases: 0 Berserker (dos hachas, torso desnudo y arneses), 1 Cazador (jabalina, carcaj a la espalda), 2 Chamán (tótem y pieles).
// Guía: docs/arena-estilo-16bits.md. Solo se importa de '../kit16/*'. Sin Math.random (usa ctx.rng).
// Orden del archivo: 1 paleta · 2 poses · 3 datos del fotograma · 4 piezas · 5 dibujo de cada clase · 6 efectos vivos.
//   Etapa 1 Formación · 2 Sangre Hirviente (marcas de guerra rojas que brillan, pelo más largo, vapor) ·
//   3 Furia Ancestral (×1,15, armadura de hueso, tótems espectrales, ojos blancos).
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------------------------------------------------------------------------------------------
// 1. Paleta (spec: piel #a8704a, rojo sangre #8a2a1a, hueso #e8dcc0). [sombra profunda, sombra, base, luz, brillo]. B = piel grisácea, ropa parda y pelo castaño.
const RAMPAS = {
  skin:    [['#4e2418', '#7e4430', '#a8704a', '#cc9468', '#eebc92'], ['#4a3a34', '#6c5448', '#8a6a58', '#a88a76', '#cfb09a']],
  hair:    [['#08060a', '#1a1410', '#2e2420', '#4a3a32', '#725a4a'], ['#2a1208', '#4e2610', '#6a3a1e', '#8e5a30', '#b88450']],
  bone:    [['#4a4034', '#8a7e68', '#e8dcc0', '#f6eed8', '#ffffff'], ['#5a4a2a', '#a08c58', '#e8d49a', '#f8ecc0', '#ffffff']],
  cloth:   [['#2a0a08', '#521610', '#8a2a1a', '#b44a30', '#e07a58'], ['#241a12', '#42301e', '#5a4a3a', '#7e6a54', '#a89478']],
  leather: [['#14100c', '#2c2018', '#4a3626', '#6c5038', '#94704c']],
  iron:    [['#14161c', '#2e323c', '#566070', '#8896a8', '#c8d4e0']],
  fur:     [['#1c1410', '#3a2a22', '#6a523e', '#94785a', '#c0a07c'], ['#2a2420', '#4a4038', '#786a58', '#a49478', '#d0c0a0']],
  paint:   [['#3a0806', '#7a1410', '#c02a1c', '#ff5a3a', '#ffb090']],
  spirit:  [['#1a2e4a', '#3a6a9a', '#8ac8e8', '#c8f0ff', '#ffffff']],
};
const IRIS = [['#4a3a08', '#a8860c', '#e8c030'], ['#6a4208', '#d09a18', '#ffd848'], ['#c8c8d0', '#f0f0f8', '#ffffff']];
const EMIT = ['#ff6a4a', '#ffa070'];

// ---------------------------------------------------------------------------------------------
// 2. Poses propias. Ángulos: 0 = colgando, 90 = al frente, 180 = arriba. Los orcos van agachados, con el torso adelantado.
const G = o => ({ pl: 'NF', ...o });
const idleAt = (k, f) => f(k, [0, .5, 1, .5][k]);
const BERS = {
  idle: k => idleAt(k, (_, b) => G({ cr: .17 + b * .015, lean: 10 + b, sp: 4, nk: -2, hipN: 28, knN: 26, hipF: -24, knF: 28, shN: 40 + b * 3, elN: 74 - b * 3, shF: 28 - b * 2, elF: 86 + b * 3 })),
  block: () => G({ cr: .2, lean: 12, sp: 5, nk: 3, shN: 74, elN: 112, shF: 60, elF: 124 }),
  charge: k => [{ shN: -30, elN: 50, shF: -40, elF: 52 }, { shN: 70, elN: 18, shF: 66, elF: 22 }, { shN: 84, elN: 74, shF: 78, elF: 86 }][k],
};
const CAZA = {
  idle: k => idleAt(k, (_, b) => G({ cr: .12 + b * .01, lean: 6, sp: 2, nk: 0, hipN: 22, knN: 20, hipF: -18, knF: 20, shN: 34 + b * 2, elN: 56, shF: 50, elF: 58 })),
  fire: k => [G({ cr: .17, lean: -6, sp: -5, nk: -1, hipN: 30, knN: 24, hipF: -30, knF: 20, shN: 152, elN: -62, shF: 82, elF: 12 }),
    G({ cr: .2, lean: 20, sp: 7, nk: 3, hipN: 42, knN: 40, hipF: -34, knF: 8, shN: 98, elN: 4, shF: 30, elF: 70 })][k],
  charge: k => [{ shN: 150, elN: -60 }, { shN: 156, elN: -64 }, { shN: 160, elN: -70 }][k],
};
const CHAM = {
  idle: k => idleAt(k, (_, b) => G({ cr: .1 + b * .01, lean: 4, sp: 1, nk: 1, hipN: 14, knN: 14, hipF: -12, knF: 14, shN: 24 + b * 2, elN: 66, shF: 44, elF: 76 + b * 3 })),
  cast: k => [G({ cr: .12, lean: 2, sp: 0, hipN: 18, knN: 16, hipF: -16, knF: 16, shN: 40, elN: 60, shF: 40, elF: 70 }),
    G({ cr: .13, lean: 0, sp: -2, nk: -2, hipN: 18, knN: 16, hipF: -16, knF: 16, shN: 126, elN: 24, shF: 100, elF: 40 }),
    G({ cr: .15, lean: -6, sp: -6, nk: -6, hipN: 20, knN: 20, hipF: -18, knF: 18, shN: 170, elN: 6, shF: 160, elF: 14 }),
    G({ cr: .14, lean: 6, sp: 3, nk: 1, hipN: 24, knN: 22, hipF: -22, knF: 14, shN: 100, elN: 6, shF: 96, elF: 10 })][k],
};
const POSE = [BERS, CAZA, CHAM];
const poseDe = i => (anim, k) => { const f = POSE[i][anim]; return f ? f(k) : null; };
const VIENTO = { run: 1, walk: .3, atk1: .55, atk2: .6, atk3: .7, charge: -.15, hit: -.9, launched: .5, victory: .1, transform: -.3, cast: .2, fire: .3 };

// ---------------------------------------------------------------------------------------------
// 3. Datos del fotograma
function info(P, ctx) {
  const { J, L, A } = P, s = L.H / 60, st = ctx.stage, ph = ctx.phase * TAU;
  const aT = A.torsoLean * D, up = [sin(aT), -cos(aT)], fwd = [cos(aT), sin(aT)];
  const ah = A.headAng * D, hu = [sin(ah), -cos(ah)], hf = [cos(ah), sin(ah)];
  const R = L.head * .40;
  const tumbled = Math.abs(ctx.pose.rot || 0) > 25;
  const wind = (VIENTO[ctx.anim] ?? 0) + (st - 1) * .12;
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
// Marca de guerra (etapa 2+): línea de pintura roja sobre la piel, con un píxel emisivo al final
function marca(P, c, pts, glow = true) { P.line(pts, 'paint', 3, { on: 'skin' }); if (glow && c.st >= 2) P.emit({ px: [pts[pts.length - 1]] }); }

function bota(P, c, S, cl) {
  const { J, L } = P, s = c.s;
  const top = mix(J['ft' + S], J['kn' + S], .45), d = P.dir('leg' + S + '.lower');
  P.cap(top, J['ft' + S], L.shinW * 1.2, L.shinW * 1.0, 'leather');
  banda(P, top, d, L.shinW * 1.4, 2 * s, 'fur', 2);                                         // peúcos de piel
  banda(P, mix(top, J['ft' + S], .6), d, L.shinW * 1.3, 1.1 * s, 'leather', 4);
  P.cap(J['heel' + S], J['toe' + S], L.ankle * 2.2, L.ankle * 1.6, 'leather');
  P.blob(add(J['toe' + S], [-.5 * s, -.3 * s]), 2.2 * s, 1.9 * s, 'leather', { shade: 'sphere' });
  void cl;
}
function pierna(P, c, S, layer, cl) {
  const { L } = P, s = c.s;
  P.layer(layer);
  P.limb('leg' + S + '.upper', 'skin', L.thighW * 1.1, L.thighW * .92);
  const kn = P.j('kn' + S), d = P.dir('leg' + S + '.upper'), n = [d[1], -d[0]];
  P.limb('leg' + S + '.lower', cl === 1 ? 'leather' : 'skin', L.shinW * 1.15, L.shinW * .95);
  P.fold([add(kn, d, -2), add(kn, n, -3 * s)], 'skin');
  if (cl === 1) banda(P, add(kn, d, 1), d, L.thighW * 1.2, 1.2 * s, 'leather', 3);
  bota(P, c, S, cl);
  if (c.st >= 2) marca(P, c, [add(kn, d, -3 * s), add(kn, d, 2 * s)], false);
}

// Taparrabos y tiras de cuero (Berserker), faldón de pieles (Cazador, Chamán)
function falda(P, c, near, o) {
  const { L } = P, { tp, hw, s, wind, gravity: g, ph } = c, back = [-1, 0];
  const len = L.thigh * o.len * (near ? .92 : 1.08);
  const sway = (wind * 6 + sin(ph + (near ? 0 : 1.3)) * 1.1) * s, fl = (o.flare || 0) * s;
  const a = tp(.2, -hw * (near ? 1.05 : .9)), b = tp(.2, hw * (near ? 1.15 : .3));
  const bBot = add(add(add(b, g, len * (near ? .84 : .9)), back, sway * .5), [1, 0], near ? fl : fl * .4);
  const aBot = add(add(a, g, len * 1.04), back, sway + (near ? 0 : 2 * s) + fl * .5);
  const mid = add(mix(aBot, bBot, .5), g, 1.4 * s);
  P.smooth([a, mix(a, b, .5), b, bBot, mid, aBot], o.mat, { n: 3, line: near });
  if (near) {
    P.fold([mix(a, b, .35), add(mix(aBot, bBot, .35), g, -2 * s)], o.mat);
    P.fold([mix(a, b, .72), add(mix(aBot, bBot, .72), g, -3 * s)], o.mat);
    for (let i = 0; i < 3; i++) { const q = add(mix(aBot, bBot, .2 + i * .3), g, 0); P.line([add(q, g, -3 * s), add(q, g, 1.6 * s)], o.hem, 3, { on: o.mat }); }     // flecos con huesillos
    dot(P, add(mid, g, -1), 'bone', 3);
  }
}

function torso(P, c, cl) {
  const { tp, tw, hw, s, st } = c;
  P.layer('body');
  const sh = [tp(-.02, -hw * .98), tp(.2, -tw * .9), tp(.5, -tw * .86), tp(.78, -tw * 1.08), tp(1.0, -tw * .96), tp(1.12, -tw * .4),
    tp(1.12, tw * .44), tp(1.0, tw * 1.14), tp(.74, tw * 1.26), tp(.46, tw * .9), tp(.2, hw * .98), tp(-.02, hw * 1.04)];
  P.smooth(sh, 'skin', { n: 3 });
  // músculo: pectoral, serratos y abdominales
  P.fold([tp(.92, tw * .96), tp(.82, tw * .58), tp(.9, tw * .2)], 'skin');
  P.fold([tp(.76, tw * 1.08), tp(.66, tw * .8)], 'skin');
  P.line([tp(.62, tw * .5), tp(.44, tw * .46)], 'skin', 1, { on: 'skin' });
  P.line([tp(.56, tw * .1), tp(.38, tw * .1)], 'skin', 1, { on: 'skin' });
  P.line([tp(1.0, -tw * .3), tp(.9, tw * .7)], 'skin', 4, { on: 'skin' });
  P.fold([tp(.62, -tw * .7), tp(.42, -tw * .5)], 'skin');
  if (cl === 0) {                                                                   // arneses cruzados con aro de hueso, sin camisa
    P.strip([tp(1.12, -tw * .1), tp(.82, tw * .55), tp(.5, tw * 1.0)], 2.6 * s, 2.4 * s, 'leather', { shade: 'cyl', line: true });
    P.strip([tp(1.1, tw * .8), tp(.78, tw * .2), tp(.5, -tw * .5)], 2.4 * s, 2.2 * s, 'leather', { shade: 'cyl', line: true });
    P.blob(tp(.8, tw * .4), 2.4 * s, 2.4 * s, 'bone', { shade: 'sphere', line: true });
    dot(P, tp(.8, tw * .4), 'leather', 0);
    if (st >= 2) { marca(P, c, [tp(.95, tw * .9), tp(.8, tw * 1.0), tp(.7, tw * .9)]); marca(P, c, [tp(.6, tw * .2), tp(.5, tw * .35)]); }
  } else if (cl === 1) {                                                            // chaleco de piel con lazos y colmillo colgado
    P.smooth([tp(.34, -tw * .84), tp(.62, -tw * .96), tp(1.0, -tw * .86), tp(1.04, tw * .2), tp(.88, tw * 1.1), tp(.62, tw * 1.22), tp(.4, tw * .86)], 'leather', { n: 3, line: true });
    P.line([tp(1.02, tw * .1), tp(.7, tw * .2), tp(.45, tw * .1)], 'leather', 1, { on: 'leather' });
    for (let i = 0; i < 3; i++) dot(P, tp(.9 - i * .14, tw * .22), 'bone', 4);
    P.fold([tp(.9, tw * .8), tp(.62, tw * .6)], 'leather');
    P.blob(tp(.96, tw * .5), 1.5 * s, 2.1 * s, 'bone', { shade: 'sphere', line: true });                      // colmillo
    if (st >= 2) marca(P, c, [tp(1.1, tw * .5), tp(1.0, tw * .85)]);
  } else {                                                                          // mantón de pieles sobre el pecho y collar de huesos
    P.smooth([tp(.62, -tw * 1.0), tp(1.08, -tw * 1.1), tp(1.2, -tw * .2), tp(1.2, tw * .5), tp(.96, tw * 1.24), tp(.7, tw * .9), tp(.78, tw * .2)], 'fur', { n: 3, line: true });
    for (let i = 0; i < 5; i++) P.line([tp(.7 - .02 * i, -tw * .9 + i * tw * .34), add(tp(.5 - .03 * i, -tw * .9 + i * tw * .34), [0, 0])], 'fur', i % 2 ? 4 : 1, { on: 'fur' });
    for (let i = 0; i < 4; i++) P.blob(tp(.94 - i * .06, tw * (.1 + i * .22)), 1.3 * s, 1.5 * s, 'bone', { shade: 'sphere', line: i === 1 });   // collar
    if (st >= 2) marca(P, c, [tp(1.0, tw * .1), tp(.84, tw * .2), tp(.7, tw * .1)]);
  }
  if (st === 3 && cl !== 2) {                                                       // armadura de hueso: placas de costillas
    for (let i = 0; i < 3; i++) P.strip([tp(.88 - i * .14, tw * .9), tp(.84 - i * .14, tw * .2), tp(.8 - i * .14, -tw * .4)], 1.8 * s, 1.5 * s, 'bone', { shade: 'cyl', smooth: true, line: i === 0 });
  }
  // cinto con calavera de hueso
  const w0 = tp(.33, 0), knot = add(w0, c.fwd, tw * .42);
  P.poly([tp(.4, -tw * .86), tp(.4, tw * .86), tp(.22, hw * 1.04), tp(.22, -hw * 1.0)], 'leather', { shade: 'vol', line: true });
  P.blob(knot, 2.6 * s, 2.4 * s, 'bone', { shade: 'sphere', line: true });
  dot(P, add(knot, [-.8 * s, -.4 * s]), 'leather', 0); dot(P, add(knot, [.9 * s, -.4 * s]), 'leather', 0);
}

// Cabeza de perfil: mandíbula pesada, frente baja, dos colmillos cortos de hueso.
function cabeza(P, c) {
  const { hp, R, J, s, st } = c;
  P.layer('body');
  P.cap(J.chest, J.head, c.L.head * .4, c.L.head * .36, 'skin', { dt: -1 });
  P.blob(J.head, R, R * 1.05, 'skin', { shade: 'flat', tone: 2 });
  P.smooth([hp(.1, -.6), hp(.94, -.5), hp(1.1, -.06), hp(1.2, .3), hp(1.1, .46), hp(1.3, .86), hp(1.1, 1.14), hp(.3, 1.14), hp(-.1, .6)], 'skin', { n: 3, shade: 'flat', tone: 3 });
  P.smooth([hp(.0, .5), hp(.8, .66), hp(1.1, 1.1), hp(.25, 1.14), hp(-.12, .6)], 'skin', { n: 3, shade: 'flat', tone: 2, on: 'skin' });
  P.blob(hp(.62, .16), R * .34, R * .26, 'skin', { shade: 'flat', tone: 4 });
  P.blob(hp(1.22, .3), R * .22, R * .2, 'skin', { shade: 'sphere' });                                           // nariz chata
  P.smooth([hp(-.16, .05), hp(-.7, -.15), hp(-.2, .55)], 'skin', { n: 2, shade: 'flat', tone: 2, line: true });  // oreja caída hacia atrás
  const t = st >= 2 ? 1.25 : 1;                                                                                // colmillos
  P.poly([hp(.82, .78), hp(.96, .72 - .5 * t), hp(1.08, .78)], 'bone', { shade: 'flat', tone: 3, line: true });
  P.poly([hp(1.1, .84), hp(1.24, .78 - .46 * t), hp(1.32, .88)], 'bone', { shade: 'flat', tone: 3 });
  P.line([hp(.5, 1.06), hp(1.1, 1.0)], 'skin', 1, { on: 'skin' });                                             // pliegue del mentón
  if (st >= 2) P.line([hp(.5, .2), hp(.9, .4)], 'paint', 3, { on: 'skin' });                                    // franja de guerra en la mejilla
  void s;
}
function ojo(P, c) {
  const { hp, st } = c, e = hp(.7, -.02), golpe = c.golpe;
  P.layer('top');
  P.eye([e[0] - .4, e[1] - .2], { iris: 'iris', size: 2 });
  P.line([hp(.3, golpe ? -.6 : -.4), hp(.74, -.24), hp(1.1, golpe ? -.34 : -.08)], 'hair', 0, { on: 'skin' });        // ceja gruesa y oblicua
  P.line([hp(.6, -.34), hp(1.0, -.2)], 'hair', 2, { on: 'skin' });
  const m = hp(.84, .64); P.line([m, [m[0] - 2, m[1] + (golpe ? 1 : 0)]], 'skin', 0, { on: 'skin' });
  if (st === 3) dot(P, e, 'white', 0);
}

// Pelo: Berserker, cresta hacia atrás y coleta; Cazador, melena con diadema; Chamán, cráneo de carnero con plumas.
function hebra(P, c, root, { ang, len, curve = 0, sway = 0 }, tone, off = [-1, -1]) {
  const pts = [], n = 5; let p = root.slice();
  for (let i = 0; i <= n; i++) {
    pts.push(add(p, off));
    if (i < n) { const k = (i + 1) / n, a = (ang + curve * k + sway * sin(c.ph + k * 2.4) * k) * D; p = [p[0] + sin(a) * len / n, p[1] + cos(a) * len / n]; }
  }
  P.line(pts, 'hair', tone, { on: 'hair' });
}
function pelo(P, c, cl) {
  const { hp, R, s, wind, st } = c, a0 = -10 - wind * 34, ext = 1 + (st - 1) * .22;
  P.layer('body');
  if (cl === 2) {                                                                   // greñas bajo el cráneo
    P.lock(hp(-.8, -.3), { n: 4, ang: a0, len: R * 2.4, w: R * 1.2, w1: 1.4, curve: 14, sway: 3 }, 'hair', { dt: -1, line: true });
    P.lock(hp(-.6, .1), { n: 4, ang: a0 - 6, len: R * 2, w: R * 1, w1: 1.4, curve: 12, sway: 3 }, 'hair', { line: true });
    hebra(P, c, hp(-.8, -.3), { ang: a0, len: R * 2.2, curve: 14, sway: 3 }, 4);
    return;
  }
  P.smooth([hp(.1, -1.0), hp(-.9, -1.0), hp(-1.4, -.2), hp(-1.3, .5), hp(-.8, .9), hp(-.2, .6), hp(.05, 0)], 'hair', { n: 3, line: true });
  const L1 = (cl === 0 ? 20 : 24) * s * ext;
  P.lock(hp(-1.0, -.5), { n: 4, ang: a0 - 4, len: L1, w: R * 1.3, w1: 1.2, curve: 22, sway: 3 + st }, 'hair', { line: true });
  P.lock(hp(-.8, .1), { n: 4, ang: a0 - 10, len: L1 * .75, w: R * 1.0, w1: 1.2, curve: 18, sway: 3 + st }, 'hair', { dt: -1, line: true });
  hebra(P, c, hp(-1.0, -.5), { ang: a0 - 4, len: L1, curve: 22, sway: 3 + st }, 4);
  hebra(P, c, hp(-.8, .1), { ang: a0 - 10, len: L1 * .7, curve: 18, sway: 3 }, 0, [1, 1]);
  if (cl === 0) banda(P, add(hp(-1.0, -.5), [-L1 * .26, L1 * .18]), [-.6, .8], R * .9, 1.6 * s, 'bone', 3);
  else for (let i = 0; i < 3; i++) dot(P, add(hp(-1.2, .2 + i * .1), [-i * 2 * s, i * 5 * s]), 'bone', 4);
}
function cimera(P, c, cl) {
  const { hp, R, s, wind, st } = c;
  P.layer('top');
  if (cl === 0) {                                                                   // cresta peinada hacia atrás, nunca en pinchos al frente
    P.smooth([hp(.7, -.86), hp(.1, -1.5), hp(-.8, -1.5), hp(-1.2, -.9), hp(-.5, -.72), hp(.2, -.7)], 'hair', { n: 3, line: true });
    P.lock(hp(.4, -1.1), { n: 4, ang: -70 - wind * 18, len: R * 2.2 * (1 + (st - 1) * .2), w: R * .8, w1: 1, curve: -16, sway: 3 }, 'hair', { line: true });
    P.line([hp(.5, -1.0), hp(-.1, -1.4), hp(-.8, -1.3)], 'hair', 4, { on: 'hair' });
    P.strip([hp(1.04, -.5), hp(.3, -.7), hp(-1.0, -.4)], 1.9 * s, 1.9 * s, 'cloth', { shade: 'cyl', smooth: true, line: true });   // cinta roja
  } else if (cl === 1) {                                                            // melena recogida con diadema de cuero y huesos
    P.smooth([hp(-.5, .1), hp(-1.1, -.15), hp(-1.0, -.95), hp(-.3, -1.4), hp(.6, -1.32), hp(1.06, -.82), hp(1.0, -.54), hp(.5, -.76), hp(.0, -.6)], 'hair', { n: 3, line: true });
    P.line([hp(-.55, -1.12), hp(-.1, -1.3), hp(.45, -1.2), hp(.8, -.96)], 'hair', 4, { on: 'hair' });
    P.strip([hp(1.02, -.54), hp(.55, -.78), hp(-.2, -.84), hp(-.96, -.56)], 1.8 * s, 1.8 * s, 'leather', { shade: 'cyl', smooth: true, line: true });
    P.poly([hp(.7, -.7), hp(.9, -.7), hp(.8, -.4)], 'bone', { shade: 'flat', tone: 3, line: true });
    P.lock(hp(.3, -1.3), { n: 4, ang: -50 - wind * 20, len: R * 1.4, w: R * .5, w1: 1, curve: -12, sway: 3 }, 'hair', { line: false });
  } else {                                                                          // cráneo de carnero: cúpula de hueso con cuernos enrollados hacia atrás y plumas
    P.smooth([hp(1.0, -.5), hp(.9, -1.2), hp(.1, -1.7), hp(-.9, -1.4), hp(-1.1, -.6), hp(-.3, -.4)], 'bone', { n: 3, line: true });
    P.strip([hp(-.2, -1.1), hp(-1.4, -1.5), hp(-1.9, -.8), hp(-1.5, -.3)], 2.8 * s, 1.4 * s, 'bone', { shade: 'cyl', smooth: true, line: true });
    P.line([hp(-.4, -1.2), hp(-1.3, -1.45), hp(-1.7, -.9)], 'bone', 4, { on: 'bone' });
    P.line([hp(-.6, -1.1), hp(-1.4, -1.1)], 'bone', 1, { on: 'bone' });
    dot(P, hp(.62, -.96), 'leather', 0); dot(P, hp(.7, -.92), 'leather', 0);
    for (let i = 0; i < 3; i++) P.lock(hp(-.6 + i * .12, -1.55), { n: 4, ang: -100 - i * 16 - wind * 14, len: R * (2.2 - i * .2), w: R * .5, w1: .8, curve: 14, sway: 4 }, i === 1 ? 'paint' : 'cloth', { line: i === 0 });
    if (st >= 2) P.emit({ px: [hp(.7, -.9), hp(.8, -.9)] });
  }
}

function brazo(P, c, S, layer, cl) {
  const { J, L } = P, s = c.s, near = S === 'N', st = c.st;
  P.layer(layer);
  const sh = J['sh' + S], el = J['el' + S], ha = J['ha' + S], dU = P.dir('arm' + S + '.upper'), dL = P.dir('arm' + S + '.lower');
  P.blob(sh, L.upperW * .66, L.upperW * .66, 'skin', { shade: 'sphere' });
  P.limb('arm' + S + '.upper', 'skin', L.upperW * 1.3, L.upperW * 1.15);                                          // bíceps grueso
  P.fold([add(sh, dU, 3 * s), add(el, dU, -4 * s)], 'skin');
  P.limb('arm' + S + '.lower', 'skin', L.lowerW * 1.3, L.lowerW * 1.05);
  P.line([add(el, dL, 2 * s), add(ha, dL, -3 * s)], 'skin', 4, { on: 'skin' });
  if (st >= 2) marca(P, c, [add(el, dU, -3 * s), add(el, dU, 1 * s)], false);
  if (cl === 2) {                                                                                                 // brazales de piel y huesos
    banda(P, mix(el, ha, .72), dL, L.lowerW * 1.8, 2 * s, 'fur', 2, { line: near });
  } else {
    banda(P, mix(el, ha, .7), dL, L.lowerW * 1.65, 1.8 * s, 'leather', 2, { line: near });                       // brazal con púas de hueso
    P.poly([add(mix(el, ha, .7), [0, -L.lowerW * .8]), add(mix(el, ha, .7), [-1.2 * s, -L.lowerW * .8 - 2.6 * s]), add(mix(el, ha, .7), [1.4 * s, -L.lowerW * .8])], 'bone', { shade: 'flat', tone: 3 });
  }
  // hombrera de piel con hueso (cercano en Berserker y Cazador; lejano solo si cl 0)
  if (cl !== 2 && (near || cl === 0)) {
    P.blob(add(sh, dU, -.8 * s), L.upperW * .88, L.upperW * .7, cl === 0 ? 'fur' : 'leather', { shade: 'sphere', line: near });
    if (cl === 0) P.line([add(sh, [-L.upperW * .6, -L.upperW * .2]), add(sh, [L.upperW * .6, -L.upperW * .1])], 'fur', 4, { on: 'fur' });
    if (st === 3) {                                                                                               // calavera pequeña sobre la hombrera
      const b = add(sh, dU, -2 * s);
      P.blob(add(b, [0, -L.upperW * .5]), 2.6 * s, 2.4 * s, 'bone', { shade: 'sphere', line: near });
      dot(P, add(b, [-.8 * s, -L.upperW * .5]), 'leather', 0); dot(P, add(b, [.9 * s, -L.upperW * .5]), 'leather', 0);
    }
  }
  return add(ha, dL, .6 * s);
}
function puño(P, c, p, d, line = true) {
  const s = c.s;
  P.blob(p, 3.0 * s, 2.8 * s, 'skin', { shade: 'sphere', line });
  P.line([add(p, [-1.2 * s, -.4 * s]), add(p, [1.2 * s, -.4 * s])], 'skin', 1, { on: 'skin' });
  void d;
}

// --- armas ---
// Hacha de guerra: mango de cuero con cuentas de hueso, filo ancho de hierro con muesca y flecos
function hacha(P, c, hand, d, far) {
  const s = c.s, n = [d[1], -d[0]], st = c.st, len = 17 * s;
  const hc = add(hand, d, len), back = add(hand, d, -6 * s), q = (a, b) => add(add(hc, d, a * s), n, b * s);
  P.layer(far ? 'far' : 'top');
  P.cap(back, add(hc, d, -1 * s), 2.5 * s, 2.1 * s, 'leather', { shade: 'cyl', line: !far });
  banda(P, add(hand, d, -2.6 * s), d, 3.3 * s, 1.1 * s, 'bone', 3);
  P.blob(add(back, d, -.6 * s), 1.8 * s, 1.8 * s, 'bone', { shade: 'sphere' });
  P.poly([q(-1.2, 1.4), q(-2.8, -3.6), q(-1.2, -8.2), q(2.6, -9.2), q(4.4, -5.6), q(2.4, -3.0), q(1.2, 1.4)], 'iron', { shade: 'vol', line: !far });
  P.poly([q(-1.0, 1.2), q(1.4, 1.2), q(1.2, 3.8), q(-.6, 3.2)], 'iron', { shade: 'vol' });                       // cuello del filo
  P.line([q(-2.6, -3.8), q(-1.2, -8.0), q(2.4, -9.0), q(4.2, -5.6)], 'iron', 4, { on: 'iron' });                 // filo reluciente
  P.line([q(-.4, -1.8), q(1.4, -5.6)], 'iron', 1, { on: 'iron' });
  dot(P, q(.8, -3.4), 'paint', 3);                                                                                // mancha de sangre
  P.line([q(-1.6, 2.2), add(q(-1.6, 2.2), c.gravity, 3 * s)], 'paint', 3, { on: 'leather' });
  if (st >= 2) dot(P, q(3.8, -5.8), 'paint', 4);
  if (st === 3) { P.line([q(-2.4, -3.8), q(-1.0, -8.0), q(2.4, -8.8)], 'spirit', 3, { on: 'iron' }); P.emit({ px: [q(2.8, -9.8)] }); }
  if (!far) { P.anchor('muzzle', q(1.2, -6)); P.anchor('rod', hc); }
  return hc;
}
// Jabalina: asta larga de madera con ligaduras, punta de hueso tallada y plumas rojas. a = ángulo desde «arriba» (grados).
function jabalina(P, c, hand, a, bajo = false) {
  const s = c.s, st = c.st, u = [sin(a * D), -cos(a * D)], n = [u[1], -u[0]];
  const b = add(hand, u, -12 * s), t = add(hand, u, 22 * s);
  P.layer('top');
  P.cap(b, t, 2.1 * s, 1.6 * s, 'leather', { shade: 'cyl', line: true });
  P.line([add(b, n, -.6), add(t, n, -.4)], 'leather', 4, { on: 'leather' });
  for (const k of [0, 1]) {                                                                                       // plumas de cola
    const o = add(b, u, 2.4 * s);
    P.poly([add(o, u, k * 2.8 * s), add(add(o, u, k * 2.8 * s + 3 * s), n, (k ? -1 : 1) * 2.8 * s), add(add(o, u, k * 2.8 * s + 5.2 * s), n, (k ? -1 : 1) * .6 * s)], k ? 'bone' : 'paint', { shade: 'flat', tone: 3, line: !k });
  }
  banda(P, add(t, u, -1.4 * s), u, 3 * s, 1.1 * s, 'cloth', 3);
  const tip = add(t, u, 7.4 * s);
  P.poly([add(t, n, 1.8 * s), add(add(t, u, 3.4 * s), n, 2.6 * s), tip, add(add(t, u, 3.4 * s), n, -2.6 * s), add(t, n, -1.8 * s)], 'bone', { shade: 'vol', line: true });
  P.line([add(t, add(u, n, .3), 1.6 * s), add(tip, u, -1.2 * s)], 'bone', 4, { on: 'bone' });
  if (st === 3) { P.line([add(t, u, 1 * s), add(tip, u, -1 * s)], 'spirit', 3, { on: 'bone' }); P.emit({ px: [add(tip, u, -.5 * s)] }); }
  P.anchor('muzzle', tip); P.anchor('rod', tip);
  void bajo;
  return tip;
}
// Carcaj a la espalda con jabalinas de repuesto que asoman por detrás del hombro
function carcaj(P, c) {
  const { tp, tw, s, wind } = c, o = tp(.9, -tw * 1.05);
  P.layer('body');
  for (let i = 0; i < 3; i++) {
    const b = add(o, [-i * 1.4 * s, i * 1 * s]), t = add(b, [-(5 + i * 1.4) * s - wind * 2, -(15 - i * 1.8) * s]);
    P.cap(b, t, 1.7 * s, 1.4 * s, 'leather', { shade: 'cyl' });
    P.poly([add(t, [-1.4 * s, 0]), add(t, [-.3 * s, -3.6 * s]), add(t, [1.2 * s, 0])], 'bone', { shade: 'flat', tone: 3, line: i === 0 });
    P.line([add(b, [0, -4 * s]), add(b, [0, -4 * s])], 'cloth', 3);
  }
  P.cap(add(o, [1 * s, 2 * s]), add(o, [-5 * s, 8 * s]), 4.2 * s, 3.8 * s, 'leather', { shade: 'cyl', line: true });
  banda(P, mix(add(o, [1 * s, 2 * s]), add(o, [-5 * s, 8 * s]), .3), [-.6, .8], 4.8 * s, 1.1 * s, 'bone', 3);
}
// Tótem: poste de madera tallado con cara, calavera de carnero, plumas y huesos que cuelgan. Etapa 3: espíritu del tótem sobre la punta.
function totem(P, c, hand, d) {
  const s = c.s, st = c.st, ph = c.ph;
  let u = [d[0] * .34, -.66 + d[1] * .34]; const l = Math.hypot(u[0], u[1]) || 1; u = [u[0] / l, u[1] / l];
  const n = [u[1], -u[0]], b = add(hand, u, -10 * s), t = add(hand, u, 17 * s);
  P.layer('top');
  P.cap(b, t, 3.4 * s, 3.0 * s, 'leather', { shade: 'cyl', line: true });
  P.line([add(b, n, -.8), add(t, n, -.6)], 'leather', 4, { on: 'leather' });
  const face = add(t, u, -6 * s);
  P.blob(face, 3.0 * s, 3.4 * s, 'leather', { shade: 'flat', tone: 3, line: true });                              // rostro tallado
  dot(P, add(face, [-.9 * s, -.6 * s]), 'leather', 0); dot(P, add(face, [1.1 * s, -.6 * s]), 'leather', 0);
  P.line([add(face, [-1 * s, 1.4 * s]), add(face, [1.2 * s, 1.4 * s])], 'leather', 0, {});
  P.line([add(face, n, 3.4 * s), add(face, n, -3.4 * s)], 'paint', 3, { on: 'leather' });
  const sk = add(t, u, 2.8 * s);
  P.blob(sk, 3.8 * s, 3.2 * s, 'bone', { shade: 'sphere', line: true });
  dot(P, add(sk, [-1.2 * s, -.2 * s]), 'leather', 0); dot(P, add(sk, [1.4 * s, -.2 * s]), 'leather', 0);
  P.strip([add(sk, n, 3 * s), add(add(sk, n, 5.4 * s), u, 1.4 * s), add(add(sk, n, 4.2 * s), u, -2.4 * s)], 2.2 * s, 1.2 * s, 'bone', { shade: 'cyl', smooth: true, line: true });
  P.strip([add(sk, n, -3 * s), add(add(sk, n, -5.4 * s), u, 1.4 * s), add(add(sk, n, -4.2 * s), u, -2.4 * s)], 2.2 * s, 1.2 * s, 'bone', { shade: 'cyl', smooth: true, line: true });
  for (let i = 0; i < 3; i++) {                                                                                   // plumas y huesos colgantes
    const o = add(t, u, -9 * s + i * 1.4 * s), sw = sin(ph * TAU + i) * 1.2;
    P.line([add(o, n, 1.8 * s), add(add(o, n, 2.4 * s + sw), c.gravity, 4.5 * s)], i === 1 ? 'bone' : 'paint', 3, {});
    dot(P, add(add(o, n, 2.4 * s + sw), c.gravity, 5 * s), 'bone', 4);
  }
  if (st >= 2) P.emit({ px: [add(sk, [-1.2 * s, -.2 * s]), add(sk, [1.4 * s, -.2 * s])] });                       // ojos del tótem
  if (st === 3) {                                                                                                  // espíritu: calavera pálida flotando
    const sp = add(sk, u, (6 + sin(ph * TAU) * .5) * s);
    P.blob(sp, 3.4 * s, 3.0 * s, 'spirit', { shade: 'sphere' });
    dot(P, add(sp, [-1 * s, -.2]), 'spirit', 0); dot(P, add(sp, [1.2 * s, -.2]), 'spirit', 0);
    P.emit({ px: [add(sp, [0, 3.6 * s]), add(sp, [-3.6 * s, 1.5 * s]), add(sp, [3.8 * s, 1 * s])] });
  }
  if (c.ctx.anim === 'cast' && c.ctx.frame >= 1) {                                                                // trueno: arcos angulosos desde la calavera
    const r = c.ctx.rng, o = add(sk, u, 2 * s);
    for (let i = 0; i < 2; i++) { let p = o; const pts = [p]; for (let k = 0; k < 3; k++) { p = [p[0] + (r() * 6 - 3) * s + (i ? 2 : -2), p[1] - (2 + r() * 3) * s]; pts.push(p); } P.emit({ line: pts }); }
  }
  P.anchor('rod', add(sk, u, 3 * s)); P.anchor('muzzle', add(sk, u, 3 * s));
  return sk;
}

// ---------------------------------------------------------------------------------------------
// 5. Dibujo de cada clase
const fa = [{ len: .5, mat: 'cloth', hem: 'bone' }, { len: .62, mat: 'fur', hem: 'bone' }, { len: 1.1, flare: 1.4, mat: 'fur', hem: 'bone' }];
function dibujar(P, ctx, cl) {
  const c = info(P, ctx), { J, s } = c, anim = ctx.anim;
  if (cl === 1) carcaj(P, c);
  pierna(P, c, 'F', 'far', cl);
  brazo(P, c, 'F', 'far', cl);
  if (cl === 0) hacha(P, c, add(J.haF, P.dir('armF.lower'), .6 * s), P.dir('armF.lower'), true);                  // hacha lejana, por detrás del cuerpo
  puño(P, c, add(J.haF, P.dir('armF.lower'), .6 * s), P.dir('armF.lower'), false);
  falda(P, c, false, fa[cl]);
  torso(P, c, cl);
  const patada = c.A['legN.upper'] > 55;
  if (patada) { falda(P, c, true, fa[cl]); pierna(P, c, 'N', 'near', cl); } else { pierna(P, c, 'N', 'near', cl); falda(P, c, true, fa[cl]); }
  pelo(P, c, cl);
  cabeza(P, c);
  cimera(P, c, cl);
  ojo(P, c);
  const hand = brazo(P, c, 'N', 'near', cl), d = P.dir('armN.lower');
  if (cl === 0) hacha(P, c, hand, d, false);
  else if (cl === 1) {
    const a = /^atk|kick/.test(anim) ? Math.atan2(d[0], -d[1]) / D : anim === 'fire' ? (ctx.frame === 0 ? 76 : 84) : anim === 'charge' ? 78 : 30;
    if (!(anim === 'fire' && ctx.frame >= 1)) jabalina(P, c, hand, a);
    else P.anchor('muzzle', add(hand, [14 * s, -2 * s]));
  } else totem(P, c, hand, d);
  puño(P, c, hand, d);
  if (cl === 0 && anim.startsWith('atk') && ctx.frame === 1) {                       // chispas de hierro en el impacto
    const r = ctx.rng, o = add(hand, d, 20 * s);
    for (let i = 0; i < 4; i++) { const a = r() * TAU, dd = 3 + r() * 5; P.emit({ px: [[o[0] + cos(a) * dd + 2, o[1] + sin(a) * dd]] }); }
  }
  P.anchor('haN', hand);
  P.anchor('head', J.head);
}

// ---------------------------------------------------------------------------------------------
// 6. Efectos vivos. Contrato real de render/scene.js: c = { x, y (pies), w, h, t (ms), lite, face, alpha, idx, variant }.
const px = (g, x, y, col, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.globalAlpha = 1; };
const escala = c => Math.max(.8, Math.min(1.3, (c.h || 64) / 64));
const VAPOR = ['#f0e8e0', '#c8bcb4', '#948a88'], ROJO = ['#ff8a6a', '#ff5a3a', '#c02a1c'], ESPIRITU = ['#ffffff', '#c8f0ff', '#8ac8e8'];
const fx = {
  back(g, c, stage) {
    if (stage < 3) return;
    const t = c.t / 1000, s = escala(c);
    g.save(); g.translate(c.x, c.y);
    // Etapa 3: dos tótems espectrales a la espalda (poste de puntos con cara y calavera) que respiran despacio (≤ 1 Hz)
    const br = .5 + .25 * sin(t * 3.4), n = c.lite ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const bx = (-14 - k * 9) * s * c.face, by = -4 * s, hh = (38 - k * 8) * s;
      for (let y = 0; y < hh; y += 2) { px(g, bx - 1, by - y, ESPIRITU[2], br * .7); px(g, bx + 1, by - y, ESPIRITU[2], br * .7); if (y % 6 === 0) px(g, bx, by - y, ESPIRITU[1], br); }
      for (let i = -2; i <= 2; i++) px(g, bx + i, by - hh, ESPIRITU[1], br);
      px(g, bx - 1, by - hh + 2, ESPIRITU[0], br); px(g, bx + 1, by - hh + 2, ESPIRITU[0], br);
      px(g, bx - 3, by - hh - 1, ESPIRITU[2], br); px(g, bx + 3, by - hh - 1, ESPIRITU[2], br);
    }
    if (!c.lite) for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; px(g, cos(a) * 22 * s, sin(a) * 6.5 * s, ESPIRITU[2], .45); }
    g.restore();
  },
  front(g, c, stage) {
    if (stage < 2) return;
    const t = c.t / 1000, s = escala(c);
    g.save(); g.translate(c.x, c.y);
    // vapor que sube de los hombros: motas grises que se ensanchan y se pierden (nunca llamas)
    const n = c.lite ? 2 : stage === 2 ? 5 : 8;
    for (let i = 0; i < n; i++) {
      const k = (t * .45 + i / n) % 1, x = (sin(i * 5.3 + k * 2.6) * 7 + (i % 2 ? 4 : -4) * c.face) * s, y = (-44 - k * 22) * s;
      px(g, x, y, VAPOR[k < .5 ? 0 : 1], (1 - k) * .75); if (k > .35 && !c.lite) px(g, x + 1, y, VAPOR[2], (1 - k) * .5);
    }
    if (!c.lite) {                                                                                   // una chispa roja de las marcas cada ~0,8 s
      const f = t * 1.25, k = Math.floor(f), ph = f - k;
      if (ph < .4) px(g, ((k * 17 + (c.idx || 0) * 7) % 15 - 7) * s * c.face, -(18 + (k * 9) % 24) * s, ROJO[k % 3], 1 - ph / .4);
    }
    g.restore();
  },
};
// Remate de la transformación: un rugido en ondas (arcos de píxeles rojos que se abren desde la cabeza) y polvo del suelo
function transformFx(g, c, k) {
  const s = escala(c);
  g.save(); g.translate(c.x, c.y);
  for (let r = 0; r < 3; r++) {
    const kk = k * 1.3 - r * .18; if (kk < 0 || kk > 1) continue;
    for (let i = 0; i < 18; i++) { const a = (-.9 + i / 17 * 1.8) * (c.face || 1) + (c.face < 0 ? Math.PI : 0), rr = (10 + kk * 34) * s; px(g, cos(a) * rr, -46 * s + sin(a) * rr * .8, ROJO[r % 3], 1 - kk); }
  }
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, rr = (6 + k * 30) * s; px(g, cos(a) * rr, sin(a) * rr * .3, VAPOR[i % 3], .8 * (1 - k)); }
  g.restore();
}

// ---------------------------------------------------------------------------------------------
const CUERPO = [{ body: 'robusto', height: 68, shoulder: 1.14, headScale: .92 }, { body: 'robusto', height: 66, shoulder: 1.02, headScale: .94 }, { body: 'robusto', height: 64, shoulder: 1.06, headScale: .94 }];
const ANC = ['haN', 'haF', 'head', 'chest', 'muzzle', 'rod'];
export default {
  id: 'orcos',
  kit: 1,
  ready: true,
  materials: ['skin', 'hair', 'bone', 'cloth', 'leather', 'iron', 'fur', 'paint', 'spirit', 'iris'],
  ramps(variant, stage) {
    const v = variant ? 1 : 0, st = Math.max(1, Math.min(3, stage || 1)), pick = k => RAMPAS[k][Math.min(v, RAMPAS[k].length - 1)];
    const skin = st === 2 && !v ? ['#52241a', '#84402c', '#b0684a', '#d48c68', '#f4b490'] : pick('skin');
    return {
      skin: ramp5(skin), hair: ramp5(pick('hair')), bone: ramp5(pick('bone')), cloth: ramp5(pick('cloth')), leather: ramp5(pick('leather')), iron: ramp5(pick('iron')),
      fur: ramp5(pick('fur')), paint: ramp5(pick('paint')), spirit: ramp5(pick('spirit')),
      iris: ramp5([IRIS[st - 1][0], IRIS[st - 1][1], IRIS[st - 1][2], '#ffffff', '#ffffff']),
    };
  },
  emit: variant => EMIT[variant ? 1 : 0],
  geomStage: s => s,
  extraAnims: {},
  extraPoses: {},
  classes: [
    { id: 'berserker', name: 'Berserker', build: CUERPO[0], anchors: ANC, pose: poseDe(0), draw: (P, ctx) => dibujar(P, ctx, 0) },
    { id: 'cazador', name: 'Cazador', build: CUERPO[1], anchors: ANC, pose: poseDe(1), draw: (P, ctx) => dibujar(P, ctx, 1) },
    { id: 'chaman', name: 'Chamán', build: CUERPO[2], anchors: ANC, pose: poseDe(2), draw: (P, ctx) => dibujar(P, ctx, 2) },
  ],
  stageScale: [1, 1, 1.15],
  fx,
  transformFx,
};
