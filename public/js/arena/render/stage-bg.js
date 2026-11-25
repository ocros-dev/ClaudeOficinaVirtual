// Fondo de la arena a 960×608 (paquete BG, nivel 16 bits). Todo se dibuja en código y se hornea UNA vez en el lienzo de fondo
// que le pasa main.js; después solo se animan cosas pequeñas (público, estandartes, halos de las antorchas, runas del trono)
// repintando unos pocos recuadros sobre una copia limpia del fondo, a ~8 Hz y fuera del bucle de dibujo principal.
// Los valores son más apagados que los de los personajes para que el fondo no compita con la acción. Con
// prefers-reduced-motion no hay animación (se pinta una vez el estado en reposo).
// Capas de arriba abajo: cielo → cresta → gradas con público → podio con arcos → columnas y estandartes → suelo (adoquín en
// perspectiva + anillos de piedra y arena) → trono → viñeta. El rey (hasta ~370 px) ocupa el centro: arriba queda cielo y gradas oscuras.
// La empalizada, la puerta y el campamento los dibuja camp/props.js (drawCampBackground).
import { AW, AH, FENCE_Y, TORCHES, CX, KING_Y, FLOOR_CY } from '../config.js';
import { reduced } from '../util.js';
import { ramp5 } from '../art/kit16/ramps.js';
import { drawCampBackground } from '../camp/camp.js';

const OUT = '#0a0810';
const STONE = ramp5(['#171326', '#252038', '#363049', '#4a4360', '#645c7e']);        // piedra de los muros
const STONE_D = ramp5(['#0f0c1b', '#1a1628', '#272136', '#383150', '#4c4666']);       // adoquín y gradas (más oscura)
const FLOOR = ramp5(['#1a1522', '#2c2430', '#43383d', '#5b4d4d', '#766762']);         // suelo de la arena (piedra y arena)
const GOLD = ramp5(['#2e2310', '#5a4520', '#8a6e30', '#b89a48', '#dcc479']);
const CRIM = ramp5(['#240a14', '#40142a', '#5e2034', '#7e3246', '#9c4a5c']);

const hashN = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// ---- Medidas de la composición (lienzo 960×608) ------------------------------------------------------------
const CREST = 70;                 // cornisa superior de las gradas
const ROW0 = 78, ROW_H = 19, ROWS = 6;            // 6 filas de gradas: y 78 → 192
const POD0 = ROW0 + ROW_H * ROWS, BASE = 250;    // podio (muro bajo con arcos): y 192 → 250
const COLS = [112, 848];                         // columnas con antorcha (TORCHES[0] y [1])
const BANNERS = [{ x: 196, len: 112, w: 38 }, { x: 372, len: 88, w: 30 }, { x: 588, len: 88, w: 30 }, { x: 764, len: 112, w: 38 }];
const THRONE_Y = KING_Y - 24;     // base de la tarima del trono (tras los pies del rey)

// ---- Cielo, luna y cresta -----------------------------------------------------------------------------------
function sky(g) {
  const bands = ['#06040d', '#080610', '#0b0814', '#0e0a1a', '#120d21', '#171128', '#1d1531'], bh = 11;
  bands.forEach((c, i) => R(g, 0, i * bh, AW, i === bands.length - 1 ? CREST + 12 - i * bh : bh, c));
  for (let i = 1; i < bands.length; i++) for (let x = 0; x < AW; x++) { const o = (x + i) & 1; R(g, x, i * bh - 2 + o, 1, 1, bands[i]); if (hashN(x, i) > .7) R(g, x, i * bh + 1, 1, 1, bands[i - 1]); }
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(hashN(i, 1) * AW), y = Math.floor(hashN(i, 2) * 54), v = hashN(i, 3);
    R(g, x, y, 1, 1, v > .9 ? '#9a90c8' : v > .5 ? '#5a4e8a' : '#3a3162');
    if (v > .965) { R(g, x - 1, y, 3, 1, '#7a70b0'); R(g, x, y - 1, 1, 3, '#7a70b0'); }
  }
  // Luna apagada (esquina izquierda, lejos del rey)
  const mx = 168, my = 34;
  for (let y = -20; y <= 20; y++) { const hw = Math.floor(Math.sqrt(400 - y * y + .25)); R(g, mx - hw, my + y, hw * 2 + 1, 1, '#6a6488'); }
  for (let y = -20; y <= 20; y++) { const hw = Math.floor(Math.sqrt(400 - y * y + .25)), cut = Math.floor(Math.sqrt(Math.max(0, 324 - (y + 2) * (y + 2)))); const x1 = mx + hw, x0 = mx + 6 - cut + 12; if (x1 > x0 + 1) R(g, Math.max(x0, mx - hw), my + y, x1 - Math.max(x0, mx - hw) + 1, 1, '#847ea0'); }
  for (const [dx, dy, r] of [[-6, -6, 3], [4, 4, 4], [-9, 8, 2], [8, -9, 2]]) for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(r * r - y * y + .25)); R(g, mx + dx - hw, my + dy + y, hw * 2 + 1, 1, '#5a5478'); }
  // Siluetas de ruinas lejanas
  for (let x = -6; x < AW; ) {
    const w = 10 + Math.floor(hashN(x, 4) * 18), h = 4 + Math.floor(hashN(x, 5) * 16);
    R(g, x, CREST + 4 - h, w, h + 8, '#0d0919'); R(g, x, CREST + 4 - h, w, 1, '#171128');
    if (hashN(x, 6) > .7) { R(g, x + 2, CREST + 4 - h - 4, 3, 4, '#0d0919'); R(g, x + w - 5, CREST + 4 - h - 2, 3, 2, '#0d0919'); }
    x += w + Math.floor(hashN(x, 7) * 6);
  }
}
// Cresta: cornisa con almenas
function crest(g) {
  for (let x = 6; x < AW; x += 24) {
    R(g, x, CREST - 9, 13, 9, STONE_D[2]); R(g, x, CREST - 9, 13, 1, STONE_D[4]); R(g, x, CREST - 9, 1, 9, STONE_D[3]); R(g, x + 12, CREST - 9, 1, 9, STONE_D[1]);
    R(g, x - 1, CREST - 10, 15, 1, OUT); R(g, x - 1, CREST - 10, 1, 10, OUT); R(g, x + 13, CREST - 10, 1, 10, OUT);
  }
  R(g, 0, CREST, AW, 8, STONE_D[2]); R(g, 0, CREST - 1, AW, 1, OUT); R(g, 0, CREST, AW, 1, STONE_D[4]); R(g, 0, CREST + 1, AW, 1, STONE_D[3]); R(g, 0, CREST + 7, AW, 1, STONE_D[0]);
  for (let x = 0; x < AW; x += 12) { R(g, x + 5, CREST + 2, 1, 5, STONE_D[1]); }
}

// ---- Gradas y público --------------------------------------------------------------------------------------
const CLOTH = ['#6a4a52', '#4a626a', '#76704a', '#524a72', '#4a6a4a', '#7a5a42', '#62626e', '#6a4a5e'].map(ramp5);
const SKIN = ['#b08060', '#8a6048', '#d0a07c'].map(ramp5), HAIR = ['#2a1c14', '#4a3220', '#a89060', '#6a6a78'].map(ramp5);
const ORC = ramp5('#5a7a48'), IMP = ramp5('#8a4a5a');
const VEIL = [.66, .62, .58, .54, .50, .46].map(a => `rgba(8,5,22,${a})`);
function person(g, x, y, p, arms) {
  const c = p.cl, s = p.k === 1 ? ORC : p.k === 2 ? IMP : p.sk;
  R(g, x - 4, y + 6, 9, 9, c[2]); R(g, x - 4, y + 6, 1, 9, c[3]); R(g, x + 4, y + 6, 1, 9, c[1]); R(g, x - 3, y + 6, 7, 1, c[3]); R(g, x - 3, y + 12, 7, 1, c[1]);
  if (p.k === 3) {                                                                                  // encapuchado
    R(g, x - 3, y, 7, 7, c[2]); R(g, x - 3, y, 7, 1, c[3]); R(g, x - 3, y + 1, 1, 6, c[3]); R(g, x + 3, y + 1, 1, 6, c[1]);
    R(g, x - 1, y + 3, 3, 3, '#0e0a14'); R(g, x - 1, y + 4, 1, 1, '#c8b060'); R(g, x + 1, y + 4, 1, 1, '#c8b060');
  } else {
    R(g, x - 2, y + 1, 5, 6, s[2]); R(g, x - 2, y + 1, 1, 6, s[3]); R(g, x + 2, y + 2, 1, 5, s[1]);
    if (p.k === 0) { const h = p.hr; R(g, x - 2, y, 5, 3, h[2]); R(g, x - 2, y, 5, 1, h[3]); R(g, x + 2, y + 2, 1, 2, h[1]); if (p.l) R(g, x - 3, y + 2, 1, 4, h[1]); }
    else if (p.k === 2) { R(g, x - 3, y - 2, 1, 3, '#cfc6b4'); R(g, x + 3, y - 2, 1, 3, '#cfc6b4'); R(g, x - 2, y, 5, 1, s[1]); }
    else { R(g, x - 2, y + 1, 5, 1, s[1]); R(g, x - 1, y + 6, 1, 1, '#d8d0b8'); R(g, x + 1, y + 6, 1, 1, '#d8d0b8'); }
    R(g, x - 1, y + 4, 1, 1, '#1a1020'); R(g, x + 1, y + 4, 1, 1, '#1a1020');
  }
  const fist = (ax) => { R(g, ax, y - 1, 2, 8, c[2]); R(g, ax, y - 1, 1, 8, c[3]); R(g, ax, y - 3, 2, 2, s[2]); };
  if (arms) { fist(x + 5); if (arms > 1) fist(x - 6); }
}
function stands(g, people) {
  for (let r = 0; r < ROWS; r++) {
    const y0 = ROW0 + r * ROW_H;
    R(g, 0, y0, AW, ROW_H, STONE_D[0]);
    for (let x = 4, i = 0; x < AW; x += 9, i++) {
      const v = hashN(i, r, 9); if (v < .1) continue;                                               // asiento vacío
      const k = v > .97 ? 3 : v > .9 ? 2 : v > .78 ? 1 : 0, yy = y0 + Math.floor(hashN(i, r, 2) * 3);
      const p = { cl: CLOTH[Math.floor(hashN(i, r, 5) * 8)], sk: SKIN[Math.floor(hashN(i, r, 6) * 3)], hr: HAIR[Math.floor(hashN(i, r, 7) * 4)], k, l: hashN(i, r, 8) > .75 };
      const up = v > .93 && v < .955;                                                               // unos pocos con el brazo en alto fijo
      person(g, x, yy, p, up ? 1 : 0);
      const covered = COLS.some(c => Math.abs(x - c) < 30) || (Math.abs(x - CX) < 116 && yy > 108);       // tapado por columnas o por el trono: no se anima
      if (hashN(i, r, 11) > .86 && !up && !covered) people.push({ x, y: yy, p, ph: Math.floor(hashN(i, r, 12) * 40), per: 26 + Math.floor(hashN(i, r, 13) * 30), r });
    }
    R(g, 0, y0 + 14, AW, 5, STONE_D[2]); R(g, 0, y0 + 14, AW, 1, STONE_D[3]); R(g, 0, y0 + 15, AW, 1, STONE_D[1]); R(g, 0, y0 + 18, AW, 1, STONE_D[0]);
    for (let x = (r % 2) * 18; x < AW; x += 36) R(g, x, y0 + 16, 1, 2, STONE_D[0]);
    g.fillStyle = VEIL[r]; g.fillRect(0, y0, AW, ROW_H);                                             // velo escalonado: el público es ambiente
  }
}

// ---- Podio con arcos ----------------------------------------------------------------------------------------
function block(g, x, y, w, h, t) {
  R(g, x, y, w, h, STONE[t]); R(g, x, y, w, 1, STONE[Math.min(4, t + 1)]); R(g, x, y, 1, h, STONE[Math.min(4, t + 1)]);
  R(g, x, y + h - 1, w, 1, STONE[Math.max(0, t - 1)]); R(g, x + w - 1, y, 1, h, STONE[Math.max(0, t - 1)]);
}
function arch(g, cx, w, top, glow) {              // vano en arco rebajado con reja
  const hw = w / 2, ry = 16, cy = top + ry;
  const half = y => (y < cy ? Math.round(hw * Math.sqrt(1 - ((cy - y) / ry) ** 2)) : hw);
  for (let y = top; y < BASE; y++) {
    const h = half(y);
    R(g, cx - h - 4, y, 4, 1, STONE[3]); R(g, cx + h, y, 4, 1, STONE[1]); R(g, cx - h - 5, y, 1, 1, OUT); R(g, cx + h + 4, y, 1, 1, OUT);
    R(g, cx - h, y, h * 2, 1, y > BASE - 10 ? '#1c1236' : '#0b0814');
  }
  for (let x = cx - hw + 6; x < cx + hw - 3; x += 8) { R(g, x, top + 6, 2, BASE - top - 6, STONE_D[3]); R(g, x, top + 6, 1, BASE - top - 6, STONE_D[4]); for (let k = 0; k < 3; k++) R(g, x, BASE - 5 - k, 2, 1, STONE_D[1]); }
  for (const y of [top + 14, top + 28]) if (y < BASE - 4) R(g, cx - hw + 2, y, hw * 2 - 4, 2, STONE_D[2]);
  if (glow) for (let y = BASE - 22; y < BASE; y++) { g.globalAlpha = (y - (BASE - 22)) / 22 * .22; R(g, cx - hw, y, hw * 2, 1, '#8a5ad8'); } g.globalAlpha = 1;
  block(g, cx - 7, top - 5, 14, 11, 3); R(g, cx - 1, top - 2, 3, 4, STONE[0]);                      // clave del arco
}
function podium(g) {
  R(g, 0, POD0, AW, BASE - POD0, STONE[1]);
  for (let c = 0; c < 2; c++) {                                                                       // dos hiladas de sillares
    const y = POD0 + 14 + c * 20;
    for (let x = -(c * 22); x < AW; x += 44) block(g, x, y, 44, 20, 1 + (hashN(x, c) > .75 ? 1 : 0) + (hashN(x, c, 3) > .85 ? 1 : 0));
    for (let x = -(c * 22); x < AW; x += 44) if (hashN(x, c, 4) > .86) { R(g, x + 12, y + 5, 1, 4, STONE[0]); R(g, x + 13, y + 9, 1, 3, STONE[0]); R(g, x + 14, y + 12, 2, 1, STONE[0]); }   // grietas
    for (let x = -(c * 22); x < AW; x += 44) if (hashN(x, c, 5) > .9) { R(g, x + 20, y + 14, 5, 3, '#1e3a2a'); R(g, x + 21, y + 13, 3, 1, '#2c5238'); }                                   // musgo
  }
  R(g, 0, POD0, AW, 2, STONE[4]); R(g, 0, POD0 + 2, AW, 5, STONE[3]); R(g, 0, POD0 + 7, AW, 1, STONE[1]);                                              // cornisa
  for (let x = 2; x < AW; x += 8) { R(g, x, POD0 + 8, 5, 4, STONE[0]); R(g, x, POD0 + 8, 5, 1, STONE[1]); }
  R(g, 0, POD0 - 1, AW, 1, OUT);
  R(g, 0, BASE - 5, AW, 5, STONE[2]); R(g, 0, BASE - 5, AW, 1, STONE[4]); R(g, 0, BASE - 1, AW, 1, OUT);                                               // zócalo
  arch(g, CX, 152, POD0 + 14, true);
  arch(g, 208, 44, POD0 + 18, false); arch(g, AW - 208, 44, POD0 + 18, false);
  for (const x of [300, 660]) {                                                                          // pilastras tras las antorchas de pie
    R(g, x - 9, POD0 + 8, 18, BASE - POD0 - 8, STONE[2]); R(g, x - 9, POD0 + 8, 3, BASE - POD0 - 8, STONE[3]); R(g, x + 6, POD0 + 8, 3, BASE - POD0 - 8, STONE[1]);
    R(g, x - 11, POD0 + 8, 22, 3, STONE[3]); R(g, x - 11, POD0 + 10, 22, 1, STONE[0]); R(g, x - 11, BASE - 8, 22, 3, STONE[3]); R(g, x - 11, BASE - 6, 22, 1, STONE[0]);
    R(g, x - 10, POD0 + 7, 1, 1, OUT);
  }
}

// ---- Columnas, gárgolas, soportes de antorcha y estandartes -------------------------------------------------
const cylTone = u => (u < .1 ? 1 : u < .2 ? 3 : u < .32 ? 4 : u < .5 ? 3 : u < .72 ? 2 : u < .9 ? 1 : 0);
function column(g, cx, top, bot, w) {
  const x0 = cx - (w >> 1);
  for (let k = 0; k < w; k++) {
    let t = cylTone((k + .5) / w); if (k % 6 === 5 && t > 0) t--;                                       // acanaladuras
    R(g, x0 + k, top, 1, bot - top, STONE[t]);
  }
  for (let y = top + 26; y < bot - 8; y += 28) { R(g, x0, y, w, 1, STONE[0]); R(g, x0, y + 1, w, 1, STONE[3]); }
  R(g, x0 - 1, top, 1, bot - top, OUT); R(g, x0 + w, top, 1, bot - top, OUT);
  for (let i = 0; i < 6; i++) { const yy = top + 20 + Math.floor(hashN(cx, i) * (bot - top - 40)); R(g, x0 + 4 + Math.floor(hashN(i, cx) * (w - 10)), yy, 1, 3 + (i % 3), STONE[0]); }   // desconchones
  // basa y capitel
  R(g, x0 - 5, bot - 12, w + 10, 12, STONE[2]); R(g, x0 - 5, bot - 12, w + 10, 2, STONE[4]); R(g, x0 - 5, bot - 12, 2, 12, STONE[3]); R(g, x0 + w + 3, bot - 12, 2, 12, STONE[1]); R(g, x0 - 5, bot - 1, w + 10, 1, STONE[0]);
  R(g, x0 - 6, bot - 13, w + 12, 1, OUT); R(g, x0 - 6, bot - 13, 1, 13, OUT); R(g, x0 + w + 5, bot - 13, 1, 13, OUT);
  R(g, x0 - 4, top - 6, w + 8, 6, STONE[3]); R(g, x0 - 4, top - 6, w + 8, 1, STONE[4]); R(g, x0 - 4, top - 1, w + 8, 1, STONE[0]);
  R(g, x0 - 7, top - 14, w + 14, 8, STONE[2]); R(g, x0 - 7, top - 14, w + 14, 2, STONE[4]); R(g, x0 - 7, top - 14, 2, 8, STONE[3]); R(g, x0 + w + 5, top - 14, 2, 8, STONE[1]); R(g, x0 - 7, top - 7, w + 14, 1, STONE[0]);
  R(g, x0 - 8, top - 15, w + 16, 1, OUT); R(g, x0 - 8, top - 15, 1, 9, OUT); R(g, x0 + w + 7, top - 15, 1, 9, OUT);
}
function gargoyle(g, cx, y, s) {                                                                       // gárgola agazapada sobre la columna (diseño propio)
  const f = (x, yy, w, h, c) => R(g, cx + x * s - (s < 0 ? w - 1 : 0), y + yy, w, h, c);
  f(-9, -16, 18, 16, STONE[2]); f(-9, -16, 3, 16, STONE[3]); f(6, -16, 3, 16, STONE[1]);                // cuerpo
  f(-6, -26, 12, 11, STONE[2]); f(-6, -26, 12, 2, STONE[4]); f(-6, -26, 2, 11, STONE[3]); f(4, -26, 2, 11, STONE[1]);   // cabeza
  f(-8, -32, 3, 7, STONE[3]); f(5, -32, 3, 7, STONE[1]); f(-8, -33, 2, 1, STONE[4]); f(6, -33, 2, 1, STONE[4]);          // cuernos
  f(-4, -22, 2, 2, '#a02a2a'); f(2, -22, 2, 2, '#a02a2a'); f(-2, -16, 4, 2, STONE[0]);
  f(-20, -26, 12, 3, STONE[1]); f(-26, -22, 8, 3, STONE[1]); f(-16, -23, 8, 9, STONE[0]);               // alas plegadas
  f(8, -26, 12, 3, STONE[1]); f(18, -22, 8, 3, STONE[1]); f(8, -23, 8, 9, STONE[0]);
  R(g, cx - 11, y - 34, 22, 1, OUT);
}
function sconce(g, x, y, standing) {                                                                    // la llama la pone scene.js sobre (x, y)
  const h = standing ? 44 : 22;
  R(g, x - 2, y + 6, 4, h, '#4a3220'); R(g, x - 2, y + 6, 1, h, '#6a4a2c'); R(g, x + 1, y + 6, 1, h, '#2a1a10');
  R(g, x - 5, y, 10, 2, '#5a5a6a'); R(g, x - 5, y, 10, 1, '#8a8a9c'); R(g, x - 4, y + 2, 8, 3, '#3a3a48'); R(g, x - 3, y + 5, 6, 2, '#2a2a36');   // copa de hierro
  R(g, x - 5, y - 1, 1, 3, '#8a8a9c'); R(g, x + 4, y - 1, 1, 3, '#4a4a58');
  R(g, x - 4, y + 12, 8, 2, '#3a3a48'); R(g, x - 4, y + 12, 8, 1, '#7a7a8c');                          // aro
  if (standing) {
    R(g, x - 10, y + 48, 20, 3, '#3a3a48'); R(g, x - 10, y + 48, 20, 1, '#7a7a8c'); R(g, x - 3, y + 40, 6, 8, '#3a3a48');
    for (const s of [-1, 1]) for (let k = 0; k < 8; k++) R(g, x + s * (3 + k) - (s < 0 ? 1 : 0), y + 40 + k, 2, 2, '#2e2e3a');
    g.globalAlpha = .4; R(g, x - 12, y + 51, 24, 3, '#000'); g.globalAlpha = 1;
  } else { R(g, x - 8, y + 4, 16, 18, STONE[0]); g.globalAlpha = .6; R(g, x - 8, y + 4, 16, 18, '#000'); g.globalAlpha = 1; R(g, x - 3, y + 6, 6, 22, '#4a3220'); R(g, x - 3, y + 6, 1, 22, '#6a4a2c'); R(g, x - 5, y, 10, 3, '#5a5a6a'); R(g, x - 5, y, 10, 1, '#8a8a9c'); R(g, x - 4, y + 3, 8, 3, '#3a3a48'); }
}
// Estandarte: 4 fotogramas de ondeo, con la tela cortada por filas
const bannerFrames = new Map();
function bannerSrc(b) {
  const c = mk(b.w + 8, b.len + 12), g = c.getContext('2d'), w = b.w, ox = 4;
  R(g, 0, 0, w + 8, 4, '#3a2a1a'); R(g, 0, 0, w + 8, 1, '#6a4a2c'); R(g, 0, 3, w + 8, 1, '#1a1008'); R(g, 0, 0, 3, 5, '#8a6a3a'); R(g, w + 5, 0, 3, 5, '#8a6a3a');   // vara
  for (let y = 4; y < b.len; y++) {                                                                      // tela con cola de golondrina
    const notch = y > b.len - 14 ? Math.floor((y - (b.len - 14)) * (w / 2) / 14) : 0;
    for (let x = 0; x < w; x++) {
      if (notch && Math.abs(x - w / 2 + .5) < notch) continue;
      const u = x / w, t = u < .12 ? 3 : u > .88 ? 1 : (x + Math.floor(y / 6)) % 7 === 0 ? 1 : 2;
      R(g, ox + x, y, 1, 1, CRIM[t]);
    }
  }
  R(g, ox, 5, w, 2, GOLD[2]); R(g, ox, 5, w, 1, GOLD[3]);
  const cx = ox + (w >> 1), cy = Math.floor(b.len * .38), q = w >= 36 ? 1 : 0;                         // emblema: luna creciente con tres púas
  for (let y = -11; y <= 11; y++) for (let x = -11; x <= 11; x++) { const d = Math.hypot(x, y), d2 = Math.hypot(x - 5, y); if (d <= 10.5 && d2 > 9.2) R(g, cx + x, cy + y, 1, 1, d > 9 || x < -6 ? GOLD[4] : GOLD[3]); }
  R(g, cx + 5, cy - 1, 3, 3, GOLD[3]); R(g, cx + 6, cy, 1, 1, GOLD[4]);
  R(g, cx - 1, cy - 14, 3, 6, GOLD[3]); R(g, cx, cy - 15, 1, 1, GOLD[4]); R(g, cx - 1, cy + 8, 3, 6, GOLD[2]); if (q) { R(g, cx - 12, cy - 1, 4, 3, GOLD[2]); R(g, cx + 9, cy - 1, 4, 3, GOLD[2]); }
  R(g, ox, b.len - 18, w, 1, GOLD[1]);
  return c;
}
function bannerFrame(i, f) {
  const key = i + '|' + f; let c = bannerFrames.get(key);
  if (!c) {
    const b = BANNERS[i], src = bannerSrc(b); c = mk(src.width, src.height); const g = c.getContext('2d');
    for (let y = 0; y < src.height; y++) { const k = Math.max(0, y - 4) / b.len, sh = Math.round(Math.sin(f * Math.PI / 2 + y * .13) * 2.2 * k); g.drawImage(src, 0, y, src.width, 1, sh, y, src.width, 1); }
    // contorno de 1 px
    const id = g.getImageData(0, 0, c.width, c.height), d = id.data, W = c.width, H = c.height, o = rgb(OUT), out = new Uint8ClampedArray(d);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!d[(y * W + x) * 4 + 3]) {
      const n = (x > 0 && d[(y * W + x - 1) * 4 + 3]) || (x < W - 1 && d[(y * W + x + 1) * 4 + 3]) || (y > 0 && d[((y - 1) * W + x) * 4 + 3]) || (y < H - 1 && d[((y + 1) * W + x) * 4 + 3]);
      if (n) { const p = (y * W + x) * 4; out[p] = o[0]; out[p + 1] = o[1]; out[p + 2] = o[2]; out[p + 3] = 255; }
    }
    id.data.set(out); g.putImageData(id, 0, 0); bannerFrames.set(key, c);
  }
  return c;
}
const bannerXY = b => [b.x - (b.w >> 1) - 4, CREST - 2];

// ---- Suelo: adoquín en perspectiva y arena con anillos de piedra ---------------------------------------------
function ground(g) {
  const Y0 = BASE, Y1 = FENCE_Y + 8, H = Y1 - Y0, img = g.createImageData(AW, H), d = img.data;
  const P = STONE_D.map(rgb), F = FLOOR.map(rgb);
  const HOR = -100, ZF = 60000, DZ = 5, CS = 10.7, RX = 470, RY = 132, E = [1, .955, .83, .59, .37], NC = [0, 64, 44, 30];
  const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  for (let j = 0; j < H; j++) {
    const y = Y0 + j, dyh = y - HOR, z = ZF / dyh / DZ, rowI = Math.floor(z), rowF = z - rowI, rowH = dyh * dyh / ZF * DZ, ny = (y - FLOOR_CY) / RY;
    for (let x = 0; x < AW; x++) {
      const nx = (x - CX) / RX, dd = Math.sqrt(nx * nx + ny * ny);
      let c, f = 1;
      if (dd > 1) {                                                                                       // adoquín exterior
        const u = (x - CX) / dyh * CS + (rowI & 1 ? .5 : 0), ci = Math.floor(u), cf = u - ci, jr = rowF * rowH, jc = cf * dyh / CS;
        let t = jr < 1 || jc < 1 ? 0 : jr < 2 || jc < 2 ? 3 : (hashN(rowI, ci) < .3 ? 1 : 2);
        if (t === 2 && hashN(x, y, 7) > .93) t = 1; else if (t === 2 && hashN(x, y, 8) > .96) t = 3;
        c = P[t]; f = y < BASE + 14 ? .55 + (y - BASE) / 14 * .45 : 1;
      } else {
        const a = Math.atan2(ny, nx), rl = Math.hypot(Math.cos(a) * RX, Math.sin(a) * RY);
        let k = 0; while (k < 4 && dd < E[k + 1]) k++;
        let t;
        if (k === 4) {                                                                                    // arena central
          const mot = hashN(Math.floor(x / 5), Math.floor(y / 3), 21), v = hashN(x, y, 22);
          t = mot > .62 ? 2 : 1; if (v > .93) t++; else if (v < .06) t--;
          if (Math.floor(dd * 46) % 6 === 0 && hashN(x >> 2, y, 23) > .45) t--;                           // marcas de rastrillo
          t = Math.max(0, Math.min(4, t));
        } else {
          const dOut = (E[k] - dd) * rl, dIn = (dd - E[k + 1]) * rl, up = ny < 0 ? dOut : dIn;
          if (k === 0) t = dOut < 1 ? 0 : dIn < 1 ? 0 : up < 2 ? 4 : 3;
          else {
            const n = NC[k], an = ((a / (Math.PI * 2) + 1) % 1) * n + (k & 1 ? .5 : 0), ci = Math.floor(an), cf = an - ci, dj = Math.min(cf, 1 - cf) * (Math.PI * 2 * dd * rl / n);
            t = hashN(k, ci % n, 31); t = t < .16 ? 1 : t > .92 ? 3 : 2;
            if (dOut < 1 || dIn < 1 || dj < .8) t = 0; else if (up < 2 || (cf * (Math.PI * 2 * dd * rl / n) < 2)) t = Math.min(4, t + 1);
            if (t > 0 && hashN(x, y, 7) > .94) t--;
          }
        }
        c = F[t];
        f = 1 - .34 * Math.max(0, Math.min(1, (dd - .5) / .5));                                           // oscurece hacia el borde
      }
      const q = Math.floor(f * 6 + (bayer[y & 3][x & 3] + .5) / 16) / 6, p = (j * AW + x) * 4;
      d[p] = c[0] * q; d[p + 1] = c[1] * q; d[p + 2] = c[2] * q; d[p + 3] = 255;
    }
  }
  const t = mk(AW, H); t.getContext('2d').putImageData(img, 0, 0); g.drawImage(t, 0, Y0);
  // Detalles sueltos: grietas, manchas de quemado, escombros
  const crack = (x, y, n, s) => { for (let i = 0; i < n; i++) { R(g, x, y, 1, 1, FLOOR[0]); x += Math.floor(hashN(i, s) * 3) - 1 + (i % 3 ? 1 : 0); y += hashN(i, s, 4) > .45 ? 1 : 0; } };
  for (const [x, y, n, s] of [[300, 330, 22, 1], [640, 360, 18, 2], [180, 420, 16, 3], [770, 440, 20, 4], [520, 300, 12, 5], [430, 450, 14, 6]]) crack(x, y, n, s);
  for (const [x, y, rx, ry] of [[420, 360, 38, 10], [610, 410, 30, 8], [300, 450, 26, 7], [740, 345, 24, 6]]) {
    for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) { const q = (xx / rx) ** 2 + (yy / ry) ** 2; if (q < 1 && hashN(x + xx, y + yy, 9) > .35 + q * .6) R(g, x + xx, y + yy, 1, 1, FLOOR[0]); }
  }
  for (let i = 0; i < 34; i++) { const x = 40 + Math.floor(hashN(i, 40) * 880), y = 300 + Math.floor(hashN(i, 41) * 180), w = 1 + (i % 3); if ((x - CX) ** 2 / RX ** 2 + (y - FLOOR_CY) ** 2 / RY ** 2 < 1) { R(g, x, y, w, 1, FLOOR[4]); R(g, x, y + 1, w, 1, FLOOR[0]); } }
  // sombra de los muros sobre el suelo, en bandas
  [[.4, 5], [.26, 4], [.14, 4]].reduce((y, [a, h]) => { g.globalAlpha = a; R(g, 0, y, AW, h, '#05030c'); return y + h; }, BASE); g.globalAlpha = 1;
}

// ---- Trono del Rey Demonio (queda tras el rey; se ve entero con la arena vacía) --------------------------------
// Coordenadas locales: x desde el centro, y negativa hacia arriba desde THRONE_Y (base de la tarima).
const RUNES = [[-37, -178], [-37, -152], [-37, -126], [35, -178], [35, -152], [35, -126], [-1, -226]];
const rune = (g, x, y, c, v) => { R(g, x, y, 1, 7, c); R(g, x - 1 + (v & 1), y + 1 + (v & 2), 3, 1, c); R(g, x - 1, y + 4, 2 + (v & 1), 1, c); };
function throne(g) {
  const x = CX, y = THRONE_Y, S = STONE, L = (a, b, w, h, c) => R(g, x + a, y + b, w, h, c);
  g.globalAlpha = .35; for (let k = 0; k < 4; k++) { const rx = 150 - k * 22; for (let yy = -8; yy <= 8; yy++) { const hw = Math.round(rx * Math.sqrt(1 - (yy / 8) ** 2)); R(g, x - hw, y + 4 + yy, hw * 2, 1, '#000'); } } g.globalAlpha = 1;   // sombra
  for (let i = 0; i < 3; i++) {                                                                           // tarima de tres peldaños
    const w = 244 - i * 40, top = -10 * (i + 1);
    L(-w / 2, top, w, 10, S[2]); L(-w / 2, top, w, 3, S[4]); L(-w / 2, top + 3, w, 1, S[3]); L(-w / 2, top + 9, w, 1, S[0]); L(-w / 2, top, 2, 10, S[3]); L(w / 2 - 2, top, 2, 10, S[1]);
    for (let b = -w / 2 + 14; b < w / 2 - 8; b += 28) L(b + (i % 2) * 10, top + 4, 1, 5, S[1]);
    L(-w / 2 - 1, top - 1, w + 2, 1, OUT); L(-w / 2 - 1, top - 1, 1, 11, OUT); L(w / 2, top - 1, 1, 11, OUT);
  }
  // cuerpo por filas: ancho(r) devuelve el semiancho; luz a la izquierda, sombra a la derecha, contorno en los bordes
  const body = (y0, y1, half, t, ox = 0, edge = 4) => {
    let prev = 0;
    for (let r = y0; r < y1; r++) {
      const hw = Math.round(half(r)); if (hw <= 0) { prev = 0; continue; }
      const e = Math.min(edge, hw);
      L(ox - hw, r, hw * 2, 1, S[t]); L(ox - hw, r, e, 1, S[Math.min(4, t + 1)]); L(ox + hw - e, r, e, 1, S[Math.max(0, t - 1)]);
      L(ox - hw - 1, r, 1, 1, OUT); L(ox + hw, r, 1, 1, OUT);
      if (hw > prev) { L(ox - hw, r, hw * 2, 1, S[Math.min(4, t + 1)]); L(ox - hw - 1, r, hw * 2 + 2, 1, OUT); }       // borde superior al ensancharse
      prev = hw;
    }
  };
  // hojas curvas a los lados (detrás del respaldo)
  for (const s of [-1, 1]) {
    for (let k = 0; k < 56; k++) {
      const bx = 38 + k * 1.1, byy = Math.round(-150 - k * 1.2 - k * k / 90), w = Math.max(3, Math.round(14 - k / 5));
      const a = s * bx - (s < 0 ? w : 0);
      L(a - 1, byy - 1, 1, 3, OUT); L(a + w, byy - 1, 1, 3, OUT); L(a, byy - 1, w, 1, OUT);
      L(a, byy, w, 2, S[2]); L(a + (s < 0 ? w - 3 : 0), byy, 3, 2, S[s < 0 ? 1 : 3]); if (k % 9 === 4) L(a + 2, byy, w - 4, 1, S[1]);
    }
    for (let k = 0; k < 6; k++) { const hh = 30 - k * 4; L(s * (46 + k * 4) - (s < 0 ? 6 : 0), -62 - hh, 6, hh, S[k % 2 ? 1 : 2]); L(s * (46 + k * 4) - (s < 0 ? 6 : 0), -62 - hh, 6, 1, S[3]); }   // aletas
  }
  // respaldo alto con punta gótica
  body(-236, -60, r => (r > -190 ? 44 : 44 * Math.max(0, 1 - ((-190 - r) / 46) ** 1.55)), 2);
  for (let r = -186; r < -64; r += 12) { L(-44, r, 6, 1, S[1]); L(38, r, 6, 1, S[0]); }
  body(-198, -60, r => (r > -150 ? 27 : 27 * Math.max(0, 1 - ((-150 - r) / 48) ** 1.6)), 0, 0, 2);                    // hornacina oscura
  body(-196, -62, r => (r > -150 ? 24 : 24 * Math.max(0, 1 - ((-150 - r) / 46) ** 1.6)), 0, 0, 0);
  for (let r = -194; r < -62; r++) { const hw = Math.round(r > -150 ? 24 : 24 * Math.max(0, 1 - ((-150 - r) / 46) ** 1.6)); if (hw > 2) { L(-hw, r, hw * 2, 1, r > -90 ? '#241a3c' : '#1a142c'); L(-hw, r, 2, 1, '#2c2248'); } }
  for (let r = -198; r < -60; r += 2) { const hw = Math.round(r > -150 ? 28 : 28 * Math.max(0, 1 - ((-150 - r) / 48) ** 1.6)); if (hw > 3) { L(-hw, r, 1, 1, GOLD[2]); L(hw - 1, r, 1, 1, GOLD[1]); } }   // filete dorado
  // cojín y asiento
  L(-24, -90, 48, 30, CRIM[2]); L(-24, -90, 48, 3, CRIM[4]); L(-24, -62, 48, 2, CRIM[0]); L(-24, -90, 3, 30, CRIM[3]); L(21, -90, 3, 30, CRIM[1]); L(-25, -91, 50, 1, OUT);
  for (const k of [-12, 0, 12]) L(k, -86, 1, 22, CRIM[1]);
  L(-54, -60, 108, 30, S[2]); L(-54, -60, 108, 3, S[4]); L(-54, -57, 108, 1, S[3]); L(-54, -31, 108, 1, S[0]); L(-55, -61, 110, 1, OUT); L(-55, -61, 1, 31, OUT); L(54, -61, 1, 31, OUT);
  for (let b = -44; b < 48; b += 22) L(b, -52, 1, 20, S[1]);
  for (const s of [-1, 1]) {                                                                               // brazos con garras
    const ax = s * 52 - (s < 0 ? 20 : 0);
    L(ax, -94, 20, 36, S[2]); L(ax, -94, 20, 4, S[4]); L(ax + (s < 0 ? 0 : 16), -94, 4, 36, S[s < 0 ? 3 : 1]); L(ax - 1, -95, 22, 1, OUT); L(ax - 1, -95, 1, 37, OUT); L(ax + 20, -95, 1, 37, OUT);
    for (const [dx, hh] of [[2, 8], [8, 12], [14, 8]]) { L(ax + dx, -94 - hh, 4, hh, S[3]); L(ax + dx, -94 - hh, 4, 1, S[4]); L(ax + dx - 1, -95 - hh, 6, 1, OUT); }
  }
  // calavera de remate, escudo dorado y runas
  L(-8, -222, 16, 13, '#a89c88'); L(-8, -222, 16, 2, '#cfc6b4'); L(-8, -222, 2, 13, '#cfc6b4'); L(6, -222, 2, 13, '#7a6e60'); L(-5, -216, 3, 4, '#0e0a14'); L(2, -216, 3, 4, '#0e0a14'); L(-1, -211, 2, 3, '#0e0a14'); L(-9, -223, 18, 1, OUT);
  RUNES.forEach(([a, b], i) => rune(g, x + a, y + b, '#3e2a6e', i));
}

// ---- Halos de las antorchas y runas (capa viva, sobre una copia limpia del fondo) --------------------------------
let haloSpr = null;
function halo() {
  if (haloSpr) return haloSpr;
  const c = mk(160, 124), g = c.getContext('2d'); g.fillStyle = '#ffa23a';
  [[76, 58, .05], [60, 46, .06], [44, 34, .07], [28, 22, .08], [14, 11, .08]].forEach(([rx, ry, a]) => {
    g.globalAlpha = a; for (let y = -ry; y <= ry; y++) { const hw = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2)); g.fillRect(80 - hw, 62 + y, hw * 2, 1); }
  });
  return (haloSpr = c);
}
let st = null, raf = 0;
export const stats = { paints: 0, ms: 0, max: 0, bakeMs: 0 };   // medición del coste de la capa viva y del horneado
const spectRect = s => [s.x - 8, s.y - 5, 17, 14];
function paint(now) {
  const t0 = performance.now();
  const { g, pr } = st, rm = reduced(), f = rm ? 0 : Math.floor(now / 130), restore = (x, y, w, h) => g.drawImage(pr, x, y, w, h, x, y, w, h);
  // 1. recuadros a restaurar
  for (const s of st.people) restore(...spectRect(s));
  BANNERS.forEach((b, i) => { const [x, y] = bannerXY(b); restore(x - 4, y, b.w + 16, b.len + 16); });
  TORCHES.forEach(([x, y]) => restore(x - 80, y - 90, 160, 124));
  for (const [a, b] of RUNES) restore(CX + a - 3, THRONE_Y + b - 1, 7, 10);
  // 2. público: algunos levantan los brazos un rato
  for (const s of st.people) {
    const ph = (f + s.ph) % s.per, arms = rm ? 0 : ph < 6 ? 1 : ph < 9 ? 2 : ph < 12 ? 1 : 0;
    if (arms) {                                                                                   // se pinta aparte y se vela solo la persona (el fondo restaurado ya lleva su velo)
      const sg = st.sc; sg.clearRect(0, 0, 28, 30); person(sg, 14, 10, s.p, arms);
      sg.globalCompositeOperation = 'source-atop'; sg.fillStyle = VEIL[s.r]; sg.fillRect(0, 0, 28, 30); sg.globalCompositeOperation = 'source-over';
      g.drawImage(st.scv, s.x - 14, s.y - 10);
    }
  }
  // 3. estandartes
  BANNERS.forEach((b, i) => { const [x, y] = bannerXY(b); g.drawImage(bannerFrame(i, rm ? 0 : Math.floor(now / 380 + i * 1.3) % 4), x, y); });
  // 4. halos de las antorchas con parpadeo
  const hs = halo();
  TORCHES.forEach(([x, y], i) => { g.globalAlpha = rm ? 1 : .8 + hashN(f >> 1, i, 5) * .4; g.drawImage(hs, x - 80, y - 66); });
  g.globalAlpha = 1;
  // 5. runas del trono: pulso lento
  const pulse = rm ? .5 : .5 + .5 * Math.sin(now / 900);
  g.globalAlpha = rm ? .7 : .45 + .5 * pulse;
  RUNES.forEach(([a, b], k) => rune(g, CX + a, THRONE_Y + b, '#9a6af0', k));
  g.globalAlpha = 1;
  const dt = performance.now() - t0; stats.paints++; stats.ms += dt; if (dt > stats.max) stats.max = dt;
}
export const paintLive = now => { if (st) paint(now); };                                                   // repinta ya (pruebas de coste)
function tick(now) {
  raf = requestAnimationFrame(tick);
  if (!st) return;
  const c = st.g.canvas;
  if (c.width !== AW || c.height !== AH) return;                                                           // el lienzo está en uso por otro tema
  const rm = reduced();
  if (now - st.last < 120 && st.rm === rm) return;
  if (rm && st.rm === rm) return;                                                                          // en reposo: ya está pintado
  st.last = now; st.rm = rm; paint(now);
}

// ---- Entrada: hornea el fondo (una vez por cambio de tema o de tamaño) -------------------------------------------
export function drawBackground(g) {
  const tb = performance.now();
  g.save(); g.imageSmoothingEnabled = false;
  const people = [];
  sky(g); crest(g); stands(g, people); podium(g); ground(g);
  for (const x of COLS) { column(g, x, 70, BASE + 2, 34); gargoyle(g, x, 38, x < CX ? 1 : -1); }
  TORCHES.forEach(([x, y], i) => sconce(g, x, y, i >= 2));
  throne(g);
  // viñeta de bordes y oscurecido superior (para el HUD y la cabeza del rey)
  [[.30, 0], [.22, 14], [.15, 28], [.09, 42], [.05, 56]].forEach(([a, x]) => { g.fillStyle = `rgba(4,2,12,${a})`; g.fillRect(x, 0, 14, FENCE_Y); g.fillRect(AW - x - 14, 0, 14, FENCE_Y); });
  [[.30, 0, 14], [.18, 14, 14], [.09, 28, 14]].forEach(([a, y, h]) => { g.fillStyle = `rgba(4,2,12,${a})`; g.fillRect(0, y, AW, h); });
  g.restore();
  drawCampBackground(g);                                                                                   // empalizada con puerta y campamento
  // copia limpia para el repintado de los recuadros animados
  const pr = mk(AW, AH); pr.getContext('2d').drawImage(g.canvas, 0, 0);
  const scv = mk(28, 30);
  st = { g, pr, people, scv, sc: scv.getContext('2d'), last: -1e9, rm: null };
  stats.bakeMs = performance.now() - tb;
  paint(performance.now());
  st.rm = reduced(); st.last = performance.now();
  if (!raf && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(tick);
}
