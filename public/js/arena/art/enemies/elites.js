// Demonios élite (paquete E-ELI): 4 tipos de 80-130 px × 12 fotogramas (idle 2, move 4, atk 3, hit 1, special 2), dibujados
// en índices y coloreados con la paleta de cada rey (ramps(kingId)): Kazgorath (brasas), Vhel-Morkai (abismo),
// Ysgrim (escarcha negra) y Tzar-Nuul (plaga). Geometría común; cambian rampas y color emisivo.
//   verdugo    : coloso acorazado con yelmo de cuernos y un hacha enorme a dos manos (tajo; especial = hachazo al suelo)
//   brujo      : hechicero flotante de túnica hecha jirones, cara de cráneo, cuernos de carnero y báculo con orbe
//                (atk = bola de sombra; especial = alza el báculo y abre un círculo de runas)
//   cancerbero : perro infernal de dos cabezas con collar de pinchos (atk = doble mordisco; especial = se alza y cae en estampida)
//   heraldo    : mensajero alado de alas de plumas-cuchilla y trompeta de latón (atk = picado; especial = alarido con ondas)
// draw(P, ctx): ctx.ep = { bob, step, atk, lean, glow }, ctx.anim = idle | move | atk | hit | special, ctx.phase = frame / n.
// Anclas: verdugo 'blade' (filo del hacha), brujo 'orb' (orbe del báculo), cancerbero 'jaw' (hocico), heraldo 'bell' (pabellón).
// Solo se importa de '../kit16/*'. Sin Math.random.
import { ramp5 } from '../kit16/ramps.js';

const D = Math.PI / 180, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos, max = Math.max, min = Math.min, abs = Math.abs;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const dirOf = ang => [sin(ang * D), -cos(ang * D)];                // 0 = arriba, 90 = hacia delante (derecha)

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
// Cinta curva de ancho variable con línea de luz (un solo polígono).
function tube(P, pts, w0, w1, m, o = {}, n = 2, light = true) {
  const c = pts.length > 2 ? crv(pts, n) : pts, L = [0], N = c.length;
  for (let i = 1; i < N; i++) L.push(L[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const tot = L[N - 1] || 1, lf = [], rt = [], hl = [];
  for (let i = 0; i < N; i++) {
    const a = c[max(0, i - 1)], d = c[min(N - 1, i + 1)], tx = d[0] - a[0], ty = d[1] - a[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
    const w = max(.5, (w0 + (w1 - w0) * (L[i] / tot)) / 2);
    lf.push([c[i][0] + nx * w, c[i][1] + ny * w]); rt.push([c[i][0] - nx * w, c[i][1] - ny * w]);
    const sg = nx * -.6 + ny * -.8 >= 0 ? 1 : -1;
    if (i > 0 && i < N - 1 && w > 2) hl.push([c[i][0] + nx * sg * w * .5, c[i][1] + ny * sg * w * .5]);
  }
  P.poly([...lf, ...rt.reverse()], m, { shade: 'vol', ...o });
  if (light && hl.length > 1) P.line(hl, m, 3, {});
  return c;
}
// Cinemática inversa de dos huesos: devuelve la articulación (codo o rodilla) más cercana a la pista `hint` (vector).
function ik(a, b, l1, l2, hint) {
  let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
  const mx = (l1 + l2) * .999, mn = abs(l1 - l2) + .5; d = min(mx, max(mn, d));
  const ux = dx / Math.hypot(dx, dy || 1e-6) || 0, uy = dy / (Math.hypot(dx, dy) || 1);
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(max(0, l1 * l1 - x * x));
  const c1 = [a[0] + ux * x - uy * h, a[1] + uy * x + ux * h], c2 = [a[0] + ux * x + uy * h, a[1] + uy * x - ux * h];
  const dot = c => (c[0] - a[0]) * hint[0] + (c[1] - a[1]) * hint[1];
  return dot(c1) >= dot(c2) ? c1 : c2;
}
// Inclinación del cuerpo apoyado: cizalla desde la altura de la cadera; con rot, giro rígido alrededor de un pivote.
function mover(lean, hipY, rot, pivot) {
  if (rot) { const c = cos(rot * D), s = sin(rot * D); return (x, y) => { const dx = x - pivot[0], dy = y - pivot[1]; return [pivot[0] + c * dx - s * dy, pivot[1] + s * dx + c * dy]; }; }
  const k = sin(lean * D) * .8;
  return (x, y) => [x + max(0, -y - hipY) * k, y];
}

// ---------- paletas por rey -------------------------------------------------------------------------------------------
// body = carne, dark = armadura oscura y sombras, horn = cuernos y garras, metal = hierro y filos, eye = ojos y orbes,
// cloth = telas, trim = adornos (latón, perla, plata), bone = cráneo y colmillos.
const KING = {
  kazgorath: {
    body: ['#2a0a0c', '#5a1612', '#a02a1a', '#c8482a', '#ec7a42'], dark: ['#0a0608', '#1a0e12', '#2e1a1e', '#503034', '#7c504a'],
    horn: ['#08060c', '#14101c', '#241c2c', '#3e3446', '#625868'], metal: ['#1a1218', '#382a30', '#5e4a50', '#8a7478', '#bca4a2'],
    eye: ['#6a1208', '#b02a0a', '#ff6a1a', '#ffa030', '#ffe070'], cloth: ['#1a0608', '#3a0e12', '#6a1a1a', '#942a24', '#c04a34'],
    trim: ['#3a2410', '#7a5420', '#c08a30', '#e8b850', '#fff0a0'], bone: ['#4a3a34', '#8a7060', '#c8b090', '#e8d4b0', '#fff4dc'], emit: '#ff7a28',
  },
  vhel: {
    body: ['#0e1630', '#1e2e5c', '#34488a', '#587cb8', '#9cc0e4'], dark: ['#03050c', '#080e1e', '#101a36', '#1e2c52', '#36487a'],
    horn: ['#5a2a30', '#a8584e', '#e8a79a', '#f8d0bc', '#fff0e6'], metal: ['#08182a', '#103650', '#1f5a78', '#3a88a2', '#78c4ca'],
    eye: ['#0c4450', '#188a88', '#3ccdb8', '#7affe0', '#e0fff8'], cloth: ['#06182a', '#0c3a52', '#16607a', '#2a8aa0', '#5ac0c8'],
    trim: ['#5a6a8a', '#a0b0c8', '#d8e0f0', '#f4f6ff', '#ffffff'], bone: ['#4a4458', '#8a8aa0', '#c8ccd8', '#e8ecf4', '#ffffff'], emit: '#7affe0',
  },
  ysgrim: {
    body: ['#14122a', '#2a2848', '#4a4a6a', '#7a7aa0', '#a8aed4'], dark: ['#05040c', '#0e0c1c', '#1c1a34', '#33305a', '#524e84'],
    horn: ['#1c2a5a', '#3a5aa0', '#6e90e0', '#a8c4ff', '#e8f0ff'], metal: ['#4a5a88', '#8a9ccc', '#bccaf0', '#e0eaff', '#ffffff'],
    eye: ['#18306a', '#3260b0', '#6aa4f0', '#b0d8ff', '#f0faff'], cloth: ['#0a0818', '#18142e', '#2c2650', '#443c72', '#675d98'],
    trim: ['#4a5a88', '#8a9ccc', '#bccaf0', '#e0eaff', '#ffffff'], bone: ['#3a3c5a', '#7a7e9e', '#b4b8d0', '#dcdff0', '#ffffff'], emit: '#9ab0ff',
  },
  tzar: {
    body: ['#141a0a', '#303c14', '#6a7a2a', '#8c9e3c', '#b6c85a'], dark: ['#0a0604', '#1a0e0a', '#2e1a14', '#4a2c20', '#6a4430'],
    horn: ['#0c0804', '#24140a', '#4a2a12', '#7a4a1e', '#a8702e'], metal: ['#2a1a0c', '#4a3016', '#7a5a2a', '#a88a44', '#d4b868'],
    eye: ['#2a0606', '#5c1010', '#a02020', '#d84a3a', '#ff8a70'], cloth: ['#16120a', '#2c2410', '#4e4018', '#76622a', '#a08a40'],
    trim: ['#2a2a0c', '#5a5818', '#98962c', '#c8c854', '#f0f090'], bone: ['#4a5a0c', '#8a9c1a', '#c8d83c', '#e8f070', '#fbffc0'], emit: '#d8e860',
  },
};
const MATS = ['body', 'dark', 'horn', 'metal', 'eye', 'cloth', 'trim', 'bone'];
const kingOf = id => KING[id] || KING.kazgorath;

// ---------- verdugo -----------------------------------------------------------------------------------------------------
function verdugo(P, ctx) {
  const ep = ctx.ep, an = ctx.anim, k = ctx.frame, mv = an === 'move', ph = ctx.phase * TAU, g = ep.glow;
  const atk = an === 'atk', spc = an === 'special', hit = an === 'hit';
  const bob = ep.bob + (an === 'idle' ? 0 : 0);
  // pose del hacha: mano cercana H1 y ángulo del mango phi (0 = vertical hacia arriba, 90 = hacia delante)
  let H1 = [20, -58 + bob], phi = 14, lean = ep.lean, crouch = 0;
  if (an === 'idle') { H1 = [20, -58 + bob], phi = 14 + k * 1.5; }
  else if (mv) { H1 = [18, -60 + sin(ph * 2) * 1.5], phi = 22 + ep.step * 3; }
  else if (atk) { [H1, phi, crouch] = [[[-4, -92], -64, 0], [[36, -70], 102, 3], [[42, -44], 152, 6]][k]; }
  else if (hit) { H1 = [8, -62]; phi = -8; }
  else if (spc) { [H1, phi, crouch] = [[[8, -92], -30, 0], [[34, -40], 168, 8]][k]; }
  const Q = mover(lean, 44 - crouch, 0, [0, 0]), q = (x, y) => Q(x, y + crouch * (y < -40 ? 1 : 0));
  const hipY = -44 + crouch;

  // piernas (cinemática inversa): paso en el movimiento, plantadas en el resto
  const stride = mv ? 15 : spc && k ? 10 : atk ? (k === 0 ? 8 : 14) : 9;
  const foot = (hx, sgn, base) => {
    if (mv) { const s = sin(ph + (sgn > 0 ? 0 : Math.PI)); return [hx + base + 15 * s, -max(0, cos(ph + (sgn > 0 ? 0 : Math.PI))) * 9]; }
    return [hx + base * (atk && sgn > 0 && k > 0 ? 1.5 : 1) + (sgn > 0 ? stride * .3 : -stride * .3), 0];
  };
  const leg = (hx, sgn, far) => {
    P.layer(far ? 'far' : 'near');
    const hip = q(hx, hipY), ft = q(...foot(hx, sgn, sgn > 0 ? 5 : -9)), kn = ik(hip, add(ft, [0, -5]), 24, 22, [1, .2]);
    tube(P, [hip, kn], 14, 12, 'body', { line: !far }, 1, false);
    tube(P, [kn, add(ft, [0, -5])], 12, 9, 'dark', { line: !far }, 1, true);                              // grebas
    P.blob(add(kn, [2, 0]), 6.5, 5.5, 'metal', { shade: 'sphere', line: !far });                        // rodillera
    P.poly([add(ft, [-7, -9]), add(ft, [-8, 0]), add(ft, [12, 0]), add(ft, [13, -4]), add(ft, [6, -10])], 'dark', { shade: 'vol', line: !far });
    P.line([add(ft, [-6, -7]), add(ft, [8, -6])], 'metal', 3);
    P.poly([add(ft, [10, -4]), add(ft, [15, -1]), add(ft, [11, 0])], 'horn', { shade: 'flat', tone: 3 });
  };
  const aN = [10, -77], aF = [-8, -78];                                                                     // hombros
  const axeV = dirOf(phi), axeN = [cos(phi * D), sin(phi * D)], loc = (u, w) => add(add(H1, axeV, u), axeN, w);
  const H2 = add(H1, axeV, -17);

  P.layer('far');
  leg(-6, -1, true);
  { const el = ik(q(...aF), q(...H2), 22, 22, [-.4, 1]); tube(P, [q(...aF), el, q(...H2)], 13, 9, 'body', {}, 1, false); }          // brazo lejano
  P.poly([q(-14, -50), q(-24, -26 + sin(ph) * (mv ? 2 : 0)), q(-17, -22), q(-9, -44)], 'cloth', { shade: 'vol' });                    // faldón trasero
  P.blob(q(-15, -79), 8, 6, 'metal', { shade: 'sphere' });                                                                             // hombrera lejana
  tube(P, [q(12, -99), q(19, -108), q(16, -120)], 5, 1, 'horn', {}, 2);                                                                // cuerno lejano

  P.layer('mid');
  // tronco
  P.smooth([q(-12, -44), q(12, -44), q(14, -58), q(20, -75), q(10, -85), q(-6, -85), q(-17, -74), q(-13, -58)], 'body', { n: 3 });
  P.blob(q(8, -69), 8.5, 6.2, 'body', { shade: 'flat', tone: 3 });                                                                      // pectoral iluminado
  P.fold([q(2, -64), q(8, -60), q(14, -61)], 'body'); P.fold([q(-2, -52), q(5, -55)], 'body');
  P.line([q(-1, -76), q(-1, -56)], 'body', 1);
  P.poly([q(-13, -50), q(13, -50), q(13, -45), q(-13, -45)], 'cloth', { shade: 'vol', line: true });                                    // cinturón
  P.poly([q(-3, -51), q(4, -51), q(4, -44), q(-3, -44)], 'trim', { shade: 'vol', line: true });                                         // hebilla
  P.layer('near');
  P.poly([q(1, -46), q(18, -46), q(17, -24 + sin(ph) * (mv ? 2 : 0)), q(12, -19), q(8, -25), q(3, -20)], 'cloth', { shade: 'vol', line: true });   // faldón delantero
  P.fold([q(6, -44), q(7, -26)], 'cloth'); P.fold([q(12, -44), q(13, -25)], 'cloth');
  P.line([q(3, -22), q(17, -22)], 'trim', 2);
  leg(4, 1, false);
  P.layer('mid');
  // cabeza: yelmo con visera, capucha y cuernos
  const hx = 9, hy = -95 + (hit ? 3 : 0);
  P.poly([q(hx - 9, hy - 6), q(hx - 15, hy + 6), q(hx - 4, hy + 12), q(hx + 2, hy + 8)], 'cloth', { shade: 'vol' });                    // capucha trasera
  P.blob(q(hx, hy), 9.5, 10, 'metal', { shade: 'sphere' });
  P.poly([q(hx + 3, hy - 1), q(hx + 12, hy - 1), q(hx + 12, hy + 9), q(hx + 6, hy + 11), q(hx + 2, hy + 6)], 'dark', { shade: 'vol', line: true });   // mandíbula
  P.line([q(hx + 4, hy + 6), q(hx + 11, hy + 6)], 'metal', 3);
  P.emit({ poly: [q(hx + 3, hy - 3.6), q(hx + 12.5, hy - 4.6), q(hx + 12.5, hy - 1.6), q(hx + 4.5, hy - 1)] });
  P.line([q(hx + 2, hy - 7), q(hx + 12, hy - 6.6)], 'metal', 1);
  tube(P, [q(hx - 4, hy - 7), q(hx - 14, hy - 12), q(hx - 15, hy - 25)], 6.5, 1, 'horn', { line: true }, 2);
  P.layer('mid');

  // hacha: mango con aros, filo enorme con barba y pico trasero
  const butt = loc(-26, 0), top = loc(38, 0);
  P.layer('near');
  P.cap(q(...butt), q(...top), 3.6, 3.6, 'dark', { line: false, dt: 1 });
  for (const u of [-14, 8, 28]) P.cap(q(...loc(u, 0)), q(...loc(u + 2.4, 0)), 4.6, 4.6, 'metal', { line: false });
  P.poly([q(...loc(36, -1.5)), q(...loc(34, -12)), q(...loc(26, -13)), q(...loc(25, -1.5))], 'metal', { shade: 'vol', line: true });      // pico trasero
  const blade = [[40, 1], [47, 8], [47, 18], [41, 28], [28, 33], [14, 28], [9, 19], [17, 20], [24, 15], [28, 9], [27, 1]].map(p => q(...loc(p[0], p[1])));
  P.poly(blade, 'metal', { shade: 'vol', line: true });
  P.poly([q(...loc(38, 4)), q(...loc(30, 9)), q(...loc(28, 22)), q(...loc(36, 16))], 'metal', { shade: 'flat', tone: 3 });
  P.line(blade.slice(1, 7), 'metal', 4);
  P.fold([q(...loc(34, 6)), q(...loc(24, 12)), q(...loc(18, 22))], 'metal');
  P.emit({ px: [q(...loc(44, 14)), q(...loc(36, 26)), q(...loc(20, 28))] });
  P.anchor('blade', q(...loc(30, 31)));
  // manos y brazo cercano
  const hnd = (p, far) => { P.blob(q(...p), 5.6, 5.6, 'dark', { shade: 'sphere', line: true, far }); P.line([q(p[0] - 2, p[1] - 3), q(p[0] + 2, p[1] - 3)], 'metal', 3); };
  hnd(H2, false);
  { const el = ik(q(...aN), q(...H1), 22, 22, [-.3, 1]); tube(P, [q(...aN), el, q(...H1)], 14, 10, 'body', { line: true }, 1, false);
    tube(P, [lerp(el, q(...H1), .35), q(...H1)], 11, 10, 'dark', { line: true }, 1, false); }
  hnd(H1, false);
  // hombrera cercana con pinchos
  P.blob(q(10, -80), 12.5, 8.5, 'metal', { shade: 'sphere', line: true });
  for (const [x, y, dx, dy] of [[4, -85, -2, -9], [11, -87, 2, -10], [18, -82, 8, -7]]) P.poly([q(x - 2.4, y + 1), q(x + dx, y + dy), q(x + 2.6, y + 1.4)], 'horn', { shade: 'vol', line: true });
  P.line([q(0, -78), q(21, -77)], 'metal', 1);
  // grietas de energía en el suelo (golpe contra el suelo)
  if (spc && k) {
    const gx = loc(32, 0)[0];
    P.emit({ line: [[gx, -1], [gx + 20, 0], [gx + 38, -1]] }); P.emit({ line: [[gx - 4, 0], [gx - 26, -1]] }); P.emit({ line: [[gx + 8, -1], [gx + 14, -8]] });
    P.emit({ px: [[gx + 30, -9], [gx - 14, -7], [gx + 44, -4], [gx + 4, -14], [gx + 22, -12]] });
  }
  if (spc && !k) P.emit({ px: [q(...loc(44, 14)), q(...loc(40, 24)), q(...loc(26, 30))] });
  void g;
}

// ---------- brujo infernal ----------------------------------------------------------------------------------------------
function brujo(P, ctx) {
  const ep = ctx.ep, an = ctx.anim, k = ctx.frame, ph = ctx.phase * TAU, g = ep.glow;
  const atk = an === 'atk', spc = an === 'special', mv = an === 'move', hit = an === 'hit';
  const bob = ep.bob * 1.5 + (an === 'idle' ? (k ? -1 : 1) : 0) + (mv ? sin(ph * 2) * 1.5 : 0);
  let H = [26, -60 + bob], phi = 3, orbR = 6, lean = ep.lean, farH = [-10, -56 + bob], arms2 = false;
  if (mv) { phi = 12; lean = 7; }
  else if (atk) { [H, phi, orbR] = [[[18, -62], -22, 8], [[34, -66], 74, 10], [[30, -60], 58, 6]][k]; }
  else if (hit) { H = [14, -56]; phi = -12; }
  else if (spc) { [H, phi, orbR] = [[[18, -84], 0, 9], [[18, -86], 0, 12]][k]; farH = [-6, -96]; arms2 = true; }
  const piv = [0, -50 + bob], Q = mover(lean, 40, 0, piv), q = (x, y) => Q(x, y + bob * (y < -20 ? 1 : 0));
  const sway = i => sin(ph + i * 1.6) * (mv ? 5 : 3) - (mv ? 4 : 0) - lean * .4;

  // hacia atrás: jirones de la túnica y brazo lejano
  P.layer('far');
  for (let i = 0; i < 3; i++) {
    const x = -22 + i * 9, sw = sway(i + 1);
    P.poly([q(x, -30), q(x + 12, -30), q(x + 8 + sw, -6 - i % 2 * 5), q(x + 3 + sw, -14), q(x - 2 + sw, -4)], 'cloth', { shade: 'vol' });
  }
  const shF = q(-9, -76), fh = q(...farH);
  tube(P, [shF, ik(shF, fh, 18, 18, spc ? [-1, 0] : [0, 1]), fh], 10, 6, 'cloth', {}, 1, false);
  P.blob(fh, 4.4, 4.4, 'bone', { shade: 'sphere' });
  if (spc) P.emit({ blob: [add(fh, [0, -6]), 3, 3] });

  P.layer('mid');
  // túnica: hombros, falda amplia y dobladillo irregular
  const hem = [[-24, -20], [-20, -6 + sway(0) * .3 - 1], [-12, -12], [-6, -4 + sway(1) * .3], [2, -12], [9, -2 + sway(2) * .3], [15, -11], [23, -8], [25, -20]];
  P.smooth([q(-15, -74), q(9, -76), q(18, -60), q(25, -40), ...hem.slice().reverse().map(p => q(p[0], p[1])), q(-18, -52)], 'cloth', { n: 3 });
  P.fold([q(-12, -66), q(-18, -40), q(-20, -24)], 'cloth'); P.fold([q(2, -64), q(4, -40), q(10, -14)], 'cloth'); P.fold([q(14, -58), q(20, -34)], 'cloth');
  P.poly([q(-22, -26), q(24, -26), q(25, -21), q(-23, -21)], 'trim', { shade: 'vol', line: true });                                        // orla dorada
  P.line([q(-14, -50), q(15, -50)], 'trim', 2); P.poly([q(-1, -53), q(5, -53), q(5, -47), q(-1, -47)], 'trim', { shade: 'vol', line: true });   // cinto
  // hombreras de hueso y pechera de costillas
  P.layer('near');
  P.blob(q(-12, -76), 8, 5.5, 'bone', { shade: 'sphere', line: true }); P.blob(q(13, -76), 8, 5.5, 'bone', { shade: 'sphere', line: true });
  for (let i = 0; i < 3; i++) P.line([q(-6, -69 + i * 4), q(2, -68 + i * 4), q(7, -69 + i * 4)], 'bone', 3);
  // capucha, cráneo, cuernos de carnero
  const hx = 4, hy = -88 + (hit ? 2 : 0);
  P.layer('mid');
  P.poly([q(hx - 8, hy - 9), q(hx + 2, hy - 15), q(hx + 12, hy - 10), q(hx + 10, hy + 6), q(hx - 2, hy + 12), q(hx - 14, hy + 10)], 'cloth', { shade: 'vol' });
  P.blob(q(hx + 2, hy), 8.5, 9.5, 'bone', { shade: 'sphere' });
  P.poly([q(hx + 4, hy + 4), q(hx + 12, hy + 3), q(hx + 11, hy + 9), q(hx + 4, hy + 10)], 'bone', { shade: 'flat', tone: 2 });                 // mandíbula
  P.poly([q(hx + 1, hy - 4), q(hx + 6, hy - 5), q(hx + 6, hy + 1), q(hx + 1, hy + 1)], 'dark', { shade: 'flat', tone: 0 });                    // órbita
  P.emit({ px: [q(hx + 3, hy - 2), q(hx + 4, hy - 2), q(hx + 4, hy - 3)] });
  P.poly([q(hx + 8, hy - 3), q(hx + 12, hy - 3.6), q(hx + 12, hy + 1), q(hx + 8, hy + 1)], 'dark', { shade: 'flat', tone: 1 });
  P.emit({ px: [q(hx + 9, hy - 1), q(hx + 10, hy - 1)] });
  P.line([q(hx + 5, hy + 5), q(hx + 12, hy + 5)], 'dark', 0);
  for (let i = 0; i < 4; i++) P.line([q(hx + 5 + i * 2, hy + 4), q(hx + 5 + i * 2, hy + 6.4)], 'bone', 4);
  P.poly([q(hx + 6, hy + 1), q(hx + 8, hy + 5), q(hx + 4, hy + 4)], 'dark', { shade: 'flat', tone: 0 });
  tube(P, [q(hx - 4, hy - 9), q(hx - 17, hy - 12), q(hx - 20, hy + 1), q(hx - 10, hy + 6)], 7, 1.5, 'horn', { line: true }, 2);
  tube(P, [q(hx + 4, hy - 12), q(hx + 12, hy - 22), q(hx + 22, hy - 16), q(hx + 21, hy - 7)], 5, 1.4, 'horn', { line: true }, 2);

  // báculo, orbe y mano cercana
  P.layer('near');
  const v = dirOf(phi), n = [cos(phi * D), sin(phi * D)], loc = (u, w) => add(add(H, v, u), n, w);
  const butt = loc(-52, 0), top = loc(40, 0);
  P.cap(q(...butt), q(...top), 3.2, 3.2, 'dark', { line: false, dt: 1 });
  for (const u of [-20, 6]) P.cap(q(...loc(u, 0)), q(...loc(u + 2, 0)), 4.4, 4.4, 'trim', { line: false });
  const O = q(...loc(48, 0));
  for (const sg of [-1, 1]) tube(P, [q(...loc(38, 0)), q(...loc(42, sg * 7)), q(...loc(52, sg * 6.4)), q(...loc(55, sg * 3))], 3, 1.2, 'trim', { line: true }, 1, false);   // garras que sujetan el orbe
  P.blob(O, orbR, orbR, 'eye', { shade: 'sphere' });
  P.emit({ blob: [add(O, [-orbR * .2, -orbR * .2]), orbR * .42, orbR * .42] });
  const nR = Math.round(4 + g * 6 + (spc ? 4 : 0));
  for (let i = 0; i < nR; i++) { const a = ph + i / nR * TAU * (spc ? 1 : .5); P.emit({ px: [[O[0] + cos(a) * (orbR + 3 + (spc ? k * 3 : 0)), O[1] + sin(a) * (orbR + 3 + (spc ? k * 3 : 0)) * .8]] }); }
  P.anchor('orb', O);
  if (spc) {                                                                                           // círculo de runas sobre el báculo
    const rr = 15 + k * 5;
    for (let i = 0; i < 12 + k * 6; i++) { const a = i / (12 + k * 6) * TAU + ph * .5; P.emit({ px: [[O[0] + cos(a) * rr, O[1] - 4 + sin(a) * rr * .35]] }); }
  }
  const sh = q(13, -76), hh = q(...H);
  tube(P, [sh, ik(sh, hh, 18, 18, [-.3, 1]), hh], 10, 6, 'cloth', { line: true }, 1, false);
  P.blob(hh, 4.8, 4.8, 'bone', { shade: 'sphere', line: true }); P.line([add(hh, [-2, -2]), add(hh, [2, -2])], 'bone', 1);
}

// ---------- cancerbero --------------------------------------------------------------------------------------------------
function cancerbero(P, ctx) {
  const ep = ctx.ep, an = ctx.anim, k = ctx.frame, ph = ctx.phase * TAU, g = ep.glow;
  const mv = an === 'move', atk = an === 'atk', spc = an === 'special', hit = an === 'hit', idle = an === 'idle';
  const rear = spc && k === 0 ? -34 : 0, slam = spc && k === 1;
  const lean = ep.lean * (rear ? 0 : 1) + (slam ? 8 : 0);
  const bob = ep.bob + (idle ? (k ? -1 : 0) : 0);
  const piv = [-26, 0], Q = mover(lean, 30, rear, piv), q = (x, y) => Q(x, y + (rear ? 0 : bob * (y < -20 ? 1 : 0)));
  const breathe = idle ? (k ? 1 : 0) : 0;

  // patas: galope con 4 fotogramas (cada pata desfasada), plantadas en el resto, alzadas al empinarse
  const leg = (ax, off, hind, far, raise) => {
    const sh = [ax, -38 + (hind ? 2 : 0)];
    let ft;
    if (mv) { const s = sin(ph + off), c = cos(ph + off); ft = [ax + (hind ? -2 : 4) + 15 * s, -max(0, c) * 12]; }
    else if (raise && !hind) ft = [ax + 14, -50];
    else if (slam && !hind) ft = [ax + 28, 0];
    else if (atk && !hind) ft = [ax + (k === 0 ? 0 : 8), 0];
    else ft = [ax + (hind ? -4 : 3) + (off > 0 ? 4 : -3), 0];
    const a = q(...sh), f = q(...ft), kn = ik(a, add(f, [0, -5]), hind ? 24 : 22, hind ? 22 : 21, hind ? [1, -.2] : [-.3, .8]);
    P.layer(far ? 'far' : 'near');
    tube(P, [a, kn], hind ? 18 : 14, 11, 'body', { line: !far }, 1, false);
    tube(P, [kn, add(f, [0, -5])], 10, 7, 'body', { line: !far }, 1, false);
    P.poly([add(f, [-5, -8]), add(f, [-5, 0]), add(f, [11, 0]), add(f, [10, -4]), add(f, [3, -9])], 'dark', { shade: 'vol', line: !far });
    for (let i = 0; i < 3; i++) P.poly([add(f, [8 + i * 1.2, -3 + i * 1.2 - 1]), add(f, [13 + i, -1 + i * .8]), add(f, [8 + i * 1.2, 0])], 'bone', { shade: 'flat', tone: 3 });
  };
  const L = (ax, o, h, f) => leg(ax, o, h, f, rear);

  P.layer('far');
  L(18, Math.PI * .4, false, true); L(-26, Math.PI * 1.3, true, true);
  // cola de tres tramos con púa ardiente
  { const w = mv ? sin(ph) * 6 : sin(ph * .8) * 3, tl = [q(-34, -46), q(-48, -52 + w * .3), q(-60, -60 + w), q(-68, -56 + w * 1.4)];
    tube(P, tl, 9, 2, 'body', {}, 2, false);
    const e = tl[3]; P.poly([add(e, [-1, -3]), add(e, [8, 1]), add(e, [-1, 3])], 'horn', { shade: 'vol' }); P.emit({ px: [add(e, [4, 0]), add(e, [5, 0])] }); }
  // cabeza lejana (más baja y atrás)
  const head = (base, off, openT, far, tilt, from) => {
    const neck0 = q(from[0], from[1]), hd = q(base[0] + off[0], base[1] + off[1]), tip = add(hd, [0, 0]);
    P.layer(far ? 'far' : 'near');
    tube(P, [neck0, add(lerp(neck0, hd, .5), [far ? 2 : -3, far ? 4 : -4]), hd], 18, 12, 'body', { line: !far }, 2, false);
    // cabeza: cráneo, hocico, mandíbula articulada, dientes, ojo, orejas y cuernos
    const jaw = openT * 12 * D, dn = [cos(tilt * D), sin(tilt * D)];
    const at = (u, w) => add(add(hd, dn, u), [-dn[1], dn[0]], w);
    P.blob(hd, 10, 8.6, 'body', { shade: 'sphere', line: !far });
    P.poly([at(4, -6), at(21, -3.6), at(23, 1), at(7, 3)], 'body', { shade: 'vol', line: !far });                                         // hocico superior
    P.poly([at(7, 2), at(22, 1), at(22 + sin(jaw) * 4, 4 + openT * 6), at(7, 6 + openT * 9)], 'dark', { shade: 'flat', tone: 0 });          // boca (cavidad)
    P.poly([at(3, 3), at(21, 3 + openT * 8), at(21, 6 + openT * 8), at(4, 8 + openT * 3)], 'body', { shade: 'vol', line: !far, dt: -1 });   // mandíbula inferior
    for (let i = 0; i < 4; i++) { P.poly([at(9 + i * 3.4, 1.6), at(10.6 + i * 3.4, 5), at(12 + i * 3.4, 1.6)], 'bone', { shade: 'flat', tone: 3 });
      P.poly([at(10 + i * 3.4, 4.5 + openT * 8), at(11.6 + i * 3.4, 1.4 + openT * 8), at(13 + i * 3.4, 4.5 + openT * 8)], 'bone', { shade: 'flat', tone: 3 }); }
    P.poly([at(21, -3.6), at(24, -2), at(24, 1), at(21, 1.4)], 'dark', { shade: 'flat', tone: 0 });                                          // morro
    P.emit({ poly: [at(3, -4.4), at(10, -5.2), at(10, -2.6), at(4.6, -2)] });
    P.line([at(1, -7.4), at(11, -6.4)], 'dark', 0);
    for (let i = 0; i < 2; i++) tube(P, [at(-5 - i * 4, -6), at(-12 - i * 4, -13 - i * 2), at(-11 - i * 4, -20 - i * 2)], 6, 1, 'horn', { line: !far }, 2, false);
    P.poly([at(-1, -8), at(2, -16), at(6, -8)], 'dark', { shade: 'vol', line: !far });
    return at(22, 3);
  };
  const open = atk ? [[1, .8], [1.3, .15], [.3, 1.2]][k] : spc ? [1.2, 1.4][k] : hit ? [1.3, 1.1] : idle ? [.15 + breathe * .2, .1] : mv ? [.35, .25] : [.2, .2];
  const reach = atk ? [[-8, -3], [22, 2], [0, 22]][k] : slam ? [16, 12] : hit ? [-12, -9] : [sin(ph) * (mv ? 2 : 0), 0];
  const hA = atk || spc || hit ? open : [open[0], open[1]];
  const aTilt = rear ? -44 : slam ? 18 : hit ? -28 : 0;
  // cabeza B (lejana)
  const baseB = [50 + reach[1], -36 + (hit ? -4 : 0) + (slam ? 10 : 0) + (rear ? -8 : 0)];
  head(baseB, [0, 0], hA[1], true, aTilt + 26, [24, -44]);
  P.layer('mid');
  // torso: lomo arqueado, pecho ancho y vientre
  P.smooth([q(-32, -48), q(-20, -61), q(0, -63), q(20, -64), q(34, -56), q(36, -38), q(26, -26), q(0, -28), q(-26, -30), q(-36, -40)], 'body', { n: 3 });
  P.smooth([q(-22, -34), q(0, -33), q(24, -31), q(24, -27), q(0, -28), q(-24, -29)], 'dark', { n: 2, dt: -1 });
  P.blob(q(24, -46), 9, 11, 'body', { shade: 'flat', tone: 3 });                                                                        // pecho iluminado
  P.fold([q(-10, -54), q(-4, -44), q(2, -38)], 'body'); P.fold([q(8, -56), q(14, -46)], 'body');
  for (let i = 0; i < 7; i++) {                                                                                                         // cresta dorsal de púas
    const x = -28 + i * 9, y = -52 - sin((i + .5) / 7 * Math.PI) * 11 - 1;
    P.poly([q(x - 3, y + 2), q(x + 1 - i * .4, y - 9 - (i === 4 ? 3 : 0)), q(x + 5, y + 3)], 'horn', { shade: 'vol', line: true });
  }
  P.layer('near');
  L(-26, Math.PI * .3, true, false); L(18, Math.PI * .9, false, false);
  // collar de pinchos
  P.poly([q(18, -62), q(30, -60), q(30, -50), q(20, -50)], 'metal', { shade: 'vol', line: true });
  for (let i = 0; i < 3; i++) P.poly([q(26 + 0, -61 + i * 4 - 1), q(33 + 2, -62 + i * 4 - 3), q(29, -57 + i * 4)], 'metal', { shade: 'flat', tone: 3 });
  // cabeza A (principal, alta y cercana)
  const baseA = [50 + reach[0], -73 + (hit ? -3 : 0) + (slam ? 22 : 0) + (rear ? -6 : 0) + bob * .5];
  const jawPt = head(baseA, [0, 0], hA[0], false, aTilt - 8, [24, -58]);
  P.anchor('jaw', jawPt);
  if (slam) P.emit({ px: [[44, -2], [52, -6], [60, -1], [36, -4], [66, -8], [58, -12]] });
  if (spc && !slam) P.emit({ px: [q(66, -78), q(70, -86), q(60, -88)] });
  if (g > .8 && !spc) P.emit({ px: [add(jawPt, [-4, 6]), add(jawPt, [-2, 10])] });
}

// ---------- heraldo alado -----------------------------------------------------------------------------------------------
function heraldo(P, ctx) {
  const ep = ctx.ep, an = ctx.anim, k = ctx.frame, ph = ctx.phase * TAU, g = ep.glow;
  const atk = an === 'atk', spc = an === 'special', mv = an === 'move', hit = an === 'hit', idle = an === 'idle';
  // ángulo de las alas (0 = arriba, 90 = atrás horizontal, 130 = abajo-atrás)
  let alpha = idle ? [26, 50][k] : mv ? 70 - 50 * ep.step : atk ? [14, 96, 122][k] : hit ? 138 : spc ? [20, 6][k] : 60;
  const rot = atk ? [-8, 24, 38][k] : hit ? -12 : mv ? 6 : 0;
  const bob = ep.bob + (idle ? (k ? 1 : -1) : 0);
  const piv = [0, -56], Q = mover(0, 0, rot, piv), q = (x, y) => Q(x, y + bob);
  const dive = atk && k > 0;

  // alas: brazo óseo y plumas-cuchilla; la lejana va detrás y más oscura
  const wing = (far, da) => {
    P.layer(far ? 'far' : 'near');
    const R = q(-5, -73), a = alpha + da, arm = dirOf(180 - a - 0), wr = add(R, [-sin(a * D), -cos(a * D)], 18);
    void arm;
    const tips = [], N = 5;
    for (let i = 0; i < N; i++) {
      const ang = a + (i - 2) * 17 + 20, d = [-sin(ang * D), -cos(ang * D)], len = 52 - abs(i - 2) * 3 - (i === 0 ? 4 : 0);
      tips.push({ root: lerp(R, wr, i / (N - 1)), tip: add(lerp(R, wr, i / (N - 1)), d, len), d });
    }
    const outline = [R, wr];
    for (let i = 0; i < N; i++) { outline.push(tips[i].tip); if (i + 1 < N) outline.push(add(lerp(tips[i].tip, tips[i + 1].tip, .5), tips[i].d, -15)); }
    outline.push(add(R, [3, 3]));
    P.poly(outline, 'dark', { shade: 'vol', line: !far, dt: 1 });
    for (const f of tips) P.line([add(f.root, f.d, 12), add(f.tip, f.d, -3)], 'dark', 0);
    P.line(tips.map(f => f.tip), 'trim', far ? 2 : 3);
    for (const f of tips) P.line([add(f.tip, f.d, -3), f.tip], 'trim', 4);
    tube(P, [R, lerp(R, wr, .5), wr], 8, 5, 'dark', { line: !far }, 1, false);
    for (let i = 0; i < 4; i++) { const c = lerp(R, wr, i / 3.4); P.blob(add(c, [-sin((a + 36) * D), -cos((a + 36) * D)], 6), 6.4, 4.6, 'cloth', { shade: 'vol', line: !far }); }
    P.blob(wr, 4, 4, 'trim', { shade: 'sphere', line: !far });
    return tips;
  };
  const fa = wing(true, 16);

  // piernas con garras (colgando; en el picado, estiradas hacia delante)
  const leg = (hx, far, sw) => {
    P.layer(far ? 'far' : 'near');
    const hip = q(hx, -47), ft = dive ? q(hx + 16 + sw, -42 + (k === 2 ? 6 : 0)) : q(hx - 3 + sw, -9), kn = ik(hip, ft, 17, 17, dive ? [0, 1] : [1, .3]);
    tube(P, [hip, kn], 8, 6, 'body', { line: !far }, 1, false);
    tube(P, [kn, ft], 6, 4, 'body', { line: !far }, 1, false);
    for (let i = -1; i <= 1; i++) P.poly([add(ft, [-1, 0]), add(ft, [dive ? 7 : 3 + i * 3, dive ? i * 3 : 6]), add(ft, [1, 1])], 'horn', { shade: 'flat', tone: 3 });
  };
  leg(-3, true, -4);

  P.layer('mid');
  // torso con peto, faldón de tabardo y cinto
  P.smooth([q(-9, -46), q(10, -46), q(13, -60), q(14, -74), q(2, -80), q(-10, -74), q(-12, -58)], 'body', { n: 3 });
  P.smooth([q(-8, -54), q(11, -54), q(13, -66), q(14, -75), q(2, -80), q(-10, -75), q(-11, -64)], 'metal', { n: 3 });
  P.blob(q(5, -68), 5, 5, 'metal', { shade: 'flat', tone: 4 });
  P.line([q(-2, -76), q(-2, -56)], 'metal', 1); P.fold([q(2, -62), q(9, -58)], 'metal');
  P.poly([q(-10, -54), q(12, -54), q(13, -50), q(-10, -50)], 'trim', { shade: 'vol', line: true });
  P.layer('near');
  P.poly([q(-7, -50), q(11, -50), q(9, -32 + sin(ph) * (mv ? 2 : 0)), q(2, -26), q(-5, -33)], 'cloth', { shade: 'vol', line: true });
  P.fold([q(1, -48), q(2, -34)], 'cloth'); P.fold([q(6, -48), q(7, -35)], 'cloth');
  P.line([q(-6, -31), q(8, -31)], 'trim', 2);
  leg(4, false, 2);
  // cabeza: yelmo de cresta, rostro con pico, cuernos
  const hx = 4, hy = -90 + (hit ? 1 : 0);
  P.layer('mid');
  tube(P, [q(hx - 6, hy - 6), q(hx - 20, hy - 12 + sin(ph) * 2), q(hx - 30, hy - 6 + sin(ph + 1) * 3)], 10, 2, 'cloth', {}, 2);                    // penacho
  P.blob(q(hx, hy), 8.5, 9, 'metal', { shade: 'sphere' });
  P.poly([q(hx + 1, hy - 1), q(hx + 12, hy + 3), q(hx + 3, hy + 8)], 'bone', { shade: 'vol', line: true });                                     // pico
  P.poly([q(hx - 3, hy - 7), q(hx + 3, hy - 14), q(hx + 12, hy - 10)], 'metal', { shade: 'vol', line: true });                                    // cresta
  P.emit({ poly: [q(hx + 2, hy - 3.4), q(hx + 9, hy - 3.8), q(hx + 9, hy - 1.4), q(hx + 3, hy - 1)] });
  tube(P, [q(hx - 3, hy - 8), q(hx - 8, hy - 16), q(hx - 5, hy - 24)], 5, 1, 'horn', { line: true }, 2);
  if (spc) P.line([q(hx + 3, hy + 3), q(hx + 8, hy + 4)], 'dark', 0);

  // trompeta: pabellón acampanado con aros
  P.layer('near');
  let lips = q(hx + 10, hy + 4), tau = -40;
  if (idle || mv) { lips = q(20, -64 + (idle ? 0 : 3)); tau = 8; }
  else if (atk) { lips = q(6, -50); tau = 172; }
  else if (hit) { lips = q(14, -58); tau = 40; }
  else if (spc) { lips = q(hx + 10, hy + 3); tau = -46; }
  const tv = [cos(tau * D), sin(tau * D)], tn = [-tv[1], tv[0]], tl = (u, w) => add(add(lips, tv, u), tn, w);
  tube(P, [tl(0, 0), tl(22, 0), tl(34, 0)], 3.4, 4.4, 'trim', { line: true }, 1, false);
  P.poly([tl(34, -2.2), tl(52, -10), tl(52, 10), tl(34, 2.2)], 'trim', { shade: 'vol', line: true });                                           // pabellón
  P.poly([tl(51, -9), tl(53, -9), tl(53, 9), tl(51, 9)], 'trim', { shade: 'flat', tone: 4 });
  P.poly([tl(48, -6.4), tl(52, -7), tl(52, 7), tl(48, 6.4)], 'dark', { shade: 'flat', tone: 0 });
  for (const u of [12, 26]) P.cap(tl(u, 0), tl(u + 2, 0), 5, 5, 'trim', { line: false });
  P.anchor('bell', tl(54, 0));
  if (spc) {                                                                                       // ondas de sonido emisivas
    for (let r = 0; r < 3; r++) for (let i = -4; i <= 4; i += 1) { const a = i / 4 * .8, rr = 62 + r * (9 + k * 5);
      if ((i + r) % 2 === 0) P.emit({ px: [add(lips, [cos(a + tau * D) * rr, sin(a + tau * D) * rr])] }); }
  }
  // brazo cercano que sostiene la trompeta
  const sh = q(9, -75), hand = idle || mv ? tl(10, 0) : atk ? q(18, -54) : spc ? tl(14, 0) : tl(10, 0);
  tube(P, [sh, ik(sh, hand, 17, 16, [-.3, 1]), hand], 8, 6, 'body', { line: true }, 1, false);
  P.blob(hand, 4.4, 4.4, 'dark', { shade: 'sphere', line: true });
  P.blob(q(9, -77), 7.5, 5.5, 'metal', { shade: 'sphere', line: true });                                                                       // hombrera
  const wn = wing(false, 0);
  void fa; void wn; void g;
}

export default {
  id: 'elites',
  kit: 1,
  ready: true,
  materials: MATS,
  ramps: kingId => { const kg = kingOf(kingId), o = {}; for (const m of MATS) o[m] = ramp5(kg[m]); return o; },
  emit: kingId => kingOf(kingId).emit,
  types: [
    { id: 'verdugo', size: { w: 220, h: 192, gy: 172 }, draw: verdugo },
    { id: 'brujo', size: { w: 196, h: 160, gx: 90, gy: 154 }, draw: brujo },
    { id: 'cancerbero', size: { w: 230, h: 140, gy: 136 }, draw: cancerbero },
    { id: 'heraldo', size: { w: 230, h: 180, gy: 156 }, draw: heraldo },
  ],
};
