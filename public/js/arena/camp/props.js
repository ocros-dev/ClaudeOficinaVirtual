// Mobiliario, objetos y efectos del campamento (paquete CAMP-A, nivel 16 bits, lienzo 960×608).
// Todas las funciones públicas reciben coordenadas del lienzo y mantienen el contrato que usan camp.js y acts.js:
//   drawCampBackground(g)                         suelo, sendero, empalizada, puerta y rincones (se hornea con la escena)
//   drawCampLive(g, now)                          llamas y halos de los farolillos de la puerta
//   drawProp(g, kind, c, bx, by, now, rm)         mobiliario de la actividad `kind` anclado al puesto (bx, by) = pies de la vanguardia
//   drawOverlay(g, kind, c, bx, by, now, rm)      efectos por encima de los héroes (proyectiles, chispas, orbes, ronquidos…)
//   drawHeld(g, kind, x, y, ix, iy, now, flip)    objeto en la mano (x, y: pies; ix, iy: desplazamiento en píxeles del lienzo)
//   drawLog(g, x, y)                              tronco donde se sientan los héroes
// Anclajes (relativos al puesto): fogata (0,0) · mesa (0,0) · muñeco (+54,0) · diana (+68,-2) · camastro (0,-10) · yunque (+12,0) y
// horno (+62,0) · farol (0,+4) · plataforma de pesas (0,+6) · banco de engranajes (0,0). Los sprites se hornean una vez con
// contorno de 1 px; solo las llamas, el humo, los engranajes y las chispas se calculan por fotograma.
import { AW, AH, FENCE_Y, GATE_X, CAMP_SLOTS } from '../config.js';
import { reduced } from '../util.js';
import { ramp5 } from '../art/kit16/ramps.js';

const OUT = '#0a0810';
const hashN = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const WOOD = ramp5(['#1e130c', '#3a2616', '#6a4426', '#8c6234', '#b08448']);
const IRON = ramp5(['#14141c', '#262a34', '#444a58', '#6a7284', '#98a2b8']);
const ROCK = ramp5(['#1c1824', '#2e2a3a', '#494458', '#645e76', '#847e98']);
const HAY = ramp5(['#3a2e14', '#6a5424', '#a08838', '#c8aa54', '#e6cc80']);
const CLAY = ramp5(['#2a1810', '#4e2c1c', '#7e4a30', '#a46a46', '#c88e66']);
const CRIM = ramp5(['#240a14', '#40142a', '#5e2034', '#7e3246', '#9c4a5c']);
const GOLD = ramp5(['#2e2310', '#5a4520', '#8a6e30', '#b89a48', '#dcc479']);
const MEAT = ramp5(['#2a0e0a', '#5a2214', '#8a3a1c', '#b45a2a', '#d88a4a']);
const SACK = ramp5('#8a7650'), PAPER = ramp5('#d8cfae');
const FLAME = ['#8a2410', '#d8501a', '#ff9a2a', '#ffd24a', '#fff4b8'];

// ---- Sprites horneados con contorno -------------------------------------------------------------------------
const bakes = new Map();
function outline(c) {
  const g = c.getContext('2d'), W = c.width, H = c.height, id = g.getImageData(0, 0, W, H), d = id.data, o = rgb(OUT), out = new Uint8ClampedArray(d);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!d[(y * W + x) * 4 + 3]) {
    const n = (x > 0 && d[(y * W + x - 1) * 4 + 3] > 200) || (x < W - 1 && d[(y * W + x + 1) * 4 + 3] > 200) || (y > 0 && d[((y - 1) * W + x) * 4 + 3] > 200) || (y < H - 1 && d[((y + 1) * W + x) * 4 + 3] > 200);
    if (n) { const p = (y * W + x) * 4; out[p] = o[0]; out[p + 1] = o[1]; out[p + 2] = o[2]; out[p + 3] = 255; }
  }
  id.data.set(out); g.putImageData(id, 0, 0);
}
// bake(clave, ancho, alto, ancla x, ancla y, dibujo, sombra): R(x, y, w, h, color) con coordenadas relativas al ancla (los pies del objeto)
function bake(key, w, h, ax, ay, fn, shadow = 0) {
  let b = bakes.get(key);
  if (!b) {
    const c = mk(w, h), g = c.getContext('2d');
    fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + ax, y + ay, ww, hh); }, g);
    outline(c);
    if (shadow) { g.globalCompositeOperation = 'destination-over'; g.fillStyle = 'rgba(0,0,0,.3)'; for (let y = -3; y <= 3; y++) { const hw = Math.round(shadow * Math.sqrt(1 - (y / 3.6) ** 2)); g.fillRect(ax - hw, ay + y, hw * 2, 1); } }
    b = { c, ax, ay }; bakes.set(key, b);
  }
  return b;
}
const blit = (g, b, x, y) => g.drawImage(b.c, Math.round(x - b.ax), Math.round(y - b.ay));
// Caja con luz arriba-izquierda y rampa de 5 tonos
const box = (R, x, y, w, h, r, t = 2) => { R(x, y, w, h, r[t]); R(x, y, w, 1, r[Math.min(4, t + 1)]); R(x, y, 1, h, r[Math.min(4, t + 1)]); R(x, y + h - 1, w, 1, r[Math.max(0, t - 1)]); R(x + w - 1, y, 1, h, r[Math.max(0, t - 1)]); };
const disc = (R, cx, cy, r, col) => { for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(r * r - y * y + .25)); R(cx - hw, cy + y, hw * 2 + 1, 1, col); } };
const plank = (R, x, y, w, h, t = 2) => { box(R, x, y, w, h, WOOD, t); for (let k = x + 9 + (y & 3); k < x + w - 3; k += 11) R(k, y + 1, 1, h - 2, WOOD[t - 1 < 0 ? 0 : t - 1]); };

const SPR = {
  table: () => bake('table', 76, 54, 38, 48, R => {
    for (const s of [-1, 1]) { box(R, s * 24 - 3, -22, 6, 22, WOOD, 1); R(s * 24 + 1, -22, 1, 22, WOOD[0]); }
    R(-24, -10, 48, 3, WOOD[1]); R(-24, -10, 48, 1, WOOD[2]);                                                  // travesaño
    plank(R, -32, -30, 64, 8, 3); R(-32, -23, 64, 1, WOOD[1]); R(-31, -22, 62, 1, WOOD[0]);                    // tablero
    for (let x = -30; x < 30; x += 16) R(x + 2, -29, 8, 1, WOOD[4]);
    // mantel de tira roja
    R(-10, -30, 20, 2, CRIM[3]); R(-10, -30, 20, 1, CRIM[4]); R(-10, -28, 20, 1, CRIM[1]);
    // fuente con asado
    R(-20, -34, 20, 4, ROCK[3]); R(-20, -34, 20, 1, ROCK[4]); R(-19, -31, 18, 1, ROCK[1]);
    R(-17, -39, 14, 6, MEAT[2]); R(-17, -39, 14, 2, MEAT[4]); R(-17, -34, 14, 1, MEAT[0]); R(-12, -41, 5, 3, MEAT[3]); R(-4, -37, 5, 2, '#e8e0d0'); R(-2, -39, 2, 2, '#e8e0d0');
    R(-14, -37, 2, 1, MEAT[1]); R(-9, -38, 3, 1, MEAT[1]);
    // pan y queso
    R(4, -36, 11, 6, HAY[2]); R(4, -36, 11, 2, HAY[4]); R(4, -31, 11, 1, HAY[0]); R(7, -35, 1, 2, HAY[1]); R(11, -35, 1, 2, HAY[1]);
    R(17, -35, 7, 5, '#d8b84a'); R(17, -35, 7, 1, '#f0dc88'); R(17, -31, 7, 1, '#8a6a20'); R(20, -33, 1, 1, '#8a6a20');
    // jarras con espuma y cántaro
    for (const [x, c] of [[-30, GOLD], [27, GOLD]]) { box(R, x, -40, 6, 10, c, 2); R(x - 2, -38, 2, 6, c[3]); R(x + 6, -38, 1, 5, c[1]); R(x, -41, 6, 2, '#f4f0e4'); R(x + 1, -42, 3, 1, '#ffffff'); }
    box(R, 24, -46, 7, 14, CLAY, 2); R(25, -48, 5, 2, CLAY[3]); R(23, -42, 1, 4, CLAY[1]);
    R(-27, -34, 4, 4, '#c0c4d0'); R(-26, -35, 2, 1, '#e8ecf4');                                               // cuchillo y cubierto
  }, 36),
  dummy: () => bake('dummy', 48, 70, 24, 66, R => {
    box(R, -14, -4, 28, 4, WOOD, 1); R(-10, -6, 20, 2, WOOD[2]); R(-16, -2, 3, 3, WOOD[1]); R(13, -2, 3, 3, WOOD[1]);   // pie en cruz
    box(R, -3, -48, 6, 46, WOOD, 2); R(-3, -48, 1, 46, WOOD[3]); R(2, -48, 1, 46, WOOD[1]);
    box(R, -17, -38, 34, 6, WOOD, 3); R(-15, -37, 1, 4, WOOD[1]); R(14, -37, 1, 4, WOOD[1]);                  // brazos
    // cuerpo de paja atado
    box(R, -9, -46, 18, 22, HAY, 2); for (let y = -44; y < -26; y += 4) R(-8, y, 16, 1, HAY[1]); R(-9, -35, 18, 2, WOOD[2]); R(-9, -35, 18, 1, WOOD[3]);
    R(-4, -40, 8, 8, CRIM[2]); R(-4, -40, 8, 1, CRIM[3]); R(-2, -38, 4, 4, '#d8d0c0'); R(-1, -37, 2, 2, CRIM[2]);                 // diana en el pecho
    R(-8, -29, 4, 1, HAY[4]); R(4, -30, 3, 1, HAY[4]);
    // cabeza de saco
    box(R, -7, -62, 14, 15, SACK, 2); R(-7, -49, 14, 2, WOOD[2]);
    R(-4, -57, 3, 1, '#2a1c10'); R(-4, -58, 1, 3, '#2a1c10'); R(2, -57, 3, 1, '#2a1c10'); R(2, -58, 1, 3, '#2a1c10'); R(-3, -52, 6, 1, '#2a1c10'); R(-2, -51, 1, 1, '#2a1c10'); R(1, -51, 1, 1, '#2a1c10');
    R(-8, -61, 2, 3, HAY[3]); R(7, -60, 2, 3, HAY[3]); R(-2, -64, 4, 2, HAY[3]);                              // pajas
    R(-21, -34, 4, 6, HAY[3]); R(17, -34, 4, 6, HAY[3]);                                                       // manojos en las manos
  }, 18),
  target: () => bake('target', 60, 78, 30, 74, R => {
    for (const s of [-1, 1]) { R(s * 16 - 2, -34, 4, 34, WOOD[2]); R(s * 16 - 2, -34, 1, 34, WOOD[3]); R(s * 16 + 1, -34, 1, 34, WOOD[1]); R(s * 16 - 3, -2, 6, 2, WOOD[1]); }
    box(R, -20, -3, 40, 4, WOOD, 1); R(-3, -52, 6, 52, WOOD[2]);
    disc(R, 0, -44, 22, HAY[1]); disc(R, 0, -44, 21, HAY[2]); disc(R, 0, -44, 19, '#e4dcc8'); disc(R, 0, -44, 15, '#b83a3a'); disc(R, 0, -44, 11, '#e4dcc8'); disc(R, 0, -44, 7, '#b83a3a'); disc(R, 0, -44, 3, '#f0c83a');
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; R(Math.round(Math.cos(a) * 20.5), -44 + Math.round(Math.sin(a) * 20.5), 2, 2, HAY[k % 2 ? 3 : 1]); }
    R(-14, -54, 6, 3, '#f4f0e0'); R(-8, -58, 3, 2, '#f4f0e0');                                                 // brillo
  }, 22),
  anvil: () => bake('anvil', 56, 48, 28, 44, R => {
    box(R, -12, -12, 24, 12, WOOD, 2); for (let k = -10; k < 10; k += 5) R(k, -11, 1, 10, WOOD[1]); R(-12, -12, 24, 2, WOOD[4]); R(-14, -2, 28, 2, WOOD[1]);      // tocón
    R(-7, -20, 14, 8, IRON[2]); R(-7, -20, 14, 1, IRON[3]); R(-9, -22, 18, 3, IRON[2]); R(-5, -16, 10, 4, IRON[1]);                                                   // cintura y base
    R(-15, -29, 30, 7, IRON[3]); R(-15, -29, 30, 2, IRON[4]); R(-15, -24, 30, 2, IRON[1]);                                                                           // mesa
    for (let k = 0; k < 8; k++) R(15 + k, -29 + Math.floor(k / 2), 1, 7 - Math.floor(k / 2) * 1, IRON[k < 4 ? 3 : 2]);                                                     // cuerno
    R(-14, -30, 20, 1, '#ffffff'); R(-4, -27, 3, 1, IRON[1]);
  }, 24),
  furnace: () => bake('furnace', 84, 84, 42, 78, R => {
    box(R, -26, -58, 52, 58, ROCK, 2);
    for (let y = -54; y < -2; y += 9) { R(-26, y, 52, 1, ROCK[1]); for (let x = -26 + ((y / 9) & 1) * 9; x < 26; x += 18) R(x, y, 1, 9, ROCK[1]); }
    R(-26, -58, 52, 3, ROCK[4]); R(-30, -4, 60, 4, ROCK[1]); R(-30, -4, 60, 1, ROCK[3]);
    for (let x = -22; x < 22; x += 14) R(x + 3, -48, 6, 2, ROCK[3]);
    // boca con arco
    for (let y = -36; y < -4; y++) { const hw = y < -26 ? Math.round(14 * Math.sqrt(1 - ((-26 - y) / 10) ** 2)) : 14; R(-hw, y, hw * 2, 1, y > -12 ? '#3a1408' : '#140806'); }
    R(-16, -26, 2, 22, ROCK[3]); R(14, -26, 2, 22, ROCK[1]); R(-14, -37, 28, 2, ROCK[3]);
    R(-10, -8, 20, 4, '#a02e10'); R(-8, -10, 16, 3, '#d8501a');                                                  // brasas fijas
    // chimenea
    box(R, -10, -76, 20, 18, ROCK, 1); R(-12, -78, 24, 4, ROCK[3]); R(-12, -78, 24, 1, ROCK[4]); R(-6, -72, 3, 12, ROCK[0]);
    R(18, -44, 12, 3, IRON[2]); R(30, -48, 3, 14, WOOD[2]); R(32, -44, 2, 4, IRON[3]);                           // fuelle
  }, 34),
  bench: () => bake('bench', 84, 64, 42, 58, R => {
    for (const s of [-1, 1]) { box(R, s * 32 - 3, -24, 6, 24, WOOD, 1); R(s * 32 - 1, -24, 1, 24, WOOD[0]); }
    R(-32, -12, 64, 3, WOOD[1]); plank(R, -38, -32, 76, 8, 3); R(-38, -25, 76, 1, WOOD[1]);
    R(-34, -34, 2, 2, WOOD[3]);
    // herramientas: martillo, llave y planos
    R(-33, -44, 3, 12, WOOD[2]); R(-33, -44, 1, 12, WOOD[3]); box(R, -37, -48, 11, 5, IRON, 2); R(-37, -48, 4, 5, IRON[4]);
    box(R, 18, -37, 22, 5, PAPER, 2); R(21, -36, 8, 1, '#3a8a9a'); R(31, -35, 6, 1, '#3a8a9a'); R(22, -34, 5, 1, '#9a6a3a');
    R(-2, -36, 14, 4, IRON[2]); R(-2, -36, 14, 1, IRON[4]); R(9, -38, 3, 3, IRON[2]);
    box(R, -26, -39, 8, 7, GOLD, 2); R(-24, -37, 4, 3, GOLD[4]);
    // dos ejes sobre el banco para los engranajes
    R(-9, -44, 2, 12, IRON[2]); R(-9, -44, 1, 12, IRON[4]); R(9, -42, 2, 10, IRON[2]); R(9, -42, 1, 10, IRON[4]);
  }, 40),
  bedroll: () => bake('bedroll', 100, 36, 50, 22, R => {
    for (let y = -10; y < 8; y++) { const hw = Math.round(44 + (y < -4 ? (y + 4) * .6 : 0)); R(-hw, y, hw * 2, 1, CRIM[2]); }
    R(-44, -10, 88, 2, CRIM[4]); R(-44, -8, 88, 1, CRIM[3]); R(-44, 7, 88, 1, CRIM[0]);
    for (let x = -36; x < 36; x += 14) R(x, -7, 6, 14, CRIM[3]), R(x, -7, 6, 1, CRIM[4]);                          // rayas de la manta
    R(-30, -2, 52, 2, CRIM[1]);
    box(R, 26, -12, 20, 12, ramp5('#d8d0c0'), 2); R(30, -9, 12, 1, '#a89c8c');                                      // almohada
    R(-46, 0, 4, 6, CRIM[1]); R(42, 3, 4, 3, CRIM[0]);
  }, 46),
  slab: () => bake('slab', 108, 38, 54, 28, R => {
    plank(R, -48, -10, 96, 10, 3); R(-48, -1, 96, 1, WOOD[0]); R(-50, -12, 2, 14, IRON[2]); R(48, -12, 2, 14, IRON[2]);
    for (let x = -42; x < 44; x += 20) { R(x, -9, 3, 2, IRON[3]); R(x, -9, 1, 1, IRON[4]); }
    for (const [x, n] of [[-44, 3], [36, 2]]) for (let k = 0; k < n; k++) { box(R, x + k * 5, -26 + k * 0, 5, 16, IRON, 1 + (k & 1)); R(x + k * 5, -26, 5, 1, IRON[4]); }      // discos de repuesto
  }, 50),
  lantern: () => bake('lantern', 30, 46, 15, 40, R => {
    box(R, -7, -4, 14, 4, ROCK, 2); R(-5, -6, 10, 2, ROCK[3]);
    R(-6, -26, 12, 20, '#c8923a'); R(-4, -24, 8, 16, '#ffd860'); R(-2, -22, 4, 10, '#fff4b8');                     // cristal con luz
    R(-7, -27, 14, 2, IRON[2]); R(-7, -6, 14, 2, IRON[2]); R(-1, -26, 2, 20, IRON[2]); R(-7, -27, 1, 21, IRON[3]); R(6, -27, 1, 21, IRON[1]);
    R(-5, -31, 10, 4, IRON[2]); R(-3, -34, 6, 3, IRON[3]); R(-1, -37, 2, 3, IRON[2]); R(-3, -39, 6, 2, IRON[3]); R(-2, -40, 4, 1, IRON[3]);
  }, 14),
  log: () => bake('log', 50, 24, 25, 20, R => {
    R(-22, -12, 44, 12, WOOD[2]); R(-22, -12, 44, 3, WOOD[4]); R(-22, -9, 44, 1, WOOD[3]); R(-22, -1, 44, 1, WOOD[0]); R(-22, -3, 44, 2, WOOD[1]);
    for (let x = -18; x < 20; x += 9) { R(x, -10, 1, 7, WOOD[1]); R(x + 1, -6, 3, 1, WOOD[1]); }
    box(R, -26, -13, 6, 13, WOOD, 4); R(-24, -10, 2, 6, WOOD[3]); R(-25, -8, 4, 1, WOOD[2]); box(R, 20, -13, 6, 13, WOOD, 4); R(22, -10, 2, 6, WOOD[3]);
  }, 24),
  crate: () => bake('crate', 38, 38, 19, 34, R => {
    box(R, -14, -26, 28, 26, WOOD, 2); R(-14, -14, 28, 2, WOOD[1]); for (const s of [-1, 1]) R(s * 11 - 2, -26, 4, 26, WOOD[1]); R(-14, -26, 28, 2, WOOD[4]);
    for (let k = 0; k < 20; k++) { R(-12 + k, -24 + (k >> 0), 1, 1, WOOD[1]); R(11 - k, -24 + k, 1, 1, WOOD[1]); } R(-4, -11, 8, 3, WOOD[0]);
    for (const [x, y] of [[-12, -24], [10, -24], [-12, -4], [10, -4]]) R(x, y, 2, 2, IRON[3]);
  }, 20),
  barrel: () => bake('barrel', 34, 46, 17, 42, R => {
    for (let y = -34; y < 0; y++) { const hw = Math.round(11 + 2 * Math.sin((y + 34) / 34 * Math.PI)); R(-hw, y, hw * 2, 1, WOOD[2]); R(-hw, y, 3, 1, WOOD[4]); R(-hw + 3, y, 3, 1, WOOD[3]); R(hw - 5, y, 5, 1, WOOD[1]); R(hw - 2, y, 2, 1, WOOD[0]); }
    for (const y of [-31, -22, -11, -2]) { const hw = Math.round(11 + 2 * Math.sin((y + 34) / 34 * Math.PI)); R(-hw, y, hw * 2, 2, IRON[2]); R(-hw, y, hw * 2, 1, IRON[3]); }
    R(-11, -36, 22, 3, WOOD[3]); R(-9, -37, 18, 2, WOOD[4]);
  }, 18),
  hay: () => bake('hay', 54, 34, 27, 30, R => {
    box(R, -22, -22, 44, 22, HAY, 2); for (let y = -19; y < -2; y += 4) for (let x = -20 + (y & 2); x < 20; x += 7) R(x, y, 4, 1, HAY[y & 1 ? 1 : 3]);
    R(-22, -13, 44, 2, WOOD[2]); R(-22, -13, 44, 1, WOOD[3]); R(-22, -5, 44, 2, WOOD[2]); R(-3, -24, 2, 3, HAY[3]); R(8, -25, 2, 4, HAY[4]); R(-14, -24, 3, 3, HAY[3]);
  }, 26),
  sack: () => bake('sack', 26, 28, 13, 26, R => {
    for (let y = -20; y < 0; y++) { const hw = Math.round(9 + 1.5 * Math.sin((y + 20) / 20 * Math.PI)); R(-hw, y, hw * 2, 1, HAY[3]); R(-hw, y, 3, 1, HAY[4]); R(hw - 3, y, 3, 1, HAY[1]); }
    R(-5, -22, 10, 4, HAY[2]); R(-6, -20, 12, 2, WOOD[2]); R(-4, -23, 3, 2, HAY[3]); R(3, -23, 3, 2, HAY[3]); R(-3, -12, 6, 1, HAY[1]);
  }, 12),
};
const logAt = (g, x, y) => blit(g, SPR.log(), x, y);

// ---- Llamas y halos (se hornean en pocos fotogramas) -----------------------------------------------------------
const flames = new Map();
// flameSpr(ancho, alto, fotograma): llama de 4 capas con balanceo; ancla abajo en el centro
function flameSpr(W, H, f) {
  const key = W + 'x' + H + '|' + f; let c = flames.get(key);
  if (c) return c;
  c = mk(W + 6, H + 4); const g = c.getContext('2d'), cx = (W + 6) >> 1;
  [[1, 0], [.76, 1], [.5, 2], [.26, 3]].forEach(([k, ci], li) => {
    const hh = Math.round(H * (1 - li * .2)), ww = W * k / 2;
    for (let r = 0; r < hh; r++) {
      const t = r / hh, hw = Math.max(0, Math.round(ww * Math.sin(Math.PI * Math.pow(1 - t, .62)) * (li ? .98 : 1))), sway = Math.round(Math.sin(t * 3.2 + f * 1.7) * (1.2 + li * .2) * t);
      if (hw > 0 || r === hh - 1) { g.fillStyle = FLAME[ci + (li && t < .25 ? 0 : 0)]; g.fillRect(cx - hw + sway, H + 4 - 1 - r - 1, Math.max(1, hw * 2), 1); }
    }
  });
  g.fillStyle = FLAME[4]; g.fillRect(cx - 1, H + 4 - 5, 2, 2);
  flames.set(key, c); return c;
}
const halos = new Map();
function haloSpr(rx, ry, col) {
  const key = rx + '|' + ry + '|' + col; let c = halos.get(key);
  if (c) return c;
  c = mk(rx * 2 + 2, ry * 2 + 2); const g = c.getContext('2d'); g.fillStyle = col;
  [[1, .05], [.74, .06], [.5, .07], [.28, .08]].forEach(([k, a]) => { g.globalAlpha = a; for (let y = -Math.round(ry * k); y <= Math.round(ry * k); y++) { const hw = Math.round(rx * k * Math.sqrt(1 - (y / (ry * k)) ** 2)); g.fillRect(rx + 1 - hw, ry + 1 + y, hw * 2, 1); } });
  halos.set(key, c); return c;
}
const glow = (g, x, y, rx, ry, col, a) => { g.globalAlpha = a; g.drawImage(haloSpr(rx, ry, col), Math.round(x - rx - 1), Math.round(y - ry - 1)); g.globalAlpha = 1; };
const sq = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
function flame(g, x, y, now, seed, rm, W = 18, H = 26) { g.drawImage(flameSpr(W, H, rm ? 0 : Math.floor(now / 110 + seed) % 4), Math.round(x - ((W + 6) >> 1)), Math.round(y - H - 3)); }

// ---- Fondo: suelo, sendero, empalizada, puerta y rincones (se hornea con la escena) -----------------------------------
const EARTH = ['#15100a', '#1e1710', '#2a2016', '#382c1e', '#483a28'].map(rgb), GRASS = ['#101a0e', '#18260f', '#223418', '#2f4522', '#40582e'].map(rgb), PATH = ['#2a2018', '#3e3024', '#58442f', '#745c42', '#927858'].map(rgb);
const roadY = x => Math.round(FENCE_Y + 36 + ((x - GATE_X) / 480) ** 2 * 12);      // camino que corre paralelo a la empalizada
function campGround(g) {
  const Y0 = FENCE_Y - 2, H = AH - Y0, img = g.createImageData(AW, H), d = img.data, bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const vn = (x, y, s, k) => { const gx = Math.floor(x / k), gy = Math.floor(y / k), fx = (x / k) - gx, fy = (y / k) - gy, a = hashN(gx, gy, s), b = hashN(gx + 1, gy, s), c = hashN(gx, gy + 1, s), e = hashN(gx + 1, gy + 1, s); return (a + (b - a) * fx) * (1 - fy) + (c + (e - c) * fx) * fy; };
  for (let j = 0; j < H; j++) {
    const y = Y0 + j;
    for (let x = 0; x < AW; x++) {
      const n1 = vn(x, y, 3, 22), n2 = vn(x, y, 5, 7), v = hashN(x, y, 1);
      let pal = n1 + (n2 - .5) * .3 > .56 ? GRASS : EARTH, t = pal === GRASS ? (n2 > .62 ? 3 : n2 > .4 ? 2 : 1) : (n2 > .66 ? 3 : n2 > .3 ? 2 : 1);
      if (v > .9) t++; else if (v < .07) t--;
      // sendero desde la puerta, que se abre en un camino paralelo a la empalizada; el puesto central (bajo la puerta) queda fuera
      const dRoad = Math.abs(y - roadY(x)), roadHw = 12 + 2 * Math.sin(x / 55) , stem = y < roadY(GATE_X) + 10 ? Math.abs(x - GATE_X) < 30 + (y - FENCE_Y) * .35 : false;
      let onPath = (dRoad < roadHw && x > 30 && x < AW - 30) || stem;
      const edge = onPath && (stem ? true : dRoad > roadHw - 2) ? hashN(x, y, 8) > .55 : false;
      if (onPath) { pal = PATH; t = n2 > .6 ? 3 : n2 > .32 ? 2 : 1; if (v > .93) t++; else if (v < .08) t--; if (edge) t--; }
      // la tierra pisada bajo cada puesto
      for (const [sx, sy] of CAMP_SLOTS) { const q = ((x - sx) / 92) ** 2 + ((y - sy - 2) / 20) ** 2; if (q < 1 && !onPath && hashN(x, y, 12) > .12 + q * .85) { pal = EARTH; t = Math.max(t, n2 > .5 ? 3 : 2); } }
      t = Math.max(0, Math.min(4, t));
      const dark = .78 + .22 * (1 - (y - Y0) / H * .5), q = Math.floor(dark * 6 + (bayer[y & 3][x & 3] + .5) / 16) / 6, c = pal[t], p = (j * AW + x) * 4;
      d[p] = c[0] * q; d[p + 1] = c[1] * q; d[p + 2] = c[2] * q; d[p + 3] = 255;
    }
  }
  const t = mk(AW, H); t.getContext('2d').putImageData(img, 0, 0); g.drawImage(t, 0, Y0);
  // matas de hierba, flores, hongos y piedras sueltas
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  for (let i = 0; i < 160; i++) {
    const x = 6 + hashN(i, 1, 7) * (AW - 12), y = FENCE_Y + 8 + hashN(i, 2, 7) * (AH - FENCE_Y - 12);
    if (Math.abs(y - roadY(x)) < 14 || (Math.abs(x - GATE_X) < 40 && y < roadY(GATE_X) + 12)) continue;
    const k = i % 8;
    if (k < 4) { R(x, y, 1, 4, '#34482a'); R(x - 2, y + 1, 1, 3, '#283a20'); R(x + 2, y + 1, 1, 3, '#40582e'); R(x - 1, y - 1, 1, 1, '#4a6234'); }
    else if (k < 6) { R(x - 1, y + 1, 5, 3, ROCK[2]); R(x - 1, y + 1, 5, 1, ROCK[4]); R(x, y + 4, 4, 1, '#0a0810'); R(x - 2, y + 2, 1, 2, '#0a0810'); R(x + 4, y + 2, 1, 2, '#0a0810'); R(x - 1, y, 5, 1, '#0a0810'); }
    else if (k === 6) { R(x, y, 1, 4, '#34482a'); R(x - 1, y - 2, 3, 3, hashN(i, 3) > .5 ? '#b84a6a' : '#d8c050'); R(x, y - 1, 1, 1, '#f4e8c0'); }
    else { R(x, y + 2, 2, 3, '#d8cfb0'); R(x - 2, y, 6, 3, '#8a3a3a'); R(x - 1, y, 3, 1, '#b85a5a'); R(x, y + 1, 1, 1, '#e8e0d0'); }
  }
  for (let i = 0; i < 26; i++) { const x = 40 + hashN(i, 5, 2) * (AW - 80), y = roadY(x) + (hashN(i, 6, 2) - .5) * 26, w = 2 + (i % 3); R(x, y, w, 1, '#8a7860'); R(x, y + 1, w, 1, '#1a120c'); }  // guijarros del camino
  for (const [x, y] of [[300, roadY(300) + 4], [660, roadY(660) + 4], [GATE_X - 4, roadY(GATE_X) + 6]]) { R(x, y, 7, 1, '#2a1e14'); R(x + 9, y + 1, 5, 1, '#2a1e14'); }     // rodadas
}
function campFence(g) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  g.fillStyle = 'rgba(0,0,0,.34)'; g.fillRect(0, FENCE_Y, AW, 3); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, FENCE_Y + 3, AW, 4);            // sombra de la empalizada
  // postes de la empalizada (troncos redondeados con punta), con tres tonos y nudos
  const rails = [FENCE_Y - 30, FENCE_Y - 12];
  const post = (x, hgt, i) => {
    const top = FENCE_Y - hgt, w = 9, cx = x + 4;
    for (let r = 0; r < 8; r++) {                                                                       // punta: 1, 3, 3, 5, 5, 7, 7, 9 px
      const half = Math.floor((r + 1) / 2);
      R(cx - half - 1, top + r, 1, 1, OUT); R(cx + half + 1, top + r, 1, 1, OUT);
      R(cx - half, top + r, half * 2 + 1, 1, WOOD[2]); R(cx - half, top + r, Math.min(2, half + 1), 1, WOOD[3]); if (half > 1) R(cx + half, top + r, 1, 1, WOOD[1]);
    }
    R(cx, top - 1, 1, 1, OUT); R(cx - 1, top, 1, 1, OUT); R(cx, top, 1, 1, WOOD[4]);
    for (let y = top + 8; y < FENCE_Y; y++) { R(x, y, w, 1, WOOD[2]); R(x, y, 3, 1, WOOD[3]); R(x + 3, y, 1, 1, WOOD[4]); R(x + w - 3, y, 3, 1, WOOD[1]); R(x + w - 1, y, 1, 1, WOOD[0]); R(x - 1, y, 1, 1, OUT); R(x + w, y, 1, 1, OUT); }
    if (hashN(i, 9, 3) > .55) { const ky = top + 14 + Math.floor(hashN(i, 8) * 14); R(x + 3, ky, 2, 3, WOOD[1]); R(x + 4, ky + 1, 1, 1, WOOD[0]); }
    R(x, FENCE_Y - 1, w, 1, WOOD[0]); R(x - 1, FENCE_Y, w + 2, 1, OUT);
  };
  for (let x = 0, i = 0; x < AW; x += 10, i++) { if (Math.abs(x + 4 - GATE_X) < 58) continue; post(x, 34 + Math.floor(hashN(x, 5) * 7), i); }
  for (const y of rails) for (const [x0, x1] of [[0, GATE_X - 54], [GATE_X + 54, AW]]) { R(x0, y, x1 - x0, 4, WOOD[1]); R(x0, y, x1 - x0, 1, WOOD[3]); R(x0, y + 3, x1 - x0, 1, WOOD[0]); R(x0, y - 1, x1 - x0, 1, OUT); R(x0, y + 4, x1 - x0, 1, OUT); }   // los travesaños no cruzan el vano
  for (const y of rails) for (let x = 5; x < AW; x += 40) { if (Math.abs(x - GATE_X) < 60) continue; R(x, y - 1, 3, 6, '#8a7a5a'); R(x, y - 1, 1, 6, '#b8a880'); }          // ataduras de cuerda
  // puerta: dos postes altos con capiteles, viga, estandartes y farolillos de hierro (la llama se anima en drawCampLive)
  const gx = GATE_X;
  for (const s of [-1, 1]) {
    const x = s < 0 ? gx - 56 : gx + 46, top = FENCE_Y - 70;
    box2(R, x, top, 10, 72, WOOD); R(x + 3, top, 1, 72, WOOD[4]);
    for (let y = top + 10; y < FENCE_Y; y += 12) { R(x, y, 10, 1, WOOD[1]); }
    R(x - 3, top - 4, 16, 6, WOOD[3]); R(x - 3, top - 4, 16, 1, WOOD[4]); R(x - 3, top + 1, 16, 1, WOOD[0]); R(x - 4, top - 5, 18, 1, OUT); R(x - 4, top - 5, 1, 7, OUT); R(x + 13, top - 5, 1, 7, OUT);
    R(x - 3, FENCE_Y - 8, 16, 8, ROCK[2]); R(x - 3, FENCE_Y - 8, 16, 1, ROCK[4]); R(x - 3, FENCE_Y - 1, 16, 1, ROCK[0]); R(x - 4, FENCE_Y - 9, 18, 1, OUT);            // zócalo de piedra
    // farolillo: jaula de hierro (la luz es viva)
    const lx = x + 5, ly = top - 6;
    R(lx - 6, ly - 14, 12, 2, IRON[3]); R(lx - 5, ly - 2, 10, 3, IRON[2]); R(lx - 6, ly - 14, 1, 14, IRON[3]); R(lx + 5, ly - 14, 1, 14, IRON[1]); R(lx - 3, ly - 17, 6, 3, IRON[3]); R(lx - 1, ly - 20, 2, 3, IRON[2]);
    R(lx - 6, ly - 15, 12, 1, OUT); R(lx - 7, ly - 15, 1, 17, OUT); R(lx + 6, ly - 15, 1, 17, OUT); R(lx - 6, ly + 1, 12, 1, OUT);
    R(lx - 5, ly - 12, 10, 10, '#201008');
    // estandarte por fuera
    const bx = s < 0 ? x - 20 : x + 16;
    R(bx - 1, top + 8, 18, 3, WOOD[2]); R(bx - 1, top + 8, 18, 1, WOOD[4]);
    for (let y = top + 11; y < top + 58; y++) { const nt = y > top + 48 ? Math.floor((y - top - 48) * .8) : 0; for (let xx = 0; xx < 14; xx++) { if (xx > 6 - nt && xx < 8 + nt && nt) continue; R(bx + 1 + xx, y, 1, 1, xx < 2 ? CRIM[3] : xx > 11 ? CRIM[1] : (xx + (y >> 2)) % 6 === 0 ? CRIM[1] : CRIM[2]); } }
    R(bx + 1, top + 12, 14, 2, GOLD[2]); R(bx + 1, top + 12, 14, 1, GOLD[3]);
    for (let r = -6; r <= 6; r++) { const w = Math.round(6 - Math.abs(r) * .9); R(bx + 8 - w, top + 30 + r, w * 2, 1, GOLD[r < 0 ? 3 : 2]); }
    R(bx + 7, top + 22, 2, 4, GOLD[3]); R(bx + 7, top + 36, 2, 4, GOLD[2]);
    R(bx, top + 11, 1, 47, OUT); R(bx + 15, top + 11, 1, 47, OUT);
  }
  R(gx - 62, FENCE_Y - 62, 124, 8, WOOD[2]); R(gx - 62, FENCE_Y - 62, 124, 2, WOOD[4]); R(gx - 62, FENCE_Y - 61, 124, 1, WOOD[3]); R(gx - 62, FENCE_Y - 55, 124, 1, WOOD[0]); R(gx - 63, FENCE_Y - 63, 126, 1, OUT); R(gx - 63, FENCE_Y - 54, 126, 1, OUT);
  for (let i = 0; i < 6; i++) R(gx - 50 + i * 20, FENCE_Y - 54, 4, 5, WOOD[1]);                                                                                           // clavijas
  // letrero con una luna creciente colgando de la viga
  R(gx - 14, FENCE_Y - 54, 2, 8, IRON[2]); R(gx + 12, FENCE_Y - 54, 2, 8, IRON[2]);
  R(gx - 16, FENCE_Y - 47, 32, 12, WOOD[2]); R(gx - 16, FENCE_Y - 47, 32, 1, WOOD[4]); R(gx - 16, FENCE_Y - 37, 32, 2, WOOD[0]); R(gx - 17, FENCE_Y - 48, 34, 1, OUT); R(gx - 17, FENCE_Y - 35, 34, 1, OUT); R(gx - 17, FENCE_Y - 48, 1, 14, OUT); R(gx + 16, FENCE_Y - 48, 1, 14, OUT);
  for (let y = -4; y <= 4; y++) for (let x = -5; x <= 5; x++) { const dd = Math.hypot(x, y), d2 = Math.hypot(x - 2, y); if (dd <= 4.6 && d2 > 3.8) R(gx + x, FENCE_Y - 42 + y, 1, 1, GOLD[3]); }
  // umbral de piedra
  for (let x = gx - 44; x < gx + 44; x += 11) { R(x, FENCE_Y - 2, 10, 9, ROCK[2 + (hashN(x, 2) > .6 ? 1 : 0)]); R(x, FENCE_Y - 2, 10, 1, ROCK[4]); R(x, FENCE_Y + 6, 10, 1, ROCK[0]); R(x + 9, FENCE_Y - 2, 1, 9, ROCK[1]); }
  R(gx - 44, FENCE_Y - 3, 88, 1, OUT);
}
function box2(R, x, y, w, h, r) { R(x, y, w, h, r[2]); R(x, y, 2, h, r[3]); R(x + w - 3, y, 3, h, r[1]); R(x + w - 1, y, 1, h, r[0]); R(x - 1, y, 1, h, OUT); R(x + w, y, 1, h, OUT); }
function campBackground(g) {
  g.save(); g.imageSmoothingEnabled = false;
  for (const k of Object.keys(SPR)) SPR[k]();                       // hornea todos los sprites ahora y no a mitad de una animación
  campGround(g);
  // rincones: barriles, cajas, sacos y pacas
  const q = (spr, x, y) => g.drawImage(spr.c, Math.round(x - spr.ax), Math.round(y - spr.ay));
  const left = [[SPR.barrel, 26, FENCE_Y + 30], [SPR.crate, 58, FENCE_Y + 34], [SPR.sack, 34, FENCE_Y + 64], [SPR.barrel, 74, FENCE_Y + 88], [SPR.hay, 36, FENCE_Y + 100]];
  const right = [[SPR.barrel, AW - 24, FENCE_Y + 32], [SPR.crate, AW - 56, FENCE_Y + 36], [SPR.barrel, AW - 40, FENCE_Y + 74], [SPR.sack, AW - 70, FENCE_Y + 90], [SPR.hay, AW - 36, FENCE_Y + 104]];
  for (const [s, x, y] of [...left, ...right].sort((a, b) => a[2] - b[2])) q(s(), x, y);
  campFence(g);
  g.restore();
}
// Farolillos de la puerta (capa viva): halo escalonado y llama de 4 fotogramas dentro de la jaula
function campLive(g, now) {
  const rm = reduced();
  for (const s of [-1, 1]) {
    const x = (s < 0 ? GATE_X - 56 : GATE_X + 46) + 5, y = FENCE_Y - 76, f = rm ? 0 : Math.floor(now / 120 + s) % 4;
    glow(g, x, y - 6, 58, 44, '#ff9a2a', rm ? .9 : .8 + .2 * hashN(Math.floor(now / 240), s, 3));
    g.drawImage(flameSpr(8, 10, f), Math.round(x - 7), Math.round(y - 14));
  }
}

function drawItem(g, kind, x, y, now, flip, dir) {
  const R = (a, b, w, h, c) => sq(g, x + a, y + b, w, h, c);
  if (kind === 'leg') {                                                                                    // muslo asado con hueso
    const d = dir; const X = (a, w) => (d > 0 ? a : -a - w);
    R(X(-6, 9), -4, 9, 7, MEAT[2]); R(X(-6, 9), -4, 9, 2, MEAT[4]); R(X(-6, 9), 2, 9, 1, MEAT[0]); R(X(-5, 2), -1, 2, 1, MEAT[1]);
    R(X(3, 6), -1, 6, 2, '#e8e0d0'); R(X(8, 3), -3, 3, 2, '#f4f0e4'); R(X(8, 3), 1, 3, 2, '#f4f0e4'); R(X(-7, 1), -3, 1, 5, OUT); R(X(-6, 9), -5, 9, 1, OUT);
  } else if (kind === 'mug') {                                                                             // jarra con espuma
    const d = dir, X = (a, w) => (d > 0 ? a : -a - w);
    R(X(-4, 8), -4, 8, 9, GOLD[2]); R(X(-4, 2), -4, 2, 9, GOLD[4]); R(X(2, 2), -4, 2, 9, GOLD[1]); R(X(-4, 8), -5, 8, 2, '#f4f0e4'); R(X(-2, 4), -6, 4, 1, '#ffffff');
    R(X(4, 3), -2, 3, 1, GOLD[3]); R(X(6, 1), -2, 1, 5, GOLD[3]); R(X(4, 3), 2, 3, 1, GOLD[3]); R(X(-5, 1), -4, 1, 9, OUT); R(X(4, 1), 5, 1, 1, OUT); R(X(-4, 8), 5, 8, 1, OUT);
  } else if (kind === 'book') {                                                                            // libro abierto (la página cambia con `flip`)
    R(-10, -5, 20, 12, '#2a3a7a'); R(-10, -5, 20, 1, '#4a5aa0'); R(-10, 6, 20, 1, '#141e48');
    R(-9, -4, 9, 9, '#f0ead0'); R(1, -4, 9, 9, flip ? '#fff8e0' : '#f0ead0'); R(-1, -5, 2, 11, '#141e48');
    for (let k = 0; k < 4; k++) { R(-8, -2 + k * 2, 6, 1, '#8a7a5a'); R(3, -2 + k * 2, flip ? 4 : 6, 1, '#8a7a5a'); }
    if (flip) { R(3, -4, 6, 1, '#d8d0b0'); }
    R(-11, -6, 22, 1, OUT); R(-11, 7, 22, 1, OUT); R(-11, -6, 1, 14, OUT); R(10, -6, 1, 14, OUT);
  } else if (kind === 'stone') {                                                                           // barra con discos
    R(-24, -1, 48, 2, IRON[3]); R(-24, -1, 48, 1, IRON[4]);
    for (const s of [-1, 1]) { const a = s * 18; R(a - 3, -11, 6, 22, IRON[2]); R(a - 3, -11, 2, 22, IRON[4]); R(a + 2, -11, 1, 22, IRON[0]); R(a + (s < 0 ? -8 : 4), -7, 4, 14, IRON[1]); R(a + (s < 0 ? -8 : 4), -7, 1, 14, IRON[3]); R(a - 4, -12, 8, 1, OUT); R(a - 4, 11, 8, 1, OUT); }
    R(-5, -3, 10, 6, WOOD[2]); R(-5, -3, 10, 1, WOOD[4]);
  }
}
// ---- Objetos y efectos de cada actividad -----------------------------------------------------------------------------------
function campfire(g, bx, by, now, c, rm, pot) {
  glow(g, bx, by - 14, 70, 28, '#ff9a2a', rm ? .8 : .72 + .12 * Math.sin(now / 170 + c.seed));
  blit(g, SPR.firepit(), bx, by);
  flame(g, bx, by - 6, now, c.seed, rm, 20, 28);
  if (!rm) {
    for (let k = 0; k < 3; k++) { const q = ((now / 70 + k * 30 + c.seed * 7) % 90) / 90; g.globalAlpha = (1 - q) * .5; sq(g, bx - 3 + Math.sin(q * 6 + k) * 4, by - 66 - q * 30, 4, 4, '#c8c8d4'); g.globalAlpha = 1; }   // humo del puchero
    for (let k = 0; k < 3; k++) { const q = ((now / 50 + k * 30 + c.seed * 3) % 90) / 90; g.globalAlpha = 1 - q; sq(g, bx - 6 + k * 6 + Math.sin(q * 9) * 3, by - 22 - q * 24, 2, 2, k % 2 ? '#ffb02a' : '#ffd860'); g.globalAlpha = 1; }
  }
}
SPR.firepit = () => bake('firepit', 56, 74, 28, 68, R => {
  for (const [x, y] of [[-16, -4], [-9, -7], [0, -8], [9, -7], [16, -4], [-18, 1], [-10, 3], [0, 4], [10, 3], [18, 1]]) { box(R, x - 4, y - 1, 8, 5, ROCK, 2 + (hashN(x, y) > .5 ? 1 : 0)); }
  box(R, -13, -4, 26, 4, WOOD, 1); box(R, -9, -8, 18, 4, WOOD, 2); R(-13, -3, 3, 2, WOOD[4]); R(10, -3, 3, 2, WOOD[4]); R(-3, -3, 6, 1, '#a02e10');
  R(-3, -66, 6, 6, IRON[2]); R(-2, -67, 4, 1, IRON[4]);                                                          // cima del trípode
  for (let k = 0; k <= 62; k++) { const x = Math.round(14 * (1 - k / 62)); R(-x - 1, -k - 3, 3, 1, WOOD[k & 4 ? 2 : 1]); R(x - 1, -k - 3, 3, 1, WOOD[k & 4 ? 2 : 1]); R(-x - 1, -k - 3, 1, 1, WOOD[3]); R(x - 1, -k - 3, 1, 1, WOOD[3]); }
  for (let y = -60; y < -42; y += 3) R(0, y, 1, 2, IRON[3]);                                                      // cadena
  disc(R, 0, -34, 11, IRON[2]); R(-11, -46, 22, 2, IRON[3]); R(-12, -48, 24, 3, IRON[2]); R(-12, -48, 24, 1, IRON[4]); R(-9, -44, 18, 2, '#5a3a1a'); R(-9, -44, 18, 1, '#8a6a30');   // olla y su caldo
  for (let y = -44; y < -24; y++) { const hw = Math.floor(Math.sqrt(121 - (y + 34) ** 2)); R(hw - 5, y, 5, 1, IRON[1]); R(-hw, y, 3, 1, IRON[4]); }
  R(-11, -40, 2, 2, IRON[4]);
}, 26);
function constell(g, c, now, rm) {                              // astrales: constelación entre los tres héroes
  const pts = c.h.map(h => [h.x, h.y - 60]);
  g.strokeStyle = '#fff2c0'; g.globalAlpha = .45; g.lineWidth = 1; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[2][0], pts[2][1] - 8); g.lineTo(pts[1][0], pts[1][1]); g.stroke(); g.globalAlpha = 1;
  for (const [x, y] of [pts[0], [pts[2][0], pts[2][1] - 8], pts[1]]) { sq(g, x - 2, y, 5, 1, '#fff2c0'); sq(g, x, y - 2, 1, 5, '#fff2c0'); sq(g, x, y, 1, 1, '#ffffff'); }
  if (!rm) for (let k = 0; k < 5; k++) { const a = now / 1400 + k * 1.26; sq(g, c.view.cx + Math.cos(a) * 52, c.h[2].y - 50 + Math.sin(a) * 14, 3, 3, k % 2 ? '#fff2c0' : '#bfa8ff'); }
}
function zzz(g, x, y, now) {
  for (let k = 0; k < 3; k++) {
    const q = (now / 2600 + k / 3) % 1, zx = Math.round(x + q * 14 + k * 5), zy = Math.round(y - q * 30), c = k % 2 ? '#bcd8ff' : '#ffffff', s = 5 + k;
    g.globalAlpha = Math.sin(q * Math.PI);
    sq(g, zx, zy, s, 1, c); for (let i = 1; i < s - 1; i++) sq(g, zx + s - 1 - i, zy + i, 1, 1, c); sq(g, zx, zy + s - 1, s, 1, c);
  }
  g.globalAlpha = 1;
}
function gear(g, x, y, r, teeth, ang, col, dark) {
  for (let yy = -r; yy <= r; yy++) { const hw = Math.floor(Math.sqrt(r * r - yy * yy + .25)); sq(g, x - hw, y + yy, hw * 2 + 1, 1, col[2]); }
  for (let yy = -r; yy <= -r + 2; yy++) { const hw = Math.floor(Math.sqrt(r * r - yy * yy + .25)); sq(g, x - hw, y + yy, Math.max(1, hw), 1, col[3]); }
  for (let k = 0; k < teeth; k++) { const a = ang + k * Math.PI * 2 / teeth, tx = Math.round(x + Math.cos(a) * (r + 1.5)), ty = Math.round(y + Math.sin(a) * (r + 1.5)); sq(g, tx - 1, ty - 1, 3, 3, col[2]); sq(g, tx - 1, ty - 1, 1, 1, col[3]); sq(g, tx + 1, ty + 1, 1, 1, col[1]); }
  for (let yy = -2; yy <= 2; yy++) { const hw = Math.floor(Math.sqrt(4 - yy * yy + .25)); sq(g, x - hw, y + yy, hw * 2 + 1, 1, dark); }
  sq(g, x - 1, y - 1, 2, 2, col[4]);
}
const TEAL = ramp5('#2a9a9a'), COPPER = ramp5('#b8783a');
// Parte estática de la actividad (queda bajo y entre los héroes por la ordenación en profundidad)
function propArt(g, kind, c, bx, by, now, rm) {
  switch (kind) {
    case 'fire': campfire(g, bx, by, now, c, rm, true); break;
    case 'table': blit(g, SPR.table(), bx, by); break;
    case 'dummy': {
      const q = ((now + c.h[0].sd) % 900) / 900, wob = rm || q < .25 || q > .6 ? 0 : Math.sin((q - .25) / .35 * Math.PI * 3) * (1 - (q - .25) / .35) * .1;
      g.save(); g.translate(Math.round(bx + 54), Math.round(by)); g.rotate(wob); blit(g, SPR.dummy(), 0, 0); g.restore(); break;
    }
    case 'archery': blit(g, SPR.target(), bx + 68, by - 2); break;
    case 'sleep': blit(g, SPR.bedroll(), bx, by - 10); break;
    case 'forge': {
      blit(g, SPR.anvil(), bx + 12, by); blit(g, SPR.furnace(), bx + 62, by);
      const fl = rm ? 1 : .8 + .2 * Math.sin(now / 160);
      glow(g, bx + 62, by - 16, 54, 36, '#ff6a1a', fl);
      sq(g, bx + 56, by - 28, 12, 10, rm ? '#ff9a2a' : Math.floor(now / 120) % 2 ? '#ffb02a' : '#ff8a1a'); sq(g, bx + 58, by - 26, 8, 6, '#ffd860'); sq(g, bx + 61, by - 25, 3, 3, '#fff4b8');
      if (!rm) { const q = ((now / 60 + c.seed * 9) % 100) / 100; g.globalAlpha = (1 - q) * .45; sq(g, bx + 61 + Math.sin(q * 7) * 3, by - 82 - q * 34, 5, 5, '#9a96a8'); g.globalAlpha = 1; }
      break;
    }
    case 'read': {
      blit(g, SPR.lantern(), bx, by + 4);
      glow(g, bx, by - 20, 70, 40, '#ffd060', rm ? .9 : .8 + .15 * Math.sin(now / 400)); break;
    }
    case 'lift': blit(g, SPR.slab(), bx, by + 6); break;
    case 'gears': {
      blit(g, SPR.bench(), bx, by);
      const ang = rm ? 0 : now / 500;
      gear(g, bx - 8, by - 50, 9, 8, ang, TEAL, '#0c2a30'); gear(g, bx + 10, by - 45, 7, 6, -ang * 1.4 + .5, COPPER, '#2a1a0c'); break;
    }
  }
}
// Efectos por encima de los héroes: proyectiles, chispas, orbes, aura, ronquidos...
function overlay(g, kind, c, bx, by, now, rm) {
  const [h0, h1, h2] = c.h;
  switch (kind) {
    case 'dummy': {
      const q = ((now + h0.sd) % 900) / 900;
      if (!rm && q > .18 && q < .45) { const k = (q - .18) / .27; g.globalAlpha = 1 - k; for (let i = 0; i < 6; i++) sq(g, bx + 48 + i * 3 - k * 6, by - 46 + Math.sin(i * 2 + k * 5) * 8 - k * 10, 3, 2, i % 2 ? '#fff' : '#ffe08a'); g.globalAlpha = 1; }
      break;
    }
    case 'archery': {
      const P = 2000, n = Math.floor((now - c.act.t0) / P), q = ((now - c.act.t0) % P) / P;
      const tx = bx + 64, ty = by - 44 + (n % 3 - 1) * 4;
      for (let k = Math.max(0, n - 4); k < n; k++) { const yy = by - 44 + ((k % 5) - 2) * 7, xx = bx + 62 - (k % 2) * 2; sq(g, xx - 12, yy, 13, 1, '#e8dcc0'); sq(g, xx - 14, yy - 1, 3, 3, '#a8441e'); sq(g, xx - 13, yy - 2, 1, 1, '#d8c8a0'); sq(g, xx - 13, yy + 2, 1, 1, '#d8c8a0'); }   // flechas clavadas
      if (!rm && q > .22 && q < .42) {
        const k = (q - .22) / .2, sx = h0.x + 16, sy = h0.y - 38, ex = tx, ey = ty, x = sx + (ex - sx) * k, y = sy + (ey - sy) * k - Math.sin(k * Math.PI) * 4;
        const arrow = c.race.cls[0].hit[0] === 'jav' || c.race.id === 'elfos';
        if (arrow) { sq(g, x - 10, y, 13, 1, '#e8dcc0'); sq(g, x + 3, y - 1, 2, 3, '#ffffff'); sq(g, x - 12, y - 1, 3, 3, '#a8441e'); }
        else { const col = c.race.cls[1].hit[1]; for (let t = 0; t < 4; t++) { g.globalAlpha = 1 - t * .22; sq(g, x - (ex - sx) / 60 * t * 4, y - (ey - sy) / 60 * t * 4, 4, 4, col); } g.globalAlpha = 1; sq(g, x - 1, y - 1, 5, 5, '#ffffff'); }
      }
      break;
    }
    case 'meditate': {
      glow(g, bx, by - 4, 80, 26, c.race.color, rm ? .7 : .6 + .15 * Math.sin(now / 700));
      c.h.forEach((h, i) => { if (h.moving) return; const f = rm ? 0 : Math.floor(now / 700 + i) % 2; for (let k = 0; k < 2; k++) { const a = rm ? k * 3.1 : now / 600 + k * 3.14 + i; sq(g, h.x + Math.cos(a) * 18 - 1, h.y - 56 + Math.sin(a) * 6 - f * 2, 3, 3, k ? '#ffffff' : c.race.color); } });
      if (c.race.id === 'astrales') constell(g, c, now, rm);
      break;
    }
    case 'spells': {
      [h0, h1].forEach((h, i) => {
        const P = 2400, q = ((now + h.sd) % P) / P, col = c.race.cls[i].hit[1], s = i ? -1 : 1;
        if (rm) { sq(g, h.x + s * 14, h.y - 44, 4, 4, col); return; }
        if (q > .3) { const k = (q - .3) / .7; g.globalAlpha = 1 - k * k; sq(g, h.x + s * 16 + Math.sin(k * 6) * 4, h.y - 36 - k * 46, 5, 5, col); sq(g, h.x + s * 16 + Math.sin(k * 6) * 4 + 1, h.y - 38 - k * 46, 2, 2, '#ffffff'); g.globalAlpha = 1; }
        else if (q > .1) sq(g, h.x + s * 14, h.y - 36, 3, 3, col);
      });
      const a = rm ? 0 : now / 500;                             // orbe que flota entre ellos
      glow(g, bx, by - 56, 24, 20, c.race.color, .8); sq(g, bx - 2, by - 58 + (rm ? 0 : Math.round(Math.sin(a) * 2)), 5, 5, '#ffffff'); sq(g, bx + Math.cos(a) * 12, by - 56 + Math.sin(a) * 6, 3, 3, c.race.color);
      break;
    }
    case 'sleep': {
      glow(g, bx, by + 12, 34, 14, '#ff9a2a', .8); blit(g, SPR.mini(), bx, by + 12); flame(g, bx, by + 10, now, c.seed, true, 9, 13);
      if (!rm) zzz(g, h2.x + 14, h2.y - 28, now); else { sq(g, h2.x + 16, h2.y - 40, 7, 1, '#fff'); sq(g, h2.x + 20, h2.y - 39, 2, 1, '#fff'); sq(g, h2.x + 17, h2.y - 38, 2, 1, '#fff'); sq(g, h2.x + 15, h2.y - 37, 8, 1, '#fff'); }
      break;
    }
    case 'spar': {
      const q = ((now + h0.sd) % 1400) / 1400;
      if (!rm) for (const [a, b] of [[.18, .3], [.68, .8]]) if (q > a && q < b) { const k = (q - a) / (b - a), mx = (h0.x + h1.x) / 2, my = h0.y - 30; g.globalAlpha = 1 - k; sq(g, mx - 6 - k * 6, my, 13 + k * 12, 2, '#ffffff'); sq(g, mx, my - 6 - k * 6, 2, 13 + k * 12, '#ffe08a'); sq(g, mx - 3, my - 3, 6, 6, '#fff4b8'); g.globalAlpha = 1; }
      break;
    }
    case 'forge': {
      const q = ((now + h0.sd) % 900) / 900, ax = bx + 12, ay = by - 29;
      sq(g, ax - 8, ay - 2, 12, 3, rm ? '#ff9a2a' : '#ff8a1a'); sq(g, ax - 5, ay - 3, 6, 1, '#ffd860');   // lingote al rojo sobre el yunque
      if (!rm && q > .2 && q < .55) { const k = (q - .2) / .35; g.globalAlpha = 1 - k; for (let i = 0; i < 8; i++) { const a = -Math.PI * (.1 + i * .115); sq(g, ax + Math.cos(a) * k * 26, ay + Math.sin(a) * k * 26 + k * k * 22, 2, 2, i % 2 ? '#ffd24a' : '#ff8a1a'); } g.globalAlpha = 1; }
      break;
    }
    case 'fire': {
      if (c.race.id === 'draconios' && !rm) {                                    // el aliento del draconio aviva la hoguera
        const q = ((now + h1.sd) % 3600) / 3600;
        if (q > .5 && q < .72) { const k = (q - .5) / .22; for (let i = 0; i < 8; i++) { const f = i / 7, x = h1.x - 8 + (bx - h1.x + 8) * f, y = h1.y - 36 + (by - 14 - h1.y + 36) * f + Math.sin(i + now / 60) * 3; g.globalAlpha = Math.sin(k * Math.PI); sq(g, x, y, 6 - Math.floor(f * 3), 6, i % 2 ? '#ffb02a' : '#ff6a1a'); } g.globalAlpha = 1; }
      }
      break;
    }
    case 'gears': {
      if (!rm) { const q = ((now / 300) % 3) / 3; g.globalAlpha = 1 - q; sq(g, bx + 16 + q * 16, by - 56 - q * 16, 3, 2, '#9ae8e8'); sq(g, bx - 20 - q * 12, by - 54 - q * 12, 2, 2, '#ffd24a'); g.globalAlpha = 1; }
      break;
    }
  }
}
SPR.mini = () => bake('mini', 30, 14, 15, 10, R => { for (const [x, y] of [[-8, 0], [0, 2], [8, 0], [-4, -1], [4, -1]]) box(R, x - 3, y - 1, 6, 4, ROCK, 2); box(R, -8, -2, 16, 3, WOOD, 1); R(-4, -3, 8, 1, WOOD[3]); }, 14);

// ---- API pública (coordenadas del lienzo 960×608) -----------------------------------------------------------------------
export const drawCampBackground = campBackground;
export const drawCampLive = (g, now) => { g.save(); g.imageSmoothingEnabled = false; campLive(g, now); g.restore(); };
export const drawProp = (g, kind, c, bx, by, now, rm) => { g.save(); g.imageSmoothingEnabled = false; propArt(g, kind, c, Math.round(bx), Math.round(by), now, rm); g.restore(); };
export const drawOverlay = (g, kind, c, bx, by, now, rm) => { g.save(); g.imageSmoothingEnabled = false; overlay(g, kind, c, Math.round(bx), Math.round(by), now, rm); g.restore(); };
// Objeto en la mano de un héroe. ix, iy vienen de camp.js en medios píxeles (unidades de la 1.1): se duplican; la barra se comprime al subir
// para que el héroe de 60 px la levante a la altura de la cabeza y no el doble.
export function drawHeld(g, kind, x, y, ix, iy, now, flip) {
  g.save(); g.imageSmoothingEnabled = false; drawItem(g, kind, Math.round(x + ix), Math.round(y + iy), now, flip, ix < 0 ? -1 : 1); g.restore();
}
export const drawLog = (g, x, y) => { g.save(); g.imageSmoothingEnabled = false; logAt(g, x, y + 4); g.restore(); };
