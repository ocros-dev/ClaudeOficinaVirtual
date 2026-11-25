// Raza «elfos» · Silvanos del Umbral Verde (paquete A-ELF). Arte 16 bits propio, 3 etapas y variantes A/B.
// Clases: 0 Danzante de hojas (dos espadas curvas), 1 Arquera (arco largo), 2 Druida (báculo nudoso, savia y flores).
// Identidad: cuerpo esbelto y alto (62 px, piernas largas, hombros estrechos), orejas de hoja CAÍDAS hacia atrás y abajo
// con aro de plata (no apuntan hacia arriba), ropa de hojas y corteza. Guía: docs/arena-estilo-16bits.md.
// Solo se importa de '../kit16/*'. Sin Math.random (usa ctx.rng).
//   Etapa 1 Formación · 2 Savia Despierta (venas de savia emisivas, hojas en órbita) ·
//   3 Bosque Eterno (alas de ramas con hojas y flores, pelo flotante, flores en el pelo).
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------------------------------------------------------------------------------------------
// 1. Paleta (spec: verde bosque #2f8a5a, plata #c8d0dc, madera #7a5230). [sombra profunda, sombra, base, luz, brillo]. B = verde azulado, pelo plata.
const RAMPAS = {
  skin:    [['#7a4e3a', '#a87a5c', '#d8aa84', '#efd0b0', '#fff0dc'], ['#6a5240', '#9a7c62', '#c8a888', '#e8d0b8', '#fff2e0']],
  hair:    [['#5a4a24', '#8a7a42', '#c4b070', '#e6d89c', '#fffbe0'], ['#5a5e80', '#9498b8', '#d0d2e8', '#eef0fc', '#ffffff']],
  cloth:   [['#08261a', '#124a30', '#2f8a5a', '#54b684', '#96e4b6'], ['#0a2832', '#154858', '#3a8a9a', '#62b6c6', '#a2e4ee']],
  leaf:    [['#18401a', '#34782a', '#72bc44', '#b0e072', '#e6ffac'], ['#1c4a58', '#36808c', '#74c4c8', '#b6eaea', '#f0ffff']],
  wood:    [['#2a1a0e', '#4a3020', '#7a5230', '#a47a4a', '#d0a874']],
  trim:    [['#4a5266', '#7a8498', '#c8d0dc', '#e8eef8', '#ffffff'], ['#7a6a3a', '#b8a460', '#f0e8c8', '#fff8e4', '#ffffff']],
  leather: [['#1c120c', '#38281c', '#5a4030', '#7e5c40', '#a8825a']],
  steel:   [['#2a3446', '#58647e', '#98a6c0', '#d0dcee', '#ffffff']],
  bloom:   [['#6a1a3a', '#b0386a', '#f070a0', '#ffa8c8', '#fff4f8'], ['#6a5a10', '#b4a232', '#f0e060', '#fff4a4', '#ffffff']],
};
const IRIS = ['#2f8a5a', '#3a8a9a'];
const EMIT = ['#c8ffd8', '#d0fcff'];

// ---------------------------------------------------------------------------------------------
// 2. Poses propias (se fusionan sobre la pose del kit). 0 = colgando, 90 = al frente, 180 = arriba.
const G = (o) => ({ pl: 'NF', ...o });
const POSE = [
  // Danzante: puntillas y cambio de peso, las dos hojas cruzadas.
  (anim, k) => ({
    idle: [
      G({ cr: .13, lean: 6, sp: 2, nk: 2, hipN: 22, knN: 24, hipF: -18, knF: 22, shN: 46, elN: 92, shF: 26, elF: 112 }),
      G({ cr: .15, lean: 7, sp: 3, nk: 1, hipN: 24, knN: 26, hipF: -19, knF: 24, shN: 50, elN: 96, shF: 30, elF: 116 }),
      G({ cr: .13, lean: 6, sp: 2, nk: 2, hipN: 22, knN: 24, hipF: -20, knF: 23, shN: 44, elN: 90, shF: 24, elF: 110 }),
      G({ cr: .11, lean: 5, sp: 2, nk: 3, hipN: 20, knN: 22, hipF: -17, knF: 21, shN: 48, elN: 92, shF: 28, elF: 108 }),
    ][k],
  }[anim]),
  // Arquera: arco bajo al descanso; cargar = alzar el arco y tensar la cuerda hasta la mejilla; disparar = soltar.
  (anim, k) => ({
    idle: [
      G({ cr: .12, lean: 4, sp: 1, nk: 2, hipN: 18, knN: 18, hipF: -16, knF: 18, shN: 36, elN: 46, shF: 16, elF: 60 }),
      G({ cr: .135, lean: 5, sp: 2, nk: 1, hipN: 19, knN: 20, hipF: -16, knF: 20, shN: 38, elN: 50, shF: 18, elF: 64 }),
      G({ cr: .12, lean: 4, sp: 1, nk: 2, hipN: 18, knN: 18, hipF: -17, knF: 19, shN: 34, elN: 44, shF: 14, elF: 58 }),
      G({ cr: .105, lean: 3, sp: 1, nk: 3, hipN: 17, knN: 17, hipF: -15, knF: 17, shN: 36, elN: 46, shF: 16, elF: 56 }),
    ][k],
    charge: [
      G({ cr: .15, lean: 4, sp: 0, nk: 2, hipN: 22, knN: 22, hipF: -22, knF: 22, shN: 70, elN: 12, shF: 40, elF: 96 }),
      G({ cr: .17, lean: 3, sp: -2, nk: 0, hipN: 24, knN: 24, hipF: -24, knF: 24, shN: 88, elN: 3, shF: 74, elF: 128 }),
      G({ cr: .19, lean: 2, sp: -3, nk: -1, hipN: 26, knN: 26, hipF: -26, knF: 26, shN: 92, elN: 0, shF: 64, elF: 152 }),
    ][k],
    fire: [
      G({ cr: .17, lean: 6, sp: 2, nk: 0, hipN: 28, knN: 26, hipF: -30, knF: 12, shN: 94, elN: 0, shF: 52, elF: 120 }),
      G({ cr: .14, lean: 3, sp: 0, nk: 0, hipN: 22, knN: 20, hipF: -34, knF: 8, shN: 96, elN: 2, shF: 76, elF: 60 }),
    ][k],
  }[anim]),
  // Druida: porte sereno; el báculo erguido, la otra mano abierta.
  (anim, k) => ({
    idle: [
      G({ cr: .08, lean: 1, sp: 0, nk: 2, hipN: 9, knN: 10, hipF: -8, knF: 10, shN: 22, elN: 60, shF: 38, elF: 96 }),
      G({ cr: .09, lean: 2, sp: 1, nk: 1, hipN: 10, knN: 12, hipF: -9, knF: 11, shN: 24, elN: 62, shF: 40, elF: 100 }),
      G({ cr: .08, lean: 1, sp: 0, nk: 2, hipN: 9, knN: 10, hipF: -8, knF: 10, shN: 20, elN: 58, shF: 36, elF: 94 }),
      G({ cr: .07, lean: 0, sp: 0, nk: 3, hipN: 8, knN: 9, hipF: -8, knF: 9, shN: 22, elN: 60, shF: 38, elF: 92 }),
    ][k],
  }[anim]),
];
const VIENTO = { run: 1, walk: .3, atk1: .55, atk2: .6, atk3: .7, charge: -.1, fire: .3, cast: .25, hit: -.9, launched: .5, victory: .15, transform: -.3 };

// ---------------------------------------------------------------------------------------------
// 3. Datos del fotograma
function info(P, ctx) {
  const { J, L, A } = P, s = L.H / 60, st = ctx.stage, ph = ctx.phase * TAU;
  const aT = A.torsoLean * D, up = [sin(aT), -cos(aT)], fwd = [cos(aT), sin(aT)];
  const ah = A.headAng * D, hu = [sin(ah), -cos(ah)], hf = [cos(ah), sin(ah)];
  const R = L.head * .40;
  const tumbled = Math.abs(ctx.pose.rot || 0) > 25;
  const wind = (VIENTO[ctx.anim] ?? 0) + [0, .15, .55][st - 1];                          // etapa 3: pelo y telas flotan
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
// Hoja: polígono apuntado (base, dos lados, punta) con nervio central de 1 px
function hoja(P, base, d, l, w, mat, o = {}) {
  const n = [-d[1], d[0]], m = add(base, d, l * .42), tip = add(base, d, l);
  P.smooth([base, add(m, n, w), tip, add(m, n, -w)], mat, { n: 2, shade: 'vol', line: false, ...o });
  if (l > 5) P.line([add(base, d, l * .15), add(tip, d, -l * .12)], mat, 4, { on: mat });
}

function bota(P, c, S, cl) {
  const { J, L } = P, s = c.s;
  const top = mix(J['ft' + S], J['kn' + S], cl === 2 ? .45 : cl === 1 ? .38 : .56), d = P.dir('leg' + S + '.lower');
  P.cap(top, J['ft' + S], L.shinW * 1.25, L.shinW * .95, 'leather');
  P.poly([add(top, d, 1 * s), add(add(top, d, 1 * s), [-1, 0], 2.2 * s), add(top, d, -2.6 * s)], 'leaf', { shade: 'vol', line: S === 'N' });   // puño con forma de hoja
  P.cap(J['heel' + S], J['toe' + S], L.ankle * 1.8, L.ankle * 1.2, 'leather');
  P.blob(add(J['toe' + S], [-.2 * s, -.2 * s]), 1.4 * s, 1.5 * s, 'leather', { shade: 'sphere' });
}
function pierna(P, c, S, layer, cl) {
  const { L } = P, s = c.s;
  P.layer(layer);
  P.limb('leg' + S + '.upper', cl === 2 ? 'cloth' : 'leather', L.thighW * 1.05, L.thighW * .85);
  P.limb('leg' + S + '.lower', cl === 0 ? 'wood' : 'leather', L.shinW * 1.15, L.shinW * .9);
  const kn = P.j('kn' + S), d = P.dir('leg' + S + '.upper'), n = [d[1], -d[0]];
  P.fold([add(kn, d, -1.5), add(kn, n, -2 * s)], cl === 2 ? 'cloth' : 'leather');
  if (cl === 0) banda(P, add(kn, d, 1.2), d, L.shinW * 1.5, 1.2 * s, 'trim', 2);
  bota(P, c, S, cl);
}

// Falda de pétalos (Danzante): hojas apuntadas que se abren con el movimiento
function petalos(P, c, near) {
  const { L } = P, { tp, hw, s, wind, gravity: g, ph } = c, back = [-1, 0], n = near ? 4 : 3;
  const a = tp(.22, -hw * (near ? 1.05 : .8)), b = tp(.22, hw * (near ? 1.15 : .4));
  const sway = (wind * 7 + sin(ph + (near ? 0 : 1.2)) * (1.4 + c.st * .5)) * s;
  P.layer(near ? 'near' : 'body');
  for (let i = near ? 0 : n - 1; near ? i < n : i >= 0; i += near ? 1 : -1) {
    const p0 = mix(a, b, i / n), p1 = mix(a, b, (i + 1) / n), len = L.thigh * (.62 + .22 * sin(i * 2.3 + 1)) * (near ? 1 : 1.1);
    const tip = add(add(add(mix(p0, p1, .5), g, len), back, sway * (.6 + i * .2) + (near ? 0 : 2 * s)), [1, 0], near ? 1 + i * .5 : 0);
    const mid = add(mix(p0, p1, .5), g, len * .45);
    P.smooth([p0, add(mid, [1, 0], 2.4 * s), tip, add(mid, [-1, 0], 2.4 * s - sway * .2)], 'leaf', { n: 2, line: near, dt: near ? 0 : -1 });
    P.line([add(mix(p0, p1, .5), g, len * .2), add(tip, g, -len * .14)], 'leaf', near ? 4 : 3, { on: 'leaf' });
  }
}
// Falda larga con bajo de hojas (Arquera: hasta la rodilla; Druida: hasta el tobillo)
function faldaLarga(P, c, near, len, mat, flare) {
  const { L } = P, { tp, hw, s, wind, gravity: g, ph } = c, back = [-1, 0];
  const l = L.thigh * len * (near ? .92 : 1.08), sway = (wind * 7 + sin(ph + (near ? 0 : 1.3)) * (1.1 + c.st * .5)) * s, fl = flare * s;
  const a = tp(.2, -hw * (near ? 1.05 : .9)), b = tp(.2, hw * (near ? 1.15 : .3));
  const bBot = add(add(add(b, g, l * (near ? .84 : .9)), back, sway * .55), [1, 0], near ? fl : fl * .4), aBot = add(add(a, g, l * 1.04), back, sway * 1.25 + (near ? 0 : 2 * s) + fl * .5);
  const pts = [a, mix(a, b, .5), b, bBot];
  for (let i = 1; i < 4; i++) { const t = 1 - i / 4, p = mix(bBot, aBot, 1 - t); pts.push(add(p, g, (i % 2 ? 2.6 : -.4) * s)); }   // bajo recortado en hojas
  pts.push(aBot);
  P.smooth(pts, mat, { n: 2, line: near });
  if (near) {
    P.fold([mix(a, b, .35), add(mix(aBot, bBot, .35), g, -2 * s)], mat);
    P.fold([mix(a, b, .72), add(mix(aBot, bBot, .72), g, -3.5 * s)], mat);
    P.line([add(bBot, g, -.5), add(mix(aBot, bBot, .5), g, .8 * s), add(aBot, g, -.5)], 'leaf', 3, { on: mat });
  }
}

function torso(P, c, cl) {
  const { tp, tw, hw, s, fwd, st } = c;
  P.layer('body');
  const mat = cl === 2 ? 'cloth' : cl === 1 ? 'cloth' : 'cloth';
  const sh = [tp(-.02, -hw * .98), tp(.2, -tw * .84), tp(.5, -tw * .76), tp(.78, -tw * .96), tp(1.0, -tw * .88), tp(1.13, -tw * .38),
    tp(1.13, tw * .4), tp(1.0, tw * 1.04), tp(.74, tw * 1.1), tp(.46, tw * .74), tp(.2, hw * .95), tp(-.02, hw * 1.02)];
  P.smooth(sh, mat, { n: 3 });
  if (cl === 0) {                                                                    // top corto de escamas de hoja y vientre al aire
    P.poly([tp(.5, -tw * .78), tp(.5, tw * .8), tp(.26, hw * .96), tp(.26, -hw * .94)], 'skin', { shade: 'flat', tone: 3, line: true });
    P.line([tp(.44, -tw * .6), tp(.44, tw * .7)], 'skin', 1, { on: 'skin' });
    for (let i = 0; i < 3; i++) { const y = .62 + i * .17, w = tw * (.9 - i * .05); P.line([tp(y, -w * .7), tp(y - .06, 0), tp(y, w * .75)], 'cloth', 4, { on: 'cloth' }); P.line([tp(y - .05, -w * .7), tp(y - .11, 0), tp(y - .05, w * .75)], 'cloth', 1, { on: 'cloth' }); }
    P.poly([tp(1.0, -tw * .5), tp(1.18, -tw * .35), tp(1.18, tw * .3), tp(1.0, tw * .62)], 'cloth', { shade: 'vol', line: true });
    P.strip([tp(1.1, tw * .4), tp(.82, tw * .06), tp(.56, -tw * .3)], 1.6 * s, 1.2 * s, 'trim', { shade: 'cyl', line: true });                   // tira de plata cruzada
  } else if (cl === 1) {                                                              // jubón con esclavina de hojas y capucha caída
    P.fold([tp(.88, tw * .8), tp(.62, tw * .55)], 'cloth');
    P.fold([tp(.58, -tw * .66), tp(.4, -tw * .5)], 'cloth');
    P.strip([tp(1.1, tw * .4), tp(.76, tw * .1), tp(.36, tw * .06)], 1.7 * s, 1.4 * s, 'leather', { shade: 'cyl', line: true });                // correa del carcaj
  } else {                                                                            // corpiño de corteza sobre vestido, hombreras de musgo
    P.poly([tp(.36, -tw * .8), tp(.9, -tw * .86), tp(.96, tw * 1.0), tp(.7, tw * 1.08), tp(.36, hw * .8)], 'wood', { shade: 'vol', line: true });
    P.fold([tp(.84, tw * .6), tp(.56, tw * .4)], 'wood'); P.fold([tp(.78, -tw * .6), tp(.5, -tw * .4)], 'wood');
    P.line([tp(.9, tw * .5), tp(.74, tw * .2), tp(.5, tw * .3), tp(.4, tw * .1)], 'leaf', 3, { on: 'wood' });                                     // enredadera
    P.poly([tp(1.0, -tw * .5), tp(1.2, -tw * .35), tp(1.2, tw * .3), tp(1.0, tw * .62)], 'cloth', { shade: 'vol', line: true });
    if (st === 3) for (let i = 0; i < 3; i++) P.blob(tp(.84 - i * .17, tw * (.7 - i * .2)), 1.3 * s, 1.3 * s, 'bloom', { shade: 'sphere' });
  }
  if (st >= 2) {                                                                       // venas de savia emisivas
    const v = cl === 1 ? [tp(.9, tw * .7), tp(.7, tw * .5), tp(.5, tw * .6)] : [tp(.84, tw * .6), tp(.68, tw * .3), tp(.52, tw * .42)];
    P.emit({ line: v });
  }
  // cinto con hebilla de hoja y cola que ondea
  const w0 = tp(.33, 0);
  P.poly([tp(.4, -tw * .82), tp(.4, tw * .8), tp(.24, hw * .98), tp(.24, -hw * .96)], 'leather', { shade: 'vol', line: true });
  const knot = add(w0, fwd, tw * .38), sw = sin(c.ph + 1) * 1.6 + c.wind * 3;
  hoja(P, add(knot, [-.5, 1.6 * s]), [0, -1], 4.2 * s, 1.5 * s, 'trim', { line: true });
  if (cl !== 1) P.strip([knot, add(add(knot, c.gravity, 5 * s), [-1, 0], sw * .5), add(add(knot, c.gravity, 11 * s), [-1, 0], sw * 1.2)], 2.2 * s, 1.1 * s, 'leaf', { smooth: true, line: true });
}

// Cabeza de perfil con oreja de hoja caída. La cara es más fina y la mandíbula más corta que en los humanos.
function cabeza(P, c) {
  const { hp, R, J } = c;
  P.layer('body');
  P.cap(J.chest, J.head, c.L.head * .24, c.L.head * .22, 'skin', { dt: -1 });
  P.blob(J.head, R * .98, R * 1.1, 'skin', { shade: 'flat', tone: 2 });
  P.smooth([hp(.1, -.6), hp(.96, -.46), hp(1.0, -.12), hp(1.24, .22), hp(1.0, .36), hp(1.0, .58), hp(.8, .98), hp(.25, 1.04), hp(-.1, .6)], 'skin', { n: 3, shade: 'flat', tone: 3 });
  P.smooth([hp(.0, .5), hp(.74, .66), hp(.82, .98), hp(.25, 1.04), hp(-.12, .6)], 'skin', { n: 3, shade: 'flat', tone: 2, on: 'skin' });
  P.blob(hp(.6, .16), R * .32, R * .24, 'skin', { shade: 'flat', tone: 4 });
}
// Oreja: se pinta tras el pelo trasero y antes del flequillo. Cae hacia atrás y abajo (≈ 25° bajo la horizontal) y lleva aro de plata.
function oreja(P, c) {
  const { hp, R, s } = c;
  P.layer('top');
  P.smooth([hp(.14, -.04), hp(-.4, -.06), hp(-2.1, .92), hp(-.6, .62), hp(.02, .5)], 'skin', { n: 3, shade: 'flat', tone: 3, line: true });
  P.line([hp(-.2, .14), hp(-1.3, .62)], 'skin', 1, { on: 'skin' });
  P.line([hp(-.3, -.02), hp(-1.5, .66)], 'skin', 4, { on: 'skin' });
  P.blob(hp(-.42, .32), 1.1 * s, 1.1 * s, 'trim', { shade: 'sphere' });
}
function ojo(P, c) {
  const { hp } = c, e = hp(.56, -.04), golpe = c.golpe;
  P.layer('top');
  P.eye([e[0] - .4, e[1] - .4], { iris: 'iris', size: 3 });
  P.line([hp(.22, golpe ? -.54 : -.4), hp(.58, -.32), hp(.96, golpe ? -.3 : -.22)], 'hair', 1, { on: 'skin' });             // ceja fina y alta
  P.line([hp(1.18, .24)], 'skin', 4, { on: 'skin' });
  P.line([hp(1.02, .38)], 'skin', 1, { on: 'skin' });
  const m = hp(.9, .64); P.line([m, [m[0] - 1.6, m[1] + (golpe ? .9 : 0)]], 'skin', 0, { on: 'skin' });
}

function hebra(P, c, root, { ang, len, curve = 0, sway = 0 }, tone, off = [-1, -1]) {
  const pts = [], n = 5; let p = root.slice();
  for (let i = 0; i <= n; i++) {
    pts.push(add(p, off));
    if (i < n) { const k = (i + 1) / n, a = (ang + curve * k + sway * sin(c.ph + k * 2.4) * k) * D; p = [p[0] + sin(a) * len / n, p[1] + cos(a) * len / n]; }
  }
  P.line(pts, 'hair', tone, { on: 'hair' });
}
// Pelo: 'cola' (Danzante: coleta alta con dos lazos de hoja), 'trenza' (Arquera: trenza lateral gruesa), 'suelta' (Druida: melena larga con flores)
function peloAtras(P, c, estilo) {
  const { hp, R, s, wind, st } = c, a0 = -10 - wind * 26 - (st === 3 ? 6 : 0);
  const len = (estilo === 'trenza' ? 22 : 26) * s * (1 + st * .04), sw = 4 + st * 2.5;
  P.layer('body');
  P.smooth([hp(.1, -1.0), hp(-.9, -1.0), hp(-1.4, -.3), hp(-1.3, .5), hp(-.8, 1.0), hp(-.2, .7), hp(.05, .1)], 'hair', { n: 3, line: true });
  if (estilo === 'cola') {
    const r = hp(-1.05, -1.0);
    P.lock(r, { n: 4, ang: a0 - 40, len, w: R * 1.0, w1: 1.1, curve: 36, sway: sw }, 'hair', { line: true });
    P.lock(add(r, [0, 1]), { n: 4, ang: a0 - 54, len: len * .8, w: R * .8, w1: 1.1, curve: 32, sway: sw * 1.1 }, 'hair', { dt: -1, line: true });
    hebra(P, c, add(r, [0, -1]), { ang: a0 - 40, len: len * .95, curve: 36, sway: sw }, 4);
    hebra(P, c, add(r, [1, 1]), { ang: a0 - 46, len: len * .8, curve: 32, sway: sw }, 0, [1, 1]);
    hoja(P, add(r, [-1, 0]), [-.95, .2], 5.4 * s, 1.6 * s, 'leaf', { line: true });
    hoja(P, add(r, [-1, 1]), [-.7, .7], 4.6 * s, 1.4 * s, 'leaf', { line: true });
  } else if (estilo === 'trenza') {
    P.lock(hp(-1.0, -.45), { n: 4, ang: a0 - 4, len: len * .9, w: R * 1.2, w1: 1.2, curve: 18, sway: sw }, 'hair', { line: true });
    hebra(P, c, hp(-1.05, -.4), { ang: a0 - 4, len: len * .8, curve: 18, sway: sw }, 4);
    const tb = hp(-.1, .8);                                                                                       // trenza gruesa sobre el hombro, a tramos
    for (let i = 0; i < 5; i++) P.blob(add(add(tb, c.gravity, i * 3.2 * s), [-1, 0], wind * i * .8 + i * .5), 2.1 * s, 2.0 * s, 'hair', { shade: 'sphere', line: true });
    hoja(P, add(add(tb, c.gravity, 15 * s), [-1.4, 0]), [-.2, 1], 4.6 * s, 1.5 * s, 'leaf', { line: true });
  } else {
    P.lock(hp(-1.0, -.45), { n: 4, ang: a0 - 4, len: len * 1.15, w: R * 1.5, w1: 1.2, curve: 20, sway: sw }, 'hair', { line: true });
    P.lock(hp(-.75, .1), { n: 4, ang: a0 - 10, len: len * .9, w: R * 1.15, w1: 1.3, curve: 16, sway: sw * .8 }, 'hair', { dt: -1, line: true });
    P.lock(hp(-.6, .5), { n: 4, ang: a0 - 16, len: len * .6, w: R * .9, w1: 1.2, curve: 14, sway: sw }, 'hair', { dt: -1, line: true });
    hebra(P, c, hp(-1.05, -.4), { ang: a0 - 4, len: len * 1.1, curve: 20, sway: sw }, 4);
    hebra(P, c, hp(-.8, -.2), { ang: a0 - 6, len: len * .9, curve: 18, sway: sw }, 0, [1, 1]);
    hebra(P, c, hp(-.7, .15), { ang: a0 - 10, len: len * .7, curve: 16, sway: sw * .8 }, 3);
  }
}
function peloArriba(P, c, estilo) {
  const { hp, R, s, wind, st } = c;
  P.layer('top');
  P.smooth([hp(-.5, .1), hp(-1.12, -.15), hp(-1.0, -.95), hp(-.3, -1.4), hp(.6, -1.34), hp(1.05, -.85), hp(.98, -.58), hp(.5, -.78), hp(.0, -.62)], 'hair', { n: 3 });
  P.lock(hp(.02, -.64), { n: 4, ang: -6 - wind * 22, len: R * 2.0, w: R * .7, w1: 1.1, curve: 8 - wind * 12, sway: 3 }, 'hair', { line: true });
  P.lock(hp(.3, -1.3), { n: 4, ang: -48 - wind * 20, len: R * 1.6, w: R * .5, w1: 1, curve: -14, sway: 4 }, 'hair', { line: false });
  P.line([hp(-.55, -1.12), hp(-.1, -1.3), hp(.45, -1.22), hp(.8, -.98)], 'hair', 4, { on: 'hair' });
  P.line([hp(-.8, -.8), hp(-.55, -.45), hp(-.5, -.1)], 'hair', 1, { on: 'hair' });
  P.line([hp(-.15, -1.0), hp(.2, -.9), hp(.55, -.8)], 'hair', 1, { on: 'hair' });
  if (estilo === 'cola') {                                                                // cinta de plata con hoja en la frente
    P.strip([hp(1.0, -.54), hp(.55, -.78), hp(-.2, -.84), hp(-.96, -.58)], 1.5 * s, 1.5 * s, 'trim', { shade: 'cyl', smooth: true, line: true });
    hoja(P, hp(.9, -.62), [.4, -.9], 4 * s, 1.3 * s, 'trim', { line: true });
  } else if (estilo === 'trenza') {                                                        // capucha caída: rollo de tela tras la cabeza
    P.blob(hp(-.6, .95), R * .95, R * .5, 'leaf', { shade: 'vol', line: true });
    P.strip([hp(-1.0, .9), hp(-1.5, 1.6), hp(-1.4, 2.6)], 4.2 * s, 1.2 * s, 'leaf', { shade: 'cyl', smooth: true, line: true });
  } else {                                                                                 // corona de ramitas con flores
    P.strip([hp(1.0, -.56), hp(.55, -.82), hp(-.2, -.88), hp(-.96, -.6)], 1.4 * s, 1.4 * s, 'wood', { shade: 'cyl', smooth: true, line: true });
    for (let i = 0; i < (st === 3 ? 5 : 2); i++) { const p = hp(.85 - i * .42, -.62 - Math.min(.3, i * .12)); P.blob(p, 1.5 * s, 1.5 * s, 'bloom', { shade: 'sphere', line: true }); P.emit({ px: [p] }); }
    for (let i = 0; i < 2; i++) hoja(P, hp(.5 - i * .6, -.8), [.3 - i * .8, -1], 4 * s, 1.3 * s, 'leaf', { line: true });
  }
}

// Alas de ramas (etapa 3): tres ramas maestras con ramitas, hojas y flores
function alas(P, c) {
  const { tp, s, ph } = c, base = tp(.78, -c.tw * .9);
  P.layer('body');
  for (let i = 0; i < 3; i++) {
    const a = (-122 - i * 30 + sin(ph + i) * 4) * D, l = (32 - i * 3) * s, d = [cos(a), sin(a)], n = [-d[1], d[0]];
    const m = add(add(base, d, l * .5), n, 3 * s), tip = add(add(base, d, l), n, -1 * s);
    P.strip([base, m, tip], 2.6 * s, 1, 'wood', { smooth: true, shade: 'cyl', line: false });
    for (let j = 1; j <= 3; j++) {                                                    // ramitas y hojas a ambos lados
      const t = j / 4, p = i === 0 ? mix(base, tip, t) : mix(mix(base, m, Math.min(1, t * 2)), tip, Math.max(0, t * 2 - 1)), side = j % 2 ? 1 : -1, dd = [d[0] + n[0] * side * .8, d[1] + n[1] * side * .8];
      hoja(P, p, dd, (8 - j) * s, 2 * s, 'leaf', { line: false });
      if (j === 2 && i !== 1) P.blob(add(p, dd, 6 * s), 1.4 * s, 1.4 * s, 'bloom', { shade: 'sphere' });
    }
    hoja(P, tip, d, 6 * s, 1.8 * s, 'leaf', { line: false });
  }
}

// --- armas ---
// Hoja curva de la Danzante: filo exterior de plata, lomo más oscuro y punta afilada. d = dirección del antebrazo.
function curva(P, c, hand, d, len, near) {
  const s = c.s, n = [d[1], -d[0]], g1 = add(hand, d, 1 * s), tip = add(add(hand, d, len), n, -len * .26);
  const m1 = add(add(g1, d, len * .35), n, -len * .02), m2 = add(add(g1, d, len * .7), n, -len * .12);
  P.layer(near ? 'top' : 'far');
  P.cap(add(hand, d, -3 * s), g1, 2 * s, 2 * s, 'wood', { shade: 'cyl', line: near });
  P.cap(add(g1, n, -2.4 * s), add(g1, n, 2.4 * s), 1.4 * s, 1.4 * s, 'trim', { shade: 'cyl', line: near });
  P.strip([add(g1, d, 1 * s), m1, m2, tip], 4.4 * s, 1, 'steel', { smooth: true, shade: 'cyl', line: near });
  P.line([add(g1, d, 2 * s), add(m1, n, .5), add(m2, n, .6), add(tip, [0, 0])], 'steel', 4, { on: 'steel' });
  if (c.st >= 2) P.emit({ px: [add(m1, n, 1), add(m2, n, 1)] });
  if (near) P.anchor('muzzle', tip);
  return tip;
}
// Arco largo de la Arquera: madera con puños de plata, cuerda; con la cuerda tensa hasta la mano lejana y una flecha.
function arco(P, c, hand, handF, anim, frame) {
  const s = c.s, hl = 21 * s;
  const tensa = (anim === 'charge' && frame >= 1) || (anim === 'fire' && frame === 0), d = Math.hypot(handF[0] - hand[0], handF[1] - hand[1]);
  P.layer('top');
  const top = add(hand, [.15, -1], hl), bot = add(hand, [.15, 1], hl), bellyTop = add(hand, [1, -.55], 8 * s), bellyBot = add(hand, [1, .55], 8 * s);
  const frontMid = add(hand, [1, 0], 5.6 * s);
  P.strip([top, bellyTop, frontMid, bellyBot, bot], 2.6 * s, 1.1 * s, 'wood', { smooth: true, shade: 'cyl', line: true });
  P.line([add(top, [1, 1], .8), add(bellyTop, [0, 0]), frontMid], 'wood', 4, { on: 'wood' });
  banda(P, hand, [0, 1], 3.6 * s, 3.2 * s, 'trim', 2, { line: true });
  hoja(P, add(top, [0, 0]), [.6, -1], 3.4 * s, 1.1 * s, 'leaf', {});
  const pull = tensa && d > 5 ? handF : add(hand, [-1.2, 0]);
  P.line([top, pull, bot], 'trim', 3, {});
  if (tensa && d > 5) {                                                                 // flecha: del puño a la mano lejana, con punta emisiva
    const dir = [(handF[0] - hand[0]) / d, (handF[1] - hand[1]) / d], ptA = add(hand, dir, -1);
    P.line([add(handF, dir, 1), add(ptA, dir, 7 * s)], 'wood', 3, {});
    P.line([add(ptA, dir, 6 * s), add(ptA, dir, 9 * s)], 'steel', 4, {});
    P.emit({ px: [add(ptA, dir, 9.5 * s)] });
  }
  P.anchor('muzzle', add(hand, [1, 0], 6 * s));
  return top;
}
// Carcaj a la espalda con tres flechas emplumadas
function carcaj(P, c) {
  const { tp, tw, s } = c, a = tp(.35, -tw * 1.0), b = tp(.98, -tw * 1.35);
  P.layer('body');
  P.cap(a, b, 3.4 * s, 4.4 * s, 'leather', { shade: 'cyl', line: true });
  { const dq = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; banda(P, mix(a, b, .15), [(b[0] - a[0]) / dq, (b[1] - a[1]) / dq], 4 * s, 1.2 * s, 'trim', 2); }
  for (let i = 0; i < 3; i++) {
    const t = add(add(b, [b[0] - a[0], b[1] - a[1]], .05), [(i - 1) * 1.8 * s, 0]), up = add(t, [(i - 1) * .6, -1], 6 * s);
    P.line([t, up], 'wood', 3, {}); P.line([up, add(up, [(i - 1) * .4, -1], 3 * s)], i === 1 ? 'bloom' : 'trim', 4, {});
  }
}
// Báculo nudoso de la Druida: madera retorcida que se abre en horquilla y sostiene un capullo de savia
function baculo(P, c, hand, d) {
  const s = c.s, L = 34;
  let u = [d[0] * .36, -.66 + d[1] * .36]; const l = Math.hypot(u[0], u[1]) || 1; u = [u[0] / l, u[1] / l];
  const n = [u[1], -u[0]], b = add(hand, u, -13 * s), t = add(hand, u, (L - 13) * s), wob = Math.sin(c.ph) * .3;
  P.layer('top');
  P.strip([b, add(add(b, u, 11 * s), n, 1.2 * s), add(add(b, u, 21 * s), n, -1 * s), t], 2.8 * s, 1.8 * s, 'wood', { smooth: true, shade: 'cyl', line: true });
  P.line([add(b, u, 3 * s), add(add(b, u, 12 * s), n, 1.4 * s), add(add(b, u, 20 * s), n, -.8 * s)], 'wood', 4, { on: 'wood' });
  P.blob(add(add(b, u, 8 * s), n, -1.6 * s), 1.4 * s, 1.1 * s, 'wood', { shade: 'sphere' });                    // nudo
  P.strip([t, add(add(t, u, 3 * s), n, 3.2 * s), add(add(t, u, 8 * s), n, 3.4 * s)], 1.6 * s, 1, 'wood', { smooth: true, shade: 'cyl', line: true });    // horquilla
  P.strip([t, add(add(t, u, 3 * s), n, -3.2 * s), add(add(t, u, 8 * s), n, -3.4 * s)], 1.6 * s, 1, 'wood', { smooth: true, shade: 'cyl', line: true });
  const cen = add(t, u, 5 * s);
  P.blob(cen, 3 * s, 3.2 * s, 'leaf', { shade: 'sphere', line: true });                                             // capullo
  P.emit({ blob: [add(cen, [0, -.5]), 1.3 * s, 1.5 * s] });
  const nb = c.st === 3 ? 4 : 3;
  for (let i = 0; i < nb; i++) { const a = -90 + (i - (nb - 1) / 2) * 52; hoja(P, cen, [cos(a * D), sin(a * D)], 4.6 * s, 1.5 * s, i % 2 && c.st === 3 ? 'bloom' : 'leaf', { line: false }); }
  hoja(P, add(b, u, 14 * s), [-.8 + wob, .6], 5 * s, 1.5 * s, 'leaf', { line: false });                           // hojas que cuelgan
  P.anchor('rod', cen); P.anchor('muzzle', cen);
  return cen;
}

function brazo(P, c, S, layer, cl) {
  const { J, L } = P, s = c.s, near = S === 'N';
  P.layer(layer);
  const sh = J['sh' + S], el = J['el' + S], ha = J['ha' + S], dU = P.dir('arm' + S + '.upper'), dL = P.dir('arm' + S + '.lower');
  const nL = [dL[1], -dL[0]];
  if (cl === 0) {                                                                     // brazos al aire con brazalete de plata y guardabrazo de madera
    P.limb('arm' + S + '.upper', 'skin', L.upperW * 1.1, L.upperW * .95);
    banda(P, mix(sh, el, .35), dU, L.upperW * 1.35, 1.4 * s, 'trim', 2, { line: near });
    P.limb('arm' + S + '.lower', 'skin', L.lowerW * 1.08, L.lowerW * .9);
    P.cap(mix(el, ha, .3), ha, L.lowerW * 1.5, L.lowerW * 1.3, 'wood', { shade: 'cyl', line: near });
    P.line([mix(el, ha, .35), mix(ha, el, .2)], 'wood', 4, { on: 'wood' });
    hoja(P, mix(el, ha, .3), add(dL, nL, .4), 4 * s, 1.1 * s, 'leaf', {});
  } else {
    const w = cl === 2 ? 1.6 : 1.3;
    P.blob(sh, L.upperW, L.upperW, 'cloth', { shade: 'sphere' });
    P.limb('arm' + S + '.upper', 'cloth', L.upperW * w, L.upperW * (w - .1));
    P.fold([add(sh, dU, 3 * s), add(el, dU, -4 * s)], 'cloth');
    if (cl === 2) {
      P.limb('arm' + S + '.lower', 'skin', L.lowerW * 1.1, L.lowerW * .92);
      P.cap(el, mix(el, ha, .62), L.lowerW * 1.5, L.lowerW * 2.1, 'cloth', { shade: 'cyl', line: near });             // manga de campana
      P.line([add(el, nL, 1.2 * s), add(mix(el, ha, .55), nL, 2 * s)], 'leaf', 3, { on: 'cloth' });                       // enredadera
      P.blob(add(sh, dU, -.4 * s), L.upperW * 1.25, L.upperW * .95, 'leaf', { shade: 'sphere', line: near });          // hombrera de musgo
      banda(P, mix(el, ha, .64), dL, L.lowerW * 2.1, 1.4 * s, 'leaf', 3, { line: near });
      if (c.st >= 2) P.emit({ px: [add(mix(el, ha, .3), nL, 1)] });
    } else {
      P.limb('arm' + S + '.lower', 'skin', L.lowerW * 1.1, L.lowerW * .92);
      P.cap(mix(el, ha, .35), ha, L.lowerW * 1.5, L.lowerW * 1.3, 'leather', { shade: 'cyl', line: near });             // peto del arquero
      banda(P, mix(el, ha, .4), dL, L.lowerW * 1.55, 1.2 * s, 'trim', 2, { line: near });
    }
  }
  const hand = add(ha, dL, .7 * s);
  P.blob(hand, 2.1 * s, 2.0 * s, 'skin', { shade: 'sphere', line: near });
  return hand;
}

// ---------------------------------------------------------------------------------------------
// 5. Dibujo de cada clase
function dibujar(P, ctx, cl) {
  const c = info(P, ctx), { J, st, s } = c, estilo = ['cola', 'trenza', 'suelta'][cl];
  if (st === 3) alas(P, c);
  if (cl === 1) carcaj(P, c);
  pierna(P, c, 'F', 'far', cl);
  const handF = brazo(P, c, 'F', 'far', cl);
  if (cl === 0) { curva(P, c, handF, P.dir('armF.lower'), 20 * s, false); petalos(P, c, false); }
  else faldaLarga(P, c, false, cl === 1 ? .95 : 1.8, 'cloth', cl === 1 ? .4 : 2);
  torso(P, c, cl);
  const patada = c.A['legN.upper'] > 55, nearSkirt = () => (cl === 0 ? petalos(P, c, true) : faldaLarga(P, c, true, cl === 1 ? .95 : 1.8, 'cloth', cl === 1 ? .4 : 2));
  if (patada) { nearSkirt(); pierna(P, c, 'N', 'near', cl); } else { pierna(P, c, 'N', 'near', cl); nearSkirt(); }
  if (cl === 1) {                                                                          // esclavina corta de hojas sobre los hombros
    P.layer('near');
    const a = c.tp(1.1, -c.tw * .75), b = c.tp(1.12, c.tw * .5), bb = add(c.tp(.78, c.tw * .95), [0, 0]), ab = add(c.tp(.74, -c.tw * 1.1), [-1, 0], c.wind * 2 * s);
    P.smooth([a, b, bb, add(mix(bb, ab, .5), c.gravity, 2.4 * s), ab], 'leaf', { n: 2, line: true });
    P.fold([mix(a, b, .5), mix(ab, bb, .5)], 'leaf');
    P.line([add(bb, c.gravity, -.5), add(mix(bb, ab, .5), c.gravity, 1.6 * s), add(ab, c.gravity, -.5)], 'leaf', 1, { on: 'leaf' });
  }
  cabeza(P, c);
  peloAtras(P, c, estilo);
  oreja(P, c);
  peloArriba(P, c, estilo);
  ojo(P, c);
  const hand = brazo(P, c, 'N', 'near', cl), d = P.dir('armN.lower');
  if (cl === 0) curva(P, c, hand, d, 21 * s, true);
  else if (cl === 1) arco(P, c, hand, handF, ctx.anim, ctx.frame);
  else baculo(P, c, hand, d);
  if (cl === 0 && ctx.anim.startsWith('atk') && ctx.frame === 1) {                           // destellos de filo al golpear
    const r = ctx.rng, o = add(hand, d, 17 * s);
    for (let i = 0; i < 4; i++) { const a = r() * TAU, dd = 3 + r() * 4; P.emit({ px: [[o[0] + cos(a) * dd + 2, o[1] + sin(a) * dd]] }); }
  }
  P.anchor('haN', hand);
  P.anchor('head', J.head);
}

// ---------------------------------------------------------------------------------------------
// 6. Efectos vivos. Contrato real de render/scene.js: c = { x, y (pies), w, h, t (ms), lite, face, alpha, idx, variant }.
const px = (g, x, y, col, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.globalAlpha = 1; };
const escala = c => Math.max(.8, Math.min(1.3, (c.h || 64) / 64));
const VERDE = [['#e4ffac', '#b0e072', '#72bc44', '#34782a'], ['#f0ffff', '#b6eaea', '#74c4c8', '#36808c']];
// Hoja pequeña de 3 px (2 píxeles y un tallo) que gira: se orienta según una fase
function hojita(g, x, y, ph, pal, a) {
  const dx = Math.round(cos(ph)), dy = Math.round(sin(ph));
  px(g, x, y, pal[1], a); px(g, x + dx, y + dy, pal[0], a); px(g, x - dx, y - dy, pal[2], a * .8);
}
const fx = {
  back(g, c, stage) {
    if (stage < 2) return;
    const t = c.t / 1000, s = escala(c), pal = VERDE[c.variant ? 1 : 0];
    g.save(); g.translate(c.x, c.y);
    const n = c.lite ? 3 : stage === 2 ? 6 : 9;
    for (let i = 0; i < n; i++) {                                                      // hojas que orbitan al héroe, algo más lentas en la etapa 3
      const a = t * (stage === 2 ? 1.3 : .9) + i / n * TAU, r = 17 + (i % 3) * 3;
      const y = -26 * s + sin(a) * (8 + (i % 2) * 7) * s;
      if (sin(a) < 0 || stage === 3) hojita(g, cos(a) * r * s * c.face, y, a * 2 + i, pal, .55 + .35 * (i % 2));
    }
    if (stage === 3) {                                                                  // anillo de brotes en el suelo: puntos verdes con flores
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; px(g, cos(a) * 24 * s, sin(a) * 7 * s, i % 4 === 0 ? (c.variant ? '#fff4a4' : '#ffa8c8') : pal[2], .8); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .3; px(g, cos(a) * 24 * s, sin(a) * 7 * s - 1, pal[0]); px(g, cos(a) * 24 * s, sin(a) * 7 * s - 2, pal[1]); }
    }
    g.restore();
  },
  front(g, c, stage) {
    if (stage < 2 || c.lite) return;
    const t = c.t / 1000, s = escala(c), pal = VERDE[c.variant ? 1 : 0];
    g.save(); g.translate(c.x, c.y);
    for (let i = 0; i < (stage === 2 ? 3 : 5); i++) {                                 // hojas que caen o se elevan lentamente cerca del cuerpo
      const k = (t * .28 + i / 5) % 1, x = (sin(i * 4.1 + k * 5) * 14 + (i % 2 ? 6 : -6)) * s, y = (stage === 2 ? -58 + k * 56 : -4 - k * 58) * s;
      hojita(g, x, y, k * 6 + i, pal, Math.sin(k * Math.PI) * .9);
    }
    g.restore();
  },
};

// Remate de la transformación: un círculo de raíces que sube y una lluvia de hojas (sin destello de pantalla)
function transformFx(g, c, k) {
  const s = escala(c), pal = VERDE[c.variant ? 1 : 0];
  g.save(); g.translate(c.x, c.y);
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * TAU, h = Math.min(1, k * 1.6) * (30 + (i % 5) * 8) * s, r = (14 + (i % 3) * 4) * s * (1 + k * .4);
    for (let y = 0; y < h; y += 3) px(g, cos(a) * r + sin(y * .3 + i) * 1.5, sin(a) * r * .3 - y, pal[(i + (y / 3 | 0)) % 3 + 1], (1 - y / (h + 1)) * (1 - k * .6));
  }
  for (let i = 0; i < 10; i++) hojita(g, sin(i * 3.1) * 20 * s, -80 * s + ((k * 1.4 + i / 10) % 1) * 80 * s, k * 8 + i, pal, 1 - k * .5);
  g.restore();
}

// ---------------------------------------------------------------------------------------------
const poseDe = i => (anim, k) => (POSE[i](anim, k) || null);
const CUERPO = [{ body: 'atleta', height: 62, leg: 1.04, arm: 1.04, shoulder: .94, hip: .9, headScale: 1.08 },
  { body: 'atleta', height: 62, leg: 1.03, arm: 1.04, shoulder: .92, hip: .92, headScale: 1.08 },
  { body: 'atleta', height: 62, leg: 1.02, arm: 1.04, shoulder: .94, hip: .95, headScale: 1.08 }];
export default {
  id: 'elfos',
  kit: 1,
  ready: true,
  materials: ['skin', 'hair', 'cloth', 'leaf', 'wood', 'trim', 'leather', 'steel', 'bloom', 'iris'],
  ramps(variant, stage) {
    const v = variant ? 1 : 0, st = stage || 1, pick = k => RAMPAS[k][Math.min(v, RAMPAS[k].length - 1)];
    const lum = st >= 2 ? ramp5(v ? ['#0e3a48', '#1c6272', '#4ca4b4', '#7cd4e0', '#c4f4fa'] : ['#0a3a22', '#16603a', '#3aa06c', '#68d49c', '#b4f8d0']) : ramp5(pick('cloth'));   // Savia Despierta: el verde gana luz
    return {
      skin: ramp5(pick('skin')), hair: ramp5(pick('hair')), cloth: lum, leaf: ramp5(pick('leaf')), wood: ramp5(pick('wood')),
      trim: ramp5(pick('trim')), leather: ramp5(pick('leather')), steel: ramp5(pick('steel')), bloom: ramp5(pick('bloom')),
      iris: ramp5(['#0a2418', '#1a4a30', IRIS[v], '#ffffff', '#ffffff']),
    };
  },
  emit: variant => EMIT[variant ? 1 : 0],
  geomStage: s => s,
  extraAnims: {},
  extraPoses: {},
  classes: [
    { id: 'danzante', name: 'Danzante de hojas', build: CUERPO[0], anchors: ['haN', 'haF', 'head', 'chest', 'muzzle'], pose: poseDe(0), draw: (P, ctx) => dibujar(P, ctx, 0) },
    { id: 'arquera', name: 'Arquera', build: CUERPO[1], anchors: ['haN', 'haF', 'head', 'chest', 'muzzle'], pose: poseDe(1), draw: (P, ctx) => dibujar(P, ctx, 1) },
    { id: 'druida', name: 'Druida', build: CUERPO[2], anchors: ['haN', 'haF', 'head', 'chest', 'muzzle'], pose: poseDe(2), draw: (P, ctx) => dibujar(P, ctx, 2) },
  ],
  stageScale: [1, 1, 1],
  fx,
  transformFx,
};
