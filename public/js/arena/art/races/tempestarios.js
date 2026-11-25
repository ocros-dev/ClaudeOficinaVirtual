// Raza «tempestarios» (9.ª raza, la de `claude`): arte 16 bits de REFERENCIA de estilo (paquete ESTILO).
// Clase 0 «Relámpago» (vanguardia) completa; las clases 1 y 2 reutilizan el mismo cuerpo con otra silueta.
// Guía: docs/arena-estilo-16bits.md. Solo se importa de '../kit16/*'. Sin Math.random (usa ctx.rng).
//
// Cómo se lee este archivo (para copiarlo en otras razas):
//   1. paleta y rampas ........ RAMPAS, ramps(variante, etapa)
//   2. poses propias .......... POSE (sobrescriben la pose compartida del kit)
//   3. datos por fotograma .... info(P, ctx): ejes, viento, escala; todo el dibujo parte de ahí
//   4. piezas ................. pierna, faldon, torso, cabeza, pelo, brazo, marcas (orden de dibujo en dibujar())
//   5. efectos vivos .......... fx.back / fx.front / transformFx (se pintan en pantalla, no se hornean)
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------------------------------------------------------------------------------------------
// 1. Paleta (spec 3.2). Rampas de 5 tonos: [sombra profunda, sombra, base, luz, brillo].
const RAMPAS = {
  skin:   [['#5a3a2e', '#86573f', '#b3805a', '#d4a37a', '#ecc8a0'], ['#8a6a58', '#b89078', '#e8c8b0', '#f4dcc8', '#fff0e0']],
  cloth:  [['#0c1426', '#16223e', '#22345c', '#34508a', '#5a7ac0'], ['#0c1e1a', '#16302a', '#22483c', '#346a58', '#5a9a84']],
  cloth2: [['#04070e', '#080e1c', '#0e1830', '#182a4c', '#2a4272'], ['#050d09', '#08140f', '#0e2019', '#183428', '#2a5444']],
  trim:   [['#3a4256', '#6a7488', '#98a2b8', '#c8d0e0', '#eef2fa']],
  leather: [['#1e140f', '#3a2a20', '#5a4030', '#7a5a40', '#a07c58']],
  hair1:  [['#1c2230', '#2e3a50', '#46566f', '#6a7c96', '#9aaac2']],
  hair2:  [['#8a90b0', '#bcc2dc', '#e4e8f6', '#f8faff', '#ffffff']],
  spark:  [['#5a24c8', '#8a4aff', '#b890ff', '#d8c4ff', '#ffffff'], ['#3a4aff', '#6a7aff', '#a8b4ff', '#d4dcff', '#ffffff']],
};
const IRIS = ['#8ab0d8', '#a070ff', '#b890ff', '#efe6ff'];   // por etapa (spec 3.2)
const EMIT = ['#d8c4ff', '#a8b4ff'];

// ---------------------------------------------------------------------------------------------
// 2. Poses propias (se fusionan sobre la pose del kit). Ángulos de extremidades: 0 = colgando, 90 = al frente, 180 = arriba.
// pl = pies apoyados (IK), cr = flexión de piernas, lean/sp/nk = tronco, pecho y cuello, dy = bajar la pelvis.
const G = (o) => ({ pl: 'NF', ...o });
const POSE = {
  // Guardia de boxeador con cambio de peso: el cuerpo sube y baja, el puño cercano oscila.
  idle: k => [
    G({ cr: .17, lean: 9, sp: 3, nk: 2, hipN: 26, knN: 30, hipF: -22, knF: 30, shN: 50, elN: 78, shF: 18, elF: 112 }),
    G({ cr: .185, lean: 10, sp: 4, nk: 1, hipN: 27, knN: 32, hipF: -22, knF: 32, shN: 54, elN: 80, shF: 20, elF: 116 }),
    G({ cr: .17, lean: 9, sp: 3, nk: 2, hipN: 25, knN: 29, hipF: -23, knF: 31, shN: 52, elN: 76, shF: 16, elF: 110 }),
    G({ cr: .155, lean: 8, sp: 2, nk: 3, hipN: 24, knN: 28, hipF: -21, knF: 29, shN: 48, elN: 76, shF: 20, elF: 108 }),
  ][k],
  walk: k => {
    const p = k / 6 * TAU, h = 26 * sin(p), a = -sin(p), up = Math.max(0, cos(p * 2));
    return { lean: 8, sp: 2, nk: 1, hipN: h, hipF: -h, knN: 8 + 48 * Math.max(0, cos(p)), knF: 8 + 48 * Math.max(0, -cos(p)), dy: -up * .8,
      shN: 10 + 26 * a, elN: 16 + 24 * Math.max(0, a), shF: 10 - 26 * a, elF: 16 + 24 * Math.max(0, -a) };
  },
  run: k => {
    const p = k / 4 * TAU, h = 54 * sin(p), a = -sin(p);
    return { lean: 24, sp: 4, nk: -6, hipN: h, hipF: -h, knN: 30 + 84 * Math.max(0, cos(p - .4)), knF: 30 + 84 * Math.max(0, -cos(p - .4)), dy: -Math.abs(cos(p)) * 1.2,
      shN: 24 + 58 * a, elN: 74 + 10 * a, shF: 24 - 58 * a, elF: 74 - 10 * a };
  },
  // Tres golpes: gancho recto (puño cercano), cruzado (puño lejano) y directo con los dos puños.
  atk1: k => [
    G({ cr: .17, lean: -6, sp: -5, nk: 0, hipN: 30, knN: 26, hipF: -28, knF: 24, shN: -10, elN: 120, shF: 52, elF: 100 }),
    G({ cr: .22, lean: 22, sp: 7, nk: 3, hipN: 46, knN: 44, hipF: -36, knF: 6, shN: 92, elN: 2, shF: 18, elF: 118 }),
    G({ cr: .17, lean: 13, sp: 3, nk: 1, hipN: 34, knN: 32, hipF: -30, knF: 14, shN: 76, elN: 26, shF: 28, elF: 108 }),
  ][k],
  atk2: k => [
    G({ cr: .18, lean: -10, sp: -7, nk: -2, hipN: 28, knN: 28, hipF: -32, knF: 22, shN: 36, elN: 110, shF: -30, elF: 90 }),
    G({ cr: .21, lean: 18, sp: 9, nk: 3, hipN: 40, knN: 40, hipF: -34, knF: 10, shN: 30, elN: 112, shF: 94, elF: 3 }),
    G({ cr: .17, lean: 10, sp: 4, nk: 1, hipN: 32, knN: 30, hipF: -28, knF: 18, shN: 40, elN: 104, shF: 74, elF: 22 }),
  ][k],
  atk3: k => [
    G({ cr: .12, lean: -14, sp: -10, nk: -5, hipN: 18, knN: 12, hipF: -22, knF: 12, shN: 168, elN: 18, shF: 150, elF: 30 }),
    G({ cr: .24, lean: 28, sp: 9, nk: 7, hipN: 50, knN: 54, hipF: -40, knF: 4, shN: 96, elN: 3, shF: 90, elF: 8 }),
    G({ cr: .17, lean: 15, sp: 4, nk: 3, hipN: 36, knN: 32, hipF: -30, knF: 12, shN: 62, elN: 40, shF: 56, elF: 44 }),
  ][k],
  charge: k => [
    G({ cr: .2, lean: 6, sp: 2, nk: 4, hipN: 30, knN: 30, hipF: -26, knF: 28, shN: 10, elN: 70, shF: 4, elF: 74 }),
    G({ cr: .225, lean: 4, sp: -3, nk: -2, hipN: 32, knN: 34, hipF: -28, knF: 30, shN: 70, elN: 28, shF: 62, elF: 34 }),
    G({ cr: .24, lean: 8, sp: 4, nk: 1, hipN: 34, knN: 38, hipF: -30, knF: 34, shN: 96, elN: 76, shF: 86, elF: 86 }),
  ][k],
  hit: k => [
    G({ cr: .14, lean: -26, sp: -12, nk: -14, hipN: 12, knN: 12, hipF: -34, knF: 22, shN: -44, elN: 48, shF: 30, elF: 60 }),
    G({ cr: .16, lean: -15, sp: -6, nk: -5, hipN: 16, knN: 20, hipF: -30, knF: 24, shN: -12, elN: 44, shF: 14, elF: 56 }),
  ][k],
  block: () => G({ cr: .19, lean: 12, sp: 5, nk: 6, hipN: 28, knN: 30, hipF: -22, knF: 28, shN: 88, elN: 118, shF: 76, elF: 124 }),
  victory: k => [
    G({ cr: .1, lean: -3, sp: -4, nk: -4, hipN: 16, knN: 12, hipF: -14, knF: 14, shN: 168, elN: 14, shF: 28, elF: 64 }),
    { z: .05, lean: -5, sp: -5, nk: -6, hipN: 12, knN: 36, hipF: -16, knF: 40, shN: 156, elN: 12, shF: 150, elF: 16 },
    G({ cr: .12, lean: -3, sp: -4, nk: -5, hipN: 18, knN: 14, hipF: -14, knF: 14, shN: 174, elN: 6, shF: 24, elF: 70 }),
  ][k],
};
// Patada voladora (animación propia de la raza, 3 fotogramas): armado, extensión con la pierna cercana y recogida.
const KICK = [
  G({ cr: .17, lean: -8, sp: -5, nk: 0, hipN: 22, knN: 58, hipF: -14, knF: 14, shN: 36, elN: 104, shF: 54, elF: 104 }),
  { pl: 'F', cr: .14, lean: -26, sp: -8, nk: 3, hipN: 94, knN: 3, hipF: -8, knF: 10, shN: -34, elN: 66, shF: 78, elF: 88 },
  G({ cr: .17, lean: 3, sp: 2, nk: 1, hipN: 34, knN: 40, hipF: -16, knF: 16, shN: 40, elN: 96, shF: 38, elF: 104 }),
];

// ---------------------------------------------------------------------------------------------
// 3. Datos del fotograma. Todo el dibujo parte de aquí: ejes del tronco y de la cabeza, viento y escala.
// «Viento»: cuánto se echan hacia atrás el pelo y la ropa (carrera, golpes) o hacia delante (golpeado).
const VIENTO = { run: 1, walk: .3, atk1: .55, atk2: .6, atk3: .7, kick: .8, charge: -.15, hit: -.9, launched: .5, victory: .1, transform: -.3 };

function info(P, ctx) {
  const { J, L, A } = P, s = L.H / 60, st = ctx.stage, ph = ctx.phase * TAU;
  const aT = A.torsoLean * D, up = [sin(aT), -cos(aT)], fwd = [cos(aT), sin(aT)];
  const ah = A.headAng * D, hu = [sin(ah), -cos(ah)], hf = [cos(ah), sin(ah)];
  const R = L.head * .40;                                           // radio base de la cabeza (≈ 5,3 px a 60)
  const tumbled = Math.abs(ctx.pose.rot || 0) > 25;
  // Etapa 4: el pelo flota quieto y ordenado; etapas 2-3 ondean más y más.
  const wind = ((VIENTO[ctx.anim] ?? 0) + [0, .1, .3, .35][st - 1]) * (st === 4 ? .5 : 1);
  const gravity = tumbled ? [-up[0], -up[1]] : [0, 1];
  const tp = (f, v) => {                                            // punto del tronco: f 0..1 (pelvis→pecho), v hacia delante
    const base = f <= .45 ? mix(J.root, J.spine, f / .45) : mix(J.spine, J.chest, (f - .45) / .55);
    return add(base, fwd, v);
  };
  const hp = (x, y) => [J.head[0] + hf[0] * x * R - hu[0] * y * R, J.head[1] + hf[1] * x * R - hu[1] * y * R];
  return { cl: ctx.cls | 0, J, L, A, s, st, ph, aT, up, fwd, hu, hf, R, wind, gravity, tp, hp, tumbled, hw: L.hipW / 2, tw: L.torsoW / 2, ctx };
}

// ---------------------------------------------------------------------------------------------
// 4. Piezas
// Banda rígida de ancho w y grosor h, centrada en p y orientada según el eje d (cuffs, placas, bandas de plata).
function banda(P, p, d, w, h, mat, tone = 2, o = {}) {
  const n = [d[1], -d[0]], a = add(p, d, h / 2), b = add(p, d, -h / 2);
  return P.poly([add(a, n, w / 2), add(a, n, -w / 2), add(b, n, -w / 2), add(b, n, w / 2)], mat, { shade: 'flat', tone, ...o });
}

function bota(P, c, S) {
  const { J, L } = P, s = c.s;
  const top = mix(J['ft' + S], J['kn' + S], .5), d = P.dir('leg' + S + '.lower');
  P.cap(top, J['ft' + S], L.shinW * 1.2, L.shinW * .95, 'leather');
  banda(P, top, d, L.shinW * 1.3, 1.3 * s, 'trim', 2);                                                   // puño de plata
  P.cap(J['heel' + S], J['toe' + S], L.ankle * 1.75, L.ankle * 1.2, 'leather');
  P.blob(add(J['toe' + S], [-.4 * s, -.2 * s]), 1.5 * s, 1.5 * s, 'leather', { shade: 'sphere' });         // puntera
}

function pierna(P, c, S, layer) {
  const { L } = P;
  P.layer(layer);
  P.limb('leg' + S + '.upper', 'cloth2', L.thighW * 1.1, L.thighW * .9);
  P.limb('leg' + S + '.lower', 'cloth2', L.shinW * 1.15, L.shinW * .92);
  const kn = P.j('kn' + S), d = P.dir('leg' + S + '.upper'), n = [d[1], -d[0]];
  P.fold([add(kn, d, -1.5), add(kn, n, -2.2 * c.s)], 'cloth2');                                           // pliegues de la rodilla
  P.fold([add(kn, d, -4 * c.s), add(add(kn, d, -2.5 * c.s), n, 2.4 * c.s)], 'cloth2');
  bota(P, c, S);
}

// Faldón largo de la túnica. Cae por gravedad y se echa hacia atrás con el viento.
function faldon(P, c, near) {
  const { L } = P, { tp, hw, s, wind, gravity, ph } = c, g = gravity;
  const cl = c.cl, back = [-1, 0], len = L.thigh * (near ? .92 : 1.12) * [1, 1.55, 2.05][cl];
  const sway = (wind * 7 + sin(ph + (near ? 0 : 1.3)) * (1.1 + c.st * .35)) * s * (cl === 2 ? .8 : 1);
  const nar = cl === 1 ? .55 : 1, fl = cl === 2 ? 2.6 * s : 0;                                  // abrigo abierto por delante (1) o túnica acampanada hasta el suelo (2)
  const a = tp(.2, -hw * (near ? 1.05 : .9)), b = tp(.2, hw * (near ? 1.15 : .3) * nar);
  const bBot = add(add(add(b, g, len * (near ? .82 : .9)), back, sway * .55), [1, 0], near ? fl : 0);
  const aBot = add(add(a, g, len * 1.04), back, sway * 1.25 + (near ? 0 : 2 * s) + fl);
  const mid = add(mix(aBot, bBot, .5), g, cl === 1 ? -3.5 * s : 1.2 * s);
  P.smooth([a, mix(a, b, .5), b, bBot, mid, aBot], 'cloth', { n: 3, line: near });
  if (near) {
    P.fold([mix(a, b, .35), add(mix(aBot, bBot, .35), g, -2 * s)], 'cloth');
    P.fold([mix(a, b, .72), add(mix(aBot, bBot, .72), g, -3.5 * s)], 'cloth');
    P.line([add(bBot, g, -.5), add(mid, g, -.5), add(aBot, g, -.5)], 'trim', 2, { on: 'cloth' });         // ribete plateado del bajo
    if (cl === 1) P.line([add(mix(a, b, .5), g, 2 * s), add(mid, g, -2 * s)], 'spark', 2, { on: 'cloth' });                // vivo violeta de la abertura del abrigo
    if (cl === 2) P.line([add(mix(a, b, .5), g, len * .5), add(mix(aBot, bBot, .5), g, -4 * s)], 'trim', 1, { on: 'cloth' });
  }
}

function torso(P, c) {
  const { tp, tw, hw, s, fwd } = c;
  P.layer('body');
  const sh = [tp(-.02, -hw * .98), tp(.2, -tw * .86), tp(.5, -tw * .8), tp(.78, -tw * 1.0), tp(1.0, -tw * .9), tp(1.13, -tw * .38),
    tp(1.13, tw * .42), tp(1.0, tw * 1.08), tp(.74, tw * 1.16), tp(.46, tw * .78), tp(.2, hw * .95), tp(-.02, hw * 1.02)];
  P.smooth(sh, 'cloth', { n: 3 });
  P.poly([tp(1.0, -tw * .5), tp(1.2, -tw * .35), tp(1.2, tw * .3), tp(1.0, tw * .62)], 'cloth', { shade: 'vol', line: true });   // cuello alto
  // solapa cruzada plateada, del cuello a la cadera trasera
  P.strip([tp(1.12, tw * .42), tp(.82, tw * .05), tp(.5, -tw * .4), tp(.2, -tw * .75)], 1.6 * s, 1.4 * s, 'trim', { shade: 'cyl', line: true });
  // pliegues de la tela del pecho y de la espalda
  P.fold([tp(.88, tw * .8), tp(.62, tw * .55)], 'cloth');
  P.fold([tp(.58, -tw * .66), tp(.4, -tw * .5)], 'cloth');
  P.fold([tp(.97, -tw * .72), tp(.74, -tw * .48)], 'cloth');
  if (c.cl === 1) {                                                            // bandolera de condensadores: cuero con tres cápsulas que brillan
    P.strip([tp(1.08, -tw * .7), tp(.76, -tw * .1), tp(.42, tw * .74)], 2.4 * s, 2.2 * s, 'leather', { shade: 'cyl', line: true });
    for (let i = 0; i < 3; i++) { const q = tp(.95 - i * .22, -tw * (.45 - i * .3)); P.blob(q, 1.5 * s, 1.5 * s, 'spark', { shade: 'sphere', line: true }); if (c.st >= 2 || i === 1) P.emit({ px: [add(q, [-.4, -.4])] }); }
  } else if (c.cl === 2) {                                                     // esclavina plateada con varillas colgantes y cuello alto
    P.smooth([tp(1.16, -tw * .6), tp(1.16, tw * .5), tp(.94, tw * 1.26), tp(.66, tw * .96), tp(.72, -tw * 1.2)], 'trim', { n: 3, line: true, dt: -1 });
    P.fold([tp(1.0, tw * .5), tp(.74, tw * .8)], 'trim'); P.fold([tp(1.0, -tw * .5), tp(.76, -tw * .8)], 'trim');
    P.line([tp(.7, tw * .94), tp(.66, tw * .96)], 'trim', 4, {});
    for (let i = 0; i < 3; i++) { const q = tp(.72 - i * .02, tw * (.8 - i * .6)); P.line([q, add(q, c.gravity, 4.5 * s)], 'trim', 4 - (i % 2), {}); }
  }
  // faja de cuero con nudo en el lado cercano y dos colas que oscilan
  const w0 = tp(.33, 0);
  P.poly([tp(.4, -tw * .82), tp(.4, tw * .8), tp(.22, hw * .98), tp(.22, -hw * .96)], 'leather', { shade: 'vol', line: true });
  const knot = add(w0, fwd, tw * .38), sw = sin(c.ph + 1) * 1.6 + c.wind * 3;
  P.blob(knot, 2.1 * s, 2.2 * s, 'leather', { shade: 'sphere', line: true });
  P.strip([knot, add(add(knot, c.gravity, 4.5 * s), [-1, 0], sw * .5), add(add(knot, c.gravity, 8.5 * s), [-1, 0], sw * 1.1)], 2.2 * s, 1.1 * s, 'leather', { smooth: true, line: true });
  P.strip([knot, add(add(knot, c.gravity, 2.5 * s), [-1, 0], 3 + sw), add(add(knot, c.gravity, 6 * s), [-1, 0], 6 + sw * 1.6)], 2 * s, 1 * s, 'leather', { smooth: true, line: true });
}

// Cicatriz ramificada de rayo (figura de Lichtenberg): tenue en la etapa 1, luminosa a partir de la 2.
function marca(P, c, pts, ramas) {
  const st = c.st;
  if (st === 1) { P.line(pts, 'skin', 1, { on: 'skin' }); for (const r of ramas) P.line(r, 'skin', 1, { on: 'skin' }); return; }
  const tone = st === 2 ? 2 : 3;
  P.line(pts, 'spark', tone, { on: 'skin' });
  for (const r of ramas) P.line(r, 'spark', tone - 1, { on: 'skin' });
  if (st >= 3) P.emit({ px: [pts[Math.floor(pts.length / 2)]] });
}

function brazo(P, c, S, layer, clase) {
  const { J, L } = P, s = c.s, near = S === 'N';
  P.layer(layer);
  const sh = J['sh' + S], el = J['el' + S], ha = J['ha' + S], dU = P.dir('arm' + S + '.upper'), dL = P.dir('arm' + S + '.lower'), nL = [dL[1], -dL[0]];
  P.blob(sh, L.upperW * 1.0, L.upperW * 1.0, 'cloth', { shade: 'sphere' });                                // hombro marcado
  P.limb('arm' + S + '.upper', 'cloth', L.upperW * 1.7, L.upperW * 1.5);                                  // manga ancha
  banda(P, add(el, dU, -1 * s), dU, L.upperW * 1.55, 1.5 * s, 'trim', 2);                                  // vuelta de la manga
  P.fold([add(sh, dU, 3 * s), add(el, dU, -4 * s)], 'cloth');
  P.fold([add(el, dU, -5.5 * s), add(add(el, dU, -3.6 * s), [dU[1], -dU[0]], 2 * s)], 'cloth');
  P.limb('arm' + S + '.lower', 'skin', L.lowerW * 1.15, L.lowerW * .95);
  // marca de rayo en el antebrazo desnudo (entre el codo y el brazalete)
  const m0 = mix(el, ha, .08);
  marca(P, c, [m0, add(m0, dL, 1.8 * s), add(m0, dL, 3.4 * s)], [[add(m0, dL, 1.4 * s), add(add(m0, dL, 2.2 * s), nL, 1.4)], [add(m0, dL, 2.6 * s), add(add(m0, dL, 3.4 * s), nL, -1.4)]]);
  // brazalete pararrayos: banda plateada con una varilla corta hacia el codo
  const bc = mix(el, ha, .72);
  banda(P, bc, dL, L.lowerW * 1.5, 3.6 * s, 'trim', 2, { line: true });
  banda(P, add(bc, dL, 1.2 * s), dL, L.lowerW * 1.5, 1.1 * s, 'trim', 4);
  P.line([add(bc, dL, -2 * s), add(bc, dL, -5 * s)], 'trim', 3, {});
  if (c.st >= 2) P.emit({ px: [add(bc, nL, L.lowerW * .4)] });
  // puño: guante de cuero con placa de nudillos plateada
  let hand = add(ha, dL, 1.1 * s);
  if (clase === 1 && near) {                                                // guantelete-bobina: manguito de plata con tres anillos y cañón emisor
    P.cap(mix(el, ha, .32), add(ha, dL, 2 * s), L.lowerW * 2.0, L.lowerW * 2.5, 'trim', { shade: 'cyl', line: true });
    for (let i = 0; i < 3; i++) { const q = mix(el, ha, .42 + i * .17); banda(P, q, dL, L.lowerW * 2.6, 1 * s, 'leather', 1); if (c.st >= 2) P.emit({ px: [add(q, nL, L.lowerW * 1.1)] }); }
    P.blob(add(ha, dL, 1 * s), 2.8 * s, 2.7 * s, 'leather', { shade: 'sphere', line: true });
    P.cap(add(ha, dL, 2 * s), add(ha, dL, 8 * s), 3.2 * s, 2.2 * s, 'trim', { shade: 'cyl', line: true });
    banda(P, add(ha, dL, 8 * s), dL, 3.8 * s, 1.3 * s, 'leather', 1, { line: true });
    hand = add(ha, dL, 9 * s);
    return hand;
  }
  if (clase === 2) {                                                        // manga de campana con puño de plata
    P.cap(el, mix(el, ha, .6), L.lowerW * 1.6, L.lowerW * 2.5, 'cloth', { shade: 'cyl', line: near });
    banda(P, mix(el, ha, .62), dL, L.lowerW * 2.6, 1.4 * s, 'trim', 2, { line: near });
  }
  P.blob(hand, 2.8 * s, 2.7 * s, 'leather', { shade: 'sphere', line: true });
  if (clase === 0 || !near) banda(P, add(hand, dL, 2 * s), dL, 4.4 * s, 1.5 * s, 'trim', 3, { line: true });
  return hand;
}

// Cabeza de perfil mirando a la derecha. Cráneo + rostro con tonos fijos (la cara no se sombrea por volumen).
function cabeza(P, c) {
  const { hp, R, J, s } = c;
  P.layer('body');
  P.cap(J.chest, J.head, c.L.head * .27, c.L.head * .25, 'skin', { dt: -1 });                              // cuello, en sombra bajo la mandíbula
  const n0 = c.tp(1.02, c.tw * .28);                                                                       // la cicatriz nace en el hombro y sube por el cuello
  P.blob(J.head, R * 1.0, R * 1.1, 'skin', { shade: 'flat', tone: 2 });                                    // cráneo (lo tapa el pelo casi entero)
  const cara = [hp(.1, -.6), hp(.98, -.46), hp(1.04, -.12), hp(1.3, .24), hp(1.02, .38), hp(1.05, .6), hp(.88, .98), hp(.25, 1.02), hp(-.1, .6)];
  P.smooth(cara, 'skin', { n: 3, shade: 'flat', tone: 3 });                                                // rostro
  P.smooth([hp(.0, .5), hp(.8, .66), hp(.9, .98), hp(.25, 1.02), hp(-.12, .6)], 'skin', { n: 3, shade: 'flat', tone: 2, on: 'skin' });      // sombra de la mandíbula
  P.blob(hp(.62, .16), R * .34, R * .26, 'skin', { shade: 'flat', tone: 4 });                              // luz del pómulo
  P.line([hp(.18, -.5), hp(.4, -.5)], 'skin', 1, { on: 'skin' });                                          // sombra bajo el pelo, sobre la sien
  marca(P, c, [n0, add(n0, c.up, 2 * s), add(n0, c.up, 4 * s)], [[add(n0, c.up, 2 * s), add(add(n0, c.up, 3 * s), c.fwd, 1.5)]]);
}

function ojo(P, c) {
  const { hp, st, ctx } = c;
  const e = hp(.58, -.04), lid = st === 4, golpe = ctx.anim === 'hit' || ctx.anim === 'launched';
  P.layer('top');
  P.eye([e[0] - .4, e[1] - .4], { iris: 'iris', size: lid ? 2 : 3 });
  // ceja marcada (oblicua hacia la nariz = mirada decidida); en la etapa 4 el párpado queda a medias
  P.line([hp(.26, golpe ? -.52 : -.38), hp(.6, -.3), hp(1.0, golpe ? -.3 : -.2)], 'skin', 0, { on: 'skin' });
  if (lid) P.line([hp(.42, -.12), hp(.74, -.1)], 'skin', 1, { on: 'skin' });
  P.line([hp(1.22, .27)], 'skin', 4, { on: 'skin' });                                                      // punta de la nariz
  P.line([hp(1.06, .4)], 'skin', 1, { on: 'skin' });                                                       // fosa
  const m = hp(.92, .66); P.line([m, [m[0] - 1.8, m[1] + (golpe ? .9 : 0)]], 'skin', 0, { on: 'skin' });    // boca
}

// Hebras: líneas de 1 px de luz (tono 4) o de sombra (tono 0) que parten las masas del pelo en mechones.
function hebra(P, c, root, { ang, len, curve = 0, sway = 0 }, mat, tone, off = [-1, -1]) {
  const pts = [], n = 6; let p = root.slice();
  for (let i = 0; i <= n; i++) {
    pts.push(add(p, off));
    if (i < n) { const k = (i + 1) / n, a = (ang + curve * k + sway * sin(c.ph + k * 2.4) * k) * D; p = [p[0] + sin(a) * len / n, p[1] + cos(a) * len / n]; }
  }
  P.line(pts, mat, tone, { on: mat });
}
function hebras(P, c, mat) {
  const { hp } = c;
  P.line([hp(-.55, -1.12), hp(-.1, -1.3), hp(.45, -1.22), hp(.8, -.98)], mat, 4, { on: mat });
  P.line([hp(-.8, -.8), hp(-.55, -.45), hp(-.5, -.1)], mat, 1, { on: mat });
  P.line([hp(-.15, -1.0), hp(.2, -.9), hp(.55, -.8)], mat, 1, { on: mat });
}

// Pelo: masas con luz y sombra propias. 1) masas traseras que cuelgan o flotan, 2) cúpula, 3) mechón lateral, 4) mechones sueltos.
function peloAtras(P, c) {
  const { hp, R, s, st, wind } = c;
  const mat = st === 1 ? 'hair1' : 'hair2', ang0 = -10 - wind * 42 - (st === 3 ? 18 : 0) - (st === 4 ? 28 : 0);
  const len = [11, 15, 21, 28][st - 1] * s, sway = [3, 8, 13, 2.5][st - 1];
  P.layer('body');
  P.smooth([hp(.1, -1.0), hp(-.9, -1.0), hp(-1.4, -.3), hp(-1.3, .5), hp(-.8, 1.0), hp(-.2, .7), hp(.05, .1)], mat, { n: 3, line: true });      // masa sobre la nuca
  // tres masas largas superpuestas: la de abajo, más corta y oscura (dt -1), da profundidad
  P.lock(hp(-.75, .1), { n: 4, ang: ang0 - 10, len: len * .8, w: R * 1.05, w1: 1.4, curve: 16, sway: sway * .8 }, mat, { dt: -1, line: true });
  P.lock(hp(-1.0, -.45), { n: 4, ang: ang0 - 4, len: len * 1.0, w: R * 1.3, w1: 1.2, curve: 20, sway }, mat, { line: true });
  P.lock(hp(-.6, .42), { n: 4, ang: ang0 - 16, len: len * .66, w: R * .9, w1: 1.2, curve: 14, sway: sway * 1.1 }, mat, { dt: -1, line: true });
  if (c.cl === 1) {                                        // Fulminador: coleta alta recogida con anillo de plata
    const r = hp(-.95, -1.05);
    P.lock(r, { n: 4, ang: ang0 - 26, len: len * 1.05, w: R * .95, w1: 1.1, curve: 28, sway }, mat, { line: true });
    hebra(P, c, add(r, [0, -1]), { n: 4, ang: ang0 - 26, len: len, curve: 28, sway }, mat, 4);
    banda(P, add(r, [-.5, .2]), [-.7, .7], R * .9, 1.6 * s, 'trim', 3, { line: true });
  }
  hebra(P, c, hp(-1.05, -.4), { n: 4, ang: ang0 - 4, len: len * .95, curve: 20, sway }, mat, 4);                  // luz en la masa grande
  hebra(P, c, hp(-.8, -.2), { n: 4, ang: ang0 - 6, len: len * .8, curve: 18, sway }, mat, 0, [1, 1]);           // grieta de sombra entre masas
  hebra(P, c, hp(-.7, .15), { n: 4, ang: ang0 - 10, len: len * .7, curve: 16, sway: sway * .8 }, mat, 3);
  if (st >= 2) {                                           // mechones de color: 3 en la etapa 2, 5 de la 3 en adelante
    const n = st === 2 ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const root = hp(-.85 - i * .06, -.7 + i * (st === 2 ? .45 : .27)), a = ang0 - 4 - i * 5 + (st === 3 ? (i % 2 ? 14 : -4) : 0);
      if (st === 3) {                                      // etapa 3: mechones angulosos (rayos), con puntas en zigzag
        const l = (9 + (i % 3) * 3) * s, z = i % 2 ? 1 : -1, d = a * D, bx = Math.sin(d), by = Math.cos(d);
        const p1 = add(root, [bx, by], l * .55), p2 = add(add(p1, [-by, bx], 2.4 * s * z), [bx, by], l * .15), p3 = add(p2, [bx, by], l * .5);
        P.strip([root, p1, p2, p3], 2.4 * s, 1, 'spark', { line: false });
      } else {
        P.lock(root, { n: 4, ang: a, len: len * (.55 + (i % 2) * .15), w: 2.3 * s, w1: 1, curve: 14, sway: sway * .8 }, 'spark', { line: false });
      }
    }
  }
}

function peloArriba(P, c) {
  const { hp, R, s, st, wind } = c;
  const mat = st === 1 ? 'hair1' : 'hair2';
  P.layer('top');
  // cúpula: casquete que llega hasta la banda y cubre la parte alta del cráneo
  P.smooth([hp(-.5, .1), hp(-1.12, -.15), hp(-1.0, -.95), hp(-.3, -1.4), hp(.6, -1.32), hp(1.07, -.85), hp(1.0, -.6), hp(.5, -.78), hp(.0, -.62)], mat, { n: 3 });
  // banda metálica en la frente
  P.strip([hp(1.02, -.56), hp(.55, -.8), hp(-.2, -.86), hp(-.98, -.6)], 2.1 * s, 2.1 * s, 'trim', { shade: 'cyl', smooth: true, line: true });
  if (st >= 2) P.emit({ px: [hp(.62, -.8)] });
  if (c.cl === 2) {                                        // Pararrayos: antena fina sobre la banda, con punta que chispea
    P.line([hp(.1, -.86), hp(.02, -1.55), hp(.06, -2.0)], 'trim', 4, {});
    P.line([hp(.1, -.86), hp(-.04, -1.4)], 'trim', 2, {});
    P.emit({ px: [hp(.06, -2.15)] });
  }
  // mechón lateral que cae por delante de la oreja hasta la mandíbula
  P.lock(hp(.02, -.64), { n: 4, ang: -6 - wind * 22, len: R * 2.2, w: R * .8, w1: 1.1, curve: 8 - wind * 12, sway: 3 }, mat, { line: true });
  // mechones sueltos que caen hacia atrás sobre la cúpula (rompen la silueta sin hacer pinchos hacia delante)
  P.lock(hp(.3, -1.3), { n: 4, ang: -48 - wind * 20, len: R * 1.7, w: R * .55, w1: 1, curve: -14, sway: 4 }, mat, { line: false });
  P.lock(hp(-.4, -1.38), { n: 4, ang: -58 - wind * 20, len: R * 1.9, w: R * .6, w1: 1, curve: -10, sway: 5 }, mat, { line: false });
  hebras(P, c, mat);
  if (st === 4) {                                          // corona de arcos: mechones recogidos en lazos sobre la cabeza
    for (let i = 0; i < 3; i++) {
      const a = hp(-.8 + i * .55, -1.1), b = hp(-.55 + i * .55, -2.15 - (i === 1 ? .35 : 0)), d = hp(i * .55, -1.2);
      P.strip([a, b, d], 2 * s, 1.2 * s, 'hair2', { smooth: true, line: true });
      P.strip([a, add(b, [0, -.6]), d], 1.3 * s, .8 * s, 'spark', { smooth: true, line: false });
    }
  }
}

// Fulminador: esfera de energía que se carga sobre el cañón del guantelete (más grande al cargar, con anillo de arcos)
function esfera(P, c, hand) {
  const { ctx, s } = c, d = P.dir('armN.lower'), an = ctx.anim, f = ctx.frame;
  const r = (an === 'charge' ? 3.2 + f * 1.3 : an === 'fire' ? 4.4 - f * 1.2 : an === 'cast' ? 3 + f * .7 : an === 'idle' ? 2.4 + (f % 2) * .4 : 2.4) * s;
  const o = add(hand, d, r + 2 * s);
  P.layer('top');
  P.blob(o, r, r, 'spark', { shade: 'sphere', line: true });
  P.blob(add(o, [-r * .25, -r * .25]), r * .5, r * .5, 'spark', { shade: 'flat', tone: 4 });
  P.emit({ blob: [add(o, [-r * .2, -r * .2]), r * .3, r * .3] });
  const n = c.st >= 2 ? 6 : 3;                                                         // anillo de arcos angulosos alrededor de la esfera
  for (let i = 0; i < n; i++) {
    const a = ph0(c) + i / n * TAU, q = add(o, [cos(a), sin(a)], r + 1.6 * s), q2 = add(o, [cos(a + .5), sin(a + .5)], r + 2.8 * s);
    P.line([q, q2], 'spark', 3, {}); if (i % 2) P.emit({ px: [q2] });
  }
  P.anchor('muzzle', o);
}
const ph0 = c => c.ph * 1.3;
// Pararrayos: vara de plata con horquilla y dos anillos que flotan; se inclina con el antebrazo
function vara(P, c, hand) {
  const { s, ctx } = c, d = P.dir('armN.lower');
  let u = [d[0] * .36, -.66 + d[1] * .36]; const l = Math.hypot(u[0], u[1]) || 1; u = [u[0] / l, u[1] / l];
  const n = [u[1], -u[0]], b = add(hand, u, -12 * s), t = add(hand, u, 18 * s);
  P.layer('top');
  P.cap(b, t, 2.4 * s, 1.9 * s, 'trim', { shade: 'cyl', line: true });
  banda(P, add(hand, u, -3 * s), u, 3.4 * s, 1.2 * s, 'leather', 2, { line: true });
  banda(P, add(hand, u, 3 * s), u, 3.2 * s, 1 * s, 'leather', 2);
  P.blob(add(b, u, -.5), 1.8 * s, 1.8 * s, 'trim', { shade: 'sphere', line: true });
  P.strip([t, add(add(t, u, 3 * s), n, 3.4 * s), add(add(t, u, 8 * s), n, 3 * s)], 1.5 * s, 1, 'trim', { smooth: true, line: true });                  // horquilla
  P.strip([t, add(add(t, u, 3 * s), n, -3.4 * s), add(add(t, u, 8 * s), n, -3 * s)], 1.5 * s, 1, 'trim', { smooth: true, line: true });
  const top = add(t, u, 6 * s), cs = ctx.anim === 'charge' || ctx.anim === 'cast';
  P.emit({ px: [add(top, u, 1), add(top, u, 3), add(top, n, 1)] });
  const nr = c.st >= 3 ? 2 : 1;                                                       // anillos flotantes (etapa 3 y 4: dos)
  for (let k = 0; k < nr; k++) {
    const cen = add(t, u, (3 + k * 4 + Math.sin(c.ph + k) * .8) * s), pts = [];
    for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU; pts.push(add(add(cen, n, cos(a) * (4.5 + k) * s), u, sin(a) * 1.5 * s)); }
    P.line(pts, 'trim', k ? 3 : 4, {});
    if (cs || c.st >= 2) P.emit({ px: [pts[2]] });
  }
  P.anchor('rod', top); P.anchor('muzzle', top);
}

// ---------------------------------------------------------------------------------------------
// Dibujo completo (orden = orden de llamadas: lejano → cuerpo → cercano → cabeza → pelo superior → brazo cercano)
function dibujar(P, ctx, clase) {
  const c = info(P, ctx);
  const { J } = P;
  // capa lejana: pierna, brazo y cola de pelo del lado contrario (un tono más oscuro por el kit)
  pierna(P, c, 'F', 'far');
  brazo(P, c, 'F', 'far', clase);
  faldon(P, c, false);
  torso(P, c);
  const patada = J.knN && c.A['legN.upper'] > 55;           // si la pierna cercana sube, va por delante del faldón
  if (patada) { faldon(P, c, true); pierna(P, c, 'N', 'near'); } else { pierna(P, c, 'N', 'near'); faldon(P, c, true); }
  cabeza(P, c);
  peloAtras(P, c);
  peloArriba(P, c);
  ojo(P, c);
  const hand = brazo(P, c, 'N', 'near', clase);
  // chispas sueltas al golpear (etapa 1: alguna; después las pone fx)
  if (ctx.anim.startsWith('atk') && ctx.frame === 1 || ctx.anim === 'kick' && ctx.frame === 1) {
    const r = ctx.rng, o = ctx.anim === 'kick' ? J.ftN : hand;
    for (let i = 0; i < 5; i++) { const a = r() * TAU, d = 4 + r() * 5; P.emit({ px: [[o[0] + cos(a) * d + 3, o[1] + sin(a) * d]] }); }
  }
  if (clase === 1) esfera(P, c, hand);
  if (clase === 2) vara(P, c, hand);
  if (clase === 0) P.anchor('muzzle', add(hand, [1, 0], 4));
  P.anchor('head', J.head);
}

// ---------------------------------------------------------------------------------------------
// 5. Efectos vivos (se pintan en pantalla cada fotograma, no se hornean). Contrato asumido para c:
//    { x, y (pies), t (ms), face (±1), s (escala), lite (efectos reducidos), seed }. Todo determinista a partir de t.
// Reglas: ≤ 2 Hz en los destellos, sin blanco a pantalla completa, y con c.lite solo la versión simple.
const px = (g, x, y, col, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.globalAlpha = 1; };
const zig = (g, x0, y0, x1, y1, seed, col, n = 5) => {                 // rayo anguloso: n tramos con desvío fijo por semilla
  let x = x0, y = y0;
  for (let i = 1; i <= n; i++) {
    const k = i / n, nx = x0 + (x1 - x0) * k + (i === n ? 0 : ((seed * 7 + i * 13) % 7) - 3), ny = y0 + (y1 - y0) * k;
    const steps = Math.max(Math.abs(nx - x), Math.abs(ny - y));
    for (let j = 0; j <= steps; j++) px(g, x + (nx - x) * j / (steps || 1), y + (ny - y) * j / (steps || 1), col);
    x = nx; y = ny;
  }
};
// Contrato real de render/scene.js: c = { x, y (pies), w, h, t (ms), lite, face, alpha, idx (0 Relámpago, 1 Fulminador, 2 Pararrayos), variant }.
// Opcional (si el núcleo lo añade por adenda): c.charge 0..1 = progreso de la carga de un rayo → barra de carga sobre la cabeza.
const escala = c => Math.max(.8, Math.min(1.3, (c.h || 64) / 64));
const fx = {
  // detrás del héroe: órbitas de chispas (2-3) y, en la etapa 4, círculo de luz en el suelo con runas
  back(g, c, stage) {
    const t = c.t / 1000, s = escala(c), body = -30 * s, cl = c.idx | 0, col = c.variant ? ['#a8b4ff', '#d4dcff'] : ['#b890ff', '#d8c4ff'];
    g.save(); g.translate(c.x, c.y);
    if (stage === 4) {
      g.globalAlpha = .55;
      for (let i = 0; i < 32; i++) { const a = i / 32 * TAU; px(g, cos(a) * 27 * s, sin(a) * 8 * s, '#5a24c8'); }                     // aro exterior
      g.globalAlpha = .8;
      for (let i = 0; i < 3; i++) { const a = t * .35 + i * TAU / 3; for (let r = 0; r < 4; r++) px(g, cos(a) * (14 + r * 3) * s, sin(a) * (4 + r * .9) * s, r === 3 ? '#ffffff' : '#8a4aff'); }   // 3 rayos de runa que giran despacio
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; px(g, cos(a) * 12 * s, sin(a) * 3.5 * s, '#b890ff'); }               // aro interior
      g.globalAlpha = 1;
    } else if (stage >= 2) {
      const n = c.lite ? 3 : stage === 2 ? 5 : 9;
      for (let i = 0; i < n; i++) {
        const a = t * (stage === 2 ? 1.6 : 2.4) + i / n * TAU;
        px(g, cos(a) * 15 * s * c.face, body + sin(a) * 24 * s, i % 2 ? col[0] : col[1]);
      }
    }
    if (stage >= 2 && !c.lite && stage < 4) {                                              // acento de clase: el Pararrayos atrae chispas hacia arriba, el Fulminador deja un hilo de carga al suelo
      if (cl === 2) for (let i = 0; i < 4; i++) { const k = (t * .6 + i / 4) % 1; px(g, c.face * (13 + (i % 2) * 3) * s, -8 * s - k * 62 * s, col[1], Math.sin(k * Math.PI)); }
      if (cl === 1) for (let i = 0; i < 3; i++) { const k = (t * .8 + i / 3) % 1; px(g, -c.face * (6 + k * 14) * s, -4 * s + (i - 1) * 2, col[0], 1 - k); }
    }
    g.restore();
  },
  // delante del héroe: arcos de rayo (2-3), anillos lentos (4) y barra de carga
  front(g, c, stage) {
    const t = c.t / 1000, s = escala(c);
    g.save(); g.translate(c.x, c.y);
    if (c.charge > 0) {                                                                    // barra de carga: 16 px, se llena de izquierda a derecha
      const k = Math.min(1, c.charge), w = 16, x0 = -8, y0 = -(c.h || 64) - 6;
      g.fillStyle = '#0a0810'; g.fillRect(x0 - 1, y0 - 1, w + 2, 4);
      g.fillStyle = '#3a2a6a'; g.fillRect(x0, y0, w, 2);
      g.fillStyle = k >= 1 ? '#ffffff' : '#b890ff'; g.fillRect(x0, y0, Math.round(w * k), 2);
    }
    if (stage < 2) { g.restore(); return; }
    if (stage === 4) {
      const n = c.lite ? 1 : 2;
      for (let r = 0; r < n; r++) {
        const a0 = t * .5 + r * Math.PI;
        for (let i = 0; i < 20; i++) { const a = a0 + i / 20 * Math.PI * 1.3; px(g, cos(a) * 17 * s, -30 * s + sin(a) * (10 + r * 8) * s, i > 14 ? '#ffffff' : '#e0d0ff', .9 - i / 30); }
      }
    } else if (!c.lite) {
      const k = Math.floor(t * (stage === 2 ? 1 : 2.2)), seed = k * 31 + (c.idx || 0) * 17;
      if ((t * (stage === 2 ? 1 : 2.2)) % 1 < .35) {
        const side = (seed % 2 ? 1 : -1) * c.face;
        zig(g, side * 4 * s, -34 * s, side * (12 + (seed % 6)) * s, -20 * s - (seed % 9), seed, '#d8c4ff', 4);
        if (stage === 3) zig(g, side * 5 * s, -40 * s, side * (14 + (seed % 5)) * s, -52 * s - (seed % 7), seed + 3, '#8a4aff', 4);
      }
    }
    g.restore();
  },
};

// Remate de la transformación: un rayo cae sobre el héroe (k 0..1). Sin destello de pantalla: solo la columna de luz.
function transformFx(g, c, k, from, to) {
  const s = escala(c);
  g.save(); g.translate(c.x, c.y);
  if (k < .15) { g.globalAlpha = k / .15 * .3; g.fillStyle = '#0a0810'; g.fillRect(-26, -90, 52, 92); g.globalAlpha = 1; }   // el cielo se oscurece sobre la party
  else if (k < .7) {
    const seed = Math.floor(k * 12);
    zig(g, 0, -150, 0, -34 * s, seed, '#ffffff', 9); zig(g, 1, -150, 1, -34 * s, seed + 1, '#b890ff', 9);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; px(g, cos(a) * (10 + 20 * (k - .15)), -30 * s + sin(a) * (6 + 14 * (k - .15)), '#d8c4ff'); }
  } else {
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + k * 3; px(g, cos(a) * 18 * s * (1 - (k - .7)), -30 * s + sin(a) * 24 * s * (1 - (k - .7)), '#e0d0ff', 1 - (k - .7) * 2); }
  }
  g.restore();
  void from; void to;
}

// ---------------------------------------------------------------------------------------------
// Definición de la raza
// Fulminador (distancia): pie adelantado, brazo cercano apuntando y brazo lejano atrás de contrapeso.
const POSE_F = {
  idle: k => [G({ cr: .15, lean: 4, sp: 0, nk: 1, hipN: 24, knN: 22, hipF: -26, knF: 28, shN: 62, elN: 24, shF: -22, elF: 50 }),
    G({ cr: .165, lean: 5, sp: 1, nk: 0, hipN: 25, knN: 24, hipF: -26, knF: 30, shN: 66, elN: 22, shF: -26, elF: 52 }),
    G({ cr: .15, lean: 4, sp: 0, nk: 1, hipN: 23, knN: 22, hipF: -27, knF: 28, shN: 60, elN: 26, shF: -20, elF: 48 }),
    G({ cr: .135, lean: 3, sp: 0, nk: 2, hipN: 22, knN: 20, hipF: -25, knF: 26, shN: 64, elN: 24, shF: -24, elF: 50 })][k],
  charge: k => [G({ cr: .17, lean: -2, sp: -2, nk: 2, hipN: 26, knN: 28, hipF: -28, knF: 30, shN: 40, elN: 80, shF: -34, elF: 56 }),
    G({ cr: .19, lean: -4, sp: -4, nk: 0, hipN: 28, knN: 30, hipF: -30, knF: 32, shN: 62, elN: 40, shF: -38, elF: 58 }),
    G({ cr: .2, lean: -6, sp: -5, nk: 0, hipN: 30, knN: 32, hipF: -32, knF: 34, shN: 84, elN: 12, shF: -44, elF: 60 })][k],
  fire: k => [G({ cr: .17, lean: -8, sp: -4, nk: -2, hipN: 30, knN: 30, hipF: -30, knF: 20, shN: 92, elN: 2, shF: -50, elF: 56 }),
    G({ cr: .15, lean: -2, sp: 0, nk: 0, hipN: 26, knN: 26, hipF: -28, knF: 24, shN: 88, elN: 4, shF: -36, elF: 54 })][k],
};
// Pararrayos (apoyo): erguido, la vara cerca del cuerpo; al cargar alza la vara y abre la otra mano.
const POSE_P = {
  idle: k => [G({ cr: .07, lean: 2, sp: 1, nk: 2, hipN: 12, knN: 12, hipF: -10, knF: 12, shN: 22, elN: 66, shF: 28, elF: 96 }),
    G({ cr: .08, lean: 3, sp: 2, nk: 1, hipN: 13, knN: 14, hipF: -10, knF: 13, shN: 24, elN: 68, shF: 30, elF: 100 }),
    G({ cr: .07, lean: 2, sp: 1, nk: 2, hipN: 12, knN: 12, hipF: -11, knF: 12, shN: 20, elN: 64, shF: 26, elF: 94 }),
    G({ cr: .06, lean: 1, sp: 1, nk: 3, hipN: 11, knN: 11, hipF: -10, knF: 11, shN: 22, elN: 66, shF: 28, elF: 92 })][k],
  charge: k => [G({ cr: .1, lean: 2, sp: 0, nk: 2, hipN: 14, knN: 14, hipF: -12, knF: 14, shN: 50, elN: 50, shF: 60, elF: 70 }),
    G({ cr: .1, lean: 0, sp: -2, nk: 0, hipN: 14, knN: 14, hipF: -12, knF: 14, shN: 110, elN: 32, shF: 90, elF: 70 }),
    G({ cr: .1, lean: -3, sp: -4, nk: -3, hipN: 14, knN: 14, hipF: -12, knF: 14, shN: 152, elN: 16, shF: 120, elF: 56 })][k],
};
const poseDe = i => (anim, k) => {
  const T = i === 1 ? POSE_F : i === 2 ? POSE_P : POSE;
  return T[anim] ? T[anim](k) : i ? null : null;
};
export default {
  id: 'tempestarios',
  kit: 1,
  ready: true,
  materials: ['skin', 'cloth', 'cloth2', 'trim', 'leather', 'hair1', 'hair2', 'spark', 'iris'],
  ramps(variant, stage) {
    const v = variant ? 1 : 0, pick = (k) => RAMPAS[k][Math.min(v, RAMPAS[k].length - 1)];
    return {
      skin: ramp5(pick('skin')), cloth: ramp5(pick('cloth')), cloth2: ramp5(pick('cloth2')), trim: ramp5(pick('trim')), leather: ramp5(pick('leather')),
      hair1: ramp5(pick('hair1')), hair2: ramp5(pick('hair2')), spark: ramp5(pick('spark')),
      iris: ramp5(['#1c2230', '#4a5a78', IRIS[Math.min(3, (stage || 1) - 1)], '#ffffff', '#ffffff']),
    };
  },
  emit: variant => EMIT[variant ? 1 : 0],
  geomStage: s => s,
  extraAnims: { kick: 3 },
  extraPoses: { atleta: { kick: KICK } },
  classes: [
    { id: 'relampago', name: 'Relámpago', build: { body: 'atleta', height: 60, shoulder: 1.1, headScale: 1.14 }, anchors: ['haN', 'haF', 'head', 'chest', 'muzzle'],
      pose: poseDe(0),
      draw: (P, ctx) => dibujar(P, ctx, 0) },
    { id: 'fulminador', name: 'Fulminador', build: { body: 'atleta', height: 60 }, anchors: ['haN', 'haF', 'head', 'chest', 'muzzle'],
      pose: poseDe(1), draw: (P, ctx) => dibujar(P, ctx, 1) },
    { id: 'pararrayos', name: 'Pararrayos', build: { body: 'atleta', height: 60 }, anchors: ['haN', 'haF', 'head', 'chest', 'muzzle'],
      pose: poseDe(2), draw: (P, ctx) => dibujar(P, ctx, 2) },
  ],
  stageScale: [1, 1, 1, 1.1],
  fx,
  transformFx,
};
