// Raza «humanos» · Reino del Alba (paquete A-HUM). Arte 16 bits propio, 3 etapas y variantes A/B.
// Clases: 0 Caballera (espada y escudo), 1 Hechicero (bastón de cristal), 2 Sanadora (báculo con halo).
// Guía: docs/arena-estilo-16bits.md. Solo se importa de '../kit16/*'. Sin Math.random (usa ctx.rng).
// Orden del archivo: 1 paleta · 2 poses · 3 datos del fotograma · 4 piezas · 5 dibujo de cada clase · 6 efectos vivos.
//   Etapa 1 Formación · 2 Alba Encendida (oro vivo, tabardos y cintas ondeantes, motas de luz) ·
//   3 Gloria del Mediodía (alas de luz, halo, armadura dorada).
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------------------------------------------------------------------------------------------
// 1. Paleta (spec: azul real #2e4a8a, oro #e8b830, blanco). [sombra profunda, sombra, base, luz, brillo]. B = verde azulado y plata.
const RAMPAS = {
  skin:    [['#7a4a3a', '#a8705a', '#d49a78', '#f1c7a3', '#ffe6cc'], ['#6a4030', '#98684a', '#c08e66', '#d8a880', '#f0cca4']],
  hair2:   [['#4a2810', '#7a4a22', '#a8703a', '#cc9658', '#ecc088'], ['#241a2c', '#3e2c48', '#5c4268', '#7e6090', '#a088b4']],
  hair:    [['#1e1008', '#3a2010', '#6a3a1e', '#8e5a30', '#b88450'], ['#0a0806', '#1a120c', '#2b1d14', '#4a3424', '#6e5238']],
  cloth:   [['#0c1634', '#162a5c', '#2e4a8a', '#4a6cb8', '#82a4e6'], ['#082428', '#10424a', '#1f7a7a', '#3aa6a0', '#7adcd0']],
  cloth2:  [['#5a6088', '#9aa0c4', '#dcdff0', '#f4f6ff', '#ffffff'], ['#7a6a4c', '#b8a880', '#f0e4c4', '#fff6e0', '#ffffff']],
  gold:    [['#5a3408', '#a06a14', '#e8b830', '#f8d868', '#fff6b8'], ['#3a4256', '#7a8498', '#c8d0dc', '#e8eef8', '#ffffff']],
  steel:   [['#222838', '#46506a', '#8a96b0', '#c4cee2', '#f4f8ff']],
  leather: [['#1c120c', '#38281c', '#5a4030', '#7e5c40', '#a8825a']],
  pants:   [['#100e18', '#201c2c', '#38324a', '#54506a', '#78748e']],
  gem:     [['#0a2e7a', '#2260c8', '#52a0ff', '#a4d4ff', '#ffffff'], ['#5a144a', '#9a2e80', '#e05cba', '#ffa4e0', '#ffffff']],
  luz:     [['#d8b058', '#f0d88c', '#fff2c0', '#fffae0', '#ffffff']],
};
// Etapa 3: la armadura de acero pasa a oro (variante A) o plata clara (B). Etapa 2: el oro gana luz.
const ORO3 = [['#7a4a0c', '#c08418', '#f0c038', '#ffe274', '#fffbd0'], ['#6a7488', '#a8b2c6', '#dde4f0', '#f4f8ff', '#ffffff']];
const IRIS = '#2a4a8a';
const EMIT = ['#fff0b0', '#e4f8f0'];

// ---------------------------------------------------------------------------------------------
// 2. Poses propias. Ángulos: 0 = colgando, 90 = al frente, 180 = arriba. pl = pies apoyados, cr = flexión de piernas.
const G = (o) => ({ pl: 'NF', ...o });
const POSE = [
  // Caballera: guardia con el escudo adelantado y la espada alta.
  (anim, k) => ({
    idle: [
      G({ cr: .18, lean: 7, sp: 3, nk: 1, hipN: 26, knN: 28, hipF: -22, knF: 26, shN: 28, elN: 118, shF: 44, elF: 98 }),
      G({ cr: .195, lean: 8, sp: 4, nk: 0, hipN: 27, knN: 30, hipF: -22, knF: 28, shN: 30, elN: 122, shF: 48, elF: 100 }),
      G({ cr: .18, lean: 7, sp: 3, nk: 1, hipN: 25, knN: 27, hipF: -23, knF: 27, shN: 26, elN: 116, shF: 46, elF: 96 }),
      G({ cr: .165, lean: 6, sp: 2, nk: 2, hipN: 24, knN: 26, hipF: -21, knF: 25, shN: 30, elN: 118, shF: 42, elF: 98 }),
    ][k],
    block: G({ cr: .2, lean: 10, sp: 5, nk: 4, hipN: 28, knN: 30, hipF: -22, knF: 28, shN: 40, elN: 120, shF: 70, elF: 96 }),
    atk1: [G({ cr: .17, lean: -6, sp: -4, nk: 0, hipN: 30, knN: 28, hipF: -28, knF: 22, shN: 28, elN: 104, shF: 58, elF: 82 }),
      G({ cr: .23, lean: 20, sp: 6, nk: 3, hipN: 48, knN: 46, hipF: -36, knF: 6, shN: 90, elN: 2, shF: 50, elF: 80 }),
      G({ cr: .18, lean: 12, sp: 3, nk: 1, hipN: 36, knN: 34, hipF: -30, knF: 14, shN: 70, elN: 28, shF: 52, elF: 84 })][k],
  }[anim]),
  // Hechicero: postura erguida, el bastón planta en el suelo y la otra mano abierta.
  (anim, k) => ({
    idle: [
      G({ cr: .09, lean: 3, sp: 1, nk: 2, hipN: 12, knN: 12, hipF: -10, knF: 12, shN: 26, elN: 70, shF: 40, elF: 78 }),
      G({ cr: .1, lean: 4, sp: 2, nk: 1, hipN: 13, knN: 14, hipF: -10, knF: 13, shN: 28, elN: 72, shF: 42, elF: 80 }),
      G({ cr: .09, lean: 3, sp: 1, nk: 2, hipN: 12, knN: 12, hipF: -11, knF: 12, shN: 24, elN: 68, shF: 38, elF: 76 }),
      G({ cr: .08, lean: 2, sp: 1, nk: 3, hipN: 11, knN: 11, hipF: -10, knF: 11, shN: 26, elN: 70, shF: 36, elF: 74 }),
    ][k],
  }[anim]),
  // Sanadora: porte sereno, el báculo en una mano y la otra mano al pecho.
  (anim, k) => ({
    idle: [
      G({ cr: .08, lean: 1, sp: 0, nk: 2, hipN: 10, knN: 10, hipF: -8, knF: 10, shN: 20, elN: 56, shF: 34, elF: 100 }),
      G({ cr: .09, lean: 2, sp: 1, nk: 1, hipN: 11, knN: 12, hipF: -9, knF: 11, shN: 22, elN: 58, shF: 36, elF: 104 }),
      G({ cr: .08, lean: 1, sp: 0, nk: 2, hipN: 10, knN: 10, hipF: -8, knF: 10, shN: 18, elN: 54, shF: 32, elF: 98 }),
      G({ cr: .07, lean: 0, sp: 0, nk: 3, hipN: 9, knN: 9, hipF: -8, knF: 9, shN: 20, elN: 56, shF: 34, elF: 96 }),
    ][k],
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
  const wind = (VIENTO[ctx.anim] ?? 0) + [0, .18, .3][st - 1];
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
function rombo(P, p, rx, ry, mat, o = {}) { return P.poly([[p[0], p[1] - ry], [p[0] + rx, p[1]], [p[0], p[1] + ry], [p[0] - rx, p[1]]], mat, o); }
// Emblema del sol: disco de oro con 4 rayos de 1 px (en el pecho del tabardo y en el escudo)
function sol(P, p, s, tone = 3) {
  P.blob(p, 1.7 * s, 1.7 * s, 'gold', { shade: 'sphere' });
  P.line([[p[0], p[1] - 3.2 * s], [p[0], p[1] - 2.2 * s]], 'gold', tone, {}); P.line([[p[0], p[1] + 2.2 * s], [p[0], p[1] + 3.2 * s]], 'gold', 2, {});
  P.line([[p[0] - 3.2 * s, p[1]], [p[0] - 2.2 * s, p[1]]], 'gold', tone, {}); P.line([[p[0] + 2.2 * s, p[1]], [p[0] + 3.2 * s, p[1]]], 'gold', 2, {});
}

function bota(P, c, S, cl) {
  const { J, L } = P, s = c.s;
  const top = mix(J['ft' + S], J['kn' + S], cl === 1 ? .4 : .5), d = P.dir('leg' + S + '.lower');
  P.cap(top, J['ft' + S], L.shinW * 1.2, L.shinW * .95, 'leather');
  banda(P, top, d, L.shinW * 1.35, 1.4 * s, 'gold', 2);
  P.cap(J['heel' + S], J['toe' + S], L.ankle * 1.8, L.ankle * 1.2, 'leather');
  P.blob(add(J['toe' + S], [-.4 * s, -.2 * s]), 1.5 * s, 1.5 * s, 'leather', { shade: 'sphere' });
}
function pierna(P, c, S, layer, cl) {
  const { L } = P, s = c.s;
  P.layer(layer);
  P.limb('leg' + S + '.upper', 'pants', L.thighW * 1.12, L.thighW * .92);
  const kn = P.j('kn' + S), d = P.dir('leg' + S + '.upper'), n = [d[1], -d[0]];
  if (cl === 0) {                                                                   // grebas de acero con rodillera
    P.limb('leg' + S + '.lower', 'steel', L.shinW * 1.3, L.shinW * 1.0, { line: S === 'N' });
    P.blob(add(kn, d, .6), 2.9 * s, 2.7 * s, 'steel', { shade: 'sphere', line: S === 'N' });
    P.line([add(kn, n, -2.2 * s), add(add(kn, d, 1), n, 2.2 * s)], 'gold', 2, { on: 'steel' });
  } else {
    P.limb('leg' + S + '.lower', 'pants', L.shinW * 1.15, L.shinW * .92);
    P.fold([add(kn, d, -1.5), add(kn, n, -2.2 * s)], 'pants');
  }
  bota(P, c, S, cl);
}

// Falda larga (sobreveste, túnica o vestido). len = largo (× muslo), flare = vuelo del bajo, stripe = ribete.
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
    if (o.sun) sol(P, add(mix(mix(a, b, .6), mix(aBot, bBot, .6), .45), [0, 0]), s * .9);
  }
}

function torso(P, c, cl) {
  const { tp, tw, hw, s, fwd } = c;
  P.layer('body');
  const mat = cl === 2 ? 'cloth2' : 'cloth';
  const sh = [tp(-.02, -hw * .98), tp(.2, -tw * .86), tp(.5, -tw * .8), tp(.78, -tw * 1.0), tp(1.0, -tw * .9), tp(1.13, -tw * .38),
    tp(1.13, tw * .42), tp(1.0, tw * 1.08), tp(.74, tw * 1.16), tp(.46, tw * .78), tp(.2, hw * .95), tp(-.02, hw * 1.02)];
  P.smooth(sh, mat, { n: 3 });
  if (cl === 0) {                                                                  // pectoral de acero con ribete de oro y gorjal
    const pe = [tp(.3, -tw * .7), tp(.58, -tw * .86), tp(.98, -tw * .86), tp(1.08, tw * .3), tp(.96, tw * 1.08), tp(.7, tw * 1.14), tp(.44, tw * .8)];
    P.smooth(pe, 'steel', { n: 3, line: true });
    P.line([tp(1.06, tw * .3), tp(.94, tw * 1.04), tp(.7, tw * 1.1), tp(.46, tw * .78)], 'gold', 3, { on: 'steel' });
    P.fold([tp(.9, tw * .7), tp(.62, tw * .5)], 'steel');
    P.fold([tp(.56, -tw * .6), tp(.4, -tw * .4)], 'steel');
    P.poly([tp(1.0, -tw * .5), tp(1.18, -tw * .35), tp(1.18, tw * .3), tp(1.0, tw * .62)], 'steel', { shade: 'vol', line: true });   // gorjal
    banda(P, tp(1.18, -tw * .02), c.up, tw * 1.1, 1.2 * s, 'gold', 3);
    sol(P, tp(.74, tw * .52), s * .8);
  } else if (cl === 1) {                                                           // cuello alto de túnica, solapa de oro y capa corta
    P.poly([tp(1.0, -tw * .5), tp(1.22, -tw * .35), tp(1.22, tw * .3), tp(1.0, tw * .62)], 'cloth', { shade: 'vol', line: true });
    P.strip([tp(1.12, tw * .4), tp(.82, tw * .15), tp(.5, tw * .1), tp(.2, tw * .2)], 1.9 * s, 1.5 * s, 'gold', { shade: 'cyl', line: true });
    P.strip([tp(1.12, tw * .4), tp(.8, -tw * .1), tp(.5, -tw * .3), tp(.2, -tw * .5)], 1.7 * s, 1.3 * s, 'cloth2', { shade: 'cyl', line: true });
    P.fold([tp(.88, tw * .8), tp(.62, tw * .55)], 'cloth');
    P.fold([tp(.58, -tw * .66), tp(.4, -tw * .5)], 'cloth');
  } else {                                                                         // corpiño blanco con broche de sol y cuello de oro
    P.poly([tp(1.0, -tw * .5), tp(1.18, -tw * .35), tp(1.18, tw * .3), tp(1.0, tw * .62)], 'cloth2', { shade: 'vol', line: true });
    banda(P, tp(1.18, -tw * .02), c.up, tw * 1.1, 1.3 * s, 'gold', 3);
    P.strip([tp(1.08, tw * .5), tp(.84, tw * .25), tp(.56, tw * .05)], 1.6 * s, 1.2 * s, 'cloth', { shade: 'cyl', line: true });
    sol(P, tp(.9, tw * .62), s * .65);
    P.fold([tp(.78, tw * .8), tp(.56, tw * .5)], 'cloth2');
    P.fold([tp(.6, -tw * .66), tp(.42, -tw * .5)], 'cloth2');
  }
  // cinto de cuero con hebilla de oro y colas que ondean
  const w0 = tp(.33, 0);
  P.poly([tp(.4, -tw * .82), tp(.4, tw * .8), tp(.22, hw * .98), tp(.22, -hw * .96)], cl === 2 ? 'cloth' : 'leather', { shade: 'vol', line: true });
  const knot = add(w0, fwd, tw * .38), sw = sin(c.ph + 1) * 1.6 + c.wind * 3;
  rombo(P, knot, 2 * s, 1.9 * s, 'gold', { shade: 'vol', line: true });
  if (cl !== 0) {
    const m = cl === 2 ? 'cloth' : 'leather';
    P.strip([knot, add(add(knot, c.gravity, 4.5 * s), [-1, 0], sw * .5), add(add(knot, c.gravity, 9 * s), [-1, 0], sw * 1.1)], 2.2 * s, 1.1 * s, m, { smooth: true, line: true });
  }
}

// Cabeza de perfil. o.barba: barba corta (Hechicero).
function cabeza(P, c, o = {}) {
  const { hp, R, J, s } = c;
  P.layer('body');
  P.cap(J.chest, J.head, c.L.head * .27, c.L.head * .25, 'skin', { dt: -1 });
  P.blob(J.head, R, R * 1.1, 'skin', { shade: 'flat', tone: 2 });
  P.smooth([hp(.1, -.6), hp(.98, -.46), hp(1.04, -.12), hp(1.26, .22), hp(1.02, .38), hp(1.05, .6), hp(.88, .98), hp(.25, 1.02), hp(-.1, .6)], 'skin', { n: 3, shade: 'flat', tone: 3 });
  P.smooth([hp(.0, .5), hp(.8, .66), hp(.9, .98), hp(.25, 1.02), hp(-.12, .6)], 'skin', { n: 3, shade: 'flat', tone: 2, on: 'skin' });
  P.blob(hp(.62, .16), R * .34, R * .26, 'skin', { shade: 'flat', tone: 4 });
  P.blob(hp(.02, .22), R * .2, R * .3, 'skin', { shade: 'flat', tone: 2 });                                  // oreja
  if (o.barba) {                                                                                           // barba corta y bigote
    P.smooth([hp(.2, .5), hp(.9, .5), hp(1.06, .66), hp(.96, 1.08), hp(.5, 1.3), hp(.1, 1.0)], 'hair', { n: 3, shade: 'flat', tone: 2, line: false });
    P.line([hp(.5, 1.0), hp(.8, .9), hp(.98, .62)], 'hair', 3, { on: 'hair' });
  }
}
function ojo(P, c, o = {}) {
  const { hp, ctx } = c, e = hp(.58, -.04), golpe = c.golpe;
  P.layer('top');
  P.eye([e[0] - .4, e[1] - .4], { iris: 'iris', size: 3 });
  P.line([hp(.26, golpe ? -.5 : -.36), hp(.6, -.3), hp(1.0, golpe ? -.28 : -.2)], 'hair', o.ceja ?? 1, { on: 'skin' });
  P.line([hp(1.2, .25)], 'skin', 4, { on: 'skin' });
  P.line([hp(1.04, .4)], 'skin', 1, { on: 'skin' });
  const m = hp(.92, .66); P.line([m, [m[0] - 1.8, m[1] + (golpe ? .9 : 0)]], 'skin', 0, { on: o.barba ? 'hair' : 'skin' });
  void ctx;
}

// Hebra de 1 px de luz o sombra sobre una masa de pelo
function hebra(P, c, root, { ang, len, curve = 0, sway = 0 }, tone, off = [-1, -1]) {
  const pts = [], n = 5; let p = root.slice();
  for (let i = 0; i <= n; i++) {
    pts.push(add(p, off));
    if (i < n) { const k = (i + 1) / n, a = (ang + curve * k + sway * sin(c.ph + k * 2.4) * k) * D; p = [p[0] + sin(a) * len / n, p[1] + cos(a) * len / n]; }
  }
  P.line(pts, c.hm, tone, { on: c.hm });
}
// Pelo por clase: 'cola' (coleta alta, Caballera), 'corto' (Hechicero) y 'trenza' (Sanadora: melena y trenza larga)
function peloAtras(P, c, estilo) {
  const { hp, R, s, wind, st } = c, a0 = -8 - wind * 34;
  P.layer('body');
  if (estilo === 'corto') {
    P.smooth([hp(.1, -1.0), hp(-.9, -1.0), hp(-1.3, -.3), hp(-1.2, .4), hp(-.7, .74), hp(-.15, .5), hp(.05, 0)], c.hm, { n: 3, line: true });
    P.lock(hp(-.8, .1), { n: 4, ang: a0 - 6, len: R * 1.5, w: R * .9, w1: 1.4, curve: 12, sway: 3 }, c.hm, { dt: -1, line: true });
    hebra(P, c, hp(-.8, -.3), { ang: a0 - 4, len: R * 1.5, curve: 10, sway: 3 }, 4);
  } else {
    const len = (estilo === 'cola' ? 22 : 26) * s * (1 + st * .05), sw = 4 + st * 2;
    P.smooth([hp(.1, -1.0), hp(-.9, -1.0), hp(-1.4, -.3), hp(-1.3, .5), hp(-.8, 1.0), hp(-.2, .7), hp(.05, .1)], c.hm, { n: 3, line: true });
    if (estilo === 'cola') {                                                                              // coleta alta con lazo de oro
      const r = hp(-1.0, -1.0);
      P.lock(r, { n: 4, ang: a0 - 38, len, w: R * 1.2, w1: 1.2, curve: 34, sway: sw }, c.hm, { line: true });
      P.lock(add(r, [0, 1]), { n: 4, ang: a0 - 50, len: len * .78, w: R * .9, w1: 1.1, curve: 30, sway: sw * 1.1 }, c.hm, { dt: -1, line: true });
      hebra(P, c, add(r, [0, -1]), { ang: a0 - 38, len: len * .95, curve: 34, sway: sw }, 4);
      hebra(P, c, add(r, [1, 1]), { ang: a0 - 44, len: len * .8, curve: 30, sway: sw }, 0, [1, 1]);
      banda(P, add(r, [-.5, 0]), [-.7, .7], R * .9, 1.5 * s, 'gold', 3);
    } else {                                                                                              // melena suelta y trenza que cae al frente-atrás
      P.lock(hp(-1.0, -.45), { n: 4, ang: a0 - 4, len: len * 1.05, w: R * 1.4, w1: 1.2, curve: 18, sway: sw }, c.hm, { line: true });
      P.lock(hp(-.75, .1), { n: 4, ang: a0 - 10, len: len * .8, w: R * 1.05, w1: 1.3, curve: 14, sway: sw * .8 }, c.hm, { dt: -1, line: true });
      hebra(P, c, hp(-1.05, -.4), { ang: a0 - 4, len: len, curve: 18, sway: sw }, 4);
      hebra(P, c, hp(-.8, -.2), { ang: a0 - 6, len: len * .8, curve: 16, sway: sw }, 0, [1, 1]);
      const tb = hp(-.2, .85);                                                                           // trenza sobre el hombro: tres bolas de pelo
      for (let i = 0; i < 3; i++) P.blob(add(add(tb, c.gravity, i * 3.4 * s), [-1, 0], wind * i + i * .4), 1.9 * s, 1.9 * s, c.hm, { shade: 'sphere', line: true });
      banda(P, add(add(tb, c.gravity, 9.5 * s), [-1, 0], wind * 3), [0, 1], 3.2 * s, 1.2 * s, 'gold', 3);
    }
  }
}
function peloArriba(P, c, estilo) {
  const { hp, R, s, wind } = c;
  P.layer('top');
  P.smooth([hp(-.5, .1), hp(-1.12, -.15), hp(-1.0, -.95), hp(-.3, -1.4), hp(.6, -1.34), hp(1.07, -.85), hp(1.0, -.56), hp(.5, -.78), hp(.0, -.6)], c.hm, { n: 3 });
  if (estilo === 'corto') {                                                                               // flequillo peinado hacia atrás
    P.lock(hp(.9, -.8), { n: 4, ang: -6 - wind * 18, len: R * 1.4, w: R * .7, w1: 1, curve: 24, sway: 2 }, c.hm, { line: true });
  } else {
    P.lock(hp(.02, -.64), { n: 4, ang: -6 - wind * 22, len: R * 2.1, w: R * .8, w1: 1.1, curve: 8 - wind * 12, sway: 3 }, c.hm, { line: true });   // mechón sobre la oreja
  }
  P.lock(hp(.3, -1.3), { n: 4, ang: -48 - wind * 20, len: R * 1.5, w: R * .55, w1: 1, curve: -14, sway: 3 }, c.hm, { line: false });
  P.line([hp(-.55, -1.12), hp(-.1, -1.3), hp(.45, -1.22), hp(.8, -.98)], c.hm, 4, { on: c.hm });
  P.line([hp(-.8, -.8), hp(-.55, -.45), hp(-.5, -.1)], c.hm, 1, { on: c.hm });
  P.line([hp(-.15, -1.0), hp(.2, -.9), hp(.55, -.8)], c.hm, 1, { on: c.hm });
  // diadema de oro (Caballera: aro liso; Sanadora: con gema)
  if (estilo !== 'corto') {
    P.strip([hp(1.0, -.54), hp(.55, -.78), hp(-.2, -.84), hp(-.96, -.58)], 1.7 * s, 1.7 * s, 'gold', { shade: 'cyl', smooth: true, line: true });
    if (estilo === 'trenza') P.blob(hp(.72, -.7), 1.5 * s, 1.5 * s, 'gem', { shade: 'sphere' });
  }
}

// Alas de luz (etapa 3): cinco plumas que parten del omóplato, con aleteo suave
function alas(P, c) {
  const { tp, s, ph } = c, base = tp(.8, -c.tw * .9);
  P.layer('body');
  for (let i = 4; i >= 0; i--) {                                               // de la pluma baja a la alta
    const a = (-98 - i * 19 + sin(ph + i * .6) * 4) * D, l = (34 - Math.abs(i - 1) * 3.2) * s, d = [cos(a), sin(a)], n = [-d[1], d[0]], w = (3.6 - i * .15) * s;
    const m = add(base, d, l * .45), tip = add(add(base, d, l), [0, 1], 4 * s);
    P.smooth([base, add(m, n, w), add(m, n, -w * .5), tip, add(add(m, n, -w), d, l * .15)], 'luz', { n: 2, shade: 'vol', line: false });
    P.line([add(base, d, l * .15), add(m, d, l * .1), add(tip, d, -2 * s)], 'luz', i % 2 ? 4 : 1, { on: 'luz' });
  }
}
// Halo sobre la cabeza (etapa 3): anillo emisivo en perspectiva
function halo(P, c) {
  const { hp, R } = c, o = hp(-.1, -2.1), pts = [];
  for (let i = 0; i <= 14; i++) { const a = i / 14 * TAU; pts.push([o[0] + cos(a) * R * 1.35, o[1] + sin(a) * R * .38]); }
  P.emit({ line: pts }); P.emit({ line: pts.map(p => [p[0], p[1] - 1]) });
}

// Capa larga del Hechicero: cuelga de los hombros por detrás y se echa atrás con el viento
function capa(P, c) {
  const { tp, tw, s, wind, gravity: g, ph, L } = c, len = L.thigh * 2.3;
  const sway = (wind * 8 + sin(ph + .6) * (1.4 + c.st * .5)) * s;
  const a = tp(1.06, -tw * .95), b = tp(1.14, tw * .1);
  const bBot = add(add(b, g, len * .82), [-1, 0], sway * .7 + 3 * s), aBot = add(add(a, g, len), [-1, 0], sway * 1.4 + 5 * s);
  P.layer('body');
  P.smooth([a, b, bBot, add(mix(aBot, bBot, .5), g, 2 * s), aBot], 'cloth', { n: 3, dt: -1 });
  P.fold([mix(a, b, .5), add(mix(aBot, bBot, .5), g, -4 * s)], 'cloth');
  P.fold([mix(a, b, .15), add(mix(aBot, bBot, .2), g, -7 * s)], 'cloth');
  P.line([add(bBot, g, -.5), add(mix(aBot, bBot, .5), g, 1.5 * s), add(aBot, g, -.5)], 'gold', 2, { on: 'cloth' });
}

// --- armas ---
// Espada: empuñadura de cuero, gavilán y pomo de oro, hoja de acero con canal y filo de luz.
function espada(P, c, hand, d, len) {
  const s = c.s, n = [d[1], -d[0]], g0 = add(hand, d, -3.2 * s), g1 = add(hand, d, 1.2 * s), tip = add(hand, d, len);
  P.layer('top');
  P.cap(g0, g1, 2.2 * s, 2.2 * s, 'leather', { shade: 'cyl', line: true });
  P.blob(add(g0, d, -.8 * s), 1.6 * s, 1.6 * s, 'gold', { shade: 'sphere', line: true });
  P.cap(add(g1, n, -3.2 * s), add(g1, n, 3.2 * s), 1.6 * s, 1.6 * s, 'gold', { shade: 'cyl', line: true });
  P.cap(add(g1, d, 1 * s), tip, 3.6 * s, 1.2 * s, 'steel', { shade: 'cyl', line: true });
  P.line([add(g1, add(d, n, .45), 2 * s), add(tip, n, .5)], 'steel', 4, { on: 'steel' });
  P.line([add(g1, d, 2 * s), add(tip, d, -2)], 'steel', 1, { on: 'steel' });
  P.anchor('muzzle', tip);
  return tip;
}
// Escudo de la Caballera: ribete de oro, campo azul y sol. Se agarra con la mano lejana, por delante del tronco.
function escudo(P, c, hand) {
  const s = c.s, o = add(hand, [3.2 * s, -1.5 * s]);
  const pts = (k) => [[-5.4 * k, -7.6 * k], [5.4 * k, -7.6 * k], [5.4 * k, 1 * k], [2.6 * k, 6 * k], [0, 8.6 * k], [-2.6 * k, 6 * k], [-5.4 * k, 1 * k]].map(p => [o[0] + p[0] * s, o[1] + p[1] * s]);
  P.layer('near');
  P.smooth(pts(1), 'gold', { n: 2, line: true, shade: 'vol' });
  P.smooth(pts(.72), 'cloth', { n: 2, line: false, shade: 'vol' });
  sol(P, add(o, [0, -1.2 * s]), s * .85);
  P.line([add(o, [0, 3.4 * s]), add(o, [0, 6.6 * s])], 'gold', 3, { on: 'cloth' });
}
// Bastón del Hechicero o báculo de la Sanadora. Se inclina con el antebrazo para apuntar; la punta lleva cristal o halo.
function baston(P, c, hand, d, cl) {
  const s = c.s, L = cl === 1 ? 36 : 34;
  let u = [d[0] * .38, -.65 + d[1] * .38]; const l = Math.hypot(u[0], u[1]) || 1; u = [u[0] / l, u[1] / l];
  const n = [u[1], -u[0]], b = add(hand, u, -13 * s), t = add(hand, u, (L - 13) * s);
  P.layer('top');
  P.cap(b, t, 2.4 * s, 1.8 * s, 'leather', { shade: 'cyl', line: true });
  banda(P, add(hand, u, -2.5 * s), u, 3.4 * s, 1.1 * s, 'gold', 3);
  P.cap(add(b, u, .6 * s), add(b, u, 3 * s), 3.2 * s, 2.6 * s, 'gold', { shade: 'cyl' });
  P.line([add(b, u, 1.2 * s)], 'gold', 4, {});
  let top;
  if (cl === 1) {                                                                  // garras de oro que sujetan un cristal facetado
    const cen = add(t, u, 5.2 * s);
    P.strip([add(t, n, -2.2 * s), add(t, add(u, n, -.3), 3 * s), add(cen, n, -2.6 * s)], 1.4 * s, 1, 'gold', { smooth: true, line: true });
    P.strip([add(t, n, 2.2 * s), add(t, add(u, n, .3), 3 * s), add(cen, n, 2.6 * s)], 1.4 * s, 1, 'gold', { smooth: true, line: true });
    P.poly([add(cen, u, 6 * s), add(cen, n, 3.4 * s), add(cen, u, -4.4 * s), add(cen, n, -3.4 * s)], 'gem', { shade: 'vol', line: true });
    P.line([add(cen, add(u, n, -.4), 2.6 * s), add(cen, u, -1.4 * s)], 'gem', 4, { on: 'gem' });
    P.emit({ px: [add(cen, [0, 0]), add(cen, u, 1.4 * s)] });
    top = add(cen, u, 6 * s);
  } else {                                                                         // aro de oro (el halo) con una gema en el centro
    const cen = add(t, u, 5.2 * s), pts = [];
    for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU; pts.push([cen[0] + cos(a) * 5 * s, cen[1] + sin(a) * 5 * s]); }
    P.strip(pts, 1.9 * s, 1.9 * s, 'gold', { shade: 'cyl', line: true });
    P.line([add(t, u, 1 * s), add(cen, u, -4.6 * s)], 'gold', 2, {});
    P.blob(cen, 2.1 * s, 2.1 * s, 'gem', { shade: 'sphere', line: true });
    P.emit({ px: [add(cen, [-.5, -.5]), add(cen, [0, -5.2 * s]), add(cen, [5.2 * s, 0])] });
    top = add(cen, u, 5 * s);
  }
  P.anchor('rod', top); P.anchor('muzzle', top);
  return top;
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
    P.limb('arm' + S + '.lower', 'steel', L.lowerW * 1.3, L.lowerW * 1.05);                                // guardabrazo de acero
    P.blob(el, 2.5 * s, 2.5 * s, 'steel', { shade: 'sphere', line: near });
    P.line([add(el, dL, 1 * s), add(el, dL, 1 * s)], 'gold', 3, {});
    banda(P, mix(el, ha, .78), dL, L.lowerW * 1.45, 1.4 * s, 'gold', 2, { line: near });
    if (near || S === 'F') P.blob(add(sh, dU, -.5 * s), L.upperW * 1.25, L.upperW * 1.0, 'steel', { shade: 'sphere', line: near });  // hombrera
    P.line([add(sh, [-L.upperW * 1.1, L.upperW * .8]), add(sh, [L.upperW * 1.1, L.upperW * .8])], 'gold', 2, { on: 'steel' });
    P.blob(add(ha, dL, 1 * s), 2.8 * s, 2.7 * s, 'steel', { shade: 'sphere', line: near });
  } else {
    P.limb('arm' + S + '.lower', 'skin', L.lowerW * 1.12, L.lowerW * .95);
    P.cap(el, mix(el, ha, .66), L.lowerW * 1.5, L.lowerW * 2.2, manga, { shade: 'cyl', line: near });       // manga de campana
    P.fold([add(el, dL, 1 * s), add(mix(el, ha, .6), dL, 0)], manga);
    banda(P, mix(el, ha, .68), dL, L.lowerW * 2.2, 1.5 * s, 'gold', 2, { line: near });
    P.blob(add(ha, dL, .6 * s), 2.1 * s, 2.0 * s, 'skin', { shade: 'sphere', line: near });
    if (c.st >= 2) P.emit({ px: [add(mix(el, ha, .68), [0, 0])] });
  }
  return add(ha, dL, .6 * s);
}

// ---------------------------------------------------------------------------------------------
// 5. Dibujo de cada clase. Orden: lejano → tronco → pierna cercana → cabeza → pelo → arma y brazo cercano.
function dibujar(P, ctx, cl) {
  const c = info(P, ctx), { J, s, st } = c;
  c.hm = cl === 2 ? 'hair2' : 'hair';
  const estilo = ['cola', 'corto', 'trenza'][cl];
  if (st === 3) alas(P, c);
  pierna(P, c, 'F', 'far', cl);
  brazo(P, c, 'F', 'far', cl);
  const fa = [{ len: .86, narrow: .8, mat: 'cloth', sun: true }, { len: 1.5, flare: 1.2, mat: 'cloth', hem: 'gold' }, { len: 1.85, flare: 2.4, mat: 'cloth2', hem: 'gold' }][cl];
  if (cl === 1) capa(P, c);
  falda(P, c, false, fa);
  torso(P, c, cl);
  const patada = c.A['legN.upper'] > 55;
  if (patada) { falda(P, c, true, fa); pierna(P, c, 'N', 'near', cl); } else { pierna(P, c, 'N', 'near', cl); falda(P, c, true, fa); }
  cabeza(P, c, { barba: cl === 1 });
  peloAtras(P, c, estilo);
  peloArriba(P, c, estilo);
  ojo(P, c, { barba: cl === 1, ceja: cl === 1 ? 3 : 1 });
  if (st === 3) halo(P, c);
  if (cl === 0) escudo(P, c, J.haF);                                                   // escudo por delante del tronco, bajo el brazo de la espada
  const hand = brazo(P, c, 'N', 'near', cl), d = P.dir('armN.lower');
  if (cl === 0) espada(P, c, hand, d, 23 * s);
  else baston(P, c, hand, d, cl);
  if (cl === 0 && ctx.anim.startsWith('atk') && ctx.frame === 1) {                       // chispas de acero en el impacto
    const r = ctx.rng, o = add(hand, d, 20 * s);
    for (let i = 0; i < 4; i++) { const a = r() * TAU, dd = 3 + r() * 4; P.emit({ px: [[o[0] + cos(a) * dd + 2, o[1] + sin(a) * dd]] }); }
  }
  P.anchor('haN', hand);
  P.anchor('head', J.head);
}

// ---------------------------------------------------------------------------------------------
// 6. Efectos vivos. Contrato real de render/scene.js: c = { x, y (pies), w, h, t (ms), lite, face, alpha, idx, variant }.
const px = (g, x, y, col, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.globalAlpha = 1; };
const cruz = (g, x, y, col, a) => { px(g, x, y, col, a); px(g, x - 1, y, col, a * .6); px(g, x + 1, y, col, a * .6); px(g, x, y - 1, col, a * .6); px(g, x, y + 1, col, a * .6); };
const escala = c => Math.max(.8, Math.min(1.3, (c.h || 64) / 64));
const ORO = ['#fff0b0', '#ffe274', '#f0c038'], PLATA = ['#ffffff', '#e4f8f0', '#9ad8d0'];
const fx = {
  back(g, c, stage) {
    if (stage < 2) return;
    const t = c.t / 1000, s = escala(c), pal = c.variant ? PLATA : ORO;
    g.save(); g.translate(c.x, c.y);
    // motas de luz que suben despacio (nunca llamas): posiciones deterministas a partir de t
    const n = c.lite ? 3 : stage === 2 ? 7 : 11;
    for (let i = 0; i < n; i++) {
      const k = (t * .35 + i / n) % 1, x = Math.sin(i * 7.3 + k * 3) * 13 * s, y = -4 * s - k * 62 * s;
      px(g, x, y, pal[i % 3], Math.sin(k * Math.PI) * .9);
    }
    if (stage === 3) {                                                                  // círculo de sol en el suelo: aro de puntos y 8 rayos cortos que giran despacio
      g.globalAlpha = .55;
      for (let i = 0; i < 32; i++) { const a = i / 32 * TAU; px(g, cos(a) * 24 * s, sin(a) * 7 * s, pal[2], .7); }
      if (!c.lite) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * .25; for (let r = 0; r < 3; r++) px(g, cos(a) * (27 + r * 2) * s, sin(a) * (8 + r * .6) * s, pal[1], .8 - r * .2); }
      g.globalAlpha = 1;
    }
    g.restore();
  },
  front(g, c, stage) {
    if (stage < 2 || c.lite) return;
    const t = c.t / 1000, s = escala(c), pal = c.variant ? PLATA : ORO;
    g.save(); g.translate(c.x, c.y);
    const f = t * (stage === 2 ? .8 : 1.2), k = Math.floor(f), ph = f - k;       // un destello en cruz cada ~1 s (≤ 2 Hz)
    if (ph < .4) cruz(g, ((k * 37 + (c.idx || 0) * 11) % 21 - 10) * s * c.face, -(20 + (k * 13) % 34) * s, pal[0], 1 - ph / .4);
    if (stage === 3) for (let i = 0; i < 4; i++) {                                      // plumas de luz que caen despacio
      const kk = (t * .3 + i / 4) % 1;
      px(g, Math.sin(i * 5 + kk * 4) * 17 * s - c.face * 8 * s, -64 * s + kk * 52 * s, pal[1], .8 - kk * .6);
    }
    g.restore();
  },
};

// Remate de la transformación: columna de luz que baja y anillo que se abre (sin destello de pantalla)
function transformFx(g, c, k) {
  const s = escala(c), pal = c.variant ? PLATA : ORO;
  g.save(); g.translate(c.x, c.y);
  if (k < .7) {
    const h = Math.min(1, k / .35) * 120;
    for (let y = 0; y < h; y += 2) { const x = Math.sin(y * .4 + k * 9) * 1; px(g, x - 5 * s, -y, pal[2], .7); px(g, x + 5 * s, -y, pal[2], .7); if (y % 6 === 0) px(g, x, -y, pal[0]); }
    for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, r = 8 + 26 * k; px(g, cos(a) * r, sin(a) * r * .3, pal[1], 1 - k); }
  } else {
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + k * 3, r = 20 * (1 - (k - .7) * 2); px(g, cos(a) * r * s, -30 * s + sin(a) * r * 1.2 * s, pal[0], 1 - (k - .7) * 3); }
  }
  g.restore();
}

// ---------------------------------------------------------------------------------------------
const poseDe = i => (anim, k) => (POSE[i](anim, k) || null);
const CUERPO = [{ body: 'atleta', height: 60, shoulder: 1.1, headScale: 1.1 }, { body: 'atleta', height: 60, shoulder: 1.02, headScale: 1.12 }, { body: 'atleta', height: 60, shoulder: .98, headScale: 1.14 }];
export default {
  id: 'humanos',
  kit: 1,
  ready: true,
  materials: ['skin', 'hair', 'hair2', 'cloth', 'cloth2', 'gold', 'steel', 'leather', 'pants', 'gem', 'luz', 'iris'],
  ramps(variant, stage) {
    const v = variant ? 1 : 0, st = stage || 1, pick = k => RAMPAS[k][Math.min(v, RAMPAS[k].length - 1)];
    const gold = st >= 2 && !v ? ramp5(['#6a3e0a', '#b07a18', '#f0c438', '#ffe27a', '#fffbd0']) : ramp5(pick('gold'));
    return {
      skin: ramp5(pick('skin')), hair: ramp5(pick('hair')), hair2: ramp5(pick('hair2')), cloth: ramp5(pick('cloth')), cloth2: ramp5(pick('cloth2')),
      gold, steel: ramp5(st === 3 ? ORO3[v] : RAMPAS.steel[0]), leather: ramp5(pick('leather')), pants: ramp5(pick('pants')),
      gem: ramp5(pick('gem')), luz: ramp5(v ? ['#98c8c4', '#c8ece6', '#e8fffa', '#f4fffc', '#ffffff'] : RAMPAS.luz[0]),
      iris: ramp5(['#0a1430', '#1a2e5c', IRIS, '#ffffff', '#ffffff']),
    };
  },
  emit: variant => EMIT[variant ? 1 : 0],
  geomStage: s => s,
  extraAnims: {},
  extraPoses: {},
  classes: [
    { id: 'caballera', name: 'Caballera', build: CUERPO[0], anchors: ['haN', 'haF', 'head', 'chest', 'muzzle'], pose: poseDe(0), draw: (P, ctx) => dibujar(P, ctx, 0) },
    { id: 'hechicero', name: 'Hechicero', build: CUERPO[1], anchors: ['haN', 'haF', 'head', 'chest', 'muzzle'], pose: poseDe(1), draw: (P, ctx) => dibujar(P, ctx, 1) },
    { id: 'sanadora', name: 'Sanadora', build: CUERPO[2], anchors: ['haN', 'haF', 'head', 'chest', 'muzzle'], pose: poseDe(2), draw: (P, ctx) => dibujar(P, ctx, 2) },
  ],
  stageScale: [1, 1, 1],
  fx,
  transformFx,
};
