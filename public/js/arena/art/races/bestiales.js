// Raza «bestiales» · Manada de la Luna (paquete A-BES). Arte 16 bits propio, 3 etapas y variantes A/B.
// Clases: 0 Oso guardián (garras de hierro y escudo de tablones), 1 Zorra ilusionista (farol lunar y cola enorme),
//         2 Ciervo-sanador (astas con luz y cayado de media luna).
// Guía: docs/arena-estilo-16bits.md. Solo se importa de '../kit16/*'. Sin Math.random (usa ctx.rng).
// Orden del archivo: 1 paleta · 2 poses · 3 datos del fotograma · 4 piezas · 5 dibujo de cada clase · 6 efectos vivos.
//   Etapa 1 Formación · 2 Llamada de la Manada (ojos brillantes, marcas lunares, bestia espectral tenue) ·
//   3 Espíritu de Luna Llena (gola de pelo, runas, astas y orejas mayores, luna enorme y bestia detrás).
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------------------------------------------------------------------------------------------
// 1. Paleta (spec: pardo #8a7a6a, azul lunar #5a9aff). [sombra profunda, sombra, base, luz, brillo]. B = pelaje plata y turquesa lunar.
const RAMPAS = {
  fur:     [['#241a14', '#4a3a30', '#8a7a6a', '#b4a48e', '#ddd0ba'], ['#2c3040', '#586078', '#aab2c6', '#d8dce8', '#f6f8ff']],
  fur2:    [['#4a3c30', '#806e5a', '#c4b49c', '#e4d8c0', '#f8f0de'], ['#586078', '#9aa2b8', '#e0e4f0', '#f4f6fc', '#ffffff']],
  skin:    [['#1c1214', '#3e2a2c', '#6a4a48', '#9a7068', '#c89c90'], ['#1c1c28', '#3a3a50', '#605e78', '#8a88a4', '#b4b2cc']],
  cloth:   [['#0a1230', '#16285a', '#2a4890', '#4a74c8', '#8ab4ff'], ['#0a2a2a', '#124e4c', '#1f8a82', '#3cbcae', '#8aeee0']],
  cloth2:  [['#3a3c58', '#7a7c9c', '#c8cce0', '#e8ecfa', '#ffffff'], ['#4a4a40', '#8a8a78', '#d8d8c4', '#f2f2e2', '#ffffff']],
  trim:    [['#10285a', '#2a5cb0', '#5a9aff', '#9acaff', '#e0f0ff'], ['#0c4a40', '#1e8a78', '#5ad8c0', '#9af0e0', '#e8fff8']],
  leather: [['#1a1008', '#34221a', '#5a3e2c', '#80593e', '#a8805a']],
  metal:   [['#1e2430', '#3e4858', '#7a869c', '#b4c0d6', '#eef4ff']],
  gem:     [['#0c2c78', '#2462c8', '#5aa4ff', '#a8d8ff', '#ffffff'], ['#0a4a44', '#1c9084', '#5ae0cc', '#aaf8ea', '#ffffff']],
  hueso:   [['#5a4a38', '#9a8468', '#d8c8a8', '#f0e4c8', '#fffaf0']],
};
const IRIS = [['#10204a', '#2a4a9a', '#5a9aff', '#ffffff', '#ffffff'], ['#0a3a34', '#1c8478', '#5ad8c0', '#ffffff', '#ffffff']];
const EMIT = ['#cfe4ff', '#d4fff4'];
const AZUL = [['#ffffff', '#cfe4ff', '#5a9aff'], ['#ffffff', '#d4fff4', '#5ad8c0']];

// ---------------------------------------------------------------------------------------------
// 2. Poses propias. Ángulos: 0 = colgando, 90 = al frente, 180 = arriba. pl = pies apoyados, cr = flexión de piernas.
const G = o => ({ pl: 'NF', ...o });
const POSE = [
  // Oso: postura ancha y baja, la zarpa cercana adelantada y el escudo en la lejana.
  (anim, k) => ({
    idle: [0, 1, 2, 3].map(i => { const b = [0, .6, 1, .6][i]; return G({ cr: .2 + b * .012, lean: 4 + b, sp: 3, nk: 1, hipN: 28, knN: 26, hipF: -24, knF: 26, shN: 36 + b * 4, elN: 98, shF: 52, elF: 92 + b * 3 }); })[k],
    block: G({ cr: .24, lean: 10, sp: 6, nk: 3, hipN: 30, knN: 30, hipF: -26, knF: 28, shN: 50, elN: 100, shF: 80, elF: 90 }),
  }[anim]),
  // Zorra: ligera, peso atrás, farol en la mano cercana y la otra mano abierta en el aire.
  (anim, k) => ({
    idle: [0, 1, 2, 3].map(i => { const b = [0, .6, 1, .6][i]; return G({ cr: .12 + b * .01, lean: 6 + b, sp: 2, nk: 2 - b, hipN: 18, knN: 18, hipF: -22, knF: 22, shN: 38 + b * 3, elN: 80, shF: 60 + b * 6, elF: 70 }); })[k],
  }[anim]),
  // Ciervo: erguido, cayado planta cerca y la otra mano al pecho.
  (anim, k) => ({
    idle: [0, 1, 2, 3].map(i => { const b = [0, .5, 1, .5][i]; return G({ cr: .08 + b * .01, lean: 3 + b * .5, sp: 1, nk: 3 - b, hipN: 10, knN: 10, hipF: -10, knF: 12, shN: 22 + b * 2, elN: 64, shF: 36, elF: 96 + b * 2 }); })[k],
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
const luna = (P, p, r, mat, tone = 3) => {                           // media luna de 1 px de grosor
  const pts = []; for (let i = 0; i <= 8; i++) { const a = (-70 + i * 17.5) * D; pts.push([p[0] + cos(a) * r, p[1] + sin(a) * r]); }
  P.line(pts, mat, tone, {});
};

// Cola: el oso lleva un rabo corto; la zorra una cola enorme con punta clara; el ciervo un rabo blanco.
function cola(P, c, cl) {
  const { J, s, ph, st } = c, t1 = J.tail1, t2 = J.tail2, t3 = J.tail3;
  if (!t1) return;
  P.layer('body');
  if (cl === 0) { P.blob(mix(J.root, t1, .8), 3.4 * s, 3.1 * s, 'fur', { shade: 'sphere' }); return; }
  if (cl === 2) { P.blob(mix(J.root, t1, .9), 2.6 * s, 3.2 * s, 'fur2', { shade: 'sphere' }); return; }
  const k = 1 + st * .08, w = sin(ph) * 1.2 * s;
  const p2 = [t2[0], t2[1] + w], p3 = [t3[0], t3[1] + w * 1.6];
  P.blob(mix(J.root, t1, .6), 4.6 * s * k, 4.2 * s * k, 'fur', { shade: 'sphere' });
  P.blob(t1, 6 * s * k, 5.4 * s * k, 'fur', { shade: 'sphere' });
  P.blob(p2, 7 * s * k, 6 * s * k, 'fur', { shade: 'sphere', line: true });
  P.blob(add(p3, [1.5 * s, 0]), 5.6 * s * k, 5 * s * k, 'fur2', { shade: 'sphere', line: true });
  P.fold([add(t1, [-1, -2 * s]), add(p2, [-1, -3 * s]), add(p3, [-1, -2 * s])], 'fur');
  P.line([add(t1, [0, -4.4 * s * k]), add(p2, [0, -5.4 * s * k])], 'fur', 4, { on: 'fur' });
}

function pierna(P, c, S, layer, cl) {
  const { L, s, J } = P.__c || c;
  P.layer(layer);
  const near = S === 'N', big = cl === 0 ? 1.18 : 1;
  P.limb('leg' + S + '.upper', 'fur', L.thighW * 1.15 * big, L.thighW * .95 * big);
  const kn = J['kn' + S], d = P.dir('leg' + S + '.upper'), n = [d[1], -d[0]];
  if (cl === 0) {                                                                     // grebas de hierro
    P.limb('leg' + S + '.lower', 'fur', L.shinW * 1.3, L.shinW * 1.05);
    P.cap(mix(kn, J['ft' + S], .42), J['ft' + S], L.shinW * 1.5, L.shinW * 1.2, 'metal', { shade: 'cyl', line: near });
    banda(P, mix(kn, J['ft' + S], .42), d, L.shinW * 1.6, 1.3 * s, 'trim', 2, { line: near });
  } else {
    P.limb('leg' + S + '.lower', 'fur', L.shinW * 1.15, L.shinW * .9);
    if (cl === 1) P.limb('leg' + S + '.lower', 'cloth', L.shinW * 1.1, L.shinW * .85, { on: 'fur', dt: 0 });
    P.fold([add(kn, d, -1.5), add(kn, n, -2.2 * s)], 'fur');
  }
  P.cap(J['heel' + S], J['toe' + S], L.ankle * 2, L.ankle * 1.4, cl === 2 ? 'hueso' : 'leather');          // pata con zapatilla de cuero (ciervo: pezuña)
  P.blob(add(J['toe' + S], [-.4 * s, -.2 * s]), 1.7 * s, 1.6 * s, cl === 2 ? 'hueso' : 'fur2', { shade: 'sphere' });
  if (cl !== 2) P.line([add(J['toe' + S], [.8 * s, .3 * s]), add(J['toe' + S], [1.6 * s, .6 * s])], 'hueso', 3, {});
}

// Falda larga o abrigo. mat = tela, len en múltiplos del muslo.
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
    P.line([add(bBot, g, -.5), add(mid, g, -.5), add(aBot, g, -.5)], o.hem || 'trim', 3, { on: o.mat });
    if (o.moon) luna(P, mix(mix(a, b, .6), mix(aBot, bBot, .6), .5), 2.2 * s, 'trim', 3);
  }
}

function torso(P, c, cl) {
  const { tp, tw, hw, s, fwd, st, ph } = c;
  P.layer('body');
  const big = cl === 0 ? 1.1 : 1;
  const sh = [tp(-.02, -hw * .98), tp(.2, -tw * .86 * big), tp(.5, -tw * .86 * big), tp(.78, -tw * 1.04 * big), tp(1.0, -tw * .9), tp(1.12, -tw * .38),
    tp(1.12, tw * .42), tp(1.0, tw * 1.1 * big), tp(.74, tw * 1.2 * big), tp(.46, tw * .92 * big), tp(.2, hw * .98), tp(-.02, hw * 1.04)];
  P.smooth(sh, 'fur', { n: 3 });
  P.smooth([tp(.2, tw * .5), tp(.5, tw * .74), tp(.8, tw * .94), tp(.7, tw * 1.14), tp(.4, tw * .9), tp(.2, hw * .9)], 'fur2', { n: 3, shade: 'flat', tone: 3, on: 'fur' });  // pechera clara
  P.fold([tp(.86, tw * .6), tp(.6, tw * .5), tp(.4, tw * .6)], 'fur');
  P.fold([tp(.6, -tw * .66), tp(.4, -tw * .5)], 'fur');
  if (st >= 2) P.emit({ line: [tp(.9, -tw * .5), tp(.7, -tw * .62), tp(.52, -tw * .56)] });   // marca lunar en el costado
  if (cl === 0) {                                                                       // arnés de cuero con hebilla de hierro y faldón corto
    P.strip([tp(1.1, -tw * .3), tp(.86, tw * .1), tp(.6, tw * .5), tp(.32, tw * .8)], 2.8 * s, 2.4 * s, 'leather', { shade: 'cyl', line: true });
    P.blob(tp(.7, tw * .3), 2 * s, 2 * s, 'metal', { shade: 'sphere', line: true });
    P.poly([tp(.4, -tw * .9), tp(.4, tw * .92), tp(.2, hw * 1.05), tp(.2, -hw * 1.0)], 'leather', { shade: 'vol', line: true });
    banda(P, tp(.3, 0), c.up, tw * 2.1, 1.3 * s, 'metal', 2);
    luna(P, tp(.2, hw * .2), 3 * s, 'trim', 3);
  } else if (cl === 1) {                                                                // chaleco corto con broche de luna y fajín
    P.poly([tp(1.0, -tw * .5), tp(1.16, -tw * .35), tp(1.16, tw * .3), tp(1.0, tw * .62)], 'cloth', { shade: 'vol', line: true });
    P.strip([tp(1.12, tw * .4), tp(.8, tw * .15), tp(.5, tw * .1)], 1.9 * s, 1.5 * s, 'trim', { shade: 'cyl', line: true });
    P.poly([tp(.42, -tw * .8), tp(.42, tw * .84), tp(.2, hw), tp(.2, -hw)], 'cloth', { shade: 'vol', line: true });
    const knot = add(tp(.33, 0), fwd, tw * .38), sw = sin(ph + 1) * 1.6 + c.wind * 3;
    P.blob(knot, 2 * s, 1.9 * s, 'trim', { shade: 'sphere', line: true });
    P.strip([knot, add(add(knot, c.gravity, 5 * s), [-1, 0], sw * .5), add(add(knot, c.gravity, 10 * s), [-1, 0], sw * 1.1)], 2.2 * s, 1.1 * s, 'cloth', { smooth: true, line: true });
  } else {                                                                              // túnica crema, estola azul y cinturón de hojas
    P.poly([tp(.9, -tw * .7), tp(1.12, -tw * .4), tp(1.12, tw * .4), tp(.9, tw * 1.0), tp(.5, tw * .9), tp(.3, hw), tp(.3, -hw), tp(.5, -tw * .8)], 'cloth2', { shade: 'vol', line: true });
    P.strip([tp(1.12, tw * .5), tp(.8, tw * .3), tp(.5, tw * .2), tp(.2, tw * .3)], 2.1 * s, 1.7 * s, 'trim', { shade: 'cyl', line: true });
    P.fold([tp(.78, tw * .8), tp(.52, tw * .6)], 'cloth2');
    P.fold([tp(.62, -tw * .66), tp(.42, -tw * .5)], 'cloth2');
    for (let i = 0; i < 3; i++) P.blob(tp(.34, -tw * .6 + i * tw * .6), 1.6 * s, 1.2 * s, 'trim', { shade: 'sphere', line: true });
  }
}

// Cabeza de perfil con hocico. Oso: hocico corto y orejas redondas. Zorra: hocico fino y orejas altas. Ciervo: hocico largo y astas.
function cabeza(P, c, cl) {
  const { hp, R, J, s, st } = c, sn = [1.28, 1.78, 1.95][cl];
  P.layer('body');
  if (st === 3 && cl !== 2) P.blob(J.neck, R * 1.25, R * 1.2, 'fur2', { shade: 'sphere', dt: -1 });               // gola de pelo de luna llena
  P.cap(J.chest, J.head, c.L.head * (cl === 0 ? .46 : .32), c.L.head * (cl === 0 ? .42 : .28), 'fur', { dt: -1 });
  // orejas detrás del cráneo (la lejana)
  if (cl === 0) P.blob(hp(-.55, -.92), R * .42, R * .42, 'fur', { shade: 'sphere', dt: -1 });
  else if (cl === 1) P.poly([hp(-.5, -.7), hp(-.62, -2.3 - (st > 1 ? .3 : 0)), hp(.05, -.95)], 'fur', { shade: 'vol', dt: -1 });
  else P.smooth([hp(-.5, -.5), hp(-1.5, -1.0), hp(-1.9, -.8), hp(-1.0, -.2)], 'fur', { n: 2, dt: -1 });
  P.blob(J.head, R * 1.04, R * 1.0, 'fur', { shade: 'flat', tone: 3, line: true });
  // hocico
  P.smooth([hp(.4, -.4), hp(sn * .75, -.2), hp(sn, .16), hp(sn * .96, .5), hp(.7, .8), hp(.2, .8), hp(-.2, .4)], 'fur', { n: 3, shade: 'flat', tone: 3, line: true });
  P.smooth([hp(.3, .45), hp(sn * .9, .38), hp(sn * .94, .56), hp(.7, .88), hp(.1, .9)], 'fur2', { n: 2, shade: 'flat', tone: 3 });                                      // mentón y mejilla clara
  P.smooth([hp(-.1, .55), hp(.7, .72), hp(.8, .95), hp(.1, 1.0), hp(-.3, .7)], 'fur', { n: 2, shade: 'flat', tone: 2, on: 'fur' });                                    // sombra de mandíbula
  if (cl === 1) P.poly([hp(.6, -.3), hp(sn * .85, -.15), hp(sn * .9, .2), hp(.7, .2)], 'fur', { shade: 'flat', tone: 4, on: 'fur' });                                    // luz de lomo del hocico
  P.blob(hp(sn - .02, .02), R * .26, R * .22, 'skin', { shade: 'sphere' });                                                                                              // nariz
  P.line([hp(sn - .1, .02)], 'skin', 4, { on: 'skin' });
  P.line([hp(.5, .56), hp(sn * .78, .5)], 'skin', 1, { on: 'fur2' });                                                                                                      // boca
  P.blob(hp(.02, .15), R * .2, R * .3, 'skin', { shade: 'flat', tone: 2, on: 'fur' });                                                                                    // oído
  // orejas cercanas
  P.layer('top');
  if (cl === 0) {
    P.blob(hp(-.1, -1.0), R * .46, R * .46, 'fur', { shade: 'sphere', line: true });
    P.blob(hp(-.05, -.98), R * .24, R * .24, 'skin', { shade: 'flat', tone: 3 });
  } else if (cl === 1) {
    const k = st > 1 ? .3 : 0;
    P.poly([hp(-.3, -.72), hp(.1, -2.45 - k), hp(.75, -.82)], 'fur', { shade: 'vol', line: true });
    P.poly([hp(-.05, -.95), hp(.12, -1.95 - k), hp(.5, -.98)], 'skin', { shade: 'flat', tone: 3 });
    P.poly([hp(.1, -2.45 - k), hp(.04, -2.0 - k), hp(.2, -2.0 - k)], 'metal', { shade: 'flat', tone: 0 });
  } else {
    P.smooth([hp(-.3, -.6), hp(-1.3, -1.3), hp(-1.9, -1.1), hp(-.9, -.15)], 'fur', { n: 2, line: true });
    P.smooth([hp(-.5, -.55), hp(-1.2, -.98), hp(-1.5, -.9), hp(-.8, -.3)], 'skin', { n: 2, shade: 'flat', tone: 3 });
  }
}
function ojo(P, c, cl) {
  const { hp, st, golpe } = c, e = hp(.62, -.04);
  P.layer('top');
  P.eye([e[0] - .4, e[1] - .4], { iris: 'iris', size: 3 });
  if (st >= 2) P.emit({ px: [[e[0] + .5, e[1] + .6], [e[0] - .5, e[1] + .6]] });
  P.line([hp(.3, golpe ? -.52 : -.38), hp(.62, -.32), hp(1.0, golpe ? -.3 : -.22)], 'fur', 0, { on: 'fur' });
  const m = hp(.98, .56); P.line([m, [m[0] - 1.6, m[1] + (golpe ? .9 : 0)]], 'skin', 0, { on: 'fur2' });
  if (cl === 0) P.line([hp(.9, .12), hp(1.1, .3)], 'fur', 1, { on: 'fur' });
  if (st >= 2) {                                                                          // luna creciente en la frente
    const f = hp(.3, -.62); P.emit({ px: [f, [f[0] + 1, f[1] - 1], [f[0] + 2, f[1] - 1]] });
  }
}

// Astas del ciervo: dos ramas con puntas; etapas altas añaden puntas y brillo.
function astas(P, c) {
  const { hp, R, s, st, wind } = c, k = 1 + (st - 1) * .1;
  P.layer('top');
  const ramas = [[hp(-.35, -.95), 1], [hp(.05, -.98), 0]];
  for (const [r, far] of ramas) {
    const sw = -wind * 3 * s, h = (8 + st * 1.2) * s * k;
    const m = add(r, [-3 * s + sw * .3, -h * .55]), t = add(r, [-6 * s + sw, -h]);
    const o = { smooth: true, line: !far, dt: far ? -1 : 0 };
    P.strip([r, m, t], 2.8 * s, 1.2 * s, 'hueso', { shade: 'cyl', ...o });
    P.strip([add(m, [0, 1 * s]), add(m, [4 * s, -2 * s]), add(m, [6 * s, -5.5 * s * k])], 1.8 * s, 1, 'hueso', { shade: 'cyl', ...o });
    P.strip([add(m, [-1, -1 * s]), add(m, [-3 * s, -4 * s]), add(m, [-2.5 * s, -8 * s * k])], 1.6 * s, 1, 'hueso', { shade: 'cyl', ...o });
    if (st >= 2) P.emit({ px: [add(t, [0, -1]), add(m, [6 * s, -5.8 * s * k]), add(m, [-2.5 * s, -8.3 * s * k])] });
    if (st === 3 && !far) P.strip([add(r, [-1 * s, -h * .2]), add(r, [-8 * s + sw, -h * .45]), add(r, [-10 * s + sw, -h * .75])], 1.6 * s, 1, 'hueso', { shade: 'cyl', smooth: true, line: true });
  }
  if (st === 3) {                                                                          // aro de luna tras las astas
    const o = hp(-.6, -2.0 * k), pts = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * TAU; pts.push([o[0] + cos(a) * R * 1.3, o[1] + sin(a) * R * .45]); }
    P.emit({ line: pts });
  }
}

// Melena y flequillo corto: el oso una cresta de pelo; la zorra mechón y mejillas; el ciervo mechón de la frente.
function pelo(P, c, cl) {
  const { hp, R, s, wind, st } = c;
  P.layer('top');
  if (cl === 0) {
    P.smooth([hp(-.9, -.5), hp(-.7, -1.0), hp(.3, -1.12), hp(.9, -.7), hp(.7, -.5), hp(0, -.72)], 'fur', { n: 2 });
    P.line([hp(-.5, -1.0), hp(.1, -1.08), hp(.6, -.85)], 'fur', 4, { on: 'fur' });
  } else if (cl === 1) {
    P.lock(hp(.3, -.7), { n: 3, ang: -20 - wind * 12, len: R * 1.1, w: R * .6, w1: 1, curve: 14, sway: 2 }, 'fur', { line: true });
    P.poly([hp(.1, .8), hp(.4, 1.5), hp(.8, .9)], 'fur2', { shade: 'flat', tone: 3, line: true });                                 // mejilla en pico
  } else {
    P.lock(hp(.4, -.8), { n: 3, ang: -4 - wind * 10, len: R * 1.2, w: R * .6, w1: 1, curve: 18, sway: 2 }, 'fur2', { line: true });
  }
  if (st === 3 && cl !== 2) for (let i = 0; i < 3; i++) P.lock(add(hp(-.7, .4 + i * .3), [0, 0]), { n: 3, ang: -50 - wind * 20 - i * 14, len: R * 1.5, w: R * .5, w1: 1, curve: 16, sway: 3 }, 'fur2', { dt: -1 });
}

// Zarpa con 3 garras de hueso
function zarpa(P, c, S, cl, layer) {
  const { J, s, L } = c, near = S === 'N', ha = J['ha' + S], dL = P.dir('arm' + S + '.lower');
  const big = cl === 0 ? 1.35 : 1;
  P.blob(add(ha, dL, .8 * s), 2.6 * s * big, 2.4 * s * big, cl === 0 ? 'metal' : 'fur', { shade: 'sphere', line: near });
  if (cl !== 0) {
    P.blob(add(ha, dL, 1.2 * s), 1.4 * s, 1.2 * s, 'fur2', { shade: 'flat', tone: 3, on: 'fur' });
  }
  const n = [dL[1], -dL[0]];
  for (let i = -1; i <= 1; i++) P.line([add(add(ha, dL, 3 * s * big), n, i * 1.4 * s), add(add(ha, dL, 4.8 * s * big), n, i * 1.6 * s)], 'hueso', 4, {});
  void L; void layer;
}

function brazo(P, c, S, layer, cl) {
  const { J, L } = P, s = c.s, near = S === 'N';
  P.layer(layer);
  const sh = J['sh' + S], el = J['el' + S], ha = J['ha' + S], dU = P.dir('arm' + S + '.upper'), dL = P.dir('arm' + S + '.lower');
  const w = cl === 0 ? 1.35 : 1.15;
  P.blob(sh, L.upperW * 1.05, L.upperW * 1.05, 'fur', { shade: 'sphere' });
  P.limb('arm' + S + '.upper', 'fur', L.upperW * w, L.upperW * (w - .1));
  P.fold([add(sh, dU, 3 * s), add(el, dU, -4 * s)], 'fur');
  if (cl === 0) {                                                                        // brazalete de hierro y hombrera con pinchos
    P.limb('arm' + S + '.lower', 'fur', L.lowerW * 1.25, L.lowerW * 1.1);
    P.cap(mix(el, ha, .45), ha, L.lowerW * 1.8, L.lowerW * 1.55, 'metal', { shade: 'cyl', line: near });
    banda(P, mix(el, ha, .5), dL, L.lowerW * 1.9, 1.3 * s, 'trim', 2, { line: near });
    P.blob(add(sh, dU, -.5 * s), L.upperW * .8, L.upperW * .62, 'metal', { shade: 'sphere', line: near });
    if (near) P.poly([add(sh, [-1.2 * s, -L.upperW * .5]), add(sh, [0, -L.upperW * 1.2]), add(sh, [1.2 * s, -L.upperW * .5])], 'metal', { shade: 'vol', line: true });
  } else if (cl === 1) {
    P.limb('arm' + S + '.lower', 'fur', L.lowerW * 1.1, L.lowerW * .95);
    P.cap(el, mix(el, ha, .66), L.lowerW * 1.5, L.lowerW * 2.2, 'cloth', { shade: 'cyl', line: near });                // manga de campana
    P.fold([add(el, dL, 1 * s), add(mix(el, ha, .6), dL, 0)], 'cloth');
    banda(P, mix(el, ha, .68), dL, L.lowerW * 2.2, 1.4 * s, 'trim', 2, { line: near });
  } else {
    P.limb('arm' + S + '.lower', 'fur', L.lowerW * 1.1, L.lowerW * .95);
    P.cap(el, mix(el, ha, .6), L.lowerW * 1.6, L.lowerW * 2.3, 'cloth2', { shade: 'cyl', line: near });
    banda(P, mix(el, ha, .62), dL, L.lowerW * 2.3, 1.4 * s, 'trim', 2, { line: near });
    if (c.st >= 3) P.emit({ px: [mix(el, ha, .3)] });
  }
  zarpa(P, c, S, cl, layer);
  return add(ha, dL, .8 * s);
}

// --- armas ---
function escudo(P, c, hand) {                                                            // oso: escudo de tablones con ribete de hierro y luna
  const s = c.s, o = add(hand, [3.4 * s, -1.2 * s]);
  const pts = k => [[-5.8 * k, -8 * k], [5.8 * k, -8 * k], [6.2 * k, 3 * k], [0, 9.6 * k], [-6.2 * k, 3 * k]].map(p => [o[0] + p[0] * s, o[1] + p[1] * s]);
  P.layer('near');
  P.smooth(pts(1), 'metal', { n: 2, line: true });
  P.smooth(pts(.78), 'leather', { n: 2 });
  P.line([add(o, [-2.4 * s, -6 * s]), add(o, [-2.4 * s, 5 * s])], 'leather', 1, { on: 'leather' });
  P.line([add(o, [2.4 * s, -6 * s]), add(o, [2.4 * s, 5 * s])], 'leather', 1, { on: 'leather' });
  P.line([add(o, [-4 * s, -5.5 * s]), add(o, [4 * s, -5.5 * s])], 'leather', 4, { on: 'leather' });
  P.blob(add(o, [0, -.6 * s]), 2.6 * s, 2.6 * s, 'trim', { shade: 'sphere', line: true });
  P.blob(add(o, [1 * s, -1.4 * s]), 2 * s, 2 * s, 'leather', { shade: 'flat', tone: 1, on: 'trim' });
  if (c.st >= 2) P.emit({ px: [add(o, [-1.5 * s, -2.4 * s]), add(o, [-2 * s, -.5 * s])] });
}
function farol(P, c, hand, d) {                                                          // zorra: vara con farol de luna
  const s = c.s, u = d, n = [u[1], -u[0]], t = add(hand, u, 12 * s), b = add(hand, u, -6 * s);
  P.layer('top');
  P.cap(b, t, 2.2 * s, 1.7 * s, 'leather', { shade: 'cyl', line: true });
  banda(P, add(hand, u, -1 * s), u, 3 * s, 1.1 * s, 'trim', 3);
  const cen = add(t, u, 4.4 * s);
  P.strip([add(t, n, -2.8 * s), add(cen, n, -3.4 * s), add(cen, u, 3.8 * s)], 1.3 * s, 1, 'metal', { smooth: true, line: true });
  P.strip([add(t, n, 2.8 * s), add(cen, n, 3.4 * s), add(cen, u, 3.8 * s)], 1.3 * s, 1, 'metal', { smooth: true, line: true });
  P.blob(cen, 3 * s, 3 * s, 'gem', { shade: 'sphere', line: true });
  P.emit({ px: [add(cen, [0, 0]), add(cen, [1, 1])] });
  if (c.ctx.anim === 'cast' || c.ctx.anim === 'fire') for (let i = 0; i < 3; i++) { const a = c.ph + i * TAU / 3; P.emit({ px: [add(cen, [cos(a) * 6 * s, sin(a) * 4 * s])] }); }
  P.anchor('muzzle', add(cen, u, 3 * s)); P.anchor('rod', add(cen, u, 3 * s));
  return add(cen, u, 3.8 * s);
}
function cayado(P, c, hand, d) {                                                         // ciervo: cayado con media luna
  const s = c.s;
  let u = [d[0] * .38, -.65 + d[1] * .38]; const l = Math.hypot(u[0], u[1]) || 1; u = [u[0] / l, u[1] / l];
  const n = [u[1], -u[0]], b = add(hand, u, -13 * s), t = add(hand, u, 15 * s);
  P.layer('top');
  P.cap(b, t, 2.4 * s, 1.8 * s, 'hueso', { shade: 'cyl', line: true });
  banda(P, add(hand, u, -2.5 * s), u, 3.4 * s, 1.1 * s, 'trim', 3);
  const cen = add(t, u, 4.4 * s), pts = [];
  for (let i = 0; i <= 10; i++) { const a = (-120 + i * 24) * D; pts.push([cen[0] + (u[0] * cos(a) * 0 + cos(a + Math.atan2(u[1], u[0]) + Math.PI / 2)) * 5.2 * s, cen[1] + sin(a + Math.atan2(u[1], u[0]) + Math.PI / 2) * 5.2 * s]); }
  P.strip(pts, 2.2 * s, 1.2 * s, 'trim', { shade: 'cyl', line: true });
  P.blob(add(cen, u, -.5 * s), 2.1 * s, 2.1 * s, 'gem', { shade: 'sphere', line: true });
  P.emit({ px: [add(cen, [-.5, -.5]), add(cen, add(u, n, .5), 5 * s)] });
  const top = add(cen, u, 5 * s); P.anchor('rod', top); P.anchor('muzzle', top);
  return top;
}

// Runas lunares (etapa 3): trazos emisivos sobre el pecho y el brazo cercano
function runas(P, c) {
  const { tp, tw, s, J } = c;
  P.emit({ line: [tp(.8, tw * .4), tp(.68, tw * .6)] }); P.emit({ line: [tp(.62, tw * .3), tp(.54, tw * .5)] });
  P.emit({ px: [add(J.elN, [0, 0]), add(mix(J.elN, J.haN, .4), [1, 0]), add(mix(J.elN, J.haN, .7), [0, 1])] });
  void s;
}

// ---------------------------------------------------------------------------------------------
// 5. Dibujo de cada clase. Orden: lejano → cola → tronco → pierna cercana → cabeza → pelo → arma y brazo cercano.
function dibujar(P, ctx, cl) {
  const c = info(P, ctx), { J, s, st } = c;
  pierna(P, c, 'F', 'far', cl);
  brazo(P, c, 'F', 'far', cl);
  cola(P, c, cl);
  if (cl === 1) falda(P, c, false, { len: .9, flare: 1.2, mat: 'cloth' });
  if (cl === 2) falda(P, c, false, { len: 1.7, flare: 1.8, mat: 'cloth2', hem: 'trim' });
  if (cl === 0) falda(P, c, false, { len: .5, narrow: .8, mat: 'leather' });
  torso(P, c, cl);
  const patada = c.A['legN.upper'] > 55;
  const fa = cl === 0 ? { len: .5, narrow: .8, mat: 'leather' } : cl === 1 ? { len: st > 1 ? 1.3 : .95, flare: 1.4, mat: 'cloth', moon: true, hem: 'trim' } : { len: 1.8, flare: 2.2, mat: 'cloth2', hem: 'trim' };
  if (patada) { falda(P, c, true, fa); pierna(P, c, 'N', 'near', cl); } else { pierna(P, c, 'N', 'near', cl); falda(P, c, true, fa); }
  cabeza(P, c, cl);
  pelo(P, c, cl);
  ojo(P, c, cl);
  if (cl === 2) astas(P, c);
  if (cl === 0) escudo(P, c, J.haF);
  const hand = brazo(P, c, 'N', 'near', cl), d = P.dir('armN.lower');
  if (cl === 1) farol(P, c, hand, d);
  else if (cl === 2) cayado(P, c, hand, d);
  else if (ctx.anim.startsWith('atk') && ctx.frame === 1) {                              // chispas de hierro en el impacto
    const r = ctx.rng, o = add(hand, d, 6 * s);
    for (let i = 0; i < 4; i++) { const a = r() * TAU, dd = 3 + r() * 4; P.emit({ px: [[o[0] + cos(a) * dd + 2, o[1] + sin(a) * dd]] }); }
  }
  if (st === 3) runas(P, c);
  if (cl === 0) P.anchor('muzzle', add(hand, d, 6 * s));
  P.anchor('haN', hand);
  P.anchor('head', J.head);
}

// ---------------------------------------------------------------------------------------------
// 6. Efectos vivos. Contrato real de render/scene.js: c = { x, y (pies), w, h, t (ms), lite, face, alpha, idx, variant }.
const px = (g, x, y, col, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.globalAlpha = 1; };
const cruz = (g, x, y, col, a) => { px(g, x, y, col, a); px(g, x - 1, y, col, a * .6); px(g, x + 1, y, col, a * .6); px(g, x, y - 1, col, a * .6); px(g, x, y + 1, col, a * .6); };
const escala = c => Math.max(.8, Math.min(1.3, (c.h || 64) / 64));

// Silueta de lobo (cabeza de perfil con hocico a la derecha), generada una vez como tramos de píxeles
let LOBO = null;
function lobo() {
  if (LOBO) return LOBO;
  const runs = [], tri = (px0, py0, ax, ay, bx, by, cx, cy) => { const d = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay), a = ((bx - px0) * (cy - py0) - (cx - px0) * (by - py0)) / d, b = ((cx - px0) * (ay - py0) - (ax - px0) * (cy - py0)) / d; return a >= 0 && b >= 0 && a + b <= 1 ? true : false; };
  void tri;
  const inTri = (x, y, p) => { const s1 = (p[2] - p[0]) * (y - p[1]) - (p[3] - p[1]) * (x - p[0]), s2 = (p[4] - p[2]) * (y - p[3]) - (p[5] - p[3]) * (x - p[2]), s3 = (p[0] - p[4]) * (y - p[5]) - (p[1] - p[5]) * (x - p[4]); return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0); };
  const T = [[6, 8, 7, 0, 12, 7], [13, 7, 17, 0, 19, 9], [14, 9, 29, 12, 14, 18], [2, 12, 12, 18, 6, 26], [8, 16, 17, 21, 12, 29]];
  for (let y = 0; y < 30; y++) {
    let x0 = -1;
    for (let x = 0; x <= 30; x++) {
      const e = ((x - 12) / 8.5) ** 2 + ((y - 13) / 8) ** 2 <= 1 || T.some(t => inTri(x + .5, y + .5, t));
      if (e && x0 < 0) x0 = x;
      if (!e && x0 >= 0) { runs.push([y, x0, x - 1]); x0 = -1; }
    }
  }
  return (LOBO = runs);
}
function dibujaLobo(g, cell, col, a) {
  g.globalAlpha = a; g.fillStyle = col;
  for (const [y, x0, x1] of lobo()) g.fillRect(x0 * cell, y * cell, (x1 - x0 + 1) * cell, cell);
  g.globalAlpha = 1;
}
function discoLuna(g, r, col, ring, a) {                                                // disco de píxeles sin antialiasing
  g.fillStyle = col; g.globalAlpha = a;
  for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + .25)); g.fillRect(-w, y, w * 2 + 1, 1); }
  g.fillStyle = ring; g.globalAlpha = a * 1.4 > 1 ? 1 : a * 1.4;
  for (let y = -r; y <= r; y += r * 2) g.fillRect(-4, y, 9, 1);
  g.fillRect(-r, -1, 1, 3); g.fillRect(r, -1, 1, 3);
  g.globalAlpha = 1;
}
const fx = {
  back(g, c, stage) {
    if (stage < 2) return;
    const t = c.t / 1000, s = escala(c), v = c.variant ? 1 : 0, pal = AZUL[v];
    g.save(); g.translate(c.x, c.y);
    if (stage === 3) {                                                                  // luna enorme detrás (más pálida si el equipo no es el protagonista)
      g.save(); g.translate(-c.face * 3 * s, -52 * s);
      const r = Math.round((c.lite ? 17 : 22) * s), p = .22 + (c.lite ? 0 : .06 * sin(t * Math.PI));
      discoLuna(g, r, pal[1], pal[0], p);
      if (!c.lite) { g.fillStyle = pal[2]; g.globalAlpha = .18; g.fillRect(-7 * s | 0, -6 * s | 0, 4, 3); g.fillRect(5 * s | 0, 4 * s | 0, 3, 2); g.fillRect(-2, 9 * s | 0, 3, 3); g.globalAlpha = 1; }
      g.restore();
    }
    // bestia espectral: cabeza de lobo que respira, detrás del héroe y mirando como él
    g.save(); g.scale(c.face, 1);
    const cell = Math.max(2, Math.round((stage === 3 ? 2.6 : 2) * s * (c.lite ? .8 : 1))), aw = (stage === 3 ? .26 : .15) + .04 * sin(t * Math.PI);
    g.translate(-8 * s - 15 * cell | 0, -(18 + (stage === 3 ? 18 : 10)) * s - 15 * cell | 0);
    dibujaLobo(g, cell, pal[2], aw);
    g.fillStyle = pal[0]; g.globalAlpha = aw * 3 > 1 ? 1 : aw * 3; g.fillRect(19 * cell, 10 * cell, cell, cell);   // ojo de la bestia
    g.globalAlpha = 1; g.restore();
    const n = c.lite ? 2 : stage === 2 ? 4 : 7;                                         // motas de luz lunar
    for (let i = 0; i < n; i++) { const k = (t * .3 + i / n) % 1; px(g, Math.sin(i * 7.1 + k * 2.5) * 15 * s, -4 * s - k * 60 * s, pal[i % 3], Math.sin(k * Math.PI) * .85); }
    g.restore();
  },
  front(g, c, stage) {
    if (stage < 2 || c.lite) return;
    const t = c.t / 1000, s = escala(c), pal = AZUL[c.variant ? 1 : 0];
    g.save(); g.translate(c.x, c.y);
    const f = t * (stage === 2 ? .7 : 1), k = Math.floor(f), ph = f - k;               // un destello en cruz cada ~1 s (≤ 2 Hz)
    if (ph < .4) cruz(g, ((k * 29 + (c.idx || 0) * 13) % 19 - 9) * s * c.face, -(14 + (k * 11) % 36) * s, pal[0], 1 - ph / .4);
    if (stage === 3) for (let i = 0; i < 4; i++) {                                      // pelo de luz que cae
      const kk = (t * .28 + i / 4) % 1;
      px(g, Math.sin(i * 4.3 + kk * 4) * 16 * s - c.face * 7 * s, -58 * s + kk * 50 * s, pal[1], .8 - kk * .6);
    }
    g.restore();
  },
};

// Remate de la transformación: aullido (anillos de luna que suben) y columna azul (sin destello de pantalla)
function transformFx(g, c, k) {
  const s = escala(c), pal = AZUL[c.variant ? 1 : 0];
  g.save(); g.translate(c.x, c.y);
  if (k < .7) {
    const h = Math.min(1, k / .35) * 120;
    for (let y = 0; y < h; y += 2) { const x = Math.sin(y * .4 + k * 9); px(g, x - 5 * s, -y, pal[2], .7); px(g, x + 5 * s, -y, pal[2], .7); if (y % 6 === 0) px(g, x, -y, pal[0]); }
    for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, r = 8 + 26 * k; px(g, cos(a) * r, sin(a) * r * .3, pal[1], 1 - k); }
  } else {
    for (let j = 0; j < 3; j++) {
      const q = ((k - .7) * 2 + j * .3) % 1, r = (6 + q * 22) * s, y = -(50 + q * 26) * s;
      for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; px(g, cos(a) * r, y + sin(a) * r * .35, pal[j % 2 ? 1 : 0], 1 - q); }
    }
  }
  g.restore();
}

// ---------------------------------------------------------------------------------------------
const poseDe = i => (anim, k) => (POSE[i](anim, k) || null);
const CUERPO = [{ body: 'fiera', height: 62, shoulder: 1.25, hip: 1.1, arm: 1.05, headScale: 1.28 }, { body: 'fiera', height: 56, shoulder: .95, leg: 1.06, headScale: 1.18 }, { body: 'fiera', height: 58, shoulder: 1.0, leg: 1.1, headScale: 1.16 }];
const ANCLAS = ['haN', 'haF', 'head', 'chest', 'muzzle'];
export default {
  id: 'bestiales',
  kit: 1,
  ready: true,
  materials: ['fur', 'fur2', 'skin', 'cloth', 'cloth2', 'trim', 'leather', 'metal', 'gem', 'hueso', 'iris'],
  ramps(variant, stage) {
    const v = variant ? 1 : 0, st = stage || 1, pick = k => RAMPAS[k][Math.min(v, RAMPAS[k].length - 1)];
    const fur = pick('fur').slice(), fur2 = pick('fur2').slice();
    if (st >= 2) { fur[0] = v ? '#1c2a48' : '#1c1c34'; fur[1] = v ? '#3c5478' : '#3e3a52'; }                  // sombras con aire de noche
    if (st === 3) { fur[3] = v ? '#e4f0ff' : '#c8bca8'; fur[4] = v ? '#ffffff' : '#ece4d6'; fur2[4] = '#ffffff'; }
    return {
      fur: ramp5(fur), fur2: ramp5(fur2), skin: ramp5(pick('skin')), cloth: ramp5(pick('cloth')), cloth2: ramp5(pick('cloth2')), trim: ramp5(pick('trim')),
      leather: ramp5(pick('leather')), metal: ramp5(pick('metal')), gem: ramp5(pick('gem')), hueso: ramp5(pick('hueso')),
      iris: ramp5(st >= 2 ? (v ? ['#0a3a34', '#5ad8c0', '#c8fff4', '#ffffff', '#ffffff'] : ['#10204a', '#5a9aff', '#c4e0ff', '#ffffff', '#ffffff']) : IRIS[v]),
    };
  },
  emit: variant => EMIT[variant ? 1 : 0],
  geomStage: s => s,
  extraAnims: {},
  extraPoses: {},
  classes: [
    { id: 'oso', name: 'Oso guardián', build: CUERPO[0], look: { hair: 'calvo' }, anchors: ANCLAS, pose: poseDe(0), draw: (P, ctx) => dibujar(P, ctx, 0) },
    { id: 'zorra', name: 'Zorra ilusionista', build: CUERPO[1], look: { hair: 'largo' }, anchors: ANCLAS, pose: poseDe(1), draw: (P, ctx) => dibujar(P, ctx, 1) },
    { id: 'ciervo', name: 'Ciervo-sanador', build: CUERPO[2], look: { hair: 'corto' }, anchors: ANCLAS, pose: poseDe(2), draw: (P, ctx) => dibujar(P, ctx, 2) },
  ],
  stageScale: [1, 1.04, 1.1],
  fx,
  transformFx,
};
