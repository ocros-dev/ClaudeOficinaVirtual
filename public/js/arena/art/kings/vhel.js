// Rey Demonio «Vhel-Morkai» (Abismo): arte 16 bits de las TRES formas (paquete K-VHE).
// Vista frontal y simétrica. Silueta propia, opuesta a la de Kazgorath: tronco alto y estrecho sobre una masa de
// tentáculos (sin piernas), abanico de aleta dorsal tras la cabeza y cornamenta de coral ramificado.
//   Forma 1: tentáculos inferiores, barba de tentáculos, collar de perlas, aleta dorsal y astas de coral de 2 niveles.
//   Forma 2: más tentáculos con ventosas, 2 tentáculos arqueados sobre los hombros, astas de 3 niveles, hombreras de coral.
//   Forma 3: 4 tentáculos arqueados con puntas luminosas, doble abanico, tercera asta central, hombreras de perlas, tercer ojo,
//            tinta y luces de abismo flotando.
// Contrato (docs/arena-v12-arquitectura.md 3.7 y 3.8): size(forma), ramps(forma), emit(forma), draw(P, ctx) con ctx.kp.
// Guía de estilo: docs/arena-estilo-16bits.md (apartado «Reyes»). Solo se importa de '../kit16/*'.
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max;
const SCALE = [0, .77, .82, .86];                      // forma 1: ~280 px; forma 2: ~315 px; forma 3: ~345 px

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
// Cinta curva: polígono que sigue la curva (ancho variable) más una línea de luz de 1 px en el lado iluminado.
// Mucho más barata que encadenar cápsulas. wm = ancho en el centro. Con o.bands pinta además una banda de sombra y otra de luz
// (volumen de 3 tonos para las piezas grandes). Devuelve la polilínea.
function tube(P, pts, w0, w1, m, o = {}, wm, n = 2) {
  const { bands, ...po } = o;
  const c = crv(pts, n), L = [0], N = c.length;
  for (let i = 1; i < N; i++) L.push(L[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const tot = L[N - 1] || 1, wf = t => (wm == null ? w0 + (w1 - w0) * t : t < .5 ? w0 + (wm - w0) * t * 2 : wm + (w1 - wm) * (t - .5) * 2);
  const lf = [], rt = [], hl = [], NX = [], NY = [], W = [], SG = [];
  for (let i = 0; i < N; i++) {
    const a = c[max(0, i - 1)], d = c[min(N - 1, i + 1)], tx = d[0] - a[0], ty = d[1] - a[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl, w = max(.6, wf(L[i] / tot) / 2);
    const sg = nx * -.6 + ny * -.8 >= 0 ? 1 : -1;
    NX.push(nx); NY.push(ny); W.push(w); SG.push(sg);
    lf.push([c[i][0] + nx * w, c[i][1] + ny * w]); rt.push([c[i][0] - nx * w, c[i][1] - ny * w]);
    if (i > 0 && i < N - 1 && w > 2.2) hl.push([c[i][0] + nx * sg * w * (bands ? .3 : .45), c[i][1] + ny * sg * w * (bands ? .3 : .45)]);
  }
  P.poly([...lf, ...rt.reverse()], m, bands ? { shade: 'flat', tone: 2, ...po } : { shade: 'vol', ...po });
  if (bands) for (const [side, lo, hi, tone] of [[-1, .3, 1, 1], [1, .08, .6, 3]]) {
    let A = [], B = [], sg0 = 0;
    const flush = () => { if (A.length > 1) P.poly([...A, ...B.reverse()], m, { shade: 'flat', tone, line: false }); A = []; B = []; };
    for (let i = 0; i < N; i++) {
      if (SG[i] !== sg0) { flush(); sg0 = SG[i]; }
      const s2 = side * SG[i] * W[i];
      A.push([c[i][0] + NX[i] * s2 * lo, c[i][1] + NY[i] * s2 * lo]); B.push([c[i][0] + NX[i] * s2 * hi, c[i][1] + NY[i] * s2 * hi]);
    }
    flush();
  }
  if (hl.length > 1) P.line(hl, m, bands ? 4 : 3, {});
  return c;
}

export default {
  id: 'vhel',
  kit: 1,
  ready: true,
  // piel de pizarra, aleta (membrana verdeazulada), coral, perla, abismo (sombras y fauces), colmillo, luz de abismo
  materials: ['skin', 'fin', 'coral', 'pearl', 'abyss', 'tooth', 'glow'],
  // celda de dibujo ajustada a la pose más extendida de cada forma (con 4 px de margen); los pies están en (gx, gy)
  size: form => ({ w: [0, 427, 456, 514][form], h: [0, 338, 371, 405][form], gx: [0, 205, 220, 249][form], gy: [0, 325, 357, 391][form] }),
  ramps: form => ({
    skin: form === 1 ? ramp5(['#0e1630', '#1e2e5c', '#34488a', '#587cb8', '#9cc0e4'])
      : form === 2 ? ramp5(['#0e1230', '#1e2658', '#323f84', '#5468b4', '#92a8e0'])
      : ramp5(['#0a0e28', '#161c4a', '#28387a', '#4a62a8', '#8098d8']),
    fin: ramp5(['#08182a', '#103650', '#1f5a78', '#3a88a2', '#78c4ca']),
    coral: ramp5(['#5a2a30', '#a8584e', '#e8a79a', '#f8d0bc', '#fff0e6']),
    pearl: ramp5(['#5a6a8a', '#a0b0c8', '#d8e0f0', '#f4f6ff', '#ffffff']),
    abyss: ramp5(['#03050c', '#080e1e', '#101a36', '#1e2c52', '#36487a']),
    tooth: ramp5(['#4a4458', '#8a8aa0', '#c8ccd8', '#e8ecf4', '#ffffff']),
    glow: ramp5(['#0c4450', '#188a88', '#3ccdb8', '#7affe0', '#e0fff8']),
  }),
  emit: form => '#7affe0',
  // Retoques de pose propios de este rey (peso sobre los tentáculos, torsión de hombros, cabeza).
  poseOverride(form, anim, i) {
    switch (anim) {
      case 'idle': return { dx: [-2, -1, 1, 0][i], hd: [0, 1, 2, 1][i], tw: [-.3, 0, .3, 0][i] };
      case 'hit': return { dy: [7, 3][i], hd: [-9, -4][i], tw: [1, .5][i] };
      case 'lean': return { dy: 4, hd: -3, tw: -1 };
      case 'claw': return { dy: [5, 3, 1][i], hd: [-3, 8, 4][i], tw: [-1, 1, .6][i] };
      case 'lunge': return { dy: [7, 2][i], hd: [-2, 10][i], tw: [-.6, 1][i] };
      case 'roar': return { dy: [-1, -4][i], hd: [-8, -13][i], tw: 0, armN: [46, 66][i], armF: [46, 66][i] };
      case 'charge': return { dy: [3, 5][i], hd: [2, 4][i], tw: [.3, -.3][i] };
      case 'beam': return { dy: [4, 5][i], hd: [6, 8][i], tw: 0 };
      case 'cast': return { dy: [3, -1, 2][i], hd: [-2, -6, 3][i], tw: [-.8, 0, .8][i] };
      default: return {};
    }
  },
  draw(P, ctx) {
    const k = ctx.kp, F = ctx.form, S = SCALE[F] || .8, ph = ctx.phase * TAU, g = k.glow;
    const X = k.dx, Y = k.dy, hd = k.hd || 0, tw = k.tw || 0, b = k.breathe, br = 1 + b * .03;
    const dir = a => [sin(a * D), cos(a * D)];                              // 0 = hacia abajo, 90 = horizontal
    const q = (x, y, hx = 0, hy = 0) => [(x + X + k.lean * .9 * max(0, min(1.5, (-y - 70) / 110)) + hx) * S, (y + Y + hy) * S];
    const add = (p, v, n) => [p[0] + v[0] * n * S, p[1] + v[1] * n * S];
    const HS = 1.16;                                                           // cabeza grande (≈ 1/4,5 del cuerpo con astas aparte)
    const hp = (x, y) => q(x * HS, y * HS - 238, k.lean * .5, -b * 1.2 + hd * .55);   // cabeza: coordenadas relativas a su centro
    const sway = (i, a = 1) => (sin(ph + i * 1.3) * 5 + k.tail * .6) * a;      // vaivén de los tentáculos (fase y kp.tail)

    // ================= capa lejana: aleta dorsal, tentáculos arqueados y tentáculos de atrás =================
    P.layer('far');
    // abanico de aleta dorsal con radios y borde festoneado
    {
      const fc = q(0, -204), nS = F === 1 ? 9 : F === 2 ? 11 : 13, tips = [], RR = [0, 100, 112, 122][F];
      for (let i = 0; i < nS; i++) {
        const a = -90 + i * 180 / (nS - 1), v = [sin(a * D), -cos(a * D)], r = (RR + 26 * cos(a * D) - (i % 2 ? 6 : 0)) * (1 + k.wing * .07);
        tips.push(add(fc, v, r));
      }
      for (let i = 0; i < nS - 1; i++) {
        const A = tips[i], B = tips[i + 1], cp = lerp(lerp(A, B, .5), fc, .2), edge = bez(A, cp, B, 4);
        P.poly([fc, ...edge], 'fin', { shade: 'vol' });
        P.fold([lerp(fc, edge[2], .45), lerp(fc, edge[2], .85)], 'fin');
        if (F >= 2 && (g > .4 || F === 3)) P.emit({ px: [[edge[2][0], edge[2][1] + 3]] });
      }
      for (let i = 0; i < nS; i++) {
        tube(P, [lerp(fc, tips[i], .22), lerp(fc, tips[i], .6), tips[i]], 6 * S, 1.8 * S, 'abyss', { line: true }, undefined, 1);
        P.blob(tips[i], 2.6 * S, 2.6 * S, 'pearl', { shade: 'sphere' });
      }
      if (F === 3) {                                                          // segundo abanico, más pequeño y claro, delante del primero
        for (let i = 0; i < 7; i++) {
          const a = -78 + i * 26, v = [sin(a * D), -cos(a * D)], t = add(fc, v, 70 + 14 * cos(a * D));
          P.poly([add(fc, v, 24), add(fc, [v[1] * .22 + v[0], v[0] * -.22 + v[1]], 60), t, add(fc, [v[0] - v[1] * .22, v[1] + v[0] * .22], 60)], 'glow', { shade: 'vol' });
        }
      }
    }
    // tentáculos arqueados sobre los hombros (formas 2 y 3): suben, se curvan y bajan por delante
    const nArc = F === 1 ? 0 : F === 2 ? 1 : 2;
    for (let j = 0; j < nArc; j++) for (const sx of [-1, 1]) {
      const sw = sway(j + (sx > 0 ? 2 : 0), 1.6), e = 1 + j * .2;
      const pts = [q(sx * 44, -190), q(sx * (92 + j * 14), -250 - j * 14), q(sx * (150 + j * 24) * e, -276 - j * 20 + sw * .4), q(sx * (190 + j * 20) * e, -236 - j * 8 + sw), q(sx * (188 + j * 24) * e + sw, -190 + j * 6)];
      const c = tube(P, pts, 22 * S, 4 * S, 'skin', { bands: true }, 20 * S, 3);
      for (let i = 4; i < c.length - 2; i += 3) P.blob(c[i], 2.2 * S, 2.2 * S, 'pearl', { shade: 'sphere' });
      if (F === 3) P.emit({ px: [c[c.length - 1], [c[c.length - 1][0], c[c.length - 1][1] - 1]] });
    }
    // tentáculos inferiores: una masa en abanico apoyada en el suelo (el peso cae sobre ellos)
    const nT = [0, 7, 9, 11][F];
    const tent = (i, nearL) => {
      const u = (i / (nT - 1)) * 2 - 1, au = abs(u), sx = u < 0 ? -1 : 1, sw = sway(i), o = nearL ? { line: true } : {};
      const p0 = q(u * 20, -64), p1 = q(u * (52 + 30 * au), -50);
      let pts;
      if (au < .2) pts = [p0, q(u * 40, -30), [(u * 70 + X * .2) * S, -12 * S], [(u * 100 + X * .2 + sw) * S, -3 * S]];
      else {
        const p2 = [(u * (108 + 52 * au) + X * .3 + sw * .5) * S, (-12 + (i % 2) * 5) * S];
        const p3 = [(u * (150 + 62 * au) + X * .2 + sw) * S, (-34 - 40 * au - (i % 3) * 6) * S];
        const p4 = [p3[0] - sx * (14 + 10 * au) * S, p3[1] - (46 + 30 * au) * S + sw * .5 * S];
        pts = [p0, p1, p2, p3, p4];
      }
      const c = tube(P, pts, 40 * S, 4 * S, 'skin', { ...o, bands: nearL }, 30 * S, 3);
      if (au > .15) for (let n = 4; n < c.length - 3; n += F === 1 ? 5 : 3) P.blob([c[n][0], c[n][1] + 1.5 * S], 2.2 * S, 1.8 * S, 'pearl', { shade: 'sphere' });
      if (F === 3 && au > .6) P.emit({ px: [c[c.length - 2]] });
      return c;
    };
    for (let i = 0; i < nT; i++) { const u = abs((i / (nT - 1)) * 2 - 1); if (u > .5) tent(i, false); }

    // ================= cuerpo =================
    P.layer('body');
    // tronco: cintura estrecha, tórax en barril, hombros anchos
    const tl = [[0, -48], [-30, -62], [-40, -84], [-42, -110], [-54, -146], [-68, -176], [-68, -198], [-48, -214], [-22, -222], [22, -222], [48, -214], [68, -198], [68, -176], [54, -146], [42, -110], [40, -84], [30, -62]];
    P.smooth(tl.map(([x, y]) => q(x * (y < -120 ? br : 1), y)), 'skin', { n: 3 });
    // vientre claro con placas horizontales, como el de una serpiente de mar
    P.smooth([q(-14, -214), q(-17, -170), q(-16, -130), q(-14, -90), q(-6, -60), q(6, -60), q(14, -90), q(16, -130), q(17, -170), q(14, -214)], 'fin', { n: 3 });
    for (let y = -204; y < -64; y += 14) P.fold(bez(q(-14, y), q(0, y + 6), q(14, y), 3), 'fin');
    // costillas, branquias y pectorales
    for (const sx of [-1, 1]) {
      for (let n = 0; n < 4; n++) P.line([q(sx * 44, -172 + n * 9), q(sx * 53, -176 + n * 9)], 'abyss', 1, {});      // branquias
      P.blob(q(sx * 30, -186), 24 * br, 20, 'skin', { shade: 'sphere', line: true });                              // pectoral
      P.fold(bez(q(sx * 18, -172), q(sx * 34, -168), q(sx * 50, -178), 3), 'skin');
      P.fold([q(sx * 40, -150), q(sx * 36, -124), q(sx * 30, -100)], 'skin');
      P.blob(q(sx * 28, -214), 20, 10, 'skin', { shade: 'sphere', line: true });
    }
    // collar de perlas con colgante de luz
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI, x = -44 * cos(a), y = -196 + sin(a) * 22 * br;
      P.blob(q(x, y), 5 - (i === 4 ? 0 : 0), 5, 'pearl', { shade: 'sphere', line: true });
    }
    if (F >= 2) for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI; P.blob(q(-36 * cos(a), -214 + sin(a) * 14), 3.4, 3.4, 'pearl', { shade: 'sphere', line: true }); }
    P.blob(q(0, -170), 12, 12, 'glow', { shade: 'sphere', line: true });
    P.emit({ blob: [q(0, -170), (4.5 + g * 2.5) * S, (4.5 + g * 2.5) * S] });
    // luces de abismo: motas que laten con kp.glow
    const spots = [[-28, -150], [26, -140], [-20, -118], [30, -112], [-40, -194], [42, -190]];
    for (let i = 0; i < spots.length; i++) if (g > .3 + (i % 3) * .2 || F > 1) P.emit({ px: [q(spots[i][0], spots[i][1])] });
    if (F === 3) { for (const sx of [-1, 1]) P.emit({ line: [q(sx * 50, -150), q(sx * 56, -130), q(sx * 52, -108)] }); }

    // ================= brazos =================
    P.layer('near');
    for (let i = 0; i < nT; i++) { const u = abs((i / (nT - 1)) * 2 - 1); if (u <= .5) tent(i, true); }
    const arm = (sx, ang) => {
      const lift = sx === 1 ? tw * 5 : -tw * 5;
      const sh = q(sx * 64, -196 - lift), aU = max(-14, 14 + ang * .8 + (sx === 1 ? tw * 4 : -tw * 4)), aL = aU + 22 + ang * .3;
      const vU = [sx * dir(aU)[0], dir(aU)[1]], vL = [sx * dir(aL)[0], dir(aL)[1]];
      const el = add(sh, vU, 66), ha = add(el, vL, 68);
      const rU = Math.atan2(el[1] - sh[1], el[0] - sh[0]) / D, rL = Math.atan2(ha[1] - el[1], ha[0] - el[0]) / D;
      // aleta del brazo: membrana con espinas entre el codo y la muñeca
      const nrm = [vL[1] * sx, -vL[0] * sx], fa = add(el, [-nrm[0] * 0 + vL[0], vL[1]], 8);
      const spk = [0, 1, 2, 3].map(i => add(add(el, vL, 14 + i * 16), [sx * .85, .1], 26 - i * 3 + (F - 1) * 4));
      P.poly([add(el, vL, 6), ...spk, add(ha, vL, -4)], 'fin', { shade: 'vol', line: true });
      for (const s of spk) P.fold([lerp(add(el, vL, 8), s, .35), lerp(add(el, vL, 8), s, .8)], 'fin');
      void fa;
      P.cap(sh, el, 46 * S, 36 * S, 'skin');
      P.blob(add(sh, vU, 24), 26 * S, 17 * S, 'skin', { shade: 'sphere', rot: rU, line: true });
      P.fold([add(sh, vU, 14), add(sh, vU, 50)], 'skin');
      P.cap(el, ha, 36 * S, 24 * S, 'skin');
      P.blob(add(el, vL, 18), 23 * S, 13 * S, 'skin', { shade: 'sphere', rot: rL, line: true });
      P.blob(el, 14 * S, 14 * S, 'skin', { shade: 'sphere' });
      P.poly([add(el, [sx * .3, -1], 7), add(el, [sx * .95, -.4], 22), add(el, [sx * .5, .5], 7)], 'coral', { shade: 'vol', line: true });  // espina del codo
      // mano palmeada: membrana entre tres dedos largos con garra
      P.cap(add(ha, vL, -6), add(ha, vL, 8), 24 * S, 20 * S, 'skin', { line: true });
      const tipsH = [];
      for (const off of [-32, 0, 32]) {
        const a0 = aL + off, v0 = [sx * dir(a0)[0], dir(a0)[1]], base = add(ha, v0, 8), mid = add(base, v0, 22), a1 = a0 - 18, v1 = [sx * dir(a1)[0], dir(a1)[1]], tip = add(mid, v1, 18);
        tipsH.push([base, mid, tip, v1]);
      }
      P.poly([add(ha, vL, 6), tipsH[0][1], tipsH[1][1], tipsH[2][1]], 'fin', { shade: 'vol', line: true });
      for (const [base, mid, tip, v1] of tipsH) {
        const gF = P.group(true); P.cap(base, mid, 8 * S, 5.5 * S, 'skin', { line: true, group: gF }); P.cap(mid, tip, 5.5 * S, 3 * S, 'skin', { line: true, group: gF });
        P.poly([add(tip, [-v1[1] * .5, v1[0] * .5], 2.4), add(tip, v1, 13), add(tip, [v1[1] * .5, -v1[0] * .5], 2.4)], 'tooth', { shade: 'vol' });
      }
      // hombrera: cresta de coral (forma 1-2) o racimo de perlas con espinas (forma 3)
      const nSp = F === 1 ? 2 : 3;
      for (let i = 0; i < nSp; i++) {
        const a = -(i / max(1, nSp - 1)) * 1.1 + .05, v = [sx * cos(a), sin(a) - .25], vl = Math.hypot(v[0], v[1]), vn = [v[0] / vl, v[1] / vl], pr = [-vn[1], vn[0]], l = 26 + F * 4 - i * 4, c0 = add(sh, vn, 12);
        P.poly([add(c0, pr, 7), add(sh, vn, 12 + l), add(c0, pr, -7)], 'coral', { shade: 'vol', line: true });
      }
      P.blob(sh, (F === 3 ? 21 : 17) * S, (F === 3 ? 19 : 15) * S, F === 3 ? 'pearl' : 'skin', { shade: 'sphere', line: true });
      if (F === 3) { P.blob(add(sh, [sx * .7, -.5], 16), 8 * S, 8 * S, 'pearl', { shade: 'sphere', line: true }); P.emit({ px: [sh] }); }
      return ha;
    };
    const hF = arm(-1, k.armF), hN = arm(1, k.armN);
    P.anchor('hands', hN); P.anchor('handsF', hF);

    // ================= cabeza, cornamenta y barba =================
    P.layer('top');
    P.cap(q(0, -214), hp(0, 16), 50 * S, 42 * S, 'skin');
    // cornamenta de coral ramificado: se pinta antes del cráneo para que las raíces queden tapadas
    // cada rama: 3 puntos (raíz, medio, punta) con una curva suave; las ramas hijas nacen a lo largo de ella
    const coral = (p0, ang, len, w, depth, sx, flip) => {
      const d = a => [sx * sin(a * D), -cos(a * D)], m = [p0[0] + d(ang - flip * 4)[0] * len * .5, p0[1] + d(ang - flip * 4)[1] * len * .5];
      const e = [m[0] + d(ang - flip * 20)[0] * len * .5, m[1] + d(ang - flip * 20)[1] * len * .5];
      tube(P, [hp(p0[0], p0[1]), hp(m[0], m[1]), hp(e[0], e[1])], w * S, max(1.6, w * .2) * S, 'coral', { line: true }, undefined, 1);
      if (depth > 0) [[.32, 34, .7], [.56, -30, .6], [.8, 36, .46]].slice(0, depth === 2 && F === 1 ? 2 : depth === 1 ? 2 : 3).forEach(([t, da, kk], n) => {
        const base = t <= .5 ? lerp(p0, m, t / .5) : lerp(m, e, (t - .5) / .5), la = ang - flip * (t <= .5 ? 4 : 20);
        coral(base, la + da * flip, len * kk, w * .62, depth - 1, sx, -flip);
      });
    };
    for (const sx of [-1, 1]) {
      const dp = 2, len = [0, 96, 106, 114][F];
      coral([sx * 24, -30], 30, len, 22, dp, sx, 1);
      if (F >= 2) coral([sx * 36, -12], 62, len * .5, 14, 1, sx, 1);                           // asta baja que se abre hacia los lados
    }
    if (F === 3) coral([0, -34], 0, 78, 19, 2, 1, 1);                                    // tercera asta central
    // frondas de las mejillas (aletas) y branquias de la cabeza
    for (const sx of [-1, 1]) for (let n = 0; n < 3; n++) P.poly([hp(sx * 38, -4 + n * 10), hp(sx * (66 + n * 6), -14 + n * 14), hp(sx * 38, 6 + n * 10)], 'fin', { shade: 'vol', line: true });
    // cráneo ancho y achatado, con frente prominente y mandíbula
    P.smooth([hp(-40, -22), hp(-45, 2), hp(-36, 24), hp(-17, 38), hp(0, 42), hp(17, 38), hp(36, 24), hp(45, 2), hp(40, -22), hp(22, -35), hp(0, -38), hp(-22, -35)], 'skin', { n: 3 });
    P.blob(hp(0, -18), 26, 12, 'skin', { shade: 'sphere', line: true });                    // frente
    P.fold([hp(0, -36), hp(0, -26)], 'skin');
    for (const sx of [-1, 1]) {
      P.poly([hp(sx * 44, -22), hp(sx * 24, -16), hp(sx * 6, -12), hp(sx * 8, -6), hp(sx * 26, -9), hp(sx * 44, -14)], 'abyss', { shade: 'vol', line: true });   // ceja pesada
      P.emit({ blob: [hp(sx * 24, 2), 11 * S, 8 * S] });                                    // halo del ojo
      P.blob(hp(sx * 24, 2), 9, 6.5, 'glow', { shade: 'sphere' });                         // ojo grande
      P.line([hp(sx * 24, -3), hp(sx * 24, 7)], 'abyss', 0);                                // pupila hendida
      P.line([hp(sx * 21, -1), hp(sx * 21, 0)], 'white', 2);
      P.line([hp(sx * 6, 14), hp(sx * 7, 18)], 'abyss', 0);                                 // fosa nasal
      P.fold([hp(sx * 36, 14), hp(sx * 30, 28)], 'skin');
    }
    if (F === 3) { P.emit({ blob: [hp(0, -26), 4 * S, 5 * S] }); P.blob(hp(0, -26), 4, 5, 'glow', { shade: 'sphere' }); P.line([hp(0, -28), hp(0, -26)], 'abyss', 0); }   // tercer ojo
    // boca ancha: la mandíbula baja con kp.mouth; dentro, oscuridad y dientes de aguja
    const op = 6 + k.mouth * 22;
    P.poly([hp(-30, 26), hp(30, 26), hp(24, 26 + op), hp(0, 29 + op), hp(-24, 26 + op)], 'abyss', { shade: 'flat', tone: 0, line: true });
    P.emit({ poly: [hp(-12, 28 + op * .4), hp(12, 28 + op * .4), hp(7, 26 + op * .85), hp(-7, 26 + op * .85)] });
    for (let i = -4; i <= 4; i++) P.poly([hp(i * 7 - 3.5, 26), hp(i * 7, 26 + 9 + (i % 2 ? 0 : 4)), hp(i * 7 + 3.5, 26)], 'tooth', { shade: 'vol' });
    P.poly([hp(-26, 26 + op), hp(0, 30 + op + 6), hp(26, 26 + op), hp(14, 30 + op + 12), hp(0, 32 + op + 18), hp(-14, 30 + op + 12)], 'skin', { shade: 'vol', line: true });
    for (const sx of [-1, 1]) {
      for (const x of [14, 22]) P.poly([hp(sx * (x - 2.5), 26 + op), hp(sx * x, 26 + op - 11 - (x > 18 ? 3 : 0)), hp(sx * (x + 2.5), 26 + op)], 'tooth', { shade: 'vol' });
    }
    // barba de tentáculos que cuelga sobre el pecho
    const nB = [0, 6, 8, 10][F];
    for (let i = 0; i < nB; i++) {
      const sx = i % 2 ? 1 : -1, j = (i >> 1) / max(1, (nB >> 1) - 1), sw = sway(i + 3, .8), len = 34 + (1 - j) * 12 + F * 6, x0 = sx * (10 + j * 24);
      const r = hp(x0, 30 + op * .8), c = tube(P, [r, hp(x0 + sx * 6, 42 + op + len * .35), hp(x0 + sx * 10 + sw * .5, 42 + op + len * .75), hp(x0 + sx * 6 + sw, 42 + op + len)], 12 * S, 2 * S, 'skin', { line: true }, undefined, 1);
      if (F === 3 && i % 2 === 0) P.emit({ px: [c[c.length - 1]] });
    }
    P.anchor('eyes', hp(0, 2)); P.anchor('core', q(0, -170)); P.anchor('mouth', hp(0, 28 + op * .5)); P.anchor('head', hp(0, 0)); P.anchor('crown', hp(0, -60));
    // tinta y luces de abismo flotando (forma 3)
    if (F === 3) for (let i = 0; i < 8; i++) { const t = (ph / TAU + i * .27) % 1; P.emit({ px: [q(-170 + i * 48 + sin(i * 2.3) * 14, -110 - t * 200)] }); }
  },
  fx: {},
};
