// Rey Demonio «Ysgrim» (Escarcha Negra): arte 16 bits de las TRES formas (paquete K-YSG).
// Vista frontal y simétrica. Silueta: figura alta y esbelta con capa-campana rasgada que llega al suelo, cornamenta de
// carámbano en vertical (como astas) y abanico de cuchillas de cristal en la espalda. Sin alas de murciélago ni piernas.
//   Forma 1: espectro demacrado de armadura de hielo negro, capa rasgada, astas cortas y cuchilla de muñeca.
//   Forma 2: hombreras de cristal, gorguera con pinchos, astas ramificadas, abanico de 3 cuchillas por lado y esquirlas en órbita.
//   Forma 3: coraza de cristal con núcleo helado, halo de pinchos tras la cabeza, astas enormes, abanico de 5 cuchillas,
//            ojo de escarcha en la frente, esquirlas en órbita y cristales brotando del suelo.
// Contrato (docs/arena-v12-arquitectura.md 3.7 y 3.8): size(forma), ramps(forma), emit(forma), draw(P, ctx) con ctx.kp.
// Guía de estilo: docs/arena-estilo-16bits.md (apartado «Reyes»). Solo se importa de '../kit16/*'.
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max;
const SCALE = [0, .78, .84, .87];                    // alto con astas: forma 1 ~255 px, forma 2 ~310 px, forma 3 ~345 px

// ---------- utilidades geométricas (puras) ----------
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const bez = (a, c, b, n = 5) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } return o; };
function crv(p, n = 3) {                              // Catmull-Rom
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
// Cinta curva con ancho variable y una línea de luz en el lado iluminado (barata: un solo polígono).
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
const limb = (P, a, b, w0, w1, m, o = {}) => tube(P, [a, b], w0, w1, m, o, undefined, 1);

export default {
  id: 'ysgrim',
  kit: 1,
  ready: true,
  // piel gris violeta, hielo negro (armadura), cristal de hielo, escarcha (casi blanco), tela de la capa
  materials: ['skin', 'dark', 'ice', 'frost', 'cloth'],
  // celda ajustada a la pose más extendida de cada forma (roar/beam con los brazos abiertos), con 6 px de margen
  size: form => ({ w: [0, 420, 470, 504][form], h: [0, 291, 350, 400][form], gx: [0, 200, 226, 244][form], gy: [0, 279, 328, 362][form] }),
  ramps: form => ({
    skin: ramp5(['#14122a', '#2a2848', '#4a4a6a', '#7a7aa0', '#a8aed4']),
    dark: form === 3 ? ramp5(['#04030a', '#0a0818', '#16142c', '#2a2850', '#46427a']) : ramp5(['#05040c', '#0e0c1c', '#1c1a34', '#33305a', '#524e84']),
    ice: form === 3 ? ramp5(['#18306a', '#3260b0', '#6aa4f0', '#b0d8ff', '#f0faff']) : ramp5(['#1c2a5a', '#3a5aa0', '#6e90e0', '#a8c4ff', '#e8f0ff']),
    frost: ramp5(['#4a5a88', '#8a9ccc', '#bccaf0', '#e0eaff', '#ffffff']),
    cloth: ramp5(['#0a0818', '#18142e', '#2c2650', '#443c72', '#675d98']),
  }),
  emit: form => (form === 3 ? '#cfe4ff' : '#9ab0ff'),
  // Retoques de pose propios (peso, torsión de hombros, cabeza). Se suman a los parámetros del kit.
  poseOverride(form, anim, i) {
    switch (anim) {
      case 'idle': return { dx: [-1, 0, 1, 0][i], hd: [0, 1, 2, 1][i], tw: [-.3, 0, .3, 0][i] };
      case 'hit': return { dy: [6, 3][i], hd: [-9, -4][i], tw: [1, .5][i] };
      case 'lean': return { dy: 3, hd: -3, tw: -1 };
      case 'claw': return { dy: [4, 3, 1][i], hd: [-3, 8, 4][i], tw: [-1, 1, .6][i] };
      case 'lunge': return { dy: [6, 2][i], hd: [-2, 10][i], tw: [-.6, 1][i] };
      case 'roar': return { dy: [-1, -4][i], hd: [-8, -13][i], tw: 0, armN: [46, 66][i], armF: [46, 66][i] };       // brazos abiertos y cabeza atrás
      case 'charge': return { dy: [3, 5][i], hd: [2, 4][i], tw: [.3, -.3][i] };
      case 'beam': return { dy: [4, 5][i], hd: [6, 8][i], tw: 0 };
      case 'cast': return { dy: [3, -1, 2][i], hd: [-2, -6, 3][i], tw: [-.8, 0, .8][i] };
      default: return {};
    }
  },
  draw(P, ctx) {
    const k = ctx.kp, F = ctx.form, S = SCALE[F] || .85, ph = ctx.phase * TAU, g = k.glow;
    const X = k.dx, Y = k.dy, hd = k.hd || 0, tw = k.tw || 0, b = k.breathe, br = 1 + b * .03, wv = k.wing;
    const dir = a => [sin(a * D), cos(a * D)];
    const q = (x, y, hx = 0, hy = 0) => [(x + X + k.lean * .9 * max(0, min(1.5, (-y - 110) / 100)) + hx) * S, (y + Y + hy) * S];
    const add = (p, v, n) => [p[0] + v[0] * n * S, p[1] + v[1] * n * S];
    const hp = (x, y) => q(x, y - 236, k.lean * .5, -b * 1.2 + hd * .55);   // cabeza: coordenadas relativas a su centro
    // cuchilla de cristal: rombo alargado que parte de base hacia tip
    const blade = (base, tip, w, m, o = {}) => {
      const v = [tip[0] - base[0], tip[1] - base[1]], l = Math.hypot(v[0], v[1]) || 1, pr = [-v[1] / l, v[0] / l];
      P.poly([[base[0] + pr[0] * w, base[1] + pr[1] * w], lerp(base, tip, .38).map((c, i) => c + pr[i] * w * 1.15), tip, lerp(base, tip, .38).map((c, i) => c - pr[i] * w * 1.15), [base[0] - pr[0] * w, base[1] - pr[1] * w]], m, { shade: 'vol', ...o });
    };

    // ================= capa lejana: halo, abanico de cuchillas, esquirlas =================
    P.layer('far');
    if (F === 3) {                                                           // halo de pinchos tras la cabeza
      const c = hp(0, -6), n = 16;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + .2;
        if (sin(a) > .62) continue;                                          // abajo queda tapado por los hombros
        const v = [cos(a), sin(a)], pr = [-v[1], v[0]], r0 = 66 * S, len = (30 + (i % 2) * 24 + sin(ph + i * .9) * 3) * S;
        P.poly([[c[0] + v[0] * r0 + pr[0] * 8 * S, c[1] + v[1] * r0 + pr[1] * 8 * S], [c[0] + v[0] * (r0 + len), c[1] + v[1] * (r0 + len)], [c[0] + v[0] * r0 - pr[0] * 8 * S, c[1] + v[1] * r0 - pr[1] * 8 * S]], 'ice', { shade: 'vol' });
      }
      for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; if (sin(a) > .6) continue; P.emit({ px: [[c[0] + cos(a) * 66 * S, c[1] + sin(a) * 66 * S]] }); }
    }
    if (F >= 2) for (const sx of [-1, 1]) {                                  // cuchillas de cristal que salen de la espalda
      const nB = F === 2 ? 3 : 5, base = q(sx * 24, -190);
      for (let i = 0; i < nB; i++) {
        const a = (F === 2 ? 22 : 12) + i * (F === 2 ? 22 : 17) + wv * 6 + sin(ph + i * 1.1 + (sx > 0 ? .6 : 0)) * 1.4, l = (F === 2 ? 104 : 118) + (i === 1 ? 20 : 0) - i * (F === 2 ? 6 : 5);
        const v = [sx * sin(a * D), -cos(a * D)], tip = add(base, v, l);
        blade(base, tip, 11 * S, 'ice', {});
        if (F === 3 || g > .5) P.emit({ line: [lerp(base, tip, .2), lerp(base, tip, .78)] });
      }
    }
    if (F >= 2) {                                                            // esquirlas flotando en órbita
      const nS = F === 2 ? 3 : 6;
      for (let i = 0; i < nS; i++) {
        const a = ph + i * TAU / nS, cx = cos(a) * (120 + (i % 2) * 22), cy = -150 - sin(a * 2) * 40 - (i % 3) * 26, c = q(cx, cy), s = (9 + (i % 3) * 3) * S;
        P.poly([[c[0], c[1] - s * 2], [c[0] + s * .7, c[1]], [c[0], c[1] + s * 1.5], [c[0] - s * .7, c[1]]], 'ice', { shade: 'vol', line: true });
      }
    }

    // ================= capa de cuerpo: capa-campana, faldón, torso =================
    P.layer('body');
    const sw = k.tail * .5 + sin(ph) * 2;                                     // vaivén del bajo de la capa
    {
      const nT = 11, hem = [];
      for (let i = 0; i <= nT; i++) {
        const t = i / nT, x = -104 + t * 208, tip = i % 2 === 0;
        hem.push([(x + sw * (tip ? .6 : .3) + X * .3) * S, (tip ? 2 : -16 - (i % 4) * 2) * S]);
      }
      // el bajo va de izquierda a derecha; los laterales ya están en orden
      const body = [q(-28, -208), q(-58, -196), q(-70, -150), q(-86, -80), ...hem, q(86, -80), q(70, -150), q(58, -196), q(28, -208)];
      P.poly(body, 'cloth', { shade: 'vol' });
      // pliegues largos de la tela y borde escarchado del bajo
      for (const x of [-72, -48, -22, 0, 22, 48, 72]) P.fold([q(x * .5, -150), q(x * .8 + sw * .3, -80), q(x * 1.05 + sw * .5, -26)], 'cloth');
      P.line(hem, 'frost', 3, {});
      for (let i = 0; i <= nT; i += 2) P.poly([[hem[i][0] - 5 * S, hem[i][1] - 8 * S], [hem[i][0], hem[i][1] + 5 * S], [hem[i][0] + 5 * S, hem[i][1] - 8 * S]], 'frost', { shade: 'flat', tone: 3 });
    }
    // cristales que brotan del suelo (forma 3)
    if (F === 3) for (const sx of [-1, 1]) for (const [x, h, w] of [[118, 54, 11], [142, 34, 8]]) {
      const bs = [(sx * x + X * .2) * S, 0];
      P.poly([[bs[0] - w * S, bs[1]], [bs[0] - w * .3 * S, bs[1] - h * S], [bs[0] + w * .5 * S, bs[1] - h * .8 * S], [bs[0] + w * S, bs[1]]], 'ice', { shade: 'vol', line: true });
    }
    // faldón de placas de hielo negro bajo el cinturón
    for (const x of [-30, -10, 10, 30]) {
      const w = abs(x) < 20 ? 11 : 9, y1 = -52 - (abs(x) < 20 ? 18 : 6);
      P.poly([q(x - w, -112), q(x + w, -112), q(x + w * .6, y1), q(x, y1 - 12 - F * 2), q(x - w * .6, y1)], 'dark', { shade: 'vol', line: true });
      if (F >= 2) P.emit({ line: [q(x, -108), q(x, y1 - 4)] });
    }
    // torso demacrado: cadera y cintura finas, caja torácica en «V» no muy ancha
    const tl = [[-17, -112], [-20, -136], [-30, -162], [-44, -184], [-48, -200], [-30, -212], [-12, -216], [12, -216], [30, -212], [48, -200], [44, -184], [30, -162], [20, -136], [17, -112]];
    P.smooth(tl.map(([x, y]) => q(x * (y < -150 ? br : 1), y)), F === 1 ? 'skin' : 'dark', { n: 3 });
    // costillas visibles, pecho hundido y esternón
    for (const sx of [-1, 1]) {
      for (const [y, w] of [[-188, 22], [-172, 20], [-156, 17], [-142, 13]]) P.poly([q(sx * 4, y), q(sx * w, y - 5), q(sx * (w - 3), y + 3), q(sx * 6, y + 6)], F === 1 ? 'skin' : 'dark', { shade: 'vol', line: true });
    }
    P.fold([q(0, -206), q(0, -128)], F === 1 ? 'skin' : 'dark');
    // peto: placas de hielo negro con veta de cristal (formas 1-3 progresivas)
    for (const sx of [-1, 1]) {
      P.smooth([q(sx * 3, -208), q(sx * 30, -208), q(sx * 42, -192), q(sx * 30, -170), q(sx * 8, -176)], 'dark', { n: 2, line: true });
      P.fold([q(sx * 12, -204), q(sx * 28, -196), q(sx * 34, -186)], 'dark');
      if (F >= 2) P.poly([q(sx * 12, -160), q(sx * 28, -150), q(sx * 20, -134), q(sx * 8, -140)], 'ice', { shade: 'vol', line: true });
    }
    // cinturón de hielo y hebilla de cristal
    P.poly([q(-26, -122), q(26, -122), q(24, -106), q(-24, -106)], 'dark', { shade: 'vol', line: true });
    P.poly([q(0, -126), q(10, -114), q(0, -100), q(-10, -114)], 'ice', { shade: 'vol', line: true });
    P.emit({ blob: [q(0, -114), 2.5 * S, 3.5 * S] });
    // núcleo de escarcha en el pecho (late con kp.glow)
    P.poly([q(0, -194), q(12, -172), q(0, -150), q(-12, -172)], 'ice', { shade: 'vol', line: true });
    P.emit({ poly: [q(0, -186), q(5, -172), q(0, -160), q(-5, -172)] });
    if (F >= 2 || g > .6) { P.emit({ line: [q(-4, -170), q(-18, -160), q(-26, -148)] }); P.emit({ line: [q(4, -170), q(20, -158), q(24, -146)] }); }
    if (F === 3) { P.emit({ line: [q(0, -150), q(-4, -138), q(2, -126)] }); P.emit({ line: [q(-12, -172), q(-34, -176), q(-42, -190)] }); P.emit({ line: [q(12, -172), q(34, -176), q(42, -190)] }); }
    // gorguera de pinchos de cristal alrededor del cuello
    for (const sx of [-1, 1]) {
      for (const [x, h, a] of F === 1 ? [[16, 22, .3]] : [[16, 22 + F * 6, .3], [26, 16 + F * 5, .8], [34, 10 + F * 4, 1.2]]) {
        const v = [sx * sin(a), -cos(a)], b0 = q(sx * x, -210);
        P.poly([add(b0, [-v[1], v[0]], 5), add(b0, v, h), add(b0, [v[1], -v[0]], 5)], 'ice', { shade: 'vol', line: true });
      }
    }

    // ================= brazos y hombreras =================
    P.layer('near');
    const arm = (sx, ang) => {
      const lift = sx === 1 ? tw * 5 : -tw * 5;
      const sh = q(sx * 52, -196 - lift), aU = max(-10, 8 + ang * .8 + (sx === 1 ? tw * 4 : -tw * 4)), aL = aU + 22 + ang * .3;
      const vU = [sx * dir(aU)[0], dir(aU)[1]], vL = [sx * dir(aL)[0], dir(aL)[1]];
      const el = add(sh, vU, 70), ha = add(el, vL, 76);
      limb(P, sh, el, 28 * S, 20 * S, 'skin');
      P.fold([add(sh, vU, 12), add(sh, vU, 50)], 'skin');
      limb(P, el, ha, 26 * S, 17 * S, F === 1 ? 'skin' : 'dark');
      P.blob(el, 12 * S, 11 * S, 'dark', { shade: 'sphere', line: true });
      P.poly([add(el, [sx * .3, -1], 7), add(el, [sx * .95, -.45], 24 + F * 4), add(el, [sx * .5, .5], 7)], 'ice', { shade: 'vol', line: true });      // espolón de cristal del codo
      P.cap(add(el, vL, 22), add(ha, vL, -6), 28 * S, 22 * S, 'dark', { shade: 'cyl', line: true });                                                  // guantelete
      P.emit({ line: [add(el, vL, 26), add(ha, vL, -12)] });
      // mano huesuda con tres garras de hielo y cuchilla de muñeca
      P.blob(ha, 13 * S, 12 * S, 'skin', { shade: 'sphere', line: true });
      for (const off of [-34, 0, 34]) {
        const a0 = aL + off, v0 = [sx * dir(a0)[0], dir(a0)[1]], pr = [-v0[1], v0[0]];
        P.poly([add(add(ha, v0, 8), pr, 3.5), add(ha, v0, 40 + F * 4 - abs(off) * .2), add(add(ha, v0, 8), pr, -3.5)], 'frost', { shade: 'vol', line: true });
      }
      const bl = 38 + F * 12, bt = add(ha, vL, bl);
      blade(add(ha, vL, 4), bt, 8 * S, 'ice', { line: true });
      if (F >= 2) P.emit({ line: [add(ha, vL, 14), add(ha, vL, bl - 10)] });
      // hombrera: placa de hielo negro y racimo de cristales
      P.blob(sh, (20 + F * 3) * S, (16 + F * 2) * S, 'dark', { shade: 'sphere', line: true });
      const nC = F === 1 ? 2 : F === 2 ? 3 : 4;
      for (let i = 0; i < nC; i++) {
        const a = 18 + i * (F === 3 ? 20 : 26), v = [sx * sin(a * D), -cos(a * D)], l = (F === 1 ? 44 : F === 2 ? 62 : 80) - i * 8 + (i === 0 ? 8 : 0), c0 = add(sh, v, 8);
        blade(c0, add(sh, v, l), (6 + F) * S, 'ice', { line: true });
        if (F === 3) P.emit({ line: [add(sh, v, 18), add(sh, v, l - 14)] });
      }
      P.emit({ blob: [sh, 2.5 * S, 2.5 * S] });
      return ha;
    };
    const hF = arm(-1, k.armF), hN = arm(1, k.armN);
    P.anchor('hands', hN); P.anchor('handsF', hF);

    // ================= cabeza, astas y barba de carámbanos =================
    P.layer('top');
    limb(P, q(0, -208), hp(0, 24), 22 * S, 18 * S, 'skin');
    // astas de carámbano: se pintan antes del cráneo para que las raíces queden tapadas
    const asta = (pts, w0, w1, tines) => {
      const cr = tube(P, pts.map(([x, y]) => hp(x, y)), w0 * S, w1 * S, 'ice', { line: true });
      for (const [i, dx, dy, l] of tines) {
        const p0 = cr[min(cr.length - 2, i)], p1 = add(p0, [dx, dy], l);
        blade(p0, p1, 4.5 * S, 'ice', { line: true });
      }
      return cr;
    };
    const aW = [1, 1.1, 1.3][F - 1];             // la cornamenta crece con la forma
    for (const sx of [-1, 1]) {
      const Ha = [0, 74, 98, 124][F], beam = [[sx * 16, -32], [sx * 34 * aW, -.3 * Ha - 14], [sx * 28 * aW, -.58 * Ha - 14], [sx * 46 * aW, -.82 * Ha - 14], [sx * 40 * aW, -Ha - 20]];
      asta(beam, 20, 3, F === 1 ? [[6, sx * .7, -.7, 30], [10, sx * .8, -.6, 24]] : F === 2 ? [[4, sx * .8, -.6, 40], [8, sx * .85, -.5, 34], [12, sx * .6, -.8, 28], [15, -sx * .3, -.95, 26]] : [[3, sx * .85, -.5, 52], [6, sx * .9, -.4, 44], [9, sx * .7, -.7, 40], [12, sx * .8, -.6, 34], [15, sx * .5, -.85, 30], [18, -sx * .3, -.95, 28]]);
      if (F >= 2) asta([[sx * 26, -22], [sx * 70, -30], [sx * 94, -52], [sx * 96, -82]], 14, 3, F === 3 ? [[4, sx * .7, -.7, 24], [8, sx * .9, -.4, 20]] : []);   // asta lateral
    }
    const cen = [hp(-8, -40), hp(0, -(54 + F * 14)), hp(8, -40)];             // pincho central de la frente
    blade(hp(0, -34), cen[1], 8 * S, 'frost', { line: true });
    // capucha de hielo negro tras el cráneo
    P.smooth([hp(-38, 0), hp(-36, -42), hp(-16, -64), hp(16, -64), hp(36, -42), hp(38, 0), hp(26, 24), hp(-26, 24)], 'dark', { n: 3, line: true });
    // cráneo alargado, pómulos hundidos, mandíbula afilada
    P.blob(hp(0, -4), 30, 36, 'skin', { shade: 'sphere' });
    for (const sx of [-1, 1]) { P.fold([hp(sx * 22, 8), hp(sx * 17, 20), hp(sx * 10, 30)], 'skin'); P.fold([hp(sx * 14, 12), hp(sx * 9, 22)], 'skin'); }
    P.smooth([hp(-20, 14), hp(-14, 34), hp(0, 42), hp(14, 34), hp(20, 14)], 'skin', { n: 3 });
    // cresta de frente: placa de hielo negro con gema (ojo de escarcha en la forma 3)
    P.poly([hp(-30, -22), hp(0, -34), hp(30, -22), hp(26, -14), hp(0, -22), hp(-26, -14)], 'dark', { shade: 'vol', line: true });
    P.poly([hp(0, -42), hp(7, -28), hp(0, -16), hp(-7, -28)], 'ice', { shade: 'vol', line: true });
    P.emit({ blob: [hp(0, -28), (F === 3 ? 3 : 1.6) * S, (F === 3 ? 5 : 2.6) * S] });
    // ojos: cuencas hundidas con llama de escarcha y brillo blanco; nariz de calavera
    for (const sx of [-1, 1]) {
      P.poly([hp(sx * 3, -9), hp(sx * 27, -15), hp(sx * 29, 3), hp(sx * 6, 9)], 'dark', { shade: 'flat', tone: 0 });
      P.emit({ poly: [hp(sx * 7, -4), hp(sx * 23, -10), hp(sx * 24, -4), hp(sx * 9, 3)] });
      P.line([hp(sx * 19, -8), hp(sx * 19, -7)], 'white', 2);
    }
    P.poly([hp(-4, 8), hp(4, 8), hp(0, 18)], 'dark', { shade: 'flat', tone: 0 });
    // boca: la mandíbula baja con kp.mouth; dentro, escarcha y colmillos de hielo
    const op = 3 + k.mouth * 20;
    P.poly([hp(-15, 26), hp(15, 26), hp(12, 26 + op), hp(0, 28 + op), hp(-12, 26 + op)], 'dark', { shade: 'flat', tone: 0, line: true });
    P.emit({ poly: [hp(-8, 28 + op * .3), hp(8, 28 + op * .3), hp(5, 26 + op * .85), hp(-5, 26 + op * .85)] });
    for (const x of [-11, -4, 4, 11]) P.poly([hp(x - 2.5, 26), hp(x, 26 + 9 + (abs(x) < 6 ? 3 : 0)), hp(x + 2.5, 26)], 'frost', { shade: 'vol' });
    P.poly([hp(-14, 26 + op), hp(0, 30 + op + 6), hp(14, 26 + op), hp(9, 28 + op + 14), hp(0, 30 + op + 18), hp(-9, 28 + op + 14)], 'skin', { shade: 'vol', line: true });
    for (const [x, l] of [[-9, 22], [-3, 36], [3, 36], [9, 22]]) { const ll = l * (.6 + F * .25); P.poly([hp(x - 3.2, 38 + op), hp(x * 1.3, 38 + op + ll), hp(x + 3.2, 38 + op)], 'ice', { shade: 'vol', line: true }); }
    P.anchor('eyes', hp(0, -2)); P.anchor('core', q(0, -172)); P.anchor('mouth', hp(0, 28 + op * .5)); P.anchor('head', hp(0, 0)); P.anchor('crown', hp(0, -(54 + F * 14)));
    // motas de escarcha que bajan despacio (formas 2 y 3)
    if (F >= 2) for (let i = 0; i < (F === 2 ? 4 : 8); i++) { const t = (ph / TAU + i * .27) % 1; P.emit({ px: [q(-130 + i * (260 / (F === 2 ? 4 : 8)) + sin(i * 3.3) * 14, -250 + t * 230)] }); }
  },
  fx: {},
};
