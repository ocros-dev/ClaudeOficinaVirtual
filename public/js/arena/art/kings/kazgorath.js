// Rey Demonio «Kazgorath» (Brasas): arte 16 bits de las TRES formas (paquete K-KAZ).
// Vista frontal y simétrica. Silueta: corona de cuernos y alas de ceniza con membrana y dedos de hueso curvos.
//   Forma 1: demonio musculoso de piel de ladrillo, hombreras de cuerno, 4 cuernos y alas medianas.
//   Forma 2: armadura de basalto con juntas de magma, 3.er par de cuernos (carnero), alas de 4 dedos con borde de brasa.
//   Forma 3: coraza de obsidiana con núcleo de magma, corona de fuego, cuernos con venas, 2.º par de alas pequeñas
//            de fuego, cresta dorsal, tercer ojo y brasas flotando.
// Contrato (docs/arena-v12-arquitectura.md 3.7 y 3.8): size(forma), ramps(forma), emit(forma), draw(P, ctx) con ctx.kp.
// Guía de estilo: docs/arena-estilo-16bits.md (apartado «Reyes»). Solo se importa de '../kit16/*'.
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max;
const SCALE = [0, .82, .89, .95];                    // forma 1: ~285 px; forma 2: ~320 px; forma 3: ~348 px (con la corona de fuego)

// ---------- utilidades geométricas (puras) ----------
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const bez = (a, c, b, n = 5) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } return o; };
// Catmull-Rom: curva suave que pasa por los puntos de control
function crv(p, n = 3) {
  const o = [];
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[max(0, i - 1)], b = p[i], c = p[i + 1], d = p[min(p.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      o.push([0, 1].map(j => .5 * (2 * b[j] + (-a[j] + c[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t2 + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * t3)));
    }
  }
  o.push(p[p.length - 1]); return o;
}
// Cinta curva: polígono que sigue la curva (con ancho variable) más una línea de luz de 1 px en el lado iluminado.
// Es mucho más barata que encadenar cápsulas y deja huesos, cuernos y cola con un brillo nítido. wm = ancho en el centro.
function tube(P, pts, w0, w1, m, o = {}, wm, n = 2) {
  const c = crv(pts, n), L = [0], N = c.length;
  for (let i = 1; i < N; i++) L.push(L[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const tot = L[N - 1] || 1, wf = t => (wm == null ? w0 + (w1 - w0) * t : t < .5 ? w0 + (wm - w0) * t * 2 : wm + (w1 - wm) * (t - .5) * 2);
  const lf = [], rt = [], hl = [];
  for (let i = 0; i < N; i++) {
    const a = c[max(0, i - 1)], d = c[min(N - 1, i + 1)], tx = d[0] - a[0], ty = d[1] - a[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl, w = max(.6, wf(L[i] / tot) / 2);
    lf.push([c[i][0] + nx * w, c[i][1] + ny * w]); rt.push([c[i][0] - nx * w, c[i][1] - ny * w]);
    const sg = nx * -.6 + ny * -.8 >= 0 ? 1 : -1;
    if (i > 0 && i < N - 1 && w > 2.2) hl.push([c[i][0] + nx * sg * w * .45, c[i][1] + ny * sg * w * .45]);
  }
  P.poly([...lf, ...rt.reverse()], m, { shade: 'vol', ...o });
  if (hl.length > 1) P.line(hl, m, 3, {});
  return c;
}

// Miembro grueso: dos puntos y ancho que se afina (cinta de 4 vértices con 3 tonos por volumen); mucho más barato que una cápsula.
const limb = (P, a, b, w0, w1, m, o = {}) => tube(P, [a, b], w0, w1, m, o, undefined, 1);

export default {
  id: 'kazgorath',
  kit: 1,
  ready: true,
  // piel de ladrillo, cuernos negros, magma, ceniza de las alas, hueso (colmillos y garras), basalto (armadura)
  materials: ['skin', 'horn', 'magma', 'ash', 'bone', 'plate'],
  // celda de dibujo ajustada a la pose más extendida de cada forma (con 4 px de margen); los pies están en (gx, gy)
  size: form => ({ w: [0, 452, 494, 535][form], h: [0, 322, 356, 386][form], gx: [0, 228, 247, 273][form], gy: [0, 309, 342, 372][form] }),
  ramps: form => ({
    skin: form === 1 ? ramp5(['#2a0a0c', '#5a1612', '#a02a1a', '#c8482a', '#ec7a42'])
      : form === 2 ? ramp5(['#240808', '#4e1010', '#8c2214', '#b83a22', '#e06a3a'])
      : ramp5(['#1a0608', '#3c0c0e', '#721810', '#a03018', '#d85a2c']),
    horn: ramp5(['#08060c', '#14101c', '#241c2c', '#3e3446', '#625868']),
    magma: ramp5(['#6a1208', '#b02a0a', '#ff6a1a', '#ffa030', '#ffe070']),
    ash: form === 3 ? ramp5(['#1a1014', '#34202a', '#5a3a40', '#82584e', '#b08468']) : ramp5(['#1a1418', '#2e2428', '#4a3c40', '#6a5a5e', '#8e7c7e']),
    bone: ramp5(['#4a3a34', '#8a7060', '#c8b090', '#e8d4b0', '#fff4dc']),
    plate: ramp5(['#0a0608', '#1a0e12', '#2e1a1e', '#503034', '#7c504a']),
  }),
  emit: form => '#ffb040',
  // Retoques de pose propios de este rey (peso, torsión de hombros, cabeza). Se suman a los parámetros del kit.
  poseOverride(form, anim, i) {
    switch (anim) {
      case 'idle': return { dx: [-2, -1, 1, 0][i], hd: [0, 1, 2, 1][i], tw: [-.3, 0, .3, 0][i] };
      case 'hit': return { dy: [7, 3][i], hd: [-9, -4][i], tw: [1, .5][i] };
      case 'lean': return { dy: 4, hd: -3, tw: -1 };
      case 'claw': return { dy: [5, 3, 1][i], hd: [-3, 8, 4][i], tw: [-1, 1, .6][i] };
      case 'lunge': return { dy: [7, 2][i], hd: [-2, 10][i], tw: [-.6, 1][i] };
      case 'roar': return { dy: [-1, -4][i], hd: [-8, -13][i], tw: 0, armN: [46, 66][i], armF: [46, 66][i] };       // brazos abiertos y cabeza atrás
      case 'charge': return { dy: [3, 5][i], hd: [2, 4][i], tw: [.3, -.3][i] };
      case 'beam': return { dy: [4, 5][i], hd: [6, 8][i], tw: 0 };
      case 'cast': return { dy: [3, -1, 2][i], hd: [-2, -6, 3][i], tw: [-.8, 0, .8][i] };
      default: return {};
    }
  },
  draw(P, ctx) {
    const k = ctx.kp, F = ctx.form, S = SCALE[F] || .85, ph = ctx.phase * TAU, g = k.glow;
    const X = k.dx, Y = k.dy, hd = k.hd || 0, tw = k.tw || 0, b = k.breathe, br = 1 + b * .035;
    const dir = a => [sin(a * D), cos(a * D)];                              // 0 = hacia abajo, 90 = horizontal
    // punto del cuerpo: dx/dy de la pose y cizalla del torso con la inclinación (lean) cuanto más arriba
    const q = (x, y, hx = 0, hy = 0) => [(x + X + k.lean * .9 * max(0, min(1.5, (-y - 110) / 100)) + hx) * S, (y + Y + hy) * S];
    const add = (p, v, n) => [p[0] + v[0] * n * S, p[1] + v[1] * n * S];
    const hp = (x, y) => q(x, y - 258, k.lean * .5, -b * 1.2 + hd * .55);   // cabeza: coordenadas relativas a su centro
    const A = (v, n) => v;                                                  // (marcador de legibilidad)
    void A;

    // ================= capa lejana: alas, cola, cresta =================
    P.layer('far');
    if (F >= 2) {                                                           // cresta de pinchos detrás del cuello
      const nS = F === 2 ? 3 : 5;
      for (let i = 0; i < nS; i++) for (const sx of [-1, 1]) {
        if (i === 0 && sx === 1) continue;
        const x = i === 0 ? 0 : sx * (16 + i * 16), y0 = -236 + i * 10, hh = 52 - i * 5 + (F === 3 ? 12 : 0);
        P.poly([q(x - 9, y0), q(x + sx * (i ? 3 : 0), y0 - hh), q(x + 9, y0)], 'horn', { shade: 'vol' });
      }
    }
    const wv = k.wing, spread = .9 + wv * .16 + (F === 3 ? .1 : 0);
    const nFing = F === 1 ? 3 : 4;
    const FING = [{ a: 48, l: 116 }, { a: 28, l: 138 }, { a: 9, l: 136 }, { a: -10, l: 108 }];
    const ala = (sx, esc, alto, raiz, o2) => {
      const root = q(sx * 34, raiz), wr = q(sx * (34 + (62 + 52 * wv) * esc), raiz - (50 + 44 * wv) * esc * alto);
      const tips = [];
      for (let i = 0; i < nFing; i++) {
        const f = FING[i], a = f.a + (i < 2 ? wv * 10 : -wv * 6) + sin(ph + i * .9 + (o2 ? 1.3 : 0)) * 1.6, v = [sx * sin(a * D), cos(a * D)];
        tips.push(add(wr, v, f.l * esc * spread));
      }
      const body = q(sx * 22, raiz + 66);
      // membrana: un panel por cada hueco entre dedos, con el borde inferior festoneado
      for (let i = 0; i < nFing; i++) {
        const a = tips[i], c = i + 1 < nFing ? tips[i + 1] : body;
        const cp = lerp(lerp(a, c, .5), wr, i + 1 < nFing ? .38 : .2);
        const edge = bez(a, cp, c, 6);
        const pts = i + 1 < nFing ? [wr, ...edge] : [root, wr, ...edge];
        P.poly(pts, 'ash', { shade: 'vol' });
        const mid = edge[3], from = i + 1 < nFing ? wr : lerp(root, wr, .5);
        P.fold([lerp(from, mid, .28), lerp(from, mid, .72)], 'ash');
        if (F >= 2) {                                                       // borde de brasa y desgarros
          const hot = F === 3 ? 1 : (g > .5 ? 1 : 0);
          if (hot) for (let e = 1; e < edge.length - 1; e += 2) P.emit({ px: [[edge[e][0], edge[e][1] - 1]] });
          if (i === 1) P.emit({ line: [lerp(wr, mid, .55), lerp(wr, mid, .8)] });
        }
      }
      // huesos: brazo del ala con codo marcado, dedos curvos con articulaciones y garra del pulgar
      const el = q(sx * (34 + 30 * esc), raiz - (30 + 16 * wv) * esc * alto);
      tube(P, [root, el, wr], 17 * S, 10 * S, 'horn', { line: true }, undefined, 1);
      P.blob(wr, 9 * S, 9 * S, 'horn', { shade: 'sphere', line: true });
      P.poly([add(wr, [sx * .1, -1], 8), add(wr, [sx * .4, -1], 30), add(wr, [sx * .9, -.5], 8)], 'horn', { shade: 'vol', line: true });
      for (let i = 0; i < nFing; i++) {
        const t = tips[i], mid = lerp(wr, t, .5), nx = -(t[1] - wr[1]), ny = t[0] - wr[0], nl = Math.hypot(nx, ny) || 1, bow = (i === 0 ? 10 : 6) * S * sx;
        tube(P, [wr, [mid[0] + nx / nl * bow, mid[1] + ny / nl * bow], t], 8 * S, 2.2 * S, 'horn', { line: true }, undefined, 1);
        P.blob(lerp(wr, t, .5), 3.6 * S, 3.6 * S, 'horn', { shade: 'sphere' });
        P.poly([add(t, [sx * .3, 1], -4), add(t, [sx * .1, 1], 12), add(t, [-sx * .2, .8], -2)], 'bone', { shade: 'vol' });
      }
      return wr;
    };
    for (const sx of [-1, 1]) ala(sx, 1, 1, -198, false);
    if (F === 3) for (const sx of [-1, 1]) {                                // 2.º par de alas: abanico de plumas de fuego
      const base = q(sx * 46, -244);
      for (const [a, l] of [[10, 96], [32, 112], [56, 108], [80, 86]]) {
        const aa = a + wv * 8 + sin(ph + a * .05) * 3, v = [sx * sin(aa * D), -cos(aa * D)], tip = add(base, v, l), pr = [-v[1], v[0]];
        P.poly([add(base, pr, 11), add(lerp(base, tip, .5), pr, 13), tip, add(lerp(base, tip, .5), pr, -12), add(base, pr, -11)], 'magma', { shade: 'vol' });
        P.emit({ line: [lerp(base, tip, .12), lerp(base, tip, .8)] });
      }
    }
    // cola: gruesa en la base, con ondulación y espolón; termina en una llama
    const tw2 = k.tail * 1.3 + sin(ph) * 4;
    const t0 = q(0, -108), tpts = [t0, q(-38, -78 + tw2 * .2), q(-84 + tw2, -46), q(-122 + tw2 * 1.5, -62), q(-130 + tw2 * 1.9, -112)];
    const tc = tube(P, tpts, 30 * S, 7 * S, 'skin', {}, 24 * S);
    for (let i = 3; i < tc.length - 4; i += 4) P.poly([add(tc[i], [-.3, -1], 6), add(tc[i], [-.5, -1], 15), add(tc[i], [.3, -.6], 6)], 'horn', { shade: 'vol' });
    const tt = tc[tc.length - 1];
    P.poly([add(tt, [-.8, 0], 8), add(tt, [0, -1], 30), add(tt, [.8, 0], 8), add(tt, [0, 1], 10)], 'horn', { shade: 'vol', line: true });                 // espolón
    P.poly([add(tt, [-.7, -.2], 12), add(tt, [-.2 + sin(ph) * .3, -1], 22 + g * 10 + (F - 1) * 5), add(tt, [.7, -.2], 12)], 'magma', { shade: 'flat', tone: 2 });
    P.emit({ blob: [add(tt, [0, -.6], 12), (4 + F) * S, (7 + F) * S] });

    // ================= piernas =================
    P.layer('body');
    for (const sx of [-1, 1]) {
      const hip = q(sx * 27, -124), an = [(sx * 40 + X * .3) * S, -16 * S], mid = lerp(hip, an, .5);
      const kn = [mid[0] + sx * (17 + max(0, Y) * 1.1) * S, mid[1] - 3 * S];                    // el pie está clavado: la rodilla se abre al agacharse
      const vt = [kn[0] - hip[0], kn[1] - hip[1]], vs = [an[0] - kn[0], an[1] - kn[1]];
      const at = Math.atan2(vt[1], vt[0]) / D, as = Math.atan2(vs[1], vs[0]) / D;
      limb(P, hip, kn, 60 * S, 46 * S, 'skin');
      P.blob(lerp(hip, kn, .42), 29 * S, 21 * S, 'skin', { shade: 'sphere', rot: at, line: true });                          // cuádriceps
      P.blob(add(lerp(hip, kn, .35), [sx, 0], 10), 14 * S, 24 * S, 'skin', { shade: 'sphere', rot: at, line: true });       // vasto externo
      limb(P, kn, an, 44 * S, 28 * S, 'skin');
      P.blob(add(lerp(kn, an, .3), [sx, 0], 6), 18 * S, 12 * S, 'skin', { shade: 'sphere', rot: as, line: true });          // gemelo
      P.blob(kn, 19 * S, 17 * S, 'skin', { shade: 'sphere', line: true });
      P.poly([add(kn, [sx * .3, -1], 9), add(kn, [sx, -.55], 26), add(kn, [sx * .5, .55], 11)], 'horn', { shade: 'vol', line: true });   // espolón de rodilla
      P.fold([lerp(hip, kn, .2), lerp(hip, kn, .6)], 'skin'); P.fold(bez(add(kn, [sx, 0], 14), add(kn, [sx * .5, 1], 22), add(an, [sx, -1], 30), 3), 'skin');
      if (F >= 2) {                                                         // grebas de basalto con junta de magma
        P.poly([add(kn, [-sx * .8, .3], 17), add(kn, [sx * .9, .1], 20), add(an, [sx * .8, -1], 20), add(an, [-sx * .8, -1], 17)], 'plate', { shade: 'vol', line: true });
        P.emit({ line: [add(kn, [-sx * .5, .6], 22), add(an, [0, -1], 30)] });
        if (F === 3) P.emit({ px: [add(kn, [0, .8], 38), add(an, [sx * .3, -1], 28)] });
      }
      // pezuña hendida con tres garras y espolón trasero
      P.poly([[an[0] - 25 * S, an[1] - 4 * S], [an[0] + 25 * S, an[1] - 4 * S], [an[0] + 30 * S, an[1] + 12 * S], [an[0] + 22 * S, an[1] + 18 * S], [an[0] - 22 * S, an[1] + 18 * S], [an[0] - 30 * S, an[1] + 12 * S]], 'horn', { shade: 'vol', line: true });
      P.line([[an[0], an[1] + 2 * S], [an[0], an[1] + 18 * S]], 'horn', 0, {});
      for (const t of [-1, 0, 1]) P.poly([[an[0] + t * 15 * S - 5 * S, an[1] + 14 * S], [an[0] + t * 17 * S, an[1] + 26 * S], [an[0] + t * 15 * S + 5 * S, an[1] + 14 * S]], 'bone', { shade: 'vol' });
    }

    // ================= torso =================
    const c = k.glow;
    // faldón de placas (tassets) bajo el cinturón
    for (const x of [-30, -10, 10, 30]) {
      const w = x === -10 || x === 10 ? 17 : 13, y1 = -96 + (abs(x) < 20 ? 14 : 4);
      P.poly([q(x - w, -112), q(x + w, -112), q(x + w * .8, y1), q(x, y1 + 7), q(x - w * .8, y1)], F === 1 ? 'horn' : 'plate', { shade: 'vol', line: true });
      if (F >= 2) P.emit({ line: [q(x, -108), q(x, y1 + 2)] });
    }
    // masa del torso: cadera estrecha, tórax ancho en «V», trapecios hacia el cuello
    const tl = [[-34, -110], [-34, -134], [-42, -158], [-60, -184], [-66, -202], [-48, -216], [-24, -224], [24, -224], [48, -216], [66, -202], [60, -184], [42, -158], [34, -134], [34, -110]];
    P.smooth(tl.map(([x, y]) => q(x * (y < -150 ? br : 1), y)), 'skin', { n: 3 });
    // costillas y serrato (pliegues largos) y abdomen esculpido en 6 bloques
    for (const sx of [-1, 1]) {
      P.fold([q(sx * 46, -176), q(sx * 40, -162), q(sx * 36, -150)], 'skin'); P.fold([q(sx * 42, -162), q(sx * 36, -150), q(sx * 32, -142)], 'skin');
      for (const [y, w] of [[-158, 13], [-141, 13], [-125, 12]]) P.blob(q(sx * 12, y), w * S / S, 9, 'skin', { shade: 'sphere', line: true });
    }
    P.fold([q(0, -200), q(0, -118)], 'skin');
    // pectorales con su pliegue inferior, clavículas y trapecios
    for (const sx of [-1, 1]) {
      P.blob(q(sx * 28, -186), 31 * br, 24 * br, 'skin', { shade: 'sphere', line: true });
      P.fold(bez(q(sx * 6, -170), q(sx * 28, -164), q(sx * 52, -176), 4), 'skin');
      P.blob(q(sx * 28, -218), 24, 11, 'skin', { shade: 'sphere', line: true });                       // trapecio
      P.fold([q(sx * 8, -208), q(sx * 30, -212), q(sx * 48, -206)], 'skin');                        // clavícula
    }
    // cinturón de placas con hebilla de magma
    P.poly([q(-44, -118), q(44, -118), q(40, -100), q(-40, -100)], 'horn', { shade: 'vol', line: true });
    P.blob(q(0, -109), 12, 11, 'magma', { shade: 'sphere', line: true });
    P.emit({ blob: [q(0, -109), 4 * S, 4 * S] });
    // grietas de magma: laten con kp.glow (más y más anchas cuanto mayor la forma)
    P.emit({ line: [q(-6, -204), q(-2, -190), q(-12, -174), q(-4, -160)] });
    P.emit({ line: [q(6, -200), q(10, -184), q(2, -170)] });
    if (g > .4 || F > 1) { P.emit({ line: [q(-12, -174), q(-28, -168), q(-38, -156)] }); P.emit({ line: [q(10, -184), q(26, -178), q(34, -164)] }); }
    if (g > .75 || F > 1) { P.emit({ line: [q(-4, -156), q(-10, -142), q(-2, -128)] }); P.emit({ px: [q(-38, -156), q(34, -164), q(-2, -128)].flatMap(p => [p, [p[0] + 1, p[1]], [p[0], p[1] + 1]]) }); }
    // armadura de pecho
    if (F >= 2) {
      for (const sx of [-1, 1]) {
        P.smooth([q(sx * 4, -204), q(sx * 30, -214), q(sx * 56, -200), q(sx * 54, -178), q(sx * 30, -166), q(sx * 6, -176)], 'plate', { n: 3, line: true });
        P.fold([q(sx * 16, -200), q(sx * 36, -196), q(sx * 46, -186)], 'plate');
        P.poly([q(sx * 12, -172), q(sx * 30, -166), q(sx * 22, -156)], 'plate', { shade: 'vol', line: true });
      }
      P.emit({ line: [q(-6, -204), q(-5, -190), q(-7, -176)] }); P.emit({ line: [q(6, -204), q(5, -190), q(7, -176)] });
      P.emit({ line: [q(-52, -200), q(-30, -192), q(-6, -190)] }); P.emit({ line: [q(52, -200), q(30, -192), q(6, -190)] });
      // gorguera: aro de placas en el cuello
      P.poly([q(-26, -222), q(26, -222), q(34, -210), q(0, -204), q(-34, -210)], 'plate', { shade: 'vol', line: true });
    }
    if (F === 3) {                                                          // núcleo de magma en la coraza y costillas de obsidiana
      P.blob(q(0, -186), 17, 17, 'magma', { shade: 'sphere', line: true });
      P.emit({ blob: [q(0, -186), (7 + g * 3) * S, (7 + g * 3) * S] });
      for (const sx of [-1, 1]) for (const y of [-160, -146, -132]) { P.poly([q(sx * 6, y), q(sx * 30, y - 4), q(sx * 28, y + 4), q(sx * 8, y + 7)], 'plate', { shade: 'vol', line: true }); P.emit({ line: [q(sx * 10, y + 1), q(sx * 26, y - 1)] }); }
    }

    // ================= brazos y hombreras =================
    P.layer('near');
    const arm = (sx, ang) => {
      const lift = sx === 1 ? tw * 5 : -tw * 5;                              // la torsión sube un hombro y baja el otro
      const sh = q(sx * 70, -200 - lift), aU = max(-14, 12 + ang * .8 + (sx === 1 ? tw * 4 : -tw * 4)), aL = aU + 24 + ang * .3;
      const vU = [sx * dir(aU)[0], dir(aU)[1]], vL = [sx * dir(aL)[0], dir(aL)[1]];
      const el = add(sh, vU, 64), ha = add(el, vL, 60);
      const rU = Math.atan2(el[1] - sh[1], el[0] - sh[0]) / D, rL = Math.atan2(ha[1] - el[1], ha[0] - el[0]) / D;
      limb(P, sh, el, 52 * S, 40 * S, 'skin');
      P.blob(add(sh, vU, 26), 31 * S, 20 * S, 'skin', { shade: 'sphere', rot: rU, line: true });                  // bíceps
      P.blob(add(sh, vU, 40), 22 * S, 14 * S, 'skin', { shade: 'sphere', rot: rU, line: true });                  // tríceps / vasto
      P.fold([add(sh, vU, 12), add(sh, vU, 46)], 'skin'); P.fold(bez(add(sh, vU, 20), add(sh, [vU[0] * .2, 1], 28), add(el, vU, -8), 3), 'skin');
      limb(P, el, ha, 42 * S, 30 * S, 'skin');
      P.blob(add(el, vL, 18), 26 * S, 15 * S, 'skin', { shade: 'sphere', rot: rL, line: true });                  // antebrazo
      P.blob(el, 16 * S, 15 * S, 'skin', { shade: 'sphere' });
      P.poly([add(el, [sx * .3, -1], 9), add(el, [sx * .9, -.45], 25), add(el, [sx * .5, .5], 9)], 'horn', { shade: 'vol', line: true });  // espolón del codo
      P.fold([add(el, vL, 8), add(el, vL, 36)], 'skin');
      // brazalete (basalto con juntas de magma a partir de la forma 2)
      const br0 = add(el, vL, 30), br1 = add(ha, vL, -4);
      if (F === 1) P.cap(br0, br1, 36 * S, 32 * S, 'horn', { shade: 'cyl', line: true });
      else {
        P.cap(add(el, vL, 12), br1, 44 * S, 34 * S, 'plate', { shade: 'cyl', line: true });
        P.emit({ line: [add(el, vL, 18), add(el, vL, 44)] });
        for (const t of [-1, 1]) P.poly([add(el, [sx * (vL[0] * sx + t * .5) * 0 + vL[0] * sx * 1, vL[1]], 30), add(el, [vL[0] + t * .9, vL[1] * .4], 44), add(el, vL, 38)], 'plate', { shade: 'vol' });
      }
      // mano: palma, cuatro dedos en garra y pulgar
      P.blob(ha, 21 * S, 18 * S, 'skin', { shade: 'sphere', line: true });
      for (const [off, len] of [[-36, 24], [-12, 30], [12, 30], [34, 24]]) {
        const a0 = aL + off * (sx === 1 ? 1 : 1), v0 = [sx * dir(a0)[0], dir(a0)[1]], base = add(ha, v0, 12), a1 = a0 - 30, v1 = [sx * dir(a1)[0], dir(a1)[1]];
        const mid = add(base, v0, len * .55), tip = add(mid, v1, len * .5);
        const gF = P.group(true); P.cap(base, mid, 10 * S, 7 * S, 'skin', { line: true, group: gF }); P.cap(mid, tip, 7 * S, 4 * S, 'skin', { line: true, group: gF });
        P.poly([add(tip, [-v1[1] * .6, v1[0] * .6], 3), add(tip, v1, 13), add(tip, [v1[1] * .6, -v1[0] * .6], 3)], 'bone', { shade: 'vol' });
      }
      P.blob(add(ha, vL, 14), 8 * S, 6 * S, 'bone', { shade: 'sphere' });
      // hombrera: cuerno (forma 1), basalto con pinchos y anillo de magma (2 y 3)
      const big = F === 1 ? 29 : F === 2 ? 34 : 40;
      P.blob(sh, big * S, (big - 5) * S, F === 1 ? 'horn' : 'plate', { shade: 'sphere', line: true });
      if (F >= 2) { P.emit({ line: bez(add(sh, [-sx, .2], big * .62), add(sh, [0, -1], big * .75), add(sh, [sx, .2], big * .62), 5) }); P.fold([add(sh, [-sx * .4, 1], 14), add(sh, [sx * .2, .5], 18)], 'plate'); }
      const nSp = F === 1 ? 2 : F === 2 ? 3 : 4;
      for (let i = 0; i < nSp; i++) {
        const a = -(i / max(1, nSp - 1)) * 1.1 + .1, v = [sx * cos(a), sin(a) - .3], vl = Math.hypot(v[0], v[1]), vn = [v[0] / vl, v[1] / vl], pr = [-vn[1], vn[0]], l = (F === 1 ? 30 : 36 + F * 4) - i * 5;
        const c0 = add(sh, vn, big * .55);
        P.poly([add(c0, pr, 8), add(sh, vn, big * .55 + l), add(c0, pr, -8)], F === 1 ? 'horn' : 'plate', { shade: 'vol', line: true });
      }
      P.emit({ blob: [sh, 4 * S, 4 * S] });
      return ha;
    };
    const hF = arm(-1, k.armF), hN = arm(1, k.armN);
    P.anchor('hands', hN); P.anchor('handsF', hF);

    // ================= cabeza y cuernos =================
    P.layer('top');
    limb(P, q(0, -214), hp(0, 20), 54 * S, 44 * S, 'skin');                                                // cuello
    // cuernos: se pintan antes del cráneo para que las raíces queden tapadas
    const cuerno = (pts, w0, w1, ex = {}) => {
      const cr = tube(P, pts.map(([x, y]) => hp(x, y)), w0 * S, w1 * S, 'horn', { line: true });
      if (ex.rings) for (let i = 4; i < cr.length - 3; i += 3) P.fold([add(cr[i], [-.7, .7], 5), add(cr[i], [.7, -.7], 5)], 'horn');
      if (ex.vein) P.emit({ line: cr.filter((_, i) => i > 2 && i < cr.length - 3 && i % 1 === 0) });
    };
    for (const sx of [-1, 1]) {
      if (F >= 2) cuerno([[sx * 36, -10], [sx * 74, -22], [sx * 100, -8], [sx * 106, 18], [sx * 92, 30]], 32, 6, { rings: true });                 // cuerno de carnero
      if (F === 3) cuerno([[sx * 24, -44], [sx * 40, -72], [sx * 30, -100], [sx * 8, -112]], 22, 4);                                              // cuerno interior curvado
      cuerno([[sx * 24, -34], [sx * 54, -58], [sx * (64 + F * 3), -92], [sx * (46 + F * 4), -(90 + F * 8)]], 36, 5, { rings: F >= 2, vein: F === 3 });
      cuerno([[sx * 14, -44], [sx * 26, -72], [sx * 22, -92]], 19, 3);
      cuerno([[sx * 36, 8], [sx * 58, 14], [sx * 70, -6]], 15, 4);                                                                                 // cuerno de pómulo
    }
    // orejas puntiagudas
    for (const sx of [-1, 1]) P.poly([hp(sx * 40, -6), hp(sx * 66, -22), hp(sx * 56, 4), hp(sx * 40, 12)], 'skin', { shade: 'vol', line: true });
    // cráneo, frente prominente, pómulos y mandíbula
    P.blob(hp(0, -4), 47, 41, 'skin', { shade: 'sphere' });
    for (const sx of [-1, 1]) P.blob(hp(sx * 30, 14), 17, 14, 'skin', { shade: 'sphere', line: true });             // pómulos
    P.smooth([hp(-34, 6), hp(-30, 28), hp(-16, 42), hp(0, 46), hp(16, 42), hp(30, 28), hp(34, 6)], 'skin', { n: 3 });
    P.fold([hp(0, -40), hp(0, -26)], 'skin');
    // corona de fuego (forma 3): lenguas curvas de magma tras los pinchos, se mueven con la fase
    if (F === 3) for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 13, hh = 30 + (2 - abs(i - 2)) * 12 + g * 8 + sin(ph + i * 1.7) * 5, sw = sin(ph + i * 2.1) * 6 + (i - 2) * 2;
      const b0 = hp(x, -40), tip = hp(x + sw, -40 - hh), ml = hp(x - 8 + sw * .3, -40 - hh * .5), mr = hp(x + 8 + sw * .6, -40 - hh * .55);
      P.poly([hp(x - 8, -36), ml, tip, mr, hp(x + 8, -36)], 'magma', { shade: 'flat', tone: i % 2 ? 3 : 2 });
      P.emit({ poly: [hp(x - 4, -38), hp(x - 3 + sw * .3, -40 - hh * .45), hp(x + sw * .8, -40 - hh * .8), hp(x + 3 + sw * .5, -40 - hh * .45), hp(x + 4, -38)] });
      void b0;
    }
    // corona de pinchos sobre la frente
    const nCor = F === 1 ? 3 : 5;
    for (let i = 0; i < nCor; i++) {
      const x = (i - (nCor - 1) / 2) * (F === 3 ? 11 : 14), hh = 26 + (nCor - 1 - abs(i * 2 - (nCor - 1))) * 4 + (F - 1) * 6;
      P.poly([hp(x - 7, -38 + abs(x) * .1), hp(x * 1.15, -38 - hh * .85), hp(x + 7, -38 + abs(x) * .1)], 'horn', { shade: 'vol', line: true });
      if (F >= 2) P.emit({ px: [hp(x * 1.05, -38 - hh * .55)] });
    }
    // ceño de piel y ojos de brasa (con brillo blanco)
    for (const sx of [-1, 1]) {
      P.poly([hp(sx * 44, -24), hp(sx * 3, -6), hp(sx * 3, 3), hp(sx * 40, -9)], 'horn', { shade: 'vol', line: true });
      P.fold([hp(sx * 34, 12), hp(sx * 40, 26)], 'skin'); P.fold([hp(sx * 14, 12), hp(sx * 22, 30)], 'skin');           // pómulo marcado
      P.emit({ poly: [hp(sx * 7, 1), hp(sx * 30, -10), hp(sx * 34, -3), hp(sx * 10, 9)] });
      P.line([hp(sx * 22, -4), hp(sx * 22, -3)], 'white', 2);
      P.line([hp(sx * 6, 20), hp(sx * 7, 27)], 'horn', 0);
    }
    if (F === 3) { P.emit({ blob: [hp(0, -26), 4 * S, 6 * S] }); P.line([hp(0, -28), hp(0, -27)], 'white', 2); }  // tercer ojo
    // boca: la mandíbula inferior baja con kp.mouth; dentro, magma y colmillos
    const op = 4 + k.mouth * 22;
    P.poly([hp(-24, 28), hp(24, 28), hp(20, 28 + op), hp(0, 31 + op), hp(-20, 28 + op)], 'horn', { shade: 'flat', tone: 0, line: true });
    P.emit({ poly: [hp(-13, 30 + op * .35), hp(13, 30 + op * .35), hp(8, 28 + op * .85), hp(-8, 28 + op * .85)] });
    for (const x of [-18, -9, 9, 18]) P.poly([hp(x - 3.5, 28), hp(x, 28 + 8 + (abs(x) > 12 ? 4 : 0)), hp(x + 3.5, 28)], 'bone', { shade: 'vol' });
    P.poly([hp(-22, 28 + op), hp(0, 31 + op + 8), hp(22, 28 + op), hp(14, 32 + op + 14), hp(0, 31 + op + 20), hp(-14, 32 + op + 14)], 'skin', { shade: 'vol', line: true });  // mentón
    for (const sx of [-1, 1]) {
      P.poly([hp(sx * 18, 28 + op), hp(sx * 15, 28 + op - 12), hp(sx * 12, 28 + op)], 'bone', { shade: 'vol' });
      P.poly([hp(sx * 24, 28 + op), hp(sx * 30, 28 + op - 18), hp(sx * 20, 28 + op - 4)], 'bone', { shade: 'vol', line: true });                // colmillo de abajo
    }
    P.poly([hp(-8, 34 + op + 14), hp(0, 34 + op + 34 + F * 2), hp(8, 34 + op + 14)], 'horn', { shade: 'vol', line: true });                        // perilla
    P.anchor('eyes', hp(0, 2)); P.anchor('core', q(0, -186)); P.anchor('mouth', hp(0, 30 + op * .5)); P.anchor('head', hp(0, 0)); P.anchor('crown', hp(0, -60));
    // brasas flotantes (forma 3): píxeles sueltos que suben con la fase
    if (F === 3) for (let i = 0; i < 7; i++) { const t = (ph / TAU + i * .31) % 1; P.emit({ px: [q(-150 + i * 50 + sin(i * 3.1) * 12, -150 - t * 190)] }); }
  },
  fx: {},
};
