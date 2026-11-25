// Rey Demonio «Tzar-Nuul» (Plaga): arte 16 bits de las TRES formas (paquete K-TZA).
// Vista frontal y simétrica. Silueta: insecto de plaga ANCHO y hinchado, de cuerpo bajo: vientre enorme con pústulas,
// patas de artrópodo abiertas, alas de mosca translúcidas con nervaduras, ojos compuestos, mandíbulas y aguijón trasero.
//   Forma 1: tórax de quitina, vientre hinchado con pústulas, 2 alas, 2 patas por lado, 2 brazos de guadaña y 4 moscas.
//   Forma 2: placas de quitina en el vientre, 4 alas, 3 patas por lado, 2.º par de brazos, antenas largas y 8 moscas.
//   Forma 3: vientre abierto en una boca con dientes, alas grandes, 4 brazos, racimo de ojos, corona de cuernos,
//            aguijón enorme y enjambre de 14 moscas.
// Contrato (docs/arena-v12-arquitectura.md 3.7 y 3.8): size(forma), ramps(forma), emit(forma), draw(P, ctx) con ctx.kp.
// Guía de estilo: docs/arena-estilo-16bits.md (apartado «Reyes»). Solo se importa de '../kit16/*'.
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max;
const SCALE = [0, .8, .9, .94];                      // alto con antenas: forma 1 ~255 px, forma 2 ~300 px, forma 3 ~340 px

// ---------- utilidades geométricas (puras) ----------
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
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
  id: 'tzar',
  kit: 1,
  ready: true,
  // carne de oliva, quitina (óxido y marrón), pus (verde amarillento), membrana de las alas, ojos compuestos, boca podrida
  materials: ['skin', 'chit', 'pus', 'wing', 'eye', 'rot'],
  // celda ajustada a la pose más extendida de cada forma (roar/beam con los brazos abiertos), con 6 px de margen
  size: form => ({ w: [0, 414, 484, 522][form], h: [0, 301, 345, 381][form], gx: [0, 214, 250, 270][form], gy: [0, 291, 335, 359][form] }),
  ramps: form => ({
    skin: form === 3 ? ramp5(['#10140a', '#2a3210', '#50601c', '#7a8c2c', '#a4b844']) : ramp5(['#141a0a', '#303c14', '#6a7a2a', '#8c9e3c', '#b6c85a']),
    chit: form === 1 ? ramp5(['#0c0804', '#24140a', '#4a2a12', '#7a4a1e', '#a8702e']) : ramp5(['#0a0604', '#201008', '#40220e', '#6a3c18', '#9a5e28']),
    pus: ramp5(['#4a5a0c', '#8a9c1a', '#c8d83c', '#e8f070', '#fbffc0']),
    wing: ramp5(['#3a4a30', '#6a7c58', '#a0b088', '#cddab0', '#f0f6dc']),
    eye: ramp5(['#2a0606', '#5c1010', '#a02020', '#d84a3a', '#ff8a70']),
    rot: ramp5(['#0a0604', '#1a0e0a', '#2e1a14', '#4a2c20', '#6a4430']),
  }),
  emit: form => '#d8e860',
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
    const X = k.dx, Y = k.dy, hd = k.hd || 0, tw = k.tw || 0, b = k.breathe, br = 1 + b * .04, wv = k.wing;
    const dir = a => [sin(a * D), cos(a * D)];                              // 0 = hacia abajo, 90 = horizontal
    const q = (x, y, hx = 0, hy = 0) => [(x + X + k.lean * .8 * max(0, min(1.5, (-y - 90) / 100)) + hx) * S, (y + Y + hy) * S];
    const add = (p, v, n) => [p[0] + v[0] * n * S, p[1] + v[1] * n * S];
    const hp = (x, y) => q(x, y - 238, k.lean * .5, -b * 1.2 + hd * .55);   // cabeza: coordenadas relativas a su centro
    // contorno de hoja: ala con base en root, dirección ang (0 = arriba, + hacia fuera), largo y ancho
    const alaPoly = (root, sx, ang, len, wid) => {
      const v = [sx * sin(ang * D), -cos(ang * D)], pr = [-v[1], v[0]], L = [], R = [], n = 7;
      for (let i = 0; i <= n; i++) {
        const t = i / n, w = wid * Math.pow(sin(Math.PI * Math.pow(t, .72)), .9) * (1 - t * .15), c = add(root, v, len * t);
        L.push(add(c, pr, w)); R.push(add(c, pr, -w));
      }
      return { pts: [...L, ...R.reverse()], tip: add(root, v, len), v, pr };
    };

    // ================= capa lejana: alas, aguijón, patas traseras =================
    P.layer('far');
    {
      const sp = wv * 8, buzz = sin(ph * 2) * 1.2;
      const alas = F === 1 ? [[1, 62, 150, 36]] : [[1, 58, 168, 40], [2, 112, 120, 30]];
      for (const sx of [-1, 1]) for (const [, a0, len, wid] of alas) {
        const root = q(sx * 26, -214), w = alaPoly(root, sx, a0 + sp + buzz * sx + (a0 > 100 ? -sp * .6 : 0), len * (F === 3 ? 1.12 : 1), wid * (F === 3 ? 1.1 : 1));
        P.poly(w.pts, 'wing', { shade: 'vol' });
        // nervaduras: una central, ramas y borde grueso
        const c0 = root, c1 = w.tip;
        P.line([c0, lerp(c0, c1, .5), c1], 'wing', 0);
        for (let i = 1; i <= 4; i++) {
          const p = lerp(c0, c1, i * .2), ww = wid * Math.pow(sin(Math.PI * Math.pow(i * .2, .72)), .9) * .9;
          P.line([p, add(add(p, w.pr, ww), w.v, 10)], 'wing', 1); P.line([p, add(add(p, w.pr, -ww), w.v, 10)], 'wing', 1);
        }
        P.line([...w.pts, w.pts[0]], 'wing', 1);
      }
    }
    // aguijón: cola curva por detrás del costado derecho con pústula y gota de veneno
    {
      const ts = k.tail * 1.2 + sin(ph) * 5, base = q(30, -60);
      const tp = [base, q(96, -46 + ts * .1), q(150 + ts * .5, -92), q(166 + ts, -170), q(132 + ts * 1.3, -236 - F * 8)];
      const tc = tube(P, tp, (46 + F * 5) * S, 10 * S, 'chit', { line: true }, (40 + F * 4) * S);
      for (let i = 4; i < tc.length - 4; i += 3) P.fold([add(tc[i], [-.7, .7], 9), add(tc[i], [.7, -.7], 9)], 'chit');
      const tt = tc[tc.length - 1];
      P.poly([add(tt, [-.8, .3], 8), add(tt, [-.1, -1], 30 + F * 8), add(tt, [.8, .2], 8)], 'chit', { shade: 'vol', line: true });
      P.blob(tc[Math.floor(tc.length * .55)], 12 * S, 10 * S, 'pus', { shade: 'sphere', line: true });
      P.emit({ blob: [add(tt, [0, -.4], 14 + F * 6), 2 * S, (3 + g * 2) * S] });
    }
    // patas traseras (segundo par): finas y articuladas
    const pata = (sx, x0, y0, rodX, rodY, fx, w, esp) => {
      const a = q(sx * x0, y0), kn = q(sx * rodX, rodY), ft = [(sx * fx + X * .3) * S, 0];
      tube(P, [a, kn, ft], w * S, (w * .35) * S, 'chit', { line: true }, w * .8 * S, 1);
      P.blob(kn, (w * .62) * S, (w * .6) * S, 'chit', { shade: 'sphere', line: true });
      P.poly([add(kn, [sx * .3, -1], 5), add(kn, [sx * .8, -.8], esp), add(kn, [sx * .6, .1], 5)], 'chit', { shade: 'vol' });
      P.poly([[ft[0] - 6 * S, ft[1] - 7 * S], [ft[0] + sx * 20 * S, ft[1] + 1], [ft[0] - 3 * S, ft[1] - 1]], 'chit', { shade: 'vol', line: true });   // garra del pie
    };
    pata(-1, 74, -80, 152, -126, 146, 22, 22); pata(1, 74, -80, 152, -126, 146, 22, 22);
    if (F >= 2) { pata(-1, 60, -66, 128, -100, 112, 16, 18); pata(1, 60, -66, 128, -100, 112, 16, 18); }

    // ================= cuerpo: patas delanteras, vientre, tórax =================
    P.layer('body');
    for (const sx of [-1, 1]) pata(sx, 60, -54, 106, -92, 88 + (F === 3 ? 6 : 0), 28, 26);
    // vientre hinchado: masa enorme con pústulas y pliegues
    const bw = 98 + F * 6, bh = 80 + F * 4, bc = q(0, -86);
    P.blob(bc, bw * br * S, bh * br * S, 'skin', { shade: 'sphere', line: true });
    P.blob(q(-34, -118), 40 * S, 28 * S, 'skin', { shade: 'sphere', line: true });                      // protuberancia superior con luz
    P.blob(q(32, -50), 46 * S, 26 * S, 'skin', { shade: 'sphere', line: true });
    for (const sx of [-1, 1]) P.fold([q(sx * 70, -112), q(sx * 76, -84), q(sx * 62, -52)], 'skin');
    P.fold([q(-52, -76), q(-8, -58), q(44, -66)], 'skin');
    // bandas de quitina del abdomen (formas 2 y 3)
    if (F >= 2) for (const [y, w] of [[-122, 62], [-100, 84], [-76, 90], [-52, 76]]) {
      P.poly([q(-w, y), q(-w * .5, y - 7), q(0, y - 9), q(w * .5, y - 7), q(w, y), q(w * .5, y - 1), q(0, y + 1), q(-w * .5, y - 1)], 'chit', { shade: 'vol', line: true });
    }
    // pústulas: algunas revientan y gotean pus que brilla
    const PUST = [[-58, -96, 11], [-30, -66, 9], [40, -98, 12], [66, -72, 9], [-72, -62, 8], [10, -118, 8], [24, -60, 10], [-14, -92, 7]];
    PUST.forEach(([x, y, r], i) => {
      if (i >= 5 + F * 2) return;
      const p = q(x, y), pul = 1 + sin(ph + i * 1.7) * .08;
      P.blob(p, r * S * pul, r * S * pul, 'pus', { shade: 'sphere', line: true });
      P.line([[p[0] - r * S * .3, p[1] - r * S * .35], [p[0] - r * S * .3, p[1] - r * S * .3]], 'white', 2);
      if (i % 2 === 0 || g > .6) P.emit({ px: [[p[0] + r * S * .2, p[1] + r * S * .2]] });
    });
    // en la forma 3 el vientre se abre en una boca con dientes
    if (F === 3) {
      const o = 8 + k.mouth * 14, m0 = q(0, -78);
      P.poly([q(-34, -92 - o * .2), q(-16, -102 - o * .5), q(16, -102 - o * .5), q(34, -92 - o * .2), q(26, -66 + o), q(0, -56 + o), q(-26, -66 + o)], 'rot', { shade: 'flat', tone: 0, line: true });
      P.emit({ poly: [q(-16, -86 - o * .1), q(16, -86 - o * .1), q(10, -68 + o * .6), q(-10, -68 + o * .6)] });
      for (let i = -3; i <= 3; i++) {
        P.poly([q(i * 9 - 3.5, -96 - o * .35 + abs(i)), q(i * 9, -84 - o * .1 + abs(i) * 1.5), q(i * 9 + 3.5, -96 - o * .35 + abs(i))], 'pus', { shade: 'vol' });
        P.poly([q(i * 8 - 3, -62 + o * .9), q(i * 8, -72 + o * .5), q(i * 8 + 3, -62 + o * .9)], 'pus', { shade: 'vol' });
      }
      void m0;
    }
    // tórax de quitina: placa dorsal con hombreras de pinchos
    const tl = [[-48, -170], [-58, -190], [-50, -212], [-26, -228], [26, -228], [50, -212], [58, -190], [48, -170], [26, -158], [-26, -158]];
    P.smooth(tl.map(([x, y]) => q(x * br, y)), 'chit', { n: 3, line: true });
    P.fold([q(0, -224), q(0, -162)], 'chit');
    for (const sx of [-1, 1]) {
      P.fold([q(sx * 14, -214), q(sx * 36, -204), q(sx * 46, -184)], 'chit'); P.fold([q(sx * 12, -196), q(sx * 32, -188), q(sx * 40, -172)], 'chit');
      P.blob(q(sx * 28, -196), 20 * S, 16 * S, 'chit', { shade: 'sphere', line: true });
    }
    P.emit({ blob: [q(0, -196), 3 * S, 5 * S] });
    if (F >= 2) { P.emit({ line: [q(-20, -188), q(-30, -200)] }); P.emit({ line: [q(20, -188), q(30, -200)] }); }

    // ================= brazos de guadaña (par superior; el inferior, desde la forma 2) =================
    P.layer('near');
    const arm = (sx, ang, sh0, esc, off) => {
      const lift = sx === 1 ? tw * 5 : -tw * 5;
      const sh = q(sx * sh0[0], sh0[1] - lift), aU = max(-14, 36 + ang * .8 * off + (sx === 1 ? tw * 4 : -tw * 4)), aL = aU + 72 + ang * .35 * off;
      const vU = [sx * dir(aU)[0], dir(aU)[1]], vL = [sx * dir(aL)[0], dir(aL)[1]];
      const el = add(sh, vU, 62 * esc), ha = add(el, vL, 66 * esc);
      limb(P, sh, el, 44 * esc * S, 32 * esc * S, 'skin');
      P.blob(add(sh, vU, 22 * esc), 18 * esc * S, 12 * esc * S, 'skin', { shade: 'sphere', rot: Math.atan2(vU[1], vU[0]) / D, line: true });
      limb(P, el, ha, 34 * esc * S, 20 * esc * S, 'chit');
      P.blob(el, 14 * esc * S, 13 * esc * S, 'chit', { shade: 'sphere', line: true });
      P.poly([add(el, [sx * .3, -1], 6 * esc), add(el, [sx * .9, -.5], 26 * esc), add(el, [sx * .5, .5], 6 * esc)], 'chit', { shade: 'vol', line: true });  // espina del codo
      // guadaña: hoja curva de quitina con filo claro y gota de pus
      const bl = 52 * esc + F * 10 * esc, a1 = aL, v1 = [sx * dir(a1)[0], dir(a1)[1]], pr = [-v1[1], v1[0]];
      const tip = add(add(ha, v1, bl), [sx * .9, -.5], 24 * esc);
      P.poly([add(ha, pr, 7 * esc), add(add(ha, v1, bl * .55), pr, 12 * esc), tip, add(add(ha, v1, bl * .6), pr, -3 * esc), add(ha, pr, -7 * esc)], 'chit', { shade: 'vol', line: true });
      P.line([add(ha, v1, 12 * esc), add(add(ha, v1, bl * .7), pr, 6 * esc), tip], 'chit', 4);
      P.emit({ px: [add(tip, [0, 1], 3 * esc)] });
      P.blob(ha, 11 * esc * S, 10 * esc * S, 'chit', { shade: 'sphere', line: true });
      return ha;
    };
    if (F >= 2) { arm(-1, k.armF, [40, -170], .78, .55); arm(1, k.armN, [40, -170], .78, .55); }
    const hF = arm(-1, k.armF, [56, -208], 1, 1), hN = arm(1, k.armN, [56, -208], 1, 1);
    P.anchor('hands', hN); P.anchor('handsF', hF);
    // hombreras de pinchos de quitina
    for (const sx of [-1, 1]) {
      const sh = q(sx * 56, -208);
      P.blob(sh, (24 + F * 2) * S, (18 + F * 2) * S, 'chit', { shade: 'sphere', line: true });
      for (let i = 0; i < 2 + F; i++) {
        const a = 20 + i * 28, v = [sx * sin(a * D), -cos(a * D)], l = 28 + F * 6 - i * 3;
        P.poly([add(add(sh, v, 14), [-v[1], v[0]], 6), add(sh, v, 14 + l), add(add(sh, v, 14), [v[1], -v[0]], 6)], 'chit', { shade: 'vol', line: true });
      }
    }

    // ================= cabeza: ojos compuestos, mandíbulas, antenas =================
    P.layer('top');
    limb(P, q(0, -222), hp(0, 16), 44 * S, 38 * S, 'skin');
    // antenas: largas, con plumón (forma 3) y bulbo en la punta
    for (const sx of [-1, 1]) {
      const sw = sin(ph + (sx > 0 ? .8 : 0)) * 4, lg = [1, 1.2, 1.5][F - 1];
      const ac = tube(P, [hp(sx * 14, -30), hp(sx * 30, -42 * lg), hp(sx * (44 + sw), -62 * lg), hp(sx * (70 + sw * 1.5), -76 * lg)], 8 * S, 2 * S, 'chit', { line: true });
      const at = ac[ac.length - 1];
      P.blob(at, 5 * S, 5 * S, 'pus', { shade: 'sphere', line: true });
      if (F === 3) for (let i = 4; i < ac.length - 2; i += 3) P.poly([ac[i], add(ac[i], [sx * .8, -.6], 14), add(ac[i], [sx * .3, -.2], 4)], 'chit', { shade: 'vol' });
    }
    // cuernos de la corona (formas 2 y 3): quitina en abanico sobre la frente
    if (F >= 2) for (let i = 0; i < (F === 2 ? 3 : 5); i++) {
      const n = F === 2 ? 3 : 5, x = (i - (n - 1) / 2) * 15, hh = 22 + (n - 1 - abs(i * 2 - (n - 1))) * 5 + F * 4;
      P.poly([hp(x - 6, -30 + abs(x) * .12), hp(x * 1.25, -30 - hh), hp(x + 6, -30 + abs(x) * .12)], 'chit', { shade: 'vol', line: true });
    }
    // cabeza ancha y aplastada, con pliegue de la nuca
    P.blob(hp(0, -2), 46, 33, 'skin', { shade: 'sphere' });
    P.smooth([hp(-36, 6), hp(-30, 26), hp(-14, 34), hp(14, 34), hp(30, 26), hp(36, 6)], 'skin', { n: 3 });
    P.poly([hp(-30, -20), hp(0, -30), hp(30, -20), hp(22, -12), hp(0, -18), hp(-22, -12)], 'chit', { shade: 'vol', line: true });
    // ojos compuestos grandes con facetas y brillo; racimos de ojillos extra por forma
    for (const sx of [-1, 1]) {
      const e = hp(sx * 27, -2);
      P.blob(e, 20 * S, 22 * S, 'eye', { shade: 'sphere', line: true });
      for (const [dx, dy] of [[-6, -6], [3, -9], [8, -1], [-2, 2], [4, 8], [-9, 7]]) P.line([[e[0] + dx * S, e[1] + dy * S], [e[0] + dx * S, e[1] + dy * S]], 'eye', 1);
      P.line([[e[0] - 7 * S, e[1] - 9 * S], [e[0] - 6 * S, e[1] - 9 * S]], 'white', 2);
      P.emit({ px: [[e[0] + 4 * S, e[1] + 3 * S]] });
      if (F >= 2) { P.blob(hp(sx * 9, -22), 6 * S, 6 * S, 'eye', { shade: 'sphere', line: true }); P.line([[hp(sx * 9, -24)[0] - 1, hp(sx * 9, -24)[1]], [hp(sx * 9, -24)[0], hp(sx * 9, -24)[1]]], 'white', 2); }
      if (F === 3) { P.blob(hp(sx * 46, 10), 5 * S, 5 * S, 'eye', { shade: 'sphere', line: true }); P.blob(hp(sx * 44, 22), 4 * S, 4 * S, 'eye', { shade: 'sphere', line: true }); }
    }
    // boca de mandíbulas laterales: se abren hacia fuera con kp.mouth
    const op = 4 + k.mouth * 22;
    P.poly([hp(-14, 22), hp(14, 22), hp(12, 22 + op * .9), hp(0, 25 + op), hp(-12, 22 + op * .9)], 'rot', { shade: 'flat', tone: 0, line: true });
    P.emit({ poly: [hp(-7, 24 + op * .3), hp(7, 24 + op * .3), hp(4, 22 + op * .8), hp(-4, 22 + op * .8)] });
    for (const sx of [-1, 1]) {
      const m0 = hp(sx * 18, 20), sp = 8 + k.mouth * 16;
      const mc = tube(P, [m0, hp(sx * (26 + sp), 30 + op * .4), hp(sx * (24 + sp * .5), 50 + op * .8), hp(sx * (10 + sp * .1), 58 + op)], 14 * S, 3 * S, 'chit', { line: true });
      for (let i = 4; i < mc.length - 2; i += 3) P.poly([mc[i], add(mc[i], [-sx * .9, -.3], 10), add(mc[i], [-sx * .2, .9], 4)], 'chit', { shade: 'vol' });
    }
    P.poly([hp(-8, 22), hp(0, 34 + op * .5), hp(8, 22)], 'chit', { shade: 'vol', line: true });
    P.anchor('eyes', hp(0, -2)); P.anchor('core', q(0, -100)); P.anchor('mouth', hp(0, 24 + op * .5)); P.anchor('head', hp(0, 0)); P.anchor('crown', hp(0, -60));

    // ================= enjambre: moscas que giran alrededor (cuerpo oscuro, alas claras, 2 fotogramas por aleteo) =================
    const nF = [0, 4, 8, 14][F];
    for (let i = 0; i < nF; i++) {
      const a = ph + i * TAU / nF * 2.3 + (i % 3) * .9, rx = 120 + (i % 4) * 20, ry = 40 + (i % 3) * 22, c = q(cos(a) * rx * (i % 2 ? .9 : 1), -150 + sin(a) * ry - (i % 5) * 18);
      const x = Math.round(c[0]), y = Math.round(c[1]), flap = (i + (ctx.frame | 0)) & 1;
      P.line([[x, y], [x + 1, y]], 'chit', 1);
      P.line([[x, y + 1], [x + 1, y + 1]], 'chit', 2);
      P.line([[x - 1, y - 1 - flap], [x, y - 1 - flap]], 'wing', 3); P.line([[x + 1, y - 1 + flap * 0], [x + 2, y - 1 - flap]], 'wing', 3);
    }
  },
  fx: {},
};
