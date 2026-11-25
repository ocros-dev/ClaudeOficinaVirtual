// Rampas de 5 tonos, materiales y paletas del kit 16 bits.
// Funciones puras: sin acceso al navegador, se pueden llevar a un Worker.
// Índices del búfer: 0 transparente; material m (0..49) y tono t (0..4) = 1 + m*5 + t;
// 253 blanco puro (brillo de ojos); 254 emisivo; 255 contorno.

export const KIT_VERSION = 1;
export const CONTOUR = '#0a0810';
export const IDX_WHITE = 253, IDX_EMIT = 254, IDX_CONTOUR = 255;
export const MAX_MATERIALS = 50;
export const matIndex = (m, t) => 1 + m * 5 + t;
/** Material de un índice del búfer (-1 si es transparente o especial). */
export const matOf = i => (i >= 1 && i <= 250 ? ((i - 1) / 5) | 0 : -1);
export const toneOf = i => (i - 1) % 5;

export function hexToRgb(h) {
  let s = String(h).replace('#', '');
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
// Gira el tono h una fracción f hacia el tono objetivo por el camino corto
const hueToward = (h, target, f) => { const d = ((target - h + 540) % 360) - 180; return h + d * f; };

/**
 * Rampa de 5 tonos [sombra profunda, sombra, base, luz, brillo].
 * - ramp5('#rrggbb'): la genera con desplazamiento de tono (sombras hacia azul-violeta y menos
 *   saturadas, luces hacia amarillo cálido), típico de los 16 bits.
 * - ramp5([h0..h4]): tonos explícitos. Con 3 o 4 tonos se expande repitiendo los extremos.
 */
export function ramp5(base) {
  if (Array.isArray(base)) {
    const a = base.slice(0, 5);
    if (a.length === 5) return a;
    if (a.length === 4) return [a[0], a[0], a[1], a[2], a[3]];
    if (a.length === 3) return [a[0], a[0], a[1], a[2], a[2]];
    if (a.length === 2) return [a[0], a[0], a[0], a[1], a[1]];
    return Array(5).fill(a[0] || '#ff00ff');
  }
  const [h, s, l] = rgbToHsl(...hexToRgb(base));
  const mk = (dh, target, ds, nl) => rgbToHex(...hslToRgb(hueToward(h, target, dh), Math.max(0, Math.min(1, s * ds)), Math.max(0, Math.min(1, nl))));
  return [
    mk(.34, 262, .82, l * .46),
    mk(.17, 262, .92, l * .72),
    rgbToHex(...hslToRgb(h, s, l)),
    mk(.10, 52, 1.0, l + (1 - l) * .30),
    mk(.20, 52, .72, l + (1 - l) * .60),
  ];
}

/** Materiales del maniquí (y de los respaldos tintados de las razas sin arte). */
export const MANIQUI_MATERIALS = ['skin', 'hair', 'cloth', 'cloth2', 'trim', 'leather', 'metal', 'iris'];

/** Rampas de un maniquí a partir de la paleta de una raza ({ m, a, t, h, sk, iris }). */
export function tintRamps(p) {
  return {
    skin: ramp5(p.sk || '#d8a880'), hair: ramp5(p.h || '#4a3020'), cloth: ramp5(p.m || '#4a5a9a'),
    cloth2: ramp5(p.t || '#c8c0a8'), trim: ramp5(p.a || '#c8a040'), leather: ramp5('#6a4a30'),
    metal: ramp5('#8a94a8'), iris: ramp5(p.iris || '#3a5a9a'),
  };
}

const pack = ([r, g, b]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
const MAGENTA = ramp5('#ff00ff');
const warned = new Set();

/**
 * Paleta final Uint32 (ABGR, orden de ImageData) de 256 entradas.
 * materials: nombres en orden (su posición es el índice de material).
 * ramps: { nombre: hex | [hex...] }. emit: color de los píxeles emisivos.
 */
export function buildPalette(materials, ramps, emit = '#e0d0ff') {
  const pal = new Uint32Array(256);
  materials.forEach((name, m) => {
    let r = ramps && ramps[name];
    if (!r) {
      if (!warned.has(name)) { warned.add(name); console.warn(`kit16: falta la rampa del material «${name}»`); }
      r = MAGENTA;
    }
    const tones = typeof r === 'string' ? ramp5(r) : ramp5(r);
    for (let t = 0; t < 5; t++) pal[matIndex(m, t)] = pack(hexToRgb(tones[t]));
  });
  pal[IDX_WHITE] = pack([255, 255, 255]);
  pal[IDX_EMIT] = pack(hexToRgb(emit));
  pal[IDX_CONTOUR] = pack(hexToRgb(CONTOUR));
  return pal;
}

const palCache = new Map();
/** Paleta de una raza para (variante, etapa), con caché. */
export function palette(art, variant = 0, stage = 1) {
  const key = `${art.id}|${variant}|${stage}`;
  let p = palCache.get(key);
  if (!p) {
    const emit = art.emit ? art.emit(variant, stage) : '#e0d0ff';
    palCache.set(key, p = buildPalette(art.materials, art.ramps(variant, stage), emit));
  }
  return p;
}
export const clearPaletteCache = () => palCache.clear();
