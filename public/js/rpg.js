// Tema «mundo RPG»: el mismo mapa que la oficina dibujado como un mundo de fantasía.
// Cada agente que trabaja se enfrenta a un villano en su campamento; cuanto más larga
// es la tarea (más herramientas y más tiempo), más fuerte es el villano que aparece.
// Todo el arte está hecho en código y los villanos son diseños originales.
import { TS, COLS, ROWS, ROOMS, ENTRANCE, tiles } from './map.js';
import { shade } from './sprites.js';

function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
function noise(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

// Nombres de las zonas (por id de sala)
export const ZONE_NAMES = {
  producto: 'ALDEA', desarrollo: 'BOSQUE ENCANTADO', despacho: 'CASTILLO',
  datos: 'CUEVA DE CRISTAL', ops: 'FORTALEZA', qa: 'DESIERTO',
};

// ---- Suelos ---------------------------------------------------------------
function drawFloor(g, x, y, area) {
  const X = x * TS, Y = y * TS, n = i => noise(x, y, i);
  switch (area.id) {
    case 'producto': {      // aldea: hierba con flores
      px(g, X, Y, TS, TS, '#5a9a48');
      for (let i = 0; i < 14; i++) px(g, X + Math.floor(n(i) * 16), Y + Math.floor(n(i + 30) * 16), 1, 2, n(i + 60) > .5 ? '#6cae54' : '#4a8a3c');
      if (n(99) > .7) { const fx = X + 3 + Math.floor(n(98) * 10), fy = Y + 3 + Math.floor(n(97) * 10); px(g, fx, fy, 2, 2, ['#f4f4f4', '#f5d442', '#f08fd0'][Math.floor(n(96) * 3)]); }
      break;
    }
    case 'desarrollo': {    // bosque: hierba oscura con hojas y setas
      px(g, X, Y, TS, TS, '#33603a');
      for (let i = 0; i < 12; i++) px(g, X + Math.floor(n(i) * 16), Y + Math.floor(n(i + 30) * 16), 2, 1, n(i + 60) > .6 ? '#7a5a30' : '#2a5030');
      if (n(99) > .88) { const fx = X + 4 + Math.floor(n(98) * 8), fy = Y + 5 + Math.floor(n(97) * 6); px(g, fx, fy, 4, 2, '#d84a3a'); px(g, fx + 1, fy, 1, 1, '#fff'); px(g, fx + 1, fy + 2, 2, 2, '#e8dcc0'); }
      break;
    }
    case 'despacho': {      // castillo: losas de piedra
      const b = (x + y) % 2 ? '#8a8a96' : '#80808c';
      px(g, X, Y, TS, TS, b);
      px(g, X, Y, TS, 1, '#a0a0ac'); px(g, X, Y + 8, TS, 1, '#6a6a76'); px(g, X + 15, Y, 1, 8, '#6a6a76'); px(g, X + 7, Y + 8, 1, 8, '#6a6a76');
      if (n(5) > .7) px(g, X + 3 + Math.floor(n(6) * 9), Y + 2 + Math.floor(n(7) * 10), 2, 1, '#74747e');
      break;
    }
    case 'datos': {         // cueva: roca azulada con destellos de cristal
      px(g, X, Y, TS, TS, '#2c3c50');
      for (let i = 0; i < 9; i++) px(g, X + Math.floor(n(i) * 15), Y + Math.floor(n(i + 30) * 15), 2, 2, n(i + 60) > .5 ? '#34485e' : '#243244');
      if (n(99) > .75) px(g, X + 3 + Math.floor(n(98) * 10), Y + 3 + Math.floor(n(97) * 10), 1, 1, '#7ee8f8');
      break;
    }
    case 'ops': {           // fortaleza: losas oscuras con grietas de lava
      px(g, X, Y, TS, TS, (x + y) % 2 ? '#3c3040' : '#362a3a');
      px(g, X, Y, TS, 1, '#4c3e50'); px(g, X, Y + 15, TS, 1, '#241c28'); px(g, X + 15, Y, 1, TS, '#241c28');
      if (n(9) > .72) { const cx = X + 2 + Math.floor(n(8) * 10), cy = Y + 3 + Math.floor(n(7) * 9); px(g, cx, cy, 3, 1, '#c0421c'); px(g, cx + 2, cy + 1, 2, 1, '#e8742a'); px(g, cx + 3, cy + 2, 1, 1, '#c0421c'); }
      break;
    }
    case 'qa': {            // desierto: arena con ondas
      px(g, X, Y, TS, TS, '#d8b86a');
      for (let r = 0; r < 3; r++) { const o = Math.floor(n(r) * 6); px(g, X + o, Y + 3 + r * 5, 7, 1, '#c8a458'); }
      if (n(99) > .9) px(g, X + 5, Y + 6, 2, 2, '#a88a4a');
      break;
    }
    default: {              // camino de tierra con hierba en los bordes
      px(g, X, Y, TS, TS, '#9a7a52');
      for (let i = 0; i < 6; i++) px(g, X + Math.floor(n(i) * 15), Y + Math.floor(n(i + 30) * 15), 2, 1, n(i + 60) > .5 ? '#8a6a44' : '#aa8a60');
      if (y === 8) { px(g, X, Y, TS, 3, '#5a9a48'); for (let i = 0; i < 16; i += 3) px(g, X + i, Y + 3, 1, 1 + Math.floor(n(i) * 2), '#5a9a48'); }
      if (y === 10) { px(g, X, Y + 13, TS, 3, '#5a9a48'); for (let i = 1; i < 16; i += 3) px(g, X + i, Y + 12 - Math.floor(n(i + 5) * 2), 1, 2, '#5a9a48'); }
    }
  }
}

// Bosque frondoso entre zonas
function drawCanopy(g, X, Y, x, y, h = TS) {
  px(g, X, Y, TS, h, '#1d3a24');
  for (let i = 0; i < 6; i++) {
    const cx = X + Math.floor(noise(x, y, i + 40) * 14), cy = Y + Math.floor(noise(x, y, i + 50) * (h - 3));
    px(g, cx, cy, 4, 3, i % 2 ? '#2a5030' : '#24462a'); px(g, cx + 1, cy, 2, 1, '#3a6a40');
  }
}
function drawWall(g, x, y) {
  const X = x * TS, Y = y * TS;
  const below = tiles[y + 1] && tiles[y + 1][x];
  if (below && below.kind === 'floor' && below.area && !below.area.id) {
    // acantilado visto desde el camino
    drawCanopy(g, X, Y, x, y, 6);
    px(g, X, Y + 6, TS, 10, '#7a6a5a'); px(g, X, Y + 6, TS, 1, '#9a8a76');
    px(g, X + (x * 5) % 13, Y + 8, 1, 5, '#5a4c40'); px(g, X + (x * 7 + 3) % 13, Y + 10, 2, 1, '#5a4c40');
    px(g, X, Y + 14, TS, 2, '#4a3e34');
  } else drawCanopy(g, X, Y, x, y);
}

// Muros frontales de cada zona
function drawFace(g, x, y, area) {
  const X = x * TS, Y = y * TS, ground = shade(area.id === 'qa' ? '#d8b86a' : '#5a5a5a', -40);
  switch (area.id) {
    case 'producto':        // empalizada de troncos
      drawCanopy(g, X, Y, x, y, 4);
      for (let i = 0; i < 4; i++) {
        const lx = X + i * 4;
        px(g, lx, Y + 4, 4, 12, '#8a5a32'); px(g, lx, Y + 4, 1, 12, '#a8743e'); px(g, lx + 3, Y + 4, 1, 12, '#5a3a1e');
        px(g, lx + 1, Y + 2, 2, 2, '#8a5a32');
      }
      px(g, X, Y + 8, TS, 1, '#4a3018');
      break;
    case 'desarrollo':      // troncos de árboles
      drawCanopy(g, X, Y, x, y, 6);
      px(g, X, Y + 6, TS, 10, '#2a4a2e');
      px(g, X + 3, Y + 5, 5, 11, '#5a3e24'); px(g, X + 3, Y + 5, 1, 11, '#7a5432'); px(g, X + 11, Y + 6, 3, 10, '#4a321c');
      px(g, X, Y + 14, TS, 2, '#1e3a22');
      break;
    case 'despacho':        // muralla de piedra
      px(g, X, Y, TS, TS, '#9a9aa6');
      for (let r = 0; r < 4; r++) { px(g, X, Y + r * 4 + 3, TS, 1, '#6a6a76'); px(g, X + ((r % 2) ? 4 : 11), Y + r * 4, 1, 3, '#6a6a76'); }
      px(g, X, Y, TS, 2, '#5a5a66'); px(g, X, Y + 13, TS, 3, '#5a5a66');
      break;
    case 'datos':           // pared de roca con cristales
      px(g, X, Y, TS, TS, '#1c2838');
      for (let i = 0; i < 5; i++) px(g, X + Math.floor(noise(x, y, i) * 13), Y + 2 + Math.floor(noise(x, y, i + 9) * 10), 3, 2, '#2a3a50');
      px(g, X, Y + 13, TS, 3, '#141c28');
      break;
    case 'ops':             // ladrillo oscuro
      px(g, X, Y, TS, TS, '#4a3a48');
      for (let r = 0; r < 4; r++) { px(g, X, Y + r * 4 + 3, TS, 1, '#2a2030'); px(g, X + ((r % 2) ? 3 : 10), Y + r * 4, 1, 3, '#2a2030'); }
      px(g, X, Y + 13, TS, 3, '#241a28');
      break;
    case 'qa':              // acantilado de arenisca
      px(g, X, Y, TS, TS, '#c89a5a');
      px(g, X, Y + 3, TS, 2, '#b4844a'); px(g, X, Y + 8, TS, 2, '#d8aa6a'); px(g, X, Y + 12, TS, 1, '#a87a42');
      px(g, X, Y + 13, TS, 3, ground);
      break;
  }
}

// Decoración fija de los muros
const DECOR = [
  { k: 'quests', x: 2, y: 1, w: 3 }, { k: 'banner', x: 22, y: 1 }, { k: 'banner', x: 27, y: 1 },
  { k: 'crystals', x: 4, y: 12 }, { k: 'crystals', x: 7, y: 12 },
  { k: 'shield', x: 13, y: 12 }, { k: 'shield', x: 17, y: 12 }, { k: 'sun', x: 25, y: 12 },
];
function drawDecor(g, d) {
  const X = d.x * TS, Y = d.y * TS, Wd = (d.w || 1) * TS;
  switch (d.k) {
    case 'quests':          // tablón de misiones
      px(g, X + 2, Y + 3, Wd - 4, 10, '#6a4422'); px(g, X + 3, Y + 4, Wd - 6, 8, '#8a5a32');
      for (let i = 0; i < 4; i++) { px(g, X + 5 + i * 10, Y + 5, 7, 6, '#efe2c0'); px(g, X + 6 + i * 10, Y + 7, 5, 1, '#8a7a5a'); px(g, X + 6 + i * 10, Y + 9, 3, 1, '#8a7a5a'); }
      px(g, X + 8, Y + 5, 1, 1, '#c03030');
      break;
    case 'banner':
      px(g, X + 4, Y + 1, 8, 1, '#5a4020'); px(g, X + 5, Y + 2, 6, 10, '#a82a2a'); px(g, X + 5, Y + 12, 2, 2, '#a82a2a'); px(g, X + 9, Y + 12, 2, 2, '#a82a2a');
      px(g, X + 7, Y + 4, 2, 4, '#f5c542'); px(g, X + 6, Y + 5, 4, 1, '#f5c542');
      break;
    case 'crystals':
      px(g, X + 4, Y + 4, 3, 9, '#45c8e0'); px(g, X + 5, Y + 4, 1, 8, '#b8f4ff'); px(g, X + 8, Y + 7, 3, 6, '#3aa8c8'); px(g, X + 2, Y + 9, 2, 4, '#3aa8c8');
      break;
    case 'shield':
      px(g, X + 4, Y + 3, 8, 7, '#7a7a86'); px(g, X + 5, Y + 10, 6, 1, '#7a7a86'); px(g, X + 6, Y + 11, 4, 1, '#7a7a86');
      px(g, X + 5, Y + 4, 6, 5, '#8a1a2a'); px(g, X + 7, Y + 4, 2, 6, '#e8c442');
      break;
    case 'sun':
      px(g, X + 5, Y + 4, 6, 6, '#e8a43a'); px(g, X + 6, Y + 5, 4, 4, '#f5d442');
      px(g, X + 7, Y + 2, 2, 1, '#e8a43a'); px(g, X + 7, Y + 11, 2, 1, '#e8a43a'); px(g, X + 3, Y + 6, 1, 2, '#e8a43a'); px(g, X + 12, Y + 6, 1, 2, '#e8a43a');
      break;
  }
}

export function drawRpgBackground(g) {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const t = tiles[y][x];
    if (t.kind === 'floor') drawFloor(g, x, y, t.area);
    else if (t.kind === 'face') drawFace(g, x, y, t.area);
    else drawWall(g, x, y);
  }
  // Postes en las entradas de cada zona
  for (const r of ROOMS) {
    const [a, b] = r.door, row = r.face === 1 ? 7 : 11, h = TS * (r.face === 1 ? 1 : 2);
    px(g, a * TS - 3, row * TS, 3, h, '#6a4422'); px(g, (b + 1) * TS, row * TS, 3, h, '#6a4422');
  }
  // Alfombra real del castillo hasta el trono
  px(g, 24 * TS + 2, 4 * TS, 2 * TS - 4, 4 * TS, '#8a2222'); px(g, 24 * TS + 4, 4 * TS, 2 * TS - 8, 4 * TS, '#a83434');
  px(g, 22 * TS + 8, 2 * TS + 4, 4 * TS, 2 * TS, '#8a2222'); px(g, 22 * TS + 11, 2 * TS + 7, 4 * TS - 6, 2 * TS - 6, '#a83434');
  for (const d of DECOR) drawDecor(g, d);
}

// ---- Elementos animados: antorchas y portal -------------------------------
const TORCHES = [[1, 1], [9, 1], [11, 1], [19, 1], [21, 1], [28, 1], [1, 12], [9, 12], [11, 12], [19, 12], [21, 12], [28, 12]];
export function drawRpgLive(g, t) {
  for (const [x, y] of TORCHES) {
    const X = x * TS, Y = y * TS, f = Math.floor(t / 110 + x * 3) % 3;
    px(g, X + 7, Y + 7, 2, 5, '#4a3020'); px(g, X + 6, Y + 6, 4, 1, '#6a4a30');
    px(g, X + 6, Y + 2 + (f === 1 ? 1 : 0), 4, 4, '#e8742a'); px(g, X + 7, Y + 1 + f % 2, 2, 4, '#f5d442'); px(g, X + 7, Y + 4, 2, 1, '#fff6c0');
    g.fillStyle = 'rgba(255,170,60,0.08)'; g.beginPath(); g.arc(X + 8, Y + 5, 9 + f, 0, Math.PI * 2); g.fill();
  }
  // Portal de entrada al mundo
  const X = ENTRANCE.x * TS, Y = ENTRANCE.y * TS;
  px(g, X, Y - 2, TS, TS + 4, '#4a4458'); px(g, X + 2, Y, TS - 4, TS, '#1a0f2a');
  for (let i = 0; i < 6; i++) {
    const a = t / 300 + i * 1.05, r = 2 + (i % 3) * 1.5;
    px(g, X + 7 + Math.round(Math.cos(a) * r), Y + 7 + Math.round(Math.sin(a) * r * 1.4), 2, 2, i % 2 ? '#9b6cf0' : '#d8b8ff');
  }
}

// ---- Objetos del mundo (sustituyen al mobiliario de la oficina) -----------
export function drawRpgProp(g, p, t) {
  const X = p.x * TS, Y = p.y * TS, Wd = (p.w || 1) * TS;
  switch (p.k) {
    case 'plant':           // pino
      px(g, X + 2, Y + 12, 12, 2, 'rgba(0,0,0,.25)');
      px(g, X + 6, Y + 7, 4, 7, '#6a4422'); px(g, X + 6, Y + 7, 1, 7, '#8a5a32');
      px(g, X + 1, Y + 2, 14, 6, '#2a6a3a'); px(g, X + 3, Y - 3, 10, 6, '#348a46'); px(g, X + 5, Y - 7, 6, 5, '#3c9a50'); px(g, X + 7, Y - 10, 2, 4, '#4aaa5c');
      px(g, X + 3, Y + 2, 3, 1, '#4aaa5c'); px(g, X + 5, Y - 3, 2, 1, '#5abf6a');
      break;
    case 'rack':
      if (p.x < 10) {       // cristal gigante
        const glow = (Math.sin(t / 400 + p.x) + 1) / 2;
        px(g, X + 1, Y + 9, 14, 6, '#3a4658'); px(g, X + 2, Y + 9, 12, 1, '#4e5c70');
        px(g, X + 5, Y - 10, 6, 20, '#3ab4d4'); px(g, X + 6, Y - 12, 4, 2, '#3ab4d4'); px(g, X + 6, Y - 9, 2, 16, '#a8ecff');
        px(g, X + 2, Y - 2, 3, 12, '#2a94b8'); px(g, X + 11, Y, 3, 10, '#2a94b8');
        g.fillStyle = `rgba(120,230,255,${0.08 + glow * 0.12})`; g.fillRect(X - 1, Y - 13, 18, 28);
      } else {              // brasero
        const f = Math.floor(t / 100 + p.x) % 3;
        px(g, X + 7, Y + 2, 2, 12, '#3a3a44'); px(g, X + 4, Y + 13, 8, 2, '#3a3a44');
        px(g, X + 2, Y - 2, 12, 4, '#4a4a56'); px(g, X + 2, Y - 2, 12, 1, '#6a6a78');
        px(g, X + 3, Y - 7 + (f ? 1 : 0), 10, 5, '#e8742a'); px(g, X + 5, Y - 10 + f, 6, 6, '#f5a142'); px(g, X + 7, Y - 12 + f % 2, 2, 5, '#f5d442');
      }
      break;
    case 'coffee': {        // caldero de pociones
      const b = Math.floor(t / 250) % 4;
      px(g, X + 4, Y + 12, 8, 2, '#e8742a'); px(g, X + 6, Y + 11, 4, 1, '#f5d442');
      px(g, X + 2, Y + 1, 12, 11, '#2a2a32'); px(g, X + 1, Y + 1, 14, 2, '#3a3a44'); px(g, X + 3, Y + 1, 10, 2, '#5fd068');
      px(g, X + 4 + b * 2, Y - 1 - (b % 2), 2, 2, '#7ee08a'); px(g, X + 10 - b, Y - 3, 1, 1, '#7ee08a');
      break;
    }
    case 'cooler':          // pozo
      px(g, X + 2, Y - 10, 2, 13, '#6a4422'); px(g, X + 12, Y - 10, 2, 13, '#6a4422');
      px(g, X, Y - 12, 16, 3, '#8a3a2a'); px(g, X + 1, Y - 13, 14, 1, '#a84a36');
      px(g, X + 7, Y - 9, 1, 6, '#c8b8a0'); px(g, X + 6, Y - 3, 3, 3, '#6a4422');
      px(g, X + 1, Y + 3, 14, 11, '#8a8a96'); px(g, X + 1, Y + 3, 14, 1, '#a8a8b4');
      px(g, X + 3, Y + 4, 10, 3, '#3a7ac8'); for (let i = 0; i < 3; i++) px(g, X + 2 + i * 5, Y + 8, 4, 1, '#6a6a76');
      break;
    case 'vending':         // puesto del mercader
      px(g, X + 1, Y - 10, 1, 24, '#6a4422'); px(g, X + 14, Y - 10, 1, 24, '#6a4422');
      for (let i = 0; i < 8; i++) px(g, X + i * 2, Y - 12, 2, 5, i % 2 ? '#f4f4f4' : '#c83a3a');
      px(g, X + 1, Y + 3, 14, 10, '#9a6a3a'); px(g, X + 1, Y + 3, 14, 1, '#b8844e');
      px(g, X + 3, Y + 1, 2, 2, '#e84545'); px(g, X + 6, Y + 1, 2, 2, '#5fd068'); px(g, X + 9, Y, 3, 3, '#f5c542'); px(g, X + 12, Y + 1, 2, 2, '#7cc4ff');
      break;
    case 'sofa': {          // cofre del tesoro
      const sh = Math.floor(t / 300) % 6;
      px(g, X + 4, Y + 1, Wd - 8, 13, '#7a4a22'); px(g, X + 4, Y + 1, Wd - 8, 5, '#9a5e2c'); px(g, X + 4, Y + 6, Wd - 8, 1, '#3a2010');
      px(g, X + 8, Y + 1, 2, 13, '#e8b842'); px(g, X + Wd - 10, Y + 1, 2, 13, '#e8b842'); px(g, X + Wd / 2 - 2, Y + 5, 4, 4, '#e8b842');
      px(g, X + 6 + sh * 3, Y, 1, 1, '#fff6c0');
      break;
    }
    case 'table':           // mesa con el mapa de la misión
      px(g, X + 2, Y + 4, Wd - 4, 22, '#7a5028'); px(g, X + 2, Y + 4, Wd - 4, 2, '#9a6a3a'); px(g, X + 2, Y + 24, Wd - 4, 3, '#4a3018');
      px(g, X + 5, Y + 8, Wd - 10, 14, '#efe2c0'); px(g, X + 5, Y + 8, Wd - 10, 1, '#d8c8a0');
      for (let i = 0; i < 5; i++) px(g, X + 8 + i * 3, Y + 18 - i * 2, 1, 1, '#8a6a4a');
      px(g, X + 23, Y + 9, 1, 1, '#c03030'); px(g, X + 22, Y + 10, 3, 1, '#c03030'); px(g, X + 23, Y + 11, 1, 1, '#c03030');
      px(g, X + 9, Y + 11, 4, 3, '#5a9a48');
      break;
    case 'bench':           // tronco caído
      px(g, X + 1, Y + 5, Wd - 2, 7, '#6a4422'); px(g, X + 1, Y + 5, Wd - 2, 1, '#8a5a32'); px(g, X + 1, Y + 11, Wd - 2, 1, '#4a3018');
      px(g, X + Wd - 4, Y + 5, 3, 7, '#c8a070'); px(g, X + Wd - 3, Y + 7, 1, 3, '#8a6a44');
      break;
    case 'testbench':       // muñecos de entrenamiento
      px(g, X, Y + 8, Wd, 2, '#6a4422'); px(g, X, Y + 8, Wd, 1, '#8a5a32');
      for (let i = 0; i < 3; i++) {
        const dx = X + 10 + i * 26, wob = Math.floor(t / 300 + i) % 2;
        px(g, dx + 2, Y - 2, 2, 16, '#5a3a1e'); px(g, dx - 3, Y - 1, 12, 2, '#5a3a1e');
        px(g, dx - 1 + wob, Y - 4, 8, 9, '#d8b45a'); px(g, dx + wob, Y - 9, 6, 5, '#c8a050');
        if (i === 1) { px(g, dx + 1 + wob, Y - 2, 4, 4, '#e84545'); px(g, dx + 2 + wob, Y - 1, 2, 2, '#f4f4f4'); }
      }
      break;
  }
}

// ---- Campamentos (donde en la oficina están los escritorios) --------------
// fighting: hay una batalla en curso; lit: hay alguien en el campamento.
export function drawCamp(g, d, t, { fighting, lit }) {
  const X = d.x * TS, Y = d.y * TS;
  if (fighting) {           // círculo mágico bajo el villano
    const pulse = Math.floor(t / 200) % 2, cx = X + 16, cy = Y + 12;
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * Math.PI * 2 + t / 1500;
      px(g, cx + Math.round(Math.cos(a) * 13), cy + Math.round(Math.sin(a) * 4), 1, 1, i % 4 ? '#8a1a3a' : '#ff4a6a');
    }
    if (pulse) px(g, cx - 1, cy - 1, 2, 2, '#ff4a6a');
    return;
  }
  if (d.boss) {             // mesa de guerra del castillo
    px(g, X - 4, Y + 2, 40, 7, '#6a3a22'); px(g, X - 4, Y + 2, 40, 1, '#8a5232'); px(g, X - 4, Y + 9, 40, 6, '#4a2616');
    px(g, X + 2, Y + 3, 28, 5, '#efe2c0'); px(g, X + 6, Y + 4, 3, 2, '#5a9a48'); px(g, X + 20, Y + 5, 1, 1, '#c03030'); px(g, X + 12, Y + 5, 5, 1, '#8a6a4a');
    return;
  }
  const cx = X + 16, cy = Y + 8;     // hoguera
  px(g, cx - 7, cy + 4, 14, 3, 'rgba(0,0,0,.2)');
  for (const [dx, dy] of [[-6, 2], [-4, 4], [0, 5], [4, 4], [6, 2], [-6, 0], [6, 0]]) px(g, cx + dx - 1, cy + dy - 1, 3, 2, '#7a7a86');
  px(g, cx - 5, cy + 1, 10, 2, '#6a4422'); px(g, cx - 3, cy - 1, 2, 4, '#5a3a1e'); px(g, cx + 1, cy - 1, 2, 4, '#5a3a1e');
  if (lit) {
    const f = Math.floor(t / 110 + d.x) % 3;
    px(g, cx - 3, cy - 4 + (f === 2 ? 1 : 0), 6, 4, '#e8742a'); px(g, cx - 2, cy - 7 + f % 2, 4, 4, '#f5a142'); px(g, cx - 1, cy - 9 + f, 2, 3, '#f5d442');
    g.fillStyle = 'rgba(255,170,60,0.1)'; g.beginPath(); g.arc(cx, cy - 2, 12, 0, Math.PI * 2); g.fill();
  }
}

// Trono del jefe (sustituye a su silla)
export function drawThrone(g, d) {
  const X = d.px.x, Y = d.seat.y * TS;
  px(g, X - 9, Y - 8, 18, 18, '#c89a2a'); px(g, X - 9, Y - 8, 18, 1, '#f5c542');
  px(g, X - 7, Y - 6, 14, 15, '#8a1a2a'); px(g, X - 5, Y - 4, 10, 11, '#a82a3a');
  px(g, X - 2, Y - 11, 4, 3, '#f5c542'); px(g, X - 1, Y - 12, 2, 1, '#e84545');
  px(g, X - 10, Y + 4, 3, 7, '#c89a2a'); px(g, X + 7, Y + 4, 3, 7, '#c89a2a');
}

// ---- Villanos -------------------------------------------------------------
// Diseños originales de estilo anime. Claves: o contorno, r ojos, m boca, s cara,
// R gema; el resto cambia según el villano.
const VILLAIN_DEFS = [
  {
    name: 'Slime sombrío', shout: '¡Gluglú! ¡No pasarás!',
    pal: { o: '#140a1e', k: '#5a3a8a', K: '#3a2260', w: '#a888e0', g: '#7a5aaa', r: '#ff3a3a', m: '#2a1040' },
    back: { r: 'k', m: 'k' },
    rows: [
      '....oooooo....',
      '...owwkkkko...',
      '..owkkkkkkko..',
      '.owkkkkkkkkko.',
      '.okkrrkkrrkko.',
      'okkkrrkkrrkkko',
      'okkkkkkkkkkkko',
      'okkkkmmmmkkkko',
      'okkkkkkkkkkkko',
      '.oKkkkkkkkkKo.',
      '..oooooooooo..',
    ],
  },
  {
    name: 'Caballero oscuro', shout: '¡Ahora verás mi verdadero poder!',
    pal: { o: '#0e0a14', h: '#e8e2d0', a: '#3e3e58', A: '#262638', K: '#121218', r: '#ff3030', R: '#ff3030', c: '#7a1830', C: '#4a0e1e' },
    back: { r: 'K' },
    rows: [
      '.o............o.',
      'oho..........oho',
      'oho..oooooo..oho',
      '.ohoaaaaaaaaoho.',
      '..oaaaaaaaaaao..',
      '..oaKKKKKKKKao..',
      '..oaKrrKKrrKao..',
      '..oaKKKKKKKKao..',
      '...oaaaaaaaao...',
      '.occcaaaaaaccco.',
      'occcaaAAAAaaccco',
      'occcaAARRAAaccco',
      'occcaaAAAAaaccco',
      'occcoaaaaaaoccco',
      'occcCaAAAAaCccco',
      'occcCaAooAaCccco',
      'occCCaAooAaCCcco',
      'ocCCCaAooAaCCCco',
      'oCCCCKKooKKCCCCo',
      '.oooooo..oooooo.',
    ],
  },
  {
    name: 'Señor demonio', shout: '¡Contemplad mi forma final!', aura: '#b050ff',
    pal: { o: '#0e0814', h: '#6a1a2a', w: '#e8e4f0', W: '#b8b0c8', s: '#f4dcd4', r: '#ff2a4a', m: '#7a2a3a', K: '#1a0f24', c: '#3a1a5a', C: '#5a2a8a', R: '#ff2a4a' },
    back: { r: 'w', m: 'w', s: 'w' },
    rows: [
      '.o..................o.',
      'oho................oho',
      'oho.....oooooo.....oho',
      '.oho..oowwwwwwoo..oho.',
      '..ohoowwwwwwwwwwooho..',
      '...oowwwwwwwwwwwwoo...',
      '...owwsssssssssswwo...',
      '...owssrrssssrrsswo...',
      '...owssssssssssswwo...',
      '...owsssssmmssssswo...',
      '...owWssssssssssWwo...',
      '..owwwwossssssowwwwo..',
      '.owWwwoKKKKKKKKowwWwo.',
      '.owwwoKccccccccKowwwo.',
      '.owwoKcccRRRRcccKowwo.',
      'oowwoKccccCCccccKowwoo',
      'owwwoKccccCCccccKowwwo',
      'owWoKKccccCCccccKKoWwo',
      'owoKcccccCCCCcccccKowo',
      '.oKccccccCCCCccccccKo.',
      '.oKccccccCCCCccccccKo.',
      'oKcccccccCCCCcccccccKo',
      'oKccccccCCCCCCccccccKo',
      'oKKcccccCCCCCCcccccKKo',
      'oKKKKKKKKKKKKKKKKKKKKo',
      '.oooooooooooooooooooo.',
    ],
  },
];

function paintRows(rows, pal, remap = {}) {
  const w = rows[0].length, h = rows.length;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((k, x) => {
    k = remap[k] || k;
    if (k === '.' || !pal[k]) return;
    g.fillStyle = pal[k]; g.fillRect(x, y, 1, 1);
  }));
  return c;
}
function silhouette(src, color) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}
let VILLAINS = null;
function villains() {
  if (!VILLAINS) VILLAINS = VILLAIN_DEFS.map((v, i) => {
    const front = paintRows(v.rows, v.pal), back = paintRows(v.rows, v.pal, v.back);
    return { ...v, level: i + 1, w: front.width, h: front.height, front, back,
             white: silhouette(front, '#ffffff'), aura: v.aura && silhouette(front, v.aura) };
  });
  return VILLAINS;
}
export const villainName = tier => VILLAIN_DEFS[tier - 1].name;
export const villainShout = tier => VILLAIN_DEFS[tier - 1].shout;

// ---- Batallas -------------------------------------------------------------
// Poder de la tarea: cada herramienta usada suma 1 y cada 12 s de trabajo suma 1.
// Nivel 1 hasta 8, nivel 2 hasta 20, nivel 3 a partir de ahí.
const LEVELS = [0, 8, 20];
export function newFight(now) {
  return { start: now, hits: 0, tier: 1, lastHit: -1e9, transformAt: now, shoutAt: now, dmg: [], hp: 1, defeatAt: 0 };
}
export function hitFight(f, now) {
  f.hits++; f.lastHit = now;
  f.dmg.push({ t: now, v: Math.floor((8 + Math.random() * 30) * f.tier), dx: Math.round(Math.random() * 16 - 8) });
  if (f.dmg.length > 6) f.dmg.shift();
}
export function endFight(f, now) { if (!f.defeatAt) f.defeatAt = now; }

// Actualiza nivel y vida. Devuelve true si el villano acaba de transformarse.
export function stepFight(f, now) {
  if (f.defeatAt) { f.hp = Math.max(0, f.hp - 0.05); return false; }
  const pw = f.hits + (now - f.start) / 12000;
  const tier = pw >= LEVELS[2] ? 3 : pw >= LEVELS[1] ? 2 : 1;
  let transformed = false;
  if (tier > f.tier) { f.tier = tier; f.transformAt = now; f.shoutAt = now; f.hp = 1; transformed = true; }
  const target = f.tier === 3 ? 0.15 + 0.85 * Math.exp(-(pw - LEVELS[2]) / 15)
               : 1 - 0.85 * (pw - LEVELS[f.tier - 1]) / (LEVELS[f.tier] - LEVELS[f.tier - 1]);
  f.hp += (Math.max(0.1, Math.min(1, target)) - f.hp) * 0.1;
  return transformed;
}
export const fightOver = (f, now) => f.defeatAt && now - f.defeatAt > 1500;

// Cifras de daño en pixel art (3×5)
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
                '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
function drawNumber(g, n, x, y, color) {
  const s = String(n), w = s.length * 4 - 1;
  for (const [ox, oy, c] of [[-1, 0, '#1a0a10'], [1, 0, '#1a0a10'], [0, -1, '#1a0a10'], [0, 1, '#1a0a10'], [0, 0, color]])
    [...s].forEach((ch, i) => { const m = DIGITS[+ch]; for (let p = 0; p < 15; p++) if (m[p] === '1') px(g, x - w / 2 + i * 4 + (p % 3) + ox, y + Math.floor(p / 3) + oy, 1, 1, c); });
}

// Posición del villano: sobre el campamento, mirando hacia el agente.
export function villainAnchor(d) { return { x: d.px.x, y: d.y * TS + (d.face === 'down' ? 24 : 14) }; }
export function villainTop(f, d) {
  const v = villains()[f.tier - 1], a = villainAnchor(d);
  return a.y - v.h - (f.tier === 3 ? 3 : 1);
}

export function drawVillain(g, f, d, now) {
  const V = villains(), a = villainAnchor(d);
  // Durante la transformación parpadea entre la forma anterior y la nueva
  const transforming = now - f.transformAt < 900 && f.tier > 1;
  const tier = transforming && Math.floor(now / 80) % 2 ? f.tier - 1 : f.tier;
  const v = V[tier - 1], img = d.face === 'down' ? v.back : v.front;
  let x = a.x - Math.floor(v.w / 2), y = a.y - v.h;
  if (tier === 1) y += Math.floor(now / 300) % 2;                 // el slime late
  if (tier === 2) y -= Math.floor(now / 500) % 2;
  if (tier === 3) y -= 2 + Math.round(Math.sin(now / 400) * 1.5);   // el señor demonio flota

  const dying = f.defeatAt ? now - f.defeatAt : 0;
  if (dying && Math.floor(now / 60) % 2) {                       // parpadea al ser derrotado
  } else {
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(a.x - Math.floor(v.w / 2) + 2, a.y - 1, v.w - 4, 2);
    if (v.aura && !dying) {
      g.globalAlpha = 0.35 + 0.25 * Math.sin(now / 120);
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, -2], [-1, -1], [1, -1]]) g.drawImage(v.aura, x + ox, y + oy);
      g.globalAlpha = 1;
      for (let i = 0; i < 4; i++) {
        const k = (now / 600 + i / 4) % 1;
        px(g, x + 2 + ((i * 7 + Math.floor(now / 600)) % (v.w - 4)), y + v.h - k * (v.h + 6), 1, 2, '#d8a0ff');
      }
    }
    if (dying) g.globalAlpha = Math.max(0, 1 - dying / 1200);
    g.drawImage(img, x, y);
    // Destello al recibir un golpe
    const since = now - f.lastHit;
    if (since < 140 || (dying && dying < 300)) { g.globalAlpha = 0.75; g.drawImage(v.white, x, y); }
    g.globalAlpha = 1;
  }
  // Tajo del ataque
  const since = now - f.lastHit;
  if (since < 180 && !dying) {
    const k = since / 180;
    for (let i = 0; i < 12; i++) px(g, x + v.w / 2 - 6 + i, y + 2 + i + Math.round(k * 3), 2, 1, i < 12 * (1 - k * .5) ? '#ffffff' : '#f5d442');
  }
  // Onda de la transformación
  if (transforming) {
    const r = (now - f.transformAt) / 900 * 22;
    g.strokeStyle = `rgba(255,255,255,${1 - r / 22})`; g.lineWidth = 1;
    g.beginPath(); g.ellipse(a.x, a.y - v.h / 2, r, r * 0.8, 0, 0, Math.PI * 2); g.stroke();
  }
  // Explosión de estrellas al ser derrotado
  if (dying) {
    const k = dying / 1500;
    for (let i = 0; i < 10; i++) {
      const ang = i / 10 * Math.PI * 2, r = 4 + k * 20;
      px(g, a.x + Math.cos(ang) * r, a.y - v.h / 2 + Math.sin(ang) * r * 0.8, 2, 2, i % 2 ? '#f5d442' : '#ffffff');
    }
  }
  // Barra de vida y nivel
  if (!dying || dying < 900) {
    const bw = Math.max(16, v.w), bx = a.x - Math.floor(bw / 2), by = y - 5;
    px(g, bx - 1, by - 1, bw + 2, 4, '#1a0a14');
    px(g, bx, by, bw, 2, '#4a1a24');
    const hp = Math.max(0, Math.min(1, f.hp));
    px(g, bx, by, Math.round(bw * hp), 2, hp > .5 ? '#5fd068' : hp > .25 ? '#f5c542' : '#e84545');
    for (let i = 0; i < f.tier; i++) px(g, bx + i * 3, by - 4, 2, 2, '#ff4a6a');
  }
  // Cifras de daño
  for (const dm of f.dmg) {
    const age = now - dm.t;
    if (age > 900) continue;
    drawNumber(g, dm.v, a.x + dm.dx, y - 10 - age / 60, age < 120 ? '#ffffff' : '#f5d442');
  }
}

// Textos de los globos en el mundo RPG
const TOOL_RPG = {
  Bash: '⚔ ¡ataque!', Edit: '✨ hechizo', Write: '✨ conjuro', MultiEdit: '✨ combo', NotebookEdit: '📖 grimorio',
  Read: '📜 estudia', Grep: '🔍 rastrea', Glob: '🔍 rastrea', WebSearch: '🔮 oráculo', WebFetch: '🔮 visión',
  Delegar: '📯 ¡refuerzos!', Pensando: '💭 estrategia', Empezando: '… se prepara', SubagentHandback: '📨 informe',
  TodoWrite: '🗺 plan de batalla',
};
export function rpgToolText(tool) {
  if (!tool) return '⚔ combate';
  if (/Browser|chrome/.test(tool)) return '🦅 explora';
  if (tool.startsWith('mcp__ccd_turn')) return '🗺 plan de batalla';
  if (tool.startsWith('mcp__')) return '🔌 artefacto';
  return TOOL_RPG[tool] || '⚔ ' + tool;
}
export const RPG_IDLE = { '☕': '🧪', '🍫': '💰', '📱': '💤' };
