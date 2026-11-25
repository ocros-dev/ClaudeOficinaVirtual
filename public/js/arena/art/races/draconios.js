// Raza «draconios» · Linaje de Escamas (paquete A-DRA). Arte 16 bits propio, 3 etapas y variantes A/B.
// Clases: 0 Lancero dracónico (lanza con banderola y armadura de escamas), 1 Aliento-mago (cuerno-canal de fuego frío),
//         2 Sacerdotisa de escamas (cetro con disco y escamas de luz en órbita).
// Guía: docs/arena-estilo-16bits.md. Solo se importa de '../kit16/*'. Sin Math.random (usa ctx.rng).
// Orden del archivo: 1 paleta · 2 poses · 3 datos del fotograma · 4 piezas · 5 dibujo de cada clase · 6 efectos vivos.
//   Etapa 1 Formación · 2 Escama Ardiente (escamas con brasa, espinas dorsales, humo) ·
//   3 Sangre de Dragón (alas de membrana, cuernos y cola mayores, dragón espectral detrás).
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------------------------------------------------------------------------------------------
// 1. Paleta (spec: carmín/magenta #c8306e y oro #d8a82a). [sombra profunda, sombra, base, luz, brillo]. B = azul cobalto y plata.
const RAMPAS = {
  scale:   [['#3a0c2a', '#7a1a48', '#c8306e', '#e04e84', '#ff8cb0'], ['#0c1a4a', '#1c3a8c', '#3a62d0', '#6a96f0', '#b4ceff']],
  belly:   [['#6a3030', '#a8605a', '#e0a07a', '#f6cc9e', '#fff0d0'], ['#4a5470', '#8a94b0', '#c8d0e4', '#e6ecf8', '#ffffff']],
  gold:    [['#4a2c06', '#8a5a10', '#d8a82a', '#f4d062', '#fff4b0'], ['#3a4258', '#78849c', '#c4ccdc', '#e8eef8', '#ffffff']],
  horn:    [['#2a1a1a', '#5a3e38', '#a8886a', '#d8c09a', '#f8ecd0']],
  cloth:   [['#140812', '#2a1228', '#4a1c46', '#6e2e68', '#a0509a'], ['#080c1c', '#121c3c', '#202e64', '#34488e', '#5a72c0']],
  cloth2:  [['#5a4a58', '#a898a4', '#ece0e0', '#fff6f2', '#ffffff'], ['#4a5268', '#98a2bc', '#e6eaf6', '#f8faff', '#ffffff']],
  leather: [['#180e10', '#32201e', '#58382c', '#7e5640', '#a87c5c']],
  metal:   [['#241a24', '#4a3e52', '#8a7e9a', '#bcb2cc', '#f0eaff']],
  fuego:   [['#0a3a5a', '#1c78a8', '#4ac8f0', '#a8ecff', '#ffffff']],
  luz:     [['#d8b058', '#f0d88c', '#fff2c0', '#fffae0', '#ffffff'], ['#98a8c8', '#c8d4ec', '#e8f0ff', '#f6f9ff', '#ffffff']],
  membr:   [['#1a0612', '#3e1030', '#6e1a50', '#9a2c70', '#c4508c'], ['#080e2a', '#142468', '#223e98', '#3a5cc4', '#6a8ae8']],
};
const IRIS = [['#4a2c06', '#8a5a10', '#f4d062', '#fff4b0', '#ffffff'], ['#1c3a8c', '#6a96f0', '#d8e8ff', '#ffffff', '#ffffff']];
const EMIT = ['#ffd2a0', '#cfe0ff'];
const BRASA = [['#fff0c8', '#ffb070', '#ff6a4a'], ['#ffffff', '#d4e4ff', '#7aa4ff']];

// ---------------------------------------------------------------------------------------------
// 2. Poses propias. Ángulos: 0 = colgando, 90 = al frente, 180 = arriba. pl = pies apoyados, cr = flexión de piernas.
const G = o => ({ pl: 'NF', ...o });
const POSE = [
  // Lancero: postura altiva, lanza al frente a media altura y el cuerpo erguido sobre la cola.
  (anim, k) => ({
    idle: [0, 1, 2, 3].map(i => { const b = [0, .6, 1, .6][i]; return G({ cr: .16 + b * .012, lean: 3 + b, sp: 2, nk: 1, hipN: 24, knN: 26, hipF: -20, knF: 24, shN: 52 + b * 2, elN: 40, shF: 30, elF: 90 }); })[k],
    block: G({ cr: .2, lean: 8, sp: 4, nk: 3, hipN: 26, knN: 28, hipF: -22, knF: 26, shN: 70, elN: 20, shF: 60, elF: 60 }),
  }[anim]),
  // Aliento-mago: erguido, el cuerno-canal a la altura de la boca y la otra mano abierta con la palma al frente.
  (anim, k) => ({
    idle: [0, 1, 2, 3].map(i => { const b = [0, .5, 1, .5][i]; return G({ cr: .1 + b * .01, lean: 2 + b * .6, sp: 1, nk: 2 - b, hipN: 14, knN: 14, hipF: -12, knF: 14, shN: 44 + b * 3, elN: 92, shF: 40, elF: 70 }); })[k],
  }[anim]),
  // Sacerdotisa: serena, el cetro vertical en una mano y la otra elevada con la palma abierta.
  (anim, k) => ({
    idle: [0, 1, 2, 3].map(i => { const b = [0, .5, 1, .5][i]; return G({ cr: .08 + b * .01, lean: 1 + b * .5, sp: 0, nk: 2 - b * .5, hipN: 10, knN: 10, hipF: -8, knF: 10, shN: 20 + b * 2, elN: 52, shF: 62 + b * 4, elF: 100 }); })[k],
  }[anim]),
];
const VIENTO = { run: 1, walk: .3, atk1: .55, atk2: .6, atk3: .7, charge: -.15, hit: -.9, launched: .5, victory: .1, transform: -.3, cast: .2, fire: .3 };

// ---------------------------------------------------------------------------------------------
// 3. Datos del fotograma
function info(P, ctx) {
  const { J, L, A } = P, s = L.H / 60, st = ctx.stage, ph = ctx.phase * TAU;
  const aT = A.torsoLean * D, up = [sin(aT), -cos(aT)], fwd = [cos(aT), sin(aT)];
  const ah = A.headAng * D, hu = [sin(ah), -cos(ah)], hf = [cos(ah), sin(ah)];
  const R = L.head * .40;
  const tumbled = Math.abs(ctx.pose.rot || 0) > 25;
  const wind = (VIENTO[ctx.anim] ?? 0) + [0, .15, .28][st - 1];
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
// Chevrones de escama: dos píxeles de sombra y uno de luz, sobre el material 'scale'
function escamas(P, c, pts, mat = 'scale') {
  for (const p of pts) { P.line([add(p, [-1, 0]), add(p, [0, 1]), add(p, [1, 0])], mat, 1, { on: mat }); P.line([add(p, [-1, -1])], mat, 3, { on: mat }); }
}

// Cola larga en tres tramos: se afina hacia la punta; las etapas la alargan con una espina o un «pala» de hueso.
function cola(P, c, cl) {
  const { J, s, st, ph } = c, t1 = J.tail1, t2 = J.tail2, t3 = J.tail3;
  if (!t1) return;
  P.layer('body');
  const w = sin(ph) * 1.1 * s, p3 = [t3[0], t3[1] + w * 1.4], p2 = [t2[0], t2[1] + w * .6];
  const gr = cl === 0 ? 1.15 : cl === 1 ? .9 : 1;
  P.strip([J.root, t1, p2, p3], 8.4 * s * gr, 2 * s, 'scale', { smooth: true });
  P.strip([add(J.root, [0, 2 * s]), add(t1, [0, 2 * s]), add(p2, [0, 1.6 * s])], 3.4 * s, 1.4 * s, 'belly', { smooth: true, shade: 'cyl', on: 'scale' });
  escamas(P, c, [mix(J.root, t1, .6), mix(t1, p2, .5)]);
  const d = [p3[0] - p2[0], p3[1] - p2[1]], l = Math.hypot(d[0], d[1]) || 1, u = [d[0] / l, d[1] / l], n = [u[1], -u[0]];
  if (st === 3) {                                                                          // pala de cola: hoja ósea con filo de oro
    const b = add(p3, u, 1 * s), tip = add(p3, u, 9 * s);
    P.poly([b, add(add(b, u, 3.5 * s), n, 5 * s), tip, add(add(b, u, 3.5 * s), n, -5 * s)], 'gold', { shade: 'vol', line: true });
    P.line([b, tip], 'gold', 1, { on: 'gold' });
  } else P.poly([add(p3, n, 1.8 * s), add(p3, u, 6 * s), add(p3, n, -1.8 * s)], 'horn', { shade: 'vol', line: true });
  if (st >= 2) { const m = mix(t1, p2, .5); P.poly([add(m, n, -3 * s), add(add(m, n, -5.4 * s), u, 1 * s), add(add(m, n, -3 * s), u, 3 * s)], 'horn', { shade: 'vol', line: true }); }
}

function pierna(P, c, S, layer, cl) {
  const { L, s, J } = c;
  P.layer(layer);
  const near = S === 'N', kn = J['kn' + S], d = P.dir('leg' + S + '.upper'), n = [d[1], -d[0]];
  P.limb('leg' + S + '.upper', cl === 0 ? 'scale' : 'scale', L.thighW * 1.12, L.thighW * .9);
  if (cl === 0) {                                                                          // grebas de oro con rodillera
    P.limb('leg' + S + '.lower', 'gold', L.shinW * 1.3, L.shinW * 1.0, { line: near });
    P.blob(add(kn, d, .6), 2.8 * s, 2.6 * s, 'gold', { shade: 'sphere', line: near });
  } else {
    P.limb('leg' + S + '.lower', 'scale', L.shinW * 1.15, L.shinW * .9);
    P.fold([add(kn, d, -1.5), add(kn, n, -2.2 * s)], 'scale');
    P.line([add(J['ft' + S], d, -4 * s), add(add(J['ft' + S], d, -4 * s), n, 2 * s)], 'gold', 2, { on: 'scale' });
  }
  // pie con tres garras
  P.cap(J['heel' + S], J['toe' + S], L.ankle * 2.2, L.ankle * 1.4, 'scale');
  P.blob(add(J['toe' + S], [-.4 * s, -.2 * s]), 1.6 * s, 1.5 * s, 'scale', { shade: 'sphere' });
  P.line([add(J['toe' + S], [.8 * s, .3 * s]), add(J['toe' + S], [2.2 * s, .6 * s])], 'horn', 4, {});
  P.line([add(J['toe' + S], [.6 * s, -.7 * s]), add(J['toe' + S], [1.8 * s, -.4 * s])], 'horn', 3, {});
}

function falda(P, c, near, o) {
  const { L } = P, { tp, hw, s, wind, gravity: g, ph } = c, back = [-1, 0];
  const len = L.thigh * o.len * (near ? .92 : 1.08);
  const sway = (wind * 7 + sin(ph + (near ? 0 : 1.3)) * (1.1 + c.st * .5)) * s, fl = (o.flare || 0) * s;
  const a = tp(.2, -hw * (near ? 1.05 : .9) * (o.narrow || 1)), b = tp(.2, hw * (near ? 1.15 : .3) * (o.narrow || 1));
  const bBot = add(add(add(b, g, len * (near ? .84 : .9)), back, sway * .55), [1, 0], near ? fl : fl * .4);
  const aBot = add(add(a, g, len * 1.04), back, sway * 1.25 + (near ? 0 : 2 * s) + fl * .5);
  const mid = add(mix(aBot, bBot, .5), g, 1.4 * s);
  P.smooth([a, mix(a, b, .5), b, bBot, mid, aBot], o.mat, { n: 3, line: near });
  if (near) {
    P.fold([mix(a, b, .35), add(mix(aBot, bBot, .35), g, -2 * s)], o.mat);
    P.fold([mix(a, b, .72), add(mix(aBot, bBot, .72), g, -3.5 * s)], o.mat);
    P.line([add(bBot, g, -.5), add(mid, g, -.5), add(aBot, g, -.5)], o.hem || 'gold', 3, { on: o.mat });
    if (o.rombo) { const q = mix(mix(a, b, .6), mix(aBot, bBot, .6), .45); P.poly([[q[0], q[1] - 2.4 * s], [q[0] + 1.8 * s, q[1]], [q[0], q[1] + 2.4 * s], [q[0] - 1.8 * s, q[1]]], 'gold', { shade: 'vol' }); }
  }
}

function torso(P, c, cl) {
  const { tp, tw, hw, s, fwd, st, ph } = c;
  P.layer('body');
  const big = cl === 0 ? 1.06 : 1;
  const sh = [tp(-.02, -hw * .98), tp(.2, -tw * .86), tp(.5, -tw * .8), tp(.78, -tw * 1.0 * big), tp(1.0, -tw * .9), tp(1.12, -tw * .38),
    tp(1.12, tw * .42), tp(1.0, tw * 1.08 * big), tp(.74, tw * 1.16 * big), tp(.46, tw * .8), tp(.2, hw * .95), tp(-.02, hw * 1.02)];
  P.smooth(sh, 'scale', { n: 3 });
  // vientre claro en placas
  P.smooth([tp(.1, hw * .5), tp(.4, tw * .66), tp(.8, tw * .9), tp(1.04, tw * .7), tp(.9, tw * 1.1), tp(.6, tw * 1.0), tp(.3, hw * .98)], 'belly', { n: 2, shade: 'flat', tone: 3, on: 'scale' });
  for (let f = .24; f < 1; f += .15) P.line([tp(f, tw * .56), tp(f - .02, hw * 1.0)], 'belly', 1, { on: 'belly' });
  escamas(P, c, [tp(.5, -tw * .4), tp(.7, -tw * .5), tp(.9, -tw * .6), tp(.4, -tw * .6), tp(.6, -tw * .2), tp(.8, -tw * .1)]);
  P.fold([tp(.6, -tw * .66), tp(.4, -tw * .5)], 'scale');
  if (st >= 2) {                                                                           // espinas dorsales y brasa en las escamas
    for (let i = 0; i < 4; i++) { const b = tp(.28 + i * .24, -tw * (.9 - (i % 2) * .08)), sp = (3.4 - i * .3) * s; P.poly([add(b, [0, -.5]), add(b, [-sp * .4, -sp]), add(b, [-sp * .15, .6 * s])], 'horn', { shade: 'vol', line: true }); }
    P.emit({ px: [tp(.55, -tw * .4), tp(.85, -tw * .55), tp(.7, -tw * .2)] });
  }
  if (cl === 0) {                                                                          // coraza de escamas de oro y faldón corto
    P.smooth([tp(.3, -tw * .7), tp(.58, -tw * .88), tp(.98, -tw * .86), tp(1.04, tw * .3), tp(.96, tw * 1.08), tp(.7, tw * 1.12), tp(.44, tw * .8)], 'gold', { n: 3, line: true });
    P.fold([tp(.9, tw * .7), tp(.62, tw * .5)], 'gold');
    for (let i = 0; i < 3; i++) P.line([add(tp(.5 + i * .17, tw * .3), [-2, 0]), add(tp(.5 + i * .17, tw * .3), [2, 1])], 'gold', 1, { on: 'gold' });
    P.poly([tp(.4, -tw * .8), tp(.4, tw * .82), tp(.12, hw * 1.05), tp(.12, -hw)], 'cloth', { shade: 'vol', line: true });
    banda(P, tp(.34, 0), c.up, tw * 2.0, 1.4 * s, 'gold', 3);
  } else if (cl === 1) {                                                                   // túnica abierta con cuello alto; la garganta brilla
    P.poly([tp(.95, -tw * .5), tp(1.2, -tw * .35), tp(1.22, tw * .3), tp(1.0, tw * .62)], 'cloth', { shade: 'vol', line: true });
    P.strip([tp(1.1, tw * .5), tp(.84, tw * .25), tp(.52, tw * .15), tp(.2, tw * .3)], 2.2 * s, 1.7 * s, 'gold', { shade: 'cyl', line: true });
    P.fold([tp(.82, tw * .8), tp(.58, tw * .55)], 'cloth');
    P.emit({ px: [tp(1.14, tw * .24), tp(1.0, tw * .12)] });
    P.poly([tp(.42, -tw * .8), tp(.42, tw * .84), tp(.2, hw), tp(.2, -hw)], 'cloth', { shade: 'vol', line: true });
    const knot = add(tp(.33, 0), fwd, tw * .38), sw = sin(ph + 1) * 1.6 + c.wind * 3;
    P.blob(knot, 2 * s, 1.9 * s, 'gold', { shade: 'sphere', line: true });
    P.strip([knot, add(add(knot, c.gravity, 5 * s), [-1, 0], sw * .5), add(add(knot, c.gravity, 10 * s), [-1, 0], sw * 1.1)], 2.2 * s, 1.1 * s, 'cloth', { smooth: true, line: true });
  } else {                                                                                 // ornamento: peto blanco con disco de escamas y collar
    P.poly([tp(.92, -tw * .6), tp(1.1, -tw * .4), tp(1.16, tw * .4), tp(.9, tw * 1.0), tp(.5, tw * .86), tp(.3, hw), tp(.3, -hw), tp(.5, -tw * .78)], 'cloth2', { shade: 'vol', line: true });
    P.strip([tp(1.14, tw * .5), tp(.84, tw * .3), tp(.52, tw * .2)], 2 * s, 1.6 * s, 'gold', { shade: 'cyl', line: true });
    for (let i = 0; i < 3; i++) P.poly([[tp(.8 - i * .14, tw * .5)[0] - 2 * s, tp(.8 - i * .14, tw * .5)[1]], [tp(.8 - i * .14, tw * .5)[0], tp(.8 - i * .14, tw * .5)[1] - 2 * s], [tp(.8 - i * .14, tw * .5)[0] + 2 * s, tp(.8 - i * .14, tw * .5)[1]], [tp(.8 - i * .14, tw * .5)[0], tp(.8 - i * .14, tw * .5)[1] + 2 * s]], i % 2 ? 'gold' : 'scale', { shade: 'vol' });
    P.fold([tp(.62, -tw * .66), tp(.44, -tw * .5)], 'cloth2');
  }
}

// Cabeza de perfil de dragón: hocico alargado, mandíbula, cuernos hacia atrás y aleta de la mejilla.
function cabeza(P, c, cl) {
  const { hp, R, J, s, st } = c, sn = 1.62;
  P.layer('body');
  const k = 1 + (st - 1) * .25, hl = (cl === 0 ? 1.7 : cl === 1 ? 2.2 : 2.5) * k;
  // cuerno lejano
  P.strip([hp(-.2, -.8), hp(-1.2, -1.1), hp(-1.9 * k, -.7 * k - .2)], 2.6 * s, 1, 'horn', { smooth: true, dt: -1 });
  P.cap(J.chest, J.head, c.L.head * .3, c.L.head * .26, 'scale', { dt: -1 });
  P.blob(J.head, R * 1.02, R * .98, 'scale', { shade: 'flat', tone: 3, line: true });
  P.smooth([hp(.4, -.42), hp(sn * .7, -.28), hp(sn, .08), hp(sn * .98, .4), hp(.7, .62), hp(.2, .8), hp(-.2, .4)], 'scale', { n: 3, shade: 'flat', tone: 3, line: true });
  P.smooth([hp(.25, .5), hp(sn * .94, .38), hp(sn * .92, .52), hp(.7, .84), hp(.1, .94)], 'belly', { n: 2, shade: 'flat', tone: 3 });                          // mandíbula clara
  P.smooth([hp(-.1, .55), hp(.7, .7), hp(.8, .95), hp(.1, 1.0), hp(-.3, .7)], 'scale', { n: 2, shade: 'flat', tone: 2, on: 'scale' });
  P.blob(hp(.9, -.28), R * .1, R * .08, 'scale', { shade: 'flat', tone: 0 });                                                                            // fosa nasal
  P.line([hp(.9, -.3)], 'scale', 0, { on: 'scale' });
  P.line([hp(.4, .5), hp(sn * .9, .42)], 'scale', 0, { on: 'belly' });                                                                                     // boca
  // aleta de la mejilla: tres púas
  P.poly([hp(-.1, .3), hp(-1.0, .15), hp(-.4, .62)], 'gold', { shade: 'vol', line: true });
  P.poly([hp(-.1, .5), hp(-.9, .75), hp(-.3, .85)], 'gold', { shade: 'vol', line: true });
  P.layer('top');
  // cuerno cercano: dos tramos curvos hacia atrás, con anillos de oro
  const o = hp(.15, -.8);
  P.strip([o, hp(-.7, -1.2), hp(-1.5 * k, -1.2), hp(-2.3 * k, -.9)], 3.2 * s, 1, 'horn', { smooth: true, line: true });
  P.line([hp(-.25, -1.08), hp(-.35, -1.22)], 'gold', 3, {});
  banda(P, hp(-.6, -1.2), [-.8, -.3], 3.2 * s, 1.2 * s, 'gold', 3);
  void hl;
}
function ojo(P, c, cl) {
  const { hp, st, golpe } = c, e = hp(.58, -.1);
  P.layer('top');
  P.eye([e[0] - .4, e[1] - .4], { iris: 'iris', size: 3 });
  P.line([hp(.28, golpe ? -.56 : -.42), hp(.6, -.34), hp(1.0, golpe ? -.34 : -.26)], 'scale', 0, { on: 'scale' });
  if (st >= 2) P.emit({ px: [[e[0] + .5, e[1] + .8]] });
  if (cl === 2) {                                                                           // diadema: frente con gema
    P.strip([hp(.9, -.6), hp(.4, -.84), hp(-.2, -.9)], 1.6 * s0(c), 1.6 * s0(c), 'gold', { shade: 'cyl', smooth: true, line: true });
    P.blob(hp(.62, -.7), 1.5 * s0(c), 1.5 * s0(c), 'fuego', { shade: 'sphere' });
  }
}
const s0 = c => c.s;

// Alas de membrana (etapa 3): tres dedos y membrana entre ellos, con aleteo suave.
function alas(P, c) {
  const { tp, s, ph, J, st } = c, base = tp(.7, -c.tw * .9), k = st === 3 ? 1 : .6;
  P.layer('far');
  const f = sin(ph) * 5, tips = [];
  for (let i = 0; i < 3; i++) { const a = (-172 + i * 30 + f * (1 - i * .3)) * D, l = (30 - i * 4) * s * k; tips.push([add(base, [cos(a), sin(a)], l), a]); }
  const mem = [base, tips[0][0]];
  for (let i = 1; i < 3; i++) mem.push(add(mix(tips[i - 1][0], tips[i][0], .5), [0, 5 * s]), tips[i][0]);
  mem.push(add(base, [-2 * s, 14 * s]));
  P.smooth(mem, 'membr', { n: 2, shade: 'vol', line: false });
  for (const [t] of tips) { P.strip([base, mix(base, t, .5), t], 2.2 * s, 1, 'gold', { shade: 'cyl', smooth: true }); P.line([add(t, [0, 0]), add(t, [-.5, 3 * s])], 'gold', 4, {}); }
  P.line([mix(base, tips[1][0], .5), mix(tips[0][0], tips[1][0], .5)], 'membr', 4, { on: 'membr' });
  P.line([mix(base, tips[2][0], .5), mix(tips[1][0], tips[2][0], .5)], 'membr', 1, { on: 'membr' });
  void J;
}

function zarpa(P, c, S, near) {
  const { J, s } = c, ha = J['ha' + S], dL = P.dir('arm' + S + '.lower'), n = [dL[1], -dL[0]];
  P.blob(add(ha, dL, .8 * s), 2.3 * s, 2.2 * s, 'scale', { shade: 'sphere', line: near });
  for (let i = -1; i <= 1; i++) P.line([add(add(ha, dL, 2.6 * s), n, i * 1.3 * s), add(add(ha, dL, 4.2 * s), n, i * 1.4 * s)], 'horn', 4, {});
}
function brazo(P, c, S, layer, cl) {
  const { J, L } = P, s = c.s, near = S === 'N';
  P.layer(layer);
  const sh = J['sh' + S], el = J['el' + S], ha = J['ha' + S], dU = P.dir('arm' + S + '.upper'), dL = P.dir('arm' + S + '.lower');
  P.blob(sh, L.upperW, L.upperW, 'scale', { shade: 'sphere' });
  P.limb('arm' + S + '.upper', 'scale', L.upperW * 1.2, L.upperW * 1.05);
  P.fold([add(sh, dU, 3 * s), add(el, dU, -4 * s)], 'scale');
  if (cl === 0) {                                                                         // hombrera con púa y guardabrazo de oro
    P.limb('arm' + S + '.lower', 'scale', L.lowerW * 1.15, L.lowerW);
    P.cap(mix(el, ha, .3), ha, L.lowerW * 1.8, L.lowerW * 1.5, 'gold', { shade: 'cyl', line: near });
    P.blob(add(sh, dU, -.4 * s), L.upperW * .95, L.upperW * .7, 'gold', { shade: 'sphere', line: near });
    if (near) P.poly([add(sh, [-1.2 * s, -L.upperW * .6]), add(sh, [.5 * s, -L.upperW * 1.45]), add(sh, [1.6 * s, -L.upperW * .6])], 'gold', { shade: 'vol', line: true });
  } else {
    P.limb('arm' + S + '.lower', 'scale', L.lowerW * 1.1, L.lowerW * .95);
    const m = cl === 1 ? 'cloth' : 'cloth2';
    P.cap(el, mix(el, ha, .66), L.lowerW * 1.5, L.lowerW * 2.2, m, { shade: 'cyl', line: near });                 // manga de campana
    P.fold([add(el, dL, 1 * s), add(mix(el, ha, .6), dL, 0)], m);
    banda(P, mix(el, ha, .68), dL, L.lowerW * 2.2, 1.4 * s, 'gold', 2, { line: near });
    if (cl === 1) P.emit({ px: [mix(el, ha, .8)] });
  }
  zarpa(P, c, S, near);
  return add(ha, dL, .8 * s);
}

// --- armas ---
function lanza(P, c, hand, d) {                                                           // lanza larga con hoja de acero, filo de oro y banderola carmín
  const s = c.s, n = [d[1], -d[0]], b = add(hand, d, -7 * s), t = add(hand, d, 19 * s), tip = add(hand, d, 28 * s);
  P.layer('top');
  P.cap(b, t, 2.2 * s, 1.8 * s, 'leather', { shade: 'cyl', line: true });
  banda(P, add(hand, d, -1.5 * s), d, 3.4 * s, 1.2 * s, 'gold', 3);
  P.poly([add(t, n, 2.2 * s), add(add(t, d, 3 * s), n, 2.8 * s), tip, add(add(t, d, 3 * s), n, -2.8 * s), add(t, n, -2.2 * s)], 'metal', { shade: 'vol', line: true });
  P.line([add(t, d, 1 * s), add(tip, d, -2 * s)], 'metal', 4, { on: 'metal' });
  banda(P, add(t, d, -.5 * s), d, 4 * s, 1.3 * s, 'gold', 3);
  const sw = sin(c.ph + 1) * 1.6 + c.wind * 3;                                              // banderola
  P.strip([add(t, d, -2 * s), add(add(add(t, d, -2 * s), [-1, 0], 6 * s), [0, 1], 2.5 * s + sw), add(add(add(t, d, -2 * s), [-1, 0], 12 * s), [0, 1], 3.5 * s + sw * 1.4)], 3.4 * s, 1.2 * s, 'scale', { smooth: true, line: true });
  P.anchor('muzzle', tip); P.anchor('rod', tip);
  return tip;
}
function cuerno(P, c, hand, d) {                                                          // cuerno-canal: cuerno curvo con boca de cristal por donde sale el fuego frío
  const s = c.s, n = [d[1], -d[0]], b = add(hand, d, -3 * s), m = add(add(hand, d, 8 * s), n, 1.6 * s), t = add(add(hand, d, 15 * s), n, -.2 * s);
  P.layer('top');
  P.strip([b, m, t], 4 * s, 2.4 * s, 'horn', { shade: 'cyl', smooth: true, line: true });
  banda(P, add(hand, d, 1.5 * s), d, 4.6 * s, 1.2 * s, 'gold', 3);
  banda(P, add(m, d, 1 * s), d, 4.2 * s, 1.1 * s, 'gold', 3);
  P.blob(add(t, d, 1.4 * s), 2.2 * s, 2.2 * s, 'fuego', { shade: 'sphere', line: true });
  P.emit({ px: [add(t, d, 1.4 * s), add(t, d, 2.4 * s)] });
  const tip = add(t, d, 3.4 * s); P.anchor('muzzle', tip); P.anchor('rod', tip);
  return tip;
}
function cetro(P, c, hand, d) {                                                           // cetro con disco de escamas de oro y gema
  const s = c.s;
  let u = [d[0] * .38, -.65 + d[1] * .38]; const l = Math.hypot(u[0], u[1]) || 1; u = [u[0] / l, u[1] / l];
  const n = [u[1], -u[0]], b = add(hand, u, -13 * s), t = add(hand, u, 20 * s);
  P.layer('top');
  P.cap(b, t, 2.4 * s, 1.8 * s, 'gold', { shade: 'cyl', line: true });
  banda(P, add(hand, u, -2.5 * s), u, 3.6 * s, 1.1 * s, 'scale', 3);
  const cen = add(t, u, 5 * s), pts = [];
  for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU; pts.push([cen[0] + cos(a) * 5.2 * s, cen[1] + sin(a) * 5.2 * s]); }
  P.strip(pts, 2 * s, 2 * s, 'gold', { shade: 'cyl', line: true });
  for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 1; P.poly([add(cen, [cos(a) * 1.8 * s, sin(a) * 1.8 * s]), add(cen, [cos(a + 1.4) * 4 * s, sin(a + 1.4) * 4 * s]), add(cen, [cos(a - 1.4) * 4 * s, sin(a - 1.4) * 4 * s])], 'luz', { shade: 'flat', tone: 3 - (i % 2) }); }
  P.blob(cen, 2 * s, 2 * s, 'scale', { shade: 'sphere', line: true });
  P.emit({ px: [add(cen, [-.5, -.5])] });
  const top = add(cen, u, 5 * s); P.anchor('rod', top); P.anchor('muzzle', top);
  return top;
}

// ---------------------------------------------------------------------------------------------
// 5. Dibujo de cada clase.
function dibujar(P, ctx, cl) {
  const c = info(P, ctx), { J, s, st } = c;
  if (st >= 2) alas(P, c);
  pierna(P, c, 'F', 'far', cl);
  brazo(P, c, 'F', 'far', cl);
  cola(P, c, cl);
  const fa = cl === 0 ? { len: .62, narrow: .8, mat: 'cloth', hem: 'gold' } : cl === 1 ? { len: 1.4, flare: 1.6, mat: 'cloth', hem: 'gold', rombo: true } : { len: 1.85, flare: 2.4, mat: 'cloth2', hem: 'gold', rombo: true };
  falda(P, c, false, fa);
  torso(P, c, cl);
  const patada = c.A['legN.upper'] > 55;
  if (patada) { falda(P, c, true, fa); pierna(P, c, 'N', 'near', cl); } else { pierna(P, c, 'N', 'near', cl); falda(P, c, true, fa); }
  cabeza(P, c, cl);
  ojo(P, c, cl);
  const hand = brazo(P, c, 'N', 'near', cl), d = P.dir('armN.lower');
  let tip;
  if (cl === 0) tip = lanza(P, c, hand, d);
  else if (cl === 1) tip = cuerno(P, c, hand, d);
  else tip = cetro(P, c, hand, d);
  if (cl === 0 && ctx.anim.startsWith('atk') && ctx.frame === 1) {                         // chispas de acero en el impacto
    const r = ctx.rng;
    for (let i = 0; i < 4; i++) { const a = r() * TAU, dd = 3 + r() * 4; P.emit({ px: [[tip[0] + cos(a) * dd + 2, tip[1] + sin(a) * dd]] }); }
  }
  if (cl === 2) for (let i = 0; i < 3; i++) { const a = c.ph + i * TAU / 3, o = add(J.head, [cos(a) * 11 * s, -6 * s + sin(a) * 4 * s]); P.emit({ poly: [[o[0], o[1] - 1.5], [o[0] + 1.2, o[1]], [o[0], o[1] + 1.5], [o[0] - 1.2, o[1]]] }); }
  P.anchor('haN', hand);
  P.anchor('head', J.head);
}

// ---------------------------------------------------------------------------------------------
// 6. Efectos vivos. Contrato real de render/scene.js: c = { x, y (pies), w, h, t (ms), lite, face, alpha, idx, variant }.
const px = (g, x, y, col, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.globalAlpha = 1; };
const escala = c => Math.max(.8, Math.min(1.3, (c.h || 64) / 64));

// Silueta de dragón (cabeza con cuernos, hocico abierto y cuello), generada una vez como tramos de píxeles
let DRAGON = null;
function dragon() {
  if (DRAGON) return DRAGON;
  const runs = [];
  const inTri = (x, y, p) => { const s1 = (p[2] - p[0]) * (y - p[1]) - (p[3] - p[1]) * (x - p[0]), s2 = (p[4] - p[2]) * (y - p[3]) - (p[5] - p[3]) * (x - p[2]), s3 = (p[0] - p[4]) * (y - p[5]) - (p[1] - p[5]) * (x - p[4]); return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0); };
  const T = [[14, 8, 2, 0, 9, 6], [17, 7, 8, -2, 13, 6], [18, 12, 36, 14, 18, 17], [18, 19, 34, 25, 16, 22], [8, 18, 0, 38, 16, 30], [-2, 26, 7, 12, 12, 24]];
  for (let y = 0; y < 40; y++) {
    let x0 = -1;
    for (let x = 0; x <= 40; x++) {
      const e = ((x - 16) / 7.5) ** 2 + ((y - 14) / 7) ** 2 <= 1 || T.some(t => inTri(x + .5, y + .5, t));
      if (e && x0 < 0) x0 = x;
      if (!e && x0 >= 0) { runs.push([y, x0, x - 1]); x0 = -1; }
    }
  }
  return (DRAGON = runs);
}
function dibujaDragon(g, cell, col, a) {
  g.globalAlpha = a; g.fillStyle = col;
  for (const [y, x0, x1] of dragon()) g.fillRect(x0 * cell, y * cell, (x1 - x0 + 1) * cell, cell);
  g.globalAlpha = 1;
}
const fx = {
  back(g, c, stage) {
    if (stage < 2) return;
    const t = c.t / 1000, s = escala(c), v = c.variant ? 1 : 0, pal = BRASA[v];
    g.save(); g.translate(c.x, c.y);
    if (stage === 3) {                                                                   // dragón espectral detrás, que respira
      g.save(); g.scale(c.face, 1);
      const cell = Math.max(2, Math.round(2.4 * s * (c.lite ? .75 : 1))), a = .2 + .05 * sin(t * Math.PI);
      g.translate(-10 * s - 12 * cell | 0, -50 * s - 10 * cell | 0);
      dibujaDragon(g, cell, pal[2], a);
      g.fillStyle = pal[0]; g.globalAlpha = .7; g.fillRect(20 * cell, 12 * cell, cell, cell); g.globalAlpha = 1;
      g.restore();
    }
    // humo: bocanadas grises que suben y se abren despacio
    const n = c.lite ? 2 : stage === 2 ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const k = (t * .26 + i / n) % 1, x = Math.sin(i * 5.7 + k * 2) * (6 + k * 8) * s, y = -22 * s - k * 46 * s;
      px(g, x, y, k < .5 ? '#6a5a66' : '#4a3e4a', (1 - k) * .55); if (!c.lite) px(g, x + 1, y, '#8a7a86', (1 - k) * .35);
    }
    g.restore();
  },
  front(g, c, stage) {
    if (stage < 2 || c.lite) return;
    const t = c.t / 1000, s = escala(c), pal = BRASA[c.variant ? 1 : 0];
    g.save(); g.translate(c.x, c.y);
    const f = t * (stage === 2 ? .8 : 1.1), k = Math.floor(f), ph = f - k;                // una ascua cada ~1 s (≤ 2 Hz)
    if (ph < .6) { const x = ((k * 31 + (c.idx || 0) * 17) % 19 - 9) * s * c.face, y = -(10 + (k * 13) % 30) * s - ph * 14 * s; px(g, x, y, pal[0], 1 - ph / .6); px(g, x, y + 1, pal[1], (1 - ph / .6) * .7); }
    if (stage === 3) for (let i = 0; i < 4; i++) { const kk = (t * .3 + i / 4) % 1; px(g, Math.sin(i * 4 + kk * 3) * 15 * s, -(18 + kk * 44) * s, pal[i % 3], .8 - kk * .6); }
    g.restore();
  },
};

// Remate de la transformación: columna de brasa que sube y anillo de escamas que se abre (sin destello de pantalla)
function transformFx(g, c, k) {
  const s = escala(c), pal = BRASA[c.variant ? 1 : 0];
  g.save(); g.translate(c.x, c.y);
  if (k < .7) {
    const h = Math.min(1, k / .35) * 110;
    for (let y = 0; y < h; y += 2) { const x = Math.sin(y * .4 + k * 9); px(g, x - 5 * s, -y, pal[1], .7); px(g, x + 5 * s, -y, pal[1], .7); if (y % 6 === 0) px(g, x, -y, pal[0]); }
    for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, r = 8 + 26 * k; px(g, cos(a) * r, sin(a) * r * .3, pal[2], 1 - k); }
  } else {
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + k * 2, r = (6 + (k - .7) * 70) * s; px(g, cos(a) * r, -28 * s + sin(a) * r * .5, pal[i % 3], 1 - (k - .7) * 3); }
  }
  g.restore();
}

// ---------------------------------------------------------------------------------------------
const poseDe = i => (anim, k) => (POSE[i](anim, k) || null);
const CUERPO = [{ body: 'draco', height: 64, shoulder: 1.1, headScale: 1.1 }, { body: 'draco', height: 62, shoulder: .98, headScale: 1.12 }, { body: 'draco', height: 64, shoulder: .96, headScale: 1.12 }];
const ANCLAS = ['haN', 'haF', 'head', 'chest', 'muzzle'];
export default {
  id: 'draconios',
  kit: 1,
  ready: true,
  materials: ['scale', 'belly', 'gold', 'horn', 'cloth', 'cloth2', 'leather', 'metal', 'fuego', 'luz', 'membr', 'iris'],
  ramps(variant, stage) {
    const v = variant ? 1 : 0, st = stage || 1, pick = k => RAMPAS[k][Math.min(v, RAMPAS[k].length - 1)];
    const sc = pick('scale').slice(), gd = pick('gold').slice();
    if (st >= 2) { sc[3] = v ? '#7aa6ff' : '#f27aa4'; sc[4] = v ? '#cce0ff' : '#ffc4d8'; }                      // escamas con más luz
    if (st === 3) { gd[3] = v ? '#f0f6ff' : '#ffe07a'; gd[4] = v ? '#ffffff' : '#fffbd0'; }
    return {
      scale: ramp5(sc), belly: ramp5(pick('belly')), gold: ramp5(gd), horn: ramp5(pick('horn')), cloth: ramp5(pick('cloth')), cloth2: ramp5(pick('cloth2')),
      leather: ramp5(pick('leather')), metal: ramp5(pick('metal')), fuego: ramp5(pick('fuego')), luz: ramp5(pick('luz')), membr: ramp5(pick('membr')),
      iris: ramp5(IRIS[v]),
    };
  },
  emit: variant => EMIT[variant ? 1 : 0],
  geomStage: s => s,
  extraAnims: {},
  extraPoses: {},
  classes: [
    { id: 'lancero', name: 'Lancero dracónico', build: CUERPO[0], look: { hair: 'calvo' }, anchors: ANCLAS, pose: poseDe(0), draw: (P, ctx) => dibujar(P, ctx, 0) },
    { id: 'aliento', name: 'Aliento-mago', build: CUERPO[1], look: { hair: 'calvo' }, anchors: ANCLAS, pose: poseDe(1), draw: (P, ctx) => dibujar(P, ctx, 1) },
    { id: 'sacerdotisa', name: 'Sacerdotisa de escamas', build: CUERPO[2], look: { hair: 'largo' }, anchors: ANCLAS, pose: poseDe(2), draw: (P, ctx) => dibujar(P, ctx, 2) },
  ],
  stageScale: [1, 1.04, 1.1],
  fx,
  transformFx,
};
