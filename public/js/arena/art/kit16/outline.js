// Líneas internas (sel-out) y contorno exterior del kit 16 bits. Funciones puras sobre un Raster.

import { IDX_CONTOUR, matIndex } from './ramps.js';

/**
 * Líneas internas: en el borde entre dos grupos, el píxel de la parte DELANTERA (la pintada después,
 * con `line: true`) toma el tono 0 de su propio material. Separa volúmenes sin negro dentro del personaje.
 */
export function innerLines(r) {
  const { w, h, idx, grp, groups } = r;
  const snap = idx.slice(), marks = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, g = grp[i];
    if (!g || !groups[g] || !groups[g].line) continue;
    const c = snap[i]; if (c < 1 || c > 250) continue;
    let hit = false;
    // vecinos de 4: si alguno es de un grupo anterior (más atrás) y opaco, este píxel es borde delantero
    if (x > 0) { const g2 = grp[i - 1]; if (g2 && g2 < g && snap[i - 1]) hit = true; }
    if (!hit && x < w - 1) { const g2 = grp[i + 1]; if (g2 && g2 < g && snap[i + 1]) hit = true; }
    if (!hit && y > 0) { const g2 = grp[i - w]; if (g2 && g2 < g && snap[i - w]) hit = true; }
    if (!hit && y < h - 1) { const g2 = grp[i + w]; if (g2 && g2 < g && snap[i + w]) hit = true; }
    if (hit) marks.push(i);
  }
  for (const i of marks) {
    const m = ((snap[i] - 1) / 5) | 0;
    idx[i] = matIndex(m, 0);
  }
}

/** Contorno exterior: todo píxel transparente con un vecino opaco (4 u 8 vecinos) pasa a ser contorno. */
export function outline(r, eight = false) {
  const { w, h, idx } = r, snap = idx.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (snap[i]) continue;
    let o = (x > 0 && snap[i - 1]) || (x < w - 1 && snap[i + 1]) || (y > 0 && snap[i - w]) || (y < h - 1 && snap[i + w]);
    if (!o && eight) o = (x > 0 && y > 0 && snap[i - w - 1]) || (x < w - 1 && y > 0 && snap[i - w + 1]) || (x > 0 && y < h - 1 && snap[i + w - 1]) || (x < w - 1 && y < h - 1 && snap[i + w + 1]);
    if (o) idx[i] = IDX_CONTOUR;
  }
}

/** Caja que contiene los píxeles no transparentes (incluye el contorno). null si está vacío. */
export function bounds(r) {
  const { w, h, idx } = r;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (idx[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}
