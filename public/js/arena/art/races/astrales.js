// Raza «astrales» · Hijos del Cielo Nocturno (paquete A-AST). Arte 16 bits propio, 3 etapas y variantes A/B.
// Clases: 0 Guardián estelar (coraza de noche, escudo-disco con constelación, puño con anillo),
//         1 Astróloga (túnica de estrellas y astrolabio flotante), 2 Monje lunar (moño con aro y anillos de luz).
// Guía: docs/arena-estilo-16bits.md. Solo se importa de '../kit16/*'. Sin Math.random (usa ctx.rng).
// Diferencia con los Tempestarios (también violeta): aquí todo es REDONDO y suave (órbitas, halos, discos, estrellas de 4 puntas),
// la piel es lila, el pelo azul noche y el oro es pálido de estrella; ellos usan rayos angulosos, pelo plata y túnica azul oscuro.
// Orden del archivo: 1 paleta · 2 poses · 3 datos del fotograma · 4 piezas · 5 dibujo de cada clase · 6 efectos vivos.
//   Etapa 1 Formación · 2 Constelación Naciente (estrellas en órbita y constelaciones en la ropa, ojos brillantes) ·
//   3 Firmamento Pleno (capa de nebulosa, halo redondo y corona de luna, galaxia detrás y anillos de luz).
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------------------------------------------------------------------------------------------
// 1. Paleta (spec: violeta #6a4ac8, azul noche, estrellas #fff2c0). [sombra profunda, sombra, base, luz, brillo]. B = noche turquesa y plata.
const RAMPAS = {
  skin:    [['#2a2a6a', '#5a58a4', '#9a98d8', '#c6c4f0', '#eceaff'], ['#2a3a5a', '#5a6e94', '#9aacd0', '#c4d2ea', '#eaf2ff']],
  hair:    [['#080824', '#16164a', '#2a2c78', '#4852b0', '#8a9af0'], ['#4a5070', '#8a92b4', '#c8d0e8', '#e8eefa', '#ffffff']],
  cloth:   [['#080620', '#141044', '#241e74', '#3a3aac', '#6a74e0'], ['#041620', '#0a2e3e', '#12506a', '#1e7c9c', '#58bede']],
  cloth2:  [['#180c44', '#34228a', '#6a4ac8', '#9a7ef0', '#d0beff'], ['#0c2a40', '#1c5078', '#2e82b0', '#5ab8e0', '#b8f0ff']],
  trim:    [['#6a5a30', '#b8a060', '#fff2c0', '#fffae0', '#ffffff'], ['#6a7490', '#a8b4cc', '#e4ecf8', '#f6faff', '#ffffff']],
  metal:   [['#141432', '#2c2c62', '#5a5aa4', '#9a9ae0', '#e4e4ff'], ['#122434', '#2a4a62', '#5a88a8', '#9ac8e4', '#e8f8ff']],
  neb:     [['#0a0628', '#26106a', '#5a2ab0', '#9a4ee0', '#e09aff'], ['#041a30', '#0c3c6a', '#1c70b4', '#3cb0e8', '#9aeeff']],
  gem:     [['#241060', '#4a2ab0', '#8a62f0', '#c4acff', '#ffffff'], ['#0a3050', '#1a6ea0', '#4cb4e8', '#a8e4ff', '#ffffff']],
};
const IRIS = [['#241060', '#6a4ac8', '#fff2c0', '#ffffff', '#ffffff'], ['#0a3050', '#4cb4e8', '#e0f8ff', '#ffffff', '#ffffff']];
const EMIT = ['#fff2c0', '#e0f8ff'];
const ESTR = [['#ffffff', '#fff2c0', '#b49cff'], ['#ffffff', '#e0f8ff', '#7ad0f0']];

// ---------------------------------------------------------------------------------------------
// 2. Poses propias. Ángulos: 0 = colgando, 90 = al frente, 180 = arriba. Flotan: sin apoyo (z) y piernas colgando.
const G = o => o;
const POSE = [
  // Guardián: guardia con el escudo-disco adelantado y el puño cercano recogido.
  (anim, k) => ({
    idle: [0, 1, 2, 3].map(i => { const b = [0, .6, 1, .6][i]; return G({ lean: 4 + b * .5, sp: 3, nk: 1, shN: 40 + b * 3, elN: 110, shF: 54, elF: 92 + b * 3 }); })[k],
    block: G({ lean: 8, sp: 4, nk: 3, shN: 56, elN: 112, shF: 82, elF: 86 }),
  }[anim]),
  // Astróloga: una mano alza el astrolabio y la otra dibuja en el aire.
  (anim, k) => ({
    idle: [0, 1, 2, 3].map(i => { const b = [0, .5, 1, .5][i]; return G({ lean: 2, sp: 1, nk: 2 - b, shN: 48 + b * 3, elN: 70, shF: 30, elF: 80 + b * 6 }); })[k],
  }[anim]),
  // Monje: manos abiertas a los lados del pecho, como sosteniendo un círculo invisible.
  (anim, k) => ({
    idle: [0, 1, 2, 3].map(i => { const b = [0, .5, 1, .5][i]; return G({ lean: 1, sp: 0, nk: 2 - b * .5, shN: 42 + b * 3, elN: 84, shF: 52 + b * 3, elF: 80 }); })[k],
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
  const wind = (VIENTO[ctx.anim] ?? 0) + [0, .2, .35][st - 1];
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
// Estrella de 4 puntas emisiva (cruz con punto central)
const estrella = (P, p, r = 1) => P.emit({ px: [p, [p[0] - r, p[1]], [p[0] + r, p[1]], [p[0], p[1] - r], [p[0], p[1] + r]] });
// Anillo emisivo: elipse de rx × ry con giro rot (grados)
function anillo(P, c, cen, rx, ry, rot = 0, n = 16) {
  const pts = [], cr = cos(rot * D), sr = sin(rot * D);
  for (let i = 0; i <= n; i++) { const a = i / n * TAU, x = cos(a) * rx, y = sin(a) * ry; pts.push([cen[0] + x * cr - y * sr, cen[1] + x * sr + y * cr]); }
  P.emit({ line: pts });
  void c;
}
// Constelación: estrellas con líneas finas entre ellas (solo etapas 2 y 3)
function constelacion(P, pts, lineas = true) {
  if (lineas) for (let i = 0; i + 1 < pts.length; i++) P.line([pts[i], pts[i + 1]], 'trim', 1, { on: 'cloth' });
  P.emit({ px: pts });
}

function pierna(P, c, S, layer, cl) {
  const { L, s, J } = c;
  P.layer(layer);
  const near = S === 'N', kn = J['kn' + S], d = P.dir('leg' + S + '.upper'), n = [d[1], -d[0]];
  P.limb('leg' + S + '.upper', 'cloth', L.thighW * 1.12, L.thighW * .92);
  if (cl === 0) {                                                                       // grebas de noche con ribete de estrella
    P.limb('leg' + S + '.lower', 'metal', L.shinW * 1.3, L.shinW * 1.0, { line: near });
    P.blob(add(kn, d, .6), 2.7 * s, 2.5 * s, 'metal', { shade: 'sphere', line: near });
    P.line([add(kn, n, -2.2 * s), add(add(kn, d, 1), n, 2.2 * s)], 'trim', 3, { on: 'metal' });
  } else {
    P.limb('leg' + S + '.lower', 'cloth', L.shinW * 1.15, L.shinW * .92);
    P.fold([add(kn, d, -1.5), add(kn, n, -2.2 * s)], 'cloth');
  }
  P.cap(J['heel' + S], J['toe' + S], L.ankle * 1.8, L.ankle * 1.2, cl === 0 ? 'metal' : 'cloth2');
  P.blob(add(J['toe' + S], [-.4 * s, -.2 * s]), 1.5 * s, 1.5 * s, cl === 0 ? 'metal' : 'cloth2', { shade: 'sphere' });
  P.line([add(J['toe' + S], [-.4 * s, -1.4 * s])], 'trim', 4, {});
}

// Faldón largo que se afila hacia abajo en tres picos suaves (etéreo: la ropa termina en jirones de noche).
function falda(P, c, near, o) {
  const { L } = P, { tp, hw, s, wind, gravity: g, ph } = c, back = [-1, 0];
  const len = L.thigh * o.len * (near ? .92 : 1.08);
  const sway = (wind * 7 + sin(ph + (near ? 0 : 1.3)) * (1.4 + c.st * .5)) * s, fl = (o.flare || 0) * s;
  const a = tp(.2, -hw * (near ? 1.05 : .9) * (o.narrow || 1)), b = tp(.2, hw * (near ? 1.15 : .3) * (o.narrow || 1));
  const bBot = add(add(add(b, g, len * (near ? .84 : .9)), back, sway * .55), [1, 0], near ? fl : fl * .4);
  const aBot = add(add(a, g, len * 1.04), back, sway * 1.25 + (near ? 0 : 2 * s) + fl * .5);
  const m1 = add(mix(aBot, bBot, .34), g, 3 * s), m2 = add(mix(aBot, bBot, .68), g, 1.4 * s);
  P.smooth([a, mix(a, b, .5), b, bBot, m2, m1, aBot], o.mat, { n: 3, line: near });
  if (near) {
    P.fold([mix(a, b, .35), add(mix(aBot, bBot, .35), g, -2 * s)], o.mat);
    P.fold([mix(a, b, .72), add(mix(aBot, bBot, .72), g, -3.5 * s)], o.mat);
    P.line([add(bBot, g, -.5), add(m2, g, -.5), add(m1, g, -.5), add(aBot, g, -.5)], o.hem || 'trim', 3, { on: o.mat });
    if (c.st >= 2 && o.stars) constelacion(P, [mix(mix(a, b, .3), mix(aBot, bBot, .3), .5), mix(mix(a, b, .7), mix(aBot, bBot, .55), .5), mix(mix(a, b, .5), mix(aBot, bBot, .9), .5)]);
  }
}

function torso(P, c, cl) {
  const { tp, tw, hw, s, fwd, st, ph } = c;
  P.layer('body');
  const mat = cl === 0 ? 'cloth' : cl === 1 ? 'cloth' : 'cloth2';
  const sh = [tp(-.02, -hw * .98), tp(.2, -tw * .86), tp(.5, -tw * .8), tp(.78, -tw * 1.0), tp(1.0, -tw * .9), tp(1.13, -tw * .38),
    tp(1.13, tw * .42), tp(1.0, tw * 1.08), tp(.74, tw * 1.16), tp(.46, tw * .78), tp(.2, hw * .95), tp(-.02, hw * 1.02)];
  P.smooth(sh, mat, { n: 3 });
  P.fold([tp(.88, tw * .8), tp(.62, tw * .55)], mat);
  P.fold([tp(.58, -tw * .66), tp(.4, -tw * .5)], mat);
  if (cl === 0) {                                                                       // coraza de noche con disco de estrella y gorjal redondo
    P.smooth([tp(.3, -tw * .7), tp(.58, -tw * .86), tp(.98, -tw * .86), tp(1.08, tw * .3), tp(.96, tw * 1.08), tp(.7, tw * 1.14), tp(.44, tw * .8)], 'metal', { n: 3, line: true });
    P.line([tp(1.06, tw * .3), tp(.94, tw * 1.04), tp(.7, tw * 1.1), tp(.46, tw * .78)], 'trim', 3, { on: 'metal' });
    P.blob(tp(.74, tw * .5), 2.6 * s, 2.6 * s, 'cloth2', { shade: 'sphere', line: true });
    P.line([tp(.74, tw * .5)], 'trim', 4, {});
    P.blob(add(tp(1.18, 0), [0, 0]), 3.2 * s, 2 * s, 'metal', { shade: 'vol', line: true });
    banda(P, tp(.3, 0), c.up, tw * 2.0, 1.3 * s, 'trim', 3);
    if (st >= 2) estrella(P, tp(.74, tw * .5), 1);
    if (st >= 2) constelacion(P, [tp(.9, -tw * .5), tp(.7, -tw * .6), tp(.55, -tw * .45)], false);
  } else if (cl === 1) {                                                                // chaleco de estrellas, cuello alto de luna y cinto con colgante
    P.poly([tp(1.0, -tw * .5), tp(1.24, -tw * .35), tp(1.24, tw * .3), tp(1.0, tw * .62)], 'cloth2', { shade: 'vol', line: true });
    P.strip([tp(1.12, tw * .4), tp(.82, tw * .15), tp(.5, tw * .1), tp(.2, tw * .2)], 1.9 * s, 1.5 * s, 'trim', { shade: 'cyl', line: true });
    const knot = add(tp(.33, 0), fwd, tw * .38), sw = sin(ph + 1) * 1.6 + c.wind * 3;
    P.poly([tp(.42, -tw * .8), tp(.42, tw * .82), tp(.22, hw * .98), tp(.22, -hw * .96)], 'cloth2', { shade: 'vol', line: true });
    P.blob(knot, 2 * s, 1.9 * s, 'trim', { shade: 'sphere', line: true });
    P.strip([knot, add(add(knot, c.gravity, 5 * s), [-1, 0], sw * .5), add(add(knot, c.gravity, 10 * s), [-1, 0], sw * 1.1)], 2.2 * s, 1.1 * s, 'cloth2', { smooth: true, line: true });
    if (st >= 2) constelacion(P, [tp(.9, tw * .7), tp(.74, tw * .3), tp(.6, tw * .8), tp(.46, tw * .5)]);
  } else {                                                                              // túnica violeta cruzada con fajín y colgante de luna
    P.poly([tp(1.0, -tw * .5), tp(1.2, -tw * .35), tp(1.2, tw * .3), tp(1.0, tw * .62)], 'cloth2', { shade: 'vol', line: true });
    P.strip([tp(1.1, tw * .5), tp(.84, tw * .25), tp(.56, tw * .05)], 1.8 * s, 1.4 * s, 'trim', { shade: 'cyl', line: true });
    P.poly([tp(.42, -tw * .8), tp(.42, tw * .82), tp(.2, hw), tp(.2, -hw)], 'cloth', { shade: 'vol', line: true });
    P.blob(add(tp(.32, 0), fwd, tw * .38), 2.2 * s, 2.2 * s, 'trim', { shade: 'sphere', line: true });
    if (st >= 2) P.emit({ px: [tp(.8, tw * .4), tp(.64, tw * .65)] });
  }
}

// Cabeza de perfil, sin orejas puntiagudas: piel lila, ojos blancos que brillan desde la etapa 2.
function cabeza(P, c, cl) {
  const { hp, R, J } = c;
  P.layer('body');
  P.cap(J.chest, J.head, c.L.head * .27, c.L.head * .25, 'skin', { dt: -1 });
  P.blob(J.head, R, R * 1.1, 'skin', { shade: 'flat', tone: 2 });
  P.smooth([hp(.1, -.6), hp(.98, -.46), hp(1.04, -.12), hp(1.2, .2), hp(1.0, .38), hp(1.04, .6), hp(.88, .98), hp(.25, 1.02), hp(-.1, .6)], 'skin', { n: 3, shade: 'flat', tone: 3 });
  P.smooth([hp(.0, .5), hp(.8, .66), hp(.9, .98), hp(.25, 1.02), hp(-.12, .6)], 'skin', { n: 3, shade: 'flat', tone: 2, on: 'skin' });
  P.blob(hp(.62, .16), R * .34, R * .26, 'skin', { shade: 'flat', tone: 4 });
  P.blob(hp(.02, .22), R * .2, R * .3, 'skin', { shade: 'flat', tone: 2 });
  void cl;
}
function ojo(P, c, cl) {
  const { hp, st, golpe, s } = c, e = hp(.58, -.04);
  P.layer('top');
  P.eye([e[0] - .4, e[1] - .4], { iris: 'iris', size: 3 });
  if (st >= 2) P.emit({ px: [[e[0] + .5, e[1] + .6], [e[0] - .5, e[1] + .6]] });
  P.line([hp(.26, golpe ? -.5 : -.36), hp(.6, -.3), hp(1.0, golpe ? -.28 : -.2)], 'hair', cl === 2 ? 4 : 1, { on: 'skin' });
  P.line([hp(1.18, .22)], 'skin', 4, { on: 'skin' });
  P.line([hp(1.04, .4)], 'skin', 1, { on: 'skin' });
  const m = hp(.92, .66); P.line([m, [m[0] - 1.6, m[1] + (golpe ? .9 : 0)]], 'skin', 0, { on: 'skin' });
  if (cl === 2) P.emit({ px: [hp(.45, -.82), hp(.45, -.72)] });                          // marca de luna en la frente
  void s;
}

function hebra(P, c, root, { ang, len, curve = 0, sway = 0 }, tone, off = [-1, -1]) {
  const pts = [], n = 5; let p = root.slice();
  for (let i = 0; i <= n; i++) {
    pts.push(add(p, off));
    if (i < n) { const k = (i + 1) / n, a = (ang + curve * k + sway * sin(c.ph + k * 2.4) * k) * D; p = [p[0] + sin(a) * len / n, p[1] + cos(a) * len / n]; }
  }
  P.line(pts, 'hair', tone, { on: 'hair' });
}
// Pelo: 'corto' (Guardián: peinado atrás con cola de estrella), 'largo' (Astróloga: melena que flota sin gravedad), 'moño' (Monje).
function peloAtras(P, c, estilo) {
  const { hp, R, s, wind, st } = c, a0 = -8 - wind * (estilo === 'largo' ? 20 : 34);
  P.layer('body');
  if (estilo === 'corto') {
    P.smooth([hp(.1, -1.0), hp(-.9, -1.0), hp(-1.3, -.3), hp(-1.2, .4), hp(-.7, .74), hp(-.15, .5), hp(.05, 0)], 'hair', { n: 3, line: true });
    P.lock(hp(-.8, .1), { n: 4, ang: a0 - 6, len: R * 1.8, w: R * 1.0, w1: 1.4, curve: 14, sway: 3 }, 'hair', { dt: -1, line: true });
    hebra(P, c, hp(-.8, -.3), { ang: a0 - 4, len: R * 1.8, curve: 12, sway: 3 }, 4);
  } else if (estilo === 'largo') {
    const len = (24 + st * 3) * s, sw = 5 + st * 2;
    P.smooth([hp(.1, -1.0), hp(-.9, -1.0), hp(-1.4, -.3), hp(-1.3, .5), hp(-.8, 1.0), hp(-.2, .7), hp(.05, .1)], 'hair', { n: 3, line: true });
    P.lock(hp(-1.0, -.45), { n: 4, ang: a0 - 10, len: len * 1.1, w: R * 1.4, w1: 1.2, curve: 24, sway: sw }, 'hair', { line: true });
    P.lock(hp(-.75, .1), { n: 4, ang: a0 - 18, len: len * .85, w: R * 1.05, w1: 1.3, curve: 20, sway: sw * .8 }, 'hair', { dt: -1, line: true });
    hebra(P, c, hp(-1.05, -.4), { ang: a0 - 10, len, curve: 24, sway: sw }, 4);
    hebra(P, c, hp(-.8, -.2), { ang: a0 - 14, len: len * .8, curve: 20, sway: sw }, 0, [1, 1]);
  } else {                                                                              // cabeza afeitada con moño alto y aro de luz
    P.smooth([hp(.0, -.9), hp(-.7, -.9), hp(-1.05, -.3), hp(-.9, .3), hp(-.3, .3)], 'hair', { n: 3, line: true });
    const mo = hp(-.35, -1.75);
    P.blob(mo, R * .62, R * .62, 'hair', { shade: 'sphere', line: true });
    P.lock(mo, { n: 3, ang: a0 - 40, len: R * 2.2, w: R * .5, w1: 1, curve: 24, sway: 4 }, 'hair', { dt: -1, line: true });
    if (st >= 2) anillo(P, c, mo, R * .9, R * .9, 0, 14);
  }
}
function peloArriba(P, c, estilo) {
  const { hp, R, s, wind, st } = c;
  P.layer('top');
  if (estilo === 'moño') {
    P.smooth([hp(-.2, -.7), hp(-.9, -.7), hp(-.95, -1.1), hp(-.2, -1.25), hp(.5, -1.0), hp(.3, -.7)], 'hair', { n: 3 });
    P.line([hp(-.6, -1.1), hp(-.1, -1.2), hp(.3, -1.0)], 'hair', 4, { on: 'hair' });
    return;
  }
  P.smooth([hp(-.5, .1), hp(-1.12, -.15), hp(-1.0, -.95), hp(-.3, -1.4), hp(.6, -1.34), hp(1.07, -.85), hp(1.0, -.56), hp(.5, -.78), hp(.0, -.6)], 'hair', { n: 3 });
  P.lock(hp(.02, -.64), { n: 4, ang: -6 - wind * 22, len: R * 2.1, w: R * .8, w1: 1.1, curve: 8 - wind * 12, sway: 3 }, 'hair', { line: true });
  P.line([hp(-.55, -1.12), hp(-.1, -1.3), hp(.45, -1.22), hp(.8, -.98)], 'hair', 4, { on: 'hair' });
  P.line([hp(-.8, -.8), hp(-.55, -.45), hp(-.5, -.1)], 'hair', 1, { on: 'hair' });
  if (st >= 2) P.emit({ px: [hp(-.3, -1.1), hp(.4, -1.2), hp(-.7, -.6)] });             // destellos de estrella en el pelo
  if (estilo === 'largo') {                                                              // diadema con media luna
    P.strip([hp(1.0, -.54), hp(.55, -.78), hp(-.2, -.84), hp(-.96, -.58)], 1.6 * s, 1.6 * s, 'trim', { shade: 'cyl', smooth: true, line: true });
    P.blob(hp(.72, -.7), 1.5 * s, 1.5 * s, 'gem', { shade: 'sphere' });
  } else {                                                                              // casquete de noche con cresta de estrella
    P.strip([hp(1.0, -.54), hp(.55, -.78), hp(-.2, -.84), hp(-.96, -.58)], 1.5 * s, 1.5 * s, 'metal', { shade: 'cyl', smooth: true, line: true });
    estrella(P, hp(.5, -.92), 1);
  }
}

// Capa de nebulosa (etapa 3): cuelga de los hombros con estrellas dentro
function capa(P, c) {
  const { tp, tw, s, wind, gravity: g, ph, L } = c, len = L.thigh * 2.2;
  const sway = (wind * 8 + sin(ph + .6) * (1.6 + c.st * .5)) * s;
  const a = tp(1.06, -tw * .95), b = tp(1.14, tw * .1);
  const bBot = add(add(b, g, len * .8), [-1, 0], sway * .7 + 3 * s), aBot = add(add(a, g, len), [-1, 0], sway * 1.4 + 5 * s);
  P.layer('body');
  P.smooth([a, b, bBot, add(mix(aBot, bBot, .5), g, 3 * s), aBot], 'neb', { n: 3, dt: -1 });
  P.fold([mix(a, b, .5), add(mix(aBot, bBot, .5), g, -4 * s)], 'neb');
  P.fold([mix(a, b, .15), add(mix(aBot, bBot, .2), g, -7 * s)], 'neb');
  P.line([add(bBot, g, -.5), add(mix(aBot, bBot, .5), g, 2.5 * s), add(aBot, g, -.5)], 'trim', 2, { on: 'neb' });
  P.emit({ px: [mix(mix(a, b, .3), mix(aBot, bBot, .3), .4), mix(mix(a, b, .7), mix(aBot, bBot, .7), .5), mix(mix(a, b, .5), mix(aBot, bBot, .5), .8), mix(a, aBot, .6)] });
}
// Halo redondo tras la cabeza (etapa 3) y corona de luna
function halo(P, c) {
  const { hp, R } = c, o = hp(-.4, -.1);
  anillo(P, c, o, R * 1.9, R * 1.9, 0, 22);
  P.emit({ px: [hp(-.4, -2.4 * R / R), hp(-.4 - 2.2, -.1)] });
}

// --- armas y accesorios ---
function escudo(P, c, hand) {                                                             // escudo-disco: borde de metal, campo de noche y constelación
  const s = c.s, o = add(hand, [3 * s, -1.4 * s]), r = 7.4 * s, pts = [];
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; pts.push([o[0] + cos(a) * r, o[1] + sin(a) * r]); }
  P.layer('near');
  P.poly(pts, 'metal', { shade: 'vol', line: true });
  P.poly(pts.map(p => mix(o, p, .78)), 'cloth', { shade: 'vol' });
  P.line(pts.map(p => mix(o, p, .9)).concat([mix(o, pts[0], .9)]), 'trim', 3, { on: 'metal' });
  estrella(P, o, 2);
  P.emit({ px: [add(o, [-3.4 * s, -2.6 * s]), add(o, [3 * s, -3.4 * s]), add(o, [2.4 * s, 3.2 * s]), add(o, [-2.6 * s, 3 * s])] });
  P.line([add(o, [-3.4 * s, -2.6 * s]), add(o, [-1.4 * s, -1 * s])], 'trim', 1, { on: 'cloth' });
}
function guante(P, c, hand, d) {                                                          // puño con anillo de luz que gira
  const s = c.s, n = [d[1], -d[0]];
  P.layer('top');
  P.blob(add(hand, d, 1 * s), 3.2 * s, 3 * s, 'metal', { shade: 'sphere', line: true });
  banda(P, add(hand, d, -1 * s), d, 4.4 * s, 1.4 * s, 'trim', 3);
  const cen = add(hand, d, 4 * s), rx = (2.4 + 1.4 * Math.abs(cos(c.ph))) * s;
  anillo(P, c, cen, rx, 4.4 * s, Math.atan2(d[1], d[0]) / D + 90 - 90, 12);
  void n;
  P.anchor('muzzle', add(hand, d, 8 * s));
  return add(hand, d, 4 * s);
}
function astrolabio(P, c, hand) {                                                         // esfera armilar que flota sobre la palma
  const s = c.s, cen = add(hand, [1 * s, -9 * s + sin(c.ph) * 1.2 * s]), pts = [];
  P.layer('top');
  for (let i = 0; i <= 14; i++) { const a = i / 14 * TAU; pts.push([cen[0] + cos(a) * 6 * s, cen[1] + sin(a) * 6 * s]); }
  P.strip(pts, 1.6 * s, 1.6 * s, 'trim', { shade: 'cyl', line: true });
  const p2 = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * TAU; p2.push([cen[0] + cos(a) * 6 * s, cen[1] + sin(a) * 2.4 * s]); }
  P.strip(p2, 1.4 * s, 1.4 * s, 'gem', { shade: 'cyl', line: true });
  const p3 = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * TAU; p3.push([cen[0] + cos(a) * 2.4 * s, cen[1] + sin(a) * 6 * s]); }
  P.strip(p3, 1.2 * s, 1.2 * s, 'cloth2', { shade: 'cyl', line: true });
  P.blob(cen, 2.1 * s, 2.1 * s, 'gem', { shade: 'sphere', line: true });
  estrella(P, cen, 1);
  if (c.ctx.anim === 'cast' || c.ctx.anim === 'fire') {                                    // constelación que se une
    const q = []; for (let i = 0; i < 4; i++) { const a = c.ph + i * TAU / 4; q.push([cen[0] + cos(a) * 11 * s, cen[1] + sin(a) * 9 * s]); }
    P.emit({ line: q.concat([q[0]]) }); P.emit({ px: q });
  }
  P.anchor('muzzle', cen); P.anchor('rod', cen);
  return cen;
}
function anillosMonje(P, c, hand) {
  const s = c.s, { tp, tw, ph } = c;
  P.layer('top');
  const rx = (2.6 + 4.4 * Math.abs(cos(ph))) * s, cen = tp(.62, tw * 2.0);
  anillo(P, c, cen, rx, 8.4 * s, 0, 18);
  anillo(P, c, cen, rx * .62, 5.6 * s, 0, 14);
  anillo(P, c, add(hand, [0, 0]), 3.4 * s, 3.4 * s, 0, 10);
  if (c.st >= 3) anillo(P, c, add(c.J.haF, [0, 0]), 3.4 * s, 3.4 * s, 0, 10);
  P.anchor('muzzle', cen); P.anchor('rod', cen);
  return cen;
}

function brazo(P, c, S, layer, cl) {
  const { J, L } = P, s = c.s, near = S === 'N';
  P.layer(layer);
  const sh = J['sh' + S], el = J['el' + S], ha = J['ha' + S], dU = P.dir('arm' + S + '.upper'), dL = P.dir('arm' + S + '.lower');
  const manga = cl === 2 ? 'cloth2' : 'cloth', w = cl === 0 ? 1.35 : 1.7;
  P.blob(sh, L.upperW, L.upperW, manga, { shade: 'sphere' });
  P.limb('arm' + S + '.upper', manga, L.upperW * w, L.upperW * (w - .15));
  P.fold([add(sh, dU, 3 * s), add(el, dU, -4 * s)], manga);
  if (cl === 0) {
    P.limb('arm' + S + '.lower', 'metal', L.lowerW * 1.3, L.lowerW * 1.05);
    P.blob(el, 2.4 * s, 2.4 * s, 'metal', { shade: 'sphere', line: near });
    banda(P, mix(el, ha, .78), dL, L.lowerW * 1.45, 1.3 * s, 'trim', 3, { line: near });
    P.blob(add(sh, dU, -.5 * s), L.upperW * .95, L.upperW * .8, 'metal', { shade: 'sphere', line: near });                              // hombrera redonda (planeta)
    P.line([add(sh, [-L.upperW * .9, L.upperW * .35]), add(sh, [L.upperW * .9, L.upperW * .15])], 'trim', 3, { on: 'metal' });
    P.blob(add(ha, dL, 1 * s), 2.7 * s, 2.6 * s, 'metal', { shade: 'sphere', line: near });
  } else {
    P.limb('arm' + S + '.lower', 'skin', L.lowerW * 1.12, L.lowerW * .95);
    P.cap(el, mix(el, ha, .66), L.lowerW * 1.5, L.lowerW * 2.2, manga, { shade: 'cyl', line: near });
    P.fold([add(el, dL, 1 * s), add(mix(el, ha, .6), dL, 0)], manga);
    banda(P, mix(el, ha, .68), dL, L.lowerW * 2.2, 1.4 * s, 'trim', 3, { line: near });
    P.blob(add(ha, dL, .6 * s), 2.1 * s, 2.0 * s, 'skin', { shade: 'sphere', line: near });
    if (c.st >= 2) P.emit({ px: [mix(el, ha, .68)] });
  }
  return add(ha, dL, .6 * s);
}

// ---------------------------------------------------------------------------------------------
// 5. Dibujo de cada clase.
function dibujar(P, ctx, cl) {
  const c = info(P, ctx), { J, s, st } = c;
  const estilo = ['corto', 'largo', 'moño'][cl];
  if (st === 3) capa(P, c);
  pierna(P, c, 'F', 'far', cl);
  brazo(P, c, 'F', 'far', cl);
  const fa = cl === 0 ? { len: 1.1, narrow: .85, flare: .6, mat: 'cloth', hem: 'trim' } : cl === 1 ? { len: 1.9, flare: 2.4, mat: 'cloth', hem: 'trim', stars: true } : { len: 1.8, flare: 1.8, mat: 'cloth2', hem: 'trim', stars: true };
  falda(P, c, false, fa);
  torso(P, c, cl);
  const patada = c.A['legN.upper'] > 55;
  if (patada) { falda(P, c, true, fa); pierna(P, c, 'N', 'near', cl); } else { pierna(P, c, 'N', 'near', cl); falda(P, c, true, fa); }
  if (st === 3) halo(P, c);
  cabeza(P, c, cl);
  peloAtras(P, c, estilo);
  peloArriba(P, c, estilo);
  ojo(P, c, cl);
  if (st === 3) {                                                                         // corona de media luna sobre la frente
    const { hp, R } = c, o = hp(.2, -1.9), pts = [];
    for (let i = 0; i <= 8; i++) { const a = (200 + i * 17.5) * D; pts.push([o[0] + cos(a) * R * .9, o[1] + sin(a) * R * .55 + R * .5]); }
    P.emit({ line: pts });
  }
  if (cl === 0) escudo(P, c, J.haF);
  const hand = brazo(P, c, 'N', 'near', cl), d = P.dir('armN.lower');
  let tip;
  if (cl === 0) tip = guante(P, c, hand, d);
  else if (cl === 1) tip = astrolabio(P, c, hand);
  else tip = anillosMonje(P, c, hand);
  if (cl === 0 && ctx.anim.startsWith('atk') && ctx.frame === 1) {                         // chispas de estrella en el impacto
    const r = ctx.rng;
    for (let i = 0; i < 4; i++) { const a = r() * TAU, dd = 3 + r() * 4; P.emit({ px: [[tip[0] + cos(a) * dd + 3, tip[1] + sin(a) * dd]] }); }
  }
  void s;
  P.anchor('haN', hand);
  P.anchor('head', J.head);
}

// ---------------------------------------------------------------------------------------------
// 6. Efectos vivos. Contrato real de render/scene.js: c = { x, y (pies), w, h, t (ms), lite, face, alpha, idx, variant }.
const px = (g, x, y, col, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.globalAlpha = 1; };
const cruz = (g, x, y, col, a) => { px(g, x, y, col, a); px(g, x - 1, y, col, a * .6); px(g, x + 1, y, col, a * .6); px(g, x, y - 1, col, a * .6); px(g, x, y + 1, col, a * .6); };
const escala = c => Math.max(.8, Math.min(1.3, (c.h || 64) / 64));
const elipse = (g, cx, cy, rx, ry, col, a, n = 28, rot = 0) => {
  const cr = cos(rot), sr = sin(rot);
  for (let i = 0; i < n; i++) { const t = i / n * TAU, x = cos(t) * rx, y = sin(t) * ry; px(g, cx + x * cr - y * sr, cy + x * sr + y * cr, col, a); }
};
const fx = {
  back(g, c, stage) {
    if (stage < 2) return;
    const t = c.t / 1000, s = escala(c), pal = ESTR[c.variant ? 1 : 0];
    g.save(); g.translate(c.x, c.y);
    if (stage === 3) {                                                                   // galaxia a la espalda: brazos en espiral de puntos y núcleo claro
      const cx = -c.face * 4 * s, cy = -36 * s, n = c.lite ? 28 : 64;
      for (let i = 0; i < n; i++) {
        const arm = i % 2, k = (i >> 1) / (n / 2), a = k * 5.2 + arm * Math.PI + t * .35, r = (3 + k * 26) * s;
        px(g, cx + cos(a) * r, cy + sin(a) * r * .72, pal[(i + arm) % 3], (1 - k * .6) * .6);
      }
      if (!c.lite) { px(g, cx, cy, pal[0]); px(g, cx - 1, cy, pal[1], .8); px(g, cx + 1, cy, pal[1], .8); px(g, cx, cy - 1, pal[1], .8); px(g, cx, cy + 1, pal[1], .8); }
    }
    // órbita de estrellas con elipse suave de puntos (detrás del cuerpo)
    const n = c.lite ? 2 : stage === 2 ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const a = t * .5 + i / n * TAU, x = cos(a) * 19 * s, y = -34 * s + sin(a) * 6 * s;
      if (sin(a) < 0) cruz(g, x, y, pal[i % 2 ? 1 : 0], .85);
    }
    g.restore();
  },
  front(g, c, stage) {
    if (stage < 2) return;
    const t = c.t / 1000, s = escala(c), pal = ESTR[c.variant ? 1 : 0];
    g.save(); g.translate(c.x, c.y);
    const n = c.lite ? 2 : stage === 2 ? 4 : 6;
    for (let i = 0; i < n; i++) {                                                         // la mitad delantera de la órbita
      const a = t * .5 + i / n * TAU, x = cos(a) * 19 * s, y = -34 * s + sin(a) * 6 * s;
      if (sin(a) >= 0) cruz(g, x, y, pal[i % 2 ? 1 : 0], .95);
    }
    if (stage === 3 && !c.lite) {                                                         // anillos de luz alrededor del cuerpo
      elipse(g, 0, -34 * s, 24 * s, 7 * s, pal[2], .35, 30);
      elipse(g, 0, -34 * s, 15 * s, 4.5 * s, pal[1], .3, 22, .2);
    }
    if (!c.lite) {
      const f = t * .8, k = Math.floor(f), ph = f - k;                                     // un destello en cruz cada ~1,2 s (≤ 2 Hz)
      if (ph < .45) cruz(g, ((k * 41 + (c.idx || 0) * 7) % 23 - 11) * s * c.face, -(14 + (k * 17) % 40) * s, pal[0], 1 - ph / .45);
    }
    g.restore();
  },
};

// Remate de la transformación: constelación que se enciende alrededor y anillo que sube (sin destello de pantalla)
function transformFx(g, c, k) {
  const s = escala(c), pal = ESTR[c.variant ? 1 : 0];
  g.save(); g.translate(c.x, c.y);
  if (k < .7) {
    const m = Math.min(1, k / .5);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + k * 2, r = 26 * s * (1 - k * .3); const x = cos(a) * r, y = -34 * s + sin(a) * r * .7; cruz(g, x, y, pal[i % 2], m); }
    elipse(g, 0, -34 * s, 26 * s * m, 8 * s * m, pal[2], .6, 28);
  } else {
    const q = (k - .7) / .3;
    for (let j = 0; j < 3; j++) elipse(g, 0, (-8 - q * 70 - j * 14) * s, (22 - j * 4) * s, 6 * s, pal[j % 2 ? 1 : 0], (1 - q) * .8, 24);
  }
  g.restore();
}

// ---------------------------------------------------------------------------------------------
const poseDe = i => (anim, k, pose) => ({ ...(POSE[i](anim, k) || {}), ...(pose && pose.z !== undefined && !pose.rot ? { z: pose.z + .05 } : {}) });
const CUERPO = [{ body: 'etereo', height: 60, shoulder: 1.1, headScale: 1.1 }, { body: 'etereo', height: 60, shoulder: 1.0, headScale: 1.12 }, { body: 'etereo', height: 60, shoulder: .98, headScale: 1.12 }];
const ANCLAS = ['haN', 'haF', 'head', 'chest', 'muzzle'];
export default {
  id: 'astrales',
  kit: 1,
  ready: true,
  materials: ['skin', 'hair', 'cloth', 'cloth2', 'trim', 'metal', 'neb', 'gem', 'iris'],
  ramps(variant, stage) {
    const v = variant ? 1 : 0, st = stage || 1, pick = k => RAMPAS[k][Math.min(v, RAMPAS[k].length - 1)];
    const trim = pick('trim').slice(), c2 = pick('cloth2').slice();
    if (st >= 2) { c2[3] = v ? '#74c8f0' : '#aa90ff'; }                                                                // violeta con más luz y borde claro
    if (st === 3) { trim[2] = '#ffffff'; }
    return {
      skin: ramp5(pick('skin')), hair: ramp5(pick('hair')), cloth: ramp5(pick('cloth')), cloth2: ramp5(c2), trim: ramp5(trim),
      metal: ramp5(pick('metal')), neb: ramp5(pick('neb')), gem: ramp5(pick('gem')), iris: ramp5(IRIS[v]),
    };
  },
  emit: variant => EMIT[variant ? 1 : 0],
  geomStage: s => s,
  extraAnims: {},
  extraPoses: {},
  classes: [
    { id: 'guardian', name: 'Guardián estelar', build: CUERPO[0], look: { hair: 'corto' }, anchors: ANCLAS, pose: poseDe(0), draw: (P, ctx) => dibujar(P, ctx, 0) },
    { id: 'astrologa', name: 'Astróloga', build: CUERPO[1], look: { hair: 'largo' }, anchors: ANCLAS, pose: poseDe(1), draw: (P, ctx) => dibujar(P, ctx, 1) },
    { id: 'monje', name: 'Monje lunar', build: CUERPO[2], look: { hair: 'calvo' }, anchors: ANCLAS, pose: poseDe(2), draw: (P, ctx) => dibujar(P, ctx, 2) },
  ],
  stageScale: [1, 1.04, 1.1],
  fx,
  transformFx,
};
