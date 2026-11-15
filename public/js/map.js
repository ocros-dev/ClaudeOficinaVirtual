// Mapa de la oficina: casillas de 16 px, salas, mobiliario, rutas (A*) y dibujo.
import { shade } from './sprites.js';

export const TS = 16, COLS = 30, ROWS = 19, W = COLS * TS, H = ROWS * TS;

// Salas: interior (x0..x1, y0..y1), fila de pared frontal (face) y puerta.
export const ROOMS = [
  { id: 'producto',   name: 'PRODUCTO',        x0: 1,  x1: 9,  y0: 2,  y1: 6,  face: 1,  style: 'carpet', floor: '#6a5a8c', wall: '#d6cbe8', door: [4, 5] },
  { id: 'desarrollo', name: 'DESARROLLO',      x0: 11, x1: 19, y0: 2,  y1: 6,  face: 1,  style: 'tile',   floor: '#5a7896', wall: '#c9d8e8', door: [14, 15] },
  { id: 'despacho',   name: 'DESPACHO',        x0: 21, x1: 28, y0: 2,  y1: 6,  face: 1,  style: 'wood',   floor: '#8a5a34', wall: '#eadcbf', door: [24, 25] },
  { id: 'datos',      name: 'DATOS',           x0: 1,  x1: 9,  y0: 13, y1: 17, face: 12, style: 'tile',   floor: '#3e6e64', wall: '#c4e0d8', door: [4, 5] },
  { id: 'ops',        name: 'OPS Y SEGURIDAD', x0: 11, x1: 19, y0: 13, y1: 17, face: 12, style: 'metal',  floor: '#4a4258', wall: '#9d95ad', door: [14, 15] },
  { id: 'qa',         name: 'QA LAB',          x0: 21, x1: 28, y0: 13, y1: 17, face: 12, style: 'tile',   floor: '#7a7442', wall: '#e8e2bc', door: [24, 25] },
];
const CORRIDOR = { x0: 1, x1: 28, y0: 8, y1: 10, style: 'corridor', floor: '#8c8898' };
export const ENTRANCE = { x: 0, y: 9 };

// Escritorios: x = casilla izquierda (ocupan 2), y = fila de la mesa.
// face 'up': la silla está debajo y el agente mira hacia la pantalla (de espaldas).
// face 'down': la silla está arriba y el agente mira al frente (el jefe).
export const DESKS = {
  'product-owner':      { x: 1,  y: 2,  mon: 1, item: 'notes' },
  'software-architect': { x: 4,  y: 2,  mon: 1, item: 'blueprint' },
  'ux-designer':        { x: 7,  y: 2,  mon: 1, item: 'tablet' },
  'frontend-expert':    { x: 11, y: 2,  mon: 2 },
  'backend-expert':     { x: 14, y: 2,  mon: 2 },
  'mobile-developer':   { x: 17, y: 2,  mon: 1, item: 'phone' },
  'claude':             { x: 24, y: 3,  boss: true, face: 'down' },
  'data-engineer':      { x: 2,  y: 13, mon: 2 },
  'postgres-dba':       { x: 6,  y: 13, mon: 2 },
  'devops-engineer':    { x: 12, y: 13, mon: 2 },
  'security-expert':    { x: 16, y: 13, mon: 2 },
  'qa-engineer':        { x: 26, y: 13, mon: 1, item: 'phone' },
};
export const GUEST_DESKS = [{ x: 21, y: 5, mon: 1 }, { x: 27, y: 5, mon: 1 }, { x: 21, y: 15, mon: 1 }, { x: 24, y: 15, mon: 1 }];

for (const d of [...Object.values(DESKS), ...GUEST_DESKS]) {
  d.face = d.face || 'up';
  d.seat = { x: d.x, y: d.face === 'up' ? d.y + 1 : d.y - 1 };
  d.px = { x: (d.x + 1) * TS, y: d.seat.y * TS + 13 };   // punto de apoyo del agente sentado
}

export const PROPS = [
  { k: 'table', x: 1, y: 5, w: 2, h: 2 }, { k: 'plant', x: 9, y: 2 },
  { k: 'plant', x: 19, y: 2 }, { k: 'plant', x: 11, y: 6 }, { k: 'plant', x: 19, y: 6 },
  { k: 'plant', x: 21, y: 2 }, { k: 'sofa', x: 27, y: 2, w: 2 }, { k: 'plant', x: 28, y: 6 },
  { k: 'coffee', x: 7, y: 8 }, { k: 'cooler', x: 19, y: 8 }, { k: 'vending', x: 27, y: 8 },
  { k: 'plant', x: 1, y: 8 }, { k: 'plant', x: 1, y: 10 }, { k: 'plant', x: 28, y: 10 }, { k: 'bench', x: 10, y: 10, w: 2 },
  { k: 'plant', x: 1, y: 13 }, { k: 'plant', x: 9, y: 13 },
  { k: 'rack', x: 1, y: 17 }, { k: 'rack', x: 2, y: 17 }, { k: 'rack', x: 8, y: 17 }, { k: 'rack', x: 9, y: 17 },
  { k: 'plant', x: 11, y: 13 }, { k: 'plant', x: 19, y: 13 },
  { k: 'rack', x: 11, y: 17 }, { k: 'rack', x: 12, y: 17 }, { k: 'rack', x: 18, y: 17 }, { k: 'rack', x: 19, y: 17 },
  { k: 'testbench', x: 23, y: 17, w: 5 }, { k: 'plant', x: 21, y: 13 }, { k: 'plant', x: 28, y: 13 },
];

const WALL_DECOR = [
  { k: 'whiteboard', x: 2, y: 1, w: 3 }, { k: 'sticky', x: 6, y: 1, w: 2 },
  { k: 'window', x: 12, y: 1, w: 2 }, { k: 'poster', x: 15, y: 1 }, { k: 'window', x: 17, y: 1, w: 2 },
  { k: 'window', x: 22, y: 1, w: 2 }, { k: 'diploma', x: 25, y: 1 }, { k: 'window', x: 26, y: 1, w: 2 },
  { k: 'chart', x: 2, y: 12, w: 2 }, { k: 'dbsign', x: 7, y: 12, w: 2 },
  { k: 'kanban', x: 21, y: 12, w: 3 }, { k: 'poster', x: 27, y: 12 },
];
// Decoración de pared que cambia con el tiempo
export const LIVE_WALL = [
  { k: 'clock', x: 9, y: 1 }, { k: 'screen', x: 11, y: 12, w: 3 }, { k: 'screen', x: 16, y: 12, w: 3 }, { k: 'clock', x: 28, y: 12 },
];

// Puntos de descanso en el pasillo
export const SPOTS = {
  coffee:  [[6, 8], [8, 8], [7, 9], [6, 9], [8, 9]],
  cooler:  [[18, 8], [20, 8], [19, 9], [18, 9], [20, 9]],
  vending: [[26, 8], [26, 9], [27, 9], [28, 9]],
  bench:   [[10, 9], [11, 9], [9, 10], [12, 10]],
};

// ---- Rejilla ---------------------------------------------------------------
export const tiles = [];      // tiles[y][x] = { kind: 'wall'|'face'|'floor', area }
export const blocked = [];    // blocked[y][x] = true si no se puede pisar
export const corridorTiles = [];

export function buildWorld() {
  for (let y = 0; y < ROWS; y++) {
    tiles.push(Array.from({ length: COLS }, () => ({ kind: 'wall', area: null })));
    blocked.push(Array(COLS).fill(true));
  }
  const setFloor = (x, y, area) => { tiles[y][x] = { kind: 'floor', area }; blocked[y][x] = false; };
  for (let y = CORRIDOR.y0; y <= CORRIDOR.y1; y++) for (let x = CORRIDOR.x0; x <= CORRIDOR.x1; x++) setFloor(x, y, CORRIDOR);
  setFloor(ENTRANCE.x, ENTRANCE.y, CORRIDOR);
  for (const r of ROOMS) {
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) setFloor(x, y, r);
    for (let x = r.x0; x <= r.x1; x++) tiles[r.face][x] = { kind: 'face', area: r };
    for (const dx of r.door) {
      if (r.face === 1) setFloor(dx, 7, r);
      else { setFloor(dx, 11, r); setFloor(dx, 12, r); }
      tiles[r.face === 1 ? 7 : 11][dx].door = true;
    }
  }
  const block = (x, y, w = 1, h = 1) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) blocked[y + j][x + i] = true; };
  for (const d of [...Object.values(DESKS), ...GUEST_DESKS]) block(d.x, d.y, 2, 1);
  for (const p of PROPS) block(p.x, p.y, p.w || 1, p.h || 1);

  for (let y = CORRIDOR.y0; y <= CORRIDOR.y1; y++) for (let x = 2; x <= 27; x++)
    if (!blocked[y][x]) corridorTiles.push([x, y]);
}

// ---- A* -------------------------------------------------------------------
export function findPath(sx, sy, tx, ty) {
  const ok = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !blocked[y][x];
  if (!ok(tx, ty)) return null;
  if (!ok(sx, sy)) {                      // si quedó encima de algo, salir por la casilla libre más cercana
    const n = [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dy]) => [sx + dx, sy + dy]).find(([x, y]) => ok(x, y));
    if (!n) return null; [sx, sy] = n;
  }
  const key = (x, y) => y * COLS + x;
  const g = new Map([[key(sx, sy), 0]]), came = new Map();
  const open = [[sx, sy, Math.abs(tx - sx) + Math.abs(ty - sy)]];
  const closed = new Set();
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][2] < open[bi][2]) bi = i;
    const [x, y] = open.splice(bi, 1)[0];
    const k = key(x, y);
    if (x === tx && y === ty) {
      const path = [[x, y]]; let c = k;
      while (came.has(c)) { c = came.get(c); path.unshift([c % COLS, Math.floor(c / COLS)]); }
      return path;
    }
    if (closed.has(k)) continue; closed.add(k);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (!ok(nx, ny)) continue;
      const nk = key(nx, ny), ng = g.get(k) + 1;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng); came.set(nk, k);
        open.push([nx, ny, ng + Math.abs(tx - nx) + Math.abs(ty - ny)]);
      }
    }
  }
  return null;
}

// ---- Utilidades de dibujo -------------------------------------------------
function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
function noise(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

function drawFloor(g, x, y, area) {
  const X = x * TS, Y = y * TS, b = area.floor;
  switch (area.style) {
    case 'carpet':
      px(g, X, Y, TS, TS, b);
      for (let i = 0; i < 10; i++) px(g, X + Math.floor(noise(x, y, i) * 16), Y + Math.floor(noise(y, x, i) * 16), 1, 1, shade(b, noise(x, y, i + 9) > .5 ? 10 : -10));
      break;
    case 'tile':
      px(g, X, Y, TS, TS, (x + y) % 2 ? b : shade(b, -8));
      px(g, X, Y, TS, 1, shade(b, 14)); px(g, X, Y, 1, TS, shade(b, 10));
      px(g, X, Y + 15, TS, 1, shade(b, -22)); px(g, X + 15, Y, 1, TS, shade(b, -18));
      break;
    case 'wood':
      for (let r = 0; r < 4; r++) {
        const c = shade(b, r % 2 ? -6 : 6);
        px(g, X, Y + r * 4, TS, 4, c); px(g, X, Y + r * 4 + 3, TS, 1, shade(b, -22));
        const seam = ((y * 4 + r) * 7 + x * 5) % 16; px(g, X + seam, Y + r * 4, 1, 3, shade(b, -28));
      }
      break;
    case 'metal':
      px(g, X, Y, TS, TS, b); px(g, X, Y, TS, 1, shade(b, 18)); px(g, X, Y + 15, TS, 1, shade(b, -20));
      px(g, X + 15, Y, 1, TS, shade(b, -14));
      for (const [i, j] of [[2, 2], [13, 2], [2, 13], [13, 13]]) px(g, X + i, Y + j, 1, 1, shade(b, 34));
      break;
    default: // pasillo
      px(g, X, Y, TS, TS, (x + y) % 2 ? b : shade(b, -6));
      px(g, X, Y, TS, 1, shade(b, 12)); px(g, X, Y + 15, TS, 1, shade(b, -16));
  }
}

function drawWall(g, x, y) {
  const X = x * TS, Y = y * TS;
  px(g, X, Y, TS, TS, '#2b2438');
  px(g, X, Y, TS, 2, '#3e3550');
  const below = tiles[y + 1] && tiles[y + 1][x];
  if (below && below.kind === 'floor' && below.area && below.area.style === 'corridor') {
    // cara de la pared vista desde el pasillo
    px(g, X, Y + 6, TS, 10, '#b9b3c6'); px(g, X, Y + 6, TS, 1, '#d4cfe0');
    px(g, X, Y + 13, TS, 3, '#5a5068');
  }
}

function drawFace(g, x, y, area) {
  const X = x * TS, Y = y * TS, c = area.wall;
  px(g, X, Y, TS, TS, c);
  for (let i = 0; i < TS; i += 4) px(g, X + i, Y + 3, 1, 9, shade(c, -6));
  px(g, X, Y, TS, 3, shade(c, -55)); px(g, X, Y + 3, TS, 1, shade(c, 18));
  px(g, X, Y + 13, TS, 3, shade(area.floor, -35)); px(g, X, Y + 12, TS, 1, shade(c, -30));
}

function drawWallDecor(g, d) {
  const X = d.x * TS, Y = d.y * TS, Wd = (d.w || 1) * TS;
  switch (d.k) {
    case 'whiteboard':
      px(g, X + 1, Y + 2, Wd - 2, 10, '#8b8f9a'); px(g, X + 2, Y + 3, Wd - 4, 8, '#f6f7fb');
      px(g, X + 4, Y + 5, 12, 1, '#e05d8a'); px(g, X + 4, Y + 7, 18, 1, '#3d7bff'); px(g, X + 26, Y + 5, 8, 4, '#5fd068');
      px(g, X + 4, Y + 9, 9, 1, '#222'); px(g, X + 16, Y + 11, Wd - 20, 1, '#666');
      break;
    case 'sticky':
      for (let i = 0; i < 6; i++) px(g, X + 2 + (i % 3) * 9, Y + 3 + Math.floor(i / 3) * 5, 7, 4, ['#f5d442', '#f08fd0', '#7ee08a', '#7cc4ff', '#f5a142', '#f5d442'][i]);
      break;
    case 'window':
      px(g, X + 1, Y + 1, Wd - 2, 12, '#e8ecf4'); px(g, X + 2, Y + 2, Wd - 4, 10, '#7ec8f0');
      px(g, X + 2, Y + 2, Wd - 4, 4, '#a8dcf6'); px(g, X + 6, Y + 8, 10, 2, '#ffffff'); px(g, X + 3, Y + 9, 6, 2, '#ffffff');
      px(g, X + Wd / 2 - 1, Y + 1, 2, 12, '#e8ecf4'); px(g, X + 1, Y + 7, Wd - 2, 1, '#e8ecf4');
      break;
    case 'poster':
      px(g, X + 3, Y + 2, 10, 10, '#20202c'); px(g, X + 4, Y + 3, 8, 6, '#d97757'); px(g, X + 6, Y + 5, 4, 2, '#f5d442'); px(g, X + 4, Y + 10, 8, 1, '#ddd');
      break;
    case 'diploma':
      px(g, X + 3, Y + 3, 10, 8, '#a07a30'); px(g, X + 4, Y + 4, 8, 6, '#f4eedc'); px(g, X + 5, Y + 5, 6, 1, '#555'); px(g, X + 7, Y + 7, 2, 2, '#c03030');
      break;
    case 'chart':
      px(g, X + 2, Y + 2, Wd - 4, 10, '#fff'); for (let i = 0; i < 6; i++) px(g, X + 5 + i * 4, Y + 10 - (i * 7 % 6) - 2, 3, (i * 7 % 6) + 2, '#3e9f8a');
      break;
    case 'dbsign':
      px(g, X + 3, Y + 2, Wd - 6, 10, '#1f3a36'); px(g, X + 7, Y + 4, 6, 2, '#7ee0c8'); px(g, X + 7, Y + 7, 6, 2, '#7ee0c8'); px(g, X + 15, Y + 4, 10, 1, '#7ee0c8'); px(g, X + 15, Y + 7, 7, 1, '#7ee0c8');
      break;
    case 'kanban':
      px(g, X + 1, Y + 2, Wd - 2, 10, '#f6f6f0');
      for (let c = 0; c < 3; c++) { px(g, X + 2 + c * 15, Y + 3, 13, 1, ['#e84545', '#f5c542', '#5fd068'][c]); for (let i = 0; i < 2 + (c % 2); i++) px(g, X + 4 + c * 15, Y + 5 + i * 2, 8, 1, '#999'); }
      break;
  }
}

export function drawBackground(g) {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const t = tiles[y][x];
    if (t.kind === 'floor') drawFloor(g, x, y, t.area);
    else if (t.kind === 'face') drawFace(g, x, y, t.area);
    else drawWall(g, x, y);
  }
  // Marcos de puertas
  for (const r of ROOMS) {
    const [a, b] = r.door, row = r.face === 1 ? 7 : 11;
    px(g, a * TS - 2, row * TS, 2, TS * (r.face === 1 ? 1 : 2), '#5a4632');
    px(g, (b + 1) * TS, row * TS, 2, TS * (r.face === 1 ? 1 : 2), '#5a4632');
  }
  // Entrada del edificio
  px(g, 0, ENTRANCE.y * TS, TS, TS, '#2a1e18'); px(g, 3, ENTRANCE.y * TS + 3, 10, 10, '#6a3a2a'); px(g, 4, ENTRANCE.y * TS + 4, 8, 8, '#8a4a34');
  // Alfombra del despacho
  px(g, 22 * TS + 8, 2 * TS + 4, 4 * TS, 3 * TS - 2, '#7a2f2f'); px(g, 22 * TS + 11, 2 * TS + 7, 4 * TS - 6, 3 * TS - 8, '#984242');
  // Alfombra de la zona de café
  px(g, 5 * TS + 4, 8 * TS + 2, 5 * TS - 8, 2 * TS - 4, 'rgba(120,70,40,.35)');
  for (const d of WALL_DECOR) drawWallDecor(g, d);
  // Luz que entra por las ventanas
  g.fillStyle = 'rgba(255,248,220,0.07)';
  for (const d of WALL_DECOR.filter(d => d.k === 'window')) {
    const X = d.x * TS, Wd = d.w * TS;
    g.beginPath(); g.moveTo(X + 2, 2 * TS); g.lineTo(X + Wd - 2, 2 * TS); g.lineTo(X + Wd + 22, 5 * TS + 8); g.lineTo(X + 22, 5 * TS + 8); g.fill();
  }
}

// ---- Objetos dinámicos ----------------------------------------------------
export function drawLiveWall(g, t) {
  for (const d of LIVE_WALL) {
    const X = d.x * TS, Y = d.y * TS;
    if (d.k === 'clock') {
      px(g, X + 4, Y + 2, 9, 9, '#3a3040'); px(g, X + 5, Y + 3, 7, 7, '#f4f4f4');
      const now = new Date(), cx = X + 8, cy = Y + 6;
      const m = now.getMinutes() / 60 * Math.PI * 2, h = (now.getHours() % 12 + now.getMinutes() / 60) / 12 * Math.PI * 2;
      px(g, cx + Math.round(Math.sin(m) * 3), cy - Math.round(Math.cos(m) * 3), 1, 1, '#222');
      px(g, cx + Math.round(Math.sin(h) * 2), cy - Math.round(Math.cos(h) * 2), 1, 1, '#c03030');
      px(g, cx, cy, 1, 1, '#222');
    } else if (d.k === 'screen') {
      const Wd = d.w * TS;
      px(g, X + 1, Y + 1, Wd - 2, 12, '#15151c'); px(g, X + 2, Y + 2, Wd - 4, 10, '#08140c');
      for (let i = 0; i < Wd - 6; i++) {
        const v = Math.sin((i + t / 90 + d.x * 7) / 4) * 2.5 + Math.sin((i + t / 50) / 9) * 1.5;
        px(g, X + 3 + i, Y + 6 + Math.round(v), 1, 1, d.x < 14 ? '#5fd068' : '#e8a442');
      }
      px(g, X + 3, Y + 3, 6, 1, '#5fd068');
      if (Math.floor(t / 600) % 2) px(g, X + Wd - 7, Y + 3, 3, 2, '#e84545');
    }
  }
}

export function propBaseline(p) { return (p.y + (p.h || 1)) * TS; }

export function drawProp(g, p, t) {
  const X = p.x * TS, Y = p.y * TS, Wd = (p.w || 1) * TS;
  switch (p.k) {
    case 'plant':
      px(g, X + 2, Y + 11, 12, 1, 'rgba(0,0,0,.25)');
      px(g, X + 4, Y + 7, 8, 6, '#9a5a32'); px(g, X + 4, Y + 7, 8, 1, '#b8743e'); px(g, X + 5, Y + 12, 6, 1, '#6e3e22');
      px(g, X + 2, Y - 1, 12, 8, '#2f7a3c'); px(g, X + 4, Y - 5, 8, 6, '#3c9a4a'); px(g, X + 6, Y - 8, 4, 5, '#4fbf5c');
      px(g, X + 1, Y + 2, 3, 3, '#3c9a4a'); px(g, X + 12, Y + 1, 3, 3, '#3c9a4a'); px(g, X + 7, Y - 3, 2, 2, '#7ee08a');
      break;
    case 'rack': {
      px(g, X + 1, Y - 14, 14, 30, '#1c1f27'); px(g, X + 1, Y - 14, 14, 1, '#3a3f4e'); px(g, X + 14, Y - 14, 1, 30, '#0e1016');
      for (let i = 0; i < 6; i++) {
        const yy = Y - 11 + i * 4;
        px(g, X + 3, yy, 10, 3, '#2c313e'); px(g, X + 4, yy + 1, 5, 1, '#454c5e');
        const on = (Math.floor(t / (140 + i * 37)) + i + p.x) % 4;
        px(g, X + 11, yy + 1, 1, 1, on ? '#5fd068' : '#1d3a22'); px(g, X + 10, yy + 1, 1, 1, on === 2 ? '#f5c542' : '#3a3420');
      }
      break;
    }
    case 'coffee':
      px(g, X + 2, Y - 6, 12, 20, '#4a4a56'); px(g, X + 2, Y - 6, 12, 2, '#6a6a78'); px(g, X + 4, Y - 2, 8, 4, '#1a1a22');
      px(g, X + 5, Y - 1, 2, 1, '#e84545'); px(g, X + 9, Y - 1, 2, 1, '#5fd068'); px(g, X + 5, Y + 5, 6, 6, '#2a2a32'); px(g, X + 7, Y + 8, 3, 3, '#f4f4f4');
      if (Math.floor(t / 400) % 3 === 0) px(g, X + 8, Y + 5, 1, 2, '#ccc');
      break;
    case 'cooler':
      px(g, X + 4, Y - 8, 8, 9, '#7cc4ff'); px(g, X + 5, Y - 7, 3, 7, '#b8e2ff'); px(g, X + 6, Y - 9, 4, 1, '#5a9ad0');
      px(g, X + 3, Y + 1, 10, 13, '#e8e8ee'); px(g, X + 3, Y + 1, 10, 1, '#fff'); px(g, X + 6, Y + 4, 4, 2, '#5a9ad0');
      break;
    case 'vending':
      px(g, X + 1, Y - 12, 14, 26, '#b83a3a'); px(g, X + 1, Y - 12, 14, 2, '#d85a5a'); px(g, X + 3, Y - 9, 8, 16, '#1a2a3a');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) px(g, X + 4 + c * 4, Y - 8 + r * 4, 3, 2, ['#f5d442', '#5fd068', '#f08fd0', '#7cc4ff'][(r + c) % 4]);
      px(g, X + 12, Y - 6, 2, 4, '#222'); px(g, X + 3, Y + 9, 8, 3, '#111');
      break;
    case 'sofa':
      px(g, X, Y - 2, Wd, 8, '#4a5a9a'); px(g, X, Y - 2, Wd, 1, '#6a7aba');
      px(g, X + 2, Y + 6, Wd - 4, 6, '#5a6aaa'); px(g, X, Y + 4, 3, 10, '#3a4a8a'); px(g, X + Wd - 3, Y + 4, 3, 10, '#3a4a8a');
      px(g, X + 2, Y + 12, Wd - 4, 2, '#2a3468'); px(g, X + 6, Y + 1, 6, 4, '#f5d442');
      break;
    case 'table':
      px(g, X + 2, Y + 4, Wd - 4, 22, '#9a6a3a'); px(g, X + 2, Y + 4, Wd - 4, 2, '#b8844e'); px(g, X + 2, Y + 24, Wd - 4, 3, '#6a4422');
      px(g, X + 7, Y + 9, 7, 9, '#f4f4f4'); px(g, X + 18, Y + 12, 8, 6, '#f5d442'); px(g, X + 8, Y + 11, 5, 1, '#888'); px(g, X + 8, Y + 13, 4, 1, '#888');
      px(g, X + 20, Y + 7, 3, 3, '#f4f4f4');
      break;
    case 'bench':
      px(g, X + 1, Y + 4, Wd - 2, 4, '#a8743f'); px(g, X + 1, Y + 4, Wd - 2, 1, '#c48c52'); px(g, X + 1, Y + 8, Wd - 2, 2, '#7a5028');
      px(g, X + 3, Y + 10, 2, 4, '#4a3220'); px(g, X + Wd - 5, Y + 10, 2, 4, '#4a3220');
      break;
    case 'testbench':
      px(g, X, Y + 2, Wd, 8, '#8a8a96'); px(g, X, Y + 2, Wd, 1, '#a8a8b6'); px(g, X, Y + 10, Wd, 4, '#5a5a66');
      for (let i = 0; i < 6; i++) {
        const dx = X + 4 + i * 13, on = (Math.floor(t / 500) + i) % 3;
        if (i % 2) { px(g, dx, Y - 4, 6, 10, '#222'); px(g, dx + 1, Y - 3, 4, 7, on ? '#7cc4ff' : '#2a4a6a'); }
        else { px(g, dx - 1, Y - 2, 10, 7, '#333'); px(g, dx, Y - 1, 8, 5, on === 1 ? '#5fd068' : on === 2 ? '#e84545' : '#f5c542'); }
      }
      break;
  }
}

// ---- Escritorios ----------------------------------------------------------
const SCREEN_BG = { Bash: '#0a160c', Edit: '#141c34', Write: '#141c34', MultiEdit: '#141c34', NotebookEdit: '#141c34',
                    Read: '#eef0f4', Grep: '#1c1a10', Glob: '#1c1a10', WebSearch: '#241838', WebFetch: '#241838',
                    Delegar: '#2a1810', Pensando: '#2a1810', SubagentHandback: '#0e2412' };
const SCREEN_FG = { Bash: ['#5fd068'], Edit: ['#7cc4ff', '#f08fd0', '#f5d442'], Write: ['#7cc4ff', '#f08fd0', '#f5d442'],
                    MultiEdit: ['#7cc4ff', '#f08fd0'], Read: ['#8a8e9a'], Grep: ['#f5d442', '#8a7a40'], Glob: ['#f5d442'],
                    WebSearch: ['#b48cff', '#fff'], WebFetch: ['#b48cff'], Delegar: ['#d97757', '#f5d442'], Pensando: ['#d97757'],
                    SubagentHandback: ['#5fd068', '#fff'] };

function screenColors(tool) {
  if (!tool) return { bg: '#141824', fg: ['#3a4256'] };
  if (/Browser|chrome/.test(tool)) return { bg: '#f4f4f4', fg: ['#45a8d4', '#999'], bar: '#45a8d4' };
  if (tool.startsWith('mcp__')) return { bg: '#26122a', fg: ['#f08fd0'] };
  return { bg: SCREEN_BG[tool] || '#1a1a24', fg: SCREEN_FG[tool] || ['#aaa'] };
}

function drawScreen(g, x, y, w, h, mode, tool, t, seed) {
  if (mode === 'off') { px(g, x, y, w, h, '#10131c'); px(g, x + 1, y + 1, 2, 1, '#252a38'); return; }
  if (mode === 'idle') {
    px(g, x, y, w, h, '#101828');
    const k = Math.floor(t / 250 + seed);
    px(g, x + (k % (w - 1)), y + ((k * 3) % (h - 1)), 1, 1, '#7cc4ff');
    return;
  }
  const c = screenColors(tool);
  px(g, x, y, w, h, c.bg);
  if (c.bar) px(g, x, y, w, 1, c.bar);
  const scroll = Math.floor(t / (tool === 'Read' ? 500 : 180) + seed);
  for (let r = 0; r < h - 1; r++) {
    const len = 1 + Math.floor(noise(r + scroll, seed) * (w - 2));
    const ind = Math.floor(noise(seed, r + scroll) * 3);
    px(g, x + 1 + ind, y + 1 + r, Math.min(len, w - 2 - ind), 1, c.fg[(r + scroll) % c.fg.length]);
    r++;
  }
}

function drawMonitor(g, x, y, mode, tool, t, seed) {
  px(g, x, y, 13, 10, '#22222c'); px(g, x, y, 13, 1, '#3a3a48');
  drawScreen(g, x + 1, y + 1, 11, 8, mode, tool, t, seed);
  px(g, x + 5, y + 10, 3, 2, '#22222c'); px(g, x + 3, y + 12, 7, 1, '#22222c');
}

export function deskBaseline(d) { return (d.y + 1) * TS; }

// screen = { mode: 'off'|'idle'|'work', tool }
export function drawDesk(g, d, screen, t, seed) {
  const X = d.x * TS, Y = d.y * TS, Wd = 2 * TS;
  if (d.boss) {
    // Escritorio del jefe, visto de frente con el portátil de espaldas
    px(g, X - 4, Y + 1, Wd + 8, 7, '#6a3a22'); px(g, X - 4, Y + 1, Wd + 8, 1, '#8a5232');
    px(g, X - 4, Y + 8, Wd + 8, 8, '#5a301c'); px(g, X - 2, Y + 10, Wd + 4, 4, '#4a2616');
    px(g, X + 13, Y + 11, 6, 2, '#c8a040');
    px(g, X + 10, Y - 4, 12, 7, '#b8bcc8'); px(g, X + 10, Y + 3, 12, 1, '#8a8e9a');
    const glow = screen.mode === 'work' ? (screenColors(screen.tool).fg[0]) : screen.mode === 'idle' ? '#5a6a8a' : '#6a6e7a';
    px(g, X + 15, Y - 2, 2, 2, glow);
    px(g, X - 1, Y - 6, 2, 8, '#2a2a2a'); px(g, X - 3, Y - 8, 6, 3, '#f5d442'); px(g, X - 3, Y + 1, 6, 1, '#2a2a2a');
    px(g, X + 26, Y - 1, 5, 3, '#f4f4f4'); px(g, X + 27, Y, 3, 1, '#d97757');
    return;
  }
  px(g, X, Y + 13, Wd, 3, 'rgba(0,0,0,.25)');
  px(g, X, Y + 2, Wd, 8, '#b07a44'); px(g, X, Y + 2, Wd, 1, '#cc955a'); px(g, X, Y + 9, Wd, 1, '#7a5028');
  px(g, X + 1, Y + 10, Wd - 2, 4, '#8a5c30'); px(g, X + 2, Y + 10, 1, 5, '#5a3a1e'); px(g, X + Wd - 3, Y + 10, 1, 5, '#5a3a1e');
  px(g, X + 22, Y + 11, 6, 2, '#6e4826'); px(g, X + 24, Y + 11, 2, 1, '#c8a040');
  const mode = screen.mode;
  if (d.mon === 2) {
    drawMonitor(g, X + 2, Y - 6, mode, screen.tool, t, seed);
    drawMonitor(g, X + 17, Y - 6, mode, screen.tool, t + 700, seed + 3);
  } else {
    drawMonitor(g, X + 9, Y - 6, mode, screen.tool, t, seed);
    px(g, X + 2, Y + 4, 3, 3, '#f4f4f4'); px(g, X + 5, Y + 5, 1, 1, '#f4f4f4');         // taza
    if (d.item === 'notes') { px(g, X + 24, Y + 3, 6, 5, '#f5d442'); px(g, X + 25, Y + 4, 4, 1, '#a08a2a'); }
    if (d.item === 'blueprint') { px(g, X + 23, Y + 3, 8, 6, '#3d6bd9'); px(g, X + 24, Y + 4, 6, 1, '#cfe0ff'); px(g, X + 26, Y + 4, 1, 4, '#cfe0ff'); }
    if (d.item === 'tablet') { px(g, X + 23, Y + 3, 7, 6, '#222'); px(g, X + 24, Y + 4, 5, 4, ['#f08fd0', '#7cc4ff', '#f5d442'][Math.floor(t / 900) % 3]); }
    if (d.item === 'phone') { px(g, X + 25, Y + 3, 4, 6, '#222'); px(g, X + 26, Y + 4, 2, 4, mode === 'work' ? '#7cc4ff' : '#2a3a5a'); }
  }
  px(g, X + 11, Y + 6, 10, 2, '#d8d8e0'); px(g, X + 11, Y + 6, 10, 1, '#f0f0f6');   // teclado
}

// Silla. Para escritorios 'up' se ve el respaldo delante del agente.
export function chairBaseline(d) { return d.px.y + (d.face === 'up' ? 1 : -1); }
export function drawChair(g, d) {
  const X = d.px.x, Y = d.seat.y * TS;
  if (d.face === 'up') {
    px(g, X - 6, Y + 5, 12, 7, '#353548'); px(g, X - 6, Y + 5, 12, 1, '#4a4a62'); px(g, X - 5, Y + 11, 10, 1, '#25253a');
    px(g, X - 1, Y + 12, 2, 2, '#25253a'); px(g, X - 4, Y + 14, 8, 1, '#25253a');
  } else {
    const c = d.boss ? '#5a2020' : '#353548';
    px(g, X - 7, Y - 3, 14, 12, c); px(g, X - 7, Y - 3, 14, 1, shade(c, 25)); px(g, X - 6, Y + 9, 12, 3, shade(c, -15));
  }
}
