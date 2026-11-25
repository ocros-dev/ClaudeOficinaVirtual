// Secuaces (paquete E-MIN): 4 tipos de 30-50 px × 7 fotogramas (idle 2, move 2, atk 2, launched 1), dibujados en índices
// y coloreados con la paleta de cada rey (ramps(kingId)): Kazgorath (brasas), Vhel-Morkai (abismo), Ysgrim (escarcha
// negra) y Tzar-Nuul (plaga). La geometría es la misma para los cuatro; solo cambian las rampas y el color emisivo.
//   diablillo  : demonio bípedo encorvado con orejas, cuernos, cola de flecha y tridente (embiste con él)
//   murcielago : murciélago infernal de frente con alas de membrana festoneada; en el picado pliega las alas hacia atrás
//   sombra     : mancha rastrera con garras delanteras, pinchos de espalda, ojos grandes y dientes
//   ojo        : ojo flotante con párpados, iris con pupila rasgada, corona de pinchos, alitas y tentáculos
// draw(P, ctx): ctx.ep = { step, atk, lean, spin }, ctx.anim = idle | move | atk | launched.
// Anclas: diablillo 'tip' (punta del tridente), murcielago 'fang', sombra 'mouth', ojo 'muzzle' (boca del láser).
// Solo se importa de '../kit16/*'. Sin Math.random.
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, sin = Math.sin, cos = Math.cos, max = Math.max, min = Math.min;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];

// Curva Catmull-Rom y cinta con ancho variable (un solo polígono + línea de luz): barata para colas, cuernos y brazos.
function crv(p, n = 2) {
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
function tube(P, pts, w0, w1, m, o = {}, n = 2, light = true) {
  const c = pts.length > 2 ? crv(pts, n) : pts, L = [0], N = c.length;
  for (let i = 1; i < N; i++) L.push(L[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const tot = L[N - 1] || 1, lf = [], rt = [], hl = [];
  for (let i = 0; i < N; i++) {
    const a = c[max(0, i - 1)], d = c[min(N - 1, i + 1)], tx = d[0] - a[0], ty = d[1] - a[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
    const w = max(.5, (w0 + (w1 - w0) * (L[i] / tot)) / 2);
    lf.push([c[i][0] + nx * w, c[i][1] + ny * w]); rt.push([c[i][0] - nx * w, c[i][1] - ny * w]);
    const sg = nx * -.6 + ny * -.8 >= 0 ? 1 : -1;
    if (i > 0 && i < N - 1 && w > 1.6) hl.push([c[i][0] + nx * sg * w * .5, c[i][1] + ny * sg * w * .5]);
  }
  P.poly([...lf, ...rt.reverse()], m, { shade: 'vol', ...o });
  if (light && hl.length > 1) P.line(hl, m, 3, {});
  return c;
}

// Transformación de la pose: inclinación (cizalla desde la cadera) o giro completo (lanzado / picado) alrededor de un pivote.
function mover(ep, pivot, whole) {
  const a = ep.lean * D, c = cos(a), s = sin(a);
  if (ep.spin || whole) return (x, y) => { const dx = x - pivot[0], dy = y - pivot[1]; return [pivot[0] + c * dx - s * dy, pivot[1] + s * dx + c * dy]; };
  const k = sin(a) * .8;
  return (x, y) => [x + max(0, -y - 9) * k, y];
}

// ---------- paletas por rey ----------------------------------------------------------------------------------------
// Materiales: body = carne / cuerpo, dark = sombra, membrana y capa, horn = cuerno y garra, metal = hierro del tridente,
// eye = iris y ojos, bone = colmillos y esclerótica.
const KING = {
  kazgorath: {   // brasas: carne de ladrillo, basalto, magma
    body: ['#2a0a0c', '#5a1612', '#a02a1a', '#c8482a', '#ec7a42'], dark: ['#0a0608', '#1a0e12', '#2e1a1e', '#503034', '#7c504a'],
    horn: ['#08060c', '#14101c', '#241c2c', '#3e3446', '#625868'], metal: ['#1a1218', '#382a30', '#5e4a50', '#8a7478', '#bca4a2'],
    eye: ['#6a1208', '#b02a0a', '#ff6a1a', '#ffa030', '#ffe070'], bone: ['#4a3a34', '#8a7060', '#c8b090', '#e8d4b0', '#fff4dc'], emit: '#ff7a28',
  },
  vhel: {        // abismo: piel azul marino, coral y perla
    body: ['#0e1630', '#1e2e5c', '#34488a', '#587cb8', '#9cc0e4'], dark: ['#03050c', '#080e1e', '#101a36', '#1e2c52', '#36487a'],
    horn: ['#5a2a30', '#a8584e', '#e8a79a', '#f8d0bc', '#fff0e6'], metal: ['#08182a', '#103650', '#1f5a78', '#3a88a2', '#78c4ca'],
    eye: ['#0c4450', '#188a88', '#3ccdb8', '#7affe0', '#e0fff8'], bone: ['#4a4458', '#8a8aa0', '#c8ccd8', '#e8ecf4', '#ffffff'], emit: '#7affe0',
  },
  ysgrim: {      // escarcha negra: pizarra violeta, hielo
    body: ['#14122a', '#2a2848', '#4a4a6a', '#7a7aa0', '#a8aed4'], dark: ['#05040c', '#0e0c1c', '#1c1a34', '#33305a', '#524e84'],
    horn: ['#1c2a5a', '#3a5aa0', '#6e90e0', '#a8c4ff', '#e8f0ff'], metal: ['#4a5a88', '#8a9ccc', '#bccaf0', '#e0eaff', '#ffffff'],
    eye: ['#18306a', '#3260b0', '#6aa4f0', '#b0d8ff', '#f0faff'], bone: ['#3a3c5a', '#7a7e9e', '#b4b8d0', '#dcdff0', '#ffffff'], emit: '#9ab0ff',
  },
  tzar: {        // plaga: carne de oliva, quitina, pus
    body: ['#141a0a', '#303c14', '#6a7a2a', '#8c9e3c', '#b6c85a'], dark: ['#0a0604', '#1a0e0a', '#2e1a14', '#4a2c20', '#6a4430'],
    horn: ['#0c0804', '#24140a', '#4a2a12', '#7a4a1e', '#a8702e'], metal: ['#2a1a0c', '#4a3016', '#7a5a2a', '#a88a44', '#d4b868'],
    eye: ['#2a0606', '#5c1010', '#a02020', '#d84a3a', '#ff8a70'], bone: ['#4a5a0c', '#8a9c1a', '#c8d83c', '#e8f070', '#fbffc0'], emit: '#d8e860',
  },
};
const MATS = ['body', 'dark', 'horn', 'metal', 'eye', 'bone'];
const kingOf = id => KING[id] || KING.kazgorath;

// ---------- diablillo ------------------------------------------------------------------------------------------------
function diablillo(P, ctx) {
  const ep = ctx.ep, s = ep.step, a = ep.atk, an = ctx.anim, mv = an === 'move', lau = an === 'launched', atk = an === 'atk';
  const Q = mover(ep, [0, -15], lau), q = (x, y) => Q(x, y);
  const breathe = an === 'idle' ? s : 0, crouch = atk && a < .7 ? 2 : 0;
  const hy = -10 + crouch;                                         // altura de la cadera

  // --- capa lejana: pierna, brazo, cola, oreja y cuerno lejanos
  P.layer('far');
  const pN = mv ? -s : atk ? (a > .7 ? 1 : 0) : lau ? 1 : 0, pF = mv ? s : atk ? (a > .7 ? -1 : 0) : lau ? -1 : 0;
  const leg = (hx, p, tag) => {
    const lift = (mv && p < 0) ? -3 : lau ? -5 - (tag ? 3 : 0) : 0, fx = hx + (tag ? 1 : -3) + 5 * p, fy = lift;
    const hip = q(hx, hy), foot = q(fx, fy), knee = q((hx + fx) / 2 + 3, (hy + fy) / 2 + 1 + crouch * .3);
    tube(P, [hip, knee, foot], 4.6, 3, 'body', {}, 2, false);
    P.blob(add(foot, [1.6, -.4]), 3.2, 1.6, 'dark', { shade: 'vol', dt: 1 });
  };
  leg(-2, pF, 0);
  tube(P, [q(-4, -13), q(-10, -10 + (mv ? s * 2 : 0)), q(-14, -14 - s * (an === 'idle' ? 2 : 1)), q(-12, -20 - s * 2)], 2.6, 1.2, 'body', {}, 2, false);   // cola
  { const t = q(-12, -21 - s * 2); P.poly([add(t, [-1.2, 1]), add(t, [0, -4]), add(t, [3, -1.8]), add(t, [1, 0.6])], 'horn', { shade: 'flat', tone: 3 }); }
  tube(P, [q(-1, -20), q(-5, hy + 4 - (lau ? 8 : 0)), q(-5 + (lau ? -4 : 1), -12 - (lau ? 12 : 0))], 3, 2.4, 'body', {}, 2, false);        // brazo lejano
  P.poly([q(-3, -30), q(-12, -35 + (lau ? 2 : 0)), q(-5, -25)], 'body', { shade: 'vol' });                                                  // oreja lejana
  tube(P, [q(-3, -31), q(-6, -37), q(-2, -41)], 3, 1, 'horn', {}, 2, false);                                                          // cuerno lejano

  // --- tronco
  P.layer('mid');
  P.smooth([q(3, -24), q(-3, -22), q(-6, -15), q(-4, hy + 1), q(4, hy + 1), q(6, -16)], 'body', { n: 3 });
  P.blob(q(2.6, -14.5), 2.8, 4, 'body', { shade: 'flat', tone: 3 });                              // barriga clara
  P.line([q(3, -16), q(3.5, -12)], 'body', 2);
  leg(2, pN, 1);

  // --- cabeza
  const hx = 4 + breathe * .3, hyy = -28 - breathe * .8 + crouch * .4;
  P.blob(q(hx, hyy), 8, 6.6, 'body', { shade: 'sphere' });
  P.blob(q(hx + 6.4, hyy + 2), 3.6, 3, 'body', { shade: 'vol' });                                  // hocico
  P.poly([q(hx - 4, hyy - 3), q(hx - 10, hyy - 7), q(hx - 4, hyy + 2)], 'body', { shade: 'vol' });  // oreja cercana
  P.poly([q(hx - 6.5, hyy - 4.5), q(hx - 9, hyy - 6.2), q(hx - 5.5, hyy - 2)], 'dark', { shade: 'flat', tone: 1 });
  const open = lau ? 1 : atk ? (a > .7 ? 1 : .5) : 0;
  if (open) {                                                                                       // boca abierta
    P.poly([q(hx + 4, hyy + 2.5), q(hx + 11, hyy + 1.2), q(hx + 11, hyy + 4 + open * 3), q(hx + 5, hyy + 5)], 'dark', { shade: 'flat', tone: 0 });
    P.emit({ px: [q(hx + 8, hyy + 4.5 + open)] });
    P.line([q(hx + 6, hyy + 2.4), q(hx + 6, hyy + 4)], 'bone', 4); P.line([q(hx + 9, hyy + 1.6), q(hx + 9, hyy + 3.4)], 'bone', 4);
  } else {
    P.line([q(hx + 4, hyy + 3.4), q(hx + 10, hyy + 3.2)], 'dark', 0);
    P.line([q(hx + 6, hyy + 3.6), q(hx + 6, hyy + 5)], 'bone', 4); P.line([q(hx + 9, hyy + 3.5), q(hx + 9, hyy + 4.8)], 'bone', 4);
  }
  // ojo emisivo con ceja furiosa (los golpeados lo cierran)
  if (lau) { P.line([q(hx + 3, hyy - 1.6), q(hx + 6, hyy)], 'dark', 0); P.line([q(hx + 3, hyy), q(hx + 6, hyy - 1.6)], 'dark', 0); }
  else {
    P.emit({ poly: [q(hx + 3, hyy - 1.4), q(hx + 7.4, hyy - 2.4), q(hx + 7.4, hyy - .4), q(hx + 4, hyy + .2)] });
    P.line([q(hx + 3, hyy - 3.4), q(hx + 8, hyy - 2.8)], 'dark', 0);
  }
  tube(P, [q(hx - 1, hyy - 5), q(hx - 2, hyy - 11), q(hx + 3, hyy - 14.5)], 3.6, 1, 'horn', { line: true }, 2);            // cuerno cercano

  // --- tridente y brazo cercano
  P.layer('near');
  const H = lau ? [-7, -29] : atk ? (a > .7 ? [11, -19] : [2, -19]) : mv ? [9, -16] : [8, -14 - breathe * .6];
  const phi = (lau ? -38 : atk ? (a > .7 ? 88 : 80) : mv ? 22 : 4 + s * 2) * D, v = [sin(phi), -cos(phi)], n = [cos(phi), sin(phi)];
  const bt = add(H, v, -13), nk = add(H, v, 22), N0 = add(nk, v, -1);
  P.cap(q(...bt), q(...nk), 2.2, 2.2, 'dark', { line: false, dt: 1 });
  P.poly([q(...add(N0, n, .9)), q(...add(N0, v, 11)), q(...add(N0, n, -.9))], 'metal', { shade: 'flat', tone: 3, line: false });
  P.poly([q(...add(add(N0, n, 3.8), v, -.9)), q(...add(add(N0, n, 3.8), v, .9)), q(...add(add(N0, n, -3.8), v, .9)), q(...add(add(N0, n, -3.8), v, -.9))], 'metal', { shade: 'flat', tone: 2, line: false });
  for (const sg of [-1, 1]) P.poly([q(...add(N0, n, 3.8 * sg)), q(...add(add(N0, n, 3.8 * sg), v, 8)), q(...add(add(N0, n, 2.6 * sg), v, 8)), q(...add(add(N0, n, 2.6 * sg), v, 0))], 'metal', { shade: 'flat', tone: 3, line: false });
  P.line([q(...add(N0, v, 10)), q(...add(N0, v, 11))], 'metal', 4);
  P.anchor('tip', q(...add(N0, v, 11)));
  const sh = [3, -20], el = lerp(sh, H, .5);
  tube(P, [q(...sh), q(el[0] - 1, el[1] + 2.5), q(...H)], 3.8, 3, 'body', { line: true }, 2, false);
  P.blob(q(...H), 2.4, 2.2, 'body', { shade: 'sphere', line: true });
}

// ---------- murciélago infernal ---------------------------------------------------------------------------------------
function murcielago(P, ctx) {
  const ep = ctx.ep, s = ep.step, a = ep.atk, an = ctx.anim, atk = an === 'atk', lau = an === 'launched', idle = an === 'idle';
  const Q = mover(ep, [0, -16], true), q = (x, y) => Q(x, y);
  // aleteo: f = 1 alas arriba, -1 abajo. En el picado se pliegan hacia atrás; lanzado: arrugadas
  const f = idle ? (s ? -.15 : .8) : an === 'move' ? (s < 0 ? 1 : -.55) : atk ? (a > .7 ? 1.5 : 1.1) : .3;
  const bob = idle ? (s ? 1 : 0) : an === 'move' ? (s < 0 ? 0 : 1.5) : 0;
  const dive = atk && a > .7;

  const wing = (sx, far) => {
    P.layer(far ? 'far' : 'mid');
    const bx = lau && far ? .7 : 1;
    const S = q(sx * 3, -17 + bob), W = q(sx * (dive ? 5.5 : lau ? 7 : 9) * bx, -17 - 8 * f * (lau && far ? -.6 : 1) + bob);
    const len = dive ? [10, 14, 14, 11] : [13, 17, 16, 12], base = dive ? [62, 50, 38, 24] : [22, 3, -16, -34];
    const spread = dive ? 0 : 28 * f * (lau ? .5 : 1);
    const tips = base.map((b, i) => { const al = (b + spread) * D; return [W[0] + sx * cos(al) * len[i], W[1] - sin(al) * len[i]]; });
    const hip = q(sx * 3, -9 + bob), mem = [S, W, tips[0]];
    for (let i = 0; i < 3; i++) { const m = lerp(tips[i], tips[i + 1], .5); mem.push(lerp(m, W, .3), tips[i + 1]); }
    mem.push(lerp(lerp(tips[3], hip, .5), W, .22), hip);
    P.poly(mem, 'body', { shade: 'vol', dt: -1 });
    P.fold([lerp(W, tips[1], .5), lerp(W, lerp(tips[1], tips[2], .5), .85)], 'body');
    for (const t of tips) P.line([W, t], 'dark', 1);
    tube(P, [S, lerp(S, W, .5), W], 3, 2.2, 'dark', { dt: 1 }, 1, false);
    P.poly([add(W, [-sx * .2, -1.2], 2), add(W, [sx * .2, -1], 6.4), add(W, [sx * .8, .2], 2)], 'bone', { shade: 'flat', tone: 3 });    // garra del pulgar
  };
  wing(-1, true);

  P.layer('mid');
  // patas colgando
  for (const sx of [-1, 1]) {
    const l = dive ? q(sx * 2 + 3, -9) : q(sx * 2, -8 + bob), t = dive ? q(sx * 2 + 8, -8) : q(sx * 2.4, -3.6 + bob);
    P.cap(add(l, [0, 0]), t, 2.2, 1.4, 'horn', {}); P.blob(add(t, [sx * .6, .6]), 1.6, 1.1, 'bone', { shade: 'flat', tone: 3 });
  }
  P.blob(q(0, -14 + bob), 5.8, 7.2, 'body', { shade: 'sphere' });
  P.blob(q(.6, -12.5 + bob), 3, 4.4, 'body', { shade: 'flat', tone: 3 });                         // pecho claro
  P.line([q(.6, -14 + bob), q(.6, -9 + bob)], 'body', 2);
  const hy = -23 + bob + (dive ? 1 : 0), hx = dive ? 2.5 : 1;
  for (const sx of [-1, 1]) {                                                                         // orejas grandes
    P.poly([q(hx + sx * 1, hy - 3), q(hx + sx * 5.6, hy - 11.5), q(hx + sx * 6, hy - 2)], 'body', { shade: 'vol' });
    P.poly([q(hx + sx * 2.6, hy - 3.5), q(hx + sx * 5, hy - 8.4), q(hx + sx * 5, hy - 3)], 'dark', { shade: 'flat', tone: 1 });
  }
  P.blob(q(hx, hy), 6.6, 5.8, 'body', { shade: 'sphere' });
  P.blob(q(hx + 1, hy + 2.4), 3, 2.1, 'body', { shade: 'flat', tone: 3 });                         // hocico
  if (lau) { for (const sx of [-1, 1]) { P.line([q(hx + sx * 3 - 1.5, hy - 1.6), q(hx + sx * 3 + 1.5, hy)], 'dark', 0); P.line([q(hx + sx * 3 - 1.5, hy), q(hx + sx * 3 + 1.5, hy - 1.6)], 'dark', 0); } }
  else for (const sx of [-1, 1]) { P.emit({ px: [q(hx + sx * 2.8 - 1, hy - .8), q(hx + sx * 2.8, hy - .8), q(hx + sx * 2.8 + 1, hy - .4)] }); P.line([q(hx + sx * 2.2, hy - 2.6), q(hx + sx * 4.4, hy - 1.6)], 'dark', 0); }
  const jaw = dive || lau ? 2.2 : atk ? 1.2 : 0;
  if (jaw) P.poly([q(hx - 2.4, hy + 2.6), q(hx + 2.4, hy + 2.6), q(hx + 1.6, hy + 3.6 + jaw), q(hx - 1.6, hy + 3.6 + jaw)], 'dark', { shade: 'flat', tone: 0 });
  P.line([q(hx - 1.8, hy + 2.8), q(hx - 1.8, hy + 4.2 + jaw * .6)], 'bone', 4); P.line([q(hx + 1.8, hy + 2.8), q(hx + 1.8, hy + 4.2 + jaw * .6)], 'bone', 4);
  P.anchor('fang', q(hx, hy + 5 + jaw));
  P.layer('near');
  wing(1, false);
}

// ---------- sombra rastrera ------------------------------------------------------------------------------------------
function sombra(P, ctx) {
  const ep = ctx.ep, s = ep.step, a = ep.atk, an = ctx.anim, mv = an === 'move', atk = an === 'atk', lau = an === 'launched';
  const Q = mover(ep, [2, -8], lau), q = (x, y) => Q(x, y);
  // parámetros del cuerpo según la pose: h = altura del lomo, rise = cuánto se yergue la cabeza, hx = alcance
  const idleB = an === 'idle' ? s : 0;
  const h = mv ? (s < 0 ? 10 : 15) : atk ? 13 : lau ? 15 : 13.5 + idleB * 1.6;
  const rise = atk ? (a > .7 ? 5 : 11) : lau ? 3 : mv ? (s < 0 ? -1 : 2) : idleB;
  const reach = atk ? (a > .7 ? 5 : -2) : mv ? (s < 0 ? 3 : -1) : 0;
  const hxx = 14 + reach;                                                                                 // x de la cara

  // --- capa lejana: cola goteante, brazo lejano, pinchos
  P.layer('far');
  tube(P, [q(-14, -3), q(-21, -5 - s * 1), q(-27, -2 + s), q(-30, 1)], 8, 1, 'dark', {}, 2, false);
  const arm = (p, far) => {
    const hx = hxx + 3 + 5 * p, hy2 = lau ? -9 - (far ? 4 : 0) : atk ? -3 - (a > .7 ? 4 : 0) : (mv && p < 0 ? -3 : -1);
    const sh = q(hxx - 7, -5 - rise * .3), hd = q(far ? hx - 2 : hx, hy2), el = q((hxx - 7 + hx) / 2 + 1, hy2 - 5);
    tube(P, [sh, el, hd], 4.2, 2.4, 'dark', { line: !far }, 2, false);
    for (let i = -1; i <= 1; i++) P.line([hd, add(hd, [3.6, i * 1.8 + 1.2])], 'horn', far ? 2 : 3);
  };
  arm(mv ? s : 0, true);
  for (let i = 0; i < 3; i++) {
    const x = -10 + i * 7, y = -h + 3 + (i === 1 ? -1.5 : 0) - (i === 2 ? rise * .35 : 0);
    P.poly([q(x - 2.4, y + 2.6), q(x - 1.4, y - 5 - i % 2 * 2), q(x + 3, y + 2.4)], 'body', { shade: 'vol' });
  }

  // --- cuerpo: lomo con jorobas, cabeza adelantada y base irregular
  P.layer('mid');
  const top = [[-17, -3], [-15, -h * .55], [-9, -h * .92 - 1], [-2, -h - 1], [5, -h * .95], [hxx - 4, -h - rise * .8 + 1], [hxx + 1, -h - rise], [hxx + 5, -h * .62 - rise * .4], [hxx + 6.5, -4 - rise * .15]];
  const bot = [[hxx + 5, -.2], [hxx - 2, 0], [8, -1.6], [2, 0], [-5, -1.4], [-10, 0], [-16, -.4]];
  P.smooth([...top, ...bot].map(p => q(p[0], p[1])), 'dark', { n: 3 });
  P.line(top.slice(1, 7).map(p => q(p[0] + 1, p[1] + 2)), 'dark', 3);                                    // reflejo del lomo
  P.blob(q(-3, -h * .5), 7, h * .22, 'dark', { shade: 'flat', tone: 1 });                                // zona de sombra bajo el lomo
  // ojos grandes y furiosos, dientes
  const ey = -h - rise * .55 + 5.2;
  if (lau) {
    for (const [x, r] of [[hxx - 1.5, 3], [hxx + 3.8, 2.2]]) { P.line([q(x - r, ey - r), q(x + r, ey + r)], 'bone', 4); P.line([q(x - r, ey + r), q(x + r, ey - r)], 'bone', 4); }
  } else {
    P.blob(q(hxx - 1.5, ey), 3.1, 3.4, 'bone', { shade: 'sphere' });
    P.blob(q(hxx + 4, ey + .4), 2.3, 2.7, 'bone', { shade: 'sphere' });
    P.emit({ poly: [q(hxx - .4, ey - 1.5), q(hxx + 1, ey - 1.5), q(hxx + 1, ey + 1.8), q(hxx - .4, ey + 1.8)] });
    P.emit({ poly: [q(hxx + 4.6, ey - 1), q(hxx + 5.8, ey - 1), q(hxx + 5.8, ey + 2), q(hxx + 4.6, ey + 2)] });
    P.line([q(hxx - 5, ey - 4.4), q(hxx + 2, ey - 2.4), q(hxx + 8, ey - 2)], 'dark', 0);                  // ceja
  }
  const my = ey + 5.6, mo = atk ? (a > .7 ? 4.5 : 3) : lau ? 3.5 : 0;
  if (mo) {
    P.poly([q(hxx - 3, my - 1), q(hxx + 7, my - 2), q(hxx + 7, my + mo), q(hxx - 2, my + mo - .6)], 'dark', { shade: 'flat', tone: 0 });
    P.emit({ px: [q(hxx + 3, my + mo - 1)] });
  }
  for (let i = 0; i < 4; i++) {
    const x = hxx - 2 + i * 2.7;
    P.poly([q(x, my - 1.2 - (mo ? 1 : 0)), q(x + 1.1, my + 1.5 - (mo ? 1 : 0)), q(x + 2.2, my - 1.2 - (mo ? 1 : 0))], 'bone', { shade: 'flat', tone: 3 });
    if (mo) P.poly([q(x + .6, my + mo), q(x + 1.7, my + mo - 2.4), q(x + 2.8, my + mo)], 'bone', { shade: 'flat', tone: 3 });
  }
  P.anchor('mouth', q(hxx + 7, my));
  // brazo cercano
  P.layer('near');
  arm(mv ? -s : 0, false);
}

// ---------- ojo flotante ---------------------------------------------------------------------------------------------
function ojo(P, ctx) {
  const ep = ctx.ep, s = ep.step, a = ep.atk, an = ctx.anim, atk = an === 'atk', lau = an === 'launched', mv = an === 'move';
  const Q = mover(ep, [0, -20], lau), q = (x, y) => Q(x, y);
  const bob = an === 'idle' ? (s ? -1 : 0) : mv ? (s < 0 ? -1 : 1) : 0;
  const C = [0, -21 + bob], R = 11;
  const charge = atk ? (a > .7 ? 1 : .55) : 0;                                                          // carga del láser
  const flap = an === 'idle' ? (s ? -3 : 2) : mv ? (s < 0 ? 4 : -3) : lau ? 5 : 1;

  // --- capa lejana: alita y pinchos traseros
  P.layer('far');
  for (const sx of [-1, 1]) {
    const w = [q(sx * 8, C[1] - 1), q(sx * 20, C[1] - 7 - flap), q(sx * 22, C[1] - 1 - flap * .6), q(sx * 17, C[1] + 5), q(sx * 9, C[1] + 6)];
    P.poly(w, 'dark', { shade: 'vol', far: sx > 0 });
    P.line([w[0], w[1]], 'horn', 3); P.line([w[0], w[2]], 'horn', 2); P.line([w[0], w[3]], 'horn', 2);
  }
  P.layer('mid');
  // tentáculos del nervio óptico
  for (let i = 0; i < 3; i++) {
    const x0 = -5 + i * 5, sw = (i - 1) * 1.6 + (s ? 1 : -1) * (i === 1 ? -1.5 : 1.5) * (an === 'idle' || mv ? 1 : .3);
    tube(P, [q(x0, C[1] + R - 3), q(x0 + sw, C[1] + R + 3), q(x0 - sw * 1.2 + (i - 1) * 1.5, -2 - (i === 1 ? 0 : 2) + (lau ? -4 : 0))], 4, 1.2, 'body', { line: i !== 1 }, 2, false);
  }
  // corona de pinchos y globo ocular
  for (let i = 0; i < 5; i++) {
    const t = (i - 2) / 2, x = t * 8, base = C[1] - Math.sqrt(max(0, R * R - x * x)) + 1.5;
    P.poly([q(x - 2.3, base + 1), q(x + t * 2.4, base - 7 - (i % 2 ? 0 : 2.5)), q(x + 2.3, base + 1)], 'horn', { shade: 'vol' });
  }
  P.blob(q(...C), R, R, 'bone', { shade: 'sphere' });
  // venas sobre la esclerótica
  P.line([q(-9, C[1] - 2), q(-6.5, C[1] - 1.4), q(-4.4, C[1] + 1)], 'body', 2, { on: 'bone' });
  P.line([q(-8, C[1] + 5), q(-5.6, C[1] + 3.4)], 'body', 2, { on: 'bone' });
  P.line([q(9, C[1] - 4.4), q(7.2, C[1] - 1.4)], 'body', 2, { on: 'bone' });
  // iris, pupila y brillo; el iris sigue a la parte (atk: mira de frente a la derecha)
  const gx = atk ? 4 : mv ? 3 : 2.4 + (s ? 1 : 0), gy = lau ? 0 : -.4, I = q(C[0] + gx, C[1] + gy), pr = lau ? 1.1 : charge ? 2.2 : 1.5;
  if (!lau) {
    P.blob(I, 6.2, 6.6, 'eye', { shade: 'sphere' });
    if (charge) { for (let k = 0; k < 14; k++) { const t = k / 14 * Math.PI * 2; P.emit({ px: [[I[0] + cos(t) * 7.6, I[1] + sin(t) * 8]] }); } }
    P.poly([[I[0], I[1] - 5], [I[0] + pr, I[1]], [I[0], I[1] + 5], [I[0] - pr, I[1]]], charge ? 'eye' : 'dark', { shade: 'flat', tone: charge ? 4 : 0 });
    if (charge) P.emit({ poly: [[I[0] - 1, I[1] - 2.4 * charge - 1], [I[0] + 1.6, I[1]], [I[0] - 1, I[1] + 2.4 * charge + 1], [I[0] - 2.6, I[1]]] });
    P.line([[I[0] - 3.4, I[1] - 4], [I[0] - 2.4, I[1] - 4.8]], 'white', 2);
    P.anchor('muzzle', [I[0] + 3, I[1]]);
  } else P.anchor('muzzle', [I[0], I[1]]);
  // párpados: el superior cae oblicuo (mirada de pocos amigos); lanzado = cerrado
  P.layer('near');
  const o = lau ? 0 : atk ? 1 : mv ? .75 : .62;
  const ly = C[1] - 5 - 6 * o;
  P.poly([q(-12.4, C[1] + 1), q(-12, C[1] - 8), q(-6, C[1] - R - 1.6), q(2, C[1] - R - 3), q(9, C[1] - R + .4), q(12.4, C[1] - 4), q(12.4, C[1] + 1),
    q(10, ly + 3.4), q(5, ly + 1.6), q(-1, ly + 2.4), q(-6, ly + 1), q(-11, ly - .4 + (lau ? 3 : 0))], 'body', { shade: 'vol', line: true });
  P.line([q(-6, C[1] - 7.6 - o), q(0, C[1] - 9)], 'body', 3);
  P.poly([q(-9.6, C[1] + 6.4), q(0, C[1] + R + 1.4 - o * 1.2), q(9.6, C[1] + 6.4), q(6, C[1] + 8.6 - o * 1.4), q(0, C[1] + 8.8 - o * 1.4), q(-6, C[1] + 8.6 - o * 1.4)], 'body', { shade: 'vol', line: true });
  if (lau) { P.line([q(-9, C[1] + 1), q(-3, C[1] + 3.4), q(3, C[1] + 3.4), q(9, C[1] + 1)], 'dark', 0); }
}

export default {
  id: 'minions',
  kit: 1,
  ready: true,
  materials: MATS,
  ramps: kingId => { const k = kingOf(kingId), o = {}; for (const m of MATS) o[m] = ramp5(k[m]); return o; },
  emit: kingId => kingOf(kingId).emit,
  types: [
    { id: 'diablillo', size: { w: 96, h: 80, gy: 76 }, draw: diablillo },
    { id: 'murcielago', size: { w: 96, h: 80, gy: 64 }, draw: murcielago },
    { id: 'sombra', size: { w: 96, h: 80, gy: 60 }, draw: sombra },
    { id: 'ojo', size: { w: 96, h: 80, gy: 72 }, draw: ojo },
  ],
};
