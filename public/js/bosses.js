// Enemigos de la arena: 4 Reyes Demonio (3 formas cada uno), 4 secuaces y 4 demonios élite.
// Todo original y dibujado en código sobre canvas, sin imágenes.
//
// Los REYES se dibujan a RESOLUCIÓN NATIVA: formas vectoriales con sombreado por celdas (sombra,
// luz y brillo de borde) que se rasterizan directamente a su tamaño final en píxeles lógicos (nada
// de ampliar un sprite pequeño). Después se endurecen los bordes (sin suavizado) y se añade un
// contorno de 1 px, así conservan el estilo pixel art con mucho más detalle.
import { shade } from './sprites.js';

// ---- Constantes fáciles de ajustar ---------------------------------------------------------------
// Altura final de cada forma del rey en píxeles lógicos (el lienzo mide 304 de alto: 120 = 39 %, 152 = 50 %)
export const KING_H = [120, 136, 152];
const CW = 360, CH = 250, OX = 180, OY = 226;     // lienzo de dibujo y punto de los pies
const ALPHA_CUT = 110;                            // umbral para endurecer los bordes
const OUTLINE = '#0d0812';

const hashN = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

// ---- Caja de herramientas de dibujo (coordenadas de diseño: pies en (0,0), y negativa hacia arriba) --
const poly = pts => g => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
const smooth = pts => g => {
  const n = pts.length, m = i => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
  g.moveTo(...m(n - 1));
  for (let i = 0; i < n; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], ...m(i));
  g.closePath();
};
const ell = (x, y, rx, ry, rot = 0) => g => { g.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); };
const mir = (pts, s) => (s < 0 ? pts.map(([x, y]) => [-x, y]).reverse() : pts);
const sides = f => [f(-1), f(1)];

// Línea central curva: ang = 0 apunta hacia arriba, +π/2 a la derecha, π hacia abajo
function arc(x, y, ang, len, curve, n = 16, wob = 0) {
  const pts = [], st = len / n; let a = ang, px = x, py = y;
  for (let i = 0; i <= n; i++) { pts.push([px, py]); a += curve / n + (wob ? Math.sin(i * .9) * wob : 0); px += Math.sin(a) * st; py -= Math.cos(a) * st; }
  return pts;
}
// Tira con grosor que se afina: sirve para cuernos, tentáculos y carámbanos
function strip(cl, w0, w1 = 0.3) {
  const n = cl.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = cl[i], [ax, ay] = cl[Math.max(0, i - 1)], [bx, by] = cl[Math.min(n - 1, i + 1)];
    let tx = bx - ax, ty = by - ay; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const w = (w0 + (w1 - w0) * i / (n - 1)) / 2;
    L.push([x - ty * w, y + tx * w]); R.push([x + ty * w, y - tx * w]);
  }
  return poly([...L, ...R.reverse()]);
}
const horn = (x, y, ang, len, w, curve = 0, tip = 0.3) => strip(arc(x, y, ang, len, curve, 12), w, tip);
// Coral ramificado (cuernos de Vhel-Morkai): una rama principal con ramas que salen de ella
function coral(x, y, ang, len, w, curve, depth) {
  const cl = arc(x, y, ang, len, curve, 12), out = [strip(cl, w, .4)];
  if (depth > 0) for (const [at, da, k] of [[.4, -.75, .62], [.62, .8, .55], [.8, -.5, .4]].slice(0, depth + 1)) {
    const i = Math.round(at * 12), a0 = ang + curve * at;
    out.push(...coral(cl[i][0], cl[i][1], a0 + da, len * k, w * .7, curve * .4 * Math.sign(da), depth - 1));
  }
  return out;
}

function toolkit(g) {
  const BIG = 3000;
  const add = (parts, dx = 0, dy = 0) => { g.save(); g.translate(dx, dy); for (const p of [].concat(parts)) p(g); g.restore(); };
  // Relleno con sombreado por celdas: sombra abajo-derecha, luz arriba-izquierda y color base en medio
  const cel = (parts, c, o = {}) => {
    const a = o.d ?? 2.4, b = o.h ?? 1.5;
    g.save(); g.beginPath(); add(parts); g.clip();
    g.fillStyle = shade(c, -50); g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
    g.beginPath(); add(parts, -a, -a * .8); g.fillStyle = shade(c, 38); g.fill();
    g.save(); g.beginPath(); add(parts, b, b * .8); g.clip();
    g.beginPath(); add(parts, -a, -a * .8); g.fillStyle = c; g.fill();
    g.restore(); g.restore();
  };
  const flat = (parts, c) => { g.beginPath(); add(parts); g.fillStyle = c; g.fill(); };
  const line = (pts, c, w = 1) => {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
  };
  // Granulado dentro de una forma (textura de piel, roca o escamas)
  const dots = (parts, c, n, seed, box, sz = 1) => {
    g.save(); g.beginPath(); add(parts); g.clip(); g.fillStyle = c;
    for (let i = 0; i < n; i++) g.fillRect(box[0] + hashN(i, seed) * box[2], box[1] + hashN(i, seed + 7) * box[3], sz, sz);
    g.restore();
  };
  return { g, cel, flat, line, dots };
}

// ---- Rasterizado: mide, escala a la altura objetivo, endurece bordes y añade contorno ---------------
function silhouette(src, color) {
  const c = mk(src.width, src.height), g = c.getContext('2d');
  g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}
function bounds(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > ALPHA_CUT) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < x0 ? { x0: 0, y0: 0, w: 1, h: 1 } : { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function bake(draw, form, height) {
  const render = k => {
    const c = mk(CW, CH), g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, OX, OY);
    const anch = draw(toolkit(g), form) || {};
    return { c, g, anch };
  };
  // La escala se fija por el cuerpo (altura de la cabeza), no por cuernos o lanzas, para que el rey
  // se vea corpulento; nunca baja de la altura pedida ni pasa un 8 % de ella.
  const probe = render(1), hb = bounds(probe.c).h, top = probe.anch.top ? -probe.anch.top : hb;
  const k = Math.max(height / hb, Math.min(height * 1.08 / hb, height * .9 / top));
  const { c, g, anch } = render(k);
  const id = g.getImageData(0, 0, CW, CH), d = id.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= ALPHA_CUT ? 255 : 0;       // bordes duros, sin suavizado
  g.putImageData(id, 0, 0);
  const out = mk(CW, CH), og = out.getContext('2d'), dark = silhouette(c, OUTLINE);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) og.drawImage(dark, dx, dy);
  og.drawImage(c, 0, 0);
  const b = bounds(out), img = mk(b.w, b.h);
  img.getContext('2d').drawImage(out, b.x0, b.y0, b.w, b.h, 0, 0, b.w, b.h);
  const rel = ([x, y]) => [Math.round(x * k), Math.round(y * k)];     // relativo a los pies
  return {
    img, white: silhouette(img, '#ffffff'), w: b.w, h: b.h, ax: OX - b.x0, ay: OY - b.y0,
    eyes: (anch.eyes || []).map(rel), core: anch.core && rel(anch.core), head: anch.head && rel(anch.head),
  };
}

// ==== LOS CUATRO REYES ===========================================================================
// Cada función dibuja la forma f (0, 1 o 2). Las formas posteriores añaden detalle y tamaño.

function kazgorath(D, f) {
  const { cel, flat, line, dots } = D;
  const SK = '#a02a1a', DK = '#2a1a1e', HORN = '#1c1620', MG = '#ff6a1a', MG2 = '#ffc040', ASH = '#4e444c';
  const ws = [.62, .9, 1.15][f];
  // Alas de ceniza (más abiertas en cada forma)
  for (const s of [-1, 1]) {
    const W = ([x, y]) => [s * (10 + (x - 10) * ws), -66 + (y + 66) * ws];
    const pts = [[10, -62], [22, -92], [44, -120], [70, -102], [82, -84], [68, -80], [74, -60], [58, -60], [58, -40], [42, -48], [36, -28], [22, -46], [12, -44]].map(W);
    cel(poly(pts), ASH, { d: 3 });
    for (const t of [[44, -120], [70, -102], [74, -60], [58, -40]]) line([W([10, -62]), W(t)], shade(ASH, -50), 1.4);
    if (f > 0) for (let i = 0; i < 9 + f * 4; i++) { const k = i / (8 + f * 4), p = pts[2 + Math.floor(k * 6)]; flat(ell(p[0] - s * 2, p[1] + 3, 1.4, 1.4), i % 2 ? MG : MG2); }
  }
  // Piernas con grebas y pezuñas
  for (const s of [-1, 1]) {
    cel(smooth(mir([[-22, -42], [-5, -42], [-4, -20], [-8, -6], [-26, -6], [-24, -22]], s)), SK);
    cel(poly(mir([[-25, -24], [-5, -24], [-8, -5], [-25, -5]], s)), DK);
    cel(poly(mir([[-27, -6], [-8, -6], [-5, 0], [-29, 0]], s)), HORN, { d: 1.4 });
    line(mir([[-24, -24], [-6, -24]], s), MG, 1.2);
  }
  // Faldón de cuero con borde de magma
  cel(poly([[-24, -46], [24, -46], [20, -26], [9, -16], [0, -24], [-9, -16], [-20, -26]]), DK);
  line([[-20, -27], [-9, -17], [0, -24], [9, -17], [20, -27]], MG, 1.2);
  // Torso, abdomen y placas
  cel(smooth([[-32, -72], [-17, -84], [17, -84], [32, -72], [30, -56], [22, -42], [-22, -42], [-30, -56]]), SK);
  dots(smooth([[-32, -72], [-17, -84], [17, -84], [32, -72], [30, -56], [22, -42], [-22, -42], [-30, -56]]), shade(SK, -35), 40, 3, [-32, -84, 64, 42]);
  for (const y of [-52, -47]) line([[-9, y], [9, y]], shade(SK, -55), 1.2);
  for (const s of [-1, 1]) cel(poly(mir([[-27, -74], [-2, -77], [-2, -60], [-22, -55]], s)), DK, { d: 2 });
  for (const p of [[[0, -80], [-3, -70], [2, -62], [-2, -52]], [[-10, -66], [-14, -58]], [[10, -65], [13, -56]]]) line(p, MG, 1.4);
  line([[0, -80], [-3, -70], [2, -62], [-2, -52]], MG2, .6);
  flat(ell(0, -63, 3.2, 3.2), MG2);
  // Hombreras con púas y brazos
  for (const s of [-1, 1]) {
    cel(poly(mir([[-40, -70], [-36, -83], [-20, -86], [-20, -70]], s)), DK);
    for (let i = 0; i < 2 + f; i++) cel(horn(s * (34 - i * 6), -82 - i * 1, s * (.3 + i * .35), 12 + i * 3 + f * 3, 5, s * .25), HORN, { d: 1.2 });
    cel(smooth(mir([[-44, -72], [-32, -72], [-30, -52], [-33, -38], [-44, -38], [-46, -56]], s)), SK);
    cel(poly(mir([[-45, -64], [-31, -64], [-31, -58], [-45, -58]], s)), DK, { d: 1 });
    cel(ell(s * 39, -33, 8, 10), shade(SK, -8));
    for (const dx of [-5, 0, 5]) cel(horn(s * 39 + dx, -26, Math.PI, 9 + f * 2, 3.4, s * -.2), HORN, { d: 1 });
    if (f > 0) { line([[s * 39, -60], [s * 37, -48], [s * 40, -40]], MG, 1.2); }
  }
  // Cabeza, ojos y fauces
  cel(smooth([[-11, -90], [-9, -99], [0, -102], [9, -99], [11, -90], [9, -81], [0, -77], [-9, -81]]), SK);
  cel(poly([[-12, -93], [12, -93], [10, -89], [-10, -89]]), shade(SK, -30), { d: 1 });
  for (const s of [-1, 1]) { flat(poly(mir([[-9, -92], [-3, -90], [-4, -87], [-9, -89]], s)), MG2); flat(poly(mir([[-7, -91], [-4, -90], [-5, -89]], s)), '#fff6d0'); }
  line([[-6, -83], [0, -81], [6, -83]], '#14080c', 1.6);
  for (const x of [-4, 4]) flat(poly([[x - 1, -83], [x + 1, -83], [x, -80]]), '#f4ecd8');
  // Corona de cuernos (5, 7 o 9)
  const n = 2 + f;
  cel(horn(0, -98, 0, 17 + f * 6, 6, 0), HORN, { d: 1.4 });
  for (let i = 1; i <= n; i++) for (const s of [-1, 1]) cel(horn(s * (3 + i * 2.5), -97, s * (.28 + i * .3), 16 + f * 5 + (i % 2) * 4, 5, s * (.35 + i * .08)), HORN, { d: 1.3 });
  if (f > 1) for (let i = 0; i < 6; i++) flat(ell(-5 + i * 2, -108 - (i % 3) * 3, 1, 1), MG);
  return { eyes: [[-6, -90], [6, -90]], core: [0, -63], head: [0, -90], top: -102 };
}

function vhel(D, f) {
  const { cel, flat, line, dots } = D;
  const SK = '#2a3a6a', DK = '#16203e', FIN = '#1f5a78', CO = '#e8a79a', CO2 = '#fff0e6', GL = '#7affe0';
  // Aleta dorsal con espinas (detrás)
  const fin = [];
  for (let i = 0; i <= 14; i++) { const a = -2.5 + i * (5 / 14), r = (i % 2 ? 44 : 54) + f * 6; fin.push([Math.sin(a) * r * 1.0, -70 - Math.cos(a) * r * .9]); }
  cel(poly([[-16, -52], ...fin, [16, -52]]), FIN, { d: 3 });
  for (let i = 1; i < fin.length; i += 2) line([[0, -66], fin[i]], shade(FIN, -45), 1);
  // Tentáculos largos detrás (formas 2 y 3) que se arquean sobre el rey
  if (f > 0) for (const s of [-1, 1]) for (let j = 0; j < f; j++) {
    cel(strip(arc(s * (18 + j * 8), -60, s * (.9 - j * .25), 70 + j * 12, -s * (2.4 + j * .5), 22, .08), 10, 1.5), shade(SK, 10), { d: 2 });
  }
  // Tentáculos inferiores en abanico
  const nT = [6, 8, 10][f];
  for (let i = 0; i < nT; i++) {
    const u = i / (nT - 1) * 2 - 1, s = u < 0 ? -1 : 1, au = Math.abs(u);
    const ang = s * (Math.PI - au * (Math.PI / 2 - .35)), cur = -s * (au < .1 ? (i % 2 ? .9 : -.9) * -s : .5 + au * 1.9);
    const cl = arc(u * 13, -30, ang, 62 + (1 - au) * 14 + f * 6, cur, 20, .1).map(([x, y]) => [x, Math.min(y, -1)]);
    cel(strip(cl, 11, 1.6), shade(SK, 14 + (i % 2) * 6), { d: 1.8 });
    for (let k = 4; k < cl.length - 3; k += 2) flat(ell(cl[k][0], cl[k][1] + 1.5, 1.3, 1), CO2);
  }
  // Torso, branquias y collar de perlas
  cel(smooth([[-25, -74], [-12, -83], [12, -83], [25, -74], [19, -54], [15, -34], [-15, -34], [-19, -54]]), SK);
  dots(smooth([[-25, -74], [-12, -83], [12, -83], [25, -74], [19, -54], [15, -34], [-15, -34], [-19, -54]]), shade(SK, 28), 30, 5, [-25, -83, 50, 50]);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) line([[s * 15, -60 + i * 4], [s * 21, -62 + i * 4]], DK, 1.2);
  for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI; flat(ell(-13 + i * 3.25, -70 + Math.sin(a) * 6, 1.8, 1.8), '#f6f2ff'); }
  flat(ell(0, -61, 4.5, 4.5), GL); flat(ell(0, -61, 2, 2), '#e8fff8');
  if (f > 0) for (let i = 0; i < 8; i++) flat(ell(-12 + hashN(i, 9) * 24, -52 + hashN(i, 8) * 14, 1, 1), GL);
  // Brazos con membrana
  for (const s of [-1, 1]) {
    cel(poly(mir([[-30, -70], [-52, -52], [-56, -34], [-40, -44], [-34, -52]], s)), shade(FIN, 12), { d: 2 });
    cel(smooth(mir([[-35, -74], [-23, -74], [-27, -52], [-38, -32], [-44, -33], [-38, -54]], s)), SK);
    cel(ell(s * 40, -30, 6, 7), shade(SK, 10));
    for (const dx of [-4, 0, 4]) cel(horn(s * 40 + dx, -24, Math.PI, 10, 2.8, s * .4), CO2, { d: 1 });
    cel(ell(s * 25, -77, 10, 7), DK);
  }
  // Cabeza con barba de tentáculos
  cel(smooth([[-12, -83], [-14, -95], [-7, -103], [7, -103], [14, -95], [12, -83], [7, -76], [-7, -76]]), SK);
  dots(smooth([[-12, -83], [-14, -95], [-7, -103], [7, -103], [14, -95], [12, -83], [7, -76], [-7, -76]]), shade(SK, 30), 22, 11, [-14, -103, 28, 28]);
  for (const s of [-1, 1]) { flat(ell(s * 6, -91, 4, 3), GL); flat(ell(s * 6, -91, 1.4, 2.4), '#0a1a30'); flat(ell(s * 7, -92.5, 1, 1), '#ffffff'); }
  for (let i = 0; i < 7; i++) { const x = -7 + i * 2.3; cel(strip(arc(x, -78, Math.PI + (x / 8) * .3, 14 + (i % 3) * 5 + f * 2, (i % 2 ? 1 : -1) * 1.1, 10), 3.2, .6), shade(SK, 16), { d: 1 }); }
  // Cuernos de coral ramificados
  for (const s of [-1, 1]) cel(coral(s * 7, -99, s * .5, 26 + f * 7, 5.5, s * .35, f > 0 ? 2 : 1), CO, { d: 1.3 });
  if (f > 1) cel(coral(0, -102, 0, 28, 5, 0, 2), CO, { d: 1.3 });
  return { eyes: [[-6, -91], [6, -91]], core: [0, -61], head: [0, -90], top: -103 };
}

function ysgrim(D, f) {
  const { cel, flat, line, dots } = D;
  const DK = '#232338', SK = '#4a4a6a', IC = '#9ab0ff', IC2 = '#dfe8ff', BK = '#14142a', CL = '#3a3260';
  // Alas de cristal (forma 3) y esquirlas de la espalda (forma 2)
  if (f > 0) for (const s of [-1, 1]) for (let i = 0; i < 3 + f * 2; i++) {
    const a = .45 + i * (.9 / (2 + f * 2)) ;
    cel(horn(s * 6, -76, s * a, 52 + f * 12 - i * 3 + (i % 2) * 8, 9, 0, .5), shade(IC, -35 + i * 5), { d: 2 });
  }
  // Capa raída con borde escarchado
  const hem = [[-48, 0], [-40, -7], [-36, 2], [-28, -6], [-20, 2], [-10, -6], [0, 1], [10, -6], [20, 2], [28, -6], [36, 2], [40, -7], [48, 0]];
  cel(poly([[-22, -80], [22, -80], [36, -52], ...hem.reverse(), [-36, -52]]), CL, { d: 3 });
  dots(poly([[-48, -10], [48, -10], [48, 2], [-48, 2]]), IC, 40, 4, [-48, -10, 96, 12]);
  line([[-20, -78], [-30, -30], [-34, -4]], shade(CL, -30), 1.2); line([[20, -78], [30, -30], [34, -4]], shade(CL, -30), 1.2);
  // Piernas largas con grebas de cristal
  for (const s of [-1, 1]) {
    cel(poly(mir([[-14, -46], [-4, -46], [-5, -22], [-7, -6], [-9, 0], [-19, 0], [-14, -8], [-15, -24]], s)), DK);
    cel(poly(mir([[-15, -34], [-4, -34], [-6, -20], [-14, -20]], s)), IC, { d: 1.2 });
    cel(poly(mir([[-20, 0], [-9, 0], [-7, -5], [-18, -5]], s)), BK, { d: 1 });
  }
  // Torso de armadura de cristal negro
  const torso = poly([[-21, -76], [-12, -86], [12, -86], [21, -76], [15, -50], [10, -42], [-10, -42], [-15, -50]]);
  cel(torso, DK);
  for (const s of [-1, 1]) { line([[s * 2, -84], [s * 8, -66], [s * 5, -46]], IC, 1); line([[s * 10, -80], [s * 14, -60]], shade(IC, -30), 1); }
  cel(poly([[0, -80], [8, -66], [0, -52], [-8, -66]]), IC, { d: 2 });
  flat(poly([[0, -74], [3, -66], [0, -58], [-3, -66]]), IC2);
  line([[-12, -48], [12, -48]], IC, 1.4);
  // Hombreras de carámbano y brazos
  for (const s of [-1, 1]) {
    cel(poly(mir([[-30, -76], [-26, -88], [-14, -88], [-14, -74]], s)), DK);
    for (let i = 0; i < 3 + f; i++) cel(horn(s * (24 + i * 3), -86 - i, s * (.5 + i * .3), 20 + i * 4 + f * 4, 5.5, 0, .4), IC2, { d: 1.5 });
    cel(smooth(mir([[-30, -78], [-21, -78], [-22, -54], [-27, -40], [-34, -42], [-31, -58]], s)), DK);
    cel(poly(mir([[-34, -52], [-26, -52], [-27, -40], [-35, -40]], s)), IC, { d: 1.2 });
    cel(ell(s * 30, -37, 5, 6), SK);
  }
  // Lanza de hielo
  line([[40, 2], [40, -100]], '#6a6a90', 2.2);
  cel(poly([[40, -122], [46, -104], [44, -96], [40, -90], [36, -96], [34, -104]]), IC2, { d: 2 });
  line([[34, -72], [46, -72]], IC, 2);
  flat(ell(36, -44, 4, 4), SK);
  // Cabeza con yelmo y cuernos de carámbano
  cel(smooth([[-10, -88], [-11, -98], [-5, -105], [5, -105], [11, -98], [10, -88], [5, -80], [-5, -80]]), DK);
  flat(poly([[-7, -97], [7, -97], [6, -86], [0, -82], [-6, -86]]), BK);
  for (const s of [-1, 1]) { flat(poly(mir([[-6, -94], [-1.5, -92], [-2.5, -90], [-6.5, -91.5]], s)), IC); flat(ell(s * 3.8, -92, 1, 1), '#ffffff'); }
  line([[-4, -86], [4, -86]], IC, 1);
  const nh = 2 + f;
  for (const s of [-1, 1]) for (let i = 0; i < nh; i++) cel(horn(s * (4 + i * 2), -102 + i, s * (.25 + i * .32), 40 + f * 10 - i * 7, 5.2 - i * .6, s * .12, .2), IC2, { d: 1.4 });
  cel(horn(0, -105, 0, 26 + f * 8, 5, 0, .2), IC2, { d: 1.4 });
  return { eyes: [[-4, -92], [4, -92]], core: [0, -66], head: [0, -92], top: -105 };
}

function tzar(D, f) {
  const { cel, flat, line, dots } = D;
  const SK = '#6a7a2a', DK = '#3a4416', RU = '#8a4a1a', PU = '#d8e060', WG = '#c7d8a0';
  // Cuatro alas de insecto con nervaduras
  for (const s of [-1, 1]) {
    const k = [1, 1.2, 1.4][f];
    cel(ell(s * 40 * k, -92, 36 * k, 12 * k, s * -.55), WG, { d: 2 });
    cel(ell(s * 34 * k, -66, 26 * k, 9 * k, s * .5), shade(WG, -14), { d: 2 });
    for (let i = 0; i < 5; i++) line([[s * 12, -80], [s * (26 + i * 9) * k, -104 + i * 5 * k + 4]], shade(WG, -60), .8);
    line([[s * 12, -74], [s * 46 * k, -56]], shade(WG, -60), .8);
  }
  // Piernas cortas y pezuñas
  for (const s of [-1, 1]) {
    cel(smooth(mir([[-27, -22], [-8, -22], [-8, -6], [-12, 0], [-28, 0], [-30, -10]], s)), DK);
    cel(poly(mir([[-30, -3], [-12, -3], [-12, 0], [-31, 0]], s)), '#1c2008', { d: 1 });
  }
  // Barriga hinchada con pústulas
  const belly = ell(0, -38, 37 + f * 2, 31 + f * 2);
  cel(belly, SK, { d: 3.2, h: 2 });
  dots(belly, shade(SK, -32), 70, 21, [-38, -70, 76, 66]); dots(belly, shade(SK, 26), 40, 22, [-38, -70, 76, 66]);
  for (let i = 0; i < 6 + f * 3; i++) { const x = -26 + hashN(i, 31) * 52, y = -58 + hashN(i, 32) * 38, r = 2 + hashN(i, 33) * 2.2; cel(ell(x, y, r, r), shade(PU, -20), { d: 1, h: .8 }); flat(ell(x - .6, y - .6, .7, .7), '#fffbd0'); }
  // Arnés oxidado
  line([[-34, -62], [30, -20]], RU, 3.2); line([[34, -62], [-30, -20]], shade(RU, -30), 3.2);
  for (const p of [[-24, -53], [-10, -41], [10, -41], [24, -53]]) flat(ell(p[0], p[1], 1.6, 1.6), '#d8b070');
  cel(ell(0, -47, 6, 6), RU, { d: 1.6 }); flat(ell(0, -47, 2.4, 2.4), '#2a1408');
  if (f > 1) { cel(ell(0, -30, 14, 10), '#1a0c10', { d: 1 }); for (let i = -2; i <= 2; i++) { flat(poly([[i * 5 - 2, -39], [i * 5 + 2, -39], [i * 5, -34]]), '#f0e8c8'); flat(poly([[i * 5 - 2, -21], [i * 5 + 2, -21], [i * 5, -26]]), '#f0e8c8'); } for (let i = 0; i < 9; i++) flat(ell(-9 + hashN(i, 4) * 18, -34 + hashN(i, 5) * 8, .8, .8), '#6a6a4a'); }
  // Pecho, hombreras de óxido y brazos
  cel(smooth([[-24, -68], [-12, -82], [12, -82], [24, -68], [22, -56], [-22, -56]]), SK);
  for (const s of [-1, 1]) {
    cel(ell(s * 30, -74, 12, 8, s * .3), RU);
    for (let i = 0; i < 2 + f; i++) cel(horn(s * (26 + i * 5), -80, s * (.4 + i * .3), 10 + i * 2 + f * 2, 4, 0), '#3a2410', { d: 1 });
    cel(smooth(mir([[-44, -72], [-30, -72], [-28, -50], [-33, -34], [-46, -36], [-48, -54]], s)), shade(SK, -8));
    cel(ell(s * 40, -30, 9, 11), shade(SK, -12));
    for (const dx of [-5, 0, 5]) cel(horn(s * 40 + dx, -22, Math.PI, 9, 3.2, s * -.3), '#3a2410', { d: 1 });
    if (f > 0) cel(smooth(mir([[-26, -56], [-18, -56], [-17, -46], [-24, -40], [-30, -44]], s)), shade(SK, 12));
  }
  // Cabeza con ojos compuestos, mandíbulas, antenas y corona de púas
  cel(smooth([[-13, -88], [-14, -98], [-7, -105], [7, -105], [14, -98], [13, -88], [8, -81], [-8, -81]]), SK);
  for (const s of [-1, 1]) {
    cel(ell(s * 7, -95, 5.2, 5.6), '#c42a2a', { d: 1.6 });
    for (let i = 0; i < 5; i++) flat(ell(s * 7 - 2 + hashN(i, 41) * 4, -97 + hashN(i, 42) * 5, .7, .7), '#ff9a8a');
    cel(horn(s * 4, -83, Math.PI - s * .25, 12 + f * 3, 3.4, s * .9), '#3a2410', { d: 1 });
    line([[s * 4, -104], [s * 8, -116 - f * 3], [s * 14, -120 - f * 4]], '#3a2410', 1.2);
  }
  line([[-3, -84], [0, -82], [3, -84]], '#1a0c08', 1.6);
  for (let i = 0; i < 4 + f * 2; i++) cel(horn(-9 + i * (18 / (3 + f * 2)), -103, (i - (3 + f * 2) / 2) * .16, 11 + (i % 2) * 5 + f * 3, 3.6, 0), '#7a4a1a', { d: 1 });
  return { eyes: [[-7, -95], [7, -95]], core: [0, -47], head: [0, -92], top: -105 };
}

// ---- Catálogo de reyes -------------------------------------------------------------------------------
// pal: colores con los que se tiñen secuaces y élites. appear: de dónde surge. fx: efectos vivos por forma.
export const KINGS = [
  { id: 'kazgorath', name: 'Kazgorath', title: 'Rey Demonio de las Brasas', color: '#ff6a1a', appear: 'rise', draw: kazgorath,
    pal: { skin: '#a02a1a', dark: '#2a1a1e', horn: '#1c1620', glow: '#ff6a1a' },
    shouts: ['¡El fuego es mi aliento!', '¡Arded todos en mi trono!'],
    fx: [[['smoke', '#6a5a5a']], [['smoke', '#6a5a5a'], ['rise', '#ff9a2a', 5]], [['aura', '#ff4a1a'], ['flames', '#ff6a1a', '#ffd24a'], ['rise', '#ffc040', 8]]] },
  { id: 'vhel', name: 'Vhel-Morkai', title: 'Rey Demonio del Abismo', color: '#2ab0d0', appear: 'rise', draw: vhel,
    pal: { skin: '#2a3a6a', dark: '#16203e', horn: '#e8a79a', glow: '#7affe0' },
    shouts: ['¡Las profundidades os reclaman!', '¡Ahogaos en la marea negra!'],
    fx: [[['rise', '#7affe0', 4]], [['rise', '#7affe0', 7], ['ground', 'waves', '#7affe0']], [['aura', '#2ab0d0'], ['ground', 'waves', '#7affe0'], ['rise', '#bffff0', 9]]] },
  { id: 'ysgrim', name: 'Ysgrim', title: 'Rey Demonio de la Escarcha Negra', color: '#9ab0ff', appear: 'descend', draw: ysgrim,
    pal: { skin: '#4a4a6a', dark: '#232338', horn: '#dfe8ff', glow: '#9ab0ff' },
    shouts: ['¡Que el invierno os congele el alma!', '¡Noche eterna, cae!'],
    fx: [[['mist', '#dfe8ff']], [['mist', '#dfe8ff'], ['orbit', 3, 'crystal', '#dfe8ff', 70, 8, .6, .5]], [['aura', '#9ab0ff'], ['orbit', 6, 'crystal', '#dfe8ff', 84, 10, .6, .5], ['rise', '#ffffff', 8]]] },
  { id: 'tzar', name: 'Tzar-Nuul', title: 'Rey Demonio de la Plaga', color: '#b8c83a', appear: 'rise', draw: tzar,
    pal: { skin: '#6a7a2a', dark: '#3a4416', horn: '#7a4a1a', glow: '#d8e060' },
    shouts: ['¡Mi enjambre es infinito!', '¡Pudríos bajo mi reinado!'],
    fx: [[['orbit', 4, 'fly', '#1a1a10', 60, 20, .5, .5]], [['orbit', 8, 'fly', '#1a1a10', 70, 26, .6, .5], ['smoke', '#8a9a3a']], [['aura', '#8a9a1a'], ['orbit', 14, 'fly', '#1a1a10', 80, 30, .7, .5], ['smoke', '#8a9a3a']]] },
];
export const KING_BY_ID = Object.fromEntries(KINGS.map(k => [k.id, k]));

const kingCache = new Map();
// Devuelve { img, white, w, h, ax, ay, eyes, core, head } del rey y la forma (1, 2 o 3)
export function kingSprite(def, form) {
  const key = def.id + form;
  let e = kingCache.get(key);
  if (!e) kingCache.set(key, e = bake(def.draw, form - 1, KING_H[form - 1]));
  return e;
}

// ==== SECUACES (12-20 px) ===========================================================================
export const MINIONS = [
  { id: 'diablillo', name: 'Diablillo' }, { id: 'murcielago', name: 'Murciélago infernal' },
  { id: 'sombra', name: 'Sombra rastrera' }, { id: 'ojo', name: 'Ojo flotante' },
];
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const minCache = new Map();
// Devuelve un canvas con el fotograma (0 o 1) del secuaz, teñido con los colores del rey
export function minionSprite(type, king, frame) {
  const key = `${type}|${king.id}|${frame}`;
  let c = minCache.get(key);
  if (c) return c;
  const p = king.pal, o = OUTLINE, b = p.skin, d = shade(p.skin, -40), hl = shade(p.skin, 40), gl = p.glow;
  if (type === 'diablillo') {              // 14 px: cuernitos y tridente
    c = mk(16, 16); const g = c.getContext('2d');
    R(g, 3, 1, 2, 3, p.horn); R(g, 9, 1, 2, 3, p.horn);
    R(g, 3, 3, 8, 6, o); R(g, 4, 4, 6, 4, b); R(g, 4, 4, 6, 1, hl); R(g, 5, 5, 1, 2, gl); R(g, 8, 5, 1, 2, gl); R(g, 6, 8, 2, 1, '#f4ecd8');
    R(g, 4, 9, 6, 4, o); R(g, 5, 9, 4, 3, d); R(g, 5, 9, 4, 1, b);
    R(g, 4 + frame, 13, 2, 2, o); R(g, 8 - frame, 13, 2, 2, o);
    R(g, 12, 2, 1, 12, '#b8b8c8'); R(g, 11, 2, 3, 1, '#b8b8c8'); R(g, 11, 1, 1, 2, '#b8b8c8'); R(g, 13, 1, 1, 2, '#b8b8c8');
    R(g, 2, 9 - frame, 3, 2, b);
  } else if (type === 'murcielago') {      // 12 px: vuela
    c = mk(16, 12); const g = c.getContext('2d'), up = frame ? 0 : 2;
    R(g, 6, 3, 4, 5, o); R(g, 7, 4, 2, 3, b); R(g, 6, 2, 1, 2, o); R(g, 9, 2, 1, 2, o); R(g, 7, 5, 1, 1, gl); R(g, 9, 5, 1, 1, gl);
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? 0 : 10;
      R(g, x0, 3 + up, 6, 4, o); R(g, x0 + (s < 0 ? 1 : 0), 4 + up, 5, 2, d); R(g, x0 + (s < 0 ? 0 : 4), 6 + up, 2, 2, o); R(g, x0 + (s < 0 ? 2 : 2), 6 + up, 2, 1, d);
    }
  } else if (type === 'sombra') {          // 14 px: mancha con ojos
    c = mk(18, 10); const g = c.getContext('2d');
    R(g, 2, 3, 14, 6, o); R(g, 3, 4, 12, 4, shade(p.dark, 10)); R(g, 4, 2, 4, 2, o); R(g, 11, 2 + frame, 3, 2, o);
    R(g, 1 + frame, 7, 2, 3, o); R(g, 8, 8, 3, 2, o); R(g, 14 - frame, 7, 2, 3, o);
    R(g, 5, 5, 2, 2, '#f4f4ff'); R(g, 10, 5, 2, 2, '#f4f4ff'); R(g, 6, 5, 1, 2, gl); R(g, 11, 5, 1, 2, gl);
  } else {                                 // 16 px: ojo flotante con aura
    c = mk(18, 18); const g = c.getContext('2d');
    R(g, 3, 3, 12, 12, o); R(g, 2, 5, 14, 8, o); R(g, 4, 4, 10, 10, '#f4ecd8'); R(g, 3, 6, 12, 6, '#f4ecd8');
    R(g, 6, 5, 6, 8, p.glow); R(g, 7, 6, 4, 6, shade(p.glow, -50)); R(g, 8, 7, 2, 4, '#0a0610'); R(g, 7, 6, 1, 1, '#ffffff');
    R(g, 4 + frame, 15, 2, 2, o); R(g, 12 - frame, 15, 2, 2, o);
    R(g, 2, 8, 1, 2, p.horn); R(g, 15, 8, 1, 2, p.horn);
  }
  minCache.set(key, c);
  return c;
}

// ==== DEMONIOS ÉLITE (44-60 px) =======================================================================
export const ELITES = [
  { id: 'verdugo', name: 'Verdugo', h: 50 }, { id: 'brujo', name: 'Brujo infernal', h: 48 },
  { id: 'cancerbero', name: 'Cancerbero', h: 40 }, { id: 'heraldo', name: 'Heraldo alado', h: 52 },
];
function verdugo(D, p) {
  const { cel, flat, line } = D;
  for (const s of [-1, 1]) { cel(poly(mir([[-14, -26], [-3, -26], [-3, -8], [-6, 0], [-16, 0], [-14, -10]], s)), p.dark); }
  cel(poly([[-18, -26], [18, -26], [22, -52], [14, -62], [-14, -62], [-22, -52]]), p.skin);
  cel(poly([[-20, -40], [20, -40], [18, -26], [-18, -26]]), p.dark);
  for (const s of [-1, 1]) cel(ell(s * 21, -56, 8, 6), p.dark);
  cel(smooth([[-10, -64], [-12, -76], [-5, -84], [5, -84], [12, -76], [10, -64], [0, -58]]), p.dark);   // capucha y máscara
  flat(poly([[-7, -72], [7, -72], [6, -64], [-6, -64]]), '#0a0610');
  for (const s of [-1, 1]) { flat(ell(s * 3.5, -69, 1.8, 1.4), p.glow); cel(horn(s * 8, -78, s * .9, 12, 4, s * .5), p.horn, { d: 1 }); }
  line([[22, -10], [30, -74]], '#5a4a40', 3);                                                              // hacha enorme
  cel(poly([[28, -78], [48, -72], [50, -50], [44, -46], [34, -56], [29, -60]]), '#aab0c0', { d: 2 });
  line([[34, -60], [46, -56]], '#e8eef8', 1);
  return { eyes: [[-3, -69], [3, -69]] };
}
function brujo(D, p) {
  const { cel, flat, line } = D;
  cel(poly([[-8, -50], [8, -50], [18, -10], [10, -2], [4, -8], [0, 0], [-4, -8], [-10, -2], [-18, -10]]), p.dark);
  line([[-8, -50], [-10, -12]], shade(p.dark, 30), 1); line([[8, -50], [10, -12]], shade(p.dark, 30), 1);
  cel(poly([[-10, -52], [10, -52], [12, -40], [-12, -40]]), shade(p.dark, 12));
  cel(smooth([[-9, -54], [-11, -66], [-4, -74], [4, -74], [11, -66], [9, -54], [0, -48]]), p.dark);        // capucha
  cel(smooth([[-6, -56], [-7, -64], [0, -68], [7, -64], [6, -56], [0, -52]]), '#e8e0d0', { d: 1.4 });        // cráneo
  flat(ell(-2.6, -62, 1.7, 2), '#0a0610'); flat(ell(2.6, -62, 1.7, 2), '#0a0610'); flat(ell(-2.6, -62, .8, 1), p.glow); flat(ell(2.6, -62, .8, 1), p.glow);
  for (const s of [-1, 1]) cel(horn(s * 6, -68, s * .7, 12, 3.6, s * .4), p.horn, { d: 1 });
  line([[16, -2], [18, -76]], '#5a4a40', 2.2); cel(ell(18, -78, 5, 5), p.glow, { d: 1.4 }); flat(ell(17, -79, 1.6, 1.6), '#ffffff');
  cel(smooth([[8, -48], [18, -52], [20, -44], [10, -40]]), p.dark, { d: 1 });
  return { eyes: [[-3, -62], [3, -62]] };
}
function cancerbero(D, p) {
  const { cel, flat, line } = D;
  for (const x of [-22, -12, 10, 20]) cel(poly([[x - 3, -14], [x + 4, -14], [x + 3, 0], [x - 4, 0]]), shade(p.dark, 8), { d: 1.2 });
  cel(ell(0, -22, 26, 11), p.dark);
  cel(smooth([[-22, -28], [-30, -24], [-30, -16], [-22, -14]]), p.dark);
  for (let i = 0; i < 6; i++) cel(horn(-12 + i * 5, -30, .2 * (i - 2.5), 7, 3.2), p.horn, { d: .8 });
  for (const dx of [-1, 1]) {                                                                           // dos cabezas
    const hx = 30 + dx * 3, hy = -34 + dx * 7;
    cel(smooth([[hx - 6, hy - 6], [hx + 8, hy - 5], [hx + 12, hy], [hx + 8, hy + 6], [hx - 6, hy + 6]]), p.skin);
    flat(poly([[hx + 6, hy + 1], [hx + 13, hy + 2], [hx + 10, hy + 6], [hx + 4, hy + 5]]), '#1a0810');
    for (const t of [0, 3]) flat(poly([[hx + 7 + t, hy + 1], [hx + 9 + t, hy + 1], [hx + 8 + t, hy + 4]]), '#f4ecd8');
    flat(ell(hx + 1, hy - 2, 1.6, 1.4), p.glow);
    cel(poly([[hx - 5, hy - 5], [hx - 2, hy - 11], [hx + 1, hy - 5]]), p.dark, { d: 1 });
  }
  cel(strip(arc(-28, -22, -1.9, 18, .9, 8), 5, 1), p.skin, { d: 1 });
  return { eyes: [[31, -36], [33, -29]] };
}
function heraldo(D, p) {
  const { cel, flat, line } = D;
  for (const s of [-1, 1]) {
    cel(poly(mir([[-6, -44], [-20, -66], [-38, -74], [-40, -58], [-32, -54], [-34, -40], [-24, -42], [-22, -28], [-12, -38]], s)), p.dark, { d: 2 });
    line(mir([[-6, -44], [-38, -74]], s), shade(p.dark, -30), 1); line(mir([[-6, -44], [-32, -54]], s), shade(p.dark, -30), 1);
  }
  cel(poly([[-8, -46], [8, -46], [10, -22], [5, -8], [-5, -8], [-10, -22]]), p.skin);
  cel(poly([[-6, -46], [6, -46], [8, -34], [-8, -34]]), p.dark);
  for (const s of [-1, 1]) cel(poly(mir([[-6, -10], [-2, -10], [-2, 0], [-8, 0]], s)), p.dark, { d: 1 });
  cel(smooth([[-6, -50], [-7, -58], [0, -64], [7, -58], [6, -50], [0, -45]]), p.skin);
  flat(ell(-2.4, -55, 1.4, 1.1), p.glow); flat(ell(2.4, -55, 1.4, 1.1), p.glow);
  for (let i = 0; i < 5; i++) cel(horn(-5 + i * 2.5, -62, (i - 2) * .3, 9 + (i % 2) * 4, 3, 0), p.horn, { d: .8 });
  cel(poly([[4, -48], [30, -58], [30, -40]]), '#e0b040', { d: 1.4 });                                     // trompeta
  cel(ell(30, -49, 3, 9), '#f0d060', { d: 1 });
  return { eyes: [[-2, -55], [2, -55]] };
}
const ELITE_DRAW = { verdugo, brujo, cancerbero, heraldo };
const eliteCache = new Map();
// Devuelve { img, white, w, h, ax, ay } mirando a la derecha; se refleja al dibujar
export function eliteSprite(type, king) {
  const key = type + '|' + king.id;
  let e = eliteCache.get(key);
  if (!e) {
    const def = ELITES.find(x => x.id === type), fn = ELITE_DRAW[type];
    e = bake((D, f) => fn(D, king.pal), 0, def.h);
    eliteCache.set(key, e);
  }
  return e;
}
