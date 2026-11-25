// Rasterizador indexado sin antialiasing del kit 16 bits. Funciones puras (sin navegador):
// pintan índices material×tono en un Uint8Array y el id de grupo de cada píxel en un Uint16Array.
// Luz fija desde arriba a la izquierda. Los píxeles se evalúan en su centro (x+.5, y+.5).

import { IDX_EMIT, IDX_WHITE, matIndex } from './ramps.js';

// Dirección hacia la luz (arriba a la izquierda) y bandas de tono del sombreado por volumen
const LX = -0.6, LY = -0.8;
const bandVol = v => (v > .75 ? 4 : v > .3 ? 3 : v > -.3 ? 2 : v > -.7 ? 1 : 0);
const bandSph = v => (v > .9 ? 4 : v > .55 ? 3 : v > .15 ? 2 : v > -.35 ? 1 : 0);

export class Raster {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.idx = new Uint8Array(w * h);
    this.grp = new Uint16Array(w * h);
    this.groups = [null];          // por grupo: { line, mat }
  }
  clear() { this.idx.fill(0); this.grp.fill(0); this.groups.length = 1; }
  newGroup(line, mat) { this.groups.push({ line: !!line, mat }); return this.groups.length - 1; }
}

// Material especial: -1 emisivo, -2 blanco puro
const idxOf = (mat, tone) => (mat === -1 ? IDX_EMIT : mat === -2 ? IDX_WHITE : matIndex(mat, tone));

/**
 * Vuelca una máscara con tonos calculados en el búfer.
 * mask/tones: de tamaño bw×bh con origen (bx,by). Aplica capa lejana (-1 tono) y filtro «on».
 */
function commit(r, mask, tone, bx, by, bw, bh, mat, o) {
  const g = o.group || r.newGroup(o.line, mat);
  const dt = (o.dt || 0) + (o.far ? -1 : 0);
  const flat = mat < 0;
  for (let y = 0; y < bh; y++) {
    const py = by + y; if (py < 0 || py >= r.h) continue;
    for (let x = 0; x < bw; x++) {
      if (!mask[y * bw + x]) continue;
      const px = bx + x; if (px < 0 || px >= r.w) continue;
      const i = py * r.w + px;
      if (o.on !== undefined) { const c = r.idx[i]; if (c < 1 || c > 250 || ((c - 1) / 5 | 0) !== o.on) continue; }
      let t = tone[y * bw + x] + dt; t = t < 0 ? 0 : t > 4 ? 4 : t;
      r.idx[i] = idxOf(mat, t); r.grp[i] = g;
      if (flat) r.grp[i] = 0;    // los emisivos no reciben línea interna
    }
  }
  return g;
}

// Pasada de borde del sombreado «vol»: abajo-derecha fuera de la forma baja un tono; arriba-izquierda fuera sube a luz
function edgePass(mask, tone, bw, bh) {
  const out = tone.slice();
  const at = (x, y) => (x < 0 || y < 0 || x >= bw || y >= bh ? 0 : mask[y * bw + x]);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const i = y * bw + x; if (!mask[i]) continue;
    if (!at(x + 1, y + 1)) out[i] = Math.max(0, out[i] - 1);
    else if (!at(x - 1, y - 1)) out[i] = Math.min(4, out[i] + 1);
  }
  return out;
}

function bboxOf(minx, miny, maxx, maxy) {
  const bx = Math.floor(minx), by = Math.floor(miny);
  return { bx, by, bw: Math.max(1, Math.ceil(maxx) - bx + 1), bh: Math.max(1, Math.ceil(maxy) - by + 1) };
}

// Sombreado por volumen respecto a la caja de la forma
function volTones(mask, bw, bh, edge, band = bandVol, dither = false) {
  let x0 = bw, x1 = 0, y0 = bh, y1 = 0, n = 0;
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (mask[y * bw + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; n++; }
  const tone = new Uint8Array(bw * bh);
  if (!n) return tone;
  const cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2, hw = Math.max(1, (x1 - x0 + 1) / 2), hh = Math.max(1, (y1 - y0 + 1) / 2);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!mask[y * bw + x]) continue;
    const ux = (x + .5 - cx) / hw, uy = (y + .5 - cy) / hh;
    const v = -(0.6 * ux + 0.8 * uy);
    let t = band(v);
    if (dither && Math.abs(v + .3) < .12) t = (x ^ y) & 1 ? 2 : 1;
    tone[y * bw + x] = t;
  }
  return edge && hw > 2.5 && hh > 2.5 ? edgePass(mask, tone, bw, bh) : tone;
}

// ---------------------------------------------------------------------------------------------
// Primitivas. Todas devuelven el id de grupo (se puede reutilizar con o.group para unir partes).
// Opciones comunes: shade 'vol'|'cyl'|'sphere'|'flat', tone (flat), dt (±tonos), line (línea interna),
// far (capa lejana, -1 tono), on (índice de material: solo pinta sobre ese material), group, dither.

export function ellipse(r, cx, cy, rx, ry, mat, o = {}) {
  const rot = (o.rot || 0) * Math.PI / 180, cs = Math.cos(rot), sn = Math.sin(rot);
  const ext = Math.hypot(rx * cs, ry * sn), eyt = Math.hypot(rx * sn, ry * cs);
  const { bx, by, bw, bh } = bboxOf(cx - ext - 1, cy - eyt - 1, cx + ext + 1, cy + eyt + 1);
  const mask = new Uint8Array(bw * bh), tone = new Uint8Array(bw * bh);
  const shade = o.shade || 'vol';
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const dx = bx + x + .5 - cx, dy = by + y + .5 - cy;
    const u = (dx * cs + dy * sn) / rx, v = (-dx * sn + dy * cs) / ry, d = u * u + v * v;
    if (d > 1) continue;
    const i = y * bw + x; mask[i] = 1;
    if (shade === 'flat') tone[i] = o.tone ?? 2;
    else if (shade === 'sphere') {
      // normal de la esfera en el espacio de pantalla y luz con componente hacia el observador
      const nx = (dx / (ext || 1)), ny = (dy / (eyt || 1)), nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      tone[i] = bandSph(nx * -.5 + ny * -.65 + nz * .57);
    }
  }
  if (shade === 'flat' || shade === 'sphere') return commit(r, mask, shade === 'sphere' ? edgeTone(mask, tone, bw, bh, rx, ry) : tone, bx, by, bw, bh, mat, o);
  const t2 = volTones(mask, bw, bh, true, bandVol, o.dither);
  return commit(r, mask, t2, bx, by, bw, bh, mat, o);
}
function edgeTone(mask, tone, bw, bh, rx, ry) { return Math.min(rx, ry) > 2.5 ? edgePass(mask, tone, bw, bh) : tone; }

export function polygon(r, pts, mat, o = {}) {
  if (pts.length < 3) return 0;
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (const [x, y] of pts) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  const { bx, by, bw, bh } = bboxOf(minx, miny, maxx, maxy);
  const mask = new Uint8Array(bw * bh), n = pts.length;
  for (let y = 0; y < bh; y++) {
    const yc = by + y + .5, xs = [];
    for (let k = 0; k < n; k++) {
      const [x1, y1] = pts[k], [x2, y2] = pts[(k + 1) % n];
      if ((y1 <= yc && y2 > yc) || (y2 <= yc && y1 > yc)) xs.push(x1 + (yc - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.ceil(xs[k] - .5), xb = Math.ceil(xs[k + 1] - .5) - 1;
      for (let x = xa; x <= xb; x++) { const ix = x - bx; if (ix >= 0 && ix < bw) mask[y * bw + ix] = 1; }
    }
  }
  const shade = o.shade || 'vol';
  const tone = shade === 'flat' ? new Uint8Array(bw * bh).fill(o.tone ?? 2) : volTones(mask, bw, bh, true, shade === 'sphere' ? bandSph : bandVol, o.dither);
  return commit(r, mask, tone, bx, by, bw, bh, mat, o);
}

/** Cápsula afinada entre a y b (radios r0 y r1) o, con varios segmentos, tira que sigue la polilínea. */
function stripShape(r, pts, rad, mat, o) {
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  const rmax = Math.max(...rad) + 1;
  for (const [x, y] of pts) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  const { bx, by, bw, bh } = bboxOf(minx - rmax, miny - rmax, maxx + rmax, maxy + rmax);
  const mask = new Uint8Array(bw * bh), tone = new Uint8Array(bw * bh);
  const shade = o.shade || 'cyl';
  const segs = [];
  for (let k = 0; k + 1 < pts.length; k++) {
    const [x1, y1] = pts[k], [x2, y2] = pts[k + 1], dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy || 1e-6, len = Math.sqrt(len2);
    // normal «de la luz»: lado de la normal que mira a la luz y cuánto se alinea
    const nx = -dy / len, ny = dx / len, ls0 = nx * LX + ny * LY;
    segs.push({ x1, y1, dx, dy, len2, nx, ny, ls: ls0, r0: rad[k], r1: rad[k + 1] });
  }
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const px = bx + x + .5, py = by + y + .5;
    let best = 9, bc = 0, bls = 0;
    for (const s of segs) {
      let t = ((px - s.x1) * s.dx + (py - s.y1) * s.dy) / s.len2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = s.x1 + s.dx * t, qy = s.y1 + s.dy * t, rr = Math.max(.55, s.r0 + (s.r1 - s.r0) * t);
      const d = Math.hypot(px - qx, py - qy);
      if (d <= rr && d / rr < best) { best = d / rr; bc = ((px - qx) * s.nx + (py - qy) * s.ny) / rr; bls = s.ls; }
    }
    if (best > 1) continue;
    const i = y * bw + x; mask[i] = 1;
    // c·ls > 0: lado iluminado; el término constante evita limbs totalmente oscuros
    tone[i] = shade === 'flat' ? (o.tone ?? 2) : bandVol(bc * bls * 1.12 + .06 * (bls * bls));
  }
  return commit(r, mask, tone, bx, by, bw, bh, mat, o);
}

export function capsule(r, a, b, r0, r1, mat, o = {}) { return stripShape(r, [a, b], [r0, r1], mat, o); }

/** Tira que se afina: w0 y w1 son anchos (diámetros) al inicio y al final de la polilínea. */
export function strip(r, pts, w0, w1, mat, o = {}) {
  let tot = 0; const cum = [0];
  for (let k = 1; k < pts.length; k++) { tot += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); cum.push(tot); }
  const rad = cum.map(c => (w0 + (w1 - w0) * (tot ? c / tot : 0)) / 2);
  return stripShape(r, pts, rad, mat, o);
}

/** Curva suavizada (cuadráticas por los puntos medios). closed: contorno cerrado; si no, curva abierta. */
export function smoothPts(pts, n = 5, closed = true) {
  const m = pts.length, out = [];
  if (m < 3) return pts.slice();
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const quad = (s, c, e) => { for (let i = 0; i < n; i++) { const t = i / n, u = 1 - t; out.push([u * u * s[0] + 2 * u * t * c[0] + t * t * e[0], u * u * s[1] + 2 * u * t * c[1] + t * t * e[1]]); } };
  if (closed) {
    for (let k = 0; k < m; k++) quad(mid(pts[k], pts[(k + 1) % m]), pts[(k + 1) % m], mid(pts[(k + 1) % m], pts[(k + 2) % m]));
  } else {
    let s = pts[0];
    for (let k = 1; k < m - 1; k++) { const e = k === m - 2 ? pts[m - 1] : mid(pts[k], pts[k + 1]); quad(s, pts[k], e); s = e; }
    out.push(pts[m - 1]);
  }
  return out;
}

/** Línea de 1 px (Bresenham) con un tono fijo. */
export function line(r, pts, mat, tone = 2, o = {}) {
  const g = o.group || r.newGroup(false, mat);
  const put = (x, y) => {
    if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
    const i = y * r.w + x;
    if (o.on !== undefined) { const c = r.idx[i]; if (c < 1 || c > 250 || ((c - 1) / 5 | 0) !== o.on) return; }
    r.idx[i] = idxOf(mat, o.far ? Math.max(0, tone - 1) : tone); r.grp[i] = mat < 0 ? 0 : g;
  };
  if (pts.length === 1) put(Math.round(pts[0][0]), Math.round(pts[0][1]));      // un solo punto: pinta el píxel
  for (let k = 0; k + 1 < pts.length; k++) {
    let x0 = Math.round(pts[k][0]), y0 = Math.round(pts[k][1]); const x1 = Math.round(pts[k + 1][0]), y1 = Math.round(pts[k + 1][1]);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      put(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  return g;
}

/** Píxel suelto (índice crudo opcional). */
export function plot(r, x, y, mat, tone = 2, g = 0) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const i = y * r.w + x; r.idx[i] = idxOf(mat, tone); r.grp[i] = mat < 0 ? 0 : g;
}

/** Pliegue: línea de tono 1 sobre el material de debajo y un píxel de luz (tono 3) arriba-izquierda. */
export function fold(r, pts, mat) {
  const touched = [];
  const put = (x, y) => {
    if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
    const i = y * r.w + x, c = r.idx[i];
    if (c < 1 || c > 250 || ((c - 1) / 5 | 0) !== mat) return;
    touched.push(x, y);
  };
  for (let k = 0; k + 1 < pts.length; k++) {
    let x0 = Math.round(pts[k][0]), y0 = Math.round(pts[k][1]); const x1 = Math.round(pts[k + 1][0]), y1 = Math.round(pts[k + 1][1]);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      put(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  // primero las luces (para no pisar la línea), después la línea
  for (let k = 0; k < touched.length; k += 2) {
    const x = touched[k] - 1, y = touched[k + 1] - (touched.length > 4 ? 0 : 1);
    if (x < 0 || y < 0 || x >= r.w || y >= r.h) continue;
    const i = y * r.w + x, c = r.idx[i];
    if (c >= 1 && c <= 250 && ((c - 1) / 5 | 0) === mat && (c - 1) % 5 < 3) r.idx[i] = matIndex(mat, 3);
  }
  for (let k = 0; k < touched.length; k += 2) r.idx[touched[k + 1] * r.w + touched[k]] = matIndex(mat, 1);
}
